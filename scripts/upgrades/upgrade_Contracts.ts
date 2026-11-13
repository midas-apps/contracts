import { HardhatRuntimeEnvironment } from 'hardhat/types';

import {
  executeUpgradeConfiguredContracts,
  proposeUpgradeConfiguredContracts,
} from './common/upgrade-contracts';

import { getActionOrThrow, upgradeActions } from '../../helpers/utils';
import { DeployFunction } from '../deploy/common/types';

/**
 * Upgrades the contracts listed under
 * `upgradeConfigs.upgrades[<upgrade>].contracts` for the current network
 */
const func: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  const action = getActionOrThrow(hre, upgradeActions);
  const upgradeId = hre.upgradeId;

  if (!upgradeId) {
    throw new Error('Upgrade parameter not found (--upgrade <UPGRADE_ID>)');
  }

  const fn =
    action === 'propose'
      ? proposeUpgradeConfiguredContracts
      : executeUpgradeConfiguredContracts;

  await fn(hre, upgradeId);
};

export default func;

// yarn hardhat timelock:upgrade:contracts --network <NETWORK> --action <propose|execute> --upgrade <UPGRADE_ID>
// yarn hardhat runscript scripts/upgrades/upgrade_Contracts.ts --network <NETWORK> --action <propose|execute> --upgrade <UPGRADE_ID>
