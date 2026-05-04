import { task } from 'hardhat/config';

import path from 'path';

import { extendWithContext } from '../config';
import { isMTokenName, isPaymentTokenName } from '../helpers/utils';

import './layerzero';
import './axelar';
import './verify';

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
  .addOptionalParam(
    'deploymentConfig',
    'Named deployment config profile (for example: mfone-unloop)',
  )
  .addOptionalParam(
    'keys',
    'Comma-separated list of address book keys to include (e.g. layerZero)',
  )
  .setAction(async (taskArgs, hre) => {
    const mtoken = taskArgs.mtoken;
    const ptoken = taskArgs.ptoken;
    const action = taskArgs.action;
    const originalNetwork = taskArgs.originalNetwork;
    const deploymentConfig = taskArgs.deploymentConfig;
    const keys = taskArgs.keys;

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
    hre.deploymentConfig = deploymentConfig;

    if (action) {
      extendWithContext(hre, `${action}-${new Date().toISOString()}`);
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

    if (keys) {
      hre.addressBookKeys = keys.split(',').map((k: string) => k.trim());
    }

    const scriptPathResolved = path.resolve(scriptPath);
    const { default: run } = await import(scriptPathResolved);

    if (!run) {
      throw new Error('Script not found or it doesnt have a default export');
    }

    await run(hre);
  });
