import { Provider } from '@ethersproject/providers';
import { BigNumber, BigNumberish, constants, Signer } from 'ethers';
import { HardhatRuntimeEnvironment } from 'hardhat/types';

import {
  getDeployer,
  getNetworkConfig,
  sendAndWaitForCustomTxSign,
} from './utils';

import { MTokenName, PaymentTokenName } from '../../../config';
import {
  DataFeedAddresses,
  getCurrentAddresses,
  VaultType,
} from '../../../config/constants/addresses';
import {
  DepositVaultWithAave,
  DepositVaultWithMorpho,
  ManageableVault,
  RedemptionVaultWithAave,
  RedemptionVaultWithMorpho,
} from '../../../typechain-types';

export type AddPaymentTokensConfig = {
  vaults: {
    type: VaultType;
    paymentTokens: {
      token: PaymentTokenName;
      // default: true
      isStable?: boolean;
      // default: 0
      fee?: BigNumberish;
      // default: infinite
      allowance?: BigNumberish;
    }[];
  }[];
};

export type AddFeeWaivedConfig = {
  fromVault: {
    mToken: MTokenName;
    type: VaultType;
  };
  value?: boolean;
  toWaive: (
    | {
        // default: hre.mtoken
        mToken?: MTokenName;
        type: VaultType;
      }
    | string
  )[];
}[];

export const setFeeWaivedAccounts = async (
  hre: HardhatRuntimeEnvironment,
  token: MTokenName,
) => {
  const { addFeeWaived: networkConfig } = getNetworkConfig(
    hre,
    token,
    'postDeploy',
  );

  if (!networkConfig) {
    throw new Error('Network config is not found');
  }

  const provider = await getDeployer(hre);

  // simulation step to ensure that all the loop iterations wont fail on
  // simple checks step
  await foreachFeeWaiveAddress(
    hre,
    provider,
    token,
    networkConfig,
    async (vaultType, _, __, ___, feeWaiveLabel) => {
      console.log(
        `successfully simulated ${feeWaiveLabel} processing for ${vaultType}`,
      );
    },
  );

  await foreachFeeWaiveAddress(
    hre,
    provider,
    token,
    networkConfig,
    async (
      vaultType,
      vaultMToken,
      vaultContract,
      feeWaiveAddress,
      feeWaiveLabel,
      value,
    ) => {
      const waived = await vaultContract.waivedFeeRestriction(feeWaiveAddress!);

      if (waived === value) {
        console.log(
          `Fee is already ${value ? 'waived' : 'not waived'}, skipping...`,
          feeWaiveAddress,
        );
        return;
      }

      const tx = await vaultContract.populateTransaction.setWaivedFeeAccount(
        feeWaiveAddress!,
        value,
      );

      const txRes = await sendAndWaitForCustomTxSign(hre, tx, {
        action: 'update-vault',
        subAction: 'add-fee-waived',
        comment: `waive fee for ${feeWaiveLabel} in ${vaultMToken} ${vaultType}`,
        mToken: vaultMToken,
      });

      console.log(`${vaultType} tx initiated`, txRes);
    },
  );
};

export const addPaymentTokens = async (
  hre: HardhatRuntimeEnvironment,
  token: MTokenName,
) => {
  const { addPaymentTokens: networkConfig } = getNetworkConfig(
    hre,
    token,
    'postDeploy',
  );

  if (!networkConfig) {
    throw new Error('Network config is not found');
  }

  const provider = await getDeployer(hre);

  // simulation step to ensure that all the loop iterations wont fail on
  // simple checks step
  await foreachVaultPaymentToken(
    hre,
    provider,
    token,
    networkConfig,
    async (vaultType, _, __, paymentToken) => {
      console.log(
        `successfully simulated ${paymentToken.token} processing for ${vaultType}`,
      );
    },
  );

  await foreachVaultPaymentToken(
    hre,
    provider,
    token,
    networkConfig,
    async (vaultType, vaultContract, tokenConfig, paymentToken) => {
      const paymentTokenConfig = await vaultContract.tokensConfig(
        tokenConfig.token!,
      );

      if (paymentTokenConfig.dataFeed !== constants.AddressZero) {
        console.log('Token is already added, skipping...', paymentToken.token);
        return;
      }

      const tx = await vaultContract.populateTransaction.addPaymentToken(
        tokenConfig.token!,
        tokenConfig.dataFeed!,
        paymentToken.fee ?? BigNumber.from(0),
        paymentToken.allowance ?? constants.MaxUint256,
        paymentToken.isStable ?? true,
      );

      const txRes = await sendAndWaitForCustomTxSign(hre, tx, {
        action: 'update-vault',
        subAction: 'add-payment-token',
        comment: `add ${paymentToken.token} to ${token} ${vaultType}`,
      });

      console.log(`${vaultType}:${paymentToken.token} tx initiated`, txRes);
    },
  );
};

