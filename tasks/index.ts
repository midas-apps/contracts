import { PopulatedTransaction } from 'ethers';
import { task } from 'hardhat/config';

import path from 'path';

import { ENV } from '../config';
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
  .addOptionalParam('customSignerScript', 'Custom Signer Script')
  .setAction(async (taskArgs, hre) => {
    const mtoken = taskArgs.mtoken;
    const ptoken = taskArgs.ptoken;
    const customSignerScript =
      taskArgs.customSignerScript ?? ENV.CUSTOM_SIGNER_SCRIPT_PATH;
    const scriptPath = taskArgs.path;

    const { deployer } = await hre.getNamedAccounts();
    const deployerSigner = await hre.ethers.getSigner(deployer);

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
      const { signTransaction } = await import(scriptPathResolved);

      hre.customSigner = {
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
