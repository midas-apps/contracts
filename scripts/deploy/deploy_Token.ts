import { HardhatRuntimeEnvironment } from 'hardhat/types';

import { deployMToken } from './common/token';
import { DeployFunction } from './common/types';

import { MTokenName } from '../../config';

const func: DeployFunction = async (
  hre: HardhatRuntimeEnvironment,
  mToken: MTokenName,
) => {
  await deployMToken(hre, mToken);
};

export default func;
