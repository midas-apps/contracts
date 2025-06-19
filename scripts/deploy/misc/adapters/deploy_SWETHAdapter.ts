import { HardhatRuntimeEnvironment } from 'hardhat/types';

import { DeployFunction } from '../../common/types';
import { getDeployer } from '../../common/utils';

const func: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  const deployer = await getDeployer(hre);

  console.log('Deploying SWETH adapter...');

  const fac = await hre.ethers.getContractFactory(
    'WrappedEEthAdapter',
    deployer,
  );

  const tx = await fac.deploy(
    // replace with the actual address
    '0xf951E335afb289353dc249e82926178EaC7DEd78',
  );

  console.log('Deployed SWETH adapter:', tx.address);

  await tx.deployTransaction.wait(5);
};

export default func;
