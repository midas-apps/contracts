import { constants } from 'ethers';
import { parseUnits } from 'ethers/lib/utils';

import { chainIds } from '../../../config';
import { DeploymentConfig } from '../common/types';

export const mBTCeploymentConfig: DeploymentConfig = {
  genericConfigs: {
    customAggregator: {
      minAnswer: parseUnits('0.1', 8),
      maxAnswer: parseUnits('1000', 8),
      maxAnswerDeviation: parseUnits('0.05', 8),
      description: 'mBTC/BTC',
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
        minMTokenAmountForFirstDeposit: parseUnits('0.001'),
        minAmount: parseUnits('0.00001'),
        variationTolerance: parseUnits('0.1', 2),
      },
      rv: {
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
    },
    [chainIds.main]: {
      dv: {
        feeReceiver: '0x64a4861af52029a88b170Eae5CBE08BB4D0D01c4',
        tokensReceiver: '0x30d9D1e76869516AEa980390494AaEd45C3EfC1a',
        instantDailyLimit: parseUnits('150'),
        instantFee: parseUnits('0.3', 2),
        minMTokenAmountForFirstDeposit: parseUnits('0'),
        minAmount: parseUnits('0'),
        variationTolerance: parseUnits('0.3', 2),
        enableSanctionsList: true,
      },
      rv: {
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
        enableSanctionsList: true,
      },
    },
    [chainIds.rootstock]: {
      dv: {
        feeReceiver: '0x74b35d3bb627584cf095d0a0ac9b616da2668691',
        tokensReceiver: '0xf899a8ce82a2e1ef7d27a6a3a057470a559290e3',
        instantDailyLimit: parseUnits('150'),
        instantFee: parseUnits('0', 2),
        minMTokenAmountForFirstDeposit: parseUnits('0'),
        minAmount: parseUnits('0'),
        variationTolerance: parseUnits('0.3', 2),
      },
      rv: {
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
    },
  },
};