const foreachFeeWaiveAddress = async (
  hre: HardhatRuntimeEnvironment,
  provider: Provider | Signer,
  token: MTokenName,
  networkConfig: AddFeeWaivedConfig,
  callback?: (
    vaultType: VaultType,
    vaultMToken: MTokenName,
    vaultContract: ManageableVault,
    feeWaiveAddress: string,
    feeWaiveLabel: string,
    value: boolean,
  ) => Promise<void>,
) => {
  const addresses = getCurrentAddresses(hre);

  for (const vault of networkConfig) {
    const vaultContract = await getVaultContract(
      hre,
      provider,
      vault.fromVault.mToken,
      vault.fromVault.type,
    );

    for (const toWaive of vault.toWaive) {
      const address =
        typeof toWaive === 'string'
          ? toWaive
          : addresses?.[toWaive.mToken ?? token]?.[toWaive.type];

      if (!address) {
        throw new Error('Invalid address to waive');
      }

      await callback?.(
        vault.fromVault.type,
        vault.fromVault.mToken,
        vaultContract,
        address,
        typeof toWaive === 'string'
          ? toWaive
          : `${toWaive.mToken ?? token} ${toWaive.type}`,
        vault.value ?? true,
      );
    }
  }
};

const foreachVaultPaymentToken = async (
  hre: HardhatRuntimeEnvironment,
  provider: Provider | Signer,
  token: MTokenName,
  networkConfig: AddPaymentTokensConfig,
  callback?: (
    vaultType: VaultType,
    vaultContract: ManageableVault,
    addresses: DataFeedAddresses,
    paymentToken: AddPaymentTokensConfig['vaults'][number]['paymentTokens'][number],
  ) => Promise<void>,
) => {
  const addresses = getCurrentAddresses(hre);

  for (const vault of networkConfig.vaults) {
    const vaultContract = await getVaultContract(
      hre,
      provider,
      token,
      vault.type,
    );

    for (const paymentToken of vault.paymentTokens) {
      const tokenConfig = addresses?.paymentTokens?.[paymentToken.token];

      if (!tokenConfig) {
        throw new Error('Token config is not found');
      }

      await callback?.(vault.type, vaultContract, tokenConfig, paymentToken);
    }
  }
};

const getVaultContract = async (
  hre: HardhatRuntimeEnvironment,
  provider: Provider | Signer,
  mToken: MTokenName,
  vaultType: VaultType,
) => {
  const addresses = getCurrentAddresses(hre);

  const vaultAddress = addresses?.[mToken]?.[vaultType];

  if (!vaultAddress) {
    throw new Error('Vault address is not found');
  }

  return (
    await hre.ethers.getContractAt('ManageableVault', vaultAddress)
  ).connect(provider) as ManageableVault;
};

const resolvePaymentTokenAddress = (
  hre: HardhatRuntimeEnvironment,
  token: PaymentTokenName,
) => {
  const addresses = getCurrentAddresses(hre);
  const tokenAddress = addresses?.paymentTokens?.[token]?.token;

  if (!tokenAddress) {
    throw new Error(
      `Payment token address is not found for ${token} on ${hre.network.name}`,
    );
  }

  return tokenAddress;
};

export type SetAaveConfigEntry = {
  type: 'depositVaultAave' | 'redemptionVaultAave';
  pools: {
    token: PaymentTokenName;
    aavePool: string;
  }[];
  /**
   * Only applies to depositVaultAave.
   * @default false
   */
  depositsEnabled?: boolean;
  /**
   * Only applies to depositVaultAave.
   * @default false
   */
  autoInvestFallbackEnabled?: boolean;
};

