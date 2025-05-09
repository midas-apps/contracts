import chalk from 'chalk';
import { PopulatedTransaction } from 'ethers';
import { task, types } from 'hardhat/config';

import './prepareTx';
import {
  etherscanVerify,
  etherscanVerifyImplementation,
  isMTokenName,
} from '../helpers/utils';

export const logPopulatedTx = (tx: PopulatedTransaction) => {
  console.log({
    data: tx.data,
    to: tx.to,
  });
};

task('run', 'Runs a user-defined script')
  .addOptionalParam('mtoken', 'MToken')
  .setAction(async (taskArgs, hre, runSuper) => {
    const mtoken = taskArgs.mtoken;

    if (mtoken) {
      if (!isMTokenName(mtoken)) {
        throw new Error('Invalid mtoken parameter');
      }

      hre.mtoken = mtoken;
    }
    return runSuper(taskArgs);
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
