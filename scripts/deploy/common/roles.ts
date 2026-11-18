import { PopulatedTransaction, Signer, utils } from 'ethers';
import { HardhatRuntimeEnvironment } from 'hardhat/types';

import {
  getContractAt,
  getDeployer,
  sendAndWaitForCustomTxSign,
} from './utils';
import {
  defaultDepositVaultPriority,
  resolveAllVaultAddresses,
  roleGrantRedemptionVaultPriority,
} from './vault-resolver';

import { MTokenName } from '../../../config';
import {
  getCurrentAddresses,
  getRawCurrentAddresses,
  VaultType,
} from '../../../config/constants/addresses';
import {
  selectVaultVersion,
  v1VaultTypes,
  v2VaultTypes,
} from '../../../config/constants/vaults';
import { getCommonContractNames } from '../../../helpers/contracts';
import { getAllRoles, getRolesForToken } from '../../../helpers/roles';
import {
  MidasAccessControl,
  MidasTimelockManager__factory,
} from '../../../typechain-types';
import {
  getDeploymentProfileForToken,
  getDeploymentTokenAddresses,
  resolveDeploymentAddress,
} from '../configs/deployment-profiles';
import { getDeploymentConfigForToken } from '../configs/index';
import { networkDeploymentConfigs } from '../configs/network-configs';

type Address = `0x${string}`;

export type GrantAllTokenRolesConfig = {
  tokenManagerAddress?: Address;
  vaultsManagerAddress?: Address;
  oracleManagerAddress?: Address;
  // exact product roles for wallets outside the standard manager set
  extraRoles?: {
    address: Address;
    roles: (keyof ReturnType<typeof getRolesForToken>)[];
  }[];
  minBalanceExemptAddresses?: (Address | VaultType)[];
};

const acAdminAddress = '0xd4195CF4df289a4748C1A7B6dDBE770e27bA1227';

