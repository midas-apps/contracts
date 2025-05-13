import * as hre from 'hardhat';
import { DeployFunction } from 'hardhat-deploy/types';
import { HardhatRuntimeEnvironment } from 'hardhat/types';

import { grantDefaultAdminRoleToAcAdmin } from '../common/roles';

const func: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  await grantDefaultAdminRoleToAcAdmin(hre);
};

func(hre).then(console.log).catch(console.error);
