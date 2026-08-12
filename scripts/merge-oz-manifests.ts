import { execFileSync } from 'child_process';
import { createHash, randomUUID } from 'crypto';
import {
  chmodSync,
  closeSync,
  fsyncSync,
  openSync,
  readFileSync,
  renameSync,
  statSync,
  unlinkSync,
  writeFileSync,
} from 'fs';
import { resolve } from 'path';
import { TextDecoder } from 'util';

export type JsonValue =
  | null
  | boolean
  | number
  | string
  | JsonValue[]
  | { [key: string]: JsonValue };

export type JsonObject = { [key: string]: JsonValue };

export interface OpenZeppelinManifest {
  [key: string]: JsonValue | undefined;
  manifestVersion: string;
  admin?: JsonObject;
  proxies: JsonObject[];
  impls: Record<string, JsonObject>;
}

export interface SideAudit {
  proxiesAdded: number;
  proxiesModified: number;
  implsAdded: number;
  implsModified: number;
}

export interface ManifestMergeResult {
  manifest: OpenZeppelinManifest;
  audit: { ours: SideAudit; theirs: SideAudit };
  digest: string;
}

export interface ManifestCounts {
  proxies: number;
  impls: number;
}

export interface ResolutionSummary {
  path: string;
  counts: {
    base: ManifestCounts;
    ours: ManifestCounts;
    theirs: ManifestCounts;
    result: ManifestCounts;
  };
  audit: { ours: SideAudit; theirs: SideAudit };
  digest: string;
}

