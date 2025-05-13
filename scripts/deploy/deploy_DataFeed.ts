import { HardhatRuntimeEnvironment } from 'hardhat/types';

import { deployMTokenDataFeed } from './common/data-feed';
import { DeployFunction } from './common/types';

import { getMTokenOrThrow } from '../../helpers/utils';

const func: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  const mToken = getMTokenOrThrow(hre);
  await deployMTokenDataFeed(hre, mToken);
};

export default func;
