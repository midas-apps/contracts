import { hours } from '@nomicfoundation/hardhat-network-helpers/dist/src/helpers/time/duration';
import { constants } from 'ethers';
import { parseUnits } from 'ethers/lib/utils';

import { chainIds } from '../../../config';
import { DeploymentConfig } from '../common/types';

export const liquidHYPEDeploymentConfig: DeploymentConfig = {
  genericConfigs: {
    customAggregator: {
      minAnswer: parseUnits('0.1', 8),
      maxAnswer: parseUnits('1000', 8),
      maxAnswerDeviation: parseUnits('0.12', 8),
      description: 'liquidHYPE/HYPE',
    },
    dataFeed: {
      minAnswer: parseUnits('0.1', 8),
      maxAnswer: parseUnits('1000', 8),
      healthyDiff: 2592000,
    },
  },
  networkConfigs: {
    [chainIds.hyperevm]: {
      dv: {
        feeReceiver: '0x3E4678a7742d4D703F3894922CF08d6E8ff9c1D8',
        tokensReceiver: '0xFC1286EeddF81d6955eDAd5C8D99B8Aa32F3D2AA',
        instantDailyLimit: parseUnits('2500000'),
        instantFee: parseUnits('0', 2),
        minMTokenAmountForFirstDeposit: parseUnits('0'),
        minAmount: parseUnits('0'),
        variationTolerance: parseUnits('0.10', 2),
      },
      rvSwapper: {
        type: 'SWAPPER',
        feeReceiver: '0x83A80e5b64086197c01cbB123dF2AEa79a149C1D',
        tokensReceiver: '0xFC1286EeddF81d6955eDAd5C8D99B8Aa32F3D2AA',
        instantDailyLimit: parseUnits('2500000'),
        instantFee: parseUnits('0.2', 2),
        minAmount: parseUnits('0'),
        variationTolerance: parseUnits('0.14', 2),
        fiatAdditionalFee: parseUnits('0.1', 2),
        fiatFlatFee: parseUnits('30'),
        minFiatRedeemAmount: parseUnits('1000'),
        requestRedeemer: '0xF47CB913cc80096F84a6Ced24e1ccd047c954cBE',
        liquidityProvider: 'dummy',
        swapperVault: 'dummy',
      },
      postDeploy: {
        layerZero: {
          delegate: '0xF9e3295DBf89CF0Bf1344a3010CE96d026579BBb',
          rateLimitConfig: {
            default: {
              limit: parseUnits('10000'),
              window: hours(24),
            },
          },
        },
      },
    },
    [chainIds.scroll]: {
      dv: {
        type: 'REGULAR',
        enableSanctionsList: false,
        feeReceiver: '0x3E4678a7742d4D703F3894922CF08d6E8ff9c1D8',
        tokensReceiver: '0xFC1286EeddF81d6955eDAd5C8D99B8Aa32F3D2AA',
        instantDailyLimit: parseUnits('2500000', 18),
        instantFee: parseUnits('0', 2),
        variationTolerance: parseUnits('0.1', 2),
        minMTokenAmountForFirstDeposit: parseUnits('0', 18),
        maxSupplyCap: constants.MaxUint256,
      },
      rvSwapper: {
        type: 'SWAPPER',
        feeReceiver: '0x83A80e5b64086197c01cbB123dF2AEa79a149C1D',
        tokensReceiver: '0xFC1286EeddF81d6955eDAd5C8D99B8Aa32F3D2AA',
        requestRedeemer: '0xF47CB913cc80096F84a6Ced24e1ccd047c954cBE',
        instantDailyLimit: parseUnits('2500000', 18),
        instantFee: parseUnits('0.2', 2),
        variationTolerance: parseUnits('0.14', 2),
        liquidityProvider: 'dummy',
        enableSanctionsList: false,
        swapperVault: 'dummy',
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
        addPaymentTokens: {
          vaults: [
            {
              paymentTokens: [
                {
                  token: 'whype',
                  allowance: parseUnits('2500000', 18),
                },
                {
                  token: 'behype',
                  allowance: parseUnits('2500000', 18),
                  isStable: false,
                },
              ],
              type: 'depositVault',
            },
            {
              paymentTokens: [
                {
                  token: 'behype',
                  allowance: parseUnits('2500000', 18),
                  isStable: false,
                },
              ],
              type: 'redemptionVaultSwapper',
            },
          ],
        },
        grantRoles: {
          tokenManagerAddress: '0x6F4fC4BbFf4EA40e4B05033eD3eA80fb0A5Cc6b6',
          vaultsManagerAddress: '0x2ACB4BdCbEf02f81BF713b696Ac26390d7f79A12',
          oracleManagerAddress: '0xaE229A5296A2021cdc422316820fb0a4834329f7',
        },
        setRoundData: {
          data: parseUnits('1.00560374', 8), // price from 2025-11-03
        },
        pauseFunctions: {
          depositVault: ['depositRequest', 'depositRequestWithCustomRecipient'],
          redemptionVaultSwapper: ['redeemFiatRequest'],
        },
      },
    },
  },
};
