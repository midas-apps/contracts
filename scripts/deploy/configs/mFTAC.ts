import { constants } from 'ethers';
import { parseUnits } from 'ethers/lib/utils';

import { chainIds } from '../../../config';
import { DeploymentConfig } from '../common/types';

export const mFTACDeploymentConfig: DeploymentConfig = {
  genericConfigs: {
    customAggregator: {
      minAnswer: parseUnits('10000', 8),
      maxAnswer: parseUnits('1000000', 8),
      maxAnswerDeviation: parseUnits('2.91', 8),
      description: 'mFTAC/USD',
    },
    dataFeed: {
      minAnswer: parseUnits('129000', 8),
      maxAnswer: parseUnits('150000', 8),
      healthyDiff: 2592000,
    },
    customAggregatorAdjustedDv: {
      adjustmentPercentage: parseUnits('7', 8),
      underlyingFeed: 'customFeed',
    },
    customAggregatorAdjustedRv: {
      adjustmentPercentage: parseUnits('-7', 8),
      underlyingFeed: 'customFeed',
    },
  },
  networkConfigs: {
    [chainIds.main]: {
      dv: {
        type: 'REGULAR',
        enableSanctionsList: true,
        feeReceiver: '0xBBDff4916Ab2d0a645786ef2121beff9E069374f',
        tokensReceiver: '0x95389f5D2E90b8EDF4B8099e63686fc0FbAdeA5d',
        instantDailyLimit: parseUnits('80', 18),
        instantFee: parseUnits('0', 2),
        variationTolerance: parseUnits('4', 2),
        minAmount: parseUnits('0.0000076923', 18),
        minMTokenAmountForFirstDeposit: parseUnits('0', 18),
        maxSupplyCap: constants.MaxUint256,
      },
      rvSwapper: {
        type: 'SWAPPER',
        feeReceiver: '0x95389f5D2E90b8EDF4B8099e63686fc0FbAdeA5d',
        tokensReceiver: '0x95389f5D2E90b8EDF4B8099e63686fc0FbAdeA5d',
        requestRedeemer: '0x11Cd45996c42b5EA9D1a3E240EF2F3bc8bA04e44',
        instantDailyLimit: parseUnits('4', 18),
        instantFee: parseUnits('0.5', 2),
        variationTolerance: parseUnits('4', 2),
        minAmount: parseUnits('0.0000076923', 18),
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
                  token: 'usdc',
                  allowance: parseUnits('1000000000', 18),
                  fee: 0,
                },
              ],
              type: 'depositVault',
            },
            {
              paymentTokens: [
                {
                  token: 'usdc',
                  allowance: parseUnits('1000000000', 18),
                  fee: 0,
                },
              ],
              type: 'redemptionVaultSwapper',
            },
          ],
        },
        grantRoles: {
          tokenManagerAddress: '0xf5F58b98f8dFF44143B78c1aD342Baf0E711EDfd',
          vaultsManagerAddress: '0x2ACB4BdCbEf02f81BF713b696Ac26390d7f79A12',
          oracleManagerAddress: '0x204aF6B96282befb1B449d3cAeC4CAe80464B80c',
        },
        greenlist: {
          depositVault: true,
          redemptionVaultSwapper: true,
        },
        pauseFunctions: {
          depositVault: ['depositRequest', 'depositRequestWithCustomRecipient'],
          redemptionVaultSwapper: ['redeemFiatRequest'],
        },
        setRoundData: {
          data: parseUnits('130000', 8),
        },
      },
    },
  },
};
