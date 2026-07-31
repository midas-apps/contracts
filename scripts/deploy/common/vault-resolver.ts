import {
  DepositVaultType,
  RedemptionVaultType,
  TokenAddresses,
} from '../../../config/constants/addresses';

export const defaultDepositVaultPriority: DepositVaultType[] = [
  'depositVault',
  'depositVaultUstb',
  'depositVaultAave',
  'depositVaultMorpho',
  'depositVaultMToken',
];

export const routingRedemptionVaultPriority: RedemptionVaultType[] = [
  'redemptionVaultMToken',
  'redemptionVaultSwapper',
  'redemptionVaultUstb',
  'redemptionVaultAave',
  'redemptionVaultMorpho',
  'redemptionVault',
];

export const roleGrantRedemptionVaultPriority: RedemptionVaultType[] = [
  'redemptionVaultMToken',
  'redemptionVaultSwapper',
  'redemptionVaultUstb',
  'redemptionVaultAave',
  'redemptionVaultMorpho',
  'redemptionVault',
];

export const resolveVaultAddress = (
  tokenAddresses: TokenAddresses,
  priorities: readonly (DepositVaultType | RedemptionVaultType)[],
): string | undefined => {
  for (const key of priorities) {
    const value = tokenAddresses[key];
    if (value) return value;
  }

  return undefined;
};

export const resolveAllVaultAddresses = (
  tokenAddresses: TokenAddresses,
  vaultTypes: readonly (DepositVaultType | RedemptionVaultType)[],
): string[] => {
  const addresses: string[] = [];
  for (const key of vaultTypes) {
    const value = tokenAddresses[key];
    if (value) addresses.push(value);
  }
  return addresses;
};
