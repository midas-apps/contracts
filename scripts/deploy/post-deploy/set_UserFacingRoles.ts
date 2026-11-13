import { HardhatRuntimeEnvironment } from 'hardhat/types';

import { getCurrentAddresses } from '../../../config/constants/addresses';
import { getAllUserFacingRoles } from '../../../helpers/roles';
import { DeployFunction } from '../common/types';
import { getContractAt, sendAndWaitForCustomTxSign } from '../common/utils';

/**
 * Marks every greenlisted and min balance exempt role from the generated
 * role registry as user facing on MidasAccessControl (network independent)
 */
const func: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  const acAddress = getCurrentAddresses(hre)?.accessControl;

  if (!acAddress) {
    throw new Error('Access control address is not set');
  }

  const accessControl = await getContractAt(
    hre,
    'MidasAccessControl',
    acAddress,
  );

  const missing: string[] = [];

  for (const role of getAllUserFacingRoles()) {
    if (!(await accessControl.isUserFacingRole(role))) {
      missing.push(role);
    }
  }

  if (!missing.length) {
    console.log('All user facing roles are already set');
    return;
  }

  console.log(`Setting ${missing.length} user facing roles`);

  const txRes = await sendAndWaitForCustomTxSign(
    hre,
    await accessControl.populateTransaction.setUserFacingRoleMult(
      missing.map((role) => ({ role, enabled: true })),
    ),
    {
      action: 'update-ac',
      subAction: 'set-user-facing-roles',
      comment: `set ${missing.length} user facing roles`,
    },
  );

  console.log('User facing roles tx initiated', txRes);
};

export default func;
