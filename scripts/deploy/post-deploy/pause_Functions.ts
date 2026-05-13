import { HardhatRuntimeEnvironment } from 'hardhat/types';

import { getCurrentAddresses } from '../../../config/constants/addresses';
import { getChainOrThrow, getMTokenOrThrow } from '../../../helpers/utils';
import { DeployFunction, VAULT_FUNCTION_SELECTORS } from '../common/types';
import { sendAndWaitForCustomTxSign, getNetworkConfig } from '../common/utils';
import { getDeploymentTokenAddresses } from '../configs/deployment-profiles';

const func: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  const { networkName } = getChainOrThrow(hre);
  const mToken = getMTokenOrThrow(hre);

  const pauseFunctions = getNetworkConfig(
    hre,
    mToken,
    'postDeploy',
  )?.pauseFunctions;

  if (!pauseFunctions) {
    console.log(`No pause functions config found for ${networkName} network`);
    return;
  }

  const addresses = getCurrentAddresses(hre);
  const tokenAddresses = addresses?.[mToken];

  if (!tokenAddresses) {
    throw new Error(`Token addresses not found for ${mToken}`);
  }

  const mergedTokenAddresses = getDeploymentTokenAddresses(
    tokenAddresses,
    mToken,
    hre.deploymentConfig,
  );

  for (const [vaultType, functions] of Object.entries(pauseFunctions)) {
    const vaultAddress =
      mergedTokenAddresses[vaultType as keyof typeof mergedTokenAddresses];
    if (!vaultAddress || typeof vaultAddress !== 'string') continue;

    const vault = await hre.ethers.getContractAt(
      'ManageableVault',
      vaultAddress,
    );

    for (const functionName of functions) {
      const selector = VAULT_FUNCTION_SELECTORS[functionName];
      if (!selector) continue;

      const isPaused = await vault.fnPaused(selector);
      if (isPaused) {
        console.log(`${functionName} in ${vaultType} is already paused`);
        continue;
      }

      const tx = await vault.populateTransaction.pauseFn(selector);
      const txRes = await sendAndWaitForCustomTxSign(hre, tx, {
        mToken,
        comment: `Pause ${functionName} in ${mToken} ${vaultType}`,
        action: 'update-vault',
        subAction: 'pause-function',
      });

      console.log(`Paused ${functionName} in ${mToken} ${vaultType}`, txRes);
    }
  }
};

export default func;
