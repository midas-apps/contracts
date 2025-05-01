import { expect } from 'chai';
import chalk from 'chalk';
import { parseUnits } from 'ethers/lib/utils';
import * as hre from 'hardhat';
import { DeployFunction } from 'hardhat-deploy/types';
import { HardhatRuntimeEnvironment } from 'hardhat/types';

import { M_TBILL_DATA_FEED_CONTRACT_NAME } from '../../../config';
import { getCurrentAddresses } from '../../../config/constants/addresses';
import {
  logDeploy,
  logDeployProxy,
  tryEtherscanVerifyImplementation,
} from '../../../helpers/utils';
// eslint-disable-next-line camelcase
import { AggregatorV3Mock__factory } from '../../../typechain-types';
import {
  DeployDataFeedConfig,
  deployMTokenDataFeed,
} from '../common/data-feed';

const config: DeployDataFeedConfig = {
  minAnswer: parseUnits('0.1', 8),
  maxAnswer: parseUnits('1000', 8),
  healthyDiff: 2592000,
};

const func: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  await deployMTokenDataFeed(hre, 'mTBILL', config);
};

func(hre).then(console.log).catch(console.error);
