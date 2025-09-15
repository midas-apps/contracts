import {
  confirm,
  group,
  intro,
  multiselect,
  outro,
  PromptGroup,
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
  rv: getRvConfigFromUser,
  rvSwapper: getRvSwapperConfigFromUser,
  genericConfig: getGenericConfigFromUser,
  postDeploy: {
    grantRoles: getPostDeployGrantRolesConfigFromUser,
    addPaymentTokens: getPostDeployAddPaymentTokensConfigFromUser,
  },
};

async function getGenericConfigFromUser(mToken: MTokenName) {
  const config = await group({
    intro: () => Promise.resolve(intro('Generic Config')).then(() => undefined),
    maxAswerDeviation: () =>
      text({
        message: 'Aggregator max answer deviation',
        validate: (value) => validateFloat(value, 8),
      })
        .then(requireNotCancelled)
        .then((value) => requireFloatToBigNumberish(value, 8)),
    tokenDenomination: () =>
      text({
        message: 'Token Denomination',
        defaultValue: 'USD',
        initialValue: 'USD',
        placeholder: 'USD',
      }).then(requireNotCancelled),
    outro: () => Promise.resolve(outro('Done...')).then(() => undefined),
  }).then(clearIntroOutro);

  return {
    customAggregator: {
      maxAnswerDeviation: config.maxAswerDeviation,
      description: `${mToken}/${config.tokenDenomination}`,
    },
    dataFeed: {},
  };
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
      text({ message: 'Instant Daily Limit', validate: validateBase18 })
        .then(requireNotCancelled)
        .then(requireBase18),
    instantFee: () =>
      text({
        message: 'Instant Fee',
        defaultValue: '0',
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
    outro: () => Promise.resolve(outro('Done...')).then(() => undefined),
  }).then(clearIntroOutro);

  return {
    type: 'REGULAR',
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
      text({ message: 'Instant Daily Limit', validate: validateBase18 })
        .then(requireNotCancelled)
        .then(requireBase18),
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

const getVaultForSwapper = (
  hre: HardhatRuntimeEnvironment,
  mToken: MTokenName,
) => {
  const addresses = getCurrentAddresses(hre);
  if (addresses?.[mToken]?.redemptionVaultSwapper) {
    return 'redemptionVaultSwapper';
  } else if (addresses?.[mToken]?.redemptionVaultUstb) {
    return 'redemptionVaultUstb';
  } else if (addresses?.[mToken]?.redemptionVaultBuidl) {
    return 'redemptionVaultBuidl';
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
          'rv' | 'rvSwapper' | 'dv'
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
            value: 'rv',
            label: 'Redemption Vault',
            hint: 'Redemption Vault contract',
          },
          {
            value: 'rvSwapper',
            label: 'Redemption Vault With Swapper',
            hint: 'Redemption Vault With Swapper contract',
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
  } catch (_) {
    return new Error('Invalid value');
  }
};

const validateFloat = (value: string, maxDecimals = 2) => {
  try {
    parseUnits(value, maxDecimals);
    return undefined;
  } catch (_) {
    return new Error('Invalid float');
  }
};

const requirePercentageToBigNumberish = (value: string) => {
  return requireFloatToBigNumberish(value, 2);
};
