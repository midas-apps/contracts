import { HardhatRuntimeEnvironment } from 'hardhat/types';

import { DeployFunction } from './common/types';
import { deployAndVerifyProxy } from './common/utils';
import { networkDeploymentConfigs } from './configs/network-configs';

import { getCommonContractNames } from '../../helpers/contracts';
import { getAllUserFacingRoles } from '../../helpers/roles';

const func: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  const config =
    networkDeploymentConfigs[hre.network.config.chainId!]?.accessControl;

  if (!config) {
    throw new Error(
      `accessControl network config is not found for ${hre.network.name}`,
    );
  }

  await deployAndVerifyProxy(hre, getCommonContractNames().ac, [
    config.defaultDelay,
    getAllUserFacingRoles(),
  ]);
};

export default func;
