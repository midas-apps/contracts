import { createGetHreByEid } from '@layerzerolabs/devtools-evm-hardhat';
import { createLogger } from '@layerzerolabs/io-devtools';
import {
  ChainType,
  endpointIdToChainType,
  endpointIdToNetwork,
} from '@layerzerolabs/lz-definitions';
import { Options, addressToBytes32 } from '@layerzerolabs/lz-v2-utilities';
import { parseUnits } from 'ethers/lib/utils';
import { HardhatRuntimeEnvironment } from 'hardhat/types';

import { EvmArgs, sendEvm } from './sendEvm';
import {
  DebugLogger,
  KnownOutputs,
  SendResult,
  getBlockExplorerLink,
} from './utils';

import { MTokenName, PaymentTokenName } from '../../config';
import { getCurrentAddresses } from '../../config/constants/addresses';
import { getDeployer } from '../../scripts/deploy/common/utils';

const logger = createLogger();

export interface OVaultComposerArgs {
  srcEid: number; // the source chain we're sending asset or share from
  dstEid: number; // the destination chain we're receiving asset or share on
  hubEid: number; // the hub chain we're receiving asset or share on
  amount: string; // amount to send
  to?: string; // receiver wallet address
  tokenType: 'asset' | 'share'; // Whether we're sending asset or share
  minAmount?: string;
  lzReceiveGas?: number;
  lzReceiveValue?: string;
  lzComposeGas?: number;
  lzComposeValue?: string;
  mToken: MTokenName;
  pToken: PaymentTokenName;
}

