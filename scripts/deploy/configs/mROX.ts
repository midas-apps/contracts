import { constants } from 'ethers';
import { parseUnits } from 'ethers/lib/utils';

import { chainIds } from '../../../config';
import { DeploymentConfig } from '../common/types';

export const mROXDeploymentConfig: DeploymentConfig = {
  genericConfigs: {
    customAggregator: {
      maxAnswerDeviation: parseUnits('0.31', 8),
      description: 'mROX/USD',
    },
    dataFeed: {},
  },
  networkConfigs: {
    [chainIds.monad]: {
      dv: {
        type: 'REGULAR',
        enableSanctionsList: false,
        feeReceiver: '0x11296dF1958dB19643f288a58951F07c8A2C9932',
        tokensReceiver: '0x1AA522B985FB76039A0c43b6f0eC0e30e490918e',
        instantDailyLimit: constants.MaxUint256,
        instantFee: parseUnits('0', 2),
        variationTolerance: parseUnits('0.4', 2),
        minAmount: 0,
        minMTokenAmountForFirstDeposit: 0,
        maxSupplyCap: constants.MaxUint256,
      },
      rvSwapper: {
        type: 'SWAPPER',
        enableSanctionsList: false,
        feeReceiver: '0x1AA522B985FB76039A0c43b6f0eC0e30e490918e',
        tokensReceiver: '0x1AA522B985FB76039A0c43b6f0eC0e30e490918e',
        requestRedeemer: '0x0551390A7Dca6d0eb5089c1ba13300a2fbb12393',
        instantDailyLimit: constants.MaxUint256,
        instantFee: parseUnits('0.5', 2),
        variationTolerance: parseUnits('0.4', 2),
        minAmount: 0,
        fiatFlatFee: parseUnits('30', 18),
        fiatAdditionalFee: parseUnits('0.1', 2),
        minFiatRedeemAmount: parseUnits('1000', 18),
        liquidityProvider: 'dummy',
        swapperVault: 'dummy',
      },
      postDeploy: {
        layerZero: {
          delegate: '0xB60842E9DaBCd1C52e354ac30E82a97661cB7E89',
          owner: '0xB60842E9DaBCd1C52e354ac30E82a97661cB7E89',
          rateLimitConfig: {
            default: {
              limit: parseUnits('2000000', 18),
              window: 86400,
            },
          },
        },
        addPaymentTokens: {
          vaults: [
            {
              type: 'depositVault',
              paymentTokens: [
                {
                  token: 'usdc',
                  fee: 0,
                  isStable: true,
                  allowance: parseUnits('1000000000', 18),
                },
              ],
            },
            {
              type: 'redemptionVaultSwapper',
              paymentTokens: [
                {
                  token: 'usdc',
                  fee: 0,
                  isStable: true,
                  allowance: parseUnits('1000000000', 18),
                },
              ],
            },
          ],
        },
        grantRoles: {
          tokenManagerAddress: '0xc0722e656796EDa9aE701eAd6d48e89b30460a72',
          vaultsManagerAddress: '0x2ACB4BdCbEf02f81BF713b696Ac26390d7f79A12',
          oracleManagerAddress: '0x3e7FcC64544A4582095d0b0e6cC19bf80CC21d2C',
        },
        setRoundData: {
          data: parseUnits('1.14588944', 8),
        },
        pauseFunctions: {
          redemptionVaultSwapper: ['redeemFiatRequest'],
          depositVault: ['depositRequest', 'depositRequestWithCustomRecipient'],
        },
      },
    },
    [chainIds.main]: {
      dv: {
        type: 'REGULAR',
        enableSanctionsList: true,
        feeReceiver: '0x11296dF1958dB19643f288a58951F07c8A2C9932',
        tokensReceiver: '0xf65d504A0afb5B19b40F26D1315a8A4E2b4966E8',
        instantDailyLimit: constants.MaxUint256,
        instantFee: parseUnits('0', 2),
        variationTolerance: parseUnits('0.4', 2),
        minMTokenAmountForFirstDeposit: parseUnits('0', 18),
        maxSupplyCap: constants.MaxUint256,
      },
      rvSwapper: {
        type: 'SWAPPER',
        feeReceiver: '0x0461bD693caE49bE9d030E5c212e080F9c78B846',
        tokensReceiver: '0xf65d504A0afb5B19b40F26D1315a8A4E2b4966E8',
        requestRedeemer: '0x4Fc7031e4400DeB6053Eed653a8f186fc227Bca2',
        instantDailyLimit: constants.MaxUint256,
        instantFee: parseUnits('0.5', 2),
        variationTolerance: parseUnits('0.4', 2),
        liquidityProvider: '0x0461bD693caE49bE9d030E5c212e080F9c78B846',
        enableSanctionsList: true,
        swapperVault: {
          mToken: 'mTBILL',
          redemptionVaultType: 'redemptionVaultUstb',
        },
      },
      postDeploy: {
        layerZero: {
          delegate: '0xB60842E9DaBCd1C52e354ac30E82a97661cB7E89',
          owner: '0xB60842E9DaBCd1C52e354ac30E82a97661cB7E89',
          rateLimitConfig: {
            default: {
              limit: parseUnits('2000000', 18),
              window: 86400,
            },
          },
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
                  token: 'usds',
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
          tokenManagerAddress: '0xc0722e656796EDa9aE701eAd6d48e89b30460a72',
          vaultsManagerAddress: '0x2ACB4BdCbEf02f81BF713b696Ac26390d7f79A12',
          oracleManagerAddress: '0x3e7FcC64544A4582095d0b0e6cC19bf80CC21d2C',
        },
        setRoundData: {
          data: parseUnits('1', 8),
        },
        pauseFunctions: {
          redemptionVaultSwapper: ['redeemFiatRequest'],
          depositVault: ['depositRequest', 'depositRequestWithCustomRecipient'],
        },
      },
    },
  },
};
