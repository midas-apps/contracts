import { constants } from 'ethers';
import { parseUnits } from 'ethers/lib/utils';

import { chainIds } from '../../../config';
import { DeploymentConfig } from '../common/types';

export const carryTradeUSDTRYLeverageDeploymentConfig: DeploymentConfig = {
  genericConfigs: {
    customAggregator: {
      maxAnswerDeviation: parseUnits('0.82', 8),
      description: 'carryTradeUSDTRYLeverage/USD',
    },
    dataFeed: {},
  },
  networkConfigs: {
    [chainIds.main]: {
      dv: {
        type: 'REGULAR',
        enableSanctionsList: true,
        feeReceiver: '0xAb32ACeA53027C2ED53752e117b0B78fcCB8f602',
        tokensReceiver: '0x1BBa138610729E55D56eb27B07f09b8a9c1c9195',
        instantDailyLimit: constants.MaxUint256,
        instantFee: parseUnits('0', 2),
        variationTolerance: parseUnits('1.2', 2),
        minMTokenAmountForFirstDeposit: parseUnits('0', 18),
        maxSupplyCap: constants.MaxUint256,
      },
      rvSwapper: {
        type: 'SWAPPER',
        feeReceiver: '0x1BBa138610729E55D56eb27B07f09b8a9c1c9195',
        tokensReceiver: '0x1BBa138610729E55D56eb27B07f09b8a9c1c9195',
        requestRedeemer: '0xf7A5ff87Cbf4a98C177f6245AC8313eDDCb3CC9C',
        instantDailyLimit: parseUnits('100000', 18),
        instantFee: parseUnits('1.1', 2),
        variationTolerance: parseUnits('1.2', 2),
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
          tokenManagerAddress: '0xB5a2514eD0F6Cc2CD22b92bFfe49ED45EFE23882',
          vaultsManagerAddress: '0x2ACB4BdCbEf02f81BF713b696Ac26390d7f79A12',
          oracleManagerAddress: '0xf2e018680E796e23CAe893da8b982575627343ac',
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
