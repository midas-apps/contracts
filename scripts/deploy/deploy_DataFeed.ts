import { HardhatRuntimeEnvironment } from 'hardhat/types';

import { deployMTokenDataFeed } from './common/data-feed';
import { DeployFunction } from './common/types';

import { MTokenName } from '../../config';

const func: DeployFunction = async (
  hre: HardhatRuntimeEnvironment,
  mToken: MTokenName,
) => {
  await deployMTokenDataFeed(hre, mToken);
};

export default func;
