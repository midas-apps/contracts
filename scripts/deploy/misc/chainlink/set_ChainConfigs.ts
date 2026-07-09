import { BigNumber, BigNumberish, ethers } from 'ethers';
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
import {
  getDeployer,
  getNetworkConfig,
  sendAndWaitForCustomTxSign,
} from '../../common/utils';

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

const encodeAddress = (address: string) => {
  return ethers.utils.defaultAbiCoder.encode(['address'], [address]);
};

const func: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
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
    const deployer = await getDeployer(srcHre);

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

    const contract = await srcHre.ethers.getContractAt(
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
      remotePoolAddresses: [
        encodeAddress(dstMTokenAddresses.ccip.cct.tokenPool),
      ],
      remoteTokenAddress: encodeAddress(dstMTokenAddresses.token),
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
          !callDataPerNetwork[source].chainsToRemove.find((v) =>
            dstChainSelector.eq(v),
          )
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
      !callDataPerNetwork[source].uniqueDestinationChains.find((v) =>
        dstChainSelector.eq(v),
      )
    ) {
      callDataPerNetwork[source].uniqueDestinationChains.push(dstChainSelector);
    }
  }

  for (const data of Object.values(callDataPerNetwork)) {
    for (const supportedChain of data.supportedChains) {
      if (
        !data.uniqueDestinationChains.find((v) =>
          BigNumber.from(v).eq(supportedChain),
        )
      ) {
        data.chainsToRemove.push(supportedChain);
      }
    }
  }

  console.log('callDataPerNetwork', callDataPerNetwork);

  for (const [source, data] of Object.entries(callDataPerNetwork)) {
    const srcNetwork = source as Network;
    const srcHre = await getHreByNetworkName(srcNetwork);
    const addresses = getCurrentAddresses(srcHre);
    const mTokenAddresses = addresses?.[mToken];
    const srcDeployer = await getDeployer(srcHre);

    if (!data.chainsToRemove.length && !data.chainsToUpdate.length) {
      console.log(
        `No chains to remove or update for ${srcNetwork}, skipping...`,
      );
      continue;
    }

    const contract = await srcHre.ethers.getContractAt(
      'MidasCCTBurnMintTokenPool',
      mTokenAddresses?.ccip?.cct?.tokenPool ?? '',
      srcDeployer,
    );

    await sendAndWaitForCustomTxSign(
      srcHre,
      await contract.populateTransaction.applyChainUpdates(
        data.chainsToRemove,
        data.chainsToUpdate,
      ),
      {
        action: 'update-cct',
        mToken: mToken,
        comment: `set initial CCIP CCT token configs for ${mToken}`,
      },
    );
  }

  console.log('Txs submitted');
};

export default func;
