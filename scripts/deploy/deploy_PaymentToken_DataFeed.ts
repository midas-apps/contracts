import { HardhatRuntimeEnvironment } from 'hardhat/types';

import { deployPaymentTokenDataFeed } from './common/data-feed';
import { DeployFunction } from './common/types';

import { getPaymentTokenOrThrow } from '../../helpers/utils';

const func: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  const paymentToken = getPaymentTokenOrThrow(hre);
  await deployPaymentTokenDataFeed(hre, paymentToken);
};

export default func;
