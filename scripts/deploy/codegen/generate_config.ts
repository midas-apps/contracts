import { HardhatRuntimeEnvironment } from 'hardhat/types';

import { generateDeploymentConfig } from './common';

import { getMTokenOrThrow } from '../../../helpers/utils';
import { DeployFunction } from '../common/types';

const func: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  const mToken = getMTokenOrThrow(hre);
  await generateDeploymentConfig(hre, mToken);
};

export default func;
