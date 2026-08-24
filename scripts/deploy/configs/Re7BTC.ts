import { constants } from 'ethers';
import { parseUnits } from 'ethers/lib/utils';

import { chainIds } from '../../../config';
import { DeploymentConfig } from '../common/types';

export const Re7BTCDeploymentConfig: DeploymentConfig = {
  genericConfigs: {
    customAggregator: {
      maxAnswerDeviation: parseUnits('0.07', 8),
      description: 'Re7BTC/BTC',
    },
    dataFeed: {
      minAnswer: parseUnits('0.9', 8),
      maxAnswer: parseUnits('1.04', 8),
      healthyDiff: 2592000,
    },
  },
  networkConfigs: {
    [chainIds.main]: {
      dv: {
        type: 'REGULAR',
        enableSanctionsList: true,
        feeReceiver: '0x31aa73cF33A3B400c07661d8a87439ef1A334F00',
        tokensReceiver: '0xfb748A8DcDf0D9292AF50F38330dAD6c108D04c6',
        instantDailyLimit: constants.MaxUint256,
        instantFee: parseUnits('0', 2),
        variationTolerance: parseUnits('0.8', 2),
        minAmount: parseUnits('0.000015', 18),
        minMTokenAmountForFirstDeposit: parseUnits('0', 18),
        maxSupplyCap: constants.MaxUint256,
      },
      rvSwapper: {
        type: 'SWAPPER',
        feeReceiver: '0x31aa73cF33A3B400c07661d8a87439ef1A334F00',
        tokensReceiver: '0xfb748A8DcDf0D9292AF50F38330dAD6c108D04c6',
        requestRedeemer: '0x16D466fccC2CF5fbaCc838d21677ba22Ed021318',
        instantDailyLimit: parseUnits('200', 18),
        instantFee: parseUnits('0.3', 2),
        variationTolerance: parseUnits('0.8', 2),
        minAmount: parseUnits('0.000015', 18),
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
                  allowance: parseUnits('15000', 18),
                  fee: 0,
                },
                {
                  token: 'cbbtc',
                  allowance: parseUnits('15000', 18),
                  fee: 0,
                },
                {
                  token: 'tbtc',
                  allowance: parseUnits('15000', 18),
                  fee: 0,
                },
              ],
              type: 'depositVault',
            },
            {
              paymentTokens: [
                {
                  token: 'wbtc',
                  allowance: parseUnits('15000', 18),
                  fee: 0,
                },
              ],
              type: 'redemptionVaultSwapper',
            },
          ],
        },
        grantRoles: {
          tokenManagerAddress: '0x329Da2FdE152ecfAb028a8277186bCD744e06717',
          vaultsManagerAddress: '0x2ACB4BdCbEf02f81BF713b696Ac26390d7f79A12',
          oracleManagerAddress: '0xFC6f39B4228C6601B180520b80284227975Bdfd6',
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
