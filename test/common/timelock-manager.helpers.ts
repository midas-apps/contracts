import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { expect } from 'chai';
import { BigNumber, BigNumberish, ethers } from 'ethers';

import {
  OptionalCommonParams,
  getCurrentBlockTimestamp,
  handleRevert,
} from './common.helpers';

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

export const bulkScheduleTimelockOperationTester = async (
  { timelockManager, timelock, owner }: CommonParamsTimelock,
  target: string[],
  data: string[],
  { isSetCouncilOperation }: { isSetCouncilOperation?: boolean } = {},
  opt?: OptionalCommonParams,
) => {
  const from = opt?.from ?? owner;
  isSetCouncilOperation ??= false;

  const params = target.map((target, index) => ({
    target,
    data: data[index],
  }));

  const callFn = timelockManager
    .connect(from)
    .bulkScheduleTimelockOperation.bind(this, params);

  if (await handleRevert(callFn, timelockManager, opt)) {
    return [];
  }

  const councilVersionBefore = await timelockManager.securityCouncilVersion();

  const txPromise = callFn();
  await txPromise;
  // await expect(txPromise).to.not.reverted;
  const councilVersionAfter = await timelockManager.securityCouncilVersion();

  expect(councilVersionAfter).to.be.equal(councilVersionBefore);

  const operationIds: string[] = [];
  for (const [index, operationTarget] of target.entries()) {
    const operationData = data[index];
    operationIds.push(
      await validateOperationDetails({
        timelockManager,
        timelock,
        from,
        operationTarget,
        operationData,
        isSetCouncilOperation,
        councilVersionBefore,
      }),
    );
  }

  return operationIds;
};

export const scheduleTimelockOperationTester = async (
  { timelockManager, timelock, owner }: CommonParamsTimelock,
  target: string,
  data: string,
  { isSetCouncilOperation }: { isSetCouncilOperation?: boolean } = {},
  opt?: OptionalCommonParams,
) => {
  const from = opt?.from ?? owner;
  isSetCouncilOperation ??= false;

  const callFn = timelockManager
    .connect(from)
    .scheduleTimelockOperation.bind(this, { target, data });

  if (await handleRevert(callFn, timelockManager, opt)) {
    return [];
  }

  const councilVersionBefore = await timelockManager.securityCouncilVersion();

  const txPromise = callFn();
  await txPromise;
  // await expect(txPromise).to.not.reverted;
  const councilVersionAfter = await timelockManager.securityCouncilVersion();

  expect(councilVersionAfter).to.be.equal(councilVersionBefore);

  const operationIds: string[] = [];

  return [
    await validateOperationDetails({
      timelockManager,
      timelock,
      from,
      operationTarget: target,
      operationData: data,
      isSetCouncilOperation,
      councilVersionBefore,
    }),
  ];
};

