/**
 * Scan every address in config/constants/addresses.ts for `reinitializer(N)`
 * usage in explorer-verified source, then compare on-chain `_initialized`
 * against the highest N found.
 *
 * Usage:
 *   yarn hardhat runscript scripts/scan_reinitializers.ts --network main
 */
import { ethers } from 'ethers';
import { HardhatRuntimeEnvironment } from 'hardhat/types';

import { DeployFunction } from './deploy/common/types';
import {
  getImplAddress,
  initializedSlotFromManifest,
  loadManifestForChain,
  readInitializedVersion,
  StorageSlotRef,
} from './upgrades/common/reinitializer';

import { ENV, Network, verifyConfig } from '../config';
import { getCurrentAddresses } from '../config/constants/addresses';
import { delay } from '../helpers/utils';

const ADDRESS_RE = /^0x[a-fA-F0-9]{40}$/;
const REINITIALIZER_INVOKE_RE = /\breinitializer\s*\(\s*(\d+)\s*\)/g;

/** Attempts per explorer call (initial try + retries). */
const SOURCE_FETCH_ATTEMPTS = 4;
const SOURCE_FETCH_BASE_DELAY_MS = 1000;

type EtherscanVerifyConfig = {
  type: 'etherscan';
  overrideApiKey?: string;
  browserUrl: string;
};
type SourcifyVerifyConfig = {
  type: 'sourcify';
  browserUrl: string;
  overrideApiUrl?: string;
};
type CustomVerifyConfig = {
  type: 'custom';
  apiUrl: string;
  apiKey?: string;
  browserUrl: string;
};
type SingleVerifyCfg =
  | EtherscanVerifyConfig
  | SourcifyVerifyConfig
  | CustomVerifyConfig;

type AddressEntry = {
  path: string;
  address: string;
};

type ScanStatus =
  | 'no_reinitializer'
  | 'match'
  | 'mismatch'
  | 'needs_manual_check'
  /** Partner / expected-safe; missing OZ layout is not a warning. */
  | 'safe_skip';

type ScanResult = {
  path: string;
  address: string;
  implAddress: string | null;
  status: ScanStatus;
  reinitializerVersions: number[];
  topReinitializer?: number;
  onchainInitialized?: number;
  isProxy?: boolean;
  detail?: string;
  matches?: { file: string; version: number; snippet: string }[];
};

/**
 * Classify an addresses.ts path for missing-OZ-manifest handling.
 *
 * - paymentTokens.*.token — always expected-safe (partner ERC20)
 * - paymentTokens.*.customFeed* / aggregator — safe if non-proxy; manual if proxy
 * - everything else — should be in our manifest → manual check (no throw)
 */
function classifyManifestMiss(
  path: string,
  isProxy: boolean,
): 'safe_skip' | 'needs_manual_check' {
  const parts = path.split('.');
  if (parts[0] !== 'paymentTokens' || parts.length < 3) {
    return 'needs_manual_check';
  }

  const leaf = parts[parts.length - 1];

  if (leaf === 'token') {
    return 'safe_skip';
  }

  // Payment-token price feeds: `aggregator` in addresses.ts; also accept
  // `customFeed*` if ever present under paymentTokens.
  if (leaf === 'aggregator' || leaf.startsWith('customFeed')) {
    return isProxy ? 'needs_manual_check' : 'safe_skip';
  }

  return 'needs_manual_check';
}

function log(msg: string): void {
  console.log(msg);
}

function isAddress(value: unknown): value is string {
  return typeof value === 'string' && ADDRESS_RE.test(value);
}

/** Depth-first walk of addresses.ts — every 20-byte hex string. */
function collectAddresses(node: unknown, prefix = ''): AddressEntry[] {
  if (isAddress(node)) {
    return [
      // Lowercase first so mixed-case typos in addresses.ts don't fail EIP-55 checks.
      {
        path: prefix || '(root)',
        address: ethers.utils.getAddress(node.toLowerCase()),
      },
    ];
  }
  if (!node || typeof node !== 'object') return [];

  const out: AddressEntry[] = [];
  for (const [key, value] of Object.entries(node as Record<string, unknown>)) {
    const next = prefix ? `${prefix}.${key}` : key;
    out.push(...collectAddresses(value, next));
  }
  return out;
}

function stripSolidityComments(src: string): string {
  return src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
}

