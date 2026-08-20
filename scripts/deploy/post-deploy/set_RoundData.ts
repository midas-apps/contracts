import { HardhatRuntimeEnvironment } from 'hardhat/types';

import { MTokenName, PaymentTokenName } from '../../../config';
import { requireOneOfMTokenOrPaymentToken } from '../../../helpers/utils';
import {
  setRoundDataMToken,
  setRoundDataPaymentToken,
} from '../common/data-feed';
import { DeployFunction } from '../common/types';

const func: DeployFunction = async (
  hre: HardhatRuntimeEnvironment,
  mToken?: MTokenName,
  paymentToken?: PaymentTokenName,
) => {
  const selected = requireOneOfMTokenOrPaymentToken(mToken, paymentToken);

  if (selected.mToken) {
    await setRoundDataMToken(hre, selected.mToken);
  } else {
    await setRoundDataPaymentToken(hre, selected.paymentToken);
  }
};

export default func;
