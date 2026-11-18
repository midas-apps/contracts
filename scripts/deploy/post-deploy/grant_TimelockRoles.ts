import { HardhatRuntimeEnvironment } from 'hardhat/types';

import { grantTimelockRoles } from '../common/roles';
import { DeployFunction } from '../common/types';

const func: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  await grantTimelockRoles(hre);
};

export default func;
