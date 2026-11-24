import { HardhatRuntimeEnvironment } from 'hardhat/types';

import grantV2NetworkRoles from './grant_V2NetworkRoles';
import setPauseDelays from './set_PauseDelays';
import setUserFacingRoles from './set_UserFacingRoles';
import wireAccessControl from './wire_AccessControl';

import { setNetworkSettings } from '../common/network-settings';
import { runSync } from '../common/sync';
import { DeployFunction } from '../common/types';
import { networkDeploymentConfigs } from '../configs/network-configs';

/**
 * Syncs the network level contracts (access control, pause manager, timelock
 * manager) with `networkDeploymentConfigs` and the network roles, see
 * `runSync`. The default delay of the access control goes last.
 * Not synced: deployer one-off scripts (`grant:admin`, `revoke:roles`,
 * `transfer:proxyadmin`), the security council and the timelock min delay
 * (only compared)
 */
const func: DeployFunction = async (
  hre: HardhatRuntimeEnvironment,
  dryRun?: boolean,
) => {
  const config = networkDeploymentConfigs[hre.network.config.chainId!];

  if (!config) {
    throw new Error(`Network config is not found for ${hre.network.name}`);
  }

  await runSync(
    hre,
    hre.network.name,
    [
      { name: 'wireAccessControl', run: () => wireAccessControl(hre) },
      { name: 'networkRoles', run: () => grantV2NetworkRoles(hre) },
      { name: 'userFacingRoles', run: () => setUserFacingRoles(hre) },
      {
        name: 'pauseDelays',
        isConfigured: !!config.pauseManager,
        run: () => setPauseDelays(hre),
      },
      { name: 'networkSettings', run: () => setNetworkSettings(hre) },
    ],
    dryRun,
  );
};

export default func;
