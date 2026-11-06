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
  DeployRvUsycConfig,
} from './rv';
import { DeployTimelockConfig } from './timelock';
import { toFunctionSelector } from './utils';

import { PartialConfigPerNetwork, PaymentTokenName } from '../../../config';
import { VaultType } from '../../../config/constants/addresses';
import { RateLimiter } from '../../../typechain-types';

export const VAULT_FUNCTION_SELECTORS = {
  // Deposit vault functions
  depositInstant: toFunctionSelector(
    'depositInstant(address,uint256,uint256,bytes32)',
  ),
  depositInstantWithCustomRecipient: toFunctionSelector(
    'depositInstant(address,uint256,uint256,bytes32,address)',
  ),
  depositRequest: toFunctionSelector('depositRequest(address,uint256,bytes32)'),
  depositRequestWithCustomRecipient: toFunctionSelector(
    'depositRequest(address,uint256,bytes32,address)',
  ),

  // Redemption vault functions
  redeemInstant: toFunctionSelector('redeemInstant(address,uint256,uint256)'),
  redeemInstantWithCustomRecipient: toFunctionSelector(
    'redeemInstant(address,uint256,uint256,address)',
  ),
  redeemFiatRequest: toFunctionSelector('redeemFiatRequest(uint256)'),
  redeemRequest: toFunctionSelector('redeemRequest(address,uint256)'),
  redeemRequestWithCustomRecipient: toFunctionSelector(
    'redeemRequest(address,uint256,address)',
  ),
} as const;

export const VAULT_FUNCTION_SELECTORS_V2 = {
  // Deposit vault functions
  depositInstant: VAULT_FUNCTION_SELECTORS.depositInstant,
  depositInstantWithCustomRecipient:
    VAULT_FUNCTION_SELECTORS.depositInstantWithCustomRecipient,
  depositRequest: VAULT_FUNCTION_SELECTORS.depositRequest,
  depositRequestWithHoldback: toFunctionSelector(
    'depositRequest(address,uint256,bytes32,address,uint256,uint256,address)',
  ),

  // Redemption vault functions
  redeemInstant: VAULT_FUNCTION_SELECTORS.redeemInstant,
  redeemInstantWithCustomRecipient:
    VAULT_FUNCTION_SELECTORS.depositInstantWithCustomRecipient,
  redeemRequest: VAULT_FUNCTION_SELECTORS.depositRequest,
  redeemRequestWithHoldback: toFunctionSelector(
    'redeemRequest(address,uint256,address,uint256,uint256,address)',
  ),
} as const;

export type VaultFunctionName = VaultFunctionNameV1 | VaultFunctionNameV2;

export type VaultFunctionNameV1 = keyof typeof VAULT_FUNCTION_SELECTORS;
export type VaultFunctionNameV2 = keyof typeof VAULT_FUNCTION_SELECTORS_V2;

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
};

export type DeploymentConfig = {
  genericConfigs: {
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

export type NetworkDeploymentConfig = Record<
  number,
  {
    grantDefaultAdminRole?: GrantDefaultAdminRoleToAcAdminConfig;
    timelock?: DeployTimelockConfig;
  }
>;

export type DeployFunction = (
  hre: HardhatRuntimeEnvironment,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ...params: any[]
) => Promise<void>;
