import { HardhatRuntimeEnvironment } from 'hardhat/types';

import { chainIds, MTokenName } from '../../../config';
import { getCurrentAddresses } from '../../../config/constants/addresses';
import { isMTokenName } from '../../../helpers/utils';

/**
 * mTokens skipped for aggregator-timelapsed-v1 on every chain.
 * Merged with any per-chain `exclude` below.
 */
export const aggregatorTimelapsedExcludedMTokens: MTokenName[] = [
  'cUSDO',
  'JIV',
  'kmiUSD',
  'obeatUSD',
  'wNLP',
  'zeroGBTCV',
  'zeroGETHV',
  'zeroGUSDV',
  'dnFART',
  'dnHYPE',
  'dnPUMP',
  'hbUSDC',
  'hbUSDT',
  'hbXAUt',
  'kitBTC',
  'kitHYPE',
  'kitUSD',
  'liquidHYPE',
  'lstHYPE',
  'mWildUSD',
  'wVLP',
  'TACmMEV',
  'TACmBTC',
  'TACmEDGE',
];

/**
 * Targets for aggregator timelapsed batch upgrades per chain id.
 *
 * • `{ all: true }` — every mToken that has a regular customFeed address
 * • `{ all: true, exclude }` — `all`, minus global + per-chain excluded tokens
 * • `{ mTokens: [...] }` — explicit list only
 */
export type AggregatorTimelapsedChainTargets =
  | { all: true; exclude?: MTokenName[] }
  | { mTokens: MTokenName[] };

export type AggregatorTimelapsedUpgradeConfig = {
  upgrades: Record<
    string,
    {
      targets: Record<number, AggregatorTimelapsedChainTargets>;
    }
  >;
};

/**
 * Targets every address-book network with regular custom aggregators. Growth
 * feeds already enforce the 1h check and do not need this upgrade.
 */
export const aggregatorTimelapsedUpgradeConfigs: AggregatorTimelapsedUpgradeConfig =
  {
    upgrades: {
      'aggregator-timelapsed-v1': {
        targets: {
          [chainIds.main]: { all: true },
          // [chainIds.arbitrum]: { all: true },
          [chainIds.base]: { all: true, exclude: ['mTBILL'] },
          [chainIds.oasis]: { all: true },
          [chainIds.plume]: { all: true },
          [chainIds.rootstock]: { all: true },
          [chainIds.hyperevm]: { all: true },
          [chainIds.katana]: { all: true },
          [chainIds.xrplevm]: { all: true },
          [chainIds.etherlink]: { all: true },
          [chainIds.zerog]: { all: true },
          [chainIds.tac]: { all: true },
          [chainIds.plasma]: { all: true },
          [chainIds.bsc]: { all: true },
          [chainIds.scroll]: { all: true },
          [chainIds.monad]: { all: true },
          [chainIds.injective]: { all: true },
          [chainIds.optimism]: { all: true },
          // [chainIds.sepolia]: { all: true },
          // [chainIds.tacTestnet]: { all: true },
        },
      },
    },
  };

export const resolveTimelapsedMTokens = (
  hre: HardhatRuntimeEnvironment,
  upgradeId: string,
): MTokenName[] => {
  const entry = aggregatorTimelapsedUpgradeConfigs.upgrades[upgradeId];

  if (!entry) {
    throw new Error(
      `Aggregator timelapsed config not found for upgrade id "${upgradeId}"`,
    );
  }

  const chainId = hre.network.config.chainId;
  if (chainId == null) {
    throw new Error('chainId is missing on hre.network.config');
  }

  const targets = entry.targets[chainId];
  if (!targets) {
    throw new Error(
      `No aggregator timelapsed targets for upgrade "${upgradeId}" on chain ${chainId}`,
    );
  }

  const addresses = getCurrentAddresses(hre);
  if (!addresses) {
    throw new Error('Addresses not found');
  }

  let list: MTokenName[];

  if ('all' in targets && targets.all) {
    list = Object.keys(addresses)
      .filter(isMTokenName)
      .filter((mToken) => {
        const tokenAddresses = addresses[mToken];
        return Boolean(tokenAddresses?.customFeed);
      });
    const excluded = new Set([
      ...aggregatorTimelapsedExcludedMTokens,
      ...(targets.exclude ?? []),
    ]);
    if (excluded.size > 0) {
      list = list.filter((m) => !excluded.has(m));
    }
  } else if ('mTokens' in targets) {
    list = [...targets.mTokens];
  } else {
    throw new Error(
      `Invalid aggregator timelapsed targets for "${upgradeId}" on chain ${chainId}`,
    );
  }

  return [...new Set(list)].sort((a, b) =>
    a.localeCompare(b, 'en', { sensitivity: 'base' }),
  );
};
