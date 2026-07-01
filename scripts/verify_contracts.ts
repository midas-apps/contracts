import { HardhatRuntimeEnvironment } from 'hardhat/types';

import { readFileSync } from 'fs';
import { join } from 'path';

import { DeployFunction } from './deploy/common/types';

import {
  logDeployProxy,
  tryEtherscanVerifyImplementation,
} from '../helpers/utils';
import { getOpenZeppelinManifestFileName } from '../helpers/verify-proxy';

interface OpenZeppelinArtifact {
  proxies: { address: string }[];
}

const func: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  const artifactPath = join(
    process.cwd(),
    '.openzeppelin',
    getOpenZeppelinManifestFileName(hre.network.config.chainId!),
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
