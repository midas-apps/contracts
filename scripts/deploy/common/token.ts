import { HardhatRuntimeEnvironment } from 'hardhat/types';

import { deployAndVerifyProxy } from './utils';

import { MTokenName } from '../../../config';
import { getCurrentAddresses } from '../../../config/constants/addresses';
import { getTokenContractNames } from '../../../helpers/contracts';

export const deployMToken = async (
  hre: HardhatRuntimeEnvironment,
  token: MTokenName,
) => {
  const addresses = getCurrentAddresses(hre);

  if (!addresses?.accessControl)
    throw new Error('Access control address is not set');

  const tokenContractName = getTokenContractNames(token).token;

  await deployAndVerifyProxy(hre, tokenContractName, [addresses.accessControl]);
};
