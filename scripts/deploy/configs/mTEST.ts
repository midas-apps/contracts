import { constants } from 'ethers';
import { parseUnits } from 'ethers/lib/utils';

import { chainIds } from '../../../config';
import { DeploymentConfig } from '../common/types';

export const mTESTDeploymentConfig: DeploymentConfig = {
  genericConfigs: {
    customAggregator: {
      type: 'GROWTH',
      maxAnswerDeviation: parseUnits('1', 8),
      description: 'mTEST/USD',
      onlyUp: true,
      minGrowthApr: parseUnits('0', 8),
      maxGrowthApr: parseUnits('100', 8),
    },
    customAggregatorAdjustedDv: {
      adjustmentPercentage: parseUnits('7', 8),
      underlyingFeed: 'customFeedGrowth',
    },
    customAggregatorAdjustedRv: {
      adjustmentPercentage: parseUnits('-7', 8),
      underlyingFeed: 'customFeedGrowth',
    },
    dataFeed: {},
  },
  networkConfigs: {
    [chainIds.base]: {
      dv: {
        type: 'REGULAR',
        enableSanctionsList: true,
        feeReceiver: '0x9020d60EcF7f0cf4Ad6699dbE450B4E51cf4A27C',
        tokensReceiver: '0x9020d60EcF7f0cf4Ad6699dbE450B4E51cf4A27C',
        instantDailyLimit: constants.MaxUint256,
        instantFee: parseUnits('0', 2),
        variationTolerance: parseUnits('2', 2),
        minMTokenAmountForFirstDeposit: parseUnits('0', 18),
        maxSupplyCap: constants.MaxUint256,
      },
      rvSwapper: {
        type: 'SWAPPER',
        feeReceiver: '0x9020d60EcF7f0cf4Ad6699dbE450B4E51cf4A27C',
        tokensReceiver: '0x9020d60EcF7f0cf4Ad6699dbE450B4E51cf4A27C',
        requestRedeemer: '0x40C602c5e43EeF895b6Ef3e5CA4f039fC73F1F4E',
        instantDailyLimit: parseUnits('200000', 18),
        instantFee: parseUnits('0.5', 2),
        variationTolerance: parseUnits('2', 2),
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
                  token: 'usdc',
                  allowance: parseUnits('1000000000', 18),
                },
              ],
              type: 'depositVault',
            },
            {
              paymentTokens: [
                {
                  token: 'usdc',
                  allowance: parseUnits('1000000000', 18),
                },
              ],
              type: 'redemptionVaultSwapper',
            },
          ],
        },
        grantRoles: {
          tokenManagerAddress: '0xB4091576E823ae392b193FF9Bf4D3e4aDE92e772',
          vaultsManagerAddress: '0x2ACB4BdCbEf02f81BF713b696Ac26390d7f79A12',
          oracleManagerAddress: '0x0012Cf543D475D18a8e52f6D467a71A31e8D9829',
        },
        setRoundData: {
          type: 'GROWTH',
          data: parseUnits('1', 8),
          apr: parseUnits('0', 8),
        },
        pauseFunctions: {
          redemptionVaultSwapper: ['redeemFiatRequest'],
        },
      },
    },
  },
};
