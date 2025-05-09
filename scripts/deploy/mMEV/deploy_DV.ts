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
    minMTokenAmountForFirstDeposit: parseUnits('0'),
    minAmount: parseUnits('0.01'),
    variationTolerance: parseUnits('0.1', 2),
  },
  [chainIds.main]: {
    feeReceiver: '0xceca5D043DAdc38Bcb2e1F13296254Cb4798019d',
    tokensReceiver: '0xE92A723af33A7aC8D54b6b1A0e1BF1Ca6E94231B',
    instantDailyLimit: parseUnits('10000000'),
    instantFee: parseUnits('0', 2),
    minMTokenAmountForFirstDeposit: parseUnits('0'),
    minAmount: parseUnits('0'),
    variationTolerance: parseUnits('5', 2),
    enableSanctionsList: true,
  },
  [chainIds.base]: {
    feeReceiver: '0xceca5D043DAdc38Bcb2e1F13296254Cb4798019d',
    tokensReceiver: '0xE92A723af33A7aC8D54b6b1A0e1BF1Ca6E94231B',
    instantDailyLimit: parseUnits('10000000'),
    instantFee: parseUnits('0', 2),
    minMTokenAmountForFirstDeposit: parseUnits('0'),
    minAmount: parseUnits('0'),
    variationTolerance: parseUnits('5', 2),
  },
  [chainIds.arbitrum]: {
    feeReceiver: '0xceca5D043DAdc38Bcb2e1F13296254Cb4798019d',
    tokensReceiver: '0xE92A723af33A7aC8D54b6b1A0e1BF1Ca6E94231B',
    instantDailyLimit: parseUnits('10000000'),
    instantFee: parseUnits('0', 2),
    minMTokenAmountForFirstDeposit: parseUnits('0'),
    minAmount: parseUnits('0'),
    variationTolerance: parseUnits('5', 2),
  },
  [chainIds.plume]: {
    feeReceiver: '0x0461bD693caE49bE9d030E5c212e080F9c78B846',
    tokensReceiver: '0x1AA522B985FB76039A0c43b6f0eC0e30e490918e',
    instantDailyLimit: parseUnits('1000'),
    instantFee: parseUnits('0', 2),
    minMTokenAmountForFirstDeposit: parseUnits('0'),
    minAmount: parseUnits('0'),
    variationTolerance: parseUnits('0.77', 2),
  },
  [chainIds.etherlink]: {
    feeReceiver: '0x6ccb0b29De830C51270e4FB9BDE8b1754A94B554',
    tokensReceiver: '0x1AA522B985FB76039A0c43b6f0eC0e30e490918e',
    instantDailyLimit: parseUnits('1000'),
    instantFee: parseUnits('0', 2),
    minMTokenAmountForFirstDeposit: parseUnits('0'),
    minAmount: parseUnits('0'),
    variationTolerance: parseUnits('1.5', 2),
  },
};

const func: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  const networkConfig = configs[hre.network.config.chainId!];

  await deployDepositVault(hre, 'mMEV', networkConfig);
};

func(hre).then(console.log).catch(console.error);