function isJsonObject(value: unknown): value is JsonObject {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

export function decodeUtf8(bytes: Buffer, source: string): string {
  try {
    return new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(
      new Uint8Array(bytes.buffer, bytes.byteOffset, bytes.byteLength),
    );
  } catch {
    throw new Error(`${source}: invalid UTF-8`);
  }
}

function validateLosslessJsonText(text: string, source: string): void {
  let index = 0;

  const invalid = (message: string): never => {
    throw new Error(`${source}: invalid JSON at offset ${index}: ${message}`);
  };
  const skipWhitespace = (): void => {
    while (/\s/.test(text[index] ?? '')) index++;
  };
  const childPath = (path: string, key: string): string =>
    `${path}[${JSON.stringify(key)}]`;

  const parseString = (): string => {
    if (text[index] !== '"') invalid('expected a string');
    const start = index++;
    while (index < text.length) {
      const character = text[index++];
      if (character === '"') {
        try {
          return JSON.parse(text.slice(start, index)) as string;
        } catch {
          return invalid('invalid string escape or control character');
        }
      }
      if (character === '\\') index++;
    }
    return invalid('unterminated string');
  };

  const parseNumber = (path: string): void => {
    const start = index;
    if (text[index] === '-') index++;

    if (text[index] === '0') {
      index++;
    } else if (/[1-9]/.test(text[index] ?? '')) {
      while (/\d/.test(text[index] ?? '')) index++;
    } else {
      invalid('invalid number');
    }

    let nonIntegerSyntax = false;
    if (text[index] === '.') {
      nonIntegerSyntax = true;
      index++;
      if (!/\d/.test(text[index] ?? '')) invalid('invalid number fraction');
      while (/\d/.test(text[index] ?? '')) index++;
    }
    if (text[index] === 'e' || text[index] === 'E') {
      nonIntegerSyntax = true;
      index++;
      if (text[index] === '+' || text[index] === '-') index++;
      if (!/\d/.test(text[index] ?? '')) invalid('invalid number exponent');
      while (/\d/.test(text[index] ?? '')) index++;
    }

    const token = text.slice(start, index);
    if (nonIntegerSyntax || token === '-0') {
      throw new Error(`${source}: unsafe JSON number at ${path}`);
    }

    const integer = BigInt(token);
    if (
      integer < BigInt(Number.MIN_SAFE_INTEGER) ||
      integer > BigInt(Number.MAX_SAFE_INTEGER)
    ) {
      throw new Error(`${source}: unsafe JSON number at ${path}`);
    }
  };

  const parseValue = (path: string): void => {
    skipWhitespace();
    const character = text[index];

    if (character === '{') {
      index++;
      skipWhitespace();
      const keys = new Set<string>();
      if (text[index] === '}') {
        index++;
        return;
      }

      while (true) {
        skipWhitespace();
        const key = parseString();
        if (keys.has(key)) {
          throw new Error(
            `${source}: duplicate object key ${JSON.stringify(key)} at ${path}`,
          );
        }
        keys.add(key);
        skipWhitespace();
        if (text[index] !== ':') invalid('expected ":" after object key');
        index++;
        parseValue(childPath(path, key));
        skipWhitespace();
        if (text[index] === '}') {
          index++;
          return;
        }
        if (text[index] !== ',') invalid('expected "," or "}"');
        index++;
      }
    }

    if (character === '[') {
      index++;
      skipWhitespace();
      if (text[index] === ']') {
        index++;
        return;
      }

      let arrayIndex = 0;
      while (true) {
        parseValue(`${path}[${arrayIndex++}]`);
        skipWhitespace();
        if (text[index] === ']') {
          index++;
          return;
        }
        if (text[index] !== ',') invalid('expected "," or "]"');
        index++;
      }
    }

    if (character === '"') {
      parseString();
      return;
    }
    for (const literal of ['true', 'false', 'null']) {
      if (text.startsWith(literal, index)) {
        index += literal.length;
        return;
      }
    }
    if (character === '-' || /\d/.test(character ?? '')) {
      parseNumber(path);
      return;
    }
    invalid('expected a JSON value');
  };

  parseValue('$');
  skipWhitespace();
  if (index !== text.length) invalid('unexpected trailing content');
}

function validateJsonNumbers(
  value: unknown,
  source: string,
  path: string,
): void {
  if (typeof value === 'number') {
    if (!Number.isSafeInteger(value)) {
      throw new Error(`${source}: unsafe JSON number at ${path}`);
    }
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((item, index) =>
      validateJsonNumbers(item, source, `${path}[${index}]`),
    );
    return;
  }
  if (isJsonObject(value)) {
    for (const [key, item] of Object.entries(value)) {
      validateJsonNumbers(item, source, `${path}.${key}`);
    }
  }
}

export function parseManifest(
  text: string,
  source: string,
): OpenZeppelinManifest {
  validateLosslessJsonText(text, source);
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`${source}: invalid JSON: ${message}`);
  }

  validateJsonNumbers(value, source, '$');
  if (!isJsonObject(value)) {
    throw new Error(`${source}: manifest must be an object`);
  }
  if (typeof value.manifestVersion !== 'string') {
    throw new Error(`${source}: manifestVersion must be a string`);
  }
  if (!Array.isArray(value.proxies)) {
    throw new Error(`${source}: proxies must be an array`);
  }
  if (!isJsonObject(value.impls)) {
    throw new Error(`${source}: impls must be an object`);
  }
  if (value.admin !== undefined && !isJsonObject(value.admin)) {
    throw new Error(`${source}: admin must be an object when present`);
  }

  const addresses = new Set<string>();
  for (const [index, proxy] of value.proxies.entries()) {
    if (!isJsonObject(proxy)) {
      throw new Error(`${source}: proxy at index ${index} must be an object`);
    }
    if (typeof proxy.address !== 'string' || proxy.address.length === 0) {
      throw new Error(`${source}: proxy at index ${index} has no address`);
    }
    const address = proxy.address.toLowerCase();
    if (addresses.has(address)) {
      throw new Error(`${source}: duplicate proxy address "${address}"`);
    }
    addresses.add(address);
  }

  for (const [key, implementation] of Object.entries(value.impls)) {
    if (key.length === 0) {
      throw new Error(`${source}: implementation identity must not be empty`);
    }
    if (!isJsonObject(implementation)) {
      throw new Error(`${source}: implementation "${key}" must be an object`);
    }
  }

  return value as OpenZeppelinManifest;
}

