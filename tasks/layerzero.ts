import {
  types as devtoolsTypes,
  OmniPointHardhat,
  createGetHreByEid,
} from '@layerzerolabs/devtools-evm-hardhat';
import {
  createLogger,
  DebugLogger,
  KnownErrors,
  KnownOutputs,
  KnownWarnings,
} from '@layerzerolabs/io-devtools';
import {
  endpointIdToChainType,
  endpointIdToNetwork,
  ChainType,
} from '@layerzerolabs/lz-definitions';
import { Options, addressToBytes32 } from '@layerzerolabs/lz-v2-utilities';
import { BigNumber, ContractTransaction } from 'ethers';
import { parseUnits } from 'ethers/lib/utils';
import { task, types } from 'hardhat/config';
import { HardhatRuntimeEnvironment } from 'hardhat/types';

import path from 'path';

const logger = createLogger();

export interface EvmArgs {
  srcEid: number;
  dstEid: number;
  amount: string;
  to: string;
  oappConfig: string;
  minAmount?: string;
  extraLzReceiveOptions?: string[];
  extraLzComposeOptions?: string[];
  extraNativeDropOptions?: string[];
  composeMsg?: string;
  oftAddress?: string;
}

export interface SendResult {
  txHash: string; // EVM: receipt.transactionHash
  scanLink: string; // LayerZeroScan link for cross-chain tracking
}

interface MasterArgs {
  srcEid: number;
  dstEid: number;
  amount: string;
  to: string;
  /** Path to LayerZero config file (default: layerzero.config.ts) */
  oappConfig: string;
  /** Minimum amount to receive in case of custom slippage or fees (human readable units, e.g. "1.5") */
  minAmount?: string;
  /** Array of lzReceive options as comma-separated values "gas,value" - e.g. --extra-lz-receive-options "200000,0" */
  extraLzReceiveOptions?: string[];
  /** Array of lzCompose options as comma-separated values "index,gas,value" - e.g. --extra-lz-compose-options "0,500000,0" */
  extraLzComposeOptions?: string[];
  /** Array of native drop options as comma-separated values "amount,recipient" - e.g. --extra-native-drop-options "1000000000000000000,0x1234..." */
  extraNativeDropOptions?: string[];
  /** Arbitrary bytes message to deliver alongside the OFT */
  composeMsg?: string;
  /** EVM: 20-byte hex address */
  oftAddress?: string;
}

