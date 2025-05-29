import { constants } from 'ethers';
import { parseUnits } from 'ethers/lib/utils';

import { chainIds } from '../../../config';
import { DeploymentConfig } from '../common/types';

export const tBTCDeploymentConfig: DeploymentConfig = {
  genericConfigs: {
    customAggregator: {
      minAnswer: parseUnits('0.1', 8),
      maxAnswer: parseUnits('1000', 8),
      maxAnswerDeviation: parseUnits('0.4', 8),
      description: 'tBTC/BTC',
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
        tokensReceiver: 'redemptionVaultSwapper',
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
        feeReceiver: '0x4EDe8e90aa88202258ec24cd14B11922985d47f9',
        tokensReceiver: 'redemptionVaultSwapper',
        instantDailyLimit: parseUnits('10000'),
        instantFee: parseUnits('0', 2),
        minMTokenAmountForFirstDeposit: parseUnits('0'),
        minAmount: parseUnits('0'),
        variationTolerance: parseUnits('0.4', 2),
        enableSanctionsList: true,
      },
      rvSwapper: {
        type: 'SWAPPER',
        feeReceiver: '0x4EDe8e90aa88202258ec24cd14B11922985d47f9',
        tokensReceiver: '0x86e484F74c683F303c6C1f52131838930875e90d',
        instantDailyLimit: parseUnits('10000'),
        instantFee: parseUnits('0', 2),
        minAmount: parseUnits('0'),
        variationTolerance: parseUnits('0.4', 2),
        fiatAdditionalFee: parseUnits('0.1', 2),
        fiatFlatFee: parseUnits('30'),
        minFiatRedeemAmount: parseUnits('1000'),
        requestRedeemer: '0x24cA79D55199E94942179D2C912d5b732581A89f',
        liquidityProvider: 'dummy',
        swapperVault: 'dummy',
        enableSanctionsList: true,
      },
    },
  },
};
