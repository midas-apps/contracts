import { HardhatRuntimeEnvironment } from 'hardhat/types';

import fs from 'fs';
import path from 'path';

const logToFile = (hre: HardhatRuntimeEnvironment, message: string) => {
  const logsFolderPath = hre.logger.logsFolderPath;

  const logFilePath = path.resolve(logsFolderPath, `log-${hre.contextId}.log`);

  fs.appendFileSync(logFilePath, message + '\n');
};

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

  console.log = (...args: any[]) => {
    originalLog(...args);

    if (hre.logger.logToFile) {
      const argsString = serializeArgs(args);
      logToFile(hre, argsString);
    }
  };

  console.warn = console.log;
  console.error = console.log;
  console.info = console.log;
  console.debug = console.log;
};
