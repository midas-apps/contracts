import { constants } from 'ethers';
import { parseUnits } from 'ethers/lib/utils';

import { chainIds } from '../../../config';
import { DeploymentConfig } from '../common/types';

export const JIVDeploymentConfig: DeploymentConfig = {
  genericConfigs: {
    customAggregator: {
      maxAnswerDeviation: parseUnits('0.34', 8),
      description: 'JIV/USD',
    },
    dataFeed: {},
  },
  networkConfigs: {
    [chainIds.main]: {
      dv: {
        type: 'REGULAR',
        enableSanctionsList: true,
        feeReceiver: '0xE4F65a87d6aa51a0d671ECb817020AF46c60aE4B',
        tokensReceiver: '0x51415B2FB437277b4252d009871f8041c8032888',
        instantDailyLimit: parseUnits('20000000', 18),
        instantFee: parseUnits('0', 2),
        variationTolerance: parseUnits('6.5', 2),
        maxSupplyCap: parseUnits('20000000', 18),
      },
      rvSwapper: {
        type: 'SWAPPER',
        feeReceiver: '0x943e2929153735d2eB2caD33e2D7a042b32bDE7C',
        tokensReceiver: '0x51415B2FB437277b4252d009871f8041c8032888',
        requestRedeemer: '0x0B8Fe87cCf7A7b41e513F0156a7a67dabe235f6f',
        instantDailyLimit: parseUnits('20000000', 18),
        instantFee: parseUnits('0.5', 2),
        variationTolerance: parseUnits('6.5', 2),
        liquidityProvider: 'dummy',
        swapperVault: 'dummy',
        enableSanctionsList: true,
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
          tokenManagerAddress: '0xE4F65a87d6aa51a0d671ECb817020AF46c60aE4B',
          vaultsManagerAddress: '0x2ACB4BdCbEf02f81BF713b696Ac26390d7f79A12',
          oracleManagerAddress: '0xfB16077a8a375d672a4863D8E5026e0A7cB9382B',
        },
        setRoundData: {
          data: parseUnits('1', 8),
        },
      },
    },
  },
};
