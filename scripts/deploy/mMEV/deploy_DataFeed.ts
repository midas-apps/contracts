import { parseUnits } from 'ethers/lib/utils';
import * as hre from 'hardhat';
import { DeployFunction } from 'hardhat-deploy/types';
import { HardhatRuntimeEnvironment } from 'hardhat/types';

import {
  DeployDataFeedConfig,
  deployMTokenDataFeed,
} from '../common/data-feed';
// eslint-disable-next-line camelcase

const config: DeployDataFeedConfig = {
  minAnswer: parseUnits('0.1', 8),
  maxAnswer: parseUnits('1000', 8),
  healthyDiff: 2592000,
};

const func: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  await deployMTokenDataFeed(hre, 'mMEV', config);
};

func(hre).then(console.log).catch(console.error);
