import { mine } from '@nomicfoundation/hardhat-network-helpers';
import {
  ConfigurableTaskDefinition,
  HardhatRuntimeEnvironment,
} from 'hardhat/types';

import fs from 'node:fs';
import path from 'node:path';

import {
  ParamFnBase,
  deploymentConfigParam,
  forkingNetworkParam,
  vaultVersionParam,
} from './task-params';

import { ENV, chainIds, extendWithContext, rpcUrls } from '../../config';
import { Network } from '../../config';
import { getLogFilePath, printLogFilePath } from '../../helpers/logger';
import { isMTokenName, isPaymentTokenName } from '../../helpers/utils';
import {
  deploymentConfigNames,
  isDeploymentConfigName,
  validateDeploymentProfileContext,
} from '../../scripts/deploy/configs/deployment-profiles';

/** Truly global runner flags attached to every script task. */
export const globalRunScriptParams = [
  forkingNetworkParam(true),
  deploymentConfigParam(true),
];

export const withGlobalRunScriptParams = (task: ConfigurableTaskDefinition) => {
  globalRunScriptParams.forEach((paramFn) => {
    const param = paramFn();
    if (param.cli === false) return;
    if (param.isOptional) {
      task.addOptionalParam(param.name, param.description, param.defaultValue);
    } else {
      task.addParam(param.name, param.description, param.defaultValue);
    }
  });
  task.addFlag(
    'calldata',
    'Print from / to / calldata of the txs instead of sending them',
  );
  return task;
};

/** @deprecated Use withGlobalRunScriptParams */
export const withRunScriptParams = withGlobalRunScriptParams;

export const runScript = async (
  taskArgs: Record<string, unknown>,
  hre: HardhatRuntimeEnvironment,
  scriptParams: ParamFnBase[],
) => {
  const mtoken = taskArgs.mtoken as string | undefined;
  const ptoken = taskArgs.ptoken as string | undefined;
  const action = taskArgs.action as string | undefined;

  const forkingNetwork =
    (taskArgs.forkingNetwork as Network | undefined) ?? ENV.FORKING_NETWORK;

  if (forkingNetwork) {
    console.log('Forking network', forkingNetwork);
    await hre.network.provider.request({
      method: 'hardhat_reset',
      params: [
        {
          forking: {
            jsonRpcUrl: rpcUrls[forkingNetwork],
          },
        },
      ],
    });

    await mine();

    const chainId = chainIds[forkingNetwork];
    hre.network.config.chainId = chainId;
    hre.network.name = forkingNetwork;
  }

  const originalNetwork = taskArgs.originalNetwork as Network | undefined;
  const skipValidation = taskArgs.skipValidation as string | undefined;
  const deploymentConfig = taskArgs.deploymentConfig;
  const keys = taskArgs.keys as string | undefined;

  // Kept on hre: used by extended-hre, layerzero tasks, and shared script helpers
  hre.skipValidation = (skipValidation ?? 'false') === 'true';

  hre.action = action;
  hre.upgradeId = taskArgs.upgrade as string | undefined;

  if (action) {
    extendWithContext(hre, `${action}-${new Date().toISOString()}`);
  }

  if (mtoken) {
    if (!isMTokenName(mtoken)) {
      throw new Error('Invalid mtoken parameter');
    }

    hre.mtoken = mtoken;
  }

  if (ptoken) {
    if (!isPaymentTokenName(ptoken)) {
      throw new Error('Invalid ptoken parameter');
    }
    hre.paymentToken = ptoken;
  }

  if (
    deploymentConfig !== undefined &&
    !isDeploymentConfigName(deploymentConfig)
  ) {
    throw new Error(
      `Unknown deployment config "${deploymentConfig}". Available configs: default, ${deploymentConfigNames.join(
        ', ',
      )}`,
    );
  }

  const chainId = hre.network.config.chainId;
  if (chainId === undefined) {
    throw new Error('Network chain ID is not configured');
  }

  validateDeploymentProfileContext(deploymentConfig, hre.mtoken, chainId);
  hre.deploymentConfig = deploymentConfig;

  if (originalNetwork) {
    hre.layerZero = {
      originalNetwork,
    };
  }

  if (keys) {
    hre.addressBookKeys = keys.split(',').map((k: string) => k.trim());
  }

  if (taskArgs.calldata) {
    hre.calldata = { txs: [] };
    // the printed txs are copied from the log by `deploy:format-calldata`
    hre.logger.logToFile = true;
    fs.mkdirSync(hre.logger.logsFolderPath, { recursive: true });
  }

  // ad-hoc `runscript` has no declared params, so vault version is optional
  const hydrateParams = scriptParams.length
    ? scriptParams
    : [vaultVersionParam(true)];
  hydrateParams.forEach((param) => param().hydrate?.(hre, taskArgs));

  const scriptPath = taskArgs.path as string;
  const scriptPathResolved = path.resolve(scriptPath);
  const { default: run } = await import(scriptPathResolved);

  if (!run) {
    throw new Error('Script not found or it doesnt have a default export');
  }

  const params = scriptParams.map((param) => param().parse(hre, taskArgs));

  try {
    await run(hre, ...params);

    if (hre.calldata) {
      const logPath = path.relative(process.cwd(), getLogFilePath(hre));
      console.log(
        `\nCalldata mode: ${hre.calldata.txs.length} tx(s) printed, nothing sent. Copy them with:\n\nyarn deploy:format-calldata ${logPath}`,
      );
    }
  } finally {
    printLogFilePath(hre);
  }
};
