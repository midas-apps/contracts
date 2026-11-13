import { BigNumberish } from 'ethers';
import { HardhatRuntimeEnvironment } from 'hardhat/types';

import {
  AddFeeWaivedConfig,
  AddPaymentTokensConfig,
  SetAaveConfigConfig,
  SetMorphoConfigConfig,
  SetUsycConfigConfig,
} from './common-vault';
import {
  DeployCustomAggregatorAdjustedConfig,
  DeployCustomAggregatorConfig,
  DeployDataFeedConfig,
  SetRoundDataConfig,
} from './data-feed';
import {
  DeployDvAaveConfig,
  DeployDvMorphoConfig,
  DeployDvMTokenConfig,
  DeployDvRegularConfig,
  DeployDvUstbConfig,
  DeployDvUsycConfig,
} from './dv';
import type { GreenlistConfig } from './greenlist';
import {
  GrantAllTokenRolesConfig,
  GrantDefaultAdminRoleToAcAdminConfig,
} from './roles';
import {
  DeployRvAaveConfig,
  DeployRvMorphoConfig,
  DeployRvMTokenConfig,
  DeployRvRegularConfig,
  DeployRvSwapperConfig,
  DeployRvUstbConfig,
  DeployRvUsycConfig,
} from './rv';
import { DeployTimelockConfig } from './timelock';
import { toFunctionSelector } from './utils';
import type {
  FreeFromMinAmountConfig,
  InstantLimitsConfig,
  MintRateLimitsConfig,
  PreferLoanLiquidityConfig,
  SetMTokenVaultConfig,
  SetUstbVaultConfig,
  TokenConfig,
} from './v2-post-deploy';

import { PartialConfigPerNetwork, PaymentTokenName } from '../../../config';
import { VaultType } from '../../../config/constants/addresses';
import { RateLimiter } from '../../../typechain-types';

const VAULT_FUNCTION_SIGNATURES = {
  // Deposit vault functions
  depositInstant: 'depositInstant(address,uint256,uint256,bytes32)',
  depositInstantWithCustomRecipient:
    'depositInstant(address,uint256,uint256,bytes32,address)',
  depositRequest: 'depositRequest(address,uint256,bytes32)',
  depositRequestWithCustomRecipient:
    'depositRequest(address,uint256,bytes32,address,uint256,uint256,address)',

  // Redemption vault functions
  redeemInstant: 'redeemInstant(address,uint256,uint256)',
  redeemInstantWithCustomRecipient:
    'redeemInstant(address,uint256,uint256,address)',
  redeemRequest: 'redeemRequest(address,uint256)',
  redeemRequestWithCustomRecipient:
    'redeemRequest(address,uint256,address,uint256,uint256,address)',
} as const;

/**
 * Pausable vault functions. `redeemFiatRequest` exists only on v1 vaults and
 * is kept for config compatibility; it is skipped for v2 vaults
 */
export type VaultFunctionName =
  | keyof typeof VAULT_FUNCTION_SIGNATURES
  | 'redeemFiatRequest';

/** Pausable v2 vault function selectors */
export const VAULT_FUNCTION_SELECTORS = Object.fromEntries(
  Object.entries(VAULT_FUNCTION_SIGNATURES).map(([name, signature]) => [
    name,
    toFunctionSelector(signature),
  ]),
) as Partial<Record<VaultFunctionName, string>>;

export type PauseFunctionsConfig = {
  [K in VaultType]?: VaultFunctionName[];
};

export type LayerZeroConfig = {
  delegate: string;
  owner?: string;
  rateLimitConfig?: {
    default?: Omit<RateLimiter.RateLimitConfigStruct, 'dstEid'>;
    overrides?: PartialConfigPerNetwork<
      Omit<RateLimiter.RateLimitConfigStruct, 'dstEid'>
    >;
  };
};

export type AxelarItsConfig = {
  operator: string;
  flowLimit?: BigNumberish;
};

