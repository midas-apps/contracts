import { BigNumber, BigNumberish, constants } from 'ethers';
import { parseUnits } from 'ethers/lib/utils';
import * as hre from 'hardhat';
import { DeployFunction } from 'hardhat-deploy/types';
import { HardhatRuntimeEnvironment } from 'hardhat/types';

import { chainIds } from '../../../../config';
import { deployRedemptionVault, DeployRvConfig } from '../../common/rv';

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
  [chainIds.tacTestnet]: {
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
    feeReceiver: '0xC7549dA15C20b50f305979b091C8a76dB2ba5f37',
    tokensReceiver: '0x5fEa8bc75bd0CeB9d476F3c9bcF2285ff90AB7D9',
    instantDailyLimit: parseUnits('10000'),
    instantFee: parseUnits('0', 2),
    minAmount: parseUnits('0'),
    variationTolerance: parseUnits('0.3', 2),
    fiatAdditionalFee: parseUnits('10', 2),
    fiatFlatFee: parseUnits('0', 18),
    minFiatRedeemAmount: parseUnits('1', 18),
    requestRedeemer: '0x6557733112cCc55A8d07dE4106B8cb0487BF8A8E',
    sanctionsList: '0x40C57923924B5c5c5455c48D93317139ADDaC8fb',
  },
};

const func: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  const networkConfig = configs[hre.network.config.chainId!];

  await deployRedemptionVault(hre, 'TACmMEV', networkConfig);
};

func(hre).then(console.log).catch(console.error);
