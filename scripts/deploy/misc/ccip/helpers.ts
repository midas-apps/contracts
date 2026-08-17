import { BigNumber, BigNumberish, ethers } from 'ethers';

export type HubRoute = { source: string; destination: string };

export type RateLimiterConfig = {
  capacity: string;
  rate: string;
  isEnabled: boolean;
};

type TransactionReceiptLike = {
  events?: Array<{
    event?: string;
    args?: Record<string, unknown>;
  }>;
};

type TransactionLike = {
  wait(): Promise<TransactionReceiptLike>;
};

const numericValue = (value: unknown): string | undefined => {
  if (BigNumber.isBigNumber(value)) return value.toString();
  if (typeof value === 'number' && Number.isSafeInteger(value)) {
    return value.toString();
  }
  if (typeof value === 'string' && /^\d+$/.test(value)) {
    return BigNumber.from(value).toString();
  }
  return undefined;
};

const normalize = (value: unknown): unknown => {
  const numeric = numericValue(value);
  if (numeric !== undefined) return numeric;
  if (typeof value === 'string' && /^0x[0-9a-f]+$/i.test(value)) {
    return value.toLowerCase();
  }
  if (Array.isArray(value)) return value.map(normalize);
  if (value !== null && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, nested]) => [key, normalize(nested)]),
    );
  }
  return value;
};

const equalConfig = (left: unknown, right: unknown) =>
  JSON.stringify(normalize(left)) === JSON.stringify(normalize(right));

export const buildHubRoutes = (config: {
  hub: string;
  spokes: string[];
  pathways?: string;
}): HubRoute[] => {
  if (config.pathways !== undefined && config.pathways !== 'direct-only') {
    throw new Error('CCIP topology supports hub pathways only');
  }
  if (!config.hub || config.spokes.length === 0) {
    throw new Error('CCIP hub topology is incomplete');
  }

  const routes: HubRoute[] = [];
  for (const spoke of [...new Set(config.spokes)]) {
    if (!spoke || spoke === config.hub) {
      throw new Error('CCIP hub and spoke must be distinct');
    }
    routes.push(
      { source: config.hub, destination: spoke },
      { source: spoke, destination: config.hub },
    );
  }
  return routes;
};

export const buildPeerEscrowUpdates = (params: {
  routes: HubRoute[];
  chains: Record<
    string,
    { selector: BigNumberish; escrow: string } | undefined
  >;
}) =>
  params.routes.map(({ source, destination }) => {
    const sourceChain = params.chains[source];
    const destinationChain = params.chains[destination];
    if (!sourceChain || !destinationChain) {
      throw new Error(
        `Missing CCIP peer metadata for ${source} -> ${destination}`,
      );
    }
    return {
      network: destination,
      sourceChainSelector: BigNumber.from(sourceChain.selector).toString(),
      peerEscrow: ethers.utils.getAddress(sourceChain.escrow),
    };
  });

export const encodeEvmAddress = (address: string) =>
  ethers.utils.defaultAbiCoder.encode(
    ['address'],
    [ethers.utils.getAddress(address)],
  );

export const buildRateLimiterConfig = (config?: {
  capacity: BigNumberish;
  window: number;
}): RateLimiterConfig => {
  if (config === undefined) {
    return { capacity: '0', rate: '0', isEnabled: false };
  }
  if (!Number.isSafeInteger(config.window) || config.window <= 0) {
    throw new Error('CCIP rate-limit window must be a positive integer');
  }

  let capacity: BigNumber;
  try {
    capacity = BigNumber.from(config.capacity);
  } catch {
    throw new Error('CCIP rate-limit capacity must be a positive integer');
  }
  if (capacity.lte(0)) {
    throw new Error('CCIP rate-limit capacity must be positive');
  }

  const window = BigNumber.from(config.window);
  const rate = capacity.div(window);
  if (rate.isZero() || rate.gt(capacity)) {
    throw new Error('CCIP rate-limit window produces an invalid rate');
  }

  return {
    capacity: capacity.toString(),
    rate: rate.toString(),
    isEnabled: true,
  };
};

export const reconcileChainConfig = <
  T extends { remoteChainSelector: string | number },
