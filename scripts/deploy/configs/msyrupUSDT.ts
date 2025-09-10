import { parseUnits } from 'ethers/lib/utils';

import { chainIds } from '../../../config';
import { DeploymentConfig } from '../common/types';

export const msyrupUSDTDeploymentConfig: DeploymentConfig = {
  genericConfigs: {
    customAggregator: {
      maxAnswerDeviation: parseUnits('0.36', 8),
      description: 'msyrupUSDT/USD',
    },
    dataFeed: {},
  },
  networkConfigs: {
    [chainIds.main]: {
      dv: {
        type: 'REGULAR',
        enableSanctionsList: true,
        feeReceiver: '0xc7B775fd5b9e6B1e9cee84e13fDc26a9Dc4a398d',
        tokensReceiver: '0x20f814e64A269153F5930A18FF92c5617E5bEf91',
        instantDailyLimit: parseUnits('150000000', 18),
        instantFee: parseUnits('0', 2),
        variationTolerance: parseUnits('0.8', 2),
      },
      rvSwapper: {
        type: 'SWAPPER',
        feeReceiver: '0xF32e8D1d9D121Cf9c0689dB547086136A87B6eB0',
        tokensReceiver: '0x20f814e64A269153F5930A18FF92c5617E5bEf91',
        requestRedeemer: '0x871059e1De852F08E26D4657f647e33DC234857F',
        instantDailyLimit: parseUnits('150000000', 18),
        instantFee: parseUnits('0.5', 2),
        variationTolerance: parseUnits('0.8', 2),
        liquidityProvider: 'dummy',
        enableSanctionsList: true,
        swapperVault: 'dummy',
      },
      postDeploy: {
        addPaymentTokens: {
          vaults: [
            {
              paymentTokens: [
                // {
                //   token: 'syrupusdt',
                //   allowance: parseUnits('1000000000', 18),
                // },
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
                // {
                //   token: 'syrupusdt',
                //   allowance: parseUnits('0', 18),
                // },
                {
                  token: 'usdt',
                  allowance: parseUnits('0', 18),
                },
                {
                  token: 'usdc',
                  allowance: parseUnits('0', 18),
                },
              ],
              type: 'redemptionVaultSwapper',
            },
          ],
        },
        grantRoles: {
          tokenManagerAddress: '0xAe30A49439D7830EB8866F9722b9A96E909d03cD',
          vaultsManagerAddress: '0x2ACB4BdCbEf02f81BF713b696Ac26390d7f79A12',
          oracleManagerAddress: '0xB0739C051DfF8A0713c8b93157867c16713CaF25',
        },
        setRoundData: {
          data: parseUnits('1', 8),
        },
      },
    },
  },
};
