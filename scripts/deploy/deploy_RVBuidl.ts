import { HardhatRuntimeEnvironment } from 'hardhat/types';

import { deployRedemptionVault } from './common';
import { DeployFunction } from './common/types';

import { getMTokenOrThrow } from '../../helpers/utils';

const func: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  const mToken = getMTokenOrThrow(hre);
  await deployRedemptionVault(hre, mToken, 'rvBuidl');
};

export default func;
