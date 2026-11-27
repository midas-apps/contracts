import { BigNumber, constants, utils } from 'ethers';
import { HardhatRuntimeEnvironment } from 'hardhat/types';

import { logToFile } from './logger';
import {
  getLegacyRolesNamesForToken,
  getRolesNamesCommon,
  getRolesNamesForToken,
  getRolesNamesIntegration,
  prefixes,
} from './roles';

import { getRawCurrentAddresses } from '../config/constants/addresses';
import { MTokenName } from '../config/types';

/** Prefix of the log line with the JSON of a tx printed in calldata mode */
export const CALLDATA_LOG_PREFIX = '[calldata-json]';

/** A tx printed instead of being sent in calldata mode (`--calldata`) */
export type CalldataTx = {
  index: number;
  chainId: number;
  network: string;
  from: string;
  /** signer action (wallet) of `from`, or `safe` for Safe proposals */
  fromLabel: string;
  to: string;
  /** address book key of `to` */
  toLabel?: string;
  value: string;
  data: string;
  /** decoded `data` */
  call?: string;
  comment?: string;
  /** metadata the custom signer would get with the tx (Fordefi / Safe proposal) */
  signerMetadata: Record<string, unknown>;
};

/** Calldata mode state, shared by every hre of the run */
export type CalldataState = { txs: CalldataTx[] };

type Signer = Awaited<ReturnType<HardhatRuntimeEnvironment['getCustomSigner']>>;

type DescribeContext = {
  fragments: Map<string, utils.FunctionFragment>;
  addresses: Map<string, string>;
  roles: Map<string, string>;
};

let fragmentsPromise: Promise<Map<string, utils.FunctionFragment>>;

/** Selector => function of every compiled contract, project contracts first */
const loadFragments = async (hre: HardhatRuntimeEnvironment) => {
  const names = (await hre.artifacts.getAllFullyQualifiedNames()).sort(
    (a, b) =>
      Number(!a.startsWith('contracts/')) - Number(!b.startsWith('contracts/')),
  );

  const fragments = new Map<string, utils.FunctionFragment>();

  for (const name of names) {
    const { abi } = await hre.artifacts.readArtifact(name);

    for (const item of abi) {
      if (item.type !== 'function') continue;

      const fragment = utils.FunctionFragment.from(item);
      const selector = utils.Interface.getSighash(fragment);
      if (!fragments.has(selector)) fragments.set(selector, fragment);
    }
  }

  return fragments;
};

/** Address => address book key (`mTBILL.depositVaultV2`), shortest wins */
const loadAddressLabels = (hre: HardhatRuntimeEnvironment) => {
  const labels = new Map<string, string>();

  const walk = (value: unknown, path: string[]) => {
    if (typeof value === 'string') {
      if (!utils.isAddress(value) || value === constants.AddressZero) return;

      const key = value.toLowerCase();
      const label = path.join('.');
      const existing = labels.get(key);
      if (!existing || label.length < existing.length) labels.set(key, label);
      return;
    }

    if (value && typeof value === 'object') {
      Object.entries(value).forEach(([k, v]) => walk(v, [...path, k]));
    }
  };

  walk(getRawCurrentAddresses(hre), []);
  return labels;
};

/** Role hash => role name */
const loadRoleNames = () => {
  const names = new Set<string>();

  const walk = (value: unknown) => {
    if (typeof value === 'string') names.add(value);
    else if (value && typeof value === 'object')
      Object.values(value).forEach(walk);
  };

  walk(getRolesNamesCommon());
  walk(getRolesNamesIntegration());
  (Object.keys(prefixes) as MTokenName[]).forEach((token) => {
    walk(getRolesNamesForToken(token));
    walk(getLegacyRolesNamesForToken(token));
  });

  const roles = new Map([...names].map((name) => [utils.id(name), name]));
  roles.set(constants.HashZero, 'DEFAULT_ADMIN_ROLE');
  return roles;
};

const contexts = new WeakMap<HardhatRuntimeEnvironment, DescribeContext>();

const getDescribeContext = async (hre: HardhatRuntimeEnvironment) => {
  let context = contexts.get(hre);

  if (!context) {
    fragmentsPromise ??= loadFragments(hre);
    context = {
      fragments: await fragmentsPromise,
      addresses: loadAddressLabels(hre),
      roles: loadRoleNames(),
    };
    contexts.set(hre, context);
  }

  return context;
};

const labelAddress = (context: DescribeContext, address: string) => {
  const label = context.addresses.get(address.toLowerCase());
  return label ? `${address} (${label})` : address;
};

const formatValue = (
  context: DescribeContext,
  type: utils.ParamType,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  value: any,
): string => {
  if (type.baseType === 'array') {
    return `[${(value as unknown[])
      .map((v) => formatValue(context, type.arrayChildren, v))
      .join(', ')}]`;
  }

  if (type.baseType === 'tuple') {
    return `{${type.components
      .map(
        (component, i) =>
          `${component.name ? `${component.name}: ` : ''}${formatValue(
            context,
            component,
            value[i],
          )}`,
      )
      .join(', ')}}`;
  }

  if (type.type === 'address') return labelAddress(context, value);

  if (type.type === 'bytes32') {
    const role = context.roles.get(value);
    return role ? `${value} (${role})` : value;
  }

  if (type.type === 'bytes4') {
    const fragment = context.fragments.get(value);
    return fragment ? `${value} (${fragment.format()})` : value;
  }

  if (type.type === 'bytes') return describeData(context, value) ?? value;

  if (BigNumber.isBigNumber(value)) return value.toString();

  return String(value);
};

