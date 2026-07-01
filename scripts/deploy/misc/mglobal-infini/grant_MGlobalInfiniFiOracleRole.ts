// Usage: yarn hardhat runscript scripts/deploy/misc/mglobal-infini/grant_MGlobalInfiniFiOracleRole.ts --network main

import { HardhatRuntimeEnvironment } from 'hardhat/types';

import { getCurrentAddresses } from '../../../../config/constants/addresses';
import { getCommonContractNames } from '../../../../helpers/contracts';
import { getAllRoles } from '../../../../helpers/roles';
import { MidasAccessControl } from '../../../../typechain-types';
import { DeployFunction } from '../../common/types';
import { getDeployer, sendAndWaitForCustomTxSign } from '../../common/utils';

const INFINIFI_MG_ORACLE_ADMIN: `0x${string}` =
  '0xdf7f08E700707884eDdF156eDF3653c7b02aB055';

const func: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  const addresses = getCurrentAddresses(hre);

  if (!addresses?.accessControl) {
    throw new Error('AccessControl address is not set');
  }

  const role = getAllRoles().integration.infinifiMGCustomFeedAdmin;
  const provider = await getDeployer(hre);

  const accessControl = (
    await hre.ethers.getContractAt(
      getCommonContractNames().ac,
      addresses.accessControl,
    )
  ).connect(provider) as MidasAccessControl;

  if (await accessControl.hasRole(role, INFINIFI_MG_ORACLE_ADMIN)) {
    console.log(`role already granted to ${INFINIFI_MG_ORACLE_ADMIN} — skip`);
    return;
  }

  await sendAndWaitForCustomTxSign(
    hre,
    await accessControl.populateTransaction.grantRole(
      role,
      INFINIFI_MG_ORACLE_ADMIN,
    ),
    {
      action: 'update-ac',
      subAction: 'grant-token-roles',
      comment: `grant INFINIFI_MG_CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE to ${INFINIFI_MG_ORACLE_ADMIN}`,
    },
  );
};

export default func;
