import { mine } from '@nomicfoundation/hardhat-network-helpers';
import {
  ConfigurableTaskDefinition,
  HardhatRuntimeEnvironment,
} from 'hardhat/types';

import path from 'node:path';

import { ParamFnBase, forkingNetworkParam } from './task-params';

import { ENV, chainIds, extendWithContext, rpcUrls } from '../../config';
import { Network } from '../../config';
import { isMTokenName, isPaymentTokenName } from '../../helpers/utils';

/** Truly global runner flags attached to every script task. */
export const globalRunScriptParams = [forkingNetworkParam(true)];

export const withGlobalRunScriptParams = (task: ConfigurableTaskDefinition) => {
  globalRunScriptParams.forEach((paramFn) => {
    const param = paramFn();
    if (param.isOptional) {
      task.addOptionalParam(param.name, param.description, param.defaultValue);
    } else {
      task.addParam(param.name, param.description, param.defaultValue);
    }
  });
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

  const forkingNetwork: Network =
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

  // Kept on hre: used by extended-hre, layerzero tasks, and shared script helpers
  hre.skipValidation = (skipValidation ?? 'false') === 'true';

  hre.action = action;

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

  if (originalNetwork) {
    hre.layerZero = {
      originalNetwork,
    };
  }

  const scriptPath = taskArgs.path as string;
  const scriptPathResolved = path.resolve(scriptPath);
  const { default: run } = await import(scriptPathResolved);

  if (!run) {
    throw new Error('Script not found or it doesnt have a default export');
  }

  const params = scriptParams.map((param) => param().parse(hre, taskArgs));

  await run(hre, ...params);
};
