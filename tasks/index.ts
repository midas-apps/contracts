import { task } from 'hardhat/config';

import { runScript, withGlobalRunScriptParams } from './common';

import './layerzero';
import './axelar';
import './verify';
import './deploy';

const runScriptTask = task('runscript', 'Runs a user-defined script');

withGlobalRunScriptParams(runScriptTask);

// Ad-hoc runscript still accepts any param so one-off scripts keep working.
runScriptTask
  .addPositionalParam('path', 'Path to the script')
  .addOptionalParam('mtoken', 'MToken')
  .addOptionalParam('ptoken', 'Payment Token')
  .addOptionalParam('action', 'Timelock Action')
  .addOptionalParam('skipValidation', 'Skip Validation', 'false')
  .addOptionalParam('aggregatorType', 'Aggregator Type')
  .addOptionalParam('originalNetwork', 'Original Network')
  .addOptionalParam(
    'keys',
    'Comma-separated list of address book keys to include (e.g. layerZero)',
  )
  .setAction(async (taskArgs, hre) => {
    await runScript(taskArgs, hre, []);
  });
