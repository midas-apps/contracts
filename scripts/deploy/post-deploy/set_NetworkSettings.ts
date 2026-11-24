import { HardhatRuntimeEnvironment } from 'hardhat/types';

import { setNetworkSettings } from '../common/network-settings';
import { DeployFunction } from '../common/types';

const func: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  await setNetworkSettings(hre);
};

export default func;
