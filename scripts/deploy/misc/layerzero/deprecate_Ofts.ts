import { BigNumber, constants, Contract, PopulatedTransaction } from 'ethers';
import { hexZeroPad } from 'ethers/lib/utils';
import { HardhatRuntimeEnvironment } from 'hardhat/types';

import {
  chainIds,
  ENV,
  isTestnetNetwork,
  layerZeroBlockFinality,
  layerZeroEids,
  MTokenName,
  Network,
} from '../../../../config';
import { midasAddressesPerNetwork } from '../../../../config/constants/addresses';
import {
  deprecatedLzConfigsPerMToken,
  lzConfigsPerMToken,
} from '../../../../config/misc';
import { getHreByNetworkName } from '../../../../helpers/hardhat';
import { MidasLzMintBurnOFTAdapter__factory } from '../../../../typechain-types';
import { DeployFunction } from '../../common/types';
import { sendAndWaitForCustomTxSign } from '../../common/utils';

const actions = [
  'status',
  'disable',
  'finalize',
  'queue-finalize',
  'verify',
] as const;
type Action = (typeof actions)[number];
type Change = 'rate' | 'block-send' | 'peer';

// EndpointV2 implementation getters are not all exposed by its interface ABI.
const endpointAbi = [
  'function blockedLibrary() view returns(address)',
  'function delegates(address) view returns(address)',
  'function isDefaultSendLibrary(address,uint32) view returns(bool)',
  'function getSendLibrary(address,uint32) view returns(address)',
  'function defaultSendLibrary(uint32) view returns(address)',
  'function setSendLibrary(address,uint32,address)',
  'function eid() view returns(uint32)',
  'function outboundNonce(address,uint32,bytes32) view returns(uint64)',
  'function lazyInboundNonce(address,uint32,bytes32) view returns(uint64)',
  'function inboundPayloadHash(address,uint32,bytes32,uint64) view returns(bytes32)',
];

type Reader = {
  hre: HardhatRuntimeEnvironment;
  oft: Contract;
  endpoint: Contract;
  network: Network;
  eid: number;
  owner: string;
  delegate: string;
  blockedLibrary: string;
  head: number;
  confirmed: number;
};

export type DeprecationRoute = {
  label: string;
  expectedPeer: string;
  peer: string;
  confirmedPeer: string;
  limit: BigNumber;
  confirmedLimit: BigNumber;
  sendLibrary: string;
  confirmedSendLibrary: string;
  blockedLibrary: string;
  outbound: BigNumber;
  confirmedOutbound: BigNumber;
  lazyInbound: BigNumber;
  pending: string[];
};

/** Pure route checks shared by status, submission and verification. Roles are separate tooling. */
export function getDeprecationChanges(
  route: DeprecationRoute,
  action: Action | 'audit',
): Change[] {
  const {
    peer,
    confirmedPeer,
    expectedPeer,
    limit,
    confirmedLimit,
    outbound,
    confirmedOutbound,
    lazyInbound,
    pending,
  } = route;
  const fail = (reason: string): never => {
    throw new Error(`${route.label}: ${reason}`);
  };
  const blocked =
    route.sendLibrary.toLowerCase() === route.blockedLibrary.toLowerCase();
  const confirmedBlocked =
    route.confirmedSendLibrary.toLowerCase() ===
    route.blockedLibrary.toLowerCase();
  const drained =
    outbound.eq(lazyInbound) &&
    pending.length === 0 &&
    outbound.eq(confirmedOutbound);

  if (action === 'audit') {
    // A zero peer disables this route even if unused rate/library settings remain.
    if (
      peer !== constants.HashZero ||
      confirmedPeer !== constants.HashZero ||
      !drained
    )
      fail(
        `unexpected link/history outside configured scope (peer=${peer}, confirmedPeer=${confirmedPeer}, outbound=${outbound}, confirmedOutbound=${confirmedOutbound}, lazyInbound=${lazyInbound}, pending=[${pending}])`,
      );
    return [];
  }
  if (
    peer !== constants.HashZero &&
    peer.toLowerCase() !== expectedPeer.toLowerCase()
  )
    fail(`unexpected peer ${peer}; expected ${expectedPeer}`);
  if (action === 'disable') {
    const changes: Change[] = [];
    if (!limit.isZero()) changes.push('rate');
    if (!blocked) changes.push('block-send');
    return changes;
  }
  if (action !== 'queue-finalize') {
    if (
      !limit.isZero() ||
      !confirmedLimit.isZero() ||
      !blocked ||
      !confirmedBlocked
    )
      fail(
        'execute disable and wait for confirmed zero rates and blocked send libraries',
      );
  }
  if (!drained)
    fail(
      `channel not drained/confirmed (outbound=${outbound}, confirmedOutbound=${confirmedOutbound}, lazyInbound=${lazyInbound}, pending=[${pending}]); resolve delivery before unlinking`,
    );
  if (
    action === 'verify' &&
    (peer !== constants.HashZero || confirmedPeer !== constants.HashZero)
  )
    fail('peer removal is not confirmed');
  return peer === constants.HashZero ? [] : ['peer'];
}

