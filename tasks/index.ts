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

    const scriptPath = taskArgs.path;
    const skipValidation = taskArgs.skipvalidation;

    hre.skipValidation = (skipValidation ?? 'false') === 'true';
    hre.aggregatorType = taskArgs.aggregatorType;

    if (
      hre.aggregatorType &&
      !['numerator', 'denominator'].includes(hre.aggregatorType)
    ) {
      throw new Error('Invalid aggregator type parameter');
    }

    hre.action = action;

    if (hre.logger) {
      hre.logger.executionLogContext = `${action}-${new Date().toISOString()}`;
    }

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
