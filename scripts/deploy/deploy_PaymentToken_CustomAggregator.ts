import { HardhatRuntimeEnvironment } from 'hardhat/types';

import { deployPaymentTokenCustomAggregator } from './common/data-feed';
import { DeployFunction } from './common/types';

import { PaymentTokenName } from '../../config';

const func: DeployFunction = async (
  hre: HardhatRuntimeEnvironment,
  paymentToken: PaymentTokenName,
) => {
  await deployPaymentTokenCustomAggregator(hre, paymentToken);
};

export default func;
