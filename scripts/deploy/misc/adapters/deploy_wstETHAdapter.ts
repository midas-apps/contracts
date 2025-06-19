import { HardhatRuntimeEnvironment } from 'hardhat/types';

import { DeployFunction } from '../../common/types';
import { getDeployer } from '../../common/utils';

const func: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  const deployer = await getDeployer(hre);

  console.log('Deploying wstETH adapter...');

  const fac = await hre.ethers.getContractFactory('WstEthAdapter', deployer);

  const tx = await fac.deploy(
    // replace with the actual address
    '0x7f39C581F595B53c5cb19bD0b3f8dA6c935E2Ca0',
  );

  console.log('Deployed wstETH adapter:', tx.address);

  await tx.deployTransaction.wait(5);
};

export default func;
