import { HardhatRuntimeEnvironment } from 'hardhat/types';

import { getDeployer, sendAndWaitForCustomTxSign } from './utils';

import { getCurrentAddresses } from '../../../config/constants/addresses';
import { ProxyAdmin } from '../../../typechain-types';

export const transferProxyAdminOwnershipToTimelock = async (
  hre: HardhatRuntimeEnvironment,
) => {
  const deployer = await getDeployer(hre);
  const addresses = getCurrentAddresses(hre);

  if (!addresses?.timelock) {
    throw new Error('Timelock address is not found in addresses config');
  }

  const admin = (await hre.upgrades.admin.getInstance()).connect(
    deployer,
  ) as ProxyAdmin;

  const currentOwner = await admin.owner();

  if (currentOwner.toLowerCase() === addresses.timelock.toLowerCase()) {
    console.log(
      `ProxyAdmin ownership is already transferred to timelock ${addresses.timelock}`,
    );
    return;
  }

  if (currentOwner.toLowerCase() !== deployer.address.toLowerCase()) {
    throw new Error(
      `ProxyAdmin owner ${currentOwner} is not the deployer ${deployer.address}`,
    );
  }

  console.log(`Transferring ProxyAdmin ownership to timelock...`);
  console.log(`  ProxyAdmin: ${admin.address}`);
  console.log(`  Current owner: ${currentOwner}`);
  console.log(`  New owner (timelock): ${addresses.timelock}`);

  await sendAndWaitForCustomTxSign(
    hre,
    await admin.populateTransaction.transferOwnership(addresses.timelock),
    {
      action: 'deployer',
      comment: 'transfer proxy admin ownership to timelock',
    },
  );

  console.log('ProxyAdmin ownership transferred to timelock');
};
