import { constants } from 'ethers';
import { parseUnits } from 'ethers/lib/utils';

import { chainIds } from '../../../config';
import { DeploymentConfig } from '../common/types';

export const mEVETHDeploymentConfig: DeploymentConfig = {
  genericConfigs: {
    customAggregator: {
      maxAnswerDeviation: parseUnits('0.18', 8),
      description: 'mEVETH/ETH',
    },
    dataFeed: {},
  },
  networkConfigs: {
    [chainIds.main]: {
      dv: {
        type: 'REGULAR',
        enableSanctionsList: true,
        feeReceiver: '0x420e09d01d1Bc97667bA88581C595CCfb4DCD1a8',
        tokensReceiver: '0xA36E947C7852F9bFC04972f5963B36c600C446d8',
        instantDailyLimit: constants.MaxUint256,
        instantFee: parseUnits('0', 2),
        variationTolerance: parseUnits('0.2', 2),
        minMTokenAmountForFirstDeposit: parseUnits('0', 18),
        maxSupplyCap: parseUnits('50000000', 18),
      },
      rvSwapper: {
        type: 'SWAPPER',
        feeReceiver: '0x4e2cAD8E8916451F8B48e5d3203177c82FF28958',
        tokensReceiver: '0xA36E947C7852F9bFC04972f5963B36c600C446d8',
        requestRedeemer: '0x72dEA89B650cE52Be26A8eDaFC81fB586a33A974',
        instantDailyLimit: parseUnits('100000', 18),
        instantFee: parseUnits('0.3', 2),
        variationTolerance: parseUnits('0.2', 2),
        liquidityProvider: 'dummy',
        enableSanctionsList: true,
        swapperVault: 'dummy',
        minAmount: parseUnits('0.00049', 18),
        fiatAdditionalFee: parseUnits('0.1', 2),
        fiatFlatFee: parseUnits('30', 18),
      },
      postDeploy: {
        addPaymentTokens: {
          vaults: [
            {
              paymentTokens: [
                {
                  token: 'weth',
                  allowance: parseUnits('1000000000', 18),
                },
              ],
              type: 'depositVault',
            },
            {
              paymentTokens: [
                {
                  token: 'weth',
                  allowance: parseUnits('1000000000', 18),
                },
              ],
              type: 'redemptionVaultSwapper',
            },
          ],
        },
        grantRoles: {
          tokenManagerAddress: '0x2C4Cd7E9D027b8b6eAb96Ffb74b0944C72ADD2DA',
          vaultsManagerAddress: '0x2ACB4BdCbEf02f81BF713b696Ac26390d7f79A12',
          oracleManagerAddress: '0x2B6C49Bf4735596659946E4E5509809d33DC3FAc',
        },
        setRoundData: {
          data: parseUnits('1', 8),
        },
        pauseFunctions: {
          redemptionVaultSwapper: ['redeemFiatRequest'],
          depositVault: ['depositRequest', 'depositRequestWithCustomRecipient'],
        },
      },
    },
  },
};