export async function sendEvm(
  {
    srcEid,
    dstEid,
    amount,
    to,
    oappConfig,
    minAmount,
    extraLzReceiveOptions,
    extraLzComposeOptions,
    extraNativeDropOptions,
    composeMsg,
    oftAddress,
  }: EvmArgs,
  hre: HardhatRuntimeEnvironment,
): Promise<SendResult> {
  if (endpointIdToChainType(srcEid) !== ChainType.EVM) {
    throw new Error(`non-EVM srcEid (${srcEid}) not supported here`);
  }

  const getHreByEid = createGetHreByEid(hre);
  let srcEidHre: HardhatRuntimeEnvironment;
  try {
    srcEidHre = await getHreByEid(srcEid);
  } catch (error) {
    DebugLogger.printErrorAndFixSuggestion(
      KnownErrors.ERROR_GETTING_HRE,
      `For network: ${endpointIdToNetwork(srcEid)}, OFT: ${oftAddress}`,
    );
    throw error;
  }
  const { deployer } = await srcEidHre.getNamedAccounts();
  const signer = await srcEidHre.ethers.getSigner(deployer);

  // 1️⃣ resolve the OFT wrapper address
  let wrapperAddress: string;
  if (oftAddress) {
    wrapperAddress = oftAddress;
  } else {
    const layerZeroConfig = (await import(path.resolve('./', oappConfig)))
      .default;
    const { contracts } =
      typeof layerZeroConfig === 'function'
        ? await layerZeroConfig()
        : layerZeroConfig;
    const wrapper = contracts.find(
      (c: { contract: OmniPointHardhat }) => c.contract.eid === srcEid,
    );
    if (!wrapper) throw new Error(`No config for EID ${srcEid}`);
    wrapperAddress = wrapper.contract.contractName
      ? (await srcEidHre.deployments.get(wrapper.contract.contractName)).address
      : wrapper.contract.address || '';
  }

  // 2️⃣ load IOFT ABI, extend it with token()
  const ioftArtifact = await srcEidHre.artifacts.readArtifact('IOFT');

  // now attach
  const oft = await srcEidHre.ethers.getContractAt(
    ioftArtifact.abi,
    wrapperAddress,
    signer,
  );

  // 3️⃣ fetch the underlying ERC-20
  const underlying = await oft.token();

  // 4️⃣ fetch decimals from the underlying token
  const erc20 = await srcEidHre.ethers.getContractAt(
    'ERC20',
    underlying,
    signer,
  );
  const decimals: number = await erc20.decimals();

  // 5️⃣ normalize the user-supplied amount
  const amountUnits: BigNumber = parseUnits(amount, decimals);

  // 6️⃣ Check if approval is required (for OFT Adapters) and handle approval
  try {
    const approvalRequired = await oft.approvalRequired();
    if (approvalRequired) {
      logger.info('OFT Adapter detected - checking ERC20 allowance...');

      // Check current allowance
      const currentAllowance = await erc20.allowance(
        signer.address,
        wrapperAddress,
      );
      logger.info(`Current allowance: ${currentAllowance.toString()}`);
      logger.info(`Required amount: ${amountUnits.toString()}`);

      if (currentAllowance.lt(amountUnits)) {
        logger.info('Insufficient allowance - approving ERC20 tokens...');
        const approveTx = await erc20.approve(wrapperAddress, amountUnits);
        logger.info(`Approval transaction hash: ${approveTx.hash}`);
        await approveTx.wait();
        logger.info('ERC20 approval confirmed');
      } else {
        logger.info('Sufficient allowance already exists');
      }
    }
  } catch (error) {
    // If approvalRequired() doesn't exist or fails, assume it's a regular OFT (not an adapter)
    logger.info('No approval required (regular OFT detected)');
  }

  // 7️⃣ hex string → Uint8Array → zero-pad to 32 bytes
  const toBytes = addressToBytes32(to);

  // 8️⃣ Build options dynamically using Options.newOptions()
  let options = Options.newOptions();

  // Add lzReceive options
  if (extraLzReceiveOptions && extraLzReceiveOptions.length > 0) {
    // Handle case where Hardhat's CSV parsing splits "gas,value" into separate elements
    if (extraLzReceiveOptions.length % 2 !== 0) {
      throw new Error(
        `Invalid lzReceive options: received ${extraLzReceiveOptions.length} values, but expected pairs of gas,value`,
      );
    }

    for (let i = 0; i < extraLzReceiveOptions.length; i += 2) {
      const gas = Number(extraLzReceiveOptions[i]);
      const value = Number(extraLzReceiveOptions[i + 1]) || 0;
      options = options.addExecutorLzReceiveOption(gas, value);
      logger.info(`Added lzReceive option: ${gas} gas, ${value} value`);
    }
  }

  // Add lzCompose options
  if (extraLzComposeOptions && extraLzComposeOptions.length > 0) {
    // Handle case where Hardhat's CSV parsing splits "index,gas,value" into separate elements
    if (extraLzComposeOptions.length % 3 !== 0) {
      throw new Error(
        `Invalid lzCompose options: received ${extraLzComposeOptions.length} values, but expected triplets of index,gas,value`,
      );
    }

    for (let i = 0; i < extraLzComposeOptions.length; i += 3) {
      const index = Number(extraLzComposeOptions[i]);
      const gas = Number(extraLzComposeOptions[i + 1]);
      const value = Number(extraLzComposeOptions[i + 2]) || 0;
      options = options.addExecutorComposeOption(index, gas, value);
      logger.info(
        `Added lzCompose option: index ${index}, ${gas} gas, ${value} value`,
      );
    }
  }

  // Add native drop options
  if (extraNativeDropOptions && extraNativeDropOptions.length > 0) {
    // Handle case where Hardhat's CSV parsing splits "amount,recipient" into separate elements
    if (extraNativeDropOptions.length % 2 !== 0) {
      throw new Error(
        `Invalid native drop options: received ${extraNativeDropOptions.length} values, but expected pairs of amount,recipient`,
      );
    }

    for (let i = 0; i < extraNativeDropOptions.length; i += 2) {
      const amountStr = extraNativeDropOptions[i];
      const recipient = extraNativeDropOptions[i + 1];

      if (!amountStr || !recipient) {
        throw new Error(
          `Invalid native drop option: Both amount and recipient must be provided. Got amount="${amountStr}", recipient="${recipient}"`,
        );
      }

      try {
        options = options.addExecutorNativeDropOption(
          amountStr.trim(),
          recipient.trim(),
        );
        logger.info(
          `Added native drop option: ${amountStr.trim()} wei to ${recipient.trim()}`,
        );
      } catch (error) {
        // Provide helpful context if the amount exceeds protocol limits
        const maxUint128 = BigInt('340282366920938463463374607431768211455'); // 2^128 - 1
        const maxUint128Ether = Number(maxUint128) / 1e18; // Convert to ETH for readability

        throw new Error(
          `Failed to add native drop option with amount ${amountStr.trim()} wei. ` +
            `LayerZero protocol constrains native drop amounts to uint128 maximum ` +
            `(${maxUint128.toString()} wei ≈ ${maxUint128Ether.toFixed(
              2,
            )} ETH). ` +
            `Original error: ${
              error instanceof Error ? error.message : String(error)
            }`,
        );
      }
    }
  }

  const extraOptions = options.toHex();

  // 9️⃣ build sendParam and dispatch
  const sendParam = {
    dstEid,
    to: toBytes,
    amountLD: amountUnits.toString(),
    minAmountLD: minAmount
      ? parseUnits(minAmount, decimals).toString()
      : amountUnits.toString(),
    extraOptions,
    composeMsg: composeMsg ? composeMsg.toString() : '0x',
    oftCmd: '0x',
  };

  // 10️⃣ Quote (MessagingFee = { nativeFee, lzTokenFee })
  logger.info('Quoting the native gas cost for the send transaction...');
  let msgFee: { nativeFee: BigNumber; lzTokenFee: BigNumber };
  try {
    msgFee = await oft.quoteSend(sendParam, false);
  } catch (error) {
    DebugLogger.printErrorAndFixSuggestion(
      KnownErrors.ERROR_QUOTING_NATIVE_GAS_COST,
      `For network: ${endpointIdToNetwork(srcEid)}, OFT: ${oftAddress}`,
    );
    throw error;
  }
  logger.info('Sending the transaction...');
  let tx: ContractTransaction;
  try {
    tx = await oft.send(sendParam, msgFee, signer.address, {
      value: msgFee.nativeFee,
      gasLimit: 1_000_000,
    });
  } catch (error) {
    DebugLogger.printErrorAndFixSuggestion(
      KnownErrors.ERROR_SENDING_TRANSACTION,
      `For network: ${endpointIdToNetwork(srcEid)}, OFT: ${oftAddress}`,
    );
    throw error;
  }
  const receipt = await tx.wait();

  const txHash = receipt.transactionHash;
  const scanLink = getLayerZeroScanLink(
    txHash,
    srcEid >= 40_000 && srcEid < 50_000,
  );

  return { txHash, scanLink };
}

