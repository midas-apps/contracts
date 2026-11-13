import { HardhatRuntimeEnvironment } from 'hardhat/types';

import { MTokenName } from '../../../config';
import {
  getCurrentAddresses,
  isV2VaultType,
} from '../../../config/constants/addresses';
import { getChainOrThrow } from '../../../helpers/utils';
import { DeployFunction, VAULT_FUNCTION_SELECTORS } from '../common/types';
import {
  getContractAt,
  getNetworkConfig,
  sendAndWaitForCustomTxSign,
} from '../common/utils';
import { getDeploymentTokenAddresses } from '../configs/deployment-profiles';

/**
 * Pauses configured functions of v2 vaults via MidasPauseManager
 */
const func: DeployFunction = async (
  hre: HardhatRuntimeEnvironment,
  mToken: MTokenName,
) => {
  const { networkName } = getChainOrThrow(hre);

  const pauseFunctions = getNetworkConfig(
    hre,
    mToken,
    'postDeploy',
  )?.pauseFunctions;

  if (!pauseFunctions) {
    console.log(`No pause functions config found for ${networkName} network`);
    return;
  }

  const unsupported = Object.keys(pauseFunctions).filter(
    (vaultType) => !isV2VaultType(vaultType),
  );
  if (unsupported.length) {
    throw new Error(
      `${unsupported.join(
        ', ',
      )} has no v2 implementation, remove it from the pauseFunctions config`,
    );
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

  for (const [vaultType, functions] of Object.entries(pauseFunctions)) {
    const vaultAddress =
      mergedTokenAddresses[vaultType as keyof typeof mergedTokenAddresses];
    if (!vaultAddress || typeof vaultAddress !== 'string') {
      console.log(`${vaultType} (v2) is not deployed, skipping`);
      continue;
    }

    const toPause: { functionName: string; selector: string }[] = [];

    for (const functionName of functions) {
      const selector = VAULT_FUNCTION_SELECTORS[functionName];
      if (!selector) {
        // e.g. redeemFiatRequest from v1 configs
        console.warn(
          `${functionName} does not exist on v2 vaults, skipping (${vaultType})`,
        );
        continue;
      }

      if (await pauseManager.isFunctionPaused(vaultAddress, selector)) {
        console.log(`${functionName} in ${vaultType} is already paused`);
        continue;
      }

      toPause.push({ functionName, selector });
    }

    if (!toPause.length) continue;

    const names = toPause.map((v) => v.functionName).join(', ');
    const tx = await pauseManager.populateTransaction.bulkPauseContractFn(
      [vaultAddress],
      toPause.map((v) => v.selector),
    );
    const txRes = await sendAndWaitForCustomTxSign(hre, tx, {
      mToken,
      comment: `Pause ${names} in ${mToken} ${vaultType}`,
      action: 'update-vault',
      subAction: 'pause-function',
    });

    console.log(`Paused ${names} in ${mToken} ${vaultType}`, txRes);
  }
};

export default func;
