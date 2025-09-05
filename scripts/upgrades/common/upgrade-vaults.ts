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
import { networkConfigs } from '../configs/network-configs';
import { upgradeConfigs } from '../configs/upgrade-configs';

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
  if (typeof deployment === 'string') {
    throw new Error(
      'Deployment is a string (getTxResponse should set to true)',
    );
  }
  const tx = await deployment.wait(5);
  const address =
    tx.contractAddress ?? tx.to ?? ((tx as any).creates as string);

  if (tx.confirmations <= 7) {
    return {
      deployedNew: true,
      address,
    };
  } else {
    return { deployedNew: false, address };
  }
};

type MTokenVaultsToUpgrade = {
  mToken: MTokenName;
  addresses: TokenAddresses;
  vaults: {
    vaultType: VaultType;
    vaultTypeTo?: VaultType;
    overrideImplementation?: string;
    initializer?: string;
    initializerArgs?: unknown[];
  }[];
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
    networkConfigs[hre.network.config.chainId!].transferProxyAdminOwnership;

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
  ) => Promise<boolean>,
) => {
  const config = upgradeConfigs.upgrades[upgradeId];

  if (!config) {
    throw new Error(`Upgrade config not found for upgrade ${upgradeId}`);
  }

  const toUpgrade = config.vaults[hre.network.config.chainId!];

  if (!toUpgrade) {
    throw new Error(
      `Upgrade ${upgradeId} not found for chain ${hre.network.config.chainId}`,
    );
  }

  const addresses = getCurrentAddresses(hre);

  if (!addresses) {
    throw new Error('Addresses not found');
  }

  const allDeployedNetworkMTokens = Object.keys(addresses).filter((v) =>
    isMTokenName(v),
  );

  let mTokenVaultsToUpgrade: MTokenVaultsToUpgrade[] = [];

  if (toUpgrade.all) {
    mTokenVaultsToUpgrade = allDeployedNetworkMTokens.map((mToken) => {
      const mTokenAddresses = addresses[mToken]!;

      const vaultTypes = Object.keys(mTokenAddresses).filter(
        (v) => vaultTypeToContractName(v as VaultType) !== undefined,
      ) as VaultType[];

      return {
        mToken,
        vaults: vaultTypes.map((v) => ({
          vaultType: v,
          initializer: config.initializers?.[v]?.initializer,
          initializerArgs: config.initializers?.[v]?.defaultInitializerArgs,
        })),
        addresses: mTokenAddresses,
      };
    });
  }

  for (const mTokenKey in toUpgrade.overrides) {
    const mToken = mTokenKey as MTokenName;
    const overrides = toUpgrade.overrides[mToken];
    const mTokenAddresses = addresses[mToken]!;

    let overrideVaults: (MTokenVaultsToUpgrade['vaults'][0] & {
      remove?: boolean;
    })[] = [];

    if (overrides?.all) {
      overrideVaults = (
        Object.keys(mTokenAddresses).filter(
          (v) => vaultTypeToContractName(v as VaultType) !== undefined,
        ) as VaultType[]
      ).map((v) => ({
        vaultType: v,
        initializer: config.initializers?.[v]?.initializer,
        initializerArgs: config.initializers?.[v]?.defaultInitializerArgs,
      }));
    }

    const vaults = Object.entries(overrides?.overrides ?? {}).map(
      ([key, val]) => {
        const valParsed = typeof val === 'boolean' ? {} : val;

        return {
          vaultType: key as VaultType,
          remove: val === false ? true : undefined,
          ...valParsed,
        };
      },
    );

    const overrideVaultsWithConfigs =
      vaults?.map((v) =>
        v.remove === true
          ? {
              vaultType: v.vaultType,
              remove: true,
            }
          : {
              vaultType: v.vaultType,
              vaultTypeTo: v.vaultTypeTo,
              overrideImplementation: v.overrideImplementation,
              initializer:
                v.initializer ??
                config.initializers?.[v.vaultType]?.initializer,
              initializerArgs:
                v.initializerArgs ??
                config.initializers?.[v.vaultType]?.defaultInitializerArgs,
            },
      ) ?? [];

    for (const vault of overrideVaultsWithConfigs) {
      const foundIndex = overrideVaults.findIndex(
        (v) => v.vaultType === vault.vaultType,
      );

      if (foundIndex !== -1) {
        overrideVaults[foundIndex] = vault;
      } else {
        overrideVaults.push(vault);
      }
    }

    const found = mTokenVaultsToUpgrade.find((v) => v.mToken === mToken);

    if (found) {
      for (const vault of overrideVaults) {
        const foundVaultIndex = found.vaults.findIndex(
          (v) => v.vaultType === vault.vaultType,
        );

        if (foundVaultIndex !== -1) {
          if (vault.remove !== true) {
            found.vaults[foundVaultIndex] = {
              ...vault,
            };
          } else {
            found.vaults.splice(foundVaultIndex, 1);
          }
        } else if (vault.remove !== true) {
          found.vaults.push(vault);
        }
      }
    } else {
      mTokenVaultsToUpgrade.push({
        mToken,
        vaults: overrideVaults.filter((v) => v.remove !== true),
        addresses: mTokenAddresses,
      });
    }
  }

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

  upgradeContracts.sort((a, b) => {
    return a.mToken.localeCompare(b.mToken, 'en', { sensitivity: 'base' });
  });

  console.log('upgradeContracts', upgradeContracts);
  console.log('total upgrades', upgradeContracts.length);

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
            redeployImplementation: 'onchange',
            getTxResponse: true,
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

  const failedUpgrades: {
    mToken: MTokenName;
    vaultType: VaultType;
    error: string;
  }[] = [];

  for (const deployment of deployments) {
    try {
      console.log(
        `\n\nUpgrading ${deployment.contractName}
Proxy: ${deployment.proxyAddress}
Implementation: ${deployment.implementationAddress}`,
      );
      const result = await callBack(
        hre,
        {
          proxyAddress: deployment.proxyAddress,
          newImplementation: deployment.implementationAddress,
          initializer: deployment.initializer,
          initializerCalldata: deployment.initializerCalldata,
        },
        config.overrideSalt ?? upgradeId,
      );

      if (!result) {
        throw new Error('Upgrade was not finished successfully');
      }
    } catch (e) {
      console.error(`Upgrade failed with error ${e}`);

      failedUpgrades.push({
        mToken: deployment.mToken,
        vaultType: deployment.vaultType,
        error: e instanceof Error ? e.message : (e as string),
      });
    }
  }

  if (failedUpgrades.length > 0) {
    console.log('Failed upgrades', failedUpgrades);
  }

  console.log(
    `Successfully executed ${deployments.length - failedUpgrades.length}/${
      deployments.length
    } upgrades`,
  );
};