function findReinitializerInvocations(sources: Record<string, string>): {
  versions: number[];
  matches: ScanResult['matches'];
} {
  const versions = new Set<number>();
  const matches: NonNullable<ScanResult['matches']> = [];

  for (const [file, raw] of Object.entries(sources)) {
    const src = stripSolidityComments(raw);
    REINITIALIZER_INVOKE_RE.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = REINITIALIZER_INVOKE_RE.exec(src))) {
      const version = parseInt(m[1], 10);
      versions.add(version);
      const start = Math.max(0, m.index - 40);
      const end = Math.min(src.length, m.index + m[0].length + 40);
      matches.push({
        file,
        version,
        snippet: src.slice(start, end).replace(/\s+/g, ' ').trim(),
      });
    }
  }

  return {
    versions: [...versions].sort((a, b) => a - b),
    matches,
  };
}

function normalizeVerifyConfigs(network: Network): SingleVerifyCfg[] {
  const raw = verifyConfig[network];
  if (!raw) return [];
  return (Array.isArray(raw) ? raw : [raw]) as SingleVerifyCfg[];
}

function etherscanV2Url(
  chainId: number,
  address: string,
  apiKey: string,
): string {
  const params = new URLSearchParams({
    chainid: String(chainId),
    module: 'contract',
    action: 'getsourcecode',
    address,
    apikey: apiKey,
  });
  return `https://api.etherscan.io/v2/api?${params.toString()}`;
}

function customExplorerUrl(
  apiUrl: string,
  address: string,
  apiKey?: string,
): string {
  const base = apiUrl.includes('?') ? `${apiUrl}&` : `${apiUrl}?`;
  const params = new URLSearchParams({
    module: 'contract',
    action: 'getsourcecode',
    address,
  });
  if (apiKey) params.set('apikey', apiKey);
  return `${base}${params.toString()}`;
}

function parseEtherscanSources(
  result: Record<string, unknown>,
): Record<string, string> | null {
  const out: Record<string, string> = {};

  const sourceCode = result.SourceCode;
  if (typeof sourceCode === 'string' && sourceCode.trim()) {
    // Multi-file: {{ ... }} or { ... }
    if (sourceCode.startsWith('{')) {
      try {
        const jsonText =
          sourceCode.startsWith('{{') && sourceCode.endsWith('}}')
            ? sourceCode.slice(1, -1)
            : sourceCode;
        const parsed = JSON.parse(jsonText) as {
          sources?: Record<string, { content?: string } | string>;
        };
        if (parsed.sources) {
          for (const [file, entry] of Object.entries(parsed.sources)) {
            const content =
              typeof entry === 'string' ? entry : entry?.content ?? '';
            if (content) out[file] = content;
          }
        }
      } catch {
        // fall through to single-file handling below
      }
    }

    if (Object.keys(out).length === 0) {
      const name =
        typeof result.ContractName === 'string' && result.ContractName
          ? `${result.ContractName}.sol`
          : 'Contract.sol';
      out[name] = sourceCode;
    }
  }

  // Blockscout (and some explorers) put imports in AdditionalSources while
  // SourceCode is only the primary file — e.g. MBasisDepositVault.sol alone,
  // with DepositVault.sol (and its reinitializer) in AdditionalSources.
  const additional = result.AdditionalSources;
  if (Array.isArray(additional)) {
    for (const entry of additional) {
      if (!entry || typeof entry !== 'object') continue;
      const rec = entry as Record<string, unknown>;
      const file =
        (typeof rec.Filename === 'string' && rec.Filename) ||
        (typeof rec.filename === 'string' && rec.filename) ||
        (typeof rec.Path === 'string' && rec.Path) ||
        (typeof rec.path === 'string' && rec.path);
      const content =
        (typeof rec.SourceCode === 'string' && rec.SourceCode) ||
        (typeof rec.sourceCode === 'string' && rec.sourceCode) ||
        (typeof rec.Content === 'string' && rec.Content) ||
        (typeof rec.content === 'string' && rec.content);
      if (file && content) out[file] = content;
    }
  }

  return Object.keys(out).length > 0 ? out : null;
}

