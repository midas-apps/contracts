import { HardhatRuntimeEnvironment } from 'hardhat/types';

import { getCurrentAddresses } from '../../../../config/constants/addresses';
import { etherscanVerify } from '../../../../helpers/utils';
import { DeployFunction } from '../../common/types';
import { getDeployer } from '../../common/utils';

const func: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  const addresses = getCurrentAddresses(hre);
  const deployer = await getDeployer(hre);

  console.log('Deploying BandStdChailinkAdapter...', { addresses });

  const BAND_STD_REFERENCE_ADDRESSES = {
    oasis: '0xDA7a001b254CD22e46d3eAB04d937489c93174C3',
    xrplevm: '0x6ec95bC946DcC7425925801F4e262092E0d1f83b',
  } as const;

  // Configuration for this deployment
  const CONTRACT_NAME = 'BandStdChailinkAdapter';
  const TARGET_NETWORK = 'xrplevm';
  const BASE_SYMBOL = 'XRP';
  const QUOTE_SYMBOL = 'USD';
  const CONFIRMATION_BLOCKS = 5;

  const contractFactory = await hre.ethers.getContractFactory(
    CONTRACT_NAME,
    deployer,
  );

  const deployment = await contractFactory.deploy(
    BAND_STD_REFERENCE_ADDRESSES[TARGET_NETWORK],
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
    BAND_STD_REFERENCE_ADDRESSES[TARGET_NETWORK],
    BASE_SYMBOL,
    QUOTE_SYMBOL,
  );
};

export default func;
