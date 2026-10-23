import { constants } from 'ethers';
import { parseUnits } from 'ethers/lib/utils';

import { chainIds } from '../../../config';
import { DeploymentConfig } from '../common/types';

export const Re7YIELDDeploymentConfig: DeploymentConfig = {
  genericConfigs: {
    customAggregator: {
      maxAnswerDeviation: parseUnits('0.2', 8),
      description: 'Re7YIELD/USD',
    },
    dataFeed: {
      minAnswer: parseUnits('0.9', 8),
      maxAnswer: parseUnits('1.09', 8),
      healthyDiff: 2592000,
    },
  },
  networkConfigs: {
    [chainIds.main]: {
      dv: {
        type: 'REGULAR',
        enableSanctionsList: true,
        feeReceiver: '0x6D10d28BB3E313577c16bC565603bACf66D65a79',
        tokensReceiver: '0x22665889ad02b3F8bEB30d5bacDD318E007b0Ce1',
        instantDailyLimit: constants.MaxUint256,
        instantFee: parseUnits('0', 2),
        variationTolerance: parseUnits('2', 2),
        minAmount: parseUnits('1', 18),
        minMTokenAmountForFirstDeposit: parseUnits('0', 18),
        maxSupplyCap: constants.MaxUint256,
      },
      rvSwapper: {
        type: 'SWAPPER',
        feeReceiver: '0x6D10d28BB3E313577c16bC565603bACf66D65a79',
        tokensReceiver: '0x22665889ad02b3F8bEB30d5bacDD318E007b0Ce1',
        requestRedeemer: '0x7767F6Cf26A35730159d881E913a6f35E5424511',
        instantDailyLimit: parseUnits('10000000', 18),
        instantFee: parseUnits('0.3', 2),
        variationTolerance: parseUnits('2', 2),
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
                {
                  token: 'usdt',
                  allowance: parseUnits('1000000000', 18),
                  fee: 0,
                },
                {
                  token: 'dai',
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
                  fee: 0,
                },
              ],
              type: 'redemptionVaultSwapper',
            },
          ],
        },
        grantRoles: {
          tokenManagerAddress: '0x7ebf219c293DBF3AE139D45e445DDA2eD1605Bd4',
          vaultsManagerAddress: '0x2ACB4BdCbEf02f81BF713b696Ac26390d7f79A12',
          oracleManagerAddress: '0x0c0160C8EF37eC353d7470F1a71C5e0e8E66467d',
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
