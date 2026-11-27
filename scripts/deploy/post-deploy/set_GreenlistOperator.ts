import { HardhatRuntimeEnvironment } from 'hardhat/types';

import { MTokenName } from '../../../config';
import { getCurrentAddresses } from '../../../config/constants/addresses';
import {
  getRolesForToken,
  getRolesNamesForToken,
} from '../../../helpers/roles';
import { DeployFunction } from '../common/types';
import { getContractAt, sendAndWaitForCustomTxSign } from '../common/utils';

/**
 * Sets the dedicated operator (role admin) of the mToken greenlist role,
 * see `customGreenlistOperatorRoleNames`. No-op if it is already set
 */
const func: DeployFunction = async (
  hre: HardhatRuntimeEnvironment,
  mToken: MTokenName,
) => {
  if (!mToken) {
    throw new Error('mToken is required');
  }

  const names = getRolesNamesForToken(mToken);
  const roles = getRolesForToken(mToken);

  if (!names.greenlistedOperator || !roles.greenlistedOperator) {
    throw new Error(`${mToken}: no dedicated greenlist operator role`);
  }

  const acAddress = getCurrentAddresses(hre)?.accessControl;

  if (!acAddress) {
    throw new Error('Access control address is not set');
  }

  const accessControl = await getContractAt(
    hre,
    'MidasAccessControl',
    acAddress,
  );

  const current = await accessControl.getRoleAdmin(roles.greenlisted);

  if (current.toLowerCase() === roles.greenlistedOperator.toLowerCase()) {
    console.log(
      `${mToken}: ${names.greenlisted} operator is already ${names.greenlistedOperator}`,
    );
    return;
  }

  console.log(
    `${mToken}: setting ${names.greenlisted} operator ${current} -> ${names.greenlistedOperator} (${roles.greenlistedOperator})`,
  );

  const txRes = await sendAndWaitForCustomTxSign(
    hre,
    await accessControl.populateTransaction.setRoleAdmin(
      roles.greenlisted,
      roles.greenlistedOperator,
    ),
    {
      mToken,
      action: 'update-ac',
      subAction: 'set-role-admin',
      comment: `set ${names.greenlistedOperator} as ${names.greenlisted} operator`,
      changes: [
        {
          field: `ac.getRoleAdmin[${names.greenlisted}]`,
          current,
          target: roles.greenlistedOperator,
        },
      ],
    },
  );

  console.log('Greenlist operator tx initiated', txRes);
};

export default func;
