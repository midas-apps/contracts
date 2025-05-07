import { BigNumber } from 'ethers';
import { parseUnits } from 'ethers/lib/utils';
import * as hre from 'hardhat';
import { DeployFunction } from 'hardhat-deploy/types';
import { HardhatRuntimeEnvironment } from 'hardhat/types';

import { M_SL_CUSTOM_AGGREGATOR_CONTRACT_NAME } from '../../../config';
import { getCurrentAddresses } from '../../../config/constants/addresses';
import {
  logDeployProxy,
  tryEtherscanVerifyImplementation,
} from '../../../helpers/utils';
import {
  DeployCustomAggregatorConfig,
  deployMTokenCustomAggregator,
} from '../common/data-feed';

const config: DeployCustomAggregatorConfig = {
  minAnswer: parseUnits('0.1', 8),
  maxAnswer: parseUnits('1000', 8),
  maxAnswerDeviation: parseUnits('0.35', 8),
  description: 'mSL/USD',
};

const func: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  await deployMTokenCustomAggregator(hre, 'mSL', config);
};

func(hre).then(console.log).catch(console.error);
