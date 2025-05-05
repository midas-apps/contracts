import * as hre from 'hardhat';
import { DeployFunction } from 'hardhat-deploy/types';
import { HardhatRuntimeEnvironment } from 'hardhat/types';

import { revokeDefaultRolesFromDeployer } from '../common/roles';

const func: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  await revokeDefaultRolesFromDeployer(hre);
};

func(hre).then(console.log).catch(console.error);
