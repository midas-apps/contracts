import { EndpointId } from '@layerzerolabs/lz-definitions';
import { HardhatNetworkUserConfig, HttpNetworkUserConfig } from 'hardhat/types';

import { GWEI, MOCK_AGGREGATOR_NETWORK_TAG } from '../constants';
import { ENV } from '../env';
import {
  ConfigPerNetwork,
  Network,
  PartialConfigPerNetwork,
  RpcUrl,
} from '../types';

const {
  ALCHEMY_KEY,
  INFURA_KEY,
  CONDUIT_API_KEY,
  MNEMONIC_DEV,
  MNEMONIC_PROD,
} = ENV;

export const rpcUrls: ConfigPerNetwork<RpcUrl> = {
  main: ALCHEMY_KEY
    ? `https://eth-mainnet.g.alchemy.com/v2/${ALCHEMY_KEY}`
    : `https://mainnet.infura.io/v3/${INFURA_KEY}`,
  sepolia: ALCHEMY_KEY
    ? `https://eth-sepolia.g.alchemy.com/v2/${ALCHEMY_KEY}`
    : `https://sepolia.infura.io/v3/${INFURA_KEY}`,
  etherlink: 'https://node.mainnet.etherlink.com',
  hardhat: 'http://localhost:8545',
  localhost: 'http://localhost:8545',
  base: 'https://mainnet.base.org',
  oasis: 'https://sapphire.oasis.io',
  plume: 'https://rpc.plume.org',
  rootstock: 'https://mycrypto.rsk.co',
  arbitrum: 'https://arbitrum.drpc.org',
  tacTestnet: 'https://turin.rpc.tac.build',
  hyperevm: 'https://rpc.hyperliquid.xyz/evm',
  katana: `https://rpc-katana.t.conduit.xyz/${CONDUIT_API_KEY}`,
  tac: 'https://rpc.tac.build',
  xrplevm: 'https://rpc.xrplevm.org',
  zerog: 'https://evmrpc.0g.ai',
  plasma: 'https://rpc.plasma.to',
  arbitrumSepolia: 'https://sepolia-rollup.arbitrum.io/rpc',
  bsc: ALCHEMY_KEY
    ? `https://bnb-mainnet.g.alchemy.com/v2/${ALCHEMY_KEY}`
    : 'https://bsc-dataseed.bnbchain.org',
  scroll: 'https://rpc.scroll.io',
};

export const gasPrices: ConfigPerNetwork<number | 'auto' | undefined> = {
  etherlink: undefined,
  main: undefined,
  sepolia: undefined,
  hardhat: 'auto',
  base: 'auto',
  localhost: 70 * GWEI,
  oasis: undefined,
  plume: undefined,
  rootstock: undefined,
  arbitrum: undefined,
  tacTestnet: undefined,
  hyperevm: undefined,
  katana: undefined,
  tac: undefined,
  xrplevm: undefined,
  zerog: undefined,
  plasma: undefined,
  arbitrumSepolia: undefined,
  bsc: undefined,
  scroll: undefined,
};

export const chainIds: ConfigPerNetwork<number> = {
  main: 1,
  base: 8453,
  sepolia: 11155111,
  etherlink: 42793,
  hardhat: 31337,
  localhost: 31337,
  oasis: 23294,
  plume: 98866,
  rootstock: 30,
  arbitrum: 42161,
  tacTestnet: 2390,
  hyperevm: 999,
  katana: 747474,
  tac: 239,
  xrplevm: 1440000,
  zerog: 16661,
  plasma: 9745,
  arbitrumSepolia: 421614,
  bsc: 56,
  scroll: 534352,
};

export const mnemonics: ConfigPerNetwork<string | undefined> = {
  main: MNEMONIC_PROD,
  sepolia: MNEMONIC_DEV,
  base: MNEMONIC_PROD,
  etherlink: MNEMONIC_PROD,
  hardhat: MNEMONIC_DEV,
  localhost: MNEMONIC_DEV,
  oasis: MNEMONIC_PROD,
  plume: MNEMONIC_PROD,
  rootstock: MNEMONIC_PROD,
  arbitrum: MNEMONIC_PROD,
  tacTestnet: MNEMONIC_DEV,
  hyperevm: MNEMONIC_PROD,
  katana: MNEMONIC_PROD,
  tac: MNEMONIC_PROD,
  xrplevm: MNEMONIC_PROD,
  zerog: MNEMONIC_PROD,
  plasma: MNEMONIC_PROD,
  arbitrumSepolia: MNEMONIC_DEV,
  bsc: MNEMONIC_PROD,
  scroll: MNEMONIC_PROD,
};

export const gases: ConfigPerNetwork<number | undefined> = {
  main: undefined,
  sepolia: undefined,
  hardhat: undefined,
  etherlink: undefined,
  localhost: undefined,
  base: undefined,
  oasis: undefined,
  plume: undefined,
  rootstock: undefined,
  arbitrum: undefined,
  tacTestnet: undefined,
  hyperevm: undefined,
  katana: undefined,
  tac: undefined,
  xrplevm: undefined,
  zerog: undefined,
  plasma: undefined,
  arbitrumSepolia: undefined,
  bsc: undefined,
  scroll: undefined,
};

export const timeouts: ConfigPerNetwork<number | undefined> = {
  main: undefined,
  sepolia: 999999,
  hardhat: undefined,
  localhost: 999999,
  etherlink: undefined,
  base: undefined,
  oasis: undefined,
  plume: undefined,
  rootstock: undefined,
  arbitrum: undefined,
  tacTestnet: undefined,
  hyperevm: undefined,
  katana: undefined,
  tac: undefined,
  xrplevm: undefined,
  zerog: undefined,
  plasma: undefined,
  arbitrumSepolia: undefined,
  bsc: undefined,
  scroll: undefined,
};

