import { HardhatRuntimeEnvironment } from 'hardhat/types';

import { DeployFunction, NULL_DELAY } from './common/types';
import { deployAndVerifyProxy } from './common/utils';
import { networkDeploymentConfigs } from './configs/network-configs';

import { getCurrentAddresses } from '../../config/constants/addresses';
import { getCommonContractNames } from '../../helpers/contracts';

/** pause delay is not configurable: falls back to the role/default delay */
const PAUSE_DELAY = NULL_DELAY;

const func: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  const addresses = getCurrentAddresses(hre);

  if (!addresses?.accessControl) {
    throw new Error('Access control address is not set');
  }

  const config =
    networkDeploymentConfigs[hre.network.config.chainId!]?.pauseManager;

  if (!config) {
    throw new Error(
      `pauseManager network config is not found for ${hre.network.name}`,
    );
  }

  await deployAndVerifyProxy(hre, getCommonContractNames().pauseManager, [
    addresses.accessControl,
    PAUSE_DELAY,
    config.unpauseDelay,
  ]);
};

export default func;