export type PostDeployConfig = {
  addPaymentTokens?: AddPaymentTokensConfig;
  grantRoles?: GrantAllTokenRolesConfig;
  setRoundData?: SetRoundDataConfig;
  setRoundDataDv?: SetRoundDataConfig;
  setRoundDataRv?: SetRoundDataConfig;
  addFeeWaived?: AddFeeWaivedConfig;
  greenlist?: GreenlistConfig;
  pauseFunctions?: PauseFunctionsConfig;
  layerZero?: LayerZeroConfig;
  axelarIts?: AxelarItsConfig;
  setAaveConfig?: SetAaveConfigConfig;
  setMorphoConfig?: SetMorphoConfigConfig;
  setUsycConfig?: SetUsycConfigConfig;
  // v2 only
  instantLimits?: InstantLimitsConfig;
  mintRateLimits?: MintRateLimitsConfig;
  tokenConfig?: TokenConfig;
  freeFromMinAmount?: FreeFromMinAmountConfig;
  preferLoanLiquidity?: PreferLoanLiquidityConfig;
  setMTokenConfig?: SetMTokenVaultConfig;
  setUstbConfig?: SetUstbVaultConfig;
};

export type DeploymentConfig = {
  genericConfigs: {
    mToken?: {
      // TODO: add support
      maxSupplyCap?: BigNumberish;
    };
    customAggregator?: DeployCustomAggregatorConfig;
    customAggregatorDv?: DeployCustomAggregatorConfig;
    customAggregatorRv?: DeployCustomAggregatorConfig;
    customAggregatorAdjusted?: DeployCustomAggregatorAdjustedConfig;
    customAggregatorAdjustedDv?: DeployCustomAggregatorAdjustedConfig;
    customAggregatorAdjustedRv?: DeployCustomAggregatorAdjustedConfig;
    dataFeed?: DeployDataFeedConfig;
    /**
     * Overrides `dataFeed`'s minAnswer/maxAnswer for the DV-side data feed.
     * Falls back to `dataFeed` when unset.
     */
    dataFeedDv?: DeployDataFeedConfig;
    /**
     * Overrides `dataFeed`'s minAnswer/maxAnswer for the RV-side data feed.
     * Falls back to `dataFeed` when unset.
     */
    dataFeedRv?: DeployDataFeedConfig;
  };
  networkConfigs: Record<
    number,
    {
      dv?: DeployDvRegularConfig;
      dvUstb?: DeployDvUstbConfig;
      dvAave?: DeployDvAaveConfig;
      dvMorpho?: DeployDvMorphoConfig;
      dvMToken?: DeployDvMTokenConfig;
      dvUsyc?: DeployDvUsycConfig;
      rv?: DeployRvRegularConfig;
      rvSwapper?: DeployRvSwapperConfig;
      rvAave?: DeployRvAaveConfig;
      rvMorpho?: DeployRvMorphoConfig;
      rvMToken?: DeployRvMTokenConfig;
      rvUstb?: DeployRvUstbConfig;
      rvUsyc?: DeployRvUsycConfig;
      postDeploy?: PostDeployConfig;
    }
  >;
};

export type PaymentTokenDeploymentConfig = {
  networkConfigs: Record<
    number,
    Partial<
      Record<
        PaymentTokenName,
        {
          dataFeed?: DeployDataFeedConfig;
          customAggregator?: DeployCustomAggregatorConfig;
          postDeploy?: {
            setRoundData?: SetRoundDataConfig;
            layerZero?: { sharedDecimals: number } & Omit<
              LayerZeroConfig,
              'rateLimitConfig'
            >;
            axelar?: Omit<AxelarItsConfig, 'operator'>;
          };
        }
      >
    >
  >;
};

/** `type(uint32).max`: disables the delay (see MidasAuthLibrary.NO_DELAY) */
export const NO_DELAY = 0xffffffff;

/** `0`: no override, falls back to the role/default delay (see MidasAuthLibrary.NULL_DELAY) */
export const NULL_DELAY = 0;

export type NetworkDeploymentConfig = Record<
  number,
  {
    grantDefaultAdminRole?: GrantDefaultAdminRoleToAcAdminConfig;
    timelock?: DeployTimelockConfig;
    accessControl?: {
      /** default role timelock delay in seconds. 0 for no delay */
      defaultDelay: number;
    };
    pauseManager?: {
      /**
       * in seconds, or NO_DELAY.
       * pause delay is not configurable and is always deployed as NULL_DELAY
       */
      unpauseDelay: number;
    };
    timelockManager?: {
      securityCouncil: `0x${string}`[];
      maxPendingOperationsPerProposer: number;
    };
  }
>;

export type DeployFunction = (
  hre: HardhatRuntimeEnvironment,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ...params: any[]
) => Promise<void>;
