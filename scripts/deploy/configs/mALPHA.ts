import { constants } from 'ethers';
import { parseUnits } from 'ethers/lib/utils';

import { chainIds } from '../../../config';
import { DeploymentConfig } from '../common/types';

export const mALPHADeploymentConfig: DeploymentConfig = {
  genericConfigs: {
    customAggregator: {
      minAnswer: parseUnits('1', 8),
      maxAnswer: parseUnits('1.4', 8),
      maxAnswerDeviation: parseUnits('1.18', 8),
      description: 'mALPHA/USD',
    },
    dataFeed: {
      minAnswer: parseUnits('1', 8),
      maxAnswer: parseUnits('1.4', 8),
      healthyDiff: 2592000,
    },
  },
  networkConfigs: {
    [chainIds.main]: {
      dv: {
        type: 'REGULAR',
        enableSanctionsList: true,
        feeReceiver: '0x260761b16fFC00Bf7DF5abc6E110A6a2b0ef304c',
        tokensReceiver: '0x260761b16fFC00Bf7DF5abc6E110A6a2b0ef304c',
        instantDailyLimit: 1,
        instantFee: parseUnits('0', 2),
        variationTolerance: parseUnits('1.6', 2),
        minAmount: parseUnits('1', 18),
        minMTokenAmountForFirstDeposit: parseUnits('0', 18),
        maxSupplyCap: constants.MaxUint256,
      },
      rvSwapper: {
        type: 'SWAPPER',
        feeReceiver: '0x75274de4004044FDF9E03d602af2Fd1397B8b97C',
        tokensReceiver: '0x260761b16fFC00Bf7DF5abc6E110A6a2b0ef304c',
        requestRedeemer: '0xD02ab21C53bCA5C8C6667d39338e636075707884',
        instantDailyLimit: 1,
        instantFee: parseUnits('0.9', 2),
        variationTolerance: parseUnits('1.6', 2),
        minAmount: parseUnits('1', 18),
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
                  token: 'usdc',
                  allowance: parseUnits('1000000000', 18),
                  fee: 0,
                },
              ],
              type: 'depositVault',
            },
            {
              paymentTokens: [
                {
                  token: 'usdc',
                  allowance: parseUnits('1000000000', 18),
                  fee: 20,
                },
              ],
              type: 'redemptionVaultSwapper',
            },
          ],
        },
        grantRoles: {
          tokenManagerAddress: '0xf9658b5dD17C1a8933B6916EF858c2b221A93350',
          vaultsManagerAddress: '0x2ACB4BdCbEf02f81BF713b696Ac26390d7f79A12',
          oracleManagerAddress: '0x18A6daeF275bb72E4Fd9505D74D36A102F1a324E',
        },
        pauseFunctions: {
          depositVault: ['depositInstant', 'depositInstantWithCustomRecipient'],
          redemptionVaultSwapper: [
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
