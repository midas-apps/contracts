import { HardhatRuntimeEnvironment } from 'hardhat/types';

import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

import { resolveAggregatorTarget } from './common/aggregator-deviation';

import { getCurrentAddresses } from '../../config/constants/addresses';
import { contractNamesPrefixes } from '../../helpers/contracts';
import { getMTokenOrThrow } from '../../helpers/utils';
import { DeployFunction } from '../deploy/common/types';

const Patterns = {
  reinitializerVersion: /reinitializer\((\d+)\)/g,
  feedAdminRole: /function feedAdminRole\(\)/,
  growthInheritance: /CustomAggregatorV3CompatibleFeedGrowth/,
  initializeOverride: /function initialize\(/,
  initChainCall: /initializeV(\d+)\(_maxAnswerDeviation\);/g,
} as const;

const growthParamsExtra = `
        int80 _minGrowthApr,
        int80 _maxGrowthApr,
        bool _onlyUp,`;

const growthSuperExtra = `
            _minGrowthApr,
            _maxGrowthApr,
            _onlyUp,`;

/** Comment + `initializeV*(_maxAnswerDeviation);` inside `initialize()`. */
const initChainSnippet = (version: number) =>
  `        // call v${version} to increase contract version to ${version}\n        initializeV${version}(_maxAnswerDeviation);`;

const runPrettierOnSol = (
  projectRoot: string,
  relativePaths: string[],
): void => {
  for (const rel of relativePaths) {
    try {
      execSync(`yarn prettier "${rel}" --write`, {
        cwd: projectRoot,
        stdio: 'inherit',
      });
    } catch {
      console.warn(`Prettier failed for ${rel} — run: yarn format:sol:fix`);
    }
  }
};

const maxReinitializerVersion = (content: string): number => {
  const matches = [...content.matchAll(Patterns.reinitializerVersion)];
  return matches.length === 0
    ? 1
    : Math.max(...matches.map((m) => parseInt(m[1], 10)));
};

const buildReinitializer = (version: number, isGrowth: boolean): string => {
  const prefix = isGrowth ? 'CAG' : 'CA';
  return [
    '    /**',
    '     * @notice reinitializes the contract with a new max answer deviation',
    '     * @param _newMaxAnswerDeviation new max answer deviation',
    '     */',
    `    function initializeV${version}(uint256 _newMaxAnswerDeviation)`,
    '        public',
    `        reinitializer(${version})`,
    '    {',
    '        require(',
    `            _newMaxAnswerDeviation <= 100 * (10**decimals()),`,
    `            "${prefix}: !max deviation"`,
    '        );',
    '',
    '        maxAnswerDeviation = _newMaxAnswerDeviation;',
    '    }',
  ].join('\n');
};

const buildInitializeOverride = (
  version: number,
  isGrowth: boolean,
): string => {
  const doc = isGrowth
    ? 'CustomAggregatorV3CompatibleFeedGrowth'
    : 'CustomAggregatorV3CompatibleFeed';
  const growthParams = isGrowth ? growthParamsExtra : '';
  const growthSuper = isGrowth ? growthSuperExtra : '';
  return `    /**
     * @inheritdoc ${doc}
     */
    function initialize(
        address _accessControl,
        int192 _minAnswer,
        int192 _maxAnswer,
        uint256 _maxAnswerDeviation,${growthParams}
        string calldata _description
    ) public override {
        super.initialize(
            _accessControl,
            _minAnswer,
            _maxAnswer,
            _maxAnswerDeviation,${growthSuper}
            _description
        );
${initChainSnippet(version)}
    }`;
};

const insertBeforeFeedAdmin = (
  content: string,
  feedAdminIndex: number,
): number => {
  const before = content.slice(0, feedAdminIndex);
  const close = before.lastIndexOf('*/');
  if (close === -1) {
    return feedAdminIndex;
  }
  const open = before.lastIndexOf('/**');
  if (open !== -1 && open < close && before.slice(close + 2).trim() === '') {
    const lineStart = before.lastIndexOf('\n', open - 1);
    return lineStart !== -1 ? lineStart + 1 : open;
  }
  return feedAdminIndex;
};

const func: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  const mToken = getMTokenOrThrow(hre);
  if (!contractNamesPrefixes[mToken]) {
    throw new Error(`Unknown mToken: ${mToken}`);
  }

  const projectRoot = hre.config.paths.root;
  const networkAddresses = getCurrentAddresses(hre);
  const tokenAddresses = networkAddresses?.[mToken];
  if (!tokenAddresses) {
    throw new Error(`Token addresses not found for ${mToken}`);
  }

  // Same resolver as propose/execute so generate edits the file behind the
  // proxy that the upgrade will eventually call (avoids the regular-vs-growth
  // mismatch class).
  const { filePath, isGrowth: growthFromPath } = resolveAggregatorTarget(
    projectRoot,
    mToken,
    tokenAddresses,
  );
  let content = fs.readFileSync(filePath, 'utf-8');
  const isGrowth = growthFromPath || Patterns.growthInheritance.test(content);

  const currentVersion = maxReinitializerVersion(content);
  const nextVersion = currentVersion + 1;

  if (
    new RegExp(`function\\s+initializeV${nextVersion}\\s*\\(`).test(content)
  ) {
    console.log(
      `initializeV${nextVersion} already in ${path.basename(filePath)} — skip.`,
    );
    return;
  }

  const feedAdminMatch = content.match(Patterns.feedAdminRole);
  if (!feedAdminMatch || feedAdminMatch.index === undefined) {
    throw new Error(`feedAdminRole() not found in ${path.basename(filePath)}`);
  }

  const insertionIndex = insertBeforeFeedAdmin(content, feedAdminMatch.index);

  const reinitializerCode = buildReinitializer(nextVersion, isGrowth);
  const hasInitializeOverride = Patterns.initializeOverride.test(content);
  const insertedBlock = hasInitializeOverride
    ? reinitializerCode
    : [
        buildInitializeOverride(nextVersion, isGrowth),
        '',
        reinitializerCode,
      ].join('\n');

  content =
    content.slice(0, insertionIndex).replace(/\n+$/, '\n\n') +
    insertedBlock +
    '\n\n' +
    content.slice(insertionIndex);

  if (hasInitializeOverride) {
    const chainMatches = [...content.matchAll(Patterns.initChainCall)];
    if (chainMatches.length === 0) {
      throw new Error(
        'initialize() override present but no initializeV*(_maxAnswerDeviation) chain found',
      );
    }
    const lastMatch = chainMatches[chainMatches.length - 1];
    const afterLastCall = lastMatch.index! + lastMatch[0].length;
    content =
      content.slice(0, afterLastCall) +
      '\n' +
      initChainSnippet(nextVersion) +
      content.slice(afterLastCall);
  }

  fs.writeFileSync(filePath, content, 'utf-8');

  runPrettierOnSol(projectRoot, [path.relative(projectRoot, filePath)]);

  const fileRel = path.relative(projectRoot, filePath);

  console.log('\n--- Deviation Reinitializer Generator ---');
  console.log(`Product:     ${mToken}`);
  console.log(`File:        ${fileRel}`);
  console.log(`Feed:        ${isGrowth ? 'Growth' : 'Regular'}`);
  console.log(`Version:     ${currentVersion} → +initializeV${nextVersion}`);
  console.log(
    hasInitializeOverride
      ? `initialize(): chained V${nextVersion}`
      : `initialize(): new override + V${nextVersion}`,
  );
  console.log('\nThen: yarn codestyle:fix && npx hardhat compile');
  if (isGrowth && !hasInitializeOverride) {
    console.log(
      'Growth: if compile fails, edit `initialize` in contracts/feeds/CustomAggregatorV3CompatibleFeedGrowth.sol (e.g. add virtual / adjust visibility per the compiler) once.',
    );
  }
};

export default func;

// npx hardhat runscript scripts/upgrades/generate_deviationReinitializer.ts --network main --mtoken <mToken>
