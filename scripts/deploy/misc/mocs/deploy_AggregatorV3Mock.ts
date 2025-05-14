import { HardhatRuntimeEnvironment } from 'hardhat/types';

import { etherscanVerify } from '../../../../helpers/utils';
import {
  // eslint-disable-next-line camelcase
  AggregatorV3Mock__factory,
} from '../../../../typechain-types';
import { DeployFunction } from '../../common/types';
import { getDeployer } from '../../common/utils';

const func: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  const deployer = await getDeployer(hre);

  console.log('Deploying AggregatorV3Mock...');

  const deployment = await new AggregatorV3Mock__factory(deployer).deploy();

  console.log('Deployed AggregatorV3Mock:', deployment.address);

  if (deployment.deployTransaction) {
    console.log('Waiting 5 blocks...');
    await deployment.deployTransaction.wait(5);
    console.log('Waited.');
  }
  await etherscanVerify(hre, deployment.address);
};

export default func;
