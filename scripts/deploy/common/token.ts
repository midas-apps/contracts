import { HardhatRuntimeEnvironment } from 'hardhat/types';

import { deployAndVerifyProxy, getDeployer } from './utils';

import { MTokenName } from '../../../config';
import { getCurrentAddresses } from '../../../config/constants/addresses';
import { getCommonContractNames } from '../../../helpers/contracts';
import { mTokensMetadata } from '../../../helpers/mtokens-metadata';
import { getAllRoles } from '../../../helpers/roles';

export const deployMToken = async (
  hre: HardhatRuntimeEnvironment,
  token: MTokenName,
) => {
  const addresses = getCurrentAddresses(hre);

  if (!addresses?.accessControl)
    throw new Error('Access control address is not set');

  const allRoles = getAllRoles();
  const roles = allRoles.tokenRoles[token];
  const metadata = mTokensMetadata[token];
  const deployer = await getDeployer(hre);
  const isPermissioned = !!metadata.isPermissioned;

  await deployAndVerifyProxy(
    hre,
    getCommonContractNames().token,
    [
      addresses.accessControl,
      deployer.address,
      isPermissioned,
      false,
      metadata.name,
      metadata.symbol,
    ],
    undefined,
    {
      constructorArgs: [
        roles.tokenManager,
        roles.minter,
        roles.burner,
        roles.greenlisted,
        roles.minBalanceExempt,
      ],
    },
  );
};
