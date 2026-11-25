import { HardhatRuntimeEnvironment } from 'hardhat/types';

import { MTokenName } from '../../../config';
import { revokeLegacyTokenRoles } from '../common/roles';
import { DeployFunction } from '../common/types';

// revokes the legacy (v1) roles of `--mtoken` that are replaced in v2
const func: DeployFunction = async (
  hre: HardhatRuntimeEnvironment,
  mToken: MTokenName,
) => {
  await revokeLegacyTokenRoles(hre, mToken);
};

export default func;
