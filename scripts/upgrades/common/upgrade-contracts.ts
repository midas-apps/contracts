import { DeployImplementationResponse } from '@openzeppelin/hardhat-upgrades/dist/deploy-implementation';
import { HardhatRuntimeEnvironment } from 'hardhat/types';

import { MTokenName } from '../../../config';
import {
  getCurrentAddresses,
  TokenAddresses,
} from '../../../config/constants/addresses';
import {
  getTokenContractNames,
  TokenContractNames,
} from '../../../helpers/contracts';
import { etherscanVerify, logDeploy } from '../../../helpers/utils';
import {
  executeTimeLockUpgradeTx,
  GetUpgradeTxParams,
  proposeTimeLockUpgradeTx,
} from '../../deploy/common/timelock';
import { getDeployer } from '../../deploy/common/utils';

// TODO: refactor this whole file and make upgrades more generic
type ContractType =
  | 'dataFeed'
  | 'dataFeedComposite'
  | 'dataFeedMultiply'
  | 'customAggregator'
  | 'customAggregatorGrowth'
  | 'token';

type ContractTypeToUpgrade =
  | 'dataFeed'
  | 'customFeed'
  | 'customFeedGrowth'
  | 'token';

type MTokenContractsToUpgrade = {
  mToken: MTokenName;
  addresses: TokenAddresses;
  contracts: {
    contractType: ContractType;
    contractTypeTo?: ContractType;
    overrideImplementation?: string;
    constructorArgs?: unknown[];
    initializer?: string;
    initializerArgs?: unknown[];
  }[];
};

type ContractToUpgrade = {
  mToken?: MTokenName;
  contractType: string;
  contractTypeTo?: string;
  contractName: string;
  proxyAddress: string;
  overrideImplementation?: string;
  initializer?: string;
  initializerArgs?: unknown[];
  constructorArgs?: unknown[];
};

export const proposeUpgradeContractsRaw = async (
  hre: HardhatRuntimeEnvironment,
  upgradeId: string,
  contractsToUpgrade: ContractToUpgrade[],
) => {
  return upgradeAllContractsRaw(
    hre,
    upgradeId,
    contractsToUpgrade,
    async (hre, params, salt) => {
      return await proposeTimeLockUpgradeTx(hre, params, salt);
    },
  );
};

export const executeUpgradeContractsRaw = async (
  hre: HardhatRuntimeEnvironment,
  upgradeId: string,
  contractsToUpgrade: ContractToUpgrade[],
) => {
  return upgradeAllContractsRaw(
    hre,
    upgradeId,
    contractsToUpgrade,
    async (hre, params, salt) => {
      return await executeTimeLockUpgradeTx(hre, params, salt);
    },
  );
};

export const proposeUpgradeContracts = async (
  hre: HardhatRuntimeEnvironment,
  upgradeId: string,
  contractType: ContractTypeToUpgrade,
  mTokenContractsToUpgrade: MTokenContractsToUpgrade[],
) => {
  return upgradeAllContracts(
    hre,
    upgradeId,
    contractType,
    mTokenContractsToUpgrade,
    async (hre, params, salt) => {
      return await proposeTimeLockUpgradeTx(hre, params, salt);
    },
  );
};

