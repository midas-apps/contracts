import { parseUnits } from 'ethers/lib/utils';
import { task, types } from 'hardhat/config';

import { Network } from '../config';
import {
  axelarInterchainTransferExecutable,
  axelarInterchainTransferMToken,
  axelarInterchainTransferPToken,
} from '../helpers/axelar/utils';
import { isMTokenName, isPaymentTokenName } from '../helpers/utils';

task('axelar:its:send:mtoken', 'Sends mtoken tokens trough axelar`s ITS')
  .addParam('mtoken', 'MToken')
  .addParam('amount', 'Amount', undefined, types.string)
  .addParam('destinationNetwork', 'Destination Network')
  .addOptionalParam('receiver', 'Receiver address')
  .setAction(async (taskArgs, hre) => {
    const { deployer } = await hre.getNamedAccounts();
    const deployerSigner = await hre.ethers.getSigner(deployer);

    const mToken = taskArgs.mtoken;
    const amount = taskArgs.amount;
    const destinationNetwork = taskArgs.destinationNetwork as Network;
    const destinationAddress = taskArgs.receiver ?? deployerSigner.address;

    if (mToken) {
      if (!isMTokenName(mToken)) {
        throw new Error('Invalid mtoken parameter');
      }
    }

    await axelarInterchainTransferMToken(hre, amount, {
      destinationNetwork,
      mToken,
      destinationAddress,
    });
  });

task('axelar:its:send:ptoken', 'Sends mtoken tokens trough axelar`s ITS')
  .addParam('ptoken', 'Payment Token')
  .addParam('amount', 'Amount', undefined, types.string)
  .addParam('destinationNetwork', 'Destination Network')
  .addOptionalParam('receiver', 'Receiver address')
  .setAction(async (taskArgs, hre) => {
    const { deployer } = await hre.getNamedAccounts();
    const deployerSigner = await hre.ethers.getSigner(deployer);

    const pToken = taskArgs.ptoken;
    const amount = taskArgs.amount;
    const destinationNetwork = taskArgs.destinationNetwork as Network;
    const destinationAddress = taskArgs.receiver ?? deployerSigner.address;

    if (pToken) {
      if (!isPaymentTokenName(pToken)) {
        throw new Error('Invalid ptoken parameter');
      }
    }

    await axelarInterchainTransferPToken(hre, amount, {
      destinationNetwork,
      pToken,
      destinationAddress,
    });
  });

task('axelar:its:send:executable', 'Sends tokens to executable')
  .addParam('operation', 'deposit or redeem')
  .addParam('mtoken', 'MToken')
  .addParam('ptoken', 'Payment Token')
  .addParam('amount', 'Amount', undefined, types.string)
  .addParam('destinationNetwork', 'Destination Network')
  .addOptionalParam('receiver', 'Receiver address')
  .addOptionalParam('referrerId', 'Referrer ID')
  .setAction(async (taskArgs, hre) => {
    const { deployer } = await hre.getNamedAccounts();
    const deployerSigner = await hre.ethers.getSigner(deployer);

    const mToken = taskArgs.mtoken;
    const pToken = taskArgs.ptoken;
    const amount = taskArgs.amount;
    const destinationNetwork = taskArgs.destinationNetwork as Network;
    const receiverAddress = taskArgs.receiver ?? deployerSigner.address;
    const referrerId = taskArgs.referrerId;
    const operation = taskArgs.operation as 'deposit' | 'redeem';

    if (!isPaymentTokenName(pToken)) {
      throw new Error('Invalid ptoken parameter');
    }

    if (!isMTokenName(mToken)) {
      throw new Error('Invalid mtoken parameter');
    }

    await axelarInterchainTransferExecutable(
      hre,
      operation as 'deposit' | 'redeem',
      amount,
      {
        destinationNetwork,
        pToken,
        receiverAddress,
        mToken,
        referrerId,
      },
    );
  });
