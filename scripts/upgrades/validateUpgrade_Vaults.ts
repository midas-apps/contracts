import { HardhatRuntimeEnvironment } from 'hardhat/types';

import { validateUpgradeVaults } from './common/upgrade-vaults';

import { getActionOrThrow } from '../../helpers/utils';
import { DeployFunction } from '../deploy/common/types';

const func: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  const upgradeId = getActionOrThrow(hre);
  await validateUpgradeVaults(hre, upgradeId);
};

export default func;
