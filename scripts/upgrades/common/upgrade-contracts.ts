import { DeployImplementationResponse } from '@openzeppelin/hardhat-upgrades/dist/deploy-implementation';
import { utils } from 'ethers';
import { HardhatRuntimeEnvironment } from 'hardhat/types';

import {
  batchStaticCalls,
  mapLimit,
  RoleCheck,
  RPC_CONCURRENCY,
  validateRolesOnChain,
  withRpcRetry,
} from './onchain-read';
import {
  getImplAddress,
  initializedSlotFromManifest,
  loadManifestForChain,
  readInitializedVersion,
} from './reinitializer';
import {
  ContractTypeInitializer,
  ContractUpgradeEntry,
  ContractUpgradeOverride,
  MTokenUpgradeKey,
  PaymentTokenUpgradeKey,
  UpgradeContractType,
} from './types';

import {
  chainIds,
  MTokenName,
  Network,
  PaymentTokenName,
} from '../../../config';
import {
  DataFeedAddressesComposite,
  getCurrentAddresses,
} from '../../../config/constants/addresses';
import { getCommonContractNames } from '../../../helpers/contracts';
import {
  getAllRoles,
  getRolesForToken,
  getRolesNamesCommon,
  getRolesNamesForToken,
} from '../../../helpers/roles';
import {
  etherscanVerify,
  getChainOrThrow,
  isMTokenName,
  logDeploy,
} from '../../../helpers/utils';
import {
  executeTimeLockUpgradeTx,
  GetUpgradeTxParams,
  proposeTimeLockUpgradeTx,
} from '../../deploy/common/timelock';
import { getDeployer } from '../../deploy/common/utils';
import { paymentTokenDeploymentConfigs } from '../../deploy/configs/payment-tokens';
import { upgradeConfigs } from '../configs/upgrade-configs';

type ContractToUpgrade = {
  mToken?: MTokenName;
  contractType: string;
  contractName: string;
  proxyAddress: string;
  overrideImplementation?: string;
  initializer?: string;
  initializerArgs?: unknown[];
  constructorArgs?: unknown[];
  // set by the config resolver, used by the on-chain probes
  upgradeContractType?: UpgradeContractType;
  isContractTypeExplicit?: boolean;
  // resolved from `mTokens.all`: skipped (not failed) if it is not a proxy
  isFromAll?: boolean;
  // drop the `initializeV<N>` call if the proxy has already consumed version N
  skipInitializerIfConsumed?: boolean;
  // skipped (not failed) if it is not managed by the Midas access control
  skipIfThirdParty?: boolean;
  // disables the on-chain role checks of the contract
  allowRoleChanges?: boolean;
};

type UpgradeAllOptions = {
  // throw on the first failed upgrade instead of collecting the failures
  failFast?: boolean;
};

const proposeUpgradeContractsRaw = async (
  hre: HardhatRuntimeEnvironment,
  upgradeId: string,
  contractsToUpgrade: ContractToUpgrade[],
  options?: UpgradeAllOptions,
) => {
  return upgradeAllContractsRaw(
    hre,
    upgradeId,
    contractsToUpgrade,
    async (hre, params, salt) => {
      return await proposeTimeLockUpgradeTx(hre, params, salt);
    },
    options,
  );
};

const executeUpgradeContractsRaw = async (
  hre: HardhatRuntimeEnvironment,
  upgradeId: string,
  contractsToUpgrade: ContractToUpgrade[],
) => {
  return upgradeAllContractsRaw(
    hre,
    upgradeId,
    contractsToUpgrade,
    async (hre, params, salt) => {
      return await executeTimeLockUpgradeTx(hre, params, salt);
    },
  );
};

// validated contracts of `upgradeConfigs.upgrades[upgradeId].contracts` and the salt
const getValidatedConfiguredUpgrade = async (
  hre: HardhatRuntimeEnvironment,
  upgradeId: string,
) => ({
  contracts: await validateContractTypesOnChain(
    hre,
    getConfiguredContractUpgrades(hre, upgradeId),
  ),
  salt: upgradeConfigs.upgrades[upgradeId]?.overrideSalt ?? upgradeId,
});

/**
 * Upgrades everything listed under `upgradeConfigs.upgrades[upgradeId].contracts`
 * for the current chain
 */
