import { hours } from '@nomicfoundation/hardhat-network-helpers/dist/src/helpers/time/duration';
import { constants } from 'ethers';
import { parseUnits } from 'ethers/lib/utils';

import { chainIds } from '../../../config';
import { DeploymentConfig } from '../common/types';

export const mHYPERDeploymentConfig: DeploymentConfig = {
  genericConfigs: {
    customAggregator: {
      minAnswer: parseUnits('0.1', 8),
      maxAnswer: parseUnits('1000', 8),
      maxAnswerDeviation: parseUnits('0.35', 8),
      description: 'mHYPER/USD',
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
        feeReceiver: '0xee67Ec0e51dDd154C0cd904A326822e3F31586F3',
        tokensReceiver: '0xF356c5e9F69DaDB332Bb098C7Ed960Db1d3376DD',
        instantDailyLimit: parseUnits('10000000'),
        instantFee: parseUnits('0', 2),
        minMTokenAmountForFirstDeposit: parseUnits('0'),
        minAmount: parseUnits('0'),
        variationTolerance: parseUnits('0.65', 2),
        enableSanctionsList: true,
      },
      rvSwapper: {
        type: 'SWAPPER',
        feeReceiver: '0x0461bD693caE49bE9d030E5c212e080F9c78B846',
        tokensReceiver: '0xF356c5e9F69DaDB332Bb098C7Ed960Db1d3376DD',
        instantDailyLimit: parseUnits('100000'),
        instantFee: parseUnits('0.5', 2),
        minAmount: parseUnits('0'),
        variationTolerance: parseUnits('0.65', 2),
        fiatAdditionalFee: parseUnits('0.1', 2),
        fiatFlatFee: parseUnits('30'),
        minFiatRedeemAmount: parseUnits('1000'),
        requestRedeemer: '0xA4fC2c65643b67fFDbf5cb0b528A10E771F1F159',
        liquidityProvider: '0x0461bD693caE49bE9d030E5c212e080F9c78B846',
        swapperVault: {
          mToken: 'mTBILL',
          redemptionVaultType: 'redemptionVaultBuidl',
        },
        enableSanctionsList: true,
      },
      postDeploy: {
        layerZero: {
          delegate: '0xB60842E9DaBCd1C52e354ac30E82a97661cB7E89',
          rateLimitConfig: {
            default: {
              limit: parseUnits('10000'),
              window: hours(24),
            },
          },
        },
      },
    },
    [chainIds.plasma]: {
      dv: {
        type: 'REGULAR',
        enableSanctionsList: false,
        feeReceiver: '0xee67Ec0e51dDd154C0cd904A326822e3F31586F3',
        tokensReceiver: '0xF356c5e9F69DaDB332Bb098C7Ed960Db1d3376DD',
        instantDailyLimit: constants.MaxUint256,
        instantFee: parseUnits('0', 2),
        variationTolerance: parseUnits('0.65', 2),
        minMTokenAmountForFirstDeposit: parseUnits('0', 18),
        maxSupplyCap: constants.MaxUint256,
      },
      rvSwapper: {
        type: 'SWAPPER',
        feeReceiver: '0x68e7E72938db36a5CBbCa7b52c71DBBaaDfB8264',
        tokensReceiver: '0xF356c5e9F69DaDB332Bb098C7Ed960Db1d3376DD',
        requestRedeemer: '0xA4fC2c65643b67fFDbf5cb0b528A10E771F1F159',
        instantDailyLimit: constants.MaxUint256,
        instantFee: parseUnits('0.5', 2),
        variationTolerance: parseUnits('0.65', 2),
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
                  token: 'usdt0',
                  allowance: parseUnits('1000000000', 18),
                },
              ],
              type: 'depositVault',
            },
            {
              paymentTokens: [
                {
                  token: 'usdt0',
                  allowance: parseUnits('1000000000', 18),
                },
              ],
              type: 'redemptionVaultSwapper',
            },
          ],
        },
        grantRoles: {
          tokenManagerAddress: '0x5683de280d0C3967fBa2f04D707FA1eF5A044e25',
          vaultsManagerAddress: '0x2ACB4BdCbEf02f81BF713b696Ac26390d7f79A12',
          oracleManagerAddress: '0xd1E01471F3e1002d4eEC1b39b7DBD7aff952A99F',
        },
        setRoundData: {
          data: parseUnits('1', 8),
        },
        layerZero: {
          delegate: '0xB60842E9DaBCd1C52e354ac30E82a97661cB7E89',
          rateLimitConfig: {
            default: {
              limit: parseUnits('10000'),
              window: hours(24),
            },
          },
        },
      },
    },
    [chainIds.monad]: {
      postDeploy: {
        grantRoles: {
          tokenManagerAddress: '0x5683de280d0C3967fBa2f04D707FA1eF5A044e25',
          vaultsManagerAddress: '0x2ACB4BdCbEf02f81BF713b696Ac26390d7f79A12',
          oracleManagerAddress: '0xd1E01471F3e1002d4eEC1b39b7DBD7aff952A99F',
        },
        setRoundData: {
          data: parseUnits('1.06921735', 8), // price from 2026-01-13
        },
        layerZero: {
          delegate: '0xB60842E9DaBCd1C52e354ac30E82a97661cB7E89',
          rateLimitConfig: {
            default: {
              limit: parseUnits('10000'),
              window: hours(24),
            },
          },
        },
      },
    },
  },
};
