import { parseUnits } from 'ethers/lib/utils';

import { chainIds } from '../../../config';
import { DeploymentConfig } from '../common/types';

export const mHYPERDeploymentConfig: DeploymentConfig = {
  genericConfigs: {
    customAggregator: {
      minAnswer: parseUnits('0.1', 8),
      maxAnswer: parseUnits('1000', 8),
      maxAnswerDeviation: parseUnits('0.35', 8),
      description: 'mHYPER/USD',
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
        feeReceiver: '0xee67Ec0e51dDd154C0cd904A326822e3F31586F3',
        tokensReceiver: '0xF356c5e9F69DaDB332Bb098C7Ed960Db1d3376DD',
        instantDailyLimit: parseUnits('10000000'),
        instantFee: parseUnits('0', 2),
        minMTokenAmountForFirstDeposit: parseUnits('0'),
        minAmount: parseUnits('0'),
        variationTolerance: parseUnits('0.65', 2),
        enableSanctionsList: true,
      },
      rvSwapper: {
        type: 'SWAPPER',
        feeReceiver: '0x0461bD693caE49bE9d030E5c212e080F9c78B846',
        tokensReceiver: '0xF356c5e9F69DaDB332Bb098C7Ed960Db1d3376DD',
        instantDailyLimit: parseUnits('100000'),
        instantFee: parseUnits('0.5', 2),
        minAmount: parseUnits('0'),
        variationTolerance: parseUnits('0.65', 2),
        fiatAdditionalFee: parseUnits('0.1', 2),
        fiatFlatFee: parseUnits('30'),
        minFiatRedeemAmount: parseUnits('1000'),
        requestRedeemer: '0xA4fC2c65643b67fFDbf5cb0b528A10E771F1F159',
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
