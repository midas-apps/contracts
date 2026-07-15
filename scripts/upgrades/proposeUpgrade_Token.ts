import { HardhatRuntimeEnvironment } from 'hardhat/types';

import {
  getConfiguredTokenUpgrades,
  proposeUpgradeContracts,
} from './common/upgrade-contracts';

import { getActionOrThrow } from '../../helpers/utils';
import { DeployFunction } from '../deploy/common/types';

const func: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  const upgradeId = getActionOrThrow(hre);

  await proposeUpgradeContracts(
    hre,
    upgradeId,
    'token',
    getConfiguredTokenUpgrades(hre, upgradeId),
  );
};

export default func;

// yarn hardhat runscript scripts/upgrades/proposeUpgrade_Token.ts --network <NETWORK> --action <UPGRADE_ID>
