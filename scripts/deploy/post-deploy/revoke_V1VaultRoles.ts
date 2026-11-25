import { HardhatRuntimeEnvironment } from 'hardhat/types';

import { MTokenName } from '../../../config';
import { revokeV1VaultMintBurnRoles } from '../common/roles';
import { DeployFunction } from '../common/types';

// revokes the minter / burner roles from the v1 vaults of `--mtoken`
const func: DeployFunction = async (
  hre: HardhatRuntimeEnvironment,
  mToken: MTokenName,
) => {
  await revokeV1VaultMintBurnRoles(hre, mToken);
};

export default func;
