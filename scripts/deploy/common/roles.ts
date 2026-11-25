import { PopulatedTransaction, Signer, utils } from 'ethers';
import { HardhatRuntimeEnvironment } from 'hardhat/types';

import {
  getContractAt,
  getDeployer,
  sendAndWaitForCustomTxSign,
  toFunctionSelector,
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
  TokenFeedAddresses,
  VaultType,
} from '../../../config/constants/addresses';
import {
  selectVaultVersion,
  v1VaultTypes,
  v2VaultTypes,
} from '../../../config/constants/vaults';
import { getCommonContractNames } from '../../../helpers/contracts';
import {
  getAllRoles,
  getLegacyRolesForToken,
  getRoleHashOrEmpty,
  getRolesForToken,
} from '../../../helpers/roles';
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
    roles:
      | (keyof ReturnType<typeof getRolesForToken> | string)[]
      | {
          role: keyof ReturnType<typeof getRolesForToken> | string;
          delay: number;
        }[];
  }[];
  minBalanceExemptAddresses?: (Address | VaultType)[];
  // function permissions under the target's contract admin role
  functionPermissions?: {
    address: Address;
    contracts: (keyof TokenFeedAddresses | VaultType)[];
    functions: { signature: string; delay: number }[];
  }[];
};

const acAdminAddress = '0xd4195CF4df289a4748C1A7B6dDBE770e27bA1227';
// v2 network roles, the same for all the networks
// `PAUSE_ADMIN_ROLE` of MidasPauseManager
const pauseAdminAddress = '0xDe8BAf1687000330F81c7E426aFbbFE7e77Eca83';
// can pause (challenge) the pending timelock operations:
// `TIMELOCK_OPERATION_PAUSER_ROLE` of MidasTimelockManager
const timelockChallengerAddress = '0xa5cbC5Edf329388e22b4293E04Af20dD1fdD6f73';
// can execute the timelock operations: function permission for
// `MidasTimelockManager.executeTimelockOperation`
const timelockExecutorAddress = '0x1eAbd59E6c857AEe66d3DE3Cd5d90dbA7679fEfD';

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

  const roleBatch: (string | { role: string; delay: number })[] = [];
  const addressBatch: string[] = [];

  const parseRole = (r: (typeof roleBatch)[0]) => {
    return typeof r === 'string' ? { role: r, delay: 0 } : r;
  };

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
        let roleHash;
        let roleDelay = 0;
        let rawRole;
        if (typeof role === 'string') {
          roleHash =
            tokenRoles[role as keyof ReturnType<typeof getRolesForToken>];
          rawRole = role;
        } else {
          roleHash =
            tokenRoles[role.role as keyof ReturnType<typeof getRolesForToken>];
          roleDelay = role.delay;
          rawRole = role.role;
        }

        // if emty then means that role is not found in default roles
        // and raw role descriptor passed
        if (!roleHash) {
          if (!rawRole.includes('_')) {
            throw new Error('Invalid role description');
          }

          roleHash = getRoleHashOrEmpty(rawRole);
          console.log(`Raw role granting: ${rawRole} (${roleHash})`);
        }

        if (!roleHash) {
          throw new Error(`Role ${role} is not configured for ${token}`);
        }
        roleBatch.push({ role: roleHash, delay: roleDelay });
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
    roleBatch.map((role, i) =>
      accessControl.hasRole(parseRole(role).role, addressBatch[i]),
    ),
  );
  const rolesToGrant = roleBatch.filter((_, i) => !present[i]);
  const addressesToGrant = addressBatch.filter((_, i) => !present[i]);

  // the v1 access control (not upgraded yet) has a different bulk signature
  // and no role delays
  const isV1 = await isV1AccessControl(accessControl);

  if (rolesToGrant.length === 0) {
    console.log(`${token}: all product roles already granted — skip`);
  } else {
    const alreadyHeld = roleBatch.length - rolesToGrant.length;
    console.log(
      alreadyHeld > 0
        ? `${token}: grant ${rolesToGrant.length} missing (${alreadyHeld}/${roleBatch.length} already held)`
        : `${token}: grant ${rolesToGrant.length} missing`,
    );

    const roleNames = Object.entries({ ...allRoles.common, ...tokenRoles });
    const roleName = (role: string) =>
      roleNames.find(([, hash]) => hash === role)?.[0] ?? role;

    const grants = rolesToGrant.map((role, i) => ({
      ...parseRole(role),
      account: addressesToGrant[i],
    }));

    const sendGrant = async (
      batch: typeof grants,
      v1Style: boolean,
      comment: string,
    ) => {
      if (!batch.length) return;

      const grantTx: PopulatedTransaction = v1Style
        ? {
            to: accessControl.address,
            data: v1AcInterface.encodeFunctionData('grantRoleMult', [
              batch.map(({ role }) => role),
              batch.map(({ account }) => account),
            ]),
          }
        : await accessControl.populateTransaction.grantRoleMult(batch);

      await sendAndWaitForCustomTxSign(hre, grantTx, {
        action: 'update-ac',
        subAction: 'grant-token-roles',
        comment,
        // v2 call on a v1 access control: only succeeds after the upgrade
        skipPrediction: isV1 && !v1Style,
        changes: batch.map(({ role, account }) => ({
          field: `ac.hasRole[${roleName(role)}][${account}]`,
          current: false,
          target: true,
        })),
      });
    };

    if (isV1) {
      console.log(
        `${token}: access control is v1, roles without delay use the v1 grantRoleMult, delayed roles a v2 one (to execute after the upgrade)`,
      );
      await sendGrant(
        grants.filter(({ delay }) => delay === 0),
        true,
        `grant all ${token} roles`,
      );
      await sendGrant(
        grants.filter(({ delay }) => delay !== 0),
        false,
        `grant ${token} delayed roles (requires AC v2)`,
      );
    } else {
      await sendGrant(grants, false, `grant all ${token} roles`);
    }
  }

  await setProductFunctionPermissions(
    hre,
    accessControl,
    token,
    managerGrantConfig?.functionPermissions ?? [],
    isV1,
  );
};

