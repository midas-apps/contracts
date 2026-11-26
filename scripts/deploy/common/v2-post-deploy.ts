import {
  BigNumber,
  BigNumberish,
  constants,
  PopulatedTransaction,
} from 'ethers';
import { HardhatRuntimeEnvironment } from 'hardhat/types';

import type { DeployDvConfig, DeployDvUsycConfig } from './dv';
import type { DeployRvConfig, DeployRvUsycConfig } from './rv';
import type { DeploymentConfig } from './types';
import {
  getContractAt,
  getNetworkConfig,
  FieldChange,
  sendAndWaitForCustomTxSign,
} from './utils';

import { MTokenName } from '../../../config';
import {
  DepositVaultType,
  getCurrentAddresses,
  RedemptionVaultType,
  sanctionListContracts,
  TokenAddresses,
  V2VaultType,
} from '../../../config/constants/addresses';
import {
  DepositVault,
  DepositVaultWithMToken,
  DepositVaultWithUSTB,
  DepositVaultWithUSYC,
  ManageableVault,
  MToken,
  RedemptionVault,
  RedemptionVaultWithUSYC,
} from '../../../typechain-types';
import { getDeploymentConfigForToken } from '../configs';
import { getDeploymentTokenAddresses } from '../configs/deployment-profiles';

type Address = `0x${string}`;

/** Address or a vault of the current product (resolved from v2 vault keys) */
type AddressOrVault = Address | V2VaultType;

type RateLimitWindow = {
  /** window duration in seconds */
  window: BigNumberish;
  /** max amount per window (base18) */
  limit: BigNumberish;
};

/** Instant operation rate limit windows per vault */
export type InstantLimitsConfig = Partial<
  Record<V2VaultType, RateLimitWindow[]>
>;

export type MintRateLimitsConfig = {
  /** mint rate limit windows per wallet bucket */
  buckets?: ({ bucketId: number } & RateLimitWindow)[];
  /** assigns minters (vaults or wallets) to buckets */
  walletBuckets?: { wallet: AddressOrVault; bucketId: number }[];
};

export type TokenConfig = {
  maxSupplyCap?: BigNumberish;
  clawbackReceiver?: Address;
};

/** Accounts exempt from vault min amount checks, per vault */
export type FreeFromMinAmountConfig = Partial<
  Record<V2VaultType, AddressOrVault[]>
>;

export type PreferLoanLiquidityConfig = Partial<
  Record<
    Exclude<
      RedemptionVaultType,
      'redemptionVaultSwapper' | 'redemptionVaultBuidl'
    >,
    boolean
  >
>;

/** Applies to depositVaultMToken */
export type SetMTokenVaultConfig = {
  depositsEnabled?: boolean;
  autoInvestFallbackEnabled?: boolean;
};

/** Applies to depositVaultUstb */
export type SetUstbVaultConfig = {
  depositsEnabled?: boolean;
};

const getV2TokenAddresses = (
  hre: HardhatRuntimeEnvironment,
  mToken: MTokenName,
): TokenAddresses => {
  const tokenAddresses = getCurrentAddresses(hre, 'v2')?.[mToken];

  if (!tokenAddresses) {
    throw new Error(`Token addresses not found for ${mToken}`);
  }

  return getDeploymentTokenAddresses(
    tokenAddresses,
    mToken,
    hre.deploymentConfig,
  );
};

const getPostDeployConfig = (
  hre: HardhatRuntimeEnvironment,
  mToken: MTokenName,
) => getNetworkConfig(hre, mToken, 'postDeploy');

const requireVaultAddress = (
  tokenAddresses: TokenAddresses,
  mToken: MTokenName,
  vaultType: V2VaultType,
) => {
  const address = tokenAddresses[vaultType];
  if (!address) {
    throw new Error(`${mToken} ${vaultType}V2 address is not configured`);
  }
  return address;
};

