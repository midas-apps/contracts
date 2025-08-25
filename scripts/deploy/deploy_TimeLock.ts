import { HardhatRuntimeEnvironment } from 'hardhat/types';

import { deployTimelock } from './common/timelock';
import { DeployFunction } from './common/types';

const func: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  await deployTimelock(hre);
};

export default func;
