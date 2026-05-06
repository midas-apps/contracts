import {
  confirm,
  group,
  intro,
  multiselect,
  outro,
  PromptGroup,
  select,
  stream,
  text,
} from '@clack/prompts';
import { isAddress, parseUnits } from 'ethers/lib/utils';
import { HardhatRuntimeEnvironment } from 'hardhat/types';

import { expr, requireNotCancelled } from '..';
import { MTokenName } from '../../../../../config';
import {
  getCurrentAddresses,
  sanctionListContracts,
  VaultType,
} from '../../../../../config/constants/addresses';
import { isMTokenName, isPaymentTokenName } from '../../../../../helpers/utils';
import { DeploymentConfig, PostDeployConfig } from '../../../common/types';

export const configsPerNetworkConfig = {
  dv: getDvConfigFromUser,
  dvAave: getDvAaveConfigFromUser,
  dvMorpho: getDvMorphoConfigFromUser,
  dvMToken: getDvMTokenConfigFromUser,
  rv: getRvConfigFromUser,
  rvSwapper: getRvSwapperConfigFromUser,
  rvMToken: getRvMTokenConfigFromUser,
  rvAave: getRvAaveConfigFromUser,
  rvMorpho: getRvMorphoConfigFromUser,
  genericConfig: getGenericConfigFromUser,
  postDeploy: {
    grantRoles: getPostDeployGrantRolesConfigFromUser,
    addPaymentTokens: getPostDeployAddPaymentTokensConfigFromUser,
  },
};

