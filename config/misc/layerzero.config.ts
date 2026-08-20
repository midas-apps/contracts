import { ExecutorOptionType } from '@layerzerolabs/lz-v2-utilities';
import {
  TwoWayConfig,
  generateConnectionsConfig,
} from '@layerzerolabs/metadata-tools';
import { OAppEnforcedOption } from '@layerzerolabs/toolbox-hardhat';
import type { OmniPointHardhat } from '@layerzerolabs/toolbox-hardhat';
import { HardhatRuntimeEnvironment } from 'hardhat/types';

import {
  layerZeroBlockFinality,
  isTestnetNetwork,
  layerZeroEids,
  MTokenName,
  Network,
  PartialConfigPerNetwork,
  PaymentTokenName,
} from '..';
import { getMTokenOrPaymentTokenOrThrow } from '../../helpers/utils';
import { midasAddressesPerNetwork } from '../constants/addresses';

export enum DVN {
  LayerZeroLabs = 'LayerZero Labs',
  DeutscheTelekom = 'Deutsche Telekom',
  Canary = 'Canary',
  BCWGroup = 'BCW Group',
  Nethermind = 'Nethermind',
  BitGo = 'BitGo',
  P2P = 'P2P',
}

type PathwayDVNConfig = {
  /** Override required DVNs for a direct pathway to a linked network. */
  dvnsByLinkedNetwork?: Partial<Record<Network, DVN[]>>;
  dvns?: DVN[];
  excludedDVNs?: DVN[];
};

type ConfigPerNetwork<TKey extends string> = Partial<
  Record<
    TKey,
    PathwayDVNConfig & {
      /**
       * @default 'all'
       */
      pathways?: 'direct-only' | 'all';
      linkedNetworks: Network[];
    }
  >
>;

const defaultDVNs = [
  DVN.LayerZeroLabs,
  DVN.DeutscheTelekom,
  DVN.Canary,
  DVN.Nethermind,
];

export const getRateLimitNetworks = (
  currentNetwork: Network,
  originalNetwork: Network,
  linkedNetworks: Network[],
  pathways?: 'direct-only' | 'all',
): Network[] => {
  if (pathways === 'direct-only') {
    return currentNetwork === originalNetwork
      ? linkedNetworks
      : [originalNetwork];
  }

  return [...linkedNetworks, originalNetwork].filter(
    (network) => network !== currentNetwork,
  );
};

export const getPathwayDVNs = (
  config: PathwayDVNConfig,
  originalNetwork: Network,
  networkA: Network,
  networkB: Network,
): DVN[] => {
  const linkedNetwork =
    networkA === originalNetwork
      ? networkB
      : networkB === originalNetwork
      ? networkA
      : undefined;
  const dvns =
    (linkedNetwork && config.dvnsByLinkedNetwork?.[linkedNetwork]) ??
    config.dvns ??
    defaultDVNs;

  return dvns.filter((dvn) => !config.excludedDVNs?.includes(dvn));
};

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
    mGLO: {
      // Mainnet <-> Base, Robinhood and Optimism only.
      pathways: 'direct-only',
      linkedNetworks: ['base', 'robinhood', 'optimism'],
      dvnsByLinkedNetwork: {
        robinhood: [DVN.LayerZeroLabs, DVN.P2P, DVN.Canary, DVN.Nethermind],
      },
    },
    mHYPER: {
      pathways: 'direct-only',
      linkedNetworks: ['monad', 'katana', 'plasma'],
    },
    mHyperBTC: {
      pathways: 'direct-only',
      linkedNetworks: ['monad'],
    },
    bondUSD: {
      linkedNetworks: ['zerog'],
    },
    bondETH: {
      linkedNetworks: ['zerog'],
    },
    bondBTC: {
      linkedNetworks: ['zerog'],
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

/**
 * Pathways that are being decommissioned. The outer key is the network the
 * product is retired on. NEVER consumed by the wire task - only by
 * scripts/deploy/misc/layerzero/deprecate_Ofts.ts, which revokes the OFT
 * adapters' mint/burn roles and zeroes out the peers on every network of the
 * pathway. Remove entries once the on-chain deprecation is fully executed.
 */
export const deprecatedLzConfigsPerMToken: PartialConfigPerNetwork<
  ConfigPerNetwork<MTokenName>
> = {
  scroll: {
    weEUR: {
      linkedNetworks: ['optimism'],
    },
    liquidRESERVE: {
      linkedNetworks: ['optimism'],
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

      const dvnsWoExcluded = getPathwayDVNs(
        tokenConfig,
        network,
        networkA,
        networkB,
      );

      console.log('dvnsWoExcluded', dvnsWoExcluded);

      if (
        !layerZeroBlockFinality[networkA] ||
        !layerZeroBlockFinality[networkB]
      ) {
        throw new Error(
          `Block finality not found for network ${networkA} or ${networkB}`,
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
            ? [DVN.LayerZeroLabs]
            : dvnsWoExcluded,
          [],
        ], // [ requiredDVN[], [ optionalDVN[], threshold ] ]
        [layerZeroBlockFinality[networkA], layerZeroBlockFinality[networkB]], // [A to B confirmations, B to A confirmations]
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
