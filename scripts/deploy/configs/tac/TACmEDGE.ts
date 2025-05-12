import { constants } from 'ethers';
import { parseUnits } from 'ethers/lib/utils';

import { chainIds } from '../../../../config';
import { DeploymentConfig } from '../../common/types';

export const TACmEDGEDeploymentConfig: DeploymentConfig = {
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
    },
    [chainIds.main]: {
      dv: {
        feeReceiver: '0xC7549dA15C20b50f305979b091C8a76dB2ba5f37',
        tokensReceiver: '0xa85b5Dd222A71602FcA40410bc1f158bff1fa458',
        instantDailyLimit: parseUnits('10000'),
        instantFee: parseUnits('0', 2),
        minMTokenAmountForFirstDeposit: parseUnits('0'),
        minAmount: parseUnits('0'),
        variationTolerance: parseUnits('0.3', 2),
        enableSanctionsList: true,
      },
    },
  },
};
