import {
  AddressProfileTokenAddresses,
  TokenFeedAddresses,
  TokenAddresses,
  VaultType,
} from '../../../config/constants/addresses';
import { chainIds } from '../../../config/networks';
import { MTokenName } from '../../../config/types';

export const deploymentConfigNames = [
  'mfone-unloop',
  'mglobal-dialectic',
  'mwin-dialectic',
  'mglo-dialectic',
  'mglo-3f',
] as const;

export type DeploymentConfigName =
  | 'default'
  | (typeof deploymentConfigNames)[number];

type NamedDeploymentConfigName = (typeof deploymentConfigNames)[number];

export const isNamedDeploymentConfigName = (
  value: string,
): value is NamedDeploymentConfigName =>
  (deploymentConfigNames as readonly string[]).includes(value);

export const isDeploymentConfigName = (
  value: unknown,
): value is DeploymentConfigName =>
  value === 'default' ||
  (typeof value === 'string' && isNamedDeploymentConfigName(value));

type AddressBookEntryConfig = {
  contractName: string | ((mToken: string) => string);
  contractTag?: string;
  extractAddress?: (value: unknown) => string | undefined;
};

export type DeploymentAddressScope = 'default' | 'profile';

export type DeploymentAddressReference<
  Key extends keyof AddressProfileTokenAddresses = keyof AddressProfileTokenAddresses,
> = {
  scope: DeploymentAddressScope;
  key: Key;
};

type DeploymentFeedReference = DeploymentAddressReference<
  keyof TokenFeedAddresses
>;

type DeploymentFeedReferences = {
  dataFeedAggregator: DeploymentFeedReference;
  redemptionDataFeed: DeploymentFeedReference;
  initialPriceSource?: DeploymentFeedReference;
};

export type DeploymentVaultReference = {
  scope: DeploymentAddressScope;
  vault: VaultType;
};

type DeploymentOperatorRoles = {
  minters: DeploymentVaultReference[];
  burners: DeploymentVaultReference[];
};

type DeploymentAddressProfileConfig = {
  token: MTokenName;
  chainIds: readonly number[];
  addressProfileKey: string;
  configExport: string;
  feedReferences: DeploymentFeedReferences;
  operatorRoles: DeploymentOperatorRoles;
  addressBook?: Partial<
    Record<keyof AddressProfileTokenAddresses, AddressBookEntryConfig>
  >;
};

export const deploymentProfiles: Record<
  NamedDeploymentConfigName,
  DeploymentAddressProfileConfig
