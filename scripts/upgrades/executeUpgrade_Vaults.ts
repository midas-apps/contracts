import { HardhatRuntimeEnvironment } from 'hardhat/types';

import { executeUpgradeVaults } from './common/upgrade-vaults';

import { DeployFunction } from '../deploy/common/types';

const func: DeployFunction = async (
  hre: HardhatRuntimeEnvironment,
  action: string,
  _skipValidation?: boolean,
) => {
  await executeUpgradeVaults(hre, action);
};

export default func;
