import { expect } from 'chai';
import chalk from 'chalk';
import { BigNumber, BigNumberish, constants } from 'ethers';
import { parseUnits } from 'ethers/lib/utils';
import * as hre from 'hardhat';
import { DeployFunction } from 'hardhat-deploy/types';
import { HardhatRuntimeEnvironment } from 'hardhat/types';

import { M_BASIS_DEPOSIT_VAULT_CONTRACT_NAME } from '../../../config';
import { getCurrentAddresses } from '../../../config/constants/addresses';
import { MBasisDepositVault } from '../../../typechain-types';
import { deployDepositVault, DeployDvConfig } from '../common';
import { deployRedemptionVault, DeployRvConfig } from '../common/rv';

const configs: Record<number, DeployRvConfig> = {
  11155111: {
    type: 'REGULAR',
    feeReceiver: undefined,
    tokensReceiver: undefined,
    instantDailyLimit: constants.MaxUint256,
    instantFee: parseUnits('1', 2),
    minAmount: parseUnits('0.01'),
    variationTolerance: parseUnits('0.1', 2),
    fiatAdditionalFee: parseUnits('0.1', 2),
    fiatFlatFee: parseUnits('0.1', 18),
    minFiatRedeemAmount: parseUnits('1', 18),
    requestRedeemer: undefined,
  },
  1: {
    type: 'REGULAR',
    feeReceiver: '0x875c06A295C41c27840b9C9dfDA7f3d819d8bC6A',
    tokensReceiver: '0x1Bd4d8D25Ec7EBA10e94BE71Fd9c6BF672e31E06',
    instantDailyLimit: parseUnits('1000'),
    instantFee: parseUnits('0.07', 2),
    minAmount: parseUnits('0.1'),
    variationTolerance: parseUnits('0.1', 2),
    fiatAdditionalFee: parseUnits('0.1', 2),
    fiatFlatFee: parseUnits('30', 18),
    minFiatRedeemAmount: parseUnits('1000', 18),
    requestRedeemer: '0x1Bd4d8D25Ec7EBA10e94BE71Fd9c6BF672e31E06',
    sanctionsList: '0x40C57923924B5c5c5455c48D93317139ADDaC8fb',
  },
  8453: {
    type: 'REGULAR',
    feeReceiver: '0xE4D0BCF0732d18aE0b213424647608bac8006824',
    tokensReceiver: '0xE4D0BCF0732d18aE0b213424647608bac8006824',
    instantDailyLimit: parseUnits('1000'),
    instantFee: parseUnits('0.07', 2),
    minAmount: parseUnits('0.1'),
    variationTolerance: parseUnits('0.1', 2),
    fiatAdditionalFee: parseUnits('0.1', 2),
    fiatFlatFee: parseUnits('30', 18),
    minFiatRedeemAmount: parseUnits('1000', 18),
    requestRedeemer: '0xE4D0BCF0732d18aE0b213424647608bac8006824',
  },
};

const func: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  const networkConfig = configs[hre.network.config.chainId!];

  await deployRedemptionVault(hre, 'mTBILL', networkConfig);
};

func(hre).then(console.log).catch(console.error);
