import { HardhatRuntimeEnvironment } from 'hardhat/types';

import {
  logSkipped,
  sendAndWaitForCustomTxSign,
  sendAndWaitForTimelockedTxSign,
} from './utils';

import { getCurrentAddresses } from '../../../config/constants/addresses';
import {
  MidasAccessControl__factory,
  MidasTimelockController__factory,
  MidasTimelockManager__factory,
} from '../../../typechain-types';
import { networkDeploymentConfigs } from '../configs/network-configs';

const isCallException = (e: unknown) =>
  (e as { code?: string })?.code === 'CALL_EXCEPTION';

/**
 * Syncs the network contracts with `networkDeploymentConfigs`: the default
 * delay of the access control and the max pending operations per proposer of
 * the timelock manager. The security council and the timelock min delay are
 * only compared: they change via the timelock / council, mismatches are
 * logged as skipped
 */
export const setNetworkSettings = async (hre: HardhatRuntimeEnvironment) => {
  const config = networkDeploymentConfigs[hre.network.config.chainId!];
  if (!config) {
    throw new Error(`Network config is not found for ${hre.network.name}`);
  }

  const addresses = getCurrentAddresses(hre);
  const provider = hre.ethers.provider;

  if (config.accessControl && addresses?.accessControl) {
    const ac = MidasAccessControl__factory.connect(
      addresses.accessControl,
      provider,
    );
    const target = config.accessControl.defaultDelay;
    // the v1 access control has no default delay
    const current = await ac.defaultDelay().catch((e) => {
      if (!isCallException(e)) throw e;
      return undefined;
    });

    if (current === undefined) {
      logSkipped('access control is not upgraded to v2: no default delay');
    } else if (current === target) {
      console.log(`access control default delay is already ${target}`);
    } else {
      // always timelocked (DEFAULT_ADMIN_ROLE with a 2 days override)
      await sendAndWaitForTimelockedTxSign(
        hre,
        await ac.populateTransaction.setDefaultDelay(target),
        {
          action: 'update-ac',
          comment: `set access control default delay to ${target}`,
          changes: [{ field: 'accessControl.defaultDelay', current, target }],
        },
      );
    }
  }

  if (config.timelockManager && addresses?.timelockManager) {
    const timelockManager = MidasTimelockManager__factory.connect(
      addresses.timelockManager,
      provider,
    );
    const { maxPendingOperationsPerProposer: targetMax, securityCouncil } =
      config.timelockManager;

    const currentMax = await timelockManager.maxPendingOperationsPerProposer();
    if (currentMax.eq(targetMax)) {
      console.log(
        `timelock manager maxPendingOperationsPerProposer is already ${targetMax}`,
      );
    } else {
      await sendAndWaitForCustomTxSign(
        hre,
        await timelockManager.populateTransaction.setMaxPendingOperationsPerProposer(
          targetMax,
        ),
        {
          action: 'update-ac',
          comment: `set timelock manager maxPendingOperationsPerProposer to ${targetMax}`,
          changes: [
            {
              field: 'timelockManager.maxPendingOperationsPerProposer',
              current: currentMax,
              target: targetMax,
            },
          ],
        },
      );
    }

    const members = await timelockManager.getSecurityCouncilMembers(
      await timelockManager.securityCouncilVersion(),
    );
    const onChain = new Set(members.map((v) => v.toLowerCase()));
    const configured = new Set(securityCouncil.map((v) => v.toLowerCase()));
    const missing = [...configured].filter((v) => !onChain.has(v));
    const extra = [...onChain].filter((v) => !configured.has(v));

    if (missing.length || extra.length) {
      logSkipped(
        `security council differs from the config (change it via setSecurityCouncil): missing [${missing.join(
          ', ',
        )}], extra [${extra.join(', ')}]`,
      );
    } else {
      console.log('timelock manager security council matches the config');
    }
  }

  if (config.timelock && addresses?.timelock) {
    const timelock = MidasTimelockController__factory.connect(
      addresses.timelock,
      provider,
    );
    const minDelay = await timelock.getMinDelay();

    if (minDelay.eq(config.timelock.minDelay)) {
      console.log(`timelock min delay is already ${minDelay}`);
    } else {
      logSkipped(
        `timelock min delay is ${minDelay}, config ${config.timelock.minDelay} (change it via a timelock proposal of updateDelay)`,
      );
    }
  }
};
