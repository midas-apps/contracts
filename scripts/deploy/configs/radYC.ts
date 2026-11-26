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
  manager: '0x7fb58f658CAfF2A778303D31C1b9Bde59Ed2Ae90',
  operator: '0xF6a3DC5d31aE73eD19265311283790238765aF6E',
  radUSDOperator: '0xd296928E76991D4F028aC83eFAb7D705cc25D8A0',
  // AWS KMS
  challenger: '0xd3B359dF7e71cd0FF8EC94C8807a6c0AEe1010d1',
  // receives withdrawToken and clawback, on Circle's USYC allowlist
  receiver: '0x2DF55311f19cFbc4CD3870ceE209572E84A0e605',
  // request flows would be paused
  requestRedeemer: '0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF',
} as const;

export const radYCDeploymentConfig: DeploymentConfig = {
  genericConfigs: {
    customAggregatorDv: {
      description: 'radYC/radUSD (DV)',
      minAnswer: 1000000,
      maxAnswer: 1000000000,
      maxAnswerDeviation: parseUnits('10', 8),
    },
    customAggregatorRv: {
      description: 'radYC/radUSD (RV)',
      minAnswer: 10000000,
      maxAnswer: 1000000000,
      maxAnswerDeviation: parseUnits('10', 8),
    },
    customAggregator: {
      description: 'radYC/radUSD',
      maxAnswerDeviation: parseUnits('10', 8),
    },
    // used by both the dv and rv data feeds
    dataFeed: {
      healthyDiff: 30 * 24 * 60 * 60,
      minAnswer: 113950000,
      maxAnswer: 115140000,
    },
  },
  networkConfigs: {
    [chainIds.arc]: {
      dvUsyc: {
        type: 'USYC',
        version: 'v2',
        enableSanctionsList: false,
        tokensReceiver: 'redemptionVaultUsyc',
        instantFee: 0,
        minInstantFee: 0,
        maxInstantFee: 0,
        maxInstantShare: 100_00,
        variationTolerance: 20,
        minAmount: 0,
        minMTokenAmountForFirstDeposit: 0,
        anticipatedFeeRate: 0,
        // radUSD redemption vault: unset (zero) until radUSD v2 vaults are
        // deployed, then set it here (synced by set:vaultsettings)
      },
      rvUsyc: {
        type: 'USYC',
        version: 'v2',
        tokensReceiver: arcWallets.receiver,
        requestRedeemer: arcWallets.requestRedeemer,
        instantFee: 0,
        minInstantFee: 0,
        maxInstantFee: 0,
        maxInstantShare: 100_00,
        variationTolerance: 20,
        minAmount: 0,
        anticipatedFeeRate: 0,
        // radUSD deposit vault: unset (zero) until radUSD v2 vaults are
        // deployed
      },
      postDeploy: {
        addPaymentTokens: {
          vaults: [
            {
              type: 'depositVaultUsyc',
              paymentTokens: [
                {
                  token: 'radusd',
                  fee: 0,
                  isStable: true,
                  allowance: constants.MaxUint256,
                },
              ],
            },
            {
              type: 'redemptionVaultUsyc',
              paymentTokens: [
                {
                  token: 'radusd',
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
                { role: 'RAD_YC_AUTOMATION_ADMIN_ROLE', delay: days(1) },
              ],
            },
            {
              address: arcWallets.operator,
              roles: [
                { role: 'greenlistedOperator', delay: minutes(30) },
                { role: 'BLACKLIST_OPERATOR_ROLE', delay: NO_DELAY },
              ],
            },
            {
              address: arcWallets.radUSDOperator,
              roles: [
                { role: 'greenlistedOperator', delay: minutes(30) },
                { role: 'BLACKLIST_OPERATOR_ROLE', delay: NO_DELAY },
              ],
            },
            {
              address: arcWallets.challenger,
              roles: [
                { role: 'TIMELOCK_OPERATION_PAUSER_ROLE', delay: NO_DELAY },
              ],
            },
            // the radYC vaults use the radUSD vaults, which enforce the
            // shared RADIAL_GREENLISTED_ROLE
            { address: 'depositVaultUsyc', roles: ['greenlisted'] },
            { address: 'redemptionVaultUsyc', roles: ['greenlisted'] },
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
              contracts: ['depositVaultUsyc', 'redemptionVaultUsyc'],
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
        // skipped with a warning until radUSD v2 vaults are deployed
        addFeeWaived: [
          {
            fromVault: { mToken: 'radUSD', type: 'depositVault' },
            toWaive: [{ type: 'redemptionVaultUsyc' }],
          },
          {
            fromVault: { mToken: 'radUSD', type: 'redemptionVault' },
            toWaive: [{ type: 'depositVaultUsyc' }],
          },
        ],
        greenlist: { depositVaultUsyc: true, redemptionVaultUsyc: true },
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
          walletBuckets: [{ wallet: 'depositVaultUsyc', bucketId: 1 }],
        },
        instantLimits: {
          depositVaultUsyc: [{ window: days(1), limit: parseUnits('50000') }],
          redemptionVaultUsyc: [
            { window: days(1), limit: parseUnits('50000') },
          ],
        },
        setUsycConfig: {
          depositsEnabled: true,
          autoInvestFallbackEnabled: false,
        },
        preferLoanLiquidity: { redemptionVaultUsyc: false },
        pauseFunctions: {
          depositVaultUsyc: [
            'depositRequest',
            'depositRequestWithCustomRecipient',
          ],
          redemptionVaultUsyc: [
            'redeemRequest',
            'redeemRequestWithCustomRecipient',
          ],
        },
        setRoundDataDv: { data: 114000000 },
        setRoundDataRv: { data: 114000000 },
      },
    },
    [chainIds.sepolia]: {
      dvUsyc: {
        type: 'USYC',
        version: 'v2',
        enableSanctionsList: false,
        tokensReceiver: 'redemptionVaultUsyc',
        instantFee: 0,
        variationTolerance: 20,
        minAmount: 0,
        minMTokenAmountForFirstDeposit: 0,
      },
      rvUsyc: {
        type: 'USYC',
        version: 'v2',
        tokensReceiver: '0xa0819ae43115420beb161193b8D8Ba64C9f9faCC',
        requestRedeemer: '0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF',
        instantFee: 0,
        variationTolerance: 20,
        minAmount: 0,
        depositVault: { mToken: 'radUSD', depositVaultType: 'depositVault' },
      },
      postDeploy: {
        addPaymentTokens: {
          vaults: [
            {
              type: 'depositVault',
              paymentTokens: [
                {
                  token: 'radusd',
                  fee: 0,
                  isStable: true,
                  allowance: parseUnits('50000'),
                },
              ],
            },
            {
              type: 'redemptionVaultUsyc',
              paymentTokens: [
                {
                  token: 'radusd',
                  fee: 0,
                  isStable: true,
                  allowance: parseUnits('50000'),
                },
              ],
            },
          ],
        },
        grantRoles: {
          tokenManagerAddress: '0xEBbb09930F1AC97cc6b697DbD60734328De5BE0b',
          vaultsManagerAddress: '0x2ACB4BdCbEf02f81BF713b696Ac26390d7f79A12',
          oracleManagerAddress: '0xc6Cf625a84B4336577801F01D095c8642f6cEC32',
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
              // manager
              address: '0x17aE18CF8474dA65A2f3b395D48F2454F11f3d19',
              roles: [
                {
                  role: 'RAD_YC_AUTOMATION_ADMIN_ROLE',
                  delay: minutes(10),
                },
              ],
            },
            {
              // operator
              address: '0x309D1d913Ecbd6a028e08878803A776B177ee62F',
              roles: ['customFeedAdmin'],
            },
          ],
        },
        addFeeWaived: [
          {
            fromVault: { mToken: 'radUSD', type: 'depositVault' },
            toWaive: [{ type: 'redemptionVaultUsyc' }],
          },
          {
            fromVault: { mToken: 'radUSD', type: 'redemptionVault' },
            toWaive: [{ type: 'depositVaultUsyc' }],
          },
        ],
        greenlist: { depositVault: true, redemptionVault: true },
        setRoundDataRv: {
          data: 113950001,
        },
        setRoundDataDv: {
          data: 113950001,
        },
      },
    },
  },
};
