import { constants } from 'ethers';
import { parseUnits } from 'ethers/lib/utils';

import { chainIds } from '../../../config';
import { DeploymentConfig } from '../common/types';

export const bondBTCDeploymentConfig: DeploymentConfig = {
  genericConfigs: {
    customAggregator: {
      maxAnswerDeviation: parseUnits('0.13', 8),
      description: 'bondBTC/BTC',
    },
    dataFeed: {},
  },
  networkConfigs: {
    [chainIds.main]: {
      dv: {
        type: 'REGULAR',
        enableSanctionsList: true,
        feeReceiver: '0xeAe42B372C0dac9d20f853b6C323e641fE2e56D2',
        tokensReceiver: '0x8447b8D4F46057001B57A7eD182191B575EFa51A',
        instantDailyLimit: constants.MaxUint256,
        instantFee: parseUnits('0', 2),
        variationTolerance: parseUnits('0.1', 2),
        minMTokenAmountForFirstDeposit: parseUnits('0', 18),
        maxSupplyCap: constants.MaxUint256,
      },
      rvSwapper: {
        type: 'SWAPPER',
        feeReceiver: '0xE0798F8dB853f7C2cd8c6d1bf0126C5095B64cD8',
        tokensReceiver: '0x8447b8D4F46057001B57A7eD182191B575EFa51A',
        requestRedeemer: '0xf75E3350cA52C8d2B393Ef6938E5f87D1B27f721',
        instantDailyLimit: parseUnits('10', 18),
        instantFee: parseUnits('0.2', 2),
        variationTolerance: parseUnits('0.1', 2),
        liquidityProvider: 'dummy',
        enableSanctionsList: true,
        swapperVault: 'dummy',
        minAmount: parseUnits('0.00001', 18),
      },
      postDeploy: {
        addPaymentTokens: {
          vaults: [
            {
              paymentTokens: [
                {
                  token: 'wbtc',
                  allowance: parseUnits('200', 18),
                },
                {
                  token: 'cbbtc',
                  allowance: parseUnits('200', 18),
                },
              ],
              type: 'depositVault',
            },
            {
              paymentTokens: [
                {
                  token: 'wbtc',
                  allowance: parseUnits('200', 18),
                },
                {
                  token: 'cbbtc',
                  allowance: parseUnits('200', 18),
                },
              ],
              type: 'redemptionVaultSwapper',
            },
          ],
        },
        grantRoles: {
          tokenManagerAddress: '0x9f2B8F5428681afE68aB23205E279D02711Ca128',
          vaultsManagerAddress: '0x2ACB4BdCbEf02f81BF713b696Ac26390d7f79A12',
          oracleManagerAddress: '0x21f6cb488Df4784FaF2384474C394921B13F7a37',
        },
        setRoundData: {
          data: parseUnits('1', 8),
        },
        pauseFunctions: {
          depositVault: ['depositRequest', 'depositRequestWithCustomRecipient'],
          redemptionVaultSwapper: ['redeemFiatRequest'],
        },
      },
    },
    [chainIds.zerog]: {
      postDeploy: {
        grantRoles: {
          tokenManagerAddress: '0x9f2B8F5428681afE68aB23205E279D02711Ca128',
          vaultsManagerAddress: '0x2ACB4BdCbEf02f81BF713b696Ac26390d7f79A12',
          oracleManagerAddress: '0x21f6cb488Df4784FaF2384474C394921B13F7a37',
        },
        setRoundData: {
          data: parseUnits('1', 8),
        },
      },
    },
  },
};
