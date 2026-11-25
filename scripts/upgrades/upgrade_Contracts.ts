import { HardhatRuntimeEnvironment } from 'hardhat/types';

import {
  dryRunUpgradeConfiguredContracts,
  executeUpgradeConfiguredContracts,
  proposeUpgradeConfiguredContracts,
} from './common/upgrade-contracts';

import { getActionOrThrow, upgradeActions } from '../../helpers/utils';
import { DeployFunction } from '../deploy/common/types';

const actions = [...upgradeActions, 'dry-run'] as const;

/**
 * Upgrades the contracts listed under
 * `upgradeConfigs.upgrades[<upgrade>].contracts` for the current network.
 * `dry-run` validates the upgrades without deploying or sending anything
 */
const func: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  const action = getActionOrThrow(hre, actions) as (typeof actions)[number];
  const upgradeId = hre.upgradeId;

  if (!upgradeId) {
    throw new Error('Upgrade parameter not found (--upgrade <UPGRADE_ID>)');
  }

  const fn = {
    propose: proposeUpgradeConfiguredContracts,
    execute: executeUpgradeConfiguredContracts,
    'dry-run': dryRunUpgradeConfiguredContracts,
  }[action];

  await fn(hre, upgradeId);
};

export default func;

// yarn hardhat timelock:upgrade:contracts --network <NETWORK> --action <propose|execute|dry-run> --upgrade <UPGRADE_ID>
// yarn hardhat runscript scripts/upgrades/upgrade_Contracts.ts --network <NETWORK> --action <propose|execute|dry-run> --upgrade <UPGRADE_ID>
