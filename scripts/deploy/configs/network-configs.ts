import { chainIds } from '../../../config';
import { NetworkDeploymentConfig } from '../common/types';

export const networkDeploymentConfigs: NetworkDeploymentConfig = {
  [chainIds.sepolia]: {
    grantDefaultAdminRole: {},
    timelock: {
      minDelay: 100,
      proposer: '0xa0819ae43115420beb161193b8D8Ba64C9f9faCC',
    },
  },
  [chainIds.hyperevm]: {
    grantDefaultAdminRole: {},
  },
  [chainIds.etherlink]: {
    grantDefaultAdminRole: {},
  },
};
