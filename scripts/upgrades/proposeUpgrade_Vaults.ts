import { HardhatRuntimeEnvironment } from 'hardhat/types';

import { proposeUpgradeVaults } from './common';

import { getActionOrThrow } from '../../helpers/utils';
import { DeployFunction } from '../deploy/common/types';

const func: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  const upgradeId = getActionOrThrow(hre);
  await proposeUpgradeVaults(hre, upgradeId);
};

export default func;
