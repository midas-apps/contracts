import { HardhatRuntimeEnvironment } from 'hardhat/types';

import {
  proposeAggregatorTimelapsedForMToken,
  resolveAggregatorTimelapsedMTokenRunList,
} from './common/aggregator-timelapsed-upgrade';

import { MTokenName } from '../../config';
import { DeployFunction } from '../deploy/common/types';

const func: DeployFunction = async (
  hre: HardhatRuntimeEnvironment,
  mToken?: MTokenName,
  action?: string,
  _skipValidation?: boolean,
) => {
  const mTokens = resolveAggregatorTimelapsedMTokenRunList(hre, mToken, action);
  const failures: { mToken: MTokenName; error: string }[] = [];
  let upgraded = 0;
  let skipped = 0;

  console.log(
    `Aggregator timelapsed propose — ${
      mTokens.length
    } mToken(s): ${mTokens.join(', ')}`,
  );

  for (const token of mTokens) {
    hre.mtoken = token;
    try {
      const outcome = await proposeAggregatorTimelapsedForMToken(hre, token);
      if (outcome === 'skipped') {
        skipped++;
      } else {
        upgraded++;
      }
    } catch (e) {
      console.error(`Upgrade failed with error ${e}`);
      failures.push({
        mToken: token,
        error: e instanceof Error ? e.message : String(e),
      });
    }
  }

  console.log(
    `Aggregator timelapsed propose summary: upgraded=${upgraded} skipped=${skipped} failed=${failures.length}`,
  );

  if (failures.length > 0) {
    console.log('Failed upgrades', failures);
    throw new Error(
      `Aggregator timelapsed propose finished with ${failures.length} failure(s)`,
    );
  }
};

export default func;
