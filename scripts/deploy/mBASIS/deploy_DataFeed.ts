import { parseUnits } from 'ethers/lib/utils';
import * as hre from 'hardhat';
import {
  DeployDataFeedConfig,
  deployMTokenDataFeed,
} from '../common/data-feed';
import { DeployFunction } from 'hardhat-deploy/types';
import { HardhatRuntimeEnvironment } from 'hardhat/types';

const config: DeployDataFeedConfig = {
  minAnswer: parseUnits('0.1', 8),
  maxAnswer: parseUnits('1000', 8),
  healthyDiff: 2592000,
};

const func: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  await deployMTokenDataFeed(hre, 'mBASIS', config);
};

func(hre).then(console.log).catch(console.error);
