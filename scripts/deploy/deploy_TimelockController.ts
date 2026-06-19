import { HardhatRuntimeEnvironment } from 'hardhat/types';

import { DeployFunction } from './common/types';
import { deployAndVerifyProxy } from './common/utils';

import { getCurrentAddresses } from '../../config/constants/addresses';
import { getCommonContractNames } from '../../helpers/contracts';

const func: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  const addresses = getCurrentAddresses(hre);

  if (!addresses?.timelockManager) {
    throw new Error('Timelock manager address is not set');
  }

  await deployAndVerifyProxy(hre, getCommonContractNames().timelockController, [
    addresses.timelockManager,
  ]);
};

export default func;
