import { PopulatedTransaction } from 'ethers';
import { task } from 'hardhat/config';

import path from 'path';

import { ENV } from '../config';
import { initializeLogger } from '../helpers/logger';
import {
  etherscanVerify,
  etherscanVerifyImplementation,
  isMTokenName,
  isPaymentTokenName,
} from '../helpers/utils';
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
  .addOptionalParam('aggregatortype', 'Aggregator Type')
  .addOptionalParam('logToFile', 'Log to file')
  .addOptionalParam('logsFolderPath', 'Logs folder path')
  .setAction(async (taskArgs, hre) => {
    const mtoken = taskArgs.mtoken;
    const ptoken = taskArgs.ptoken;
    const action = taskArgs.action;
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
    hre.aggregatorType = taskArgs.aggregatortype;

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