export function canonicalStringify(value: unknown): string {
  if (value === undefined) {
    throw new Error('Cannot serialize undefined as JSON');
  }
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value))
    return `[${value.map((item) => canonicalStringify(item)).join(',')}]`;

  const objectValue = value as Record<string, unknown>;
  const keys = Object.keys(objectValue).sort();
  const serializedBody = keys
    .map(
      (key) => `${JSON.stringify(key)}:${canonicalStringify(objectValue[key])}`,
    )
    .join(',');

  return `{${serializedBody}}`;
}

function isDeepEqual(left: unknown, right: unknown): boolean {
  return canonicalStringify(left) === canonicalStringify(right);
}

function emptyAudit(): SideAudit {
  return {
    proxiesAdded: 0,
    proxiesModified: 0,
    implsAdded: 0,
    implsModified: 0,
  };
}

function hasOwn(object: object, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(object, key);
}

function mergeRecordMap(
  base: Map<string, JsonObject>,
  ours: Map<string, JsonObject>,
  theirs: Map<string, JsonObject>,
  section: 'proxies' | 'impls',
  path: string,
  audit: { ours: SideAudit; theirs: SideAudit },
): Map<string, JsonObject> {
  const merged = new Map<string, JsonObject>();
  const keys = [...ours.keys(), ...theirs.keys(), ...base.keys()];
  const addedField = section === 'proxies' ? 'proxiesAdded' : 'implsAdded';
  const modifiedField =
    section === 'proxies' ? 'proxiesModified' : 'implsModified';

  for (const key of new Set(keys)) {
    const inBase = base.has(key);
    const inOurs = ours.has(key);
    const inTheirs = theirs.has(key);
    const baseValue = base.get(key);
    const oursValue = ours.get(key);
    const theirsValue = theirs.get(key);

    if (!inBase) {
      if (inOurs && inTheirs) {
        if (!isDeepEqual(oursValue, theirsValue)) {
          throw new Error(
            `${path}: ${section} "${key}" was added differently in ours and theirs`,
          );
        }
        merged.set(key, oursValue as JsonObject);
        audit.ours[addedField]++;
        audit.theirs[addedField]++;
        continue;
      }

      const side = inOurs ? 'ours' : 'theirs';
      const value = inOurs ? oursValue : theirsValue;
      merged.set(key, value as JsonObject);
      audit[side][addedField]++;
      continue;
    }

    if (!inOurs || !inTheirs) {
      const side = !inOurs ? 'ours' : 'theirs';
      throw new Error(`${path}: ${section} "${key}" was deleted in ${side}`);
    }

    if (isDeepEqual(oursValue, theirsValue)) {
      merged.set(key, oursValue as JsonObject);
      if (!isDeepEqual(oursValue, baseValue)) {
        audit.ours[modifiedField]++;
        audit.theirs[modifiedField]++;
      }
    } else if (isDeepEqual(oursValue, baseValue)) {
      merged.set(key, theirsValue as JsonObject);
      audit.theirs[modifiedField]++;
    } else if (isDeepEqual(theirsValue, baseValue)) {
      merged.set(key, oursValue as JsonObject);
      audit.ours[modifiedField]++;
    } else {
      throw new Error(
        `${path}: ${section} "${key}" changed differently in ours and theirs`,
      );
    }
  }

  return merged;
}

function proxyMap(proxies: JsonObject[]): Map<string, JsonObject> {
  return new Map(
    proxies.map((proxy) => [String(proxy.address).toLowerCase(), proxy]),
  );
}