export type SetAaveConfigConfig = SetAaveConfigEntry[];

export const setAaveConfig = async (
  hre: HardhatRuntimeEnvironment,
  mToken: MTokenName,
) => {
  const { setAaveConfig: networkConfig } = getNetworkConfig(
    hre,
    mToken,
    'postDeploy',
  );

  if (!networkConfig) {
    throw new Error('Network config is not found');
  }

  const addresses = getCurrentAddresses(hre);
  const tokenAddresses = addresses?.[mToken];

  if (!tokenAddresses) {
    throw new Error(`Token addresses are not found for ${mToken}`);
  }

  for (const entry of networkConfig) {
    const vaultAddress = tokenAddresses[entry.type];

    if (!vaultAddress) {
      console.log(`No ${entry.type} found for ${mToken}, skipping`);
      continue;
    }

    const vault = (await hre.ethers.getContractAt(
      entry.type === 'depositVaultAave'
        ? 'DepositVaultWithAave'
        : 'RedemptionVaultWithAave',
      vaultAddress,
    )) as DepositVaultWithAave | RedemptionVaultWithAave;

    for (const { token, aavePool } of entry.pools) {
      const tokenAddress = resolvePaymentTokenAddress(hre, token);

      const currentPool = await vault.aavePools(tokenAddress);
      if (currentPool.toLowerCase() !== aavePool.toLowerCase()) {
        const tx = await vault.populateTransaction.setAavePool(
          tokenAddress,
          aavePool,
        );
        await sendAndWaitForCustomTxSign(hre, tx, {
          action: 'update-vault',
          subAction: 'set-aave-pool',
          comment: `Set Aave pool of ${token} for ${mToken} ${entry.type}`,
          mToken,
        });
        console.log(`Set Aave pool of ${token} for ${mToken} ${entry.type}`);
      } else {
        console.log(
          `Aave pool of ${token} already set for ${mToken} ${entry.type}`,
        );
      }
    }

    if (entry.type !== 'depositVaultAave') {
      continue;
    }

    const dv = vault as DepositVaultWithAave;

    const targetDepositsEnabled = entry.depositsEnabled ?? false;
    const depositsEnabled = await dv.aaveDepositsEnabled();
    if (depositsEnabled !== targetDepositsEnabled) {
      const tx = await dv.populateTransaction.setAaveDepositsEnabled(
        targetDepositsEnabled,
      );
      await sendAndWaitForCustomTxSign(hre, tx, {
        action: 'update-vault',
        subAction: 'set-aave-deposits-enabled',
        comment: `Set aaveDepositsEnabled=${targetDepositsEnabled} for ${mToken} depositVaultAave`,
        mToken,
      });
      console.log(
        `Set aaveDepositsEnabled=${targetDepositsEnabled} for ${mToken} depositVaultAave`,
      );
    } else {
      console.log(
        `aaveDepositsEnabled already correct for ${mToken} depositVaultAave`,
      );
    }

    const targetFallbackEnabled = entry.autoInvestFallbackEnabled ?? false;
    const fallbackEnabled = await dv.autoInvestFallbackEnabled();
    if (fallbackEnabled !== targetFallbackEnabled) {
      const tx = await dv.populateTransaction.setAutoInvestFallbackEnabled(
        targetFallbackEnabled,
      );
      await sendAndWaitForCustomTxSign(hre, tx, {
        action: 'update-vault',
        subAction: 'set-auto-invest-fallback-enabled',
        comment: `Set autoInvestFallbackEnabled=${targetFallbackEnabled} for ${mToken} depositVaultAave`,
        mToken,
      });
      console.log(
        `Set autoInvestFallbackEnabled=${targetFallbackEnabled} for ${mToken} depositVaultAave`,
      );
    } else {
      console.log(
        `autoInvestFallbackEnabled already correct for ${mToken} depositVaultAave`,
      );
    }
  }
};

export type SetMorphoConfigEntry = {
  type: 'depositVaultMorpho' | 'redemptionVaultMorpho';
  vaults: {
    token: PaymentTokenName;
    morphoVault: string;
  }[];
  /**
   * Only applies to depositVaultMorpho.
   * @default false
   */
  depositsEnabled?: boolean;
  /**
   * Only applies to depositVaultMorpho.
   * @default false
   */
  autoInvestFallbackEnabled?: boolean;
};

