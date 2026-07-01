import { constants } from 'ethers';
import { parseUnits } from 'ethers/lib/utils';

import { chainIds } from '../../../config';
import { DeploymentConfig } from '../common/types';

export const mGLODeploymentConfig: DeploymentConfig = {
  genericConfigs: {
    customAggregator: {
      maxAnswerDeviation: parseUnits('1', 8),
      description: 'mGLO/USD',
    },
    // Steakhouse mGLOBAL/ETH listing: 6% discount (holdbacks)
    customAggregatorAdjusted: {
      adjustmentPercentage: parseUnits('-6', 8),
      underlyingFeed: 'customFeed',
    },
    dataFeed: {},
    customAggregatorAdjustedDv: {
      adjustmentPercentage: parseUnits('7', 8),
      underlyingFeed: 'customFeed',
    },
    customAggregatorAdjustedRv: {
      adjustmentPercentage: parseUnits('-7', 8),
      underlyingFeed: 'customFeed',
    },
  },
  networkConfigs: {
    [chainIds.base]: {
      dv: {
        type: 'REGULAR',
        enableSanctionsList: true,
        feeReceiver: '0x6b5067C1D71e1Ad7e5Fbe85A8af04868B2e70a1B',
        tokensReceiver: '0x83BfD9233DC281E7BA1311B1245cb2f891a94E56',
        instantDailyLimit: constants.MaxUint256,
        instantFee: parseUnits('0', 2),
        variationTolerance: parseUnits('2', 2),
        minAmount: parseUnits('0', 18),
        minMTokenAmountForFirstDeposit: parseUnits('114000', 18),
        maxSupplyCap: constants.MaxUint256,
      },
      rvSwapper: {
        type: 'SWAPPER',
        feeReceiver: '0x0461bD693caE49bE9d030E5c212e080F9c78B846',
        tokensReceiver: '0x83BfD9233DC281E7BA1311B1245cb2f891a94E56',
        requestRedeemer: '0xF81295463396d709814a8F414F198b4aA7902737',
        instantDailyLimit: parseUnits('200000', 18),
        instantFee: parseUnits('0.5', 2),
        variationTolerance: parseUnits('2', 2),
        minAmount: parseUnits('1', 18),
        liquidityProvider: '0x0461bD693caE49bE9d030E5c212e080F9c78B846',
        enableSanctionsList: true,
        swapperVault: {
          mToken: 'mLIQUIDITY',
          redemptionVaultType: 'redemptionVaultMorpho',
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
          tokenManagerAddress: '0xA13f82F679E24ad08E014F8af6EcE32023b14F07',
          vaultsManagerAddress: '0x2ACB4BdCbEf02f81BF713b696Ac26390d7f79A12',
          oracleManagerAddress: '0x83b573AA8C4b567c0466c9d5e32D6513676d795b',
        },
        addFeeWaived: [
          {
            fromVault: { mToken: 'mLIQUIDITY', type: 'redemptionVaultMorpho' },
            toWaive: [{ mToken: 'mGLO', type: 'redemptionVaultSwapper' }],
          },
          {
            fromVault: { mToken: 'mLIQUIDITY', type: 'redemptionVault' },
            toWaive: [{ mToken: 'mGLO', type: 'redemptionVaultSwapper' }],
          },
        ],
        greenlist: {
          depositVault: true,
          redemptionVaultSwapper: true,
        },
        pauseFunctions: {
          depositVault: ['depositRequest', 'depositRequestWithCustomRecipient'],
          redemptionVaultSwapper: ['redeemFiatRequest'],
        },
        setRoundData: {
          data: parseUnits('1', 8),
        },
      },
    },
    [chainIds.robinhood]: {
      dv: {
        type: 'REGULAR',
        enableSanctionsList: false,
        feeReceiver: '0x6b5067C1D71e1Ad7e5Fbe85A8af04868B2e70a1B',
        tokensReceiver: '0x83BfD9233DC281E7BA1311B1245cb2f891a94E56',
        instantDailyLimit: constants.MaxUint256,
        instantFee: parseUnits('0', 2),
        variationTolerance: parseUnits('2', 2),
        minAmount: parseUnits('0', 18),
        minMTokenAmountForFirstDeposit: parseUnits('0', 18),
        maxSupplyCap: constants.MaxUint256,
      },
      rvSwapper: {
        type: 'SWAPPER',
        enableSanctionsList: false,
        feeReceiver: '0x0461bD693caE49bE9d030E5c212e080F9c78B846',
        tokensReceiver: '0x83BfD9233DC281E7BA1311B1245cb2f891a94E56',
        requestRedeemer: '0xF81295463396d709814a8F414F198b4aA7902737',
        instantDailyLimit: parseUnits('200000', 18),
        instantFee: parseUnits('0.5', 2),
        variationTolerance: parseUnits('2', 2),
        minAmount: parseUnits('1', 18),
        fiatFlatFee: parseUnits('30', 18),
        fiatAdditionalFee: parseUnits('0.1', 2),
        liquidityProvider: 'dummy',
        swapperVault: 'dummy',
      },
      postDeploy: {
        addPaymentTokens: {
          vaults: [
            {
              paymentTokens: [
                {
                  token: 'usdg',
                  allowance: parseUnits('1000000000', 18),
                },
              ],
              type: 'depositVault',
            },
            {
              paymentTokens: [
                {
                  token: 'usdg',
                  allowance: parseUnits('1000000000', 18),
                },
              ],
              type: 'redemptionVaultSwapper',
            },
          ],
        },
        grantRoles: {
          tokenManagerAddress: '0xA13f82F679E24ad08E014F8af6EcE32023b14F07',
          vaultsManagerAddress: '0x2ACB4BdCbEf02f81BF713b696Ac26390d7f79A12',
          oracleManagerAddress: '0x83b573AA8C4b567c0466c9d5e32D6513676d795b',
        },
        greenlist: {
          depositVault: true,
          redemptionVaultSwapper: true,
        },
        pauseFunctions: {
          depositVault: ['depositRequest', 'depositRequestWithCustomRecipient'],
          redemptionVaultSwapper: ['redeemFiatRequest'],
        },
        setRoundData: {
          data: parseUnits('1', 8),
        },
      },
    },
  },
};
