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
      base: '0xa0819ae43115420beb161193b8D8Ba64C9f9faCC',
      rootstock: '0x548F80f9f4af495aF5eaEf97bbC5c61223e96A01',
      arbitrum: '0x165894140c591Ea3E57fA337E90Ce0bdB475e814',
      oasis: '0xa690AB0543514D04411Bb1D12b2E277D675D4939',
      plume: '0x1Ded0c1E3dC80634b8d615f84aeAf1fA13B913Cc',
      etherlink: '0xaF940292B68B668A1De0e0729Ce0D60e95018b17',
      tacTestnet: '0x12dE1B534B879b4e3a2f1D05a299eD448dC45FD3',
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
    plume: getNetworkConfig('plume'),
    rootstock: getNetworkConfig('rootstock'),
    arbitrum: getNetworkConfig('arbitrum'),
    tacTestnet: getNetworkConfig('tacTestnet'),
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
    enabled: ENV.VERIFY_ETHERSCAN === true,
    customChains: [
      {
        chainId: chainIds.etherlink,
        network: 'etherlink',
        urls: {
          apiURL: 'https://explorer.etherlink.com/api',
          browserURL: 'https://explorer.etherlink.com',
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
      {
        network: 'plume',
        chainId: chainIds.plume,
        urls: {
          apiURL: 'https://explorer.plumenetwork.xyz/api',
          browserURL: 'https://explorer.plumenetwork.xyz',
        },
      },
      {
        network: 'rootstock',
        chainId: chainIds.rootstock,
        urls: {
          apiURL: 'https://rootstock.blockscout.com/api/',
          browserURL: 'https://rootstock.blockscout.com/',
        },
      },
      {
        network: 'tacTestnet',
        chainId: chainIds.tacTestnet,
        urls: {
          apiURL: 'https://turin.explorer.tac.build/api',
          browserURL: 'https://turin.explorer.tac.build',
        },
      },
    ],
  },
  sourcify: {
    enabled: ENV.VERIFY_SOURCIFY === true,
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
