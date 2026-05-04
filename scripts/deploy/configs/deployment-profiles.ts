import {
  AddressProfileTokenAddresses,
  TokenAddresses,
} from '../../../config/constants/addresses';
import { MTokenName } from '../../../config/types';

export const deploymentConfigNames = ['mfone-unloop'] as const;

export type DeploymentConfigName =
  | 'default'
  | (typeof deploymentConfigNames)[number];

type AddressBookEntryConfig = {
  contractName: string | ((mToken: string) => string);
  contractTag?: string;
  extractAddress?: (value: unknown) => string | undefined;
};

type DeploymentAddressProfileConfig = {
  addressProfileKey: string;
  addressBook?: Partial<
    Record<keyof AddressProfileTokenAddresses, AddressBookEntryConfig>
  >;
};

const deploymentConfigAddressProfiles: Record<
  (typeof deploymentConfigNames)[number],
  Partial<Record<MTokenName, DeploymentAddressProfileConfig>>
> = {
  'mfone-unloop': {
    mFONE: {
      addressProfileKey: 'mFONEUnloop',
      addressBook: {
        customFeed: { contractName: 'Oracle (Unloop)' },
        dataFeed: {
          contractName: 'Oracle (Unloop)',
          contractTag: 'datafeed',
        },
        redemptionVaultSwapper: {
          contractName: 'Redemption Vault (Unloop)',
        },
      },
    },
  },
};

const getDeploymentAddressProfileConfig = (
  token: MTokenName,
  deploymentConfigName?: string,
): DeploymentAddressProfileConfig | undefined => {
  if (!deploymentConfigName || deploymentConfigName === 'default') {
    return undefined;
  }

  return deploymentConfigAddressProfiles[
    deploymentConfigName as (typeof deploymentConfigNames)[number]
  ]?.[token];
};

const getAddressProfileTokenAddresses = (
  tokenAddresses: TokenAddresses,
  token: MTokenName,
  deploymentConfigName?: string,
): AddressProfileTokenAddresses | undefined => {
  const addressProfileConfig = getDeploymentAddressProfileConfig(
    token,
    deploymentConfigName,
  );

  if (!addressProfileConfig) {
    return undefined;
  }

  const profileAddresses =
    tokenAddresses.addressProfiles?.[addressProfileConfig.addressProfileKey];

  if (!profileAddresses) {
    throw new Error(
      `Address profile "${addressProfileConfig.addressProfileKey}" is not configured for ${token}`,
    );
  }

  return profileAddresses;
};

export const getDeploymentTokenAddresses = (
  tokenAddresses: TokenAddresses,
  token: MTokenName,
  deploymentConfigName?: string,
): TokenAddresses => {
  const profileAddresses = getAddressProfileTokenAddresses(
    tokenAddresses,
    token,
    deploymentConfigName,
  );

  return profileAddresses
    ? {
        ...tokenAddresses,
        ...profileAddresses,
      }
    : tokenAddresses;
};

export const getDeploymentAddressBookTokenAddresses = (
  tokenAddresses: TokenAddresses,
  token: MTokenName,
  deploymentConfigName?: string,
): AddressProfileTokenAddresses | TokenAddresses => {
  return (
    getAddressProfileTokenAddresses(
      tokenAddresses,
      token,
      deploymentConfigName,
    ) ?? tokenAddresses
  );
};

export const getDeploymentAddressBookEntryConfig = (
  token: MTokenName,
  addressKey: string,
  deploymentConfigName?: string,
): AddressBookEntryConfig | undefined => {
  return getDeploymentAddressProfileConfig(token, deploymentConfigName)
    ?.addressBook?.[addressKey as keyof AddressProfileTokenAddresses];
};
