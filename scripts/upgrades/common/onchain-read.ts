import { utils } from 'ethers';
import { HardhatRuntimeEnvironment } from 'hardhat/types';

import { getAllRoles } from '../../../helpers/roles';

const MULTICALL3_ADDRESS = '0xcA11bde05977b3631167028862bE2a173976CA11';

const multicallInterface = new utils.Interface([
  'function aggregate3((address target, bool allowFailure, bytes callData)[] calls) payable returns ((bool success, bytes returnData)[] returnData)',
]);

// calls per multicall request / parallel requests
const STATIC_CALLS_BATCH_SIZE = 250;
export const RPC_CONCURRENCY = 4;

/**
 * true only if the node reported that the call itself reverted. Any other
 * error (timeout, rate limit, disabled method, etc.) says nothing about the
 * contract. ethers reports every failed eth_call as CALL_EXCEPTION, so the
 * decision is made on the underlying node error when there is one
 */
const isRevertError = (e: unknown) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const err = e as any;
  const nodeErrors = [err?.error, err?.error?.error].filter(Boolean);

  return (nodeErrors.length ? nodeErrors : [err]).some(
    (nodeError) =>
      nodeError?.code === 3 ||
      /revert|invalid opcode/i.test(String(nodeError?.message ?? '')),
  );
};

// node error if there is one: ethers error of a failed eth_call is the calldata dump
const describeRpcError = (e: unknown) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const err = e as any;
  const nodeError = err?.error?.error ?? err?.error;
  return String(nodeError?.message ?? err?.message ?? e).slice(0, 300);
};

export const withRpcRetry = async <T>(fn: () => Promise<T>, attempts = 3) => {
  for (let attempt = 1; ; attempt++) {
    try {
      return await fn();
    } catch (e) {
      if (isRevertError(e) || attempt >= attempts) throw e;
      await new Promise((resolve) => setTimeout(resolve, 1000 * attempt));
    }
  }
};

export const mapLimit = async <T, R>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<R>,
): Promise<R[]> => {
  const results: R[] = new Array(items.length);
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, async () => {
      while (next < items.length) {
        const index = next++;
        results[index] = await fn(items[index]);
      }
    }),
  );
  return results;
};

export type StaticCall = { target: string; callData: string };

/**
 * eth_call of every call, batched through Multicall3 when it is deployed on
 * the network. Result is the return data, or `undefined` only if the call
 * reverted on-chain; RPC errors are retried and then thrown, so they can
 * never be mistaken for a revert
 */
export const batchStaticCalls = async (
  hre: HardhatRuntimeEnvironment,
  calls: StaticCall[],
  multicallAddress = MULTICALL3_ADDRESS,
): Promise<(string | undefined)[]> => {
  const provider = hre.ethers.provider;

  if (!calls.length) return [];

  const hasMulticall =
    (await withRpcRetry(() => provider.getCode(multicallAddress))) !== '0x';

  const callDirectly = async ({ target, callData }: StaticCall) => {
    try {
      return await withRpcRetry(() =>
        provider.call({ to: target, data: callData }),
      );
    } catch (e) {
      if (!isRevertError(e)) {
        throw new Error(
          `Failed to call ${callData.slice(
            0,
            10,
          )} on ${target}: ${describeRpcError(e)}`,
        );
      }
      return undefined;
    }
  };

  if (!hasMulticall) {
    console.log('Multicall3 is not deployed, calling contracts one by one');
    return mapLimit(calls, RPC_CONCURRENCY, callDirectly);
  }

  const callBatch = async (
    batch: StaticCall[],
  ): Promise<(string | undefined)[]> => {
    let returnData: { success: boolean; returnData: string }[];
    try {
      const res = await withRpcRetry(() =>
        provider.call({
          to: multicallAddress,
          data: multicallInterface.encodeFunctionData('aggregate3', [
            batch.map((call) => ({ ...call, allowFailure: true })),
          ]),
        }),
      );
      returnData = multicallInterface.decodeFunctionResult(
        'aggregate3',
        res,
      )[0];
    } catch (e) {
      if (!isRevertError(e)) {
        throw new Error(
          `Failed to call contracts via Multicall3: ${describeRpcError(e)}`,
        );
      }

      // the whole batch reverted, e.g. a contract burned all the gas on an
      // unknown selector: narrow it down and make that call directly
      if (batch.length === 1) return [await callDirectly(batch[0])];

      const half = Math.ceil(batch.length / 2);
      return [
        ...(await callBatch(batch.slice(0, half))),
        ...(await callBatch(batch.slice(half))),
      ];
    }

    if (returnData.length !== batch.length) {
      throw new Error('Multicall3 returned unexpected number of results');
    }

    return returnData.map(({ success, returnData: data }) =>
      success ? data : undefined,
    );
  };

  const batches: StaticCall[][] = [];
  for (let i = 0; i < calls.length; i += STATIC_CALLS_BATCH_SIZE) {
    batches.push(calls.slice(i, i + STATIC_CALLS_BATCH_SIZE));
  }

  return (await mapLimit(batches, RPC_CONCURRENCY, callBatch)).flat();
};