const validateOperationDetails = async ({
  timelockManager,
  timelock,
  from,
  operationTarget,
  operationData,
  isSetCouncilOperation,
  councilVersionBefore,
}: {
  operationTarget: string;
  operationData: string;
  timelockManager: MidasTimelockManager;
  timelock: MidasAccessControlTimelockController;
  from: SignerWithAddress;
  isSetCouncilOperation: boolean;
  councilVersionBefore: BigNumber;
}) => {
  const blockTimestamp = await getCurrentBlockTimestamp();

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

  const details = await timelockManager.getOperationDetails(operationId);
  expect(details.status).to.be.equal(1);
  expect(details.pauser).to.be.equal(ethers.constants.AddressZero);
  expect(details.operationProposer).to.be.equal(from.address);
  expect(details.dataHash).to.be.equal(dataHash);
  expect(details.votesForExecution).to.be.equal(0);
  expect(details.votesForVeto).to.be.equal(0);
  expect(details.createdAt).to.be.equal(blockTimestamp);
  expect(details.executionApprovedAt).to.be.equal(0);
  expect(details.pauseReasonCode).to.be.equal(0);
  expect(details.councilVersion).to.be.equal(councilVersionBefore);
  expect(details.isSetCouncilOperation).to.be.equal(isSetCouncilOperation);

  return operationId;
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
    .executeTimelockOperation.bind(this, target, data);

  if (await handleRevert(callFn, timelockManager, opt)) {
    return;
  }

  const dataHash = getDataHash(target, data);

  const dataHashIndexBefore = await timelockManager.dataHashIndexes(dataHash);

  const operationId = await timelock.hashOperation(
    target,
    0,
    data,
    ethers.constants.HashZero,
    getTimelockSalt(dataHashIndexBefore),
  );

  const detailsBefore = await timelockManager.getOperationDetails(operationId);

  const txPromise = callFn();
  await expect(txPromise).to.not.reverted;

  const dataHashIndexAfter = await timelockManager.dataHashIndexes(dataHash);

  expect(dataHashIndexAfter).to.eq(dataHashIndexBefore.add(1));

  expect(await timelock.isOperation(operationId)).to.be.true;
  expect(await timelock.isOperationReady(operationId)).to.be.false;
  expect(await timelock.isOperationDone(operationId)).to.be.true;
  expect(await timelock.isOperationPending(operationId)).to.be.false;

  const detailsAfter = await timelockManager.getOperationDetails(operationId);

  expect(detailsAfter.status).to.be.equal(8);
  expect(detailsAfter.pauser).to.be.equal(detailsBefore.pauser);
  expect(detailsAfter.operationProposer).to.be.equal(
    detailsBefore.operationProposer,
  );
  expect(detailsAfter.dataHash).to.be.equal(detailsBefore.dataHash);
  expect(detailsAfter.votesForExecution).to.be.equal(
    detailsBefore.votesForExecution,
  );
  expect(detailsAfter.votesForVeto).to.be.equal(detailsBefore.votesForVeto);
  expect(detailsAfter.createdAt).to.be.equal(detailsBefore.createdAt);
  expect(detailsAfter.executionApprovedAt).to.be.equal(
    detailsBefore.executionApprovedAt,
  );
  expect(detailsAfter.pauseReasonCode).to.be.equal(
    detailsBefore.pauseReasonCode,
  );
  expect(detailsAfter.councilVersion).to.be.equal(detailsBefore.councilVersion);
  expect(detailsAfter.isSetCouncilOperation).to.be.equal(
    detailsBefore.isSetCouncilOperation,
  );
};

export const setSecurityCouncilTest = async (
  { timelockManager, owner }: CommonParamsTimelock,
  members: string[],
  opt?: OptionalCommonParams,
) => {
  const from = opt?.from ?? owner;
  const callFn = timelockManager
    .connect(from)
    .setSecurityCouncil.bind(this, members);

  if (await handleRevert(callFn, timelockManager, opt)) {
    return;
  }

  const councilVersionBefore = await timelockManager.securityCouncilVersion();
  const oldCouncilBefore = await timelockManager.getSecurityCouncilMembers(
    councilVersionBefore,
  );

  await expect(callFn()).to.not.reverted;
  const oldCouncilAfter = await timelockManager.getSecurityCouncilMembers(
    councilVersionBefore,
  );

  const councilVersionAfter = await timelockManager.securityCouncilVersion();

  expect(councilVersionAfter).to.be.equal(councilVersionBefore.add(1));
  const currentCouncilAfter = await timelockManager.getSecurityCouncilMembers(
    councilVersionAfter,
  );
  expect(currentCouncilAfter.length).to.be.equal(members.length);
  for (const member of members) {
    expect(currentCouncilAfter.includes(member)).to.be.true;
  }

  // check that old council is not changed
  for (const member of oldCouncilBefore) {
    expect(oldCouncilAfter.includes(member)).to.be.true;
  }
};

