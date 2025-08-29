import { parseUnits } from 'ethers/lib/utils';

import { chainIds } from '../../../config';
import { DeploymentConfig } from '../common/types';

export const kmiUSDDeploymentConfig: DeploymentConfig = {
  genericConfigs: {
    customAggregator: {
      minAnswer: parseUnits('0.1', 8),
      maxAnswer: parseUnits('1000', 8),
      maxAnswerDeviation: parseUnits('0.4', 8),
      description: 'kmiUSD/miUSD',
    },
    dataFeed: {
      minAnswer: parseUnits('0.1', 8),
      maxAnswer: parseUnits('1000', 8),
      healthyDiff: 2592000,
    },
  },
  networkConfigs: {
    [chainIds.katana]: {
      dv: {
        feeReceiver: '0x4b99cE11E06908D460B12658d53Cd809e0c86EDE',
        tokensReceiver: '0xc2070fBF357B4Faa6D4d2512DFf7a02dAff4038C',
        instantDailyLimit: parseUnits('10000000'),
        instantFee: parseUnits('0', 2),
        minMTokenAmountForFirstDeposit: parseUnits('0'),
        minAmount: parseUnits('0'),
        variationTolerance: parseUnits('0.6', 2),
      },
      rvSwapper: {
        type: 'SWAPPER',
        feeReceiver: '0x96a352b3becbFBDE14e75A589D6211eB44A0beF1',
        tokensReceiver: '0xc2070fBF357B4Faa6D4d2512DFf7a02dAff4038C',
        instantDailyLimit: parseUnits('10000000'),
        instantFee: parseUnits('0.5', 2),
        minAmount: parseUnits('0'),
        variationTolerance: parseUnits('0.6', 2),
        fiatAdditionalFee: parseUnits('0.1', 2),
        fiatFlatFee: parseUnits('30'),
        minFiatRedeemAmount: parseUnits('1000'),
        requestRedeemer: '0xF204052E3773142Ec669C499534Af488B2db8119',
        liquidityProvider: 'dummy',
        swapperVault: 'dummy',
      },
      postDeploy: {
        grantRoles: {
          oracleManagerAddress: '0x39EC384dcE2caEf04fD0e0ce91E4495c881474be',
          tokenManagerAddress: '0x18802D7b24D4dd08d80216f59C3Af94392e572c2',
          vaultsManagerAddress: '0x2ACB4BdCbEf02f81BF713b696Ac26390d7f79A12',
        },
        setRoundData: {
          data: parseUnits('1', 8),
        },
        addPaymentTokens: {
          vaults: [
            {
              type: 'depositVault',
              paymentTokens: [
                {
                  token: 'miusd',
                  allowance: parseUnits('1000000000'),
                },
              ],
            },
            {
              type: 'redemptionVaultSwapper',
              paymentTokens: [
                {
                  token: 'miusd',
                  allowance: parseUnits('1000000000'),
                },
              ],
            },
          ],
        },
      },
    },
  },
};