const resolveAddressOrVault = (
  tokenAddresses: TokenAddresses,
  mToken: MTokenName,
  value: AddressOrVault,
) =>
  value.startsWith('0x')
    ? value
    : requireVaultAddress(tokenAddresses, mToken, value as V2VaultType);

type TxSignMetadata = NonNullable<
  Parameters<typeof sendAndWaitForCustomTxSign>[2]
>;

const send = async (
  hre: HardhatRuntimeEnvironment,
  tx: PopulatedTransaction,
  mToken: MTokenName,
  action: TxSignMetadata['action'],
  subAction: TxSignMetadata['subAction'],
  comment: string,
  changes?: FieldChange[],
) => {
  const txRes = await sendAndWaitForCustomTxSign(hre, tx, {
    mToken,
    action,
    subAction,
    comment,
    changes,
  });
  console.log(`${comment}: tx initiated`, txRes);
};

/**
 * Sets instant operation rate limit windows on v2 vaults.
 * Windows that exist on-chain but are not in the config are left untouched
 */
export const setInstantLimits = async (
  hre: HardhatRuntimeEnvironment,
  mToken: MTokenName,
) => {
  const config = getPostDeployConfig(hre, mToken)?.instantLimits;
  if (!config) throw new Error('instantLimits config is not found');

  const tokenAddresses = getV2TokenAddresses(hre, mToken);

  for (const [vaultType, windows] of Object.entries(config)) {
    const vault = (await getContractAt(
      hre,
      'ManageableVault',
      requireVaultAddress(tokenAddresses, mToken, vaultType as V2VaultType),
    )) as ManageableVault;

    const current = await vault.getInstantLimitStatuses();

    for (const { window, limit } of windows ?? []) {
      const existing = current.find((s) => s.window.eq(window));

      if (existing?.limit.eq(limit)) {
        console.log(
          `${mToken} ${vaultType} instant limit for window ${window} is already ${limit}`,
        );
        continue;
      }

      await send(
        hre,
        await vault.populateTransaction.setInstantLimitConfig(window, limit),
        mToken,
        'update-vault',
        'set-instant-limit',
        `set ${mToken} ${vaultType} instant limit window=${window} limit=${limit}`,
        [
          {
            field: `${vaultType}.instantLimit[${window}s]`,
            current: existing?.limit,
            target: limit,
          },
        ],
      );
    }

    const extra = current.filter(
      (s) => !(windows ?? []).some((w) => s.window.eq(w.window)),
    );
    if (extra.length) {
      console.warn(
        `${mToken} ${vaultType} has windows not in config (left untouched): ${extra
          .map((s) => s.window.toString())
          .join(', ')}`,
      );
    }
  }
};

/**
 * Sets mToken mint rate limit windows per bucket and assigns wallets
 * (vaults or addresses) to buckets
 */
