import { task } from 'hardhat/config';
import { HardhatRuntimeEnvironment } from 'hardhat/types';

import { deployTasks, runScript, withGlobalRunScriptParams } from './common';

deployTasks.forEach(([name, [scriptPath, ...params]]) => {
  const actionFn = async (
    taskArgs: Record<string, unknown>,
    hre: HardhatRuntimeEnvironment,
  ) => {
    await runScript({ path: scriptPath, ...taskArgs }, hre, params);
  };

  const t = task(name);
  withGlobalRunScriptParams(t);

  params.forEach((param) => {
    const metadata = param();

    if (metadata.isOptional) {
      t.addOptionalParam(
        metadata.name,
        metadata.description,
        metadata.defaultValue,
      );
    } else {
      t.addParam(metadata.name, metadata.description, metadata.defaultValue);
    }
  });

  t.setAction(actionFn);
});
