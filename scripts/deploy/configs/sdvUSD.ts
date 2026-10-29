import { constants } from 'ethers';
import { parseUnits } from 'ethers/lib/utils';

import { chainIds } from '../../../config';
import { DeploymentConfig } from '../common/types';

export const sdvUSDDeploymentConfig: DeploymentConfig = {
  genericConfigs: {
    customAggregator: {
      minAnswer: parseUnits('0.1', 8),
      maxAnswer: parseUnits('1000', 8),
      maxAnswerDeviation: parseUnits('0.01', 8),
      description: 'sdvUSD/dvUSD',
    },
    dataFeed: {
      minAnswer: parseUnits('0.9999', 8),
      maxAnswer: parseUnits('1', 8),
      healthyDiff: constants.MaxUint256,
    },
  },
  networkConfigs: {
    [chainIds.main]: {
      dv: {
        type: 'REGULAR',
        enableSanctionsList: true,
        feeReceiver: '0x65533a9df09CE6Bdd6bc1783B3683d338908df05',
        tokensReceiver: '0xF561300c1Fb9B139F1Edd72023A26Ace43fa440f',
        instantDailyLimit: constants.MaxUint256,
        instantFee: parseUnits('0', 2),
        variationTolerance: parseUnits('2', 2),
        minAmount: parseUnits('0', 18),
        minMTokenAmountForFirstDeposit: parseUnits('0', 18),
        maxSupplyCap: constants.MaxUint256,
      },
      rvSwapper: {
        type: 'SWAPPER',
        feeReceiver: '0xF561300c1Fb9B139F1Edd72023A26Ace43fa440f',
        tokensReceiver: '0xF561300c1Fb9B139F1Edd72023A26Ace43fa440f',
        requestRedeemer: '0xF561300c1Fb9B139F1Edd72023A26Ace43fa440f',
        instantDailyLimit: constants.MaxUint256,
        instantFee: parseUnits('0', 2),
        variationTolerance: parseUnits('2', 2),
        minAmount: parseUnits('1', 18),
        // ticket: 30000000000000000 (0.03 sdvUSD); dvUSD uses 30 * 1e18
        fiatFlatFee: parseUnits('0.03', 18),
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
                  token: 'dvusd',
                  allowance: parseUnits('1000000000', 18),
                  fee: 0,
                  isStable: true,
                },
              ],
              type: 'depositVault',
            },
            {
              paymentTokens: [
                {
                  token: 'dvusd',
                  allowance: parseUnits('1000000000', 18),
                  fee: 0,
                  isStable: true,
                },
              ],
              type: 'redemptionVaultSwapper',
            },
          ],
        },
        grantRoles: {
          tokenManagerAddress: '0x6F96C7948845CfadB75c79Ef72421D2a546ff210',
          vaultsManagerAddress: '0x2ACB4BdCbEf02f81BF713b696Ac26390d7f79A12',
          oracleManagerAddress: '0xaA0f79FD194353acA3959890d572Cde77033BDac',
        },
        pauseFunctions: {
          depositVault: ['depositRequest', 'depositRequestWithCustomRecipient'],
          redemptionVaultSwapper: [
            'redeemFiatRequest',
            'redeemInstant',
            'redeemInstantWithCustomRecipient',
          ],
        },
        setRoundData: {
          data: parseUnits('1', 8),
        },
      },
    },
  },
};
