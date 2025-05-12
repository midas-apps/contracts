import * as hre from 'hardhat';
import { HardhatRuntimeEnvironment } from 'hardhat/types';

import { deployMTokenCustomAggregator } from './common/data-feed';
import { executeFuncAsync } from './common/utils';

import { getMTokenOrThrow } from '../../helpers/utils';

const func = async (hre: HardhatRuntimeEnvironment) => {
  const mToken = getMTokenOrThrow(hre);
  await deployMTokenCustomAggregator(hre, mToken);
};

executeFuncAsync(hre, func);
