import { BigNumber, BigNumberish } from 'ethers';
import { HardhatRuntimeEnvironment } from 'hardhat/types';

import {
  ccipNetworkConfig,
  cctConfigPerMToken,
  Network,
  PartialConfigPerNetwork,
} from '../../../../config';
import { getCurrentAddresses } from '../../../../config/constants/addresses';
import { getHreByNetworkName } from '../../../../helpers/hardhat';
import { getMTokenOrThrow } from '../../../../helpers/utils';
import { CCTRateLimitConfigCore, DeployFunction } from '../../common/types';
import { getDeployer, getNetworkConfig } from '../../common/utils';

type UpdateChainConfig = {
  inboundRateLimiterConfig: {
    capacity: BigNumberish;
    rate: BigNumberish;
    isEnabled: boolean;
  };
  outboundRateLimiterConfig: {
    capacity: BigNumberish;
    rate: BigNumberish;
    isEnabled: boolean;
  };
  remoteChainSelector: BigNumberish;
  remotePoolAddresses: string[];
  remoteTokenAddress: string;
};

const cmpChainConfig = (a: UpdateChainConfig, b: UpdateChainConfig) => {
  return (
    BigNumber.from(a.inboundRateLimiterConfig.capacity).eq(
      b.inboundRateLimiterConfig.capacity,
    ) &&
    BigNumber.from(a.inboundRateLimiterConfig.rate).eq(
      b.inboundRateLimiterConfig.rate,
    ) &&
    a.inboundRateLimiterConfig.isEnabled ===
      b.inboundRateLimiterConfig.isEnabled &&
    BigNumber.from(a.outboundRateLimiterConfig.capacity).eq(
      b.outboundRateLimiterConfig.capacity,
    ) &&
    BigNumber.from(a.outboundRateLimiterConfig.rate).eq(
      b.outboundRateLimiterConfig.rate,
    ) &&
    a.outboundRateLimiterConfig.isEnabled ===
      b.outboundRateLimiterConfig.isEnabled &&
    BigNumber.from(a.remoteChainSelector).eq(b.remoteChainSelector) &&
    a.remotePoolAddresses.length === b.remotePoolAddresses.length &&
    a.remotePoolAddresses.every(
      (address, index) =>
        address.toLowerCase() === b.remotePoolAddresses[index].toLowerCase(),
    ) &&
    a.remoteTokenAddress.toLowerCase() === b.remoteTokenAddress.toLowerCase()
  );
};

const getRateLimitConfig = (config?: CCTRateLimitConfigCore) => {
  return config
    ? {
        capacity: config.capacity,
        rate: BigNumber.from(config.capacity).div(config.window),
        isEnabled: true,
      }
    : {
        capacity: 0,
        rate: 0,
        isEnabled: false,
      };
};

