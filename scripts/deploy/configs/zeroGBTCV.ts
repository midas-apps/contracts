import { parseUnits } from 'ethers/lib/utils';

import { chainIds } from '../../../config';
import { DeploymentConfig } from '../common/types';

export const zeroGBTCVDeploymentConfig: DeploymentConfig = {
  genericConfigs: {
    customAggregator: {
      maxAnswerDeviation: parseUnits('0.17', 8),
      description: 'zeroGBTCV/BTC',
    },
    dataFeed: {},
  },
  networkConfigs: {
    [chainIds.main]: {
      dv: {
        type: 'REGULAR',
        enableSanctionsList: true,
        feeReceiver: '0x06595ae46B2A913575E48ff9b4676f1eC1e53357',
        tokensReceiver: '0xd54294A9c1FC47d624468d311Ee17d12deAc04f0',
        instantDailyLimit: parseUnits('1000', 18),
        instantFee: parseUnits('0', 2),
        variationTolerance: parseUnits('0.2', 2),
        maxSupplyCap: parseUnits('230', 18),
      },
      rvSwapper: {
        type: 'SWAPPER',
        feeReceiver: '0xa84bB15d726c9Eb1f150577D5eE6D7F6f511A469',
        tokensReceiver: '0xd54294A9c1FC47d624468d311Ee17d12deAc04f0',
        requestRedeemer: '0x3b3cb943B735D97d0c78c1BdFe4b2D95f26cD210',
        instantDailyLimit: parseUnits('11', 18),
        instantFee: parseUnits('0.3', 2),
        variationTolerance: parseUnits('0.2', 2),
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
                  token: 'wbtc',
                  allowance: parseUnits('1000', 18),
                },
                {
                  token: 'cbbtc',
                  allowance: parseUnits('1000', 18),
                },
              ],
              type: 'depositVault',
            },
            {
              paymentTokens: [
                {
                  token: 'wbtc',
                  allowance: parseUnits('1000', 18),
                },
                {
                  token: 'cbbtc',
                  allowance: parseUnits('1000', 18),
                },
              ],
              type: 'redemptionVaultSwapper',
            },
          ],
        },
        grantRoles: {
          tokenManagerAddress: '0x1118795F172BB88bF25522d04c7C3fD4e6b4b85D',
          vaultsManagerAddress: '0x2ACB4BdCbEf02f81BF713b696Ac26390d7f79A12',
          oracleManagerAddress: '0xDeF7b4CB5Be6120B936ee3953fED67bb88024AB7',
        },
        setRoundData: {
          data: parseUnits('1', 8),
        },
      },
    },
  },
};
