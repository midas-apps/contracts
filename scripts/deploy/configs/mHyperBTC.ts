import { constants } from 'ethers';
import { parseUnits } from 'ethers/lib/utils';

import { chainIds } from '../../../config';
import { DeploymentConfig } from '../common/types';

export const mHyperBTCDeploymentConfig: DeploymentConfig = {
  genericConfigs: {
    customAggregator: {
      maxAnswerDeviation: parseUnits('0.2', 8),
      description: 'mHyperBTC/BTC',
    },
    dataFeed: {},
  },
  networkConfigs: {
    [chainIds.main]: {
      dv: {
        type: 'REGULAR',
        enableSanctionsList: true,
        feeReceiver: '0x1e7da1309018c91dF9D35593a442D975A5bbA981',
        tokensReceiver: '0xa8b7D4D08551dBEB9781296628D5e4e2C575d29C',
        instantDailyLimit: parseUnits('300', 18),
        instantFee: parseUnits('0', 2),
        variationTolerance: parseUnits('0.2', 2),
        minMTokenAmountForFirstDeposit: parseUnits('30', 18),
        maxSupplyCap: parseUnits('500', 18),
      },
      rvSwapper: {
        type: 'SWAPPER',
        feeReceiver: '0x933aDeDd85824dA75ec8a334a7907e69e7c02833',
        tokensReceiver: '0xa8b7D4D08551dBEB9781296628D5e4e2C575d29C',
        requestRedeemer: '0x9d354Ddbb65083540048c019B7c7743c5a877eB7',
        instantDailyLimit: parseUnits('50', 18),
        instantFee: parseUnits('0.3', 2),
        variationTolerance: parseUnits('0.2', 2),
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
                  allowance: parseUnits('500', 18),
                },
                {
                  token: 'wbtc',
                  allowance: parseUnits('500', 18),
                },
              ],
              type: 'depositVault',
            },
            {
              paymentTokens: [
                {
                  token: 'cbbtc',
                  allowance: parseUnits('500', 18),
                },
                {
                  token: 'wbtc',
                  allowance: parseUnits('500', 18),
                },
              ],
              type: 'redemptionVaultSwapper',
            },
          ],
        },
        grantRoles: {
          tokenManagerAddress: '0x8D5CcA2b1A7Fc79505dBC5d42BF1b0B33f7144Ef',
          vaultsManagerAddress: '0x2ACB4BdCbEf02f81BF713b696Ac26390d7f79A12',
          oracleManagerAddress: '0x40468649412585665ad1B756261BB30D768a0956',
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
