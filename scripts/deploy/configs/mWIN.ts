import { constants } from 'ethers';
import { parseUnits } from 'ethers/lib/utils';

import { chainIds } from '../../../config';
import { DeploymentConfig } from '../common/types';

export const mWINDeploymentConfig: DeploymentConfig = {
  genericConfigs: {
    customAggregator: {
      maxAnswerDeviation: parseUnits('0.27', 8),
      description: 'mWIN/USD',
    },
    dataFeed: {},
  },
  networkConfigs: {
    [chainIds.main]: {
      dv: {
        type: 'REGULAR',
        enableSanctionsList: true,
        feeReceiver: '0x0E06F979460f39b8abC5512c14EaF70FCF662C71',
        tokensReceiver: '0x1ED5C5AbfF8d97dBAf9D9C61C3ee744c1b9C51ac',
        instantDailyLimit: constants.MaxUint256,
        instantFee: parseUnits('0', 2),
        variationTolerance: parseUnits('0.2', 2),
        minMTokenAmountForFirstDeposit: parseUnits('0', 18),
        maxSupplyCap: constants.MaxUint256,
      },
      rvSwapper: {
        type: 'SWAPPER',
        feeReceiver: '0x0461bD693caE49bE9d030E5c212e080F9c78B846',
        tokensReceiver: '0x1ED5C5AbfF8d97dBAf9D9C61C3ee744c1b9C51ac',
        requestRedeemer: '0xF81295463396d709814a8F414F198b4aA7902737',
        instantDailyLimit: parseUnits('100000', 18),
        instantFee: parseUnits('0.1', 2),
        variationTolerance: parseUnits('0.2', 2),
        liquidityProvider: '0x0461bD693caE49bE9d030E5c212e080F9c78B846',
        enableSanctionsList: true,
        minAmount: parseUnits('1', 18),
        fiatAdditionalFee: parseUnits('0.1', 2),
        fiatFlatFee: parseUnits('30', 18),
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
                // {
                //   token: 'rlusd',
                //   allowance: parseUnits('500000000', 18),
                // },
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
          tokenManagerAddress: '0x20D4CeD0EFac28517C1b0a06F98B1180F28f5125',
          vaultsManagerAddress: '0x2ACB4BdCbEf02f81BF713b696Ac26390d7f79A12',
          oracleManagerAddress: '0x532FEDcF5837f411646c230CF9b743dFdD0692d3',
        },
        setRoundData: {
          data: parseUnits('1', 8),
        },
        addFeeWaived: [
          {
            fromVault: { mToken: 'mTBILL', type: 'redemptionVaultUstb' },
            toWaive: [{ mToken: 'mWIN', type: 'redemptionVaultSwapper' }],
          },
        ],
        pauseFunctions: {
          depositVault: ['depositRequest', 'depositRequestWithCustomRecipient'],
          redemptionVaultSwapper: ['redeemFiatRequest'],
        },
      },
    },
  },
};
