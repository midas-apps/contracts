import { HardhatRuntimeEnvironment } from 'hardhat/types';

import { FeedTarget, deployMTokenCustomAggregator } from './common/data-feed';
import { DeployFunction } from './common/types';

import { MTokenName } from '../../config';

const func: DeployFunction = async (
  hre: HardhatRuntimeEnvironment,
  mToken: MTokenName,
  feedTarget?: FeedTarget,
) => {
  await deployMTokenCustomAggregator(hre, mToken, feedTarget);
};

export default func;
