import { constants } from 'ethers';
import { parseUnits } from 'ethers/lib/utils';

import { chainIds } from '../../../config';
import { DeploymentConfig } from '../common/types';

export const mRe7ETHDeploymentConfig: DeploymentConfig = {
  genericConfigs: {
    customAggregator: {
      maxAnswerDeviation: parseUnits('0.3', 8),
      description: 'mRe7ETH/ETH',
    },
    dataFeed: {},
  },
  networkConfigs: {
    [chainIds.optimism]: {
      dv: {
        type: 'REGULAR',
        enableSanctionsList: true,
        feeReceiver: '0x1B63F7dB61c4dB587D47882aE5c038a494e76915',
        tokensReceiver: '0x67bA9B7Ed92fe260B0d21fFF5ef492B0118F4944',
        instantDailyLimit: constants.MaxUint256,
        instantFee: parseUnits('0', 2),
        variationTolerance: parseUnits('1.4', 2),
        minMTokenAmountForFirstDeposit: parseUnits('0', 18),
        maxSupplyCap: constants.MaxUint256,
      },
      rvSwapper: {
        type: 'SWAPPER',
        feeReceiver: '0xE4Cd2762054Fe5EcfEE0ed3219B5A315BA6cc157',
        tokensReceiver: '0x67bA9B7Ed92fe260B0d21fFF5ef492B0118F4944',
        requestRedeemer: '0x8C071c01041829Be1BEA1Fb6dAb7718eabf4c2AC',
        instantDailyLimit: parseUnits('100', 18),
        instantFee: parseUnits('0.5', 2),
        variationTolerance: parseUnits('1.4', 2),
        liquidityProvider: 'dummy',
        enableSanctionsList: true,
        swapperVault: 'dummy',
        minAmount: parseUnits('1'),
      },
      postDeploy: {
        addPaymentTokens: {
          vaults: [
            {
              paymentTokens: [
                {
                  token: 'weth',
                  allowance: parseUnits('100000', 18),
                },
                {
                  token: 'wsteth',
                  allowance: parseUnits('10000', 18),
                  isStable: false,
                },
                {
                  token: 'weeth',
                  allowance: parseUnits('10000', 18),
                  isStable: false,
                },
              ],
              type: 'depositVault',
            },
            {
              paymentTokens: [
                {
                  token: 'weth',
                  allowance: parseUnits('100000', 18),
                },
                {
                  token: 'wsteth',
                  allowance: parseUnits('10000', 18),
                  isStable: false,
                },
                {
                  token: 'weeth',
                  allowance: parseUnits('10000', 18),
                  isStable: false,
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
        setRoundData: {
          data: parseUnits('1', 8),
        },
        pauseFunctions: {
          depositVault: ['depositRequest', 'depositRequestWithCustomRecipient'],
          redemptionVaultSwapper: ['redeemFiatRequest'],
        },
      },
    },
  },
};
