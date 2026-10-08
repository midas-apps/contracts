import { constants } from 'ethers';
import { parseUnits } from 'ethers/lib/utils';

import { chainIds } from '../../../config';
import { DeploymentConfig } from '../common/types';

export const moriniGoldYieldDeploymentConfig: DeploymentConfig = {
  genericConfigs: {
    customAggregator: {
      minAnswer: parseUnits('0.1', 8),
      maxAnswer: parseUnits('1000', 8),
      maxAnswerDeviation: parseUnits('0.33', 8),
      description: 'moriniGoldYield/GOLD',
    },
    dataFeed: {
      minAnswer: parseUnits('0.9', 8),
      maxAnswer: parseUnits('1.15', 8),
      healthyDiff: 2592000,
    },
  },
  networkConfigs: {
    [chainIds.main]: {
      dv: {
        type: 'REGULAR',
        enableSanctionsList: true,
        feeReceiver: '0xcaCbbf2c649Db2d8095AeF371B7d786322b0c637',
        tokensReceiver: '0x11dD7eE2b7a21fcDC4340F92081c167d959E11c7',
        instantDailyLimit: constants.MaxUint256,
        instantFee: parseUnits('0', 2),
        variationTolerance: parseUnits('0.4', 2),
        minAmount: parseUnits('0', 18),
        minMTokenAmountForFirstDeposit: parseUnits('0', 18),
        maxSupplyCap: constants.MaxUint256,
      },
      rvSwapper: {
        type: 'SWAPPER',
        feeReceiver: '0x11dD7eE2b7a21fcDC4340F92081c167d959E11c7',
        tokensReceiver: '0x11dD7eE2b7a21fcDC4340F92081c167d959E11c7',
        requestRedeemer: '0x8fa4c2B8bDa60e1145e14bE671907c0769a2f12B',
        instantDailyLimit: parseUnits('10000000', 18),
        instantFee: parseUnits('0.5', 2),
        variationTolerance: parseUnits('0.4', 2),
        minAmount: parseUnits('0.00025', 18),
        fiatFlatFee: parseUnits('30', 18),
        fiatAdditionalFee: parseUnits('0.1', 2),
        minFiatRedeemAmount: parseUnits('1000', 18),
        liquidityProvider: 'dummy',
        enableSanctionsList: true,
        swapperVault: 'dummy',
      },
      postDeploy: {
        addPaymentTokens: {
          vaults: [
            {
              paymentTokens: [
                {
                  token: 'paxg',
                  allowance: parseUnits('100000', 18),
                  fee: 0,
                },
                {
                  token: 'xaut',
                  allowance: parseUnits('100', 18),
                  fee: 0,
                },
              ],
              type: 'depositVault',
            },
            {
              paymentTokens: [
                {
                  token: 'xaut',
                  allowance: parseUnits('100', 18),
                  fee: 0,
                },
              ],
              type: 'redemptionVaultSwapper',
            },
          ],
        },
        grantRoles: {
          tokenManagerAddress: '0x823D417249EDDffB2597B4c991e6aC8Dc5C7ec1a',
          vaultsManagerAddress: '0x2ACB4BdCbEf02f81BF713b696Ac26390d7f79A12',
          oracleManagerAddress: '0x1a5c4A4e3a8C958CF95864e72ca17495a7791B58',
        },
        pauseFunctions: {
          depositVault: ['depositRequest', 'depositRequestWithCustomRecipient'],
          redemptionVaultSwapper: ['redeemFiatRequest'],
        },
        setRoundData: {
          data: parseUnits('1', 8),
        },
      },
    },
  },
};