export const executeUpgradeContracts = async (
  hre: HardhatRuntimeEnvironment,
  upgradeId: string,
  contractType: ContractTypeToUpgrade,
  mTokenContractsToUpgrade: MTokenContractsToUpgrade[],
) => {
  return upgradeAllContracts(
    hre,
    upgradeId,
    contractType,
    mTokenContractsToUpgrade,
    async (hre, params, salt) => {
      return await executeTimeLockUpgradeTx(hre, params, salt);
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
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

const upgradeAllContracts = async (
  hre: HardhatRuntimeEnvironment,
  upgradeId: string,
  contractTypeToUpgrade: ContractTypeToUpgrade,
  mTokenContractsToUpgrade: MTokenContractsToUpgrade[],
  callBack: (
    hre: HardhatRuntimeEnvironment,
    params: GetUpgradeTxParams,
    salt: string,
  ) => Promise<unknown>,
) => {
  const addresses = getCurrentAddresses(hre);

  if (!addresses) {
    throw new Error('Addresses not found');
  }

  console.log('mTokensToUpgrade', mTokenContractsToUpgrade);

  const contractsToUpgrade: ContractToUpgrade[] = [];

  for (const { mToken, contracts, addresses } of mTokenContractsToUpgrade) {
    for (const {
      contractType,
      contractTypeTo,
      overrideImplementation,
      initializer,
      initializerArgs,
      constructorArgs,
    } of contracts) {
      const type = contractTypeTo ?? contractType;
      const contractName =
        getTokenContractNames(mToken)[type as keyof TokenContractNames];

      if (!contractName) {
        throw new Error(`Contract name not found for ${mToken} ${type}`);
      }

      contractsToUpgrade.push({
        mToken,
        contractType: type,
        contractTypeTo,
        contractName,
        proxyAddress: addresses[contractTypeToUpgrade]!,
        overrideImplementation,
        initializer,
        initializerArgs: initializerArgs,
        constructorArgs,
      });
    }
  }

  return await upgradeAllContractsRaw(
    hre,
    upgradeId,
    contractsToUpgrade,
    callBack,
  );
};

const upgradeAllContractsRaw = async (
  hre: HardhatRuntimeEnvironment,
  upgradeId: string,
  upgradeContracts: ContractToUpgrade[],
  callBack: (
    hre: HardhatRuntimeEnvironment,
    params: GetUpgradeTxParams,
    salt: string,
  ) => Promise<unknown>,
) => {
  upgradeContracts.sort((a, b) => {
    return (a.mToken ?? a.contractName).localeCompare(
      b.mToken ?? b.contractName,
      'en',
      {
        sensitivity: 'base',
      },
    );
  });

  console.log('upgradeContracts', upgradeContracts);

  const deployer = await getDeployer(hre);

  const deployments: ({
    implementationAddress: string;
  } & (typeof upgradeContracts)[number])[] = [];

  for (const upgradeContract of upgradeContracts) {
    const {
      mToken,
      overrideImplementation,
      contractType,
      contractName,
      proxyAddress,
      constructorArgs,
    } = upgradeContract;

    if (overrideImplementation) {
      console.log(
        `Using override implementation (${overrideImplementation}) for ${
          mToken ? `${mToken} ${contractType}` : contractName
        }`,
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
            constructorArgs,
          },
        ),
      );

    if (deployedNew) {
      logDeploy(contractName, contractType, implementationAddress);
      await etherscanVerify(
        hre,
        implementationAddress,
        contractName,
        ...(constructorArgs ?? []),
      ).catch((e) => {
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
    mToken?: MTokenName;
    contractName: string;
    contractType: string;
    error: string;
  }[] = [];

  for (const deployment of deployments) {
    try {
      console.log(
        `\n\nUpgrading ${deployment.contractName}
Proxy: ${deployment.proxyAddress}
Implementation: ${deployment.implementationAddress}`,
      );

      const contract = await hre.ethers.getContractAt(
        deployment.contractName,
        deployment.proxyAddress,
      );

      const initializerCalldata =
        deployment.initializerArgs && deployment.initializer
          ? contract.interface.encodeFunctionData(
              deployment.initializer,
              deployment.initializerArgs,
            )
          : undefined;

      const result = await callBack(
        hre,
        {
          proxyAddress: deployment.proxyAddress,
          newImplementation: deployment.implementationAddress,
          initializer: deployment.initializer,
          initializerCalldata,
        },
        upgradeId,
      );

      if (result === false) {
        throw new Error('Upgrade was not finished successfully');
      }
    } catch (e) {
      console.error(`Upgrade failed with error ${e}`);

      failedUpgrades.push({
        mToken: deployment.mToken,
        contractName: deployment.contractName,
        contractType: deployment.contractType,
        error: e instanceof Error ? e.message : (e as string),
      });
    }
  }

  if (failedUpgrades.length > 0) {
    console.log('Failed upgrades', failedUpgrades);
    throw new Error(`Failed to execute ${failedUpgrades.length} upgrade(s)`);
  } else {
    console.log('All upgrades successful');
  }
};
