import { HardhatRuntimeEnvironment } from 'hardhat/types';

import { getCurrentAddresses } from '../../../../config/constants/addresses';
import { etherscanVerify } from '../../../../helpers/utils';
import { DeployFunction } from '../../common/types';
import { getDeployer } from '../../common/utils';

const func: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  const addresses = getCurrentAddresses(hre);
  const deployer = await getDeployer(hre);

  // Configuration for this deployment
  const CONTRACT_NAME = 'DataFeedToBandStdAdapter';
  const BASE_SYMBOL = 'mXRP';
  const QUOTE_SYMBOL = 'XRP';
  const CONFIRMATION_BLOCKS = 5;

  console.log(`Deploying ${CONTRACT_NAME} for ${BASE_SYMBOL}...`, {
    network: hre.network.name,
    mXRPAddresses: addresses?.mXRP,
  });

  if (!addresses?.mXRP?.dataFeed) {
    throw new Error('mXRP dataFeed address is not set');
  }

  const contractFactory = await hre.ethers.getContractFactory(
    CONTRACT_NAME,
    deployer,
  );

  // Deploy the adapter with mXRP dataFeed
  const deployment = await contractFactory.deploy(
    addresses.mXRP.dataFeed,
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
    addresses.mXRP.dataFeed,
    BASE_SYMBOL,
    QUOTE_SYMBOL,
  );
};

export default func;
