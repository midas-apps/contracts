import { BigNumber } from 'ethers';
import { parseUnits } from 'ethers/lib/utils';
import * as hre from 'hardhat';
import { DeployFunction } from 'hardhat-deploy/types';
import { HardhatRuntimeEnvironment } from 'hardhat/types';

import { M_RE7_CUSTOM_AGGREGATOR_CONTRACT_NAME } from '../../../config';
import { getCurrentAddresses } from '../../../config/constants/addresses';
import {
  logDeployProxy,
  tryEtherscanVerifyImplementation,
} from '../../../helpers/utils';

const config = {
  minAnswer: parseUnits('0.1', 8),
  maxAnswer: parseUnits('1000', 8),
  maxAnswerDeviation: parseUnits('2', 8),
  description: 'mRe7YIELD/USD',
};

const func: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  const addresses = getCurrentAddresses(hre);
  const { deployer } = await hre.getNamedAccounts();
  const owner = await hre.ethers.getSigner(deployer);

  console.log('Deploying CustomAggregatorV3CompatibleFeed...', { addresses });

  if (!addresses?.accessControl)
    throw new Error('Access control address is not set');

  const deployment = await hre.upgrades.deployProxy(
    await hre.ethers.getContractFactory(
      M_RE7_CUSTOM_AGGREGATOR_CONTRACT_NAME,
      owner,
    ),
    [
      addresses.accessControl,
      config.minAnswer,
      config.maxAnswer,
      config.maxAnswerDeviation,
      config.description,
    ],
    {
      unsafeAllow: ['constructor'],
    },
  );

  console.log('Deployed CustomAggregatorV3CompatibleFeed:', deployment.address);

  if (deployment.deployTransaction) {
    console.log('Waiting 5 blocks...');
    await deployment.deployTransaction.wait(5);
    console.log('Waited.');
  }
  await logDeployProxy(
    hre,
    M_RE7_CUSTOM_AGGREGATOR_CONTRACT_NAME,
    deployment.address,
  );
  await tryEtherscanVerifyImplementation(hre, deployment.address);
};

func(hre).then(console.log).catch(console.error);
