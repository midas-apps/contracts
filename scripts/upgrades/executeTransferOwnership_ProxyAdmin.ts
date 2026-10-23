import { HardhatRuntimeEnvironment } from 'hardhat/types';

import { executeTransferOwnershipProxyAdmin } from './common/upgrade-vaults';

import { DeployFunction } from '../deploy/common/types';

const func: DeployFunction = async (
  hre: HardhatRuntimeEnvironment,
  action: string,
  _skipValidation?: boolean,
) => {
  await executeTransferOwnershipProxyAdmin(hre, action);
};

export default func;
