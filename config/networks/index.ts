import { EndpointId } from '@layerzerolabs/lz-definitions';
import { HardhatNetworkUserConfig, HttpNetworkUserConfig } from 'hardhat/types';

import { GWEI } from '../constants';
import { ENV } from '../env';
import {
  ConfigPerNetwork,
  Network,
  PartialConfigPerNetwork,
  RpcUrl,
} from '../types';

export * from './verify.config';

const {
  ALCHEMY_KEY,
  INFURA_KEY,
  CONDUIT_API_KEY,
  MNEMONIC_DEV,
  MNEMONIC_PROD,
  QUICK_NODE_PROJECT,
  QUICK_NODE_KEY,
  getRpcUrl,
} = ENV;

const defaultRpcUrls: ConfigPerNetwork<RpcUrl> = {
  main: ALCHEMY_KEY
    ? `https://eth-mainnet.g.alchemy.com/v2/${ALCHEMY_KEY}`
    : `https://mainnet.infura.io/v3/${INFURA_KEY}`,
  sepolia: ALCHEMY_KEY
    ? `https://eth-sepolia.g.alchemy.com/v2/${ALCHEMY_KEY}`
    : `https://sepolia.infura.io/v3/${INFURA_KEY}`,
  etherlink: 'https://node.mainnet.etherlink.com',
  hardhat: 'http://localhost:8545',
  localhost: 'http://localhost:8545',
  base: ALCHEMY_KEY
    ? `https://base-mainnet.g.alchemy.com/v2/${ALCHEMY_KEY}`
    : INFURA_KEY
    ? `https://base-mainnet.infura.io/v3/${INFURA_KEY}`
    : 'https://mainnet.base.org',
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
  scroll: INFURA_KEY
    ? `https://scroll-mainnet.infura.io/v3/${INFURA_KEY}`
    : 'https://scroll.drpc.org',
  monad: 'https://rpc.monad.xyz',
  injective: `https://${QUICK_NODE_PROJECT}.injective-mainnet.quiknode.pro/${QUICK_NODE_KEY}/`,
  optimism: ALCHEMY_KEY
    ? `https://opt-mainnet.g.alchemy.com/v2/${ALCHEMY_KEY}`
    : `https://optimism-mainnet.infura.io/v3/${INFURA_KEY}`,
};

export const rpcUrls: ConfigPerNetwork<RpcUrl> = Object.entries(
  defaultRpcUrls,
).reduce((acc, [networkKey, rpcUrl]) => {
  const network = networkKey as Network;
  acc[network] = getRpcUrl(network) ?? rpcUrl;
  return acc;
}, {} as ConfigPerNetwork<RpcUrl>);

export const gasPrices: PartialConfigPerNetwork<number | 'auto' | undefined> = {
  hardhat: 'auto',
  base: 'auto',
  localhost: 70 * GWEI,
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
  monad: 143,
  injective: 1776,
  optimism: 10,
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
  monad: MNEMONIC_PROD,
  injective: MNEMONIC_PROD,
  optimism: MNEMONIC_PROD,
};

export const gases: PartialConfigPerNetwork<number | undefined> = {};

export const timeouts: PartialConfigPerNetwork<number | undefined> = {
  sepolia: 999999,
  localhost: 999999,
};

export const blockGasLimits: PartialConfigPerNetwork<number | undefined> = {
  hardhat: 300 * 10 ** 6,
};

export const initialBasesFeePerGas: PartialConfigPerNetwork<
  number | undefined
> = {
  hardhat: 0,
};

export const layerZeroBlockFinality: PartialConfigPerNetwork<number> = {
  main: 70,
  sepolia: 2,
  arbitrumSepolia: 1,
  monad: 3600,
  katana: 1200,
  scroll: 800,
  optimism: 650,
  plasma: 1800,
  zerog: 6000,
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
  monad: EndpointId.MONAD_V2_MAINNET,
  optimism: EndpointId.OPTIMISM_V2_MAINNET,
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
});

export const getLocalNetworkConfig = (
  network: Network,
): Omit<HardhatNetworkUserConfig, 'accounts'> => ({
  ...getBaseNetworkConfig(network),
  blockGasLimit: blockGasLimits[network],
  initialBaseFeePerGas: initialBasesFeePerGas[network],
  eid: undefined as never,
  safeConfig: undefined as never,
});

export const getNetworkConfig = (
  network: Network,
  forkingNetwork?: Network,
): HttpNetworkUserConfig => ({
  ...getBaseNetworkConfig(forkingNetwork ?? network),
  url: rpcUrls[network],
  chainId: chainIds[network],
  eid: layerZeroEids[network],
});

export const getForkNetworkConfig = (
  network: Network,
): HardhatNetworkUserConfig => ({
  ...getLocalNetworkConfig(network),
  accounts: {
    mnemonic: mnemonics[network],
  },
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
