import { HardhatRuntimeEnvironment } from 'hardhat/types';

import { proposeTransferOwnershipProxyAdmin } from './common/upgrade-vaults';

import { DeployFunction } from '../deploy/common/types';

const func: DeployFunction = async (
  hre: HardhatRuntimeEnvironment,
  action: string,
  _skipValidation?: boolean,
) => {
  await proposeTransferOwnershipProxyAdmin(hre, action);
};

export default func;
