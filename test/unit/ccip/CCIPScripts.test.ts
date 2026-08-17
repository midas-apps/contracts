import { expect } from 'chai';

import { existsSync } from 'fs';
import { resolve } from 'path';

import {
  buildHubRoutes,
  buildPeerEscrowUpdates,
  buildRateLimiterConfig,
  classifyRecovery,
  encodeEvmAddress,
  reconcileChainConfig,
  reconcileRecoveryEvents,
  sendDirect,
  sendReturn,
  validateCcipV2Readiness,
} from '../../../scripts/deploy/misc/ccip/helpers';

const address = (suffix: string) => `0x${suffix.padStart(40, '0')}`;

const healthyReadiness = () => ({
  topology: {
    hub: 'ethereum',
    spokes: ['base'],
    configuredEdges: [
      ['ethereum', 'base'],
      ['base', 'ethereum'],
    ],
  },
  ramps: {
    outboundTypeAndVersion: 'OnRamp 2.0.0',
    inboundTypeAndVersion: 'OffRamp 2.0.0',
    reverseOutboundTypeAndVersion: 'OnRamp 2.0.0',
    reverseInboundTypeAndVersion: 'OffRamp 2.0.0',
    routerTypeAndVersion: 'Router 1.2.0',
  },
  registry: {
    administratorAccepted: true,
    localPoolMatches: true,
    remoteTokenMatches: true,
    remotePoolsMatch: true,
    bothDirections: true,
  },
  tokenPolicy: {
    poolIsMinter: true,
    poolIsBurner: true,
    poolIsGreenlisted: true,
    poolIsBlacklisted: false,
    escrowIsGreenlisted: true,
    escrowIsBlacklisted: false,
  },
  escrow: {
    poolMatches: true,
    tokenMatches: true,
    accessControlMatches: true,
    fallbackInterfaceSupported: true,
    fallbackLinked: true,
    defaultRecipientValid: true,
    sharedAdminConfigured: true,
    solvent: true,
  },
  peers: { bothDirections: true },
  decimals: { local: 18, remote: 18, pool: 18 },
  fees: { poolOverrideEnabled: false, midasFeeBps: 0, flatFee: 0 },
  gas: {
    sourceTokenDataBytes: 32,
    measuredTokenHandlingGas: 85_000,
    configuredTokenHandlingGas: 90_000,
    supportedTokenHandlingGas: 90_000,
  },
  deployment: {
    poolDeployed: true,
    escrowInitialized: true,
    fallbackLinked: true,
    rolesAndPolicyConfigured: true,
    remotePoolsConfigured: true,
  },
});

