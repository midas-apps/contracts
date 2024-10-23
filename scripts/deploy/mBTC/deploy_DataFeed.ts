import { parseUnits } from 'ethers/lib/utils';
import * as hre from 'hardhat';
import { DeployFunction } from 'hardhat-deploy/types';
import { HardhatRuntimeEnvironment } from 'hardhat/types';

import { M_BTC_DATA_FEED_CONTRACT_NAME } from '../../../config';
import { getCurrentAddresses } from '../../../config/constants/addresses';
import {
  logDeployProxy,
  tryEtherscanVerifyImplementation,
} from '../../../helpers/utils';

const func: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  const { deployer } = await hre.getNamedAccounts();
  const owner = await hre.ethers.getSigner(deployer);

  const addresses = getCurrentAddresses(hre);

  const customAggregator = addresses?.mBTC?.customFeed;

  if (!addresses) {
    throw new Error('Addresses for network are not defined');
  }

  if (!customAggregator) {
    throw new Error('Custom aggregator is not defined');
  }

  console.log('Deploying DataFeed...', customAggregator);

  const deployment = await hre.upgrades.deployProxy(
    await hre.ethers.getContractFactory(M_BTC_DATA_FEED_CONTRACT_NAME, owner),
    [
      addresses?.accessControl,
      customAggregator,
      2592000,
      1,
      parseUnits('100000', 8),
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
  await logDeployProxy(hre, M_BTC_DATA_FEED_CONTRACT_NAME, deployment.address);
  await tryEtherscanVerifyImplementation(hre, deployment.address);
};

func(hre).then(console.log).catch(console.error);