export const proposeUpgradeConfiguredContracts = async (
  hre: HardhatRuntimeEnvironment,
  upgradeId: string,
) => {
  const { contracts, salt } = await getValidatedConfiguredUpgrade(
    hre,
    upgradeId,
  );

  // nothing else is proposed if any of the proposals fails
  return proposeUpgradeContractsRaw(hre, salt, contracts, { failFast: true });
};

export const executeUpgradeConfiguredContracts = async (
  hre: HardhatRuntimeEnvironment,
  upgradeId: string,
) => {
  const { contracts, salt } = await getValidatedConfiguredUpgrade(
    hre,
    upgradeId,
  );

  return executeUpgradeContractsRaw(hre, salt, contracts);
};

/**
 * On-chain fingerprints of the currently deployed implementations.
 * Only getters that exist in both v1 and v2 implementations are used.
 * `has` - getters that should succeed, `hasNot` - getters that should revert
 */
const contractTypeProbes: Record<
  UpgradeContractType,
  { has: string[]; hasNot?: string[] }
> = {
  ac: { has: ['DEFAULT_ADMIN_ROLE'], hasNot: ['accessControl'] },
  timelockManager: {
    has: ['accessControl', 'timelock', 'maxPendingOperationsPerProposer'],
  },
  token: { has: ['accessControl', 'name', 'totalSupply'] },
  customAggregator: {
    has: ['accessControl', 'maxAnswerDeviation', 'latestRound'],
    hasNot: ['minGrowthApr'],
  },
  customAggregatorGrowth: {
    has: ['accessControl', 'maxAnswerDeviation', 'minGrowthApr'],
  },
  dataFeed: {
    has: ['accessControl', 'aggregator', 'healthyDiff'],
    hasNot: ['numeratorFeed'],
  },
  // composite and multiply are not distinguishable on-chain
  dataFeedComposite: { has: ['accessControl', 'numeratorFeed'] },
  dataFeedMultiply: { has: ['accessControl', 'numeratorFeed'] },
};

const probeInterface = new utils.Interface([
  'function DEFAULT_ADMIN_ROLE() view returns (bytes32)',
  'function accessControl() view returns (address)',
  'function timelock() view returns (address)',
  'function maxPendingOperationsPerProposer() view returns (uint256)',
  'function name() view returns (string)',
  'function totalSupply() view returns (uint256)',
  'function maxAnswerDeviation() view returns (uint256)',
  'function latestRound() view returns (uint80)',
  'function minGrowthApr() view returns (int80)',
  'function aggregator() view returns (address)',
  'function healthyDiff() view returns (uint256)',
  'function numeratorFeed() view returns (address)',
]);

const probeFns = probeInterface.fragments.map((f) => f.name);

const decodeProbeResult = (fn: string, data: string | undefined) => {
  if (data === undefined) return undefined;
  try {
    return probeInterface.decodeFunctionResult(fn, data)[0] as unknown;
  } catch {
    // no such getter (e.g. empty return data from a fallback)
    return undefined;
  }
};

/**
 * Calls every probe getter on every address. A getter is `undefined` only if
 * the call reverted (or returned undecodable data) on-chain
 */
const probeContractGetters = async (
  hre: HardhatRuntimeEnvironment,
  addresses: string[],
): Promise<Record<string, unknown>[]> => {
  const results = await batchStaticCalls(
    hre,
    addresses.flatMap((target) =>
      probeFns.map((fn) => ({
        target,
        callData: probeInterface.encodeFunctionData(fn),
      })),
    ),
  );

  return addresses.map((_, i) =>
    Object.fromEntries(
      probeFns.map((fn, j) => [
        fn,
        decodeProbeResult(fn, results[i * probeFns.length + j]),
      ]),
    ),
  );
};

const FEED_ADMIN_ROLE_GETTERS = ['feedAdminRole', 'contractAdminRole'];

/**
 * Roles that must stay the same after the upgrade:
 * - feeds / aggregators: admin role (`feedAdminRole()` in v1,
 *   `contractAdminRole()` in v2)
 * - mTokens: minter, burner, greenlisted and min balance exempt roles.
 *   v1 tokens expose them only as the public constants named after the role
 *   (e.g. `M_TBILL_MINT_OPERATOR_ROLE()`); greenlisted / min balance exempt
 *   constants exist only on the permissioned / min balance v1 tokens, so
 *   their presence is also compared with the `initializeV3` flags: the
 *   upgrade must not silently enable or disable these features.
 *   v2 tokens have the getters for all the roles; token manager role does not
 *   exist in v1 and is checked for v2 tokens only
 */
