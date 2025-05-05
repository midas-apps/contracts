import * as hre from 'hardhat';
import { DeployFunction } from 'hardhat-deploy/types';
import { HardhatRuntimeEnvironment } from 'hardhat/types';

import { chainIds } from '../../../config';
import {
  grantDefaultAdminRoleToAcAdmin,
  GrantDefaultAdminRoleToAcAdminConfig,
} from '../common/roles';

const configs: Record<number, GrantDefaultAdminRoleToAcAdminConfig> = {
  [chainIds.sepolia]: {},
  [chainIds.hyperevm]: {},
};

const func: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  const networkConfig = configs[hre.network.config.chainId!];
  await grantDefaultAdminRoleToAcAdmin(hre, networkConfig);
};

func(hre).then(console.log).catch(console.error);
