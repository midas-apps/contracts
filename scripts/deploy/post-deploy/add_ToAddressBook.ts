import { HardhatRuntimeEnvironment } from 'hardhat/types';

import { MTokenName } from '../../../config';
import {
  allVaultTypes,
  getCurrentAddresses,
  LayerZeroTokenAddresses,
  TokenAddresses,
  VaultType,
  VaultVersion,
} from '../../../config/constants/addresses';
import { DeployFunction } from '../common/types';
import {
  getDeploymentAddressBookEntryConfig,
  getDeploymentAddressBookTokenAddresses,
  getDeploymentProfileForToken,
} from '../configs/deployment-profiles';

type AddressBookEntryConfig = {
  contractName: string | ((mToken: string, network: string) => string);
  contractTag?: string;
  extractAddress?: (value: unknown) => string | undefined;
};

const ADDRESS_BOOK_MAPPING: Partial<
  Record<keyof TokenAddresses, AddressBookEntryConfig>
> = {
  token: { contractName: (mToken) => mToken },

  customFeed: { contractName: 'Oracle' },
  customFeedGrowth: { contractName: 'Oracle (Growth)' },
  customFeedAdjusted: { contractName: 'Oracle (Adjusted)' },
  customFeedDv: { contractName: 'Oracle (DV)' },
  customFeedRv: { contractName: 'Oracle (RV)' },

  dataFeed: { contractName: 'Oracle', contractTag: 'datafeed' },
  dataFeedDv: { contractName: 'Oracle (DV)', contractTag: 'datafeed' },
  dataFeedRv: { contractName: 'Oracle (RV)', contractTag: 'datafeed' },

  depositVault: { contractName: 'Minter Vault' },
  depositVaultUstb: { contractName: 'Minter Vault (USTB)' },
  depositVaultAave: { contractName: 'Minter Vault (Aave)' },
  depositVaultMorpho: { contractName: 'Minter Vault (Morpho)' },
  depositVaultMToken: { contractName: 'Minter Vault (MToken)' },
  depositVaultUsyc: { contractName: 'Minter Vault (USYC)' },

  redemptionVault: { contractName: 'Redemption Vault' },
  redemptionVaultBuidl: { contractName: 'Redemption Vault (BUIDL)' },
  redemptionVaultSwapper: { contractName: 'Redemption Vault (Swapper)' },
  redemptionVaultMToken: { contractName: 'Redemption Vault (MToken)' },
  redemptionVaultUstb: { contractName: 'Redemption Vault (USTB)' },
  redemptionVaultAave: { contractName: 'Redemption Vault (Aave)' },
  redemptionVaultMorpho: { contractName: 'Redemption Vault (Morpho)' },
  redemptionVaultUsyc: { contractName: 'Redemption Vault (USYC)' },

  layerZero: {
    contractName: (mToken, network) =>
      `${mToken} OFT Adapter - ${
        network === 'main'
          ? 'Ethereum'
          : network.charAt(0).toUpperCase() + network.slice(1)
      }`,
    extractAddress: (v) => (v as LayerZeroTokenAddresses)?.oft,
  },
};

const VAULT_NAME_PREFIXES = ['Minter Vault', 'Redemption Vault'];

/**
 * Marks v2 vaults in the name: `Minter Vault (Morpho)` ->
 * `Minter Vault v2 (Morpho)`
 */
const toVersionedVaultName = (
  contractName: string,
  key: string,
  vaultVersion?: VaultVersion,
) => {
  if (vaultVersion !== 'v2' || !allVaultTypes.includes(key as VaultType)) {
    return contractName;
  }

  const prefix = VAULT_NAME_PREFIXES.find((p) => contractName.startsWith(p));

  return prefix
    ? `${prefix} v2${contractName.slice(prefix.length)}`
    : contractName;
};

const func: DeployFunction = async (
  hre: HardhatRuntimeEnvironment,
  mToken: MTokenName,
  keys?: string[],
) => {
  const addresses = getCurrentAddresses(hre);

  if (!addresses) {
    throw new Error('Addresses not found');
  }

  const tokenAddresses = addresses[mToken];

  if (!tokenAddresses) {
    throw new Error('Token addresses not found');
  }

  const addressBookTokenAddresses = getDeploymentAddressBookTokenAddresses(
    tokenAddresses,
    mToken,
    hre.deploymentConfig,
  );

  const allowedKeys = getDeploymentProfileForToken(mToken, hre.deploymentConfig)
    ? undefined
    : hre.addressBookKeys;

  for (const [key, value] of Object.entries(addressBookTokenAddresses)) {
    if (!value) {
      continue;
    }

    if (allowedKeys && !allowedKeys.includes(key)) {
      continue;
    }

    const addressKey = key as keyof TokenAddresses;
    const config =
      getDeploymentAddressBookEntryConfig(
        mToken,
        addressKey,
        hre.deploymentConfig,
      ) ?? ADDRESS_BOOK_MAPPING[addressKey];

    if (!config) {
      continue;
    }

    const address = config.extractAddress
      ? config.extractAddress(value)
      : typeof value === 'string'
      ? value
      : undefined;

    if (!address) {
      continue;
    }

    const contractName = toVersionedVaultName(
      typeof config.contractName === 'function'
        ? config.contractName(mToken, hre.network.name)
        : config.contractName,
      key,
      hre.vaultVersion,
    );

    const customSigner = await hre.getCustomSigner();
    const result = await customSigner.createAddressBookContract({
      address,
      contractName,
      contractTag: config.contractTag,
    });

    console.log('Successfully added to address book', result);
  }
};

export default func;
