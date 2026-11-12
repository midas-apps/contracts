import { HardhatRuntimeEnvironment } from 'hardhat/types';

import { generateMProduct } from './common';

import { DeployFunction } from '../common/types';

const func: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  await generateMProduct(hre);
};

export default func;
