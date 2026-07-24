import { HardhatRuntimeEnvironment } from 'hardhat/types';

import { MTokenName } from '../../../config';
import { deployMTokenCustomAggregatorAdjustedRv } from '../common/data-feed';
import { DeployFunction } from '../common/types';

const func: DeployFunction = async (
  hre: HardhatRuntimeEnvironment,
  mToken: MTokenName,
) => {
  await deployMTokenCustomAggregatorAdjustedRv(hre, mToken);
};

export default func;