function mergeTopLevelValue(
  base: OpenZeppelinManifest,
  ours: OpenZeppelinManifest,
  theirs: OpenZeppelinManifest,
  key: string,
  path: string,
): JsonValue {
  const inBase = hasOwn(base, key);
  const inOurs = hasOwn(ours, key);
  const inTheirs = hasOwn(theirs, key);

  if (!inBase) {
    if (inOurs && inTheirs) {
      const oursValue = ours[key] as JsonValue;
      const theirsValue = theirs[key] as JsonValue;
      if (isDeepEqual(oursValue, theirsValue)) return oursValue;
      throw new Error(
        `${path}: top-level field "${key}" was added differently in ours and theirs`,
      );
    }
    return (inOurs ? ours[key] : theirs[key]) as JsonValue;
  }

  if (!inOurs || !inTheirs) {
    throw new Error(`${path}: top-level field "${key}" was deleted`);
  }

  const baseValue = base[key] as JsonValue;
  const oursValue = ours[key] as JsonValue;
  const theirsValue = theirs[key] as JsonValue;
  if (isDeepEqual(oursValue, theirsValue)) return oursValue;
  if (isDeepEqual(oursValue, baseValue)) return theirsValue;
  if (isDeepEqual(theirsValue, baseValue)) return oursValue;

  throw new Error(
    `${path}: top-level field "${key}" changed differently in ours and theirs`,
  );
}

export function mergeManifests(
  base: OpenZeppelinManifest,
  ours: OpenZeppelinManifest,
  theirs: OpenZeppelinManifest,
  path: string,
): ManifestMergeResult {
  const audit = { ours: emptyAudit(), theirs: emptyAudit() };
  const mergedProxies = mergeRecordMap(
    proxyMap(base.proxies),
    proxyMap(ours.proxies),
    proxyMap(theirs.proxies),
    'proxies',
    path,
    audit,
  );
  const mergedImpls = mergeRecordMap(
    new Map(Object.entries(base.impls)),
    new Map(Object.entries(ours.impls)),
    new Map(Object.entries(theirs.impls)),
    'impls',
    path,
    audit,
  );
  const allKeys = [
    ...Object.keys(ours),
    ...Object.keys(theirs),
    ...Object.keys(base),
  ];
  const mergedImplObject = Object.fromEntries(mergedImpls);
  const manifest = Object.fromEntries(
    [...new Set(allKeys)].map((key): [string, JsonValue] => {
      if (key === 'proxies') return [key, [...mergedProxies.values()]];
      if (key === 'impls') return [key, mergedImplObject];
      return [key, mergeTopLevelValue(base, ours, theirs, key, path)];
    }),
  ) as OpenZeppelinManifest;

  return {
    manifest,
    audit,
    digest: createHash('sha256')
      .update(canonicalStringify(manifest))
      .digest('hex'),
  };
}

interface MergeContext {
  base: string;
  ours: string;
  theirs: string;
}

interface PreparedResolution {
  absolutePath: string;
  output: string;
  summary: ResolutionSummary;
}

const GIT_MAX_BUFFER = 64 * 1024 * 1024;

function gitBytes(cwd: string, args: string[]): Buffer {
  return execFileSync('git', args, {
    cwd,
    maxBuffer: GIT_MAX_BUFFER,
  });
}

function git(cwd: string, args: string[]): string {
  return decodeUtf8(gitBytes(cwd, args), `git ${args[0]} output`);
}

function getMergeContext(cwd: string): MergeContext {
  const ours = git(cwd, ['rev-parse', 'HEAD']).trim();
  let theirs: string;
  try {
    theirs = git(cwd, ['rev-parse', '--verify', 'MERGE_HEAD']).trim();
  } catch {
    throw new Error('No active Git merge: MERGE_HEAD was not found');
  }

  const mergeBases = git(cwd, ['merge-base', '--all', ours, theirs])
    .trim()
    .split('\n')
    .filter(Boolean);
  if (mergeBases.length !== 1) {
    throw new Error(
      `Expected exactly one merge base, found ${mergeBases.length}`,
    );
  }

  return { base: mergeBases[0], ours, theirs };
}

