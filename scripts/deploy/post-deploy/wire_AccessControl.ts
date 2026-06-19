import { ethers } from 'ethers';
import { HardhatRuntimeEnvironment } from 'hardhat/types';

import { getCurrentAddresses } from '../../../config/constants/addresses';
import {
  MidasAccessControl__factory,
  MidasTimelockManager__factory,
} from '../../../typechain-types';
import { DeployFunction } from '../common/types';
import { sendAndWaitForCustomTxSign } from '../common/utils';

const func: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  const addresses = getCurrentAddresses(hre);

  if (!addresses?.accessControl) {
    throw new Error('Access control address is not set');
  }

  if (!addresses?.timelockManager) {
    throw new Error('Timelock manager address is not set');
  }

  if (!addresses?.timelockController) {
    throw new Error('Timelock controller address is not set');
  }

  if (!addresses?.pauseManager) {
    throw new Error('Pause manager address is not set');
  }

  const accessControl = MidasAccessControl__factory.connect(
    addresses.accessControl,
    hre.ethers.provider,
  );

  const timelockManager = MidasTimelockManager__factory.connect(
    addresses.timelockManager,
    hre.ethers.provider,
  );

  const timelockManagerWired =
    (await timelockManager.timelock()) !== ethers.constants.AddressZero;

  const accessControlWired =
    (await accessControl.timelockManager()) !== ethers.constants.AddressZero;

  if (!timelockManagerWired) {
    const tx = await timelockManager.populateTransaction.initializeTimelock(
      addresses.timelockController,
    );
    const txRes = await sendAndWaitForCustomTxSign(hre, tx, {
      comment: `Initialize timelock controller in timelock manager`,
      action: 'update-ac',
    });

    console.log(`Initialize timelock controller in timelock manager`, txRes);
  } else {
    console.log('Timelock controller is already wired');
  }

  if (!accessControlWired) {
    const tx = await accessControl.populateTransaction.initializeRelationships(
      addresses.timelockManager,
      addresses.pauseManager,
    );
    const txRes = await sendAndWaitForCustomTxSign(hre, tx, {
      comment: `Initialize relationships in access control`,
      action: 'update-ac',
    });

    console.log(`Initialize relationships in access control`, txRes);
  } else {
    console.log('Relationships in access control are already wired');
  }

  console.log('Wire transactions sent');
};

export default func;
