import { constants } from 'ethers';
import { parseUnits } from 'ethers/lib/utils';

import { chainIds } from '../../../config';
import { DeploymentConfig } from '../common/types';

export const liquidDeFiDeploymentConfig: DeploymentConfig = {
  genericConfigs: {
    customAggregator: {
      minAnswer: parseUnits('0.1', 8),
      maxAnswer: parseUnits('10', 8),
      maxAnswerDeviation: parseUnits('0.14', 8),
      description: 'liquidDeFi/USD',
    },
    dataFeed: {
      minAnswer: parseUnits('0.9', 8),
      maxAnswer: parseUnits('1.1', 8),
      healthyDiff: 2592000,
    },
  },
  networkConfigs: {
    [chainIds.optimism]: {
      dv: {
        type: 'REGULAR',
        enableSanctionsList: true,
        feeReceiver: '0x8112cD0171Ec0F476eE191B25d17B5a36A9C5fE5',
        tokensReceiver: '0xcE5E2D89b907Cdb8178Cb27c61c60251d00644f7',
        instantDailyLimit: constants.MaxUint256,
        instantFee: parseUnits('0', 2),
        variationTolerance: parseUnits('0.3', 2),
        minAmount: parseUnits('0', 18),
        minMTokenAmountForFirstDeposit: parseUnits('0', 18),
        maxSupplyCap: constants.MaxUint256,
      },
      rvSwapper: {
        type: 'SWAPPER',
        feeReceiver: '0x826DA79a1d269CCAeDA0b0A2820b278545214765',
        tokensReceiver: '0xcE5E2D89b907Cdb8178Cb27c61c60251d00644f7',
        requestRedeemer: '0x5099848Db2208d7a9968362ff01121d08539E059',
        instantDailyLimit: parseUnits('25000000', 18),
        instantFee: parseUnits('0.3', 2),
        variationTolerance: parseUnits('0.3', 2),
        minAmount: parseUnits('1', 18),
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
                  token: 'usdc',
                  allowance: parseUnits('1000000000', 18),
                  fee: 0,
                },
                {
                  token: 'usdt',
                  allowance: parseUnits('1000000000', 18),
                  fee: 0,
                },
                {
                  token: 'usdt0',
                  allowance: parseUnits('1000000000', 18),
                  fee: 0,
                },
              ],
              type: 'depositVault',
            },
            {
              paymentTokens: [
                {
                  token: 'usdc',
                  allowance: parseUnits('1000000000', 18),
                  fee: 0,
                },
                {
                  token: 'usdt',
                  allowance: parseUnits('1000000000', 18),
                  fee: 0,
                },
              ],
              type: 'redemptionVaultSwapper',
            },
          ],
        },
        grantRoles: {
          tokenManagerAddress: '0xEcCca655Fde97D5A26Bd24C7A697A9327563130C',
          vaultsManagerAddress: '0x2ACB4BdCbEf02f81BF713b696Ac26390d7f79A12',
          oracleManagerAddress: '0x81d11c0BC7fD1439a761b5d9358146a462DE93fe',
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
  },
};
