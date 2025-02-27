import { BigNumber, BigNumberish, constants } from 'ethers';
import { parseUnits } from 'ethers/lib/utils';
import * as hre from 'hardhat';
import { DeployFunction } from 'hardhat-deploy/types';
import { HardhatRuntimeEnvironment } from 'hardhat/types';

import { deployRedemptionVault, DeployRvConfig } from '../common/rv';
import { chainIds } from '../../../config';

const configs: Record<number, DeployRvConfig> = {
  [chainIds.sepolia]: {
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
  [chainIds.main]: {
    type: 'REGULAR',
    feeReceiver: '0x64a4861af52029a88b170Eae5CBE08BB4D0D01c4',
    tokensReceiver: '0xAAeD1e8E17Af0c3B0aF3a582bE27698DE764B8a1',
    instantDailyLimit: parseUnits('15'),
    instantFee: parseUnits('0.3', 2),
    minAmount: parseUnits('0'),
    variationTolerance: parseUnits('0.3', 2),
    fiatAdditionalFee: parseUnits('0', 2),
    fiatFlatFee: parseUnits('0', 18),
    minFiatRedeemAmount: parseUnits('1', 18),
    requestRedeemer: '0x0A648D34b5ad40560cD145E38C7167859E91dDFB',
    sanctionsList: '0x40C57923924B5c5c5455c48D93317139ADDaC8fb',
  },
  [chainIds.rootstock]: {
    type: 'REGULAR',
    feeReceiver: '0x74b35d3bb627584cf095d0a0ac9b616da2668691',
    tokensReceiver: '0xf899a8ce82a2e1ef7d27a6a3a057470a559290e3',
    instantDailyLimit: parseUnits('15'),
    instantFee: parseUnits('0.07', 2),
    minAmount: parseUnits('0'),
    variationTolerance: parseUnits('0.3', 2),
    fiatAdditionalFee: parseUnits('0', 2),
    fiatFlatFee: parseUnits('0', 18),
    minFiatRedeemAmount: parseUnits('1', 18),
    requestRedeemer: '0xb71fe6b85a3b269e70dfd40a4781f33923317c7f',
  },
};

const func: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  const networkConfig = configs[hre.network.config.chainId!];

  await deployRedemptionVault(hre, 'mBTC', networkConfig);
};

func(hre).then(console.log).catch(console.error);
