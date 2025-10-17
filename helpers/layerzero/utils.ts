import { JsonRpcProvider } from '@ethersproject/providers';
import {
  type OmniSignerFactory,
  type OmniTransaction,
} from '@layerzerolabs/devtools';
import { createLogger, Logger, printJson } from '@layerzerolabs/io-devtools';
import { EndpointId, endpointIdToNetwork } from '@layerzerolabs/lz-definitions';
import { Options } from '@layerzerolabs/lz-v2-utilities';
import { BigNumber } from 'ethers';
import { HardhatRuntimeEnvironment } from 'hardhat/types';

import { layerZeroEidToNetwork, Network, rpcUrls } from '../../config';
import { sendAndWaitForCustomTxSign } from '../../scripts/deploy/common/utils';
export interface SignAndSendTaskArgs {
  ci?: boolean;
  logger?: Logger;
  transactions: OmniTransaction[];
  createSigner: OmniSignerFactory;
}

export const createSigner =
  (
    hre: HardhatRuntimeEnvironment,
    externalLogger?: Logger,
  ): OmniSignerFactory =>
  (eid: EndpointId) => {
    const logger = externalLogger ?? createLogger();

    return {
      sign: async () => {
        throw new Error('Not implemented');
      },
      signAndSend: async (transaction) => {
        const res = await sendAndWaitForCustomTxSign(
          hre,
          {
            data: transaction.data,
            to: transaction.point.address,
            value: transaction.value
              ? BigNumber.from(transaction.value)
              : undefined,
          },
          {
            action: 'update-lz-oapp-config',
            network: layerZeroEidToNetwork[transaction.point.eid],
          },
        );

        const result = {
          wait: async (confirmations?: number) => {
            if (typeof res === 'string') {
              logger.debug('confirming with default provider');
              const provider = new JsonRpcProvider(
                rpcUrls[
                  layerZeroEidToNetwork[transaction.point.eid] as Network
                ],
              );

              await provider.waitForTransaction(res, confirmations);
            } else {
              logger.warn('wait is unavailable for custom signer');
            }
            return {
              transactionHash: res as string,
            };
          },
          transactionHash: res as string,
        };

        logger.info('Transaction sent successfully', printJson(result));
        return result;
      },
      eid,
      getPoint: () => {
        throw new Error('Not implemented');
      },
    };
  };

export const deploymentMetadataUrl =
  'https://metadata.layerzero-api.com/v1/metadata/deployments';

export interface SendResult {
  txHash: string; // EVM: receipt.transactionHash
  scanLink: string; // LayerZeroScan link for cross-chain tracking
}

/**
 * Given a srcEid and on-chain tx hash, return
 * `https://…blockExplorers[0].url/tx/<txHash>`, or undefined.
 */
export async function getBlockExplorerLink(
  srcEid: number,
  txHash: string,
): Promise<string | undefined> {
  const network = endpointIdToNetwork(srcEid); // e.g. "ethereum-mainnet"
  const res = await fetch(deploymentMetadataUrl);
  if (!res.ok) return;
  const all = (await res.json()) as Record<
    string,
    { blockExplorers?: { url: string }[] }
  >;
  const meta = all[network];
  const explorer = meta?.blockExplorers?.[0]?.url;
  if (explorer) {
    // many explorers use `/tx/<hash>`
    return `${explorer.replace(/\/+$/, '')}/tx/${txHash}`;
  }
}

function formatBigIntForDisplay(n: bigint) {
  return n.toLocaleString().replace(/,/g, '_');
}

export function decodeLzReceiveOptions(hex: string): string {
  try {
    // Handle empty/undefined values first
    if (!hex || hex === '0x') return 'No options set';
    const options = Options.fromOptions(hex);
    const lzReceiveOpt = options.decodeExecutorLzReceiveOption();
    return lzReceiveOpt
      ? `gas: ${formatBigIntForDisplay(
          lzReceiveOpt.gas,
        )} , value: ${formatBigIntForDisplay(lzReceiveOpt.value)} wei`
      : 'No executor options';
  } catch (e) {
    return `Invalid options (${hex.slice(0, 12)}...)`;
  }
}

// Get LayerZero scan link
export function getLayerZeroScanLink(
  txHash: string,
  isTestnet = false,
): string {
  const baseUrl = isTestnet
    ? 'https://testnet.layerzeroscan.com'
    : 'https://layerzeroscan.com';
  return `${baseUrl}/tx/${txHash}`;
}

export {
  DebugLogger,
  KnownErrors,
  KnownOutputs,
  KnownWarnings,
} from '@layerzerolabs/io-devtools';
