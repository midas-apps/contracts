import { hours } from '@nomicfoundation/hardhat-network-helpers/dist/src/helpers/time/duration';
import { constants } from 'ethers';
import { parseUnits } from 'ethers/lib/utils';

import { chainIds } from '../../../config';
import { DeploymentConfig } from '../common/types';

export const obeatUSDDeploymentConfig: DeploymentConfig = {
  genericConfigs: {
    customAggregator: {
      maxAnswerDeviation: parseUnits('0.35', 8),
      description: 'obeatUSD/USD',
    },
    dataFeed: {},
  },
  networkConfigs: {
    [chainIds.hyperevm]: {
      dv: {
        type: 'REGULAR',
        enableSanctionsList: false,
        feeReceiver: '0x16473e6bF7f74BBD221Ba17E121402679925d6c4',
        tokensReceiver: '0x05eBE35A9E0Bc4Fe4eE8fd8334aFC64FDBD66817',
        instantDailyLimit: constants.MaxUint256,
        instantFee: parseUnits('0', 2),
        variationTolerance: parseUnits('0.6', 2),
      },
      rvSwapper: {
        type: 'SWAPPER',
        feeReceiver: '0x563a417827Fa582A8fCd0575c39ef9ca475475bD',
        tokensReceiver: '0x05eBE35A9E0Bc4Fe4eE8fd8334aFC64FDBD66817',
        requestRedeemer: '0x3d36248bcE96DBF8E64338b054d24773B5607085',
        instantDailyLimit: constants.MaxUint256,
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
          tokenManagerAddress: '0x081bb8aD7F452f916991C17fDFa64D4A25153169',
          vaultsManagerAddress: '0x2ACB4BdCbEf02f81BF713b696Ac26390d7f79A12',
          oracleManagerAddress: '0x94F0c5beb7906d78105241fBc2073E181F88F50A',
        },
        setRoundData: {
          data: parseUnits('1', 8),
        },
        pauseFunctions: {
          redemptionVaultSwapper: ['redeemFiatRequest'],
        },
        layerZero: {
          delegate: '0xa0819ae43115420beb161193b8D8Ba64C9f9faCC',
          rateLimitConfig: {
            default: {
              limit: parseUnits('1000000'),
              window: hours(1),
            },
          },
        },
      },
    },
    [chainIds.main]: {
      postDeploy: {
        grantRoles: {
          tokenManagerAddress: '0x081bb8aD7F452f916991C17fDFa64D4A25153169',
          vaultsManagerAddress: '0x2ACB4BdCbEf02f81BF713b696Ac26390d7f79A12',
          oracleManagerAddress: '0x94F0c5beb7906d78105241fBc2073E181F88F50A',
        },
        layerZero: {
          delegate: '0xa0819ae43115420beb161193b8D8Ba64C9f9faCC',
          rateLimitConfig: {
            default: {
              limit: parseUnits('1000000'),
              window: hours(1),
            },
          },
        },
      },
    },
  },
};
