import { HardhatRuntimeEnvironment } from 'hardhat/types';

import {
  getCurrentAddresses,
  VaultType,
} from '../../../config/constants/addresses';
import { getChainIdOrThrow, getMTokenOrThrow } from '../../../helpers/utils';
import { DeployFunction, VAULT_FUNCTION_SELECTORS } from '../common/types';
import { sendAndWaitForCustomTxSign } from '../common/utils';
import { networkDeploymentConfigs } from '../configs/network-configs';

const func: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  const chainId = getChainIdOrThrow(hre);
  const networkName = hre.network.name;
  const mToken = getMTokenOrThrow(hre);

  const pauseFunctions = networkDeploymentConfigs[chainId]?.pauseFunctions;
  if (!pauseFunctions) {
    console.log(`No pause functions config found for ${networkName} network`);
    return;
  }

  const addresses = getCurrentAddresses(hre);

  for (const [vaultType, functions] of Object.entries(pauseFunctions)) {
    const vaultAddress = addresses?.[mToken]?.[vaultType as VaultType];
    if (!vaultAddress) continue;

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
      await sendAndWaitForCustomTxSign(hre, tx, {
        mToken,
        comment: `Pause ${functionName} in ${vaultType}`,
        action: 'update-vault',
        subAction: 'pause-function',
      });

      console.log(`Paused ${functionName} in ${vaultType}`);
    }
  }
};

export default func;
