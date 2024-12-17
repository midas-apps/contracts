import { type HardhatUserConfig } from 'hardhat/config';

import '@nomicfoundation/hardhat-chai-matchers';
import '@nomicfoundation/hardhat-network-helpers';
import '@nomiclabs/hardhat-ethers';
import '@typechain/hardhat';
import 'hardhat-gas-reporter';
import 'solidity-coverage';
import '@nomicfoundation/hardhat-verify';
import '@openzeppelin/hardhat-upgrades';
import 'hardhat-contract-sizer';
import 'hardhat-deploy';
// import 'hardhat-docgen';
import 'solidity-docgen';
import './tasks';

import {
  chainIds,
  ENV,
  getForkNetworkConfig,
  getHardhatNetworkConfig,
  getNetworkConfig,
} from './config';

const { OPTIMIZER, REPORT_GAS, FORKING_NETWORK, ETHERSCAN_API_KEY } = ENV;

console.log({ FORKING_NETWORK });
const config: HardhatUserConfig = {
  solidity: {
    compilers: [
      {
        version: '0.8.9',
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
        },
      },
    ],
  },
  namedAccounts: {
    deployer: {
      1: '0xa0819ae43115420beb161193b8D8Ba64C9f9faCC',
      hardhat: '0xa0819ae43115420beb161193b8D8Ba64C9f9faCC',
      localhost: '0xa0819ae43115420beb161193b8D8Ba64C9f9faCC',
      sepolia: '0xa0819ae43115420beb161193b8D8Ba64C9f9faCC',
      etherlink: '0xa0819ae43115420beb161193b8D8Ba64C9f9faCC',
      base: '0xa0819ae43115420beb161193b8D8Ba64C9f9faCC',
      oasis: '0xa0819ae43115420beb161193b8D8Ba64C9f9faCC',
    },
  },
  verify: {
    etherscan: {
      apiKey: ETHERSCAN_API_KEY,
    },
  },
  networks: {
    main: getNetworkConfig('main', []),
    etherlink: getNetworkConfig('etherlink', []),
    sepolia: getNetworkConfig('sepolia'),
    base: getNetworkConfig('base'),
    oasis: getNetworkConfig('oasis'),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    hardhat: FORKING_NETWORK
      ? getForkNetworkConfig(FORKING_NETWORK)
      : getHardhatNetworkConfig(),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    localhost: FORKING_NETWORK
      ? getForkNetworkConfig(FORKING_NETWORK)
      : getNetworkConfig('localhost', [], FORKING_NETWORK as any),
  },
  gasReporter: {
    enabled: REPORT_GAS,
  },
  contractSizer: {
    runOnCompile: OPTIMIZER,
  },
  etherscan: {
    apiKey: ETHERSCAN_API_KEY,
    enabled: ENV.VERIFY_ONLY_SOURCIFY === false,
    customChains: [
      {
        chainId: chainIds.etherlink,
        network: 'etherlink',
        urls: {
          apiURL: 'https://testnet-explorer.etherlink.com/api',
          browserURL: 'https://testnet-explorer.etherlink.com',
        },
      },
      {
        chainId: chainIds.base,
        network: 'base',
        urls: {
          apiURL: 'https://api.basescan.org/api',
          browserURL: 'https://basescan.org',
        },
      },
      {
        chainId: chainIds.oasis,
        network: 'oasis',
        urls: {
          apiURL: '',
          browserURL: '',
        },
      },
    ],
  },
  sourcify: {
    enabled: true,
  },
  paths: {
    deploy: 'deploy/',
    deployments: 'deployments/',
  },
  docgen: {
    outputDir: './docgen',
    pages: 'single',
  },
  external: FORKING_NETWORK
    ? {
        deployments: {
          hardhat: ['deployments/' + FORKING_NETWORK],
          local: ['deployments/' + FORKING_NETWORK],
        },
      }
    : undefined,
};

export default config;
