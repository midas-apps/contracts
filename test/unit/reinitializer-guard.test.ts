import { expect } from 'chai';
import { ethers } from 'ethers';

import fs from 'fs';
import path from 'path';

import {
  assertReinitializerCovered,
  buildProbeCalldata,
  evaluateConsumed,
  evaluateGuard,
  getReinitializers,
  initializedSlotFromManifest,
  readInitializedVersion,
  reinitializerSelector,
  topReinitializer,
} from '../../scripts/upgrades/common/reinitializer';

const abi = [
  { type: 'function', name: 'initialize', inputs: [{ type: 'address' }] },
  { type: 'function', name: 'initializeV2', inputs: [{ type: 'uint256' }] },
  { type: 'function', name: 'initializeV3', inputs: [{ type: 'uint256' }] },
  { type: 'function', name: 'setRoundData', inputs: [{ type: 'int256' }] },
];

const V2 = {
  name: 'initializeV2',
  version: 2,
  selector: reinitializerSelector('initializeV2(uint256)'),
  signature: 'initializeV2(uint256)',
};
const V3 = {
  name: 'initializeV3',
  version: 3,
  selector: reinitializerSelector('initializeV3(uint256)'),
  signature: 'initializeV3(uint256)',
};
const callTo = (sel: string) => sel + '00'.repeat(32); // selector + one uint256 arg

describe('reinitializer helper', () => {
  it('detects initializeV{N} functions with versions and selectors', () => {
    const rs = getReinitializers(abi);
    expect(rs.map((r) => r.version)).to.deep.equal([2, 3]);
    expect(rs[0].name).to.equal('initializeV2');
    expect(rs[0].selector).to.equal(
      reinitializerSelector('initializeV2(uint256)'),
    );
    expect(topReinitializer(rs)!.version).to.equal(3);
  });

  it('returns empty for an ABI with no reinitializers', () => {
    expect(getReinitializers([abi[0], abi[3]])).to.deep.equal([]);
    expect(topReinitializer([])).to.equal(undefined);
  });
});

describe('evaluateGuard', () => {
  it('passes when impl adds no reinitializer beyond onchain', () => {
    expect(
      evaluateGuard({
        reinits: [V2],
        implVersionsPresent: [2],
        onchainVersion: 2,
      }).ok,
    ).to.equal(true);
  });

  it('fails when impl introduces V2 (onchain 1) and no initializer calldata', () => {
    const r = evaluateGuard({
      reinits: [V2],
      implVersionsPresent: [2],
      onchainVersion: 1,
    });
    expect(r.ok).to.equal(false);
  });

  it('passes when calldata calls the top reinitializer', () => {
    expect(
      evaluateGuard({
        reinits: [V2],
        implVersionsPresent: [2],
        onchainVersion: 1,
        initializerCalldata: callTo(V2.selector),
      }).ok,
    ).to.equal(true);
  });

  it('fails when calldata calls V2 but impl also has unconsumed V3', () => {
    const r = evaluateGuard({
      reinits: [V2, V3],
      implVersionsPresent: [2, 3],
      onchainVersion: 1,
      initializerCalldata: callTo(V2.selector),
    });
    expect(r.ok).to.equal(false);
  });

  it('passes when calldata calls the top V3', () => {
    expect(
      evaluateGuard({
        reinits: [V2, V3],
        implVersionsPresent: [2, 3],
        onchainVersion: 1,
        initializerCalldata: callTo(V3.selector),
      }).ok,
    ).to.equal(true);
  });

  it('passes when contract has no reinitializers', () => {
    expect(
      evaluateGuard({
        reinits: [],
        implVersionsPresent: [],
        onchainVersion: 1,
      }).ok,
    ).to.equal(true);
  });
});

