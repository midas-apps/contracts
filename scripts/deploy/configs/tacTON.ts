import { constants } from 'ethers';
import { parseUnits } from 'ethers/lib/utils';

import { chainIds } from '../../../config';
import { DeploymentConfig } from '../common/types';

export const tacTONDeploymentConfig: DeploymentConfig = {
  genericConfigs: {
    customAggregator: {
      maxAnswerDeviation: parseUnits('0.2', 8),
      description: 'tacTON/TON',
    },
    dataFeed: {},
  },
  networkConfigs: {
    [chainIds.tac]: {
      dv: {
        type: 'REGULAR',
        enableSanctionsList: false,
        feeReceiver: '0xaf5E9657b07134a93cc877339030C439a9d5581c',
        tokensReceiver: '0x6948f7D5B3276B87B18019C0530c27576aCF0210',
        instantDailyLimit: constants.MaxUint256,
        instantFee: parseUnits('0', 2),
        variationTolerance: parseUnits('0.55', 2),
        maxSupplyCap: constants.MaxUint256,
      },
      rvSwapper: {
        type: 'SWAPPER',
        feeReceiver: '0x533d739ed53fA5Cf3fd26dd1f029E0738330b6EA',
        tokensReceiver: '0x6948f7D5B3276B87B18019C0530c27576aCF0210',
        requestRedeemer: '0x04e774f3D9470Ecad8AfD68CAB857f9001EAC43D',
        instantDailyLimit: constants.MaxUint256,
        instantFee: parseUnits('0.3', 2),
        variationTolerance: parseUnits('0.55', 2),
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
                  token: 'ton',
                  allowance: parseUnits('1000000000', 18),
                },
              ],
              type: 'depositVault',
            },
            {
              paymentTokens: [
                {
                  token: 'ton',
                  allowance: parseUnits('1000000000', 18),
                },
              ],
              type: 'redemptionVaultSwapper',
            },
          ],
        },
        grantRoles: {
          tokenManagerAddress: '0x3Dfcf9f578C57869b408911b64D22cDC47670f01',
          vaultsManagerAddress: '0x2ACB4BdCbEf02f81BF713b696Ac26390d7f79A12',
          oracleManagerAddress: '0x791d82Ea11DD386fE4C239C3C290f43935cEE1bd',
        },
        setRoundData: {
          data: parseUnits('1', 8),
        },
      },
    },
  },
};
