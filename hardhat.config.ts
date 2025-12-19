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
import 'hardhat-dependency-compiler';
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
        version: '0.8.9',
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
        },
      },
      {
        version: '0.8.24',
        settings: {
          optimizer: {
            enabled: true,
            runs: 1000000,
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
  dependencyCompiler: {
    paths: [
      '@pendle/v2-sy/contracts/core/StandardizedYield/implementations/Midas/PendleMidasSY.sol',
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
          apiURL: 'https://api.etherscan.io/v2/api?chainid=8453',
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
      // Use Sourcify for contract verification on HyperEVM network
      {
        network: 'plume',
        chainId: chainIds.plume,
        urls: {
          apiURL: 'https://explorer.plume.org/api',
          browserURL: 'https://explorer.plume.org',
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
      {
        network: 'hyperevm',
        chainId: chainIds.hyperevm,
        urls: {
          apiURL: 'https://www.hyperscan.com/api',
          browserURL: 'https://www.hyperscan.com',
        },
      },
      {
        chainId: chainIds.katana,
        network: 'katana',
        urls: {
          apiURL: 'https://explorer.katanarpc.com/api',
          browserURL: 'https://explorer.katanarpc.com',
        },
      },
      {
        chainId: chainIds.xrplevm,
        network: 'xrplevm',
        urls: {
          apiURL: 'https://explorer.xrplevm.org/api',
          browserURL: 'https://explorer.xrplevm.org:443',
        },
      },
      {
        chainId: chainIds.tac,
        network: 'tac',
        urls: {
          apiURL: 'https://explorer.tac.build/api',
          browserURL: 'https://explorer.tac.build',
        },
      },
      {
        chainId: chainIds.zerog,
        network: 'zerog',
        urls: {
          apiURL: 'https://chainscan.0g.ai/open/api',
          browserURL: 'https://chainscan.0g.ai',
        },
      },
      {
        chainId: chainIds.plasma,
        network: 'plasma',
        urls: {
          apiURL:
            'https://api.routescan.io/v2/network/mainnet/evm/9745/etherscan/api',
          browserURL: 'https://plasmascan.to',
        },
      },
      {
        chainId: chainIds.bsc,
        network: 'bsc',
        urls: {
          apiURL: 'https://api.bscscan.com/api',
          browserURL: 'https://bscscan.com',
        },
      },
      {
        chainId: chainIds.scroll,
        network: 'scroll',
        urls: {
          apiURL: 'https://api.etherscan.io/v2/api?chainid=534352',
          browserURL: 'https://scrollscan.com',
        },
      },
      {
        chainId: chainIds.monad,
        network: 'monad',
        urls: {
          apiURL: 'https://api.etherscan.io/v2/api?chainid=143',
          browserURL: 'https://monadvision.com',
        },
      },
    ],
  },
  sourcify: {
    enabled: ENV.VERIFY_SOURCIFY === true,
    apiUrl: ENV.SOURCIFY_API_URL,
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
