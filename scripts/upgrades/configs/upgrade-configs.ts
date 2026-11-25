import { BigNumberish, constants, utils } from 'ethers';
import { parseUnits } from 'ethers/lib/utils';

import { chainIds, MTokenName } from '../../../config';
import {
  midasAddressesPerNetwork,
  networkUptimeFeeds,
} from '../../../config/constants/addresses';
import { mTokensMetadata } from '../../../helpers/mtokens-metadata';
import { getAllUserFacingRoles } from '../../../helpers/roles';
import { DEFAULT_CLAWBACK_RECEIVER } from '../../deploy/common/types';
import { networkDeploymentConfigs } from '../../deploy/configs/network-configs';
import { ContractsUpgradeConfig, UpgradeConfig } from '../common/types';

type MTokensUpgradeConfig = NonNullable<ContractsUpgradeConfig['mTokens']>;
type PaymentTokensUpgradeConfig = NonNullable<
  ContractsUpgradeConfig['paymentTokens']
>;

/**
 * mToken `initializeV3` values of the network. To use completely different
 * args for an mToken set `initializerArgs` of its `token` override
 */
export type V2CoreUpgradeParams = {
  /** shared by every mToken, defaults to `DEFAULT_CLAWBACK_RECEIVER` */
  clawbackReceiver?: string;
  /**
   * per mToken, required for every mToken whose token is upgraded.
   * `constants.MaxUint256` for unlimited
   */
  maxSupplyCap: Partial<Record<MTokenName, BigNumberish>>;
};

/** `true` entries of the overrides turn them into an allowlist */
const hasSelectedEntries = (overrides: Record<string, unknown> | undefined) =>
  Object.values(overrides ?? {}).some((v) => v === true);

/**
 * v2 core upgrade of a network: access control and every mToken / payment
 * token proxy that is present in the addresses:
 * - mTokens: token, custom aggregators and data feeds
 * - payment tokens: data feeds (regular, composite and their parts) and the
 *   aggregators that are Midas contracts (third party ones are skipped)
 *
 * Reinitializers are called together with the upgrade and are skipped for the
 * proxies that have already consumed them:
 * - MidasAccessControl `initializeV2`
 * - mToken `initializeV3`: clawback receiver (`DEFAULT_CLAWBACK_RECEIVER` by
 *   default) and the max supply cap of the mToken are passed explicitly,
 *   permissioned/min balance flags are taken from the mToken metadata and are
 *   checked against the deployed v1 token
 * - DataFeed `initializeV2`: sequencer uptime feed of the network from
 *   `networkUptimeFeeds`, zero address if the network has none
 *
 * Entries of `overrides` are merged on top of these defaults. If any
 * `mTokens.overrides` (`paymentTokens.overrides`) entry is `true`, only the
 * listed mTokens (payment tokens) are upgraded:
 * `mTokens: { overrides: { mXRP: true } }` upgrades all the mXRP contracts
 * and none of the other mTokens
 */
