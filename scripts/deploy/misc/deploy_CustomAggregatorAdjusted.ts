import { HardhatRuntimeEnvironment } from 'hardhat/types';

import { MTokenName } from '../../../config';
import { deployMTokenCustomAggregatorAdjusted } from '../common/data-feed';
import { DeployFunction } from '../common/types';

const func: DeployFunction = async (
  hre: HardhatRuntimeEnvironment,
  mToken: MTokenName,
) => {
  await deployMTokenCustomAggregatorAdjusted(hre, mToken);
};

export default func;
