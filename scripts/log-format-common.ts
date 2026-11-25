import { spawnSync } from 'child_process';

/** Shared helpers of the log formatters (`format-*-log.ts`) */

// eslint-disable-next-line no-control-regex
const ANSI_COLORS = /\u001b\[[0-9;]*m/g;

export const stripColors = (log: string) => log.replace(ANSI_COLORS, '');

/** Network of the txs sent in the run */
export const detectNetwork = (log: string) =>
  log.match(/"chain":\s*\{\s*"name":\s*"([^"]+)"/)?.[1];

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
 * Copies the result to the clipboard and logs `copiedMessage`, or prints it
 * when `print` is set or the clipboard is not available
 */
export const outputResult = (
  result: string,
  print: boolean,
  copiedMessage: string,
) => {
  if (!print && copyToClipboard(result)) {
    console.error(copiedMessage);
    return;
  }

  if (!print) {
    console.error('Clipboard is not available, printing the result instead\n');
  }
  console.log(result);
};