export const setMintRateLimits = async (
  hre: HardhatRuntimeEnvironment,
  mToken: MTokenName,
) => {
  const config = getPostDeployConfig(hre, mToken)?.mintRateLimits;
  if (!config) throw new Error('mintRateLimits config is not found');

  const tokenAddresses = getV2TokenAddresses(hre, mToken);

  if (!tokenAddresses.token) {
    throw new Error(`${mToken} token address is not configured`);
  }

  const token = (await getContractAt(
    hre,
    'mToken',
    tokenAddresses.token,
  )) as MToken;

  for (const { bucketId, window, limit } of config.buckets ?? []) {
    const current = (await token.getMintRateLimitStatuses(bucketId)).find((s) =>
      s.window.eq(window),
    );
    const currentLimit = current?.limit ?? BigNumber.from(0);

    if (current && currentLimit.eq(limit)) {
      console.log(
        `${mToken} mint limit bucket=${bucketId} window=${window} is already ${limit}`,
      );
      continue;
    }

    // a new window can only be created via increase (limit > 0), so a zero
    // limit takes two calls: increase to 1 wei, then decrease to 0
    if (!current && BigNumber.from(limit).isZero()) {
      await send(
        hre,
        await token.populateTransaction.increaseMintRateLimit(
          bucketId,
          window,
          1,
        ),
        mToken,
        'update-token',
        'set-mint-rate-limit',
        `create ${mToken} mint limit bucket=${bucketId} window=${window} limit=1`,
        [],
      );
      await send(
        hre,
        await token.populateTransaction.decreaseMintRateLimit(
          bucketId,
          window,
          0,
        ),
        mToken,
        'update-token',
        'set-mint-rate-limit',
        `decrease ${mToken} mint limit bucket=${bucketId} window=${window} limit=0`,
        [
          {
            field: `token.mintRateLimit[bucket ${bucketId}][${window}s]`,
            current: undefined,
            target: limit,
          },
        ],
      );
      continue;
    }

    // the contract only allows raising via increase and lowering via decrease
    const isIncrease = !current || currentLimit.lt(limit);

    await send(
      hre,
      isIncrease
        ? await token.populateTransaction.increaseMintRateLimit(
            bucketId,
            window,
            limit,
          )
        : await token.populateTransaction.decreaseMintRateLimit(
            bucketId,
            window,
            limit,
          ),
      mToken,
      'update-token',
      'set-mint-rate-limit',
      `${
        isIncrease ? 'increase' : 'decrease'
      } ${mToken} mint limit bucket=${bucketId} window=${window} limit=${limit}`,
      [
        {
          field: `token.mintRateLimit[bucket ${bucketId}][${window}s]`,
          current: current?.limit,
          target: limit,
        },
      ],
    );
  }

  for (const { wallet, bucketId } of config.walletBuckets ?? []) {
    const walletAddress = resolveAddressOrVault(tokenAddresses, mToken, wallet);

    const currentBucketId = await token.walletBucketId(walletAddress);
    if (currentBucketId === bucketId) {
      console.log(`${mToken} ${wallet} is already in bucket ${bucketId}`);
      continue;
    }

    await send(
      hre,
      await token.populateTransaction.setWalletBucketId(
        walletAddress,
        bucketId,
      ),
      mToken,
      'update-token',
      'set-wallet-bucket',
      `set ${mToken} ${wallet} (${walletAddress}) mint bucket to ${bucketId}`,
      [
        {
          field: `token.walletBucketId[${wallet}]`,
          current: currentBucketId,
          target: bucketId,
        },
      ],
    );
  }
};

type V2VaultConfigKey = keyof Omit<
  DeploymentConfig['networkConfigs'][number],
  'rvSwapper' | 'token' | 'postDeploy'
>;

/** v2 vault deploy config keys and their vaults */
const v2VaultConfigKeys: [V2VaultConfigKey, V2VaultType][] = [
  ['dv', 'depositVault'],
  ['dvUstb', 'depositVaultUstb'],
  ['dvAave', 'depositVaultAave'],
  ['dvMorpho', 'depositVaultMorpho'],
  ['dvMToken', 'depositVaultMToken'],
  ['dvUsyc', 'depositVaultUsyc'],
  ['rv', 'redemptionVault'],
  ['rvUstb', 'redemptionVaultUstb'],
  ['rvAave', 'redemptionVaultAave'],
  ['rvMorpho', 'redemptionVaultMorpho'],
  ['rvMToken', 'redemptionVaultMToken'],
  ['rvUsyc', 'redemptionVaultUsyc'],
];

/**
 * Resolves a USYC vault link (`dvUsyc.redemptionVault` /
 * `rvUsyc.depositVault`): an address or a v2 vault of another mToken
 */
const resolveUsycLinkedVault = (
  hre: HardhatRuntimeEnvironment,
  link:
    | NonNullable<DeployDvUsycConfig['redemptionVault']>
    | NonNullable<DeployRvUsycConfig['depositVault']>,
) => {
  if (typeof link === 'string') return link;

  const vaultType =
    'redemptionVaultType' in link
      ? link.redemptionVaultType
      : link.depositVaultType;
  const address = getCurrentAddresses(hre, 'v2')?.[link.mToken]?.[vaultType];

  if (!address) {
    throw new Error(`${link.mToken} ${vaultType}V2 address is not configured`);
  }
  return address;
};

