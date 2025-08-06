import { constants } from 'ethers';
import { parseUnits } from 'ethers/lib/utils';

import { chainIds } from '../../../config';
import { DeploymentConfig } from '../common/types';

export const hbUSDCDeploymentConfig: DeploymentConfig = {
  genericConfigs: {
    customAggregator: {
      minAnswer: parseUnits('0.1', 8),
      maxAnswer: parseUnits('1000', 8),
      maxAnswerDeviation: parseUnits('0.35', 8),
      description: 'hbUSDC/USD',
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
        swapperVault: 'dummy',
      },
    },
    [chainIds.hyperevm]: {
      dv: {
        feeReceiver: '0x1e625bDCA92D4F297dC6df57f255d48F470e2a00',
        tokensReceiver: '0xb25416121196C1e54Dd64F3481a5Bad3Ab2DFB2B',
        instantDailyLimit: parseUnits('25000000'),
        instantFee: parseUnits('0', 2),
        minMTokenAmountForFirstDeposit: parseUnits('0'),
        minAmount: parseUnits('0'),
        variationTolerance: parseUnits('0.6', 2),
      },
      rvSwapper: {
        type: 'SWAPPER',
        feeReceiver: '0x1e625bDCA92D4F297dC6df57f255d48F470e2a00',
        tokensReceiver: '0xb25416121196C1e54Dd64F3481a5Bad3Ab2DFB2B',
        instantDailyLimit: parseUnits('25000000'),
        instantFee: parseUnits('0.5', 2),
        minAmount: parseUnits('0'),
        variationTolerance: parseUnits('0.6', 2),
        fiatAdditionalFee: parseUnits('0.1', 2),
        fiatFlatFee: parseUnits('30'),
        minFiatRedeemAmount: parseUnits('1000'),
        requestRedeemer: '0xc7fD397f436B388D6c32342Cd15f028840F3D0C4',
        liquidityProvider: 'dummy',
        swapperVault: 'dummy',
      },
      postDeploy: {
        grantRoles: {
          tokenManagerAddress: '0x3e3619d5fAb6560c96Ebd6061e91f3A3A9d85a45',
          vaultsManagerAddress: '0x2ACB4BdCbEf02f81BF713b696Ac26390d7f79A12',
          oracleManagerAddress: '0x23e25dF521d1bb5fAB0CbEFD34E77D0A54429203',
        },
        setRoundData: {
          data: parseUnits('1', 8),
        },
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
                {
                  token: 'usde',
                  fee: 0,
                  isStable: true,
                  allowance: parseUnits('5000000'),
                },
                {
                  token: 'usr',
                  fee: 0,
                  isStable: true,
                  allowance: parseUnits('5000000'),
                },
              ],
            },
            {
              type: 'redemptionVaultSwapper',
              paymentTokens: [
                {
                  token: 'usdc',
                  fee: 0,
                  isStable: true,
                  allowance: parseUnits('1000000000'),
                },
                {
                  token: 'usde',
                  fee: 0,
                  isStable: true,
                  allowance: parseUnits('5000000'),
                },
                {
                  token: 'usr',
                  fee: 0,
                  isStable: true,
                  allowance: parseUnits('5000000'),
                },
              ],
            },
          ],
        },
      },
    },
  },
};
