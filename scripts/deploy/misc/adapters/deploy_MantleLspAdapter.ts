import { HardhatRuntimeEnvironment } from 'hardhat/types';

import { DeployFunction } from '../../common/types';
import { getDeployer } from '../../common/utils';

const func: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  const deployer = await getDeployer(hre);

  console.log('Deploying Mantle LSP adapter...');

  const fac = await hre.ethers.getContractFactory(
    'MantleLspStakingAdapter',
    deployer,
  );

  const tx = await fac.deploy(
    // replace with the actual address
    '0xe3cBd06D7dadB3F4e6557bAb7EdD924CD1489E8f',
  );

  console.log('Deployed Mantle LSP adapter:', tx.address);

  await tx.deployTransaction.wait(5);
};

export default func;