export const pauseTimelockOperationTest = async (
  { timelockManager, owner }: CommonParamsTimelock,
  operationId: string,
  pauseReasonCode: BigNumberish = 1,
  opt?: OptionalCommonParams,
) => {
  const from = opt?.from ?? owner;
  const callFn = timelockManager
    .connect(from)
    .pauseOperation.bind(this, operationId, pauseReasonCode);

  if (await handleRevert(callFn, timelockManager, opt)) {
    return;
  }

  const detailsBefore = await timelockManager.getOperationDetails(operationId);

  await expect(callFn()).to.not.reverted;

  const details = await timelockManager.getOperationDetails(operationId);

  expect(details.status).to.be.equal(2);
  expect(details.pauser).to.be.equal(from.address);
  expect(details.pauseReasonCode).to.be.equal(pauseReasonCode);
  expect(details.councilVersion).to.be.equal(detailsBefore.councilVersion);
  expect(details.operationProposer).to.be.equal(
    detailsBefore.operationProposer,
  );
  expect(details.dataHash).to.be.equal(detailsBefore.dataHash);
  expect(details.votesForExecution).to.be.equal(0);
  expect(details.votesForVeto).to.be.equal(0);
  expect(details.isSetCouncilOperation).to.be.equal(
    detailsBefore.isSetCouncilOperation,
  );
  expect(details.createdAt).to.be.equal(detailsBefore.createdAt);
  expect(details.executionApprovedAt).to.be.equal(0);
};

export const voteForVetoTest = async (
  { timelockManager, owner }: CommonParamsTimelock,
  operationId: string,
  opt?: OptionalCommonParams,
) => {
  const from = opt?.from ?? owner;
  const callFn = timelockManager
    .connect(from)
    .voteForVeto.bind(this, operationId);

  if (await handleRevert(callFn, timelockManager, opt)) {
    return;
  }

  const detailsBefore = await timelockManager.getOperationDetails(operationId);

  await expect(callFn()).to.not.reverted;

  const quorum = await timelockManager.councilQuorum(
    detailsBefore.councilVersion,
  );

  const details = await timelockManager.getOperationDetails(operationId);
  expect(details.pauser).to.be.equal(detailsBefore.pauser);
  expect(details.pauseReasonCode).to.be.equal(detailsBefore.pauseReasonCode);
  expect(details.councilVersion).to.be.equal(detailsBefore.councilVersion);
  expect(details.operationProposer).to.be.equal(
    detailsBefore.operationProposer,
  );
  expect(details.dataHash).to.be.equal(detailsBefore.dataHash);
  expect(details.votesForExecution).to.be.equal(
    detailsBefore.votesForExecution,
  );
  expect(details.votesForVeto).to.be.equal(detailsBefore.votesForVeto + 1);

  if (details.votesForVeto >= quorum) {
    expect(details.status).to.be.equal(5);
  } else {
    expect(details.status).to.be.equal(detailsBefore.status);
  }
};

export const voteForExecutionTest = async (
  { timelockManager, owner }: CommonParamsTimelock,
  operationId: string,
  opt?: OptionalCommonParams,
) => {
  const from = opt?.from ?? owner;
  const callFn = timelockManager
    .connect(from)
    .voteForExecution.bind(this, operationId);

  if (await handleRevert(callFn, timelockManager, opt)) {
    return;
  }

  const detailsBefore = await timelockManager.getOperationDetails(operationId);

  await expect(callFn()).to.not.reverted;

  const quorum = await timelockManager.councilQuorum(
    detailsBefore.councilVersion,
  );

  const details = await timelockManager.getOperationDetails(operationId);
  expect(details.pauser).to.be.equal(detailsBefore.pauser);
  expect(details.pauseReasonCode).to.be.equal(detailsBefore.pauseReasonCode);
  expect(details.councilVersion).to.be.equal(detailsBefore.councilVersion);
  expect(details.operationProposer).to.be.equal(
    detailsBefore.operationProposer,
  );
  expect(details.dataHash).to.be.equal(detailsBefore.dataHash);
  expect(details.votesForExecution).to.be.equal(
    detailsBefore.votesForExecution + 1,
  );
  expect(details.votesForVeto).to.be.equal(detailsBefore.votesForVeto);

  if (details.votesForExecution >= quorum) {
    expect(details.status).to.be.equal(3);
    expect(details.executionApprovedAt).to.be.equal(
      await getCurrentBlockTimestamp(),
    );
  } else {
    expect(details.status).to.be.equal(detailsBefore.status);
  }
};

