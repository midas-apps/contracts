import { HardhatRuntimeEnvironment } from 'hardhat/types';

import { getMTokenOrPaymentTokenOrThrow } from '../../../helpers/utils';
import {
  setRoundDataMToken,
  setRoundDataPaymentToken,
} from '../common/data-feed';
import { DeployFunction } from '../common/types';

const func: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  const { mToken, paymentToken } = getMTokenOrPaymentTokenOrThrow(hre);

  if (mToken) {
    await setRoundDataMToken(hre, mToken);
  } else {
    await setRoundDataPaymentToken(hre, paymentToken);
  }
};

export default func;
