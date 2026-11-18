import { DeployImplementationResponse } from '@openzeppelin/hardhat-upgrades/dist/deploy-implementation';

// implementations already resolved in this run (lowercase)
const resolvedImplementations = new Set<string>();

/**
 * Address of the implementation returned by `upgrades.prepareUpgrade`
 * (`getTxResponse: true`) and whether it was deployed by that call or reused
 * from the manifest.
 *
 * `startBlock` is the block number read right before `prepareUpgrade`: the
 * deployment of a reused implementation is mined at or before it. The number
 * of confirmations can't tell them apart: on the fast chains (BSC, ~0.45s
 * blocks) a new deployment has dozens of them by the time the custom signer
 * and the receipt polling return.
 *
 * Implementation reused by several proxies in one run is new only for the
 * first of them, regardless of the block number the RPC reports.
 *
 * A custom signer can also replay the deployment of a previous run instead of
 * sending a new one (Fordefi: the idempotence id is derived from the tx
 * payload, so the same init code from the same vault returns the old tx).
 * Such implementation is reported as not new; `isFirstUse` lets the callers
 * still verify it once per run
 */
export const getImplAddressFromDeployment = async (
  deployment: DeployImplementationResponse,
  startBlock: number,
) => {
  if (typeof deployment === 'string') {
    throw new Error(
      'Deployment is a string (getTxResponse should set to true)',
    );
  }
  const tx = await deployment.wait(5);
  const address =
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    tx.contractAddress ?? tx.to ?? ((tx as any).creates as string);

  const key = address.toLowerCase();
  // first proxy of this run that resolves to the implementation
  const isFirstUse = !resolvedImplementations.has(key);
  const deployedNew = isFirstUse && tx.blockNumber > startBlock;

  resolvedImplementations.add(key);

  return { deployedNew, isFirstUse, address };
};