>(params: {
  current: T[];
  desired: T[];
}) => {
  const desiredBySelector = new Map(
    params.desired.map((config) => [
      BigNumber.from(config.remoteChainSelector).toString(),
      config,
    ]),
  );
  const currentBySelector = new Map(
    params.current.map((config) => [
      BigNumber.from(config.remoteChainSelector).toString(),
      config,
    ]),
  );

  const chainsToRemove = params.current
    .filter((config) => {
      const desired = desiredBySelector.get(
        BigNumber.from(config.remoteChainSelector).toString(),
      );
      return desired === undefined || !equalConfig(config, desired);
    })
    .map((config) => config.remoteChainSelector);
  const chainsToUpdate = params.desired.filter((desired) => {
    const current = currentBySelector.get(
      BigNumber.from(desired.remoteChainSelector).toString(),
    );
    return current === undefined || !equalConfig(current, desired);
  });

  return { chainsToRemove, chainsToUpdate };
};

const recordSection = (
  input: Record<string, unknown>,
  name: string,
  errors: string[],
) => {
  const value = input[name];
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    errors.push(name);
    return {} as Record<string, unknown>;
  }
  return value as Record<string, unknown>;
};

const requireTrue = (
  section: Record<string, unknown>,
  fields: string[],
  errors: string[],
) => {
  for (const field of fields) {
    if (section[field] !== true) errors.push(field);
  }
};

export const validateCcipV2Readiness = (input: Record<string, unknown>) => {
  const errors: string[] = [];

  const topology = recordSection(input, 'topology', errors);
  try {
    const expected = buildHubRoutes({
      hub: String(topology.hub ?? ''),
      spokes: Array.isArray(topology.spokes) ? topology.spokes.map(String) : [],
    });
    const configured = Array.isArray(topology.configuredEdges)
      ? topology.configuredEdges.map((edge) => {
          if (!Array.isArray(edge) || edge.length !== 2) return null;
          return { source: String(edge[0]), destination: String(edge[1]) };
        })
      : [];
    if (
      configured.some((edge) => edge === null) ||
      !equalConfig(configured, expected)
    ) {
      errors.push('configuredEdges');
    }
  } catch {
    errors.push('topology');
  }

  const ramps = recordSection(input, 'ramps', errors);
  for (const [field, prefix] of [
    ['outboundTypeAndVersion', 'OnRamp 2.'],
    ['inboundTypeAndVersion', 'OffRamp 2.'],
    ['reverseOutboundTypeAndVersion', 'OnRamp 2.'],
    ['reverseInboundTypeAndVersion', 'OffRamp 2.'],
  ] as const) {
    if (!String(ramps[field] ?? '').startsWith(prefix)) errors.push(field);
  }

  requireTrue(
    recordSection(input, 'registry', errors),
    [
      'administratorAccepted',
      'localPoolMatches',
      'remoteTokenMatches',
      'remotePoolsMatch',
      'bothDirections',
    ],
    errors,
  );

  const tokenPolicy = recordSection(input, 'tokenPolicy', errors);
  requireTrue(
    tokenPolicy,
    [
      'poolIsMinter',
      'poolIsBurner',
      'poolIsGreenlisted',
      'escrowIsGreenlisted',
    ],
    errors,
  );
  for (const field of ['poolIsBlacklisted', 'escrowIsBlacklisted']) {
    if (tokenPolicy[field] !== false) errors.push(field);
  }

  requireTrue(
    recordSection(input, 'escrow', errors),
    [
      'poolMatches',
      'tokenMatches',
      'accessControlMatches',
      'fallbackInterfaceSupported',
      'fallbackLinked',
      'defaultRecipientValid',
      'sharedAdminConfigured',
      'solvent',
    ],
    errors,
  );
  requireTrue(
    recordSection(input, 'peers', errors),
    ['bothDirections'],
    errors,
  );

  const decimals = recordSection(input, 'decimals', errors);
  for (const field of ['local', 'remote', 'pool']) {
    if (numericValue(decimals[field]) !== '18') errors.push(field);
  }

  const fees = recordSection(input, 'fees', errors);
  if (fees.poolOverrideEnabled !== false) errors.push('poolOverrideEnabled');
  if (numericValue(fees.midasFeeBps) !== '0') errors.push('midasFeeBps');
  if (numericValue(fees.flatFee) !== '0') errors.push('flatFee');

  const gas = recordSection(input, 'gas', errors);
  const measured = numericValue(gas.measuredTokenHandlingGas);
  const configured = numericValue(gas.configuredTokenHandlingGas);
  const supported = numericValue(gas.supportedTokenHandlingGas);
  if (numericValue(gas.sourceTokenDataBytes) !== '32') {
    errors.push('sourceTokenDataBytes');
  }
  if (
    measured === undefined ||
    configured === undefined ||
    BigNumber.from(measured).gt(configured)
  ) {
    errors.push('measuredTokenHandlingGas');
  }
  if (
    configured === undefined ||
    supported === undefined ||
    BigNumber.from(configured).gt(supported)
  ) {
    errors.push('configuredTokenHandlingGas');
  }

  requireTrue(
    recordSection(input, 'deployment', errors),
    [
      'poolDeployed',
      'escrowInitialized',
      'fallbackLinked',
      'rolesAndPolicyConfigured',
      'remotePoolsConfigured',
    ],
    errors,
  );

  return { ready: errors.length === 0, errors: [...new Set(errors)] };
};

