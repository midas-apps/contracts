import { HardhatRuntimeEnvironment } from 'hardhat/types';

import { revokeDefaultRolesFromDeployer } from '../common/roles';
import { DeployFunction } from '../common/types';

const func: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  await revokeDefaultRolesFromDeployer(hre);
};

export default func;
