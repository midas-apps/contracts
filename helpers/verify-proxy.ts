import { HardhatRuntimeEnvironment } from 'hardhat/types';

import fs from 'fs';
import path from 'path';

import { chainIds } from '../config';

/** EIP-1967 admin storage slot. */
export const EIP1967_ADMIN_SLOT =
  '0xb53127684a568b3173ae13b9f8a6016e243e63b6e8ee1178d6a717850b5d6103';

/**
 * Friendly filenames OpenZeppelin uses for a few well-known networks; every
 * other chain falls back to `unknown-<chainId>.json`.
 */
const OZ_MANIFEST_FRIENDLY_NAMES: Record<number, string> = {
  [chainIds.main]: 'mainnet',
  [chainIds.sepolia]: 'sepolia',
  [chainIds.arbitrum]: 'arbitrum-one',
  [chainIds.bsc]: 'bsc',
  [chainIds.optimism]: 'optimism',
};

/**
 * Returns the `.openzeppelin/` filename the OZ upgrades plugin uses for a
 * given chainId. Friendly name for well-known chains, `unknown-<id>.json`
 * otherwise.
 */
export const getOpenZeppelinManifestFileName = (chainId: number): string => {
  const friendly = OZ_MANIFEST_FRIENDLY_NAMES[chainId];
  return `${friendly ?? `unknown-${chainId}`}.json`;
};

type OpenZeppelinManifestProxy = {
  address: string;
  txHash: string;
  kind: string;
};

type OpenZeppelinManifest = {
  proxies: OpenZeppelinManifestProxy[];
};

export type TransparentProxyConstructorArgs = {
  implementation: string;
  admin: string;
  initData: string;
};

/**
 * Recovers the original `(implementation, admin, initData)` constructor
 * arguments of a `TransparentUpgradeableProxy` by decoding the proxy
 * creation transaction recorded in `.openzeppelin/<network>.json`.
 *
 * The decoder anchors on the EIP-1967 admin address (a `ProxyAdmin` contract
 * that is stable across upgrades), so this works for both freshly deployed
 * proxies and proxies that have been upgraded since deployment. The returned
 * `implementation` is the deploy-time impl, which is what an explorer needs
 * to reproduce the proxy bytecode — even if the current EIP-1967
 * implementation slot has been changed by an upgrade.
 *
 * Throws with an actionable message when the proxy is not in the manifest,
 * the deployment tx is unavailable, or the args cannot be decoded.
 */
export const getTransparentProxyConstructorArgs = async (
  hre: HardhatRuntimeEnvironment,
  proxyAddress: string,
): Promise<TransparentProxyConstructorArgs> => {
  const { ethers, network } = hre;
  const proxy = ethers.utils.getAddress(proxyAddress);
  const chainId = network.config.chainId;

  if (!chainId) {
    throw new Error(
      `Network "${network.name}" has no chainId configured — cannot locate OpenZeppelin manifest.`,
    );
  }

  const adminWord = await ethers.provider.getStorageAt(
    proxy,
    EIP1967_ADMIN_SLOT,
  );
  const adminFromSlot = ethers.utils.getAddress('0x' + adminWord.slice(-40));

  if (adminFromSlot === ethers.constants.AddressZero) {
    throw new Error(
      `EIP-1967 admin slot is zero for ${proxy} — this address is not a transparent proxy.`,
    );
  }

  const manifestFile = getOpenZeppelinManifestFileName(chainId);
  const manifestPath = path.join(process.cwd(), '.openzeppelin', manifestFile);

  if (!fs.existsSync(manifestPath)) {
    throw new Error(
      `No OpenZeppelin manifest found for network ${network.name} (chainId ${chainId}) at ${manifestPath}.`,
    );
  }

  const manifest = JSON.parse(
    fs.readFileSync(manifestPath, 'utf-8'),
  ) as OpenZeppelinManifest;

  const entry = manifest.proxies.find(
    (p) => p.address.toLowerCase() === proxy.toLowerCase(),
  );

  if (!entry) {
    throw new Error(
      `Proxy ${proxy} not found in OpenZeppelin manifest ${manifestFile}. ` +
        `This task only handles proxies deployed via hre.upgrades.deployProxy.`,
    );
  }

  if (entry.kind !== 'transparent') {
    throw new Error(
      `Proxy ${proxy} has kind '${entry.kind}' in the manifest. ` +
        `This helper only supports transparent proxies.`,
    );
  }

  const tx = await ethers.provider.getTransaction(entry.txHash);

  if (!tx) {
    throw new Error(
      `Deployment tx ${entry.txHash} not retrievable from RPC for proxy ${proxy}. ` +
        `Your RPC provider may not retain history that far back — try an archive RPC.`,
    );
  }

  // Constructor args are encoded as `(address impl, address admin, bytes initData)`.
  // The static head is `impl(32) ++ admin(32) ++ offset(32, value=0x60)`. We
  // anchor on `admin ++ offset` because that 64-byte pattern is effectively
  // unique within the creation tx — admin alone could in principle collide with
  // bytes inside the proxy bytecode, but `admin ++ 0x60` will not.
  const adminPaddedHex = ethers.utils
    .hexZeroPad(adminFromSlot, 32)
    .slice(2)
    .toLowerCase();
  const offsetPaddedHex = ethers.utils
    .hexZeroPad('0x60', 32)
    .slice(2)
    .toLowerCase();
  const searchPattern = adminPaddedHex + offsetPaddedHex;
  const dataHexNoPrefix = tx.data.slice(2).toLowerCase();
  const adminMatchHexIdx = dataHexNoPrefix.indexOf(searchPattern);

  if (adminMatchHexIdx === -1) {
    throw new Error(
      `Could not locate constructor args in deployment tx ${entry.txHash} for proxy ${proxy} ` +
        `(searched for admin ${adminFromSlot} followed by 0x60 offset). ` +
        `tx.data length: ${tx.data.length} hex chars.`,
    );
  }

  if (adminMatchHexIdx < 64) {
    throw new Error(
      `Admin pattern in deployment tx ${entry.txHash} appears too early ` +
        `(hex offset ${adminMatchHexIdx}); cannot be the constructor args region.`,
    );
  }

  // The 32 bytes immediately before the admin pattern are the original impl.
  const argsStartHexIdx = adminMatchHexIdx - 64;
  const argsHex = '0x' + dataHexNoPrefix.slice(argsStartHexIdx);
  const [decodedImpl, decodedAdmin, initData] =
    ethers.utils.defaultAbiCoder.decode(
      ['address', 'address', 'bytes'],
      argsHex,
    ) as [string, string, string];

  const decodedAdminChecksummed = ethers.utils.getAddress(decodedAdmin);
  if (decodedAdminChecksummed !== adminFromSlot) {
    throw new Error(
      `Decoded admin ${decodedAdminChecksummed} does not match EIP-1967 admin ${adminFromSlot} ` +
        `for proxy ${proxy} — likely a decoder bug.`,
    );
  }

  return {
    implementation: ethers.utils.getAddress(decodedImpl),
    admin: decodedAdminChecksummed,
    initData,
  };
};
