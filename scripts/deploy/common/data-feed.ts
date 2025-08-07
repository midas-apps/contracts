import { Provider } from '@ethersproject/providers';
import { BigNumberish, Signer } from 'ethers';
import { formatUnits } from 'ethers/lib/utils';
import { HardhatRuntimeEnvironment } from 'hardhat/types';

import {
  deployAndVerify,
  deployAndVerifyProxy,
  getDeploymentGenericConfig,
  getNetworkConfig,
  sendAndWaitForCustomTxSign,
} from './utils';

import { MTokenName, PaymentTokenName } from '../../../config';
import { getCurrentAddresses } from '../../../config/constants/addresses';
import {
  getCommonContractNames,
  getTokenContractNames,
} from '../../../helpers/contracts';
import { CustomAggregatorV3CompatibleFeed } from '../../../typechain-types';
import { paymentTokenDeploymentConfigs } from '../configs/payment-tokens';

export type DeployDataFeedConfig = {
  minAnswer: BigNumberish;
  maxAnswer: BigNumberish;
  healthyDiff: BigNumberish;
};

type DeployCustomAggregatorCommonConfig = {
  minAnswer: BigNumberish;
  maxAnswer: BigNumberish;
  maxAnswerDeviation: BigNumberish;
  description: string;
};
export type DeployCustomAggregatorRegularConfig =
  DeployCustomAggregatorCommonConfig & {
    type?: 'REGULAR';
  };

export type DeployCustomAggregatorDiscountedConfig = {
  discountPercentage: BigNumberish;
  underlyingFeed: `0x${string}` | 'customFeed';
};

export type DeployCustomAggregatorGrowthConfig =
  DeployCustomAggregatorCommonConfig & {
    type: 'GROWTH';
    onlyUp: boolean;
    minGrowthApr: BigNumberish;
    maxGrowthApr: BigNumberish;
  };

export type DeployCustomAggregatorConfig =
  | DeployCustomAggregatorRegularConfig
  | DeployCustomAggregatorGrowthConfig;

export type SetRoundDataConfig = {
  data: BigNumberish;
};

export const setRoundDataPaymentToken = async (
  hre: HardhatRuntimeEnvironment,
  token: PaymentTokenName,
) => {
  const networkConfig =
    paymentTokenDeploymentConfigs.networkConfigs[hre.network.config.chainId!]?.[
      token
    ]?.postDeploy?.setRoundData;

  if (!networkConfig) {
    throw new Error('Network config is not found');
  }

  const addresses = getCurrentAddresses(hre);
  const tokenAddresses = addresses?.dataFeeds?.[token];

  if (!tokenAddresses?.aggregator) {
    throw new Error('Token config is not found or aggregator is not set');
  }

  await setRoundData(hre, {
    isMToken: false,
    token,
    networkConfig,
    aggregatorAddress: tokenAddresses.aggregator,
  });
};

export const setRoundDataMToken = async (
  hre: HardhatRuntimeEnvironment,
  token: MTokenName,
) => {
  const { setRoundData: networkConfig } = getNetworkConfig(
    hre,
    token,
    'postDeploy',
  );

  if (!networkConfig) {
    throw new Error('Network config is not found');
  }

  const addresses = getCurrentAddresses(hre);
  const customFeed = addresses?.[token]?.customFeed;

  if (!customFeed) {
    throw new Error('Token config is not found or aggregator is not set');
  }

  await setRoundData(hre, {
    isMToken: true,
    token,
    networkConfig,
    aggregatorAddress: customFeed,
  });
};

const setRoundData = async (
  hre: HardhatRuntimeEnvironment,
  {
    isMToken,
    token,
    networkConfig,
    aggregatorAddress,
  }: {
    isMToken: boolean;
    token: string;
    networkConfig: SetRoundDataConfig;
    aggregatorAddress: string;
  },
) => {
  const aggregator = await getAggregatorContract(
    hre,
    hre.ethers.provider,
    aggregatorAddress,
  );

  const tx = await aggregator.populateTransaction.setRoundData(
    networkConfig.data,
  );

  const txRes = await sendAndWaitForCustomTxSign(hre, tx, {
    action: isMToken ? 'update-feed-mtoken' : 'update-feed-ptoken',
    comment: `${token} set price to ${formatUnits(networkConfig.data, 8)}`,
  });

  console.log(
    `${token} set price to ${formatUnits(networkConfig.data, 8)}`,
    txRes,
  );
};

const getAggregatorContract = async (
  hre: HardhatRuntimeEnvironment,
  provider: Provider | Signer,
  address: string,
) => {
  return (
    await hre.ethers.getContractAt('CustomAggregatorV3CompatibleFeed', address)
  ).connect(provider) as CustomAggregatorV3CompatibleFeed;
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

export const deployPaymentTokenCustomAggregator = async (
  hre: HardhatRuntimeEnvironment,
  paymentToken: PaymentTokenName,
) => {
  const customAggregatorContractName =
    getCommonContractNames().customAggregator;

  if (!customAggregatorContractName) {
    throw new Error('Custom aggregator contract name is not set');
  }

  const networkConfig =
    paymentTokenDeploymentConfigs.networkConfigs[hre.network.config.chainId!]?.[
      paymentToken
    ]?.customAggregator;

  await deployCustomAggregator(
    hre,
    customAggregatorContractName,
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

export const deployMTokenCustomAggregatorDiscounted = async (
  hre: HardhatRuntimeEnvironment,
  token: MTokenName,
) => {
  await deployCustomAggregatorDiscounted(
    hre,
    token,
    getDeploymentGenericConfig(hre, token, 'customAggregatorDiscounted'),
  );
};

export const deployMTokenCustomAggregator = async (
  hre: HardhatRuntimeEnvironment,
  token: MTokenName,
) => {
  const config = getDeploymentGenericConfig(hre, token, 'customAggregator');
  const isGrowth = config.type === 'GROWTH';

  const customAggregatorContractName = isGrowth
    ? getTokenContractNames(token).customAggregatorGrowth
    : getTokenContractNames(token).customAggregator;

  if (!customAggregatorContractName) {
    throw new Error('Custom aggregator contract name is not set');
  }

  await deployCustomAggregator(hre, customAggregatorContractName, config);
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

  const isGrowth = networkConfig.type === 'GROWTH';

  const params = [
    addresses?.accessControl,
    networkConfig.minAnswer,
    networkConfig.maxAnswer,
    networkConfig.maxAnswerDeviation,
    isGrowth ? networkConfig.minGrowthApr : undefined,
    isGrowth ? networkConfig.maxGrowthApr : undefined,
    isGrowth ? networkConfig.onlyUp : undefined,
    networkConfig.description,
  ].filter((v) => v !== undefined);

  await deployAndVerifyProxy(
    hre,
    customAggregatorContractName,
    params,
    undefined,
  );
};

const deployCustomAggregatorDiscounted = async (
  hre: HardhatRuntimeEnvironment,
  token: MTokenName,
  networkConfig?: DeployCustomAggregatorDiscountedConfig,
) => {
  const addresses = getCurrentAddresses(hre);

  if (!networkConfig) {
    throw new Error('Network config is not found');
  }

  const underlyingFeed =
    networkConfig.underlyingFeed === 'customFeed'
      ? addresses?.[token]?.customFeed
      : networkConfig.underlyingFeed;

  if (!underlyingFeed) {
    throw new Error('Underlying feed is not found');
  }

  await deployAndVerify(
    hre,
    getCommonContractNames().customAggregatorDiscounted,
    [underlyingFeed, networkConfig.discountPercentage],
  );
};
