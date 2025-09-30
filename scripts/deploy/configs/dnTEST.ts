import { constants } from 'ethers';
import { parseUnits } from 'ethers/lib/utils';

import { chainIds } from '../../../config';
import { DeploymentConfig } from '../common/types';

export const dnTESTDeploymentConfig: DeploymentConfig = {
  genericConfigs: {
    customAggregator: {
      type: 'GROWTH',
      maxAnswerDeviation: parseUnits('0.35', 8),
      description: 'dnTEST/USD',
      onlyUp: true,
      minGrowthApr: parseUnits('0', 8),
      maxGrowthApr: parseUnits('50', 8),
    },
    dataFeed: {},
  },
  networkConfigs: {
    [chainIds.hyperevm]: {
      dv: {
        type: 'REGULAR',
        enableSanctionsList: false,
        feeReceiver: '0xcEac9265A40e30B011091919DEda2321881464a4',
        tokensReceiver: '0x30B2a6A15c8bCA072BA685A6FCAC427b8142c913',
        instantDailyLimit: parseUnits('5000000', 18),
        instantFee: parseUnits('0', 2),
        variationTolerance: parseUnits('0.6', 2),
      },
      rvSwapper: {
        type: 'SWAPPER',
        feeReceiver: '0x30B2a6A15c8bCA072BA685A6FCAC427b8142c913',
        tokensReceiver: '0x30B2a6A15c8bCA072BA685A6FCAC427b8142c913',
        requestRedeemer: '0x7Fa47050aD59e55Fbac8e4512cffa185E818B568',
        instantDailyLimit: parseUnits('5000000', 18),
        instantFee: parseUnits('0.5', 2),
        variationTolerance: parseUnits('0.6', 2),
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
          tokenManagerAddress: '0x04851F31A71FcCF106302BABfAB533e599a06419',
          vaultsManagerAddress: '0x2ACB4BdCbEf02f81BF713b696Ac26390d7f79A12',
          oracleManagerAddress: '0x30B2a6A15c8bCA072BA685A6FCAC427b8142c913',
        },
        setRoundData: {
          type: 'GROWTH',
          data: parseUnits('1', 8),
          apr: parseUnits('0', 8),
        },
        pauseFunctions: {
          depositVault: ['depositRequest', 'depositRequestWithCustomRecipient'],
        },
      },
    },
  },
};
