import { constants } from 'ethers';
import { parseUnits } from 'ethers/lib/utils';

import { chainIds } from '../../../config';
import { DeploymentConfig } from '../common/types';

export const acremBTC1DeploymentConfig: DeploymentConfig = {
  genericConfigs: {
    customAggregator: {
      maxAnswerDeviation: parseUnits('0.23', 8),
      description: 'acremBTC1/BTC',
    },
    dataFeed: {},
  },
  networkConfigs: {
    [chainIds.main]: {
      dv: {
        type: 'REGULAR',
        enableSanctionsList: true,
        feeReceiver: '0x8A497D5e9712272C3609f94CDfDa8A091276710E',
        tokensReceiver: '0xbA53a278D6d68c2C8F6d600eA93581a702A6006A',
        instantDailyLimit: constants.MaxUint256,
        instantFee: parseUnits('0', 2),
        variationTolerance: parseUnits('0.54', 2),
      },
      rvSwapper: {
        type: 'SWAPPER',
        feeReceiver: '0x7C819F438250CD9331D3E8EA540B72B3FF702f07',
        tokensReceiver: '0xbA53a278D6d68c2C8F6d600eA93581a702A6006A',
        requestRedeemer: '0x910CA844Fb578f670Ca5190c1cF4ab851155Bf99',
        instantDailyLimit: constants.MaxUint256,
        instantFee: parseUnits('0.3', 2),
        variationTolerance: parseUnits('0.54', 2),
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
                  token: 'tbtc',
                  allowance: parseUnits('1000000000', 18),
                },
              ],
              type: 'depositVault',
            },
            {
              paymentTokens: [
                {
                  token: 'tbtc',
                  allowance: parseUnits('1000000000', 18),
                },
              ],
              type: 'redemptionVaultSwapper',
            },
          ],
        },
        grantRoles: {
          tokenManagerAddress: '0xA26477ba31ae5D62f3490E3f3bE9E03f1ad0b5c8',
          vaultsManagerAddress: '0x2ACB4BdCbEf02f81BF713b696Ac26390d7f79A12',
          oracleManagerAddress: '0xdc3008E7352836276A2063796092E604EADA4678',
        },
        setRoundData: {
          data: parseUnits('1', 8),
        },
        pauseFunctions: {
          redemptionVaultSwapper: [
            'redeemInstant',
            'redeemInstantWithCustomRecipient',
          ],
          depositVault: ['depositRequest', 'depositRequestWithCustomRecipient'],
        },
        addFeeWaived: [
          {
            fromVault: { mToken: 'acremBTC1', type: 'depositVault' },
            toWaive: ['0x6A6092d9c47A7E4C085f2ED9FD4a376124587Ae0'],
          },
          {
            fromVault: { mToken: 'acremBTC1', type: 'redemptionVaultSwapper' },
            toWaive: ['0x6A6092d9c47A7E4C085f2ED9FD4a376124587Ae0'],
          },
        ],
      },
    },
  },
};
