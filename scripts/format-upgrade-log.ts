import { spawnSync } from 'child_process';
import { readFileSync } from 'fs';

/**
 * Formats the log of a timelock upgrade run (`propose` / `execute`) into the
 * markdown summary that is posted for the signers, and copies it to the
 * clipboard.
 *
 * yarn upgrade:format-log <LOG_PATH> [propose|execute] [--print]
 * yarn ts-node scripts/format-upgrade-log.ts <LOG_PATH> [propose|execute] [--print]
 *
 * - the mode is detected from the tx comments in the log if it is not passed
 * - every contract is labeled with the key of its proxy in the addresses
 *   config of the network the log was produced on, e.g. `DataFeed
 *   (paymentTokens.usdc.dataFeed)`
 * - `--print` writes the summary to stdout instead of the clipboard
 */

type Mode = 'propose' | 'execute';

type ParsedUpgrade = {
  name: string;
  proxy: string;
  impl: string;
  timelock: string;
  txId: string;
  verifyParams: string;
};

const MODE_ALIASES: Record<string, Mode> = {
  propose: 'propose',
  '1': 'propose',
  execute: 'execute',
  '2': 'execute',
};

// eslint-disable-next-line no-control-regex
const ANSI_COLORS = /\u001b\[[0-9;]*m/g;

const USAGE =
  'Usage: yarn upgrade:format-log <LOG_PATH> [propose|execute] [--print]';

const valueOf = (
  lines: string[],
  matches: (line: string) => boolean,
  prefix: string,
) => (lines.find(matches) ?? '').replace(prefix, '').trim();

/** `null` for the upgrades that failed */
const parseUpgrade = (lines: string[]): ParsedUpgrade | null => {
  const block = lines.join('\n');

  if (block.includes('Upgrade failed with error')) {
    return null;
  }

  // the "Verify parameters: [...]" block, up to the tx submission
  const verifyStart = lines.findIndex((l) => l.includes('Verify parameters:'));
  let verifyParams = '';
  if (verifyStart >= 0) {
    for (
      let i = verifyStart;
      i < lines.length && !lines[i].includes('processing new tx');
      i++
    ) {
      verifyParams += lines[i] + '\n';
    }
  }

  return {
    name: valueOf(lines, (l) => l.startsWith('Upgrading'), 'Upgrading '),
    proxy: valueOf(lines, (l) => l.startsWith('Proxy:'), 'Proxy:'),
    impl: valueOf(
      lines,
      (l) => l.startsWith('Implementation:'),
      'Implementation:',
    ),
    timelock: valueOf(
      lines,
      (l) => l.includes('Timelock operation id'),
      'Timelock operation id for:',
    ),
    txId: block.match(/"txId":\s*"([^"]+)"/)?.[1] ?? '',
    verifyParams,
  };
};

/** One block per upgraded contract: from its `Upgrading <name>` line to the next one */
const splitUpgrades = (log: string): string[][] => {
  const lines = log.replace(ANSI_COLORS, '').split(/\r?\n/);
  const starts = lines.flatMap((l, i) =>
    l.startsWith('Upgrading ') ? [i] : [],
  );

  return starts.map((start, i) => lines.slice(start, starts[i + 1]));
};

const detectMode = (log: string): Mode | undefined => {
  const isPropose = log.includes('Propose upgrade of');
  const isExecute = log.includes('Execute upgrade of');

  if (isPropose === isExecute) return undefined;
  return isPropose ? 'propose' : 'execute';
};

/** Network of the txs sent in the run */
const detectNetwork = (log: string) =>
  log.match(/"chain":\s*\{\s*"name":\s*"([^"]+)"/)?.[1];

/** Config keys (`radUSD.dataFeedDv`, ...) by the lowercased address */
const getAddressKeys = async (network: string) => {
  // loaded lazily: see `restartInTranspileOnlyMode`
  const { midasAddressesPerNetwork } = await import(
    '../config/constants/addresses'
  );

  const keys = new Map<string, string[]>();

  const collect = (node: unknown, path: string[]) => {
    if (typeof node === 'string') {
      if (!/^0x[0-9a-fA-F]{40}$/.test(node)) return;
      const address = node.toLowerCase();
      keys.set(address, [...(keys.get(address) ?? []), path.join('.')]);
    } else if (node && typeof node === 'object') {
      for (const [key, value] of Object.entries(node)) {
        collect(value, [...path, key]);
      }
    }
  };

  collect((midasAddressesPerNetwork as Record<string, unknown>)[network], []);

  return keys;
};

/**
 * Key of the proxy. A feed shared between an mToken and a payment token is
 * upgraded as the mToken one, so the payment token keys go last
 */
const getProxyKey = (keys: Map<string, string[]>, proxy: string) => {
  const all = keys.get(proxy.toLowerCase()) ?? [];
  const own = all.filter((key) => !key.startsWith('paymentTokens.'));

  return (own.length ? own : all).join(', ');
};

