import { parseUnits } from 'ethers/lib/utils';

import { chainIds } from '../../../config';
import { DeploymentConfig } from '../common/types';

export const mRE7SOLDeploymentConfig: DeploymentConfig = {
  genericConfigs: {
    customAggregator: {
      minAnswer: parseUnits('0.1', 8),
      maxAnswer: parseUnits('1000', 8),
      maxAnswerDeviation: parseUnits('0.4', 8),
      description: 'mRe7SOL/SOL',
    },
    dataFeed: {
      minAnswer: parseUnits('0.1', 8),
      maxAnswer: parseUnits('1000', 8),
      healthyDiff: 8208000,
    },
  },
  networkConfigs: {
    [chainIds.katana]: {
      dv: {
        feeReceiver: '0xb01b127742b0E9AE9A68cb0AbcAF6e7Ff6167d2F',
        tokensReceiver: '0xFB23150A9f8E4a1e21496209D06f2E747B594823',
        instantDailyLimit: parseUnits('30000'),
        instantFee: parseUnits('0', 2),
        minMTokenAmountForFirstDeposit: parseUnits('0'),
        minAmount: parseUnits('0'),
        variationTolerance: parseUnits('0.6', 2),
      },
      rv: {
        type: 'REGULAR',
        feeReceiver: '0xb01b127742b0E9AE9A68cb0AbcAF6e7Ff6167d2F',
        tokensReceiver: '0xFB23150A9f8E4a1e21496209D06f2E747B594823',
        instantDailyLimit: parseUnits('30000'),
        instantFee: parseUnits('0.5', 2),
        minAmount: parseUnits('0'),
        variationTolerance: parseUnits('0.6', 2),
        fiatAdditionalFee: parseUnits('0.1', 2),
        fiatFlatFee: parseUnits('30'),
        minFiatRedeemAmount: parseUnits('1000'),
        requestRedeemer: '0x790e16B038462c2247e7BED12d3C7D8ea8351EE2',
      },
    },
  },
};
