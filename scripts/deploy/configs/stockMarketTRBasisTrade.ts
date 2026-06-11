import { constants } from 'ethers';
import { parseUnits } from 'ethers/lib/utils';

import { chainIds } from '../../../config';
import { DeploymentConfig } from '../common/types';

export const stockMarketTRBasisTradeDeploymentConfig: DeploymentConfig = {
  genericConfigs: {
    customAggregator: {
      maxAnswerDeviation: parseUnits('0.36', 8),
      description: 'stockMarketTRBasisTrade/USD',
    },
    dataFeed: {},
  },
  networkConfigs: {
    [chainIds.main]: {
      dv: {
        type: 'REGULAR',
        enableSanctionsList: true,
        feeReceiver: '0xD5c9ddb4Cda947cDA22EDb3D59Fa567c22bD3731',
        tokensReceiver: '0x23bFeD1b4317937A5e48aD3c25d76258424fB154',
        instantDailyLimit: constants.MaxUint256,
        instantFee: parseUnits('0', 2),
        variationTolerance: parseUnits('0.5', 2),
        minMTokenAmountForFirstDeposit: parseUnits('0', 18),
        maxSupplyCap: constants.MaxUint256,
      },
      rvSwapper: {
        type: 'SWAPPER',
        feeReceiver: '0x23bFeD1b4317937A5e48aD3c25d76258424fB154',
        tokensReceiver: '0x23bFeD1b4317937A5e48aD3c25d76258424fB154',
        requestRedeemer: '0x6b6741a3de1E0D627B70Ca840f541FCDB48eD07c',
        instantDailyLimit: parseUnits('100000', 18),
        instantFee: parseUnits('0.5', 2),
        variationTolerance: parseUnits('0.5', 2),
        liquidityProvider: 'dummy',
        enableSanctionsList: true,
        swapperVault: 'dummy',
        minAmount: parseUnits('1', 18),
        fiatFlatFee: parseUnits('30', 18),
        fiatAdditionalFee: parseUnits('0.1', 2),
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
          tokenManagerAddress: '0x9bA8C38Ae60E6e6311D53f8a85E5CF4004d3c987',
          vaultsManagerAddress: '0x2ACB4BdCbEf02f81BF713b696Ac26390d7f79A12',
          oracleManagerAddress: '0xcB295AD952138b4CFa290D3C3d71119dec19d36f',
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
