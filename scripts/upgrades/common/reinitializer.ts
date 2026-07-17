/* eslint-disable @typescript-eslint/no-explicit-any */
import { ethers } from 'ethers';

import fs from 'fs';
import path from 'path';

export interface Reinitializer {
  name: string;
  version: number;
  selector: string;
  signature: string;
}

const REINIT_NAME = /^initializeV(\d+)$/;

// EIP-1967 implementation slot.
const IMPL_SLOT =
  '0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc';

export const ATTACKER = '0x00000000000000000000000000000000DeaDBeef';

/** 4-byte selector for a full function signature, e.g. `initializeV2(uint256)`. */
export const reinitializerSelector = (sig: string): string =>
  ethers.utils.id(sig).slice(0, 10);

/** Canonical Solidity type for an ABI input (recurses into tuples/arrays). */
function canonicalType(input: any): string {
  const type: string = input?.type ?? '';
  if (type.startsWith('tuple')) {
    const inner = (input.components ?? []).map(canonicalType).join(',');
    return `(${inner})${type.slice('tuple'.length)}`;
  }
  return type;
}

/** Canonical function signature, e.g. `initializeV2(uint256)`. */
function canonicalSignature(fn: any): string {
  const inputs = (fn.inputs ?? []).map(canonicalType).join(',');
  return `${fn.name}(${inputs})`;
}

/**
 * Reinitializers declared on an (already flattened) contract ABI. Detected by
 * the `initializeV{N}` naming convention, where `N` equals the `reinitializer(N)`
 * version (enforced by scripts/upgrades/generate_deviationReinitializer.ts).
 */
export function getReinitializers(abi: any[]): Reinitializer[] {
  const out: Reinitializer[] = [];
  for (const f of abi) {
    if (f?.type !== 'function' || typeof f.name !== 'string') continue;
    const m = REINIT_NAME.exec(f.name);
    if (!m) continue;
    const signature = canonicalSignature(f);
    out.push({
      name: f.name,
      version: parseInt(m[1], 10),
      selector: reinitializerSelector(signature),
      signature,
    });
  }
  return out.sort((a, b) => a.version - b.version);
}

export function topReinitializer(
  rs: Reinitializer[],
): Reinitializer | undefined {
  return rs.reduce<Reinitializer | undefined>(
    (top, r) => (!top || r.version > top.version ? r : top),
    undefined,
  );
}

export async function getImplAddress(
  provider: ethers.providers.Provider,
  proxy: string,
): Promise<string | null> {
  const raw = await provider.getStorageAt(proxy, IMPL_SLOT);
  const impl = '0x' + raw.slice(-40);
  if (/^0x0+$/.test(impl)) return null;
  return ethers.utils.getAddress(impl);
}

export async function implHasSelector(
  provider: ethers.providers.Provider,
  impl: string,
  selector: string,
): Promise<boolean> {
  const code = await provider.getCode(impl);
  return code.includes(selector.slice(2));
}

const NAMED_MANIFESTS_BY_CHAIN: Record<number, string> = {
  1: 'mainnet.json',
  10: 'optimism.json',
  56: 'bsc.json',
  42161: 'arbitrum-one.json',
  11155111: 'sepolia.json',
};

const OZ_MANIFEST_DIR = path.join(__dirname, '../../../.openzeppelin');

export const manifestFileForChain = (chainId: number): string =>
  NAMED_MANIFESTS_BY_CHAIN[chainId] ?? `unknown-${chainId}.json`;

const manifestCache = new Map<number, any>();

export function loadManifestForChain(chainId: number): any | undefined {
  if (manifestCache.has(chainId)) return manifestCache.get(chainId);
  const p = path.join(OZ_MANIFEST_DIR, manifestFileForChain(chainId));
  const parsed = fs.existsSync(p)
    ? JSON.parse(fs.readFileSync(p, 'utf8'))
    : undefined;
  manifestCache.set(chainId, parsed);
  return parsed;
}

export interface StorageSlotRef {
  slot: number;
  offset: number;
}

export function initializedSlotFromManifest(
  manifest: any,
  impl: string,
): StorageSlotRef | undefined {
  const impls = manifest?.impls ?? {};
  for (const key of Object.keys(impls)) {
    if (impls[key]?.address?.toLowerCase() !== impl.toLowerCase()) continue;
    const found = (impls[key]?.layout?.storage ?? []).find(
      (s: any) => s.label === '_initialized',
    );
    if (found?.slot !== undefined) {
      return { slot: Number(found.slot), offset: Number(found.offset ?? 0) };
    }
  }
  return undefined;
}

