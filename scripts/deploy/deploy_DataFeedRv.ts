import { HardhatRuntimeEnvironment } from 'hardhat/types';

import { deployMTokenDataFeedRv } from './common/data-feed';
import { DeployFunction } from './common/types';

import { getMTokenOrThrow } from '../../helpers/utils';

const func: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  const mToken = getMTokenOrThrow(hre);
  await deployMTokenDataFeedRv(hre, mToken);
};

export default func;
