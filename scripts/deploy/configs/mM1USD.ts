import { constants } from 'ethers';
import { parseUnits } from 'ethers/lib/utils';

import { chainIds } from '../../../config';
import { DeploymentConfig } from '../common/types';

export const mM1USDDeploymentConfig: DeploymentConfig = {
  genericConfigs: {
    customAggregator: {
      maxAnswerDeviation: parseUnits('0.66', 8),
      description: 'mM1USD/USD',
    },
    dataFeed: {},
  },
  networkConfigs: {
    [chainIds.main]: {
      dv: {
        type: 'REGULAR',
        enableSanctionsList: true,
        feeReceiver: '0x8EF7Ed1409C45024839a001DB9be27A32C8Aa0fB',
        tokensReceiver: '0x9FDCFCc3DA971C390F6b4450a9380807Ef59AAe9',
        instantDailyLimit: constants.MaxUint256,
        instantFee: parseUnits('0', 2),
        variationTolerance: parseUnits('1.7', 2),
        minMTokenAmountForFirstDeposit: parseUnits('0', 18),
        maxSupplyCap: constants.MaxUint256,
      },
      rvSwapper: {
        type: 'SWAPPER',
        feeReceiver: '0x0461bD693caE49bE9d030E5c212e080F9c78B846',
        tokensReceiver: '0x9FDCFCc3DA971C390F6b4450a9380807Ef59AAe9',
        requestRedeemer: '0xABAbdF85B057B1072855FBbb8296F7A8fF1d58DB',
        instantDailyLimit: parseUnits('1000000', 18),
        instantFee: parseUnits('0.5', 2),
        variationTolerance: parseUnits('1.7', 2),
        liquidityProvider: '0x0461bD693caE49bE9d030E5c212e080F9c78B846',
        enableSanctionsList: true,
        swapperVault: {
          mToken: 'mTBILL',
          redemptionVaultType: 'redemptionVaultUstb',
        },
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
                {
                  token: 'usdt',
                  allowance: parseUnits('1000000000', 18),
                },
                {
                  token: 'dai',
                  allowance: parseUnits('1000000000', 18),
                },
                {
                  token: 'usds',
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
          tokenManagerAddress: '0x683949B2b4F988628b2845C4E1b75Ea16A0fAfb4',
          vaultsManagerAddress: '0x2ACB4BdCbEf02f81BF713b696Ac26390d7f79A12',
          oracleManagerAddress: '0x9e104D8Bd58759CF0C8d45f32C846df82916E69e',
        },
        setRoundData: {
          data: parseUnits('1', 8),
        },
        pauseFunctions: {
          depositVault: ['depositInstant', 'depositInstantWithCustomRecipient'],
          redemptionVaultSwapper: ['redeemFiatRequest'],
        },
        addFeeWaived: [
          {
            fromVault: { mToken: 'mTBILL', type: 'redemptionVaultUstb' },
            toWaive: [{ mToken: 'mM1USD', type: 'redemptionVaultSwapper' }],
          },
        ],
      },
    },
  },
};
