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
    feeReceiver: '0xB8633297f9D9A8eaD48f1335ab04b14C189639f0',
    tokensReceiver: '0x1Bd4d8D25Ec7EBA10e94BE71Fd9c6BF672e31E06',
    instantDailyLimit: parseUnits('1000'),
    instantFee: parseUnits('0.1', 2),
    minMTokenAmountForFirstDeposit: parseUnits('0'),
    minAmount: parseUnits('0.1'),
    variationTolerance: parseUnits('5', 2),
    sanctionsList: '0x40C57923924B5c5c5455c48D93317139ADDaC8fb',
  },
  [chainIds.base]: {
    feeReceiver: '0xE4D0BCF0732d18aE0b213424647608bac8006824',
    tokensReceiver: '0xE4D0BCF0732d18aE0b213424647608bac8006824',
    instantDailyLimit: parseUnits('1000'),
    instantFee: parseUnits('0.1', 2),
    minMTokenAmountForFirstDeposit: parseUnits('0'),
    minAmount: parseUnits('0.1'),
    variationTolerance: parseUnits('5', 2),
  },
  [chainIds.arbitrum]: {
    feeReceiver: '0x6D4De22e3298963351475b32F6fa9fe97e867C4a',
    tokensReceiver: '0x1cD6bE043852b91ea09660391B9928B015986246',
    instantDailyLimit: parseUnits('10000000'),
    instantFee: parseUnits('0', 2),
    minMTokenAmountForFirstDeposit: parseUnits('0'),
    minAmount: parseUnits('0'),
    variationTolerance: parseUnits('5', 2),
  },
  [chainIds.plume]: {
    feeReceiver: '0x0461bD693caE49bE9d030E5c212e080F9c78B846',
    tokensReceiver: '0x3ccE3cedf4d2AD8B699cc8B28Af12d4682347d32',
    instantDailyLimit: parseUnits('1000'),
    instantFee: parseUnits('0', 2),
    minMTokenAmountForFirstDeposit: parseUnits('0'),
    minAmount: parseUnits('0'),
    variationTolerance: parseUnits('0.6', 2),
  },
};

const func: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  const networkConfig = configs[hre.network.config.chainId!];

  await deployDepositVault(hre, 'mBASIS', networkConfig);
};

func(hre).then(console.log).catch(console.error);
