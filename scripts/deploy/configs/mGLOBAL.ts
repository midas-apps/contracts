import { constants } from 'ethers';
import { parseUnits } from 'ethers/lib/utils';

import { chainIds } from '../../../config';
import { DeploymentConfig } from '../common/types';

export const mGLOBALDeploymentConfig: DeploymentConfig = {
  genericConfigs: {
    customAggregator: {
      type: 'GROWTH',
      maxAnswerDeviation: parseUnits('1', 8),
      description: 'mGLOBAL/USD',
      onlyUp: true,
      minGrowthApr: parseUnits('0', 8),
      maxGrowthApr: parseUnits('0', 8),
    },
    customAggregatorAdjustedDv: {
      adjustmentPercentage: parseUnits('7', 8),
      underlyingFeed: 'customFeedGrowth',
    },
    customAggregatorAdjustedRv: {
      adjustmentPercentage: parseUnits('-7', 8),
      underlyingFeed: 'customFeedGrowth',
    },
    dataFeed: {},
  },
  networkConfigs: {
    [chainIds.main]: {
      dvAave: {
        type: 'AAVE',
        enableSanctionsList: true,
        feeReceiver: '0xE64F2b295F49dfa826278824993600a6b3e40174',
        tokensReceiver: '0xb38c71199d7B480A8FEBaDEEff59e5516338bcf6',
        instantDailyLimit: constants.MaxUint256,
        instantFee: parseUnits('0', 2),
        variationTolerance: parseUnits('2', 2),
        minAmount: parseUnits('0', 18),
        minMTokenAmountForFirstDeposit: parseUnits('0', 18),
        maxSupplyCap: constants.MaxUint256,
      },
      rvAave: {
        type: 'AAVE',
        feeReceiver: '0xE64F2b295F49dfa826278824993600a6b3e40174',
        tokensReceiver: '0xb38c71199d7B480A8FEBaDEEff59e5516338bcf6',
        requestRedeemer: '0xaB9dA7953D82d81006639A6f87883d59594918b9',
        instantDailyLimit: parseUnits('200000', 18),
        instantFee: parseUnits('0.5', 2),
        variationTolerance: parseUnits('2', 2),
        enableSanctionsList: true,
        minAmount: parseUnits('1', 18),
      },
      rvSwapper: {
        type: 'SWAPPER',
        feeReceiver: '0xE64F2b295F49dfa826278824993600a6b3e40174',
        tokensReceiver: '0xb38c71199d7B480A8FEBaDEEff59e5516338bcf6',
        requestRedeemer: '0xaB9dA7953D82d81006639A6f87883d59594918b9',
        instantDailyLimit: parseUnits('200000', 18),
        instantFee: parseUnits('0.5', 2),
        variationTolerance: parseUnits('2', 2),
        minAmount: parseUnits('1', 18),
        liquidityProvider: 'dummy',
        enableSanctionsList: true,
        swapperVault: {
          mToken: 'mLIQUIDITY',
          redemptionVaultType: 'redemptionVault',
        },
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
              ],
              type: 'depositVaultAave',
            },
            {
              paymentTokens: [
                {
                  token: 'usdc',
                  allowance: parseUnits('1000000000', 18),
                },
              ],
              type: 'redemptionVaultAave',
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
          tokenManagerAddress: '0x76E350c5a674Db787918E5F728466C7356d4d361',
          vaultsManagerAddress: '0x2ACB4BdCbEf02f81BF713b696Ac26390d7f79A12',
          oracleManagerAddress: '0x088a74De7dF74E6a6EB832D28878a9f134eE4F05',
        },
        setRoundData: {
          type: 'GROWTH',
          data: parseUnits('1', 8),
          apr: parseUnits('0', 8),
        },
        addFeeWaived: [
          {
            fromVault: { mToken: 'mLIQUIDITY', type: 'redemptionVault' },
            toWaive: [{ mToken: 'mGLOBAL', type: 'redemptionVaultSwapper' }],
          },
        ],
        pauseFunctions: {
          depositVaultAave: [
            'depositRequest',
            'depositRequestWithCustomRecipient',
          ],
          redemptionVaultAave: ['redeemFiatRequest'],
          redemptionVaultSwapper: ['redeemFiatRequest'],
        },
      },
    },
  },
};
