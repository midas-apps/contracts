import { ethers } from 'hardhat';
import { HardhatRuntimeEnvironment } from 'hardhat/types';

import { execSync } from 'child_process';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

import { DeployFunction } from './deploy/common/types';

import { chainIds, Network, rpcUrls } from '../config';
import {
  logDeployProxy,
  tryEtherscanVerifyImplementation,
} from '../helpers/utils';
interface OpenZeppelinArtifact {
  admin: { address: string };
}

const fileNameOverrides = {
  [chainIds.sepolia]: 'sepolia',
  [chainIds.main]: 'mainnet',
  [chainIds.arbitrum]: 'arbitrum-one',
};
const getFileName = (chainId: number) => {
  const name = fileNameOverrides[chainId] ?? `unknown-${chainId}`;
  return name + '.json';
};

const allChainIds = Object.values(chainIds);

const func: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  for (const chainId of allChainIds) {
    const chainName = Object.entries(chainIds).find(
      ([_, id]) => id === chainId,
    )?.[0];

    if (!chainName) {
      throw new Error(`Chain ID ${chainId} not found`);
    }

    const artifactPath = join(
      process.cwd(),
      '.openzeppelin',
      getFileName(chainId),
    );
    if (!existsSync(artifactPath)) {
      console.log(`${chainId} (${chainName}):   Not found`);
      continue;
    }

    const artifactContent = readFileSync(artifactPath, 'utf-8');
    const artifact: OpenZeppelinArtifact = JSON.parse(artifactContent);
    const rpc = rpcUrls[chainName as Network];

    const chainClient = new ethers.providers.JsonRpcProvider(rpc);
    const admin = new ethers.Contract(
      artifact.admin.address,
      [
        {
          inputs: [],
          name: 'owner',
          outputs: [
            {
              internalType: 'address',
              name: '',
              type: 'address',
            },
          ],
          stateMutability: 'view',
          type: 'function',
        },
      ],
      chainClient,
    );
    const owner = await admin.owner();

    console.log(`${chainId} (${chainName}): ${owner}`);
  }
};

export default func;