const isSameValue = (current: unknown, target: unknown) => {
  if (BigNumber.isBigNumber(current)) {
    return current.eq(target as BigNumberish);
  }
  if (typeof current === 'string') {
    return current.toLowerCase() === String(target).toLowerCase();
  }
  return current === target;
};

/**
 * Syncs the settings of deployed v2 vaults with their deploy configs
 * (`dv`, `rv`, ...). Only the fields set in the config are synced.
 * `mTokenDataFeed` (no setter) and `loanConfig` are not synced
 */
export const setVaultSettings = async (
  hre: HardhatRuntimeEnvironment,
  mToken: MTokenName,
) => {
  const chainId = hre.network.config.chainId!;
  const networkConfig = getDeploymentConfigForToken(
    mToken,
    hre.deploymentConfig,
  )?.networkConfigs?.[chainId];

  const tokenAddresses = getV2TokenAddresses(hre, mToken);

  for (const [configKey, vaultType] of v2VaultConfigKeys) {
    const config = networkConfig?.[configKey];
    if (config?.version !== 'v2') continue;

    const label = `${mToken} ${vaultType}`;
    const address = requireVaultAddress(tokenAddresses, mToken, vaultType);
    const vault = (await getContractAt(
      hre,
      'ManageableVault',
      address,
    )) as ManageableVault;

    const sync = async <T>(
      name: string,
      target: T | undefined,
      getCurrent: () => Promise<unknown>,
      populate: (value: T) => Promise<PopulatedTransaction>,
    ) => {
      if (target === undefined) return;

      const current = await getCurrent();
      if (isSameValue(current, target)) {
        console.log(`${label} ${name} is already ${target}`);
        return;
      }

      await send(
        hre,
        await populate(target),
        mToken,
        'update-vault',
        'set-vault-setting',
        `set ${label} ${name}: ${current} -> ${target}`,
        [{ field: `${vaultType}.${name}`, current, target }],
      );
    };

    const tokensReceiver =
      !config.tokensReceiver || config.tokensReceiver.startsWith('0x')
        ? config.tokensReceiver
        : resolveAddressOrVault(
            tokenAddresses,
            mToken,
            config.tokensReceiver as V2VaultType,
          );

    let sanctionsList: string | undefined;
    if (config.enableSanctionsList !== undefined) {
      sanctionsList = config.enableSanctionsList
        ? sanctionListContracts[chainId]
        : constants.AddressZero;
      if (!sanctionsList) {
        throw new Error('Sanctions list address is not found');
      }
    }

    await sync(
      'minAmount',
      config.minAmount,
      () => vault.minAmount(),
      (v) => vault.populateTransaction.setMinAmount(v),
    );
    await sync(
      'instantFee',
      config.instantFee,
      () => vault.instantFee(),
      (v) => vault.populateTransaction.setInstantFee(v),
    );

    // both bounds are set by one setter
    if (
      config.minInstantFee !== undefined ||
      config.maxInstantFee !== undefined
    ) {
      const [currentMin, currentMax] = await Promise.all([
        vault.minInstantFee(),
        vault.maxInstantFee(),
      ]);
      const min = BigNumber.from(config.minInstantFee ?? currentMin);
      const max = BigNumber.from(config.maxInstantFee ?? currentMax);

      await sync(
        'minInstantFee/maxInstantFee',
        `${min}/${max}`,
        async () => `${currentMin}/${currentMax}`,
        () => vault.populateTransaction.setMinMaxInstantFee(min, max),
      );
    }

    await sync(
      'maxInstantShare',
      config.maxInstantShare,
      () => vault.maxInstantShare(),
      (v) => vault.populateTransaction.setMaxInstantShare(v),
    );
    await sync(
      'variationTolerance',
      config.variationTolerance,
      () => vault.variationTolerance(),
      (v) => vault.populateTransaction.setVariationTolerance(v),
    );
    await sync(
      'maxApproveRequestId',
      config.maxApproveRequestId,
      () => vault.maxApproveRequestId(),
      (v) => vault.populateTransaction.setMaxApproveRequestId(v),
    );
    await sync(
      'sequentialRequestProcessing',
      config.sequentialRequestProcessing,
      () => vault.sequentialRequestProcessing(),
      (v) => vault.populateTransaction.setSequentialRequestProcessing(v),
    );
    await sync(
      'tokensReceiver',
      tokensReceiver,
      () => vault.tokensReceiver(),
      (v) => vault.populateTransaction.setTokensReceiver(v),
    );
    await sync(
      'sanctionsList',
      sanctionsList,
      () => vault.sanctionsList(),
      (v) => vault.populateTransaction.setSanctionsList(v),
    );

    if (vaultType.startsWith('depositVault')) {
      const dvConfig = config as Extract<DeployDvConfig, { version: 'v2' }>;
      const dv = (await getContractAt(
        hre,
        'DepositVault',
        address,
      )) as DepositVault;

      await sync(
        'minMTokenAmountForFirstDeposit',
        dvConfig.minMTokenAmountForFirstDeposit,
        () => dv.minMTokenAmountForFirstDeposit(),
        (v) => dv.populateTransaction.setMinMTokenAmountForFirstDeposit(v),
      );
      await sync(
        'maxAmountPerRequest',
        dvConfig.maxAmountPerRequest,
        () => dv.maxAmountPerRequest(),
        (v) => dv.populateTransaction.setMaxAmountPerRequest(v),
      );
    } else {
      const rvConfig = config as Extract<DeployRvConfig, { version: 'v2' }>;
      const rv = (await getContractAt(
        hre,
        'RedemptionVault',
        address,
      )) as RedemptionVault;

      await sync(
        'requestRedeemer',
        rvConfig.requestRedeemer,
        () => rv.requestRedeemer(),
        (v) => rv.populateTransaction.setRequestRedeemer(v),
      );
    }

    if (configKey === 'dvUsyc') {
      const dvConfig = config as DeployDvUsycConfig;
      const dv = (await getContractAt(
        hre,
        'DepositVaultWithUSYC',
        address,
      )) as DepositVaultWithUSYC;

      await sync(
        'anticipatedFeeRate',
        dvConfig.anticipatedFeeRate,
        () => dv.anticipatedFeeRate(),
        (v) => dv.populateTransaction.setAnticipatedFeeRate(v),
      );
      await sync(
        'redemptionVault',
        dvConfig.redemptionVault &&
          resolveUsycLinkedVault(hre, dvConfig.redemptionVault),
        () => dv.redemptionVault(),
        (v) => dv.populateTransaction.setRedemptionVault(v),
      );
    }

    if (configKey === 'rvUsyc') {
      const rvConfig = config as DeployRvUsycConfig;
      const rv = (await getContractAt(
        hre,
        'RedemptionVaultWithUSYC',
        address,
      )) as RedemptionVaultWithUSYC;

      await sync(
        'anticipatedFeeRate',
        rvConfig.anticipatedFeeRate,
        () => rv.anticipatedFeeRate(),
        (v) => rv.populateTransaction.setAnticipatedFeeRate(v),
      );
      await sync(
        'depositVault',
        rvConfig.depositVault &&
          resolveUsycLinkedVault(hre, rvConfig.depositVault),
        () => rv.depositVault(),
        (v) => rv.populateTransaction.setDepositVault(v),
      );
    }
  }
};

