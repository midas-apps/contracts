import { parseUnits } from 'ethers/lib/utils';

import { chainIds } from '../../../config';
import { DeploymentConfig } from '../common/types';

export const msyrupUSDDeploymentConfig: DeploymentConfig = {
  genericConfigs: {
    customAggregator: {
      minAnswer: parseUnits('0.1', 8),
      maxAnswer: parseUnits('1000', 8),
      maxAnswerDeviation: parseUnits('0.4', 8),
      description: 'msyrupUSD/USD',
    },
    dataFeed: {
      minAnswer: parseUnits('0.1', 8),
      maxAnswer: parseUnits('1000', 8),
      healthyDiff: 2592000,
    },
  },
  networkConfigs: {
    [chainIds.main]: {
      dv: {
        feeReceiver: '0xF56BC894d22D7B2a6b5431bDa6426afAAD094eBd',
        tokensReceiver: '0xC1f2A8af259ff7F8F428C6B6eDdc62e9e6a51Ce8',
        instantDailyLimit: parseUnits('25000000'),
        instantFee: parseUnits('0', 2),
        minMTokenAmountForFirstDeposit: parseUnits('0'),
        minAmount: parseUnits('0'),
        variationTolerance: parseUnits('1', 2),
        enableSanctionsList: true,
      },
      rvSwapper: {
        type: 'SWAPPER',
        feeReceiver: '0xe5eB35c39Fe22ce0b48799894a32b71a31cf38dA',
        tokensReceiver: '0xC1f2A8af259ff7F8F428C6B6eDdc62e9e6a51Ce8',
        instantDailyLimit: parseUnits('25000000'),
        instantFee: parseUnits('0.5', 2),
        minAmount: parseUnits('0'),
        variationTolerance: parseUnits('1', 2),
        fiatAdditionalFee: parseUnits('0.1', 2),
        fiatFlatFee: parseUnits('30'),
        minFiatRedeemAmount: parseUnits('1000'),
        requestRedeemer: '0xFFAe7b63bceE3d5f948e5837046aaed93b76BEFE',
        liquidityProvider: '0x0461bD693caE49bE9d030E5c212e080F9c78B846',
        swapperVault: {
          mToken: 'mTBILL',
          redemptionVaultType: 'redemptionVaultUstb',
        },
        enableSanctionsList: true,
      },
      postDeploy: {
        setRoundData: {
          data: parseUnits('1', 8),
        },
        addFeeWaived: [
          {
            fromVault: { mToken: 'mTBILL', type: 'redemptionVaultUstb' },
            toWaive: [{ mToken: 'msyrupUSD', type: 'redemptionVaultSwapper' }],
          },
        ],
        grantRoles: {
          tokenManagerAddress: '0xcFA659560492c3d90dEE555413cE5f3A64C62256',
          vaultsManagerAddress: '0x2ACB4BdCbEf02f81BF713b696Ac26390d7f79A12',
          oracleManagerAddress: '0xCeB0FDB13d3fE223de3F39F1A28A379b97EA96c6',
        },
        addPaymentTokens: {
          vaults: [
            {
              paymentTokens: [
                {
                  token: 'usdc',
                  allowance: parseUnits('100000000'),
                },
                {
                  token: 'syrupUSDC',
                  allowance: parseUnits('100000000'),
                  isStable: false,
                },
                {
                  token: 'usdt',
                  allowance: parseUnits('100000000'),
                },
                {
                  token: 'dai',
                  allowance: parseUnits('100000000'),
                },
                {
                  token: 'usds',
                  allowance: 0n,
                },
              ],
              type: 'depositVault',
            },
            {
              paymentTokens: [
                {
                  token: 'usdc',
                  allowance: parseUnits('100000000'),
                },
                {
                  token: 'syrupUSDC',
                  allowance: parseUnits('100000000'),
                  isStable: false,
                },
              ],
              type: 'redemptionVaultSwapper',
            },
          ],
        },
      },
    },
  },
};
