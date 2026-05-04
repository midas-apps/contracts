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
import 'solidity-docgen';
import './tasks';
import '@layerzerolabs/toolbox-hardhat';
import 'hardhat-tracer';
import {
  chainIds,
  ENV,
  extend,
  getForkNetworkConfig,
  getHardhatNetworkConfig,
  getNetworkConfig,
} from './config';

extend();

const { OPTIMIZER, REPORT_GAS, FORKING_NETWORK, ETHERSCAN_API_KEY } = ENV;

const config: HardhatUserConfig = {
  solidity: {
    compilers: [
      {
        version: '0.8.34',
        settings: {
          optimizer: {
            enabled: true,
            runs: 1,
          },
        },
      },
    ],
  },
  namedAccounts: {
    deployer: Object.keys(chainIds).reduce((acc, network) => {
      acc[network] = 0;
      return acc;
    }, {} as Record<string, number>),
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
    arbitrumSepolia: getNetworkConfig('arbitrumSepolia'),
    base: getNetworkConfig('base'),
    oasis: getNetworkConfig('oasis'),
    plume: getNetworkConfig('plume'),
    rootstock: getNetworkConfig('rootstock'),
    arbitrum: getNetworkConfig('arbitrum'),
    tacTestnet: getNetworkConfig('tacTestnet'),
    hardhat: FORKING_NETWORK
      ? getForkNetworkConfig(FORKING_NETWORK)
      : getHardhatNetworkConfig(),
    localhost: FORKING_NETWORK
      ? getForkNetworkConfig(FORKING_NETWORK)
      : getNetworkConfig('localhost', [], FORKING_NETWORK),
    hyperevm: getNetworkConfig('hyperevm'),
    katana: getNetworkConfig('katana'),
    xrplevm: getNetworkConfig('xrplevm'),
    tac: getNetworkConfig('tac'),
    zerog: getNetworkConfig('zerog'),
    plasma: getNetworkConfig('plasma'),
    bsc: getNetworkConfig('bsc'),
    scroll: getNetworkConfig('scroll'),
    monad: getNetworkConfig('monad'),
    injective: getNetworkConfig('injective'),
    optimism: getNetworkConfig('optimism'),
  },
  gasReporter: {
    enabled: REPORT_GAS,
  },
  contractSizer: {
    runOnCompile: OPTIMIZER,
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
