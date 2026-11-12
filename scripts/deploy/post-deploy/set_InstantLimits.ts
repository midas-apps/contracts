import { HardhatRuntimeEnvironment } from 'hardhat/types';

import { MTokenName } from '../../../config';
import { DeployFunction } from '../common/types';
import { setInstantLimits } from '../common/v2-post-deploy';

const func: DeployFunction = async (
  hre: HardhatRuntimeEnvironment,
  mToken: MTokenName,
) => {
  await setInstantLimits(hre, mToken);
};

export default func;
