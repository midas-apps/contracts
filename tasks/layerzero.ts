import { createSignAndSendFlow } from '@layerzerolabs/devtools';
import { types as devtoolsTypes } from '@layerzerolabs/devtools-evm-hardhat';
import {
  DebugLogger,
  KnownOutputs,
  KnownWarnings,
} from '@layerzerolabs/io-devtools';
import {
  endpointIdToChainType,
  endpointIdToNetwork,
  ChainType,
} from '@layerzerolabs/lz-definitions';
import { subtask, task, types } from 'hardhat/config';

import { layerZeroEids, MTokenName, Network } from '../config';
import { getCurrentAddresses } from '../config/constants/addresses';
import {
  getBlockExplorerLink,
  sendEvm,
  EvmArgs,
  SendResult,
  SignAndSendTaskArgs,
  createSigner,
} from '../helpers/layerzero';
import { isMTokenName, isPaymentTokenName } from '../helpers/utils';

task('lz:oft:send:midas', 'Sends OFT tokens cross‐chain from EVM chains')
  .addParam('mtoken', 'MToken')
  .addParam('amount', 'Amount', undefined, types.string)
  .addParam('receiverNetwork', 'Receiver Network')
  .addOptionalParam('receiver', 'Receiver address')
  .setAction(async (taskArgs, hre) => {
    const { deployer } = await hre.getNamedAccounts();
    const deployerSigner = await hre.ethers.getSigner(deployer);
    const mtoken = taskArgs.mtoken;
    const amount = taskArgs.amount;
    const receiverNetwork = taskArgs.receiverNetwork;
    const receiver = taskArgs.receiver ?? deployerSigner.address;

    if (mtoken) {
      if (!isMTokenName(mtoken)) {
        throw new Error('Invalid mtoken parameter');
      }
    }

    const srcEid = layerZeroEids[hre.network.name as Network];
    const dstEid = layerZeroEids[receiverNetwork as Network];

    if (!srcEid || !dstEid) {
      throw new Error('EIDs not found for networks');
    }

    const addresses = getCurrentAddresses(hre);

    const oftAdapter = addresses?.[mtoken as MTokenName]?.layerZero?.oft;

    if (!oftAdapter) {
      throw new Error('OFT adapter not found');
    }

    const chainType = endpointIdToChainType(srcEid);
    let result: SendResult;

    if (oftAdapter) {
      DebugLogger.printWarning(
        KnownWarnings.USING_OVERRIDE_OFT,
        `For network: ${endpointIdToNetwork(srcEid)}, OFT: ${oftAdapter}`,
      );
    }

    // Only support EVM chains in this example
    if (chainType === ChainType.EVM) {
      result = await sendEvm(
        {
          srcEid,
          dstEid,
          to: receiver,
          amount,
          oftAddress: oftAdapter,
        } as EvmArgs,
        hre,
      );
    } else {
      throw new Error(
        `The chain type ${chainType} is not supported in this OFT example. Only EVM chains are supported.`,
      );
    }

    DebugLogger.printLayerZeroOutput(
      KnownOutputs.SENT_VIA_OFT,
      `Successfully sent ${amount} tokens from ${endpointIdToNetwork(
        srcEid,
      )} to ${endpointIdToNetwork(dstEid)}`,
    );

    // print the explorer link for the srcEid from metadata
    const explorerLink = await getBlockExplorerLink(srcEid, result.txHash);
    // if explorer link is available, print the tx hash link
    if (explorerLink) {
      DebugLogger.printLayerZeroOutput(
        KnownOutputs.TX_HASH,
        `Explorer link for source chain ${endpointIdToNetwork(
          srcEid,
        )}: ${explorerLink}`,
      );
    }

    // print the LayerZero Scan link from metadata
    DebugLogger.printLayerZeroOutput(
      KnownOutputs.EXPLORER_LINK,
      `LayerZero Scan link for tracking all cross-chain transaction details: ${result.scanLink}`,
    );
  });

task('lz:oapp:wire:midas', 'Runs a user-defined script')
  .addOptionalParam(
    'oappConfig',
    'Path to your LayerZero OApp config',
    undefined,
    types.string,
  )
  .addOptionalParam('mtoken', 'MToken')
  .addOptionalParam('ptoken', 'Payment Token')
  .addOptionalParam('originalNetwork', 'Original Network')
  .setAction(async (taskArgs, hre) => {
    const mtoken = taskArgs.mtoken;
    const ptoken = taskArgs.ptoken;
    const originalNetwork = taskArgs.originalNetwork;

    if (mtoken) {
      if (!isMTokenName(mtoken)) {
        throw new Error('Invalid mtoken parameter');
      }

      hre.mtoken = mtoken;
    }

    if (ptoken) {
      if (!isPaymentTokenName(ptoken)) {
        throw new Error('Invalid ptoken parameter');
      }
      hre.paymentToken = ptoken;
    }

    if (originalNetwork) {
      hre.layerZero = {
        originalNetwork,
      };
    }

    await hre.run('lz:oapp:wire', {
      oappConfig: './layerzero.config.ts',
      signAndSendSubtask: '::lz:sign-and-send:midas',
    });
  });

task('lz:oft:send:midas', 'Runs a user-defined script')
  .addParam('mtoken', 'MToken')
  .addParam('amount', 'Amount', undefined, types.string)
  .addParam('receiverNetwork', 'Receiver Network')
  .addOptionalParam('receiver', 'Receiver address')
  .setAction(async (taskArgs, hre) => {
    const { deployer } = await hre.getNamedAccounts();
    const deployerSigner = await hre.ethers.getSigner(deployer);
    const mtoken = taskArgs.mtoken;
    const amount = taskArgs.amount;
    const receiverNetwork = taskArgs.receiverNetwork;
    const receiver = taskArgs.receiver ?? deployerSigner.address;

    if (mtoken) {
      if (!isMTokenName(mtoken)) {
        throw new Error('Invalid mtoken parameter');
      }
    }

    const srcEid = layerZeroEids[hre.network.name as Network];
    const dstEid = layerZeroEids[receiverNetwork as Network];

    if (!srcEid || !dstEid) {
      throw new Error('EIDs not found for networks');
    }

    const addresses = getCurrentAddresses(hre);

    const oftAdapter = addresses?.[mtoken as MTokenName]?.layerZero?.oft;

    if (!oftAdapter) {
      throw new Error('OFT adapter not found');
    }

    await hre.run('lz:oft:send', {
      srcEid,
      dstEid,
      to: receiver,
      oappConfig: './layerzero.config.ts',
      amount,
      oftAddress: oftAdapter,
    });
  });

// overriding default sign to support custom signer
subtask(
  '::lz:sign-and-send:midas',
  'Sign and send a list of transactions using a local signer',
  async ({ transactions, ...args }: SignAndSendTaskArgs) => {
    const hre = await import('hardhat');
    return createSignAndSendFlow({ ...args, createSigner: createSigner(hre) })({
      transactions,
    });
  },
)
  .addFlag(
    'ci',
    'Continuous integration (non-interactive) mode. Will not ask for any input from the user',
  )
  .addParam(
    'transactions',
    'List of OmniTransaction objects',
    undefined,
    devtoolsTypes.any,
  )
  .addParam(
    'createSigner',
    'Function that creates a signer for a particular network',
    undefined,
    devtoolsTypes.fn,
  )
  .addParam(
    'logger',
    'Logger object (see @layerzerolabs/io-devtools',
    undefined,
    types.any,
    true,
  )
  .addParam(
    'onFailure',
    'Function that handles sign & send failures',
    undefined,
    devtoolsTypes.fn,
    true,
  );
