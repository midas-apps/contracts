import { HardhatRuntimeEnvironment } from 'hardhat/types';

import { deployPaymentTokenCustomAggregator } from './common/data-feed';
import { DeployFunction } from './common/types';

import { getPaymentTokenOrThrow } from '../../helpers/utils';

const func: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  const paymentToken = getPaymentTokenOrThrow(hre);
  await deployPaymentTokenCustomAggregator(hre, paymentToken);
};

export default func;
