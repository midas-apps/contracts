import { LibraryToAddress } from '@nomicfoundation/hardhat-verify/internal/solc/artifacts';
import { task } from 'hardhat/config';

import { chainIds, ENV, Network, verifyConfig } from '../config';
import {
  etherscanVerify,
  etherscanVerifyImplementation,
} from '../helpers/utils';
import { getTransparentProxyConstructorArgs } from '../helpers/verify-proxy';

task('verifyProxy')
  .addPositionalParam('proxyAddress')
  .setAction(async ({ proxyAddress }, hre) => {
    await etherscanVerifyImplementation(hre, proxyAddress);
  });

/**
 * Verifies any OpenZeppelin TransparentUpgradeableProxy on an explorer.
 *
 * Recovers the original `(impl, admin, initData)` constructor args from the
 * proxy creation tx recorded in `.openzeppelin/<network>.json`, so it works
 * for every contract type (token, custom aggregators, data feeds, deposit /
 * redemption vault variants, …)
 */
task(
  'verify-transparent-proxy',
  'Verify OZ TransparentUpgradeableProxy (constructor args decoded from creation tx)',
)
  .addPositionalParam('proxy', 'Proxy contract address')
  .setAction(async ({ proxy }, hre) => {
    const { implementation, admin, initData } =
      await getTransparentProxyConstructorArgs(hre, proxy);

    console.log(
      `Recovered constructor args for ${proxy}:\n` +
        `  implementation: ${implementation}\n` +
        `  admin:          ${admin}\n` +
        `  initData:       ${initData}`,
    );

    await hre.run('verify:verify', {
      address: proxy,
      contract:
        '@openzeppelin/contracts/proxy/transparent/TransparentUpgradeableProxy.sol:TransparentUpgradeableProxy',
      constructorArguments: [implementation, admin, initData],
      libraries: {} as LibraryToAddress,
    });
  });

task('verifyRegular')
  .addPositionalParam('address')
  .setAction(async ({ address }, hre) => {
    await etherscanVerify(hre, address);
  });

// override hardhat verify task
task('verify').setAction(
  async (
    args: {
      address?: string;
      constructorArgsParams: string[];
      constructorArgs?: string;
      libraries?: string;
      contract?: string;
      force: boolean;
      listNetworks: boolean;
    },
    hre,
  ) => {
    if (args.listNetworks) {
      await hre.run('verify:print-supported-networks');
      return;
    }

    await hre.run('verify:verify', args);
  },
);

// override hardhat verify:verify task
task('verify:verify').setAction(
  async (
    args: {
      address?: string;
      constructorArguments: string[];
      libraries: LibraryToAddress;
      contract?: string;
      force?: boolean;
    },
    hre,
    runSuper,
  ) => {
    const network = hre.network.name as Network;
    const configsRaw = verifyConfig[network];
    if (!configsRaw) {
      throw new Error(`No verify config found for network ${network}`);
    }

    const configs = Array.isArray(configsRaw) ? configsRaw : [configsRaw];

    if (!configs.length) {
      console.warn('No verify config found for network, skipping verification');
      return;
    }

    console.log(
      `Contract ${args.address} will be verified on ${configs
        .map((config) => config.browserUrl)
        .join(', ')}\n`,
    );

    for (const config of configs) {
      // reset verify configs
      hre.config.etherscan = {
        apiKey: 'no-key',
        enabled: false,
        customChains: [],
      };
      hre.config.sourcify = {
        enabled: false,
        apiUrl: undefined,
        browserUrl: undefined,
      };

      if (config.type === 'etherscan') {
        const apiKey = config.overrideApiKey ?? ENV.ETHERSCAN_API_KEY;

        if (!apiKey) {
          throw new Error('API key is required for etherscan verification');
        }

        hre.config.etherscan = {
          apiKey,
          enabled: true,
          customChains: [
            {
              chainId: chainIds[network],
              network,
              urls: {
                apiURL:
                  'https://api.etherscan.io/v2/api?chainid=' +
                  chainIds[network],
                browserURL: config.browserUrl,
              },
            },
          ],
        };
      } else if (config.type === 'custom') {
        const apiKey = config.apiKey;

        hre.config.etherscan = {
          apiKey: apiKey ? { [network]: apiKey } : { [network]: 'no-key' },
          enabled: true,
          customChains: [
            {
              chainId: chainIds[network],
              network,
              urls: {
                apiURL: config.apiUrl,
                browserURL: config.browserUrl,
              },
            },
          ],
        };
      } else if (config.type === 'sourcify') {
        hre.config.sourcify = {
          enabled: true,
          apiUrl: config.overrideApiUrl,
          browserUrl: config.browserUrl,
        };
      } else {
        throw new Error(`Unknown verify config type`);
      }

      await runSuper(args);
    }

    console.log('Verification completed');
  },
);
