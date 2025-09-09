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
