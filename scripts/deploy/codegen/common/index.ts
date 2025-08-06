import { cancel, isCancel, multiselect, text } from '@clack/prompts';
import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { Project, SyntaxKind } from 'ts-morph';

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
      | Promise<
          | {
              name: string;
              content: string;
            }
          | undefined
        >
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

export const updateConfigFiles = (
  hre: HardhatRuntimeEnvironment,
  {
    contractNamePrefix,
    rolesPrefix,
    name,
    symbol,
    mToken,
  }: {
    contractNamePrefix: string;
    rolesPrefix: string;
    name: string;
    symbol: string;
    mToken: string;
  },
) => {
  const project = new Project();

  const mTokensFile = project.addSourceFileAtPath(
    path.join(hre.config.paths.root, 'config/types/tokens.ts'),
  );

  const contractPrefixesFile = project.addSourceFileAtPath(
    path.join(hre.config.paths.root, 'helpers', 'contracts.ts'),
  );

  const rolesFile = project.addSourceFileAtPath(
    path.join(hre.config.paths.root, 'helpers', 'roles.ts'),
  );

  const contractNameFile = project.addSourceFileAtPath(
    path.join(hre.config.paths.root, 'helpers', 'mtokens-metadata.ts'),
  );

  const mTokensEnum = mTokensFile.getEnumOrThrow('MTokenNameEnum');

  const contractPrefixesVar =
    contractPrefixesFile.getVariableDeclarationOrThrow('contractNamesPrefixes');

  const rolesVar = rolesFile.getVariableDeclarationOrThrow('prefixes');

  const contractNameVar =
    contractNameFile.getVariableDeclarationOrThrow('mTokensMetadata');

  mTokensEnum.addMember({
    name: mToken,
    initializer: `"${mToken}"`,
  });

  {
    const initializer = contractPrefixesVar.getInitializerOrThrow();
    const objLiteral = initializer.asKindOrThrow(
      SyntaxKind.ObjectLiteralExpression,
    );

    objLiteral.addPropertyAssignment({
      name: mToken,
      initializer: (writer) => writer.write(`'${contractNamePrefix}'`),
    });
  }

  {
    const initializer = rolesVar.getInitializerOrThrow();
    const objLiteral = initializer.asKindOrThrow(
      SyntaxKind.ObjectLiteralExpression,
    );

    objLiteral.addPropertyAssignment({
      name: mToken,
      initializer: (writer) => writer.write(`'${rolesPrefix}'`),
    });
  }

  {
    const initializer = contractNameVar.getInitializerOrThrow();
    const objLiteral = initializer.asKindOrThrow(
      SyntaxKind.ObjectLiteralExpression,
    );

    objLiteral.addPropertyAssignment({
      name: mToken,
      initializer: (writer) =>
        writer.write(`{ name: '${name}', symbol: '${symbol}' }`),
    });
  }

  contractPrefixesFile.saveSync();
  rolesFile.saveSync();
  contractNameFile.saveSync();
  mTokensFile.saveSync();
};

const requireNotCancelled = <T>(value: T | symbol) => {
  if (isCancel(value)) {
    cancel('Operation cancelled.');
    process.exit(0);
  }

  return value;
};

const getConfigFromUser = async () => {
  const tokenContractName = requireNotCancelled(
    await text({
      message: 'What is the token contract name?',
      placeholder: 'mRe7SOL',
      initialValue: undefined,
      validate(value) {
        if (!value || value.length === 0) return `Value is required!`;
      },
    }),
  );

  const tokenName = requireNotCancelled(
    await text({
      message: 'What is the token name?',
      placeholder: 'Midas Re7SOL',
      initialValue: undefined,
      validate(value) {
        if (!value || value.length === 0) return `Value is required!`;
      },
    }),
  );

  const tokenSymbol = requireNotCancelled(
    await text({
      message: 'What is the token symbol?',
      placeholder: 'mRe7SOL',
      initialValue: tokenContractName,
      validate(value) {
        if (!value || value.length === 0) return `Value is required!`;
      },
    }),
  );

  const contractNamePrefix = requireNotCancelled(
    await text({
      message: 'What is the contract name prefix?',
      placeholder: 'MRe7Sol',
      initialValue: undefined,
      validate(value) {
        if (!value || value.length === 0) return `Value is required!`;
      },
    }),
  );

  const rolesPrefix = requireNotCancelled(
    await text({
      message: 'What is the roles prefix?',
      placeholder: 'M_RE7SOL',
      initialValue: undefined,
      validate(value) {
        if (!value || value.length === 0) return `Value is required!`;
      },
    }),
  );

  return {
    tokenName,
    contractNamePrefix,
    rolesPrefix,
    tokenSymbol,
    tokenContractName,
  };
};
export const generateContracts = async (hre: HardhatRuntimeEnvironment) => {
  const config = await getConfigFromUser();

  const contractsToGenerate = requireNotCancelled(
    await multiselect<keyof TokenContractNames>({
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
      initialValues: [
        'token',
        'dv',
        'rvSwapper',
        'dataFeed',
        'customAggregator',
      ],
      required: true,
    }),
  );

  const mToken = config.tokenContractName;

  updateConfigFiles(hre, {
    contractNamePrefix: config.contractNamePrefix,
    rolesPrefix: config.rolesPrefix,
    name: config.tokenName,
    symbol: config.tokenSymbol,
    mToken,
  });

  const folder = path.join(hre.config.paths.root, 'contracts', `${mToken}`);

  console.log(folder);

  const isFolderExists = fs.existsSync(folder);

  if (isFolderExists) {
    fs.rmSync(folder, { recursive: true });
  }

  fs.mkdirSync(folder, { recursive: true });

  const generators = [
    getTokenRolesContractFromTemplate,
    ...contractsToGenerate.map((contract) => generatorPerContract[contract]),
  ].filter((v) => v !== undefined);

  const generatedContracts = await Promise.all(
    generators.map((generator) => generator(mToken as MTokenName)),
  );

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