export const deploymentMetadataUrl =
  'https://metadata.layerzero-api.com/v1/metadata/deployments';

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

task('lz:oft:send', 'Sends OFT tokens cross‐chain from EVM chains')
  .addParam('srcEid', 'Source endpoint ID', undefined, types.int)
  .addParam('dstEid', 'Destination endpoint ID', undefined, types.int)
  .addParam(
    'amount',
    'Amount to send (human readable units, e.g. "1.5")',
    undefined,
    types.string,
  )
  .addParam(
    'to',
    'Recipient address (20-byte hex for EVM)',
    undefined,
    types.string,
  )
  .addOptionalParam(
    'oappConfig',
    'Path to LayerZero config file',
    'layerzero.config.ts',
    types.string,
  )
  .addOptionalParam(
    'minAmount',
    'Minimum amount to receive in case of custom slippage or fees (human readable units, e.g. "1.5")',
    undefined,
    types.string,
  )
  .addOptionalParam(
    'extraLzReceiveOptions',
    'Array of lzReceive options as comma-separated values "gas,value"',
    undefined,
    devtoolsTypes.csv,
  )
  .addOptionalParam(
    'extraLzComposeOptions',
    'Array of lzCompose options as comma-separated values "index,gas,value"',
    undefined,
    devtoolsTypes.csv,
  )
  .addOptionalParam(
    'extraNativeDropOptions',
    'Array of native drop options as comma-separated values "amount,recipient"',
    undefined,
    devtoolsTypes.csv,
  )
  .addOptionalParam(
    'composeMsg',
    'Arbitrary bytes message to deliver alongside the OFT',
    undefined,
    types.string,
  )
  .addOptionalParam(
    'oftAddress',
    'Override the source local deployment OFT address (20-byte hex for EVM)',
    undefined,
    types.string,
  )
  .setAction(async (args: MasterArgs, hre: HardhatRuntimeEnvironment) => {
    const chainType = endpointIdToChainType(args.srcEid);
    let result: SendResult;

    if (args.oftAddress) {
      DebugLogger.printWarning(
        KnownWarnings.USING_OVERRIDE_OFT,
        `For network: ${endpointIdToNetwork(args.srcEid)}, OFT: ${
          args.oftAddress
        }`,
      );
    }

    // Only support EVM chains in this example
    if (chainType === ChainType.EVM) {
      result = await sendEvm(args as EvmArgs, hre);
    } else {
      throw new Error(
        `The chain type ${chainType} is not supported in this OFT example. Only EVM chains are supported.`,
      );
    }

    DebugLogger.printLayerZeroOutput(
      KnownOutputs.SENT_VIA_OFT,
      `Successfully sent ${args.amount} tokens from ${endpointIdToNetwork(
        args.srcEid,
      )} to ${endpointIdToNetwork(args.dstEid)}`,
    );

    // print the explorer link for the srcEid from metadata
    const explorerLink = await getBlockExplorerLink(args.srcEid, result.txHash);
    // if explorer link is available, print the tx hash link
    if (explorerLink) {
      DebugLogger.printLayerZeroOutput(
        KnownOutputs.TX_HASH,
        `Explorer link for source chain ${endpointIdToNetwork(
          args.srcEid,
        )}: ${explorerLink}`,
      );
    }

    // print the LayerZero Scan link from metadata
    DebugLogger.printLayerZeroOutput(
      KnownOutputs.EXPLORER_LINK,
      `LayerZero Scan link for tracking all cross-chain transaction details: ${result.scanLink}`,
    );
  });
