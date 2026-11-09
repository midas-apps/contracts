import { minutes } from '@nomicfoundation/hardhat-network-helpers/dist/src/helpers/time/duration';
import { parseUnits } from 'ethers/lib/utils';

import { chainIds } from '../../../config';
import { DeploymentConfig } from '../common/types';

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
      dv: {
        type: 'REGULAR',
        enableSanctionsList: false,
        feeReceiver: '0xfD1E38A01c581119030596e3D85D581bB03b1893',
        tokensReceiver: '0xe8ba9F9990402C0418BECaD66e6437d446Ff238F',
        instantDailyLimit: parseUnits('10000'),
        instantFee: 0,
        variationTolerance: 20,
        minAmount: 0,
        minMTokenAmountForFirstDeposit: 0,
        maxSupplyCap: parseUnits('50000'),
      },
      rvSwapper: {
        type: 'SWAPPER',
        enableSanctionsList: false,
        feeReceiver: '0xfD1E38A01c581119030596e3D85D581bB03b1893',
        tokensReceiver: '0xe8ba9F9990402C0418BECaD66e6437d446Ff238F',
        requestRedeemer: '0xEC8f02f1D082b00c92805f0Dca5D1d5a91983986',
        // ticket: 0, contracts require > 0; instant redeem stays paused
        instantDailyLimit: 1,
        instantFee: 0,
        variationTolerance: 20,
        minAmount: 0,
        fiatFlatFee: parseUnits('30'),
        fiatAdditionalFee: 10,
        liquidityProvider: 'dummy',
        swapperVault: 'dummy',
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
              type: 'redemptionVaultSwapper',
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
              address: '0x7fb58f658CAfF2A778303D31C1b9Bde59Ed2Ae90',
              roles: ['minter', 'burner'],
            },
            {
              address: '0xF270EDf3A35829F734c35F7E7d99292f78864ef2',
              roles: ['depositVaultAdmin', 'redemptionVaultAdmin'],
            },
            {
              address: '0x8a892CBfE74e483e3002F36E2fC8903a055a6972',
              roles: ['customFeedAdmin'],
            },
          ],
        },
        setRoundDataDv: { data: 114000000 },
        setRoundDataRv: { data: 114000000 },
        greenlist: { depositVault: true, redemptionVaultSwapper: true },
        pauseFunctions: {
          depositVault: [
            'depositRequest',
            'depositRequestWithCustomRecipient',
            'depositInstantWithCustomRecipient',
          ],
          redemptionVaultSwapper: [
            'redeemFiatRequest',
            'redeemInstantWithCustomRecipient',
            'redeemInstant',
            'redeemRequestWithCustomRecipient',
          ],
        },
      },
    },
    [chainIds.sepolia]: {
      dvUsyc: {
        type: 'REGULAR',
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
