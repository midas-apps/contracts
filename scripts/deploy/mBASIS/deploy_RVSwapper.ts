import { expect } from 'chai';
import chalk from 'chalk';
import { constants } from 'ethers';
import { parseUnits } from 'ethers/lib/utils';
import * as hre from 'hardhat';
import { DeployFunction } from 'hardhat-deploy/types';
import { HardhatRuntimeEnvironment } from 'hardhat/types';

import { chainIds } from '../../../config';
import { midasAddressesPerNetwork } from '../../../config/constants/addresses';
import { deployRedemptionVault, DeployRvConfig } from '../common/rv';

const configs: Record<number, DeployRvConfig> = {
  11155111: {
    type: 'SWAPPER',
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
    liquidityProvider: undefined,
    mTbillRedemptionVault: undefined,
  },
  1: {
    type: 'SWAPPER',
    feeReceiver: '0xB8633297f9D9A8eaD48f1335ab04b14C189639f0',
    tokensReceiver: '0x1Bd4d8D25Ec7EBA10e94BE71Fd9c6BF672e31E06',
    instantDailyLimit: parseUnits('1000'),
    instantFee: parseUnits('3', 2),
    minAmount: parseUnits('0.1'),
    variationTolerance: parseUnits('5', 2),
    fiatAdditionalFee: parseUnits('0.1', 2),
    fiatFlatFee: parseUnits('30', 18),
    minFiatRedeemAmount: parseUnits('1000', 18),
    requestRedeemer: '0x1Bd4d8D25Ec7EBA10e94BE71Fd9c6BF672e31E06',
    sanctionsList: '0x40C57923924B5c5c5455c48D93317139ADDaC8fb',
    liquidityProvider: '0x7388e98baCfFF1B3618d7d5bEbeDe483C9526FEd',
    mTbillRedemptionVault: '0x569D7dccBF6923350521ecBC28A555A500c4f0Ec',
  },
  8453: {
    type: 'SWAPPER',
    feeReceiver: '0xE4D0BCF0732d18aE0b213424647608bac8006824',
    tokensReceiver: '0xE4D0BCF0732d18aE0b213424647608bac8006824',
    instantDailyLimit: parseUnits('1000'),
    instantFee: parseUnits('3', 2),
    minAmount: parseUnits('0.1'),
    variationTolerance: parseUnits('5', 2),
    fiatAdditionalFee: parseUnits('0.1', 2),
    fiatFlatFee: parseUnits('30', 18),
    minFiatRedeemAmount: parseUnits('1000', 18),
    requestRedeemer: '0xE4D0BCF0732d18aE0b213424647608bac8006824',
    liquidityProvider: '0xE4D0BCF0732d18aE0b213424647608bac8006824',
    mTbillRedemptionVault: '0x2a8c22E3b10036f3AEF5875d04f8441d4188b656',
  },
  [chainIds.arbitrum]: {
    type: 'SWAPPER',
    feeReceiver: '0x6d4de22e3298963351475b32f6fa9fe97e867c4a',
    tokensReceiver: '0x1cd6be043852b91ea09660391b9928b015986246',
    instantDailyLimit: parseUnits('1000000'),
    instantFee: parseUnits('0.5', 2),
    minAmount: parseUnits('0'),
    variationTolerance: parseUnits('5', 2),
    fiatAdditionalFee: parseUnits('0.1', 2),
    fiatFlatFee: parseUnits('30', 18),
    minFiatRedeemAmount: parseUnits('1000', 18),
    requestRedeemer: '0x3C5bbD59929940fF85E1Cf529627efb5B0E44764',
    liquidityProvider: '0x915E287EEa9594963B33FD12bF908312B5D860d2',
    mTbillRedemptionVault:
      midasAddressesPerNetwork.arbitrum?.mTBILL?.redemptionVault ?? '0x',
  },
};

const func: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  const networkConfig = configs[hre.network.config.chainId!];

  await deployRedemptionVault(hre, 'mBASIS', networkConfig);
};

func(hre).then(console.log).catch(console.error);
