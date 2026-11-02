import { BigNumberish, BigNumber } from 'ethers';
import { HardhatRuntimeEnvironment } from 'hardhat/types';

import { ENV } from '../../../config';

export const proposeSafeTransaction = async (
  hre: HardhatRuntimeEnvironment,
  params: {
    safe: string;
    to: string;
    value?: BigNumberish;
    data: string;
    comment?: string;
    idempotenceId?: string;
  },
) => {
  const res = await fetch(`${ENV.BACKOFFICE_API_URL}/api/safe/proposals`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Authorization': `Bearer ${ENV.BACKOFFICE_API_TOKEN}`,
    },
    body: JSON.stringify({
      chainId: hre.network.config.chainId,
      safe: params.safe,
      to: params.to,
      value: BigNumber.from(params.value ?? 0).toString(),
      data: params.data,
      comment: params.comment ?? '',
      idempotenceId: params.idempotenceId,
    }),
    signal: AbortSignal.timeout(60_000),
  });

  const body = await res.text();

  if (!res.ok) {
    throw new Error(`Backoffice proposal failed: ${res.status} ${body}`);
  }

  const { proposalId, safeTxHash, nonce } = JSON.parse(body) as {
    proposalId?: string;
    safeTxHash?: string;
    nonce?: number;
  };

  if (!proposalId || !safeTxHash || nonce === undefined) {
    throw new Error(`Unexpected backoffice proposal response: ${body}`);
  }

  return { proposalId, safeTxHash, nonce };
};
