import { BigNumberish, constants } from 'ethers';
import { HardhatRuntimeEnvironment } from 'hardhat/types';

import { deployAndVerifyProxy, getDeployer, getNetworkConfig } from './utils';

import { MTokenName } from '../../../config';
import {
  getCurrentAddresses,
  RedemptionVaultType,
  sanctionListContracts,
  TokenAddresses,
  ustbContracts,
  usycTellerContracts,
} from '../../../config/constants/addresses';
import { getCommonContractNames } from '../../../helpers/contracts';
import { getAllRoles } from '../../../helpers/roles';
import {
  DepositVault,
  DepositVaultWithMToken,
  DepositVaultWithUSTB,
  DepositVaultWithUSYC,
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
   * @deprecated Cap now lives on mToken. Kept optional for config compatibility;
   * not passed to DepositVault.initialize. Set via mToken initialize / setMaxSupplyCap.
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
  /** Require the shared feed instead of falling back to a legacy DV feed. */
  mTokenDataFeed?: 'dataFeed';

  minMTokenAmountForFirstDeposit?: BigNumberish;

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

export type DeployDvUsycConfig = DeployDvConfigCommon & {
  type: 'USYC';
  /**
   * mToken RedemptionVault used to redeem its mToken into USDC
   * before subscribing to USYC
   * @default zero address (only USDC is auto-invested)
   */
  redemptionVault?:
    | `0x${string}`
    | { mToken: MTokenName; redemptionVaultType: RedemptionVaultType };
  /**
   * Subscription fee rate the USYC Teller is expected to charge the vault
   * @default 0
   */
  anticipatedFeeRate?: BigNumberish;
};

export type DeployDvConfig =
  | DeployDvRegularConfig
  | DeployDvUstbConfig
  | DeployDvAaveConfig
  | DeployDvMorphoConfig
  | DeployDvMTokenConfig
  | DeployDvUsycConfig;

const isAddress = (value: string): value is `0x${string}` => {
  return value.startsWith('0x');
};

const resolveUsycRedemptionVault = (
  networkConfig: DeployDvUsycConfig,
  addresses: Partial<Record<MTokenName, TokenAddresses>>,
) => {
  const { redemptionVault } = networkConfig;

  if (!redemptionVault) {
    return constants.AddressZero;
  }

  if (typeof redemptionVault === 'string') {
    return redemptionVault;
  }

  const redemptionVaultAddress =
    addresses[redemptionVault.mToken]?.[redemptionVault.redemptionVaultType];

  if (!redemptionVaultAddress) {
    throw new Error(
      `${redemptionVault.mToken} ${redemptionVault.redemptionVaultType} address is not found`,
    );
  }

  return redemptionVaultAddress;
};

export const deployDepositVault = async (
  hre: HardhatRuntimeEnvironment,
  token: MTokenName,
  type: 'dv' | 'dvUstb' | 'dvAave' | 'dvMorpho' | 'dvMToken' | 'dvUsyc',
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

  const dataFeed = networkConfig.mTokenDataFeed
    ? tokenAddresses[networkConfig.mTokenDataFeed]
    : tokenAddresses?.dataFeedDv ?? tokenAddresses?.dataFeed;

  if (!dataFeed || dataFeed === constants.AddressZero) {
    throw new Error(`MToken data feed is not configured for ${token}`);
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
  } else if (networkConfig.type === 'MTOKEN') {
    extraParams.push(networkConfig.mTokenDepositVault);
  } else if (networkConfig.type === 'USYC') {
    const usycTeller = usycTellerContracts[hre.network.config.chainId!];

    if (!usycTeller) {
      throw new Error('USYC Teller contract is not found');
    }

    extraParams.push(
      usycTeller,
      resolveUsycRedemptionVault(networkConfig, addresses ?? {}),
      networkConfig.anticipatedFeeRate ?? 0,
    );
  }

  const ustbMTokenInitializer =
    'initialize((uint256,uint256,uint256,address,address,address,address,address,uint256,uint256,uint256,uint256,bool),(uint256,uint256),address)' as const;
  const usycInitializer =
    'initialize((uint256,uint256,uint256,address,address,address,address,address,uint256,uint256,uint256,uint256,bool),(uint256,uint256),address,address,uint256)' as const;
  const params = [
    {
      variationTolerance: networkConfig.variationTolerance,
      minAmount: networkConfig.minAmount ?? 0,
      instantFee: networkConfig.instantFee,
      ac: addresses?.accessControl,
      sanctionsList,
      mToken: tokenAddresses?.token,
      mTokenDataFeed: dataFeed,
      tokensReceiver,
      minInstantFee: networkConfig.minInstantFee ?? 0,
      maxInstantFee: networkConfig.maxInstantFee ?? 100_00,
      maxInstantShare: networkConfig.maxInstantShare ?? 100_00,
      maxApproveRequestId:
        networkConfig.maxApproveRequestId ?? constants.MaxUint256,
      sequentialRequestProcessing:
        networkConfig.sequentialRequestProcessing ?? false,
    },
    {
      minMTokenAmountForFirstDeposit:
        networkConfig.minMTokenAmountForFirstDeposit ?? 0,
      maxAmountPerRequest:
        networkConfig.maxAmountPerRequest ?? constants.MaxUint256,
    },
    ...extraParams,
  ] as
    | Parameters<DepositVault['initialize']>
    | Parameters<DepositVaultWithUSTB[typeof ustbMTokenInitializer]>
    | Parameters<DepositVaultWithMToken[typeof ustbMTokenInitializer]>
    | Parameters<DepositVaultWithUSYC[typeof usycInitializer]>;

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
          : networkConfig.type === 'USYC'
          ? usycInitializer
          : 'initialize',
    },
  );
};
