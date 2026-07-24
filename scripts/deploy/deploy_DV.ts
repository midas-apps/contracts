import { HardhatRuntimeEnvironment } from 'hardhat/types';

import { deployDepositVault } from './common';
import { DeployFunction } from './common/types';

import { MTokenName } from '../../config';

const func: DeployFunction = async (
  hre: HardhatRuntimeEnvironment,
  mToken: MTokenName,
) => {
  await deployDepositVault(hre, mToken, 'dv');
};

export default func;