const getRoleChecks = (c: ContractToUpgrade): RoleCheck[] => {
  const type = c.upgradeContractType;
  const args = (c.constructorArgs ?? []) as string[];

  if (!type || type === 'ac' || type === 'timelockManager') return [];

  if (c.allowRoleChanges) {
    console.log(`${c.contractType}: role checks are disabled in the config`);
    return [];
  }

  const check = (
    role: string,
    getters: string[],
    expected: string,
    rest: Pick<RoleCheck, 'required' | 'absent' | 'hint'>,
  ): RoleCheck => ({
    label: `${c.contractType} ${role} role`,
    address: c.proxyAddress,
    getters,
    expected,
    ...rest,
  });

  if (type !== 'token') {
    return [
      check('admin', FEED_ADMIN_ROLE_GETTERS, args[0], {
        required: true,
      }),
    ];
  }

  if (!c.mToken) return [];

  const names = getRolesNamesForToken(c.mToken);
  const commonNames = Object.values(getRolesNamesCommon());
  const [tokenManager, minter, burner, greenlisted, minBalanceExempt] = args;

  // flags that the token is going to be initialized with
  const [, , isPermissioned, isMinBalance] =
    c.initializer === 'initializeV3'
      ? ((c.initializerArgs ?? []) as unknown[])
      : [];

  // v1: constant exists only if the feature is enabled, v2: getter always exists
  const featureRole = (
    role: string,
    feature: string,
    v2Getter: string,
    v1Constant: string,
    expected: string,
    isEnabled: unknown,
  ): RoleCheck[] => {
    if (isEnabled === true) {
      return [
        check(role, [v2Getter, v1Constant], expected, {
          required: true,
          hint: `the token is not ${feature} on-chain (no ${v1Constant}()), but initializeV3 would make it ${feature}`,
        }),
      ];
    }

    return [
      check(role, [v2Getter], expected, { required: false }),
      // constants of the common roles are exposed by every v1 token
      ...(isEnabled === false && !commonNames.includes(v1Constant)
        ? [
            check(role, [v1Constant], expected, {
              required: false,
              absent: true,
              hint: `the token is ${feature} on-chain (${v1Constant}() exists), but initializeV3 would make it not ${feature}`,
            }),
          ]
        : []),
    ];
  };

  return [
    check('minter', ['minterRole', names.minter], minter, { required: true }),
    check('burner', ['burnerRole', names.burner], burner, { required: true }),
    check('token manager', ['contractAdminRole'], tokenManager, {
      required: false,
    }),
    ...featureRole(
      'greenlisted',
      'permissioned',
      'greenlistedRole',
      names.greenlisted,
      greenlisted,
      isPermissioned,
    ),
    ...featureRole(
      'min balance exempt',
      'min balance enforced',
      'minBalanceExemptRole',
      names.minBalanceExempt,
      minBalanceExempt,
      isMinBalance,
    ),
  ];
};

/**
 * Checks that every proxy currently runs the same contract type that
 * it is going to be upgraded to. Rejects contracts that are ambiguous
 * on-chain (composite/multiply data feeds) unless `contractType` is set
 * explicitly in the upgrade config.
 * Also checks that the roles of the contracts are not changed by the upgrade
 * (see `getRoleChecks`). Nothing is adjusted automatically: a mismatch fails
 * the validation and has to be resolved in the upgrade config.
 * Returns the contracts to upgrade, skipped are:
 * - non-proxy contracts resolved from `all` (e.g. adjusted feeds under
 *   `customFeedDv`, third party payment token aggregators)
 * - third party proxies under the payment token aggregators resolved from `all`
 */