// role hash -> where it is defined in the roles registry
const getKnownRoles = () => {
  const known = new Map<string, string>();
  const walk = (value: unknown, path: string) => {
    if (typeof value === 'string') {
      if (!known.has(value)) known.set(value, path);
    } else if (value && typeof value === 'object') {
      for (const [key, nested] of Object.entries(value)) {
        walk(nested, path ? `${path}.${key}` : key);
      }
    }
  };
  walk(getAllRoles(), '');
  return known;
};

export type RoleCheck = {
  // e.g. `mTBILL.token minter role`
  label: string;
  address: string;
  // bytes32 getters without args, the first one that exists is used
  getters: string[];
  // role that the new implementation is going to use
  expected: string;
  // if false - the check is skipped when none of the getters exist
  required: boolean;
  // the getters must not exist (role that the contract must not have)
  absent?: boolean;
  // replaces the default error of a missing (or unexpected for `absent`) role
  hint?: string;
};

/**
 * Guard against an upgrade silently changing a role of a contract: compares
 * the roles that the deployed contracts report with the ones that the new
 * implementations are going to use. Returns the list of errors
 */
export const validateRolesOnChain = async (
  hre: HardhatRuntimeEnvironment,
  checks: RoleCheck[],
): Promise<string[]> => {
  const calls = checks.flatMap(({ address, getters }) =>
    getters.map((getter) => ({
      target: address,
      callData: utils.id(`${getter}()`).slice(0, 10),
    })),
  );

  const results = await batchStaticCalls(hre, calls);
  const errors: string[] = [];
  const knownRoles = getKnownRoles();
  const describeRole = (role: string) =>
    knownRoles.has(role) ? `${role} (${knownRoles.get(role)})` : role;
  let offset = 0;

  for (const {
    label,
    address,
    getters,
    expected,
    required,
    absent,
    hint,
  } of checks) {
    const current = results
      .slice(offset, offset + getters.length)
      // a role getter returns exactly one word
      .find((res) => res !== undefined && utils.hexDataLength(res) === 32);
    offset += getters.length;

    if (absent) {
      if (current !== undefined) {
        errors.push(`${label} (${address}): ${hint ?? 'role must not exist'}`);
      }
      continue;
    }

    if (current === undefined) {
      if (required) {
        errors.push(
          `${label} (${address}): ${
            hint ??
            `role can't be read on-chain (${getters
              .map((getter) => `${getter}()`)
              .join(
                ' / ',
              )}), so it can't be confirmed that the upgrade keeps it`
          }`,
        );
      }
      continue;
    }

    if (current.toLowerCase() !== expected?.toLowerCase()) {
      errors.push(
        `${label} (${address}): role is ${describeRole(
          current,
        )} on-chain, but the new implementation would use ${describeRole(
          expected,
        )}`,
      );
    }
  }

  return errors;
};
