import { parseUnits } from 'ethers/lib/utils';

import { chainIds } from '../../../config';
import { DeploymentConfig } from '../common/types';

export const mRE7BTCDeploymentConfig: DeploymentConfig = {
  genericConfigs: {
    customAggregator: {
      maxAnswerDeviation: parseUnits('0.205', 8),
      description: 'mRe7BTC/BTC',
    },
    dataFeed: {},
  },
  networkConfigs: {
    [chainIds.main]: {
      dv: {
        type: 'REGULAR',
        enableSanctionsList: true,
        feeReceiver: '0xc6bc8B6228c4F0E0dd3F95959F2bB49126Da1A08',
        tokensReceiver: '0x329Da2FdE152ecfAb028a8277186bCD744e06717',
        instantDailyLimit: parseUnits('10000', 18),
        instantFee: parseUnits('0', 2),
        variationTolerance: parseUnits('0.4', 2),
      },
      rvSwapper: {
        type: 'SWAPPER',
        feeReceiver: '0x8E75F95B3337678785aA2C78B20a15f87A1CBcCb',
        tokensReceiver: '0x329Da2FdE152ecfAb028a8277186bCD744e06717',
        requestRedeemer: '0xDc318e9C581A80655100AFfE641d9782dF62d4Cf',
        instantDailyLimit: parseUnits('100', 18),
        instantFee: parseUnits('0.3', 2),
        variationTolerance: parseUnits('0.4', 2),
        liquidityProvider: 'dummy',
        enableSanctionsList: true,
        swapperVault: 'dummy',
      },
      postDeploy: {
        addPaymentTokens: {
          vaults: [
            {
              paymentTokens: [
                {
                  token: 'wbtc',
                },
                {
                  token: 'cbbtc',
                },
                {
                  token: 'tbtc',
                },
              ],
              type: 'depositVault',
            },
            {
              paymentTokens: [
                {
                  token: 'wbtc',
                },
                {
                  token: 'cbbtc',
                },
                {
                  token: 'tbtc',
                },
              ],
              type: 'redemptionVaultSwapper',
            },
          ],
        },
        grantRoles: {
          tokenManagerAddress: '0x329Da2FdE152ecfAb028a8277186bCD744e06717',
          vaultsManagerAddress: '0x2ACB4BdCbEf02f81BF713b696Ac26390d7f79A12',
          oracleManagerAddress: '0xFC6f39B4228C6601B180520b80284227975Bdfd6',
        },
        setRoundData: {
          data: parseUnits('1', 8),
        },
      },
    },
  },
};