export const v2CoreUpgrade = (
  chainId: number,
  {
    clawbackReceiver = DEFAULT_CLAWBACK_RECEIVER,
    maxSupplyCap,
  }: V2CoreUpgradeParams,
  overrides?: ContractsUpgradeConfig,
): ContractsUpgradeConfig => {
  if (
    !utils.isAddress(clawbackReceiver) ||
    clawbackReceiver === constants.AddressZero
  ) {
    throw new Error(`Invalid clawbackReceiver for chain ${chainId}`);
  }

  const isMTokensAllowlist = hasSelectedEntries(overrides?.mTokens?.overrides);
  const isPaymentTokensAllowlist = hasSelectedEntries(
    overrides?.paymentTokens?.overrides,
  );

  const mTokensAll: MTokensUpgradeConfig['all'] = isMTokensAllowlist
    ? overrides?.mTokens?.all
    : {
        token: true,
        customFeed: true,
        customFeedDv: true,
        customFeedRv: true,
        customFeedGrowth: true,
        dataFeed: true,
        dataFeedDv: true,
        dataFeedRv: true,
        ...overrides?.mTokens?.all,
      };

  const paymentTokensAll: PaymentTokensUpgradeConfig['all'] =
    isPaymentTokensAllowlist
      ? overrides?.paymentTokens?.all
      : {
          dataFeed: true,
          aggregator: true,
          numeratorDataFeed: true,
          numeratorAggregator: true,
          denominatorDataFeed: true,
          denominatorAggregator: true,
          ...overrides?.paymentTokens?.all,
        };

  return {
    accessControl: true,
    ...overrides,
    initializers: {
      ac: {
        initializer: 'initializeV2',
        initializerArgs: () => [
          networkDeploymentConfigs[chainId]?.accessControl?.defaultDelay,
          getAllUserFacingRoles(),
        ],
        skipInitializerIfConsumed: true,
      },
      token: {
        initializer: 'initializeV3',
        initializerArgs: ({ mToken }) => {
          if (!mToken) throw new Error('mToken is required for initializeV3');
          const metadata = mTokensMetadata[mToken];
          if (!metadata) throw new Error(`${mToken} metadata is not found`);
          const mTokenMaxSupplyCap = maxSupplyCap[mToken];
          if (mTokenMaxSupplyCap === undefined || mTokenMaxSupplyCap === null) {
            throw new Error(
              `maxSupplyCap is not set for ${mToken} on chain ${chainId}`,
            );
          }
          return [
            clawbackReceiver,
            mTokenMaxSupplyCap,
            !!metadata.isPermissioned,
            !!metadata.isMinBalance,
          ];
        },
        skipInitializerIfConsumed: true,
      },
      dataFeed: {
        initializer: 'initializeV2',
        initializerArgs: ({ network }) => [
          networkUptimeFeeds[network] ?? constants.AddressZero,
        ],
        skipInitializerIfConsumed: true,
      },
      ...overrides?.initializers,
    },
    mTokens: {
      ...overrides?.mTokens,
      all: mTokensAll,
    },
    paymentTokens: {
      ...overrides?.paymentTokens,
      all: paymentTokensAll,
    },
  };
};

/**
 * `vaults` entries target v2 vaults only (`*V2` address keys). v1 vault
 * upgrades are done from the `main` branch
 *
 * `contracts` entries are upgraded with `upgrade_Contracts.ts`
 * (`timelock:upgrade:contracts --action <propose|execute> --upgrade <id>`)
 */
export const upgradeConfigs: UpgradeConfig = {
  upgrades: {
    'radyc-upgrade': {
      vaults: {
        [chainIds.sepolia]: {
          overrides: {
            radUSD: {
              overrides: {
                redemptionVault: true,
              },
            },
            radYC: {
              all: true,
            },
          },
        },
      },
    },
    'radusd-upgrade': {
      vaults: {
        [chainIds.sepolia]: {
          overrides: {
            radUSD: {
              overrides: {
                redemptionVault: {
                  initializer: 'initializeV2',
                  initializerArgs: [
                    midasAddressesPerNetwork.sepolia!.radUSD!.dataFeedRv,
                  ],
                },
              },
            },
          },
        },
      },
    },
    'v2-core-upgrade': {
      contracts: {
        [chainIds.bsc]: v2CoreUpgrade(
          chainIds.bsc,
          { maxSupplyCap: { mXRP: constants.MaxUint256 } },
          {
            mTokens: { overrides: { mXRP: true } },
          },
        ),
        [chainIds.arc]: v2CoreUpgrade(
          chainIds.arc,
          {
            maxSupplyCap: {
              radUSD: parseUnits('50000'),
              radYC: parseUnits('50000'),
            },
          },
          {
            mTokens: { overrides: { radUSD: true, radYC: true } },
          },
        ),
      },
    },
  },
};
