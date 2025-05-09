import * as hre from 'hardhat';
import { DeployFunction } from 'hardhat-deploy/types';
import { HardhatRuntimeEnvironment } from 'hardhat/types';

import { chainIds } from '../../../config';
import { GrantAllTokenRolesConfig, grantAllTokenRoles } from '../common/roles';

const configs: Record<number, GrantAllTokenRolesConfig> = {
  [chainIds.base]: {
    providerType: 'fordefi',
  },
};

const func: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  const networkConfig = configs[hre.network.config.chainId!];
  await grantAllTokenRoles(hre, 'mTBILL', networkConfig);
};

func(hre).then(console.log).catch(console.error);
