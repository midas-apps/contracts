import { HardhatRuntimeEnvironment } from 'hardhat/types';

import { MTokenName, Network, PaymentTokenName } from '../../config';
import {
  VaultVersion,
  isVaultVersion,
  vaultVersions,
} from '../../config/constants/vaults';
import { isMTokenName, isPaymentTokenName } from '../../helpers/utils';
import type {
  AggregatorType,
  FeedTarget,
} from '../../scripts/deploy/common/data-feed';

export type ParamFnBase<TReturn = unknown> = () => {
  isOptional: boolean;
  name: string;
  description: string;
  /** Hardhat CLI default (always a string when set). */
  defaultValue: string | undefined;
  parse: (
    hre: HardhatRuntimeEnvironment,
    taskArgs: Record<string, unknown>,
  ) => TReturn;
  /**
   * When false, the param is not registered as a CLI flag
   * (used for values fixed per task). Default: true
   */
  cli?: boolean;
  /** Called by runScript before the script is loaded */
  hydrate?: (
    hre: HardhatRuntimeEnvironment,
    taskArgs: Record<string, unknown>,
  ) => void;
};

type ValueOrUndefined<T> = T | undefined;
export type ParseParamFn<TReturn = unknown> = (
  optional?: boolean,
) => ParamFnBase<ValueOrUndefined<TReturn>>;

export const mTokenParam: ParseParamFn<MTokenName> = (optional) => () => {
  const isOptional = optional ?? false;
  return {
    isOptional,
    name: 'mtoken',
    description: 'MToken',
    defaultValue: undefined,
    parse: (hre, _) => {
      const mToken = hre.mtoken;
      if (!mToken && !isOptional) {
        throw new Error('mToken parameter not found');
      }

      if (mToken && !isMTokenName(mToken)) {
        throw new Error('Invalid mToken parameter');
      }

      return mToken;
    },
  };
};

export const pTokenParam: ParseParamFn<PaymentTokenName> = (optional) => () => {
  const isOptional = optional ?? false;
  return {
    isOptional,
    name: 'ptoken',
    description: 'Payment Token',
    defaultValue: undefined,
    parse: (hre, _) => {
      const paymentToken = hre.paymentToken;
      if (!paymentToken && !isOptional) {
        throw new Error('PaymentToken parameter not found');
      }

      if (paymentToken && !isPaymentTokenName(paymentToken)) {
        throw new Error('Invalid PaymentToken parameter');
      }

      return paymentToken;
    },
  };
};

export const actionParam: ParseParamFn<string> = (optional) => () => {
  const isOptional = optional ?? false;
  return {
    isOptional,
    name: 'action',
    description: 'Timelock / upgrade action id',
    defaultValue: undefined,
    parse: (hre, _) => {
      const action = hre.action;
      if (!action && !isOptional) {
        throw new Error('Action parameter not found');
      }
      return action;
    },
  };
};

export const upgradeIdParam: ParseParamFn<string> = (optional) => () => {
  const isOptional = optional ?? false;
  return {
    isOptional,
    name: 'upgrade',
    description: 'Upgrade id (key of upgradeConfigs.upgrades)',
    defaultValue: undefined,
    parse: (hre, _) => {
      const upgradeId = hre.upgradeId;
      if (!upgradeId && !isOptional) {
        throw new Error('Upgrade parameter not found');
      }
      return upgradeId;
    },
  };
};

export const aggregatorTypeParam: ParseParamFn<AggregatorType> =
  (optional) => () => {
    const isOptional = optional ?? false;
    return {
      isOptional,
      name: 'aggregatorType',
      description: 'Aggregator type (numerator | denominator)',
      defaultValue: undefined,
      parse: (_, taskArgs) => {
        const aggregatorType = taskArgs.aggregatorType as
          | AggregatorType
          | undefined;
        if (!aggregatorType && !isOptional) {
          throw new Error('aggregatorType parameter not found');
        }
        if (
          aggregatorType &&
          !['numerator', 'denominator'].includes(aggregatorType)
        ) {
          throw new Error('Invalid aggregator type parameter');
        }
        return aggregatorType;
      },
    };
  };

