import { HardhatRuntimeEnvironment } from 'hardhat/types';

import { grantDefaultAdminRoleToAcAdmin } from '../common/roles';
import { DeployFunction } from '../common/types';

const func: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  await grantDefaultAdminRoleToAcAdmin(hre);
};

export default func;
