import { HardhatRuntimeEnvironment } from 'hardhat/types';

import { verifyReinitializersConsumed } from './common/reinitializer';

import { MTokenName } from '../../config';
import {
  getCurrentAddresses,
  VaultType,
} from '../../config/constants/addresses';
import {
  getCommonContractNames,
  getTokenContractNames,
  TokenContractNames,
  vaultTypeToContractName,
} from '../../helpers/contracts';
import { DeployFunction } from '../deploy/common/types';

// Verifies that every upgradeable contract of the given mToken on the current
// network has consumed its top reinitializer (read-only; no tx sent).
const func: DeployFunction = async (
  hre: HardhatRuntimeEnvironment,
  mToken: MTokenName,
) => {
  const addresses = getCurrentAddresses(hre);
  const tokenAddresses = addresses?.[mToken];
  if (!tokenAddresses) throw new Error(`Addresses not found for ${mToken}`);

  const names = getTokenContractNames(mToken);
  const adjustedFeedName = getCommonContractNames().customAggregatorAdjusted;

  const contractNameForKey = (key: string): string | undefined => {
    switch (key) {
      case 'token':
        return names.token;
      case 'customFeed':
        return names.customAggregator;
      case 'customFeedGrowth':
        return names.customAggregatorGrowth;
      case 'customFeedAdjusted':
      case 'customFeedDv':
      case 'customFeedRv':
        return adjustedFeedName;
      case 'dataFeed':
      case 'dataFeedDv':
      case 'dataFeedRv':
        return names.dataFeed;
      default: {
        const vaultKey = vaultTypeToContractName(key as VaultType);
        return vaultKey
          ? (names[vaultKey as keyof TokenContractNames] as string | undefined)
          : undefined;
      }
    }
  };

  let checked = 0;
  const skipped: string[] = [];

  for (const [key, value] of Object.entries(tokenAddresses)) {
    if (typeof value !== 'string') continue; // layerZero/axelar sub-objects
    const contractName = contractNameForKey(key);
    if (!contractName) {
      skipped.push(`${key} (${value})`);
      continue;
    }
    const { abi } = await hre.artifacts.readArtifact(contractName);
    await verifyReinitializersConsumed({
      provider: hre.ethers.provider,
      proxyAddress: value,
      abi,
    });
    console.log(`OK  ${mToken}.${key} ${value} (${contractName})`);
    checked++;
  }

  if (skipped.length > 0) {
    console.warn(
      `Skipped ${skipped.length} address key(s) with no contract mapping — ` +
        `extend contractNameForKey if any of these are upgradeable proxies: ` +
        skipped.join(', '),
    );
  }
  console.log(`\nReinitializer verify passed for ${checked} contract(s).`);
};

export default func;
