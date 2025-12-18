import { constants } from 'ethers';
import { parseUnits } from 'ethers/lib/utils';

import { chainIds } from '../../../config';
import { DeploymentConfig } from '../common/types';

export const liquidRESERVEDeploymentConfig: DeploymentConfig = {
  genericConfigs: {
    customAggregator: {
      maxAnswerDeviation: parseUnits('0.13', 8),
      description: 'liquidRESERVE/USD',
    },
    dataFeed: {},
  },
  networkConfigs: {
    [chainIds.scroll]: {
      dv: {
        type: 'REGULAR',
        enableSanctionsList: false,
        feeReceiver: '0xCaAa5012D9970A59B54daa68Ba63970e784A3b14',
        tokensReceiver: '0x5A8BFA4837FA9861F9d027d7fdC03d4964B09b51',
        instantDailyLimit: constants.MaxUint256,
        instantFee: parseUnits('0', 2),
        variationTolerance: parseUnits('0.2', 2),
        minMTokenAmountForFirstDeposit: parseUnits('0', 18),
        maxSupplyCap: constants.MaxUint256,
      },
      rvSwapper: {
        type: 'SWAPPER',
        feeReceiver: '0xfC55F922013Cf5bbDA1cF6e0aB2a9B3FF3088c63',
        tokensReceiver: '0x5A8BFA4837FA9861F9d027d7fdC03d4964B09b51',
        requestRedeemer: '0x47A6D842F32EC8005a9cdfCb0CFEc8Fe12276A42',
        instantDailyLimit: constants.MaxUint256,
        instantFee: parseUnits('0.2', 2),
        variationTolerance: parseUnits('0.2', 2),
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
          tokenManagerAddress: '0x5f8759f5916c59cE3Eace1f9681706E335b7D40b',
          vaultsManagerAddress: '0x2ACB4BdCbEf02f81BF713b696Ac26390d7f79A12',
          oracleManagerAddress: '0xe13bcC0b18642e6102C734fEBe1e50D855DFD0e6',
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
