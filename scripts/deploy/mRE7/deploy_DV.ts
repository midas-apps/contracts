import { BigNumber, BigNumberish, constants } from 'ethers';
import { parseUnits } from 'ethers/lib/utils';
import * as hre from 'hardhat';
import { DeployFunction } from 'hardhat-deploy/types';
import { HardhatRuntimeEnvironment } from 'hardhat/types';

import { chainIds, M_RE7_DEPOSIT_VAULT_CONTRACT_NAME } from '../../../config';
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
    feeReceiver: '0x4be07162e3A4e372e74121B418bdC057a4E31b43',
    tokensReceiver: '0x246778D5cD7ab54DB8Ad160f8b3Ab0b213983dfc',
    instantDailyLimit: parseUnits('10000000'),
    instantFee: parseUnits('0', 2),
    minMTokenAmountForFirstDeposit: parseUnits('0'),
    minAmount: parseUnits('0'),
    variationTolerance: parseUnits('5', 2),
    sanctionsList: '0x40C57923924B5c5c5455c48D93317139ADDaC8fb',
  },
  [chainIds.base]: {
    feeReceiver: '0x4be07162e3A4e372e74121B418bdC057a4E31b43',
    tokensReceiver: '0x246778D5cD7ab54DB8Ad160f8b3Ab0b213983dfc',
    instantDailyLimit: parseUnits('10000000'),
    instantFee: parseUnits('0', 2),
    minMTokenAmountForFirstDeposit: parseUnits('0'),
    minAmount: parseUnits('0'),
    variationTolerance: parseUnits('5', 2),
  },
};

const func: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  const networkConfig = configs[hre.network.config.chainId!];

  await deployDepositVault(
    hre,
    await hre.ethers.getContractFactory(M_RE7_DEPOSIT_VAULT_CONTRACT_NAME),
    'mRE7',
    networkConfig,
  );
};

func(hre).then(console.log).catch(console.error);
