import { parseUnits } from 'ethers/lib/utils';

import { chainIds } from '../../../config';
import { DeploymentConfig } from '../common/types';

export const dnFARTDeploymentConfig: DeploymentConfig = {
  genericConfigs: {
    customAggregator: {
      maxAnswerDeviation: parseUnits('0.35', 8),
      description: 'dnFART/USD',
    },
    dataFeed: {},
  },
  networkConfigs: {
    [chainIds.hyperevm]: {
      dv: {
        type: 'REGULAR',
        enableSanctionsList: false,
        feeReceiver: '0x9b7a2BF98C2453777797d5eDE25122264dA2e56A',
        tokensReceiver: '0x2db2d2a981C322a36C0E400b0c4A46d013655005',
        instantDailyLimit: parseUnits('5000000', 18),
        instantFee: parseUnits('0', 2),
        variationTolerance: parseUnits('0.6', 2),
      },
      rvSwapper: {
        type: 'SWAPPER',
        feeReceiver: '0x2db2d2a981C322a36C0E400b0c4A46d013655005',
        tokensReceiver: '0x2db2d2a981C322a36C0E400b0c4A46d013655005',
        requestRedeemer: '0x236733512C267360bB6e2Ff5352DE394D7DB8a05',
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
          tokenManagerAddress: '0x6906D2a59c42AB5CDAF98Ed2Cbf6C882D5869604',
          vaultsManagerAddress: '0x2ACB4BdCbEf02f81BF713b696Ac26390d7f79A12',
          oracleManagerAddress: '0x0A99Bc0a09603FbB76498B2b086EA4637aC52D0D',
        },
        setRoundData: {
          data: parseUnits('1', 8),
        },
      },
    },
  },
};
