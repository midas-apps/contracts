import { constants } from 'ethers';
import { parseUnits } from 'ethers/lib/utils';
import * as hre from 'hardhat';
import { DeployFunction } from 'hardhat-deploy/types';
import { HardhatRuntimeEnvironment } from 'hardhat/types';

import { chainIds } from '../../../config';
import { DeployDataFeedConfig, deployTokenDataFeed } from '../common/data-feed';

const configs: Record<number, DeployDataFeedConfig> = {
  [chainIds.plume]: {
    healthyDiff: 60 * 60,
    minPrice: parseUnits('0.997', 18),
    maxPrice: parseUnits('1.003', 18),
  },
  [chainIds.sepolia]: {
    healthyDiff: constants.MaxUint256,
    minPrice: parseUnits('0.99', 8),
    maxPrice: parseUnits('1.1', 8),
  },
};

const func: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  const networkConfig = configs[hre.network.config.chainId!];

  await deployTokenDataFeed(hre, 'pusd', networkConfig);
};

func(hre).then(console.log).catch(console.error);
