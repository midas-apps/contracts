import { constants } from 'ethers';
import { parseUnits } from 'ethers/lib/utils';

import { chainIds } from '../../../config';
import { DeploymentConfig } from '../common/types';

export const mWildUSDDeploymentConfig: DeploymentConfig = {
  genericConfigs: {
    customAggregator: {
      maxAnswerDeviation: parseUnits('0.36', 8),
      description: 'mWildUSD/USD',
    },
    dataFeed: {},
  },
  networkConfigs: {
    [chainIds.main]: {
      dv: {
        type: 'REGULAR',
        enableSanctionsList: true,
        feeReceiver: '0xfE57cBF3123c8F7156c2683F9c2C1f72E606b86F',
        tokensReceiver: '0xA0506f3b1c819944246345aBC2194225603901eB',
        instantDailyLimit: constants.MaxUint256,
        instantFee: parseUnits('0', 2),
        variationTolerance: parseUnits('0.77', 2),
        maxSupplyCap: parseUnits('300000000', 18),
      },
      rvSwapper: {
        type: 'SWAPPER',
        feeReceiver: '0x19316F715Faa2E735B88785CCFeac9C3cFC5Bcb5',
        tokensReceiver: '0xA0506f3b1c819944246345aBC2194225603901eB',
        requestRedeemer: '0x87198209E3e4d655016F8Bc1Ca4d5188fA364362',
        instantDailyLimit: parseUnits('1000000', 18),
        instantFee: parseUnits('0.5', 2),
        variationTolerance: parseUnits('1.53', 2),
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
                {
                  token: 'usde',
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
                {
                  token: 'usde',
                  allowance: parseUnits('1000000000', 18),
                },
              ],
              type: 'redemptionVaultSwapper',
            },
          ],
        },
        grantRoles: {
          tokenManagerAddress: '0xA328C029904346dC6C5cBA34f41B61FcfCaA6F6a',
          vaultsManagerAddress: '0x2ACB4BdCbEf02f81BF713b696Ac26390d7f79A12',
          oracleManagerAddress: '0x4Ed9e75B9da6A222Fb83b767612fc9843E65584E',
        },
        setRoundData: {
          data: parseUnits('1', 8),
        },
        pauseFunctions: {
          depositVault: ['depositRequest', 'depositRequestWithCustomRecipient'],
          redemptionVaultSwapper: [
            'redeemInstant',
            'redeemInstantWithCustomRecipient',
            'redeemRequest',
            'redeemRequestWithCustomRecipient',
          ],
        },
      },
    },
  },
};
