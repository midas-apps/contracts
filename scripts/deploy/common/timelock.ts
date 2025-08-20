import { constants, PopulatedTransaction } from 'ethers';
import { solidityKeccak256 } from 'ethers/lib/utils';
import { ethers } from 'hardhat';
import { HardhatRuntimeEnvironment } from 'hardhat/types';

import {
  deployAndVerify,
  getDeployer,
  getWalletAddressForAction,
  sendAndWaitForCustomTxSign,
} from './utils';

import { getCurrentAddresses } from '../../../config/constants/addresses';
import { logDeploy } from '../../../helpers/utils';
import { ProxyAdmin, TimelockController } from '../../../typechain-types';
import { networkDeploymentConfigs } from '../configs/network-configs';

const safeAbi = [
  {
    inputs: [],
    name: 'domainSeparator',
    outputs: [{ internalType: 'bytes32', name: '', type: 'bytes32' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'address', name: 'to', type: 'address' },
      { internalType: 'uint256', name: 'value', type: 'uint256' },
      { internalType: 'bytes', name: 'data', type: 'bytes' },
      { internalType: 'enum Enum.Operation', name: 'operation', type: 'uint8' },
      { internalType: 'uint256', name: 'safeTxGas', type: 'uint256' },
      { internalType: 'uint256', name: 'baseGas', type: 'uint256' },
      { internalType: 'uint256', name: 'gasPrice', type: 'uint256' },
      { internalType: 'address', name: 'gasToken', type: 'address' },
      { internalType: 'address', name: 'refundReceiver', type: 'address' },
      { internalType: 'uint256', name: '_nonce', type: 'uint256' },
    ],
    name: 'encodeTransactionData',
    outputs: [{ internalType: 'bytes', name: '', type: 'bytes' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'address', name: 'to', type: 'address' },
      { internalType: 'uint256', name: 'value', type: 'uint256' },
      { internalType: 'bytes', name: 'data', type: 'bytes' },
      { internalType: 'enum Enum.Operation', name: 'operation', type: 'uint8' },
      { internalType: 'uint256', name: 'safeTxGas', type: 'uint256' },
      { internalType: 'uint256', name: 'baseGas', type: 'uint256' },
      { internalType: 'uint256', name: 'gasPrice', type: 'uint256' },
      { internalType: 'address', name: 'gasToken', type: 'address' },
      {
        internalType: 'address payable',
        name: 'refundReceiver',
        type: 'address',
      },
      { internalType: 'bytes', name: 'signatures', type: 'bytes' },
    ],
    name: 'execTransaction',
    outputs: [{ internalType: 'bool', name: 'success', type: 'bool' }],
    stateMutability: 'payable',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'address', name: 'to', type: 'address' },
      { internalType: 'uint256', name: 'value', type: 'uint256' },
      { internalType: 'bytes', name: 'data', type: 'bytes' },
      { internalType: 'enum Enum.Operation', name: 'operation', type: 'uint8' },
      { internalType: 'uint256', name: 'safeTxGas', type: 'uint256' },
      { internalType: 'uint256', name: 'baseGas', type: 'uint256' },
      { internalType: 'uint256', name: 'gasPrice', type: 'uint256' },
      { internalType: 'address', name: 'gasToken', type: 'address' },
      { internalType: 'address', name: 'refundReceiver', type: 'address' },
      { internalType: 'uint256', name: '_nonce', type: 'uint256' },
    ],
    name: 'getTransactionHash',
    outputs: [{ internalType: 'bytes32', name: '', type: 'bytes32' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'address', name: 'owner', type: 'address' }],
    name: 'isOwner',
    outputs: [{ internalType: 'bool', name: '', type: 'bool' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'nonce',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'getOwners',
    outputs: [{ internalType: 'address[]', name: '', type: 'address[]' }],
    stateMutability: 'view',
    type: 'function',
  },
];

export type DeployTimelockConfig = {
  minDelay: number;
  proposer: string;
  executor?: string;
};

export const deployTimelock = async (hre: HardhatRuntimeEnvironment) => {
  const deployer = await getDeployer(hre);

  const networkConfig = networkDeploymentConfigs[hre.network.config.chainId!];

  if (!networkConfig) {
    throw new Error('Network config is not found');
  }

  const { timelock } = networkConfig;

  if (!timelock) {
    throw new Error('Timelock config is not found');
  }

  const timelockContractName = 'MidasTimelockController';

  const timelockContract = await deployAndVerify(
    hre,
    timelockContractName,
    [
      timelock.minDelay,
      [timelock.proposer],
      [timelock.executor ?? timelock.proposer],
    ],
    deployer,
  );

  logDeploy(timelockContractName, undefined, timelockContract.address);
};

export type GetUpgradeTxParams = {
  proxyAddress: string;
  newImplementation: string;
  initializer?: string;
  initializerCalldata?: string;
};

export type TransferOwnershipTxParams = {
  newOwner: string;
};