/** Sets mToken max supply cap and clawback receiver */
export const setTokenConfig = async (
  hre: HardhatRuntimeEnvironment,
  mToken: MTokenName,
) => {
  const config = getPostDeployConfig(hre, mToken)?.tokenConfig;
  if (!config) throw new Error('tokenConfig config is not found');

  const tokenAddresses = getV2TokenAddresses(hre, mToken);

  if (!tokenAddresses.token) {
    throw new Error(`${mToken} token address is not configured`);
  }

  const token = (await getContractAt(
    hre,
    'mToken',
    tokenAddresses.token,
  )) as MToken;

  if (config.maxSupplyCap !== undefined) {
    const currentCap = await token.maxSupplyCap();
    if (currentCap.eq(config.maxSupplyCap)) {
      console.log(`${mToken} max supply cap is already ${config.maxSupplyCap}`);
    } else {
      await send(
        hre,
        await token.populateTransaction.setMaxSupplyCap(config.maxSupplyCap),
        mToken,
        'update-token',
        'set-max-supply-cap',
        `set ${mToken} max supply cap to ${config.maxSupplyCap}`,
        [
          {
            field: 'token.maxSupplyCap',
            current: currentCap,
            target: config.maxSupplyCap,
          },
        ],
      );
    }
  }

  if (config.clawbackReceiver !== undefined) {
    const currentReceiver = await token.clawbackReceiver();
    if (
      currentReceiver.toLowerCase() === config.clawbackReceiver.toLowerCase()
    ) {
      console.log(
        `${mToken} clawback receiver is already ${config.clawbackReceiver}`,
      );
    } else {
      await send(
        hre,
        await token.populateTransaction.setClawbackReceiver(
          config.clawbackReceiver,
        ),
        mToken,
        'update-token',
        'set-clawback-receiver',
        `set ${mToken} clawback receiver to ${config.clawbackReceiver}`,
        [
          {
            field: 'token.clawbackReceiver',
            current: currentReceiver,
            target: config.clawbackReceiver,
          },
        ],
      );
    }
  }
};

