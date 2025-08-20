import { chainIds, MTokenName } from '../../../config';
import { VaultType } from '../../../config/constants/addresses';

export type UpgradeConfig = Record<
  number,
  {
    transferProxyAdminOwnership?: {
      newOwner: string;
    };
    upgrades: Record<
      string,
      {
        vaults: {
          initializers?: Partial<Record<VaultType, { initializer: string }>>;
          toUpgrade:
            | 'all'
            | {
                vaults?:
                  | 'all'
                  | {
                      vaultType: VaultType;
                      vaultTypeTo?: VaultType;
                      overrideImplementation?: string;
                      initializer?: string;
                      initializerArgs?: unknown;
                    }[];
                mToken: MTokenName;
              }[];
          overrideSalt?: string;
        };
      }
    >;
  }
>;

export const upgradeConfig: UpgradeConfig = {
  [chainIds.sepolia]: {
    transferProxyAdminOwnership: {
      newOwner: '0xA70009c23dbF1222D66b0ca847b4c33aE2e07B41',
    },
    upgrades: {
      'batch-upgrade-scope-w-supply-cap': {
        vaults: {
          toUpgrade: [
            {
              mToken: 'mRE7',
              vaults: [
                {
                  vaultType: 'depositVault',
                  initializer: 'initializeV2',
                },
              ],
            },
          ],
        },
      },
    },
  },
};
