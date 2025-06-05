import { HardhatRuntimeEnvironment } from 'hardhat/types';

import { AddPaymentTokensConfig } from './common-vault';
import {
  DeployCustomAggregatorConfig,
  DeployCustomAggregatorDiscountedConfig,
  DeployDataFeedConfig,
} from './data-feed';
import { DeployDvConfig } from './dv';
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
      dv?: DeployDvConfig;
      rv?: DeployRvRegularConfig;
      rvBuidl?: DeployRvBuidlConfig;
      rvSwapper?: DeployRvSwapperConfig;
      postDeploy?: {
        addPaymentTokens?: AddPaymentTokensConfig;
        grantRoles?: GrantAllTokenRolesConfig;
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

export type DeployFunction = (hre: HardhatRuntimeEnvironment) => Promise<void>;
