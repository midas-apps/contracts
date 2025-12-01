import { group, text } from '@clack/prompts';
import { constants } from 'ethers';
import { HardhatRuntimeEnvironment } from 'hardhat/types';

import { Network, PartialConfigPerNetwork } from '../../../../config';
import { logDeploy } from '../../../../helpers/utils';
import {
  requireAddress,
  requireNotCancelled,
  validateAddress,
} from '../../codegen/common';
import { DeployFunction } from '../../common/types';
import { getDeployer } from '../../common/utils';

const multiSendAddressesPerNetwork: PartialConfigPerNetwork<string> = {
  sepolia: '0x9641d764fc13c8B624c04430C7356C1C7C8102e2',
};

const multisendAbi = [
  {
    inputs: [{ internalType: 'bytes', name: 'transactions', type: 'bytes' }],
    name: 'multiSend',
    outputs: [],
    stateMutability: 'payable',
    type: 'function',
  },
];

const func: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  const multiSendAddress =
    multiSendAddressesPerNetwork[hre.network.name as Network];

  if (!multiSendAddress) {
    throw new Error(
      `MultiSend address not found for network ${hre.network.name}`,
    );
  }

  const {
    safeAddress,
    delayModule,
    tokensWithdrawModule,
    enforceDelayModuleGuard,
  } = await group({
    safeAddress: () =>
      text({ message: 'Safe Address', validate: validateAddress })
        .then(requireNotCancelled)
        .then(requireAddress),
    delayModule: () =>
      text({ message: 'Delay Module', validate: validateAddress })
        .then(requireNotCancelled)
        .then(requireAddress),
    enforceDelayModuleGuard: () =>
      text({ message: 'Enforce Delay Module Guard', validate: validateAddress })
        .then(requireNotCancelled)
        .then(requireAddress),
    tokensWithdrawModule: () =>
      text({ message: 'Tokens Withdraw Module', validate: validateAddress })
        .then(requireNotCancelled)
        .then(requireAddress),
  });

  const deployer = await getDeployer(hre);

  const safe = await hre.ethers.getContractAt('GnosisSafe', safeAddress);

  const multiSend = await hre.ethers.getContractAt(
    multisendAbi,
    multiSendAddress,
    deployer,
  );

  const delayModuleContract = await hre.ethers.getContractAt(
    'Delay',
    delayModule,
  );

  const txs = [
    {
      to: safeAddress,
      data: safe.interface.encodeFunctionData('enableModule', [delayModule]),
    },
    {
      to: safeAddress,
      data: safe.interface.encodeFunctionData('enableModule', [
        tokensWithdrawModule,
      ]),
    },
    {
      to: delayModule,
      data: delayModuleContract.interface.encodeFunctionData('enableModule', [
        safeAddress,
      ]),
    },
    {
      to: safeAddress,
      data: safe.interface.encodeFunctionData('setGuard', [
        enforceDelayModuleGuard,
      ]),
    },
  ];

  const encodedTxs = txs.map((tx) =>
    hre.ethers.utils.solidityPack(
      ['uint8', 'address', 'uint256', 'uint256', 'bytes'],
      [
        0,
        tx.to,
        0,
        Buffer.from(tx.data.replace('0x', ''), 'hex').length,
        tx.data,
      ],
    ),
  );

  const encodedTxsWithOperation = hre.ethers.utils.concat(encodedTxs);

  const encodedMutliCallTx = multiSend.interface.encodeFunctionData(
    'multiSend',
    [encodedTxsWithOperation],
  );

  const mutliCallTx = await safe.execTransaction(
    multiSendAddress,
    0,
    encodedMutliCallTx,
    1,
    1_000_000,
    0,
    0,
    constants.AddressZero,
    constants.AddressZero,
    hre.ethers.utils.defaultAbiCoder.encode(['address'], [deployer.address]) +
      '000000000000000000000000000000000000000000000000000000000000000001',
  );

  logDeploy('Setup tx', hre.network.name, mutliCallTx.hash);

  await mutliCallTx.wait(5);
};

export default func;
