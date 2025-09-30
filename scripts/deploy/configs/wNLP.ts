import { constants } from 'ethers';
import { parseUnits } from 'ethers/lib/utils';

import { chainIds } from '../../../config';
import { DeploymentConfig } from '../common/types';

export const wNLPDeploymentConfig: DeploymentConfig = {
  genericConfigs: {
    customAggregator: {
      maxAnswerDeviation: parseUnits('0.35', 8),
      description: 'wNLP/USD',
    },
    dataFeed: {},
  },
  networkConfigs: {
    [chainIds.hyperevm]: {
      dv: {
        type: 'REGULAR',
        enableSanctionsList: false,
        feeReceiver: '0xa3A63882E304B2ad709AB2049FF47306bbb2267e',
        tokensReceiver: '0x93ffE71866d3997c5C36d8b20d475BE30dd78bc1',
        instantDailyLimit: parseUnits('0', 18),
        instantFee: parseUnits('0', 2),
        variationTolerance: parseUnits('0.6', 2),
      },
      rvSwapper: {
        type: 'SWAPPER',
        feeReceiver: '0x0aCE12F53cc300e638aF90e7529E878DbC621e7E',
        tokensReceiver: '0x93ffE71866d3997c5C36d8b20d475BE30dd78bc1',
        requestRedeemer: '0x29ba549f5cBf4e995C11297688b196fFc3863fd5',
        instantDailyLimit: parseUnits('0', 18),
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
          tokenManagerAddress: '0xBB4982EB413c66B7B0776b13De41C07322A085Db',
          vaultsManagerAddress: '0x2ACB4BdCbEf02f81BF713b696Ac26390d7f79A12',
          oracleManagerAddress: '0x5123B6fb4DA6670dE8C7439F681295F9E6F2f7c5',
        },
        setRoundData: {
          data: parseUnits('1', 8),
        },
      },
    },
  },
};
