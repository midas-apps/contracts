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
type ContractType = 'customAggregator' | 'customAggregatorGrowth' | 'token';

type ContractTypeToUpgrade = 'customFeed' | 'token';

type MTokenContractsToUpgrade = {
  mToken: MTokenName;
  addresses: TokenAddresses;
  contracts: {
    contractType: ContractType;
    contractTypeTo?: ContractType;
    overrideImplementation?: string;
    initializer?: string;
    initializerArgs?: unknown[];
  }[];
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

  const upgradeContracts: {
    mToken: MTokenName;
    contractType: ContractType;
    contractTypeTo?: ContractType;
    contractName: string;
    proxyAddress: string;
    overrideImplementation?: string;
    initializer?: string;
    initializerCalldata?: string;
  }[] = [];

  for (const { mToken, contracts, addresses } of mTokenContractsToUpgrade) {
    for (const {
      contractType,
      contractTypeTo,
      overrideImplementation,
      initializer,
      initializerArgs,
    } of contracts) {
      const type = contractTypeTo ?? contractType;
      const contractName =
        getTokenContractNames(mToken)[type as keyof TokenContractNames];

      if (!contractName) {
        throw new Error(`Contract name not found for ${mToken} ${type}`);
      }

      const contract = await hre.ethers.getContractAt(
        contractName,
        addresses[contractTypeToUpgrade]!,
      );

      upgradeContracts.push({
        mToken,
        contractType: type,
        contractTypeTo,
        contractName,
        proxyAddress: addresses[contractTypeToUpgrade]!,
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
    contractType: ContractType;
    error: string;
  }[] = [];

  for (const deployment of deployments) {
    try {
      console.log(
        `\n\nUpgrading ${deployment.contractName}
Proxy: ${deployment.proxyAddress}
Implementation: ${deployment.implementationAddress}`,
      );
      await callBack(
        hre,
        {
          proxyAddress: deployment.proxyAddress,
          newImplementation: deployment.implementationAddress,
          initializer: deployment.initializer,
          initializerCalldata: deployment.initializerCalldata,
        },
        upgradeId,
      );
    } catch (e) {
      console.error(`Upgrade failed with error ${e}`);

      failedUpgrades.push({
        mToken: deployment.mToken,
        contractType: deployment.contractType,
        error: e instanceof Error ? e.message : (e as string),
      });
    }
  }

  if (failedUpgrades.length > 0) {
    console.log('Failed upgrades', failedUpgrades);
  } else {
    console.log('All upgrades successful');
  }
};
