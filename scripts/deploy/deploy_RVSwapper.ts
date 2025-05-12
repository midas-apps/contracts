import * as hre from 'hardhat';
import { HardhatRuntimeEnvironment } from 'hardhat/types';

import { deployRedemptionVault } from './common';
import { executeFuncAsync } from './common/utils';

import { getMTokenOrThrow } from '../../helpers/utils';

const func = async (hre: HardhatRuntimeEnvironment) => {
  const mToken = getMTokenOrThrow(hre);
  await deployRedemptionVault(hre, mToken, 'rvSwapper');
};

executeFuncAsync(hre, func);