async function getGenericConfigFromUser(mToken: MTokenName) {
  intro('Generic Config');

  const maxAnswerDeviation = await text({
    message: 'Aggregator max answer deviation',
    validate: (value) => validateFloat(value, 8),
  })
    .then(requireNotCancelled)
    .then((value) => requireFloatToBigNumberish(value, 8));

  const tokenDenomination = await text({
    message: 'Token Denomination',
    defaultValue: 'USD',
    initialValue: 'USD',
    placeholder: 'USD',
  }).then(requireNotCancelled);

  const aggregatorType = await select<'REGULAR' | 'GROWTH'>({
    message: 'Aggregator type',
    options: [
      { value: 'REGULAR', label: 'Regular' },
      { value: 'GROWTH', label: 'Growth (applies APR to answer)' },
    ],
    initialValue: 'REGULAR',
  }).then(requireNotCancelled);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const customAggregator: Record<string, any> = {
    maxAnswerDeviation,
    description: `${mToken}/${tokenDenomination}`,
  };

  if (aggregatorType === 'GROWTH') {
    customAggregator.type = expr("'GROWTH'");

    const onlyUp = await confirm({
      message: 'Only up? (price can only increase)',
      initialValue: true,
    }).then(requireNotCancelled);

    const minGrowthApr = await text({
      message: 'Min growth APR (in %)',
      defaultValue: '0',
      initialValue: '0',
      validate: (value) => validateFloat(value, 8),
    })
      .then(requireNotCancelled)
      .then((value) => requireFloatToBigNumberish(value, 8));

    const maxGrowthApr = await text({
      message: 'Max growth APR (in %)',
      validate: (value) => validateFloat(value, 8),
    })
      .then(requireNotCancelled)
      .then((value) => requireFloatToBigNumberish(value, 8));

    customAggregator.onlyUp = onlyUp;
    customAggregator.minGrowthApr = minGrowthApr;
    customAggregator.maxGrowthApr = maxGrowthApr;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const result: Record<string, any> = {
    customAggregator,
    dataFeed: {},
  };

  const useAdjustedDvRv = await confirm({
    message:
      'Use adjusted DV/RV feeds? (separate +/- % for deposit/redemption)',
    initialValue: false,
  }).then(requireNotCancelled);

  if (useAdjustedDvRv) {
    const adjustmentPercentageDv = await text({
      message: 'Adjustment percentage for DV (e.g. 7 for +7%)',
      validate: (value) => validateFloat(value, 8),
    })
      .then(requireNotCancelled)
      .then((value) => requireFloatToBigNumberish(value, 8));

    const adjustmentPercentageRv = await text({
      message: 'Adjustment percentage for RV (e.g. -7 for -7%)',
      validate: (value) => validateFloat(value, 8),
    })
      .then(requireNotCancelled)
      .then((value) => requireFloatToBigNumberish(value, 8));

    const feedRef =
      aggregatorType === 'GROWTH' ? "'customFeedGrowth'" : "'customFeed'";

    result.customAggregatorAdjustedDv = {
      adjustmentPercentage: adjustmentPercentageDv,
      underlyingFeed: expr(feedRef),
    };
    result.customAggregatorAdjustedRv = {
      adjustmentPercentage: adjustmentPercentageRv,
      underlyingFeed: expr(feedRef),
    };
  }

  outro('Done...');

  return { ...result, isGrowth: aggregatorType === 'GROWTH' };
}

async function getDvConfigFromUser(hre: HardhatRuntimeEnvironment) {
  const config = await group({
    intro: () => Promise.resolve(intro('Deposit Vault')).then(() => undefined),
    feeReceiver: () =>
      text({ message: 'Fee Receiver', validate: validateAddress })
        .then(requireNotCancelled)
        .then(requireAddress),
    tokensReceiver: () =>
      text({ message: 'Tokens Receiver', validate: validateAddress })
        .then(requireNotCancelled)
        .then(requireAddress),
    instantDailyLimit: () =>
      text({
        message: 'Instant Daily Limit',
        defaultValue: 'Infinite',
        placeholder: 'Infinite',
        validate: validateBase18OrInfinite,
      })
        .then(requireNotCancelled)
        .then(requireBase18OrInfinite),
    instantFee: () =>
      text({
        message: 'Instant Fee',
        defaultValue: '0',
        placeholder: '0',
        validate: validateFloat,
      })
        .then(requireNotCancelled)
        .then(requireFloatToBigNumberish),
    variationTolerance: () =>
      text({
        message: 'Variation Tolerance',
        validate: validateFloat,
      })
        .then(requireNotCancelled)
        .then(requirePercentageToBigNumberish),
    minMTokenAmountForFirstDeposit: () =>
      text({
        message: 'Min mToken Amount For First Deposit',
        defaultValue: '0',
        placeholder: '0',
        validate: validateBase18,
      })
        .then(requireNotCancelled)
        .then(requireBase18),
    maxSupplyCap: () =>
      text({
        message: 'Max Supply Cap',
        defaultValue: 'Infinite',
        placeholder: 'Infinite',
        validate: validateBase18OrInfinite,
      })
        .then(requireNotCancelled)
        .then(requireBase18OrInfinite),
    outro: () => Promise.resolve(outro('Done...')).then(() => undefined),
  }).then(clearIntroOutro);

  return {
    type: 'REGULAR',
    enableSanctionsList: shouldEnableSanctionsList(hre),
    ...config,
  };
}

async function getDvAaveConfigFromUser(hre: HardhatRuntimeEnvironment) {
  const config = await group({
    intro: () =>
      Promise.resolve(intro('Deposit Vault With Aave')).then(() => undefined),
    feeReceiver: () =>
      text({ message: 'Fee Receiver', validate: validateAddress })
        .then(requireNotCancelled)
        .then(requireAddress),
    tokensReceiver: () =>
      text({ message: 'Tokens Receiver', validate: validateAddress })
        .then(requireNotCancelled)
        .then(requireAddress),
    instantDailyLimit: () =>
      text({
        message: 'Instant Daily Limit',
        defaultValue: 'Infinite',
        placeholder: 'Infinite',
        validate: validateBase18OrInfinite,
      })
        .then(requireNotCancelled)
        .then(requireBase18OrInfinite),
    instantFee: () =>
      text({
        message: 'Instant Fee',
        defaultValue: '0',
        placeholder: '0',
        validate: validateFloat,
      })
        .then(requireNotCancelled)
        .then(requireFloatToBigNumberish),
    variationTolerance: () =>
      text({
        message: 'Variation Tolerance',
        validate: validateFloat,
      })
        .then(requireNotCancelled)
        .then(requirePercentageToBigNumberish),
    minAmount: () =>
      text({
        message: 'Min Amount',
        defaultValue: '0',
        placeholder: '0',
        validate: validateBase18,
      })
        .then(requireNotCancelled)
        .then(requireBase18),
    minMTokenAmountForFirstDeposit: () =>
      text({
        message: 'Min mToken Amount For First Deposit',
        defaultValue: '0',
        placeholder: '0',
        validate: validateBase18,
      })
        .then(requireNotCancelled)
        .then(requireBase18),
    maxSupplyCap: () =>
      text({
        message: 'Max Supply Cap',
        defaultValue: 'Infinite',
        placeholder: 'Infinite',
        validate: validateBase18OrInfinite,
      })
        .then(requireNotCancelled)
        .then(requireBase18OrInfinite),
    outro: () => Promise.resolve(outro('Done...')).then(() => undefined),
  }).then(clearIntroOutro);

  return {
    type: 'AAVE' as const,
    enableSanctionsList: shouldEnableSanctionsList(hre),
    ...config,
  };
}

async function getDvMorphoConfigFromUser(hre: HardhatRuntimeEnvironment) {
  const config = await group({
    intro: () =>
      Promise.resolve(intro('Deposit Vault With Morpho')).then(() => undefined),
    feeReceiver: () =>
      text({ message: 'Fee Receiver', validate: validateAddress })
        .then(requireNotCancelled)
        .then(requireAddress),
    tokensReceiver: () =>
      text({ message: 'Tokens Receiver', validate: validateAddress })
        .then(requireNotCancelled)
        .then(requireAddress),
    instantDailyLimit: () =>
      text({
        message: 'Instant Daily Limit',
        defaultValue: 'Infinite',
        placeholder: 'Infinite',
        validate: validateBase18OrInfinite,
      })
        .then(requireNotCancelled)
        .then(requireBase18OrInfinite),
    instantFee: () =>
      text({
        message: 'Instant Fee',
        defaultValue: '0',
        placeholder: '0',
        validate: validateFloat,
      })
        .then(requireNotCancelled)
        .then(requireFloatToBigNumberish),
    variationTolerance: () =>
      text({
        message: 'Variation Tolerance',
        validate: validateFloat,
      })
        .then(requireNotCancelled)
        .then(requirePercentageToBigNumberish),
    minAmount: () =>
      text({
        message: 'Min Amount',
        defaultValue: '0',
        placeholder: '0',
        validate: validateBase18,
      })
        .then(requireNotCancelled)
        .then(requireBase18),
    minMTokenAmountForFirstDeposit: () =>
      text({
        message: 'Min mToken Amount For First Deposit',
        defaultValue: '0',
        placeholder: '0',
        validate: validateBase18,
      })
        .then(requireNotCancelled)
        .then(requireBase18),
    maxSupplyCap: () =>
      text({
        message: 'Max Supply Cap',
        defaultValue: 'Infinite',
        placeholder: 'Infinite',
        validate: validateBase18OrInfinite,
      })
        .then(requireNotCancelled)
        .then(requireBase18OrInfinite),
    outro: () => Promise.resolve(outro('Done...')).then(() => undefined),
  }).then(clearIntroOutro);

  return {
    type: 'MORPHO' as const,
    enableSanctionsList: shouldEnableSanctionsList(hre),
    ...config,
  };
}

async function getDvMTokenConfigFromUser(hre: HardhatRuntimeEnvironment) {
  const config = await group({
    intro: () =>
      Promise.resolve(intro('Deposit Vault With MToken')).then(() => undefined),
    feeReceiver: () =>
      text({ message: 'Fee Receiver', validate: validateAddress })
        .then(requireNotCancelled)
        .then(requireAddress),
    tokensReceiver: () =>
      text({ message: 'Tokens Receiver', validate: validateAddress })
        .then(requireNotCancelled)
        .then(requireAddress),
    mTokenDepositVault: () =>
      text({
        message: 'Target mToken DepositVault Address',
        validate: validateAddress,
      })
        .then(requireNotCancelled)
        .then(requireAddress),
    instantDailyLimit: () =>
      text({
        message: 'Instant Daily Limit',
        defaultValue: 'Infinite',
        placeholder: 'Infinite',
        validate: validateBase18OrInfinite,
      })
        .then(requireNotCancelled)
        .then(requireBase18OrInfinite),
    instantFee: () =>
      text({
        message: 'Instant Fee',
        defaultValue: '0',
        placeholder: '0',
        validate: validateFloat,
      })
        .then(requireNotCancelled)
        .then(requireFloatToBigNumberish),
    variationTolerance: () =>
      text({
        message: 'Variation Tolerance',
        validate: validateFloat,
      })
        .then(requireNotCancelled)
        .then(requirePercentageToBigNumberish),
    minAmount: () =>
      text({
        message: 'Min Amount',
        defaultValue: '0',
        placeholder: '0',
        validate: validateBase18,
      })
        .then(requireNotCancelled)
        .then(requireBase18),
    minMTokenAmountForFirstDeposit: () =>
      text({
        message: 'Min mToken Amount For First Deposit',
        defaultValue: '0',
        placeholder: '0',
        validate: validateBase18,
      })
        .then(requireNotCancelled)
        .then(requireBase18),
    maxSupplyCap: () =>
      text({
        message: 'Max Supply Cap',
        defaultValue: 'Infinite',
        placeholder: 'Infinite',
        validate: validateBase18OrInfinite,
      })
        .then(requireNotCancelled)
        .then(requireBase18OrInfinite),
    outro: () => Promise.resolve(outro('Done...')).then(() => undefined),
  }).then(clearIntroOutro);

  return {
    type: 'MTOKEN' as const,
    enableSanctionsList: shouldEnableSanctionsList(hre),
    ...config,
  };
}

async function getRvConfigFromUser<T>(
  hre: HardhatRuntimeEnvironment,
  extendGroup?: PromptGroup<T>,
  introText?: string,
) {
  const config = await group({
    intro: () =>
      Promise.resolve(intro(introText ?? 'Redemption Vault')).then(
        () => undefined,
      ),
    feeReceiver: () =>
      text({ message: 'Fee Receiver', validate: validateAddress })
        .then(requireNotCancelled)
        .then(requireAddress),
    tokensReceiver: () =>
      text({ message: 'Tokens Receiver', validate: validateAddress })
        .then(requireNotCancelled)
        .then(requireAddress),
    requestRedeemer: () =>
      text({ message: 'Request Redeemer', validate: validateAddress })
        .then(requireNotCancelled)
        .then(requireAddress),
    instantDailyLimit: () =>
      text({
        message: 'Instant Daily Limit',
        defaultValue: 'Infinite',
        placeholder: 'Infinite',
        validate: validateBase18OrInfinite,
      })
        .then(requireNotCancelled)
        .then(requireBase18OrInfinite),
    instantFee: () =>
      text({
        message: 'Instant Fee',
        defaultValue: '0',
        placeholder: '0',
        validate: validateFloat,
      })
        .then(requireNotCancelled)
        .then(requireFloatToBigNumberish),
    variationTolerance: () =>
      text({
        message: 'Variation Tolerance',
        validate: validateFloat,
      })
        .then(requireNotCancelled)
        .then(requirePercentageToBigNumberish),
    ...(extendGroup ?? {}),
    outro: () => Promise.resolve(outro(`Done...`)).then(() => undefined),
  }).then(clearIntroOutro);

  return {
    type: 'REGULAR',
    ...(config as typeof config & T),
    enableSanctionsList: shouldEnableSanctionsList(hre),
  };
}

async function getRvAaveConfigFromUser(hre: HardhatRuntimeEnvironment) {
  const config = await getRvConfigFromUser(
    hre,
    {},
    'Redemption Vault With Aave',
  );

  return {
    ...config,
    type: 'AAVE' as const,
  };
}

async function getRvMorphoConfigFromUser(hre: HardhatRuntimeEnvironment) {
  const config = await getRvConfigFromUser(
    hre,
    {},
    'Redemption Vault With Morpho',
  );

  return {
    ...config,
    type: 'MORPHO' as const,
  };
}

async function getRvMTokenConfigFromUser(hre: HardhatRuntimeEnvironment) {
  const config = await getRvConfigFromUser(
    hre,
    {
      redemptionVault: () =>
        text({
          message: 'mTokenA Redemption Vault Address',
          validate: validateAddress,
        })
          .then(requireNotCancelled)
          .then(requireAddress),
    },
    'Redemption Vault With MToken',
  );

  return {
    ...config,
    type: 'MTOKEN' as const,
  };
}

const getVaultForSwapper = (
  hre: HardhatRuntimeEnvironment,
  mToken: MTokenName,
) => {
  const addresses = getCurrentAddresses(hre);
  if (addresses?.[mToken]?.redemptionVaultMToken) {
    return 'redemptionVaultMToken';
  } else if (addresses?.[mToken]?.redemptionVaultSwapper) {
    return 'redemptionVaultSwapper';
  } else if (addresses?.[mToken]?.redemptionVaultUstb) {
    return 'redemptionVaultUstb';
  } else if (addresses?.[mToken]?.redemptionVaultBuidl) {
    return 'redemptionVaultBuidl';
  } else if (addresses?.[mToken]?.redemptionVaultAave) {
    return 'redemptionVaultAave';
  } else if (addresses?.[mToken]?.redemptionVaultMorpho) {
    return 'redemptionVaultMorpho';
  } else if (addresses?.[mToken]?.redemptionVault) {
    return 'redemptionVault';
  }
  return undefined;
};

async function getRvSwapperConfigFromUser(hre: HardhatRuntimeEnvironment) {
  const config = await getRvConfigFromUser(
    hre,
    {
      liquidityProvider: () =>
        text({
          message: 'Liquidity Provider',
          defaultValue: 'dummy',
          placeholder: 'dummy',
          validate: (value) =>
            value === 'dummy' ? undefined : validateAddress(value),
        })
          .then(requireNotCancelled)
          .then((value) => (value === 'dummy' ? value : requireAddress(value))),
      swapperMToken: ({ results: { liquidityProvider } }) =>
        liquidityProvider === 'dummy'
          ? Promise.resolve('dummy')
          : text({
              message: 'Swapper mProduct',
              placeholder: 'mTBILL',
              validate: (value) => {
                if (value !== 'dummy' && !isMTokenName(value)) {
                  return 'Invalid mProduct';
                }
                if (!getVaultForSwapper(hre, value as MTokenName)) {
                  return 'mProduct does not have a redemption vault';
                }
              },
            }).then(requireNotCancelled),
    },
    'Redemption Vault Swapper',
  );

  const swapperMToken = config.swapperMToken as MTokenName | 'dummy';

  const swapperVault =
    swapperMToken === 'dummy'
      ? 'dummy'
      : {
          mToken: swapperMToken,
          redemptionVaultType: getVaultForSwapper(hre, swapperMToken),
        };

  delete config.swapperMToken;

  return {
    ...config,
    type: 'SWAPPER',
    swapperVault,
  };
}

async function getPostDeployGrantRolesConfigFromUser(
  _: HardhatRuntimeEnvironment,
) {
  const config = await group({
    intro: () =>
      Promise.resolve(intro('Post Deploy Grant Roles')).then(() => undefined),
    tokenManagerAddress: () =>
      text({ message: 'Token Manager Address', validate: validateAddress })
        .then(requireNotCancelled)
        .then(requireAddress),
    vaultsManagerAddress: () =>
      text({
        message: 'Vaults Manager Address',
        defaultValue: '0x2ACB4BdCbEf02f81BF713b696Ac26390d7f79A12',
        placeholder: '0x2ACB4BdCbEf02f81BF713b696Ac26390d7f79A12',
        validate: validateAddress,
      })
        .then(requireNotCancelled)
        .then(requireAddress),
    oracleManagerAddress: () =>
      text({ message: 'Oracle Manager Address', validate: validateAddress })
        .then(requireNotCancelled)
        .then(requireAddress),
    outro: () => Promise.resolve(outro(`Done...`)).then(() => undefined),
  }).then(clearIntroOutro);

  return config;
}

async function getPostDeployAddPaymentTokensConfigFromUser(
  _: HardhatRuntimeEnvironment,
  vaults: VaultType[],
) {
  const { selectedVaults } = await group({
    intro: () =>
      Promise.resolve(intro('Post Deploy Add Payment Tokens')).then(
        () => undefined,
      ),
    selectedVaults: () =>
      multiselect({
        message: 'Select Vaults to add payment tokens to',
        options: vaults.map((vault) => ({
          value: vault,
          label: vault,
        })),
        initialValues: vaults,
      }).then(requireNotCancelled),
  });

  const configs: Partial<
    Record<
      VaultType,
      {
        paymentTokens: object[];
        type: VaultType;
      }
    >
  > = {};

  for (const vault of selectedVaults) {
    let addMore = true;

    await stream.info(`Configuring payment tokens for ${vault}...`);

    while (addMore) {
      const config = await group({
        token: () =>
          text({
            message: 'Token',
            validate: (value) => {
              if (!isPaymentTokenName(value)) {
                return 'Unknown token name';
              }
            },
          }).then(requireNotCancelled),
        allowance: () =>
          text({
            message: 'Allowance',
            validate: validateBase18,
          })
            .then(requireNotCancelled)
            .then(requireBase18OrNull),
        isStable: () =>
          confirm({
            message: 'Is stable?',
            initialValue: true,
          }).then(requireNotCancelled),
        fee: () =>
          text({
            message: 'Fee',
            defaultValue: '0',
            initialValue: '0',
            placeholder: '0',
            validate: validateFloat,
          })
            .then(requireNotCancelled)
            .then(requireFloatToBigNumberishOrNull),
      });

      if (!configs[vault]) {
        configs[vault] = { paymentTokens: [], type: vault };
      }

      const partialConfig = config as Partial<typeof config>;

      if (config.fee === null) {
        delete partialConfig.fee;
      }
      if (config.allowance === null) {
        delete partialConfig.allowance;
      }

      if (config.isStable === true) {
        delete partialConfig.isStable;
      }

      configs[vault].paymentTokens.push(config);

      addMore = await confirm({
        message: 'Add another payment token?',
        initialValue: true,
      }).then(requireNotCancelled);
    }
  }

  outro(`Done...`);

  return { vaults: Object.values(configs) };
}

export async function getDeploymentConfigFromUser(
  overrideNetworkConfig: boolean,
) {
  const config = await group({
    deploymentConfigs: () =>
      multiselect<
        keyof Pick<
          DeploymentConfig['networkConfigs'][number],
          | 'rv'
          | 'rvSwapper'
          | 'rvMToken'
          | 'rvAave'
          | 'rvMorpho'
          | 'dv'
          | 'dvAave'
          | 'dvMorpho'
          | 'dvMToken'
        >
      >({
        message:
          'Select configs to generate. (Space to select, Enter to confirm)',
        options: [
          {
            value: 'dv',
            label: 'Deposit Vault',
            hint: 'Deposit Vault contract',
          },
          {
            value: 'dvAave',
            label: 'Deposit Vault With Aave',
            hint: 'Deposit Vault with Aave V3 auto-invest',
          },
          {
            value: 'dvMorpho',
            label: 'Deposit Vault With Morpho',
            hint: 'Deposit Vault with Morpho auto-invest',
          },
          {
            value: 'dvMToken',
            label: 'Deposit Vault With MToken',
            hint: 'Deposit Vault with mToken auto-invest',
          },
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
            value: 'rvMToken',
            label: 'Redemption Vault With MToken',
            hint: 'Redemption Vault With MToken liquid strategy contract',
          },
          {
            value: 'rvAave',
            label: 'Redemption Vault With Aave',
            hint: 'Redemption Vault With Aave V3 contract',
          },
          {
            value: 'rvMorpho',
            label: 'Redemption Vault With Morpho',
            hint: 'Redemption Vault With Morpho Vault (ERC-4626) contract',
          },
        ],
        initialValues: ['dv', 'rvSwapper'],
        required: true,
      }).then(requireNotCancelled),
    includePostDeploy: () =>
      confirm({
        message: `${
          overrideNetworkConfig ? 'Override' : 'Include'
        } post deploy configs?`,
        initialValue: true,
      }).then(requireNotCancelled),
    postDeployConfigs: ({ results: { includePostDeploy } }) =>
      includePostDeploy
        ? multiselect<keyof PostDeployConfig>({
            message: 'Select post deploy configs to generate.',
            options: [
              {
                value: 'addPaymentTokens',
                label: 'Add Payment Tokens',
                hint: 'Add Payment Tokens script',
              },
              {
                value: 'grantRoles',
                label: 'Grant Roles',
                hint: 'Grant Roles script',
              },
            ],
            initialValues: ['addPaymentTokens', 'grantRoles'],
            required: true,
          }).then(requireNotCancelled)
        : undefined,
  });

  return config;
}

