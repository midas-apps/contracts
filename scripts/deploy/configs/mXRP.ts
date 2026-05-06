import { constants } from 'ethers';
import { parseUnits } from 'ethers/lib/utils';

import { chainIds } from '../../../config';
import { DeploymentConfig } from '../common/types';

export const mXRPDeploymentConfig: DeploymentConfig = {
  genericConfigs: {
    customAggregator: {
      maxAnswerDeviation: parseUnits('0.2', 8),
      description: 'mXRP/XRP',
    },
    dataFeed: {},
  },
  networkConfigs: {
    [chainIds.xrplevm]: {
      dv: {
        type: 'REGULAR',
        enableSanctionsList: false,
        feeReceiver: '0x878e651b8410bf742D75Cb23e87B496B7E9b816f',
        tokensReceiver: '0x5Dc874C92C2b1D6FB9070F66a82B374d911dDE13',
        instantDailyLimit: constants.MaxUint256,
        instantFee: parseUnits('0', 2),
        variationTolerance: parseUnits('0.3', 2),
      },
      rvSwapper: {
        type: 'SWAPPER',
        feeReceiver: '0x5Dc874C92C2b1D6FB9070F66a82B374d911dDE13',
        tokensReceiver: '0x5Dc874C92C2b1D6FB9070F66a82B374d911dDE13',
        requestRedeemer: '0x5Dc874C92C2b1D6FB9070F66a82B374d911dDE13',
        instantDailyLimit: constants.MaxUint256,
        instantFee: parseUnits('0.3', 2),
        variationTolerance: parseUnits('0.3', 2),
        liquidityProvider: 'dummy',
        enableSanctionsList: false,
        swapperVault: 'dummy',
      },
      postDeploy: {
        axelarIts: {
          operator: '0x5aacC1A5aE6085d222ec356FBae032B5081dAde7',
          flowLimit: parseUnits('1250', 18),
        },
        addPaymentTokens: {
          vaults: [
            {
              paymentTokens: [
                {
                  token: 'xrp',
                  allowance: parseUnits('1000000000', 18),
                },
              ],
              type: 'depositVault',
            },
            {
              paymentTokens: [
                {
                  token: 'xrp',
                  allowance: parseUnits('1000000000', 18),
                },
              ],
              type: 'redemptionVaultSwapper',
            },
          ],
        },
        grantRoles: {
          tokenManagerAddress: '0x53677896C634136103a4a262020Bf1610Af32648',
          vaultsManagerAddress: '0x2ACB4BdCbEf02f81BF713b696Ac26390d7f79A12',
          oracleManagerAddress: '0x92a611E6aA5337c0A331ed266dA5dCCC48BBf502',
        },
        setRoundData: {
          data: parseUnits('1', 8),
        },
      },
    },
    [chainIds.bsc]: {
      dv: {
        type: 'REGULAR',
        enableSanctionsList: false,
        feeReceiver: '0x878e651b8410bf742D75Cb23e87B496B7E9b816f',
        tokensReceiver: '0x6FD868DCDb4A7e74718c6f09FCf0678710A693CE',
        instantDailyLimit: constants.MaxUint256,
        instantFee: parseUnits('0', 2),
        variationTolerance: parseUnits('0.3', 2),
        minMTokenAmountForFirstDeposit: parseUnits('0', 18),
        maxSupplyCap: parseUnits('10000000', 18),
      },
      rvSwapper: {
        type: 'SWAPPER',
        feeReceiver: '0x8fee409f8F772667ADD2a2ccfB8C5182a7349cE9',
        tokensReceiver: '0x6FD868DCDb4A7e74718c6f09FCf0678710A693CE',
        requestRedeemer: '0x33541b80AF7779F5D53C9872c0135B0aFA6bC14d',
        instantDailyLimit: constants.MaxUint256,
        instantFee: parseUnits('0.3', 2),
        variationTolerance: parseUnits('0.3', 2),
        liquidityProvider: 'dummy',
        enableSanctionsList: false,
        swapperVault: 'dummy',
      },
      postDeploy: {
        axelarIts: {
          operator: '0xB60842E9DaBCd1C52e354ac30E82a97661cB7E89',
          flowLimit: parseUnits('1250', 18),
        },
        addPaymentTokens: {
          vaults: [
            {
              paymentTokens: [
                {
                  token: 'xrp',
                  allowance: parseUnits('1000000000', 18),
                },
              ],
              type: 'depositVault',
            },
            {
              paymentTokens: [
                {
                  token: 'xrp',
                  allowance: parseUnits('1000000000', 18),
                },
              ],
              type: 'redemptionVaultSwapper',
            },
          ],
        },
        grantRoles: {
          tokenManagerAddress: '0x53677896C634136103a4a262020Bf1610Af32648',
          vaultsManagerAddress: '0x2ACB4BdCbEf02f81BF713b696Ac26390d7f79A12',
          oracleManagerAddress: '0x92a611E6aA5337c0A331ed266dA5dCCC48BBf502',
        },
        setRoundData: {
          data: parseUnits('1', 8),
        },
      },
    },
  },
};
