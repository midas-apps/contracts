import { HardhatRuntimeEnvironment } from 'hardhat/types';

import { detectAggregatorType } from './aggregator-deviation';
import {
  executeUpgradeContracts,
  proposeUpgradeContracts,
} from './upgrade-contracts';

import { MTokenName } from '../../../config';
import { getCurrentAddresses } from '../../../config/constants/addresses';
import { resolveTimelapsedMTokens } from '../configs/aggregator-timelapsed-config';

const upgradeIdSuffix = 'aggregator-timelapsed-v1';

const runAggregatorTimelapsedForMToken = async (
  hre: HardhatRuntimeEnvironment,
  mToken: MTokenName,
  upgradeContracts: typeof proposeUpgradeContracts,
): Promise<'upgraded' | 'skipped'> => {
  const networkAddresses = getCurrentAddresses(hre);
  const tokenAddresses = networkAddresses?.[mToken];

  if (!tokenAddresses) {
    throw new Error(`Token addresses not found for ${mToken}`);
  }

  const info = detectAggregatorType(tokenAddresses);

  if (info.contractType === 'customAggregatorGrowth') {
    console.log(
      `${mToken}: customAggregatorGrowth already enforces 1h cooldown — skipping`,
    );
    return 'skipped';
  }

  const upgradeId = `${mToken.toLowerCase()}-${upgradeIdSuffix}`;

  await upgradeContracts(hre, upgradeId, info.addressKey, [
    {
      mToken,
      addresses: tokenAddresses,
      contracts: [
        {
          contractType: info.contractType,
        },
      ],
    },
  ]);
  return 'upgraded';
};

export const resolveAggregatorTimelapsedMTokenRunList = (
  hre: HardhatRuntimeEnvironment,
): MTokenName[] => {
  if (hre.mtoken) {
    return [hre.mtoken];
  }
  if (!hre.action) {
    throw new Error(
      'Provide --mtoken <MTOKEN> for a single product, or --action <upgradeId> for a batch (configure targets in scripts/upgrades/configs/aggregator-timelapsed-config.ts)',
    );
  }
  return resolveTimelapsedMTokens(hre, hre.action);
};

export const proposeAggregatorTimelapsedForMToken = (
  hre: HardhatRuntimeEnvironment,
  mToken: MTokenName,
): Promise<'upgraded' | 'skipped'> =>
  runAggregatorTimelapsedForMToken(hre, mToken, proposeUpgradeContracts);

export const executeAggregatorTimelapsedForMToken = (
  hre: HardhatRuntimeEnvironment,
  mToken: MTokenName,
): Promise<'upgraded' | 'skipped'> =>
  runAggregatorTimelapsedForMToken(hre, mToken, executeUpgradeContracts);
