import { HardhatRuntimeEnvironment } from 'hardhat/types';

import { MTokenName } from '../../../config';
import { DeployFunction } from '../common/types';
import { setTokenConfig } from '../common/v2-post-deploy';

const func: DeployFunction = async (
  hre: HardhatRuntimeEnvironment,
  mToken: MTokenName,
) => {
  await setTokenConfig(hre, mToken);
};

export default func;
