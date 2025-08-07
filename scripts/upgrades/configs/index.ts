import { chainIds, MTokenName } from '../../../config';

export type UpgradeConfig = Record<
  number,
  {
    vaults: {
      toUpgrade:
        | 'all'
        | {
            mToken: MTokenName;
            overrideImplementation?: string;
          }[];
      salt: string;
    };
  }
>;

export const upgradeConfig: UpgradeConfig = {
  [chainIds.sepolia]: {
    vaults: {
      toUpgrade: [{ mToken: 'mRE7' }],
      salt: 'batch-upgrade-scope',
    },
  },
};
