import { parseUnits } from 'ethers/lib/utils';
import { task, types } from 'hardhat/config';

import { Network } from '../config';
import { axelarInterchainTransfer } from '../helpers/axelar/utils';
import { isMTokenName } from '../helpers/utils';

task('axelar:its:send:midas', 'Sends tokens trough axelar`s ITS')
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

    const txHash = await axelarInterchainTransfer(hre, parseUnits(amount), {
      destinationNetwork,
      mToken,
      destinationAddress,
    });
  });
