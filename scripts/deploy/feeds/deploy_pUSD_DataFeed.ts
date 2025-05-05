import { expect } from 'chai';
import chalk from 'chalk';
import { BigNumber, BigNumberish, constants } from 'ethers';
import { parseUnits } from 'ethers/lib/utils';
import * as hre from 'hardhat';
import { DeployFunction } from 'hardhat-deploy/types';
import { HardhatRuntimeEnvironment } from 'hardhat/types';

import { M_BASIS_DEPOSIT_VAULT_CONTRACT_NAME } from '../../../config';
import { deployDepositVault, DeployDvConfig } from '../common';
import {
  DeployDataFeedConfig,
  deployPaymentTokenDataFeed,
} from '../common/data-feed';

const configs: Record<number, DeployDataFeedConfig> = {
  98865: {
    healthyDiff: 60 * 60,
    minAnswer: parseUnits('0.997', 18),
    maxAnswer: parseUnits('1.003', 18),
  },
  11155111: {
    healthyDiff: constants.MaxUint256,
    minAnswer: parseUnits('0.99', 8),
    maxAnswer: parseUnits('1.1', 8),
  },
};

const func: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  const networkConfig = configs[hre.network.config.chainId!];

  await deployPaymentTokenDataFeed(hre, 'pusd', networkConfig);
};

func(hre).then(console.log).catch(console.error);
