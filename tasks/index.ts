import chalk from 'chalk';
import { PopulatedTransaction } from 'ethers';
import { extendEnvironment, task, types } from 'hardhat/config';

import './prepareTx';
import path from 'path';

import { MTokenName, PaymentTokenName } from '../config';
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
  .setAction(async (taskArgs, hre) => {
    const mtoken = taskArgs.mtoken;
    const ptoken = taskArgs.ptoken;
    const scriptPath = taskArgs.path;

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

task('executeTx')
  .addPositionalParam('to', undefined, undefined, types.string)
  .addPositionalParam('data', undefined, undefined, types.string)
  .addOptionalParam('from', undefined, undefined, types.string)
  .addOptionalParam('value', undefined, undefined, types.float)
  .setAction(async ({ to, data, from, value }, hre) => {
    const { deployer } = await hre.getNamedAccounts();
    const signer = await hre.ethers.getSigner(from ?? deployer);

    const valueParsed = value
      ? hre.ethers.utils.parseUnits(value.toString())
      : undefined;

    const tx = await signer.sendTransaction({
      data,
      to,
      from,
      value: valueParsed,
    });

    console.log(chalk.yellow('Transaction hash: ', tx.hash));
  });

task('deployTestToken')
  .addOptionalPositionalParam('decimals', undefined, 18, types.int)
  .addOptionalPositionalParam('name', undefined, 'TestToken', types.string)
  .addOptionalPositionalParam('symbol', undefined, 'TestToken', types.string)

  .setAction(async ({ decimals, name, symbol }, hre) => {
    const { deployer } = await hre.getNamedAccounts();

    const signer = await hre.ethers.getSigner(deployer);

    const token = await (
      await hre.ethers.getContractFactory('ERC20MockWithName', signer)
    ).deploy(decimals, name, symbol);

    console.log(chalk.yellow('Token deployed at: ', token.address));
  });