/** Exempts accounts from min amount checks on v2 vaults */
export const setFreeFromMinAmount = async (
  hre: HardhatRuntimeEnvironment,
  mToken: MTokenName,
) => {
  const config = getPostDeployConfig(hre, mToken)?.freeFromMinAmount;
  if (!config) throw new Error('freeFromMinAmount config is not found');

  const tokenAddresses = getV2TokenAddresses(hre, mToken);

  for (const [vaultType, accounts] of Object.entries(config)) {
    const vault = (await getContractAt(
      hre,
      'ManageableVault',
      requireVaultAddress(tokenAddresses, mToken, vaultType as V2VaultType),
    )) as ManageableVault;

    for (const account of accounts ?? []) {
      const address = resolveAddressOrVault(tokenAddresses, mToken, account);

      if (await vault.isFreeFromMinAmount(address)) {
        console.log(
          `${account} is already free from min amount in ${mToken} ${vaultType}`,
        );
        continue;
      }

      await send(
        hre,
        await vault.populateTransaction.freeFromMinAmount(address, true),
        mToken,
        'update-vault',
        'free-from-min-amount',
        `free ${account} (${address}) from min amount in ${mToken} ${vaultType}`,
        [
          {
            field: `${vaultType}.isFreeFromMinAmount[${account}]`,
            current: false,
            target: true,
          },
        ],
      );
    }
  }
};

/** Sets whether v2 redemption vaults use loan liquidity first */
export const setPreferLoanLiquidity = async (
  hre: HardhatRuntimeEnvironment,
  mToken: MTokenName,
) => {
  const config = getPostDeployConfig(hre, mToken)?.preferLoanLiquidity;
  if (!config) throw new Error('preferLoanLiquidity config is not found');

  const tokenAddresses = getV2TokenAddresses(hre, mToken);

  for (const [vaultType, enabled] of Object.entries(config)) {
    if (enabled === undefined) continue;

    const vault = (await getContractAt(
      hre,
      'RedemptionVault',
      requireVaultAddress(tokenAddresses, mToken, vaultType as V2VaultType),
    )) as RedemptionVault;

    if ((await vault.preferLoanLiquidity()) === enabled) {
      console.log(
        `${mToken} ${vaultType} preferLoanLiquidity is already ${enabled}`,
      );
      continue;
    }

    await send(
      hre,
      await vault.populateTransaction.setPreferLoanLiquidity(enabled),
      mToken,
      'update-vault',
      'set-prefer-loan-liquidity',
      `set ${mToken} ${vaultType} preferLoanLiquidity to ${enabled}`,
      [
        {
          field: `${vaultType}.preferLoanLiquidity`,
          current: !enabled,
          target: enabled,
        },
      ],
    );
  }
};