function getChangedManifestPaths(cwd: string, context: MergeContext): string[] {
  const paths = new Set<string>();
  for (const side of [context.ours, context.theirs]) {
    const output = decodeUtf8(
      gitBytes(cwd, [
        'diff',
        '--name-only',
        '-z',
        '--no-renames',
        context.base,
        side,
        '--',
        '.openzeppelin',
      ]),
      `git diff paths for ${side}`,
    );
    for (const path of output.split('\0')) {
      if (/^\.openzeppelin\/[^/]+\.json$/.test(path)) paths.add(path);
    }
  }
  return [...paths].sort();
}

function readManifestBlob(cwd: string, commit: string, path: string): string {
  let blob: Buffer;
  try {
    blob = gitBytes(cwd, ['show', `${commit}:${path}`]);
  } catch {
    throw new Error(
      `${path} must exist in base, ours, and theirs; file additions and deletions require manual review`,
    );
  }
  return decodeUtf8(blob, `${commit}:${path}`);
}

function countManifest(manifest: OpenZeppelinManifest): ManifestCounts {
  return {
    proxies: manifest.proxies.length,
    impls: Object.keys(manifest.impls).length,
  };
}

function ownValue(object: object, key: string): unknown {
  return hasOwn(object, key)
    ? (object as Record<string, unknown>)[key]
    : undefined;
}

function assertWorkingManifestIsContainedInResult(
  current: OpenZeppelinManifest,
  result: OpenZeppelinManifest,
  path: string,
): void {
  const resultProxyMap = proxyMap(result.proxies);
  for (const [key, proxy] of proxyMap(current.proxies)) {
    if (
      !resultProxyMap.has(key) ||
      !isDeepEqual(proxy, resultProxyMap.get(key))
    ) {
      throw new Error(
        `${path} contains information absent from the computed result`,
      );
    }
  }

  for (const [key, implementation] of Object.entries(current.impls)) {
    if (
      !hasOwn(result.impls, key) ||
      !isDeepEqual(implementation, ownValue(result.impls, key))
    ) {
      throw new Error(
        `${path} contains information absent from the computed result`,
      );
    }
  }

  for (const [key, value] of Object.entries(current)) {
    if (key === 'proxies' || key === 'impls') continue;
    if (!hasOwn(result, key) || !isDeepEqual(value, ownValue(result, key))) {
      throw new Error(
        `${path} contains information absent from the computed result`,
      );
    }
  }
}

function assertWorkingFileIsSafe(
  cwd: string,
  path: string,
  result: OpenZeppelinManifest,
): void {
  const absolutePath = resolve(cwd, path);
  const text = decodeUtf8(readFileSync(absolutePath), `${path} working tree`);
  let current: OpenZeppelinManifest;
  try {
    current = parseManifest(text, `${path} working tree`);
  } catch (error) {
    try {
      JSON.parse(text);
    } catch {
      const hasConflictMarkers =
        /^<<<<<<<(?: .*)?$/m.test(text) &&
        /^=======$/m.test(text) &&
        /^>>>>>>>(?: .*)?$/m.test(text);
      const unmerged = git(cwd, ['ls-files', '--unmerged', '--', path]).trim();
      if (unmerged.length > 0 && hasConflictMarkers) return;
    }
    throw error;
  }
  assertWorkingManifestIsContainedInResult(current, result, path);
}

