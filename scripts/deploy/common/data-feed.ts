import { BigNumberish } from 'ethers';
import { HardhatRuntimeEnvironment } from 'hardhat/types';

import { getDeploymentGenericConfig } from './utils';

import {
  DATA_FEED_CONTRACT_NAME,
  HB_USDT_CUSTOM_AGGREGATOR_CONTRACT_NAME,
  HB_USDT_DATA_FEED_CONTRACT_NAME,
  M_BASIS_CUSTOM_AGGREGATOR_CONTRACT_NAME,
  M_BASIS_DATA_FEED_CONTRACT_NAME,
  M_BTC_CUSTOM_AGGREGATOR_CONTRACT_NAME,
  M_BTC_DATA_FEED_CONTRACT_NAME,
  M_EDGE_CUSTOM_AGGREGATOR_CONTRACT_NAME,
  M_EDGE_DATA_FEED_CONTRACT_NAME,
  M_FONE_CUSTOM_AGGREGATOR_CONTRACT_NAME,
  M_FONE_DATA_FEED_CONTRACT_NAME,
  M_MEV_CUSTOM_AGGREGATOR_CONTRACT_NAME,
  M_MEV_DATA_FEED_CONTRACT_NAME,
  M_RE7_CUSTOM_AGGREGATOR_CONTRACT_NAME,
  M_RE7_DATA_FEED_CONTRACT_NAME,
  M_SL_CUSTOM_AGGREGATOR_CONTRACT_NAME,
  M_SL_DATA_FEED_CONTRACT_NAME,
  M_TBILL_CUSTOM_AGGREGATOR_CONTRACT_NAME,
  M_TBILL_DATA_FEED_CONTRACT_NAME,
  MTokenName,
  PaymentTokenName,
} from '../../../config';
import { getCurrentAddresses } from '../../../config/constants/addresses';
import {
  logDeployProxy,
  tryEtherscanVerifyImplementation,
} from '../../../helpers/utils';

const customAggregatorContractNamesPerToken: Record<
  MTokenName,
  string | undefined
> = {
  mTBILL: M_TBILL_CUSTOM_AGGREGATOR_CONTRACT_NAME,
  mBASIS: M_BASIS_CUSTOM_AGGREGATOR_CONTRACT_NAME,
  mBTC: M_BTC_CUSTOM_AGGREGATOR_CONTRACT_NAME,
  mEDGE: M_EDGE_CUSTOM_AGGREGATOR_CONTRACT_NAME,
  mRE7: M_RE7_CUSTOM_AGGREGATOR_CONTRACT_NAME,
  mMEV: M_MEV_CUSTOM_AGGREGATOR_CONTRACT_NAME,
  mSL: M_SL_CUSTOM_AGGREGATOR_CONTRACT_NAME,
  hbUSDT: HB_USDT_CUSTOM_AGGREGATOR_CONTRACT_NAME,
  mFONE: M_FONE_CUSTOM_AGGREGATOR_CONTRACT_NAME,
  TACmBTC: undefined,
  TACmEDGE: undefined,
  TACmMEV: undefined,
};

const dataFeedContractNamesPerToken: Record<MTokenName, string | undefined> = {
  mTBILL: M_TBILL_DATA_FEED_CONTRACT_NAME,
  mBASIS: M_BASIS_DATA_FEED_CONTRACT_NAME,
  mBTC: M_BTC_DATA_FEED_CONTRACT_NAME,
  mEDGE: M_EDGE_DATA_FEED_CONTRACT_NAME,
  mRE7: M_RE7_DATA_FEED_CONTRACT_NAME,
  mMEV: M_MEV_DATA_FEED_CONTRACT_NAME,
  mSL: M_SL_DATA_FEED_CONTRACT_NAME,
  hbUSDT: HB_USDT_DATA_FEED_CONTRACT_NAME,
  mFONE: M_FONE_DATA_FEED_CONTRACT_NAME,
  TACmBTC: undefined,
  TACmEDGE: undefined,
  TACmMEV: undefined,
};

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
  networkConfig?: DeployDataFeedConfig,
) => {
  const addresses = getCurrentAddresses(hre);
  const tokenAddresses = addresses?.dataFeeds?.[token];

  if (!tokenAddresses?.aggregator) {
    throw new Error('Token config is not found or aggregator is not set');
  }

  await deployTokenDataFeed(
    hre,
    tokenAddresses.aggregator,
    DATA_FEED_CONTRACT_NAME,
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

  const dataFeedContractName = dataFeedContractNamesPerToken[token];

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
    customAggregatorContractNamesPerToken[token];

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
  const { deployer } = await hre.getNamedAccounts();
  const owner = await hre.ethers.getSigner(deployer);

  if (!networkConfig) {
    throw new Error('Network config is not found');
  }

  console.log(`Deploying ${dataFeedContractName}...`);

  const deployment = await hre.upgrades.deployProxy(
    await hre.ethers.getContractFactory(dataFeedContractName, owner),
    [
      addresses?.accessControl,
      aggregator,
      networkConfig.healthyDiff,
      networkConfig.minAnswer,
      networkConfig.maxAnswer,
    ],
    {
      unsafeAllow: ['constructor'],
    },
  );

  console.log(`Deployed ${dataFeedContractName}:`, deployment.address);

  if (deployment.deployTransaction) {
    console.log('Waiting 5 blocks...');
    await deployment.deployTransaction.wait(5);
    console.log('Waited.');
  }
  await logDeployProxy(hre, dataFeedContractName, deployment.address);
  await tryEtherscanVerifyImplementation(hre, deployment.address);
};

const deployCustomAggregator = async (
  hre: HardhatRuntimeEnvironment,
  customAggregatorContractName: string,
  networkConfig?: DeployCustomAggregatorConfig,
) => {
  const addresses = getCurrentAddresses(hre);
  const { deployer } = await hre.getNamedAccounts();
  const owner = await hre.ethers.getSigner(deployer);

  if (!networkConfig) {
    throw new Error('Network config is not found');
  }

  console.log(`Deploying ${customAggregatorContractName}...`);

  const deployment = await hre.upgrades.deployProxy(
    await hre.ethers.getContractFactory(customAggregatorContractName, owner),
    [
      addresses?.accessControl,
      networkConfig.minAnswer,
      networkConfig.maxAnswer,
      networkConfig.maxAnswerDeviation,
      networkConfig.description,
    ],
    {
      unsafeAllow: ['constructor'],
    },
  );

  console.log(`Deployed ${customAggregatorContractName}:`, deployment.address);

  if (deployment.deployTransaction) {
    console.log('Waiting 5 blocks...');
    await deployment.deployTransaction.wait(5);
    console.log('Waited.');
  }
  await logDeployProxy(hre, customAggregatorContractName, deployment.address);
  await tryEtherscanVerifyImplementation(hre, deployment.address);
};
