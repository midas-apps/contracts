import { HardhatRuntimeEnvironment } from 'hardhat/types';

import {
  executeAggregatorTimelapsedForMToken,
  resolveAggregatorTimelapsedMTokenRunList,
} from './common/aggregator-timelapsed-upgrade';

import { MTokenName } from '../../config';
import { DeployFunction } from '../deploy/common/types';

const func: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  const mTokens = resolveAggregatorTimelapsedMTokenRunList(hre);
  const failures: { mToken: MTokenName; error: string }[] = [];
  let upgraded = 0;
  let skipped = 0;

  console.log(
    `Aggregator timelapsed execute — ${
      mTokens.length
    } mToken(s): ${mTokens.join(', ')}`,
  );

  for (const mToken of mTokens) {
    hre.mtoken = mToken;
    try {
      const outcome = await executeAggregatorTimelapsedForMToken(hre, mToken);
      if (outcome === 'skipped') {
        skipped++;
      } else {
        upgraded++;
      }
    } catch (e) {
      console.error(`Upgrade failed with error ${e}`);
      failures.push({
        mToken,
        error: e instanceof Error ? e.message : String(e),
      });
    }
  }

  console.log(
    `Aggregator timelapsed execute summary: upgraded=${upgraded} skipped=${skipped} failed=${failures.length}`,
  );

  if (failures.length > 0) {
    console.log('Failed upgrades', failures);
    throw new Error(
      `Aggregator timelapsed execute finished with ${failures.length} failure(s)`,
    );
  }
};

export default func;

// Single product:
// yarn hardhat runscript scripts/upgrades/executeUpgrade_AggregatorTimelapsed.ts --network <NETWORK> --mtoken <MTOKEN>
//
// Batch (targets in scripts/upgrades/configs/aggregator-timelapsed-config.ts):
// yarn hardhat runscript scripts/upgrades/executeUpgrade_AggregatorTimelapsed.ts --network <NETWORK> --action <UPGRADE_ID>