export type SetMorphoConfigConfig = SetMorphoConfigEntry[];

export const setMorphoConfig = async (
  hre: HardhatRuntimeEnvironment,
  mToken: MTokenName,
) => {
  const { setMorphoConfig: networkConfig } = getNetworkConfig(
    hre,
    mToken,
    'postDeploy',
  );

  if (!networkConfig) {
    throw new Error('Network config is not found');
  }

  const addresses = getCurrentAddresses(hre);
  const tokenAddresses = addresses?.[mToken];

  if (!tokenAddresses) {
    throw new Error(`Token addresses are not found for ${mToken}`);
  }

  for (const entry of networkConfig) {
    const vaultAddress = tokenAddresses[entry.type];

    if (!vaultAddress) {
      console.log(`No ${entry.type} found for ${mToken}, skipping`);
      continue;
    }

    const vault = (await hre.ethers.getContractAt(
      entry.type === 'depositVaultMorpho'
        ? 'DepositVaultWithMorpho'
        : 'RedemptionVaultWithMorpho',
      vaultAddress,
    )) as DepositVaultWithMorpho | RedemptionVaultWithMorpho;

    for (const { token, morphoVault } of entry.vaults) {
      const tokenAddress = resolvePaymentTokenAddress(hre, token);

      const currentVault = await vault.morphoVaults(tokenAddress);
      if (currentVault.toLowerCase() !== morphoVault.toLowerCase()) {
        const tx = await vault.populateTransaction.setMorphoVault(
          tokenAddress,
          morphoVault,
        );
        await sendAndWaitForCustomTxSign(hre, tx, {
          action: 'update-vault',
          subAction: 'set-morpho-vault',
          comment: `Set Morpho vault of ${token} for ${mToken} ${entry.type}`,
          mToken,
        });
        console.log(`Set Morpho vault of ${token} for ${mToken} ${entry.type}`);
      } else {
        console.log(
          `Morpho vault of ${token} already set for ${mToken} ${entry.type}`,
        );
      }
    }

    if (entry.type !== 'depositVaultMorpho') {
      continue;
    }

    const dv = vault as DepositVaultWithMorpho;

    const targetDepositsEnabled = entry.depositsEnabled ?? false;
    const depositsEnabled = await dv.morphoDepositsEnabled();
    if (depositsEnabled !== targetDepositsEnabled) {
      const tx = await dv.populateTransaction.setMorphoDepositsEnabled(
        targetDepositsEnabled,
      );
      await sendAndWaitForCustomTxSign(hre, tx, {
        action: 'update-vault',
        subAction: 'set-morpho-deposits-enabled',
        comment: `Set morphoDepositsEnabled=${targetDepositsEnabled} for ${mToken} depositVaultMorpho`,
        mToken,
      });
      console.log(
        `Set morphoDepositsEnabled=${targetDepositsEnabled} for ${mToken} depositVaultMorpho`,
      );
    } else {
      console.log(
        `morphoDepositsEnabled already correct for ${mToken} depositVaultMorpho`,
      );
    }

    const targetFallbackEnabled = entry.autoInvestFallbackEnabled ?? false;
    const fallbackEnabled = await dv.autoInvestFallbackEnabled();
    if (fallbackEnabled !== targetFallbackEnabled) {
      const tx = await dv.populateTransaction.setAutoInvestFallbackEnabled(
        targetFallbackEnabled,
      );
      await sendAndWaitForCustomTxSign(hre, tx, {
        action: 'update-vault',
        subAction: 'set-auto-invest-fallback-enabled',
        comment: `Set autoInvestFallbackEnabled=${targetFallbackEnabled} for ${mToken} depositVaultMorpho`,
        mToken,
      });
      console.log(
        `Set autoInvestFallbackEnabled=${targetFallbackEnabled} for ${mToken} depositVaultMorpho`,
      );
    } else {
      console.log(
        `autoInvestFallbackEnabled already correct for ${mToken} depositVaultMorpho`,
      );
    }
  }
};
