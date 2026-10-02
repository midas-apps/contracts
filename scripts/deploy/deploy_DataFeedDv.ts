import { HardhatRuntimeEnvironment } from 'hardhat/types';

import { deployMTokenDataFeedDv } from './common/data-feed';
import { DeployFunction } from './common/types';

import { MTokenName } from '../../config';

const func: DeployFunction = async (
  hre: HardhatRuntimeEnvironment,
  mToken: MTokenName,
) => {
  await deployMTokenDataFeedDv(hre, mToken);
};

export default func;
