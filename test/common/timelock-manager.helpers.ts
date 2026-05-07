import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { expect } from 'chai';
import { BigNumberish, ethers } from 'ethers';

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
    .setRoleTimelocks.bind(this, roles, delays);

  if (await handleRevert(callFn, timelockManager, opt)) {
    return;
  }

  await expect(callFn()).to.not.reverted;

  for (const [index, role] of roles.entries()) {
    expect(await timelockManager.roleTimelocks(role)).eq(delays[index]);
  }
};

export const scheduleTimelockTransactionTester = async (
  { timelockManager, timelock, owner }: CommonParamsTimelock,
  target: string,
  data: string,
  opt?: OptionalCommonParams,
) => {
  const from = opt?.from ?? owner;

  const callFn = timelockManager
    .connect(from)
    .scheduleTimelockTransactions.bind(this, [target], [data]);

  if (await handleRevert(callFn, timelockManager, opt)) {
    return;
  }

  const txPromise = callFn();
  await expect(txPromise).to.not.reverted;

  const calldataWithCaller = ethers.utils.solidityPack(
    ['bytes', 'address'],
    [data, from.address],
  );

  const operationId = await timelock.hashOperation(
    target,
    0,
    calldataWithCaller,
    ethers.constants.HashZero,
    ethers.constants.HashZero,
  );

  expect(await timelock.isOperation(operationId)).to.be.true;
  expect(await timelock.isOperationReady(operationId)).to.be.false;
  expect(await timelock.isOperationDone(operationId)).to.be.false;
  expect(await timelock.isOperationPending(operationId)).to.be.true;
};

export const executeTimelockTransactionTester = async (
  { timelockManager, timelock, owner }: CommonParamsTimelock,
  target: string,
  data: string,
  originalCaller: string,
  opt?: OptionalCommonParams,
) => {
  const from = opt?.from ?? owner;

  const callFn = timelockManager
    .connect(from)
    .executeTimelockTransaction.bind(this, target, data, originalCaller);

  if (await handleRevert(callFn, timelockManager, opt)) {
    return;
  }

  const txPromise = callFn();
  await expect(txPromise).to.not.reverted;

  const calldataWithCaller = ethers.utils.solidityPack(
    ['bytes', 'address'],
    [data, originalCaller],
  );

  const operationId = await timelock.hashOperation(
    target,
    0,
    calldataWithCaller,
    ethers.constants.HashZero,
    ethers.constants.HashZero,
  );

  expect(await timelock.isOperation(operationId)).to.be.true;
  expect(await timelock.isOperationReady(operationId)).to.be.false;
  expect(await timelock.isOperationDone(operationId)).to.be.true;
  expect(await timelock.isOperationPending(operationId)).to.be.false;
};
