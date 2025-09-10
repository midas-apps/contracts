import 'dotenv/config';
import { Environment, Network, RpcUrl } from '../types';

export const ENV: Environment = {
  ETHERSCAN_API_KEY: process.env.ETHERSCAN_API_KEY ?? '',
  OPTIMIZER: process.env.OPTIMIZER === 'true',
  COVERAGE: process.env.COVERAGE === 'true',
  REPORT_GAS: process.env.REPORT_GAS === 'true',
  MNEMONIC_DEV: process.env.MNEMONIC_DEV,
  VERIFY_SOURCIFY: process.env.VERIFY_SOURCIFY === 'true',
  VERIFY_ETHERSCAN: (process.env.VERIFY_ETHERSCAN ?? 'true') === 'true',
  MNEMONIC_PROD: process.env.MNEMONIC_PROD ?? '',
  FORKING_NETWORK: process.env.FORKING_NETWORK
    ? (process.env.FORKING_NETWORK as Network)
    : undefined,
  SOURCIFY_API_URL: process.env.SOURCIFY_API_URL,
  CUSTOM_SIGNER_SCRIPT_PATH: process.env.CUSTOM_SIGNER_SCRIPT_PATH,
  LOG_TO_FILE: process.env.LOG_TO_FILE === 'true',
  LOGS_FOLDER_PATH: process.env.LOGS_FOLDER_PATH,
  getRpcUrl: (network: Network) => {
    return process.env['RPC_URL_' + network.toUpperCase()] as
      | RpcUrl
      | undefined;
  },
};