export const grantAllProductRoles = async (
  hre: HardhatRuntimeEnvironment,
  token: MTokenName,
) => {
  const chainId = hre.network.config.chainId!;
  const managerGrantConfig = getDeploymentConfigForToken(
    token,
    hre.deploymentConfig,
  )?.networkConfigs?.[chainId]?.postDeploy?.grantRoles;

  const addresses = getCurrentAddresses(hre);
  const tokenAddresses = addresses?.[token];

  if (!tokenAddresses) {
    throw new Error(`Token addresses are not found for ${token}`);
  }

  const allRoles = getAllRoles();
  const tokenRoles = getRolesForToken(token);

  const provider = await getDeployer(hre);

  const accessControl = await getAcContract(hre, provider);

  const tokenManagerRoles = [
    allRoles.common.blacklistedOperator,
    allRoles.common.greenlistedOperator,
    tokenRoles.burner,
    tokenRoles.minter,
    tokenRoles.tokenManager,
  ];

  const vaultManagerRoles = [
    tokenRoles.depositVaultAdmin,
    tokenRoles.redemptionVaultAdmin,
  ];

  const oracleManagerRoles = tokenRoles.customFeedAdmin
    ? [tokenRoles.customFeedAdmin]
    : [];

  const defaultManager = provider.address;
  const profile = getDeploymentProfileForToken(token, hre.deploymentConfig);
  const depositVaults = profile
    ? profile.operatorRoles.minters.map((reference) =>
        resolveDeploymentAddress(tokenAddresses, token, hre.deploymentConfig, {
          scope: reference.scope,
          key: reference.vault,
        }),
      )
    : resolveAllVaultAddresses(tokenAddresses, defaultDepositVaultPriority);
  const redemptionVaults = profile
    ? profile.operatorRoles.burners.map((reference) =>
        resolveDeploymentAddress(tokenAddresses, token, hre.deploymentConfig, {
          scope: reference.scope,
          key: reference.vault,
        }),
      )
    : resolveAllVaultAddresses(
        tokenAddresses,
        roleGrantRedemptionVaultPriority,
      );

  const roleBatch: string[] = [];
  const addressBatch: string[] = [];

  // Token / vault / oracle managers
  if (managerGrantConfig) {
    if (managerGrantConfig.tokenManagerAddress) {
      roleBatch.push(...tokenManagerRoles);
      addressBatch.push(
        ...tokenManagerRoles.map(() => managerGrantConfig.tokenManagerAddress!),
      );
    }

    if (managerGrantConfig.vaultsManagerAddress || !profile) {
      roleBatch.push(...vaultManagerRoles);
      addressBatch.push(
        ...vaultManagerRoles.map(
          () => managerGrantConfig.vaultsManagerAddress ?? defaultManager,
        ),
      );
    }

    if (managerGrantConfig.oracleManagerAddress) {
      if (!oracleManagerRoles.length) {
        throw new Error(`Oracle manager role is not configured for ${token}`);
      }
      roleBatch.push(...oracleManagerRoles);
      addressBatch.push(
        ...oracleManagerRoles.map(
          () => managerGrantConfig.oracleManagerAddress!,
        ),
      );
    }

    for (const { address, roles } of managerGrantConfig.extraRoles ?? []) {
      for (const role of roles) {
        const roleHash = tokenRoles[role];
        if (!roleHash) {
          throw new Error(`Role ${role} is not configured for ${token}`);
        }
        roleBatch.push(roleHash);
        addressBatch.push(address);
      }
    }

    const deployedAddresses = getDeploymentTokenAddresses(
      tokenAddresses,
      token,
      hre.deploymentConfig,
    );
    const minBalanceExemptAddresses = (
      managerGrantConfig.minBalanceExemptAddresses ?? []
    ).map((reference) => {
      if (reference.startsWith('0x')) return reference;
      const address = deployedAddresses[reference as VaultType];
      if (!address) {
        throw new Error(
          `Min-balance exempt vault ${token}.${reference} is not configured`,
        );
      }
      return address;
    });
    roleBatch.push(
      ...minBalanceExemptAddresses.map(() => tokenRoles.minBalanceExempt),
    );
    addressBatch.push(...minBalanceExemptAddresses);
  }

  for (const dv of depositVaults) {
    roleBatch.push(tokenRoles.minter);
    addressBatch.push(dv);
  }

  for (const rv of redemptionVaults) {
    roleBatch.push(tokenRoles.burner);
    addressBatch.push(rv);
  }

  const present = await Promise.all(
    roleBatch.map((role, i) => accessControl.hasRole(role, addressBatch[i])),
  );
  const rolesToGrant = roleBatch.filter((_, i) => !present[i]);
  const addressesToGrant = addressBatch.filter((_, i) => !present[i]);

  if (rolesToGrant.length === 0) {
    console.log(`${token}: all product roles already granted — skip`);
    return;
  }

  const alreadyHeld = roleBatch.length - rolesToGrant.length;
  console.log(
    alreadyHeld > 0
      ? `${token}: grant ${rolesToGrant.length} missing (${alreadyHeld}/${roleBatch.length} already held)`
      : `${token}: grant ${rolesToGrant.length} missing`,
  );

  // the v1 access control (not upgraded yet) has a different bulk signature
  const isV1 = await isV1AccessControl(accessControl);

  if (isV1) {
    console.log(
      `${token}: access control is v1, using the v1 grantRoleMult signature`,
    );
  }

  const grantTx: PopulatedTransaction = isV1
    ? {
        to: accessControl.address,
        data: v1AcInterface.encodeFunctionData('grantRoleMult', [
          rolesToGrant,
          addressesToGrant,
        ]),
      }
    : await accessControl.populateTransaction.grantRoleMult(
        rolesToGrant.map((role, index) => ({
          role,
          account: addressesToGrant[index],
          delay: 0, // TODO: add default delay?
        })),
      );

  await sendAndWaitForCustomTxSign(hre, grantTx, {
    action: 'update-ac',
    subAction: 'grant-token-roles',
    comment: `grant all ${token} roles`,
  });
};

export const revokeDefaultRolesFromDeployer = async (
  hre: HardhatRuntimeEnvironment,
) => {
  const allRoles = getAllRoles();
  const deployer = await getDeployer(hre);

  const accessControl = await getAcContract(hre, deployer);

  const roles = [allRoles.common.defaultAdmin];

  await sendAndWaitForCustomTxSign(
    hre,
    await accessControl.populateTransaction.revokeRoleMult(
      roles.map((role) => ({ role, account: deployer.address })),
    ),
    {
      action: 'deployer',
      comment: 'revoke default roles from deployer',
    },
  );
};

export type GrantDefaultAdminRoleToAcAdminConfig = {
  acAdminAddress?: Address;
};

export const grantDefaultAdminRoleToAcAdmin = async (
  hre: HardhatRuntimeEnvironment,
) => {
  const networkConfig =
    networkDeploymentConfigs[hre.network.config.chainId!]
      ?.grantDefaultAdminRole;

  if (!networkConfig) {
    throw new Error('Network config is not found');
  }

  const allRoles = getAllRoles();
  const deployer = await getDeployer(hre);

  const accessControl = await getAcContract(hre, deployer);

  await sendAndWaitForCustomTxSign(
    hre,
    await accessControl.populateTransaction['grantRole(bytes32,address)'](
      allRoles.common.defaultAdmin,
      networkConfig?.acAdminAddress ?? acAdminAddress,
    ),
    {
      action: 'deployer',
      comment: 'grant default admin role to ac admin',
    },
  );
};

