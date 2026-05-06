import { HardhatRuntimeEnvironment } from 'hardhat/types';

import { getCurrentAddresses } from '../../../../config/constants/addresses';
import { DeployFunction } from '../../common/types';
import { getDeployer } from '../../common/utils';

const func: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  const addresses = getCurrentAddresses(hre);
  const deployer = await getDeployer(hre);

  console.log('Deploying stork adapter...', { addresses });

  if (!addresses?.accessControl)
    throw new Error('Access control address is not set');

  const fac = await hre.ethers.getContractFactory(
    'StorkChainlinkAdapter',
    deployer,
  );

  const tx = await fac.deploy(
    // replace with the actual address
    '0xacC0a0cF13571d30B4b8637996F5D6D774d4fd62',
    // replace with the actual id
    '0xe78fbac639b951bb7d4d8a6a7e4e3be7be423f4056b225ec071544c48dc303ef',
  );

  console.log('Deployed stork adapter:', tx.address);
};

export default func;
