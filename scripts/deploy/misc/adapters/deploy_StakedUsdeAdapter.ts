import { HardhatRuntimeEnvironment } from 'hardhat/types';

import { DeployFunction } from '../../common/types';
import { getDeployer } from '../../common/utils';

const func: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  const deployer = await getDeployer(hre);

  console.log('Deploying Staked USDe adapter...');

  const fac = await hre.ethers.getContractFactory(
    'StakedUSDeAdapter',
    deployer,
  );

  const tx = await fac.deploy(
    // replace with the actual address
    '0x9D39A5DE30e57443BfF2A8307A4256c8797A3497',
  );

  console.log('Deployed Staked USDe adapter:', tx.address);

  await tx.deployTransaction.wait(5);
};

export default func;
