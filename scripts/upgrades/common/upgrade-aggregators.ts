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
import { upgradeConfigs } from '../configs/upgrade-configs';

// TODO: refactor this whole file and make upgrades more generic
type AggregatorType = 'customAggregator' | 'customAggregatorGrowth';

type MTokenAggregatorsToUpgrade = {
  mToken: MTokenName;
  addresses: TokenAddresses;
  aggregators: {
    aggregatorType: AggregatorType;
    aggregatorTypeTo?: AggregatorType;
    overrideImplementation?: string;
    initializer?: string;
    initializerArgs?: unknown[];
  }[];
};

export const proposeUpgradeAggregators = async (
  hre: HardhatRuntimeEnvironment,
  upgradeId: string,
  mTokenAggregatorsToUpgrade: MTokenAggregatorsToUpgrade[],
) => {
  return upgradeAllAggregators(
    hre,
    upgradeId,
    mTokenAggregatorsToUpgrade,
    async (hre, params, salt) => {
      return await proposeTimeLockUpgradeTx(hre, params, salt);
    },
  );
};

export const executeUpgradeAggregators = async (
  hre: HardhatRuntimeEnvironment,
  upgradeId: string,
  mTokenAggregatorsToUpgrade: MTokenAggregatorsToUpgrade[],
) => {
  return upgradeAllAggregators(
    hre,
    upgradeId,
    mTokenAggregatorsToUpgrade,
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

const upgradeAllAggregators = async (
  hre: HardhatRuntimeEnvironment,
  upgradeId: string,
  mTokenAggregatorsToUpgrade: MTokenAggregatorsToUpgrade[],
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

  console.log('mTokensToUpgrade', mTokenAggregatorsToUpgrade);

  const upgradeContracts: {
    mToken: MTokenName;
    aggregatorType: AggregatorType;
    contractType: string;
    contractName: string;
    proxyAddress: string;
    overrideImplementation?: string;
    initializer?: string;
    initializerCalldata?: string;
  }[] = [];

  for (const { mToken, aggregators, addresses } of mTokenAggregatorsToUpgrade) {
    for (const {
      aggregatorType,
      aggregatorTypeTo,
      overrideImplementation,
      initializer,
      initializerArgs,
    } of aggregators) {
      const contractType = aggregatorTypeTo ?? aggregatorType;
      const contractName =
        getTokenContractNames(mToken)[contractType as keyof TokenContractNames];

      if (!contractName) {
        throw new Error(
          `Contract name not found for ${mToken} ${contractType}`,
        );
      }

      const contract = await hre.ethers.getContractAt(
        contractName,
        addresses.customFeed!,
      );

      upgradeContracts.push({
        mToken,
        aggregatorType,
        contractType: aggregatorTypeTo ?? aggregatorType,
        contractName,
        proxyAddress: addresses.customFeed!,
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
    aggregatorType: AggregatorType;
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
        aggregatorType: deployment.aggregatorType,
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
