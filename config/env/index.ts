import 'dotenv/config';
import { Environment, Network } from '../types';

export const ENV: Environment = {
  ALCHEMY_KEY: process.env.ALCHEMY_KEY ?? '',
  INFURA_KEY: process.env.INFURA_KEY ?? '',
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
  FORDEFI_API_USER_TOKEN: process.env.FORDEFI_API_USER_TOKEN,
};
