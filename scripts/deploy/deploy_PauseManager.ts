import { BigNumber } from 'ethers';
import { HardhatRuntimeEnvironment } from 'hardhat/types';

import { DeployFunction } from './common/types';
import { deployAndVerifyProxy } from './common/utils';

import { getCurrentAddresses } from '../../config/constants/addresses';
import { getCommonContractNames } from '../../helpers/contracts';

const func: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  const addresses = getCurrentAddresses(hre);

  if (!addresses?.accessControl) {
    throw new Error('Access control address is not set');
  }

  await deployAndVerifyProxy(hre, getCommonContractNames().pauseManager, [
    addresses.accessControl,
    BigNumber.from('0xFFFFFFFF'),
    3600,
  ]);
};

export default func;
