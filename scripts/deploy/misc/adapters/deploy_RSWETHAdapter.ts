import { HardhatRuntimeEnvironment } from 'hardhat/types';

import { DeployFunction } from '../../common/types';
import { getDeployer } from '../../common/utils';

const func: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  const deployer = await getDeployer(hre);

  console.log('Deploying RSWETH adapter...');

  const fac = await hre.ethers.getContractFactory(
    'WrappedEEthAdapter',
    deployer,
  );

  const tx = await fac.deploy(
    // replace with the actual address
    '0xFAe103DC9cf190eD75350761e95403b7b8aFa6c0',
  );

  console.log('Deployed RSWETH adapter:', tx.address);

  await tx.deployTransaction.wait(5);
};

export default func;
