import { BigNumberish, constants } from 'ethers';
import { HardhatRuntimeEnvironment } from 'hardhat/types';

import { deployAndVerifyProxy, getDeployer, getNetworkConfig } from './utils';

import { MTokenName } from '../../../config';
import {
  getCurrentAddresses,
  RedemptionVaultType,
  sanctionListContracts,
  ustbContracts,
} from '../../../config/constants/addresses';
import { getCommonContractNames } from '../../../helpers/contracts';
import { getAllRoles } from '../../../helpers/roles';
import {
  DepositVault,
  DepositVaultWithMToken,
  DepositVaultWithUSTB,
} from '../../../typechain-types';

export type DeployDvConfigCommonLegacy = {
  version?: 'v1';
  feeReceiver?: string;
  tokensReceiver?: `0x${string}` | RedemptionVaultType;
  instantDailyLimit: BigNumberish;
  instantFee: BigNumberish;
  enableSanctionsList?: boolean;
  variationTolerance: BigNumberish;
  /**
   * @default 0
   */
  minAmount?: BigNumberish;
  /**
   * @default 0
   */
  minMTokenAmountForFirstDeposit?: BigNumberish;
  /**
   * @default constants.MaxUint256
   */
  maxSupplyCap?: BigNumberish;
};

type DeployVaultConfigCommon = {
  version: 'v2';
  variationTolerance: BigNumberish;
  minAmount?: BigNumberish;
  instantFee: BigNumberish;
  enableSanctionsList?: boolean;
  tokensReceiver?: `0x${string}` | RedemptionVaultType;
  minInstantFee?: BigNumberish;
  maxInstantFee?: BigNumberish;
  maxInstantShare?: BigNumberish;
  maxApproveRequestId?: BigNumberish;
  sequentialRequestProcessing?: boolean;
};

type DeployDvConfigCommonNew = DeployVaultConfigCommon & {
  minMTokenAmountForFirstDeposit?: BigNumberish;
  maxSupplyCap?: BigNumberish;
  maxAmountPerRequest?: BigNumberish;
};

export type DeployDvConfigCommon =
  | DeployDvConfigCommonLegacy
  | DeployDvConfigCommonNew;

export type DeployDvRegularConfig = DeployDvConfigCommon & {
  type?: 'REGULAR';
};

export type DeployDvUstbConfig = DeployDvConfigCommon & {
  type: 'USTB';
};

export type DeployDvAaveConfig = DeployDvConfigCommon & {
  type: 'AAVE';
};

export type DeployDvMorphoConfig = DeployDvConfigCommon & {
  type: 'MORPHO';
};

export type DeployDvMTokenConfig = DeployDvConfigCommon & {
  type: 'MTOKEN';
  mTokenDepositVault: string;
};

export type DeployDvConfig =
  | DeployDvRegularConfig
  | DeployDvUstbConfig
  | DeployDvAaveConfig
  | DeployDvMorphoConfig
  | DeployDvMTokenConfig;

const isAddress = (value: string): value is `0x${string}` => {
  return value.startsWith('0x');
};

export const deployDepositVault = async (
  hre: HardhatRuntimeEnvironment,
  token: MTokenName,
  type: 'dv' | 'dvUstb' | 'dvAave' | 'dvMorpho' | 'dvMToken',
) => {
  if (token.startsWith('TAC')) {
    throw new Error('TAC tokens are not supported anymore');
  }

  const addresses = getCurrentAddresses(hre);
  const deployer = await getDeployer(hre);
  const tokenAddresses = addresses?.[token];

  const networkConfig = getNetworkConfig(hre, token, type);

  if (networkConfig.version !== 'v2') {
    throw new Error('v1 configs are not supported anymore');
  }

  if (!tokenAddresses) {
    throw new Error('Token config is not found');
  }

  const dataFeed = tokenAddresses?.dataFeedDv ?? tokenAddresses?.dataFeed;

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
  } else if (networkConfig.type === 'MTOKEN') {
    extraParams.push(networkConfig.mTokenDepositVault);
  }

  const ustbMTokenInitializer =
    'initialize((uint256,uint256,uint256,address,address,address,address,address,uint256,uint256,uint256,uint256,bool),(uint256,uint256,uint256),address)' as const;
  const params = [
    {
      variationTolerance: networkConfig.variationTolerance,
      minAmount: networkConfig.minAmount ?? 0,
      instantFee: networkConfig.instantFee,
      ac: addresses?.accessControl,
      sanctionsList,
      mToken: tokenAddresses?.token,
      mTokenDataFeed: dataFeed,
      tokensReceiver: networkConfig.tokensReceiver ?? deployer.address,
      minInstantFee: networkConfig.minInstantFee ?? 0,
      maxInstantFee: networkConfig.maxInstantFee ?? 100_00,
      maxInstantShare: networkConfig.maxInstantShare ?? 100_00,
      maxApproveRequestId: networkConfig.maxApproveRequestId ?? 100,
      sequentialRequestProcessing:
        networkConfig.sequentialRequestProcessing ?? false,
    },
    {
      minMTokenAmountForFirstDeposit:
        networkConfig.minMTokenAmountForFirstDeposit ?? 0,
      maxSupplyCap: networkConfig.maxSupplyCap ?? constants.MaxUint256,
      maxAmountPerRequest:
        networkConfig.maxAmountPerRequest ?? constants.MaxUint256,
    },
    ...extraParams,
  ] as
    | Parameters<DepositVault['initialize']>
    | Parameters<DepositVaultWithUSTB[typeof ustbMTokenInitializer]>
    | Parameters<DepositVaultWithMToken[typeof ustbMTokenInitializer]>;

  const allRoles = getAllRoles();
  const constructorParams = [
    allRoles.tokenRoles[token].depositVaultAdmin,
    allRoles.tokenRoles[token].greenlisted,
  ];

  await deployAndVerifyProxy(
    hre,
    getCommonContractNames()[type],
    params,
    undefined,
    {
      constructorArgs: constructorParams,
      initializer:
        networkConfig.type === 'USTB' || networkConfig.type === 'MTOKEN'
          ? ustbMTokenInitializer
          : 'initialize',
    },
  );
};
