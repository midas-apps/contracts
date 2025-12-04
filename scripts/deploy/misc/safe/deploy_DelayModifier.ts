import { group, text } from '@clack/prompts';
import { HardhatRuntimeEnvironment } from 'hardhat/types';

import {
  requireAddress,
  requireNotCancelled,
  requireNumber,
  validateAddress,
  validateNumber,
} from '../../codegen/common';
import { DeployFunction } from '../../common/types';
import { deployAndVerify, getDeployer } from '../../common/utils';

const func: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  const { safeAddress, txExpiration, txCooldown } = await group({
    safeAddress: () =>
      text({ message: 'Safe Address', validate: validateAddress })
        .then(requireNotCancelled)
        .then(requireAddress),
    txCooldown: () =>
      text({
        message: 'Tx Cooldown',
        placeholder: '86400',
        defaultValue: '86400',
        validate: validateNumber,
      })
        .then(requireNotCancelled)
        .then(requireNumber),
    txExpiration: () =>
      text({
        message: 'Tx Expiration (zero for none)',
        placeholder: '0',
        defaultValue: '0',
        validate: (value) => value && validateNumber(value, 60),
      })
        .then(requireNotCancelled)
        .then(requireNumber),
  });

  const deployer = await getDeployer(hre);

  await deployAndVerify(
    hre,
    'Delay',
    [safeAddress, safeAddress, safeAddress, txCooldown, txExpiration],
    deployer,
  );
};

export default func;
