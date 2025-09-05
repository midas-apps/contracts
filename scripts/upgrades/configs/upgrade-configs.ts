import { constants } from 'ethers';

import { chainIds } from '../../../config';
import { UpgradeConfig } from '../common/types';

export const upgradeConfigs: UpgradeConfig = {
  upgrades: {
    'batch-upgrade-scope-w-supply-cap': {
      initializers: {
        depositVault: {
          initializer: 'initializeV2',
          defaultInitializerArgs: [constants.MaxUint256],
        },
      },
      vaults: {
        [chainIds.sepolia]: {
          overrides: {
            mMEV: {
              overrides: {
                depositVault: true,
              },
            },
          },
        },
        [chainIds.katana]: {
          all: true,
        },
        [chainIds.hyperevm]: {
          all: true,
        },
        [chainIds.base]: {
          all: true,
        },
      },
    },
  },
};