const func: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  const deployer = await getDeployer(hre);
  const mToken = getMTokenOrThrow(hre);

  const currentNetwork = hre.network.name as Network;

  const cctConfig = cctConfigPerMToken?.[currentNetwork]?.[mToken];

  if (!cctConfig) {
    throw new Error('CCT config not found');
  }

  const allCctNetworks = [...cctConfig.linkedNetworks, currentNetwork];

  const linkedNetworks = cctConfig.linkedNetworks ?? [];

  let networksPairs: { source: Network; destination: Network }[] = [];

  if (cctConfig.pathways === 'direct-only') {
    networksPairs = linkedNetworks.flatMap((network) => [
      {
        source: currentNetwork,
        destination: network,
      },
      {
        source: network,
        destination: currentNetwork,
      },
    ]);
  } else {
    allCctNetworks.forEach((networkA) => {
      allCctNetworks.forEach((networkB) => {
        if (
          networkA !== networkB &&
          !networksPairs.find(
            (pair) => pair.source === networkA && pair.destination === networkB,
          )
        ) {
          networksPairs.push({
            source: networkA,
            destination: networkB,
          });
        }
      });
    });
  }

  console.log('networksPairs', networksPairs);

  const callDataPerNetwork: PartialConfigPerNetwork<{
    uniqueDestinationChains: BigNumberish[];
    supportedChains: BigNumberish[];
    chainsToRemove: BigNumberish[];
    chainsToUpdate: UpdateChainConfig[];
  }> = {};

  for (const { source, destination } of networksPairs) {
    const srcHre = await getHreByNetworkName(source);
    const dstHre = await getHreByNetworkName(destination);
    const config = getNetworkConfig(srcHre, mToken, 'postDeploy');

    const configBase =
      config.cct?.rateLimitConfig?.overrides?.[destination] ??
      config.cct?.rateLimitConfig?.default;

    if (!configBase) {
      throw new Error(`Rate limit config not found for network ${source}`);
    }

    const addresses = getCurrentAddresses(srcHre);

    const mTokenAddresses = addresses?.[mToken];

    if (!mTokenAddresses?.ccip?.cct?.tokenPool) {
      throw new Error(`Token pool not found for network ${source}`);
    }

    const contract = await hre.ethers.getContractAt(
      'MidasCCTBurnMintTokenPool',
      mTokenAddresses?.ccip?.cct?.tokenPool ?? '',
      deployer,
    );

    const dstChainSelector = ccipNetworkConfig[destination]?.chainSelector;
    if (!dstChainSelector) {
      throw new Error(`Chain selector not found for network ${destination}`);
    }

    console.log('configBase', configBase);

    const supportedChains = await contract.getSupportedChains();

    const alreadyExists = !!supportedChains.find((chain) =>
      dstChainSelector.eq(chain),
    );

    const dstAddresses = getCurrentAddresses(dstHre);
    const dstMTokenAddresses = dstAddresses?.[mToken];

    if (!dstMTokenAddresses?.ccip?.cct?.tokenPool) {
      throw new Error(`Token pool not found for network ${destination}`);
    }

    if (!dstMTokenAddresses.token) {
      throw new Error(`Token not found for network ${destination}`);
    }

    const updateObj: UpdateChainConfig = {
      inboundRateLimiterConfig: getRateLimitConfig(configBase.inbound),
      outboundRateLimiterConfig: getRateLimitConfig(configBase.outbound),
      remoteChainSelector: dstChainSelector.toString(),
      remotePoolAddresses: [dstMTokenAddresses.ccip.cct.tokenPool],
      remoteTokenAddress: dstMTokenAddresses.token,
    };
    callDataPerNetwork[source] ??= {
      uniqueDestinationChains: [dstChainSelector],
      supportedChains: supportedChains,
      chainsToRemove: [],
      chainsToUpdate: [],
    };

    const dstTokenAddress = await contract.getRemoteToken(dstChainSelector);

    if (alreadyExists) {
      // validate current config
      const inboundConfig = await contract.getCurrentInboundRateLimiterState(
        dstChainSelector,
      );
      const outboundConfig = await contract.getCurrentOutboundRateLimiterState(
        dstChainSelector,
      );
      const remotePoolAddresses = await contract.getRemotePools(
        dstChainSelector,
      );
      const remoteTokenAddress = dstTokenAddress;
      const dstConfig: UpdateChainConfig = {
        remoteChainSelector: dstChainSelector,
        inboundRateLimiterConfig: inboundConfig,
        outboundRateLimiterConfig: outboundConfig,
        remotePoolAddresses: remotePoolAddresses,
        remoteTokenAddress: remoteTokenAddress,
      };

      if (!cmpChainConfig(updateObj, dstConfig)) {
        if (
          !callDataPerNetwork[source].chainsToRemove.includes(dstChainSelector)
        ) {
          callDataPerNetwork[source].chainsToRemove.push(dstChainSelector);
        }

        callDataPerNetwork[source].chainsToUpdate.push(updateObj);
      }
      // otherwise, we dont update that dst config at all as it is already up to date
    } else {
      callDataPerNetwork[source].chainsToUpdate.push(updateObj);
    }

    if (
      !callDataPerNetwork[source].uniqueDestinationChains.includes(
        dstChainSelector,
      )
    ) {
      callDataPerNetwork[source].uniqueDestinationChains.push(dstChainSelector);
    }
  }

  for (const data of Object.values(callDataPerNetwork)) {
    for (const supportedChain of data.supportedChains) {
      if (!data.uniqueDestinationChains.includes(supportedChain)) {
        data.chainsToRemove.push(supportedChain);
      }
    }
  }

  console.log('callDataPerNetwork', callDataPerNetwork);
  // contract.applyChainUpdates(
  //   [],
  //   [
  //     {
  //       inboundRateLimiterConfig: { capacity: 0, rate: 0, isEnabled: false },
  //       outboundRateLimiterConfig: { capacity: 0, rate: 0, isEnabled: false },
  //       remoteChainSelector: '',
  //       remotePoolAddresses: [],
  //       remoteTokenAddress: '',
  //     },
  //   ],
  // );

  // if (rateLimitConfigs.length === 0) {
  //   console.log('No rate limit configs to set, everything is up to date');
  //   return;
  // }

  // console.log('rateLimitConfigs', rateLimitConfigs);

  // const tx = await sendAndWaitForCustomTxSign(
  //   hre,
  //   await contract.populateTransaction.setRateLimits(rateLimitConfigs),
  //   {
  //     action: 'update-lz',
  //     subAction: 'set-lz-rate-limit-configs',
  //   },
  //   await contract.owner(),
  // );

  // console.log('Tx is submitted', tx);
};

export default func;
