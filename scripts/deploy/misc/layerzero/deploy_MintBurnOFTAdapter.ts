import { HardhatRuntimeEnvironment } from 'hardhat/types';

import { layerZeroEids, Network } from '../../../../config';
import { getCurrentAddresses } from '../../../../config/constants/addresses';
import { lzConfigsPerMToken } from '../../../../config/misc';
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

  const originalNetwork =
    getOriginalNetwork(hre) ?? (hre.network.name as Network);

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

  if (!rateLimitConfigDefault) {
    throw new Error('Rate limit config default not found');
  }

  const allReceiverNetworks =
    lzConfigsPerMToken?.[originalNetwork]?.[mToken]?.linkedNetworks;

  if (!allReceiverNetworks || allReceiverNetworks.length === 0) {
    throw new Error('Receiver networks not found');
  }

  const networksToRateLimit = [...allReceiverNetworks, originalNetwork].filter(
    (network) => network !== hre.network.name,
  );

  const rateLimitConfigs = networksToRateLimit.map((network) => {
    const configBase =
      rateLimitConfigOverrides?.[network] ?? rateLimitConfigDefault;
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
