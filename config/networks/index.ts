import { HardhatNetworkUserConfig, NetworkUserConfig } from 'hardhat/types';

import { GWEI, MOCK_AGGREGATOR_NETWORK_TAG } from '../constants';
import { ENV } from '../env';
import { ConfigPerNetwork, Network, RpcUrl } from '../types';

const { MNEMONIC_DEV, MNEMONIC_PROD, getRpcUrl } = ENV;

export const rpcUrls: ConfigPerNetwork<RpcUrl> = {
  main: getRpcUrl('main') ?? 'https://1rpc.io/eth',
  sepolia: getRpcUrl('sepolia') ?? 'https://1rpc.io/sepolia',
  etherlink: getRpcUrl('etherlink') ?? 'https://node.mainnet.etherlink.com',
  hardhat: 'http://localhost:8545',
  localhost: 'http://localhost:8545',
  base: getRpcUrl('base') ?? 'https://mainnet.base.org',
  oasis: getRpcUrl('oasis') ?? 'https://sapphire.oasis.io',
  plume: getRpcUrl('plume') ?? 'https://rpc.plume.org',
  rootstock: getRpcUrl('rootstock') ?? 'https://mycrypto.rsk.co',
  arbitrum: getRpcUrl('arbitrum') ?? 'https://arbitrum.drpc.org',
  tacTestnet: getRpcUrl('tacTestnet') ?? 'https://turin.rpc.tac.build',
  hyperevm: getRpcUrl('hyperevm') ?? 'https://rpc.hyperliquid.xyz/evm',
  katana: getRpcUrl('katana') ?? `https://rpc.katana.network`,
  tac: getRpcUrl('tac') ?? 'https://rpc.tac.build',
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
};

export const getBaseNetworkConfig = (
  network: Network,
  tags: Array<string> = [MOCK_AGGREGATOR_NETWORK_TAG],
): NetworkUserConfig => ({
  accounts: mnemonics[network]
    ? {
        mnemonic: mnemonics[network],
      }
    : undefined,
  chainId: chainIds[network],
  gas: gases[network],
  gasPrice: gasPrices[network],
  blockGasLimit: blockGasLimits[network],
  timeout: timeouts[network],
  initialBaseFeePerGas: initialBasesFeePerGas[network],
  tags,
});

export const getNetworkConfig = (
  network: Network,
  tags: Array<string> = [MOCK_AGGREGATOR_NETWORK_TAG],
  forkingNetwork?: Network,
): NetworkUserConfig => ({
  ...getBaseNetworkConfig(forkingNetwork ?? network, tags),
  url: rpcUrls[network],
  chainId: chainIds[network],
  saveDeployments: true,
});

export const getForkNetworkConfig = (
  network: Network,
  tags: Array<string> = [MOCK_AGGREGATOR_NETWORK_TAG],
): HardhatNetworkUserConfig => ({
  ...getBaseNetworkConfig(network, tags),
  chainId: chainIds.hardhat,
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
  ...getBaseNetworkConfig('hardhat'),
  accounts: mnemonics.hardhat ? { mnemonic: mnemonics.hardhat } : undefined,
  saveDeployments: true,
  live: false,
});
