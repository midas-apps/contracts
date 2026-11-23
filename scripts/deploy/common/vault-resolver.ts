import { constants } from 'ethers';

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
  'depositVaultUsyc',
];

export const routingRedemptionVaultPriority: RedemptionVaultType[] = [
  'redemptionVaultMToken',
  'redemptionVaultSwapper',
  'redemptionVaultUstb',
  'redemptionVaultAave',
  'redemptionVaultMorpho',
  'redemptionVaultUsyc',
  'redemptionVault',
];

export const roleGrantRedemptionVaultPriority: RedemptionVaultType[] = [
  'redemptionVaultMToken',
  'redemptionVaultSwapper',
  'redemptionVaultUstb',
  'redemptionVaultAave',
  'redemptionVaultMorpho',
  'redemptionVaultUsyc',
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

export type UsycVaultType = Extract<
  DepositVaultType | RedemptionVaultType,
  'depositVaultUsyc' | 'redemptionVaultUsyc'
>;

/**
 * Looks up the USYC vault of `vaultType` deployed for `mToken` among the
 * default addresses of the token and all of its address profiles, to be
 * used as the paired vault of its counterpart.
 * Returns undefined when the vault is not deployed yet. Throws when more
 * than one vault is found, as there is no way to tell which of them is
 * the paired one
 * @param tokenAddresses addresses of `mToken` with the vault version selected
 */
export const findUsycVault = (
  tokenAddresses: TokenAddresses | undefined,
  mToken: string,
  vaultType: UsycVaultType,
): string | undefined => {
  const found = new Map<string, string>();

  for (const source of [
    tokenAddresses,
    ...Object.values(tokenAddresses?.addressProfiles ?? {}),
  ]) {
    const address = source?.[vaultType];
    if (address && address !== constants.AddressZero) {
      found.set(address.toLowerCase(), address);
    }
  }

  const vaults = Array.from(found.values());

  if (vaults.length > 1) {
    throw new Error(
      `More than one ${vaultType} is found for ${mToken} (${vaults.join(
        ', ',
      )}), cannot tell which one is the paired vault`,
    );
  }

  return vaults[0];
};
