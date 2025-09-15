import { parseUnits } from 'ethers/lib/utils';

import { chainIds } from '../../../config';
import { DeploymentConfig } from '../common/types';

export const dnHYPEDeploymentConfig: DeploymentConfig = {
  genericConfigs: {
    customAggregator: {
      minAnswer: parseUnits('0.1', 8),
      maxAnswer: parseUnits('1000', 8),
      maxAnswerDeviation: parseUnits('0.35', 8),
      description: 'dnHYPE/USD',
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
        feeReceiver: '0xF6c42865FEE8C8Dc165d62d6aF2E2717C1178030',
        tokensReceiver: '0x0C8593c773Bd92a77236aA3D827103AE4a064C24',
        instantDailyLimit: parseUnits('5000000'),
        instantFee: parseUnits('0', 2),
        minMTokenAmountForFirstDeposit: parseUnits('0'),
        minAmount: parseUnits('0'),
        variationTolerance: parseUnits('0.6', 2),
      },
      rvSwapper: {
        type: 'SWAPPER',
        feeReceiver: '0x1Da7920cA7f9ee28D481BC439dccfED09F52a237',
        tokensReceiver: '0x0C8593c773Bd92a77236aA3D827103AE4a064C24',
        instantDailyLimit: parseUnits('5000000'),
        instantFee: parseUnits('0.5', 2),
        minAmount: parseUnits('0'),
        variationTolerance: parseUnits('0.6', 2),
        fiatAdditionalFee: parseUnits('0.1', 2),
        fiatFlatFee: parseUnits('30'),
        minFiatRedeemAmount: parseUnits('1000'),
        requestRedeemer: '0x51f624E7B5E8bc85F7c798c24048E686D495B283',
        liquidityProvider: 'dummy',
        swapperVault: 'dummy',
      },
      postDeploy: {
        grantRoles: {
          oracleManagerAddress: '0xd06F548290d47E74bDfBEbF4d50D1a9197Ac5747',
          tokenManagerAddress: '0xBF8cd92d291b9b08CF1365815Da516D8E053a20D',
          vaultsManagerAddress: '0x2ACB4BdCbEf02f81BF713b696Ac26390d7f79A12',
        },
        setRoundData: {
          data: parseUnits('1', 8),
        },
        addPaymentTokens: {
          vaults: [
            {
              paymentTokens: [
                { token: 'usdt', allowance: parseUnits('2000000') },
              ],
              type: 'depositVault',
            },
            {
              paymentTokens: [
                { token: 'usdt', allowance: parseUnits('2000000') },
              ],
              type: 'redemptionVaultSwapper',
            },
          ],
        },
      },
    },
  },
};
