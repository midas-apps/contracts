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
];

export const routingRedemptionVaultPriority: RedemptionVaultType[] = [
  'redemptionVaultMToken',
  'redemptionVaultSwapper',
  'redemptionVaultUstb',
  'redemptionVaultAave',
  'redemptionVaultMorpho',
  'redemptionVault',
  'redemptionVaultBuidl',
];

export const roleGrantRedemptionVaultPriority: RedemptionVaultType[] = [
  'redemptionVaultMToken',
  'redemptionVaultSwapper',
  'redemptionVaultBuidl',
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
