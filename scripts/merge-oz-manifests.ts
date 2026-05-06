import { readFileSync, writeFileSync } from 'fs';
import { basename, dirname, extname, join, resolve } from 'path';

interface ProxyEntry {
  address?: string;
  [k: string]: unknown;
}

interface ImplEntry {
  address?: string;
  [k: string]: unknown;
}

interface OpenZeppelinManifest {
  proxies?: ProxyEntry[];
  impls?: Record<string, ImplEntry>;
  [k: string]: unknown;
}

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value))
    return `[${value.map((item) => stableStringify(item)).join(',')}]`;

  const objectValue = value as Record<string, unknown>;
  const keys = Object.keys(objectValue).sort();
  const serializedBody = keys
    .map((key) => `${JSON.stringify(key)}:${stableStringify(objectValue[key])}`)
    .join(',');

  return `{${serializedBody}}`;
}

function normalizeAddress(address?: string): string {
  return (address ?? '').toLowerCase();
}

function mergeProxies(
  baseProxies: ProxyEntry[],
  cmpProxies: ProxyEntry[],
): ProxyEntry[] {
  const mergedByAddress = new Map<string, ProxyEntry>();

  for (const proxy of baseProxies) {
    const address = normalizeAddress(proxy.address);
    if (!address) {
      throw new Error(
        `Base manifest contains a proxy without address: ${JSON.stringify(
          proxy,
        )}`,
      );
    }

    mergedByAddress.set(address, proxy);
  }

  for (const proxy of cmpProxies) {
    const address = normalizeAddress(proxy.address);
    if (!address) {
      throw new Error(
        `CMP manifest contains a proxy without address: ${JSON.stringify(
          proxy,
        )}`,
      );
    }

    const existing = mergedByAddress.get(address);
    if (!existing) {
      mergedByAddress.set(address, proxy);
      continue;
    }

    if (stableStringify(existing) !== stableStringify(proxy)) {
      throw new Error(
        `Proxy conflict for address "${proxy.address}": objects are not deeply equal.`,
      );
    }
  }

  return [...mergedByAddress.values()];
}

function mergeImpls(
  baseImpls: Record<string, ImplEntry>,
  cmpImpls: Record<string, ImplEntry>,
): Record<string, ImplEntry> {
  const merged: Record<string, ImplEntry> = { ...baseImpls };
  const seenPairs = new Set<string>();

  for (const [key, impl] of Object.entries(baseImpls)) {
    seenPairs.add(`${key}::${normalizeAddress(impl.address)}`);
  }

  for (const [key, impl] of Object.entries(cmpImpls)) {
    const pair = `${key}::${normalizeAddress(impl.address)}`;
    if (seenPairs.has(pair)) {
      continue;
    }

    if (key in merged) {
      const existingAddress = normalizeAddress(merged[key].address);
      const incomingAddress = normalizeAddress(impl.address);

      if (existingAddress !== incomingAddress) {
        throw new Error(
          `Impl key conflict for "${key}": "${merged[key].address}" vs "${impl.address}".`,
        );
      }

      seenPairs.add(pair);
      continue;
    }

    merged[key] = impl;
    seenPairs.add(pair);
  }

  return merged;
}

function parseInputPaths(argPath: string): {
  targetPath: string;
  cmpPath: string;
} {
  const targetPath = resolve(process.cwd(), argPath);
  const extension = extname(targetPath);
  const fileName = basename(targetPath, extension);
  const cmpPath = join(dirname(targetPath), `${fileName}.cmp${extension}`);

  return { targetPath, cmpPath };
}

function main(): void {
  const input = process.argv[2];
  if (!input) {
    throw new Error(
      'Usage: yarn oz:merge-manifest <path-to-manifest.json> (example: .openzeppelin/unknown-8453.json)',
    );
  }

  const { targetPath, cmpPath } = parseInputPaths(input);
  const baseManifest = JSON.parse(
    readFileSync(targetPath, 'utf8'),
  ) as OpenZeppelinManifest;
  const cmpManifest = JSON.parse(
    readFileSync(cmpPath, 'utf8'),
  ) as OpenZeppelinManifest;

  const mergedManifest: OpenZeppelinManifest = {
    ...baseManifest,
    proxies: mergeProxies(
      baseManifest.proxies ?? [],
      cmpManifest.proxies ?? [],
    ),
    impls: mergeImpls(baseManifest.impls ?? {}, cmpManifest.impls ?? {}),
  };

  writeFileSync(
    targetPath,
    `${JSON.stringify(mergedManifest, null, 2)}\n`,
    'utf8',
  );

  console.log(`Merged "${cmpPath}" into "${targetPath}"`);
  console.log(`Proxies merged: ${mergedManifest.proxies?.length ?? 0}`);
  console.log(
    `Impls merged: ${Object.keys(mergedManifest.impls ?? {}).length}`,
  );
}

main();
