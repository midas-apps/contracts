import { HardhatRuntimeEnvironment } from 'hardhat/types';

import { executeTransferOwnershipProxyAdmin } from './common';

import { getActionOrThrow } from '../../helpers/utils';
import { DeployFunction } from '../deploy/common/types';

const func: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  const upgradeId = getActionOrThrow(hre);
  await executeTransferOwnershipProxyAdmin(hre, upgradeId);
};

export default func;
