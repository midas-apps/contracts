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
  const deployer = await getDeployer(hre);

  const { safeAddress, tokensReceiver, tokensWithdrawer } = await group({
    safeAddress: () =>
      text({ message: 'Safe Address', validate: validateAddress })
        .then(requireNotCancelled)
        .then(requireAddress),
    tokensReceiver: () =>
      text({
        message: 'Tokens Receiver',
        defaultValue: deployer.address,
        placeholder: deployer.address,
        validate: validateAddress,
      })
        .then(requireNotCancelled)
        .then(requireAddress),
    tokensWithdrawer: ({ results: { tokensReceiver } }) =>
      text({
        message: 'Tokens Withdrawer',
        validate: validateAddress,
        defaultValue: tokensReceiver,
        placeholder: tokensReceiver,
      })
        .then(requireNotCancelled)
        .then(requireAddress),
  });

  await deployAndVerify(
    hre,
    'TokensWithdrawModule',
    [tokensReceiver, tokensWithdrawer, safeAddress, safeAddress],
    deployer,
  );
};

export default func;
