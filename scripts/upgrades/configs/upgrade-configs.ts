import { BigNumberish, constants, utils } from 'ethers';

import { networkUptimeFeeds } from '../../../config/constants/addresses';
import { mTokensMetadata } from '../../../helpers/mtokens-metadata';
import { getAllUserFacingRoles } from '../../../helpers/roles';
import { DEFAULT_CLAWBACK_RECEIVER } from '../../deploy/common/types';
import { networkDeploymentConfigs } from '../../deploy/configs/network-configs';
import { ContractsUpgradeConfig, UpgradeConfig } from '../common/types';

/**
 * mToken `initializeV3` values shared by every mToken of the network. To use
 * different values for an mToken set `initializerArgs` of its `token` override
 */
export type V2CoreUpgradeParams = {
  /** defaults to `DEFAULT_CLAWBACK_RECEIVER` */
  clawbackReceiver?: string;
  /** `constants.MaxUint256` for unlimited */
  maxSupplyCap: BigNumberish;
};

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
 *   default) and max supply cap are passed explicitly, permissioned/min balance flags are taken from the mToken
 *   metadata and are checked against the deployed v1 token
 * - DataFeed `initializeV2`: sequencer uptime feed of the network from
 *   `networkUptimeFeeds`, zero address if the network has none
 *
 * Entries of `overrides` are merged on top of these defaults
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

  if (maxSupplyCap === undefined || maxSupplyCap === null) {
    throw new Error(`maxSupplyCap is not set for chain ${chainId}`);
  }

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
          return [
            clawbackReceiver,
            maxSupplyCap,
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
      all: {
        token: true,
        customFeed: true,
        customFeedDv: true,
        customFeedRv: true,
        customFeedGrowth: true,
        dataFeed: true,
        dataFeedDv: true,
        dataFeedRv: true,
        ...overrides?.mTokens?.all,
      },
    },
    paymentTokens: {
      ...overrides?.paymentTokens,
      all: {
        dataFeed: true,
        aggregator: true,
        numeratorDataFeed: true,
        numeratorAggregator: true,
        denominatorDataFeed: true,
        denominatorAggregator: true,
        ...overrides?.paymentTokens?.all,
      },
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
    'v2-core-upgrade': {
      contracts: {
        // [chainIds.sepolia]: v2CoreUpgrade(
        //   chainIds.sepolia,
        //   { maxSupplyCap: constants.MaxUint256 },
        //   {
        //     mTokens: { overrides: { mTBILL: false } },
        //     paymentTokens: { overrides: { usdc: { aggregator: false } } },
        //   },
        // ),
      },
    },
  },
};
