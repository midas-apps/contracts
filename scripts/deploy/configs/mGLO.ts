import { hours } from '@nomicfoundation/hardhat-network-helpers/dist/src/helpers/time/duration';
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
    // 6% discount (holdbacks) for Steakhouse mGLOBAL/ETH listing and Robinhood listing
    customAggregatorAdjusted: {
      adjustmentPercentage: parseUnits('-6', 8),
      underlyingFeed: 'customFeed',
    },
    dataFeed: {
      minAnswer: parseUnits('0.9', 8),
      maxAnswer: parseUnits('1.1', 8),
      healthyDiff: 60 * 24 * 60 * 60,
    },
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
        // Non-origin-chain OFT adapter. Outbound rate limit to Mainnet is 5M/day.
        layerZero: {
          delegate: '0xB60842E9DaBCd1C52e354ac30E82a97661cB7E89',
          owner: '0xB60842E9DaBCd1C52e354ac30E82a97661cB7E89',
          rateLimitConfig: {
            default: {
              limit: parseUnits('5000000'),
              window: hours(24),
            },
          },
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
        // Non-origin-chain OFT adapter. Outbound rate limit to Mainnet is 5M/day.
        layerZero: {
          delegate: '0x563e0fc290D535fC5549873aEcE97A16b001B9eD',
          owner: '0x563e0fc290D535fC5549873aEcE97A16b001B9eD',
          rateLimitConfig: {
            default: {
              limit: parseUnits('5000000'),
              window: hours(24),
            },
          },
        },
      },
    },
    [chainIds.main]: {
      dv: {
        type: 'REGULAR',
        enableSanctionsList: true,
        feeReceiver: '0x6b5067C1D71e1Ad7e5Fbe85A8af04868B2e70a1B',
        tokensReceiver: '0x83BfD9233DC281E7BA1311B1245cb2f891a94E56',
        instantDailyLimit: parseUnits('30000000', 18),
        instantFee: parseUnits('0', 2),
        variationTolerance: parseUnits('2', 2),
        minAmount: parseUnits('0', 18),
        minMTokenAmountForFirstDeposit: parseUnits('0', 18),
        maxSupplyCap: constants.MaxUint256,
      },
      rvSwapper: {
        type: 'SWAPPER',
        feeReceiver: '0x0461bD693caE49bE9d030E5c212e080F9c78B846',
        tokensReceiver: '0x83BfD9233DC281E7BA1311B1245cb2f891a94E56',
        requestRedeemer: '0x27c41C320066e92688799b3cd0014992Da7f2f0C',
        instantDailyLimit: parseUnits('200000', 18),
        instantFee: parseUnits('0.5', 2),
        variationTolerance: parseUnits('2', 2),
        minAmount: parseUnits('1', 18),
        fiatFlatFee: parseUnits('30', 18),
        fiatAdditionalFee: parseUnits('0.1', 2),
        liquidityProvider: '0x0461bD693caE49bE9d030E5c212e080F9c78B846',
        enableSanctionsList: true,
        swapperVault: {
          mToken: 'mTBILL',
          redemptionVaultType: 'redemptionVaultUstb',
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
            fromVault: {
              mToken: 'mTBILL',
              type: 'redemptionVaultUstb',
            },
            toWaive: [
              {
                mToken: 'mGLO',
                type: 'redemptionVaultSwapper',
              },
            ],
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
        // Ethereum OFT adapter. Outbound rate limit is 5M/day to each spoke.
        layerZero: {
          delegate: '0xB60842E9DaBCd1C52e354ac30E82a97661cB7E89',
          owner: '0xB60842E9DaBCd1C52e354ac30E82a97661cB7E89',
          rateLimitConfig: {
            overrides: {
              base: {
                limit: parseUnits('5000000'),
                window: hours(24),
              },
              robinhood: {
                limit: parseUnits('5000000'),
                window: hours(24),
              },
              optimism: {
                limit: parseUnits('5000000'),
                window: hours(24),
              },
            },
          },
        },
      },
    },
    [chainIds.optimism]: {
      dv: {
        type: 'REGULAR',
        enableSanctionsList: true,
        feeReceiver: '0x6b5067C1D71e1Ad7e5Fbe85A8af04868B2e70a1B',
        tokensReceiver: '0x83BfD9233DC281E7BA1311B1245cb2f891a94E56',
        instantDailyLimit: parseUnits('30000000', 18),
        instantFee: parseUnits('0', 2),
        variationTolerance: parseUnits('2', 2),
        minAmount: parseUnits('0', 18),
        minMTokenAmountForFirstDeposit: parseUnits('0', 18),
        maxSupplyCap: constants.MaxUint256,
      },
      rvSwapper: {
        type: 'SWAPPER',
        feeReceiver: '0x83BfD9233DC281E7BA1311B1245cb2f891a94E56',
        tokensReceiver: '0x83BfD9233DC281E7BA1311B1245cb2f891a94E56',
        requestRedeemer: '0x27c41C320066e92688799b3cd0014992Da7f2f0C',
        instantDailyLimit: parseUnits('200000', 18),
        instantFee: parseUnits('0.5', 2),
        variationTolerance: parseUnits('2', 2),
        minAmount: parseUnits('1', 18),
        fiatFlatFee: parseUnits('30', 18),
        fiatAdditionalFee: parseUnits('0.1', 2),
        minFiatRedeemAmount: parseUnits('1000', 18),
        enableSanctionsList: true,
        liquidityProvider: 'dummy',
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
                  isStable: true,
                },
              ],
              type: 'depositVault',
            },
            {
              paymentTokens: [
                {
                  token: 'usdc',
                  allowance: parseUnits('1000000000', 18),
                  isStable: true,
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
        // Non-origin-chain OFT adapter. Outbound rate limit to Mainnet is 5M/day.
        layerZero: {
          delegate: '0xB60842E9DaBCd1C52e354ac30E82a97661cB7E89',
          owner: '0xB60842E9DaBCd1C52e354ac30E82a97661cB7E89',
          rateLimitConfig: {
            default: {
              limit: parseUnits('5000000'),
              window: hours(24),
            },
          },
        },
      },
    },
  },
};
export const mGLODialecticDeploymentConfig: DeploymentConfig = {
  genericConfigs: {
    customAggregator: {
      minAnswer: parseUnits('0.1', 8),
      maxAnswer: parseUnits('1000', 8),
      maxAnswerDeviation: parseUnits('1', 8),
      description: 'mGLO/USD',
    },
    dataFeed: {
      minAnswer: parseUnits('0.9', 8),
      maxAnswer: parseUnits('1.1', 8),
      healthyDiff: 5184000,
    },
  },
  networkConfigs: {
    [chainIds.base]: {
      rvSwapper: {
        type: 'SWAPPER',
        feeReceiver: '0x83BfD9233DC281E7BA1311B1245cb2f891a94E56',
        tokensReceiver: '0x83BfD9233DC281E7BA1311B1245cb2f891a94E56',
        requestRedeemer: '0x27c41C320066e92688799b3cd0014992Da7f2f0C',
        instantDailyLimit: constants.MaxUint256,
        instantFee: parseUnits('0', 2),
        variationTolerance: parseUnits('2', 2),
        minAmount: parseUnits('1', 18),
        fiatFlatFee: parseUnits('30', 18),
        fiatAdditionalFee: parseUnits('0.1', 2),
        minFiatRedeemAmount: parseUnits('1000', 18),
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
                  isStable: true,
                  fee: 10000,
                },
              ],
              type: 'redemptionVaultSwapper',
            },
          ],
        },
        grantRoles: {
          vaultsManagerAddress: '0x2ACB4BdCbEf02f81BF713b696Ac26390d7f79A12',
          oracleManagerAddress: '0x83b573AA8C4b567c0466c9d5e32D6513676d795b',
        },
        greenlist: {
          redemptionVaultSwapper: true,
        },
        pauseFunctions: {
          redemptionVaultSwapper: [
            'redeemFiatRequest',
            'redeemRequest',
            'redeemRequestWithCustomRecipient',
          ],
        },
        setRoundData: {
          dataSource: 'PROFILE_INITIAL_PRICE_SOURCE',
        },
      },
    },
  },
};
export const mGLO3FDeploymentConfig: DeploymentConfig = {
  genericConfigs: {
    customAggregator: {
      minAnswer: parseUnits('0.1', 8),
      maxAnswer: parseUnits('1000', 8),
      maxAnswerDeviation: parseUnits('1', 8),
      description: 'mGLO/USD',
    },
    dataFeed: {
      minAnswer: parseUnits('0.9', 8),
      maxAnswer: parseUnits('1.1', 8),
      healthyDiff: 5184000,
    },
  },
  networkConfigs: {
    [chainIds.main]: {
      rvSwapper: {
        type: 'SWAPPER',
        feeReceiver: '0x83BfD9233DC281E7BA1311B1245cb2f891a94E56',
        tokensReceiver: '0x83BfD9233DC281E7BA1311B1245cb2f891a94E56',
        requestRedeemer: '0x27c41C320066e92688799b3cd0014992Da7f2f0C',
        instantDailyLimit: constants.MaxUint256,
        instantFee: parseUnits('0', 2),
        variationTolerance: parseUnits('2', 2),
        minAmount: parseUnits('1', 18),
        fiatFlatFee: parseUnits('30', 18),
        fiatAdditionalFee: parseUnits('0.1', 2),
        minFiatRedeemAmount: parseUnits('1000', 18),
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
                  isStable: true,
                  fee: 10000,
                },
              ],
              type: 'redemptionVaultSwapper',
            },
          ],
        },
        grantRoles: {
          vaultsManagerAddress: '0x2ACB4BdCbEf02f81BF713b696Ac26390d7f79A12',
          oracleManagerAddress: '0x83b573AA8C4b567c0466c9d5e32D6513676d795b',
        },
        greenlist: {
          redemptionVaultSwapper: true,
        },
        pauseFunctions: {
          redemptionVaultSwapper: [
            'redeemFiatRequest',
            'redeemRequest',
            'redeemRequestWithCustomRecipient',
          ],
        },
        setRoundData: {
          dataSource: 'PROFILE_INITIAL_PRICE_SOURCE',
        },
      },
    },
  },
};
