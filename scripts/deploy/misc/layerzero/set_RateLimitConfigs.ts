import { HardhatRuntimeEnvironment } from 'hardhat/types';

import { layerZeroEids, Network } from '../../../../config';
import { getCurrentAddresses } from '../../../../config/constants/addresses';
import {
  getOriginalNetwork,
  getMTokenOrThrow,
  logDeploy,
} from '../../../../helpers/utils';
import { lzConfigsPerToken } from '../../../../layerzero.config';
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
    !mTokenAddresses.layerZero?.minterBurner
  ) {
    throw new Error('mToken addresses not found or missing required fields');
  }

  const contract = await hre.ethers.getContractAt(
    'MidasLzMintBurnOFTAdapter',
    mTokenAddresses.layerZero.minterBurner,
    deployer,
  );

  const rateLimitConfigDefault = config.layerZero.rateLimitConfig?.default;
  const rateLimitConfigOverrides = config.layerZero.rateLimitConfig?.overrides;

  if (!rateLimitConfigDefault) {
    throw new Error('Rate limit config default not found');
  }

  const allReceiverNetworks =
    lzConfigsPerToken?.[originalNetwork]?.[mToken]?.receiverNetworks ?? [];

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
