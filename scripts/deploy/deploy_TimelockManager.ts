import { HardhatRuntimeEnvironment } from 'hardhat/types';

import { DeployFunction } from './common/types';
import { deployAndVerifyProxy } from './common/utils';
import { networkDeploymentConfigs } from './configs/network-configs';

import { getCurrentAddresses } from '../../config/constants/addresses';
import { getCommonContractNames } from '../../helpers/contracts';

const func: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  const addresses = getCurrentAddresses(hre);

  if (!addresses?.accessControl) {
    throw new Error('Access control address is not set');
  }

  const config =
    networkDeploymentConfigs[hre.network.config.chainId!]?.timelockManager;

  if (!config) {
    throw new Error(
      `timelockManager network config is not found for ${hre.network.name}`,
    );
  }

  if (!config.securityCouncil.length) {
    throw new Error(
      `timelockManager security council is empty for ${hre.network.name}`,
    );
  }

  await deployAndVerifyProxy(hre, getCommonContractNames().timelockManager, [
    addresses.accessControl,
    config.maxPendingOperationsPerProposer,
    config.securityCouncil,
  ]);
};

export default func;
