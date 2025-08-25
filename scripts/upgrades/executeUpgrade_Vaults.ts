import { HardhatRuntimeEnvironment } from 'hardhat/types';

import { executeUpgradeVaults } from './common/upgrade-vaults';

import { getActionOrThrow } from '../../helpers/utils';
import { DeployFunction } from '../deploy/common/types';

const func: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  const upgradeId = getActionOrThrow(hre);
  await executeUpgradeVaults(hre, upgradeId);
};

export default func;
