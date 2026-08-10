import { HardhatRuntimeEnvironment } from 'hardhat/types';

import {
  validateProposeUpgradeVaults,
  validateUpgradeVaults,
} from './common/upgrade-vaults';

import { getActionOrThrow } from '../../helpers/utils';
import { DeployFunction } from '../deploy/common/types';

const func: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  const upgradeId = getActionOrThrow(hre);
  await validateProposeUpgradeVaults(hre, upgradeId);
  await validateUpgradeVaults(hre, upgradeId);
};

export default func;
