import { HardhatRuntimeEnvironment } from 'hardhat/types';

import {
  getCurrentAddresses,
  sanctionListContracts,
} from '../../../config/constants/addresses';
import { getChainOrThrow, getMTokenOrThrow } from '../../../helpers/utils';
import { DeployFunction } from '../common/types';
import { sendAndWaitForCustomTxSign } from '../common/utils';

const func: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  const { chainId, networkName } = getChainOrThrow(hre);
  const mToken = getMTokenOrThrow(hre);

  const sanctionsList = sanctionListContracts[chainId];
  if (!sanctionsList) {
    console.log(`No sanctionsList configured for ${networkName} (${chainId})`);
    return;
  }

  const addresses = getCurrentAddresses(hre);
  const tokenAddresses = addresses?.[mToken];
  if (!tokenAddresses) {
    console.log(`No addresses found for ${mToken} on ${networkName}`);
    return;
  }

  const vaultEntries: Array<{ type: string; address?: string }> = [
    { type: 'depositVault', address: tokenAddresses.depositVault },
    {
      type: 'depositVaultUstb',
      address: tokenAddresses.depositVaultUstb,
    },
    {
      type: 'redemptionVault',
      address: tokenAddresses.redemptionVault,
    },
    {
      type: 'redemptionVaultBuidl',
      address: tokenAddresses.redemptionVaultBuidl,
    },
    {
      type: 'redemptionVaultSwapper',
      address: tokenAddresses.redemptionVaultSwapper,
    },
    {
      type: 'redemptionVaultUstb',
      address: tokenAddresses.redemptionVaultUstb,
    },
  ];

  for (const { type, address } of vaultEntries) {
    if (!address) continue;

    const vault = await hre.ethers.getContractAt('ManageableVault', address);

    const current = await vault.sanctionsList();
    if (current?.toLowerCase() === sanctionsList.toLowerCase()) {
      console.log(
        `sanctionsList for ${mToken} ${type} already set to ${sanctionsList}`,
      );
      continue;
    }

    const tx = await vault.populateTransaction.setSanctionsList(sanctionsList);
    const txRes = await sendAndWaitForCustomTxSign(hre, tx, {
      mToken,
      comment: `Set sanctionsList=${sanctionsList} in ${mToken} ${type}`,
      action: 'update-vault',
    });

    console.log(
      `Set sanctionsList for ${mToken} ${type} -> ${sanctionsList}`,
      txRes,
    );
  }
};

export default func;