function prepareResolution(
  cwd: string,
  context: MergeContext,
  path: string,
): PreparedResolution {
  const base = parseManifest(
    readManifestBlob(cwd, context.base, path),
    `${path} at base ${context.base}`,
  );
  const ours = parseManifest(
    readManifestBlob(cwd, context.ours, path),
    `${path} at ours ${context.ours}`,
  );
  const theirs = parseManifest(
    readManifestBlob(cwd, context.theirs, path),
    `${path} at theirs ${context.theirs}`,
  );
  const result = mergeManifests(base, ours, theirs, path);
  assertWorkingFileIsSafe(cwd, path, result.manifest);

  return {
    absolutePath: resolve(cwd, path),
    output: `${JSON.stringify(result.manifest, null, 2)}\n`,
    summary: {
      path,
      counts: {
        base: countManifest(base),
        ours: countManifest(ours),
        theirs: countManifest(theirs),
        result: countManifest(result.manifest),
      },
      audit: result.audit,
      digest: result.digest,
    },
  };
}

function printSummary(summary: ResolutionSummary): void {
  const { base, ours, theirs, result } = summary.counts;
  console.log(`\n${summary.path}`);
  console.log(
    `  proxies: base ${base.proxies}, ours ${ours.proxies}, theirs ${theirs.proxies}, result ${result.proxies}`,
  );
  console.log(
    `  impls:   base ${base.impls}, ours ${ours.impls}, theirs ${theirs.impls}, result ${result.impls}`,
  );
  console.log(
    `  ours:    +${summary.audit.ours.proxiesAdded} proxies, ~${summary.audit.ours.proxiesModified} proxies, +${summary.audit.ours.implsAdded} impls, ~${summary.audit.ours.implsModified} impls`,
  );
  console.log(
    `  theirs:  +${summary.audit.theirs.proxiesAdded} proxies, ~${summary.audit.theirs.proxiesModified} proxies, +${summary.audit.theirs.implsAdded} impls, ~${summary.audit.theirs.implsModified} impls`,
  );
  console.log(
    '  safety:  0 deletions, 0 divergent collisions, 0 missing changes',
  );
  console.log(`  sha256:  ${summary.digest}`);
}

export function resolveManifestConflicts(
  cwd = process.cwd(),
): ResolutionSummary[] {
  const context = getMergeContext(cwd);
  const paths = getChangedManifestPaths(cwd, context);
  if (paths.length === 0) {
    throw new Error('No changed .openzeppelin/*.json manifests found');
  }

  console.log(`ours:   ${context.ours}`);
  console.log(`theirs: ${context.theirs}`);
  console.log(`base:   ${context.base}`);

  const prepared = paths.map((path) => prepareResolution(cwd, context, path));

  for (const item of prepared) {
    const temporaryPath = `${item.absolutePath}.merge-tmp-${
      process.pid
    }-${randomUUID()}`;
    const mode = statSync(item.absolutePath).mode & 0o777;
    let temporaryCreated = false;
    let descriptor: number | undefined;
    try {
      descriptor = openSync(temporaryPath, 'wx', mode);
      temporaryCreated = true;
      writeFileSync(descriptor, item.output, 'utf8');
      fsyncSync(descriptor);
      closeSync(descriptor);
      descriptor = undefined;
      chmodSync(temporaryPath, mode);
      renameSync(temporaryPath, item.absolutePath);
      temporaryCreated = false;
    } finally {
      if (descriptor !== undefined) {
        try {
          closeSync(descriptor);
        } catch {
          // Preserve the original write error.
        }
      }
      if (temporaryCreated) {
        try {
          unlinkSync(temporaryPath);
        } catch {
          // Preserve the original error; a unique temporary sibling is harmless.
        }
      }
    }

    const verified = parseManifest(
      decodeUtf8(
        readFileSync(item.absolutePath),
        `${item.summary.path} result`,
      ),
      `${item.summary.path} result`,
    );
    const digest = createHash('sha256')
      .update(canonicalStringify(verified))
      .digest('hex');
    if (digest !== item.summary.digest) {
      throw new Error(`${item.summary.path}: post-write digest mismatch`);
    }
    printSummary(item.summary);
  }

  return prepared.map((item) => item.summary);
}

if (require.main === module) {
  try {
    resolveManifestConflicts();
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  }
}