export const validateContractTypesOnChain = async (
  hre: HardhatRuntimeEnvironment,
  contracts: ContractToUpgrade[],
) => {
  const provider = hre.ethers.provider;
  const accessControl = getCurrentAddresses(hre)?.accessControl;
  const errors: string[] = [];
  const skipped: ContractToUpgrade[] = [];

  const toValidate = contracts.filter((c) => c.upgradeContractType);

  const proxyStates = await mapLimit(
    toValidate,
    RPC_CONCURRENCY,
    async (c): Promise<'proxy' | 'not-proxy' | 'no-code'> => {
      if (await withRpcRetry(() => getImplAddress(provider, c.proxyAddress))) {
        return 'proxy';
      }
      const code = await withRpcRetry(() => provider.getCode(c.proxyAddress));
      return code === '0x' ? 'no-code' : 'not-proxy';
    },
  );

  const toProbe: ContractToUpgrade[] = [];
  // passed the type checks, roles are checked next
  const validated: ContractToUpgrade[] = [];

  toValidate.forEach((c, i) => {
    const state = proxyStates[i];

    if (state === 'proxy') {
      toProbe.push(c);
    } else if (state === 'no-code') {
      errors.push(`${c.contractType}: no code at ${c.proxyAddress}`);
    } else if (c.isFromAll) {
      console.log(
        `Skipping ${c.contractType} (${c.proxyAddress}): not a proxy`,
      );
      skipped.push(c);
    } else {
      errors.push(`${c.contractType}: ${c.proxyAddress} is not a proxy`);
    }
  });

  const probeResults = await probeContractGetters(
    hre,
    toProbe.map((c) => c.proxyAddress),
  );

  toProbe.forEach((c, i) => {
    const expected = c.upgradeContractType!;
    const results = probeResults[i];
    const contractAc = results.accessControl as string | undefined;

    if (
      c.skipIfThirdParty &&
      contractAc?.toLowerCase() !== accessControl?.toLowerCase()
    ) {
      console.log(
        `Skipping ${c.contractType} (${c.proxyAddress}): third party contract`,
      );
      skipped.push(c);
      return;
    }

    const matches = (
      Object.entries(contractTypeProbes) as [
        UpgradeContractType,
        { has: string[]; hasNot?: string[] },
      ][]
    )
      .filter(
        ([, { has, hasNot }]) =>
          has.every((fn) => results[fn] !== undefined) &&
          (hasNot ?? []).every((fn) => results[fn] === undefined),
      )
      .map(([type]) => type);

    const prefix = `${c.contractType} (${c.proxyAddress})`;

    if (!matches.includes(expected)) {
      errors.push(
        `${prefix}: resolved to ${expected}, but on-chain it looks like ${
          matches.length ? matches.join(' | ') : 'an unknown contract'
        }`,
      );
      return;
    }

    if (matches.length > 1 && !c.isContractTypeExplicit) {
      errors.push(
        `${prefix}: can be ${matches.join(
          ' | ',
        )} and it cannot be determined on-chain, set contractType explicitly in the upgrade config`,
      );
      return;
    }

    if (
      contractTypeProbes[expected].has.includes('accessControl') &&
      contractAc?.toLowerCase() !== accessControl?.toLowerCase()
    ) {
      errors.push(
        `${prefix}: accessControl is ${contractAc}, expected ${accessControl}`,
      );
    }

    validated.push(c);
  });

  errors.push(
    ...(await validateRolesOnChain(hre, validated.flatMap(getRoleChecks))),
  );

  if (errors.length) {
    throw new Error(
      `On-chain contract type validation failed:\n${errors.join(
        '\n',
      )}\nIf a role differs: set constructorArgs of the entry in the upgrade config to keep the on-chain role, or allowRoleChanges if the change is intended`,
    );
  }

  const toUpgrade = contracts.filter((c) => !skipped.includes(c));

  console.log(
    `On-chain contract type validation passed (${toUpgrade.length}, skipped ${skipped.length})`,
  );

  return toUpgrade;
};

// growth aggregators are always stored under `customFeedGrowth`
const mTokenKeyContractTypes: Record<MTokenUpgradeKey, UpgradeContractType> = {
  token: 'token',
  customFeed: 'customAggregator',
  customFeedDv: 'customAggregator',
  customFeedRv: 'customAggregator',
  customFeedGrowth: 'customAggregatorGrowth',
  dataFeed: 'dataFeed',
  dataFeedDv: 'dataFeed',
  dataFeedRv: 'dataFeed',
};

// `dataFeed` of a composite payment token is resolved from the deployment config
const paymentTokenKeyContractTypes: Record<
  PaymentTokenUpgradeKey,
  UpgradeContractType
> = {
  dataFeed: 'dataFeed',
  aggregator: 'customAggregator',
  numeratorDataFeed: 'dataFeed',
  numeratorAggregator: 'customAggregator',
  denominatorDataFeed: 'dataFeed',
  denominatorAggregator: 'customAggregator',
};

