import { HardhatRuntimeEnvironment } from 'hardhat/types';

import { getCurrentAddresses } from '../../../../config/constants/addresses';
import { DeployFunction } from '../../common/types';
import { getDeployer } from '../../common/utils';

const func: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  const addresses = getCurrentAddresses(hre);
  const deployer = await getDeployer(hre);

  console.log('Deploying BandProtocolAdapter for mXRP...', {
    network: hre.network.name,
    mXRPAddresses: addresses?.mXRP,
  });

  if (!addresses?.mXRP?.dataFeed) {
    throw new Error('mXRP dataFeed address is not set');
  }

  const factory = await hre.ethers.getContractFactory(
    'BandProtocolAdapter',
    deployer,
  );

  // Deploy the adapter with mXRP dataFeed
  const adapter = await factory.deploy(
    addresses.mXRP.dataFeed, // dataFeed address
    'mXRP', // base symbol
    'XRP', // quote symbol
  );

  await adapter.deployed();

  console.log('Deployed BandProtocolAdapter:', {
    address: adapter.address,
    dataFeed: addresses.mXRP.dataFeed,
    baseSymbol: 'mXRP',
    quoteSymbol: 'XRP',
  });
};

export default func;
