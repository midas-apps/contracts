import { HardhatRuntimeEnvironment } from 'hardhat/types';

import { generateContracts } from './common';

import { DeployFunction } from '../common/types';

const func: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  await generateContracts(hre);
};

export default func;
