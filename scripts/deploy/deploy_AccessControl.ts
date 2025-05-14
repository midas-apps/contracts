import { HardhatRuntimeEnvironment } from 'hardhat/types';

import { DeployFunction } from './common/types';
import { deployAndVerifyProxy } from './common/utils';

import { getCommonContractNames } from '../../helpers/contracts';

const func: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  await deployAndVerifyProxy(hre, getCommonContractNames().ac, []);
};

export default func;
