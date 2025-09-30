import {
  cancel,
  confirm,
  group,
  isCancel,
  multiselect,
  stream,
  tasks,
  text,
} from '@clack/prompts';
import { HardhatRuntimeEnvironment } from 'hardhat/types';
import {
  ObjectLiteralExpression,
  Project,
  PropertyAssignment,
  SourceFile,
  SyntaxKind,
} from 'ts-morph';

import { execSync } from 'child_process';
import fs from 'fs/promises';
import path from 'path';

import {
  getCustomAggregatorContractFromTemplate,
  getCustomAggregatorGrowthContractFromTemplate,
  getDataFeedContractFromTemplate,
  getDvContractFromTemplate,
  getRvContractFromTemplate,
  getRvSwapperContractFromTemplate,
  getRvUstbContractFromTemplate,
  getTokenContractFromTemplate,
  getTokenRolesContractFromTemplate,
} from './templates';
import {
  configsPerNetworkConfig,
  getDeploymentConfigFromUser,
} from './ui/deployment-config';
import {
  getConfigFromUser,
  getContractsToGenerateFromUser,
} from './ui/deployment-contracts';

import { MTokenName } from '../../../../config';
import {
  contractNameToVaultType,
  TokenContractNames,
} from '../../../../helpers/contracts';
import { PostDeployConfig } from '../../common/types';

export const EXPR = Symbol('expr');
export type CodeExpr = { [EXPR]: string };

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
  customAggregatorGrowth: getCustomAggregatorGrowthContractFromTemplate,
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

    if (!objLiteral.getProperty(mToken)) {
      objLiteral.addPropertyAssignment({
        name: mToken,
        initializer: (writer) => writer.write(`'${contractNamePrefix}'`),
      });
    }
  }

  {
    const initializer = rolesVar.getInitializerOrThrow();
    const objLiteral = initializer.asKindOrThrow(
      SyntaxKind.ObjectLiteralExpression,
    );

    if (!objLiteral.getProperty(mToken)) {
      objLiteral.addPropertyAssignment({
        name: mToken,
        initializer: (writer) => writer.write(`'${rolesPrefix}'`),
      });
    }
  }

  {
    const initializer = contractNameVar.getInitializerOrThrow();
    const objLiteral = initializer.asKindOrThrow(
      SyntaxKind.ObjectLiteralExpression,
    );

    if (!objLiteral.getProperty(mToken)) {
      objLiteral.addPropertyAssignment({
        name: mToken,
        initializer: (writer) =>
          writer.write(`{
            name: '${name}',
            symbol: '${symbol}'
          }`),
      });
    }
  }

  const files = [
    mTokensFile,
    contractPrefixesFile,
    rolesFile,
    contractNameFile,
  ];

  for (const file of files) {
    file.saveSync();
    lintAndFormatTs(file.getFilePath());
  }
};

export const requireNotCancelled = <T>(value: T | symbol) => {
  if (isCancel(value)) {
    cancel('Operation cancelled.');
    process.exit(0);
  }

  return value;
};

const lintAndFormatTs = (path: string) => {
  try {
    execSync(
      `yarn prettier "${path}" --write > /dev/null && eslint "${path}" --fix > /dev/null`,
      {
        stdio: 'inherit',
      },
    );
  } catch (error) {
    cancel('Failed to run lint&format fix for generated contracts');
    process.exit(1);
  }
};