export type GrantTimelockRolesConfig = {
  /**
   * accounts that can pause (challenge) the pending timelock operations:
   * `TIMELOCK_OPERATION_PAUSER_ROLE` of MidasTimelockManager
   */
  challengers?: Address[];
  /**
   * accounts that can execute the timelock operations: function permission
   * for `MidasTimelockManager.executeTimelockOperation`
   */
  executors?: Address[];
};

/**
 * Grants the timelock manager roles configured for the network: challengers
 * and executors. Already granted roles are skipped.
 * Challengers are compatible with the v1 access control; executors are
 * function permissions, which exist only in the v2 one
 */
export const grantTimelockRoles = async (hre: HardhatRuntimeEnvironment) => {
  const networkConfig =
    networkDeploymentConfigs[hre.network.config.chainId!]?.grantTimelockRoles;

  if (!networkConfig) {
    throw new Error('Network config is not found');
  }

  const { challengers = [], executors = [] } = networkConfig;

  if (challengers.length === 0 && executors.length === 0) {
    throw new Error('No challengers or executors are configured');
  }

  const allRoles = getAllRoles();
  const deployer = await getDeployer(hre);

  const accessControl = await getAcContract(hre, deployer);

  const hasRole = await Promise.all(
    challengers.map((account) =>
      accessControl.hasRole(allRoles.common.timelockOperationPauser, account),
    ),
  );
  const challengersToGrant = challengers.filter((_, i) => !hasRole[i]);

  if (challengers.length > 0 && challengersToGrant.length === 0) {
    console.log('Challenger roles are already granted — skip');
  }

  // one `grantRole(bytes32,address)` per account instead of `grantRoleMult`:
  // it has the same signature in the v1 access control, so the roles can be
  // granted before the access control is upgraded
  for (const account of challengersToGrant) {
    console.log(`Granting challenger role to ${account}`);

    await sendAndWaitForCustomTxSign(
      hre,
      await accessControl.populateTransaction['grantRole(bytes32,address)'](
        allRoles.common.timelockOperationPauser,
        account,
      ),
      {
        action: 'update-ac',
        comment: `grant challenger role to ${account}`,
      },
    );
  }

  if (executors.length === 0) return;

  // v2 access control only: the tx fails if it is not upgraded yet
  const timelockManagerAddress = getCurrentAddresses(hre)?.timelockManager;

  if (!timelockManagerAddress) {
    throw new Error('Timelock manager address is not set');
  }

  const timelockManager = MidasTimelockManager__factory.connect(
    timelockManagerAddress,
    hre.ethers.provider,
  );

  const masterRole = await timelockManager.contractAdminRole();
  const functionSelector = timelockManager.interface.getSighash(
    'executeTimelockOperation',
  );

  // the v1 access control has no function permissions: the call reverts
  // there, which means that the permission is not granted
  const hasPermission = await Promise.all(
    executors.map((account) =>
      accessControl['hasFunctionPermission(bytes32,address,bytes4,address)'](
        masterRole,
        timelockManagerAddress,
        functionSelector,
        account,
      ).catch((e) => {
        if (e?.code !== 'CALL_EXCEPTION') throw e;
        return false;
      }),
    ),
  );
  const executorsToGrant = executors.filter((_, i) => !hasPermission[i]);

  if (executorsToGrant.length === 0) {
    console.log('Executor permissions are already granted — skip');
    return;
  }

  for (const account of executorsToGrant) {
    console.log(`Granting executor permission to ${account}`);
  }

  await sendAndWaitForCustomTxSign(
    hre,
    await accessControl.populateTransaction[
      'setPermissionRoleMult(bytes32,address,(bytes4,address,uint32,bool)[])'
    ](
      masterRole,
      timelockManagerAddress,
      executorsToGrant.map((account) => ({
        functionSelector,
        account,
        delay: 0, // no delay override
        enabled: true,
      })),
    ),
    {
      action: 'update-ac',
      comment: 'grant timelock executor permissions',
    },
  );
};

/**
 * Revokes the minter and burner roles of the mToken from its v1 vaults (the
 * product ones and the ones of its address profiles). Only the roles that the
 * vaults hold on-chain are revoked.
 * Addresses that are also configured as v2 vaults are never touched
 */
