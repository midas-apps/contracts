import { MTokenName, Network, PaymentTokenName } from '../../../config';
import { V2VaultType } from '../../../config/constants/addresses';

/** Implementation contract to upgrade to (keys of `getCommonContractNames`) */
export type UpgradeContractType =
  | 'ac'
  | 'timelockManager'
  | 'token'
  | 'customAggregator'
  | 'customAggregatorGrowth'
  | 'dataFeed'
  | 'dataFeedComposite'
  | 'dataFeedMultiply';

/** mToken proxies (keys of `TokenAddresses`) */
export type MTokenUpgradeKey =
  | 'token'
  | 'customFeed'
  | 'customFeedGrowth'
  | 'customFeedDv'
  | 'customFeedRv'
  | 'dataFeed'
  | 'dataFeedDv'
  | 'dataFeedRv';

/** payment token proxies (`numerator*`/`denominator*` - composite feed parts) */
export type PaymentTokenUpgradeKey =
  | 'dataFeed'
  | 'aggregator'
  | 'numeratorDataFeed'
  | 'numeratorAggregator'
  | 'denominatorDataFeed'
  | 'denominatorAggregator';

export type UpgradeInitializerArgsResolver = (ctx: {
  chainId: number;
  network: Network;
  proxyAddress: string;
  contractType: UpgradeContractType;
  mToken?: MTokenName;
  paymentToken?: PaymentTokenName;
}) => unknown[];

/** initializer that is called together with the upgrade of a contract type */
export type ContractTypeInitializer = {
  initializer: string;
  /** static args or a resolver called for every contract it applies to */
  initializerArgs?: unknown[] | UpgradeInitializerArgsResolver;
  /**
   * for `initializeV<N>` initializers: upgrade without the initializer call
   * if the proxy has already consumed reinitializer version N
   */
  skipInitializerIfConsumed?: boolean;
};

export type ContractUpgradeOverride = {
  /**
   * defaults from the address key: payment token `*Aggregator` keys default
   * to `customAggregator`, composite payment token `dataFeed` to the
   * `feedType` of the payment token deployment config. Always validated
   * against the deployed contract on-chain; composite/multiply data feeds
   * can't be told apart on-chain so they are rejected unless the type comes
   * from here or from the deployment config
   */
  contractType?: UpgradeContractType;
  overrideImplementation?: string;
  /**
   * implementation constructor args. Default: roles of the mToken for mToken
   * contracts, default admin role for the payment token feeds
   */
  constructorArgs?: unknown[];
  /**
   * disables the guard that fails the upgrade if it changes a role of the
   * contract (or enables / disables the permissioned and min balance
   * features of a v1 mToken). Only for the intended changes
   */
  allowRoleChanges?: boolean;
  // override the initializer of the contract type (see `initializers`)
} & Partial<ContractTypeInitializer>;

// if true - the {} config will be used, if false - excluded
export type ContractUpgradeEntry = ContractUpgradeOverride | boolean;

export type ContractsUpgradeConfig = {
  /**
   * initializers per contract type that is being upgraded to, used by every
   * entry that does not set its own. Precedence: entry -> these ->
   * `initializers` of the upgrade
   */
  initializers?: Partial<Record<UpgradeContractType, ContractTypeInitializer>>;
  accessControl?: ContractUpgradeEntry;
  timelockManager?: ContractUpgradeEntry;
  mTokens?: {
    // applied to every mToken that has the key's address configured.
    // per-mToken override entries are merged on top of the `all` entry
    all?: Partial<Record<MTokenUpgradeKey, ContractUpgradeEntry>>;
    overrides?: Partial<
      Record<
        MTokenName,
        Partial<Record<MTokenUpgradeKey, ContractUpgradeEntry>> | false
      >
    >;
  };
  paymentTokens?: {
    // applied to every payment token that has the key's address configured.
    // `*Aggregator` keys resolved from here are skipped if the aggregator is
    // not a Midas contract (third party feed).
    // per-payment token override entries are merged on top of the `all` entry
    all?: Partial<Record<PaymentTokenUpgradeKey, ContractUpgradeEntry>>;
    overrides?: Partial<
      Record<
        PaymentTokenName,
        Partial<Record<PaymentTokenUpgradeKey, ContractUpgradeEntry>> | false
      >
    >;
  };
};

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
          V2VaultType | UpgradeContractType,
          {
            initializer: string;
            defaultInitializerArgs?: unknown[];
          }
        >
      >;
      overrideSalt?: string;
      tokens?: Record<number, MTokenName[]>;
      contracts?: Record<number, ContractsUpgradeConfig>;
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
