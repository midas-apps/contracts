import { constants } from 'ethers';
import { parseUnits } from 'ethers/lib/utils';
import * as hre from 'hardhat';
import { DeployFunction } from 'hardhat-deploy/types';
import { HardhatRuntimeEnvironment } from 'hardhat/types';

import { chainIds } from '../../../config';
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
  [chainIds.main]: {
    feeReceiver: '0xF9C2E91d6d43B2A7e7c4A9dDb3E56564F1a7f7d4',
    tokensReceiver: '0xc93437a52aF5190C536ce6d994331f2Cc3e44E18',
    instantDailyLimit: parseUnits('10000000'),
    instantFee: parseUnits('0', 2),
    minMTokenAmountForFirstDeposit: parseUnits('0'),
    minAmount: parseUnits('0'),
    variationTolerance: parseUnits('5', 2),
    enableSanctionsList: true,
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
  [chainIds.plume]: {
    feeReceiver: '0x0461bD693caE49bE9d030E5c212e080F9c78B846',
    tokensReceiver: '0x0527fb945257Ee3B6821D8E3CF0AB60Cb74c5a47',
    instantDailyLimit: parseUnits('1000'),
    instantFee: parseUnits('0', 2),
    minMTokenAmountForFirstDeposit: parseUnits('0'),
    minAmount: parseUnits('0'),
    variationTolerance: parseUnits('0.77', 2),
  },
};

const func: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  const networkConfig = configs[hre.network.config.chainId!];

  await deployDepositVault(hre, 'mEDGE', networkConfig);
};

func(hre).then(console.log).catch(console.error);
