import { constants } from 'ethers';
import { parseUnits } from 'ethers/lib/utils';

import { chainIds } from '../../../config';
import { DeploymentConfig } from '../common/types';

export const tUSDeDeploymentConfig: DeploymentConfig = {
  genericConfigs: {
    customAggregator: {
      minAnswer: parseUnits('0.1', 8),
      maxAnswer: parseUnits('1000', 8),
      maxAnswerDeviation: parseUnits('0.4', 8),
      description: 'tUSDe/USD',
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
        liquidityProvider: undefined,
        swapperVault: {
          mToken: 'mLIQUIDITY',
          redemptionVaultType: 'redemptionVault',
        },
      },
    },
    [chainIds.main]: {
      dv: {
        feeReceiver: '0x1276Cffbc49Ad0b7bB8D14104FB0cE9A9FD5009A',
        tokensReceiver: '0xca0c01253be2B6d7Dd22f2Fe5Da1869fC77aB7Eb',
        instantDailyLimit: parseUnits('100000000'),
        instantFee: parseUnits('0', 2),
        minMTokenAmountForFirstDeposit: parseUnits('0'),
        minAmount: parseUnits('0'),
        variationTolerance: parseUnits('0.6', 2),
        enableSanctionsList: true,
      },
      rvSwapper: {
        type: 'SWAPPER',
        feeReceiver: '0x1276Cffbc49Ad0b7bB8D14104FB0cE9A9FD5009A',
        tokensReceiver: '0xca0c01253be2B6d7Dd22f2Fe5Da1869fC77aB7Eb',
        instantDailyLimit: parseUnits('100000000'),
        instantFee: parseUnits('0', 2),
        minAmount: parseUnits('0'),
        variationTolerance: parseUnits('0.6', 2),
        fiatAdditionalFee: parseUnits('0.1', 2),
        fiatFlatFee: parseUnits('30'),
        minFiatRedeemAmount: parseUnits('1000'),
        requestRedeemer: '0xF885a0b77Ddaa760C3e8463773bc972E34eC35b3',
        liquidityProvider: 'dummy',
        swapperVault: {
          mToken: 'mLIQUIDITY',
          redemptionVaultType: 'redemptionVault',
        },
        enableSanctionsList: true,
      },
    },
  },
};
