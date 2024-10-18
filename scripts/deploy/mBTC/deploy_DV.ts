import { expect } from 'chai';
import chalk from 'chalk';
import { BigNumber, BigNumberish, constants } from 'ethers';
import { parseUnits } from 'ethers/lib/utils';
import * as hre from 'hardhat';
import { DeployFunction } from 'hardhat-deploy/types';
import { HardhatRuntimeEnvironment } from 'hardhat/types';

import { M_BTC_DEPOSIT_VAULT_CONTRACT_NAME } from '../../../config';
import { deployDepositVault, DeployDvConfig } from '../common';

const configs: Record<number, DeployDvConfig> = {
  11155111: {
    feeReceiver: undefined,
    tokensReceiver: undefined,
    instantDailyLimit: constants.MaxUint256,
    instantFee: parseUnits('1', 2),
    minMTokenAmountForFirstDeposit: parseUnits('0.001'),
    minAmount: parseUnits('0.00001'),
    variationTolerance: parseUnits('0.1', 2),
  },
  // 1: {
  //   feeReceiver: '0x875c06A295C41c27840b9C9dfDA7f3d819d8bC6A',
  //   tokensReceiver: '0x1Bd4d8D25Ec7EBA10e94BE71Fd9c6BF672e31E06',
  //   instantDailyLimit: parseUnits('1000'),
  //   instantFee: parseUnits('0.1', 2),
  //   minMTokenAmountForFirstDeposit: parseUnits('0'),
  //   minAmount: parseUnits('0.1'),
  //   variationTolerance: parseUnits('0.1', 2),
  //   sanctionsList: '0x40C57923924B5c5c5455c48D93317139ADDaC8fb',
  // },
};

const func: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  const networkConfig = configs[hre.network.config.chainId!];

  await deployDepositVault(
    hre,
    await hre.ethers.getContractFactory(M_BTC_DEPOSIT_VAULT_CONTRACT_NAME),
    'mBTC',
    networkConfig,
  );
};

func(hre).then(console.log).catch(console.error);
