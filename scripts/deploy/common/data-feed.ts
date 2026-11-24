import {
  BigNumber,
  BigNumberish,
  constants,
  PopulatedTransaction,
} from 'ethers';
import { formatUnits, parseUnits } from 'ethers/lib/utils';
import { HardhatRuntimeEnvironment } from 'hardhat/types';

import {
  deployAndVerify,
  deployAndVerifyProxy,
  getContractAt,
  getDeployer,
  getDeploymentGenericConfig,
  getDeploymentGenericConfigOptional,
  FieldChange,
  getNetworkConfig,
  sendAndWaitForCustomTxSign,
} from './utils';

import { MTokenName, Network, PaymentTokenName } from '../../../config';
import {
  DataFeedAddresses,
  DataFeedAddressesComposite,
  getCurrentAddresses,
  networkUptimeFeeds,
  TokenAddresses,
} from '../../../config/constants/addresses';
import {
  getCommonContractNames,
  getTokenContractNames,
} from '../../../helpers/contracts';
import { getAllRoles } from '../../../helpers/roles';
import {
  CompositeDataFeed,
  CustomAggregatorV3CompatibleFeed,
  CustomAggregatorV3CompatibleFeedGrowth,
  DataFeed,
  IDataFeed,
} from '../../../typechain-types';
import {
  getDeploymentProfileForToken,
  getDeploymentTokenAddresses,
  resolveDeploymentAddress,
} from '../configs/deployment-profiles';
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
  /**
   * Chainlink L2 sequencer uptime feed.
   * Address zero disables the check.
   * Default: feed of the network from `networkUptimeFeeds`, address(0) if
   * the network has none
   */
  sequencerUptimeAggregator?: string;
} & DeployDataFeedConfigCommon;

export type DeployDataFeedConfigComposite = {
  numerator: DeployDataFeedConfigRegular;
  denominator: DeployDataFeedConfigRegular;
  feedType: 'composite' | 'multiply';
} & DeployDataFeedConfigCommon;

export type DeployDataFeedConfig =
  | DeployDataFeedConfigComposite
  | DeployDataFeedConfigRegular;

export const isAnswerWithinExpectedRange = (
  roundId: BigNumber,
  answer: BigNumber,
  minAnswer: BigNumber,
  maxAnswer: BigNumber,
) => {
  return roundId.isZero() || (answer.gte(minAnswer) && answer.lte(maxAnswer));
};

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

export type FeedTarget = 'general' | 'dv' | 'rv';

const customAggregatorConfigKeys = {
  general: 'customAggregator',
  dv: 'customAggregatorDv',
  rv: 'customAggregatorRv',
} as const;
const roundDataConfigKeys = {
  general: 'setRoundData',
  dv: 'setRoundDataDv',
  rv: 'setRoundDataRv',
} as const;
const customFeedAddressKeys = {
  dv: 'customFeedDv',
  rv: 'customFeedRv',
} as const;

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

type SetRoundDataFromProfileSourceConfig = {
  type?: 'REGULAR';
  dataSource: 'PROFILE_INITIAL_PRICE_SOURCE';
};

type SetRoundDataLiteralConfig =
  | SetRoundDataConfigGrowth
  | SetRoundDataConfigRegular;

export type SetRoundDataConfig =
  | SetRoundDataLiteralConfig
  | SetRoundDataFromProfileSourceConfig;

const isProfileInitialPriceSourceConfig = (
  config: SetRoundDataConfig,
): config is SetRoundDataFromProfileSourceConfig => 'dataSource' in config;

const resolveMTokenAggregator = (
  tokenAddresses: TokenAddresses,
  token: MTokenName,
  deploymentConfigName?: string,
) => {
  const profile = getDeploymentProfileForToken(token, deploymentConfigName);

  return profile
    ? resolveDeploymentAddress(
        tokenAddresses,
        token,
        deploymentConfigName,
        profile.feedReferences.dataFeedAggregator,
      )
    : tokenAddresses.customFeedAdjusted ??
        tokenAddresses.customFeedGrowth ??
        tokenAddresses.customFeed;
};

