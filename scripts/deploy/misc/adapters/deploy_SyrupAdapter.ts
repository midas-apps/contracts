import { HardhatRuntimeEnvironment } from 'hardhat/types';

import { DeployFunction } from '../../common/types';
import { getDeployer } from '../../common/utils';

const func: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  const deployer = await getDeployer(hre);

  // Replace with the actual token
  const adapterToken = {
    name: 'syrupUSDT',
    address: '0x356B8d89c1e1239Cbbb9dE4815c39A1474d5BA7D',
  };

  console.log(`Deploying ${adapterToken.name} adapter...`);

  const fac = await hre.ethers.getContractFactory('SyrupAdapter', deployer);

  const tx = await fac.deploy(adapterToken.address);

  console.log(`Deployed ${adapterToken.name} adapter:`, tx.address);

  await tx.deployTransaction.wait(5);
};

export default func;
