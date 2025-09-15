import { parseUnits } from 'ethers/lib/utils';

import { chainIds } from '../../../config';
import { DeploymentConfig } from '../common/types';

export const kitHYPEDeploymentConfig: DeploymentConfig = {
  genericConfigs: {
    customAggregator: {
      maxAnswerDeviation: parseUnits('0.21', 8),
      description: 'kitHYPE/HYPE',
    },
    dataFeed: {},
  },
  networkConfigs: {
    [chainIds.hyperevm]: {
      dv: {
        type: 'REGULAR',
        enableSanctionsList: false,
        feeReceiver: '0xCC82FFf2A784a0357167678981D689387061B646',
        tokensReceiver: '0x67F27F118073A22b6a8C2f334d81786aE4D8218F',
        instantDailyLimit: parseUnits('2000000', 18),
        instantFee: parseUnits('0', 2),
        variationTolerance: parseUnits('0.4', 2),
      },
      rvSwapper: {
        type: 'SWAPPER',
        feeReceiver: '0x2de9579Bb7D141Cf77BD05BC0D877e4135c9fABF',
        tokensReceiver: '0x67F27F118073A22b6a8C2f334d81786aE4D8218F',
        requestRedeemer: '0xec723340cE472a87134ef47E8aab76873a6739Be',
        instantDailyLimit: parseUnits('400000', 18),
        instantFee: parseUnits('0.3', 2),
        variationTolerance: parseUnits('0.4', 2),
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
                  token: 'whype',
                  allowance: parseUnits('1000000000', 18),
                },
              ],
              type: 'depositVault',
            },
            {
              paymentTokens: [
                {
                  token: 'whype',
                  allowance: parseUnits('1000000000', 18),
                },
              ],
              type: 'redemptionVaultSwapper',
            },
          ],
        },
        grantRoles: {
          tokenManagerAddress: '0xa6fEf44a946CdB8A86678a55547570CF9E475B9C',
          vaultsManagerAddress: '0x2ACB4BdCbEf02f81BF713b696Ac26390d7f79A12',
          oracleManagerAddress: '0x5C457503402b8A7Bb4E0B69F60D8c9AA00196BBa',
        },
        setRoundData: {
          data: parseUnits('1', 8),
        },
      },
    },
  },
};
