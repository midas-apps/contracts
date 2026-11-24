import { utils } from 'ethers';
import { HardhatRuntimeEnvironment } from 'hardhat/types';

import {
  PlannedTx,
  sendAndWaitForCustomTxSign,
  sendAndWaitForTimelockedTxSign,
} from './utils';

import {
  MidasAccessControl__factory,
  MidasPauseManager__factory,
} from '../../../typechain-types';

/** Merges several calls of a bulk function into one call */
type Batcher = {
  iface: utils.Interface;
  fn: string;
  /** only calls with the same key are merged */
  key?: (args: utils.Result) => string;
  /** returns the args of the merged call */
  merge: (calls: utils.Result[]) => unknown[];
};

const acInterface = MidasAccessControl__factory.createInterface();
const pauseManagerInterface = MidasPauseManager__factory.createInterface();

const concatFirstArg = (calls: utils.Result[]) => [
  calls.flatMap((args) => args[0]),
];

const batchers: Batcher[] = [
  { iface: acInterface, fn: 'grantRoleMult', merge: concatFirstArg },
  { iface: acInterface, fn: 'revokeRoleMult', merge: concatFirstArg },
  {
    iface: pauseManagerInterface,
    fn: 'bulkPauseContract',
    merge: concatFirstArg,
  },
  {
    // pauses every selector on every contract, so only calls with the same
    // selectors can be merged
    iface: pauseManagerInterface,
    fn: 'bulkPauseContractFn',
    key: (args) => [...args[1]].sort().join(),
    merge: (calls) => [calls.flatMap((args) => args[0]), calls[0][1]],
  },
];

const findBatcher = (data: string | undefined) =>
  batchers.find(
    ({ iface, fn }) => data?.startsWith(iface.getSighash(fn)) ?? false,
  );

/**
 * Merges calls of the same bulk function sent to the same contract from the
 * same wallet (same signer action and mToken) into one call.
 * The merged call takes the place of the first call of the group
 */
export const batchTxs = (txs: PlannedTx[]) => {
  const result: PlannedTx[] = [];
  const groups = new Map<
    string,
    {
      index: number;
      batcher: Batcher;
      items: PlannedTx[];
      args: utils.Result[];
    }
  >();

  for (const planned of txs) {
    const batcher = planned.safeMiddlewareWallet
      ? undefined
      : findBatcher(planned.tx.data);

    if (!batcher) {
      result.push(planned);
      continue;
    }

    const args = batcher.iface.decodeFunctionData(batcher.fn, planned.tx.data!);
    const key = [
      planned.tx.to?.toLowerCase(),
      batcher.fn,
      planned.metadata?.action,
      planned.metadata?.mToken,
      planned.alwaysTimelocked,
      batcher.key?.(args),
    ].join('|');

    const group = groups.get(key);
    if (group) {
      group.items.push(planned);
      group.args.push(args);
      continue;
    }

    groups.set(key, {
      index: result.length,
      batcher,
      items: [planned],
      args: [args],
    });
    result.push(planned);
  }

  for (const { index, batcher, items, args } of groups.values()) {
    if (items.length === 1) continue;

    const [first] = items;
    result[index] = {
      ...first,
      tx: {
        to: first.tx.to,
        data: batcher.iface.encodeFunctionData(batcher.fn, batcher.merge(args)),
      },
      metadata: {
        ...first.metadata,
        comment: items.map((v) => v.metadata?.comment).join('; '),
        changes: items.flatMap((v) => v.metadata?.changes ?? []),
      },
    };
  }

  return result;
};

/** Sends planned txs one by one, the same way the scripts send them */
export const sendPlannedTxs = async (
  hre: HardhatRuntimeEnvironment,
  txs: PlannedTx[],
) => {
  for (const { tx, metadata, safeMiddlewareWallet, alwaysTimelocked } of txs) {
    const send = alwaysTimelocked
      ? sendAndWaitForTimelockedTxSign
      : sendAndWaitForCustomTxSign;

    const txRes = await send(hre, tx, metadata, safeMiddlewareWallet);
    console.log(`${metadata?.comment ?? tx.to}: tx initiated`, txRes);
  }
};
