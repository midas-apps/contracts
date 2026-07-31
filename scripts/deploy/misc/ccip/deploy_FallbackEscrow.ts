import { HardhatRuntimeEnvironment } from 'hardhat/types';

import { ccipNetworkConfig, Network } from '../../../../config';
import { getCurrentAddresses } from '../../../../config/constants/addresses';
import { getMTokenOrThrow } from '../../../../helpers/utils';
import { DeployFunction } from '../../common/types';
import {
  deployAndVerifyProxy,
  getDeployer,
  getNetworkConfig,
} from '../../common/utils';

const func: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  const deployer = await getDeployer(hre);
  const mToken = getMTokenOrThrow(hre);

  const currentNetwork = hre.network.name as Network;

  const addresses = getCurrentAddresses(hre);

  const config = getNetworkConfig(hre, mToken, 'postDeploy');

  const mTokenAddresses = addresses?.[mToken];

  if (!mTokenAddresses || !mTokenAddresses.token) {
    throw new Error('mToken addresses not found or missing required fields');
  }

  const tokenPool = mTokenAddresses.ccip?.tokenPool;

  if (!tokenPool) {
    throw new Error('Token pool addresses not found');
  }

  const ccipConfig = ccipNetworkConfig?.[currentNetwork];

  if (!ccipConfig) {
    throw new Error('CCIP config not found');
  }

  const defaultReceiver = config.ccip?.defaultReceiver;

  if (!defaultReceiver) {
    throw new Error('CCIP defaultReceiver is not found');
  }

  await deployAndVerifyProxy(
    hre,
    'MidasCCTFallbackEscrow',
    [addresses.accessControl, tokenPool, defaultReceiver],
    deployer,
  );
};

export default func;
