import { HardhatRuntimeEnvironment } from 'hardhat/types';

import fs from 'fs';
import path from 'path';

export const getLogFilePath = (hre: HardhatRuntimeEnvironment) =>
  path.resolve(hre.logger.logsFolderPath, `log-${hre.contextId}.log`);

/** Appends `message` to the log file of the current run, not to stdout */
export const logToFile = (hre: HardhatRuntimeEnvironment, message: string) => {
  fs.appendFileSync(getLogFilePath(hre), message + '\n');
};

/** Prints the log file of the current run, if anything was logged to it */
export const printLogFilePath = (hre: HardhatRuntimeEnvironment) => {
  if (!hre.logger?.logToFile) return;

  const logFilePath = getLogFilePath(hre);
  if (!fs.existsSync(logFilePath)) return;

  console.log(`\nLogs: ${path.relative(process.cwd(), logFilePath)}`);
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const serializeArgs = (args: any[]): string => {
  return args
    .map((arg) => {
      if (typeof arg === 'object') {
        return JSON.stringify(arg, undefined, 2);
      }

      if (Array.isArray(arg)) {
        return serializeArgs(arg);
      }

      return arg?.toString?.() ?? 'undefined';
    })
    .join(' ');
};

export const initializeLogger = (hre: HardhatRuntimeEnvironment) => {
  const originalLog = console.log;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if ((originalLog as any).customLogger) {
    return;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  console.log = (...args: any[]) => {
    originalLog(...args);

    if (hre.logger.logToFile) {
      const argsString = serializeArgs(args);
      logToFile(hre, argsString);
    }
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (console.log as any).customLogger = true;

  console.warn = console.log;
  console.error = console.log;
  console.info = console.log;
  console.debug = console.log;
};
