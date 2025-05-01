import { BigNumber, BigNumberish, constants } from 'ethers';
import { parseUnits } from 'ethers/lib/utils';
import * as hre from 'hardhat';
import { DeployFunction } from 'hardhat-deploy/types';
import { HardhatRuntimeEnvironment } from 'hardhat/types';

import { chainIds, M_EDGE_DEPOSIT_VAULT_CONTRACT_NAME } from '../../../config';
import { deployDepositVault, DeployDvConfig } from '../common';

const configs: Record<number, DeployDvConfig> = {
  [chainIds.sepolia]: {
    feeReceiver: undefined,
    tokensReceiver: undefined,
    instantDailyLimit: constants.MaxUint256,
    instantFee: parseUnits('1', 2),
    minMTokenAmountForFirstDeposit: parseUnits('100'),
    minAmount: parseUnits('0.01'),
    variationTolerance: parseUnits('0.1', 2),
  },
  [chainIds.plume]: {
    feeReceiver: '0xc69F99ab9C6b03cEacfE6FB9D753D5dD29C2f354',
    tokensReceiver: '0x518FBF72dAC0CC09BF8492037e80BDaA7FF3F44f',
    instantDailyLimit: parseUnits('10000000'),
    instantFee: parseUnits('0', 2),
    minMTokenAmountForFirstDeposit: parseUnits('0'),
    minAmount: parseUnits('0'),
    variationTolerance: parseUnits('5', 2),
  },
  [chainIds.main]: {
    feeReceiver: '0xF9C2E91d6d43B2A7e7c4A9dDb3E56564F1a7f7d4',
    tokensReceiver: '0xc93437a52aF5190C536ce6d994331f2Cc3e44E18',
    instantDailyLimit: parseUnits('10000000'),
    instantFee: parseUnits('0', 2),
    minMTokenAmountForFirstDeposit: parseUnits('0'),
    minAmount: parseUnits('0'),
    variationTolerance: parseUnits('5', 2),
    sanctionsList: '0x40C57923924B5c5c5455c48D93317139ADDaC8fb',
  },
  [chainIds.base]: {
    feeReceiver: '0xF9C2E91d6d43B2A7e7c4A9dDb3E56564F1a7f7d4',
    tokensReceiver: '0xc93437a52aF5190C536ce6d994331f2Cc3e44E18',
    instantDailyLimit: parseUnits('10000000'),
    instantFee: parseUnits('0', 2),
    minMTokenAmountForFirstDeposit: parseUnits('0'),
    minAmount: parseUnits('0'),
    variationTolerance: parseUnits('5', 2),
  },
  [chainIds.arbitrum]: {
    feeReceiver: '0xF9C2E91d6d43B2A7e7c4A9dDb3E56564F1a7f7d4',
    tokensReceiver: '0xc93437a52aF5190C536ce6d994331f2Cc3e44E18',
    instantDailyLimit: parseUnits('10000000'),
    instantFee: parseUnits('0', 2),
    minMTokenAmountForFirstDeposit: parseUnits('0'),
    minAmount: parseUnits('0'),
    variationTolerance: parseUnits('5', 2),
  },
};

const func: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  const networkConfig = configs[hre.network.config.chainId!];

  await deployDepositVault(hre, 'mEDGE', networkConfig);
};

func(hre).then(console.log).catch(console.error);
