import { HardhatRuntimeEnvironment } from 'hardhat/types';

import { DeployFunction } from '../../common/types';
import { getDeployer } from '../../common/utils';

const func: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  const deployer = await getDeployer(hre);

  console.log('Deploying SyrupUSDC adapter...');

  const fac = await hre.ethers.getContractFactory('SyrupUSDCAdapter', deployer);

  const tx = await fac.deploy(
    // replace with the actual address
    '0x80ac24aa929eaf5013f6436cda2a7ba190f5cc0b',
  );

  console.log('Deployed SyrupUSDC adapter:', tx.address);

  await tx.deployTransaction.wait(5);
};

export default func;
