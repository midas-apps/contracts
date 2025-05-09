import { parseUnits } from 'ethers/lib/utils';
import * as hre from 'hardhat';
import { DeployFunction } from 'hardhat-deploy/types';
import { HardhatRuntimeEnvironment } from 'hardhat/types';

import {
  DeployCustomAggregatorConfig,
  deployMTokenCustomAggregator,
} from '../common/data-feed';

const config: DeployCustomAggregatorConfig = {
  minAnswer: parseUnits('0.1', 8),
  maxAnswer: parseUnits('1000', 8),
  maxAnswerDeviation: parseUnits('0.4', 8),
  description: 'mF-ONE/USD',
};

const func: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  await deployMTokenCustomAggregator(hre, 'mFONE', config);
};

func(hre).then(console.log).catch(console.error);
