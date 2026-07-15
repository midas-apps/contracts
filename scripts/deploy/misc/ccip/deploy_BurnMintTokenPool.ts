import { HardhatRuntimeEnvironment } from 'hardhat/types';

import {
  ccipNetworkConfig,
  ccipConfigPerMToken,
  Network,
} from '../../../../config';
import { getCurrentAddresses } from '../../../../config/constants/addresses';
import {
  etherscanVerify,
  getOriginalNetwork,
  getMTokenOrThrow,
  logDeploy,
} from '../../../../helpers/utils';
import { DeployFunction } from '../../common/types';
import { getDeployer, getNetworkConfig } from '../../common/utils';

const func: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  const deployer = await getDeployer(hre);
  const mToken = getMTokenOrThrow(hre);

  const currentNetwork = hre.network.name as Network;
  const originalNetwork =
    getOriginalNetwork(hre) ?? (hre.network.name as Network);

  const addresses = getCurrentAddresses(hre);

  const config = getNetworkConfig(hre, mToken, 'postDeploy');

  const mTokenAddresses = addresses?.[mToken];

  if (!mTokenAddresses || !mTokenAddresses.token) {
    throw new Error('mToken addresses not found or missing required fields');
  }

  const factory = await hre.ethers.getContractFactory(
    'MidasCCTBurnMintTokenPool',
    deployer,
  );

  const ccipConfig = ccipNetworkConfig?.[currentNetwork];

  if (!ccipConfig) {
    throw new Error('CCIP config not found');
  }

  const rateLimitConfigDefault = config.ccip?.rateLimitConfig?.default;
  const rateLimitConfigOverrides = config.ccip?.rateLimitConfig?.overrides;
  const fallbackReceiver = config.ccip?.fallbackReceiver;

  if (!fallbackReceiver) {
    throw new Error('CCIP fallbackReceiver is not found');
  }

  const allReceiverNetworks =
    ccipConfigPerMToken?.[originalNetwork]?.[mToken]?.linkedNetworks;

  if (!allReceiverNetworks || allReceiverNetworks.length === 0) {
    throw new Error('Receiver networks not found');
  }

  const networksToRateLimit = [...allReceiverNetworks, originalNetwork].filter(
    (network) => network !== hre.network.name,
  );

  const rateLimitConfigs = networksToRateLimit.map((network) => {
    const configBase =
      rateLimitConfigOverrides?.[network] ?? rateLimitConfigDefault;
    if (!configBase) {
      throw new Error(`Rate limit config not found for network ${network}`);
    }
    return {
      ...configBase,
    };
  });

  console.log('rateLimitConfigs', rateLimitConfigs);

  const args = [
    mTokenAddresses.token,
    ccipConfig.rmnProxy,
    ccipConfig.router,
    fallbackReceiver,
  ] as readonly [string, string, string, string];

  const contract = await factory.deploy(...args);

  logDeploy('MidasCCTBurnMintTokenPool', undefined, contract.address);

  console.log('Waiting for deployment to be confirmed...');
  await contract.deployTransaction.wait(3);
  console.log('Verifying contract...');
  await etherscanVerify(hre, contract.address, ...args);
};

export default func;