/**
 * `all` entries (only for the keys that have an address) with the override
 * entries merged on top; `false` override excludes the key
 */
const mergeUpgradeEntries = <K extends string>(
  all: Partial<Record<K, ContractUpgradeEntry>> | undefined,
  overrides: Partial<Record<K, ContractUpgradeEntry>> | undefined,
  keyAddresses: Partial<Record<K, string | undefined>>,
) => {
  const allEntries = Object.fromEntries(
    Object.entries(all ?? {}).filter(([key]) => keyAddresses[key as K]),
  ) as Partial<Record<K, ContractUpgradeEntry>>;

  const keys = [
    ...new Set([...Object.keys(allEntries), ...Object.keys(overrides ?? {})]),
  ] as K[];

  return keys.map((key) => {
    const allEntry = allEntries[key];
    const overrideEntry = overrides?.[key];

    const entry: ContractUpgradeEntry | undefined =
      overrideEntry === undefined
        ? allEntry
        : overrideEntry && {
            ...(typeof allEntry === 'object' ? allEntry : {}),
            ...(overrideEntry === true ? {} : overrideEntry),
          };

    return { key, entry, isFromAll: !overrideEntry };
  });
};

const getUpgradeConstructorArgs = (
  contractType: UpgradeContractType,
  mToken?: MTokenName,
): string[] | undefined => {
  switch (contractType) {
    case 'ac':
    case 'timelockManager':
      return undefined;
    case 'token': {
      if (!mToken) throw new Error('token contract type requires an mToken');
      const r = getRolesForToken(mToken);
      return [
        r.tokenManager,
        r.minter,
        r.burner,
        r.greenlisted,
        r.minBalanceExempt,
      ];
    }
    default: {
      // same admin roles as in the deploy scripts
      const adminRole = mToken
        ? getRolesForToken(mToken).customFeedAdmin
        : getAllRoles().common.defaultAdmin;
      if (!adminRole) {
        throw new Error(`Feed admin role is not found for ${mToken}`);
      }
      return [adminRole];
    }
  }
};

