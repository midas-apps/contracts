import { JsonRpcProvider } from '@ethersproject/providers';
import { extendEnvironment } from 'hardhat/config';
import { EIP1193Provider, HardhatRuntimeEnvironment } from 'hardhat/types';

import path from 'path';

import {
  DataFeedAddresses,
  midasAddressesPerNetwork,
  TokenAddresses,
} from '../constants/addresses';
import { ENV } from '../env';

const extendDeployment = async (hre: HardhatRuntimeEnvironment) => {
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
          address: a?.layerZero?.mintBurnAdapter,
        },
        {
          abi: hre.artifacts.readArtifactSync('LzElevatedMinterBurner').abi,
          address: a?.layerZero?.minterBurner,
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

const extendWithCustomSigner = async (hre: HardhatRuntimeEnvironment) => {
  const customSignerScript = ENV.CUSTOM_SIGNER_SCRIPT_PATH;

  if (!customSignerScript) {
    const { deployer } = await hre.getNamedAccounts();
    const deployerSigner = await hre.ethers.getSigner(deployer);

    hre.customSigner = {
      getWalletAddress: async () => {
        return deployer;
      },
      createAddressBookContract: async (_) => {
        throw new Error(
          'createAddressBookContract is not available for hardhat signer',
        );
      },
      sendTransaction: async (transaction, metadata) => {
        console.log('hre', hre.network.name);
        console.log('hre', await hre.ethers.provider.getNetwork());
        const tx = await deployerSigner.sendTransaction({
          ...transaction,
        });
        return {
          type: 'hardhatSigner',
          tx,
        };
      },
      getWeb3Provider: async ({ rpcUrl }) => {
        return deployerSigner.connect(
          new JsonRpcProvider(rpcUrl),
        ) as unknown as EIP1193Provider;
      },
    };
  } else {
    const scriptPathResolved = path.resolve(customSignerScript);
    const {
      signTransaction,
      createAddressBookContract,
      getWalletAddressForAction,
      getWeb3Provider,
    } = await import(scriptPathResolved);

    hre.customSigner = {
      getWalletAddress: async (action, mtokenOverride) => {
        return getWalletAddressForAction(action, mtokenOverride ?? hre.mtoken);
      },
      createAddressBookContract: async (data) => {
        return {
          payload: await createAddressBookContract({
            ...data,
            chainId: hre.network.config.chainId,
            mToken: hre.mtoken,
          }),
        };
      },

      sendTransaction: async (transaction, txSignMetadata) => {
        return {
          type: 'customSigner',
          payload: await signTransaction(transaction, {
            chain: {
              name: hre.network.name,
              id: hre.network.config.chainId,
            },
            mToken: hre.mtoken,
            ...txSignMetadata,
          }),
        };
      },
      getWeb3Provider: async ({ chainId, rpcUrl, action }) => {
        return getWeb3Provider({ chainId, rpcUrl, action });
      },
    };
  }
};

export const extender = async (hre: HardhatRuntimeEnvironment) => {
  await extendDeployment(hre);
  await extendWithCustomSigner(hre);
};

export const extend = async () => {
  extendEnvironment(extender);
};