const clearIntroOutro = <T>(
  data: T & { intro?: undefined; outro?: undefined },
): T => {
  delete data.intro;
  delete data.outro;
  return data;
};

const shouldEnableSanctionsList = (hre: HardhatRuntimeEnvironment) => {
  return !!sanctionListContracts[hre.network.config.chainId!];
};

const requireAddress = (value: string) => {
  const error = validateAddress(value);
  if (error) {
    throw error;
  }
  return value;
};

const requireBase18 = (value: string) => {
  const error = validateBase18(value);
  if (error) {
    throw error;
  }
  return expr(`parseUnits("${value}", 18)`);
};

const requireBase18OrNull = (value: string) => {
  const error = validateBase18(value);
  if (error) {
    throw error;
  }
  return value === '0' ? null : expr(`parseUnits("${value}", 18)`);
};

const requireBase18OrInfinite = (value: string) => {
  if (isInfinite(value)) {
    return expr('constants.MaxUint256');
  }
  return requireBase18(value);
};

const requireFloatToBigNumberish = (value: string, maxDecimals = 2) => {
  const error = validateFloat(value, maxDecimals);
  if (error) {
    throw error;
  }
  return expr(`parseUnits("${value}", ${maxDecimals})`);
};

const requireFloatToBigNumberishOrNull = (value: string, maxDecimals = 2) => {
  const error = validateFloat(value, maxDecimals);
  if (error) {
    throw error;
  }
  return value === '0' ? null : expr(`parseUnits("${value}", ${maxDecimals})`);
};

const validateAddress = (value: string) => {
  if (!isAddress(value)) {
    return new Error('Invalid address');
  }
  return undefined;
};

const validateBase18 = (value: string) => {
  try {
    parseUnits(value, 18);
    return undefined;
  } catch {
    return new Error('Invalid value');
  }
};

const validateBase18OrInfinite = (value: string) => {
  if (isInfinite(value)) return undefined;
  return validateBase18(value);
};

const validateFloat = (value: string, maxDecimals = 2) => {
  try {
    parseUnits(value, maxDecimals);
    return undefined;
  } catch {
    return new Error('Invalid float');
  }
};

const requirePercentageToBigNumberish = (value: string) => {
  return requireFloatToBigNumberish(value, 2);
};

const isInfinite = (value: string) => {
  return value.trim().toLowerCase() === 'infinite';
};
