export * from './tokens';

type RpcNetwork = 'sepolia' | 'mainnet';

export const networks = [
  'sepolia',
  'main',
  'arbitrum',
  'arbitrumSepolia',
  'base',
  'bsc',
  'etherlink',
  'hardhat',
  'hyperevm',
  'katana',
  'localhost',
  'main',
  'oasis',
  'plasma',
  'plume',
  'rootstock',
  'scroll',
  'monad',
  'tac',
  'tacTestnet',
  'xrplevm',
  'zerog',
  'injective',
  'optimism',
] as const;

export type Network = (typeof networks)[number];

export type RpcUrl =
  | `http://localhost:${number}`
  | `https://${string}.${string}`;

export type ConfigPerNetwork<T> = Record<Network, T>;
export type PartialConfigPerNetwork<T> = Partial<ConfigPerNetwork<T>>;

export interface Environment {
  readonly ALCHEMY_KEY?: string;
  readonly INFURA_KEY?: string;
  readonly CONDUIT_API_KEY?: string;
  readonly QUICK_NODE_KEY?: string;
  readonly QUICK_NODE_PROJECT?: string;
  readonly ETHERSCAN_API_KEY?: string;
  readonly OPTIMIZER: boolean;
  readonly COVERAGE: boolean;
  readonly REPORT_GAS: boolean;
  readonly MNEMONIC_DEV?: string;
  readonly MNEMONIC_PROD: string;
  readonly FORKING_NETWORK?: Network;
  readonly VERIFY_SOURCIFY?: boolean;
  readonly VERIFY_ETHERSCAN?: boolean;
  readonly SOURCIFY_API_URL?: string;
  readonly CUSTOM_SIGNER_SCRIPT_PATH?: string;
  readonly LOG_TO_FILE: boolean;
  readonly LOGS_FOLDER_PATH?: string;
  readonly getRpcUrl: (network: Network) => RpcUrl | undefined;
}
