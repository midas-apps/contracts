import { expect } from 'chai';
import chalk from 'chalk';
import { constants } from 'ethers';
import { parseUnits } from 'ethers/lib/utils';
import * as hre from 'hardhat';
import { DeployFunction } from 'hardhat-deploy/types';
import { HardhatRuntimeEnvironment } from 'hardhat/types';

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
    mTbillRedemptionVault: '0x460cec7f88e7813D7b0a297160e6718D9fE33908',
  },
  // plume
  // 198865: {
  //   type: 'SWAPPER',
  //   feeReceiver: 'TODO',
  //   tokensReceiver: 'TODO',
  //   instantDailyLimit: parseUnits('TODO'),
  //   instantFee: parseUnits('TODO', 2),
  //   minAmount: parseUnits('TODO'),
  //   variationTolerance: parseUnits('TODO', 2),
  //   fiatAdditionalFee: parseUnits('TODO', 2),
  //   fiatFlatFee: parseUnits('TODO', 18),
  //   minFiatRedeemAmount: parseUnits('1TODO000', 18),
  //   requestRedeemer: 'TODO',
  //   sanctionsList: 'TODO',
  //   liquidityProvider: 'TODO',
  //   mTbillRedemptionVault: 'TODO',
  // },
};

const func: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  const networkConfig = configs[hre.network.config.chainId!];

  await deployRedemptionVault(hre, 'mEDGE', networkConfig);
};

func(hre).then(console.log).catch(console.error);
