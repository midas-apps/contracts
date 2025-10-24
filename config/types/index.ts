export * from './tokens';
type NetworkBase = 'sepolia';
type RpcNetwork = NetworkBase | 'mainnet';
export type Network =
  | NetworkBase
  | 'arbitrumSepolia'
  | 'main'
  | 'hardhat'
  | 'localhost'
  | 'etherlink'
  | 'base'
  | 'oasis'
  | 'plume'
  | 'rootstock'
  | 'arbitrum'
  | 'tacTestnet'
  | 'tac'
  | 'hyperevm'
  | 'katana'
  | 'xrplevm'
  | 'zerog'
  | 'plasma'
  | 'bsc';
export type RpcUrl =
  | `https://eth-${RpcNetwork}.g.alchemy.com/v2/${string}`
  | `https://${RpcNetwork}.infura.io/v3/${string}`
  | `http://localhost:${number}`
  | `https://${string}.${string}`
  | `https://evmrpc.${string}.ai`;

export type ConfigPerNetwork<T> = Record<Network, T>;
export type PartialConfigPerNetwork<T> = Partial<ConfigPerNetwork<T>>;

export interface Environment {
  readonly ALCHEMY_KEY?: string;
  readonly INFURA_KEY?: string;
  readonly CONDUIT_API_KEY?: string;
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
}
