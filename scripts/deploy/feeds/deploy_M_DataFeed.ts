import { parseUnits } from 'ethers/lib/utils';
import * as hre from 'hardhat';
import { DeployFunction } from 'hardhat-deploy/types';
import { HardhatRuntimeEnvironment } from 'hardhat/types';

import {
  DeployDataFeedConfig,
  deployPaymentTokenDataFeed,
} from '../common/data-feed';

const configs: Record<number, DeployDataFeedConfig> = {
  1: {
    healthyDiff: 365 * 10 * 24 * 60 * 60,
    minAnswer: parseUnits('0.997', 8),
    maxAnswer: parseUnits('1.003', 8),
  },
};

const func: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  const networkConfig = configs[hre.network.config.chainId!];

  await deployPaymentTokenDataFeed(hre, 'm', networkConfig);
};

func(hre).then(console.log).catch(console.error);
