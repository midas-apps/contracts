import { HardhatRuntimeEnvironment } from 'hardhat/types';

import {
  executeUpgradeContracts,
  getConfiguredTokenUpgrades,
} from './common/upgrade-contracts';

import { getActionOrThrow } from '../../helpers/utils';
import { DeployFunction } from '../deploy/common/types';

const func: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  const upgradeId = getActionOrThrow(hre);

  await executeUpgradeContracts(
    hre,
    upgradeId,
    'token',
    getConfiguredTokenUpgrades(hre, upgradeId),
  );
};

export default func;

// yarn hardhat runscript scripts/upgrades/executeUpgrade_Token.ts --network <NETWORK> --action <UPGRADE_ID>
