import * as hre from 'hardhat';
import { DeployFunction } from 'hardhat-deploy/types';
import { HardhatRuntimeEnvironment } from 'hardhat/types';

import { chainIds } from '../../../config';
import { GrantAllTokenRolesConfig, grantAllTokenRoles } from '../common/roles';

const configs: Record<number, GrantAllTokenRolesConfig> = {
  [chainIds.hyperevm]: {
    providerType: 'hardhat',
    tokenManagerAddress: '0xa715F0BdbAC0c81f8dA0F8F7356EfC3Ae02561C0',
    vaultsManagerAddress: '0x2ACB4BdCbEf02f81BF713b696Ac26390d7f79A12',
    oracleManagerAddress: '0x0c43e66CF6e5F285D12E76316837E55177eD72B1',
  },
};

const func: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  const networkConfig = configs[hre.network.config.chainId!];
  await grantAllTokenRoles(hre, 'hbUSDT', networkConfig);
};

func(hre).then(console.log).catch(console.error);
