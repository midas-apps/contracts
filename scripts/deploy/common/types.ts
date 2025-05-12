import {
  DeployCustomAggregatorConfig,
  DeployDataFeedConfig,
} from './data-feed';
import { DeployDvConfig } from './dv';
import {
  DeployRvBuidlConfig,
  DeployRvRegularConfig,
  DeployRvSwapperConfig,
} from './rv';

export type DeploymentConfig = {
  genericConfigs: {
    customAggregator?: DeployCustomAggregatorConfig;
    dataFeed?: DeployDataFeedConfig;
  };
  networkConfigs: Record<
    number,
    {
      dv?: DeployDvConfig;
      rv?: DeployRvRegularConfig;
      rvBuidl?: DeployRvBuidlConfig;
      rvSwapper?: DeployRvSwapperConfig;
    }
  >;
};
