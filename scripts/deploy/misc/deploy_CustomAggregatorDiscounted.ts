import { HardhatRuntimeEnvironment } from 'hardhat/types';

import { getMTokenOrThrow } from '../../../helpers/utils';
import { deployMTokenCustomAggregatorDiscounted } from '../common/data-feed';
import { DeployFunction } from '../common/types';

const func: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  const mToken = getMTokenOrThrow(hre);
  await deployMTokenCustomAggregatorDiscounted(hre, mToken);
};

export default func;
