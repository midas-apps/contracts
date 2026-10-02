import { HardhatRuntimeEnvironment } from 'hardhat/types';

import { MTokenName } from '../../../config';
import { setMorphoConfig } from '../common/common-vault';
import { DeployFunction } from '../common/types';

const func: DeployFunction = async (
  hre: HardhatRuntimeEnvironment,
  mToken: MTokenName,
) => {
  await setMorphoConfig(hre, mToken);
};

export default func;
