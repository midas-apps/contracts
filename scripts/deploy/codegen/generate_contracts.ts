import { HardhatRuntimeEnvironment } from 'hardhat/types';

import { generateContracts } from './common/generate-contracts';

import { getMTokenOrThrow } from '../../../helpers/utils';
import { DeployFunction } from '../common/types';

const func: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  const mToken = getMTokenOrThrow(hre);
  await generateContracts(hre, mToken);
};

export default func;