export const getConfiguredContractUpgrades = (
  hre: HardhatRuntimeEnvironment,
  upgradeId: string,
): ContractToUpgrade[] => {
  const { chainId, networkName } = getChainOrThrow(hre);

  if (chainIds[networkName as Network] !== chainId) {
    throw new Error(
      `Network mismatch: ${networkName} is configured for chain ${
        chainIds[networkName as Network]
      }, got ${chainId}`,
    );
  }

  const config = upgradeConfigs.upgrades[upgradeId];
  const toUpgrade = config?.contracts?.[chainId];

  if (!toUpgrade) {
    throw new Error(
      `Contracts upgrade config not found for ${upgradeId} on chain ${chainId}`,
    );
  }

  const addresses = getCurrentAddresses(hre);

  if (!addresses) {
    throw new Error(`Addresses not found for ${networkName}`);
  }

  const contractNames = getCommonContractNames();
  const result: ContractToUpgrade[] = [];
  // the same proxy can be configured under several keys (shared feeds)
  const addedProxies = new Map<string, string>();

  const add = ({
    label,
    entry,
    proxyAddress,
    defaultContractType,
    isDefaultContractTypeExplicit,
    mToken,
    paymentToken,
    isFromAll,
    skipIfThirdParty,
  }: {
    label: string;
    entry: ContractUpgradeEntry | undefined;
    proxyAddress: string | undefined;
    defaultContractType: UpgradeContractType | undefined;
    // default type comes from a config, not from the address key only
    isDefaultContractTypeExplicit?: boolean;
    mToken?: MTokenName;
    paymentToken?: PaymentTokenName;
    isFromAll?: boolean;
    skipIfThirdParty?: boolean;
  }) => {
    if (!entry) return;

    const {
      contractType = defaultContractType,
      overrideImplementation,
      constructorArgs,
      allowRoleChanges,
      initializer,
      initializerArgs,
      skipInitializerIfConsumed,
    }: ContractUpgradeOverride = entry === true ? {} : entry;
    const isContractTypeExplicit =
      (entry !== true && !!entry.contractType) ||
      !!isDefaultContractTypeExplicit;

    if (!proxyAddress) {
      throw new Error(`${label} address is not configured`);
    }

    if (!contractType) {
      throw new Error(`${label}: contractType should be set in upgrade config`);
    }

    const contractName = contractNames[contractType];

    if (!contractName) {
      throw new Error(`Contract name not found for ${contractType}`);
    }

    const addedAs = addedProxies.get(proxyAddress.toLowerCase());

    if (addedAs) {
      console.log(
        `Skipping ${label} (${proxyAddress}): already included as ${addedAs}`,
      );
      return;
    }

    // entry -> network level -> upgrade level. Defaults of the levels are
    // used only for the initializer they are configured for
    const upgradeLevel = config.initializers?.[contractType];
    const levels: (ContractTypeInitializer | undefined)[] = [
      toUpgrade.initializers?.[contractType],
      upgradeLevel && {
        initializer: upgradeLevel.initializer,
        initializerArgs: upgradeLevel.defaultInitializerArgs,
      },
    ];
    const defaults = levels.find(
      (d) => d && (!initializer || d.initializer === initializer),
    );

    const resolvedInitializer = initializer ?? defaults?.initializer;
    const rawInitializerArgs = initializerArgs ?? defaults?.initializerArgs;
    const resolvedInitializerArgs =
      typeof rawInitializerArgs === 'function'
        ? rawInitializerArgs({
            chainId,
            network: networkName as Network,
            proxyAddress,
            contractType,
            mToken,
            paymentToken,
          })
        : rawInitializerArgs;

    if (resolvedInitializer && resolvedInitializerArgs?.includes(undefined)) {
      throw new Error(
        `${label}: ${resolvedInitializer} args are not fully configured (${resolvedInitializerArgs
          .flatMap((arg, i) => (arg === undefined ? [i] : []))
          .join(', ')} undefined)`,
      );
    }

    addedProxies.set(proxyAddress.toLowerCase(), label);

    result.push({
      mToken,
      contractType: label,
      contractName,
      proxyAddress,
      overrideImplementation,
      initializer: resolvedInitializer,
      initializerArgs: resolvedInitializerArgs,
      skipInitializerIfConsumed:
        skipInitializerIfConsumed ?? defaults?.skipInitializerIfConsumed,
      constructorArgs:
        constructorArgs ?? getUpgradeConstructorArgs(contractType, mToken),
      upgradeContractType: contractType,
      isContractTypeExplicit,
      isFromAll,
      skipIfThirdParty,
      allowRoleChanges,
    });
  };

  add({
    label: 'accessControl',
    entry: toUpgrade.accessControl,
    proxyAddress: addresses.accessControl,
    defaultContractType: 'ac',
  });
  add({
    label: 'timelockManager',
    entry: toUpgrade.timelockManager,
    proxyAddress: addresses.timelockManager,
    defaultContractType: 'timelockManager',
  });

  const { all, overrides } = toUpgrade.mTokens ?? {};

  for (const mToken of Object.keys(overrides ?? {}) as MTokenName[]) {
    if (!addresses[mToken]) {
      throw new Error(`${mToken} addresses are not configured`);
    }
  }

  // mTokens go before the payment tokens: a feed shared with a payment token
  // keeps the mToken admin role
  for (const mToken of Object.keys(addresses).filter(isMTokenName)) {
    const mTokenOverrides = overrides?.[mToken];

    if (mTokenOverrides === false) continue;

    const tokenAddresses = addresses[mToken]!;

    for (const {
      key,
      entry,
      isFromAll,
    } of mergeUpgradeEntries<MTokenUpgradeKey>(
      all,
      mTokenOverrides,
      tokenAddresses,
    )) {
      add({
        label: `${mToken}.${key}`,
        entry,
        proxyAddress: tokenAddresses[key],
        defaultContractType: mTokenKeyContractTypes[key],
        mToken,
        isFromAll,
      });
    }
  }

  const { all: ptAll, overrides: ptOverrides } = toUpgrade.paymentTokens ?? {};

  for (const paymentToken of Object.keys(ptOverrides ?? {})) {
    if (!addresses.paymentTokens?.[paymentToken as PaymentTokenName]) {
      throw new Error(`${paymentToken} addresses are not configured`);
    }
  }

  for (const paymentToken of Object.keys(
    addresses.paymentTokens ?? {},
  ) as PaymentTokenName[]) {
    const paymentTokenOverrides = ptOverrides?.[paymentToken];

    if (paymentTokenOverrides === false) continue;

    const ptAddresses = addresses.paymentTokens![
      paymentToken
    ] as DataFeedAddressesComposite & { aggregator?: string };

    const isComposite = !!(ptAddresses.numerator || ptAddresses.denominator);

    // composite and multiply feeds can't be told apart on-chain
    const feedType = (
      paymentTokenDeploymentConfigs.networkConfigs[chainId]?.[paymentToken]
        ?.dataFeed as { feedType?: 'composite' | 'multiply' } | undefined
    )?.feedType;
    const compositeContractType: UpgradeContractType | undefined =
      feedType === 'multiply'
        ? 'dataFeedMultiply'
        : feedType === 'composite'
        ? 'dataFeedComposite'
        : undefined;

    const proxyAddresses: Record<PaymentTokenUpgradeKey, string | undefined> = {
      dataFeed: ptAddresses.dataFeed,
      aggregator: ptAddresses.aggregator,
      numeratorDataFeed: ptAddresses.numerator?.dataFeed,
      numeratorAggregator: ptAddresses.numerator?.aggregator,
      denominatorDataFeed: ptAddresses.denominator?.dataFeed,
      denominatorAggregator: ptAddresses.denominator?.aggregator,
    };

    for (const {
      key,
      entry,
      isFromAll,
    } of mergeUpgradeEntries<PaymentTokenUpgradeKey>(
      ptAll,
      paymentTokenOverrides,
      proxyAddresses,
    )) {
      const isCompositeFeed = key === 'dataFeed' && isComposite;

      add({
        label: `paymentTokens.${paymentToken}.${key}`,
        entry,
        proxyAddress: proxyAddresses[key],
        defaultContractType: isCompositeFeed
          ? compositeContractType
          : paymentTokenKeyContractTypes[key],
        isDefaultContractTypeExplicit: isCompositeFeed,
        paymentToken,
        isFromAll,
        // most of the payment token aggregators are third party feeds
        skipIfThirdParty: isFromAll && /aggregator$/i.test(key),
      });
    }
  }

  if (!result.length) {
    throw new Error(`Nothing to upgrade for ${upgradeId} on chain ${chainId}`);
  }

  return result;
};