> = {
  'mfone-unloop': {
    token: 'mFONE',
    chainIds: [chainIds.main],
    addressProfileKey: 'mFONEUnloop',
    configExport: 'mFONEUnloopDeploymentConfig',
    feedReferences: {
      dataFeedAggregator: { scope: 'profile', key: 'customFeed' },
      redemptionDataFeed: { scope: 'profile', key: 'dataFeed' },
    },
    operatorRoles: {
      minters: [{ scope: 'default', vault: 'depositVault' }],
      burners: [{ scope: 'profile', vault: 'redemptionVaultSwapper' }],
    },
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
  'mglobal-dialectic': {
    token: 'mGLOBAL',
    chainIds: [chainIds.main],
    addressProfileKey: 'mGLOBALDialectic',
    configExport: 'mGLOBALDialecticDeploymentConfig',
    feedReferences: {
      dataFeedAggregator: { scope: 'profile', key: 'customFeed' },
      redemptionDataFeed: { scope: 'profile', key: 'dataFeed' },
      initialPriceSource: { scope: 'default', key: 'customFeedGrowth' },
    },
    operatorRoles: {
      minters: [{ scope: 'default', vault: 'depositVaultAave' }],
      burners: [{ scope: 'profile', vault: 'redemptionVaultSwapper' }],
    },
    addressBook: {
      customFeed: { contractName: 'Oracle (Unloop) - Dialectic' },
      dataFeed: {
        contractName: 'Oracle (Unloop) - Dialectic',
        contractTag: 'datafeed',
      },
      redemptionVaultSwapper: {
        contractName: 'Redemption Vault (swapper unloop) - Dialectic',
      },
    },
  },
  'mwin-dialectic': {
    token: 'mWIN',
    chainIds: [chainIds.main],
    addressProfileKey: 'mWINDialectic',
    configExport: 'mWINDialecticDeploymentConfig',
    feedReferences: {
      dataFeedAggregator: { scope: 'profile', key: 'customFeed' },
      redemptionDataFeed: { scope: 'profile', key: 'dataFeed' },
      initialPriceSource: { scope: 'default', key: 'customFeed' },
    },
    operatorRoles: {
      minters: [{ scope: 'default', vault: 'depositVault' }],
      burners: [{ scope: 'profile', vault: 'redemptionVaultSwapper' }],
    },
    addressBook: {
      customFeed: { contractName: 'Oracle (Unloop) - Dialectic' },
      dataFeed: {
        contractName: 'Oracle (Unloop) - Dialectic',
        contractTag: 'datafeed',
      },
      redemptionVaultSwapper: {
        contractName: 'Redemption Vault (swapper unloop) - Dialectic',
      },
    },
  },
  'mglo-dialectic': {
    token: 'mGLO',
    chainIds: [chainIds.base],
    addressProfileKey: 'mGLODialectic',
    configExport: 'mGLODialecticDeploymentConfig',
    feedReferences: {
      dataFeedAggregator: { scope: 'profile', key: 'customFeed' },
      redemptionDataFeed: { scope: 'profile', key: 'dataFeed' },
      initialPriceSource: { scope: 'default', key: 'customFeed' },
    },
    operatorRoles: {
      minters: [{ scope: 'default', vault: 'depositVault' }],
      burners: [{ scope: 'profile', vault: 'redemptionVaultSwapper' }],
    },
    addressBook: {
      customFeed: { contractName: 'Oracle (Unloop) - Dialectic' },
      dataFeed: {
        contractName: 'Oracle (Unloop) - Dialectic',
        contractTag: 'datafeed',
      },
      redemptionVaultSwapper: {
        contractName: 'Redemption Vault (swapper unloop) - Dialectic',
      },
    },
  },
  'mglo-3f': {
    token: 'mGLO',
    chainIds: [chainIds.main],
    addressProfileKey: 'mGLO3F',
    configExport: 'mGLO3FDeploymentConfig',
    feedReferences: {
      dataFeedAggregator: { scope: 'profile', key: 'customFeed' },
      redemptionDataFeed: { scope: 'profile', key: 'dataFeed' },
      initialPriceSource: { scope: 'default', key: 'customFeed' },
    },
    operatorRoles: {
      minters: [{ scope: 'default', vault: 'depositVault' }],
      burners: [{ scope: 'profile', vault: 'redemptionVaultSwapper' }],
    },
    addressBook: {
      customFeed: { contractName: 'Oracle (Unloop) - 3F' },
      dataFeed: {
        contractName: 'Oracle (Unloop) - 3F',
        contractTag: 'datafeed',
      },
      redemptionVaultSwapper: {
        contractName: 'Redemption Vault (swapper unloop) - 3F',
      },
    },
  },
};

const getNamedDeploymentProfile = (
  deploymentConfigName: string,
): DeploymentAddressProfileConfig => {
  if (!isNamedDeploymentConfigName(deploymentConfigName)) {
    throw new Error(`Unknown deployment config "${deploymentConfigName}"`);
  }

  return deploymentProfiles[deploymentConfigName];
};

export const validateDeploymentProfileContext = (
  deploymentConfigName: string | undefined,
  token: MTokenName | undefined,
  chainId: number,
): void => {
  if (!deploymentConfigName || deploymentConfigName === 'default') {
    return;
  }

  const profile = getNamedDeploymentProfile(deploymentConfigName);

  if (!token || profile.token !== token) {
    throw new Error(
      `Deployment config "${deploymentConfigName}" is not available for ${
        token ?? 'an unspecified mToken'
      }`,
    );
  }

  if (!profile.chainIds.includes(chainId)) {
    throw new Error(
      `Deployment config "${deploymentConfigName}" is not available on chain ${chainId}; allowed chains: ${profile.chainIds.join(
        ', ',
      )}`,
    );
  }
};

export const getDeploymentProfileForToken = (
  token: MTokenName,
  deploymentConfigName?: string,
): DeploymentAddressProfileConfig | undefined => {
  if (!deploymentConfigName || deploymentConfigName === 'default') {
    return undefined;
  }

  const profileConfig = getNamedDeploymentProfile(deploymentConfigName);

  if (profileConfig.token !== token) {
    throw new Error(
      `Deployment config "${deploymentConfigName}" is not available for ${token}`,
    );
  }

  return profileConfig;
};

const getAddressProfileTokenAddresses = (
  tokenAddresses: TokenAddresses,
  token: MTokenName,
  deploymentConfigName?: string,
): AddressProfileTokenAddresses | undefined => {
  const addressProfileConfig = getDeploymentProfileForToken(
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

export const resolveDeploymentAddress = <
  Key extends keyof AddressProfileTokenAddresses,
>(
  tokenAddresses: TokenAddresses,
  token: MTokenName,
  deploymentConfigName: string | undefined,
  reference: DeploymentAddressReference<Key>,
): string => {
  const source =
    reference.scope === 'default'
      ? tokenAddresses
      : getAddressProfileTokenAddresses(
          tokenAddresses,
          token,
          deploymentConfigName,
        );
  const address = source?.[reference.key];

  if (typeof address !== 'string') {
    throw new Error(
      `Address is not configured for ${token} deployment config "${
        deploymentConfigName ?? 'default'
      }" at ${reference.scope}.${String(reference.key)}`,
    );
  }

  return address;
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
        token: tokenAddresses.token,
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
  return getDeploymentProfileForToken(token, deploymentConfigName)
    ?.addressBook?.[addressKey as keyof AddressProfileTokenAddresses];
};
