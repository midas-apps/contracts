import { parseUnits } from 'ethers/lib/utils';

import { chainIds } from '../../../config';
import { DeploymentConfig } from '../common/types';

export const zeroGUSDVDeploymentConfig: DeploymentConfig = {
  genericConfigs: {
    customAggregator: {
      maxAnswerDeviation: parseUnits('0.32', 8),
      description: 'zeroGUSDV/USD',
    },
    dataFeed: {},
  },
  networkConfigs: {
    [chainIds.main]: {
      dv: {
        type: 'REGULAR',
        enableSanctionsList: true,
        feeReceiver: '0x8cF7E060f644DC4BA6d81a2F92e39d99B4777357',
        tokensReceiver: '0x4464e545682C7d9e356055DEc4DF834C69369aB9',
        instantDailyLimit: parseUnits('1000000000', 18),
        instantFee: parseUnits('0', 2),
        variationTolerance: parseUnits('0.7', 2),
      },
      rvSwapper: {
        type: 'SWAPPER',
        feeReceiver: '0xf0e544C1CF6EF583EFfa3f7f25B1A48ee18c988C',
        tokensReceiver: '0x4464e545682C7d9e356055DEc4DF834C69369aB9',
        requestRedeemer: '0xBE38e0e9D503368540C740E4A39262840E833861',
        instantDailyLimit: parseUnits('2500000000', 18),
        instantFee: parseUnits('0.5', 2),
        variationTolerance: parseUnits('0.7', 2),
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
          tokenManagerAddress: '0x4a2Dc57Cd464D6B492062ceb542F3D1A64556f1A',
          vaultsManagerAddress: '0x2ACB4BdCbEf02f81BF713b696Ac26390d7f79A12',
          oracleManagerAddress: '0x35D69C118C2AFac7ead257e2957F3Fa95d4De908',
        },
        setRoundData: {
          data: parseUnits('1', 8),
        },
      },
    },
    [chainIds.sepolia]: {
      dv: {
        type: 'REGULAR',
        enableSanctionsList: true,
        feeReceiver: '0x8cF7E060f644DC4BA6d81a2F92e39d99B4777357',
        tokensReceiver: '0x4464e545682C7d9e356055DEc4DF834C69369aB9',
        instantDailyLimit: parseUnits('1000000000', 18),
        instantFee: parseUnits('0', 2),
        variationTolerance: parseUnits('0.7', 2),
      },
      rvSwapper: {
        type: 'SWAPPER',
        feeReceiver: '0xf0e544C1CF6EF583EFfa3f7f25B1A48ee18c988C',
        tokensReceiver: '0x4464e545682C7d9e356055DEc4DF834C69369aB9',
        requestRedeemer: '0xBE38e0e9D503368540C740E4A39262840E833861',
        instantDailyLimit: parseUnits('2500000000', 18),
        instantFee: parseUnits('0.5', 2),
        variationTolerance: parseUnits('0.7', 2),
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
          tokenManagerAddress: '0x4a2Dc57Cd464D6B492062ceb542F3D1A64556f1A',
          vaultsManagerAddress: '0x2ACB4BdCbEf02f81BF713b696Ac26390d7f79A12',
          oracleManagerAddress: '0x35D69C118C2AFac7ead257e2957F3Fa95d4De908',
        },
        setRoundData: {
          data: parseUnits('1', 8),
        },
      },
    },
  },
};
