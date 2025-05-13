import * as hre from 'hardhat';
import { HardhatRuntimeEnvironment } from 'hardhat/types';

import { DeployFunction } from './common/types';

import { getCommonContractNames } from '../../helpers/contracts';
import {
  logDeployProxy,
  tryEtherscanVerifyImplementation,
} from '../../helpers/utils';

const func: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  const { deployer } = await hre.getNamedAccounts();
  console.log('deployer', { deployer });

  const owner = await hre.ethers.getSigner(deployer);

  const contractName = getCommonContractNames().ac;
  console.log(`Deploying ${contractName}...`);

  const deployment = await hre.upgrades.deployProxy(
    await hre.ethers.getContractFactory(contractName, owner),
    [],
    {
      unsafeAllow: ['constructor'],
    },
  );

  if (deployment.deployTransaction) {
    console.log('Waiting 5 blocks...');
    await deployment.deployTransaction.wait(5);
    console.log('Waited.');
  }

  await logDeployProxy(hre, contractName, deployment.address);
  await tryEtherscanVerifyImplementation(hre, deployment.address);
};

export default func;
