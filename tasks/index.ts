import { PopulatedTransaction } from 'ethers';
import { parseUnits } from 'ethers/lib/utils';
import { extendEnvironment, task, types } from 'hardhat/config';

import path from 'path';

import { ENV, layerZeroEids, MTokenName, Network } from '../config';
import {
  getCurrentAddresses,
  midasAddressesPerNetwork,
  TokenAddresses,
} from '../config/constants/addresses';
import { initializeLogger } from '../helpers/logger';
import {
  etherscanVerify,
  etherscanVerifyImplementation,
  isMTokenName,
  isPaymentTokenName,
} from '../helpers/utils';
import { getDeployer } from '../scripts/deploy/common/utils';
import {
  // eslint-disable-next-line camelcase
  LzElevatedMinterBurner__factory,
  // eslint-disable-next-line camelcase
  MidasLzMintBurnOFTAdapter__factory,
} from '../typechain-types';
import './layerzero';

export const logPopulatedTx = (tx: PopulatedTransaction) => {
  console.log({
    data: tx.data,
    to: tx.to,
  });
};

task('runscript', 'Runs a user-defined script')
  .addPositionalParam('path', 'Path to the script')
  .addOptionalParam('mtoken', 'MToken')
  .addOptionalParam('ptoken', 'Payment Token')
  .addOptionalParam('action', 'Timelock Action')
  .addOptionalParam('customSignerScript', 'Custom Signer Script')
  .addOptionalParam('skipvalidation', 'Skip Validation', 'false')
  .addOptionalParam('aggregatorType', 'Aggregator Type')
  .addOptionalParam('logToFile', 'Log to file')
  .addOptionalParam('logsFolderPath', 'Logs folder path')
  .addOptionalParam('originalNetwork', 'Original Network')
  .setAction(async (taskArgs, hre) => {
    const mtoken = taskArgs.mtoken;
    const ptoken = taskArgs.ptoken;
    const action = taskArgs.action;
    const originalNetwork = taskArgs.originalNetwork;

    const customSignerScript =
      taskArgs.customSignerScript ?? ENV.CUSTOM_SIGNER_SCRIPT_PATH;
    const logToFile = taskArgs.logToFile ?? ENV.LOG_TO_FILE;
    const logsFolderPath =
      (taskArgs.logsFolderPath as string | undefined) ??
      ENV.LOGS_FOLDER_PATH ??
      path.resolve(hre.config.paths.root, 'logs/');

    const scriptPath = taskArgs.path;
    const skipValidation = taskArgs.skipvalidation;

    initializeLogger(hre);

    hre.skipValidation = (skipValidation ?? 'false') === 'true';
    hre.aggregatorType = taskArgs.aggregatorType;

    if (
      hre.aggregatorType &&
      !['numerator', 'denominator'].includes(hre.aggregatorType)
    ) {
      throw new Error('Invalid aggregator type parameter');
    }

    const { deployer } = await hre.getNamedAccounts();
    const deployerSigner = await hre.ethers.getSigner(deployer);

    hre.action = action;

    hre.logger = {
      logToFile,
      logsFolderPath,
      executionLogContext: `${action}-${new Date().toISOString()}`,
    };

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

    if (!customSignerScript) {
      hre.customSigner = {
        getWalletAddress: async () => {
          return deployer;
        },
        createAddressBookContract: async (_) => {
          throw new Error(
            'createAddressBookContract is not available for hardhat signer',
          );
        },
        sendTransaction: async (transaction) => {
          const tx = await deployerSigner.sendTransaction({
            ...transaction,
          });
          return {
            type: 'hardhatSigner',
            tx,
          };
        },
      };
    } else {
      const scriptPathResolved = path.resolve(customSignerScript);
      const {
        signTransaction,
        createAddressBookContract,
        getWalletAddressForAction,
      } = await import(scriptPathResolved);

      hre.customSigner = {
        getWalletAddress: async (action, mtokenOverride) => {
          return getWalletAddressForAction(
            action,
            mtokenOverride ?? hre.mtoken,
          );
        },
        createAddressBookContract: async (data) => {
          return {
            payload: await createAddressBookContract({
              ...data,
              chainId: hre.network.config.chainId,
              mToken: mtoken,
            }),
          };
        },

        sendTransaction: async (transaction, txSignMetadata) => {
          return {
            type: 'customSigner',
            payload: await signTransaction(transaction, {
              chain: {
                name: hre.network.name,
                id: hre.network.config.chainId,
              },
              mToken: hre.mtoken,
              ...txSignMetadata,
            }),
          };
        },
      };
    }

    const scriptPathResolved = path.resolve(scriptPath);
    const { default: run } = await import(scriptPathResolved);

    if (!run) {
      throw new Error('Script not found or it doesnt have a default export');
    }

    await run(hre);
  });

task('verifyProxy')
  .addPositionalParam('proxyAddress')
  .setAction(async ({ proxyAddress }, hre) => {
    await etherscanVerifyImplementation(hre, proxyAddress);
  });

task('verifyRegular')
  .addPositionalParam('address')
  .setAction(async ({ address }, hre) => {
    await etherscanVerify(hre, address);
  });

task('lz:oapp:wire:midas', 'Runs a user-defined script')
  .addOptionalParam(
    'oappConfig',
    'Path to your LayerZero OApp config',
    undefined,
    types.string,
  )
  .addOptionalParam('mtoken', 'MToken')
  .addOptionalParam('originalNetwork', 'Original Network')
  .setAction(async (taskArgs, hre) => {
    const mtoken = taskArgs.mtoken;
    const originalNetwork = taskArgs.originalNetwork;

    if (mtoken) {
      if (!isMTokenName(mtoken)) {
        throw new Error('Invalid mtoken parameter');
      }

      hre.mtoken = mtoken;
    }

    if (originalNetwork) {
      hre.layerZero = {
        originalNetwork,
      };
    }

    await hre.run('lz:oapp:wire', {
      oappConfig: './layerzero.config.ts',
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

    const parsedAmount = parseUnits(amount.toString(), 18);

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

    const oftAdapter =
      addresses?.[mtoken as MTokenName]?.layerZero?.mintBurnAdapter;

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

// TODO: move it to a separate file
// layerzero uses hardhat-deploy to get the contract abi from the address
// as we dont use it for deployments, we dont have any deployment files
// that are produced by hardhat-deploy
// this workaround overrides the getDeploymentsFromAddress function
// to return the correct abi for the layerzero contracts
// without needing to create any deployment files
extendEnvironment((hre) => {
  const lzAddresses = Object.values(midasAddressesPerNetwork)
    .map((v) =>
      (Object.values(v ?? {}) as TokenAddresses[]).map((a) => [
        {
          // eslint-disable-next-line camelcase
          abi: MidasLzMintBurnOFTAdapter__factory.abi,
          address: a?.layerZero?.mintBurnAdapter,
        },
        {
          // eslint-disable-next-line camelcase
          abi: LzElevatedMinterBurner__factory.abi,
          address: a?.layerZero?.minterBurner,
        },
      ]),
    )
    .flat(2)
    .filter((v) => !!v.address);
  const original = hre.deployments.getDeploymentsFromAddress;

  hre.deployments.getDeploymentsFromAddress = async (address: string) => {
    const found = lzAddresses.find((v) => v.address === address);
    if (found) {
      return [{ address, abi: found?.abi }];
    }
    return original(address);
  };
});
