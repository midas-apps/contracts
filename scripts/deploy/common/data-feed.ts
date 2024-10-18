import { BigNumberish } from 'ethers';
import { parseUnits } from 'ethers/lib/utils';
import * as hre from 'hardhat';
import { DeployFunction } from 'hardhat-deploy/types';
import { HardhatRuntimeEnvironment } from 'hardhat/types';

import { DATA_FEED_CONTRACT_NAME } from '../../../config';
import { getCurrentAddresses } from '../../../config/constants/addresses';
import {
  logDeployProxy,
  tryEtherscanVerifyImplementation,
} from '../../../helpers/utils';

export type DeployDataFeedConfig = {
  minPrice: BigNumberish;
  maxPrice: BigNumberish;
  healthyDiff: BigNumberish;
};

export const deployTokenDataFeed = async (
  hre: HardhatRuntimeEnvironment,
  token: 'usdc' | 'usdt' | 'dai' | 'wbtc',
  networkConfig?: DeployDataFeedConfig,
) => {
  const addresses = getCurrentAddresses(hre);
  const { deployer } = await hre.getNamedAccounts();
  const owner = await hre.ethers.getSigner(deployer);
  const tokenAddresses = addresses?.dataFeeds?.[token];

  if (!tokenAddresses) {
    throw new Error('Token config is not found');
  }

  if (!networkConfig) {
    throw new Error('Network config is not found');
  }

  console.log('Deploying DataFeed...');

  const deployment = await hre.upgrades.deployProxy(
    await hre.ethers.getContractFactory(DATA_FEED_CONTRACT_NAME, owner),
    [
      addresses?.accessControl,
      tokenAddresses.aggregator,
      networkConfig.healthyDiff,
      networkConfig.minPrice,
      networkConfig.maxPrice,
    ],
    {
      unsafeAllow: ['constructor'],
    },
  );

  console.log('Deployed DataFeed:', deployment.address);

  if (deployment.deployTransaction) {
    console.log('Waiting 5 blocks...');
    await deployment.deployTransaction.wait(5);
    console.log('Waited.');
  }
  await logDeployProxy(hre, DATA_FEED_CONTRACT_NAME, deployment.address);
  await tryEtherscanVerifyImplementation(hre, deployment.address);
};
