import * as hre from 'hardhat';
import { DeployFunction } from 'hardhat-deploy/types';
import { HardhatRuntimeEnvironment } from 'hardhat/types';

import { M_RE7_CONTRACT_NAME } from '../../../config';
import { getCurrentAddresses } from '../../../config/constants/addresses';
import {
  logDeployProxy,
  tryEtherscanVerifyImplementation,
} from '../../../helpers/utils';
import { deployMToken } from '../common/token';

const func: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  await deployMToken(hre, 'mRE7');
};

func(hre).then(console.log).catch(console.error);
