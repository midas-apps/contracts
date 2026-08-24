import { constants } from 'ethers';
import { parseUnits } from 'ethers/lib/utils';

import { chainIds } from '../../../config';
import { DeploymentConfig } from '../common/types';

export const mArbBTCDeploymentConfig: DeploymentConfig = {
  genericConfigs: {
    customAggregator: {
      maxAnswerDeviation: parseUnits('0.66', 8),
      description: 'mArbBTC/BTC',
    },
    dataFeed: {
      minAnswer: parseUnits('0.9', 8),
      maxAnswer: parseUnits('1.05', 8),
      healthyDiff: 2592000,
    },
  },
  networkConfigs: {
    [chainIds.main]: {
      dv: {
        type: 'REGULAR',
        enableSanctionsList: true,
        feeReceiver: '0x05910782C56b98c19C1682C192505b3ee9336126',
        tokensReceiver: '0xC9c2722d69B678b5a11C75533f21cD2bf4284D95',
        instantDailyLimit: constants.MaxUint256,
        instantFee: parseUnits('0', 2),
        variationTolerance: parseUnits('1', 2),
        minAmount: parseUnits('0.00001', 18),
        minMTokenAmountForFirstDeposit: parseUnits('0', 18),
        maxSupplyCap: constants.MaxUint256,
      },
      rvSwapper: {
        type: 'SWAPPER',
        feeReceiver: '0x05910782C56b98c19C1682C192505b3ee9336126',
        tokensReceiver: '0xC9c2722d69B678b5a11C75533f21cD2bf4284D95',
        requestRedeemer: '0x81a08836c6062A46b91D676c4A9C0F008dCD94ec',
        instantDailyLimit: constants.MaxUint256,
        instantFee: parseUnits('0.3', 2),
        variationTolerance: parseUnits('1', 2),
        minAmount: parseUnits('0.00001', 18),
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
                  token: 'wbtc',
                  allowance: parseUnits('10000', 18),
                  fee: 0,
                },
                {
                  token: 'cbbtc',
                  allowance: parseUnits('10000', 18),
                  fee: 0,
                },
              ],
              type: 'depositVault',
            },
            {
              paymentTokens: [
                {
                  token: 'wbtc',
                  allowance: parseUnits('10000', 18),
                  fee: 0,
                },
                {
                  token: 'cbbtc',
                  allowance: parseUnits('10000', 18),
                  fee: 0,
                },
              ],
              type: 'redemptionVaultSwapper',
            },
          ],
        },
        grantRoles: {
          tokenManagerAddress: '0xD48163b5418b5ed387641cb0ea6a54859040dCd1',
          vaultsManagerAddress: '0x2ACB4BdCbEf02f81BF713b696Ac26390d7f79A12',
          oracleManagerAddress: '0x19Fa1d28Dfa0f94A00F97fa56B10C9C7471B7E6C',
        },
        greenlist: {
          depositVault: true,
          redemptionVaultSwapper: true,
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
