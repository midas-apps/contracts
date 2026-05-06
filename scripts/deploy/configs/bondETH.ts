import { hours } from '@nomicfoundation/hardhat-network-helpers/dist/src/helpers/time/duration';
import { constants } from 'ethers';
import { parseUnits } from 'ethers/lib/utils';

import { chainIds } from '../../../config';
import { DeploymentConfig } from '../common/types';

export const bondETHDeploymentConfig: DeploymentConfig = {
  genericConfigs: {
    customAggregator: {
      maxAnswerDeviation: parseUnits('0.15', 8),
      description: 'bondETH/ETH',
    },
    dataFeed: {},
  },
  networkConfigs: {
    [chainIds.main]: {
      dv: {
        type: 'REGULAR',
        enableSanctionsList: true,
        feeReceiver: '0x05711105E9EB146bD846CFb96A955D66DE14c62B',
        tokensReceiver: '0x46a545eB1333e05A74F1d78E3cd4e31901bB57ea',
        instantDailyLimit: constants.MaxUint256,
        instantFee: parseUnits('0', 2),
        variationTolerance: parseUnits('0.2', 2),
        minMTokenAmountForFirstDeposit: parseUnits('0', 18),
        maxSupplyCap: constants.MaxUint256,
      },
      rvSwapper: {
        type: 'SWAPPER',
        feeReceiver: '0x371d0b4F4B629168B1D74306b42298D8F5498684',
        tokensReceiver: '0x46a545eB1333e05A74F1d78E3cd4e31901bB57ea',
        requestRedeemer: '0x6FFfCD42CAaF356ED109fC1e94552DBFd501F8e7',
        instantDailyLimit: parseUnits('50', 18),
        instantFee: parseUnits('0.3', 2),
        variationTolerance: parseUnits('0.2', 2),
        liquidityProvider: 'dummy',
        enableSanctionsList: true,
        swapperVault: 'dummy',
        minAmount: parseUnits('0.0005', 18),
      },
      postDeploy: {
        addPaymentTokens: {
          vaults: [
            {
              paymentTokens: [
                {
                  token: 'weth',
                  allowance: parseUnits('500000', 18),
                },
                {
                  token: 'wsteth',
                  allowance: parseUnits('100000', 18),
                  isStable: false,
                },
              ],
              type: 'depositVault',
            },
            {
              paymentTokens: [
                {
                  token: 'weth',
                  allowance: parseUnits('500000', 18),
                },
                {
                  token: 'wsteth',
                  allowance: parseUnits('100000', 18),
                  isStable: false,
                },
              ],
              type: 'redemptionVaultSwapper',
            },
          ],
        },
        grantRoles: {
          tokenManagerAddress: '0xAdDBE833B198E503ED2b5E64F8C2871D36b54b18',
          vaultsManagerAddress: '0x2ACB4BdCbEf02f81BF713b696Ac26390d7f79A12',
          oracleManagerAddress: '0x5EE3E4E43d77Ddf6676488c756C810787C2134cc',
        },
        setRoundData: {
          data: parseUnits('1', 8),
        },
        pauseFunctions: {
          depositVault: ['depositRequest', 'depositRequestWithCustomRecipient'],
          redemptionVaultSwapper: ['redeemFiatRequest'],
        },
        layerZero: {
          delegate: '0xB60842E9DaBCd1C52e354ac30E82a97661cB7E89',
          rateLimitConfig: {
            overrides: {
              zerog: {
                limit: parseUnits('100000'),
                window: hours(24),
              },
            },
          },
        },
      },
    },
    [chainIds.zerog]: {
      postDeploy: {
        grantRoles: {
          tokenManagerAddress: '0xAdDBE833B198E503ED2b5E64F8C2871D36b54b18',
          vaultsManagerAddress: '0x2ACB4BdCbEf02f81BF713b696Ac26390d7f79A12',
          oracleManagerAddress: '0x5EE3E4E43d77Ddf6676488c756C810787C2134cc',
        },
        setRoundData: {
          data: parseUnits('1', 8),
        },
        layerZero: {
          delegate: '0xB60842E9DaBCd1C52e354ac30E82a97661cB7E89',
          rateLimitConfig: {
            overrides: {
              main: {
                limit: parseUnits('100000'),
                window: hours(24),
              },
            },
          },
        },
      },
    },
  },
};
