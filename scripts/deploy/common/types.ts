import { HardhatRuntimeEnvironment } from 'hardhat/types';

import { AddFeeWaivedConfig, AddPaymentTokensConfig } from './common-vault';
import {
  DeployCustomAggregatorConfig,
  DeployCustomAggregatorDiscountedConfig,
  DeployDataFeedConfig,
  SetRoundDataConfig,
} from './data-feed';
import { DeployDvRegularConfig, DeployDvUstbConfig } from './dv';
import {
  GrantAllTokenRolesConfig,
  GrantDefaultAdminRoleToAcAdminConfig,
} from './roles';
import {
  DeployRvBuidlConfig,
  DeployRvRegularConfig,
  DeployRvSwapperConfig,
} from './rv';
import { DeployTimelockConfig } from './timelock';
import { toFunctionSelector } from './utils';

import { PaymentTokenName } from '../../../config';
import { VaultType } from '../../../config/constants/addresses';

export const VAULT_FUNCTION_SELECTORS = {
  // Deposit vault functions
  depositInstant: toFunctionSelector(
    'depositInstant(address,uint256,uint256,bytes32)',
  ),
  depositInstantWithCustomRecipient: toFunctionSelector(
    'depositInstant(address,uint256,uint256,bytes32,address)',
  ),

  // Redemption vault functions
  redeemInstant: toFunctionSelector('redeemInstant(address,uint256,uint256)'),
  redeemInstantWithCustomRecipient: toFunctionSelector(
    'redeemInstant(address,uint256,uint256,address)',
  ),
} as const;

export type VaultFunctionName = keyof typeof VAULT_FUNCTION_SELECTORS;

export type PauseFunctionsConfig = {
  [K in VaultType]?: VaultFunctionName[];
};

export type PostDeployConfig = {
  addPaymentTokens?: AddPaymentTokensConfig;
  grantRoles?: GrantAllTokenRolesConfig;
  setRoundData?: SetRoundDataConfig;
  addFeeWaived?: AddFeeWaivedConfig;
  pauseFunctions?: PauseFunctionsConfig;
};

export type DeploymentConfig = {
  genericConfigs: {
    customAggregator?: DeployCustomAggregatorConfig;
    customAggregatorDiscounted?: DeployCustomAggregatorDiscountedConfig;
    dataFeed?: DeployDataFeedConfig;
  };
  networkConfigs: Record<
    number,
    {
      dv?: DeployDvRegularConfig;
      dvUstb?: DeployDvUstbConfig;
      rv?: DeployRvRegularConfig;
      rvBuidl?: DeployRvBuidlConfig;
      rvSwapper?: DeployRvSwapperConfig;
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

export type RvType =
  | 'redemptionVault'
  | 'redemptionVaultBuidl'
  | 'redemptionVaultSwapper';

export type DeployFunction = (hre: HardhatRuntimeEnvironment) => Promise<void>;
