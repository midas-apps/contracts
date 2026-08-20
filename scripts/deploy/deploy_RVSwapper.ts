import { HardhatRuntimeEnvironment } from 'hardhat/types';

import { deployRedemptionVault } from './common';
import { DeployFunction } from './common/types';

import { MTokenName } from '../../config';

const func: DeployFunction = async (
  hre: HardhatRuntimeEnvironment,
  mToken: MTokenName,
) => {
  await deployRedemptionVault(hre, mToken, 'rvSwapper');
};

export default func;
