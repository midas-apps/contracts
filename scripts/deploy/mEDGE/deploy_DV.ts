import { BigNumber, BigNumberish, constants } from 'ethers';
import { parseUnits } from 'ethers/lib/utils';
import * as hre from 'hardhat';
import { DeployFunction } from 'hardhat-deploy/types';
import { HardhatRuntimeEnvironment } from 'hardhat/types';

import { M_EDGE_DEPOSIT_VAULT_CONTRACT_NAME } from '../../../config';
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
  // plume
  198865: {
    feeReceiver: 'TODO',
    tokensReceiver: 'TODO',
    instantDailyLimit: parseUnits('TODO'),
    instantFee: parseUnits('TODO', 2),
    minMTokenAmountForFirstDeposit: parseUnits('TODO'),
    minAmount: parseUnits('TODO'),
    variationTolerance: parseUnits('TODO', 2),
    sanctionsList: 'TODO',
  },
};

const func: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  const networkConfig = configs[hre.network.config.chainId!];

  await deployDepositVault(
    hre,
    await hre.ethers.getContractFactory(M_EDGE_DEPOSIT_VAULT_CONTRACT_NAME),
    'mEDGE',
    networkConfig,
  );
};

func(hre).then(console.log).catch(console.error);
