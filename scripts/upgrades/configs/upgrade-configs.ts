import { chainIds } from '../../../config';
import { UpgradeConfig } from '../common/types';

/**
 * `vaults` entries target v2 vaults only (`*V2` address keys). v1 vault
 * upgrades are done from the `main` branch
 */
export const upgradeConfigs: UpgradeConfig = {
  upgrades: {
    'mtoken-blacklist-enforcement': {
      tokens: {
        [chainIds.robinhood]: ['mGLO'],
        [chainIds.base]: ['mGLO'],
        [chainIds.main]: ['mHYPER'],
        [chainIds.monad]: ['mHYPER'],
        [chainIds.plasma]: ['mHYPER'],
        [chainIds.katana]: ['mHYPER'],
      },
    },
    'mwin-upgrade-permissioned-min-balance': {
      tokens: {
        [chainIds.main]: ['mWIN'],
      },
    },
  },
};
