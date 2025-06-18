import { HardhatRuntimeEnvironment } from 'hardhat/types';

import { DeployFunction } from '../../common/types';
import { getDeployer } from '../../common/utils';

const func: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  const deployer = await getDeployer(hre);

  console.log('Deploying rsETH adapter...');

  const fac = await hre.ethers.getContractFactory('RsEthAdapter', deployer);

  const tx = await fac.deploy(
    // replace with the actual address
    '0x349A73444b1a310BAe67ef67973022020d70020d',
  );

  console.log('Deployed rsETH adapter:', tx.address);

  await tx.deployTransaction.wait(5);
};

export default func;
