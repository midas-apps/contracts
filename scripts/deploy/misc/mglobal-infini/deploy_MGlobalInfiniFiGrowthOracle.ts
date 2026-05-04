// Usage: yarn hardhat runscript scripts/deploy/misc/mglobal-infini/deploy_MGlobalInfiniFiGrowthOracle.ts --network main

import { parseUnits } from 'ethers/lib/utils';
import { HardhatRuntimeEnvironment } from 'hardhat/types';

import { getCurrentAddresses } from '../../../../config/constants/addresses';
import { DeployFunction } from '../../common/types';
import { deployAndVerifyProxy } from '../../common/utils';

const CONTRACT_NAME = 'MGlobalInfiniFiCustomAggregatorFeedGrowth';
const DESCRIPTION = 'infiniFi MG Yield Oracle';
const FEED_DECIMALS = 8;

const MIN_ANSWER = parseUnits('0.1', FEED_DECIMALS);
const MAX_ANSWER = parseUnits('2', FEED_DECIMALS);
const MAX_ANSWER_DEVIATION_PERCENT = parseUnits('1', FEED_DECIMALS);
const MIN_GROWTH_APR = parseUnits('0', FEED_DECIMALS);
const MAX_GROWTH_APR = parseUnits('7.24', FEED_DECIMALS);
const ONLY_UP = true;

const func: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  const addresses = getCurrentAddresses(hre);

  if (!addresses?.accessControl) {
    throw new Error('AccessControl address is not set');
  }

  await deployAndVerifyProxy(hre, CONTRACT_NAME, [
    addresses.accessControl,
    MIN_ANSWER,
    MAX_ANSWER,
    MAX_ANSWER_DEVIATION_PERCENT,
    MIN_GROWTH_APR,
    MAX_GROWTH_APR,
    ONLY_UP,
    DESCRIPTION,
  ]);
};

export default func;
