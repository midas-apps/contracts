import { BigNumberish, constants } from 'ethers';
import { HardhatRuntimeEnvironment } from 'hardhat/types';

import { RvType } from './types';
import { deployAndVerifyProxy, getDeployer, getNetworkConfig } from './utils';

import { MTokenName } from '../../../config';
import {
  getCurrentAddresses,
  sanctionListContracts,
  ustbContracts,
} from '../../../config/constants/addresses';
import { getTokenContractNames } from '../../../helpers/contracts';
import { DepositVault, DepositVaultWithUSTB } from '../../../typechain-types';

export type DeployDvConfigCommon = {
  feeReceiver?: string;
  tokensReceiver?: `0x${string}` | RvType;
  instantDailyLimit: BigNumberish;
  instantFee: BigNumberish;
  enableSanctionsList?: boolean;
  variationTolerance: BigNumberish;
  minAmount: BigNumberish;
  minMTokenAmountForFirstDeposit: BigNumberish;
  // default is type(uint256).max
  maxSupplyCap?: BigNumberish;
};

export type DeployDvRegularConfig = DeployDvConfigCommon & {
  type?: 'REGULAR';
};

export type DeployDvUstbConfig = DeployDvConfigCommon & {
  type: 'USTB';
};

export type DeployDvConfig = DeployDvRegularConfig | DeployDvUstbConfig;

const isAddress = (value: string): value is `0x${string}` => {
  return value.startsWith('0x');
};

export const deployDepositVault = async (
  hre: HardhatRuntimeEnvironment,
  token: MTokenName,
  type: 'dv' | 'dvUstb',
) => {
  const addresses = getCurrentAddresses(hre);
  const deployer = await getDeployer(hre);
  const tokenAddresses = addresses?.[token];

  const networkConfig = getNetworkConfig(hre, token, type);

  if (!tokenAddresses) {
    throw new Error('Token config is not found');
  }

  let dataFeed: string | undefined;

  if (token.startsWith('TAC')) {
    const originalTokenName = token.replace('TAC', '');
    dataFeed = addresses?.[originalTokenName as MTokenName]?.dataFeed;
    console.log(
      `Detected TAC wrapper, will be used data feed from ${originalTokenName}: ${dataFeed}`,
    );
  } else {
    dataFeed = tokenAddresses?.dataFeed;
  }

  const dvContractName = getTokenContractNames(token)[type];

  if (!dvContractName) {
    throw new Error('DV contract name is not found');
  }

  const sanctionsList = networkConfig.enableSanctionsList
    ? sanctionListContracts[hre.network.config.chainId!]
    : constants.AddressZero;

  if (!sanctionsList) {
    throw new Error('Sanctions list address is not found');
  }

  let tokensReceiver: string | undefined;

  if (
    !networkConfig.tokensReceiver ||
    isAddress(networkConfig.tokensReceiver)
  ) {
    tokensReceiver = networkConfig.tokensReceiver ?? deployer.address;
  } else {
    tokensReceiver = tokenAddresses[networkConfig.tokensReceiver];
  }

  if (!tokensReceiver) {
    throw new Error('Tokens receiver is not found');
  }

  console.log('tokensReceiver', tokensReceiver);

  const extraParams: unknown[] = [];

  if (networkConfig.type === 'USTB') {
    const ustbContract = ustbContracts[hre.network.config.chainId!];

    if (!ustbContract) {
      throw new Error('USTB contract is not found');
    }

    extraParams.push(ustbContract);
  }

  const params = [
    addresses?.accessControl,
    {
      mToken: tokenAddresses?.token,
      mTokenDataFeed: dataFeed,
    },
    {
      feeReceiver: networkConfig.feeReceiver ?? deployer.address,
      tokensReceiver,
    },
    {
      instantDailyLimit: networkConfig.instantDailyLimit,
      instantFee: networkConfig.instantFee,
    },
    sanctionsList,
    networkConfig.variationTolerance,
    networkConfig.minAmount,
    networkConfig.minMTokenAmountForFirstDeposit,
    networkConfig.maxSupplyCap ?? constants.MaxUint256,
    ...extraParams,
  ] as
    | Parameters<DepositVault['initialize']>
    | Parameters<
        DepositVaultWithUSTB['initialize(address,(address,address),(address,address),(uint256,uint256),address,uint256,uint256,uint256,uint256,address)']
      >;

  await deployAndVerifyProxy(hre, dvContractName, params, undefined, {
    unsafeAllow: ['constructor'],
    initializer:
      networkConfig.type === 'USTB'
        ? 'initialize(address,(address,address),(address,address),(uint256,uint256),address,uint256,uint256,uint256,address)'
        : 'initialize',
  });
};
