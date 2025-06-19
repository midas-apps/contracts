import * as hre from 'hardhat';
import { HardhatRuntimeEnvironment } from 'hardhat/types';

import { execSync } from 'child_process';
import { readFileSync } from 'fs';
import { join } from 'path';

import { DeployFunction } from './deploy/common/types';

import { chainIds } from '../config';
import {
  logDeployProxy,
  tryEtherscanVerifyImplementation,
} from '../helpers/utils';
interface OpenZeppelinArtifact {
  proxies: { address: string }[];
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

const func: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  const artifactPath = join(
    process.cwd(),
    '.openzeppelin',
    getFileName(hre.network.config.chainId!),
  );
  const artifactContent = readFileSync(artifactPath, 'utf-8');
  const artifact: OpenZeppelinArtifact = JSON.parse(artifactContent);

  console.log(`Verifying proxy contracts ${artifact.proxies.length}...`);
  for (const { address } of artifact.proxies) {
    await logDeployProxy(hre, 'Contract', address);
    await tryEtherscanVerifyImplementation(hre, address);
  }
};

export default func;