async function fetchJson(url: string): Promise<unknown> {
  log(`      HTTP GET ${url.replace(/apikey=[^&]+/i, 'apikey=***')}`);
  const res = await fetch(url, {
    headers: { Accept: 'application/json' },
  });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} for ${url}`);
  }
  return res.json();
}

function isNotVerifiedMessage(msg: string): boolean {
  return /not.?verified|contract source code not verified/i.test(msg);
}

async function fetchSourcesEtherscanLike(
  url: string,
): Promise<Record<string, string> | null> {
  const json = (await fetchJson(url)) as {
    status?: string;
    message?: string;
    result?: unknown;
  };

  if (json.status === '0') {
    const msg = json.message ?? String(json.result ?? 'unknown');
    if (isNotVerifiedMessage(msg)) {
      log(`      explorer: not verified (${msg})`);
      return null;
    }
    if (typeof json.result === 'string' && isNotVerifiedMessage(json.result)) {
      log(`      explorer: not verified (${json.result})`);
      return null;
    }
    // Rate limits / transient API errors — retryable
    throw new Error(`explorer API error: ${msg}`);
  }

  const row = Array.isArray(json.result) ? json.result[0] : json.result;
  if (!row || typeof row !== 'object') {
    log('      explorer: empty result payload');
    return null;
  }
  const sources = parseEtherscanSources(row as Record<string, unknown>);
  if (!sources) {
    log('      explorer: verified but SourceCode empty');
    return null;
  }
  log(`      explorer: got ${Object.keys(sources).length} source file(s)`);
  return sources;
}

/**
 * Sourcify source fetch. Prefers the v2 API:
 *   GET {server}/v2/contract/{chainId}/{address}?fields=sources
 * Falls back to legacy `/files/any/...` for forked Sourcify instances
 * (e.g. Monad) that may not expose v2 yet.
 */
async function fetchSourcesSourcify(
  apiUrl: string,
  chainId: number,
  address: string,
): Promise<Record<string, string> | null> {
  const base = apiUrl.replace(/\/$/, '');

  const v2 = await fetchSourcesSourcifyV2(base, chainId, address);
  if (v2) return v2;

  return fetchSourcesSourcifyLegacy(base, chainId, address);
}

async function fetchSourcesSourcifyV2(
  base: string,
  chainId: number,
  address: string,
): Promise<Record<string, string> | null> {
  const url = `${base}/v2/contract/${chainId}/${address}?fields=sources`;
  log(`      Sourcify v2 GET ${url}`);
  const res = await fetch(url, { headers: { Accept: 'application/json' } });
  if (res.status === 404 || res.status === 405 || res.status === 501) {
    // Not verified, or this Sourcify fork has no v2 — caller may try legacy.
    log(`      Sourcify v2: HTTP ${res.status}`);
    return null;
  }
  if (!res.ok) {
    throw new Error(`Sourcify v2 HTTP ${res.status} for ${url}`);
  }

  const json = (await res.json()) as {
    sources?: Record<string, { content?: string } | string>;
    match?: string;
  };

  const sources = json.sources ?? {};
  const out: Record<string, string> = {};
  for (const [file, entry] of Object.entries(sources)) {
    const content = typeof entry === 'string' ? entry : entry?.content;
    if (!content || !file.endsWith('.sol')) continue;
    out[file] = content;
  }

  if (Object.keys(out).length === 0) {
    log('      Sourcify v2: response had no .sol sources');
    return null;
  }
  log(
    `      Sourcify v2: got ${Object.keys(out).length} .sol file(s)` +
      (json.match ? ` (match=${json.match})` : ''),
  );
  return out;
}

async function fetchSourcesSourcifyLegacy(
  base: string,
  chainId: number,
  address: string,
): Promise<Record<string, string> | null> {
  const url = `${base}/files/any/${chainId}/${address}`;
  log(`      Sourcify legacy GET ${url}`);
  const res = await fetch(url, { headers: { Accept: 'application/json' } });
  if (res.status === 404) {
    log('      Sourcify legacy: not found (404)');
    return null;
  }
  if (!res.ok) throw new Error(`Sourcify legacy HTTP ${res.status} for ${url}`);

  const json = (await res.json()) as {
    files?: { name?: string; path?: string; content?: string }[];
    status?: string;
  };

  const files = json.files ?? [];
  const out: Record<string, string> = {};
  for (const f of files) {
    const name = f.path ?? f.name;
    if (!name || typeof f.content !== 'string') continue;
    if (!name.endsWith('.sol')) continue;
    out[name] = f.content;
  }
  if (Object.keys(out).length === 0) {
    log('      Sourcify legacy: response had no .sol files');
    return null;
  }
  log(`      Sourcify legacy: got ${Object.keys(out).length} .sol file(s)`);
  return out;
}

/**
 * Single attempt against one verify config. Throws on transport / API errors
 * (retryable). Returns null when the explorer cleanly reports "not verified".
 */
async function fetchSourcesOnce(
  config: SingleVerifyCfg,
  chainId: number,
  address: string,
): Promise<{ sources: Record<string, string>; via: string } | null> {
  if (config.type === 'etherscan') {
    const apiKey = config.overrideApiKey ?? ENV.ETHERSCAN_API_KEY;
    if (!apiKey) {
      throw new Error('ETHERSCAN_API_KEY is required for etherscan explorers');
    }
    log(`      trying etherscan explorer ${config.browserUrl}`);
    const sources = await fetchSourcesEtherscanLike(
      etherscanV2Url(chainId, address, apiKey),
    );
    return sources ? { sources, via: config.browserUrl } : null;
  }

  if (config.type === 'custom') {
    log(`      trying custom explorer ${config.browserUrl} (${config.apiUrl})`);
    const sources = await fetchSourcesEtherscanLike(
      customExplorerUrl(config.apiUrl, address, config.apiKey),
    );
    return sources ? { sources, via: config.browserUrl } : null;
  }

  if (config.type === 'sourcify') {
    const apiUrl =
      config.overrideApiUrl ??
      ENV.SOURCIFY_API_URL ??
      'https://sourcify.dev/server';
    log(`      trying sourcify ${config.browserUrl} (${apiUrl})`);
    const sources = await fetchSourcesSourcify(apiUrl, chainId, address);
    return sources ? { sources, via: config.browserUrl } : null;
  }

  throw new Error(`Unknown verify config type`);
}

async function withRetries<T>(label: string, fn: () => Promise<T>): Promise<T> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= SOURCE_FETCH_ATTEMPTS; attempt++) {
    try {
      if (attempt > 1) {
        const waitMs = SOURCE_FETCH_BASE_DELAY_MS * 2 ** (attempt - 2);
        log(
          `      retry ${attempt}/${SOURCE_FETCH_ATTEMPTS} for ${label} after ${waitMs}ms`,
        );
        await delay(waitMs);
      } else {
        log(`      attempt ${attempt}/${SOURCE_FETCH_ATTEMPTS} for ${label}`);
      }
      return await fn();
    } catch (err) {
      lastError = err;
      const msg = err instanceof Error ? err.message : String(err);
      log(`      attempt ${attempt}/${SOURCE_FETCH_ATTEMPTS} failed: ${msg}`);
    }
  }
  throw new Error(
    `Source fetch failed after ${SOURCE_FETCH_ATTEMPTS} attempts (${label}): ${
      lastError instanceof Error ? lastError.message : String(lastError)
    }`,
  );
}

/**
 * Fetches verified source for the first candidate that has it.
 * Retries transport/API failures (throws if retries exhaust).
 * Returns null when explorers cleanly report "not verified" for every candidate
 * (partner contracts — caller should queue for manual check).
 */
async function fetchSourcesForAddress(args: {
  network: Network;
  chainId: number;
  path: string;
  candidates: string[];
}): Promise<{
  sources: Record<string, string>;
  via: string;
  fromAddress: string;
} | null> {
  const configs = normalizeVerifyConfigs(args.network);
  if (configs.length === 0) {
    throw new Error(
      `No verifyConfig for network ${args.network} — cannot fetch source for ${args.path}`,
    );
  }

  log(
    `    fetching source (candidates=${args.candidates.join(
      ', ',
    )}; explorers=${configs.map((c) => c.browserUrl).join(', ')})`,
  );

  const notVerifiedNotes: string[] = [];

  for (const address of args.candidates) {
    for (const config of configs) {
      const label = `${args.path} @ ${address} via ${config.browserUrl}`;
      const result = await withRetries(label, () =>
        fetchSourcesOnce(config, args.chainId, address),
      );
      if (result) {
        log(
          `    source OK: ${Object.keys(result.sources).length} file(s) from ${
            result.via
          } for ${address}`,
        );
        return { ...result, fromAddress: address };
      }
      notVerifiedNotes.push(`${address} @ ${config.browserUrl}: not verified`);
      log(`    not verified at ${config.browserUrl} for ${address}`);
      await delay(250);
    }
  }

  log(
    `    no verified source found for ${args.path} — will queue for manual verification`,
  );
  for (const n of notVerifiedNotes) {
    log(`      - ${n}`);
  }
  return null;
}

/**
 * OZ Initializable `_initialized` (uint8) + `_initializing` (bool) pack into
 * slot 0 for every midas upgradeable contract in our manifests (1147/1147).
 * Used when the proxy's implementation is not recorded in `.openzeppelin`.
 */
const DEFAULT_INITIALIZED_SLOT: StorageSlotRef = { slot: 0, offset: 0 };

/**
 * Resolves `_initialized` via OZ manifest layout.
 * For EIP-1967 proxies missing from the manifest, falls back to the default
 * midas layout (slot 0, offset 0). Non-proxies without a manifest entry stay
 * unavailable for the caller to classify (safe_skip / manual).
 */
async function readOnchainInitialized(
  provider: ethers.providers.Provider,
  proxyOrContract: string,
  impl: string | null,
  chainId: number,
): Promise<
  | { version: number; source: 'manifest' | 'default_slot' }
  | { unavailable: string }
> {
  const isProxy = impl !== null;
  const targetImpl = impl ?? proxyOrContract;
  log(
    `    resolving _initialized slot from OZ manifest (impl=${targetImpl}, chainId=${chainId}, proxy=${isProxy})`,
  );

  const manifest = loadManifestForChain(chainId);
  const ref = manifest
    ? initializedSlotFromManifest(manifest, targetImpl)
    : undefined;

  if (ref) {
    log(
      `    _initialized slot=${ref.slot} offset=${ref.offset} (from OZ manifest)`,
    );
    const version = await readInitializedVersion(
      provider,
      proxyOrContract,
      ref,
    );
    log(`    on-chain _initialized=${version} at ${proxyOrContract}`);
    return { version, source: 'manifest' };
  }

  if (!manifest) {
    log(`    no .openzeppelin manifest for chain ${chainId}`);
  } else {
    log(`    implementation ${targetImpl} not found in OZ manifest layout`);
  }

  if (isProxy) {
    log(
      `    proxy without OZ record — using default midas slot ` +
        `${DEFAULT_INITIALIZED_SLOT.slot} offset=${DEFAULT_INITIALIZED_SLOT.offset}`,
    );
    const version = await readInitializedVersion(
      provider,
      proxyOrContract,
      DEFAULT_INITIALIZED_SLOT,
    );
    log(
      `    on-chain _initialized=${version} at ${proxyOrContract} (default slot)`,
    );
    return { version, source: 'default_slot' };
  }

  const reason =
    'not an EIP-1967 proxy and implementation layout not in OZ manifest';
  log(`    ${reason} — skipping on-chain read`);
  return { unavailable: reason };
}

function pad(s: string, n: number): string {
  return s.length >= n ? s : s + ' '.repeat(n - s.length);
}

function printReport(results: ScanResult[], network: string, chainId: number) {
  const withReinit = results.filter(
    (r) => r.status === 'match' || r.status === 'mismatch',
  );
  const mismatches = results.filter((r) => r.status === 'mismatch');
  const noReinit = results.filter((r) => r.status === 'no_reinitializer');
  const manual = results.filter((r) => r.status === 'needs_manual_check');
  const safeSkip = results.filter((r) => r.status === 'safe_skip');

  log('\n' + '='.repeat(80));
  log(`Reinitializer scan — ${network} (chainId ${chainId})`);
  log(`Total addresses scanned: ${results.length}`);
  log('='.repeat(80));

  log('\n--- WITH reinitializer(N) (auto-checked) ---');
  if (withReinit.length === 0) {
    log('(none)');
  } else {
    for (const r of withReinit) {
      const flag = r.status === 'mismatch' ? 'MISMATCH' : 'OK';
      const init =
        r.onchainInitialized !== undefined
          ? `_initialized=${r.onchainInitialized}`
          : '_initialized=?';
      log(
        `[${flag}] ${pad(r.path, 48)} ${r.address}` +
          `\n         top reinitializer=${
            r.topReinitializer
          }  versions=[${r.reinitializerVersions.join(', ')}]  ${init}` +
          (r.implAddress ? `\n         impl=${r.implAddress}` : '') +
          (r.isProxy === false ? `\n         non-proxy` : '') +
          (r.detail ? `\n         ${r.detail}` : ''),
      );
      if (r.matches && r.matches.length > 0) {
        for (const m of r.matches) {
          log(`         · v${m.version} in ${m.file}: …${m.snippet}…`);
        }
      }
    }
  }

  log('\n--- WITHOUT reinitializer(N) ---');
  if (noReinit.length === 0) {
    log('(none)');
  } else {
    for (const r of noReinit) {
      log(
        `  ${pad(r.path, 48)} ${r.address}` +
          (r.isProxy === false ? '  (non-proxy)' : ''),
      );
    }
  }

  log('\n--- SAFE SKIP (expected — not a warning) ---');
  log(
    '(paymentTokens.*.token, or non-proxy paymentTokens feed/aggregator — missing OZ layout is fine)',
  );
  if (safeSkip.length === 0) {
    log('(none)');
  } else {
    for (const r of safeSkip) {
      log(
        `  ${pad(r.path, 48)} ${r.address}` +
          (r.isProxy === false ? '  (non-proxy)' : '') +
          (r.detail ? `\n         ${r.detail}` : ''),
      );
    }
  }

  log('\n--- NEEDS MANUAL VERIFICATION ---');
  log(
    '(missing OZ manifest for midas-owned / suspicious proxy payment feed, or other reasons)',
  );
  if (manual.length === 0) {
    log('(none)');
  } else {
    for (const r of manual) {
      log(
        `  ${pad(r.path, 48)} ${r.address}` +
          (r.topReinitializer !== undefined
            ? `\n         top reinitializer=${
                r.topReinitializer
              }  versions=[${r.reinitializerVersions.join(', ')}]`
            : '') +
          (r.implAddress ? `\n         impl=${r.implAddress}` : '') +
          (r.isProxy === false ? `\n         non-proxy` : '') +
          (r.isProxy === true ? `\n         proxy` : '') +
          (r.detail ? `\n         reason: ${r.detail}` : ''),
      );
      if (r.matches && r.matches.length > 0) {
        for (const m of r.matches) {
          log(`         · v${m.version} in ${m.file}: …${m.snippet}…`);
        }
      }
    }
  }

  log('\n--- SUMMARY ---');
  log(`  with reinitializer : ${withReinit.length}`);
  log(`  mismatches         : ${mismatches.length}`);
  log(`  without            : ${noReinit.length}`);
  log(`  safe skip          : ${safeSkip.length}`);
  log(`  manual check       : ${manual.length}`);

  if (mismatches.length > 0) {
    log('\n!!! MISMATCHES (top reinitializer != _initialized) !!!');
    for (const r of mismatches) {
      log(
        `  ${r.path}  reinitializer=${r.topReinitializer}  _initialized=${r.onchainInitialized}  ${r.address}`,
      );
    }
  }
}

const func: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  const network = hre.network.name as Network;
  const chainId = hre.network.config.chainId;
  if (chainId === undefined) {
    throw new Error('Network chain ID is not configured');
  }

  log(`== scan_reinitializers start ==`);
  log(`network=${network} chainId=${chainId}`);

  const addresses = getCurrentAddresses(hre);
  if (!addresses) {
    throw new Error(`No addresses configured for network ${network}`);
  }

  const entries = collectAddresses(addresses);
  const seen = new Map<string, AddressEntry>();
  for (const e of entries) {
    const key = e.address.toLowerCase();
    if (!seen.has(key)) seen.set(key, e);
  }
  const unique = [...seen.values()];

  log(
    `collected ${entries.length} address path(s), ${unique.length} unique address(es)`,
  );
  for (const e of unique) {
    log(`  • ${e.path} → ${e.address}`);
  }

  const results: ScanResult[] = [];

  for (let i = 0; i < unique.length; i++) {
    const entry = unique[i];
    const progress = `[${i + 1}/${unique.length}]`;
    log(`\n${progress} ── ${entry.path} (${entry.address})`);

    log(`  checking bytecode…`);
    const code = await hre.ethers.provider.getCode(entry.address);
    if (!code || code === '0x') {
      log(`  no contract code — queued for manual verification`);
      results.push({
        path: entry.path,
        address: entry.address,
        implAddress: null,
        status: 'needs_manual_check',
        reinitializerVersions: [],
        isProxy: false,
        detail: 'no contract code at address',
      });
      continue;
    }
    log(`  bytecode present (${(code.length - 2) / 2} bytes)`);

    log(`  resolving EIP-1967 implementation…`);
    const impl = await getImplAddress(hre.ethers.provider, entry.address);
    const isProxy = impl !== null;
    if (impl) {
      log(`  proxy → implementation=${impl}`);
    } else {
      log(
        `  not an EIP-1967 proxy (partner token / plain contract) — using address as-is`,
      );
    }

    const candidates = impl
      ? impl.toLowerCase() === entry.address.toLowerCase()
        ? [entry.address]
        : [impl, entry.address]
      : [entry.address];

    const fetched = await fetchSourcesForAddress({
      network,
      chainId,
      path: entry.path,
      candidates,
    });

    if (!fetched) {
      results.push({
        path: entry.path,
        address: entry.address,
        implAddress: impl,
        status: 'needs_manual_check',
        reinitializerVersions: [],
        isProxy,
        detail: 'no verified source on configured explorers',
      });
      await delay(200);
      continue;
    }

    log(
      `  scanning ${
        Object.keys(fetched.sources).length
      } source file(s) for reinitializer(N)…`,
    );
    const { versions, matches } = findReinitializerInvocations(fetched.sources);

    if (versions.length === 0) {
      log(`  result: no reinitializer(N) invocations found`);
      results.push({
        path: entry.path,
        address: entry.address,
        implAddress: impl,
        status: 'no_reinitializer',
        reinitializerVersions: [],
        isProxy,
        matches,
        detail: `source via ${fetched.via} (${fetched.fromAddress})`,
      });
      await delay(200);
      continue;
    }

    const top = versions[versions.length - 1];
    log(`  found reinitializer versions=[${versions.join(', ')}] top=${top}`);
    for (const m of matches ?? []) {
      log(`    match v${m.version} ${m.file}: ${m.snippet}`);
    }

    log(`  reading on-chain _initialized…`);
    const onchain = await readOnchainInitialized(
      hre.ethers.provider,
      entry.address,
      impl,
      chainId,
    );

    if ('unavailable' in onchain) {
      const disposition = classifyManifestMiss(entry.path, isProxy);
      if (disposition === 'safe_skip') {
        log(
          `  result: SAFE SKIP — missing OZ layout is expected for ${entry.path}` +
            (isProxy ? '' : ' (non-proxy)'),
        );
        results.push({
          path: entry.path,
          address: entry.address,
          implAddress: impl,
          status: 'safe_skip',
          reinitializerVersions: versions,
          topReinitializer: top,
          isProxy,
          matches,
          detail: onchain.unavailable,
        });
      } else {
        log(
          `  result: NEEDS MANUAL CHECK — reinitializer(s) found but cannot read _initialized (${onchain.unavailable})`,
        );
        results.push({
          path: entry.path,
          address: entry.address,
          implAddress: impl,
          status: 'needs_manual_check',
          reinitializerVersions: versions,
          topReinitializer: top,
          isProxy,
          matches,
          detail: onchain.unavailable,
        });
      }
      await delay(200);
      continue;
    }

    const match = onchain.version === top;
    const slotNote =
      onchain.source === 'default_slot' ? ' via default slot 0' : '';
    if (match) {
      log(
        `  result: OK — top reinitializer=${top} matches _initialized=${onchain.version}${slotNote}`,
      );
    } else {
      log(
        `  result: MISMATCH — top reinitializer=${top} != _initialized=${onchain.version}${slotNote}`,
      );
    }

    results.push({
      path: entry.path,
      address: entry.address,
      implAddress: impl,
      status: match ? 'match' : 'mismatch',
      reinitializerVersions: versions,
      topReinitializer: top,
      onchainInitialized: onchain.version,
      isProxy,
      matches,
      detail: [
        `source via ${fetched.via} (${fetched.fromAddress})`,
        onchain.source === 'default_slot'
          ? '_initialized read via default slot 0 (no OZ manifest record)'
          : null,
      ]
        .filter(Boolean)
        .join('; '),
    });

    await delay(200);
  }

  printReport(results, network, chainId);

  const mismatches = results.filter((r) => r.status === 'mismatch');
  const manual = results.filter((r) => r.status === 'needs_manual_check');
  if (manual.length > 0) {
    log(
      `\n${manual.length} contract(s) need manual verification (see section above).`,
    );
  }
  if (mismatches.length > 0) {
    throw new Error(
      `Reinitializer scan failed: ${mismatches.length} mismatch(es) on ${network}`,
    );
  }

  log(`\n== scan_reinitializers done ==`);
};

export default func;
