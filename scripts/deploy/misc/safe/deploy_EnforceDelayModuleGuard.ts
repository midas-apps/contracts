import { group, text } from '@clack/prompts';
import { HardhatRuntimeEnvironment } from 'hardhat/types';

import {
  requireAddress,
  requireNotCancelled,
  validateAddress,
} from '../../codegen/common';
import { DeployFunction } from '../../common/types';
import { deployAndVerify, getDeployer } from '../../common/utils';

const func: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  const { delayModifier } = await group({
    delayModifier: () =>
      text({ message: 'Delay Modifier', validate: validateAddress })
        .then(requireNotCancelled)
        .then(requireAddress),
  });

  const deployer = await getDeployer(hre);

  await deployAndVerify(
    hre,
    'EnforceDelayModifierGuard',
    [delayModifier],
    deployer,
  );
};

export default func;
