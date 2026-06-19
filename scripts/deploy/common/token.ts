import { HardhatRuntimeEnvironment } from 'hardhat/types';

import { deployAndVerifyProxy } from './utils';

import { MTokenName } from '../../../config';
import { getCurrentAddresses } from '../../../config/constants/addresses';
import { getCommonContractNames } from '../../../helpers/contracts';
import { getAllRoles } from '../../../helpers/roles';

export const deployMToken = async (
  hre: HardhatRuntimeEnvironment,
  token: MTokenName,
) => {
  const addresses = getCurrentAddresses(hre);

  if (!addresses?.accessControl)
    throw new Error('Access control address is not set');

  const allRoles = getAllRoles();

  await deployAndVerifyProxy(
    hre,
    getCommonContractNames().mToken,
    [addresses.accessControl],
    undefined,
    {
      constructorArgs: [
        allRoles.tokenRoles[token].tokenManager,
        allRoles.tokenRoles[token].minter,
        allRoles.tokenRoles[token].burner,
      ],
    },
  );
};
