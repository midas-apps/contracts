import { Provider } from '@ethersproject/providers';
import { Signer } from 'ethers';
import { HardhatRuntimeEnvironment } from 'hardhat/types';

import { MTokenName } from '../../../config';
import { getCurrentAddresses } from '../../../config/constants/addresses';
import { getCommonContractNames } from '../../../helpers/contracts';
import { getFordefiProvider } from '../../../helpers/fordefi-provider';
import { getAllRoles } from '../../../helpers/roles';
import { MidasAccessControl } from '../../../typechain-types';
import { networkDeploymentConfigs } from '../configs/network-configs';

type Address = `0x${string}`;

export type GrantAllTokenRolesConfig = {
  providerType: 'fordefi' | 'hardhat';
  tokenManagerAddress?: Address;
  vaultsManagerAddress?: Address;
  oracleManagerAddress?: Address;
};

const acAdminVaultAddress = '0xd4195CF4df289a4748C1A7B6dDBE770e27bA1227';

export const grantAllTokenRoles = async (
  hre: HardhatRuntimeEnvironment,
  token: MTokenName,
  networkConfig?: GrantAllTokenRolesConfig,
) => {
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

  const { deployer } = await hre.getNamedAccounts();
  const deployerSigner = await hre.ethers.getSigner(deployer);

  const provider =
    networkConfig.providerType === 'fordefi'
      ? getFordefiProvider({
          vaultAddress: acAdminVaultAddress,
        })
      : deployerSigner;

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

  const oracleManagerRoles = [tokenRoles.customFeedAdmin];
  const contractsRoles = [tokenRoles.minter, tokenRoles.burner];

  const defaultManager =
    networkConfig.providerType === 'fordefi'
      ? 'invalid' // for fordefi there is no default address so tx will just throw error
      : deployerSigner.address;

  const tx = await accessControl.grantRoleMult(
    [
      ...tokenManagerRoles,
      ...vaultManagerRoles,
      ...oracleManagerRoles,
      ...contractsRoles,
    ],
    [
      ...tokenManagerRoles.map(
        () => networkConfig.tokenManagerAddress ?? defaultManager,
      ),
      ...vaultManagerRoles.map(
        () => networkConfig.vaultsManagerAddress ?? defaultManager,
      ),
      ...oracleManagerRoles.map(
        () => networkConfig.oracleManagerAddress ?? defaultManager,
      ),
      ...[
        tokenAddresses.depositVault!,
        tokenAddresses.redemptionVaultSwapper ??
          tokenAddresses.redemptionVaultBuidl ??
          tokenAddresses.redemptionVault!,
      ],
    ],
  );

  console.log('Transaction is initiated successfully', tx.hash);
};

export const revokeDefaultRolesFromDeployer = async (
  hre: HardhatRuntimeEnvironment,
) => {
  const allRoles = getAllRoles();
  const mTBILLRoles = allRoles.tokenRoles.mTBILL;
  const { deployer } = await hre.getNamedAccounts();
  const deployerSigner = await hre.ethers.getSigner(deployer);

  const accessControl = await getAcContract(hre, deployerSigner);

  const roles = [
    allRoles.common.blacklistedOperator,
    allRoles.common.greenlistedOperator,
    mTBILLRoles.burner,
    mTBILLRoles.minter,
    mTBILLRoles.pauser,
    mTBILLRoles.depositVaultAdmin,
    mTBILLRoles.redemptionVaultAdmin,
    allRoles.common.defaultAdmin,
  ];

  await accessControl.revokeRoleMult(
    roles,
    roles.map(() => deployerSigner.address),
  );

  console.log('Transaction is initiated successfully');
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
  const { deployer } = await hre.getNamedAccounts();
  const deployerSigner = await hre.ethers.getSigner(deployer);

  const accessControl = await getAcContract(hre, deployerSigner);

  await accessControl.grantRole(
    allRoles.common.defaultAdmin,
    networkConfig?.acAdminAddress ?? acAdminVaultAddress,
  );

  console.log('Transaction is initiated successfully');
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