export async function readInitializedVersion(
  provider: ethers.providers.Provider,
  address: string,
  ref: StorageSlotRef,
): Promise<number> {
  const raw = ethers.utils.hexZeroPad(
    await provider.getStorageAt(address, ref.slot),
    32,
  );
  const start = 2 + (31 - ref.offset) * 2;
  return parseInt(raw.slice(start, start + 2), 16);
}

function zeroValueArg(input: ethers.utils.ParamType): unknown {
  if (input.baseType === 'array') {
    const len = input.arrayLength === -1 ? 0 : input.arrayLength;
    return Array.from({ length: len }, () => zeroValueArg(input.arrayChildren));
  }
  if (input.baseType === 'tuple') return input.components.map(zeroValueArg);
  if (input.baseType === 'address') return ethers.constants.AddressZero;
  if (input.baseType === 'bool') return false;
  if (input.baseType === 'string') return '';
  if (input.baseType === 'bytes') return '0x';
  if (input.baseType.startsWith('bytes')) {
    return '0x' + '00'.repeat(parseInt(input.baseType.slice(5), 10));
  }
  return 0;
}

/** Calldata to probe `fnSig`'s callability. */
export const buildProbeCalldata = (fnSig: string): string => {
  const iface = new ethers.utils.Interface([`function ${fnSig}`]);
  const fragment = iface.fragments[0] as ethers.utils.FunctionFragment;
  return iface.encodeFunctionData(
    fragment.name,
    fragment.inputs.map(zeroValueArg),
  );
};

export function extractRevert(err: any): string {
  const parts: string[] = [];
  if (err?.reason) parts.push(String(err.reason));
  if (err?.message) parts.push(String(err.message));
  if (err?.error?.message) parts.push(String(err.error.message));
  let data: any = err?.data ?? err?.error?.data ?? err?.error?.error?.data;
  if (data && typeof data === 'object')
    data = data.data ?? data.originalError?.data;
  if (typeof data === 'string' && data.startsWith('0x08c379a0')) {
    try {
      parts.push(
        ethers.utils.defaultAbiCoder.decode(
          ['string'],
          '0x' + data.slice(10),
        )[0],
      );
    } catch {
      // ignore decode failure
    }
  }
  return parts.join(' | ');
}

export function classifyProbeFailure(err: unknown): {
  status: 'CONSUMED' | 'NA';
  detail?: string;
} {
  const revert = extractRevert(err);
  if (/already initialized/i.test(revert)) return { status: 'CONSUMED' };
  return { status: 'NA', detail: revert.slice(0, 120) };
}

export type ProbeStatus = 'OPEN' | 'CONSUMED' | 'NA';

/**
 * eth_estimateGas of an unprivileged attacker calling the reinitializer:
 * succeeds iff the call would succeed. Read-only.
 */
export async function probeReinitOpen(
  provider: ethers.providers.Provider,
  proxy: string,
  fnSig: string,
): Promise<{ status: ProbeStatus; detail?: string }> {
  const data = buildProbeCalldata(fnSig);
  try {
    await provider.estimateGas({ to: proxy, from: ATTACKER, data });
    return { status: 'OPEN' };
  } catch (err) {
    return classifyProbeFailure(err);
  }
}

/**
 * Pure decision logic for the pre-upgrade guard: given the reinitializers the
 * new implementation carries and the proxy's current `_initialized`, decide
 * whether the upgrade safely consumes any newly-introduced reinitializer.
 */
export function evaluateGuard(args: {
  reinits: Reinitializer[];
  implVersionsPresent: number[];
  onchainVersion: number;
  initializerCalldata?: string;
}): { ok: true } | { ok: false; reason: string } {
  const { reinits, implVersionsPresent, onchainVersion, initializerCalldata } =
    args;
  const present = reinits.filter((r) =>
    implVersionsPresent.includes(r.version),
  );
  const top = topReinitializer(present);
  if (!top || top.version <= onchainVersion) return { ok: true };

  const calledSelector = initializerCalldata?.slice(0, 10)?.toLowerCase();
  if (calledSelector === top.selector.toLowerCase()) return { ok: true };

  return {
    ok: false,
    reason:
      `new implementation introduces ${top.name} (reinitializer v${top.version}) ` +
      `that the proxy (_initialized=${onchainVersion}) has not consumed. ` +
      `Add \`initializer: '${top.name}'\` (+ initializerArgs) to the upgrade ` +
      `config so it runs atomically via upgradeAndCall.`,
  };
}

export interface GuardInput {
  provider: ethers.providers.Provider;
  proxyAddress: string;
  newImplementation: string;
  abi: any[];
  initializerCalldata?: string;
  /** Test seam; production resolves via loadManifestForChain. */
  getManifest?: (chainId: number) => any;
}

