import { BigNumber, constants } from 'ethers';
import { HardhatRuntimeEnvironment } from 'hardhat/types';

import { batchTxs, sendPlannedTxs } from './tx-batch';
import { collectTxs, PlannedTx } from './utils';

export type SyncStep = {
  name: string;
  /** the step is skipped when false. Default: true */
  isConfigured?: boolean;
  /** an existing post-deploy step: reads on-chain state, sends the diff */
  run: () => Promise<unknown>;
};

const MAX_UINT32 = 0xffffffff;

const formatValue = (value: unknown) => {
  if (value === undefined || value === null) return '-';
  if (BigNumber.isBigNumber(value)) {
    if (value.eq(constants.MaxUint256)) return 'MaxUint256';
    if (value.eq(MAX_UINT32)) return 'MaxUint32';
    return value.toString();
  }
  if (value === MAX_UINT32) return 'MaxUint32';
  return String(value);
};

const printTable = (header: string[], rows: string[][]) => {
  const table = [header, ...rows];
  const widths = header.map((_, col) =>
    Math.max(...table.map((row) => row[col].length)),
  );
  const line = (row: string[]) =>
    row.map((cell, col) => cell.padEnd(widths[col])).join(' | ');

  console.log(line(header));
  console.log(widths.map((w) => '-'.repeat(w)).join('-|-'));
  rows.forEach((row) => console.log(line(row)));
};

/** One row per changed field. Txs that report no changes are shown by their comment */
const toChangeRows = (txs: PlannedTx[]) =>
  txs.flatMap(({ tx, metadata }, i) =>
    (
      metadata?.changes ?? [
        {
          field: metadata?.comment ?? `tx to ${tx.to}`,
          current: '?',
          target: '?',
        },
      ]
    ).map((c) => [
      String(i + 1),
      metadata?.action ?? '-',
      c.field,
      formatValue(c.current),
      formatValue(c.target),
    ]),
  );

/**
 * Syncs a config with on-chain state: every step runs against the chain with
 * sending replaced by recording, then the recorded txs are batched and sent.
 * All steps are planned even if some fail, but nothing is sent if any step
 * fails
 */
export const runSync = async (
  hre: HardhatRuntimeEnvironment,
  label: string,
  steps: SyncStep[],
  dryRun: boolean | undefined,
) => {
  // params are positional, a wrong order in the task would pass another value
  if (typeof dryRun !== 'boolean') {
    throw new Error(`dryRun must be a boolean, got ${String(dryRun)}`);
  }

  const planned: PlannedTx[] = [];
  const failed: { step: string; error: unknown }[] = [];
  const skipped: { step: string; reason: string }[] = [];

  for (const step of steps) {
    if (step.isConfigured === false) {
      console.log(`\n== ${step.name}: not configured, skipping`);
      continue;
    }

    console.log(`\n== ${step.name}`);
    try {
      const collected = await collectTxs(step.run);
      planned.push(...collected.txs);
      skipped.push(
        ...collected.skipped.map((reason) => ({ step: step.name, reason })),
      );
    } catch (error) {
      console.error(`${step.name} failed`, error);
      failed.push({ step: step.name, error });
    }
  }

  const txs = batchTxs(planned);

  console.log(`\n${label}: ${txs.length} txs to send\n`);
  printTable(
    ['tx', 'action', 'field', 'current', 'new'],
    [
      ...toChangeRows(txs),
      ...skipped.map(({ step, reason }) => ['-', 'SKIPPED', step, '-', reason]),
      ...failed.map(({ step, error }) => [
        '-',
        'FAILED',
        step,
        '-',
        String((error as Error)?.message ?? error),
      ]),
    ],
  );
  console.log('');

  if (failed.length) {
    throw new Error(
      `Steps failed, nothing is sent: ${failed.map((v) => v.step).join(', ')}`,
    );
  }

  if (!txs.length) {
    console.log(`${label} is in sync, nothing to send`);
    return;
  }

  if (dryRun) {
    console.log('Dry run, nothing is sent');
    return;
  }

  await sendPlannedTxs(hre, txs);
};
