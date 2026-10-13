import { constants } from 'ethers';
import { parseUnits } from 'ethers/lib/utils';

import { chainIds } from '../../../config';
import { DeploymentConfig } from '../common/types';

export const moriniBTCYieldDeploymentConfig: DeploymentConfig = {
  genericConfigs: {
    customAggregator: {
      minAnswer: parseUnits('0.1', 8),
      maxAnswer: parseUnits('1000', 8),
      maxAnswerDeviation: parseUnits('0.33', 8),
      description: 'moriniBTCYield/BTC',
    },
    dataFeed: {
      minAnswer: parseUnits('0.9', 8),
      maxAnswer: parseUnits('1.15', 8),
      healthyDiff: 2592000,
    },
  },
  networkConfigs: {
    [chainIds.main]: {
      dv: {
        type: 'REGULAR',
        enableSanctionsList: true,
        feeReceiver: '0x0b9C6e068FF34bB841eCb4C97Ca6Bdf89ef0EDd5',
        tokensReceiver: '0xa898b5B86083e833A9893343d34F01503Bb17DFb',
        instantDailyLimit: parseUnits('50', 18),
        instantFee: parseUnits('0', 2),
        variationTolerance: parseUnits('0.4', 2),
        minAmount: parseUnits('0', 18),
        minMTokenAmountForFirstDeposit: parseUnits('0', 18),
        maxSupplyCap: constants.MaxUint256,
      },
      rvSwapper: {
        type: 'SWAPPER',
        feeReceiver: '0xa898b5B86083e833A9893343d34F01503Bb17DFb',
        tokensReceiver: '0xa898b5B86083e833A9893343d34F01503Bb17DFb',
        requestRedeemer: '0xB5CD99879BBF11551fa4C58D6aDCcF8793E983b1',
        instantDailyLimit: parseUnits('10000000', 18),
        instantFee: parseUnits('0.5', 2),
        variationTolerance: parseUnits('0.4', 2),
        minAmount: parseUnits('0.000012', 18),
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
                  token: 'cbbtc',
                  allowance: parseUnits('10000', 18),
                  fee: 0,
                },
                {
                  token: 'cirbtc',
                  allowance: parseUnits('1000', 18),
                  fee: 0,
                },
              ],
              type: 'depositVault',
            },
            {
              paymentTokens: [
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
          tokenManagerAddress: '0x309453188f1Df8fEF2323807D20f4968F6d1D14C',
          vaultsManagerAddress: '0x2ACB4BdCbEf02f81BF713b696Ac26390d7f79A12',
          oracleManagerAddress: '0xF410c73A39FCb797C00b19F29cE3Bd291E5059D9',
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
