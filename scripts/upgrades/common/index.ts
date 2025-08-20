import { DeployImplementationResponse } from '@openzeppelin/hardhat-upgrades/dist/deploy-implementation';
import { HardhatRuntimeEnvironment } from 'hardhat/types';

import { MTokenName } from '../../../config';
import {
  getCurrentAddresses,
  TokenAddresses,
  VaultType,
} from '../../../config/constants/addresses';
import {
  getTokenContractNames,
  TokenContractNames,
  vaultTypeToContractName,
} from '../../../helpers/contracts';
import {
  etherscanVerify,
  isMTokenName,
  logDeploy,
} from '../../../helpers/utils';
import {
  executeTimeLockTransferOwnershipTx,
  executeTimeLockUpgradeTx,
  GetUpgradeTxParams,
  proposeTimeLockTransferOwnershipTx,
  proposeTimeLockUpgradeTx,
  TransferOwnershipTxParams,
} from '../../deploy/common/timelock';
import { getDeployer } from '../../deploy/common/utils';
import { upgradeConfig } from '../configs';

export const proposeUpgradeVaults = async (
  hre: HardhatRuntimeEnvironment,
  upgradeId: string,
) => {
  return upgradeAllVaults(hre, upgradeId, async (hre, params, salt) => {
    return await proposeTimeLockUpgradeTx(hre, params, salt);
  });
};

export const executeUpgradeVaults = async (
  hre: HardhatRuntimeEnvironment,
  upgradeId: string,
) => {
  return upgradeAllVaults(hre, upgradeId, async (hre, params, salt) => {
    return await executeTimeLockUpgradeTx(hre, params, salt);
  });
};

export const proposeTransferOwnershipProxyAdmin = async (
  hre: HardhatRuntimeEnvironment,
  upgradeId: string,
) => {
  return transferOwnershipProxyAdmin(
    hre,
    upgradeId,
    async (hre, params, salt) => {
      return await proposeTimeLockTransferOwnershipTx(hre, params, salt);
    },
  );
};

export const executeTransferOwnershipProxyAdmin = async (
  hre: HardhatRuntimeEnvironment,
  upgradeId: string,
) => {
  return transferOwnershipProxyAdmin(
    hre,
    upgradeId,
    async (hre, params, salt) => {
      return await executeTimeLockTransferOwnershipTx(hre, params, salt);
    },
  );
};

const getImplAddressFromDeployment = async (
  deployment: DeployImplementationResponse,
) => {
  if (typeof deployment !== 'string') {
    return { deployedNew: true, address: (await deployment.wait(5)).to };
  } else {
    return { deployedNew: false, address: deployment };
  }
};

