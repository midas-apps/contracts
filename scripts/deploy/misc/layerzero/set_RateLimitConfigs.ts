import { HardhatRuntimeEnvironment } from 'hardhat/types';

import { layerZeroEids, Network } from '../../../../config';
import { getCurrentAddresses } from '../../../../config/constants/addresses';
import { lzConfigsPerMToken } from '../../../../config/misc';
import {
  getOriginalNetwork,
  getMTokenOrThrow,
} from '../../../../helpers/utils';
import { RateLimiter } from '../../../../typechain-types';
import { DeployFunction } from '../../common/types';
import {
  getDeployer,
  getNetworkConfig,
  sendAndWaitForCustomTxSign,
} from '../../common/utils';

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

  if (
    !mTokenAddresses ||
    !mTokenAddresses.token ||
    !mTokenAddresses.layerZero?.oft
  ) {
    throw new Error('mToken addresses not found or missing required fields');
  }

  const contract = await hre.ethers.getContractAt(
    'MidasLzMintBurnOFTAdapter',
    mTokenAddresses.layerZero.oft,
    deployer,
  );

  const rateLimitConfigDefault = config.layerZero.rateLimitConfig?.default;
  const rateLimitConfigOverrides = config.layerZero.rateLimitConfig?.overrides;

  const lzConfig = lzConfigsPerMToken?.[originalNetwork]?.[mToken];

  if (!lzConfig) {
    throw new Error(
      'LayerZero config not found or `--original-network` is not correct',
    );
  }

  const currentNetwork = hre.network.name as Network;
  const isDirectOnly = lzConfig.pathways === 'direct-only';
  const linkedNetworks = lzConfig.linkedNetworks ?? [];

  let networksToRateLimit: Network[];
  if (isDirectOnly) {
    if (currentNetwork === originalNetwork) {
      // on original network: can send to all linked networks
      networksToRateLimit = linkedNetworks;
    } else {
      // on linked network: can only send back to the original network
      networksToRateLimit = [originalNetwork];
    }
  } else {
    // For 'all' pathways (default): can send to all linked networks + original network
    networksToRateLimit = [...linkedNetworks, originalNetwork].filter(
      (network) => network !== currentNetwork,
    );
  }

  const rateLimitConfigs: RateLimiter.RateLimitConfigStruct[] = [];

  for (const network of networksToRateLimit) {
    const configBase =
      rateLimitConfigOverrides?.[network] ?? rateLimitConfigDefault;

    if (!configBase) {
      throw new Error(`Rate limit config not found for network ${network}`);
    }
    const dstEid = layerZeroEids[network]!;
    const currentRateLimitConfigs = await contract.getRateLimit(dstEid);

    if (
      !currentRateLimitConfigs.limit.eq(await configBase.limit) ||
      !currentRateLimitConfigs.window.eq(await configBase.window)
    ) {
      rateLimitConfigs.push({
        dstEid,
        limit: configBase.limit,
        window: configBase.window,
      });
    } else {
      console.log(`Rate limit config for network ${network} is up to date`);
      continue;
    }
  }

  if (rateLimitConfigs.length === 0) {
    console.log('No rate limit configs to set, everything is up to date');
    return;
  }

  console.log('rateLimitConfigs', rateLimitConfigs);

  const tx = await sendAndWaitForCustomTxSign(
    hre,
    await contract.populateTransaction.setRateLimits(rateLimitConfigs),
    {
      action: 'update-lz',
      subAction: 'set-lz-rate-limit-configs',
    },
    await contract.owner(),
  );

  console.log('Tx is submitted', tx);
};

export default func;
