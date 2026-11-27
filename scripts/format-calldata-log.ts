import { readdirSync, readFileSync, statSync } from 'fs';
import path from 'path';

import { outputResult, stripColors } from './log-format-common';

import type { CalldataTx } from '../helpers/calldata';

/**
 * Collects the txs printed by a `--calldata` run from its log and copies
 * them to the clipboard as a JSON array (`CalldataTx[]`: chainId, from, to,
 * value, data and their labels / decoded call)
 *
 * yarn deploy:format-calldata [LOG_PATH] [--print]
 *
 * - without LOG_PATH the latest `logs/log-*.log` is used
 * - `--print` writes the result to stdout instead of the clipboard
 */

const USAGE = 'Usage: yarn deploy:format-calldata [LOG_PATH] [--print]';

/** `CALLDATA_LOG_PREFIX` of helpers/calldata, not imported to keep it light */
const CALLDATA_LOG_PREFIX = '[calldata-json]';

const LOGS_DIR = path.join(__dirname, '..', 'logs');

const latestLog = () => {
  const latest = readdirSync(LOGS_DIR)
    .filter((name) => /^log-.*\.log$/.test(name))
    .map((name) => path.join(LOGS_DIR, name))
    .sort((a, b) => statSync(a).mtimeMs - statSync(b).mtimeMs)
    .pop();

  if (!latest) throw new Error(`No logs found in ${LOGS_DIR}\n${USAGE}`);
  return latest;
};

const main = () => {
  const args = process.argv.slice(2);
  const print = args.includes('--print');
  const [logPathArg] = args.filter((a) => a !== '--print');

  const logPath = logPathArg ?? latestLog();
  console.error(`Formatting ${logPath}`);

  const txs = stripColors(readFileSync(logPath, 'utf8'))
    .split('\n')
    .filter((line) => line.startsWith(CALLDATA_LOG_PREFIX))
    .map(
      (line) =>
        JSON.parse(line.slice(CALLDATA_LOG_PREFIX.length)) as CalldataTx,
    );

  if (!txs.length) {
    throw new Error(
      `No calldata txs found in ${logPath}, was it a --calldata run?`,
    );
  }

  outputResult(
    JSON.stringify(txs, undefined, 2),
    print,
    `Copied ${txs.length} tx(s) to the clipboard`,
  );
};

try {
  main();
} catch (e) {
  console.error(e instanceof Error ? e.message : e);
  process.exitCode = 1;
}
