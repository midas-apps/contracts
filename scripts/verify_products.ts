import { HardhatRuntimeEnvironment } from 'hardhat/types';

import { DeployFunction } from './deploy/common/types';

import { MTokenName, Network } from '../config';
import { midasAddressesPerNetwork } from '../config/constants/addresses';
import {
  logDeployProxy,
  tryEtherscanVerifyImplementation,
} from '../helpers/utils';
import { getTransparentProxyConstructorArgs } from '../helpers/verify-proxy';

/**
 * Hardcoded list of products (mTokens) to verify per network.
 *
 * Every product listed here is resolved to its on-chain addresses via
 * `midasAddressesPerNetwork`, and each proxy address on the product (token,
 * custom feed, data feed, deposit / redemption vaults, …) is verified — both
 * the implementation and the `TransparentUpgradeableProxy` wrapper.
 *
 * Verification is network-bound (the `verify:verify` task keys off the active
 * `--network`), so run this script once per network:
 *
 *   yarn hardhat runscript scripts/verify_products.ts --network main
 *   yarn hardhat runscript scripts/verify_products.ts --network optimism
 */
const PRODUCTS_TO_VERIFY: Partial<Record<Network, MTokenName[]>> = {
  main: ['mFTAC'],
};

/** Product keys that hold nested objects rather than a proxy address. */
const NON_PROXY_KEYS = new Set(['layerZero', 'axelar', 'addressProfiles']);

const isAddress = (value: unknown): value is string =>
  typeof value === 'string' && /^0x[0-9a-fA-F]{40}$/.test(value);

/** Collects `[label, proxyAddress]` pairs for every proxy on a product. */
const collectProxyAddresses = (
  product: Record<string, unknown>,
): [string, string][] =>
  Object.entries(product)
    .filter(([key, value]) => !NON_PROXY_KEYS.has(key) && isAddress(value))
    .map(([key, value]) => [key, value as string]);

const func: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  const network = hre.network.name as Network;
  const products = PRODUCTS_TO_VERIFY[network];

  if (!products?.length) {
    console.log(
      `No products configured for network "${network}". ` +
        `Configured networks: ${Object.keys(PRODUCTS_TO_VERIFY).join(', ')}.`,
    );
    return;
  }

  const networkAddresses = midasAddressesPerNetwork[network];
  if (!networkAddresses) {
    throw new Error(`No addresses found for network "${network}".`);
  }

  const failures: string[] = [];

  for (const productName of products) {
    const product = networkAddresses[productName];
    if (!product) {
      console.warn(
        `⚠️  Product "${productName}" not found on ${network}, skipping.`,
      );
      continue;
    }

    const proxies = collectProxyAddresses(product as Record<string, unknown>);
    console.log(
      `\n=== ${productName} (${network}) — ${proxies.length} proxies ===`,
    );

    for (const [label, address] of proxies) {
      console.log(`\n--- ${productName}.${label} @ ${address} ---`);
      await logDeployProxy(hre, `${productName}.${label}`, address);

      // 1) Verify the implementation contract behind the proxy.
      const implVerified = await tryEtherscanVerifyImplementation(hre, address);
      if (!implVerified) {
        failures.push(`${productName}.${label} (impl) @ ${address}`);
      }

      // 2) Verify the TransparentUpgradeableProxy wrapper itself, recovering
      //    its `(impl, admin, initData)` constructor args from the creation tx.
      try {
        const { implementation, admin, initData } =
          await getTransparentProxyConstructorArgs(hre, address);

        await hre.run('verify:verify', {
          address,
          contract:
            '@openzeppelin/contracts/proxy/transparent/TransparentUpgradeableProxy.sol:TransparentUpgradeableProxy',
          constructorArguments: [implementation, admin, initData],
        });
      } catch (err) {
        console.error(`Unable to verify proxy ${address}. Error:`, err);
        failures.push(`${productName}.${label} (proxy) @ ${address}`);
      }
    }
  }

  console.log(`\n\n===== Verification summary (${network}) =====`);
  if (failures.length) {
    console.log(`❌ ${failures.length} verification(s) failed:`);
    failures.forEach((f) => console.log(`  - ${f}`));
  } else {
    console.log('✅ All products verified successfully.');
  }
};

export default func;
