import { constants } from 'ethers';
import { parseUnits } from 'ethers/lib/utils';

import { chainIds } from '../../../config';
import { DeploymentConfig } from '../common/types';

export const weEURDeploymentConfig: DeploymentConfig = {
  genericConfigs: {
    customAggregator: {
      maxAnswerDeviation: parseUnits('0.2', 8),
      description: 'weEUR/EUR',
    },
    dataFeed: {},
  },
  networkConfigs: {
    [chainIds.scroll]: {
      dv: {
        type: 'REGULAR',
        enableSanctionsList: false,
        feeReceiver: '0x5115C8927be378544377D0705f227818F3a46720',
        tokensReceiver: '0x8e51848c00f0EBCeeCea051281F5939a5d7dC785',
        instantDailyLimit: constants.MaxUint256,
        instantFee: parseUnits('0', 2),
        variationTolerance: parseUnits('0.25', 2),
        minMTokenAmountForFirstDeposit: parseUnits('0', 18),
        maxSupplyCap: constants.MaxUint256,
      },
      rvSwapper: {
        type: 'SWAPPER',
        feeReceiver: '0x6118eeBde31Ad8988197eC755a2a23eD7881A83D',
        tokensReceiver: '0x8e51848c00f0EBCeeCea051281F5939a5d7dC785',
        requestRedeemer: '0x2c60F307B18FE69d64ff2c2DF611dc792Fcb9668',
        instantDailyLimit: constants.MaxUint256,
        instantFee: parseUnits('0.3', 2),
        variationTolerance: parseUnits('0.25', 2),
        liquidityProvider: 'dummy',
        enableSanctionsList: false,
        swapperVault: 'dummy',
      },
      postDeploy: {
        addPaymentTokens: {
          vaults: [
            {
              paymentTokens: [
                {
                  token: 'eurc',
                  allowance: parseUnits('100000000', 18),
                },
              ],
              type: 'depositVault',
            },
            {
              paymentTokens: [
                {
                  token: 'eurc',
                  allowance: parseUnits('100000000', 18),
                },
              ],
              type: 'redemptionVaultSwapper',
            },
          ],
        },
        grantRoles: {
          tokenManagerAddress: '0x0a113a981844c6Edeb2741F2368df87bA815CC29',
          vaultsManagerAddress: '0x2ACB4BdCbEf02f81BF713b696Ac26390d7f79A12',
          oracleManagerAddress: '0xb7c962313B145Ad21200E7716D466befB1592838',
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
