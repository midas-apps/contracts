import 'dotenv/config';
import { Environment, Network } from '../types';

export const ENV: Environment = {
  ALCHEMY_KEY: process.env.ALCHEMY_KEY ?? '',
  INFURA_KEY: process.env.INFURA_KEY ?? '',
  CONDUIT_API_KEY: process.env.CONDUIT_API_KEY ?? '',
  QUICK_NODE_KEY: process.env.QUICK_NODE_KEY ?? '',
  QUICK_NODE_PROJECT: process.env.QUICK_NODE_PROJECT ?? '',
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
};