const getImplAddressFromDeployment = async (
  deployment: DeployImplementationResponse,
) => {
  if (typeof deployment === 'string') {
    throw new Error(
      'Deployment is a string (getTxResponse should set to true)',
    );
  }
  const tx = await deployment.wait(5);
  const address =
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    tx.contractAddress ?? tx.to ?? ((tx as any).creates as string);

  if (tx.confirmations <= 7) {
    return {
      deployedNew: true,
      address,
    };
  } else {
    return { deployedNew: false, address };
  }
};

// errors of `scripts/deploy/common/timelock.ts` for the already handled upgrades
const ALREADY_DONE_ERRORS = [
  'Operation is already exists',
  'Already using new implementation',
];

/**
 * true if the `initializeV<N>` initializer should be dropped because the proxy
 * is already at reinitializer version >= N (opt-in via `skipInitializerIfConsumed`)
 */
const isInitializerConsumed = async (
  hre: HardhatRuntimeEnvironment,
  {
    initializer,
    skipInitializerIfConsumed,
    proxyAddress,
    implementationAddress,
    contractType,
  }: ContractToUpgrade & { implementationAddress: string },
) => {
  if (!initializer || !skipInitializerIfConsumed) return false;

  const version = /^initializeV(\d+)$/.exec(initializer)?.[1];
  if (!version) return false;

  const { chainId } = getChainOrThrow(hre);
  // layout of the new implementation, same source as the reinitializer guard
  const ref = initializedSlotFromManifest(
    loadManifestForChain(chainId),
    implementationAddress,
  );
  // guard will fail the upgrade if the slot can't be resolved
  if (!ref) return false;

  const onchainVersion = await readInitializedVersion(
    hre.ethers.provider,
    proxyAddress,
    ref,
  );

  if (onchainVersion < Number(version)) return false;

  console.log(
    `${contractType}: ${initializer} is already consumed (_initialized=${onchainVersion}), upgrading without initializer`,
  );
  return true;
};

