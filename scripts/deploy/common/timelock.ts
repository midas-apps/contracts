import {
  impersonateAccount,
  mine,
  setBalance,
} from '@nomicfoundation/hardhat-network-helpers';
import { increase } from '@nomicfoundation/hardhat-network-helpers/dist/src/helpers/time';
import { days } from '@nomicfoundation/hardhat-network-helpers/dist/src/helpers/time/duration';
import { BigNumber, constants, PopulatedTransaction } from 'ethers';
import { parseUnits, solidityKeccak256 } from 'ethers/lib/utils';
import { ethers } from 'hardhat';
import { HardhatRuntimeEnvironment } from 'hardhat/types';

import {
  deployAndVerify,
  getDeployer,
  getWalletAddressForAction,
  sendAndWaitForCustomTxSign,
} from './utils';

import { MTokenName } from '../../../config';
import {
  getCurrentAddresses,
  VaultType,
} from '../../../config/constants/addresses';
import { getRolesForToken } from '../../../helpers/roles';
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
  vaultType: VaultType;
  mToken: MTokenName;
};

export type TransferOwnershipTxParams = {
  newOwner: string;
};

type PopulateTxFn = (
  timelockContract: TimelockController,
  adminAddress: string,
  saltHash: string,
  calldata: string,
  validateSimulation: boolean,
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

export const validateSimulateTimeLockUpgradeTx = async (
  hre: HardhatRuntimeEnvironment,
  upgradeParams: GetUpgradeTxParams,
  salt: string,
) => {
  return await createUpgradeTimelockTx(
    hre,
    upgradeParams,
    salt,
    executeTimelockTx,
    async (tx) => {
      await validateSimulateContractUpgrade(hre, upgradeParams, tx);
    },
  );
};

export const validateSimulateTimeLockProposeUpgradeTx = async (
  hre: HardhatRuntimeEnvironment,
  upgradeParams: GetUpgradeTxParams,
  salt: string,
) => {
  return await createUpgradeTimelockTx(
    hre,
    upgradeParams,
    salt,
    proposeTimelockTx,
    async (tx) => {
      await impersonateAccount(tx.from!);
      await setBalance(tx.from!, ethers.utils.parseEther('1000'));
      const upgradeSigner = await hre.ethers.getSigner(tx.from!);
      await upgradeSigner.sendTransaction(tx);
    },
  );
};

const bigNumberMin = (bn1: BigNumber, bn2: BigNumber) => {
  return bn1.lt(bn2) ? bn1 : bn2;
};

const bigNumberMax = (bn1: BigNumber, bn2: BigNumber) => {
  return bn1.gt(bn2) ? bn1 : bn2;
};

const validateSimulateContractUpgrade = async (
  hre: HardhatRuntimeEnvironment,
  upgradeParams: GetUpgradeTxParams,
  tx: PopulatedTransaction,
) => {
  await increase(days(3));
  await mine();

  const proxyAdmin = (await hre.upgrades.admin.getInstance()) as ProxyAdmin;
  const proxyAdminOwner = await proxyAdmin.owner();

  const timelock = await getTimelockContract(hre);

  if (proxyAdminOwner !== timelock.address) {
    const proxyAdminOwnerSigner = await hre.ethers.getSigner(proxyAdminOwner);
    await impersonateAccount(proxyAdminOwner);
    await setBalance(proxyAdminOwner, ethers.utils.parseEther('1000'));
    await proxyAdmin
      .connect(proxyAdminOwnerSigner)
      .transferOwnership(timelock.address);
  }

  const addresses = getCurrentAddresses(hre);

  const acContract = await hre.ethers.getContractAt(
    'MidasAccessControl',
    addresses!.accessControl!,
  );

  const roles = getRolesForToken(upgradeParams.mToken);
  const acAdminAddress = '0xd4195CF4df289a4748C1A7B6dDBE770e27bA1227';

  for (const address of [tx.from!, acAdminAddress]) {
    await impersonateAccount(address);
    await setBalance(address, ethers.utils.parseEther('1000'));
  }

  const [testUser] = await hre.ethers.getSigners();

  await setBalance(testUser.address, ethers.utils.parseEther('1000'));

  const upgradeSigner = await hre.ethers.getSigner(tx.from!);
  const acAdminSigner = await hre.ethers.getSigner(acAdminAddress);

  await upgradeSigner.sendTransaction(tx);

  const mToken = await hre.ethers.getContractAt(
    'IMToken',
    addresses![upgradeParams.mToken]!.token!,
    testUser,
  );
  const manageableVault = await hre.ethers.getContractAt(
    'ManageableVault',
    upgradeParams.proxyAddress,
    testUser,
  );
  const mTokenDataFeed = await hre.ethers.getContractAt(
    'DataFeed',
    await manageableVault.mTokenDataFeed(),
    testUser,
  );

  const aggregator = await hre.ethers.getContractAt(
    'CustomAggregatorV3CompatibleFeed',
    await mTokenDataFeed.aggregator(),
    testUser,
  );

  const newPToken = await (
    await hre.ethers.getContractFactory('ERC20Mock', testUser)
  ).deploy(18);

  const rolesToGrant = [
    roles.depositVaultAdmin,
    roles.redemptionVaultAdmin,
    roles.minter,
    roles.burner,
    roles.customFeedAdmin,
  ].filter((role) => role !== null);

  await acContract.connect(acAdminSigner).grantRoleMult(
    rolesToGrant,
    rolesToGrant.map(() => testUser.address),
  );

  if (roles.customFeedAdmin) {
    await aggregator.setRoundDataSafe(await aggregator.lastAnswer());
  }

  if (await manageableVault.greenlistEnabled()) {
    await manageableVault.setGreenlistEnable(false);
  }

  await manageableVault.addPaymentToken(
    newPToken.address,
    mTokenDataFeed.address,
    0,
    constants.MaxUint256,
    false,
  );

  await manageableVault.setInstantDailyLimit(constants.MaxUint256);

  const minMTokenAmount = (await manageableVault.minAmount()).mul(2);

  if (upgradeParams.vaultType.startsWith('depositVault')) {
    const depositVault = await hre.ethers.getContractAt(
      'DepositVault',
      upgradeParams.proxyAddress,
      testUser,
    );

    await acContract
      .connect(acAdminSigner)
      .grantRole(roles.minter, depositVault.address);

    const minForFirstDeposit = (
      await depositVault.minMTokenAmountForFirstDeposit()
    ).mul(2);

    const amountToDeposit = bigNumberMax(
      bigNumberMax(minMTokenAmount, minForFirstDeposit),
      parseUnits('10'),
    );

    await newPToken.mint(testUser.address, amountToDeposit.mul(4));
    await newPToken.approve(depositVault.address, amountToDeposit.mul(4));

    // regular deposit instant
    await depositVault['depositInstant(address,uint256,uint256,bytes32)'](
      newPToken.address,
      amountToDeposit,
      constants.Zero,
      constants.HashZero,
    );

    // deposit instant with custom recipient
    await depositVault[
      'depositInstant(address,uint256,uint256,bytes32,address)'
    ](
      newPToken.address,
      amountToDeposit,
      constants.Zero,
      constants.HashZero,
      testUser.address,
    );

    // regular deposit request
    await depositVault['depositRequest(address,uint256,bytes32)'](
      newPToken.address,
      amountToDeposit,
      constants.HashZero,
    );

    // deposit request with custom recipient
    await depositVault['depositRequest(address,uint256,bytes32,address)'](
      newPToken.address,
      amountToDeposit,
      constants.HashZero,
      testUser.address,
    );
  } else if (upgradeParams.vaultType.startsWith('redemptionVault')) {
    const redemptionVault = await hre.ethers.getContractAt(
      'RedemptionVault',
      upgradeParams.proxyAddress,
      testUser,
    );

    await acContract
      .connect(acAdminSigner)
      .grantRole(roles.minter, redemptionVault.address);

    const amountToRedeem = bigNumberMax(minMTokenAmount, parseUnits('10'));

    await mToken.mint(testUser.address, amountToRedeem.mul(4));
    await mToken.approve(redemptionVault.address, amountToRedeem.mul(4));
    await newPToken.mint(redemptionVault.address, amountToRedeem.mul(8));

    // regular redeem instant
    await redemptionVault['redeemInstant(address,uint256,uint256)'](
      newPToken.address,
      amountToRedeem,
      constants.Zero,
    );

    // redeem instant with custom recipient
    await redemptionVault['redeemInstant(address,uint256,uint256,address)'](
      newPToken.address,
      amountToRedeem,
      constants.Zero,
      testUser.address,
    );

    // regular redeem request
    await redemptionVault['redeemRequest(address,uint256)'](
      newPToken.address,
      amountToRedeem,
    );

    // redeem request with custom recipient
    await redemptionVault['redeemRequest(address,uint256,address)'](
      newPToken.address,
      amountToRedeem,
      testUser.address,
    );
  } else {
    throw new Error('Contract type not supported');
  }

  console.log('Contract upgrade validation passed');
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
  validateSimulation: boolean,
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

  if (validateSimulation && !isOperationReady) {
    throw new Error('Operation is not ready or not found');
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
    throw new Error('Operation is already exists');
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
  txSendCallback?: (tx: PopulatedTransaction) => Promise<unknown>,
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
        throw new Error(
          `Already using new implementation for ${params.proxyAddress}`,
        );
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
    txSendCallback,
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
        throw new Error(
          `NewOwner ${params.newOwner} is already the owner of proxy admin`,
        );
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
  txSendCallback?: (tx: PopulatedTransaction) => Promise<unknown>,
): Promise<boolean> => {
  const { isValid, calldata, txComments } = await validateParams(hre);

  if (!isValid || !calldata) {
    console.log('Validation is not passed, skipping...');
    return false;
  }

  const admin = (await hre.upgrades.admin.getInstance()) as ProxyAdmin;

  const networkAddresses = getCurrentAddresses(hre);

  const timelockContract = await hre.ethers.getContractAt(
    'MidasTimelockController',
    networkAddresses!.timelock!,
  );

  const currentAdminOwner = await admin.owner();

  if (!hre.skipValidation) {
    if (
      currentAdminOwner.toLowerCase() !== timelockContract.address.toLowerCase()
    ) {
      throw new Error(
        `Admin owner ${currentAdminOwner} is not the timelock contract ${timelockContract.address}`,
      );
    }

    const { status, err } = await hre.ethers.provider
      .call({
        to: admin.address,
        from: timelockContract.address,
        data: calldata,
      })
      .then((returnData) => {
        const revertReason = parseRevertReason(returnData);
        return { status: revertReason === null, err: revertReason };
      });

    if (!status) {
      throw new Error(`Simulation failed: ${err}`);
    }
  }

  const saltHash = solidityKeccak256(['string'], [salt]);

  let { operationHash, type, tx, verifyParameters } = await populateTx(
    timelockContract,
    admin.address,
    saltHash,
    calldata,
    !hre.skipValidation,
  );

  if (!tx) {
    console.warn('Skipping sending tx, operation hash: ', operationHash);
    return false;
  }

  const [caller] =
    type === 'propose'
      ? await timelockContract.getInitialProposers()
      : await timelockContract.getInitialExecutors();

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
    tx.from = ownerForSignature;
  }

  console.log(`Timelock operation id for: ${operationHash}`);
  console.log('Verify parameters: ', verifyParameters);

  if (!txSendCallback) {
    const comment = txComments?.[type] ?? '';
    const res = await sendAndWaitForCustomTxSign(hre, tx, {
      action: 'update-timelock',
      subAction: 'timelock-call-upgrade',
      comment,
    });

    console.log('Transaction successfully submitted', res);
  } else {
    await txSendCallback(tx);
  }

  return true;
};

function parseRevertReason(data: string) {
  try {
    // 0x08c379a0 = Error(string)
    if (data.startsWith('0x08c379a0')) {
      const reason = ethers.utils.defaultAbiCoder.decode(
        ['string'],
        '0x' + data.slice(10), // strip function selector
      );
      return reason[0];
    }

    // 0x4e487b71 = Panic(uint256)
    if (data.startsWith('0x4e487b71')) {
      const code = ethers.utils.defaultAbiCoder.decode(
        ['uint256'],
        '0x' + data.slice(10),
      );
      return `Panic code: ${code[0].toString()}`;
    }

    return null;
  } catch (err) {
    return `Failed to decode: ${err}`;
  }
}
