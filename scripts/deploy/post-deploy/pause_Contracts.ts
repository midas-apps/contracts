import { HardhatRuntimeEnvironment } from 'hardhat/types';

import { MTokenName } from '../../../config';
import { getCurrentAddresses } from '../../../config/constants/addresses';
import { getChainOrThrow } from '../../../helpers/utils';
import { DeployFunction } from '../common/types';
import {
  getContractAt,
  getNetworkConfig,
  sendAndWaitForCustomTxSign,
} from '../common/utils';
import { getDeploymentTokenAddresses } from '../configs/deployment-profiles';

/**
 * Pauses configured v2 vaults as a whole via MidasPauseManager
 */
const func: DeployFunction = async (
  hre: HardhatRuntimeEnvironment,
  mToken: MTokenName,
) => {
  const { networkName } = getChainOrThrow(hre);

  const pauseContracts = getNetworkConfig(
    hre,
    mToken,
    'postDeploy',
  )?.pauseContracts;

  if (!pauseContracts?.length) {
    console.log(`No pause contracts config found for ${networkName} network`);
    return;
  }

  const addresses = getCurrentAddresses(hre, 'v2');
  const tokenAddresses = addresses?.[mToken];

  if (!tokenAddresses) {
    throw new Error(`Token addresses not found for ${mToken}`);
  }

  if (!addresses?.accessControl) {
    throw new Error('Access control address is not configured');
  }

  const mergedTokenAddresses = getDeploymentTokenAddresses(
    tokenAddresses,
    mToken,
    hre.deploymentConfig,
  );

  const ac = await getContractAt(
    hre,
    'MidasAccessControl',
    addresses.accessControl,
  );
  const pauseManager = await hre.ethers.getContractAt(
    'MidasPauseManager',
    await ac.pauseManager(),
  );

  const toPause: { vaultType: string; vaultAddress: string }[] = [];

  for (const vaultType of pauseContracts) {
    const vaultAddress = mergedTokenAddresses[vaultType];
    if (!vaultAddress) {
      throw new Error(`${mToken} ${vaultType}V2 address is not configured`);
    }

    if (await pauseManager.contractPaused(vaultAddress)) {
      console.log(`${vaultType} is already paused`);
      continue;
    }

    toPause.push({ vaultType, vaultAddress });
  }

  if (!toPause.length) return;

  const names = toPause.map((v) => v.vaultType).join(', ');
  const tx = await pauseManager.populateTransaction.bulkPauseContract(
    toPause.map((v) => v.vaultAddress),
  );
  const txRes = await sendAndWaitForCustomTxSign(hre, tx, {
    mToken,
    comment: `Pause ${mToken} ${names}`,
    action: 'update-pause-manager',
    subAction: 'pause-contract',
  });

  console.log(`Paused ${mToken} ${names}`, txRes);
};

export default func;
