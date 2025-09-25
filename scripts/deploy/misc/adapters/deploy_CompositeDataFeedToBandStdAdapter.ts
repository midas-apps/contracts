import { HardhatRuntimeEnvironment } from 'hardhat/types';

import { etherscanVerify } from '../../../../helpers/utils';
import { DeployFunction } from '../../common/types';
import { getDeployer } from '../../common/utils';

const func: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  const deployer = await getDeployer(hre);

  // Configuration for this deployment
  const CONTRACT_NAME = 'CompositeDataFeedToBandStdAdapter';
  const DATA_FEED_ADDRESS = '0x807C43c04452d408796eb953DB2ebde1a5A306d0';
  const BASE_SYMBOL = 'mXRP';
  const QUOTE_SYMBOL = 'USD';
  const CONFIRMATION_BLOCKS = 5;

  console.log(`Deploying ${CONTRACT_NAME} for ${BASE_SYMBOL}...`, {
    network: hre.network.name,
    dataFeedAddress: DATA_FEED_ADDRESS,
  });

  const contractFactory = await hre.ethers.getContractFactory(
    CONTRACT_NAME,
    deployer,
  );

  // Deploy the adapter with mXRP dataFeed
  const deployment = await contractFactory.deploy(
    DATA_FEED_ADDRESS,
    BASE_SYMBOL,
    QUOTE_SYMBOL,
  );

  console.log(`Deployed ${CONTRACT_NAME}:`, deployment.address);

  // Wait for deployment to be confirmed
  if (deployment.deployTransaction) {
    console.log(`Waiting ${CONFIRMATION_BLOCKS} blocks...`);
    await deployment.deployTransaction.wait(CONFIRMATION_BLOCKS);
    console.log('Waited.');
  }

  // Verify contract on Etherscan
  console.log('Verifying contract...');
  await etherscanVerify(
    hre,
    deployment.address,
    DATA_FEED_ADDRESS,
    BASE_SYMBOL,
    QUOTE_SYMBOL,
  );
};

export default func;
