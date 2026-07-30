import { constants } from 'ethers';
import { parseUnits } from 'ethers/lib/utils';

import { chainIds } from '../../../config';
import { DeploymentConfig } from '../common/types';

export const mGLOeuroDeploymentConfig: DeploymentConfig = {
  genericConfigs: {
    customAggregator: {
      maxAnswerDeviation: parseUnits('1', 8),
      description: 'mGLOeuro/EUR',
      minAnswer: parseUnits('90000', 8),
      maxAnswer: parseUnits('110000', 8),
    },
    dataFeed: {
      minAnswer: parseUnits('90000', 8),
      maxAnswer: parseUnits('110000', 8),
    },
    customAggregatorAdjustedDv: {
      adjustmentPercentage: parseUnits('7', 8),
      underlyingFeed: 'customFeed',
    },
    customAggregatorAdjustedRv: {
      adjustmentPercentage: parseUnits('-7', 8),
      underlyingFeed: 'customFeed',
    },
  },
  networkConfigs: {
    [chainIds.main]: {
      dvMorpho: {
        type: 'MORPHO',
        enableSanctionsList: true,
        feeReceiver: '0xC903840d5E314caA407C6Bc5792746b5282BBFa7',
        tokensReceiver: '0x67887dd84E4778d8372BCD296E00995c59C00e52',
        instantDailyLimit: parseUnits('10000000', 18),
        instantFee: parseUnits('0', 2),
        variationTolerance: parseUnits('2', 2),
        minAmount: parseUnits('1.1', 18),
        minMTokenAmountForFirstDeposit: parseUnits('0', 18),
        maxSupplyCap: constants.MaxUint256,
      },
      rvMorpho: {
        type: 'MORPHO',
        feeReceiver: '0x67887dd84E4778d8372BCD296E00995c59C00e52',
        tokensReceiver: '0x67887dd84E4778d8372BCD296E00995c59C00e52',
        requestRedeemer: '0x7Ec5C012d2f140BE7f55c43777B399442ec8AF51',
        instantDailyLimit: parseUnits('500000', 18),
        instantFee: parseUnits('0.5', 2),
        variationTolerance: parseUnits('2', 2),
        minAmount: parseUnits('1.1', 18),
        enableSanctionsList: true,
        fiatAdditionalFee: parseUnits('0.1', 2),
        fiatFlatFee: parseUnits('30', 18),
        minFiatRedeemAmount: parseUnits('1000', 18),
      },
      postDeploy: {
        addPaymentTokens: {
          vaults: [
            {
              paymentTokens: [
                {
                  token: 'eurc',
                  allowance: parseUnits('1000000000', 18),
                  isStable: true,
                  fee: parseUnits('0', 2),
                },
                {
                  token: 'eurcv',
                  allowance: parseUnits('500000000', 18),
                  isStable: true,
                  fee: parseUnits('0', 2),
                },
              ],
              type: 'depositVaultMorpho',
            },
            {
              paymentTokens: [
                {
                  token: 'eurc',
                  allowance: parseUnits('1000000000', 18),
                  isStable: true,
                  fee: parseUnits('0', 2),
                },
                {
                  token: 'eurcv',
                  allowance: parseUnits('500000000', 18),
                  isStable: true,
                  fee: parseUnits('0', 2),
                },
              ],
              type: 'redemptionVaultMorpho',
            },
          ],
        },
        grantRoles: {
          tokenManagerAddress: '0x462C735196AF2277deE9f15Ac60B45E7Fe8415AA',
          vaultsManagerAddress: '0x2ACB4BdCbEf02f81BF713b696Ac26390d7f79A12',
          oracleManagerAddress: '0xa301F0eD658f72e0520fc47b42888bc985eF600c',
          minBalanceExemptAddresses: [
            '0x67887dd84E4778d8372BCD296E00995c59C00e52',
          ],
        },
        greenlist: {
          depositVaultMorpho: true,
          redemptionVaultMorpho: true,
        },
        pauseFunctions: {
          depositVaultMorpho: [
            'depositRequest',
            'depositRequestWithCustomRecipient',
          ],
          redemptionVaultMorpho: ['redeemFiatRequest'],
        },
        setRoundData: {
          data: parseUnits('100000', 8),
        },
        setMorphoConfig: [
          {
            type: 'depositVaultMorpho',
            vaults: [],
            depositsEnabled: false,
            autoInvestFallbackEnabled: true,
          },
          {
            type: 'redemptionVaultMorpho',
            vaults: [],
          },
        ],
      },
    },
  },
};
