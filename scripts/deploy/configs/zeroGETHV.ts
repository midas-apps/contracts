import { constants } from 'ethers';
import { parseUnits } from 'ethers/lib/utils';

import { chainIds } from '../../../config';
import { DeploymentConfig } from '../common/types';

export const zeroGETHVDeploymentConfig: DeploymentConfig = {
  genericConfigs: {
    customAggregator: {
      maxAnswerDeviation: parseUnits('0.18', 8),
      description: 'zeroGETHV/ETH',
    },
    dataFeed: {},
  },
  networkConfigs: {
    [chainIds.main]: {
      dv: {
        type: 'REGULAR',
        enableSanctionsList: true,
        feeReceiver: '0x9A1C1cd4F314c2b6Dc3ea352D06ACA72B57712Ed',
        tokensReceiver: '0x33f88755c0945e18dFD1474B55a1dB5a36F90DF6',
        instantDailyLimit: parseUnits('1000000000', 18),
        instantFee: parseUnits('0', 2),
        variationTolerance: parseUnits('0.23', 2),
      },
      rvSwapper: {
        type: 'SWAPPER',
        feeReceiver: '0xF39AF7794cA8f9912493feEabd8Ef0576dc35123',
        tokensReceiver: '0x33f88755c0945e18dFD1474B55a1dB5a36F90DF6',
        requestRedeemer: '0xfF26E768B4FD98e5a5A7068E8E45D37740CaaAE0',
        instantDailyLimit: parseUnits('280', 18),
        instantFee: parseUnits('0.3', 2),
        variationTolerance: parseUnits('0.23', 2),
        liquidityProvider: 'dummy',
        swapperVault: 'dummy',
        enableSanctionsList: true,
      },
      postDeploy: {
        addPaymentTokens: {
          vaults: [
            {
              paymentTokens: [
                {
                  token: 'weth',
                  allowance: parseUnits('1000000000', 18),
                },
              ],
              type: 'depositVault',
            },
            {
              paymentTokens: [
                {
                  token: 'weth',
                  allowance: parseUnits('1000000000', 18),
                },
              ],
              type: 'redemptionVaultSwapper',
            },
          ],
        },
        grantRoles: {
          tokenManagerAddress: '0x743F42651b7454188A834206649501DBE6F18619',
          vaultsManagerAddress: '0x2ACB4BdCbEf02f81BF713b696Ac26390d7f79A12',
          oracleManagerAddress: '0x60687e50A0ac8F7FCc28B0c084bAE4dF5ab88fcA',
        },
        setRoundData: {
          data: parseUnits('1', 8),
        },
      },
    },
  },
};
