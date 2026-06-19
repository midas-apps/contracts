import { Provider } from '@ethersproject/providers';
import { BigNumber, BigNumberish, PopulatedTransaction, Signer } from 'ethers';
import { formatUnits, parseUnits } from 'ethers/lib/utils';
import { HardhatRuntimeEnvironment } from 'hardhat/types';

import {
  deployAndVerify,
  deployAndVerifyProxy,
  getDeployer,
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
import { getAllRoles } from '../../../helpers/roles';
import {
  CustomAggregatorV3CompatibleFeed,
  CustomAggregatorV3CompatibleFeedGrowth,
  DataFeed,
} from '../../../typechain-types';
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
  feedType: 'composite' | 'multiply';
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

export type DeployCustomAggregatorAdjustedConfig = {
  adjustmentPercentage: BigNumberish;
  underlyingFeed: `0x${string}` | 'customFeed' | 'customFeedGrowth';
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

type SetRoundDataConfigCommon = {
  data: BigNumberish;
};

type SetRoundDataConfigGrowth = SetRoundDataConfigCommon & {
  type: 'GROWTH';
  apr: BigNumberish;
  dataTimestamp?: BigNumberish;
};

type SetRoundDataConfigRegular = SetRoundDataConfigCommon & {
  type?: 'REGULAR';
};

export type SetRoundDataConfig =
  | SetRoundDataConfigGrowth
  | SetRoundDataConfigRegular;

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
  const tokenAddresses = addresses?.paymentTokens?.[token];

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
  const tokenAddresses = addresses?.[token];
  const customFeed =
    tokenAddresses?.customFeedGrowth ?? tokenAddresses?.customFeed;

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
  let tx: PopulatedTransaction;
  let log: string;
  if (networkConfig.type === 'GROWTH') {
    const aggregator = await getAggregatorGrowthContract(
      hre,
      hre.ethers.provider,
      aggregatorAddress,
    );

    const currentTimestamp = (await hre.ethers.provider.getBlock('latest'))
      .timestamp;

    tx = await aggregator.populateTransaction.setRoundData(
      networkConfig.data,
      networkConfig.dataTimestamp ?? currentTimestamp - 1,
      networkConfig.apr,
    );
    log = `${token} set price to ${formatUnits(
      networkConfig.data,
      8,
    )}/${formatUnits(networkConfig.apr, 8)}% at ${currentTimestamp}`;
  } else {
    const aggregator = await getAggregatorContract(
      hre,
      hre.ethers.provider,
      aggregatorAddress,
    );

    tx = await aggregator.populateTransaction.setRoundData(networkConfig.data);
    log = `${token} set price to ${formatUnits(networkConfig.data, 8)}`;
  }

  const txRes = await sendAndWaitForCustomTxSign(hre, tx, {
    action: isMToken ? 'update-feed-mtoken' : 'update-feed-ptoken',
    comment: log,
  });

  console.log(log, txRes);
};

export const updateExpectedAnswersPaymentToken = async (
  hre: HardhatRuntimeEnvironment,
  token: PaymentTokenName,
) => {
  const networkConfig =
    paymentTokenDeploymentConfigs.networkConfigs[hre.network.config.chainId!]?.[
      token
    ]?.dataFeed;

  if (!networkConfig) {
    throw new Error('Network config is not found');
  }

  if (isCompositeDataFeedConfig(networkConfig)) {
    throw new Error('Composite config is not supported');
  }

  const addresses = getCurrentAddresses(hre);
  const tokenAddresses = addresses?.paymentTokens?.[token];

  if (!tokenAddresses || isCompositeDataFeedAddresses(tokenAddresses)) {
    throw new Error('Token config is not found or is composite');
  }

  if (!tokenAddresses.dataFeed) {
    throw new Error('Data feed address is not set');
  }

  await updateExpectedAnswers(hre, {
    isMToken: false,
    token,
    dataFeedAddress: tokenAddresses.dataFeed,
    networkConfig,
  });
};

export const updateExpectedAnswersMToken = async (
  hre: HardhatRuntimeEnvironment,
  token: MTokenName,
) => {
  const networkConfig = getDeploymentGenericConfig(hre, token, 'dataFeed');

  const addresses = getCurrentAddresses(hre);
  const dataFeedAddress = addresses?.[token]?.dataFeed;

  if (!dataFeedAddress) {
    throw new Error('Token config is not found or dataFeed is not set');
  }

  await updateExpectedAnswers(hre, {
    isMToken: true,
    token,
    dataFeedAddress,
    networkConfig,
  });
};

const updateExpectedAnswers = async (
  hre: HardhatRuntimeEnvironment,
  {
    isMToken,
    token,
    dataFeedAddress,
    networkConfig,
  }: {
    isMToken: boolean;
    token: string;
    dataFeedAddress: string;
    networkConfig: DeployDataFeedConfigRegular;
  },
) => {
  if (
    networkConfig.minAnswer === undefined ||
    networkConfig.maxAnswer === undefined
  ) {
    throw new Error(
      'minAnswer and maxAnswer must be explicitly set in the config',
    );
  }

  const dataFeed = (
    await hre.ethers.getContractAt('DataFeed', dataFeedAddress)
  ).connect(hre.ethers.provider) as DataFeed;

  const aggregator = await hre.ethers.getContractAt(
    'AggregatorV3Interface',
    await dataFeed.aggregator(),
  );
  const aggregatorDecimals = await aggregator.decimals();

  const currentMin = await dataFeed.minExpectedAnswer();
  const currentMax = await dataFeed.maxExpectedAnswer();

  const newMin = BigNumber.from(networkConfig.minAnswer);
  const newMax = BigNumber.from(networkConfig.maxAnswer);

  if (!newMax.gt(newMin)) {
    throw new Error(
      `maxAnswer (${newMax.toString()}) must be greater than minAnswer (${newMin.toString()})`,
    );
  }

  const { answer } = await aggregator.latestRoundData();

  if (answer.lt(newMin) || answer.gt(newMax)) {
    throw new Error(
      `current aggregator answer ${formatUnits(
        answer,
        aggregatorDecimals,
      )} is outside the new expected range [${formatUnits(
        newMin,
        aggregatorDecimals,
      )}, ${formatUnits(
        newMax,
        aggregatorDecimals,
      )}] — check the config decimals`,
    );
  }

  console.log(
    `${token} dataFeed ${dataFeedAddress} (aggregator decimals: ${aggregatorDecimals})`,
  );
  console.log(
    `min: ${formatUnits(currentMin, aggregatorDecimals)} -> ${formatUnits(
      newMin,
      aggregatorDecimals,
    )}, max: ${formatUnits(currentMax, aggregatorDecimals)} -> ${formatUnits(
      newMax,
      aggregatorDecimals,
    )}`,
  );

  const action = isMToken ? 'update-feed-mtoken' : 'update-feed-ptoken';

  const setMax = async () => {
    if (newMax.eq(currentMax)) {
      console.log('maxExpectedAnswer is already up to date, skipping');
      return;
    }
    const tx = await dataFeed.populateTransaction.setMaxExpectedAnswer(newMax);
    const log = `${token} set maxExpectedAnswer to ${formatUnits(
      newMax,
      aggregatorDecimals,
    )}`;
    const txRes = await sendAndWaitForCustomTxSign(hre, tx, {
      action,
      comment: log,
    });
    console.log(log, txRes);
  };

  const setMin = async () => {
    if (newMin.eq(currentMin)) {
      console.log('minExpectedAnswer is already up to date, skipping');
      return;
    }
    const tx = await dataFeed.populateTransaction.setMinExpectedAnswer(newMin);
    const log = `${token} set minExpectedAnswer to ${formatUnits(
      newMin,
      aggregatorDecimals,
    )}`;
    const txRes = await sendAndWaitForCustomTxSign(hre, tx, {
      action,
      comment: log,
    });
    console.log(log, txRes);
  };

  // ordering matters: the contract enforces max > min on every update.
  // when raising the range (e.g. 8 -> 18 decimals migration), max must
  // be raised first; when lowering the range, min must be lowered first.
  if (newMax.gt(currentMin)) {
    await setMax();
    await setMin();
  } else {
    await setMin();
    await setMax();
  }
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

const getAggregatorGrowthContract = async (
  hre: HardhatRuntimeEnvironment,
  provider: Provider | Signer,
  address: string,
) => {
  return (
    await hre.ethers.getContractAt(
      'CustomAggregatorV3CompatibleFeedGrowth',
      address,
    )
  ).connect(provider) as CustomAggregatorV3CompatibleFeedGrowth;
};

const isCompositeDataFeedAddresses = (
  tokenAddresses: DataFeedAddresses,
): tokenAddresses is DataFeedAddressesComposite => {
  return 'numerator' in tokenAddresses || 'denominator' in tokenAddresses;
};

const isCompositeDataFeedConfig = (
  config: DeployDataFeedConfig,
): config is DeployDataFeedConfigComposite => {
  return 'numerator' in config || 'denominator' in config;
};

export const deployPaymentTokenDataFeed = async (
  hre: HardhatRuntimeEnvironment,
  token: PaymentTokenName,
  aggregatorType?: 'numerator' | 'denominator',
) => {
  const addresses = getCurrentAddresses(hre);
  const tokenAddresses = addresses?.paymentTokens?.[token];

  const networkConfig =
    paymentTokenDeploymentConfigs.networkConfigs[hre.network.config.chainId!]?.[
      token
    ]?.dataFeed;

  if (!networkConfig) {
    throw new Error(
      `Network config not found for token ${token} on chain ${hre.network.config.chainId}`,
    );
  }

  if (!tokenAddresses) {
    throw new Error(`Token addresses not found for ${token}`);
  }

  const isComposite = isCompositeDataFeedAddresses(tokenAddresses);
  const isCompositeConfig = isCompositeDataFeedConfig(networkConfig);

  if (isComposite !== isCompositeConfig) {
    throw new Error(
      `Configuration mismatch: addresses ${
        isComposite ? 'are' : 'are not'
      } composite, but config ${isCompositeConfig ? 'is' : 'is not'} composite`,
    );
  }

  if (isComposite && isCompositeConfig && aggregatorType === undefined) {
    const compositeConfig = networkConfig as DeployDataFeedConfigComposite;
    const feedType = compositeConfig.feedType;

    if (
      !tokenAddresses?.denominator?.dataFeed ||
      !tokenAddresses?.numerator?.dataFeed
    ) {
      throw new Error('Nominator/denominator data feed is not set');
    }

    if (feedType === 'multiply') {
      await deployTokenDataFeedMultiply(
        hre,
        tokenAddresses.numerator.dataFeed,
        tokenAddresses.denominator.dataFeed,
        compositeConfig,
      );
    } else {
      await deployTokenDataFeedComposite(
        hre,
        tokenAddresses.numerator.dataFeed,
        tokenAddresses.denominator.dataFeed,
        compositeConfig,
      );
    }
  } else {
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

    if (!aggregator) {
      throw new Error('Token config is not found or aggregator is not set');
    }

    const roles = getAllRoles();
    await deployTokenDataFeed(
      hre,
      aggregator,
      roles.common.defaultAdmin,
      config,
    );
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

  const roles = getAllRoles();
  await deployCustomAggregator(
    hre,
    customAggregatorContractName,
    roles.common.defaultAdmin,
    networkConfig,
  );
};

export const deployMTokenDataFeed = async (
  hre: HardhatRuntimeEnvironment,
  token: MTokenName,
) => {
  const addresses = getCurrentAddresses(hre);
  const tokenAddresses = addresses?.[token];

  const aggregator =
    tokenAddresses?.customFeedAdjusted ??
    tokenAddresses?.customFeedGrowth ??
    tokenAddresses?.customFeed;

  if (!aggregator) {
    throw new Error('Token config is not found or customFeed is not set');
  }

  if (tokenAddresses?.customFeedAdjusted) {
    console.log('Using single adjusted feed as aggregator for DataFeed');
  }

  const roles = getAllRoles();
  await deployTokenDataFeed(
    hre,
    aggregator,
    roles.tokenRoles[token].customFeedAdmin!,
    getDeploymentGenericConfig(hre, token, 'dataFeed'),
  );
};

export const deployMTokenCustomAggregatorAdjusted = async (
  hre: HardhatRuntimeEnvironment,
  token: MTokenName,
) => {
  await deployCustomAggregatorAdjusted(
    hre,
    token,
    getDeploymentGenericConfig(hre, token, 'customAggregatorAdjusted'),
  );
};

export const deployMTokenCustomAggregatorAdjustedDv = async (
  hre: HardhatRuntimeEnvironment,
  token: MTokenName,
) => {
  await deployCustomAggregatorAdjusted(
    hre,
    token,
    getDeploymentGenericConfig(hre, token, 'customAggregatorAdjustedDv'),
  );
};

export const deployMTokenCustomAggregatorAdjustedRv = async (
  hre: HardhatRuntimeEnvironment,
  token: MTokenName,
) => {
  await deployCustomAggregatorAdjusted(
    hre,
    token,
    getDeploymentGenericConfig(hre, token, 'customAggregatorAdjustedRv'),
  );
};

export const deployMTokenDataFeedDv = async (
  hre: HardhatRuntimeEnvironment,
  token: MTokenName,
) => {
  const addresses = getCurrentAddresses(hre);
  const tokenAddresses = addresses?.[token];

  if (!tokenAddresses?.customFeedDv) {
    throw new Error('Token config is not found or customFeedDv is not set');
  }

  const roles = getAllRoles();
  await deployTokenDataFeed(
    hre,
    tokenAddresses.customFeedDv,
    roles.tokenRoles[token].customFeedAdmin!,
    getDeploymentGenericConfig(hre, token, 'dataFeed'),
  );
};

export const deployMTokenDataFeedRv = async (
  hre: HardhatRuntimeEnvironment,
  token: MTokenName,
) => {
  const addresses = getCurrentAddresses(hre);
  const tokenAddresses = addresses?.[token];

  if (!tokenAddresses?.customFeedRv) {
    throw new Error('Token config is not found or customFeedRv is not set');
  }

  const roles = getAllRoles();
  await deployTokenDataFeed(
    hre,
    tokenAddresses.customFeedRv,
    roles.tokenRoles[token].customFeedAdmin!,
    getDeploymentGenericConfig(hre, token, 'dataFeed'),
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

  const roles = getAllRoles();

  if (!roles.tokenRoles[token].customFeedAdmin) {
    throw new Error('Custom feed admin role is not set');
  }

  await deployCustomAggregator(
    hre,
    customAggregatorContractName,
    roles.tokenRoles[token].customFeedAdmin,
    config,
  );
};

const deployTokenDataFeed = async (
  hre: HardhatRuntimeEnvironment,
  aggregator: string,
  adminRole: string,
  networkConfig?: DeployDataFeedConfigRegular,
) => {
  const addresses = getCurrentAddresses(hre);

  if (!networkConfig) {
    throw new Error('Network config is not found');
  }

  await deployAndVerifyProxy(
    hre,
    getCommonContractNames().dataFeed,
    [
      addresses?.accessControl,
      aggregator,
      networkConfig.healthyDiff ?? 2592000,
      networkConfig.minAnswer ?? parseUnits('0.1', 8),
      networkConfig.maxAnswer ?? parseUnits('1000', 8),
    ],
    undefined,
    {
      constructorArgs: [adminRole],
    },
  );
};

const deployTokenDataFeedComposite = async (
  hre: HardhatRuntimeEnvironment,
  numeratorFeed: string,
  denominatorFeed: string,
  networkConfig?: DeployDataFeedConfigComposite,
) => {
  const addresses = getCurrentAddresses(hre);

  if (!networkConfig) {
    throw new Error('Network config is not found');
  }

  await deployAndVerifyProxy(hre, getCommonContractNames().dataFeedComposite, [
    addresses?.accessControl,
    numeratorFeed,
    denominatorFeed,
    networkConfig.minAnswer ?? parseUnits('0.1', 18),
    networkConfig.maxAnswer ?? parseUnits('1000', 18),
  ]);
};

export const deployTokenDataFeedMultiply = async (
  hre: HardhatRuntimeEnvironment,
  numeratorFeed: string,
  denominatorFeed: string,
  networkConfig?: DeployDataFeedConfigComposite,
) => {
  const addresses = getCurrentAddresses(hre);

  if (!networkConfig) {
    throw new Error('Network config is not found');
  }

  await deployAndVerifyProxy(hre, getCommonContractNames().dataFeedMultiply, [
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
  adminRole: string,
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
    {
      constructorArgs: [adminRole],
    },
  );
};

const deployCustomAggregatorAdjusted = async (
  hre: HardhatRuntimeEnvironment,
  token: MTokenName,
  networkConfig?: DeployCustomAggregatorAdjustedConfig,
) => {
  const addresses = getCurrentAddresses(hre);

  if (!networkConfig) {
    throw new Error('Network config is not found');
  }

  const feedKey = networkConfig.underlyingFeed;
  const underlyingFeed =
    feedKey === 'customFeed' || feedKey === 'customFeedGrowth'
      ? addresses?.[token]?.[feedKey]
      : networkConfig.underlyingFeed;

  if (!underlyingFeed) {
    throw new Error('Underlying feed is not found');
  }

  const deployer = await getDeployer(hre);

  await deployAndVerify(
    hre,
    getCommonContractNames().customAggregatorAdjusted,
    [underlyingFeed, networkConfig.adjustmentPercentage],
    deployer,
  );
};
