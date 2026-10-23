import { constants } from 'ethers';
import { parseUnits } from 'ethers/lib/utils';

import { chainIds } from '../../../config';
import { DeploymentConfig } from '../common/types';

export const radUSDDeploymentConfig: DeploymentConfig = {
  genericConfigs: {
    // contracts require min < max, so the dv feed and data feed use opposite
    // one-unit ranges: only 100000000 passes both
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
    dataFeedDv: {
      healthyDiff: constants.MaxUint256,
      minAnswer: 99999999,
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
        enableSanctionsList: false,
        feeReceiver: '0x50e06C61ddFC01dD41AC368849bF09F48f343Bf6',
        tokensReceiver: 'redemptionVaultSwapper',
        instantDailyLimit: parseUnits('10000'),
        instantFee: 0,
        // ticket: 0, contracts require > 0
        variationTolerance: 1,
        minAmount: 0,
        minMTokenAmountForFirstDeposit: 0,
        maxSupplyCap: parseUnits('50000'),
      },
      rvSwapper: {
        type: 'SWAPPER',
        enableSanctionsList: false,
        feeReceiver: '0x50e06C61ddFC01dD41AC368849bF09F48f343Bf6',
        tokensReceiver: '0x50e06C61ddFC01dD41AC368849bF09F48f343Bf6',
        // ticket: n/a, contracts reject zero; unused while requests are paused
        requestRedeemer: '0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF',
        instantDailyLimit: parseUnits('10000'),
        instantFee: 0,
        // ticket: 0, contracts require > 0
        variationTolerance: 1,
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
                  token: 'usdc',
                  fee: 0,
                  isStable: true,
                  allowance: parseUnits('1000000000'),
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
              address: '0x8f07B60f369ab934Fd19d8110bD33E756b5576C5',
              roles: ['minter', 'burner'],
            },
            {
              address: '0xAC6582E504cea25ab4AC2b05123abF15458D4214',
              roles: ['depositVaultAdmin', 'redemptionVaultAdmin'],
            },
            {
              address: '0xbc2427DF1031e7daf0d3AaAa61aE0766cBeED4C7',
              roles: ['customFeedAdmin'],
            },
          ],
        },
        setRoundDataDv: { data: 100000000 },
        setRoundDataRv: { data: 100000000 },
        greenlist: { depositVault: true, redemptionVaultSwapper: true },
        pauseFunctions: {
          depositVault: [
            'depositRequest',
            'depositRequestWithCustomRecipient',
            'depositInstantWithCustomRecipient',
          ],
          redemptionVaultSwapper: [
            'redeemFiatRequest',
            'redeemRequestWithCustomRecipient',
            'redeemRequest',
            'redeemInstantWithCustomRecipient',
          ],
        },
      },
    },
  },
};
