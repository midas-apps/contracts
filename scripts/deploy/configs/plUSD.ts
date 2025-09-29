import { constants } from 'ethers';
import { parseUnits } from 'ethers/lib/utils';

import { chainIds } from '../../../config';
import { DeploymentConfig } from '../common/types';

export const plUSDDeploymentConfig: DeploymentConfig = {
  genericConfigs: {
    customAggregator: {
      maxAnswerDeviation: parseUnits('0.01', 8),
      description: 'plUSD/USD',
    },
    dataFeed: {},
  },
  networkConfigs: {
    [chainIds.plasma]: {
      dv: {
        type: 'REGULAR',
        enableSanctionsList: false,
        feeReceiver: '0x870E6851283B2C7617ebB37094602597dCBcbD5e',
        tokensReceiver: '0x478e40467E71005B65771B94749B17125d6D634A',
        instantDailyLimit: constants.MaxUint256,
        instantFee: parseUnits('0', 2),
        variationTolerance: parseUnits('0.05', 2),
      },
      rvSwapper: {
        type: 'SWAPPER',
        feeReceiver: '0xd1E70089Bd036896B7454ED5dc5E74C656CC0F7a',
        tokensReceiver: '0x478e40467E71005B65771B94749B17125d6D634A',
        requestRedeemer: '0x8987467A6C9e26a0DfCa24F5b5A40D64158A3824',
        instantDailyLimit: constants.MaxUint256,
        instantFee: parseUnits('0', 2),
        variationTolerance: parseUnits('0.05', 2),
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
                  token: 'usdt0',
                  allowance: parseUnits('1000000000', 18),
                },
              ],
              type: 'depositVault',
            },
            {
              paymentTokens: [
                {
                  token: 'usdt0',
                  allowance: parseUnits('1000000000', 18),
                },
              ],
              type: 'redemptionVaultSwapper',
            },
          ],
        },
        grantRoles: {
          tokenManagerAddress: '0x5616d34807e9aB446C357f45592287D33092E2C3',
          vaultsManagerAddress: '0x2ACB4BdCbEf02f81BF713b696Ac26390d7f79A12',
          oracleManagerAddress: '0x0e64C337D5bdbC41Bb87d8AeEaD22d1De2393cd0',
        },
        setRoundData: {
          data: parseUnits('1', 8),
        },
      },
    },
  },
};
