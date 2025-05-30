import { HardhatRuntimeEnvironment } from 'hardhat/types';

import { DeployFunction } from '../../common/types';
import { getDeployer } from '../../common/utils';

const func: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  const deployer = await getDeployer(hre);

  console.log('Deploying Wrapped EEth adapter...');

  const fac = await hre.ethers.getContractFactory(
    'WrappedEEthAdapter',
    deployer,
  );

  const tx = await fac.deploy(
    // replace with the actual address
    '0xcd5fe23c85820f7b72d0926fc9b05b43e359b7ee',
  );

  console.log('Deployed Wrapped EEth adapter:', tx.address);

  await tx.deployTransaction.wait(5);
};

export default func;
