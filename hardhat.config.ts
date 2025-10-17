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
    deployer: {
      main: '0xa0819ae43115420beb161193b8D8Ba64C9f9faCC',
      hardhat: '0xa0819ae43115420beb161193b8D8Ba64C9f9faCC',
      localhost: '0xa0819ae43115420beb161193b8D8Ba64C9f9faCC',
      sepolia: '0xa0819ae43115420beb161193b8D8Ba64C9f9faCC',
      arbitrumSepolia: '0xa0819ae43115420beb161193b8D8Ba64C9f9faCC',
      base: '0xa0819ae43115420beb161193b8D8Ba64C9f9faCC',
      rootstock: '0x548F80f9f4af495aF5eaEf97bbC5c61223e96A01',
      arbitrum: '0x165894140c591Ea3E57fA337E90Ce0bdB475e814',
      oasis: '0xa690AB0543514D04411Bb1D12b2E277D675D4939',
      plume: '0x1Ded0c1E3dC80634b8d615f84aeAf1fA13B913Cc',
      etherlink: '0xaF940292B68B668A1De0e0729Ce0D60e95018b17',
      hyperevm: '0x0144936A17ce450a6Eb499C00104890592814F0F',
      katana: '0xf0db11c80894c0b26681e7ba035574721012bb7e',
      tacTestnet: '0x12dE1B534B879b4e3a2f1D05a299eD448dC45FD3',
      tac: '0x12dE1B534B879b4e3a2f1D05a299eD448dC45FD3',
      xrplevm: '0xea4308904131c51f8380c4a21c74cd629d07893c',
      zerog: '0xf975786717f57e20bf4d69faf88e795a94f7808d',
      plasma: '0x1CA462EBB85e14014a8b5c2c46dD018a716B371b',
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
    arbitrumSepolia: getNetworkConfig('arbitrumSepolia'),
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
    hyperevm: getNetworkConfig('hyperevm'),
    katana: getNetworkConfig('katana'),
    xrplevm: getNetworkConfig('xrplevm'),
    tac: getNetworkConfig('tac'),
    zerog: getNetworkConfig('zerog'),
    plasma: getNetworkConfig('plasma'),
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
