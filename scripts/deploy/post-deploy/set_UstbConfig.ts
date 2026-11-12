import { HardhatRuntimeEnvironment } from 'hardhat/types';

import { MTokenName } from '../../../config';
import { DeployFunction } from '../common/types';
import { setUstbVaultConfig } from '../common/v2-post-deploy';

const func: DeployFunction = async (
  hre: HardhatRuntimeEnvironment,
  mToken: MTokenName,
) => {
  await setUstbVaultConfig(hre, mToken);
};

export default func;
