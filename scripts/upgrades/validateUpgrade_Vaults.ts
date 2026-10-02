import { HardhatRuntimeEnvironment } from 'hardhat/types';

import {
  validateProposeUpgradeVaults,
  validateUpgradeVaults,
} from './common/upgrade-vaults';

import { DeployFunction } from '../deploy/common/types';

const func: DeployFunction = async (
  hre: HardhatRuntimeEnvironment,
  action: string,
  _skipValidation?: boolean,
) => {
  await validateProposeUpgradeVaults(hre, action);
  await validateUpgradeVaults(hre, action);
};

export default func;
