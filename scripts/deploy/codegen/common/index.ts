import {
  cancel,
  confirm,
  isCancel,
  select,
  stream,
  tasks,
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
  getDvAaveContractFromTemplate,
  getDvContractFromTemplate,
  getDvMorphoContractFromTemplate,
  getDvMTokenContractFromTemplate,
  getRvAaveContractFromTemplate,
  getRvContractFromTemplate,
  getRvMorphoContractFromTemplate,
  getRvMTokenContractFromTemplate,
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
  getGenerationModeFromUser,
  getGreenlistRoleSourceFromUser,
  getShouldUseTokenLevelGreenListFromUser,
  getShouldUseTokenPermissionedFromUser,
  getTokenContractNameFromUser,
} from './ui/deployment-contracts';

import { MTokenName } from '../../../../config';
import {
  contractNamesPrefixes,
  contractNameToVaultType,
  getTokenContractNames,
  TokenContractNames,
} from '../../../../helpers/contracts';
import { mTokensMetadata } from '../../../../helpers/mtokens-metadata';
import { prefixes as rolesPrefixes } from '../../../../helpers/roles';
import { PostDeployConfig } from '../../common/types';

export const EXPR = Symbol('expr');
export type CodeExpr = { [EXPR]: string };

const generatorPerContract: Partial<
  Record<
    keyof TokenContractNames | 'layerZeroMinterBurner',
    (
      mToken: MTokenName,
      optionalParams?: Record<string, unknown>,
    ) =>
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
  dvAave: getDvAaveContractFromTemplate,
  dvMorpho: getDvMorphoContractFromTemplate,
  dvMToken: getDvMTokenContractFromTemplate,
  rv: getRvContractFromTemplate,
  rvSwapper: getRvSwapperContractFromTemplate,
  rvMToken: getRvMTokenContractFromTemplate,
  rvUstb: getRvUstbContractFromTemplate,
  rvAave: getRvAaveContractFromTemplate,
  rvMorpho: getRvMorphoContractFromTemplate,
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
    isPermissioned,
    useTokenLevelGreenList,
    greenlistRoleSource,
  }: {
    contractNamePrefix: string;
    rolesPrefix: string;
    name: string;
    symbol: string;
    mToken: string;
    isPermissioned?: true;
    useTokenLevelGreenList?: boolean;
    greenlistRoleSource?: string;
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

  const greenlistTokensVar = rolesFile.getVariableDeclarationOrThrow(
    'tokenLevelGreenlistTokens',
  );

  const sharedGreenlistVar = rolesFile.getVariableDeclarationOrThrow(
    'sharedGreenlistRoleSource',
  );

  const contractNameVar =
    contractNameFile.getVariableDeclarationOrThrow('mTokensMetadata');

  if (!mTokensEnum.getMember(mToken)) {
    mTokensEnum.addMember({
      name: mToken,
      initializer: `"${mToken}"`,
    });
  }

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

  // Register the token in the separated-greenlist registry so the off-chain
  // role helper, codegen templates and tests all agree with the on-chain
  // greenlistedRole() override.
  if (useTokenLevelGreenList) {
    const arrLiteral = greenlistTokensVar
      .getInitializerOrThrow()
      .asKindOrThrow(SyntaxKind.ArrayLiteralExpression);

    const alreadyListed = arrLiteral
      .getElements()
      .some((el) => el.getText().replace(/['"]/g, '') === mToken);

    if (!alreadyListed) {
      arrLiteral.addElement(`'${mToken}'`);
    }
  }

  // If the token reuses another product's greenlist role (e.g. mGLO -> mGLOBAL),
  // record it so getRolesNamesForToken() derives the shared role name.
  if (greenlistRoleSource) {
    const objLiteral = sharedGreenlistVar
      .getInitializerOrThrow()
      .asKindOrThrow(SyntaxKind.ObjectLiteralExpression);

    if (!objLiteral.getProperty(mToken)) {
      objLiteral.addPropertyAssignment({
        name: mToken,
        initializer: (writer) => writer.write(`'${greenlistRoleSource}'`),
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
            symbol: '${symbol}'${
            isPermissioned
              ? `,
              isPermissioned: true`
              : ''
          }
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
      `yarn prettier "${path}" --write > /dev/null && yarn exec eslint "${path}" --fix > /dev/null`,
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
      `yarn solhint "${folder}/**/*.sol" --quiet --fix > /dev/null && yarn prettier "${folder}/**/*.sol" --write > /dev/null`,
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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
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

  type NetworkConfigMode = 'create' | 'add' | 'override' | 'skip';

  let networkConfigMode: NetworkConfigMode = 'create';
  let existingVaultConfigKeys: string[] = [];

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

    if (property) {
      networkConfigMode = await select<NetworkConfigMode>({
        message: `Deployment config for ${hre.network.name} already exists. How should we proceed?`,
        options: [
          {
            value: 'add',
            label: 'Add missing configs',
            hint: 'Keep existing entries, only add new vault/postDeploy configs',
          },
          {
            value: 'override',
            label: 'Override network config',
            hint: 'Replace the whole network entry',
          },
          {
            value: 'skip',
            label: 'Skip network config',
            hint: 'Leave the network entry untouched',
          },
        ],
        initialValue: 'add' as NetworkConfigMode,
      }).then(requireNotCancelled);

      if (networkConfigMode === 'override') {
        property.remove();
      }

      if (networkConfigMode === 'add') {
        existingVaultConfigKeys = property
          .asKindOrThrow(SyntaxKind.PropertyAssignment)
          .getInitializerIfKindOrThrow(SyntaxKind.ObjectLiteralExpression)
          .getProperties()
          .map((p) => p.asKind(SyntaxKind.PropertyAssignment)?.getName())
          .filter((name): name is string => !!name);
      }
    }
  }

  const { deploymentConfigs, postDeployConfigs } =
    await getDeploymentConfigFromUser(
      networkConfigMode,
      existingVaultConfigKeys,
    );

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const deploymentConfig: Record<string, any> = {
    networkConfig: {},
    postDeploy: {},
    genericConfig: {},
  };

  let isGrowthAggregator = false;

  if (!deploymentConfigFileExists) {
    const genericResult = await configsPerNetworkConfig.genericConfig(mToken);
    isGrowthAggregator = genericResult.isGrowth;
    const { isGrowth: _, ...genericConfig } = genericResult;
    deploymentConfig.genericConfig = genericConfig;
  }

  if (networkConfigMode !== 'skip') {
    for (const configKey of deploymentConfigs) {
      const config = await configsPerNetworkConfig[configKey](hre);
      deploymentConfig.networkConfig[configKey] = config;
    }
  } else {
    await stream.warn(
      `Skip is selected, network vault configs are left untouched...`,
    );
  }

  const postDeployPromptOrder: (keyof PostDeployConfig)[] = [
    'addPaymentTokens',
    'grantRoles',
    'addFeeWaived',
    'pauseFunctions',
    'setAaveConfig',
    'setMorphoConfig',
  ];

  if (postDeployConfigs) {
    const orderedConfigKeys = (postDeployConfigs as (keyof PostDeployConfig)[])
      .slice()
      .sort(
        (a, b) =>
          postDeployPromptOrder.indexOf(a) - postDeployPromptOrder.indexOf(b),
      );

    for (const configKey of orderedConfigKeys) {
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
        mToken,
        deploymentConfig.postDeploy,
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

  const existingNetworkProperty = networkConfigsObj.getProperty(
    `[chainIds.${hre.network.name}]`,
  );

  if (!existingNetworkProperty) {
    networkConfigProperty = networkConfigsObj.addPropertyAssignment({
      name: `[chainIds.${hre.network.name}]`,
      initializer: objectToCode(deploymentConfig.networkConfig),
    });
  } else {
    networkConfigProperty = existingNetworkProperty.asKindOrThrow(
      SyntaxKind.PropertyAssignment,
    );

    if (networkConfigMode === 'add') {
      const networkObj = networkConfigProperty.getInitializerIfKindOrThrow(
        SyntaxKind.ObjectLiteralExpression,
      );

      for (const [key, value] of Object.entries(
        deploymentConfig.networkConfig,
      )) {
        networkObj.addPropertyAssignment({
          name: key,
          initializer: objectToCode(value, 4),
        });
      }
    }
  }

  if (postDeployConfigs) {
    const networkConfigPropertyInit =
      networkConfigProperty.getInitializerIfKindOrThrow(
        SyntaxKind.ObjectLiteralExpression,
      );

    const postDeployProperty =
      networkConfigPropertyInit.getProperty('postDeploy');

    if (networkConfigMode !== 'add' || !postDeployProperty) {
      // setRoundData is not auto-added in add mode — re-setting the price of
      // a live product must be an explicit decision
      if (networkConfigMode !== 'add') {
        postDeployProperty?.remove();
      }

      const setRoundData: Record<string, unknown> = isGrowthAggregator
        ? {
            type: expr("'GROWTH'"),
            data: expr('parseUnits("1", 8)'),
            apr: expr('parseUnits("0", 8)'),
          }
        : {
            data: expr('parseUnits("1", 8)'),
          };

      networkConfigPropertyInit.addPropertyAssignment({
        name: 'postDeploy',
        initializer: objectToCode({
          ...deploymentConfig.postDeploy,
          ...(networkConfigMode === 'add' ? {} : { setRoundData }),
        }),
      });
    } else {
      const postDeployObj = postDeployProperty
        .asKindOrThrow(SyntaxKind.PropertyAssignment)
        .getInitializerIfKindOrThrow(SyntaxKind.ObjectLiteralExpression);

      for (const [key, value] of Object.entries(deploymentConfig.postDeploy)) {
        const existing = postDeployObj.getProperty(key);

        if (!existing) {
          postDeployObj.addPropertyAssignment({
            name: key,
            initializer: objectToCode(value, 6),
          });
          continue;
        }

        if (key === 'addPaymentTokens') {
          const vaultsArray = existing
            .asKindOrThrow(SyntaxKind.PropertyAssignment)
            .getInitializerIfKindOrThrow(SyntaxKind.ObjectLiteralExpression)
            .getPropertyOrThrow('vaults')
            .asKindOrThrow(SyntaxKind.PropertyAssignment)
            .getInitializerIfKindOrThrow(SyntaxKind.ArrayLiteralExpression);

          for (const entry of (value as { vaults: { type: string }[] })
            .vaults) {
            if (vaultsArray.getText().includes(`'${entry.type}'`)) {
              const appendEntry = await confirm({
                message: `addPaymentTokens already has an entry for ${entry.type}. Append anyway?`,
                initialValue: false,
              }).then(requireNotCancelled);

              if (!appendEntry) continue;
            }
            vaultsArray.addElement(objectToCode(entry, 8));
          }
        } else if (
          key === 'addFeeWaived' ||
          key === 'setAaveConfig' ||
          key === 'setMorphoConfig'
        ) {
          const arr = existing
            .asKindOrThrow(SyntaxKind.PropertyAssignment)
            .getInitializerIfKindOrThrow(SyntaxKind.ArrayLiteralExpression);

          for (const entry of value as {
            type?: string;
            fromVault?: { type?: string };
          }[]) {
            const entryType = entry.type ?? entry.fromVault?.type;
            if (entryType && arr.getText().includes(`'${entryType}'`)) {
              const appendEntry = await confirm({
                message: `${key} already has an entry for ${entryType}. Append anyway?`,
                initialValue: false,
              }).then(requireNotCancelled);

              if (!appendEntry) continue;
            }
            arr.addElement(objectToCode(entry, 8));
          }
        } else {
          const replace = await confirm({
            message: `postDeploy.${key} already exists. Replace?`,
            initialValue: false,
          }).then(requireNotCancelled);

          if (replace) {
            existing.remove();
            postDeployObj.addPropertyAssignment({
              name: key,
              initializer: objectToCode(value, 6),
            });
          }
        }
      }
    }
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
  const mToken = (await getTokenContractNameFromUser()) as MTokenName;

  const folder = path.join(
    hre.config.paths.root,
    'contracts/products',
    `${mToken}`,
  );

  const folderExists = await fs
    .access(folder)
    .then(() => true)
    .catch(() => false);
  const isRegistered = !!contractNamesPrefixes[mToken];

  let mode: 'create' | 'add' | 'regenerate' = 'create';

  if (folderExists || isRegistered) {
    mode = await getGenerationModeFromUser(mToken);

    if (mode === 'regenerate') {
      const confirmed = await confirm({
        message: `This will DELETE contracts/products/${mToken} and regenerate it. Continue?`,
        initialValue: false,
      }).then(requireNotCancelled);

      if (!confirmed) {
        cancel('Operation cancelled.');
        process.exit(0);
      }
    }
  }

  let config: {
    tokenContractName: string;
    tokenName: string;
    tokenSymbol: string;
    contractNamePrefix: string;
    rolesPrefix: string;
  };
  let isPermissionedFromMetadata = false;

  if (mode === 'create') {
    config = await getConfigFromUser(mToken);
  } else {
    const metadata = mTokensMetadata[mToken];
    const contractNamePrefix = contractNamesPrefixes[mToken];
    const rolesPrefix = rolesPrefixes[mToken];

    if (!metadata || !contractNamePrefix || !rolesPrefix) {
      cancel(
        `Token ${mToken} is not fully registered (metadata/prefixes missing). ` +
          `Fix the registries or use a new token name.`,
      );
      process.exit(0);
      return;
    }

    config = {
      tokenContractName: mToken,
      tokenName: metadata.name,
      tokenSymbol: metadata.symbol,
      contractNamePrefix,
      rolesPrefix,
    };
    isPermissionedFromMetadata = !!metadata.isPermissioned;
  }

  const contractsToGenerate = await getContractsToGenerateFromUser();

  let shouldUseTokenLevelGreenList = false;
  let shouldUseTokenPermissioned = isPermissionedFromMetadata;
  let greenlistRoleSource: string | undefined;

  if (
    contractsToGenerate.find((v) => v.startsWith('dv') || v.startsWith('rv'))
  ) {
    let greenlistDefault = false;

    if (mode !== 'create' && folderExists) {
      const files = await fs.readdir(folder);
      for (const file of files.filter((f) => f.endsWith('.sol'))) {
        const content = await fs.readFile(path.join(folder, file), 'utf-8');
        if (content.includes('function greenlistedRole()')) {
          greenlistDefault = true;
          break;
        }
      }
    }

    shouldUseTokenLevelGreenList =
      await getShouldUseTokenLevelGreenListFromUser(greenlistDefault);

    if (shouldUseTokenLevelGreenList) {
      // Optionally reuse another product's greenlist role (e.g. mGLO -> mGLOBAL).
      greenlistRoleSource = await getGreenlistRoleSourceFromUser(mToken);
    }
  }

  if (contractsToGenerate.includes('token') && mode === 'create') {
    shouldUseTokenPermissioned = await getShouldUseTokenPermissionedFromUser();
  }

  await tasks([
    {
      title: 'Updating config files',
      task: async () => {
        updateConfigFiles(hre, {
          contractNamePrefix: config.contractNamePrefix,
          rolesPrefix: config.rolesPrefix,
          name: config.tokenName,
          symbol: config.tokenSymbol,
          mToken: config.tokenContractName,
          isPermissioned: shouldUseTokenPermissioned ? true : undefined,
          useTokenLevelGreenList: shouldUseTokenLevelGreenList,
          greenlistRoleSource,
        });
      },
    },
  ]);

  if (folderExists && mode === 'regenerate') {
    await fs.rm(folder, { recursive: true });
  }

  await fs.mkdir(folder, { recursive: true });

  const rolesFileExists =
    mode === 'add' &&
    (await fs
      .access(path.join(folder, `${getTokenContractNames(mToken).roles}.sol`))
      .then(() => true)
      .catch(() => false));

  const generators = [
    ...(rolesFileExists
      ? []
      : [{ name: 'roles', generator: getTokenRolesContractFromTemplate }]),
    ...contractsToGenerate.flatMap((contract) => {
      const generator = generatorPerContract[contract];
      return generator ? [{ name: contract, generator }] : [];
    }),
  ];

  const generatedContracts = await Promise.all(
    generators.map(({ generator }) =>
      generator(mToken, {
        vaultUseTokenLevelGreenList: shouldUseTokenLevelGreenList,
        isPermissionedMToken: shouldUseTokenPermissioned,
      }),
    ),
  );

  for (const [index, contract] of generatedContracts.entries()) {
    if (!contract) {
      cancel(
        `Contract ${generators[index].name} is not available for a provided mToken`,
      );
      process.exit(0);
      return;
    }

    const filePath = path.join(folder, `${contract.name}.sol`);

    if (mode === 'add') {
      const fileExists = await fs
        .access(filePath)
        .then(() => true)
        .catch(() => false);

      if (fileExists) {
        const overwrite = await confirm({
          message: `${contract.name}.sol already exists. Overwrite?`,
          initialValue: false,
        }).then(requireNotCancelled);

        if (!overwrite) {
          await stream.warn(`Skipping ${contract.name}.sol...`);
          continue;
        }
      }
    }

    await fs.writeFile(filePath, contract.content, 'utf-8');
  }

  await tasks([
    {
      title: 'Linting and formatting',
      task: async () => {
        lintAndFormatSol(folder);
      },
    },
  ]);

  if (shouldUseTokenLevelGreenList) {
    if (greenlistRoleSource) {
      await stream.info(
        `${mToken} reuses ${greenlistRoleSource}'s greenlist role. ` +
          `Registered in helpers/roles.ts (tokenLevelGreenlistTokens + ` +
          `sharedGreenlistRoleSource), so getRolesNamesForToken('${mToken}')` +
          `.greenlisted, the generated greenlistedRole() override and the ` +
          `token tests all resolve to ${greenlistRoleSource}'s ` +
          `GREENLISTED_ROLE. Review the generated vaults to confirm.`,
      );
    } else {
      await stream.info(
        `${mToken} uses its own token-level greenlist role. Registered in ` +
          `helpers/roles.ts (tokenLevelGreenlistTokens). To instead share an ` +
          `existing product's role, add an entry to sharedGreenlistRoleSource.`,
      );
    }
  }
};
