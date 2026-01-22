import { ExecutorOptionType } from '@layerzerolabs/lz-v2-utilities';
import {
  TwoWayConfig,
  generateConnectionsConfig,
} from '@layerzerolabs/metadata-tools';
import { OAppEnforcedOption } from '@layerzerolabs/toolbox-hardhat';
import type { OmniPointHardhat } from '@layerzerolabs/toolbox-hardhat';
import { HardhatRuntimeEnvironment } from 'hardhat/types';

import {
  blockFinality,
  isTestnetNetwork,
  layerZeroEids,
  MTokenName,
  Network,
  PartialConfigPerNetwork,
  PaymentTokenName,
} from '..';
import { getMTokenOrPaymentTokenOrThrow } from '../../helpers/utils';
import { midasAddressesPerNetwork } from '../constants/addresses';

type ConfigPerNetwork<TKey extends string> = Partial<
  Record<
    TKey,
    {
      /**
       * @default 'all'
       */
      pathways?: 'direct-only' | 'all';
      linkedNetworks: Network[];
    }
  >
>;

export const lzConfigsPerMToken: PartialConfigPerNetwork<
  ConfigPerNetwork<MTokenName>
> = {
  sepolia: {
    mTBILL: {
      linkedNetworks: ['arbitrumSepolia'],
    },
  },
  hyperevm: {
    obeatUSD: {
      linkedNetworks: ['main'],
    },
    liquidHYPE: {
      linkedNetworks: ['scroll'],
    },
  },
  main: {
    mHYPER: {
      pathways: 'direct-only',
      linkedNetworks: ['monad'],
    },
  },
};

export const lzConfigsPerPaymentToken: PartialConfigPerNetwork<
  ConfigPerNetwork<PaymentTokenName>
> = {
  sepolia: {
    usdt: {
      linkedNetworks: ['arbitrumSepolia'],
    },
  },
};

const EVM_ENFORCED_OPTIONS: OAppEnforcedOption[] = [
  {
    msgType: 1,
    optionType: ExecutorOptionType.LZ_RECEIVE,
    gas: 160_000,
    value: 0,
  },
  {
    msgType: 2,
    optionType: ExecutorOptionType.LZ_RECEIVE,
    gas: 160_000,
    value: 0,
  },
  {
    msgType: 2,
    optionType: ExecutorOptionType.COMPOSE,
    index: 0,
    gas: 600_000,
    value: 0,
  },
];

const enforceOptionsAdditionalGas: PartialConfigPerNetwork<number> = {
  monad: 100_000,
};

const getLzConfigPerNetwork = (hre: HardhatRuntimeEnvironment) => {
  const { mToken, paymentToken } = getMTokenOrPaymentTokenOrThrow(hre);

  return mToken
    ? lzConfigsPerMToken?.[hre.network.name as Network]?.[mToken]
    : lzConfigsPerPaymentToken?.[hre.network.name as Network]?.[paymentToken];
};

const getAdapterAddress = (
  hre: HardhatRuntimeEnvironment,
  network: Network,
) => {
  const { mToken, paymentToken } = getMTokenOrPaymentTokenOrThrow(hre);

  const networkAddresses = midasAddressesPerNetwork[network];

  if (!networkAddresses) {
    throw new Error(`Network addresses not found for network: ${network}`);
  }

  return mToken
    ? networkAddresses[mToken]?.layerZero?.oft
    : networkAddresses?.paymentTokens?.[paymentToken!]?.layerZero?.oft;
};

const getEnforcedOptionsForNetwork = (network: Network) => {
  const additionalGas = enforceOptionsAdditionalGas[network] ?? 0;
  return EVM_ENFORCED_OPTIONS.map((v) => {
    if ('gas' in v) {
      return {
        ...v,
        gas: BigInt(v.gas) + BigInt(additionalGas),
      };
    }
    return v;
  });
};

export default async function () {
  const pathways: TwoWayConfig[] = [];

  const hre = await import('hardhat');

  const network = hre.network.name as Network;

  const uniqueContracts: OmniPointHardhat[] = [];

  const tokenConfig = getLzConfigPerNetwork(hre);

  if (!tokenConfig) {
    throw new Error(`Token config not found`);
  }

  const allNetworks = [...tokenConfig.linkedNetworks, network];

  allNetworks.forEach((network) => {
    const adapter = getAdapterAddress(hre, network);

    if (!adapter) {
      throw new Error(`Mint burn adapter not found for token on ${network}`);
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

      // for 'direct-only' pathways we only create pathways between main network and linked networks
      // for 'all' pathways we also create pathways between linked networks as well
      if (
        tokenConfig.pathways === 'direct-only' &&
        networkA !== network &&
        networkB !== network
      ) {
        continue;
      }

      const mTokenAdapterNetworkA = getAdapterAddress(hre, networkA);

      const mTokenAdapterNetworkB = getAdapterAddress(hre, networkB);

      if (!mTokenAdapterNetworkA || !mTokenAdapterNetworkB) {
        throw new Error(
          `Mint burn adapter not found for token on ${networkA} or ${networkB}`,
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
        [blockFinality[networkA] ?? 32, blockFinality[networkB] ?? 32], // [A to B confirmations, B to A confirmations]
        [
          getEnforcedOptionsForNetwork(networkB),
          getEnforcedOptionsForNetwork(networkA),
        ],
      ]);
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

  return {
    contracts: uniqueContracts.map((v) => ({ contract: v })),
    connections,
  };
}
