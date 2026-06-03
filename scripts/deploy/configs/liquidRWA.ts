import { constants } from 'ethers';
import { parseUnits } from 'ethers/lib/utils';

import { chainIds } from '../../../config';
import { DeploymentConfig } from '../common/types';

export const liquidRWADeploymentConfig: DeploymentConfig = {
  genericConfigs: {
    customAggregator: {
      maxAnswerDeviation: parseUnits('0.13', 8),
      description: 'liquidRWA/USD',
    },
    dataFeed: {},
  },
  networkConfigs: {
    [chainIds.optimism]: {
      dv: {
        type: 'REGULAR',
        enableSanctionsList: true,
        feeReceiver: '0x9098aC589699d9fd131777E37f32DB970CdCebc5',
        tokensReceiver: '0x2a59D1acCA89206017622Bf106D747BbE5E8CfEa',
        instantDailyLimit: constants.MaxUint256,
        instantFee: parseUnits('0', 2),
        variationTolerance: parseUnits('0.3', 2),
        minMTokenAmountForFirstDeposit: parseUnits('0', 18),
        maxSupplyCap: parseUnits('25000000', 18),
      },
      rvSwapper: {
        type: 'SWAPPER',
        feeReceiver: '0x8EC0170B28dcDd6e76977C47b1414865208EbFa3',
        tokensReceiver: '0x2a59D1acCA89206017622Bf106D747BbE5E8CfEa',
        requestRedeemer: '0x352D08740859275e64274FeCF3FE5E945ca6C112',
        instantDailyLimit: parseUnits('1000000', 18),
        instantFee: parseUnits('0.2', 2),
        variationTolerance: parseUnits('0.3', 2),
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
                },
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
                  token: 'usdc',
                  allowance: parseUnits('1000000000', 18),
                },
              ],
              type: 'redemptionVaultSwapper',
            },
          ],
        },
        grantRoles: {
          tokenManagerAddress: '0x51B341E93d098f0f61100BeE467717D37a7BbED9',
          vaultsManagerAddress: '0x2ACB4BdCbEf02f81BF713b696Ac26390d7f79A12',
          oracleManagerAddress: '0xf058472Ee02c4391831C92555e8f4D88115b26e4',
        },
        setRoundData: {
          data: parseUnits('1', 8),
        },
        pauseFunctions: {
          depositVault: ['depositRequest', 'depositRequestWithCustomRecipient'],
          redemptionVaultSwapper: ['redeemFiatRequest'],
        },
      },
    },
  },
};