export const blockGasLimits: ConfigPerNetwork<number | undefined> = {
  main: undefined,
  sepolia: undefined,
  etherlink: undefined,
  hardhat: 300 * 10 ** 6,
  localhost: undefined,
  base: undefined,
  oasis: undefined,
  plume: undefined,
  rootstock: undefined,
  arbitrum: undefined,
  tacTestnet: undefined,
  hyperevm: undefined,
  katana: undefined,
  tac: undefined,
  xrplevm: undefined,
  zerog: undefined,
  plasma: undefined,
  arbitrumSepolia: undefined,
  bsc: undefined,
  scroll: undefined,
};

export const initialBasesFeePerGas: ConfigPerNetwork<number | undefined> = {
  main: undefined,
  etherlink: undefined,
  sepolia: undefined,
  hardhat: 0,
  localhost: undefined,
  base: undefined,
  oasis: undefined,
  plume: undefined,
  rootstock: undefined,
  arbitrum: undefined,
  tacTestnet: undefined,
  hyperevm: undefined,
  katana: undefined,
  tac: undefined,
  xrplevm: undefined,
  zerog: undefined,
  plasma: undefined,
  arbitrumSepolia: undefined,
  bsc: undefined,
  scroll: undefined,
};

export const blockFinality: PartialConfigPerNetwork<number> = {
  main: 12,
  hyperevm: 32,
  sepolia: 2,
  arbitrumSepolia: 1,
};

export const axelarChainNames: PartialConfigPerNetwork<string> = {
  main: 'Ethereum',
  arbitrum: 'arbitrum',
  base: 'base',
  bsc: 'binance',
  sepolia: 'ethereum-sepolia',
  arbitrumSepolia: 'arbitrum-sepolia',
  xrplevm: 'xrpl-evm',
  hyperevm: 'hyperliquid',
};

export const layerZeroEids: PartialConfigPerNetwork<EndpointId> = {
  main: EndpointId.ETHEREUM_V2_MAINNET,
  sepolia: EndpointId.SEPOLIA_V2_TESTNET,
  base: EndpointId.BASE_V2_MAINNET,
  etherlink: EndpointId.ETHERLINK_V2_MAINNET,
  plume: EndpointId.PLUME_V2_MAINNET,
  rootstock: EndpointId.ROOTSTOCK_V2_MAINNET,
  hyperevm: EndpointId.HYPERLIQUID_V2_MAINNET,
  katana: EndpointId.KATANA_V2_MAINNET,
  tac: EndpointId.TAC_V2_MAINNET,
  zerog: EndpointId.OG_V2_MAINNET,
  plasma: EndpointId.PLASMA_V2_MAINNET,
  arbitrumSepolia: EndpointId.ARBSEP_V2_TESTNET,
  scroll: EndpointId.SCROLL_V2_MAINNET,
};

export const layerZeroEidToNetwork = Object.fromEntries(
  Object.entries(layerZeroEids).map(([network, eid]) => [
    eid,
    network as Network,
  ]),
) as Partial<Record<EndpointId, Network>>;

export const chainIdToNetwork = Object.fromEntries(
  Object.entries(chainIds).map(([network, chainId]) => [
    chainId,
    network as Network,
  ]),
) as Partial<Record<number, Network>>;

export const getBaseNetworkConfig = (
  network: Network,
  tags: Array<string> = [MOCK_AGGREGATOR_NETWORK_TAG],
): HttpNetworkUserConfig => ({
  accounts: mnemonics[network]
    ? {
        mnemonic: mnemonics[network],
      }
    : undefined,
  chainId: chainIds[network],
  gas: gases[network],
  gasPrice: gasPrices[network],
  timeout: timeouts[network],
  tags,
});

export const getLocalNetworkConfig = (
  network: Network,
): Omit<HardhatNetworkUserConfig, 'accounts'> => ({
  ...getBaseNetworkConfig(network, []),
  blockGasLimit: blockGasLimits[network],
  initialBaseFeePerGas: initialBasesFeePerGas[network],
  eid: undefined as never,
  safeConfig: undefined as never,
});

export const getNetworkConfig = (
  network: Network,
  tags: Array<string> = [MOCK_AGGREGATOR_NETWORK_TAG],
  forkingNetwork?: Network,
): HttpNetworkUserConfig => ({
  ...getBaseNetworkConfig(forkingNetwork ?? network, tags),
  url: rpcUrls[network],
  chainId: chainIds[network],
  saveDeployments: true,
  eid: layerZeroEids[network],
});

export const getForkNetworkConfig = (
  network: Network,
): HardhatNetworkUserConfig => ({
  ...getLocalNetworkConfig(network),
  accounts: {
    mnemonic: mnemonics[network],
  },
  live: false,
  saveDeployments: true,
  mining: {
    auto: false,
    interval: 1000,
  },
  forking: {
    url: rpcUrls[network],
    enabled: true,
  },
});

export const getHardhatNetworkConfig = (): HardhatNetworkUserConfig => ({
  ...getLocalNetworkConfig('hardhat'),
  accounts: mnemonics.hardhat ? { mnemonic: mnemonics.hardhat } : undefined,
  saveDeployments: true,
  live: false,
  allowUnlimitedContractSize: true,
});

export const isTestnetNetwork = (network: Network) => {
  const isLocalNetwork = network === 'localhost' || network === 'hardhat';
  return (
    isLocalNetwork ||
    network === 'sepolia' ||
    network === 'arbitrumSepolia' ||
    network === 'tacTestnet'
  );
};
