import { chainIds } from '../../../config';
import { NetworkConfig } from '../common/types';

export const networkConfigs: NetworkConfig = {
  [chainIds.sepolia]: {
    transferProxyAdminOwnership: {
      newOwner: '0x74e0a55Ea3Db85F6106FFD69Ef7c9829fd130888',
    },
  },
};
