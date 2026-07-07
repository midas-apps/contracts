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

    const dstChainSelector = ccipNetworkConfig[destination]?.chainSelector;
    if (!dstChainSelector) {
      throw new Error(`Chain selector not found for network ${destination}`);
    }

    console.log('configBase', configBase);

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
      chainsToRemove: [],
      chainsToUpdate: [],
    };

    callDataPerNetwork[source].chainsToUpdate.push(updateObj);
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
