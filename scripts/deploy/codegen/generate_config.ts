import { HardhatRuntimeEnvironment } from 'hardhat/types';

import { generateDeploymentConfig } from './common';

import { MTokenName } from '../../../config';
import { DeployFunction } from '../common/types';

const func: DeployFunction = async (
  hre: HardhatRuntimeEnvironment,
  mToken: MTokenName,
) => {
  await generateDeploymentConfig(hre, mToken);
};

export default func;