describe('evaluateConsumed', () => {
  it('passes when onchain == top version and probe not OPEN', () => {
    expect(
      evaluateConsumed({
        reinits: [V2],
        implVersionsPresent: [2],
        onchainVersion: 2,
        topProbe: 'CONSUMED',
      }).ok,
    ).to.equal(true);
  });

  it('fails when onchain behind top version', () => {
    expect(
      evaluateConsumed({
        reinits: [V2, V3],
        implVersionsPresent: [2, 3],
        onchainVersion: 2,
        topProbe: 'CONSUMED',
      }).ok,
    ).to.equal(false);
  });

  it('fails when probe reports still OPEN', () => {
    expect(
      evaluateConsumed({
        reinits: [V2],
        implVersionsPresent: [2],
        onchainVersion: 2,
        topProbe: 'OPEN',
      }).ok,
    ).to.equal(false);
  });

  it('passes when contract has no reinitializer on impl', () => {
    expect(
      evaluateConsumed({
        reinits: [V2],
        implVersionsPresent: [],
        onchainVersion: 1,
        topProbe: 'NA',
      }).ok,
    ).to.equal(true);
  });
});

describe('probe calldata', () => {
  it('carries the canonical signature on detected reinitializers', () => {
    const rs = getReinitializers(abi);
    expect(rs[0].signature).to.equal('initializeV2(uint256)');
  });

  it('builds canonical signatures for tuple/array inputs', () => {
    const tupleAbi = [
      {
        type: 'function',
        name: 'initializeV4',
        inputs: [
          {
            type: 'tuple',
            components: [{ type: 'address' }, { type: 'uint96' }],
          },
          { type: 'bytes32[]' },
        ],
      },
    ];
    const [r] = getReinitializers(tupleAbi);
    expect(r.signature).to.equal('initializeV4((address,uint96),bytes32[])');
    expect(r.selector).to.equal(reinitializerSelector(r.signature));
  });

  it('encodes zero-value args for a single uint256 (legacy behavior)', () => {
    expect(buildProbeCalldata('initializeV2(uint256)')).to.equal(
      V2.selector + '00'.repeat(32),
    );
  });

  it('encodes zero-value args for arbitrary signatures', () => {
    const sig = 'initializeV5(address,bool,bytes,uint256[2],(address,uint96))';
    const data = buildProbeCalldata(sig);
    expect(data.slice(0, 10)).to.equal(reinitializerSelector(sig));
  });
});

describe('manifest slot resolution', () => {
  const IMPL_A = '0xEFb2E28b69A29A39067b20aF633d04A2857a4D9d';
  const IMPL_B = '0x' + '11'.repeat(20);
  const manifest = {
    impls: {
      hashA: {
        address: IMPL_A,
        layout: {
          storage: [
            { label: '_initialized', offset: 0, slot: '0', type: 't_uint8' },
          ],
        },
      },
      hashB: {
        address: IMPL_B,
        layout: {
          storage: [
            { label: 'other', offset: 0, slot: '0' },
            { label: '_initialized', offset: 1, slot: '7', type: 't_uint8' },
          ],
        },
      },
    },
  };

  it('resolves slot and offset, case-insensitively', () => {
    expect(
      initializedSlotFromManifest(manifest, IMPL_A.toLowerCase()),
    ).to.deep.equal({ slot: 0, offset: 0 });
    expect(initializedSlotFromManifest(manifest, IMPL_B)).to.deep.equal({
      slot: 7,
      offset: 1,
    });
  });

  it('returns undefined for unknown impl or missing manifest', () => {
    expect(
      initializedSlotFromManifest(manifest, '0x' + '22'.repeat(20)),
    ).to.equal(undefined);
    expect(initializedSlotFromManifest(undefined, IMPL_A)).to.equal(undefined);
  });

  it('reads the byte at the resolved slot offset', async () => {
    const provider = {
      getStorageAt: async () => '0x' + '00'.repeat(30) + '05' + '03',
    } as unknown as ethers.providers.Provider;
    expect(
      await readInitializedVersion(provider, IMPL_A, { slot: 0, offset: 0 }),
    ).to.equal(3);
    expect(
      await readInitializedVersion(provider, IMPL_A, { slot: 0, offset: 1 }),
    ).to.equal(5);
  });
});