const transferOwnershipProxyAdmin = async (
  hre: HardhatRuntimeEnvironment,
  upgradeId: string,
  callBack: (
    hre: HardhatRuntimeEnvironment,
    params: TransferOwnershipTxParams,
    salt: string,
  ) => Promise<unknown>,
) => {
  const config =
    upgradeConfig[hre.network.config.chainId!].transferProxyAdminOwnership;

  if (!config) {
    throw new Error(
      `Upgrade config not found for chain ${hre.network.config.chainId}`,
    );
  }

  return await callBack(
    hre,
    {
      newOwner: config.newOwner,
    },
    upgradeId,
  );
};
const upgradeAllVaults = async (
  hre: HardhatRuntimeEnvironment,
  upgradeId: string,
  callBack: (
    hre: HardhatRuntimeEnvironment,
    params: GetUpgradeTxParams,
    salt: string,
  ) => Promise<unknown>,
) => {
  const config = upgradeConfig[hre.network.config.chainId!];

  if (!config) {
    throw new Error(
      `Upgrade config not found for chain ${hre.network.config.chainId}`,
    );
  }

  const { upgrades } = config;

  const toUpgrade = upgrades[upgradeId]?.vaults.toUpgrade;

  if (!toUpgrade) {
    throw new Error(`Upgrade ${upgradeId} not found`);
  }

  const addresses = getCurrentAddresses(hre);

  if (!addresses) {
    throw new Error('Addresses not found');
  }

  const allDeployedNetworkMTokens = Object.keys(addresses).filter((v) =>
    isMTokenName(v),
  );

  const mTokenVaultsToUpgrade: {
    mToken: MTokenName;
    addresses: TokenAddresses;
    vaults: {
      vaultType: VaultType;
      vaultTypeTo?: VaultType;
      overrideImplementation?: string;
      initializer?: string;
      initializerArgs?: unknown[];
    }[];
  }[] =
    toUpgrade === 'all'
      ? allDeployedNetworkMTokens.map((mToken) => {
          const mTokenAddresses = addresses[mToken]!;

          const vaultTypes = Object.keys(mTokenAddresses).filter(
            (v) => vaultTypeToContractName(v as VaultType) !== undefined,
          ) as VaultType[];

          return {
            mToken,
            vaults: vaultTypes.map((v) => ({
              vaultType: v,
              initializer:
                upgrades[upgradeId]?.vaults?.initializers?.[v]?.initializer,
            })),
            addresses: mTokenAddresses,
          };
        })
      : toUpgrade.map((v) => {
          const mTokenAddresses = addresses[v.mToken]!;

          const vaults =
            v.vaults === 'all'
              ? (
                  Object.keys(mTokenAddresses).filter(
                    (v) =>
                      vaultTypeToContractName(v as VaultType) !== undefined,
                  ) as VaultType[]
                ).map((v) => ({
                  vaultType: v,
                  initializer:
                    upgrades[upgradeId]?.vaults?.initializers?.[v]?.initializer,
                }))
              : v.vaults?.map((v) => ({
                  vaultType: v.vaultType,
                  vaultTypeTo: v.vaultTypeTo,
                  overrideImplementation: v.overrideImplementation,
                  initializer:
                    v.initializer ??
                    upgrades[upgradeId]?.vaults?.initializers?.[v.vaultType]
                      ?.initializer,
                  initializerArgs: v.initializerArgs,
                })) ?? [];

          return {
            mToken: v.mToken,
            vaults,
            addresses: mTokenAddresses,
          };
        });
  console.log('mTokensToUpgrade', mTokenVaultsToUpgrade);

  const upgradeContracts: {
    mToken: MTokenName;
    vaultType: VaultType;
    contractType: string;
    contractName: string;
    proxyAddress: string;
    overrideImplementation?: string;
    initializer?: string;
    initializerCalldata?: string;
  }[] = [];

  for (const { mToken, vaults, addresses } of mTokenVaultsToUpgrade) {
    for (const {
      vaultType,
      vaultTypeTo,
      overrideImplementation,
      initializer,
      initializerArgs,
    } of vaults) {
      const contractType = vaultTypeToContractName(vaultTypeTo ?? vaultType)!;
      const contractName =
        getTokenContractNames(mToken)[contractType as keyof TokenContractNames];

      if (!contractName) {
        throw new Error(
          `Contract name not found for ${mToken} ${contractType}`,
        );
      }

      const contract = await hre.ethers.getContractAt(
        contractName,
        addresses[vaultType]!,
      );

      upgradeContracts.push({
        mToken,
        vaultType,
        contractType: vaultTypeTo ?? vaultType,
        contractName,
        proxyAddress: addresses[vaultType]!,
        overrideImplementation,
        initializer,
        initializerCalldata: initializer
          ? contract.interface.encodeFunctionData(
              initializer,
              (initializerArgs ?? []) as readonly any[],
            )
          : undefined,
      });
    }
  }

  console.log('upgradeContracts', upgradeContracts);

  const deployer = await getDeployer(hre);

  const deployments: ({
    implementationAddress: string;
  } & typeof upgradeContracts[number])[] = [];

  for (const upgradeContract of upgradeContracts) {
    const {
      mToken,
      overrideImplementation,
      contractType,
      contractName,
      proxyAddress,
    } = upgradeContract;

    if (overrideImplementation) {
      console.log(
        `Using override implementation (${overrideImplementation}) for ${mToken}`,
      );
      continue;
    }

    const { deployedNew, address: implementationAddress } =
      await getImplAddressFromDeployment(
        await hre.upgrades.prepareUpgrade(
          proxyAddress,
          await hre.ethers.getContractFactory(contractName, deployer),
          {
            unsafeAllow: ['constructor'],
            redeployImplementation: 'onchange',
          },
        ),
      );

    if (deployedNew) {
      logDeploy(contractName, contractType, implementationAddress);
      await etherscanVerify(hre, implementationAddress).catch((e) => {
        console.error('Verification failed', e);
      });
    } else {
      console.log(
        `Implementation (${implementationAddress}) already deployed for ${contractName}`,
      );
    }

    deployments.push({
      ...upgradeContract,
      implementationAddress,
    });
  }

  for (const deployment of deployments) {
    await callBack(
      hre,
      {
        proxyAddress: deployment.proxyAddress,
        newImplementation: deployment.implementationAddress,
        initializer: deployment.initializer,
        initializerCalldata: deployment.initializerCalldata,
      },
      upgrades[upgradeId]?.vaults.overrideSalt ?? upgradeId,
    );
  }
};
