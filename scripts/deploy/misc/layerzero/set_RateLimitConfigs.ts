import { HardhatRuntimeEnvironment } from 'hardhat/types';

import { layerZeroEids, Network } from '../../../../config';
import { getCurrentAddresses } from '../../../../config/constants/addresses';
import { lzConfigsPerMToken } from '../../../../config/misc';
import {
  getOriginalNetwork,
  getMTokenOrThrow,
} from '../../../../helpers/utils';
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

  if (!rateLimitConfigDefault) {
    throw new Error('Rate limit config default not found');
  }

  const lzConfig = lzConfigsPerMToken?.[originalNetwork]?.[mToken];

  if (!lzConfig) {
    throw new Error(
      'LayerZero config not found or `--original-network` is not correct',
    );
  }

  const currentNetwork = hre.network.name as Network;
  const isDirectOnly = lzConfig.pathways === 'direct-only';
  const linkedNetworks = lzConfig.linkedNetworks ?? [];

  // For 'direct-only' pathways:
  // - If on original network: can send to all linked networks
  // - If on linked network: can only send to original network (not other linked networks)
  // For 'all' pathways (default): can send to all linked networks + original network
  const networksToRateLimit = isDirectOnly
    ? currentNetwork === originalNetwork
      ? linkedNetworks // on main: can send to monad, katana
      : [originalNetwork] // on katana/monad: can only send to main
    : [...linkedNetworks, originalNetwork].filter(
        (network) => network !== currentNetwork,
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