/** Configures auto-invest of depositVaultMToken */
export const setMTokenVaultConfig = async (
  hre: HardhatRuntimeEnvironment,
  mToken: MTokenName,
) => {
  const config = getPostDeployConfig(hre, mToken)?.setMTokenConfig;
  if (!config) throw new Error('setMTokenConfig config is not found');

  const vaultType: DepositVaultType = 'depositVaultMToken';
  const vault = (await getContractAt(
    hre,
    'DepositVaultWithMToken',
    requireVaultAddress(getV2TokenAddresses(hre, mToken), mToken, vaultType),
  )) as DepositVaultWithMToken;

  if (config.depositsEnabled !== undefined) {
    if ((await vault.mTokenDepositsEnabled()) === config.depositsEnabled) {
      console.log(
        `${mToken} ${vaultType} mToken deposits are already ${config.depositsEnabled}`,
      );
    } else {
      await send(
        hre,
        await vault.populateTransaction.setMTokenDepositsEnabled(
          config.depositsEnabled,
        ),
        mToken,
        'update-vault',
        'set-mtoken-deposits-enabled',
        `set ${mToken} ${vaultType} mToken deposits enabled to ${config.depositsEnabled}`,
        [
          {
            field: `${vaultType}.mTokenDepositsEnabled`,
            current: !config.depositsEnabled,
            target: config.depositsEnabled,
          },
        ],
      );
    }
  }

  if (config.autoInvestFallbackEnabled !== undefined) {
    if (
      (await vault.autoInvestFallbackEnabled()) ===
      config.autoInvestFallbackEnabled
    ) {
      console.log(
        `${mToken} ${vaultType} auto invest fallback is already ${config.autoInvestFallbackEnabled}`,
      );
    } else {
      await send(
        hre,
        await vault.populateTransaction.setAutoInvestFallbackEnabled(
          config.autoInvestFallbackEnabled,
        ),
        mToken,
        'update-vault',
        'set-auto-invest-fallback-enabled',
        `set ${mToken} ${vaultType} auto invest fallback to ${config.autoInvestFallbackEnabled}`,
        [
          {
            field: `${vaultType}.autoInvestFallbackEnabled`,
            current: !config.autoInvestFallbackEnabled,
            target: config.autoInvestFallbackEnabled,
          },
        ],
      );
    }
  }
};

/** Configures auto-invest of depositVaultUstb */
export const setUstbVaultConfig = async (
  hre: HardhatRuntimeEnvironment,
  mToken: MTokenName,
) => {
  const config = getPostDeployConfig(hre, mToken)?.setUstbConfig;
  if (!config) throw new Error('setUstbConfig config is not found');

  const vaultType: DepositVaultType = 'depositVaultUstb';
  const vault = (await getContractAt(
    hre,
    'DepositVaultWithUSTB',
    requireVaultAddress(getV2TokenAddresses(hre, mToken), mToken, vaultType),
  )) as DepositVaultWithUSTB;

  if (config.depositsEnabled === undefined) return;

  if ((await vault.ustbDepositsEnabled()) === config.depositsEnabled) {
    console.log(
      `${mToken} ${vaultType} USTB deposits are already ${config.depositsEnabled}`,
    );
    return;
  }

  await send(
    hre,
    await vault.populateTransaction.setUstbDepositsEnabled(
      config.depositsEnabled,
    ),
    mToken,
    'update-vault',
    'set-ustb-deposits-enabled',
    `set ${mToken} ${vaultType} USTB deposits enabled to ${config.depositsEnabled}`,
    [
      {
        field: `${vaultType}.ustbDepositsEnabled`,
        current: !config.depositsEnabled,
        target: config.depositsEnabled,
      },
    ],
  );
};
