import { HardhatRuntimeEnvironment } from 'hardhat/types';

import { deployMToken } from './common/token';
import { DeployFunction } from './common/types';

import { getMTokenOrThrow } from '../../helpers/utils';

const func: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  const mToken = getMTokenOrThrow(hre);
  await deployMToken(hre, mToken);
};

export default func;
