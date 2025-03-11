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
  [chainIds.sepolia]: {
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
    // mBASIS swapper RV
    mTbillRedemptionVault: '0x460cec7f88e7813D7b0a297160e6718D9fE33908',
  },
  [chainIds.main]: {
    type: 'SWAPPER',
    feeReceiver: '0xF9C2E91d6d43B2A7e7c4A9dDb3E56564F1a7f7d4',
    tokensReceiver: '0xc93437a52aF5190C536ce6d994331f2Cc3e44E18',
    instantDailyLimit: parseUnits('1000000'),
    instantFee: parseUnits('0.5', 2),
    minAmount: parseUnits('0'),
    variationTolerance: parseUnits('5', 2),
    fiatAdditionalFee: parseUnits('0.1', 2),
    fiatFlatFee: parseUnits('30'),
    minFiatRedeemAmount: parseUnits('1000'),
    requestRedeemer: '0x9ffFe9FcE62204de42aE91b965b44062c0f3c70F',
    liquidityProvider: '0x38C25B85BC5F9Dac55F974e4eE4A895961418267',
    mTbillRedemptionVault: '0x0D89C1C4799353F3805A3E6C4e1Cbbb83217D123',
  },
  [chainIds.plume]: {
    type: 'SWAPPER',
    feeReceiver: '0xc69F99ab9C6b03cEacfE6FB9D753D5dD29C2f354',
    tokensReceiver: '0x518FBF72dAC0CC09BF8492037e80BDaA7FF3F44f',
    instantDailyLimit: parseUnits('1000000'),
    instantFee: parseUnits('0.5', 2),
    minAmount: parseUnits('0'),
    variationTolerance: parseUnits('5', 2),
    fiatAdditionalFee: parseUnits('0.1', 2),
    fiatFlatFee: parseUnits('30'),
    minFiatRedeemAmount: parseUnits('1000'),
    requestRedeemer: '0xb304565BFF139af52E30F06D9617e814C775f95A',
    liquidityProvider: '0x59CFA14DEa1af37F0D6bDD5888bDbB8014fc6906',
    // this value is a temp. plug as there is no mBASIS vault deployed to plume yet
    mTbillRedemptionVault: '0x59CFA14DEa1af37F0D6bDD5888bDbB8014fc6906',
    sanctionsList: '0x40C57923924B5c5c5455c48D93317139ADDaC8fb',
  },
  [chainIds.base]: {
    type: 'SWAPPER',
    feeReceiver: '0xF9C2E91d6d43B2A7e7c4A9dDb3E56564F1a7f7d4',
    tokensReceiver: '0xc93437a52aF5190C536ce6d994331f2Cc3e44E18',
    instantDailyLimit: parseUnits('1000000'),
    instantFee: parseUnits('0.5', 2),
    minAmount: parseUnits('0'),
    variationTolerance: parseUnits('5', 2),
    fiatAdditionalFee: parseUnits('0.1', 2),
    fiatFlatFee: parseUnits('30'),
    minFiatRedeemAmount: parseUnits('1000'),
    requestRedeemer: '0x9ffFe9FcE62204de42aE91b965b44062c0f3c70F',
    liquidityProvider: '0xD7c27BCF825094a1732a83369Ca9475aE702522b',
    mTbillRedemptionVault:
      midasAddressesPerNetwork.base?.mBASIS?.redemptionVaultSwapper ?? '0x',
  },
  [chainIds.arbitrum]: {
    type: 'SWAPPER',
    feeReceiver: '0xF9C2E91d6d43B2A7e7c4A9dDb3E56564F1a7f7d4',
    tokensReceiver: '0xc93437a52aF5190C536ce6d994331f2Cc3e44E18',
    instantDailyLimit: parseUnits('1000000'),
    instantFee: parseUnits('0.5', 2),
    minAmount: parseUnits('0'),
    variationTolerance: parseUnits('5', 2),
    fiatAdditionalFee: parseUnits('0.1', 2),
    fiatFlatFee: parseUnits('30'),
    minFiatRedeemAmount: parseUnits('1000'),
    requestRedeemer: '0x9ffFe9FcE62204de42aE91b965b44062c0f3c70F',
    liquidityProvider: '0x915E287EEa9594963B33FD12bF908312B5D860d2',
    mTbillRedemptionVault:
      midasAddressesPerNetwork.arbitrum?.mBASIS?.redemptionVaultSwapper ?? '0x',
  },
};

const func: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  const networkConfig = configs[hre.network.config.chainId!];

  await deployRedemptionVault(hre, 'mEDGE', networkConfig);
};

func(hre).then(console.log).catch(console.error);
