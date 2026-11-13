import { HardhatRuntimeEnvironment } from 'hardhat/types';

import { MTokenName } from '../../../config';
import { getCurrentAddresses } from '../../../config/constants/addresses';
import { validateRolesOnChain } from '../../upgrades/common/onchain-read';

/**
 * Guard for a new v2 vault of a product that already has v1 vaults: the v2
 * vault must be managed by the same admin role as the v1 vaults of the same
 * kind (`vaultRole()` in v1). Greenlisted role is not compared: v1 vaults use
 * the common role, v2 vaults use the product one
 */
export const assertVaultAdminRoleMatchesV1 = async (
  hre: HardhatRuntimeEnvironment,
  mToken: MTokenName,
  vaultKind: 'depositVault' | 'redemptionVault',
  adminRole: string,
) => {
  const v1Addresses = getCurrentAddresses(hre, 'v1')?.[mToken] ?? {};

  const v1Vaults = Object.entries(v1Addresses).filter(
    (entry): entry is [string, string] =>
      entry[0].startsWith(vaultKind) && typeof entry[1] === 'string',
  );

  const errors = await validateRolesOnChain(
    hre,
    v1Vaults.map(([key, address]) => ({
      label: `v1 ${mToken}.${key} admin role`,
      address,
      // base keys can hold a vault that was upgraded to v2 in place
      getters: ['vaultRole', 'contractAdminRole'],
      expected: adminRole,
      required: false,
    })),
  );

  if (errors.length) {
    throw new Error(
      `${mToken} ${vaultKind} v2 admin role differs from the v1 vaults:\n${errors.join(
        '\n',
      )}`,
    );
  }
};
