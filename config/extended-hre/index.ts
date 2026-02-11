import { extendEnvironment } from 'hardhat/config';
import { EIP1193Provider, HardhatRuntimeEnvironment } from 'hardhat/types';

import path from 'path';

import { initializeLogger } from '../../helpers/logger';
import {
  DataFeedAddresses,
  midasAddressesPerNetwork,
  TokenAddresses,
} from '../constants/addresses';
import { ENV } from '../env';
import { isTestnetNetwork, rpcUrls } from '../networks';
import { Network } from '../types';

export const extendWithContext = (
  hre: HardhatRuntimeEnvironment,
  overrideContext?: string,
) => {
  hre.contextId = overrideContext ?? `${new Date().toISOString()}`;
};

const extendDeployment = (hre: HardhatRuntimeEnvironment) => {
  const lzAddresses = Object.values(midasAddressesPerNetwork)
    .map((v) => [
      (Object.values(v?.paymentTokens ?? {}) as DataFeedAddresses[]).map(
        (a) => [
          {
            abi: hre.artifacts.readArtifactSync('MidasLzOFTAdapter').abi,
            address: a?.layerZero?.oft,
          },
        ],
      ),
      (Object.values(v ?? {}) as TokenAddresses[]).map((a) => [
        {
          abi: hre.artifacts.readArtifactSync('MidasLzMintBurnOFTAdapter').abi,
          address: a?.layerZero?.oft,
        },
      ]),
    ])
    .flat(3)
    .filter((v) => !!v.address);
  const original = hre.deployments.getDeploymentsFromAddress;

  hre.deployments.getDeploymentsFromAddress = async (address: string) => {
    const found = lzAddresses.find((v) => v.address === address);
    if (found) {
      return [{ address, abi: found.abi }];
    }
    return original(address);
  };
};

const extendWithCustomSigner = (hre: HardhatRuntimeEnvironment) => {
  const customSignerScript = ENV.CUSTOM_SIGNER_SCRIPT_PATH;

  const isTestnet = isTestnetNetwork(hre.network.name as Network);

  if (!customSignerScript || isTestnet) {
    hre.getCustomSigner = async () => {
      const { deployer } = await hre.getNamedAccounts();
      const deployerSigner = await hre.ethers.getSigner(deployer);

      return {
        type: 'hardhatSigner',
        getWalletAddress: async () => {
          return deployer;
        },
        createAddressBookContract: async (_) => {
          throw new Error(
            'createAddressBookContract is not available for hardhat signer',
          );
        },
        sendTransaction: async (transaction) => {
          const tx = await deployerSigner.sendTransaction({
            ...transaction,
          });
          return {
            tx,
          };
        },
        getWeb3Provider: async () => {
          return deployerSigner as unknown as EIP1193Provider;
        },
      };
    };
  } else if (customSignerScript) {
    const scriptPathResolved = path.resolve(customSignerScript);

    hre.getCustomSigner = async () => {
      const {
        signEVMTransaction,
        createEVMAddressBookContract,
        getEVMWalletAddressForAction,
        getEVMProvider,
      } = await import(scriptPathResolved);

      return {
        type: 'customSigner',
        getWalletAddress: async (action, mtokenOverride, chainId) => {
          return getEVMWalletAddressForAction(
            action,
            mtokenOverride ?? hre.mtoken,
            chainId,
          );
        },
        createAddressBookContract: async (data) => {
          return {
            payload: await createEVMAddressBookContract({
              ...data,
              chainId: hre.network.config.chainId,
              mToken: hre.mtoken,
            }),
          };
        },
        sendTransaction: async (transaction, txSignMetadata) => {
          return {
            payload: await signEVMTransaction(transaction, {
              chain: {
                name: hre.network.name,
                id: hre.network.config.chainId,
              },
              mToken: hre.mtoken,
              idempotenceId: txSignMetadata?.idempotenceId,
              ...txSignMetadata,
            }),
          };
        },
        getWeb3Provider: async ({ action }) => {
          const chainId = hre.network.config.chainId!;
          const rpcUrl = rpcUrls[hre.network.name as Network];
          return getEVMProvider({
            chainId,
            rpcUrl,
            action,
          });
        },
      };
    };
  }
};

export const extendWithLogger = (hre: HardhatRuntimeEnvironment) => {
  const logToFile = ENV.LOG_TO_FILE;
  const logsFolderPath =
    ENV.LOGS_FOLDER_PATH ?? path.resolve(hre.config.paths.root, 'logs/');

  initializeLogger(hre);

  hre.logger = {
    logToFile,
    logsFolderPath,
  };
};

export const extender = (
  hre: HardhatRuntimeEnvironment,
  overrides?: {
    contextId?: string;
  },
) => {
  extendWithContext(hre, overrides?.contextId);
  try {
    extendDeployment(hre);
  } catch (error) {
    // silently catching errors as readArtifactSync will throw during build step
  }
  extendWithCustomSigner(hre);
  extendWithLogger(hre);
};

export const extend = () => {
  extendEnvironment(extender);
};