export const revokeV1VaultMintBurnRoles = async (
  hre: HardhatRuntimeEnvironment,
  mToken: MTokenName,
) => {
  const addresses = getRawCurrentAddresses(hre);

  if (!addresses) {
    throw new Error('Network addresses are not found');
  }

  // never falls back to all the mTokens of the network
  if (!mToken) {
    throw new Error('mToken is required');
  }

  const tokenAddresses = addresses[mToken];

  if (!tokenAddresses) {
    throw new Error(`Token addresses are not found for ${mToken}`);
  }

  type VaultAddresses = Partial<Record<VaultType, string>>;

  const v1 = selectVaultVersion(tokenAddresses, 'v1');
  const v2 = selectVaultVersion(tokenAddresses, 'v2');

  // base keys hold the vaults of the selected version
  const scopes = (selected: typeof tokenAddresses) =>
    [
      ['', selected],
      ...Object.entries(selected.addressProfiles ?? {}).map(
        ([profile, profileAddresses]) => [`${profile}.`, profileAddresses],
      ),
    ] as [string, VaultAddresses | undefined][];

  const v2Vaults = new Set(
    scopes(v2).flatMap(([, scope]) =>
      v2VaultTypes.flatMap((type) => scope?.[type]?.toLowerCase() ?? []),
    ),
  );

  const roles = getRolesForToken(mToken);
  const seen = new Set<string>();

  const candidates: {
    vault: string;
    account: string;
    role: string;
    roleName: 'minter' | 'burner';
  }[] = [];

  for (const [prefix, scope] of scopes(v1)) {
    for (const type of v1VaultTypes) {
      const account = scope?.[type];
      if (!account || seen.has(account.toLowerCase())) continue;
      seen.add(account.toLowerCase());

      const vault = `${mToken}.${prefix}${type}`;

      if (v2Vaults.has(account.toLowerCase())) {
        console.log(`Skipping ${vault} (${account}): also a v2 vault`);
        continue;
      }

      candidates.push(
        { vault, account, role: roles.minter, roleName: 'minter' },
        { vault, account, role: roles.burner, roleName: 'burner' },
      );
    }
  }

  const deployer = await getDeployer(hre);
  const accessControl = await getAcContract(hre, deployer);

  const hasRole = await Promise.all(
    candidates.map(({ role, account }) => accessControl.hasRole(role, account)),
  );
  const toRevoke = candidates.filter((_, i) => hasRole[i]);

  if (toRevoke.length === 0) {
    console.log(`${mToken}: v1 vaults hold no minter / burner roles — skip`);
    return;
  }

  // `revokeRoleMult` requires the same admin role for all the roles of a call
  const uniqueRoles = [...new Set(toRevoke.map(({ role }) => role))];
  const roleAdmins = new Map<string, string>();

  await Promise.all(
    uniqueRoles.map(async (role) =>
      roleAdmins.set(role, await accessControl.getRoleAdmin(role)),
    ),
  );

  const batches = new Map<string, typeof toRevoke>();

  for (const item of toRevoke) {
    const admin = roleAdmins.get(item.role)!;
    batches.set(admin, [...(batches.get(admin) ?? []), item]);
  }

  for (const batch of batches.values()) {
    for (const { vault, account, roleName } of batch) {
      console.log(`Revoking ${roleName} role from ${vault} (${account})`);
    }

    await sendAndWaitForCustomTxSign(
      hre,
      await accessControl.populateTransaction.revokeRoleMult(
        batch.map(({ role, account }) => ({ role, account })),
      ),
      {
        action: 'update-ac',
        subAction: 'revoke-token-roles',
        comment: `revoke minter / burner roles from ${mToken} v1 vaults`,
      },
    );
  }
};

// bulk role functions of the v1 access control
const v1AcInterface = new utils.Interface([
  'function grantRoleMult(bytes32[] roles, address[] addresses)',
]);

/**
 * true if the access control is not upgraded to v2 yet: the v1 one has no
 * `timelockManager()`, so the call reverts
 */
const isV1AccessControl = async (accessControl: MidasAccessControl) =>
  accessControl.timelockManager().then(
    () => false,
    (e) => {
      if (e?.code !== 'CALL_EXCEPTION') throw e;
      return true;
    },
  );

const getAcContract = async (
  hre: HardhatRuntimeEnvironment,
  signer: Signer,
) => {
  const addresses = getCurrentAddresses(hre);

  return (await getContractAt(
    hre,
    getCommonContractNames().ac,
    addresses!.accessControl!,
    signer,
  )) as MidasAccessControl;
};
