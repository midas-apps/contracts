import { constants } from 'ethers';

import { chainIds } from '../../../config';
import { UpgradeConfig } from '../common/types';

export const upgradeConfigs: UpgradeConfig = {
  upgrades: {
    'mfone-rv-swapper-to-mtoken': {
      vaults: {
        [chainIds.sepolia]: {
          overrides: {
            mFONE: {
              overrides: {
                redemptionVaultSwapper: {
                  vaultTypeTo: 'redemptionVaultMToken',
                },
              },
            },
          },
        },
        [chainIds.main]: {
          overrides: {
            mFONE: {
              overrides: {
                redemptionVaultSwapper: {
                  vaultTypeTo: 'redemptionVaultMToken',
                },
              },
            },
          },
        },
      },
    },
    'mwin-separate-whitelist': {
      vaults: {
        [chainIds.main]: {
          overrides: {
            mWIN: {
              overrides: {
                depositVault: true,
                redemptionVaultSwapper: true,
              },
            },
          },
        },
      },
    },
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
        [chainIds.rootstock]: {
          all: true,
        },
        [chainIds.oasis]: {
          all: true,
        },
        [chainIds.plume]: {
          all: true,
        },
        [chainIds.etherlink]: {
          all: true,
        },
        [chainIds.main]: {
          all: true,
          overrides: {
            TACmBTC: false,
            TACmEDGE: false,
            TACmMEV: false,
          },
        },
      },
    },
  },
};
