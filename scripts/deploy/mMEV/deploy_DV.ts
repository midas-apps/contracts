import { BigNumber, BigNumberish, constants } from 'ethers';
import { parseUnits } from 'ethers/lib/utils';
import * as hre from 'hardhat';
import { DeployFunction } from 'hardhat-deploy/types';
import { HardhatRuntimeEnvironment } from 'hardhat/types';

import { M_MEV_DEPOSIT_VAULT_CONTRACT_NAME } from '../../../config';
import { deployDepositVault, DeployDvConfig } from '../common';

const configs: Record<number, DeployDvConfig> = {
  11155111: {
    feeReceiver: undefined,
    tokensReceiver: undefined,
    instantDailyLimit: constants.MaxUint256,
    instantFee: parseUnits('1', 2),
    minMTokenAmountForFirstDeposit: parseUnits('0'),
    minAmount: parseUnits('0.01'),
    variationTolerance: parseUnits('0.1', 2),
  },
  1: {
    feeReceiver: '0xceca5D043DAdc38Bcb2e1F13296254Cb4798019d',
    tokensReceiver: '0xE92A723af33A7aC8D54b6b1A0e1BF1Ca6E94231B',
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
    await hre.ethers.getContractFactory(M_MEV_DEPOSIT_VAULT_CONTRACT_NAME),
    'mMEV',
    networkConfig,
  );
};

func(hre).then(console.log).catch(console.error);
