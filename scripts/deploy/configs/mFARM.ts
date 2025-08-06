import { constants } from 'ethers';
import { parseUnits } from 'ethers/lib/utils';

import { chainIds } from '../../../config';
import { DeploymentConfig } from '../common/types';

export const mFARMDeploymentConfig: DeploymentConfig = {
  genericConfigs: {
    customAggregator: {
      minAnswer: parseUnits('0.1', 8),
      maxAnswer: parseUnits('1000', 8),
      maxAnswerDeviation: parseUnits('0.4', 8),
      description: 'mFARM/USD',
    },
    dataFeed: {
      minAnswer: parseUnits('0.1', 8),
      maxAnswer: parseUnits('1000', 8),
      healthyDiff: 2592000,
    },
  },
  networkConfigs: {
    [chainIds.sepolia]: {
      dv: {
        feeReceiver: undefined,
        tokensReceiver: undefined,
        instantDailyLimit: constants.MaxUint256,
        instantFee: parseUnits('1', 2),
        minMTokenAmountForFirstDeposit: parseUnits('100'),
        minAmount: parseUnits('0.01'),
        variationTolerance: parseUnits('0.1', 2),
      },
      rvSwapper: {
        type: 'SWAPPER',
        feeReceiver: undefined,
        tokensReceiver: undefined,
        instantDailyLimit: constants.MaxUint256,
        instantFee: parseUnits('1', 2),
        minAmount: parseUnits('0.01'),
        variationTolerance: parseUnits('0.1', 2),
        fiatAdditionalFee: parseUnits('0.1', 2),
        fiatFlatFee: parseUnits('0.1', 18),
        minFiatRedeemAmount: parseUnits('1', 18),
        requestRedeemer: undefined,
        liquidityProvider: undefined,
        swapperVault: {
          mToken: 'mTBILL',
          redemptionVaultType: 'redemptionVaultBuidl',
        },
      },
      postDeploy: {
        grantRoles: {},
      },
    },
    [chainIds.main]: {
      dv: {
        feeReceiver: '0x7F97A9f864b6D50eA65218Eab19BBB50B34CDCc5',
        tokensReceiver: '0x5aD54C169Fc574A03C63DD7570CE9cd520afd757',
        instantDailyLimit: parseUnits('10000000'),
        instantFee: parseUnits('0', 2),
        minMTokenAmountForFirstDeposit: parseUnits('0'),
        minAmount: parseUnits('0'),
        variationTolerance: parseUnits('0.77', 2),
        enableSanctionsList: true,
      },
      rvSwapper: {
        type: 'SWAPPER',
        feeReceiver: '0x7F97A9f864b6D50eA65218Eab19BBB50B34CDCc5',
        tokensReceiver: '0x5aD54C169Fc574A03C63DD7570CE9cd520afd757',
        instantDailyLimit: parseUnits('10000000'),
        instantFee: parseUnits('0.5', 2),
        minAmount: parseUnits('0'),
        variationTolerance: parseUnits('0.77', 2),
        fiatAdditionalFee: parseUnits('0.1', 2),
        fiatFlatFee: parseUnits('30'),
        minFiatRedeemAmount: parseUnits('1000'),
        requestRedeemer: '0x1c6aa97d51e6F24F4485dFE6a995C18a10557E3F',
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
        grantRoles: {
          tokenManagerAddress: '0x6cf7C5e83fC4Ce7928839805a2e64b169263eDc5',
          vaultsManagerAddress: '0x2ACB4BdCbEf02f81BF713b696Ac26390d7f79A12',
          oracleManagerAddress: '0x1f33A9c0f28Bb9D17fC79c33fA163AC2a7557631',
        },
        addPaymentTokens: {
          vaults: [
            {
              paymentTokens: [
                {
                  token: 'dai',
                  allowance: parseUnits('10000000'),
                },
                {
                  token: 'usdc',
                  allowance: parseUnits('10000000'),
                },
                {
                  token: 'usdt',
                  allowance: parseUnits('10000000'),
                },
              ],
              type: 'depositVault',
            },
            {
              paymentTokens: [
                {
                  token: 'usdc',
                  allowance: parseUnits('10000000'),
                },
              ],
              type: 'redemptionVaultSwapper',
            },
          ],
        },
        addFeeWaived: [
          {
            fromVault: {
              mToken: 'mTBILL',
              type: 'redemptionVaultUstb',
            },
            toWaive: [{ type: 'redemptionVaultSwapper' }],
          },
        ],
      },
    },
  },
};