type PopulateTxFn = (
  timelockContract: TimelockController,
  adminAddress: string,
  saltHash: string,
  calldata: string,
) => Promise<{
  tx?: PopulatedTransaction;
  operationHash: string;
  type: 'propose' | 'execute';
  verifyParameters?: unknown;
}>;

export const proposeTimeLockUpgradeTx = async (
  hre: HardhatRuntimeEnvironment,
  upgradeParams: GetUpgradeTxParams,
  salt: string,
) => {
  return await createUpgradeTimelockTx(
    hre,
    upgradeParams,
    salt,
    proposeTimelockTx,
  );
};

export const executeTimeLockUpgradeTx = async (
  hre: HardhatRuntimeEnvironment,
  upgradeParams: GetUpgradeTxParams,
  salt: string,
) => {
  return await createUpgradeTimelockTx(
    hre,
    upgradeParams,
    salt,
    executeTimelockTx,
  );
};

export const proposeTimeLockTransferOwnershipTx = async (
  hre: HardhatRuntimeEnvironment,
  transferOwnershipParams: TransferOwnershipTxParams,
  salt: string,
) => {
  return await createTransferOwnershipTimelockTx(
    hre,
    transferOwnershipParams,
    salt,
    proposeTimelockTx,
  );
};

export const executeTimeLockTransferOwnershipTx = async (
  hre: HardhatRuntimeEnvironment,
  transferOwnershipParams: TransferOwnershipTxParams,
  salt: string,
) => {
  return await createTransferOwnershipTimelockTx(
    hre,
    transferOwnershipParams,
    salt,
    executeTimelockTx,
  );
};

const getUpgradeTx = async (
  hre: HardhatRuntimeEnvironment,
  { newImplementation, proxyAddress, initializerCalldata }: GetUpgradeTxParams,
) => {
  const admin = await hre.upgrades.admin.getInstance();

  const upgradeCallData = initializerCalldata
    ? admin.interface.encodeFunctionData('upgradeAndCall', [
        proxyAddress,
        newImplementation,
        initializerCalldata,
      ])
    : admin.interface.encodeFunctionData('upgrade', [
        proxyAddress,
        newImplementation,
      ]);

  return upgradeCallData;
};

const getTransferOwnershipTx = async (
  hre: HardhatRuntimeEnvironment,
  { newOwner }: { newOwner: string },
) => {
  const admin = await hre.upgrades.admin.getInstance();

  const upgradeCallData = admin.interface.encodeFunctionData(
    'transferOwnership',
    [newOwner],
  );

  return upgradeCallData;
};

const executeTimelockTx: PopulateTxFn = async (
  timelockContract: TimelockController,
  toAddress: string,
  saltHash: string,
  calldata: string,
) => {
  const type = 'execute' as const;
  const params = [
    toAddress,
    0,
    calldata,
    constants.HashZero,
    saltHash,
  ] as const;

  const operationHash = await timelockContract.hashOperation(...params);

  const isOperationReady = await timelockContract.isOperationReady(
    operationHash,
  );

  if (!isOperationReady) {
    console.warn('Operation is not ready or not found');
    return { tx: undefined, operationHash, type };
  }

  const tx = await timelockContract.populateTransaction.execute(...params);

  return { tx, operationHash, type, verifyParameters: params };
};

const proposeTimelockTx: PopulateTxFn = async (
  timelockContract: TimelockController,
  toAddress: string,
  saltHash: string,
  calldata: string,
) => {
  const type = 'propose' as const;
  const params = [
    toAddress,
    0,
    calldata,
    constants.HashZero,
    saltHash,
  ] as const;

  const operationHash = await timelockContract.hashOperation(...params);

  const isOperationExists = await timelockContract.isOperation(operationHash);

  if (isOperationExists) {
    console.log('Operation is found, skipping...');
    return { tx: undefined, operationHash, type };
  }

  const tx = await timelockContract.populateTransaction.schedule(
    ...params,
    await timelockContract.getMinDelay(),
  );

  return { tx, operationHash, type, verifyParameters: params };
};

type ValidateTimelockTxParams = (hre: HardhatRuntimeEnvironment) => Promise<{
  isValid: boolean;
  calldata?: string;
  txComments?: {
    propose: string;
    execute: string;
  };
}>;

const createUpgradeTimelockTx = async (
  hre: HardhatRuntimeEnvironment,
  params: GetUpgradeTxParams,
  salt: string,
  populateTx: PopulateTxFn,
) => {
  return createTimeLockTx(
    hre,
    salt,
    async (hre) => {
      const admin = (await hre.upgrades.admin.getInstance()) as ProxyAdmin;

      const currentImpl = await admin.getProxyImplementation(
        params.proxyAddress,
      );

      if (
        currentImpl.toLowerCase() === params.newImplementation.toLowerCase()
      ) {
        console.log(
          `Already using new implementation for ${params.proxyAddress}, skipping upgrade...`,
        );
        return { isValid: false };
      }

      if (params.initializer && params.initializerCalldata) {
        console.log(
          `Using custom initializer ${params.initializer} with calldata ${params.initializerCalldata}`,
        );
      }

      return {
        isValid: true,
        calldata: await getUpgradeTx(hre, params),
        txComments: {
          propose: `Propose upgrade of ${params.proxyAddress} to impl. ${params.newImplementation}`,
          execute: `Execute upgrade of ${params.proxyAddress} to impl. ${params.newImplementation}`,
        },
      };
    },
    populateTx,
  );
};