const eventArgument = (
  receipt: TransactionReceiptLike,
  eventName: string,
  argument: string,
) => {
  const event = receipt.events?.find(
    (candidate) => candidate.event === eventName,
  );
  const value = event?.args?.[argument];
  if (value === undefined) {
    throw new Error(`${eventName}.${argument} was not found`);
  }
  return value;
};

export const sendDirect = async (params: {
  router: {
    getFee(
      destinationChainSelector: BigNumberish,
      message: Record<string, unknown>,
    ): Promise<unknown>;
    ccipSend(
      destinationChainSelector: BigNumberish,
      message: Record<string, unknown>,
      overrides: { value: unknown },
    ): Promise<TransactionLike>;
  };
  destinationChainSelector: BigNumberish;
  message: Record<string, unknown>;
}) => {
  const fee = await params.router.getFee(
    params.destinationChainSelector,
    params.message,
  );
  const transaction = await params.router.ccipSend(
    params.destinationChainSelector,
    params.message,
    { value: fee },
  );
  const receipt = await transaction.wait();
  return {
    fee,
    messageId: eventArgument(receipt, 'CCIPMessageSent', 'messageId'),
  };
};

export const sendReturn = async (params: {
  escrow: {
    getReturnToSourceFee(recoveryId: string): Promise<unknown>;
    returnToSource(
      recoveryId: string,
      overrides: { value: BigNumberish },
    ): Promise<TransactionLike>;
  };
  recoveryId: string;
  maximumFee: BigNumberish;
}) => {
  const quote = await params.escrow.getReturnToSourceFee(params.recoveryId);
  const quoteValue = BigNumber.from(quote);
  const maximumFeeValue = BigNumber.from(params.maximumFee);
  if (quoteValue.gt(maximumFeeValue)) {
    throw new Error('Current CCIP return fee exceeds the supplied maximum');
  }

  const transaction = await params.escrow.returnToSource(params.recoveryId, {
    value: params.maximumFee,
  });
  const receipt = await transaction.wait();
  const expectedRefundValue = maximumFeeValue.sub(quoteValue);
  const usesBigNumber =
    BigNumber.isBigNumber(quote) || BigNumber.isBigNumber(params.maximumFee);

  return {
    quote,
    maximumFee: params.maximumFee,
    expectedRefund: usesBigNumber
      ? expectedRefundValue
      : expectedRefundValue.toNumber(),
    outboundCcipMessageId: eventArgument(
      receipt,
      'RecoveryReturnDispatched',
      'outboundCcipMessageId',
    ),
  };
};

export const reconcileRecoveryEvents = async (params: {
  events: Array<Record<string, unknown>>;
  readRecovery(recoveryId: string): Promise<Record<string, unknown>>;
  readAccounting(): Promise<Record<string, unknown>>;
}) => {
  const recoveryIds = new Set<string>();
  for (const event of params.events) {
    const direct = event.recoveryId;
    const nested =
      event.args !== null && typeof event.args === 'object'
        ? (event.args as Record<string, unknown>).recoveryId
        : undefined;
    const recoveryId = direct ?? nested;
    if (typeof recoveryId === 'string') recoveryIds.add(recoveryId);
  }

  const records = await Promise.all(
    [...recoveryIds].map((recoveryId) => params.readRecovery(recoveryId)),
  );
  const accounting = await params.readAccounting();
  return { records, ...accounting };
};

export const classifyRecovery = (input: {
  ccipState: string;
  fundedRecoveryStatus?: string;
  hasRegistrationEvent: boolean;
}) => {
  const hasRecovery = input.fundedRecoveryStatus !== undefined;
  if (
    input.ccipState === 'SUCCESS' &&
    hasRecovery &&
    input.hasRegistrationEvent
  ) {
    return 'ESCROW_RECOVERY';
  }
  if (
    input.ccipState === 'SUCCESS' &&
    !hasRecovery &&
    !input.hasRegistrationEvent
  ) {
    return 'DELIVERED';
  }
  if (
    input.ccipState === 'FAILURE' &&
    !hasRecovery &&
    !input.hasRegistrationEvent
  ) {
    return 'CHAINLINK_MANUAL_EXECUTION';
  }
  return 'MANUAL_REVIEW';
};
