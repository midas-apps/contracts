import { HardhatContext } from 'hardhat/internal/context';
import { Environment as HardhatRuntimeEnvironmentImplementation } from 'hardhat/internal/core/runtime-environment';
import { HardhatRuntimeEnvironment } from 'hardhat/types';

import { extender, Network } from '../config';

export const getDefaultContext = (): HardhatContext => {
  // Context is registered globally as a singleton and can be accessed
  // using the static methods of the HardhatContext class
  //
  // In our case we require the context to exist, the other option would be
  // to create it and set it up - see packages/hardhat-core/src/register.ts for an example setup
  try {
    return HardhatContext.getHardhatContext();
  } catch (error: unknown) {
    throw new Error(`Could not get Hardhat context: ${error}`);
  }
};

export const getDefaultRuntimeEnvironment = (): HardhatRuntimeEnvironment => {
  // The first step is to get the hardhat context
  const context = getDefaultContext();

  // We require the hardhat environment to already exist
  //
  // Again, we could create it but that means we'd need to duplicate the bootstrap code
  // that hardhat does when setting up the environment
  try {
    return context.getHardhatRuntimeEnvironment();
  } catch (error: unknown) {
    throw new Error(`Could not get Hardhat Runtime Environment: ${error}`);
  }
};

export const getHreByNetworkName = async (network: Network) => {
  const context = getDefaultContext();
  const environment = getDefaultRuntimeEnvironment();

  try {
    // The last step is to create a duplicate environment that mimics the original one
    // with one crucial difference - the network setup
    const newHre = new HardhatRuntimeEnvironmentImplementation(
      environment.config,
      {
        ...environment.hardhatArguments,
        network,
      },
      environment.tasks,
      environment.scopes,
      context.environmentExtenders,
      environment.userConfig,
      context.providerExtenders,
      // This is a bit annoying - the environmentExtenders are not stronly typed
      // so TypeScript complains that the properties required by HardhatRuntimeEnvironment
      // are not present on HardhatRuntimeEnvironmentImplementation
    ) as unknown as HardhatRuntimeEnvironment;

    await extender(newHre, {
      contextId: environment.contextId,
    });

    return newHre;
  } catch (error: unknown) {
    throw new Error(`Could not setup Hardhat Runtime Environment: ${error}`);
  }
};
