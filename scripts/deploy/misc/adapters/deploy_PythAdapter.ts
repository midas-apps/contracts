import { HardhatRuntimeEnvironment } from 'hardhat/types';

import { getCurrentAddresses } from '../../../../config/constants/addresses';
import { PYTH_CONFIGS } from '../../../../test/integration/fixtures/pyth.fixture';
import { DeployFunction } from '../../common/types';
import { getDeployer } from '../../common/utils';

const func: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  const addresses = getCurrentAddresses(hre);
  const deployer = await getDeployer(hre);

  console.log('Deploying Pyth adapter...', { addresses });

  if (!addresses?.accessControl)
    throw new Error('Access control address is not set');

  const fac = await hre.ethers.getContractFactory(
    'PythChainlinkAdapter',
    deployer,
  );

  const tx = await fac.deploy(
    PYTH_CONFIGS.hyperevm.pythContract,
    PYTH_CONFIGS.hyperevm.usdhlUsdPriceId,
  );

  console.log('Deployed Pyth adapter:', tx.address);
};

export default func;
