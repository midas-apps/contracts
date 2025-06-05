import { BigNumberish, constants } from 'ethers';
import { HardhatRuntimeEnvironment } from 'hardhat/types';

import { RvType } from './types';
import { deployAndVerifyProxy, getDeployer, getNetworkConfig } from './utils';

import { MTokenName } from '../../../config';
import {
  getCurrentAddresses,
  sanctionListContracts,
} from '../../../config/constants/addresses';
import { getTokenContractNames } from '../../../helpers/contracts';
import {
  DepositVault,
  MBasisDepositVault,
  MBtcDepositVault,
} from '../../../typechain-types';

export type DeployDvConfig = {
  feeReceiver?: string;
  tokensReceiver?: `0x${string}` | RvType;
  instantDailyLimit: BigNumberish;
  instantFee: BigNumberish;
  enableSanctionsList?: boolean;
  variationTolerance: BigNumberish;
  minAmount: BigNumberish;
  minMTokenAmountForFirstDeposit: BigNumberish;
};

const isAddress = (value: string): value is `0x${string}` => {
  return value.startsWith('0x');
};

export const deployDepositVault = async (
  hre: HardhatRuntimeEnvironment,
  token: MTokenName,
) => {
  const addresses = getCurrentAddresses(hre);
  const deployer = await getDeployer(hre);
  const tokenAddresses = addresses?.[token];

  const networkConfig = getNetworkConfig(hre, token, 'dv');

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

  const dvContractName = getTokenContractNames(token).dv;

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
  ] as
    | Parameters<MBasisDepositVault['initialize']>
    | Parameters<MBtcDepositVault['initialize']>
    | Parameters<DepositVault['initialize']>;

  await deployAndVerifyProxy(hre, dvContractName, params);
};
