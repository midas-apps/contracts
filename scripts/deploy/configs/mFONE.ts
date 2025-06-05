import { constants } from 'ethers';
import { parseUnits } from 'ethers/lib/utils';

import { chainIds } from '../../../config';
import { DeploymentConfig } from '../common/types';

export const mFONEDeploymentConfig: DeploymentConfig = {
  genericConfigs: {
    customAggregator: {
      minAnswer: parseUnits('0.1', 8),
      maxAnswer: parseUnits('1000', 8),
      maxAnswerDeviation: parseUnits('0.4', 8),
      description: 'mF-ONE/USD',
    },
    customAggregatorDiscounted: {
      discountPercentage: parseUnits('10', 8),
      underlyingFeed: 'customFeed',
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
        swapperVault: {
          mToken: 'mTBILL',
          redemptionVaultType: 'redemptionVaultBuidl',
        },
      },
      postDeploy: {
        grantRoles: {
          providerType: 'hardhat',
        },
      },
    },
    [chainIds.main]: {
      dv: {
        feeReceiver: '0x0ff15C0555Add64e53E8c738176D896D489F1F6D',
        tokensReceiver: '0x86B16681E21E857A9a71a8FDfC33AB1eB8213b74',
        instantDailyLimit: parseUnits('1000'),
        instantFee: parseUnits('0', 2),
        minMTokenAmountForFirstDeposit: parseUnits('0'),
        minAmount: parseUnits('0'),
        variationTolerance: parseUnits('0.6', 2),
        enableSanctionsList: true,
      },
      rvSwapper: {
        type: 'SWAPPER',
        feeReceiver: '0x0ff15C0555Add64e53E8c738176D896D489F1F6D',
        tokensReceiver: '0x86B16681E21E857A9a71a8FDfC33AB1eB8213b74',
        instantDailyLimit: parseUnits('1000'),
        instantFee: parseUnits('0.5', 2),
        minAmount: parseUnits('0'),
        variationTolerance: parseUnits('0.6', 2),
        fiatAdditionalFee: parseUnits('0.1', 2),
        fiatFlatFee: parseUnits('30'),
        minFiatRedeemAmount: parseUnits('1000'),
        requestRedeemer: '0x82FB69DD7f31eD9FF8A44579D674e5032A4adc9C',
        liquidityProvider: '0x4dc293e0d6BEfe6FCF9d1FFDEaA5266BD15C3071',
        swapperVault: {
          mToken: 'mTBILL',
          redemptionVaultType: 'redemptionVaultBuidl',
        },
        enableSanctionsList: true,
      },
    },
  },
};
