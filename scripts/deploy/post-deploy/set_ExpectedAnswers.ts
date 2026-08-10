import { HardhatRuntimeEnvironment } from 'hardhat/types';

import { getMTokenOrPaymentTokenOrThrow } from '../../../helpers/utils';
import {
  updateExpectedAnswersMToken,
  updateExpectedAnswersPaymentToken,
} from '../common/data-feed';
import { DeployFunction } from '../common/types';

const func: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  const { mToken, paymentToken } = getMTokenOrPaymentTokenOrThrow(hre);

  if (mToken) {
    await updateExpectedAnswersMToken(hre, mToken);
  } else {
    await updateExpectedAnswersPaymentToken(hre, paymentToken);
  }
};

export default func;
