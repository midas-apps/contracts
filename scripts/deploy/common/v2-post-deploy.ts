import { BigNumber, BigNumberish, PopulatedTransaction } from 'ethers';
import { HardhatRuntimeEnvironment } from 'hardhat/types';

import {
  getContractAt,
  getNetworkConfig,
  sendAndWaitForCustomTxSign,
} from './utils';

import { MTokenName } from '../../../config';
import {
  DepositVaultType,
  getCurrentAddresses,
  RedemptionVaultType,
  TokenAddresses,
  V2VaultType,
} from '../../../config/constants/addresses';
import {
  DepositVaultWithMToken,
  DepositVaultWithUSTB,
  ManageableVault,
  MToken,
  RedemptionVault,
} from '../../../typechain-types';
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
) => {
  const txRes = await sendAndWaitForCustomTxSign(hre, tx, {
    mToken,
    action,
    subAction,
    comment,
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
    );
  }

  for (const { wallet, bucketId } of config.walletBuckets ?? []) {
    const walletAddress = resolveAddressOrVault(tokenAddresses, mToken, wallet);

    if ((await token.walletBucketId(walletAddress)) === bucketId) {
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
    );
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
    if ((await token.maxSupplyCap()).eq(config.maxSupplyCap)) {
      console.log(`${mToken} max supply cap is already ${config.maxSupplyCap}`);
    } else {
      await send(
        hre,
        await token.populateTransaction.setMaxSupplyCap(config.maxSupplyCap),
        mToken,
        'update-token',
        'set-max-supply-cap',
        `set ${mToken} max supply cap to ${config.maxSupplyCap}`,
      );
    }
  }

  if (config.clawbackReceiver !== undefined) {
    if (
      (await token.clawbackReceiver()).toLowerCase() ===
      config.clawbackReceiver.toLowerCase()
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
  );
};
