import * as hre from 'hardhat';
import { HardhatRuntimeEnvironment } from 'hardhat/types';

import { etherscanVerify } from '../../../../helpers/utils';
import {
  // eslint-disable-next-line camelcase
  ERC20MockWithName__factory,
} from '../../../../typechain-types';
import { DeployFunction } from '../../common/types';

const func: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  const { deployer } = await hre.getNamedAccounts();
  const owner = await hre.ethers.getSigner(deployer);

  console.log('Deploying ERC20MockWithName...');

  const deployment = await new ERC20MockWithName__factory(owner).deploy(
    6,
    'USDS',
    'USDS',
  );

  console.log('Deployed ERC20MockWithName:', deployment.address);

  if (deployment.deployTransaction) {
    console.log('Waiting 5 blocks...');
    await deployment.deployTransaction.wait(5);
    console.log('Waited.');
  }
  await etherscanVerify(hre, deployment.address);
};

export default func;
