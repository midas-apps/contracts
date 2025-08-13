import { chainIds } from '../../../config';
import { NetworkDeploymentConfig } from '../common/types';

export const networkDeploymentConfigs: NetworkDeploymentConfig = {
  [chainIds.sepolia]: {
    grantDefaultAdminRole: {},
  },
  [chainIds.hyperevm]: {
    grantDefaultAdminRole: {},
  },
  [chainIds.etherlink]: {
    grantDefaultAdminRole: {},
  },
};
