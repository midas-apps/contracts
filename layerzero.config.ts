import { ExecutorOptionType } from '@layerzerolabs/lz-v2-utilities';
import {
  TwoWayConfig,
  generateConnectionsConfig,
} from '@layerzerolabs/metadata-tools';
import { OAppEnforcedOption } from '@layerzerolabs/toolbox-hardhat';
import type { OmniPointHardhat } from '@layerzerolabs/toolbox-hardhat';
import hre from 'hardhat';

import {
  isTestnetNetwork,
  layerZeroEids,
  MTokenName,
  Network,
  PartialConfigPerNetwork,
} from './config';
import { midasAddressesPerNetwork } from './config/constants/addresses';

type ConfigPerNetwork = Partial<
  Record<
    MTokenName,
    {
      receiverNetworks: Network[];
    }
  >
>;

export const lzConfigsPerToken: PartialConfigPerNetwork<ConfigPerNetwork> = {
  sepolia: {
    mTBILL: {
      receiverNetworks: ['arbitrumSepolia'],
    },
  },
};

// To connect all the above chains to each other, we need the following pathways:
// Base <-> Arbitrum

// For this example's simplicity, we will use the same enforced options values for sending to all chains
// For production, you should ensure `gas` is set to the correct value through profiling the gas usage of calling OFT._lzReceive(...) on the destination chain
// To learn more, read https://docs.layerzero.network/v2/concepts/applications/oapp-standard#execution-options-and-enforced-settings
const EVM_ENFORCED_OPTIONS: OAppEnforcedOption[] = [
  {
    msgType: 1,
    optionType: ExecutorOptionType.LZ_RECEIVE,
    gas: 100000,
    value: 0,
  },
];

export default async function () {
  const pathways: TwoWayConfig[] = [];

  const network = hre.network.name as Network;

  const networkConfig = lzConfigsPerToken[network];

  if (!networkConfig) {
    throw new Error(`Network config not found for network: ${network}`);
  }

  const uniqueContracts: OmniPointHardhat[] = [];

  for (const mTokenKey in networkConfig) {
    const mToken = mTokenKey as MTokenName;
    const mTokenConfig = networkConfig[mToken]!;
    const allNetworks = [...mTokenConfig.receiverNetworks, network];

    allNetworks.forEach((network) => {
      const adapter =
        midasAddressesPerNetwork[network]![mToken]?.layerZero?.mintBurnAdapter;

      if (!adapter) {
        throw new Error(
          `Mint burn adapter not found for mToken: ${mToken} on ${network}`,
        );
      }
      uniqueContracts.push({
        eid: layerZeroEids[network]!,
        address: adapter,
      });
    });

    for (const networkA of allNetworks) {
      for (const networkB of allNetworks) {
        if (networkA === networkB) {
          continue;
        }

        const networkAAddresses = midasAddressesPerNetwork[networkA]!;
        const networkBAddresses = midasAddressesPerNetwork[networkB]!;

        const mTokenAdapterNetworkA =
          networkAAddresses[mToken]?.layerZero?.mintBurnAdapter;

        const mTokenAdapterNetworkB =
          networkBAddresses[mToken]?.layerZero?.mintBurnAdapter;

        if (!mTokenAdapterNetworkA || !mTokenAdapterNetworkB) {
          throw new Error(
            `Mint burn adapter not found for mToken: ${mToken} on ${networkA} or ${networkB}`,
          );
        }

        pathways.push([
          {
            eid: layerZeroEids[networkA]!,
            address: mTokenAdapterNetworkA,
          }, // Chain A contract
          {
            eid: layerZeroEids[networkB]!,
            address: mTokenAdapterNetworkB,
          }, // Chain B contract
          [
            isTestnetNetwork(networkA) || isTestnetNetwork(networkB)
              ? ['LayerZero Labs']
              : ['LayerZero Labs', 'Deutsche Telekom', 'Canary'],
            [],
          ], // [ requiredDVN[], [ optionalDVN[], threshold ] ]
          [2, 2], // [A to B confirmations, B to A confirmations] FIXME:
          [EVM_ENFORCED_OPTIONS, EVM_ENFORCED_OPTIONS], // Chain B enforcedOptions, Chain A enforcedOptions
        ]);
      }
    }
  }

  const uniquePathways: TwoWayConfig[] = [];

  for (const pathway of pathways) {
    if (
      !uniquePathways.find(
        (p) =>
          (p[0].eid === pathway[0].eid && p[1].eid === pathway[1].eid) ||
          (p[0].eid === pathway[1].eid && p[1].eid === pathway[0].eid),
      )
    ) {
      uniquePathways.push(pathway);
    }
  }

  // Generate the connections config based on the pathways
  const connections = await generateConnectionsConfig(uniquePathways);

  console.log('connections', connections, uniqueContracts);
  return {
    contracts: uniqueContracts.map((v) => ({ contract: v })),
    connections,
  };
}
