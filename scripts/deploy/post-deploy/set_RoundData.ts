import { HardhatRuntimeEnvironment } from 'hardhat/types';

import { MTokenName, PaymentTokenName } from '../../../config';
import { requireOneOfMTokenOrPaymentToken } from '../../../helpers/utils';
import {
  FeedTarget,
  setRoundDataMToken,
  setRoundDataPaymentToken,
} from '../common/data-feed';
import { DeployFunction } from '../common/types';

const func: DeployFunction = async (
  hre: HardhatRuntimeEnvironment,
  mToken?: MTokenName,
  paymentToken?: PaymentTokenName,
  feedTarget?: FeedTarget,
) => {
  const selected = requireOneOfMTokenOrPaymentToken(mToken, paymentToken);

  if (selected.mToken) {
    await setRoundDataMToken(hre, selected.mToken, feedTarget);
  } else {
    if (feedTarget !== undefined) {
      throw new Error('--feed is supported only for mTokens');
    }
    await setRoundDataPaymentToken(hre, selected.paymentToken);
  }
};

export default func;
