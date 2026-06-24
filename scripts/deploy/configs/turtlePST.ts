import { constants } from 'ethers';
import { parseUnits } from 'ethers/lib/utils';

import { chainIds } from '../../../config';
import { DeploymentConfig } from '../common/types';

export const turtlePSTDeploymentConfig: DeploymentConfig = {
  genericConfigs: {
    customAggregator: {
      maxAnswerDeviation: parseUnits('0.33', 8),
      description: 'turtlePST/USD',
    },
    dataFeed: {},
  },
  networkConfigs: {
    [chainIds.main]: {
      dv: {
        type: 'REGULAR',
        enableSanctionsList: true,
        feeReceiver: '0x5bC1de8d79180F29b1F329FD4b29550f9E12c2A2',
        tokensReceiver: '0x157f11a8fE34d35560823d3caf1238C30AB5c9F7',
        instantDailyLimit: constants.MaxUint256,
        instantFee: parseUnits('0', 2),
        variationTolerance: parseUnits('0.4', 2),
        minAmount: parseUnits('0', 18),
        minMTokenAmountForFirstDeposit: parseUnits('0', 18),
        maxSupplyCap: constants.MaxUint256,
      },
      rvSwapper: {
        type: 'SWAPPER',
        feeReceiver: '0x157f11a8fE34d35560823d3caf1238C30AB5c9F7',
        tokensReceiver: '0x157f11a8fE34d35560823d3caf1238C30AB5c9F7',
        requestRedeemer: '0x4d19aD82cDB7efc7cafE253b5997A5940487B940',
        instantDailyLimit: parseUnits('10000000', 18),
        instantFee: parseUnits('0.5', 2),
        variationTolerance: parseUnits('0.4', 2),
        minAmount: parseUnits('1', 18),
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
          tokenManagerAddress: '0xC8193468B0fE387af7E83792fBCcdbcc535305Cb',
          vaultsManagerAddress: '0x2ACB4BdCbEf02f81BF713b696Ac26390d7f79A12',
          oracleManagerAddress: '0x41c43157Af04960E7dB11286A50f458A27EA8B0f',
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
