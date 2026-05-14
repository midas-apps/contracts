import { increase } from '@nomicfoundation/hardhat-network-helpers/dist/src/helpers/time';
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { expect } from 'chai';
import { BigNumber, BigNumberish, constants, ethers } from 'ethers';

import { OptionalCommonParams, handleRevert } from './common.helpers';

import {
  MidasAccessControl,
  MidasAccessControlTimelockController,
  MidasTimelockManager,
} from '../../typechain-types';

type CommonParamsTimelock = {
  timelockManager: MidasTimelockManager;
  accessControl: MidasAccessControl;
  timelock: MidasAccessControlTimelockController;
  owner: SignerWithAddress;
};

export const setRoleTimelocksTester = async (
  { timelockManager, owner }: CommonParamsTimelock,
  roles: string[],
  delays: BigNumberish[],
  opt?: OptionalCommonParams,
) => {
  const from = opt?.from ?? owner;

  const callFn = timelockManager
    .connect(from)
    .setRoleDelays.bind(this, roles, delays);

  if (await handleRevert(callFn, timelockManager, opt)) {
    return;
  }

  await expect(callFn()).to.not.reverted;

  for (const [index, role] of roles.entries()) {
    const delayParam = delays[index];
    const [delay, isDefault] = await timelockManager.getRoleTimelockDelay(role);
    const expectedDelay = BigNumber.from(0).eq(delayParam)
      ? 3600
      : constants.MaxUint256.eq(delayParam)
      ? 0
      : delayParam;

    expect(delay).eq(expectedDelay);
    expect(isDefault).eq(BigNumber.from(0).eq(delayParam));
  }
};

export const setMaxPendingOperationsPerProposerTester = async (
  { timelockManager, owner }: CommonParamsTimelock,
  maxPendingOperationsPerProposer: BigNumberish,
  opt?: OptionalCommonParams,
) => {
  const from = opt?.from ?? owner;
  const callFn = timelockManager
    .connect(from)
    .setMaxPendingOperationsPerProposer.bind(
      this,
      maxPendingOperationsPerProposer,
    );

  if (await handleRevert(callFn, timelockManager, opt)) {
    return;
  }

  await expect(callFn()).to.not.reverted;

  const actualMaxPendingOperationsPerProposer =
    await timelockManager.maxPendingOperationsPerProposer();

  expect(actualMaxPendingOperationsPerProposer).eq(
    maxPendingOperationsPerProposer,
  );
};

export const setRoleTimelocksAndExecute = async (
  { timelockManager, owner, accessControl, timelock }: CommonParamsTimelock,
  roles: string[],
  delays: BigNumberish[],
  opt?: OptionalCommonParams,
) => {
  const [delay] = await timelockManager.getRoleTimelockDelay(
    constants.HashZero,
  );

  const data = timelockManager.interface.encodeFunctionData('setRoleDelays', [
    roles,
    delays,
  ]);

  console.log('data', delay.toString());

  const from = opt?.from ?? owner;

  await scheduleTimelockOperationsTester(
    { timelockManager, timelock, owner, accessControl },
    [timelockManager.address],
    [data],
    { from },
  );

  await increase(delay.toNumber() + 1);

  await executeTimelockOperationTester(
    { timelockManager, timelock, owner, accessControl },
    timelockManager.address,
    data,
    from.address,
    { from },
  );
};

export const scheduleTimelockOperationsTester = async (
  { timelockManager, timelock, owner }: CommonParamsTimelock,
  target: string[],
  data: string[],
  opt?: OptionalCommonParams,
) => {
  const from = opt?.from ?? owner;

  const callFn =
    target.length > 1 || data.length > 1
      ? timelockManager
          .connect(from)
          .scheduleTimelockOperations.bind(this, target, data)
      : timelockManager
          .connect(from)
          .scheduleTimelockOperation.bind(this, target[0], data[0]);

  if (await handleRevert(callFn, timelockManager, opt)) {
    return;
  }

  const txPromise = callFn();
  await expect(txPromise).to.not.reverted;

  for (const [index, operationTarget] of target.entries()) {
    const operationData = ethers.utils.solidityPack(
      ['bytes', 'address'],
      [data[index], from.address],
    );

    const dataHash = getDataHash(operationTarget, operationData);

    const dataHashIndex = await timelockManager.dataHashIndexes(dataHash);

    const operationId = await timelock.hashOperation(
      operationTarget,
      0,
      operationData,
      ethers.constants.HashZero,
      getTimelockSalt(dataHashIndex),
    );

    expect(await timelock.isOperation(operationId)).to.be.true;
    expect(await timelock.isOperationReady(operationId)).to.be.false;
    expect(await timelock.isOperationDone(operationId)).to.be.false;
    expect(await timelock.isOperationPending(operationId)).to.be.true;
  }
};

export const executeTimelockOperationTester = async (
  { timelockManager, timelock, owner }: CommonParamsTimelock,
  target: string,
  data: string,
  originalCaller: string,
  opt?: OptionalCommonParams,
) => {
  const from = opt?.from ?? owner;

  const callFn = timelockManager
    .connect(from)
    .executeTimelockOperation.bind(this, target, data, originalCaller);

  if (await handleRevert(callFn, timelockManager, opt)) {
    return;
  }

  const calldataWithCaller = ethers.utils.solidityPack(
    ['bytes', 'address'],
    [data, originalCaller],
  );

  const dataHash = getDataHash(target, calldataWithCaller);

  const dataHashIndexBefore = await timelockManager.dataHashIndexes(dataHash);

  const txPromise = callFn();
  await expect(txPromise).to.not.reverted;

  const dataHashIndexAfter = await timelockManager.dataHashIndexes(dataHash);

  expect(dataHashIndexAfter).to.eq(dataHashIndexBefore.add(1));

  const operationId = await timelock.hashOperation(
    target,
    0,
    calldataWithCaller,
    ethers.constants.HashZero,
    getTimelockSalt(dataHashIndexBefore),
  );

  expect(await timelock.isOperation(operationId)).to.be.true;
  expect(await timelock.isOperationReady(operationId)).to.be.false;
  expect(await timelock.isOperationDone(operationId)).to.be.true;
  expect(await timelock.isOperationPending(operationId)).to.be.false;
};

const getTimelockSalt = (dataHashIndex: BigNumber) => {
  return ethers.utils.hexZeroPad(dataHashIndex.toHexString(), 32);
};
const getDataHash = (target: string, data: string) => {
  return ethers.utils.solidityKeccak256(
    ['address', 'uint256', 'bytes'],
    [target, 0, data],
  );
};
