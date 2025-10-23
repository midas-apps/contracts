import { HardhatRuntimeEnvironment } from 'hardhat/types';

import { getCurrentAddresses } from '../../../config/constants/addresses';
import { getMTokenOrThrow } from '../../../helpers/utils';
import { DeployFunction } from '../common/types';

const func: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  const mToken = getMTokenOrThrow(hre);

  const addresses = getCurrentAddresses(hre);

  if (!addresses) {
    throw new Error('Addresses not found');
  }

  const tokenAddresses = addresses[mToken];

  if (!tokenAddresses) {
    throw new Error('Token addresses not found');
  }

  for (const [key, value] of Object.entries(tokenAddresses)) {
    if (!value || typeof value !== 'string') {
      continue;
    }

    let contractName = '';
    let contractTag: string | undefined;

    if (key.startsWith('redemptionVault')) {
      contractName = 'Redemption Vault';
    } else if (key.startsWith('depositVault')) {
      contractName = 'Minter Vault';
    } else if (key.startsWith('customFeed')) {
      contractName = 'Oracle';
    } else if (key.startsWith('token')) {
      contractName = mToken;
    } else if (key.startsWith('dataFeed')) {
      contractName = 'Oracle';
      contractTag = 'datafeed';
    }

    if (!contractName) {
      continue;
    }

    const customSigner = await hre.getCustomSigner();
    const result = await customSigner.createAddressBookContract({
      address: value,
      contractName,
      contractTag,
    });

    console.log('Successfully added to address book', result);
  }
};

export default func;
