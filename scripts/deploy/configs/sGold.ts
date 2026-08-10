import { constants } from 'ethers';
import { parseUnits } from 'ethers/lib/utils';

import { chainIds } from '../../../config';
import { DeploymentConfig } from '../common/types';

export const sGoldDeploymentConfig: DeploymentConfig = {
  genericConfigs: {
    customAggregator: {
      maxAnswerDeviation: parseUnits('1.05', 8),
      description: 'sGold/USD',
    },
    dataFeed: {},
  },
  networkConfigs: {
    [chainIds.main]: {
      dv: {
        type: 'REGULAR',
        enableSanctionsList: true,
        feeReceiver: '0xad85a180B538DB85Ffe860b013D77C9f281132d7',
        tokensReceiver: '0xfe33E8f7719B72906700cDec4eBc1cad03E5BbC0',
        instantDailyLimit: constants.MaxUint256,
        instantFee: parseUnits('0', 2),
        variationTolerance: parseUnits('7', 2),
        minAmount: parseUnits('0', 18),
        minMTokenAmountForFirstDeposit: parseUnits('0', 18),
        maxSupplyCap: constants.MaxUint256,
      },
      rvSwapper: {
        type: 'SWAPPER',
        feeReceiver: '0xfe33E8f7719B72906700cDec4eBc1cad03E5BbC0',
        tokensReceiver: '0xfe33E8f7719B72906700cDec4eBc1cad03E5BbC0',
        requestRedeemer: '0x1C10988f49bB865a1BAe241f3979c84821992466',
        instantDailyLimit: constants.MaxUint256,
        instantFee: parseUnits('2', 2),
        variationTolerance: parseUnits('7', 2),
        minAmount: parseUnits('1', 18),
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
                  token: 'usdt',
                  allowance: parseUnits('1000000000', 18),
                },
                {
                  token: 'usdc',
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
          tokenManagerAddress: '0x5bA822279F3cC0Fe48565043EF29c2C759f4f4C0',
          vaultsManagerAddress: '0x2ACB4BdCbEf02f81BF713b696Ac26390d7f79A12',
          oracleManagerAddress: '0x0E9a58c9892782d22b3FEF4170A80FFcF0760cCB',
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
