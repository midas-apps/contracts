import { HardhatRuntimeEnvironment } from 'hardhat/types';

import { getCurrentAddresses } from '../../../config/constants/addresses';
import { MidasPauseManager__factory } from '../../../typechain-types';
import { DeployFunction, PAUSE_DELAY } from '../common/types';
import { sendAndWaitForTimelockedTxSign } from '../common/utils';
import { networkDeploymentConfigs } from '../configs/network-configs';

/**
 * Sets the delays of MidasPauseManager: pause delay to the fixed PAUSE_DELAY,
 * unpause delay to the value of the network config. Delays that already match
 * are skipped.
 * Both setters are always timelocked (`DELAY_FOR_SET_DELAY`): the txs are
 * always scheduled via the timelock manager, without the on-chain detection,
 * and have to be executed after the delay
 */
const func: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  const addresses = getCurrentAddresses(hre);

  if (!addresses?.pauseManager) {
    throw new Error('Pause manager address is not set');
  }

  const config =
    networkDeploymentConfigs[hre.network.config.chainId!]?.pauseManager;

  if (!config) {
    throw new Error(
      `pauseManager network config is not found for ${hre.network.name}`,
    );
  }

  const pauseManager = MidasPauseManager__factory.connect(
    addresses.pauseManager,
    hre.ethers.provider,
  );

  const delays = [
    {
      name: 'pause',
      current: await pauseManager.pauseDelay(),
      target: PAUSE_DELAY,
      populate: () =>
        pauseManager.populateTransaction.setPauseDelay(PAUSE_DELAY),
    },
    {
      name: 'unpause',
      current: await pauseManager.unpauseDelay(),
      target: config.unpauseDelay,
      populate: () =>
        pauseManager.populateTransaction.setUnpauseDelay(config.unpauseDelay),
    },
  ];

  for (const { name, current, target, populate } of delays) {
    if (current === target) {
      console.log(`${name} delay is already ${target} — skip`);
      continue;
    }

    console.log(`Setting ${name} delay: ${current} -> ${target}`);

    await sendAndWaitForTimelockedTxSign(hre, await populate(), {
      action: 'update-pause-manager',
      comment: `set ${name} delay to ${target}`,
    });
  }
};

export default func;
