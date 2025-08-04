import { HardhatRuntimeEnvironment } from 'hardhat/types';

import { deployDepositVault } from './common';
import { DeployFunction } from './common/types';

import { getMTokenOrThrow } from '../../helpers/utils';

const func: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  const mToken = getMTokenOrThrow(hre);
  await deployDepositVault(hre, mToken, 'dv');
};

export default func;