/**
 * Throws when the new implementation introduces a reinitializer the proxy has
 * not consumed and the upgrade is not an `upgradeAndCall` targeting the top
 * reinitializer. Read-only.
 */
export async function assertReinitializerCovered(
  input: GuardInput,
): Promise<void> {
  const {
    provider,
    proxyAddress,
    newImplementation,
    abi,
    initializerCalldata,
  } = input;
  const reinits = getReinitializers(abi);
  if (reinits.length === 0) return;

  const implVersionsPresent: number[] = [];
  for (const r of reinits) {
    if (await implHasSelector(provider, newImplementation, r.selector)) {
      implVersionsPresent.push(r.version);
    }
  }
  if (implVersionsPresent.length === 0) return;

  const { chainId } = await provider.getNetwork();
  const getManifest = input.getManifest ?? loadManifestForChain;
  const ref = initializedSlotFromManifest(
    getManifest(chainId),
    newImplementation,
  );
  if (!ref) {
    throw new Error(
      `Reinitializer guard: cannot resolve the _initialized storage slot for ` +
        `implementation ${newImplementation} (chain ${chainId}); expected its ` +
        `layout in .openzeppelin/${manifestFileForChain(chainId)}. Refusing ` +
        `to guess a slot — re-run the upgrade so prepareUpgrade records the ` +
        `implementation in the manifest, and commit that file.`,
    );
  }
  const onchainVersion = await readInitializedVersion(
    provider,
    proxyAddress,
    ref,
  );

  const result = evaluateGuard({
    reinits,
    implVersionsPresent,
    onchainVersion,
    initializerCalldata,
  });
  if (!result.ok) {
    throw new Error(
      `Reinitializer guard: upgrade of ${proxyAddress} to ${newImplementation} — ${result.reason}`,
    );
  }
}

/**
 * Pure decision logic for the post-upgrade verification: the top reinitializer
 * present on the implementation must be consumed (onchain version reached it and
 * it is no longer callable).
 */
export function evaluateConsumed(args: {
  reinits: Reinitializer[];
  implVersionsPresent: number[];
  onchainVersion: number;
  topProbe: ProbeStatus;
}): { ok: true } | { ok: false; reason: string } {
  const present = args.reinits.filter((r) =>
    args.implVersionsPresent.includes(r.version),
  );
  const top = topReinitializer(present);
  if (!top) return { ok: true };
  if (args.onchainVersion < top.version) {
    return {
      ok: false,
      reason: `_initialized=${args.onchainVersion} but impl top reinitializer is v${top.version} (${top.name}) — not consumed`,
    };
  }
  if (args.topProbe === 'OPEN') {
    return {
      ok: false,
      reason: `${top.name} is still callable by anyone (estimateGas succeeded)`,
    };
  }
  return { ok: true };
}

/**
 * Throws if the top reinitializer present on the proxy's implementation is not
 * consumed. Read-only.
 */
export async function verifyReinitializersConsumed(input: {
  provider: ethers.providers.Provider;
  proxyAddress: string;
  abi: any[];
}): Promise<void> {
  const { provider, proxyAddress, abi } = input;
  const reinits = getReinitializers(abi);
  if (reinits.length === 0) return;

  const impl = await getImplAddress(provider, proxyAddress);
  if (!impl) return;

  const implVersionsPresent: number[] = [];
  for (const r of reinits) {
    if (await implHasSelector(provider, impl, r.selector)) {
      implVersionsPresent.push(r.version);
    }
  }
  const top = topReinitializer(
    reinits.filter((r) => implVersionsPresent.includes(r.version)),
  );
  if (!top) return;

  const { chainId } = await provider.getNetwork();
  const ref = initializedSlotFromManifest(loadManifestForChain(chainId), impl);
  if (!ref) {
    throw new Error(
      `Reinitializer verify: ${proxyAddress} — cannot resolve the ` +
        `_initialized storage slot for implementation ${impl}; expected its ` +
        `layout in .openzeppelin/${manifestFileForChain(chainId)}. Refusing ` +
        `to guess.`,
    );
  }
  const onchainVersion = await readInitializedVersion(
    provider,
    proxyAddress,
    ref,
  );
  const topProbe = await probeReinitOpen(provider, proxyAddress, top.signature);

  const result = evaluateConsumed({
    reinits,
    implVersionsPresent,
    onchainVersion,
    topProbe: topProbe.status,
  });
  if (!result.ok) {
    throw new Error(`Reinitializer verify: ${proxyAddress} — ${result.reason}`);
  }
}
