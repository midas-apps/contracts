import { constants } from 'ethers';
import { parseUnits } from 'ethers/lib/utils';

import { chainIds } from '../../../config';
import { DeploymentConfig } from '../common/types';

export const Re7ETHDeploymentConfig: DeploymentConfig = {
  genericConfigs: {
    customAggregator: {
      maxAnswerDeviation: parseUnits('0.13', 8),
      description: 'Re7ETH/ETH',
    },
    dataFeed: {
      minAnswer: parseUnits('0.9', 8),
      maxAnswer: parseUnits('1.05', 8),
      healthyDiff: 2592000,
    },
  },
  networkConfigs: {
    [chainIds.optimism]: {
      dv: {
        type: 'REGULAR',
        enableSanctionsList: true,
        feeReceiver: '0x59aD7daed3d2Fb2ABba653e7e7dd7ad459368f58',
        tokensReceiver: '0x39431c039B37AC481d4c8407A4768a818a809aE3',
        instantDailyLimit: constants.MaxUint256,
        instantFee: parseUnits('0', 2),
        variationTolerance: parseUnits('1', 2),
        minAmount: parseUnits('0.0005', 18),
        minMTokenAmountForFirstDeposit: parseUnits('0', 18),
        maxSupplyCap: constants.MaxUint256,
      },
      rvSwapper: {
        type: 'SWAPPER',
        feeReceiver: '0x59aD7daed3d2Fb2ABba653e7e7dd7ad459368f58',
        tokensReceiver: '0x39431c039B37AC481d4c8407A4768a818a809aE3',
        requestRedeemer: '0xdB5D85ee543d7961F333ed363133d3e13cD032F6',
        instantDailyLimit: parseUnits('5000', 18),
        instantFee: parseUnits('0.3', 2),
        variationTolerance: parseUnits('1', 2),
        minAmount: parseUnits('0.0005', 18),
        fiatFlatFee: parseUnits('30', 18),
        fiatAdditionalFee: parseUnits('0.1', 2),
        minFiatRedeemAmount: parseUnits('1000', 18),
        liquidityProvider: 'dummy',
        enableSanctionsList: true,
        swapperVault: 'dummy',
      },
      postDeploy: {
        addPaymentTokens: {
          vaults: [
            {
              paymentTokens: [
                {
                  token: 'weth',
                  allowance: parseUnits('100000', 18),
                  fee: 0,
                },
                {
                  token: 'wsteth',
                  allowance: parseUnits('10000', 18),
                  isStable: false,
                  fee: 0,
                },
                {
                  token: 'weeth',
                  allowance: parseUnits('10000', 18),
                  isStable: false,
                  fee: 0,
                },
              ],
              type: 'depositVault',
            },
            {
              paymentTokens: [
                {
                  token: 'weth',
                  allowance: parseUnits('100000', 18),
                  fee: 0,
                },
              ],
              type: 'redemptionVaultSwapper',
            },
          ],
        },
        grantRoles: {
          tokenManagerAddress: '0xf5885e74d573C28687CedFB3F3d904da4713b683',
          vaultsManagerAddress: '0x2ACB4BdCbEf02f81BF713b696Ac26390d7f79A12',
          oracleManagerAddress: '0xDd9f610732D0e37c806Dd1Dd775d63f169B2A1E9',
        },
        pauseFunctions: {
          depositVault: ['depositRequest', 'depositRequestWithCustomRecipient'],
          redemptionVaultSwapper: ['redeemFiatRequest'],
        },
        setRoundData: {
          data: parseUnits('1', 8),
        },
      },
    },
  },
};