export const feedTargetParam: ParseParamFn<FeedTarget> = (optional) => () => ({
  isOptional: optional ?? false,
  name: 'feed',
  description: 'Product feed target (general | dv | rv)',
  defaultValue: undefined,
  parse: (_, taskArgs) => {
    const target = taskArgs.feed as FeedTarget | undefined;
    if (target !== undefined && !['general', 'dv', 'rv'].includes(target)) {
      throw new Error('Invalid product feed target');
    }
    return target;
  },
});

export const originalNetworkParam: ParseParamFn<Network> = (optional) => () => {
  const isOptional = optional ?? false;
  return {
    isOptional,
    name: 'originalNetwork',
    description: 'Original / hub network for LayerZero',
    defaultValue: undefined,
    parse: (hre, _) => {
      const originalNetwork = hre.layerZero?.originalNetwork;
      if (!originalNetwork && !isOptional) {
        throw new Error('OriginalNetwork parameter not found');
      }
      return originalNetwork;
    },
  };
};

export const keysParam: ParseParamFn<string[]> = (optional) => () => {
  const isOptional = optional ?? false;
  return {
    isOptional,
    name: 'keys',
    description:
      'Comma-separated list of address book keys to include (e.g. layerZero)',
    defaultValue: undefined,
    parse: (_, taskArgs) => {
      const keys = taskArgs.keys as string | undefined;
      if (!keys && !isOptional) {
        throw new Error('keys parameter not found');
      }
      if (!keys) {
        return undefined;
      }
      return keys
        .split(',')
        .map((k) => k.trim())
        .filter(Boolean);
    },
  };
};

export const skipValidationParam: ParseParamFn<boolean> = (optional) => () => {
  const isOptional = optional ?? false;
  return {
    isOptional,
    name: 'skipValidation',
    description: 'Skip timelock validation',
    defaultValue: 'false',
    parse: (hre, _) => {
      // Hydrated on hre by runScript for shared timelock helpers
      const skipValidation = hre.skipValidation ?? false;
      if (skipValidation === undefined && !isOptional) {
        throw new Error('skipValidation parameter not found');
      }
      return skipValidation;
    },
  };
};

export const deploymentConfigParam: ParseParamFn<string> =
  (optional) => () => ({
    isOptional: optional ?? true,
    name: 'deploymentConfig',
    description: 'Named deployment config profile (for example: mfone-unloop)',
    defaultValue: undefined,
    // validated and hydrated on hre by runScript
    parse: (hre, _) => hre.deploymentConfig,
  });

export const forkingNetworkParam: ParseParamFn<Network> = (optional) => () => {
  const isOptional = optional ?? true;
  return {
    isOptional,
    name: 'forkingNetwork',
    description: 'Forking Network',
    defaultValue: undefined,
    parse: (_, taskArgs) => {
      return taskArgs.forkingNetwork as Network | undefined;
    },
  };
};

const hydrateVaultVersion = (
  hre: HardhatRuntimeEnvironment,
  value: unknown,
  isOptional: boolean,
) => {
  if (value === undefined) {
    if (!isOptional) throw new Error('vaultVersion parameter not found');
    return;
  }

  if (!isVaultVersion(value)) {
    throw new Error(
      `Invalid vaultVersion "${value}". Expected one of: ${vaultVersions.join(
        ', ',
      )}`,
    );
  }

  hre.vaultVersion = value;
};

/**
 * `--vault-version v1|v2`: selects which vaults the script works with.
 * Used by scripts that support both v1 and v2 vaults
 */
export const vaultVersionParam: ParseParamFn<VaultVersion> =
  (optional) => () => {
    const isOptional = optional ?? false;
    return {
      isOptional,
      name: 'vaultVersion',
      description: `Vault version (${vaultVersions.join(' | ')})`,
      defaultValue: undefined,
      hydrate: (hre, taskArgs) =>
        hydrateVaultVersion(hre, taskArgs.vaultVersion, isOptional),
      parse: (hre, _) => hre.vaultVersion,
    };
  };

/**
 * Fixes the vault version for scripts that only support v2 vaults
 * (not exposed as a CLI flag)
 */
export const v2VaultsOnlyParam: ParseParamFn<VaultVersion> = () => () => ({
  isOptional: true,
  cli: false,
  name: 'vaultVersion',
  description: 'Vault version (fixed to v2)',
  defaultValue: undefined,
  hydrate: (hre) => {
    hre.vaultVersion = 'v2';
  },
  parse: (hre, _) => hre.vaultVersion,
});
