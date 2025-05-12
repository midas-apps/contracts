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
    feeReceiver: '0x846E6379197074Ec2384bdb320bc947BB6E84Bb8',
    tokensReceiver: '0x89A4c184822823e4A284C50417733F4Bd0d8D716',
    instantDailyLimit: parseUnits('100000000'),
    instantFee: parseUnits('0', 2),
    minMTokenAmountForFirstDeposit: parseUnits('0'),
    minAmount: parseUnits('0'),
    variationTolerance: parseUnits('0.01', 2),
    sanctionsList: '0x40C57923924B5c5c5455c48D93317139ADDaC8fb',
  },
};

const func: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  const networkConfig = configs[hre.network.config.chainId!];

  await deployDepositVault(hre, 'mLIQUIDITY', networkConfig);
};

func(hre).then(console.log).catch(console.error);
