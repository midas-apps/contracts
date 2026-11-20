import { HardhatRuntimeEnvironment } from 'hardhat/types';

import {
  getCurrentAddresses,
  MidasAddresses,
} from '../../../config/constants/addresses';
import { DeployFunction } from '../common/types';

type NetworkAddressKey = Extract<
  keyof MidasAddresses,
  'accessControl' | 'pauseManager' | 'timelockManager' | 'timelockController'
>;

/**
 * Address book names of the network level contracts. The custom signer
 * appends the network name (`Pause Manager Contract - Arc`) and restricts
 * the record to the chain of the current network
 */
const NETWORK_ADDRESS_BOOK_MAPPING: Record<NetworkAddressKey, string> = {
  accessControl: 'Access Control',
  pauseManager: 'Pause Manager Contract',
  timelockManager: 'AC Timelock Manager',
  timelockController: 'AC Timelock Controller',
};

const func: DeployFunction = async (
  hre: HardhatRuntimeEnvironment,
  keys?: string[],
) => {
  const addresses = getCurrentAddresses(hre);

  if (!addresses) {
    throw new Error('Addresses not found');
  }

  const supportedKeys = Object.keys(
    NETWORK_ADDRESS_BOOK_MAPPING,
  ) as NetworkAddressKey[];

  const unknownKeys = (keys ?? []).filter(
    (key) => !supportedKeys.includes(key as NetworkAddressKey),
  );

  if (unknownKeys.length) {
    throw new Error(
      `Unknown keys: ${unknownKeys.join(
        ', ',
      )}. Supported keys: ${supportedKeys.join(', ')}`,
    );
  }

  const customSigner = await hre.getCustomSigner();

  for (const key of supportedKeys) {
    if (keys && !keys.includes(key)) {
      continue;
    }

    const address = addresses[key];
    const contractName = NETWORK_ADDRESS_BOOK_MAPPING[key];

    if (!address) {
      console.log(`Skipping ${contractName}: ${key} address is not set`);
      continue;
    }

    const result = await customSigner.createAddressBookContract({
      address,
      contractName,
      // an existing record of the address is renamed / restricted to the
      // network if it does not match
      updateExisting: true,
    });

    const { sent, updated } = (result.payload ?? {}) as {
      sent?: boolean;
      updated?: boolean;
    };

    console.log(
      `${contractName} (${address}): ${
        updated
          ? 'proposed an update of the existing address book record'
          : sent === false
          ? 'already in the address book, skipped'
          : 'successfully added to address book'
      }`,
      result,
    );
  }
};

export default func;