const upgradeAllContractsRaw = async (
  hre: HardhatRuntimeEnvironment,
  upgradeId: string,
  upgradeContracts: ContractToUpgrade[],
  callBack: (
    hre: HardhatRuntimeEnvironment,
    params: GetUpgradeTxParams,
    salt: string,
  ) => Promise<unknown>,
  { failFast }: UpgradeAllOptions = {},
) => {
  const acContractName = getCommonContractNames().ac;

  upgradeContracts.sort((a, b) => {
    // access control goes first as other contracts depend on it
    const acOrder =
      Number(b.contractName === acContractName) -
      Number(a.contractName === acContractName);

    if (acOrder !== 0) return acOrder;

    return (a.mToken ?? a.contractName).localeCompare(
      b.mToken ?? b.contractName,
      'en',
      {
        sensitivity: 'base',
      },
    );
  });

  console.log('upgradeContracts', upgradeContracts);

  const deployer = await getDeployer(hre);

  const deployments: ({
    implementationAddress: string;
  } & (typeof upgradeContracts)[number])[] = [];

  for (const upgradeContract of upgradeContracts) {
    const {
      mToken,
      overrideImplementation,
      contractType,
      contractName,
      proxyAddress,
      constructorArgs,
    } = upgradeContract;

    if (overrideImplementation) {
      console.log(
        `Using override implementation (${overrideImplementation}) for ${
          mToken ? `${mToken} ${contractType}` : contractName
        }`,
      );
      deployments.push({
        ...upgradeContract,
        implementationAddress: overrideImplementation,
      });
      continue;
    }

    const { deployedNew, address: implementationAddress } =
      await getImplAddressFromDeployment(
        await hre.upgrades.prepareUpgrade(
          proxyAddress,
          await hre.ethers.getContractFactory(contractName, deployer),
          {
            redeployImplementation: 'onchange',
            getTxResponse: true,
            constructorArgs,
          },
        ),
      );

    if (deployedNew) {
      logDeploy(contractName, contractType, implementationAddress);
      await etherscanVerify(
        hre,
        implementationAddress,
        contractName,
        ...(constructorArgs ?? []),
      ).catch((e) => {
        console.error('Verification failed', e);
      });
    } else {
      console.log(
        `Implementation (${implementationAddress}) already deployed for ${contractName}`,
      );
    }

    deployments.push({
      ...upgradeContract,
      implementationAddress,
    });
  }

  const failedUpgrades: {
    mToken?: MTokenName;
    contractName: string;
    contractType: string;
    error: string;
  }[] = [];

  for (const deployment of deployments) {
    try {
      console.log(
        `\n\nUpgrading ${deployment.contractName}
Proxy: ${deployment.proxyAddress}
Implementation: ${deployment.implementationAddress}`,
      );

      const contract = await hre.ethers.getContractAt(
        deployment.contractName,
        deployment.proxyAddress,
      );

      const initializer = (await isInitializerConsumed(hre, deployment))
        ? undefined
        : deployment.initializer;

      const initializerCalldata = initializer
        ? contract.interface.encodeFunctionData(
            initializer,
            deployment.initializerArgs ?? [],
          )
        : undefined;

      const result = await callBack(
        hre,
        {
          proxyAddress: deployment.proxyAddress,
          newImplementation: deployment.implementationAddress,
          initializer,
          initializerCalldata,
          contractName: deployment.contractName,
        },
        upgradeId,
      );

      if (result === false) {
        throw new Error('Upgrade was not finished successfully');
      }
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);

      if (failFast) {
        // already done by a previous run: safe to continue with the rest
        if (ALREADY_DONE_ERRORS.some((err) => message.includes(err))) {
          console.log(`Skipping ${deployment.contractType}: ${message}`);
          continue;
        }

        throw new Error(
          `Upgrade of ${deployment.contractType} (${deployment.proxyAddress}) failed, aborting: ${message}`,
        );
      }

      console.error(`Upgrade failed with error ${e}`);

      failedUpgrades.push({
        mToken: deployment.mToken,
        contractName: deployment.contractName,
        contractType: deployment.contractType,
        error: e instanceof Error ? e.message : (e as string),
      });
    }
  }

  if (failedUpgrades.length > 0) {
    console.log('Failed upgrades', failedUpgrades);
    throw new Error(`Failed to execute ${failedUpgrades.length} upgrade(s)`);
  } else {
    console.log('All upgrades successful');
  }
};
