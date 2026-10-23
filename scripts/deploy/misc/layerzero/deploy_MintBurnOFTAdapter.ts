import { HardhatRuntimeEnvironment } from 'hardhat/types';

import { layerZeroEids, MTokenName, Network } from '../../../../config';
import { getCurrentAddresses } from '../../../../config/constants/addresses';
import {
  getRateLimitNetworks,
  lzConfigsPerMToken,
} from '../../../../config/misc';
import { etherscanVerify, logDeploy } from '../../../../helpers/utils';
import { DeployFunction } from '../../common/types';
import { getDeployer, getNetworkConfig } from '../../common/utils';

const func: DeployFunction = async (
  hre: HardhatRuntimeEnvironment,
  mToken: MTokenName,
  originalNetwork?: Network,
) => {
  const deployer = await getDeployer(hre);

  const resolvedOriginalNetwork =
    originalNetwork ?? (hre.network.name as Network);

  const addresses = getCurrentAddresses(hre);

  const config = getNetworkConfig(hre, mToken, 'postDeploy');

  if (!config.layerZero?.delegate) {
    throw new Error('Delegate not found');
  }

  const mTokenAddresses = addresses?.[mToken];

  if (!mTokenAddresses || !mTokenAddresses.token) {
    throw new Error('mToken addresses not found or missing required fields');
  }

  const factory = await hre.ethers.getContractFactory(
    'MidasLzMintBurnOFTAdapter',
    deployer,
  );

  const endpointV2Deployment = await hre.deployments.get('EndpointV2');

  const rateLimitConfigDefault = config.layerZero.rateLimitConfig?.default;
  const rateLimitConfigOverrides = config.layerZero.rateLimitConfig?.overrides;

  const lzConfig = lzConfigsPerMToken?.[resolvedOriginalNetwork]?.[mToken];

  if (!lzConfig) {
    throw new Error(
      'LayerZero config not found or `--original-network` is not correct',
    );
  }

  const networksToRateLimit = getRateLimitNetworks(
    hre.network.name as Network,
    resolvedOriginalNetwork,
    lzConfig.linkedNetworks,
    lzConfig.pathways,
  );

  const rateLimitConfigs = networksToRateLimit.map((network) => {
    const configBase =
      rateLimitConfigOverrides?.[network] ?? rateLimitConfigDefault;
    if (!configBase) {
      throw new Error(`Rate limit config not found for network ${network}`);
    }
    return {
      ...configBase,
      dstEid: layerZeroEids[network]!,
    };
  });

  console.log('rateLimitConfigs', rateLimitConfigs);

  const args = [
    mTokenAddresses.token,
    endpointV2Deployment.address,
    config.layerZero.delegate,
    rateLimitConfigs,
  ] as const;

  const contract = await factory.deploy(...args);

  logDeploy('MidasLzMintBurnOFTAdapter', undefined, contract.address);

  console.log('Waiting for deployment to be confirmed...');
  await contract.deployTransaction.wait(3);
  console.log('Verifying contract...');
  await etherscanVerify(hre, contract.address, ...args);
};

export default func;
