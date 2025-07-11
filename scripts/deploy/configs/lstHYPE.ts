import { constants } from 'ethers';
import { parseUnits } from 'ethers/lib/utils';

import { chainIds } from '../../../config';
import { DeploymentConfig } from '../common/types';

export const lstHYPEDeploymentConfig: DeploymentConfig = {
  genericConfigs: {
    customAggregator: {
      minAnswer: parseUnits('0.1', 8),
      maxAnswer: parseUnits('1000', 8),
      maxAnswerDeviation: parseUnits('0.12', 8),
      description: 'lstHYPE/HYPE',
    },
    dataFeed: {
      minAnswer: parseUnits('0.1', 8),
      maxAnswer: parseUnits('1000', 8),
      healthyDiff: 2592000,
    },
  },
  networkConfigs: {
    [chainIds.hyperevm]: {
      dv: {
        feeReceiver: '0x765d90a41C3f66ba51DD656a12Df5a1368b167D8',
        tokensReceiver: '0x1f5635d4981F2E90c58C8E19582f22c0a46227bB',
        instantDailyLimit: parseUnits('650000'),
        instantFee: parseUnits('0', 2),
        minMTokenAmountForFirstDeposit: parseUnits('0'),
        minAmount: parseUnits('0'),
        variationTolerance: parseUnits('0.15', 2),
      },
      rvSwapper: {
        type: 'SWAPPER',
        feeReceiver: '0xA66B5862FD471A1b1EeC8710071f3d085F79d5e4',
        tokensReceiver: '0x1f5635d4981F2E90c58C8E19582f22c0a46227bB',
        instantDailyLimit: parseUnits('650000'),
        instantFee: parseUnits('0.2', 2),
        minAmount: parseUnits('0'),
        variationTolerance: parseUnits('0.22', 2),
        fiatAdditionalFee: parseUnits('0.1', 2),
        fiatFlatFee: parseUnits('30'),
        minFiatRedeemAmount: parseUnits('1000'),
        requestRedeemer: '0xdF7feAADA36cf687962B286661A8b68CCA17E0f7',
        liquidityProvider: 'dummy',
        swapperVault: 'dummy',
      },
      postDeploy: {
        grantRoles: {
          providerType: 'hardhat',
          tokenManagerAddress: '0xf5D4f036856837adfb91CF863F470D215Cf8A99c',
          vaultsManagerAddress: '0x2ACB4BdCbEf02f81BF713b696Ac26390d7f79A12',
          oracleManagerAddress: '0xc42654209f9D82323cF335e3f7Ee7A0b7a88f7BE',
        },
      },
    },
  },
};
