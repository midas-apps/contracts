import { HardhatRuntimeEnvironment } from 'hardhat/types';

import * as fs from 'fs';
import * as path from 'path';

import { MTokenName } from '../../../config';
import { TokenAddresses } from '../../../config/constants/addresses';
import { getTokenContractNames } from '../../../helpers/contracts';

type AggregatorContractType = 'customAggregator' | 'customAggregatorGrowth';
type AggregatorAddressKey = 'customFeed' | 'customFeedGrowth';

type AggregatorInfo = {
  contractType: AggregatorContractType;
  addressKey: AggregatorAddressKey;
};

export type AggregatorTarget = AggregatorInfo & {
  filePath: string;
  isGrowth: boolean;
};

const REINITIALIZER_REGEX = /reinitializer\((\d+)\)/g;

export const detectAggregatorType = (
  tokenAddresses: TokenAddresses,
): AggregatorInfo => {
  if (tokenAddresses.customFeedGrowth) {
    return {
      contractType: 'customAggregatorGrowth',
      addressKey: 'customFeedGrowth',
    };
  }

  if (tokenAddresses.customFeed) {
    return {
      contractType: 'customAggregator',
      addressKey: 'customFeed',
    };
  }

  throw new Error(
    'No customFeed or customFeedGrowth address found for this product',
  );
};

// Single source of truth that picks the aggregator implementation file and
// proxy key together: the source file edited by `generate` MUST match the
// proxy targeted by `propose`/`execute`, otherwise the timelock executes a
// call that points at an implementation missing the new initializer.
export const resolveAggregatorTarget = (
  projectRoot: string,
  mToken: MTokenName,
  tokenAddresses: TokenAddresses,
): AggregatorTarget => {
  const info = detectAggregatorType(tokenAddresses);
  const contractNames = getTokenContractNames(mToken);
  const contractName = contractNames[info.contractType];

  if (!contractName) {
    throw new Error(
      `Contract name not found for ${mToken} ${info.contractType}`,
    );
  }

  const filePath = path.resolve(
    projectRoot,
    'contracts',
    'products',
    mToken,
    `${contractName}.sol`,
  );

  if (!fs.existsSync(filePath)) {
    throw new Error(`Contract file not found: ${filePath}`);
  }

  return {
    ...info,
    filePath,
    isGrowth: info.contractType === 'customAggregatorGrowth',
  };
};

const detectLatestInitializerVersion = (filePath: string): number => {
  const content = fs.readFileSync(filePath, 'utf-8');
  const matches = [...content.matchAll(REINITIALIZER_REGEX)];

  if (matches.length > 0) {
    return Math.max(...matches.map((m) => parseInt(m[1])));
  }

  return 1;
};

// Returns the initializer that should be CALLED by the upgrade. This must be
// the function `generate_deviationReinitializer` already added to the source
// file (not currentVersion + 1, which would point at a function that does
// not yet exist on the new implementation).
export const getUpgradeConfig = async (
  hre: HardhatRuntimeEnvironment,
  mToken: MTokenName,
  target: AggregatorTarget,
): Promise<{
  initializer: string;
  upgradeId: string;
}> => {
  const currentVersion = detectLatestInitializerVersion(target.filePath);
  const initializer = `initializeV${currentVersion}`;
  const upgradeId = `${mToken.toLowerCase()}-aggregator-deviation-v${currentVersion}`;

  const initializerExists = new RegExp(
    `function\\s+${initializer}\\s*\\(`,
  ).test(fs.readFileSync(target.filePath, 'utf-8'));

  if (!initializerExists) {
    throw new Error(
      `Resolved initializer ${initializer} is not defined in ${path.basename(
        target.filePath,
      )}. Run \`generate_deviationReinitializer --mtoken ${mToken}\` first.`,
    );
  }

  return { initializer, upgradeId };
};
