import { HardhatRuntimeEnvironment } from 'hardhat/types';

import { MTokenName } from '../../../config';
import {
  getCurrentAddresses,
  sanctionListContracts,
  allVaultTypes,
} from '../../../config/constants/addresses';
import { getChainOrThrow } from '../../../helpers/utils';
import { DeployFunction } from '../common/types';
import { sendAndWaitForCustomTxSign, getContractAt } from '../common/utils';

const func: DeployFunction = async (
  hre: HardhatRuntimeEnvironment,
  mToken: MTokenName,
) => {
  const { chainId, networkName } = getChainOrThrow(hre);

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

  // base keys hold vaults of the selected `--vault-version`
  const vaultEntries = allVaultTypes.map((type) => ({
    type,
    address: tokenAddresses[type],
  }));

  for (const { type, address } of vaultEntries) {
    if (!address) continue;

    const vault = await getContractAt(hre, 'ManageableVault', address);

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
