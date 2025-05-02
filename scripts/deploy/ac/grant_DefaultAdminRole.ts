import * as hre from 'hardhat';
import { DeployFunction } from 'hardhat-deploy/types';
import { HardhatRuntimeEnvironment } from 'hardhat/types';
import {
  grantDefaultAdminRoleToAcAdmin,
  GrantDefaultAdminRoleToAcAdminConfig,
} from '../common/roles';
import { chainIds } from '../../../config';

const configs: Record<number, GrantDefaultAdminRoleToAcAdminConfig> = {
  [chainIds.sepolia]: {},
};

const func: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  const networkConfig = configs[hre.network.config.chainId!];
  await grantDefaultAdminRoleToAcAdmin(hre, networkConfig);
};

func(hre).then(console.log).catch(console.error);
