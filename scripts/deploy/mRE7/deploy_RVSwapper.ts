import { expect } from 'chai';
import chalk from 'chalk';
import { constants } from 'ethers';
import { parseUnits } from 'ethers/lib/utils';
import * as hre from 'hardhat';
import { DeployFunction } from 'hardhat-deploy/types';
import { HardhatRuntimeEnvironment } from 'hardhat/types';

import {
  getCurrentAddresses,
  midasAddressesPerNetwork,
} from '../../../config/constants/addresses';
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
    mTbillRedemptionVault:
      midasAddressesPerNetwork.sepolia?.mBASIS?.redemptionVaultSwapper ?? '0x',
  },
  1: {
    type: 'SWAPPER',
    feeReceiver: '0x4be07162e3A4e372e74121B418bdC057a4E31b43',
    tokensReceiver: '0x246778D5cD7ab54DB8Ad160f8b3Ab0b213983dfc',
    instantDailyLimit: parseUnits('1000000'),
    instantFee: parseUnits('0', 2),
    minAmount: parseUnits('0'),
    variationTolerance: parseUnits('5', 2),
    fiatAdditionalFee: parseUnits('0.1', 2),
    fiatFlatFee: parseUnits('30'),
    minFiatRedeemAmount: parseUnits('1000'),
    requestRedeemer: '0xC9be8B77Efa255978F3be805e620A9edF528CFc2',
    liquidityProvider: '0x33485Ef31Bddf267F47A044Ab832Bde51469db2b',
    mTbillRedemptionVault:
      midasAddressesPerNetwork.main?.mBASIS?.redemptionVaultSwapper ?? '0x',
    sanctionsList: '0x40C57923924B5c5c5455c48D93317139ADDaC8fb',
  },
};

const func: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  const networkConfig = configs[hre.network.config.chainId!];

  await deployRedemptionVault(hre, 'mRE7', networkConfig);
};

func(hre).then(console.log).catch(console.error);
