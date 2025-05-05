import { EvmChainId, FordefiWeb3Provider } from '@fordefi/web3-provider';
import { providers } from 'ethers';
import * as hre from 'hardhat';

import fs from 'fs';
import path from 'path';

import { ENV, Network, rpcUrls } from '../config';
const privateKeyFilePath = path.join(__dirname, '../secrets/fordefi-pk.key');

export const getFordefiProvider = ({
  vaultAddress,
}: {
  vaultAddress: `0x${string}`;
}) => {
  const { FORDEFI_API_USER_TOKEN } = ENV;

  if (!FORDEFI_API_USER_TOKEN) {
    throw new Error('FORDEFI_API_USER_TOKEN is not set');
  }

  const pemPrivateKey =
    fs.readFileSync(privateKeyFilePath, 'utf8') ??
    (() => {
      throw new Error(
        'pemPrivateKey is not found by path: ' + privateKeyFilePath,
      );
    })();

  const chainId = hre.network.config.chainId as EvmChainId;
  const provider = new FordefiWeb3Provider({
    address: vaultAddress,
    apiUserToken: FORDEFI_API_USER_TOKEN,
    apiPayloadSignKey: pemPrivateKey,
    chainId,
    rpcUrl: rpcUrls[hre.network.name as Network],
  });

  return new providers.Web3Provider(provider);
};
