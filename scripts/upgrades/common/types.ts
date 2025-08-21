import { MTokenName } from '../../../config';
import { VaultType } from '../../../config/constants/addresses';

export type NetworkConfig = Record<
  number,
  {
    transferProxyAdminOwnership?: {
      newOwner: string;
    };
  }
>;

export type UpgradeConfig = {
  upgrades: Record<
    string,
    {
      initializers?: Partial<
        Record<
          VaultType,
          {
            initializer: string;
            defaultInitializerArgs?: unknown[];
          }
        >
      >;
      overrideSalt?: string;
      vaults: Record<
        number,
        {
          // default - false
          all?: boolean;
          overrides?: Partial<
            Record<
              MTokenName,
              {
                // default - false
                all?: boolean;
                overrides?: Partial<
                  Record<
                    VaultType,
                    | {
                        vaultTypeTo?: VaultType;
                        overrideImplementation?: string;
                        initializer?: string;
                        initializerArgs?: unknown[];
                      }
                    | boolean // if true - the {} config will be used
                  >
                >;
              }
            >
          >;
        }
      >;
    }
  >;
};
