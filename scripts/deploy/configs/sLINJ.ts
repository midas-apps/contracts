import { constants } from 'ethers';
import { parseUnits } from 'ethers/lib/utils';

import { chainIds } from '../../../config';
import { DeploymentConfig } from '../common/types';

export const sLINJDeploymentConfig: DeploymentConfig = {
  genericConfigs: {
    customAggregator: {
      maxAnswerDeviation: parseUnits('0.73', 8),
      description: 'sLINJ/INJ',
    },
    dataFeed: {},
  },
  networkConfigs: {
    [chainIds.injective]: {
      dv: {
        type: 'REGULAR',
        enableSanctionsList: false,
        feeReceiver: '0xaF1B6ed50b0c69C76dF0d556F7bc9Fa18ea350bd',
        tokensReceiver: '0x37D986A8Aa0444aCFB10825E075ddfE5314c141a',
        instantDailyLimit: constants.MaxUint256,
        instantFee: parseUnits('0', 2),
        variationTolerance: parseUnits('1', 2),
        minMTokenAmountForFirstDeposit: parseUnits('0', 18),
        maxSupplyCap: parseUnits('10000000', 18),
      },
      rvSwapper: {
        type: 'SWAPPER',
        feeReceiver: '0x7fe141de2B486bd52AEA70838f48470c9D3B9192',
        tokensReceiver: '0x37D986A8Aa0444aCFB10825E075ddfE5314c141a',
        requestRedeemer: '0xD907D3Cbc5410d4530a620C70d325aF2C38475B8',
        instantDailyLimit: parseUnits('10000000', 18),
        instantFee: parseUnits('1', 2),
        fiatAdditionalFee: parseUnits('0.1', 2),
        fiatFlatFee: parseUnits('30'),
        variationTolerance: parseUnits('1', 2),
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
                  token: 'winj',
                  allowance: parseUnits('200000000', 18),
                },
                {
                  token: 'yinj',
                  allowance: parseUnits('50000000', 18),
                  isStable: false,
                },
              ],
              type: 'depositVault',
            },
            {
              paymentTokens: [
                {
                  token: 'winj',
                  allowance: parseUnits('200000000', 18),
                },
                {
                  token: 'yinj',
                  allowance: parseUnits('50000000', 18),
                  isStable: false,
                },
              ],
              type: 'redemptionVaultSwapper',
            },
          ],
        },
        grantRoles: {
          tokenManagerAddress: '0x4C6eB976c0D9C2393553688BbB95a458124C8E82',
          vaultsManagerAddress: '0x2ACB4BdCbEf02f81BF713b696Ac26390d7f79A12',
          oracleManagerAddress: '0x361e6c75726682957b528C8FFaa363D3c7CC4C32',
        },
        setRoundData: {
          data: parseUnits('1', 8),
        },
        pauseFunctions: {
          depositVault: ['depositRequest', 'depositRequestWithCustomRecipient'],
          redemptionVaultSwapper: ['redeemFiatRequest'],
        },
      },
    },
  },
};
