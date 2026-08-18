import { HardhatRuntimeEnvironment } from 'hardhat/types';

import { MTokenName } from '../../../config';
import { getCurrentAddresses } from '../../../config/constants/addresses';
import { getChainOrThrow } from '../../../helpers/utils';
import { applyGreenlistConfig } from '../common/greenlist';
import { DeployFunction } from '../common/types';
import { getNetworkConfig } from '../common/utils';
import { getDeploymentTokenAddresses } from '../configs/deployment-profiles';

const func: DeployFunction = async (
  hre: HardhatRuntimeEnvironment,
  mToken: MTokenName,
) => {
  const { networkName } = getChainOrThrow(hre);
  const greenlistConfig = getNetworkConfig(
    hre,
    mToken,
    'postDeploy',
  )?.greenlist;

  if (!greenlistConfig) {
    console.log(`No greenlist config found for ${networkName} network`);
    return;
  }

  const addresses = getCurrentAddresses(hre)?.[mToken];
  if (!addresses) {
    console.log(`No addresses found for ${mToken} on ${networkName}`);
    return;
  }

  await applyGreenlistConfig(
    hre,
    mToken,
    greenlistConfig,
    getDeploymentTokenAddresses(addresses, mToken, hre.deploymentConfig),
  );
};

export default func;
