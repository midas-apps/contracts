import {
  days,
  minutes,
} from '@nomicfoundation/hardhat-network-helpers/dist/src/helpers/time/duration';
import { constants } from 'ethers';
import { parseUnits } from 'ethers/lib/utils';

import { chainIds } from '../../../config';
import { NO_DELAY } from '../common/delays';
import { DeploymentConfig } from '../common/types';

const arcWallets = {
  manager: '0x8f07B60f369ab934Fd19d8110bD33E756b5576C5',
  operator: '0xd296928E76991D4F028aC83eFAb7D705cc25D8A0',
  // receives redeemed USDC and clawback
  receiver: '0x659861d71Fd263d4d8f9dA91E1b998Ef96f0Bf87',
  // request flows would be paused
  requestRedeemer: '0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF',
} as const;

export const radUSDDeploymentConfig: DeploymentConfig = {
  genericConfigs: {
    // aggregators require min < max: the dv one only accepts 100000000 within
    // the data feed range
    customAggregatorDv: {
      description: 'radUSD/USD (DV)',
      minAnswer: 100000000,
      maxAnswer: 100000001,
      maxAnswerDeviation: 0,
    },
    customAggregatorRv: {
      description: 'radUSD/USD (RV)',
      minAnswer: 1000,
      maxAnswer: 100000000,
      maxAnswerDeviation: parseUnits('10', 8),
    },
    customAggregator: {
      description: 'radUSD/USD (RV)',
      maxAnswerDeviation: parseUnits('10', 8),
    },
    dataFeed: {
      minAnswer: 99999999,
      maxAnswer: 100000000,
    },
    dataFeedDv: {
      healthyDiff: constants.MaxUint256,
      minAnswer: 100000000,
      maxAnswer: 100000000,
    },
    dataFeedRv: {
      healthyDiff: constants.MaxUint256,
      minAnswer: 99970000,
      maxAnswer: 100000000,
    },
  },
  networkConfigs: {
    [chainIds.arc]: {
      dv: {
        type: 'REGULAR',
        version: 'v2',
        enableSanctionsList: false,
        tokensReceiver: 'redemptionVault',
        instantFee: 0,
        minInstantFee: 0,
        maxInstantFee: 0,
        maxInstantShare: 100_00,
        // ticket: n/a, contracts require > 0
        variationTolerance: 1,
        minAmount: 0,
        minMTokenAmountForFirstDeposit: 0,
      },
      rv: {
        type: 'REGULAR',
        version: 'v2',
        enableSanctionsList: false,
        tokensReceiver: arcWallets.receiver,
        // ticket: n/a, contracts reject zero; unused while requests are paused
        requestRedeemer: arcWallets.requestRedeemer,
        instantFee: 0,
        minInstantFee: 0,
        maxInstantFee: 0,
        maxInstantShare: 100_00,
        // ticket: n/a, contracts require > 0
        variationTolerance: 1,
        minAmount: 0,
      },
      postDeploy: {
        addPaymentTokens: {
          vaults: [
            {
              type: 'depositVault',
              paymentTokens: [
                {
                  token: 'usdc',
                  fee: 0,
                  isStable: true,
                  allowance: constants.MaxUint256,
                },
              ],
            },
            {
              type: 'redemptionVault',
              paymentTokens: [
                {
                  token: 'usdc',
                  fee: 0,
                  isStable: true,
                  allowance: constants.MaxUint256,
                },
              ],
            },
          ],
        },
        grantRoles: {
          extraRoles: [
            {
              address: arcWallets.manager,
              roles: [
                { role: 'tokenManager', delay: days(1) },
                { role: 'depositVaultAdmin', delay: days(1) },
                { role: 'redemptionVaultAdmin', delay: days(1) },
                { role: 'customFeedAdmin', delay: days(1) },
              ],
            },
            // granted to the vaults anyway, listed for the role delays
            {
              address: 'depositVault',
              roles: [{ role: 'minter', delay: NO_DELAY }],
            },
            {
              address: 'redemptionVault',
              roles: [{ role: 'burner', delay: NO_DELAY }],
            },
          ],
          functionPermissions: [
            {
              address: arcWallets.operator,
              contracts: ['token'],
              functions: [
                {
                  signature: 'decreaseMintRateLimit(uint8,uint256,uint256)',
                  delay: minutes(30),
                },
              ],
            },
            {
              address: arcWallets.operator,
              contracts: ['depositVault', 'redemptionVault'],
              functions: [
                {
                  signature: 'setInstantLimitConfig(uint256,uint256)',
                  delay: minutes(30),
                },
              ],
            },
            {
              address: arcWallets.operator,
              contracts: ['dataFeedDv', 'dataFeedRv'],
              functions: [
                {
                  signature: 'setMinMaxExpectedAnswer(int256,int256)',
                  delay: minutes(30),
                },
              ],
            },
          ],
        },
        greenlist: { depositVault: true, redemptionVault: true },
        tokenConfig: {
          maxSupplyCap: parseUnits('50000'),
          clawbackReceiver: arcWallets.receiver,
        },
        // bucket 0 (all unassigned minters) is closed: no OTC mints
        mintRateLimits: {
          buckets: [
            { bucketId: 0, window: days(1), limit: 0 },
            { bucketId: 1, window: days(1), limit: parseUnits('50000') },
          ],
          walletBuckets: [{ wallet: 'depositVault', bucketId: 1 }],
        },
        instantLimits: {
          depositVault: [{ window: days(1), limit: parseUnits('50000') }],
          redemptionVault: [{ window: days(1), limit: parseUnits('50000') }],
        },
        preferLoanLiquidity: { redemptionVault: false },
        pauseFunctions: {
          depositVault: ['depositRequest', 'depositRequestWithCustomRecipient'],
          redemptionVault: [
            'redeemRequest',
            'redeemRequestWithCustomRecipient',
          ],
        },
      },
    },
    [chainIds.sepolia]: {
      dv: {
        type: 'REGULAR',
        version: 'v2',
        enableSanctionsList: false,
        tokensReceiver: 'redemptionVault',
        instantFee: 0,
        // ticket: 0, contracts require > 0
        variationTolerance: 1,
        minAmount: 0,
        minMTokenAmountForFirstDeposit: 0,
      },
      rv: {
        type: 'REGULAR',
        version: 'v2',
        tokensReceiver: '0xa0819ae43115420beb161193b8D8Ba64C9f9faCC',
        // ticket: n/a, contracts reject zero; unused while requests are paused
        requestRedeemer: '0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF',
        instantFee: 0,
        // ticket: 0, contracts require > 0
        variationTolerance: 1,
        minAmount: 0,
      },
      postDeploy: {
        addPaymentTokens: {
          vaults: [
            {
              type: 'depositVault',
              paymentTokens: [
                {
                  token: 'usdc',
                  fee: 0,
                  isStable: true,
                  allowance: parseUnits('1000000000'),
                },
              ],
            },
            {
              type: 'redemptionVault',
              paymentTokens: [
                {
                  token: 'usdc',
                  fee: 0,
                  isStable: true,
                  allowance: parseUnits('1000000000'),
                },
              ],
            },
          ],
        },
        grantRoles: {
          tokenManagerAddress: '0xd412E8A70fF72BFCdA7C5D5493f1d9dF21286F52',
          vaultsManagerAddress: '0x2ACB4BdCbEf02f81BF713b696Ac26390d7f79A12',
          oracleManagerAddress: '0x5dcd64E73B752684F8fF079B87981a0e83eA5342',
          extraRoles: [
            {
              address: '0xa0819ae43115420beb161193b8D8Ba64C9f9faCC',
              roles: [
                'depositVaultAdmin',
                'redemptionVaultAdmin',
                'customFeedAdmin',
                'greenlisted',
                'tokenManager',
              ],
            },
            {
              address: '0xef8797a50f5891d91D228Cc6A294D896E0cE215f',
              roles: ['greenlisted'],
            },
            {
              address: '0xB8a692Aae5E804D3632A2ED941DBe5d0525386a2',
              roles: ['greenlisted'],
            },
            {
              address: '0x9ad7CAD4F10D0c3f875b8a2fd292590490c9f491',
              roles: ['greenlisted'],
            },
            {
              address: '0xc577d51dD5012407521F5cadC8E3aD4F1898930d',
              roles: ['greenlisted'],
            },
            {
              address: '0xB457F528D1D4a050E14231E1382c315E3DF21D22',
              roles: ['greenlisted'],
            },
          ],
        },
        setRoundData: { data: 100000000 },
        greenlist: { depositVault: true, redemptionVaultSwapper: true },

        pauseFunctions: {
          depositVault: ['depositRequest', 'depositRequestWithCustomRecipient'],
          redemptionVault: [
            'redeemRequestWithCustomRecipient',
            'redeemRequest',
          ],
        },
      },
    },
  },
};
