import { HardhatRuntimeEnvironment } from 'hardhat/types';

import { etherscanVerify } from '../../../../helpers/utils';
import { DeployFunction } from '../../common/types';
import { getDeployer } from '../../common/utils';

const func: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  const deployer = await getDeployer(hre);

  console.log('Deploying yINJ Oracle adapter...');

  const fac = await hre.ethers.getContractFactory(
    'YInjChainlinkAdapter',
    deployer,
  );

  const yINJOracle = '0x072fB925014B45dec604A6c44f85DAf837653056';
  const deployment = await fac.deploy(
    // update based on network
    yINJOracle,
  );

  console.log('Deployed yINJ adapter:', deployment.address);

  // Wait for deployment to be confirmed
  if (deployment.deployTransaction) {
    console.log(`Waiting 5 blocks...`);
    await deployment.deployTransaction.wait(5);
    console.log('Waited.');
  }

  // Verify contract on Etherscan
  console.log('Verifying contract...');
  await etherscanVerify(hre, deployment.address, yINJOracle);
};

export default func;
