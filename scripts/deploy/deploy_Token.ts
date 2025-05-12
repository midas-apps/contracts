import * as hre from 'hardhat';
import { HardhatRuntimeEnvironment } from 'hardhat/types';

import { deployMToken } from './common/token';
import { executeFuncAsync } from './common/utils';

import { getMTokenOrThrow } from '../../helpers/utils';

const func = async (hre: HardhatRuntimeEnvironment) => {
  const mToken = getMTokenOrThrow(hre);
  await deployMToken(hre, mToken);
};

executeFuncAsync(hre, func);
