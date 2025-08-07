import { HardhatRuntimeEnvironment } from 'hardhat/types';

import { proposeUpgradeAllVaults } from './common';

import { DeployFunction } from '../deploy/common/types';

const func: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  await proposeUpgradeAllVaults(hre);
};

export default func;
