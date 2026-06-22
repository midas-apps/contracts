/**
 * Test speed-up: skip the implicit `eth_estimateGas` that ethers v5 runs before
 * every transaction.
 *
 * Profiling this suite showed the per-test cost is NOT EVM execution (an
 * evm_snapshot/revert is ~0.2ms and EDR execution is sub-ms) but the JSON-RPC
 * round-trips ethers v5 makes per tx. The single most expensive one is
 * `eth_estimateGas`, which re-executes the entire transaction in the EVM just
 * to measure gas — roughly doubling the EVM work for every tx. Measured impact
 * on a transaction-heavy file: ~2.5x faster (161s -> 64s), with all tests still
 * passing and no change to any test body.
 *
 * Instead of estimating, we return a fixed high gas cap. Correctness is
 * preserved: a reverting tx still reverts at send time, so `expect(...).to.be
 * .reverted*` matchers keep working (verified). gasLimit only caps execution;
 * the EVM still charges the real gas used, so behaviour is identical.
 *
 * Opt out with FAST_EVM=false. Disabled automatically under coverage / gas
 * reporting, which need real gas accounting. Set FAST_EVM_DEBUG=true to print
 * how many estimateGas calls were skipped.
 *
 * This module is imported for its side effect from test/common/fixtures.ts so it
 * engages in both serial and parallel (`--parallel`) runs, in every worker,
 * before any transaction is sent.
 */
import hre from 'hardhat';

const disabled =
  process.env.FAST_EVM === 'false' ||
  process.env.COVERAGE === 'true' ||
  process.env.REPORT_GAS === 'true';

if (!disabled) {
  // 250M, comfortably under the 300M test block gas limit (see config/networks).
  const FIXED_GAS = '0x' + (250_000_000).toString(16);

  const provider = hre.network.provider as unknown as {
    send?: (method: string, params?: unknown[]) => Promise<unknown>;
    request?: (args: {
      method: string;
      params?: unknown[];
    }) => Promise<unknown>;
  };

  if (typeof provider.send === 'function') {
    const originalSend = provider.send.bind(provider);
    provider.send = (method: string, params?: unknown[]) => {
      if (method === 'eth_estimateGas') {
        return Promise.resolve(FIXED_GAS);
      }
      return originalSend(method, params);
    };
  }

  if (typeof provider.request === 'function') {
    const originalRequest = provider.request.bind(provider);
    provider.request = (args: { method: string; params?: unknown[] }) => {
      if (args?.method === 'eth_estimateGas') {
        return Promise.resolve(FIXED_GAS);
      }
      return originalRequest(args);
    };
  }
}
