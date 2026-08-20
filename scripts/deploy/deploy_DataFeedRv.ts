import { HardhatRuntimeEnvironment } from 'hardhat/types';

import { deployMTokenDataFeedRv } from './common/data-feed';
import { DeployFunction } from './common/types';

import { MTokenName } from '../../config';

const func: DeployFunction = async (
  hre: HardhatRuntimeEnvironment,
  mToken: MTokenName,
) => {
  await deployMTokenDataFeedRv(hre, mToken);
};

export default func;
