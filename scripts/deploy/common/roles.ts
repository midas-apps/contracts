import { Provider } from '@ethersproject/providers';
import { Signer } from 'ethers';
import { HardhatRuntimeEnvironment } from 'hardhat/types';

import { getDeployer, sendAndWaitForCustomTxSign } from './utils';
import {
  defaultDepositVaultPriority,
  resolveAllVaultAddresses,
  roleGrantRedemptionVaultPriority,
} from './vault-resolver';

import { MTokenName } from '../../../config';
import { getCurrentAddresses } from '../../../config/constants/addresses';
import { getCommonContractNames } from '../../../helpers/contracts';
import { getAllRoles, getRolesForToken } from '../../../helpers/roles';
import { MidasAccessControl } from '../../../typechain-types';
import {
  getDeploymentProfileForToken,
  resolveDeploymentAddress,
} from '../configs/deployment-profiles';
import { getDeploymentConfigForToken } from '../configs/index';
import { networkDeploymentConfigs } from '../configs/network-configs';

type Address = `0x${string}`;

export type GrantAllTokenRolesConfig = {
  tokenManagerAddress?: Address;
  vaultsManagerAddress?: Address;
  oracleManagerAddress?: Address;
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
    tokenRoles.pauser,
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

  await sendAndWaitForCustomTxSign(
    hre,
    await accessControl.populateTransaction.grantRoleMult(
      rolesToGrant,
      addressesToGrant,
    ),
    {
      action: 'update-ac',
      subAction: 'grant-token-roles',
      comment: `grant all ${token} roles`,
    },
  );
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
      roles,
      roles.map(() => deployer.address),
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
    await accessControl.populateTransaction.grantRole(
      allRoles.common.defaultAdmin,
      networkConfig?.acAdminAddress ?? acAdminAddress,
    ),
    {
      action: 'deployer',
      comment: 'grant default admin role to ac admin',
    },
  );
};

const getAcContract = async (
  hre: HardhatRuntimeEnvironment,
  provider: Provider | Signer,
) => {
  const addresses = getCurrentAddresses(hre);

  return (
    await hre.ethers.getContractAt(
      getCommonContractNames().ac,
      addresses!.accessControl!,
    )
  ).connect(provider) as MidasAccessControl;
};
