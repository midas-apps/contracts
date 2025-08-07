import { DeployImplementationResponse } from '@openzeppelin/hardhat-upgrades/dist/deploy-implementation';
import { HardhatRuntimeEnvironment } from 'hardhat/types';

import { MTokenName } from '../../../config';
import {
  getCurrentAddresses,
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
  executeTimeLockUpgradeTx,
  GetUpgradeTxParams,
  proposeTimeLockUpgradeTx,
} from '../../deploy/common/timelock';
import { getDeployer } from '../../deploy/common/utils';
import { upgradeConfig } from '../configs';

export const proposeUpgradeAllVaults = async (
  hre: HardhatRuntimeEnvironment,
) => {
  return upgradeAllVaults(hre, async (hre, params, salt) => {
    return await proposeTimeLockUpgradeTx(hre, [params], salt);
  });
};

export const executeUpgradeAllVaults = async (
  hre: HardhatRuntimeEnvironment,
) => {
  return upgradeAllVaults(hre, async (hre, params, salt) => {
    return await executeTimeLockUpgradeTx(hre, [params], salt);
  });
};

const getImplAddressFromDeployment = async (
  deployment: DeployImplementationResponse,
) => {
  if (typeof deployment !== 'string') {
    return { deployedNew: true, address: (await deployment.wait(5)).to! };
  } else {
    return { deployedNew: false, address: deployment };
  }
};

const upgradeAllVaults = async (
  hre: HardhatRuntimeEnvironment,
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

  const {
    vaults: { toUpgrade, salt },
  } = config;

  const addresses = getCurrentAddresses(hre);

  if (!addresses) {
    throw new Error('Addresses not found');
  }

  const allDeployedNetworkMTokens = Object.keys(addresses).filter((v) =>
    isMTokenName(v),
  );

  const mTokensToUpgrade: MTokenName[] =
    toUpgrade === 'all'
      ? allDeployedNetworkMTokens
      : toUpgrade.map((v) => v.mToken);
  console.log('mTokensToUpgrade', mTokensToUpgrade);

  const upgradeContracts: {
    mToken: MTokenName;
    vaultType: VaultType;
    contractType: string;
    contractName: string;
    proxyAddress: string;
    overrideImplementation?: string;
  }[] = [];

  for (const mToken of mTokensToUpgrade) {
    const mTokenAddresses = addresses[mToken]!;

    const mTokenOverrideImplementation =
      toUpgrade === 'all'
        ? undefined
        : toUpgrade.find((v) => v.mToken === mToken)?.overrideImplementation;
    const vaultTypes = Object.keys(mTokenAddresses).filter(
      (v) => vaultTypeToContractName(v as VaultType) !== undefined,
    ) as VaultType[];

    console.log('vaultTypes', vaultTypes);

    vaultTypes.forEach((vaultType) => {
      const contractType = vaultTypeToContractName(vaultType)!;
      const contractName =
        getTokenContractNames(mToken)[contractType as keyof TokenContractNames];

      if (!contractName) {
        throw new Error(
          `Contract name not found for ${mToken} ${contractType}`,
        );
      }

      upgradeContracts.push({
        mToken,
        vaultType,
        contractType,
        contractName,
        proxyAddress: mTokenAddresses[vaultType]!,
        overrideImplementation: mTokenOverrideImplementation,
      });
    });
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
      },
      salt,
    );
  }
};
