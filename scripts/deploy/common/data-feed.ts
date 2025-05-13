import { BigNumberish } from 'ethers';
import { HardhatRuntimeEnvironment } from 'hardhat/types';

import { deployAndVerifyProxy, getDeploymentGenericConfig } from './utils';

import { MTokenName, PaymentTokenName } from '../../../config';
import { getCurrentAddresses } from '../../../config/constants/addresses';
import {
  getCommonContractNames,
  getTokenContractNames,
} from '../../../helpers/contracts';
import { paymentTokenDeploymentConfigs } from '../configs/payment-tokens';

export type DeployDataFeedConfig = {
  minAnswer: BigNumberish;
  maxAnswer: BigNumberish;
  healthyDiff: BigNumberish;
};

export type DeployCustomAggregatorConfig = {
  minAnswer: BigNumberish;
  maxAnswer: BigNumberish;
  maxAnswerDeviation: BigNumberish;
  description: string;
};

export const deployPaymentTokenDataFeed = async (
  hre: HardhatRuntimeEnvironment,
  token: PaymentTokenName,
) => {
  const addresses = getCurrentAddresses(hre);
  const tokenAddresses = addresses?.dataFeeds?.[token];

  const networkConfig =
    paymentTokenDeploymentConfigs.networkConfigs[hre.network.config.chainId!]?.[
      token
    ]?.dataFeed;

  if (!tokenAddresses?.aggregator) {
    throw new Error('Token config is not found or aggregator is not set');
  }
  const contractName = getCommonContractNames().dataFeed;

  if (!contractName) {
    throw new Error('Data feed contract name is not set');
  }

  await deployTokenDataFeed(
    hre,
    tokenAddresses.aggregator,
    contractName,
    networkConfig,
  );
};

export const deployMTokenDataFeed = async (
  hre: HardhatRuntimeEnvironment,
  token: MTokenName,
) => {
  const addresses = getCurrentAddresses(hre);
  const tokenAddresses = addresses?.[token];

  if (!tokenAddresses?.customFeed) {
    throw new Error('Token config is not found or customFeed is not set');
  }

  const dataFeedContractName = getTokenContractNames(token).dataFeed;

  if (!dataFeedContractName) {
    throw new Error('Data feed contract name is not set');
  }

  await deployTokenDataFeed(
    hre,
    tokenAddresses.customFeed,
    dataFeedContractName,
    getDeploymentGenericConfig(hre, token, 'dataFeed'),
  );
};

export const deployMTokenCustomAggregator = async (
  hre: HardhatRuntimeEnvironment,
  token: MTokenName,
) => {
  const customAggregatorContractName =
    getTokenContractNames(token).customAggregator;

  if (!customAggregatorContractName) {
    throw new Error('Custom aggregator contract name is not set');
  }

  await deployCustomAggregator(
    hre,
    customAggregatorContractName,
    getDeploymentGenericConfig(hre, token, 'customAggregator'),
  );
};

const deployTokenDataFeed = async (
  hre: HardhatRuntimeEnvironment,
  aggregator: string,
  dataFeedContractName: string,
  networkConfig?: DeployDataFeedConfig,
) => {
  const addresses = getCurrentAddresses(hre);

  if (!networkConfig) {
    throw new Error('Network config is not found');
  }

  await deployAndVerifyProxy(hre, dataFeedContractName, [
    addresses?.accessControl,
    aggregator,
    networkConfig.healthyDiff,
    networkConfig.minAnswer,
    networkConfig.maxAnswer,
  ]);
};

const deployCustomAggregator = async (
  hre: HardhatRuntimeEnvironment,
  customAggregatorContractName: string,
  networkConfig?: DeployCustomAggregatorConfig,
) => {
  const addresses = getCurrentAddresses(hre);

  if (!networkConfig) {
    throw new Error('Network config is not found');
  }

  await deployAndVerifyProxy(hre, customAggregatorContractName, [
    addresses?.accessControl,
    networkConfig.minAnswer,
    networkConfig.maxAnswer,
    networkConfig.maxAnswerDeviation,
    networkConfig.description,
  ]);
};
