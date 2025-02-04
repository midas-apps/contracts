import { expect } from 'chai';
import chalk from 'chalk';
import { constants } from 'ethers';
import { parseUnits } from 'ethers/lib/utils';
import * as hre from 'hardhat';
import { DeployFunction } from 'hardhat-deploy/types';
import { HardhatRuntimeEnvironment } from 'hardhat/types';

import { deployRedemptionVault, DeployRvConfig } from '../common/rv';
import {
  getCurrentAddresses,
  midasAddressesPerNetwork,
} from '../../../config/constants/addresses';

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
    feeReceiver: '0x', // FIXME:
    tokensReceiver: '0x', // FIXME:
    instantDailyLimit: parseUnits('1000000'), // FIXME:
    instantFee: parseUnits('0.5', 2), // FIXME:
    minAmount: parseUnits('0'), // FIXME:
    variationTolerance: parseUnits('5', 2), // FIXME:
    fiatAdditionalFee: parseUnits('0.1', 2), // FIXME:
    fiatFlatFee: parseUnits('30'), // FIXME:
    minFiatRedeemAmount: parseUnits('1000'), // FIXME:
    requestRedeemer: '0x', // FIXME:
    liquidityProvider: '0x', // FIXME:
    mTbillRedemptionVault: '0x', // FIXME:
  },
};

const func: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  const networkConfig = configs[hre.network.config.chainId!];

  await deployRedemptionVault(hre, 'mRE7', networkConfig);
};

func(hre).then(console.log).catch(console.error);
