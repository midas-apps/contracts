import { HardhatRuntimeEnvironment } from 'hardhat/types';

import { MTokenName, PaymentTokenName } from '../../../config';
import { requireOneOfMTokenOrPaymentToken } from '../../../helpers/utils';
import {
  AggregatorType,
  updateExpectedAnswersMToken,
  updateExpectedAnswersPaymentToken,
} from '../common/data-feed';
import { DeployFunction } from '../common/types';

const func: DeployFunction = async (
  hre: HardhatRuntimeEnvironment,
  mToken?: MTokenName,
  paymentToken?: PaymentTokenName,
  aggregatorType?: AggregatorType,
) => {
  const selected = requireOneOfMTokenOrPaymentToken(mToken, paymentToken);

  if (selected.mToken) {
    if (aggregatorType) {
      throw new Error('aggregatorType is only supported for payment tokens');
    }
    await updateExpectedAnswersMToken(hre, selected.mToken);
  } else {
    await updateExpectedAnswersPaymentToken(
      hre,
      selected.paymentToken,
      aggregatorType,
    );
  }
};

export default func;
