export type RedemptionVaultType =
  | 'redemptionVault'
  | 'redemptionVaultBuidl'
  | 'redemptionVaultSwapper'
  | 'redemptionVaultMToken'
  | 'redemptionVaultUstb'
  | 'redemptionVaultAave'
  | 'redemptionVaultMorpho'
  | 'redemptionVaultUsyc';

export type DepositVaultType =
  | 'depositVault'
  | 'depositVaultUstb'
  | 'depositVaultAave'
  | 'depositVaultMorpho'
  | 'depositVaultMToken'
  | 'depositVaultUsyc';

/**
 * Base (un-postfixed) vault key. In the addresses object the un-postfixed
 * keys hold v1 vaults; v2 vaults live under `${VaultType}V2` keys.
 */
export type VaultType = RedemptionVaultType | DepositVaultType;

export type VaultVersion = 'v1' | 'v2';

export const vaultVersions: readonly VaultVersion[] = ['v1', 'v2'];

export const isVaultVersion = (value: unknown): value is VaultVersion =>
  typeof value === 'string' &&
  (vaultVersions as readonly string[]).includes(value);

/**
 * Vault types that have no v2 implementation. USYC vaults are the opposite:
 * they exist only in v2, so they are listed in `v2VaultTypes` only
 */
export type V1OnlyVaultType = 'redemptionVaultSwapper' | 'redemptionVaultBuidl';

export type V2VaultType = Exclude<VaultType, V1OnlyVaultType>;

export const V2_VAULT_KEY_SUFFIX = 'V2';

export type V2VaultKey = `${V2VaultType}${typeof V2_VAULT_KEY_SUFFIX}`;

export const v1VaultTypes: readonly VaultType[] = [
  'depositVault',
  'depositVaultUstb',
  'depositVaultAave',
  'depositVaultMorpho',
  'depositVaultMToken',
  'redemptionVault',
  'redemptionVaultBuidl',
  'redemptionVaultSwapper',
  'redemptionVaultMToken',
  'redemptionVaultUstb',
  'redemptionVaultAave',
  'redemptionVaultMorpho',
];

export const v2VaultTypes: readonly V2VaultType[] = [
  'depositVault',
  'depositVaultUstb',
  'depositVaultAave',
  'depositVaultMorpho',
  'depositVaultMToken',
  'depositVaultUsyc',
  'redemptionVault',
  'redemptionVaultMToken',
  'redemptionVaultUstb',
  'redemptionVaultAave',
  'redemptionVaultMorpho',
  'redemptionVaultUsyc',
];

/** Every base vault key, regardless of the versions it exists in */
export const allVaultTypes: readonly VaultType[] = [
  ...new Set<VaultType>([...v1VaultTypes, ...v2VaultTypes]),
];

export const isV2VaultType = (value: unknown): value is V2VaultType =>
  (v2VaultTypes as readonly unknown[]).includes(value);

export const toV2VaultKey = (vaultType: V2VaultType): V2VaultKey =>
  `${vaultType}${V2_VAULT_KEY_SUFFIX}`;

/**
 * Key under which the vault of `vaultType` is stored in the addresses object
 * for the given version
 */
export const getVaultKey = (
  vaultType: VaultType,
  version: VaultVersion,
): VaultType | V2VaultKey | undefined => {
  if (version === 'v1') return vaultType;
  return isV2VaultType(vaultType) ? toV2VaultKey(vaultType) : undefined;
};

const allVaultKeys = new Set<string>([
  ...allVaultTypes,
  ...v2VaultTypes.map(toV2VaultKey),
]);

/**
 * Returns a copy of `addresses` where the base vault keys (`depositVault`,
 * `redemptionVault`, ...) hold the vaults of the selected version and keys
 * of the other version are removed. When `version` is undefined, all vault
 * keys are removed so vault-related logic can't silently pick a version.
 *
 * Applied to `addressProfiles` as well.
 */
export const selectVaultVersion = <T extends object>(
  addresses: T,
  version: VaultVersion | undefined,
): T => {
  const source = addresses as Record<string, unknown>;
  const result: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(source)) {
    if (allVaultKeys.has(key)) continue;

    if (key === 'addressProfiles' && value && typeof value === 'object') {
      result[key] = Object.fromEntries(
        Object.entries(value).map(([profileKey, profile]) => [
          profileKey,
          profile && typeof profile === 'object'
            ? selectVaultVersion(profile, version)
            : profile,
        ]),
      );
      continue;
    }

    result[key] = value;
  }

  if (version === 'v1') {
    for (const vaultType of v1VaultTypes) {
      if (source[vaultType] !== undefined) {
        result[vaultType] = source[vaultType];
      }
    }
  } else if (version === 'v2') {
    for (const vaultType of v2VaultTypes) {
      const value = source[toV2VaultKey(vaultType)];
      if (value !== undefined) {
        result[vaultType] = value;
      }
    }
  }

  return result as T;
};
