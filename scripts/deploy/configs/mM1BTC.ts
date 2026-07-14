import { constants } from 'ethers';
import { parseUnits } from 'ethers/lib/utils';

import { chainIds } from '../../../config';
import { DeploymentConfig } from '../common/types';

export const mM1BTCDeploymentConfig: DeploymentConfig = {
  genericConfigs: {
    customAggregator: {
      maxAnswerDeviation: parseUnits('0.66', 8),
      description: 'mM1BTC/BTC',
    },
    dataFeed: {},
  },
  networkConfigs: {
    [chainIds.main]: {
      dv: {
        type: 'REGULAR',
        enableSanctionsList: true,
        feeReceiver: '0x798465e9769fa376a964b00f29f73e811c963ca5',
        tokensReceiver: '0x4A2B47f3a1b4376A1206C2B0137c1C13F4d058ce',
        instantDailyLimit: constants.MaxUint256,
        instantFee: parseUnits('0', 2),
        variationTolerance: parseUnits('0.9', 2),
        minAmount: parseUnits('0', 18),
        minMTokenAmountForFirstDeposit: parseUnits('0', 18),
        maxSupplyCap: constants.MaxUint256,
      },
      rvSwapper: {
        type: 'SWAPPER',
        feeReceiver: '0x3136660613A558f0218379B220f283F2C17315d6',
        tokensReceiver: '0x4A2B47f3a1b4376A1206C2B0137c1C13F4d058ce',
        requestRedeemer: '0xB7a9C24a666FdE11d24F4f19E4199d6a9FB612B3',
        instantDailyLimit: constants.MaxUint256,
        instantFee: parseUnits('0.5', 2),
        variationTolerance: parseUnits('0.9', 2),
        minAmount: parseUnits('0', 18),
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
                  token: 'cbbtc',
                  allowance: parseUnits('1000', 18),
                },
                {
                  token: 'wbtc',
                  allowance: parseUnits('1000', 18),
                },
                {
                  token: 'tbtc',
                  allowance: parseUnits('1000', 18),
                },
              ],
              type: 'depositVault',
            },
            {
              paymentTokens: [
                {
                  token: 'cbbtc',
                  allowance: parseUnits('1000', 18),
                },
              ],
              type: 'redemptionVaultSwapper',
            },
          ],
        },
        grantRoles: {
          tokenManagerAddress: '0xEcA221776539bBfDDDB342BF14729840B20a976d',
          vaultsManagerAddress: '0x2ACB4BdCbEf02f81BF713b696Ac26390d7f79A12',
          oracleManagerAddress: '0x3E463F636E7835eb5cA840d0e50C7547743bcB85',
        },
        pauseFunctions: {
          depositVault: ['depositInstant', 'depositInstantWithCustomRecipient'],
          redemptionVaultSwapper: ['redeemFiatRequest'],
        },
        setRoundData: {
          data: parseUnits('1', 8),
        },
      },
    },
  },
};
