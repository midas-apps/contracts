import { constants } from 'ethers';
import { parseUnits } from 'ethers/lib/utils';

import { chainIds } from '../../../config';
import { DeploymentConfig } from '../common/types';

export const dnETHDeploymentConfig: DeploymentConfig = {
  genericConfigs: {
    customAggregator: {
      maxAnswerDeviation: parseUnits('0.35', 8),
      description: 'dnETH/USD',
    },
    dataFeed: {},
  },
  networkConfigs: {
    [chainIds.hyperevm]: {
      dv: {
        type: 'REGULAR',
        enableSanctionsList: false,
        feeReceiver: '0xE1e7881A18EaF1793A3EfB7d3FEDf0533586bec8',
        tokensReceiver: '0xE7c4EAad133423f16f3Bb84524c24F58f20C2D46',
        instantDailyLimit: parseUnits('5000000', 18),
        instantFee: parseUnits('0', 2),
        variationTolerance: parseUnits('0.6', 2),
        maxSupplyCap: parseUnits('5000000', 18),
      },
      rvSwapper: {
        type: 'SWAPPER',
        feeReceiver: '0xE7c4EAad133423f16f3Bb84524c24F58f20C2D46',
        tokensReceiver: '0xE7c4EAad133423f16f3Bb84524c24F58f20C2D46',
        requestRedeemer: '0x19D0443DebFf6265e58564C46994D11534e4f4d9',
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
          tokenManagerAddress: '0x2DD4f42845093E357b025DEf27f7889De1581E74',
          vaultsManagerAddress: '0x2ACB4BdCbEf02f81BF713b696Ac26390d7f79A12',
          oracleManagerAddress: '0xF1beF7b7537051f5ac8B931E74386a3aB3B8eFb4',
        },
        setRoundData: {
          data: parseUnits('1', 8),
        },
      },
    },
  },
};