describe('Midas CCIP deployment and readiness helpers', () => {
  it('builds only both directions of each hub-spoke edge', () => {
    const routes = buildHubRoutes({
      hub: 'ethereum',
      spokes: ['base', 'avalanche', 'base', 'monad'],
    });
    expect(routes).deep.eq([
      { source: 'ethereum', destination: 'base' },
      { source: 'base', destination: 'ethereum' },
      { source: 'ethereum', destination: 'avalanche' },
      { source: 'avalanche', destination: 'ethereum' },
      { source: 'ethereum', destination: 'monad' },
      { source: 'monad', destination: 'ethereum' },
    ]);
    expect(
      routes.some(
        ({ source, destination }) =>
          source !== 'ethereum' && destination !== 'ethereum',
      ),
    ).eq(false);
  });

  it('ABI-encodes every remote EVM token and pool address to 32 bytes', () => {
    const encoded = encodeEvmAddress(address('1234'));
    expect(encoded).eq(
      `0x${'0'.repeat(24)}${address('1234').slice(2).toLowerCase()}`,
    );
    expect(encoded.length).eq(66);
  });

  it('produces the exact disabled config when a rate limit is omitted', () => {
    expect(buildRateLimiterConfig()).deep.eq({
      capacity: '0',
      rate: '0',
      isEnabled: false,
    });
  });

  it('rejects every invalid enabled rate-limit boundary', () => {
    const build = buildRateLimiterConfig;
    for (const invalid of [
      { capacity: 0, window: 1 },
      { capacity: 1, window: 0 },
      { capacity: 1, window: 2 },
      { capacity: 10, window: 0.5 },
      { capacity: -1, window: 1 },
      { capacity: 10, window: Number.NaN },
    ]) {
      expect(() => build(invalid)).throws();
    }
    expect(build({ capacity: 10, window: 2 })).deep.eq({
      capacity: '10',
      rate: '5',
      isEnabled: true,
    });
  });

  it('emits no reconciliation update when current config is exact', () => {
    const config = {
      remoteChainSelector: '2',
      remotePoolAddresses: [encodeEvmAddress(address('22'))],
      remoteTokenAddress: encodeEvmAddress(address('33')),
      inboundRateLimiterConfig: {
        capacity: '0',
        rate: '0',
        isEnabled: false,
      },
      outboundRateLimiterConfig: {
        capacity: '10',
        rate: '1',
        isEnabled: true,
      },
    };
    expect(
      reconcileChainConfig({
        current: [config],
        desired: [{ ...config }],
      }),
    ).deep.eq({ chainsToRemove: [], chainsToUpdate: [] });

    const replacement = {
      ...config,
      remoteTokenAddress: encodeEvmAddress(address('44')),
    };
    expect(
      reconcileChainConfig({
        current: [config],
        desired: [replacement],
      }),
    ).deep.eq({
      chainsToRemove: ['2'],
      chainsToUpdate: [replacement],
    });
  });

  it('keeps one reconciliation script for initial and later config', () => {
    expect(
      existsSync(
        resolve(
          process.cwd(),
          'scripts/deploy/misc/ccip/set_InitialChainConfigs.ts',
        ),
      ),
    ).eq(false);
    expect(
      existsSync(
        resolve(process.cwd(), 'scripts/deploy/misc/ccip/set_ChainConfigs.ts'),
      ),
    ).eq(true);
  });

  it('requires OnRamp and OffRamp 2.0 in both directions', () => {
    const validate = validateCcipV2Readiness;
    expect(validate(healthyReadiness()).ready).eq(true);
    for (const [field, value] of [
      ['outboundTypeAndVersion', 'OnRamp 1.6.0'],
      ['inboundTypeAndVersion', 'OffRamp 1.6.0'],
      ['reverseOutboundTypeAndVersion', 'OnRamp 1.6.0'],
      ['reverseInboundTypeAndVersion', 'OffRamp 1.6.0'],
    ]) {
      const input = healthyReadiness();
      (input.ramps as Record<string, string>)[field] = value;
      const result = validate(input);
      expect(result.ready).eq(false);
      expect(result.errors.join(' ')).contains(field);
    }
  });

  it('validates registry, pool, token, mappings, and both directions', () => {
    const validate = validateCcipV2Readiness;
    for (const field of [
      'administratorAccepted',
      'localPoolMatches',
      'remoteTokenMatches',
      'remotePoolsMatch',
      'bothDirections',
    ]) {
      const input = healthyReadiness();
      (input.registry as Record<string, boolean>)[field] = false;
      const result = validate(input);
      expect(result.ready).eq(false);
      expect(result.errors.join(' ')).contains(field);
    }
  });

  it('validates pool/escrow roles and permissioned-token policy', () => {
    const validate = validateCcipV2Readiness;
    for (const field of [
      'poolIsMinter',
      'poolIsBurner',
      'poolIsGreenlisted',
      'escrowIsGreenlisted',
    ]) {
      const input = healthyReadiness();
      (input.tokenPolicy as Record<string, boolean>)[field] = false;
      expect(validate(input).ready).eq(false);
    }
    for (const field of ['poolIsBlacklisted', 'escrowIsBlacklisted']) {
      const input = healthyReadiness();
      (input.tokenPolicy as Record<string, boolean>)[field] = true;
      expect(validate(input).ready).eq(false);
    }
  });

  it('validates every escrow trust link, role, and solvency field', () => {
    const validate = validateCcipV2Readiness;
    for (const field of Object.keys(healthyReadiness().escrow)) {
      const input = healthyReadiness();
      (input.escrow as Record<string, boolean>)[field] = false;
      const result = validate(input);
      expect(result.ready).eq(false);
      expect(result.errors.join(' ')).contains(field);
    }
  });

  it('requires peer escrow provenance in both directions', () => {
    expect(
      existsSync(
        resolve(process.cwd(), 'scripts/deploy/misc/ccip/set_PeerEscrows.ts'),
      ),
    ).eq(true);

    const routes = buildHubRoutes({
      hub: 'ethereum',
      spokes: ['base'],
    });
    expect(
      buildPeerEscrowUpdates({
        routes,
        chains: {
          ethereum: { selector: 1, escrow: address('11') },
          base: { selector: 2, escrow: address('22') },
        },
      }),
    ).deep.eq([
      {
        network: 'base',
        sourceChainSelector: '1',
        peerEscrow: address('11'),
      },
      {
        network: 'ethereum',
        sourceChainSelector: '2',
        peerEscrow: address('22'),
      },
    ]);

    const input = healthyReadiness();
    input.peers.bothDirections = false;
    const result = validateCcipV2Readiness(input);
    expect(result.ready).eq(false);
    expect(result.errors.join(' ')).contains('bothDirections');
  });

  it('requires 18 decimals for token and pool on both sides', () => {
    const validate = validateCcipV2Readiness;
    for (const field of ['local', 'remote', 'pool']) {
      const input = healthyReadiness();
      (input.decimals as Record<string, number>)[field] = 6;
      expect(validate(input).ready).eq(false);
    }
  });

  it('rejects any silently enabled Midas fee policy', () => {
    const validate = validateCcipV2Readiness;
    for (const change of [
      { poolOverrideEnabled: true },
      { midasFeeBps: 1 },
      { flatFee: 1 },
    ]) {
      const input = healthyReadiness();
      input.fees = { ...input.fees, ...change };
      expect(validate(input).ready).eq(false);
    }
  });

  it('validates 32-byte pool data and measured/supported gas bounds', () => {
    const validate = validateCcipV2Readiness;
    expect(validate(healthyReadiness()).ready).eq(true);

    const wrongBytes = healthyReadiness();
    wrongBytes.gas.sourceTokenDataBytes = 33;
    expect(validate(wrongBytes).ready).eq(false);

    const underfunded = healthyReadiness();
    underfunded.gas.measuredTokenHandlingGas = 90_001;
    expect(validate(underfunded).ready).eq(false);

    const unsupported = healthyReadiness();
    unsupported.gas.configuredTokenHandlingGas = 90_001;
    expect(validate(unsupported).ready).eq(false);
  });

  it('blocks readiness until every ordered deployment dependency exists', () => {
    const validate = validateCcipV2Readiness;
    const input = healthyReadiness();
    const ordered = [
      'poolDeployed',
      'escrowInitialized',
      'fallbackLinked',
      'rolesAndPolicyConfigured',
      'remotePoolsConfigured',
    ];
    for (const field of ordered) {
      (input.deployment as Record<string, boolean>)[field] = false;
      expect(validate(input).ready).eq(false);
      (input.deployment as Record<string, boolean>)[field] = true;
    }
    expect(validate(input).ready).eq(true);
  });

  it('quotes and sends the same direct message with exact native fee', async () => {
    const calls: Array<Record<string, unknown>> = [];
    const message = { receiver: '0x1234', tokenAmounts: [{ amount: 1 }] };
    const router = {
      getFee: async (selector: number, value: Record<string, unknown>) => {
        calls.push({ method: 'getFee', selector, value });
        return 17;
      },
      ccipSend: async (
        selector: number,
        value: Record<string, unknown>,
        overrides: Record<string, unknown>,
      ) => {
        calls.push({ method: 'ccipSend', selector, value, overrides });
        return {
          wait: async () => ({
            events: [
              { event: 'CCIPMessageSent', args: { messageId: '0xmessage' } },
            ],
          }),
        };
      },
    };
    const result = await sendDirect({
      router,
      destinationChainSelector: 2,
      message,
    });

    expect(calls).deep.eq([
      { method: 'getFee', selector: 2, value: message },
      {
        method: 'ccipSend',
        selector: 2,
        value: message,
        overrides: { value: 17 },
      },
    ]);
    expect(result).includes({ fee: 17, messageId: '0xmessage' });
  });

  it('quotes immediately before fixed return and reports refund/outbound ID', async () => {
    const calls: Array<Record<string, unknown>> = [];
    const escrow = {
      getReturnToSourceFee: async (recoveryId: string) => {
        calls.push({ method: 'getReturnToSourceFee', recoveryId });
        return 12;
      },
      returnToSource: async (
        recoveryId: string,
        overrides: Record<string, unknown>,
      ) => {
        calls.push({ method: 'returnToSource', recoveryId, overrides });
        return {
          wait: async () => ({
            events: [
              {
                event: 'RecoveryReturnDispatched',
                args: { outboundCcipMessageId: '0xoutbound' },
              },
            ],
          }),
        };
      },
    };
    const result = await sendReturn({
      escrow,
      recoveryId: '0xrecovery',
      maximumFee: 20,
    });

    expect(calls).deep.eq([
      { method: 'getReturnToSourceFee', recoveryId: '0xrecovery' },
      {
        method: 'returnToSource',
        recoveryId: '0xrecovery',
        overrides: { value: 20 },
      },
    ]);
    expect(result).includes({
      quote: 12,
      maximumFee: 20,
      expectedRefund: 8,
      outboundCcipMessageId: '0xoutbound',
    });
  });

  it('re-reads records and accounting instead of trusting indexed events', async () => {
    const reads: string[] = [];
    const result = await reconcileRecoveryEvents({
      events: [
        { blockHash: 'old', recoveryId: 'one', status: 'Pending' },
        { blockHash: 'replacement', recoveryId: 'one', status: 'Claimed' },
        { blockHash: 'replacement', recoveryId: 'two', status: 'Pending' },
      ],
      readRecovery: async (recoveryId) => {
        reads.push(recoveryId);
        return {
          recoveryId,
          status: recoveryId === 'one' ? 'Claimed' : 'Pending',
        };
      },
      readAccounting: async () => ({ pendingCount: 1, totalReserved: 7 }),
    });

    expect(reads.sort()).deep.eq(['one', 'two']);
    expect(result).deep.includes({ pendingCount: 1, totalReserved: 7 });
  });

  it('rejects legacy all/full-mesh topology requests', () => {
    expect(() =>
      buildHubRoutes({
        hub: 'ethereum',
        spokes: ['base', 'avalanche'],
        pathways: 'all',
      }),
    ).throws(/hub|topology|pathway/i);
  });

  it('classifies only consistent CCIP/escrow observations automatically', () => {
    const classify = classifyRecovery;
    expect(
      classify({
        ccipState: 'SUCCESS',
        fundedRecoveryStatus: 'Pending',
        hasRegistrationEvent: true,
      }),
    ).eq('ESCROW_RECOVERY');
    expect(
      classify({
        ccipState: 'FAILURE',
        hasRegistrationEvent: false,
      }),
    ).eq('CHAINLINK_MANUAL_EXECUTION');
    expect(
      classify({
        ccipState: 'SUCCESS',
        fundedRecoveryStatus: 'Pending',
        hasRegistrationEvent: false,
      }),
    ).eq('MANUAL_REVIEW');
    expect(
      classify({
        ccipState: 'FAILURE',
        fundedRecoveryStatus: 'Pending',
        hasRegistrationEvent: true,
      }),
    ).eq('MANUAL_REVIEW');
  });
});
