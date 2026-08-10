import { type HardhatUserConfig } from 'hardhat/config';
import { HttpNetworkUserConfig } from 'hardhat/types';

import '@nomicfoundation/hardhat-chai-matchers';
import '@nomicfoundation/hardhat-network-helpers';
import '@nomiclabs/hardhat-ethers';
import '@typechain/hardhat';
import '@nomicfoundation/hardhat-verify';
import '@openzeppelin/hardhat-upgrades';
import '@layerzerolabs/toolbox-hardhat';
import 'hardhat-contract-sizer';
import 'solidity-docgen';
import 'hardhat-deploy';
import 'hardhat-gas-reporter';
import 'solidity-coverage';
import 'hardhat-tracer';

import './tasks';
import {
  chainIds,
  ENV,
  extend,
  getForkNetworkConfig,
  getHardhatNetworkConfig,
  getNetworkConfig,
  Network,
  networks,
} from './config';

extend();

const { OPTIMIZER, REPORT_GAS, FORKING_NETWORK } = ENV;

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
      {
        version: '0.8.22',
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
    deployer: Object.keys(chainIds).reduce((acc, network) => {
      acc[network] = 0;
      return acc;
    }, {} as Record<string, number>),
  },
  networks: {
    ...Object.values(networks)
      .filter((v) => !['hardhat', 'localhost'].includes(v))
      .reduce((acc, network) => {
        acc[network] = getNetworkConfig(network);
        return acc;
      }, {} as Record<Network, HttpNetworkUserConfig>),
    hardhat: FORKING_NETWORK
      ? getForkNetworkConfig(FORKING_NETWORK)
      : getHardhatNetworkConfig(),
    localhost: FORKING_NETWORK
      ? getForkNetworkConfig(FORKING_NETWORK)
      : getNetworkConfig('localhost', FORKING_NETWORK),
  },
  gasReporter: {
    enabled: REPORT_GAS,
  },
  contractSizer: {
    runOnCompile: OPTIMIZER,
  },
  docgen: {
    outputDir: './docgen',
    pages: 'single',
  },
};

export default config;
