import { HardhatRuntimeEnvironment } from 'hardhat/types';

import {
  executeUpgradeContracts,
  getConfiguredTokenUpgrades,
} from './common/upgrade-contracts';

import { MTokenName } from '../../config';
import { getCurrentAddresses } from '../../config/constants/addresses';
import { DeployFunction } from '../deploy/common/types';

const func: DeployFunction = async (
  hre: HardhatRuntimeEnvironment,
  mToken: MTokenName,
  _skipValidation?: boolean,
) => {
  const upgradeId = 'mwin-upgrade-permissioned';
  const networkAddresses = getCurrentAddresses(hre);
  const tokenAddresses = networkAddresses?.[mToken];

  await executeUpgradeContracts(
    hre,
    upgradeId,
    'token',
    getConfiguredTokenUpgrades(hre, upgradeId),
  );
};

export default func;

// yarn hardhat runscript scripts/upgrades/executeUpgrade_Token.ts --network <NETWORK> --action <UPGRADE_ID>