const formatPropose = ({
  impl,
  name,
  timelock,
  txId,
  verifyParams,
}: ParsedUpgrade) =>
  `**${name}**\n\nNew Implementation - \`${impl}\`\n\n\`\`\`\nTimelock operation id for: ${timelock}\n${verifyParams.trim()}\n\`\`\`\n\n\nFordefi tx id: \`${txId}\``;

const formatExecute = ({ name, txId }: ParsedUpgrade) =>
  `**${name}**: \`${txId}\``;

const numbered = (items: string[]) => items.map((v, i) => `**${i + 1}.** ${v}`);

const format = (upgrades: ParsedUpgrade[], mode: Mode) =>
  mode === 'propose'
    ? numbered(upgrades.map(formatPropose)).join('\n\n\n')
    : '**Execute Transactions:**\n\n' +
      numbered(upgrades.map(formatExecute)).join('\n');

const CLIPBOARD_COMMANDS: Partial<
  Record<NodeJS.Platform, [command: string, args: string[]][]>
> = {
  darwin: [['pbcopy', []]],
  win32: [['clip', []]],
  linux: [
    ['wl-copy', []],
    ['xclip', ['-selection', 'clipboard']],
    ['xsel', ['--clipboard', '--input']],
  ],
};

const copyToClipboard = (text: string) =>
  (CLIPBOARD_COMMANDS[process.platform] ?? []).some(([command, args]) => {
    const { error, status } = spawnSync(command, args, { input: text });
    return !error && status === 0;
  });

/**
 * The addresses config relies on the hardhat type extensions and does not
 * pass the type check of a plain `ts-node` run, so the script is restarted
 * in the transpile-only mode (as hardhat runs it). Returns true if restarted
 */
const restartInTranspileOnlyMode = () => {
  if (/^(1|true)$/i.test(process.env.TS_NODE_TRANSPILE_ONLY ?? '')) {
    return false;
  }

  const { status } = spawnSync(
    process.execPath,
    [require.resolve('ts-node/dist/bin'), __filename, ...process.argv.slice(2)],
    {
      stdio: 'inherit',
      env: { ...process.env, TS_NODE_TRANSPILE_ONLY: 'true' },
    },
  );
  process.exitCode = status ?? 1;

  return true;
};

const main = async () => {
  if (restartInTranspileOnlyMode()) return;

  const args = process.argv.slice(2);
  const print = args.includes('--print');
  const [logPath, modeArg] = args.filter((a) => a !== '--print');

  if (!logPath) throw new Error(USAGE);
  if (modeArg !== undefined && !MODE_ALIASES[modeArg]) {
    throw new Error(`Invalid mode "${modeArg}"\n${USAGE}`);
  }

  const log = readFileSync(logPath, 'utf8');

  const mode = modeArg ? MODE_ALIASES[modeArg] : detectMode(log);
  if (!mode) {
    throw new Error(
      `Cannot detect whether the log is a propose or an execute run, pass the mode\n${USAGE}`,
    );
  }

  const blocks = splitUpgrades(log);
  const parsed = blocks.map(parseUpgrade);

  const failed = blocks.filter((_, i) => !parsed[i]);
  // nothing was sent for these (e.g. the operation is already proposed)
  const notSent = parsed.filter((u): u is ParsedUpgrade => !!u && !u.txId);
  const upgrades = parsed.filter((u): u is ParsedUpgrade => !!u && !!u.txId);

  if (failed.length) {
    console.error(
      `Skipped ${failed.length} failed upgrade(s): ${failed
        .map(([header]) => header.replace('Upgrading ', '').trim())
        .join(', ')}`,
    );
  }
  if (notSent.length) {
    console.error(
      `Skipped ${notSent.length} upgrade(s) without a tx id: ${notSent
        .map(({ name }) => name)
        .join(', ')}`,
    );
  }
  if (!upgrades.length) {
    throw new Error(`No submitted upgrades found in ${logPath}`);
  }

  const network = detectNetwork(log);
  const keys = await getAddressKeys(network ?? '');
  const labeled = upgrades.map((upgrade) => {
    const key = getProxyKey(keys, upgrade.proxy);
    return key ? { ...upgrade, name: `${upgrade.name} (${key})` } : upgrade;
  });

  const withoutKey = labeled.filter((upgrade, i) => upgrade === upgrades[i]);
  if (withoutKey.length) {
    console.error(
      `No config key found on ${
        network ?? 'an unknown network'
      } for: ${withoutKey
        .map(({ name, proxy }) => `${name} ${proxy}`)
        .join(', ')}`,
    );
  }

  const result = format(labeled, mode);

  if (!print && copyToClipboard(result)) {
    console.error(
      `Copied ${upgrades.length} ${mode} upgrade(s) to the clipboard`,
    );
    return;
  }

  if (!print) {
    console.error('Clipboard is not available, printing the result instead\n');
  }
  console.log(result);
};

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exitCode = 1;
});
