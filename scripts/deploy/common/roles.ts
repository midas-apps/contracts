import { Provider } from '@ethersproject/providers';
import { Signer } from 'ethers';
import { HardhatRuntimeEnvironment } from 'hardhat/types';

import {
  getDeployer,
  getNetworkConfig,
  sendAndWaitForCustomTxSign,
} from './utils';
import {
  defaultDepositVaultPriority,
  resolveAllVaultAddresses,
  roleGrantRedemptionVaultPriority,
} from './vault-resolver';

import { MTokenName } from '../../../config';
import { getCurrentAddresses } from '../../../config/constants/addresses';
import { getCommonContractNames } from '../../../helpers/contracts';
import { getAllRoles } from '../../../helpers/roles';
import { MidasAccessControl } from '../../../typechain-types';
import { networkDeploymentConfigs } from '../configs/network-configs';

type Address = `0x${string}`;

export type GrantAllTokenRolesConfig = {
  tokenManagerAddress: Address;
  vaultsManagerAddress?: Address;
  oracleManagerAddress: Address;
};

const acAdminAddress = '0xd4195CF4df289a4748C1A7B6dDBE770e27bA1227';

export const grantAllProductRoles = async (
  hre: HardhatRuntimeEnvironment,
  token: MTokenName,
) => {
  const { grantRoles: networkConfig } = getNetworkConfig(
    hre,
    token,
    'postDeploy',
  );

  if (!networkConfig) {
    throw new Error('Network config is not found');
  }

  const addresses = getCurrentAddresses(hre);
  const tokenAddresses = addresses?.[token];

  if (!tokenAddresses) {
    throw new Error(`Token addresses are not found for ${token}`);
  }

  const allRoles = getAllRoles();
  const tokenRoles = allRoles.tokenRoles[token];

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

  const oracleManagerRoles = [tokenRoles.customFeedAdmin!];

  const defaultManager = provider.address;

  const contractsRoles: string[] = [];
  const contractsAddresses: string[] = [];

  const depositVaults = resolveAllVaultAddresses(
    tokenAddresses,
    defaultDepositVaultPriority,
  );
  const redemptionVaults = resolveAllVaultAddresses(
    tokenAddresses,
    roleGrantRedemptionVaultPriority,
  );

  if (depositVaults.length > 0) {
    for (const dv of depositVaults) {
      contractsRoles.push(tokenRoles.minter);
      contractsAddresses.push(dv);
    }
    console.log(
      `✅ Granting minter role to ${depositVaults.length} deposit vault(s)`,
    );
  } else {
    console.log(`⚠️  Skipping minter role for depositVault (not deployed)`);
  }

  if (redemptionVaults.length > 0) {
    for (const rv of redemptionVaults) {
      contractsRoles.push(tokenRoles.burner);
      contractsAddresses.push(rv);
    }
    console.log(
      `✅ Granting burner role to ${redemptionVaults.length} redemption vault(s)`,
    );
  } else {
    console.log(`⚠️  Skipping burner role for redemptionVault (not deployed)`);
  }

  await sendAndWaitForCustomTxSign(
    hre,
    await accessControl.populateTransaction.grantRoleMult(
      [
        ...tokenManagerRoles,
        ...vaultManagerRoles,
        ...oracleManagerRoles,
        ...contractsRoles,
      ],
      [
        ...tokenManagerRoles.map(() => networkConfig.tokenManagerAddress),
        ...vaultManagerRoles.map(
          () => networkConfig.vaultsManagerAddress ?? defaultManager,
        ),
        ...oracleManagerRoles.map(() => networkConfig.oracleManagerAddress),
        ...contractsAddresses,
      ],
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
