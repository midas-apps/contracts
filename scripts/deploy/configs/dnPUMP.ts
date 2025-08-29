import { constants } from 'ethers';
import { parseUnits } from 'ethers/lib/utils';

import { chainIds } from '../../../config';
import { DeploymentConfig } from '../common/types';

export const dnPUMPDeploymentConfig: DeploymentConfig = {
  genericConfigs: {
    customAggregator: {
      maxAnswerDeviation: parseUnits('0.35', 8),
      description: 'dnPUMP/USD',
    },
    dataFeed: {},
  },
  networkConfigs: {
    [chainIds.hyperevm]: {
      dv: {
        type: 'REGULAR',
        enableSanctionsList: false,
        feeReceiver: '0xdd16D83c6BF46644e6c384e6fda3934eb5b06C8E',
        tokensReceiver: '0x267b82a48638173644fac09E219539654a454C8A',
        instantDailyLimit: parseUnits('5000000', 18),
        instantFee: parseUnits('0', 2),
        variationTolerance: parseUnits('0.6', 2),
      },
      rvSwapper: {
        type: 'SWAPPER',
        feeReceiver: '0x267b82a48638173644fac09E219539654a454C8A',
        tokensReceiver: '0x267b82a48638173644fac09E219539654a454C8A',
        requestRedeemer: '0x002938EA69c219249Bdde73cE0F0baF3C3001120',
        instantDailyLimit: parseUnits('5000000', 18),
        instantFee: parseUnits('0.5', 2),
        variationTolerance: parseUnits('0.6', 2),
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
                  token: 'usdt',
                  allowance: parseUnits('1000000000', 18),
                },
              ],
              type: 'depositVault',
            },
            {
              paymentTokens: [
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
          tokenManagerAddress: '0x5121a54a97E7D3980596Ccd306a16c82702E9BB0',
          vaultsManagerAddress: '0x2ACB4BdCbEf02f81BF713b696Ac26390d7f79A12',
          oracleManagerAddress: '0xdC123F32764f9b30e108D539E8293a3B379C9161',
        },
        setRoundData: {
          data: parseUnits('1', 8),
        },
      },
    },
  },
};
