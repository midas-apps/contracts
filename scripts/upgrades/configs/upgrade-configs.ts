import { chainIds } from '../../../config';
import { UpgradeConfig } from '../common/types';

export const upgradeConfigs: UpgradeConfig = {
  upgrades: {
    'batch-upgrade-scope-w-supply-cap': {
      initializers: {
        depositVault: {
          initializer: 'initializeV2',
        },
      },
      vaults: {
        [chainIds.sepolia]: {
          all: true,
          overrides: {
            mRE7: {
              all: false,
              overrides: {
                depositVault: false,
              },
            },
          },
        },
      },
    },
  },
};
