import { parseUnits } from 'ethers/lib/utils';

import { chainIds } from '../../../config';
import { DeploymentConfig } from '../common/types';

export const liquidHYPEDeploymentConfig: DeploymentConfig = {
  genericConfigs: {
    customAggregator: {
      minAnswer: parseUnits('0.1', 8),
      maxAnswer: parseUnits('1000', 8),
      maxAnswerDeviation: parseUnits('0.12', 8),
      description: 'liquidHYPE/HYPE',
    },
    dataFeed: {
      minAnswer: parseUnits('0.1', 8),
      maxAnswer: parseUnits('1000', 8),
      healthyDiff: 2592000,
    },
  },
  networkConfigs: {
    [chainIds.hyperevm]: {
      dv: {
        feeReceiver: '0x3E4678a7742d4D703F3894922CF08d6E8ff9c1D8',
        tokensReceiver: '0xFC1286EeddF81d6955eDAd5C8D99B8Aa32F3D2AA',
        instantDailyLimit: parseUnits('2500000'),
        instantFee: parseUnits('0', 2),
        minMTokenAmountForFirstDeposit: parseUnits('0'),
        minAmount: parseUnits('0'),
        variationTolerance: parseUnits('0.10', 2),
      },
      rvSwapper: {
        type: 'SWAPPER',
        feeReceiver: '0x83A80e5b64086197c01cbB123dF2AEa79a149C1D',
        tokensReceiver: '0xFC1286EeddF81d6955eDAd5C8D99B8Aa32F3D2AA',
        instantDailyLimit: parseUnits('2500000'),
        instantFee: parseUnits('0.2', 2),
        minAmount: parseUnits('0'),
        variationTolerance: parseUnits('0.14', 2),
        fiatAdditionalFee: parseUnits('0.1', 2),
        fiatFlatFee: parseUnits('30'),
        minFiatRedeemAmount: parseUnits('1000'),
        requestRedeemer: '0xF47CB913cc80096F84a6Ced24e1ccd047c954cBE',
        liquidityProvider: 'dummy',
        swapperVault: 'dummy',
      },
    },
  },
};
