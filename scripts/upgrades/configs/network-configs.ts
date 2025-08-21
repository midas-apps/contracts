import { chainIds } from '../../../config';
import { NetworkConfig } from '../common/types';

export const networkConfigs: NetworkConfig = {
  [chainIds.sepolia]: {
    transferProxyAdminOwnership: {
      newOwner: '0xA70009c23dbF1222D66b0ca847b4c33aE2e07B41',
    },
  },
};
