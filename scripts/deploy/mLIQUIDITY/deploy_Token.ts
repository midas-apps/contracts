import * as hre from 'hardhat';
import { DeployFunction } from 'hardhat-deploy/types';
import { HardhatRuntimeEnvironment } from 'hardhat/types';

import { deployMToken } from '../common/token';

const func: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  await deployMToken(hre, 'mLIQUIDITY');
};

func(hre).then(console.log).catch(console.error);
