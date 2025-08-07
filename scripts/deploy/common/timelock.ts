import { constants, PopulatedTransaction } from 'ethers';
import { solidityKeccak256 } from 'ethers/lib/utils';
import { HardhatRuntimeEnvironment } from 'hardhat/types';

import {
  deployAndVerify,
  getDeployer,
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
  callData?: string;
};

const getUpgradeTx = async (
  hre: HardhatRuntimeEnvironment,
  { newImplementation, proxyAddress, callData }: GetUpgradeTxParams,
) => {
  const admin = await hre.upgrades.admin.getInstance();

  const upgradeCallData = callData
    ? admin.interface.encodeFunctionData('upgradeAndCall', [
        proxyAddress,
        newImplementation,
        callData,
      ])
    : admin.interface.encodeFunctionData('upgrade', [
        proxyAddress,
        newImplementation,
      ]);

  return upgradeCallData;
};

export const proposeTimeLockUpgradeTx = async (
  hre: HardhatRuntimeEnvironment,
  upgradeParams: GetUpgradeTxParams[],
  salt: string,
) => {
  return await createTimeLockTx(
    hre,
    upgradeParams,
    salt,
    async (timelockContract, adminAddress, saltHash, upgradeTxCallDatas) => {
      const type = 'propose';
      const params = [
        upgradeTxCallDatas.map((_) => adminAddress),
        upgradeTxCallDatas.map((_) => 0),
        upgradeTxCallDatas,
        constants.HashZero,
        saltHash,
      ] as const;

      const operationHash = await timelockContract.hashOperationBatch(
        ...params,
      );

      const isOperationExists = await timelockContract.isOperation(
        operationHash,
      );

      if (isOperationExists) {
        console.log('Operation is found, skipping...');
        return { tx: undefined, operationHash, type };
      }

      const tx = await timelockContract.populateTransaction.scheduleBatch(
        ...params,
        await timelockContract.getMinDelay(),
      );

      return { tx, operationHash, type, verifyParameters: params };
    },
  );
};

export const executeTimeLockUpgradeTx = async (
  hre: HardhatRuntimeEnvironment,
  upgradeParams: GetUpgradeTxParams[],
  salt: string,
) => {
  return await createTimeLockTx(
    hre,
    upgradeParams,
    salt,
    async (timelockContract, adminAddress, saltHash, upgradeTxCallDatas) => {
      const type = 'execute';
      const params = [
        upgradeTxCallDatas.map((_) => adminAddress),
        upgradeTxCallDatas.map((_) => 0),
        upgradeTxCallDatas,
        constants.HashZero,
        saltHash,
      ] as const;

      const operationHash = await timelockContract.hashOperationBatch(
        ...params,
      );

      const isOperationReady = await timelockContract.isOperationReady(
        operationHash,
      );

      if (!isOperationReady) {
        console.warn('Operation is not ready or not found');
        return { tx: undefined, operationHash, type };
      }

      const tx = await timelockContract.populateTransaction.executeBatch(
        ...params,
      );

      return { tx, operationHash, type, verifyParameters: params };
    },
  );
};

const createTimeLockTx = async (
  hre: HardhatRuntimeEnvironment,
  upgradeParams: GetUpgradeTxParams[],
  salt: string,
  populateTx: (
    timelockContract: TimelockController,
    adminAddress: string,
    saltHash: string,
    upgradeTxCallDatas: string[],
  ) => Promise<{
    tx?: PopulatedTransaction;
    operationHash: string;
    type: 'propose' | 'execute';
    verifyParameters?: unknown;
  }>,
) => {
  const admin = (await hre.upgrades.admin.getInstance()) as ProxyAdmin;

  const upgradeParamsUnUpgraded: GetUpgradeTxParams[] = [];

  for (const upgradeParam of upgradeParams) {
    const currentImpl = await admin.getProxyImplementation(
      upgradeParam.proxyAddress,
    );

    if (
      currentImpl.toLowerCase() === upgradeParam.newImplementation.toLowerCase()
    ) {
      console.log(
        `Already using new implementation for ${upgradeParam.proxyAddress}, skipping upgrade...`,
      );
      continue;
    }

    upgradeParamsUnUpgraded.push(upgradeParam);
  }

  if (upgradeParamsUnUpgraded.length === 0) {
    console.log('No upgrades to propose, skipping...');
    return;
  }

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

  const upgradeTxCallDatas = await Promise.all(
    upgradeParamsUnUpgraded.map((params) => getUpgradeTx(hre, params)),
  );

  const saltHash = solidityKeccak256(['string'], [salt]);

  let { operationHash, type, tx, verifyParameters } = await populateTx(
    timelockContract,
    admin.address,
    saltHash,
    upgradeTxCallDatas,
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
    console.log('Caller is a contract, using safe contract to execute tx');

    // we assume that the owner contract is a safe contract
    const safeContract = await hre.ethers.getContractAt(safeAbi, caller);

    tx = await safeContract.populateTransaction.execTransaction(
      timelockContract.address,
      0,
      tx.data!,
      0,
      0,
      0,
      0,
      constants.AddressZero,
      constants.AddressZero,
      [caller],
    );
  }

  console.log(`Timelock operation id for: ${operationHash}`);
  console.log('Verify parameters: ', verifyParameters);

  const commentContracts = upgradeParamsUnUpgraded
    .map((v) => v.proxyAddress)
    .join(', ');

  const res = await sendAndWaitForCustomTxSign(hre, tx, {
    action: 'update-timelock',
    subAction: 'timelock-call-upgrade',
    comment:
      type === 'propose'
        ? `Propose contract upgrade for [${commentContracts}]`
        : `Execute contract upgrade for [${commentContracts}]`,
  });

  console.log('Transaction successfully submitted', res);
};
