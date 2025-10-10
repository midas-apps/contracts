import { constants } from 'ethers';
import { parseUnits } from 'ethers/lib/utils';

import { chainIds } from '../../../config';
import { DeploymentConfig } from '../common/types';

export const cUSDODeploymentConfig: DeploymentConfig = {
  genericConfigs: {
    customAggregator: {
      maxAnswerDeviation: parseUnits('0.52', 8),
      description: 'cUSDO/USD',
    },
    dataFeed: {},
  },
  networkConfigs: {
    [chainIds.bsc]: {
      dv: {
        type: 'REGULAR',
        enableSanctionsList: false,
        feeReceiver: '0x546D6Fc2C62Caa75305Ec5D745F9ab9508781AA6',
        tokensReceiver: '0x8Ac1feE70d046C03eBE989AA4a7ba82f26D5f396',
        instantDailyLimit: constants.MaxUint256,
        instantFee: parseUnits('0', 2),
        variationTolerance: parseUnits('0.4', 2),
        minMTokenAmountForFirstDeposit: parseUnits('0', 18),
        maxSupplyCap: constants.MaxUint256,
      },
      rvSwapper: {
        type: 'SWAPPER',
        feeReceiver: '0x9c3C47FF6dEdD3923e1E85f4eC043014385d5ddb',
        tokensReceiver: '0x8Ac1feE70d046C03eBE989AA4a7ba82f26D5f396',
        requestRedeemer: '0x85521df6a3681e054b1Eb5bB71FBB82CE45cC435',
        instantDailyLimit: constants.MaxUint256,
        instantFee: parseUnits('0.7', 2),
        variationTolerance: parseUnits('0.4', 2),
        liquidityProvider: 'dummy',
        enableSanctionsList: false,
        swapperVault: 'dummy',
      },
      postDeploy: {
        addPaymentTokens: {
          vaults: [
            {
              paymentTokens: [
                {
                  token: 'usdt',
                  allowance: parseUnits('1000000000', 18),
                },
              ],
              type: 'depositVault',
            },
            {
              paymentTokens: [
                {
                  token: 'usdt',
                  allowance: parseUnits('1000000000', 18),
                },
              ],
              type: 'redemptionVaultSwapper',
            },
          ],
        },
        grantRoles: {
          tokenManagerAddress: '0x7944C21D3a1d583D9a072Bec40306Bc2191D8e41',
          vaultsManagerAddress: '0x2ACB4BdCbEf02f81BF713b696Ac26390d7f79A12',
          oracleManagerAddress: '0x35b8E87441BCD6B351E4555d567Ea5FDb1C09A3A',
        },
        setRoundData: {
          data: parseUnits('1', 8),
        },
        pauseFunctions: {
          redemptionVaultSwapper: ['redeemFiatRequest'],
        },
      },
    },
  },
};