const setProductFunctionPermissions = async (
  hre: HardhatRuntimeEnvironment,
  accessControl: MidasAccessControl,
  token: MTokenName,
  permissions: NonNullable<GrantAllTokenRolesConfig['functionPermissions']>,
  isV1AC: boolean,
) => {
  if (!permissions.length) return;

  const deployedAddresses = getDeploymentTokenAddresses(
    getCurrentAddresses(hre)![token]!,
    token,
    hre.deploymentConfig,
  );

  const paramsByTarget = new Map<
    string,
    {
      functionSelector: string;
      account: string;
      delay: number;
      enabled: boolean;
    }[]
  >();

  for (const { address, contracts, functions } of permissions) {
    for (const reference of contracts) {
      const target = deployedAddresses[reference];
      if (!target) {
        throw new Error(`Permission target ${token}.${reference} is not set`);
      }

      // v1 access control (and v1 targets) have no function permissions yet,
      // the master role is resolved on-chain by `setPermissionRoleMult`
      const masterRole = isV1AC
        ? undefined
        : await (
            await getContractAt(hre, 'IMidasAccessControlManaged', target)
          ).contractAdminRole();

      for (const { signature, delay } of functions) {
        const functionSelector = toFunctionSelector(signature);

        if (
          masterRole &&
          (await accessControl[
            'hasFunctionPermission(bytes32,address,bytes4,address)'
          ](masterRole, target, functionSelector, address))
        ) {
          continue;
        }

        console.log(
          `${token}.${reference}: permit ${signature} to ${address} (delay ${delay})`,
        );
        paramsByTarget.set(target, [
          ...(paramsByTarget.get(target) ?? []),
          { functionSelector, account: address, delay, enabled: true },
        ]);
      }
    }
  }

  if (!paramsByTarget.size) {
    console.log(`${token}: all function permissions already set — skip`);
    return;
  }

  for (const [target, params] of paramsByTarget) {
    await sendAndWaitForCustomTxSign(
      hre,
      await accessControl.populateTransaction[
        'setPermissionRoleMult(address,(bytes4,address,uint32,bool)[])'
      ](target, params),
      {
        action: 'update-ac',
        subAction: 'set-function-permissions',
        comment: `set ${token} function permissions on ${target}${
          isV1AC ? ' (requires AC v2)' : ''
        }`,
        skipPrediction: isV1AC,
        changes: params.map(({ functionSelector, account }) => ({
          field: `ac.hasFunctionPermission[${target}][${functionSelector}][${account}]`,
          current: false,
          target: true,
        })),
      },
    );
  }
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

/**
 * Grants the v2 network roles to the default accounts, which are the same
 * for all the networks: pause admin, timelock challenger and timelock
 * executor. Already granted roles are skipped.
 * The challenger and the pause admin are compatible with the v1 access
 * control; the executor is a function permission, which exists only in the
 * v2 one
 */
export const grantV2NetworkRoles = async (hre: HardhatRuntimeEnvironment) => {
  const allRoles = getAllRoles();
  const deployer = await getDeployer(hre);

  const accessControl = await getAcContract(hre, deployer);

  const plainRoles = [
    {
      name: 'challenger',
      role: allRoles.common.timelockOperationPauser,
      account: timelockChallengerAddress,
    },
    {
      name: 'pause admin',
      role: allRoles.common.pauseAdmin,
      account: pauseAdminAddress,
    },
  ];

  for (const { name, role, account } of plainRoles) {
    if (await accessControl.hasRole(role, account)) {
      console.log(`${name} role is already granted — skip`);
      continue;
    }

    console.log(`Granting ${name} role to ${account}`);

    // `grantRole(bytes32,address)` instead of `grantRoleMult`: it has the
    // same signature in the v1 access control, so the roles can be granted
    // before the access control is upgraded
    await sendAndWaitForCustomTxSign(
      hre,
      await accessControl.populateTransaction['grantRole(bytes32,address)'](
        role,
        account,
      ),
      {
        action: 'update-ac',
        comment: `grant ${name} role to ${account}`,
        changes: [
          {
            field: `ac.hasRole[${name}][${account}]`,
            current: false,
            target: true,
          },
        ],
      },
    );
  }

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
  const hasPermission = await accessControl[
    'hasFunctionPermission(bytes32,address,bytes4,address)'
  ](
    masterRole,
    timelockManagerAddress,
    functionSelector,
    timelockExecutorAddress,
  ).catch((e) => {
    if (e?.code !== 'CALL_EXCEPTION') throw e;
    return false;
  });

  if (hasPermission) {
    console.log('executor permission is already granted — skip');
    return;
  }

  console.log(`Granting executor permission to ${timelockExecutorAddress}`);

  await sendAndWaitForCustomTxSign(
    hre,
    await accessControl.populateTransaction[
      'setPermissionRoleMult(bytes32,address,(bytes4,address,uint32,bool)[])'
    ](masterRole, timelockManagerAddress, [
      {
        functionSelector,
        account: timelockExecutorAddress,
        delay: 0, // no delay override
        enabled: true,
      },
    ]),
    {
      action: 'update-ac',
      comment: `grant timelock executor permission to ${timelockExecutorAddress}`,
      changes: [
        {
          field: `ac.hasFunctionPermission[timelockManager.executeTimelockOperation][${timelockExecutorAddress}]`,
          current: false,
          target: true,
        },
      ],
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

/**
 * Revokes the legacy (v1) roles of the mToken that have no use after the v2
 * deployment. For now it is only the legacy pauser role, which is revoked
 * from `postDeploy.grantRoles.tokenManagerAddress` of the mToken deployment
 * config: in v2 it is replaced by the token manager role.
 * Works only with the v2 access control
 */
export const revokeLegacyTokenRoles = async (
  hre: HardhatRuntimeEnvironment,
  mToken: MTokenName,
) => {
  // never falls back to all the mTokens of the network
  if (!mToken) {
    throw new Error('mToken is required');
  }

  const tokenManagerAddress = getDeploymentConfigForToken(
    mToken,
    hre.deploymentConfig,
  )?.networkConfigs?.[hre.network.config.chainId!]?.postDeploy?.grantRoles
    ?.tokenManagerAddress;

  if (!tokenManagerAddress) {
    throw new Error(
      `${mToken}: grantRoles.tokenManagerAddress is not set in the deployment config`,
    );
  }

  const deployer = await getDeployer(hre);
  const accessControl = await getAcContract(hre, deployer);

  const legacyRoles = getLegacyRolesForToken(mToken);
  const tokenRoles = getRolesForToken(mToken);

  const [hasLegacyPauser, hasTokenManager] = await Promise.all([
    accessControl.hasRole(legacyRoles.pauser, tokenManagerAddress),
    accessControl.hasRole(tokenRoles.tokenManager, tokenManagerAddress),
  ]);

  if (!hasLegacyPauser) {
    console.log(
      `${mToken}: token manager (${tokenManagerAddress}) holds no legacy pauser role — skip`,
    );
    return;
  }

  // the legacy role is revoked only once its v2 replacement is in place
  if (!hasTokenManager) {
    throw new Error(
      `${mToken}: token manager (${tokenManagerAddress}) does not hold the token manager role yet, grant it first`,
    );
  }

  console.log(
    `Revoking legacy pauser role from ${mToken} token manager (${tokenManagerAddress})`,
  );

  await sendAndWaitForCustomTxSign(
    hre,
    await accessControl.populateTransaction.revokeRoleMult([
      { role: legacyRoles.pauser, account: tokenManagerAddress },
    ]),
    {
      action: 'update-ac',
      subAction: 'revoke-token-roles',
      comment: `revoke legacy pauser role from ${mToken} token manager`,
    },
  );
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
