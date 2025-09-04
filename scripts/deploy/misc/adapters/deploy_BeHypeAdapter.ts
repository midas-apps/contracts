import { HardhatRuntimeEnvironment } from 'hardhat/types';

import { DeployFunction } from '../../common/types';
import { getDeployer } from '../../common/utils';

const func: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  const deployer = await getDeployer(hre);

  console.log('Deploying BeHYPE adapter...');

  const fac = await hre.ethers.getContractFactory('BeHypeAdapter', deployer);

  const tx = await fac.deploy(
    // update based on network
    '0xEB198B94326B37e3D23E74F5E66857617b271400',
  );

  console.log('Deployed BeHYPE adapter:', tx.address);

  await tx.deployTransaction.wait(5);
};

export default func;
