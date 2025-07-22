import { parseUnits } from 'ethers/lib/utils';

import { chainIds } from '../../../config';
import { DeploymentConfig } from '../common/types';

export const mAPOLLODeploymentConfig: DeploymentConfig = {
  genericConfigs: {
    customAggregator: {
      minAnswer: parseUnits('0.1', 8),
      maxAnswer: parseUnits('1000', 8),
      maxAnswerDeviation: parseUnits('0.35', 8),
      description: 'mAPOLLO/USD',
    },
    dataFeed: {
      minAnswer: parseUnits('0.1', 8),
      maxAnswer: parseUnits('1000', 8),
      healthyDiff: 2592000,
    },
  },
  networkConfigs: {
    [chainIds.main]: {
      dv: {
        feeReceiver: '0x85683dA4a5439976CD586A70e23C0A96c517e6a6',
        tokensReceiver: '0x1d021D11829B133b0DE574A8669474F6B5Ce4F9E',
        instantDailyLimit: parseUnits('10000000'),
        instantFee: parseUnits('0', 2),
        minMTokenAmountForFirstDeposit: parseUnits('0'),
        minAmount: parseUnits('0'),
        variationTolerance: parseUnits('0.6', 2),
        enableSanctionsList: true,
      },
      rvSwapper: {
        type: 'SWAPPER',
        feeReceiver: '0x0461bD693caE49bE9d030E5c212e080F9c78B846',
        tokensReceiver: '0x1d021D11829B133b0DE574A8669474F6B5Ce4F9E',
        instantDailyLimit: parseUnits('100000'),
        instantFee: parseUnits('0.5', 2),
        minAmount: parseUnits('0'),
        variationTolerance: parseUnits('0.6', 2),
        fiatAdditionalFee: parseUnits('0.1', 2),
        fiatFlatFee: parseUnits('30'),
        minFiatRedeemAmount: parseUnits('1000'),
        requestRedeemer: '0xBB97Da71852ec063695e81ff5373E895bAda7aEB',
        liquidityProvider: '0x0461bD693caE49bE9d030E5c212e080F9c78B846',
        swapperVault: {
          mToken: 'mTBILL',
          redemptionVaultType: 'redemptionVaultBuidl',
        },
        enableSanctionsList: true,
      },
    },
  },
};
