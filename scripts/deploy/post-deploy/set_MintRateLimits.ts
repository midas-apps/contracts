import { HardhatRuntimeEnvironment } from 'hardhat/types';

import { MTokenName } from '../../../config';
import { DeployFunction } from '../common/types';
import { setMintRateLimits } from '../common/v2-post-deploy';

const func: DeployFunction = async (
  hre: HardhatRuntimeEnvironment,
  mToken: MTokenName,
) => {
  await setMintRateLimits(hre, mToken);
};

export default func;
