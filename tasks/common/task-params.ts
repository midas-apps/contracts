import { HardhatRuntimeEnvironment } from 'hardhat/types';

import { MTokenName, Network, PaymentTokenName } from '../../config';
import { isMTokenName, isPaymentTokenName } from '../../helpers/utils';

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

export type AggregatorType = 'numerator' | 'denominator';

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