const lintAndFormatSol = (folder: string) => {
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

export const expr = (code: string): CodeExpr => ({ [EXPR]: code });

function objectToCode(value: any, indent = 0): string {
  const pad = ' '.repeat(indent);
  if (value && typeof value === 'object' && EXPR in value)
    return (value as CodeExpr)[EXPR]; // ← raw

  if (Array.isArray(value)) {
    return `[${value.map((v) => objectToCode(v, indent)).join(', ')}]`;
  }

  if (value && typeof value === 'object') {
    const entries = Object.entries(value).map(
      ([k, v]) => `${pad}  ${k}: ${objectToCode(v, indent + 2)}`,
    );
    return `{\n${entries.join(',\n')}\n${pad}}`;
  }

  if (typeof value === 'string') return JSON.stringify(value); // quoted only for *real* strings
  if (value === null) return 'null';
  return String(value);
}

const getDeploymentConfigObject = (
  deploymentConfigFile: SourceFile,
  deploymentConfigVarName: string,
) => {
  const varDecl = deploymentConfigFile.getVariableDeclarationOrThrow(
    deploymentConfigVarName,
  );
  const initializer = varDecl.getInitializerOrThrow();
  return initializer.asKindOrThrow(SyntaxKind.ObjectLiteralExpression);
};
const getNetworkConfigObject = (
  deploymentConfigObject: ObjectLiteralExpression,
) => {
  const networkConfigsProp = deploymentConfigObject
    .getPropertyOrThrow('networkConfigs')
    .asKindOrThrow(SyntaxKind.PropertyAssignment);

  // 5. Insert a new property in `networkConfigs`
  const networkConfigsObj = networkConfigsProp.getInitializerIfKindOrThrow(
    SyntaxKind.ObjectLiteralExpression,
  );

  return networkConfigsObj;
};

export const generateDeploymentConfig = async (
  hre: HardhatRuntimeEnvironment,
  mToken: MTokenName,
) => {
  const project = new Project();

  const deploymentConfigVarName = `${mToken}DeploymentConfig`;

  const deploymentConfigPath = path.join(
    hre.config.paths.root,
    `scripts/deploy/configs/${mToken}.ts`,
  );

  // Check if deployment config file already exists
  const deploymentConfigFileExists = await fs
    .access(deploymentConfigPath)
    .then(() => true)
    .catch(() => false);

  let overrideNetworkConfig = false;
  let hasNetworkConfig = false;

  const getDeploymentConfigFile = () => {
    return project.addSourceFileAtPath(deploymentConfigPath);
  };

  if (deploymentConfigFileExists) {
    const networkConfigObj = getNetworkConfigObject(
      getDeploymentConfigObject(
        getDeploymentConfigFile(),
        deploymentConfigVarName,
      ),
    );

    const property = networkConfigObj.getProperty(
      `[chainIds.${hre.network.name}]`,
    );
    hasNetworkConfig = !!property;

    if (property) {
      overrideNetworkConfig = await confirm({
        message: `Deployment config for ${hre.network.name} already exists. Override?`,
        initialValue: false,
      }).then(requireNotCancelled);

      if (overrideNetworkConfig) {
        property.remove();
      }
    }
  }

  const { deploymentConfigs, postDeployConfigs } =
    await getDeploymentConfigFromUser(overrideNetworkConfig);

  const deploymentConfig: Record<string, any> = {
    networkConfig: {},
    postDeploy: {},
    genericConfig: {},
  };

  if (!deploymentConfigFileExists) {
    deploymentConfig.genericConfig =
      await configsPerNetworkConfig.genericConfig(mToken);
  }

  if (!deploymentConfigFileExists || overrideNetworkConfig) {
    for (const configKey of deploymentConfigs) {
      const config = await configsPerNetworkConfig[configKey](hre);
      deploymentConfig.networkConfig[configKey] = config;
    }
  } else {
    await stream.warn(`No-override is selected, skipping network config...`);
  }

  if (postDeployConfigs) {
    for (const configKey of postDeployConfigs as (keyof PostDeployConfig)[]) {
      const postDeployConfig = await configsPerNetworkConfig.postDeploy?.[
        configKey as keyof typeof configsPerNetworkConfig.postDeploy
      ](
        hre,
        deploymentConfigs.map((config) => {
          const vaultType = contractNameToVaultType(config);

          if (!vaultType) {
            throw new Error(`Unknown config key: ${config}`);
          }

          return vaultType;
        }),
      );
      deploymentConfig.postDeploy[configKey] = postDeployConfig;
    }
  } else {
    await stream.warn(`Skipping post deploy configs...`);
  }

  if (!deploymentConfigFileExists) {
    await fs.writeFile(
      deploymentConfigPath,
      `import { parseUnits } from 'ethers/lib/utils';

import { chainIds } from '../../../config';
import { DeploymentConfig } from '../common/types';
import { constants } from 'ethers';

export const ${deploymentConfigVarName}: DeploymentConfig = {
  networkConfigs: { },
};`,
      'utf-8',
    );
  }

  const deploymentConfigFile = getDeploymentConfigFile();

  const deploymentConfigObject = getDeploymentConfigObject(
    deploymentConfigFile,
    deploymentConfigVarName,
  );

  const networkConfigsObj = getNetworkConfigObject(deploymentConfigObject);

  let networkConfigProperty: PropertyAssignment;

  if (!deploymentConfigFileExists) {
    deploymentConfigObject.insertPropertyAssignment(0, {
      name: 'genericConfigs',
      initializer: objectToCode(deploymentConfig.genericConfig),
    });
  }

  if (
    overrideNetworkConfig ||
    !deploymentConfigFileExists ||
    !hasNetworkConfig
  ) {
    networkConfigProperty = networkConfigsObj.addPropertyAssignment({
      name: `[chainIds.${hre.network.name}]`,
      initializer: objectToCode(deploymentConfig.networkConfig),
    });
  } else {
    networkConfigProperty = networkConfigsObj
      .getPropertyOrThrow(`[chainIds.${hre.network.name}]`)
      .asKindOrThrow(SyntaxKind.PropertyAssignment);
  }

  if (postDeployConfigs) {
    const networkConfigPropertyInit =
      networkConfigProperty.getInitializerIfKindOrThrow(
        SyntaxKind.ObjectLiteralExpression,
      );

    const postDeployProperty =
      networkConfigPropertyInit.getProperty('postDeploy');

    if (postDeployProperty) {
      postDeployProperty.remove();
    }

    networkConfigPropertyInit.addPropertyAssignment({
      name: 'postDeploy',
      initializer: objectToCode({
        ...deploymentConfig.postDeploy,
        setRoundData: {
          data: expr('parseUnits("1", 8)'),
        },
      }),
    });
  }

  // Add import and export to index.ts
  const indexFilePath = path.join(
    hre.config.paths.root,
    'scripts/deploy/configs/index.ts',
  );

  const indexFile = project.addSourceFileAtPath(indexFilePath);

  // Check if import already exists
  const existingImports = indexFile.getImportDeclarations();
  const importExists = existingImports.some((importDecl) =>
    importDecl
      .getNamedImports()
      .some((namedImport) => namedImport.getName() === deploymentConfigVarName),
  );

  if (!importExists) {
    // Add import statement
    indexFile.addImportDeclaration({
      namedImports: [deploymentConfigVarName],
      moduleSpecifier: `./${mToken}`,
    });
  }

  // Check if export already exists in configsPerToken
  const configsPerTokenVar =
    indexFile.getVariableDeclarationOrThrow('configsPerToken');
  const configsPerTokenInitializer = configsPerTokenVar.getInitializerOrThrow();
  const configsPerTokenObj = configsPerTokenInitializer.asKindOrThrow(
    SyntaxKind.ObjectLiteralExpression,
  );

  const exportExists = configsPerTokenObj.getProperty(mToken);

  if (!exportExists) {
    // Add export to configsPerToken object
    configsPerTokenObj.addPropertyAssignment({
      name: mToken,
      initializer: deploymentConfigVarName,
    });
  }

  await tasks([
    {
      title: 'Saving files',
      task: async () => {
        deploymentConfigFile.saveSync();
        indexFile.saveSync();
      },
    },
    {
      title: 'Linting and formatting',
      task: async () => {
        lintAndFormatTs(indexFilePath);
        lintAndFormatTs(deploymentConfigPath);
      },
    },
  ]);
};

export const generateContracts = async (hre: HardhatRuntimeEnvironment) => {
  const config = await getConfigFromUser();

  const contractsToGenerate = await getContractsToGenerateFromUser();

  const mToken = config.tokenContractName;

  const folder = path.join(
    hre.config.paths.root,
    'contracts/products',
    `${mToken}`,
  );

  await tasks([
    {
      title: 'Updating config files',
      task: async () => {
        updateConfigFiles(hre, {
          contractNamePrefix: config.contractNamePrefix,
          rolesPrefix: config.rolesPrefix,
          name: config.tokenName,
          symbol: config.tokenSymbol,
          mToken,
        });
      },
    },
    {
      title: 'Generation files',
      task: async () => {
        const isFolderExists = await fs
          .access(folder)
          .then(() => true)
          .catch(() => false);
        if (isFolderExists) {
          await fs.rm(folder, { recursive: true });
        }

        await fs.mkdir(folder, { recursive: true });

        const generators = [
          getTokenRolesContractFromTemplate,
          ...contractsToGenerate.map(
            (contract) => generatorPerContract[contract],
          ),
        ].filter((v) => v !== undefined);

        const generatedContracts = await Promise.all(
          generators.map((generator) => generator(mToken as MTokenName)),
        );

        for (const contract of generatedContracts) {
          if (!contract) {
            cancel(
              `Contract ${contract} is not available for a provided mToken`,
            );
            process.exit(0);
          }

          await fs.writeFile(
            path.join(folder, `${contract.name}.sol`),
            contract.content,
            'utf-8',
          );
        }
      },
    },
    {
      title: 'Linting and formatting',
      task: async () => {
        lintAndFormatSol(folder);
      },
    },
  ]);
};
