import { expect } from 'chai';
import chalk from 'chalk';
import { BigNumber, BigNumberish, constants } from 'ethers';
import { parseUnits } from 'ethers/lib/utils';
import * as hre from 'hardhat';
import { DeployFunction } from 'hardhat-deploy/types';
import { HardhatRuntimeEnvironment } from 'hardhat/types';

import { chainIds } from '../../../config';
import {
  DeployDataFeedConfig,
  deployPaymentTokenDataFeed,
} from '../common/data-feed';

const configs: Record<number, DeployDataFeedConfig> = {
  [chainIds.sepolia]: {
    healthyDiff: 24 * 60 * 60,
    minAnswer: parseUnits('0.997', 8),
    maxAnswer: parseUnits('1.003', 8),
  },
  [chainIds.base]: {
    healthyDiff: 24 * 60 * 60,
    minAnswer: parseUnits('0.997', 8),
    maxAnswer: parseUnits('1.003', 8),
  },
  [chainIds.oasis]: {
    healthyDiff: 24 * 60 * 60,
    minAnswer: parseUnits('0.997', 18),
    maxAnswer: parseUnits('1.003', 18),
  },
  [chainIds.rootstock]: {
    healthyDiff: 24 * 60 * 60,
    minAnswer: parseUnits('0.997', 8),
    maxAnswer: parseUnits('1.003', 8),
  },
  [chainIds.arbitrum]: {
    healthyDiff: 24 * 60 * 60,
    minAnswer: parseUnits('0.997', 8),
    maxAnswer: parseUnits('1.003', 8),
  },
  [chainIds.etherlink]: {
    healthyDiff: 24 * 60 * 60,
    minAnswer: parseUnits('0.997', 8),
    maxAnswer: parseUnits('1.003', 8),
  },
};

const func: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  const networkConfig = configs[hre.network.config.chainId!];

  await deployPaymentTokenDataFeed(hre, 'usdc', networkConfig);
};

func(hre).then(console.log).catch(console.error);