describe('assertReinitializerCovered (stubbed provider)', () => {
  const IMPL_ADDR = '0x' + 'aa'.repeat(20);
  const PROXY = '0x' + 'bb'.repeat(20);
  const CHAIN_ID = 424242;
  const fixtureManifest = {
    impls: {
      h: {
        address: IMPL_ADDR,
        layout: {
          storage: [
            { label: '_initialized', offset: 0, slot: '0', type: 't_uint8' },
          ],
        },
      },
    },
  };
  const stubProvider = (opts: { code: string; storage?: string }) =>
    ({
      getNetwork: async () => ({ chainId: CHAIN_ID, name: 'stub' }),
      getCode: async () => opts.code,
      getStorageAt: async () => opts.storage ?? '0x' + '00'.repeat(31) + '01',
    } as unknown as ethers.providers.Provider);
  const codeWithV2 = '0x6080' + V2.selector.slice(2) + 'ffff';

  const run = (input: Parameters<typeof assertReinitializerCovered>[0]) =>
    assertReinitializerCovered(input).then(
      () => undefined,
      (e: Error) => e,
    );

  it('hard-fails when the slot cannot be resolved from the manifest', async () => {
    const err = await run({
      provider: stubProvider({ code: codeWithV2 }),
      proxyAddress: PROXY,
      newImplementation: IMPL_ADDR,
      abi,
      getManifest: () => undefined,
    });
    expect(err?.message).to.match(
      /cannot resolve the _initialized storage slot/,
    );
    expect(err?.message).to.contain(`unknown-${CHAIN_ID}.json`);
  });

  it('never consults the manifest when the ABI has no reinitializers', async () => {
    const err = await run({
      provider: stubProvider({ code: '0x6080' }),
      proxyAddress: PROXY,
      newImplementation: IMPL_ADDR,
      abi: [abi[0], abi[3]],
      getManifest: () => {
        throw new Error('manifest must not be consulted');
      },
    });
    expect(err).to.equal(undefined);
  });

  it('throws when a new reinitializer is not covered by upgradeAndCall', async () => {
    const err = await run({
      provider: stubProvider({ code: codeWithV2 }),
      proxyAddress: PROXY,
      newImplementation: IMPL_ADDR,
      abi,
      getManifest: () => fixtureManifest,
    });
    expect(err?.message).to.contain('initializeV2');
  });

  it('passes when the upgrade calls the top reinitializer atomically', async () => {
    const err = await run({
      provider: stubProvider({ code: codeWithV2 }),
      proxyAddress: PROXY,
      newImplementation: IMPL_ADDR,
      abi,
      initializerCalldata: callTo(V2.selector),
      getManifest: () => fixtureManifest,
    });
    expect(err).to.equal(undefined);
  });
});

describe('reinitializer naming policy (Solidity source scan)', () => {
  // The tooling guard detects reinitializers by the `initializeV<N>` name
  // (scripts/upgrades/common/reinitializer.ts). This test makes that naming
  // convention mandatory at the contract layer: any public/external function
  // with a `reinitializer(N)` modifier must be named `initializeV<N>`, so a
  // differently-named reinitializer can never slip past the upgrade guard.
  // Private/internal reinitializers are exempt (not externally callable).
  const listSolFiles = (dir: string): string[] =>
    fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) return listSolFiles(p);
      return e.name.endsWith('.sol') ? [p] : [];
    });

  it('public/external reinitializer(N) functions are named initializeV<N>', () => {
    const root = path.join(__dirname, '../../contracts');
    const files = listSolFiles(root);
    expect(files.length, 'no Solidity sources found — scan is broken').gt(0);

    const violations: string[] = [];
    for (const file of files) {
      const rel = path.relative(root, file);
      const src = fs
        .readFileSync(file, 'utf8')
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .replace(/\/\/.*$/gm, '');
      const fnRe = /function\s+([A-Za-z0-9_$]+)\s*\(([^)]*)\)([^{;]*)/g;
      let m: RegExpExecArray | null;
      while ((m = fnRe.exec(src))) {
        const [, name, , header] = m;
        const reinit = /\breinitializer\s*\(\s*(\d+)\s*\)/.exec(header);
        if (!reinit) continue;
        if (!/\b(public|external)\b/.test(header)) continue;
        if (name !== `initializeV${reinit[1]}`) {
          violations.push(
            `${rel}: ${name} is public/external reinitializer(${reinit[1]}) — rename to initializeV${reinit[1]} or make it internal`,
          );
        }
      }
    }
    expect(violations, violations.join('\n')).to.deep.equal([]);
  });
});
