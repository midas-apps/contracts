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
  await deployMTokenDataFeed(hre, 'mBTC', config);
};

func(hre).then(console.log).catch(console.error);
