import { BigNumberish, BigNumber, utils } from 'ethers';
import { HardhatRuntimeEnvironment } from 'hardhat/types';

import { ENV } from '../../../config';

export const proposeSafeTransaction = async (
  hre: HardhatRuntimeEnvironment,
  params: {
    safe: string;
    to: string;
    value?: BigNumberish;
    data?: string;
    comment?: string;
    idempotenceId?: string;
  },
) => {
  const { chainId } = hre.network.config;
  const value = BigNumber.from(params.value ?? 0);
  const data = params.data ?? '0x';
  const comment = params.comment ?? '';
  // contextId alone is shared by the run; backoffice caps the id at 64 chars
  const idempotenceId =
    params.idempotenceId ??
    `${hre.contextId}:${utils
      .id([params.safe, params.to, value, data].join(':').toLowerCase())
      .slice(2, 18)}`;

  const res = await fetch(`${ENV.BACKOFFICE_API_URL}/api/safe/proposals`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Authorization': `Bearer ${ENV.BACKOFFICE_SERVICE_TOKEN}`,
    },
    body: JSON.stringify({
      ...params,
      chainId,
      value: value.toString(),
      data,
      comment,
      idempotenceId,
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
    nonce?: string;
  };

  if (!proposalId || !safeTxHash || !nonce) {
    throw new Error(`Unexpected backoffice proposal response: ${body}`);
  }

  return { proposalId, safeTxHash, nonce };
};
