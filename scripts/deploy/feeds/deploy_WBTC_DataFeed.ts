import { BigNumber, BigNumberish, constants } from 'ethers';
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
    healthyDiff: 12 * 60 * 60,
    minAnswer: parseUnits('0.997', 8),
    maxAnswer: parseUnits('1.003', 8),
  },
  11155111: {
    healthyDiff: constants.MaxUint256,
    minAnswer: parseUnits('0.99', 8),
    maxAnswer: parseUnits('1.1', 8),
  },
};

const func: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  const networkConfig = configs[hre.network.config.chainId!];

  await deployPaymentTokenDataFeed(hre, 'wbtc', networkConfig);
};

func(hre).then(console.log).catch(console.error);
