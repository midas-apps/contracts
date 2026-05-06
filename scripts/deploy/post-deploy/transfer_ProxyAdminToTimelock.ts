import { HardhatRuntimeEnvironment } from 'hardhat/types';

import { transferProxyAdminOwnershipToTimelock } from '../common/proxy-admin';
import { DeployFunction } from '../common/types';

const func: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  await transferProxyAdminOwnershipToTimelock(hre);
};

export default func;