/** `fn(args)` of `data`, undefined if the selector is unknown */
const describeData = (
  context: DescribeContext,
  data: string,
): string | undefined => {
  const fragment = context.fragments.get(data.slice(0, 10));
  if (!fragment) return undefined;

  try {
    const args = utils.defaultAbiCoder.decode(
      fragment.inputs,
      utils.hexDataSlice(data, 4),
    );

    return `${fragment.name}(${fragment.inputs
      .map((input, i) => formatValue(context, input, args[i]))
      .join(', ')})`;
  } catch {
    return undefined;
  }
};

const printCalldataTx = async (
  hre: HardhatRuntimeEnvironment,
  tx: Omit<CalldataTx, 'index' | 'chainId' | 'network' | 'toLabel' | 'call'>,
) => {
  const state = hre.calldata!;
  const context = await getDescribeContext(hre);

  const calldataTx: CalldataTx = {
    index: state.txs.length + 1,
    chainId: hre.network.config.chainId!,
    network: hre.network.name,
    ...tx,
    toLabel: context.addresses.get(tx.to.toLowerCase()),
    call: describeData(context, tx.data),
  };
  state.txs.push(calldataTx);

  const { index, from, fromLabel, to, toLabel, value, data, call, comment } =
    calldataTx;

  console.log(
    [
      `\n[calldata] #${index} (${hre.network.name})${
        comment ? ` - ${comment}` : ''
      }`,
      `  from:  ${from} (${fromLabel})`,
      `  to:    ${toLabel ? `${to} (${toLabel})` : to}`,
      ...(value !== '0' ? [`  value: ${value}`] : []),
      `  call:  ${call ? `${toLabel ?? 'to'}.${call}` : 'unknown selector'}`,
      `  data:  ${data}`,
      `  meta:  ${JSON.stringify(calldataTx.signerMetadata)}`,
    ].join('\n'),
  );
  logToFile(hre, `${CALLDATA_LOG_PREFIX} ${JSON.stringify(calldataTx)}`);

  return calldataTx;
};

/**
 * Wraps the signer so txs are printed (from, to, data and their decoded
 * labels) instead of being sent. `from` is the wallet of the signer action,
 * or the Safe for Safe proposals. Contract deployments and txs sent directly
 * by the deployer signer are not supported
 */
export const withCalldataSigner = (
  hre: HardhatRuntimeEnvironment,
  signer: Signer,
): Signer => ({
  ...signer,
  type: 'calldataSigner',
  sendTransaction: async (transaction, txSignMetadata) => {
    const action = txSignMetadata?.action;
    const chainId = txSignMetadata?.chainId ?? hre.network.config.chainId;
    // the same fallback as the custom signer uses to pick the wallet
    const mToken = (txSignMetadata?.mToken ?? hre.mtoken) as
      | MTokenName
      | undefined;

    const from = await signer.getWalletAddress(action, mToken, chainId);

    return {
      type: 'calldataSigner',
      payload: await printCalldataTx(hre, {
        from,
        fromLabel: `${action ?? 'deployer'}${mToken ? ` ${mToken}` : ''}`,
        to: transaction.to,
        value: BigNumber.from(transaction.value ?? 0).toString(),
        data: transaction.data,
        comment: txSignMetadata?.comment,
        // the same as the custom signer gets in `signEVMTransaction`
        signerMetadata: {
          chain: { name: hre.network.name, id: hre.network.config.chainId },
          mToken: hre.mtoken,
          ...txSignMetadata,
        },
      }),
    };
  },
  proposeSafeTransaction: async (transaction, { safe, comment }) => ({
    type: 'calldataSigner',
    payload: await printCalldataTx(hre, {
      from: safe,
      fromLabel: 'safe',
      to: transaction.to,
      value: BigNumber.from(transaction.value ?? 0).toString(),
      data: transaction.data,
      comment,
      // the same as the custom signer gets in `proposeEVMSafeTransaction`
      signerMetadata: { safe, comment, chainId: hre.network.config.chainId },
    }),
  }),
  // read-only: exposes the wallet of the action, signing methods throw
  getWeb3Provider: async ({ action }) => {
    // chain specific actions (e.g. deployer) need the chain id
    const address = await signer.getWalletAddress(
      action,
      undefined,
      hre.network.config.chainId,
    );

    return {
      request: async ({ method }: { method: string }) => {
        if (method === 'eth_accounts' || method === 'eth_requestAccounts') {
          return [address];
        }

        throw new Error(
          `${method} is not supported in calldata mode: only txs sent via sendAndWaitForCustomTxSign are printed, contract deployments and direct deployer txs are not`,
        );
      },
    } as unknown as Awaited<ReturnType<Signer['getWeb3Provider']>>;
  },
  createAddressBookContract: async () => {
    throw new Error('Address book is not supported in calldata mode');
  },
});
