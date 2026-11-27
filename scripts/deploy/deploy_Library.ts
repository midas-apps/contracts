import { HardhatRuntimeEnvironment } from 'hardhat/types';

import { DeployFunction } from './common/types';
import { deployAndVerifyLibrary } from './common/utils';

import { LibraryName } from '../../config/constants/addresses';

const func: DeployFunction = async (
  hre: HardhatRuntimeEnvironment,
  library: LibraryName,
) => {
  await deployAndVerifyLibrary(hre, library);
};

export default func;
