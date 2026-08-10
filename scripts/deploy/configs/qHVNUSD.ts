import { constants } from 'ethers';
import { parseUnits } from 'ethers/lib/utils';

import { chainIds } from '../../../config';
import { DeploymentConfig } from '../common/types';

export const qHVNUSDDeploymentConfig: DeploymentConfig = {
  genericConfigs: {
    customAggregator: {
      maxAnswerDeviation: parseUnits('0.22', 8),
      description: 'QHVN-USD/USD',
    },
    dataFeed: {},
  },
  networkConfigs: {
    [chainIds.main]: {
      dv: {
        type: 'REGULAR',
        enableSanctionsList: true,
        feeReceiver: '0x25Fc583A201B170bFcE1C93f97DFD69FF7F4aae2',
        tokensReceiver: '0x2412dC2391808AB8782D552449913eCe979cA770',
        instantDailyLimit: constants.MaxUint256,
        instantFee: parseUnits('0', 2),
        variationTolerance: parseUnits('0.3', 2),
        minMTokenAmountForFirstDeposit: parseUnits('0', 18),
        maxSupplyCap: parseUnits('25000000', 18),
      },
      rvSwapper: {
        type: 'SWAPPER',
        feeReceiver: '0x25Fc583A201B170bFcE1C93f97DFD69FF7F4aae2',
        tokensReceiver: '0x2412dC2391808AB8782D552449913eCe979cA770',
        requestRedeemer: '0x2412dC2391808AB8782D552449913eCe979cA770',
        instantDailyLimit: parseUnits('1000000', 18),
        instantFee: parseUnits('0.3', 2),
        variationTolerance: parseUnits('0.3', 2),
        liquidityProvider: 'dummy',
        enableSanctionsList: true,
        swapperVault: 'dummy',
        minAmount: parseUnits('1', 18),
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
                {
                  token: 'dai',
                  allowance: parseUnits('1000000000', 18),
                },
                {
                  token: 'usds',
                  allowance: parseUnits('1000000000', 18),
                },
                {
                  token: 'susde',
                  allowance: parseUnits('200000', 18),
                  isStable: false,
                },
                {
                  token: 'usde',
                  allowance: parseUnits('500000', 18),
                },
                {
                  token: 'rlusd',
                  allowance: parseUnits('500000', 18),
                },
                {
                  token: 'usdg',
                  allowance: parseUnits('500000', 18),
                },
                {
                  token: 'pyusd',
                  allowance: parseUnits('500000', 18),
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
              ],
              type: 'redemptionVaultSwapper',
            },
          ],
        },
        grantRoles: {
          tokenManagerAddress: '0xb5CcD8dC8082467849eE008d4242f7b3b569EF05',
          vaultsManagerAddress: '0x2ACB4BdCbEf02f81BF713b696Ac26390d7f79A12',
          oracleManagerAddress: '0xb1378364cC61C93dc67aa85EfcE3Cf254480FE05',
        },
        setRoundData: {
          data: parseUnits('1', 8),
        },
        greenlist: {
          depositVault: true,
          redemptionVaultSwapper: true,
        },
        pauseFunctions: {
          depositVault: ['depositRequest', 'depositRequestWithCustomRecipient'],
          redemptionVaultSwapper: ['redeemFiatRequest'],
        },
      },
    },
  },
};
