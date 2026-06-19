import { BigNumberish, constants } from 'ethers';
import { parseUnits } from 'ethers/lib/utils';
import { HardhatRuntimeEnvironment } from 'hardhat/types';

import { deployAndVerifyProxy, getDeployer, getNetworkConfig } from './utils';

import { MTokenName } from '../../../config';
import {
  getCurrentAddresses,
  RedemptionVaultType,
  sanctionListContracts,
  TokenAddresses,
} from '../../../config/constants/addresses';
import { getCommonContractNames } from '../../../helpers/contracts';
import { getAllRoles } from '../../../helpers/roles';
import {
  RedemptionVault,
  RedemptionVaultWithMToken,
} from '../../../typechain-types';

export type DeployRvConfigCommonLegacy = {
  version?: 'v1';
  feeReceiver?: string;
  tokensReceiver?: string;
  instantDailyLimit: BigNumberish;
  instantFee: BigNumberish;
  enableSanctionsList?: boolean;
  variationTolerance: BigNumberish;
  requestRedeemer?: string;
  /**
   * @default 0
   */
  minAmount?: BigNumberish;
  /**
   * @default 0.1
   */
  fiatAdditionalFee?: BigNumberish;
  /**
   * @default 30
   */
  fiatFlatFee?: BigNumberish;
  /**
   * @default 1000
   */
  minFiatRedeemAmount?: BigNumberish;
};

type DeployVaultConfigCommon = {
  version: 'v2';
  variationTolerance: BigNumberish;
  minAmount?: BigNumberish;
  instantFee: BigNumberish;
  enableSanctionsList?: boolean;
  tokensReceiver?: string;
  minInstantFee?: BigNumberish;
  maxInstantFee?: BigNumberish;
  maxInstantShare?: BigNumberish;
  maxApproveRequestId?: BigNumberish;
  sequentialRequestProcessing?: boolean;
};

type SwapperVault =
  | {
      mToken: MTokenName;
      redemptionVaultType: RedemptionVaultType;
    }
  | 'dummy';

type DeployRvConfigCommonNew = DeployVaultConfigCommon & {
  requestRedeemer?: string;
  loanConfig?: {
    loanLp?: string;
    loanRepaymentAddress?: string;
    loanApr: BigNumberish;
    loanSwapperVault: Exclude<SwapperVault, 'dummy'>;
  };
};

export type DeployRvConfigCommon =
  | DeployRvConfigCommonLegacy
  | DeployRvConfigCommonNew;

export type DeployRvRegularConfig = {
  type: 'REGULAR';
} & DeployRvConfigCommon;

// TODO: remove
export type DeployRvSwapperConfig = {
  type: 'SWAPPER';
  swapperVault: SwapperVault;
  liquidityProvider?: `0x${string}` | 'dummy';
} & DeployRvConfigCommon;

export type DeployRvAaveConfig = {
  type: 'AAVE';
} & DeployRvConfigCommon;

export type DeployRvMorphoConfig = {
  type: 'MORPHO';
} & DeployRvConfigCommon;

export type DeployRvMTokenConfig = {
  type: 'MTOKEN';
  redemptionVault: string;
} & DeployRvConfigCommon;

export type DeployRvConfig =
  | DeployRvRegularConfig
  | DeployRvSwapperConfig
  | DeployRvAaveConfig
  | DeployRvMorphoConfig
  | DeployRvMTokenConfig;

const DUMMY_ADDRESS = '0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF';

const resolveLoanAddresses = async (
  hre: HardhatRuntimeEnvironment,
  networkConfig: DeployRvConfigCommonNew,
  addresses: Record<MTokenName, TokenAddresses>,
) => {
  if (!networkConfig.loanConfig) {
    return {
      loanLp: constants.AddressZero,
      loanRepaymentAddress: constants.AddressZero,
      loanSwapperVault: constants.AddressZero,
      loanApr: constants.AddressZero,
    };
  }
  const swapperVault = networkConfig.loanConfig.loanSwapperVault;

  const swapperVaultAddress =
    addresses[swapperVault.mToken]?.[swapperVault.redemptionVaultType];

  if (!swapperVaultAddress) {
    throw new Error('Swapper vault address is not found');
  }

  const deployer = await getDeployer(hre);

  return {
    loanLp: networkConfig.loanConfig.loanLp ?? deployer.address,
    loanRepaymentAddress:
      networkConfig.loanConfig.loanRepaymentAddress ?? deployer.address,
    loanSwapperVault: swapperVaultAddress,
    loanApr: networkConfig.loanConfig.loanApr,
  };
};

export const deployRedemptionVault = async (
  hre: HardhatRuntimeEnvironment,
  token: MTokenName,
  type: 'rv' | 'rvSwapper' | 'rvAave' | 'rvMorpho' | 'rvMToken',
) => {
  if (token.startsWith('TAC')) {
    throw new Error('TAC tokens are not supported anymore');
  }

  const addresses = getCurrentAddresses(hre);
  const deployer = await getDeployer(hre);
  const tokenAddresses = addresses?.[token];

  const networkConfig = getNetworkConfig(hre, token, type);

  if (!tokenAddresses) {
    throw new Error('Token config is not found');
  }

  if (networkConfig.version !== 'v2') {
    throw new Error('v1 configs are not supported anymore');
  }

  if (networkConfig.type === 'SWAPPER') {
    throw new Error('Swapper configs are not supported anymore');
  }

  const allRoles = getAllRoles();

  const extraParams: unknown[] = [];

  if (networkConfig.type === 'MTOKEN') {
    extraParams.push(networkConfig.redemptionVault);
  }

  const dataFeed = tokenAddresses?.dataFeedRv ?? tokenAddresses?.dataFeed;

  const sanctionsList = networkConfig.enableSanctionsList
    ? sanctionListContracts[hre.network.config.chainId!]
    : constants.AddressZero;

  if (!sanctionsList) {
    throw new Error('Sanctions list address is not found');
  }

  // FIXME: fix according to new initialize params
  const params = [
    {
      variationTolerance: networkConfig.variationTolerance,
      minAmount: networkConfig.minAmount ?? parseUnits('0', 18),
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
      requestRedeemer: networkConfig.requestRedeemer ?? deployer.address,
      ...(await resolveLoanAddresses(
        hre,
        networkConfig,
        addresses as Record<MTokenName, TokenAddresses>,
      )),
    },
    ...extraParams,
  ] as
    | Parameters<RedemptionVault['initialize']>
    | Parameters<
        RedemptionVaultWithMToken['initialize((uint256,uint256,uint256,address,address,address,address,address,uint256,uint256,uint256,uint256,bool),(address,address,address,address,uint256),address)']
      >;

  const constructorParams = [
    allRoles.tokenRoles[token].redemptionVaultAdmin,
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
        networkConfig.type === 'MTOKEN'
          ? 'initialize(address,(address,address),(address,address),(uint256,uint256),address,uint256,uint256,(uint256,uint256,uint256),address,address)'
          : 'initialize',
    },
  );
};
