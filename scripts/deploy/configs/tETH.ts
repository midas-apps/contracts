import { constants } from 'ethers';
import { parseUnits } from 'ethers/lib/utils';

import { chainIds } from '../../../config';
import { DeploymentConfig } from '../common/types';

export const tETHDeploymentConfig: DeploymentConfig = {
  genericConfigs: {
    customAggregator: {
      minAnswer: parseUnits('0.1', 8),
      maxAnswer: parseUnits('1000', 8),
      maxAnswerDeviation: parseUnits('0.4', 8),
      description: 'tETH/ETH',
    },
    dataFeed: {
      minAnswer: parseUnits('0.1', 8),
      maxAnswer: parseUnits('1000', 8),
      healthyDiff: 2592000,
    },
  },
  networkConfigs: {
    [chainIds.sepolia]: {
      dv: {
        feeReceiver: undefined,
        tokensReceiver: undefined,
        instantDailyLimit: constants.MaxUint256,
        instantFee: parseUnits('1', 2),
        minMTokenAmountForFirstDeposit: parseUnits('100'),
        minAmount: parseUnits('0.01'),
        variationTolerance: parseUnits('0.1', 2),
      },
      rvSwapper: {
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
        liquidityProvider: 'dummy',
        swapperVault: 'dummy',
      },
    },
    [chainIds.main]: {
      dv: {
        feeReceiver: '0x3Ddb317a19aa2dda77120Da030809bc0f7F1C28e',
        tokensReceiver: '0x3cbbE85F7314fB7d42E87613ec80190925485b2B',
        instantDailyLimit: parseUnits('30000'),
        instantFee: parseUnits('0', 2),
        minMTokenAmountForFirstDeposit: parseUnits('0'),
        minAmount: parseUnits('0'),
        variationTolerance: parseUnits('0.4', 2),
        enableSanctionsList: true,
      },
      rvSwapper: {
        type: 'SWAPPER',
        feeReceiver: '0x3Ddb317a19aa2dda77120Da030809bc0f7F1C28e',
        tokensReceiver: '0x3cbbE85F7314fB7d42E87613ec80190925485b2B',
        instantDailyLimit: parseUnits('30000'),
        instantFee: parseUnits('0', 2),
        minAmount: parseUnits('0'),
        variationTolerance: parseUnits('0.4', 2),
        fiatAdditionalFee: parseUnits('0.1', 2),
        fiatFlatFee: parseUnits('30'),
        minFiatRedeemAmount: parseUnits('1000'),
        requestRedeemer: '0x51396d9A7ceA28831F18223Ec8804821F7d90958',
        liquidityProvider: 'dummy',
        swapperVault: 'dummy',
        enableSanctionsList: true,
      },
    },
  },
};
