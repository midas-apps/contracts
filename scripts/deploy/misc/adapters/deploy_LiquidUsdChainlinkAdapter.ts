import { HardhatRuntimeEnvironment } from 'hardhat/types';

import { etherscanVerify } from '../../../../helpers/utils';
import { DeployFunction } from '../../common/types';
import { getDeployer } from '../../common/utils';

const func: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  const deployer = await getDeployer(hre);

  console.log('Deploying liquidUSD Oracle adapter...');

  const fac = await hre.ethers.getContractFactory(
    'LiquidUsdChainlinkAdapter',
    deployer,
  );

  const liquidUSDOracle = '0xc8186736092DfFA1431f8D90eBDc07C9ae7C0801';
  const deployment = await fac.deploy(
    // update based on network
    liquidUSDOracle,
  );

  console.log('Deployed liquidUSD adapter:', deployment.address);

  // Wait for deployment to be confirmed
  if (deployment.deployTransaction) {
    console.log(`Waiting 5 blocks...`);
    await deployment.deployTransaction.wait(5);
    console.log('Waited.');
  }

  // Verify contract on Etherscan
  console.log('Verifying contract...');
  await etherscanVerify(hre, deployment.address, liquidUSDOracle);
};

export default func;
