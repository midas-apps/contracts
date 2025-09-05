import { HardhatRuntimeEnvironment } from 'hardhat/types';

import { DeployFunction } from '../../common/types';
import { getDeployer } from '../../common/utils';

const func: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  const deployer = await getDeployer(hre);

  console.log('Deploying BeHYPE adapter...');

  const fac = await hre.ethers.getContractFactory('BeHypeAdapter', deployer);

  const tx = await fac.deploy(
    // update based on network
    '0xCeaD893b162D38e714D82d06a7fe0b0dc3c38E0b',
  );

  console.log('Deployed BeHYPE adapter:', tx.address);

  await tx.deployTransaction.wait(5);
};

export default func;
