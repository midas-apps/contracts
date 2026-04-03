import { HardhatRuntimeEnvironment } from 'hardhat/types';

import {
  getCurrentAddresses,
  LayerZeroTokenAddresses,
  TokenAddresses,
} from '../../../config/constants/addresses';
import { getMTokenOrThrow } from '../../../helpers/utils';
import { DeployFunction } from '../common/types';

type AddressBookEntryConfig = {
  contractName: string | ((mToken: string) => string);
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

  redemptionVault: { contractName: 'Redemption Vault' },
  redemptionVaultBuidl: { contractName: 'Redemption Vault (BUIDL)' },
  redemptionVaultSwapper: { contractName: 'Redemption Vault (Swapper)' },
  redemptionVaultMToken: { contractName: 'Redemption Vault (MToken)' },
  redemptionVaultUstb: { contractName: 'Redemption Vault (USTB)' },
  redemptionVaultAave: { contractName: 'Redemption Vault (Aave)' },
  redemptionVaultMorpho: { contractName: 'Redemption Vault (Morpho)' },

  layerZero: {
    contractName: 'OFT Adapter',
    extractAddress: (v) => (v as LayerZeroTokenAddresses)?.oft,
  },
};

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
    if (!value) {
      continue;
    }

    const config = ADDRESS_BOOK_MAPPING[key as keyof TokenAddresses];

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

    const contractName =
      typeof config.contractName === 'function'
        ? config.contractName(mToken)
        : config.contractName;

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
