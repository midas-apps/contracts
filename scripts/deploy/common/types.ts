import { HardhatRuntimeEnvironment } from 'hardhat/types';

import { AddPaymentTokensConfig } from './common-vault';
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

import { PaymentTokenName } from '../../../config';

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
      postDeploy?: {
        addPaymentTokens?: AddPaymentTokensConfig;
        grantRoles?: GrantAllTokenRolesConfig;
        setRoundData?: SetRoundDataConfig;
      };
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
  }
>;

export type RvType =
  | 'redemptionVault'
  | 'redemptionVaultBuidl'
  | 'redemptionVaultSwapper';

export type DeployFunction = (hre: HardhatRuntimeEnvironment) => Promise<void>;
