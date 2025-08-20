import { parseUnits } from 'ethers/lib/utils';

import { chainIds } from '../../../config';
import { DeploymentConfig } from '../common/types';

export const wVLPDeploymentConfig: DeploymentConfig = {
  genericConfigs: {
    customAggregator: {
      minAnswer: parseUnits('0.1', 8),
      maxAnswer: parseUnits('1000', 8),
      maxAnswerDeviation: parseUnits('0.35', 8),
      description: 'wVLP/USD',
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
        feeReceiver: '0x1A7C1e79d38FB8a65E8A489C75Dce09a4D6F4254',
        tokensReceiver: '0x5beE90c94460149C7305357272E5FDbC80116354',
        instantDailyLimit: parseUnits('50000000'),
        instantFee: parseUnits('0', 2),
        minMTokenAmountForFirstDeposit: parseUnits('0'),
        minAmount: parseUnits('0'),
        variationTolerance: parseUnits('0.6', 2),
      },
      rvSwapper: {
        type: 'SWAPPER',
        feeReceiver: '0x1989611c9d36a44170C6864d4673D1C16f753a73',
        tokensReceiver: '0x5beE90c94460149C7305357272E5FDbC80116354',
        instantDailyLimit: parseUnits('50000000'),
        instantFee: parseUnits('0.5', 2),
        minAmount: parseUnits('0'),
        variationTolerance: parseUnits('0.6', 2),
        fiatAdditionalFee: parseUnits('0.1', 2),
        fiatFlatFee: parseUnits('30'),
        minFiatRedeemAmount: parseUnits('1000'),
        requestRedeemer: '0xf43F32ED08123c8fc44519E3aFAac9c86A546Db3',
        liquidityProvider: 'dummy',
        swapperVault: 'dummy',
      },
      postDeploy: {
        setRoundData: {
          data: parseUnits('1', 8),
        },
        grantRoles: {
          tokenManagerAddress: '0x60236EF55C14845CCe7C32a2278616202b331DEc',
          vaultsManagerAddress: '0x2ACB4BdCbEf02f81BF713b696Ac26390d7f79A12',
          oracleManagerAddress: '0x35D297632A37F3A2A4F9cff70e3bbABD610cD0fa',
        },
        addPaymentTokens: {
          vaults: [
            {
              paymentTokens: [
                {
                  token: 'usdt',
                  allowance: parseUnits('1000000000'),
                },
              ],
              type: 'depositVault',
            },
            {
              paymentTokens: [
                {
                  token: 'usdt',
                  allowance: parseUnits('1000000000'),
                },
              ],
              type: 'redemptionVaultSwapper',
            },
          ],
        },
      },
    },
  },
};
