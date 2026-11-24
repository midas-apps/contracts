import { readdirSync, readFileSync } from 'fs';
import path from 'path';

import { outputResult, stripColors } from './log-format-common';

/**
 * Formats the log of a deploy / post-deploy run (e.g. `deploy:post:sync`)
 * into the list of txs posted for the signers and copies it to the
 * clipboard, one line per tx: `fordefiTx` - <action>, with
 * ` - timelock: `<operation id>`` for timelocked txs.
 *
 * yarn deploy:format-log [LOG_PATH] [--print]
 *
 * - without LOG_PATH the latest `logs/log-*.log` is used
 * - `--print` writes the list to stdout instead of the clipboard
 */

type ParsedTx = {
  comment: string;
  txId?: string;
  timelockId?: string;
};

const USAGE = 'Usage: yarn deploy:format-log [LOG_PATH] [--print]';

const TIMELOCK_PREFIX = '[timelock schedule] ';

const LOGS_DIR = path.join(__dirname, '..', 'logs');

/** Value of a JSON string field, unescaped */
const stringField = (block: string, field: string) => {
  const raw = block.match(
    new RegExp(`"${field}":\\s*"((?:[^"\\\\]|\\\\.)*)"`),
  )?.[1];
  return raw === undefined ? undefined : (JSON.parse(`"${raw}"`) as string);
};

/** One block per tx: from its `processing new tx` line to the next one */
const splitTxs = (log: string) =>
  stripColors(log)
    .split(/^processing new tx /m)
    .slice(1);

const parseTx = (block: string): ParsedTx => {
  const comment = stringField(block, 'comment') ?? '';

  return {
    comment: comment.replace(TIMELOCK_PREFIX, ''),
    txId: stringField(block, 'txId'),
    timelockId: block.match(
      /Timelock operation scheduled\. Operation id: (0x[0-9a-fA-F]{64})/,
    )?.[1],
  };
};

/** `fordefiTx` - <action>[ - timelock: `operationId`] */
const formatTx = ({ comment, txId, timelockId }: ParsedTx) =>
  `\`${txId}\` - ${comment}${
    timelockId ? ` - timelock: \`${timelockId}\`` : ''
  }`;

const latestLog = () => {
  const latest = readdirSync(LOGS_DIR)
    .filter((name) => /^log-.*\.log$/.test(name))
    .sort()
    .pop();

  if (!latest) throw new Error(`No logs found in ${LOGS_DIR}\n${USAGE}`);
  return path.join(LOGS_DIR, latest);
};

const main = () => {
  const args = process.argv.slice(2);
  const print = args.includes('--print');
  const [logPathArg] = args.filter((a) => a !== '--print');

  const logPath = logPathArg ?? latestLog();
  console.error(`Formatting ${logPath}`);

  const log = readFileSync(logPath, 'utf8');
  const parsed = splitTxs(log).map(parseTx);

  // e.g. the signer threw before returning a tx id
  const failed = parsed.filter((tx) => !tx.txId);
  const txs = parsed.filter((tx) => !!tx.txId);

  if (failed.length) {
    console.error(
      `Skipped ${failed.length} tx(s) without a tx id: ${failed
        .map((tx) => tx.comment || '(no comment)')
        .join(', ')}`,
    );
  }
  if (!txs.length) {
    throw new Error(`No submitted txs found in ${logPath}`);
  }

  const timelocked = txs.filter((tx) => tx.timelockId).length;

  outputResult(
    txs.map(formatTx).join('\n'),
    print,
    `Copied ${txs.length} tx(s) (${timelocked} timelocked) to the clipboard`,
  );
};

try {
  main();
} catch (e) {
  console.error(e instanceof Error ? e.message : e);
  process.exitCode = 1;
}
