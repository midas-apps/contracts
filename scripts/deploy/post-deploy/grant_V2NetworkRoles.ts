import { HardhatRuntimeEnvironment } from 'hardhat/types';

import { grantV2NetworkRoles } from '../common/roles';
import { DeployFunction } from '../common/types';

const func: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  await grantV2NetworkRoles(hre);
};

export default func;
