import { constants } from 'ethers';
import { parseUnits } from 'ethers/lib/utils';

import { chainIds } from '../../../config';
import { DeploymentConfig } from '../common/types';

export const mEDGEDeploymentConfig: DeploymentConfig = {
  genericConfigs: {
    customAggregator: {
      minAnswer: parseUnits('0.1', 8),
      maxAnswer: parseUnits('1000', 8),
      maxAnswerDeviation: parseUnits('0.35', 8),
      description: 'mEDGE/USD',
    },
    dataFeed: {
      minAnswer: parseUnits('0.1', 8),
      maxAnswer: parseUnits('1000', 8),
      healthyDiff: 2592000,
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
        feeReceiver: '0xF9C2E91d6d43B2A7e7c4A9dDb3E56564F1a7f7d4',
        tokensReceiver: '0xc93437a52aF5190C536ce6d994331f2Cc3e44E18',
        instantDailyLimit: parseUnits('10000000'),
        instantFee: parseUnits('0', 2),
        minMTokenAmountForFirstDeposit: parseUnits('0'),
        minAmount: parseUnits('0'),
        variationTolerance: parseUnits('5', 2),
        enableSanctionsList: true,
      },
      rvSwapper: {
        type: 'SWAPPER',
        feeReceiver: '0xF9C2E91d6d43B2A7e7c4A9dDb3E56564F1a7f7d4',
        tokensReceiver: '0xc93437a52aF5190C536ce6d994331f2Cc3e44E18',
        instantDailyLimit: parseUnits('1000000'),
        instantFee: parseUnits('0.5', 2),
        minAmount: parseUnits('0'),
        variationTolerance: parseUnits('5', 2),
        fiatAdditionalFee: parseUnits('0.1', 2),
        fiatFlatFee: parseUnits('30'),
        minFiatRedeemAmount: parseUnits('1000'),
        requestRedeemer: '0x9ffFe9FcE62204de42aE91b965b44062c0f3c70F',
        liquidityProvider: '0x38C25B85BC5F9Dac55F974e4eE4A895961418267',
        swapperVault: {
          mToken: 'mBASIS',
          redemptionVaultType: 'redemptionVaultSwapper',
        },
      },
    },
    [chainIds.base]: {
      dv: {
        feeReceiver: '0xF9C2E91d6d43B2A7e7c4A9dDb3E56564F1a7f7d4',
        tokensReceiver: '0xc93437a52aF5190C536ce6d994331f2Cc3e44E18',
        instantDailyLimit: parseUnits('10000000'),
        instantFee: parseUnits('0', 2),
        minMTokenAmountForFirstDeposit: parseUnits('0'),
        minAmount: parseUnits('0'),
        variationTolerance: parseUnits('5', 2),
      },
      rvSwapper: {
        type: 'SWAPPER',
        feeReceiver: '0xF9C2E91d6d43B2A7e7c4A9dDb3E56564F1a7f7d4',
        tokensReceiver: '0xc93437a52aF5190C536ce6d994331f2Cc3e44E18',
        instantDailyLimit: parseUnits('1000000'),
        instantFee: parseUnits('0.5', 2),
        minAmount: parseUnits('0'),
        variationTolerance: parseUnits('5', 2),
        fiatAdditionalFee: parseUnits('0.1', 2),
        fiatFlatFee: parseUnits('30'),
        minFiatRedeemAmount: parseUnits('1000'),
        requestRedeemer: '0x9ffFe9FcE62204de42aE91b965b44062c0f3c70F',
        liquidityProvider: '0xD7c27BCF825094a1732a83369Ca9475aE702522b',
        swapperVault: {
          mToken: 'mBASIS',
          redemptionVaultType: 'redemptionVaultSwapper',
        },
      },
    },
    [chainIds.arbitrum]: {
      dv: {
        feeReceiver: '0xF9C2E91d6d43B2A7e7c4A9dDb3E56564F1a7f7d4',
        tokensReceiver: '0xc93437a52aF5190C536ce6d994331f2Cc3e44E18',
        instantDailyLimit: parseUnits('10000000'),
        instantFee: parseUnits('0', 2),
        minMTokenAmountForFirstDeposit: parseUnits('0'),
        minAmount: parseUnits('0'),
        variationTolerance: parseUnits('5', 2),
      },
      rvSwapper: {
        type: 'SWAPPER',
        feeReceiver: '0xF9C2E91d6d43B2A7e7c4A9dDb3E56564F1a7f7d4',
        tokensReceiver: '0xc93437a52aF5190C536ce6d994331f2Cc3e44E18',
        instantDailyLimit: parseUnits('1000000'),
        instantFee: parseUnits('0.5', 2),
        minAmount: parseUnits('0'),
        variationTolerance: parseUnits('5', 2),
        fiatAdditionalFee: parseUnits('0.1', 2),
        fiatFlatFee: parseUnits('30'),
        minFiatRedeemAmount: parseUnits('1000'),
        requestRedeemer: '0x9ffFe9FcE62204de42aE91b965b44062c0f3c70F',
        liquidityProvider: '0x915E287EEa9594963B33FD12bF908312B5D860d2',
        swapperVault: {
          mToken: 'mBASIS',
          redemptionVaultType: 'redemptionVaultSwapper',
        },
      },
    },
    [chainIds.plume]: {
      dv: {
        feeReceiver: '0x0461bD693caE49bE9d030E5c212e080F9c78B846',
        tokensReceiver: '0x0527fb945257Ee3B6821D8E3CF0AB60Cb74c5a47',
        instantDailyLimit: parseUnits('1000'),
        instantFee: parseUnits('0', 2),
        minMTokenAmountForFirstDeposit: parseUnits('0'),
        minAmount: parseUnits('0'),
        variationTolerance: parseUnits('0.77', 2),
      },
      rvSwapper: {
        type: 'SWAPPER',
        feeReceiver: '0x0461bD693caE49bE9d030E5c212e080F9c78B846',
        tokensReceiver: '0x0527fb945257Ee3B6821D8E3CF0AB60Cb74c5a47',
        instantDailyLimit: parseUnits('1000000'),
        instantFee: parseUnits('0.77', 2),
        minAmount: parseUnits('0'),
        variationTolerance: parseUnits('0.77', 2),
        fiatAdditionalFee: parseUnits('0.1', 2),
        fiatFlatFee: parseUnits('30', 18),
        minFiatRedeemAmount: parseUnits('1000', 18),
        requestRedeemer: '0x45E8D67683E93F9A265932Dcf4b7Aa41cd16786c',
        liquidityProvider: '0x0461bD693caE49bE9d030E5c212e080F9c78B846',
        swapperVault: {
          mToken: 'mTBILL',
          redemptionVaultType: 'redemptionVault',
        },
      },
    },
    [chainIds.tac]: {
      postDeploy: {
        grantRoles: {
          oracleManagerAddress: '0xC58Da118Db7a0A8d0f79a661179278bedACD4634',
          tokenManagerAddress: '0xBCAd9b88156653817493ae35531336E225f5295B',
          vaultsManagerAddress: '0x2ACB4BdCbEf02f81BF713b696Ac26390d7f79A12',
        },
      },
    },
    [chainIds.zerog]: {
      dv: {
        type: 'REGULAR',
        feeReceiver: '0x35e18996272ed9FCb6747F99C3D956839A1c58D0',
        tokensReceiver: '0x40767f7cBfb04b6030513e1B96139FE917A4A4DA',
        instantDailyLimit: parseUnits('20000000', 18),
        instantFee: parseUnits('0', 2),
        variationTolerance: parseUnits('0.77', 2),
        maxSupplyCap: constants.MaxUint256,
      },
      rvSwapper: {
        type: 'SWAPPER',
        feeReceiver: '0x9494F3A304194b79c97Bd1D440A33f0693C096D4',
        tokensReceiver: '0x9494F3A304194b79c97Bd1D440A33f0693C096D4',
        requestRedeemer: '0xF2327b14fCD179Ff1A457aD9f68e74DcFCaF0268',
        instantDailyLimit: parseUnits('20000000', 18),
        instantFee: parseUnits('0.5', 2),
        variationTolerance: parseUnits('0.77', 2),
        liquidityProvider: 'dummy',
        swapperVault: 'dummy',
      },
      postDeploy: {
        grantRoles: {
          tokenManagerAddress: '0xBCAd9b88156653817493ae35531336E225f5295B',
          vaultsManagerAddress: '0x2ACB4BdCbEf02f81BF713b696Ac26390d7f79A12',
          oracleManagerAddress: '0xC58Da118Db7a0A8d0f79a661179278bedACD4634',
        },
        setRoundData: {
          data: parseUnits('1', 8),
        },
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
      },
    },
  },
};
