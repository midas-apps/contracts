import { HardhatRuntimeEnvironment } from 'hardhat/types';

import { MTokenName, PaymentTokenName } from '../../../config';
import { requireOneOfMTokenOrPaymentToken } from '../../../helpers/utils';
import {
  updateExpectedAnswersMToken,
  updateExpectedAnswersPaymentToken,
} from '../common/data-feed';
import { DeployFunction } from '../common/types';

const func: DeployFunction = async (
  hre: HardhatRuntimeEnvironment,
  mToken?: MTokenName,
  paymentToken?: PaymentTokenName,
) => {
  const selected = requireOneOfMTokenOrPaymentToken(mToken, paymentToken);

  if (selected.mToken) {
    await updateExpectedAnswersMToken(hre, selected.mToken);
  } else {
    await updateExpectedAnswersPaymentToken(hre, selected.paymentToken);
  }
};

export default func;
