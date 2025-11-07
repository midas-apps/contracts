import { HardhatRuntimeEnvironment } from 'hardhat/types';

import { etherscanVerify } from '../../../../helpers/utils';
import {
  // eslint-disable-next-line camelcase
  ERC20MockWithName__factory,
} from '../../../../typechain-types';
import { DeployFunction } from '../../common/types';
import { getDeployer } from '../../common/utils';

const func: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  const deployer = await getDeployer(hre);

  console.log('Deploying ERC20MockWithName...');

  const deployment = await new ERC20MockWithName__factory(deployer).deploy(
    9,
    'USDT0',
    'USDT0',
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