export const abortOperationTest = async (
  { timelockManager, owner, timelock }: CommonParamsTimelock,
  operationId: string,
  opt?: OptionalCommonParams,
) => {
  const from = opt?.from ?? owner;
  const callFn = timelockManager
    .connect(from)
    .abortOperation.bind(this, operationId);

  if (await handleRevert(callFn, timelockManager, opt)) {
    return;
  }

  const detailsBefore = await timelockManager.getOperationDetails(operationId);

  const pendingSetCouncilOperationIdBefore =
    await timelockManager.pendingSetCouncilOperationId();

  const dataHashIndexBefore = await timelockManager.dataHashIndexes(
    detailsBefore.dataHash,
  );

  const pendingOperationsBefore = await timelockManager.getPendingOperations();
  const pendingOperationsPerProposerBefore =
    await timelockManager.proposerPendingOperationsCount(
      detailsBefore.operationProposer,
    );
  await expect(callFn()).to.not.reverted;

  const pendingOperationsPerProposerAfter =
    await timelockManager.proposerPendingOperationsCount(
      detailsBefore.operationProposer,
    );
  const pendingOperationsAfter = await timelockManager.getPendingOperations();

  expect(pendingOperationsAfter.length).to.be.equal(
    pendingOperationsBefore.length - 1,
  );
  expect(pendingOperationsAfter.includes(operationId)).to.be.false;

  expect(pendingOperationsPerProposerAfter).to.be.equal(
    pendingOperationsPerProposerBefore.sub(1),
  );

  const dataHashIndexAfter = await timelockManager.dataHashIndexes(
    detailsBefore.dataHash,
  );

  expect(dataHashIndexAfter).to.be.equal(dataHashIndexBefore.add(1));

  const pendingSetCouncilOperationIdAfter =
    await timelockManager.pendingSetCouncilOperationId();

  const details = await timelockManager.getOperationDetails(operationId);

  expect(details.status).to.be.equal(7);
  expect(details.pauser).to.be.equal(detailsBefore.pauser);
  expect(details.pauseReasonCode).to.be.equal(detailsBefore.pauseReasonCode);
  expect(details.councilVersion).to.be.equal(detailsBefore.councilVersion);
  expect(details.operationProposer).to.be.equal(
    detailsBefore.operationProposer,
  );
  expect(details.dataHash).to.be.equal(detailsBefore.dataHash);
  expect(details.votesForExecution).to.be.equal(
    detailsBefore.votesForExecution,
  );
  expect(details.votesForVeto).to.be.equal(detailsBefore.votesForVeto);
  expect(details.isSetCouncilOperation).to.be.equal(
    detailsBefore.isSetCouncilOperation,
  );
  expect(details.createdAt).to.be.equal(detailsBefore.createdAt);
  expect(details.executionApprovedAt).to.be.equal(
    detailsBefore.executionApprovedAt,
  );
  expect(await timelock.isOperation(operationId)).to.be.false;

  if (details.isSetCouncilOperation) {
    expect(pendingSetCouncilOperationIdAfter).to.be.equal(
      ethers.constants.HashZero,
    );
  } else {
    expect(pendingSetCouncilOperationIdAfter).to.be.equal(
      pendingSetCouncilOperationIdBefore,
    );
  }
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
