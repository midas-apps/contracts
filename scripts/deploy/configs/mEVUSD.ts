import { constants } from 'ethers';
import { parseUnits } from 'ethers/lib/utils';

import { chainIds } from '../../../config';
import { DeploymentConfig } from '../common/types';

export const mEVUSDDeploymentConfig: DeploymentConfig = {
  genericConfigs: {
    customAggregator: {
      maxAnswerDeviation: parseUnits('0.32', 8),
      description: 'mEVUSD/USD',
    },
    dataFeed: {},
  },
  networkConfigs: {
    [chainIds.main]: {
      dv: {
        type: 'REGULAR',
        enableSanctionsList: true,
        feeReceiver: '0x1e7da1309018c91dF9D35593a442D975A5bbA981',
        tokensReceiver: '0xd2Ed16384F0155d8c77283C60895714EBb4dbEEc',
        instantDailyLimit: constants.MaxUint256,
        instantFee: parseUnits('0', 2),
        variationTolerance: parseUnits('0.5', 2),
        minMTokenAmountForFirstDeposit: parseUnits('125000', 18),
        maxSupplyCap: parseUnits('50000000', 18),
      },
      rvSwapper: {
        type: 'SWAPPER',
        feeReceiver: '0xf4DDe2C45Cc9C96a6873724105f21a4A8865f9dD',
        tokensReceiver: '0xd2Ed16384F0155d8c77283C60895714EBb4dbEEc',
        requestRedeemer: '0x701bdd6876ced42b86564dFf8106F1CEe76055Da',
        instantDailyLimit: constants.MaxUint256,
        instantFee: parseUnits('0.5', 2),
        variationTolerance: parseUnits('0.5', 2),
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
        grantRoles: {
          tokenManagerAddress: '0x37144C5762F39024aA4D6fEa92F82685D93ae708',
          vaultsManagerAddress: '0x2ACB4BdCbEf02f81BF713b696Ac26390d7f79A12',
          oracleManagerAddress: '0x8F2e0d2aF1102033C363331f213c62BE2e6DF043',
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