/**
 * --network selects the retired network; --mtoken selects one configured product.
 * --action status (default) -> disable -> finalize -> verify. DRY_RUN=false queues
 * all missing transactions for the action through the normal Fordefi flow.
 * queue-finalize prepares peer removals early: approve them only after the normal
 * finalize dry run passes. Keep deployed addresses configured for repeatable checks.
 */
const func: DeployFunction = async (
  hre: HardhatRuntimeEnvironment,
  mToken: MTokenName,
  requestedAction?: string,
) => {
  // Preserve commands and proposal identities used before --action was exposed.
  const action = requestedAction ?? process.env.LZ_RETIRE_PHASE ?? 'status';
  if (!actions.includes(action as Action))
    throw new Error(`Use --action ${actions.join('|')}`);
  if (
    process.env.DRY_RUN !== undefined &&
    !['true', 'false'].includes(process.env.DRY_RUN)
  )
    throw new Error('DRY_RUN must be true or false');
  const submit = process.env.DRY_RUN === 'false';
  if (submit && ['status', 'verify'].includes(action))
    throw new Error(`${action} is read-only; omit DRY_RUN=false`);
  const attempt = process.env.LZ_RETIRE_ATTEMPT ?? '1';
  if (!/^\d+$/.test(attempt))
    throw new Error(
      'LZ_RETIRE_ATTEMPT must be an integer; change it only to replace a failed/cancelled proposal',
    );
  const retiredNetwork = hre.network.name as Network;
  if (ENV.FORKING_NETWORK || hre.hardhatArguments.network !== retiredNetwork)
    throw new Error('Deprecation requires real network readers, not a fork');
  const config = deprecatedLzConfigsPerMToken[retiredNetwork]?.[mToken];
  if (!config?.linkedNetworks.length)
    throw new Error('No deprecation configured for --network/--mtoken');
  if (config.linkedNetworks.includes(retiredNetwork))
    throw new Error('A retired network cannot link to itself');
  for (const [network, configs] of Object.entries(lzConfigsPerMToken)) {
    const active = configs?.[mToken];
    if (active && [network, ...active.linkedNetworks].includes(retiredNetwork))
      throw new Error(
        `Remove ${mToken}/${retiredNetwork} from active LayerZero wiring first; retain its addresses`,
      );
  }
  if (action === 'queue-finalize')
    console.warn(
      'PREQUEUE: these transactions broadcast after Fordefi approval. Leave them unapproved until disable executes and the normal finalize dry run passes. There is no on-chain drain guard.',
    );

  const networks = new Set<Network>([retiredNetwork, ...config.linkedNetworks]);
  for (const [network, addresses] of Object.entries(midasAddressesPerNetwork)) {
    if (
      addresses?.[mToken]?.layerZero?.oft &&
      isTestnetNetwork(network as Network) === isTestnetNetwork(retiredNetwork)
    )
      networks.add(network as Network);
  }
  const readers = new Map<Network, Reader>();
  for (const network of networks) {
    const product = midasAddressesPerNetwork[network]?.[mToken];
    const eid = layerZeroEids[network];
    const depth = layerZeroBlockFinality[network];
    if (!product?.layerZero?.oft || !product.token || !eid || !depth)
      throw new Error(
        `Missing OFT/token/EID/confirmation configuration for ${network}/${mToken}; keep addresses until verification completes`,
      );
    const env =
      network === retiredNetwork ? hre : await getHreByNetworkName(network);
    env.mtoken = mToken;
    const provider = env.ethers.provider;
    if ((await provider.getNetwork()).chainId !== chainIds[network])
      throw new Error(`Wrong RPC chain for ${network}`);
    const head = await provider.getBlockNumber();
    const confirmed = head - depth;
    if (confirmed < 0)
      throw new Error(`Insufficient block history for ${network}`);
    const oft = MidasLzMintBurnOFTAdapter__factory.connect(
      product.layerZero.oft,
      provider,
    );
    const [token, endpointAddress, owner] = await Promise.all([
      oft.token({ blockTag: head }),
      oft.endpoint({ blockTag: head }),
      oft.owner({ blockTag: head }),
    ]);
    if (token.toLowerCase() !== product.token.toLowerCase())
      throw new Error(`Token mismatch on ${network}`);
    const endpoint = new Contract(endpointAddress, endpointAbi, provider);
    if ((await endpoint.eid({ blockTag: head })) !== eid)
      throw new Error(`Endpoint EID mismatch on ${network}`);
    const [delegate, blockedLibrary] = await Promise.all([
      endpoint.delegates(oft.address, { blockTag: head }),
      endpoint.blockedLibrary({ blockTag: head }),
    ]);
    if (
      delegate === constants.AddressZero ||
      blockedLibrary === constants.AddressZero
    )
      throw new Error(`Missing delegate/blocked library on ${network}`);
    readers.set(network, {
      hre: env,
      oft,
      endpoint,
      network,
      eid,
      owner,
      delegate,
      blockedLibrary,
      head,
      confirmed,
    });
    console.log(
      `${network}: OFT=${oft.address}, block=${head}, confirmed=${confirmed} (depth=${depth})`,
    );
  }

  const retired = readers.get(retiredNetwork)!;
  const routes: {
    state: DeprecationRoute;
    from: Reader;
    to: Reader;
    window: BigNumber;
  }[] = [];
  for (const remote of readers.values()) {
    if (remote === retired) continue;
    for (const [from, to] of [
      [remote, retired],
      [retired, remote],
    ]) {
      const selected = config.linkedNetworks.includes(remote.network);
      const receiver = hexZeroPad(to.oft.address, 32);
      const sender = hexZeroPad(from.oft.address, 32);
      const sendLibraryAt = async (blockTag: number): Promise<string> =>
        (await from.endpoint.isDefaultSendLibrary(from.oft.address, to.eid, {
          blockTag,
        }))
          ? from.endpoint.defaultSendLibrary(to.eid, { blockTag })
          : from.endpoint.getSendLibrary(from.oft.address, to.eid, {
              blockTag,
            });
      const [
        peer,
        confirmedPeer,
        rate,
        confirmedRate,
        sendLibrary,
        confirmedSendLibrary,
      ] = await Promise.all([
        from.oft.peers(to.eid, { blockTag: from.head }),
        from.oft.peers(to.eid, { blockTag: from.confirmed }),
        from.oft.getRateLimit(to.eid, { blockTag: from.head }),
        from.oft.getRateLimit(to.eid, { blockTag: from.confirmed }),
        sendLibraryAt(from.head),
        sendLibraryAt(from.confirmed),
      ]);
      let outbound = BigNumber.from(0),
        confirmedOutbound = outbound,
        lazyInbound = outbound;
      const pending: string[] = [];
      // Freeze new sends promptly; packet history is required before unlinking.
      if (action !== 'disable') {
        [outbound, confirmedOutbound, lazyInbound] = await Promise.all([
          from.endpoint.outboundNonce(from.oft.address, to.eid, receiver, {
            blockTag: from.head,
          }),
          from.endpoint.outboundNonce(from.oft.address, to.eid, receiver, {
            blockTag: from.confirmed,
          }),
          to.endpoint.lazyInboundNonce(to.oft.address, from.eid, sender, {
            blockTag: to.confirmed,
          }),
        ]);
        // Later deliveries can advance lazyInbound past an older failed payload.
        for (
          let first = BigNumber.from(1);
          first.lte(outbound);
          first = first.add(20)
        ) {
          const nonces = Array.from({ length: 20 }, (_, i) =>
            first.add(i),
          ).filter((n) => n.lte(outbound));
          const hashes: string[] = await Promise.all(
            nonces.map((nonce) =>
              to.endpoint.inboundPayloadHash(
                to.oft.address,
                from.eid,
                sender,
                nonce,
                { blockTag: to.confirmed },
              ),
            ),
          );
          hashes.forEach((hash, i) => {
            if (hash !== constants.HashZero) pending.push(nonces[i].toString());
          });
        }
      }
      const state: DeprecationRoute = {
        label: `${from.network} -> ${to.network}`,
        expectedPeer: receiver,
        peer,
        confirmedPeer,
        limit: rate.limit,
        confirmedLimit: confirmedRate.limit,
        sendLibrary,
        confirmedSendLibrary,
        blockedLibrary: from.blockedLibrary,
        outbound,
        confirmedOutbound,
        lazyInbound,
        pending,
      };
      console.log(
        `${state.label}: peer=${peer}, confirmedPeer=${confirmedPeer}, limit=${rate.limit}, confirmedLimit=${confirmedRate.limit}, sendLibrary=${sendLibrary}, confirmedSendLibrary=${confirmedSendLibrary}`,
      );
      if (action !== 'disable')
        console.log(
          `  outbound=${outbound}, confirmedOutbound=${confirmedOutbound}, confirmedLazyInbound=${lazyInbound}, pending=[${pending}]`,
        );
      if (selected) routes.push({ state, from, to, window: rate.window });
      else {
        getDeprecationChanges(state, 'audit');
        console.log(
          '  Audit only: already unlinked; unused rate/library settings are unchanged.',
        );
      }
    }
  }

  if (action === 'status') {
    for (const next of ['disable', 'finalize'] as const) {
      try {
        console.log(
          `${next}:`,
          routes.flatMap(({ state }) =>
            getDeprecationChanges(state, next).map(
              (change) => `${state.label}: ${change}`,
            ),
          ),
        );
      } catch (error) {
        console.log(`${next} BLOCKED: ${(error as Error).message}`);
      }
    }
    console.log(
      'Next: --action disable, then finalize, then verify. DRY_RUN=false queues all missing actions. Keep addresses configured.',
    );
    return;
  }

  const plan: {
    reader: Reader;
    tx: PopulatedTransaction;
    owner: string;
    description: string;
  }[] = [];
  for (const { state, from, to, window } of routes) {
    for (const change of getDeprecationChanges(state, action as Action)) {
      const tx =
        change === 'rate'
          ? await from.oft.populateTransaction.setRateLimits([
              { dstEid: to.eid, limit: 0, window },
            ])
          : change === 'block-send'
          ? await from.endpoint.populateTransaction.setSendLibrary(
              from.oft.address,
              to.eid,
              from.blockedLibrary,
            )
          : await from.oft.populateTransaction.setPeer(
              to.eid,
              constants.HashZero,
            );
      plan.push({
        reader: from,
        tx,
        owner: change === 'block-send' ? from.delegate : from.owner,
        description: `${change} on ${from.network} for EID ${to.eid}`,
      });
    }
  }
  if (action === 'verify') {
    console.log(
      'VERIFIED: selected routes have confirmed zero peers/rates, blocked send libraries and no unresolved channel payloads. Historical administrative skip/burn/clear requires separate transfer reconciliation.',
    );
    return;
  }
  if (!plan.length) {
    console.log(
      `No ${action} actions remain. Run --action verify after execution and confirmation.`,
    );
    return;
  }
  for (const { reader, tx, owner, description } of plan)
    console.log({ network: reader.network, ...tx, owner, description });
  if (!submit) {
    console.log(
      'Dry run: no transactions submitted. Add DRY_RUN=false to queue this action.',
    );
    return;
  }
  // Validate signers for every affected chain before the first proposal.
  for (const reader of new Set(plan.map((item) => item.reader))) {
    if ((await reader.hre.getCustomSigner()).type !== 'customSigner')
      throw new Error(
        'Submission requires the configured Fordefi custom signer',
      );
  }
  for (const { reader, tx, owner, description } of plan) {
    const result = await sendAndWaitForCustomTxSign(
      reader.hre,
      tx,
      {
        mToken,
        action: 'update-lz-oapp-config',
        comment: `${
          action === 'queue-finalize'
            ? 'HOLD: run finalize preflight before approval. '
            : ''
        }retire ${mToken}/${retiredNetwork}: ${description}`,
        idempotenceId: `lz-retire-v1:${mToken}:${retiredNetwork}:${attempt}`,
      },
      owner,
    );
    console.log(description, result);
  }
  console.log(
    action === 'queue-finalize'
      ? 'Peer removals requested. Approve only after confirmed shutdown and a passing finalize dry run; then verify.'
      : 'All missing proposals requested. Approve/execute in Fordefi, then rerun status. A proposal is not proof of execution.',
  );
};

export default func;
