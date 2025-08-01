import { cancel, isCancel, multiselect } from '@clack/prompts';
import { HardhatRuntimeEnvironment } from 'hardhat/types';

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

import {
  getCustomAggregatorContractFromTemplate,
  getDataFeedContractFromTemplate,
  getDvContractFromTemplate,
  getRvContractFromTemplate,
  getRvSwapperContractFromTemplate,
  getRvUstbContractFromTemplate,
  getTokenContractFromTemplate,
  getTokenRolesContractFromTemplate,
} from './templates';

import { MTokenName } from '../../../../config';
import { TokenContractNames } from '../../../../helpers/contracts';

const generatorPerContract: Partial<
  Record<
    keyof TokenContractNames,
    (mToken: MTokenName) =>
      | {
          name: string;
          content: string;
        }
      | undefined
  >
> = {
  token: getTokenContractFromTemplate,
  dv: getDvContractFromTemplate,
  rv: getRvContractFromTemplate,
  rvSwapper: getRvSwapperContractFromTemplate,
  rvUstb: getRvUstbContractFromTemplate,
  dataFeed: getDataFeedContractFromTemplate,
  customAggregator: getCustomAggregatorContractFromTemplate,
};

export const generateContracts = async (
  hre: HardhatRuntimeEnvironment,
  mToken: MTokenName,
) => {
  const folder = path.join(hre.config.paths.root, 'contracts', `${mToken}`);

  console.log(folder);

  const isFolderExists = fs.existsSync(folder);

  if (isFolderExists) {
    fs.rmSync(folder, { recursive: true });
  }

  fs.mkdirSync(folder, { recursive: true });

  const contractsToGenerate = await multiselect<keyof TokenContractNames>({
    message:
      'Select contracts to generate. (Space to select, Enter to confirm)',
    options: [
      { value: 'token', label: 'Token', hint: 'Token contract' },
      { value: 'dv', label: 'Deposit Vault', hint: 'Deposit Vault contract' },
      {
        value: 'rv',
        label: 'Redemption Vault',
        hint: 'Redemption Vault contract',
      },
      {
        value: 'rvSwapper',
        label: 'Redemption Vault With Swapper',
        hint: 'Redemption Vault With Swapper contract',
      },
      {
        value: 'rvUstb',
        label: 'Redemption Vault With USTB',
        hint: 'Redemption Vault With USTB contract',
      },
      { value: 'dataFeed', label: 'Data Feed', hint: 'Data Feed contract' },
      {
        value: 'customAggregator',
        label: 'Custom Aggregator',
        hint: 'Custom Aggregator contract',
      },
    ],
    initialValues: ['token', 'dv', 'rvSwapper', 'dataFeed', 'customAggregator'],
    required: true,
  });

  if (isCancel(contractsToGenerate)) {
    cancel('Operation cancelled.');
    process.exit(0);
  }

  const generators = [
    getTokenRolesContractFromTemplate,
    ...contractsToGenerate.map((contract) => generatorPerContract[contract]),
  ].filter((v) => v !== undefined);

  const generatedContracts = generators.map((generator) => generator(mToken));

  for (const contract of generatedContracts) {
    if (!contract) {
      cancel(`Contract ${contract} is not available for a provided mToken`);
      process.exit(0);
    }

    fs.writeFileSync(
      path.join(folder, `${contract.name}.sol`),
      contract.content,
    );
  }

  // run lint&format fix for generated contracts
  try {
    execSync(
      `yarn solhint ${folder}/**/*.sol --quiet --fix > /dev/null & yarn prettier ${folder}/**/*.sol --write > /dev/null`,
      {
        stdio: 'inherit',
      },
    );
  } catch (error) {
    cancel('Failed to run lint&format fix for generated contracts');
    process.exit(1);
  }
};
