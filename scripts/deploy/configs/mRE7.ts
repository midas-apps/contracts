import { constants } from 'ethers';
import { parseUnits } from 'ethers/lib/utils';

import { chainIds } from '../../../config';
import { DeploymentConfig } from '../common/types';

export const mRE7DeploymentConfig: DeploymentConfig = {
  genericConfigs: {
    customAggregator: {
      minAnswer: parseUnits('0.1', 8),
      maxAnswer: parseUnits('1000', 8),
      maxAnswerDeviation: parseUnits('2', 8),
      description: 'mRe7YIELD/USD',
    },
    dataFeed: {
      minAnswer: parseUnits('0.1', 8),
      maxAnswer: parseUnits('1000', 8),
      healthyDiff: 8208000,
    },
  },
  networkConfigs: {
    [chainIds.sepolia]: {
      dv: {
        feeReceiver: undefined,
        tokensReceiver: undefined,
        instantDailyLimit: constants.MaxUint256,
        instantFee: parseUnits('1', 2),
        minMTokenAmountForFirstDeposit: parseUnits('100'),
        minAmount: parseUnits('0.01'),
        variationTolerance: parseUnits('0.1', 2),
      },
      rvSwapper: {
        type: 'SWAPPER',
        feeReceiver: undefined,
        tokensReceiver: undefined,
        instantDailyLimit: constants.MaxUint256,
        instantFee: parseUnits('1', 2),
        minAmount: parseUnits('0.01'),
        variationTolerance: parseUnits('0.1', 2),
        fiatAdditionalFee: parseUnits('0.1', 2),
        fiatFlatFee: parseUnits('0.1', 18),
        minFiatRedeemAmount: parseUnits('1', 18),
        requestRedeemer: undefined,
        liquidityProvider: undefined,
        swapperVault: {
          mToken: 'mBASIS',
          redemptionVaultType: 'redemptionVaultSwapper',
        },
      },
    },
    [chainIds.main]: {
      dv: {
        feeReceiver: '0x4be07162e3A4e372e74121B418bdC057a4E31b43',
        tokensReceiver: '0x246778D5cD7ab54DB8Ad160f8b3Ab0b213983dfc',
        instantDailyLimit: parseUnits('10000000'),
        instantFee: parseUnits('0', 2),
        minMTokenAmountForFirstDeposit: parseUnits('0'),
        minAmount: parseUnits('0'),
        variationTolerance: parseUnits('5', 2),
        enableSanctionsList: true,
      },
      rvSwapper: {
        type: 'SWAPPER',
        feeReceiver: '0x4be07162e3A4e372e74121B418bdC057a4E31b43',
        tokensReceiver: '0x246778D5cD7ab54DB8Ad160f8b3Ab0b213983dfc',
        instantDailyLimit: parseUnits('1000000'),
        instantFee: parseUnits('0', 2),
        minAmount: parseUnits('0'),
        variationTolerance: parseUnits('5', 2),
        fiatAdditionalFee: parseUnits('0.1', 2),
        fiatFlatFee: parseUnits('30'),
        minFiatRedeemAmount: parseUnits('1000'),
        requestRedeemer: '0xC9be8B77Efa255978F3be805e620A9edF528CFc2',
        liquidityProvider: '0x33485Ef31Bddf267F47A044Ab832Bde51469db2b',
        swapperVault: {
          mToken: 'mBASIS',
          redemptionVaultType: 'redemptionVaultSwapper',
        },
        enableSanctionsList: true,
      },
    },
    [chainIds.base]: {
      dv: {
        feeReceiver: '0x4be07162e3A4e372e74121B418bdC057a4E31b43',
        tokensReceiver: '0x246778D5cD7ab54DB8Ad160f8b3Ab0b213983dfc',
        instantDailyLimit: parseUnits('10000000'),
        instantFee: parseUnits('0', 2),
        minMTokenAmountForFirstDeposit: parseUnits('0'),
        minAmount: parseUnits('0'),
        variationTolerance: parseUnits('5', 2),
      },
      rvSwapper: {
        type: 'SWAPPER',
        feeReceiver: '0x4be07162e3A4e372e74121B418bdC057a4E31b43',
        tokensReceiver: '0x246778D5cD7ab54DB8Ad160f8b3Ab0b213983dfc',
        instantDailyLimit: parseUnits('1000000'),
        instantFee: parseUnits('0', 2),
        minAmount: parseUnits('0'),
        variationTolerance: parseUnits('5', 2),
        fiatAdditionalFee: parseUnits('0.1', 2),
        fiatFlatFee: parseUnits('30'),
        minFiatRedeemAmount: parseUnits('1000'),
        requestRedeemer: '0xC9be8B77Efa255978F3be805e620A9edF528CFc2',
        liquidityProvider: '0xD7c27BCF825094a1732a83369Ca9475aE702522b',
        swapperVault: {
          mToken: 'mBASIS',
          redemptionVaultType: 'redemptionVaultSwapper',
        },
      },
    },
    [chainIds.arbitrum]: {
      dv: {
        feeReceiver: '0x4be07162e3A4e372e74121B418bdC057a4E31b43',
        tokensReceiver: '0x246778D5cD7ab54DB8Ad160f8b3Ab0b213983dfc',
        instantDailyLimit: parseUnits('10000000'),
        instantFee: parseUnits('0', 2),
        minMTokenAmountForFirstDeposit: parseUnits('0'),
        minAmount: parseUnits('0'),
        variationTolerance: parseUnits('5', 2),
      },
      rvSwapper: {
        type: 'SWAPPER',
        feeReceiver: '0x4be07162e3A4e372e74121B418bdC057a4E31b43',
        tokensReceiver: '0x246778D5cD7ab54DB8Ad160f8b3Ab0b213983dfc',
        instantDailyLimit: parseUnits('1000000'),
        instantFee: parseUnits('0', 2),
        minAmount: parseUnits('0'),
        variationTolerance: parseUnits('5', 2),
        fiatAdditionalFee: parseUnits('0.1', 2),
        fiatFlatFee: parseUnits('30'),
        minFiatRedeemAmount: parseUnits('1000'),
        requestRedeemer: '0xC9be8B77Efa255978F3be805e620A9edF528CFc2',
        liquidityProvider: '0x915E287EEa9594963B33FD12bF908312B5D860d2',
        swapperVault: {
          mToken: 'mBASIS',
          redemptionVaultType: 'redemptionVaultSwapper',
        },
      },
    },
    [chainIds.etherlink]: {
      dv: {
        feeReceiver: '0x13B01b88A8b8EF1627B754361D155646a548DB53',
        tokensReceiver: '0xeE2B97366Bd326aac51baBaa09DBa1B6723a71e1',
        instantDailyLimit: 1,
        instantFee: parseUnits('0', 2),
        minMTokenAmountForFirstDeposit: parseUnits('0'),
        minAmount: parseUnits('0'),
        variationTolerance: parseUnits('5', 2),
        enableSanctionsList: false,
      },
      rvSwapper: {
        type: 'SWAPPER',
        feeReceiver: '0x13B01b88A8b8EF1627B754361D155646a548DB53',
        tokensReceiver: '0xeE2B97366Bd326aac51baBaa09DBa1B6723a71e1',
        instantDailyLimit: 1,
        instantFee: parseUnits('0', 2),
        minAmount: parseUnits('0'),
        variationTolerance: parseUnits('5', 2),
        fiatAdditionalFee: parseUnits('0.1', 2),
        fiatFlatFee: parseUnits('30'),
        minFiatRedeemAmount: parseUnits('1000'),
        requestRedeemer: '0x2Da87e5100E7E2F2f268FbF2B5E9044dE2b78D65',
        liquidityProvider: 'dummy',
        swapperVault: 'dummy',
        enableSanctionsList: false,
      },
      postDeploy: {
        pauseFunctions: {
          depositVault: ['depositInstant', 'depositInstantWithCustomRecipient'],
          redemptionVaultSwapper: [
            'redeemInstant',
            'redeemInstantWithCustomRecipient',
          ],
        },
        setRoundData: {
          data: parseUnits('1.03190694', 8),
        },
        grantRoles: {
          tokenManagerAddress: '0xb755FF07FD80B38265Ae35639568CfCdc874f21D',
          vaultsManagerAddress: '0x2ACB4BdCbEf02f81BF713b696Ac26390d7f79A12',
          oracleManagerAddress: '0x07BA5A7814FC2C6696EbeD0238Bb74B5b77eb7Eb',
        },
        addPaymentTokens: {
          vaults: [
            {
              paymentTokens: [
                {
                  token: 'usdc',
                  allowance: parseUnits('10000000'),
                },
              ],
              type: 'depositVault',
            },
            {
              paymentTokens: [
                {
                  token: 'usdc',
                  allowance: parseUnits('10000000'),
                },
              ],
              type: 'redemptionVaultSwapper',
            },
          ],
        },
      },
    },
    [chainIds.zerog]: {
      postDeploy: {
        grantRoles: {
          tokenManagerAddress: '0xb755FF07FD80B38265Ae35639568CfCdc874f21D',
          vaultsManagerAddress: '0x2ACB4BdCbEf02f81BF713b696Ac26390d7f79A12',
          oracleManagerAddress: '0x07BA5A7814FC2C6696EbeD0238Bb74B5b77eb7Eb',
        },
      },
    },
  },
};
