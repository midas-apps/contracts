import { hours } from '@nomicfoundation/hardhat-network-helpers/dist/src/helpers/time/duration';
import { constants } from 'ethers';
import { parseUnits } from 'ethers/lib/utils';

import { chainIds } from '../../../config';
import { DeploymentConfig } from '../common/types';

export const mXRPDeploymentConfig: DeploymentConfig = {
  genericConfigs: {
    customAggregator: {
      maxAnswerDeviation: parseUnits('0.2', 8),
      description: 'mXRP/XRP',
    },
    dataFeed: {
      // price is frozen: min = max = oracle price at migration
      minAnswer: parseUnits('1.0405039', 8),
      maxAnswer: parseUnits('1.0405039', 8),
    },
  },
  networkConfigs: {
    [chainIds.xrplevm]: {
      dv: {
        type: 'REGULAR',
        enableSanctionsList: false,
        feeReceiver: '0x878e651b8410bf742D75Cb23e87B496B7E9b816f',
        tokensReceiver: '0x5Dc874C92C2b1D6FB9070F66a82B374d911dDE13',
        instantDailyLimit: constants.MaxUint256,
        instantFee: parseUnits('0', 2),
        variationTolerance: parseUnits('0.3', 2),
      },
      rvSwapper: {
        type: 'SWAPPER',
        feeReceiver: '0x5Dc874C92C2b1D6FB9070F66a82B374d911dDE13',
        tokensReceiver: '0x5Dc874C92C2b1D6FB9070F66a82B374d911dDE13',
        requestRedeemer: '0x5Dc874C92C2b1D6FB9070F66a82B374d911dDE13',
        instantDailyLimit: constants.MaxUint256,
        instantFee: parseUnits('0.3', 2),
        variationTolerance: parseUnits('0.3', 2),
        liquidityProvider: 'dummy',
        enableSanctionsList: false,
        swapperVault: 'dummy',
      },
      postDeploy: {
        axelarIts: {
          operator: '0x5aacC1A5aE6085d222ec356FBae032B5081dAde7',
          flowLimit: parseUnits('1250', 18),
        },
        addPaymentTokens: {
          vaults: [
            {
              paymentTokens: [
                {
                  token: 'xrp',
                  allowance: parseUnits('1000000000', 18),
                },
              ],
              type: 'depositVault',
            },
            {
              paymentTokens: [
                {
                  token: 'xrp',
                  allowance: parseUnits('1000000000', 18),
                },
              ],
              type: 'redemptionVaultSwapper',
            },
          ],
        },
        grantRoles: {
          tokenManagerAddress: '0x53677896C634136103a4a262020Bf1610Af32648',
          vaultsManagerAddress: '0x2ACB4BdCbEf02f81BF713b696Ac26390d7f79A12',
          oracleManagerAddress: '0x92a611E6aA5337c0A331ed266dA5dCCC48BBf502',
        },
        setRoundData: {
          data: parseUnits('1', 8),
        },
      },
    },
    [chainIds.bsc]: {
      // mXRP on bsc is retired: only instant redemptions stay enabled
      dv: {
        version: 'v2',
        type: 'REGULAR',
        enableSanctionsList: false,
        tokensReceiver: '0x6FD868DCDb4A7e74718c6f09FCf0678710A693CE',
        mTokenDataFeed: 'dataFeed',
        instantFee: parseUnits('0', 2),
        minInstantFee: parseUnits('0', 2),
        maxInstantFee: parseUnits('0', 2),
        // holdback is disabled
        maxInstantShare: parseUnits('100', 2),
        variationTolerance: parseUnits('0.3', 2),
        minAmount: parseUnits('1'),
        minMTokenAmountForFirstDeposit: parseUnits('0', 18),
        maxAmountPerRequest: parseUnits('0', 18),
        sequentialRequestProcessing: true,
      },
      rv: {
        version: 'v2',
        type: 'REGULAR',
        tokensReceiver: '0x6FD868DCDb4A7e74718c6f09FCf0678710A693CE',
        requestRedeemer: '0x33541b80AF7779F5D53C9872c0135B0aFA6bC14d',
        mTokenDataFeed: 'dataFeed',
        instantFee: parseUnits('0', 2),
        minInstantFee: parseUnits('0', 2),
        maxInstantFee: parseUnits('0', 2),
        // holdback is disabled
        maxInstantShare: parseUnits('100', 2),
        variationTolerance: parseUnits('0.3', 2),
        minAmount: parseUnits('1'),
        enableSanctionsList: false,
        sequentialRequestProcessing: true,
      },
      postDeploy: {
        addPaymentTokens: {
          vaults: [
            {
              paymentTokens: [
                {
                  token: 'xrp',
                  allowance: parseUnits('4113', 18),
                },
              ],
              type: 'depositVault',
            },
            {
              paymentTokens: [
                {
                  token: 'xrp',
                  allowance: parseUnits('4113', 18),
                },
              ],
              type: 'redemptionVault',
            },
          ],
        },
        grantRoles: {
          tokenManagerAddress: '0x53677896C634136103a4a262020Bf1610Af32648',
          vaultsManagerAddress: '0x2ACB4BdCbEf02f81BF713b696Ac26390d7f79A12',
          oracleManagerAddress: '0x92a611E6aA5337c0A331ed266dA5dCCC48BBf502',
        },
        setRoundData: {
          data: parseUnits('1', 8),
        },
        tokenConfig: {
          maxSupplyCap: parseUnits('3951.5808159634269981', 18),
          // default Midas clawback receiver
          clawbackReceiver: '0xD0cc216d848dbFC1b083031A7486d0CAdaf4EcDa',
        },
        mintRateLimits: {
          buckets: [
            // primary bucket: 0 is the default bucket of every minter
            { bucketId: 0, window: hours(24), limit: parseUnits('0', 18) },
          ],
        },
        instantLimits: {
          depositVault: [{ window: hours(24), limit: parseUnits('0', 18) }],
          redemptionVault: [
            {
              window: hours(24),
              limit: parseUnits('3951.5808159634269981', 18),
            },
          ],
        },
        greenlist: {
          depositVault: false,
          redemptionVault: false,
        },
        preferLoanLiquidity: {
          redemptionVault: false,
        },
        pauseFunctions: {
          redemptionVault: [
            'redeemRequest',
            'redeemRequestWithCustomRecipient',
          ],
        },
        pauseContracts: ['depositVault'],
      },
    },
  },
};
