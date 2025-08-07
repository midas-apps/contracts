import { HardhatRuntimeEnvironment } from 'hardhat/types';

import { executeUpgradeAllVaults } from './common';

import { DeployFunction } from '../deploy/common/types';

const func: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  await executeUpgradeAllVaults(hre);
};

export default func;
