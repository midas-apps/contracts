import { HardhatRuntimeEnvironment } from 'hardhat/types';

import { deployPaymentTokenDataFeed } from './common/data-feed';
import { DeployFunction } from './common/types';

import { PaymentTokenName } from '../../config';

const func: DeployFunction = async (
  hre: HardhatRuntimeEnvironment,
  paymentToken: PaymentTokenName,
  aggregatorType?: 'numerator' | 'denominator',
) => {
  await deployPaymentTokenDataFeed(hre, paymentToken, aggregatorType);
};

export default func;
