import { Provider } from '@ethersproject/providers';
import { BigNumberish, Signer } from 'ethers';
import { formatUnits, parseUnits } from 'ethers/lib/utils';
import { HardhatRuntimeEnvironment } from 'hardhat/types';

import {
  deployAndVerify,
  deployAndVerifyProxy,
  getDeploymentGenericConfig,
  getNetworkConfig,
  sendAndWaitForCustomTxSign,
} from './utils';

import { MTokenName, PaymentTokenName } from '../../../config';
import {
  DataFeedAddresses,
  DataFeedAddressesComposite,
  getCurrentAddresses,
} from '../../../config/constants/addresses';
import {
  getCommonContractNames,
  getTokenContractNames,
} from '../../../helpers/contracts';
import { CustomAggregatorV3CompatibleFeed } from '../../../typechain-types';
import { paymentTokenDeploymentConfigs } from '../configs/payment-tokens';

export type DeployDataFeedConfigCommon = {
  /**
   * Default: 0.1
   */
  minAnswer?: BigNumberish;
  /**
   * Default: 1000
   */
  maxAnswer?: BigNumberish;
};

export type DeployDataFeedConfigRegular = {
  /**
   * Default: 2592000
   */
  healthyDiff?: BigNumberish;
} & DeployDataFeedConfigCommon;

export type DeployDataFeedConfigComposite = {
  numerator: DeployDataFeedConfigRegular;
  denominator: DeployDataFeedConfigRegular;
} & DeployDataFeedConfigCommon;

export type DeployDataFeedConfig =
  | DeployDataFeedConfigComposite
  | DeployDataFeedConfigRegular;

type DeployCustomAggregatorCommonConfig = {
  /**
   * Default: 0.1
   */
  minAnswer?: BigNumberish;
  /**
   * Default: 1000
   */
  maxAnswer?: BigNumberish;
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

  if (!tokenAddresses) {
    throw new Error('Token config is not found');
  }

  if (isCompositeDataFeedAddresses(tokenAddresses)) {
    throw new Error('Composite config is not supported');
  }

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

const isCompositeDataFeedAddresses = (
  tokenAddresses: DataFeedAddresses,
): tokenAddresses is DataFeedAddressesComposite => {
  return 'numerator' in tokenAddresses || 'denominator' in tokenAddresses;
};

const isCompositeDataFeedConfig = (
  config: DeployDataFeedConfigRegular,
): config is DeployDataFeedConfigComposite => {
  return 'numerator' in config || 'denominator' in config;
};

export const deployPaymentTokenDataFeed = async (
  hre: HardhatRuntimeEnvironment,
  token: PaymentTokenName,
  aggregatorType?: 'numerator' | 'denominator',
) => {
  const addresses = getCurrentAddresses(hre);
  const tokenAddresses = addresses?.dataFeeds?.[token];

  const networkConfig =
    paymentTokenDeploymentConfigs.networkConfigs[hre.network.config.chainId!]?.[
      token
    ]?.dataFeed;

  if (!networkConfig) {
    throw new Error('Network config is not found');
  }

  if (!tokenAddresses) {
    throw new Error('Token config is not found');
  }

  const isComposite = isCompositeDataFeedAddresses(tokenAddresses);
  const isCompositeConfig = isCompositeDataFeedConfig(networkConfig);

  if (isComposite !== isCompositeConfig) {
    throw new Error('Incompatible config');
  }

  if (isComposite && isCompositeConfig && aggregatorType === undefined) {
    const contractName = getCommonContractNames().dataFeedComposite;

    if (!contractName) {
      throw new Error('Composite data feed contract name is not set');
    }

    if (
      !tokenAddresses?.denominator?.dataFeed ||
      !tokenAddresses?.numerator?.dataFeed
    ) {
      throw new Error('Nominator/denominator data feed is not set');
    }

    await deployTokenDataFeedComposite(
      hre,
      tokenAddresses.numerator.dataFeed,
      tokenAddresses.denominator.dataFeed,
      contractName,
      networkConfig,
    );
  } else {
    const contractName = getCommonContractNames().dataFeed;

    let aggregator: string | undefined;
    let config: DeployDataFeedConfigRegular;

    if (isComposite && isCompositeConfig && aggregatorType !== undefined) {
      aggregator = tokenAddresses[aggregatorType]?.aggregator;
      config = networkConfig[aggregatorType];
      console.log(`${aggregatorType} will be used`);
    } else if (!isComposite && aggregatorType === undefined) {
      aggregator = tokenAddresses?.aggregator;
      config = networkConfig;
      console.log(`regular aggregator will be used`);
    } else {
      throw new Error('Incorrect params');
    }

    if (!contractName) {
      throw new Error('Data feed contract name is not set');
    }

    if (!aggregator) {
      throw new Error('Token config is not found or aggregator is not set');
    }

    await deployTokenDataFeed(hre, aggregator, contractName, config);
  }
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
  networkConfig?: DeployDataFeedConfigRegular,
) => {
  const addresses = getCurrentAddresses(hre);

  if (!networkConfig) {
    throw new Error('Network config is not found');
  }

  await deployAndVerifyProxy(hre, dataFeedContractName, [
    addresses?.accessControl,
    aggregator,
    networkConfig.healthyDiff ?? 2592000,
    networkConfig.minAnswer ?? parseUnits('0.1', 8),
    networkConfig.maxAnswer ?? parseUnits('1000', 8),
  ]);
};

const deployTokenDataFeedComposite = async (
  hre: HardhatRuntimeEnvironment,
  numeratorFeed: string,
  denominatorFeed: string,
  dataFeedContractName: string,
  networkConfig?: DeployDataFeedConfigComposite,
) => {
  const addresses = getCurrentAddresses(hre);

  if (!networkConfig) {
    throw new Error('Network config is not found');
  }

  await deployAndVerifyProxy(hre, dataFeedContractName, [
    addresses?.accessControl,
    numeratorFeed,
    denominatorFeed,
    networkConfig.minAnswer ?? parseUnits('0.1', 18),
    networkConfig.maxAnswer ?? parseUnits('1000', 18),
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
    networkConfig.minAnswer ?? parseUnits('0.1', 8),
    networkConfig.maxAnswer ?? parseUnits('1000', 8),
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