export async function sendOVaultComposer(
  args: OVaultComposerArgs,
  hre: HardhatRuntimeEnvironment,
) {
  // Validate tokenType
  if (args.tokenType !== 'asset' && args.tokenType !== 'share') {
    throw new Error(
      `Invalid tokenType "${args.tokenType}". Must be "asset" or "share"`,
    );
  }

  const currentNetworkSigner = await getDeployer(hre);

  const to = args.to ?? currentNetworkSigner.address;

  const currentNetworkAddresses = getCurrentAddresses(hre);
  const oftAddress =
    args.tokenType === 'asset'
      ? currentNetworkAddresses?.paymentTokens?.[args.pToken]?.layerZero?.oft
      : currentNetworkAddresses?.[args.mToken]?.layerZero?.mintBurnAdapter;

  if (!oftAddress) {
    throw new Error('OFT address not found');
  }

  // Auto-detect hub chain from deployment config
  const hubEid = args.hubEid;
  const hubNetwork = Object.entries(hre.config.networks).find(
    ([networkName, networkConfig]) => {
      return networkConfig.eid === hubEid;
    },
  );

  if (!hubNetwork) {
    throw new Error(
      `Could not find hub chain network with eid ${hubEid} in deploy config. Make sure the vault chain is configured.`,
    );
  }

  const [hubNetworkName, hubNetworkConfig] = hubNetwork;

  logger.info(`Hub: ${endpointIdToNetwork(hubEid)} (${hubNetworkName})`);

  // Validate chain types
  if (endpointIdToChainType(args.srcEid) !== ChainType.EVM) {
    throw new Error(`Source EID ${args.srcEid} is not an EVM chain`);
  }
  if (endpointIdToChainType(hubEid) !== ChainType.EVM) {
    throw new Error(`HUB EID ${hubEid} is not an EVM chain`);
  }
  if (endpointIdToChainType(args.dstEid) !== ChainType.EVM) {
    throw new Error(`Destination EID ${args.dstEid} is not an EVM chain`);
  }

  const getHreByEid = createGetHreByEid(hre);
  const hubHre = await getHreByEid(hubEid);
  const hubAddresses = getCurrentAddresses(hubHre);
  const hubTokenAddresses = hubAddresses?.[args.mToken];
  const hubPTokenAddresses = hubAddresses?.paymentTokens?.[args.pToken];

  if (!hubTokenAddresses) {
    throw new Error('Hub token addresses not found');
  }

  if (!hubPTokenAddresses) {
    throw new Error('Hub payment token addresses not found');
  }

  // Check if all chains are the same (hub) - if so, just do direct vault interaction
  if (args.srcEid === hubEid && args.dstEid === hubEid) {
    throw new Error('Hub -> Hub is not supported');
  }

  // Check if we're already on the hub chain - if so, just do a normal OFT send
  if (args.srcEid === hubEid) {
    throw new Error('Hub -> Dst is not supported');
  }

  // Get OVaultComposer address from deployments on HUB
  const composerAddress =
    hubTokenAddresses?.layerZero?.composers?.[args.pToken];

  if (!composerAddress) {
    throw new Error('Hub composer address not found');
  }

  // Set gas limits based on whether destination is hub chain
  // If destination is hub, only local transfer is needed (no cross-chain messaging)
  const lzComposeGas = 150_000;

  if (!args.lzComposeGas) {
    logger.info(
      `Using ${
        args.dstEid === hubEid ? 'local transfer' : 'cross-chain'
      } gas limit: ${lzComposeGas}`,
    );
  }

  const operationType = args.tokenType === 'asset' ? 'Deposit' : 'Redeem';
  const outputType = args.tokenType === 'asset' ? 'shares' : 'assets';
  const routeDescription =
    args.dstEid === hubEid
      ? `${endpointIdToNetwork(args.srcEid)} → ${endpointIdToNetwork(hubEid)}`
      : `${endpointIdToNetwork(args.srcEid)} → ${endpointIdToNetwork(
          hubEid,
        )} → ${endpointIdToNetwork(args.dstEid)}`;
  logger.info(
    `${operationType}: ${routeDescription} (${args.tokenType} → ${outputType})`,
  );

  // Convert input amount to proper units and preview vault operation
  let minAmountOut: string;

  // Calculate min amount with slippage protection
  if (args.minAmount) {
    minAmountOut = parseUnits(args.minAmount, 18).toString();
  } else {
    minAmountOut = '0';
  }

  // Create the SendParam for second hop (hub → destination) - used for both quoting and composeMsg
  const secondHopSendParam = {
    dstEid: args.dstEid,
    to: addressToBytes32(to),
    amountLD: '1', // this ammount will be overrided in the composer call
    minAmountLD: minAmountOut,
    extraOptions: Options.newOptions().toHex(),
    composeMsg: '0x',
    oftCmd: '0x',
  };

  // Quote the second hop (hub → destination) using hub chain RPC to get accurate compose value
  // Only needed if the final destination is not the hub itself
  let lzComposeValue = args.lzComposeValue || '0';

  if (!args.lzComposeValue && args.dstEid !== hubEid) {
    // Determine which OFT to quote (opposite of what we're sending)
    const outputOFTAddress =
      args.tokenType === 'asset'
        ? hubTokenAddresses?.layerZero?.mintBurnAdapter // Asset input → Share output
        : hubPTokenAddresses?.layerZero?.oft; // Share input → Asset output

    if (!outputOFTAddress) {
      throw new Error(
        `No output OFT config found for hub EID ${hubEid} in ${outputOFTAddress}`,
      );
    }

    // IMPORTANT: Use hub chain RPC/signer for quoting the second hop
    const hubSigner = await getDeployer(hubHre);
    const ioftArtifact = await hubHre.artifacts.readArtifact('IOFT');
    const outputOFT = await hubHre.ethers.getContractAt(
      ioftArtifact.abi,
      outputOFTAddress,
      hubSigner,
    );

    try {
      // Quote using hub chain RPC with the expected output amount
      const quoteFee = await outputOFT.quoteSend(
        // if the destination is the hub, we need to quote the send param for the source chain
        secondHopSendParam.dstEid === hubEid
          ? { ...secondHopSendParam, dstEid: args.srcEid }
          : secondHopSendParam,
        false,
      );
      lzComposeValue = quoteFee.nativeFee.toString();
      logger.info(
        `Hub chain quoted hop fee: ${lzComposeValue} wei (${(
          parseInt(lzComposeValue) / 1e18
        ).toFixed(6)} ETH)`,
      );
    } catch (error) {
      logger.warn(`Quote failed, using default: 0.0025 ETH`, error);
      lzComposeValue = '2500000000000000'; // 0.0025 ETH default
    }
  }

  // If destination is the hub, no cross-chain message is needed, so no compose value
  if (args.dstEid === hubEid) {
    lzComposeValue = '0';
    logger.info(`Destination is hub chain - no cross-chain compose needed`);
  }

  // Create the final composeMsg with SendParam and minMsgValue
  // This must match exactly: struct SendParam { uint32 dstEid; bytes32 to; uint256 amountLD; uint256 minAmountLD; bytes extraOptions; bytes composeMsg; bytes oftCmd; }
  const composeMsg = hubHre.ethers.utils.defaultAbiCoder.encode(
    ['tuple(uint32,bytes32,uint256,uint256,bytes,bytes,bytes)', 'uint256'],
    [
      [
        secondHopSendParam.dstEid,
        secondHopSendParam.to,
        secondHopSendParam.amountLD,
        secondHopSendParam.minAmountLD,
        secondHopSendParam.extraOptions,
        secondHopSendParam.composeMsg,
        secondHopSendParam.oftCmd,
      ],
      lzComposeValue,
    ],
  );

  // Create lzCompose options with proper gas limits and quoted value
  const extraLzComposeOptions = ['0', lzComposeGas.toString(), lzComposeValue];

  console.log('extraLzComposeOptions', extraLzComposeOptions);
  // Create lzReceive options if provided
  const extraLzReceiveOptions = args.lzReceiveGas
    ? [args.lzReceiveGas.toString(), args.lzReceiveValue || '0']
    : undefined;

  // Call the existing sendEvm function with proper parameters
  const evmArgs: EvmArgs = {
    srcEid: args.srcEid,
    dstEid: hubEid, // Send to HUB first
    amount: args.amount,
    to: composerAddress, // Send to composer
    minAmount: args.minAmount,
    extraLzReceiveOptions, // Optional lzReceive options
    extraLzComposeOptions,
    extraNativeDropOptions: undefined,
    composeMsg,
    oftAddress,
  };

  console.log('evmArgs', evmArgs);
  const result: SendResult = await sendEvm(evmArgs, hre);

  const operationText =
    args.tokenType === 'asset'
      ? 'deposit (asset → shares)'
      : 'redeem (shares → assets)';
  const routeText =
    args.dstEid === hubEid
      ? `${endpointIdToNetwork(args.srcEid)} → ${endpointIdToNetwork(hubEid)}`
      : `${endpointIdToNetwork(args.srcEid)} → ${endpointIdToNetwork(
          hubEid,
        )} → ${endpointIdToNetwork(args.dstEid)}`;

  DebugLogger.printLayerZeroOutput(
    KnownOutputs.SENT_VIA_OFT,
    `Successfully sent ${args.amount} ${args.tokenType} for ${operationText}: ${routeText}`,
  );

  // Print the explorer link for the srcEid
  const explorerLink = await getBlockExplorerLink(args.srcEid, result.txHash);
  if (explorerLink) {
    DebugLogger.printLayerZeroOutput(
      KnownOutputs.TX_HASH,
      `Explorer link for source chain ${endpointIdToNetwork(
        args.srcEid,
      )}: ${explorerLink}`,
    );
  }

  // Print the LayerZero Scan link
  DebugLogger.printLayerZeroOutput(
    KnownOutputs.EXPLORER_LINK,
    `LayerZero Scan link for tracking all cross-chain transaction details: ${result.scanLink}`,
  );
}
