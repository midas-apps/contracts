import { MTokenName } from '../../../config';
import { V2VaultType } from '../../../config/constants/addresses';

export type NetworkConfig = Record<
  number,
  {
    transferProxyAdminOwnership?: {
      newOwner: string;
    };
  }
>;

/**
 * Vault upgrades target v2 vaults only (`*V2` address keys); vault types
 * in configs are base names (e.g. `depositVault` -> `depositVaultV2`)
 */
export type UpgradeConfig = {
  upgrades: Record<
    string,
    {
      initializers?: Partial<
        Record<
          V2VaultType,
          {
            initializer: string;
            defaultInitializerArgs?: unknown[];
          }
        >
      >;
      overrideSalt?: string;
      tokens?: Record<number, MTokenName[]>;
      vaults?: Record<
        number,
        {
          // default - false
          all?: boolean;
          overrides?: Partial<
            Record<
              MTokenName,
              | {
                  // default - false
                  all?: boolean;
                  overrides?: Partial<
                    Record<
                      V2VaultType,
                      | {
                          vaultTypeTo?: V2VaultType;
                          overrideImplementation?: string;
                          initializer?: string;
                          initializerArgs?: unknown[];
                        }
                      | boolean // if true - the {} config will be used
                    >
                  >;
                }
              | false
            >
          >;
        }
      >;
    }
  >;
};
