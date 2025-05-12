import * as hre from 'hardhat';
import { DeployFunction } from 'hardhat-deploy/types';
import { HardhatRuntimeEnvironment } from 'hardhat/types';

import { etherscanVerify } from '../../../../helpers/utils';
import {
  // eslint-disable-next-line camelcase
  AggregatorV3Mock__factory,
} from '../../../../typechain-types';
// 0x7811C1Bf5db28630F303267Cc613797EB9A81188
const func: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  const { deployer } = await hre.getNamedAccounts();
  const owner = await hre.ethers.getSigner(deployer);

  console.log('Deploying AggregatorV3Mock...');

  const deployment = await new AggregatorV3Mock__factory(owner).deploy();

  console.log('Deployed AggregatorV3Mock:', deployment.address);

  if (deployment.deployTransaction) {
    console.log('Waiting 5 blocks...');
    await deployment.deployTransaction.wait(5);
    console.log('Waited.');
  }
  await etherscanVerify(hre, deployment.address);
};

func(hre).then(console.log).catch(console.error);
