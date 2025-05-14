import { constants } from 'ethers';
import { parseUnits } from 'ethers/lib/utils';

import { chainIds } from '../../../../config';
import { DeploymentConfig } from '../../common/types';

export const TACmMEVDeploymentConfig: DeploymentConfig = {
  genericConfigs: {},
  networkConfigs: {
    [chainIds.sepolia]: {
      dv: {
        feeReceiver: undefined,
        tokensReceiver: undefined,
        instantDailyLimit: constants.MaxUint256,
        instantFee: parseUnits('1', 2),
        minMTokenAmountForFirstDeposit: parseUnits('0.001'),
        minAmount: parseUnits('0.00001'),
        variationTolerance: parseUnits('0.1', 2),
      },
      rv: {
        type: 'REGULAR',
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
      },
    },
    [chainIds.tacTestnet]: {
      dv: {
        feeReceiver: undefined,
        tokensReceiver: undefined,
        instantDailyLimit: constants.MaxUint256,
        instantFee: parseUnits('1', 2),
        minMTokenAmountForFirstDeposit: parseUnits('0.001'),
        minAmount: parseUnits('0.00001'),
        variationTolerance: parseUnits('0.1', 2),
      },
      rv: {
        type: 'REGULAR',
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
      },
    },
    [chainIds.main]: {
      dv: {
        feeReceiver: '0xC7549dA15C20b50f305979b091C8a76dB2ba5f37',
        tokensReceiver: '0x1A57Aba59d50b192F8440e205E3B8B885bE128cC',
        instantDailyLimit: parseUnits('10000'),
        instantFee: parseUnits('0', 2),
        minMTokenAmountForFirstDeposit: parseUnits('0'),
        minAmount: parseUnits('0'),
        variationTolerance: parseUnits('0.3', 2),
        enableSanctionsList: true,
      },
      rv: {
        type: 'REGULAR',
        feeReceiver: '0xC7549dA15C20b50f305979b091C8a76dB2ba5f37',
        tokensReceiver: '0x5fEa8bc75bd0CeB9d476F3c9bcF2285ff90AB7D9',
        instantDailyLimit: parseUnits('10000'),
        instantFee: parseUnits('0', 2),
        minAmount: parseUnits('0'),
        variationTolerance: parseUnits('0.3', 2),
        fiatAdditionalFee: parseUnits('10', 2),
        fiatFlatFee: parseUnits('0', 18),
        minFiatRedeemAmount: parseUnits('1', 18),
        requestRedeemer: '0x6557733112cCc55A8d07dE4106B8cb0487BF8A8E',
        enableSanctionsList: true,
      },
    },
  },
};
