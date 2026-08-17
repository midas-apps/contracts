import { BigNumberish } from 'ethers';
import { HardhatRuntimeEnvironment } from 'hardhat/types';

import {
  buildHubRoutes,
  buildRateLimiterConfig,
  encodeEvmAddress,
  reconcileChainConfig,
} from './helpers';

import {
  ccipConfigPerMToken,
  ccipNetworkConfig,
  Network,
  PartialConfigPerNetwork,
} from '../../../../config';
import { getCurrentAddresses } from '../../../../config/constants/addresses';
import { getHreByNetworkName } from '../../../../helpers/hardhat';
import { getMTokenOrThrow } from '../../../../helpers/utils';
import { DeployFunction } from '../../common/types';
import {
  getDeployer,
  getNetworkConfig,
  sendAndWaitForCustomTxSign,
} from '../../common/utils';

type PoolChainConfig = {
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
  remoteChainSelector: string;
  remotePoolAddresses: string[];
  remoteTokenAddress: string;
};

const func: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  const mToken = getMTokenOrThrow(hre);
  const hub = hre.network.name as Network;
  const cctConfig = ccipConfigPerMToken[hub]?.[mToken];
  if (!cctConfig) throw new Error('CCT config not found');

  const routes = buildHubRoutes({
    hub,
    spokes: cctConfig.linkedNetworks,
    pathways: cctConfig.pathways,
  });
  const desiredPerNetwork: PartialConfigPerNetwork<PoolChainConfig[]> = {};

  for (const route of routes) {
    const source = route.source as Network;
    const destination = route.destination as Network;
    const sourceHre = await getHreByNetworkName(source);
    const destinationHre = await getHreByNetworkName(destination);
    const sourceConfig = getNetworkConfig(sourceHre, mToken, 'postDeploy');
    const rateLimits =
      sourceConfig.ccip?.rateLimitConfig?.overrides?.[destination] ??
      sourceConfig.ccip?.rateLimitConfig?.default;
    const destinationSelector = ccipNetworkConfig[destination]?.chainSelector;
    const destinationAddresses = getCurrentAddresses(destinationHre)[mToken];

    if (!destinationSelector) {
      throw new Error(`Chain selector not found for ${destination}`);
    }
    if (!destinationAddresses?.token || !destinationAddresses.ccip?.tokenPool) {
      throw new Error(`CCIP token/pool not found for ${destination}`);
    }

    desiredPerNetwork[source] ??= [];
    desiredPerNetwork[source].push({
      remoteChainSelector: destinationSelector.toString(),
      remotePoolAddresses: [
        encodeEvmAddress(destinationAddresses.ccip.tokenPool),
      ],
      remoteTokenAddress: encodeEvmAddress(destinationAddresses.token),
      inboundRateLimiterConfig: buildRateLimiterConfig(rateLimits?.inbound),
      outboundRateLimiterConfig: buildRateLimiterConfig(rateLimits?.outbound),
    });
  }

  for (const [sourceName, desired] of Object.entries(desiredPerNetwork)) {
    const source = sourceName as Network;
    const sourceHre = await getHreByNetworkName(source);
    const deployer = await getDeployer(sourceHre);
    const sourceAddresses = getCurrentAddresses(sourceHre)[mToken];
    if (!sourceAddresses?.ccip?.tokenPool) {
      throw new Error(`CCIP pool not found for ${source}`);
    }

    const pool = await sourceHre.ethers.getContractAt(
      'MidasCCTBurnMintTokenPool',
      sourceAddresses.ccip.tokenPool,
      deployer,
    );
    const supportedSelectors = await pool.getSupportedChains();
    const current: PoolChainConfig[] = await Promise.all(
      supportedSelectors.map(async (selector) => {
        const [outbound, inbound] = await pool.getCurrentRateLimiterState(
          selector,
          false,
        );
        return {
          remoteChainSelector: selector.toString(),
          remotePoolAddresses: await pool.getRemotePools(selector),
          remoteTokenAddress: await pool.getRemoteToken(selector),
          inboundRateLimiterConfig: {
            capacity: inbound.capacity.toString(),
            rate: inbound.rate.toString(),
            isEnabled: inbound.isEnabled,
          },
          outboundRateLimiterConfig: {
            capacity: outbound.capacity.toString(),
            rate: outbound.rate.toString(),
            isEnabled: outbound.isEnabled,
          },
        };
      }),
    );
    const update = reconcileChainConfig({ current, desired });
    if (
      update.chainsToRemove.length === 0 &&
      update.chainsToUpdate.length === 0
    ) {
      console.log(`CCIP pool config is already current on ${source}`);
      continue;
    }

    await sendAndWaitForCustomTxSign(
      sourceHre,
      await pool.populateTransaction.applyChainUpdates(
        update.chainsToRemove,
        update.chainsToUpdate,
      ),
      {
        action: 'update-ccip',
        mToken,
        comment: `reconcile ${mToken} CCIP V2 pool config on ${source}`,
      },
      await pool.owner(),
    );
  }
};

export default func;