const getTimelockContract = async (hre: HardhatRuntimeEnvironment) => {
  const networkAddresses = getCurrentAddresses(hre);

  return await hre.ethers.getContractAt(
    'MidasTimelockController',
    networkAddresses!.timelock!,
  );
};

const createTransferOwnershipTimelockTx = async (
  hre: HardhatRuntimeEnvironment,
  params: TransferOwnershipTxParams,
  salt: string,
  populateTx: PopulateTxFn,
) => {
  return createTimeLockTx(
    hre,
    salt,
    async (hre) => {
      const timelockContract = await getTimelockContract(hre);

      const admin = (await hre.upgrades.admin.getInstance()) as ProxyAdmin;

      const currentOwner = await admin.owner();

      if (currentOwner.toLowerCase() === params.newOwner.toLowerCase()) {
        console.log(
          `NewOwner ${params.newOwner} is already the owner of proxy admin, skipping...`,
        );
        return { isValid: false };
      }

      if (
        currentOwner.toLowerCase() !== timelockContract.address.toLowerCase()
      ) {
        throw new Error(
          `Owner ${currentOwner} is not the timelock contract ${timelockContract.address}`,
        );
      }

      return {
        isValid: true,
        calldata: await getTransferOwnershipTx(hre, params),
        txComments: {
          propose: `Propose transfer ProxyAdmin ownership to ${params.newOwner}`,
          execute: `Execute transfer ProxyAdmin ownership to ${params.newOwner}`,
        },
      };
    },
    populateTx,
  );
};

const createTimeLockTx = async (
  hre: HardhatRuntimeEnvironment,
  salt: string,
  validateParams: ValidateTimelockTxParams,
  populateTx: PopulateTxFn,
) => {
  const deployer = await getDeployer(hre);

  const { isValid, calldata, txComments } = await validateParams(hre);

  if (!isValid || !calldata) {
    console.log('Validation is not passed, skipping...');
    return;
  }

  const admin = (await hre.upgrades.admin.getInstance()) as ProxyAdmin;

  const networkAddresses = getCurrentAddresses(hre);

  const timelockContract = await hre.ethers.getContractAt(
    'MidasTimelockController',
    networkAddresses!.timelock!,
  );

  const currentAdminOwner = await admin.owner();

  if (
    currentAdminOwner.toLowerCase() !== timelockContract.address.toLowerCase()
  ) {
    throw new Error(
      `Admin owner ${currentAdminOwner} is not the timelock contract ${timelockContract.address}`,
    );
  }

  const saltHash = solidityKeccak256(['string'], [salt]);

  let { operationHash, type, tx, verifyParameters } = await populateTx(
    timelockContract,
    admin.address,
    saltHash,
    calldata,
  );

  if (!tx) {
    console.warn('Skipping sending tx, operation hash: ', operationHash);
    return;
  }

  const [caller] =
    type === 'propose'
      ? await timelockContract.getProposers()
      : await timelockContract.getExecutors();

  const callerCode = await hre.ethers.provider.getCode(caller);

  const isCallerContract = callerCode !== '0x';

  if (isCallerContract) {
    console.log(
      'Caller is a contract, assuming it is a safe contract to execute tx',
    );

    // we assume that the owner contract is a safe contract
    const safeContract = await hre.ethers.getContractAt(safeAbi, caller);

    const owners: string[] = await safeContract.getOwners();

    const ownerForSignature = await getWalletAddressForAction(
      hre,
      'update-timelock',
    );

    if (
      !owners.find((v) => v.toLowerCase() === ownerForSignature.toLowerCase())
    ) {
      throw new Error(
        `Owner ${ownerForSignature} is not found in the safe contract, allowed callers: [${owners.join(
          ', ',
        )}]`,
      );
    }

    tx = await safeContract.populateTransaction.execTransaction(
      timelockContract.address,
      0,
      tx.data,
      0,
      0,
      0,
      0,
      constants.AddressZero,
      constants.AddressZero,
      // FIXME: for some reason, encode of 1 is required to be padded, so abi coder does not produce
      // the required result with encode(['address', 'uint256'], [ownerForSignature, 1])
      ethers.utils.defaultAbiCoder.encode(['address'], [ownerForSignature]) +
        '000000000000000000000000000000000000000000000000000000000000000001',
    );
  }

  console.log(`Timelock operation id for: ${operationHash}`);
  console.log('Verify parameters: ', verifyParameters);

  const comment = txComments?.[type] ?? '';

  const res = await sendAndWaitForCustomTxSign(hre, tx, {
    action: 'update-timelock',
    subAction: 'timelock-call-upgrade',
    comment,
  });

  console.log('Transaction successfully submitted', res);
};
