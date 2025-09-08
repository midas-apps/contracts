import { parseUnits } from 'ethers/lib/utils';

import { chainIds } from '../../../config';
import { DeploymentConfig } from '../common/types';

export const kitUSDDeploymentConfig: DeploymentConfig = {
  genericConfigs: {
    customAggregator: {
      maxAnswerDeviation: parseUnits('0.35', 8),
      description: 'kitUSD/USD',
    },
    dataFeed: {},
  },
  networkConfigs: {
    [chainIds.hyperevm]: {
      dv: {
        type: 'REGULAR',
        enableSanctionsList: false,
        feeReceiver: '0x0974f7881b33b763a6E6a91C39f1d05441949832',
        tokensReceiver: '0x7aDC1579Cf72F6d34840B883a4058EE0a54932d0',
        instantDailyLimit: parseUnits('100000000', 18),
        instantFee: parseUnits('0', 2),
        variationTolerance: parseUnits('0.6', 2),
      },
      rvSwapper: {
        type: 'SWAPPER',
        feeReceiver: '0xe945615B47e4C1fA129A492446f01c9E5cef5643',
        tokensReceiver: '0x7aDC1579Cf72F6d34840B883a4058EE0a54932d0',
        requestRedeemer: '0x7a62e42B198b5b8265b709d524Cb3aCBc306CdEd',
        instantDailyLimit: parseUnits('20000000', 18),
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
          tokenManagerAddress: '0x922fE21634caD8680D12fE06bF19D5B32492a02C',
          vaultsManagerAddress: '0x2ACB4BdCbEf02f81BF713b696Ac26390d7f79A12',
          oracleManagerAddress: '0x491C9841D72D4310b573E7f836043f9F76b575FC',
        },
        setRoundData: {
          data: parseUnits('1', 8),
        },
      },
    },
  },
};
