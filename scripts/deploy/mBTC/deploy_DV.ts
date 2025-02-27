import { expect } from 'chai';
import chalk from 'chalk';
import { BigNumber, BigNumberish, constants } from 'ethers';
import { parseUnits } from 'ethers/lib/utils';
import * as hre from 'hardhat';
import { DeployFunction } from 'hardhat-deploy/types';
import { HardhatRuntimeEnvironment } from 'hardhat/types';

import { chainIds, M_BTC_DEPOSIT_VAULT_CONTRACT_NAME } from '../../../config';
import { deployDepositVault, DeployDvConfig } from '../common';

const configs: Record<number, DeployDvConfig> = {
  [chainIds.sepolia]: {
    feeReceiver: undefined,
    tokensReceiver: undefined,
    instantDailyLimit: constants.MaxUint256,
    instantFee: parseUnits('1', 2),
    minMTokenAmountForFirstDeposit: parseUnits('0.001'),
    minAmount: parseUnits('0.00001'),
    variationTolerance: parseUnits('0.1', 2),
  },
  [chainIds.main]: {
    feeReceiver: '0x64a4861af52029a88b170Eae5CBE08BB4D0D01c4',
    tokensReceiver: '0x30d9D1e76869516AEa980390494AaEd45C3EfC1a',
    instantDailyLimit: parseUnits('150'),
    instantFee: parseUnits('0.3', 2),
    minMTokenAmountForFirstDeposit: parseUnits('0'),
    minAmount: parseUnits('0'),
    variationTolerance: parseUnits('0.3', 2),
    sanctionsList: '0x40C57923924B5c5c5455c48D93317139ADDaC8fb',
  },
  [chainIds.rootstock]: {
    feeReceiver: '0x74b35d3bb627584cf095d0a0ac9b616da2668691',
    tokensReceiver: '0xf899a8ce82a2e1ef7d27a6a3a057470a559290e3',
    instantDailyLimit: parseUnits('150'),
    instantFee: parseUnits('0', 2),
    minMTokenAmountForFirstDeposit: parseUnits('0'),
    minAmount: parseUnits('0'),
    variationTolerance: parseUnits('0.3', 2),
  },
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
