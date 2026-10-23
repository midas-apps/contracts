import { HardhatRuntimeEnvironment } from 'hardhat/types';

import { proposeUpgradeVaults } from './common/upgrade-vaults';

import { DeployFunction } from '../deploy/common/types';

const func: DeployFunction = async (
  hre: HardhatRuntimeEnvironment,
  action: string,
  _skipValidation?: boolean,
) => {
  await proposeUpgradeVaults(hre, action);
};

export default func;
