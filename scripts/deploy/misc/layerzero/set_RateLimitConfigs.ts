import { constants } from 'ethers';
import { HardhatRuntimeEnvironment } from 'hardhat/types';

import { layerZeroEids, Network } from '../../../../config';
import { getCurrentAddresses } from '../../../../config/constants/addresses';
import {
  etherscanVerify,
  getOriginalNetwork,
  getMTokenOrThrow,
  logDeploy,
} from '../../../../helpers/utils';
import { lzConfigsPerToken } from '../../../../layerzero.config';
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

  let rateLimitConfigDefault = config.layerZero.rateLimitConfig?.default;
  const rateLimitConfigOverrides = config.layerZero.rateLimitConfig?.overrides;

  if (!rateLimitConfigDefault) {
    console.log(
      'Infinite rate limit config will be used as no default config was provided',
    );
    rateLimitConfigDefault = {
      limit: constants.MaxUint256,
      window: 0,
    };
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

  // TODO: send it trough safe
  const tx = await contract.setRateLimits(rateLimitConfigs);

  logDeploy('MidasLzMintBurnOFTAdapter tx', undefined, tx.hash);

  console.log('Waiting for tx to be confirmed...');
  await tx.wait(3);
};

export default func;
