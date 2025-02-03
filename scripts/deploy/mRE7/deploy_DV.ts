import { BigNumber, BigNumberish, constants } from 'ethers';
import { parseUnits } from 'ethers/lib/utils';
import * as hre from 'hardhat';
import { DeployFunction } from 'hardhat-deploy/types';
import { HardhatRuntimeEnvironment } from 'hardhat/types';

import { M_RE7_DEPOSIT_VAULT_CONTRACT_NAME } from '../../../config';
import { deployDepositVault, DeployDvConfig } from '../common';

const configs: Record<number, DeployDvConfig> = {
  11155111: {
    feeReceiver: undefined,
    tokensReceiver: undefined,
    instantDailyLimit: constants.MaxUint256,
    instantFee: parseUnits('1', 2),
    minMTokenAmountForFirstDeposit: parseUnits('100'),
    minAmount: parseUnits('0.01'),
    variationTolerance: parseUnits('0.1', 2),
  },
  1: {
    feeReceiver: 'TODO', // FIXME:
    tokensReceiver: 'TODO', // FIXME:
    instantDailyLimit: parseUnits('0'), // FIXME:
    instantFee: parseUnits('0', 2), // FIXME:
    minMTokenAmountForFirstDeposit: parseUnits('0'), // FIXME:
    minAmount: parseUnits('0'), // FIXME:
    variationTolerance: parseUnits('5', 2), // FIXME:
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