const getInitialPriceFromProfileSource = async (
  hre: HardhatRuntimeEnvironment,
  token: MTokenName,
) => {
  const profile = getDeploymentProfileForToken(token, hre.deploymentConfig);
  const source = profile?.feedReferences.initialPriceSource;
  const tokenAddresses = getCurrentAddresses(hre)?.[token];

  if (!source || !tokenAddresses) {
    throw new Error('Initial price source is not configured');
  }

  const sourceAddress = resolveDeploymentAddress(
    tokenAddresses,
    token,
    hre.deploymentConfig,
    source,
  );
  const sourceAggregator = await getContractAt(
    hre,
    'AggregatorV3Interface',
    sourceAddress,
  );
  const answer = (await sourceAggregator.latestRoundData()).answer;

  console.log(
    `${token} initial price source ${sourceAddress}: ${formatUnits(answer, 8)}`,
  );
  return answer;
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

  if (isProfileInitialPriceSourceConfig(networkConfig)) {
    throw new Error(
      'Profile initial price source is supported only for mTokens',
    );
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
  feedTarget: FeedTarget = 'general',
) => {
  const networkConfig = getNetworkConfig(hre, token, 'postDeploy')?.[
    roundDataConfigKeys[feedTarget]
  ];

  if (!networkConfig) {
    throw new Error('Network config is not found');
  }

  const addresses = getCurrentAddresses(hre);
  const tokenAddresses = addresses?.[token];
  const customFeed = tokenAddresses
    ? feedTarget === 'general'
      ? resolveMTokenAggregator(tokenAddresses, token, hre.deploymentConfig)
      : tokenAddresses[customFeedAddressKeys[feedTarget]]
    : undefined;

  if (!customFeed) {
    throw new Error('Token config is not found or aggregator is not set');
  }

  const literalConfig: SetRoundDataLiteralConfig =
    isProfileInitialPriceSourceConfig(networkConfig)
      ? { data: await getInitialPriceFromProfileSource(hre, token) }
      : networkConfig;

  await setRoundData(hre, {
    isMToken: true,
    token,
    feedLabel: feedTarget === 'general' ? undefined : `${feedTarget} feed`,
    networkConfig: literalConfig,
    aggregatorAddress: customFeed,
  });
};

const setRoundData = async (
  hre: HardhatRuntimeEnvironment,
  {
    isMToken,
    token,
    feedLabel,
    networkConfig,
    aggregatorAddress,
  }: {
    isMToken: boolean;
    token: string;
    // tells dv/rv requests apart in logs and Fordefi notes
    feedLabel?: string;
    networkConfig: SetRoundDataLiteralConfig;
    aggregatorAddress: string;
  },
) => {
  const name = feedLabel ? `${token} (${feedLabel})` : token;
  let tx: PopulatedTransaction;
  let log: string;
  if (networkConfig.type === 'GROWTH') {
    const aggregator = await getAggregatorGrowthContract(
      hre,
      aggregatorAddress,
    );

    const currentTimestamp = (await hre.ethers.provider.getBlock('latest'))
      .timestamp;

    tx = await aggregator.populateTransaction.setRoundData(
      networkConfig.data,
      networkConfig.dataTimestamp ?? currentTimestamp - 1,
      networkConfig.apr,
    );
    log = `${name} set price to ${formatUnits(
      networkConfig.data,
      8,
    )}/${formatUnits(networkConfig.apr, 8)}% at ${currentTimestamp}`;
  } else {
    const aggregator = await getAggregatorContract(hre, aggregatorAddress);

    tx = await aggregator.populateTransaction.setRoundData(networkConfig.data);
    log = `${name} set price to ${formatUnits(networkConfig.data, 8)}`;
  }

  const txRes = await sendAndWaitForCustomTxSign(hre, tx, {
    action: isMToken ? 'update-feed-mtoken' : 'update-feed-ptoken',
    comment: log,
    ...(isMToken ? { mToken: token as MTokenName } : {}),
  });

  console.log(log, txRes);
};

export type AggregatorType = 'numerator' | 'denominator';

export type PaymentTokenExpectedAnswersTarget =
  | {
      kind: 'composite';
      dataFeedAddress: string;
      config: DeployDataFeedConfigComposite;
    }
  | {
      kind: 'regular';
      dataFeedAddress: string;
      config: DeployDataFeedConfigRegular;
    };

export const getPaymentTokenExpectedAnswersTarget = (
  tokenAddresses: DataFeedAddresses,
  networkConfig: DeployDataFeedConfig,
  aggregatorType?: AggregatorType,
): PaymentTokenExpectedAnswersTarget => {
  const isCompositeConfig = isCompositeDataFeedConfig(networkConfig);
  const isCompositeAddress = isCompositeDataFeedAddresses(tokenAddresses);

  if (isCompositeConfig !== isCompositeAddress) {
    throw new Error('Data feed config and addresses have different types');
  }

  if (aggregatorType !== undefined) {
    if (!isCompositeConfig || !isCompositeAddress) {
      throw new Error('aggregatorType is only supported for composite feeds');
    }

    const subFeedAddress = tokenAddresses[aggregatorType]?.dataFeed;

    if (!subFeedAddress) {
      throw new Error(`${aggregatorType} data feed address is not set`);
    }

    return {
      kind: 'regular',
      dataFeedAddress: subFeedAddress,
      config: networkConfig[aggregatorType],
    };
  }

  if (!tokenAddresses.dataFeed) {
    throw new Error('Data feed address is not set');
  }

  if (isCompositeConfig) {
    return {
      kind: 'composite',
      dataFeedAddress: tokenAddresses.dataFeed,
      config: networkConfig,
    };
  }

  return {
    kind: 'regular',
    dataFeedAddress: tokenAddresses.dataFeed,
    config: networkConfig as DeployDataFeedConfigRegular,
  };
};

export const updateExpectedAnswersPaymentToken = async (
  hre: HardhatRuntimeEnvironment,
  token: PaymentTokenName,
  aggregatorType?: AggregatorType,
) => {
  const networkConfig =
    paymentTokenDeploymentConfigs.networkConfigs[hre.network.config.chainId!]?.[
      token
    ]?.dataFeed;

  if (!networkConfig) {
    throw new Error('Network config is not found');
  }

  const addresses = getCurrentAddresses(hre);
  const tokenAddresses = addresses?.paymentTokens?.[token];

  if (!tokenAddresses) {
    throw new Error('Token config is not found');
  }

  const target = getPaymentTokenExpectedAnswersTarget(
    tokenAddresses,
    networkConfig,
    aggregatorType,
  );

  if (target.kind === 'composite') {
    await updateCompositeExpectedAnswers(hre, {
      token,
      dataFeedAddress: target.dataFeedAddress,
      networkConfig: target.config,
    });
    return;
  }

  await updateExpectedAnswers(hre, {
    isMToken: false,
    token: aggregatorType ? `${token} ${aggregatorType}` : token,
    dataFeedAddress: target.dataFeedAddress,
    networkConfig: target.config,
  });
};

type MTokenDataFeedConfigs = Partial<
  Record<'dataFeed' | 'dataFeedDv' | 'dataFeedRv', DeployDataFeedConfig>
>;

export const getMTokenExpectedAnswersTargets = (
  tokenAddresses: TokenAddresses | undefined,
  configs: MTokenDataFeedConfigs,
) => {
  // dv/rv feeds fall back to the shared `dataFeed` config only when they have none of their own
  const getConfig = (key: keyof MTokenDataFeedConfigs) => {
    const config = configs[key] ?? configs.dataFeed;

    if (!config) {
      throw new Error('Deployment config is not found');
    }

    return config;
  };

  const feeds: {
    dataFeedAddress: string;
    networkConfig: DeployDataFeedConfigRegular;
  }[] = [];

  if (tokenAddresses?.dataFeedDv || tokenAddresses?.dataFeedRv) {
    if (tokenAddresses.dataFeedDv) {
      feeds.push({
        dataFeedAddress: tokenAddresses.dataFeedDv,
        networkConfig: getConfig('dataFeedDv'),
      });
    }
    if (tokenAddresses.dataFeedRv) {
      feeds.push({
        dataFeedAddress: tokenAddresses.dataFeedRv,
        networkConfig: getConfig('dataFeedRv'),
      });
    }
  } else if (tokenAddresses?.dataFeed) {
    feeds.push({
      dataFeedAddress: tokenAddresses.dataFeed,
      networkConfig: getConfig('dataFeed'),
    });
  }

  if (!feeds.length) {
    throw new Error('Token config is not found or dataFeed is not set');
  }

  return feeds;
};

export const updateExpectedAnswersMToken = async (
  hre: HardhatRuntimeEnvironment,
  token: MTokenName,
) => {
  const feeds = getMTokenExpectedAnswersTargets(
    getCurrentAddresses(hre)?.[token],
    {
      dataFeed: getDeploymentGenericConfigOptional(hre, token, 'dataFeed'),
      dataFeedDv: getDeploymentGenericConfigOptional(hre, token, 'dataFeedDv'),
      dataFeedRv: getDeploymentGenericConfigOptional(hre, token, 'dataFeedRv'),
    },
  );

  for (const feed of feeds) {
    await updateExpectedAnswers(hre, {
      isMToken: true,
      token,
      ...feed,
    });
  }
};

/**
 * Syncs mToken feed settings with the generic config: custom aggregators
 * (min/max answer, max answer deviation, growth APR bounds and onlyUp) and
 * data feeds (healthy diff). Only fields set in the config are synced.
 * Expected answers are synced by `updateExpectedAnswersMToken`
 */
export const updateFeedSettingsMToken = async (
  hre: HardhatRuntimeEnvironment,
  token: MTokenName,
) => {
  const tokenAddresses = getCurrentAddresses(hre)?.[token];

  if (!tokenAddresses) {
    throw new Error(`Token addresses are not found for ${token}`);
  }

  const addresses = getDeploymentTokenAddresses(
    tokenAddresses,
    token,
    hre.deploymentConfig,
  );

  for (const target of ['general', 'dv', 'rv'] as const) {
    const config = getDeploymentGenericConfigOptional(
      hre,
      token,
      customAggregatorConfigKeys[target],
    );
    if (!config) continue;

    const isGrowth = config.type === 'GROWTH';
    const addressKey =
      target === 'general'
        ? isGrowth
          ? 'customFeedGrowth'
          : 'customFeed'
        : customFeedAddressKeys[target];
    const address = addresses[addressKey];
    const label = target === 'general' ? token : `${token} (${target} feed)`;

    if (!address) {
      console.log(`${label} custom aggregator is not deployed, skipping`);
      continue;
    }

    await syncCustomAggregator(hre, {
      token,
      label,
      field: addressKey,
      address,
      config,
    });
  }

  const dataFeedConfigs = {
    dataFeed: getDeploymentGenericConfigOptional(hre, token, 'dataFeed'),
    dataFeedDv: getDeploymentGenericConfigOptional(hre, token, 'dataFeedDv'),
    dataFeedRv: getDeploymentGenericConfigOptional(hre, token, 'dataFeedRv'),
  };

  const hasHealthyDiff = Object.values(dataFeedConfigs).some(
    (c) => c && 'healthyDiff' in c && c.healthyDiff !== undefined,
  );
  if (!hasHealthyDiff) return;

  for (const {
    dataFeedAddress,
    networkConfig,
  } of getMTokenExpectedAnswersTargets(tokenAddresses, dataFeedConfigs)) {
    if (networkConfig.healthyDiff === undefined) continue;

    const dataFeed = (await getContractAt(
      hre,
      'DataFeed',
      dataFeedAddress,
    )) as DataFeed;
    const current = await dataFeed.healthyDiff();

    if (current.eq(networkConfig.healthyDiff)) {
      console.log(
        `${token} dataFeed ${dataFeedAddress} healthyDiff is already ${current}`,
      );
      continue;
    }

    await sendFeedSettingTx(
      hre,
      token,
      await dataFeed.populateTransaction.setHealthyDiff(
        networkConfig.healthyDiff,
      ),
      `${token} set dataFeed ${dataFeedAddress} healthyDiff: ${current} -> ${networkConfig.healthyDiff}`,
      [
        {
          field: `dataFeed(${dataFeedAddress}).healthyDiff`,
          current,
          target: networkConfig.healthyDiff,
        },
      ],
    );
  }
};

const sendFeedSettingTx = async (
  hre: HardhatRuntimeEnvironment,
  token: MTokenName,
  tx: PopulatedTransaction,
  comment: string,
  changes: FieldChange[],
) => {
  const txRes = await sendAndWaitForCustomTxSign(hre, tx, {
    action: 'update-feed-mtoken',
    mToken: token,
    comment,
    changes,
  });
  console.log(comment, txRes);
};

const syncCustomAggregator = async (
  hre: HardhatRuntimeEnvironment,
  {
    token,
    label,
    field,
    address,
    config,
  }: {
    token: MTokenName;
    label: string;
    /** address key of the aggregator, prefix of the reported fields */
    field: string;
    address: string;
    config: DeployCustomAggregatorConfig;
  },
) => {
  // setters shared by regular and growth aggregators have the same ABI
  const aggregator = await getAggregatorContract(hre, address);
  const decimals = await aggregator.decimals();
  const format = (v: BigNumberish) => formatUnits(v, decimals);

  if (config.minAnswer !== undefined || config.maxAnswer !== undefined) {
    const [currentMin, currentMax] = await Promise.all([
      aggregator.minAnswer(),
      aggregator.maxAnswer(),
    ]);
    const min = BigNumber.from(config.minAnswer ?? currentMin);
    const max = BigNumber.from(config.maxAnswer ?? currentMax);

    if (min.eq(currentMin) && max.eq(currentMax)) {
      console.log(`${label} aggregator min/max answer are already up to date`);
    } else {
      if (!min.lt(max)) {
        throw new Error(
          `${label} aggregator minAnswer (${min}) must be less than maxAnswer (${max})`,
        );
      }

      const { answer, roundId } = await aggregator.latestRoundData();
      if (!isAnswerWithinExpectedRange(roundId, answer, min, max)) {
        throw new Error(
          `${label} aggregator answer ${format(
            answer,
          )} is outside the new range [${format(min)}, ${format(max)}]`,
        );
      }

      await sendFeedSettingTx(
        hre,
        token,
        await aggregator.populateTransaction.setMinMaxAnswer(min, max),
        `${label} set aggregator min/max answer: [${format(
          currentMin,
        )}, ${format(currentMax)}] -> [${format(min)}, ${format(max)}]`,
        [
          {
            field: `${field}.minAnswer`,
            current: format(currentMin),
            target: format(min),
          },
          {
            field: `${field}.maxAnswer`,
            current: format(currentMax),
            target: format(max),
          },
        ],
      );
    }
  }

  const currentDeviation = await aggregator.maxAnswerDeviation();
  if (currentDeviation.eq(config.maxAnswerDeviation)) {
    console.log(
      `${label} aggregator maxAnswerDeviation is already ${format(
        currentDeviation,
      )}%`,
    );
  } else {
    await sendFeedSettingTx(
      hre,
      token,
      await aggregator.populateTransaction.setMaxAnswerDeviation(
        config.maxAnswerDeviation,
      ),
      `${label} set aggregator maxAnswerDeviation: ${format(
        currentDeviation,
      )}% -> ${format(config.maxAnswerDeviation)}%`,
      [
        {
          field: `${field}.maxAnswerDeviation`,
          current: `${format(currentDeviation)}%`,
          target: `${format(config.maxAnswerDeviation)}%`,
        },
      ],
    );
  }

  if (config.type !== 'GROWTH') return;

  const growth = await getAggregatorGrowthContract(hre, address);

  const currentOnlyUp = await growth.onlyUp();
  if (currentOnlyUp === config.onlyUp) {
    console.log(`${label} aggregator onlyUp is already ${config.onlyUp}`);
  } else {
    await sendFeedSettingTx(
      hre,
      token,
      await growth.populateTransaction.setOnlyUp(config.onlyUp),
      `${label} set aggregator onlyUp to ${config.onlyUp}`,
      [
        {
          field: `${field}.onlyUp`,
          current: currentOnlyUp,
          target: config.onlyUp,
        },
      ],
    );
  }

  const [currentMinApr, currentMaxApr] = await Promise.all([
    growth.minGrowthApr(),
    growth.maxGrowthApr(),
  ]);
  const minApr = BigNumber.from(config.minGrowthApr);
  const maxApr = BigNumber.from(config.maxGrowthApr);

  if (minApr.gt(maxApr)) {
    throw new Error(
      `${label} aggregator minGrowthApr (${minApr}) must not exceed maxGrowthApr (${maxApr})`,
    );
  }

  const setMinApr = async () => {
    if (currentMinApr.eq(minApr)) return;
    await sendFeedSettingTx(
      hre,
      token,
      await growth.populateTransaction.setMinGrowthApr(minApr),
      `${label} set aggregator minGrowthApr: ${format(
        currentMinApr,
      )}% -> ${format(minApr)}%`,
      [
        {
          field: `${field}.minGrowthApr`,
          current: `${format(currentMinApr)}%`,
          target: `${format(minApr)}%`,
        },
      ],
    );
  };
  const setMaxApr = async () => {
    if (currentMaxApr.eq(maxApr)) return;
    await sendFeedSettingTx(
      hre,
      token,
      await growth.populateTransaction.setMaxGrowthApr(maxApr),
      `${label} set aggregator maxGrowthApr: ${format(
        currentMaxApr,
      )}% -> ${format(maxApr)}%`,
      [
        {
          field: `${field}.maxGrowthApr`,
          current: `${format(currentMaxApr)}%`,
          target: `${format(maxApr)}%`,
        },
      ],
    );
  };

  // each setter checks the new bound against the other current bound
  if (minApr.gt(currentMaxApr)) {
    await setMaxApr();
    await setMinApr();
  } else {
    await setMinApr();
    await setMaxApr();
  }
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

  const dataFeed = (await getContractAt(
    hre,
    'DataFeed',
    dataFeedAddress,
  )) as DataFeed;

  const aggregator = await getContractAt(
    hre,
    'AggregatorV3Interface',
    await dataFeed.aggregator(),
  );
  const aggregatorDecimals = await aggregator.decimals();

  const currentMin = await dataFeed.minExpectedAnswer();
  const currentMax = await dataFeed.maxExpectedAnswer();

  const newMin = BigNumber.from(networkConfig.minAnswer);
  const newMax = BigNumber.from(networkConfig.maxAnswer);

  if (newMax.lt(newMin)) {
    throw new Error(
      `maxAnswer (${newMax.toString()}) must be greater than or equal to minAnswer (${newMin.toString()})`,
    );
  }

  const { answer, roundId } = await aggregator.latestRoundData();

  if (!isAnswerWithinExpectedRange(roundId, answer, newMin, newMax)) {
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

  await applyExpectedAnswerUpdates(hre, {
    token,
    dataFeed,
    currentMin,
    currentMax,
    newMin,
    newMax,
    decimals: aggregatorDecimals,
    action,
  });
};

const updateCompositeExpectedAnswers = async (
  hre: HardhatRuntimeEnvironment,
  {
    token,
    dataFeedAddress,
    networkConfig,
  }: {
    token: string;
    dataFeedAddress: string;
    networkConfig: DeployDataFeedConfigComposite;
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
    await hre.ethers.getContractAt('CompositeDataFeed', dataFeedAddress)
  ).connect(hre.ethers.provider) as CompositeDataFeed;

  const currentMin = await dataFeed.minExpectedAnswer();
  const currentMax = await dataFeed.maxExpectedAnswer();
  const newMin = BigNumber.from(networkConfig.minAnswer);
  const newMax = BigNumber.from(networkConfig.maxAnswer);

  if (newMax.lt(newMin)) {
    throw new Error(
      `maxAnswer (${newMax.toString()}) must be greater than or equal to minAnswer (${newMin.toString()})`,
    );
  }

  const numeratorFeed = (
    await hre.ethers.getContractAt('IDataFeed', await dataFeed.numeratorFeed())
  ).connect(hre.ethers.provider) as IDataFeed;
  const denominatorFeed = (
    await hre.ethers.getContractAt(
      'IDataFeed',
      await dataFeed.denominatorFeed(),
    )
  ).connect(hre.ethers.provider) as IDataFeed;
  const numerator = await numeratorFeed.getDataInBase18();
  const denominator = await denominatorFeed.getDataInBase18();

  if (networkConfig.feedType === 'composite' && denominator.isZero()) {
    throw new Error('Current denominator answer is zero');
  }

  const base18 = parseUnits('1');
  const answer =
    networkConfig.feedType === 'multiply'
      ? numerator.mul(denominator).div(base18)
      : numerator.mul(base18).div(denominator);

  if (answer.lt(newMin) || answer.gt(newMax)) {
    throw new Error(
      `current composite answer ${formatUnits(
        answer,
        18,
      )} is outside the new expected range [${formatUnits(
        newMin,
        18,
      )}, ${formatUnits(newMax, 18)}]`,
    );
  }

  console.log(`${token} composite dataFeed ${dataFeedAddress}`);
  console.log(
    `min: ${formatUnits(currentMin, 18)} -> ${formatUnits(
      newMin,
      18,
    )}, max: ${formatUnits(currentMax, 18)} -> ${formatUnits(newMax, 18)}`,
  );

  await applyExpectedAnswerUpdates(hre, {
    token,
    dataFeed,
    currentMin,
    currentMax,
    newMin,
    newMax,
    decimals: 18,
    action: 'update-feed-ptoken',
  });
};

const applyExpectedAnswerUpdates = async (
  hre: HardhatRuntimeEnvironment,
  {
    token,
    dataFeed,
    currentMin,
    currentMax,
    newMin,
    newMax,
    decimals,
    action,
  }: {
    token: string;
    dataFeed: DataFeed | CompositeDataFeed;
    currentMin: BigNumber;
    currentMax: BigNumber;
    newMin: BigNumber;
    newMax: BigNumber;
    decimals: number;
    action: 'update-feed-mtoken' | 'update-feed-ptoken';
  },
) => {
  if (newMin.eq(currentMin) && newMax.eq(currentMax)) {
    console.log('min/max expected answers are already up to date, skipping');
    return;
  }

  const tx = await dataFeed.populateTransaction.setMinMaxExpectedAnswer(
    newMax,
    newMin,
  );
  const log = `${token} set expected answers to [${formatUnits(
    newMin,
    decimals,
  )}, ${formatUnits(newMax, decimals)}]`;
  const txRes = await sendAndWaitForCustomTxSign(hre, tx, {
    action,
    comment: log,
    changes: [
      {
        field: `dataFeed(${dataFeed.address}).minExpectedAnswer`,
        current: formatUnits(currentMin, decimals),
        target: formatUnits(newMin, decimals),
      },
      {
        field: `dataFeed(${dataFeed.address}).maxExpectedAnswer`,
        current: formatUnits(currentMax, decimals),
        target: formatUnits(newMax, decimals),
      },
    ],
  });
  console.log(log, txRes);
};

const getAggregatorContract = async (
  hre: HardhatRuntimeEnvironment,
  address: string,
) => {
  return (await getContractAt(
    hre,
    'CustomAggregatorV3CompatibleFeed',
    address,
  )) as CustomAggregatorV3CompatibleFeed;
};

const getAggregatorGrowthContract = async (
  hre: HardhatRuntimeEnvironment,
  address: string,
) => {
  return (await getContractAt(
    hre,
    'CustomAggregatorV3CompatibleFeedGrowth',
    address,
  )) as CustomAggregatorV3CompatibleFeedGrowth;
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
  const tokenAddresses = addresses?.[token]
    ? getDeploymentTokenAddresses(
        addresses[token]!,
        token,
        hre.deploymentConfig,
      )
    : undefined;

  const aggregator = addresses?.[token]
    ? resolveMTokenAggregator(addresses[token]!, token, hre.deploymentConfig)
    : undefined;

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
    getDeploymentGenericConfigOptional(hre, token, 'dataFeedDv') ??
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
    getDeploymentGenericConfigOptional(hre, token, 'dataFeedRv') ??
      getDeploymentGenericConfig(hre, token, 'dataFeed'),
  );
};

export const deployMTokenCustomAggregator = async (
  hre: HardhatRuntimeEnvironment,
  token: MTokenName,
  feedTarget: FeedTarget = 'general',
) => {
  const config = getDeploymentGenericConfig(
    hre,
    token,
    customAggregatorConfigKeys[feedTarget],
  );
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
      networkConfig.sequencerUptimeAggregator ??
        networkUptimeFeeds[hre.network.name as Network] ??
        constants.AddressZero,
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
