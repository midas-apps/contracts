import { constants } from 'ethers';
import { parseUnits } from 'ethers/lib/utils';

import { chainIds } from '../../../config';
import { DeploymentConfig } from '../common/types';

export const splUSDDeploymentConfig: DeploymentConfig = {
  genericConfigs: {
    customAggregator: {
      maxAnswerDeviation: parseUnits('0.36', 8),
      description: 'splUSD/USD',
    },
    dataFeed: {},
  },
  networkConfigs: {
    [chainIds.plasma]: {
      dv: {
        type: 'REGULAR',
        enableSanctionsList: false,
        feeReceiver: '0x4F87De42854B33A9F59C5a036Cf055a439007bDe',
        tokensReceiver: '0x33723fBFFBD7B18d6dA9CA492Fdde6f3B9c4BB52',
        instantDailyLimit: constants.MaxUint256,
        instantFee: parseUnits('0', 2),
        variationTolerance: parseUnits('0.8', 2),
      },
      rvSwapper: {
        type: 'SWAPPER',
        feeReceiver: '0xA1FF1458aaD268B846005CE26d36eC6a7Fc658dA',
        tokensReceiver: '0x33723fBFFBD7B18d6dA9CA492Fdde6f3B9c4BB52',
        requestRedeemer: '0xD9F15A5E16bee5B9467f9a55d533A4c31def632b',
        instantDailyLimit: constants.MaxUint256,
        instantFee: parseUnits('0.5', 2),
        variationTolerance: parseUnits('0.8', 2),
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
                  token: 'plusd',
                  allowance: parseUnits('1000000000', 18),
                },
              ],
              type: 'depositVault',
            },
            {
              paymentTokens: [
                {
                  token: 'plusd',
                  allowance: parseUnits('1000000000', 18),
                },
              ],
              type: 'redemptionVaultSwapper',
            },
          ],
        },
        grantRoles: {
          tokenManagerAddress: '0xa8f83533f2B789B4BC93a0cb8417dF8e8B8D77e1',
          vaultsManagerAddress: '0x2ACB4BdCbEf02f81BF713b696Ac26390d7f79A12',
          oracleManagerAddress: '0xd5DC7788757c5b5E2c51d2eC9a33B34Ca6Bbf1fE',
        },
        setRoundData: {
          data: parseUnits('1', 8),
        },
      },
    },
  },
};
