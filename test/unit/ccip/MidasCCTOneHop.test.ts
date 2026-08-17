import { loadFixture } from '@nomicfoundation/hardhat-network-helpers';
import { expect } from 'chai';
import { BigNumber, BigNumberish, Contract, ContractReceipt } from 'ethers';

import {
  MessageExecutionState,
  ccipV2LaneFixture,
  executeV2,
  sendV2,
} from '../../common/ccip-v2.fixture';
import { RecoveryStatus, ccipEscrow } from '../../common/ccip.helpers';

type Lane = Awaited<ReturnType<typeof ccipV2LaneFixture>>;

type RecoveryRecord = {
  originalSender: string;
  originalRecipient: string;
  originalSourceChainSelector: BigNumber;
  amount: BigNumber;
  status: number;
  returnable: boolean;
  outboundCcipMessageId: string;
};

type EncodedOutbound = {
  messageId: string;
  encodedMessage: string;
  ccvs: string[];
  verifierResults: string[];
};

const parseEvent = (
  receipt: ContractReceipt,
  contract: Contract,
  eventName: string,
) => {
  const topic = contract.interface.getEventTopic(eventName);
  const log = receipt.logs.find(
    (candidate) =>
      candidate.address.toLowerCase() === contract.address.toLowerCase() &&
      candidate.topics[0] === topic,
  );
  if (!log) throw new Error(`${eventName} was not emitted`);
  return contract.interface.parseLog(log);
};

const newestRecoveryId = async (escrow: Contract, receipt: ContractReceipt) => {
  const recoveryEscrow = ccipEscrow(escrow.address, escrow.signer);
  const topic = recoveryEscrow.interface.getEventTopic('RecoveryRegistered');
  const log = receipt.logs.find(
    (candidate) =>
      candidate.address.toLowerCase() === escrow.address.toLowerCase() &&
      candidate.topics[0] === topic,
  );
  if (!log) throw new Error('RecoveryRegistered was not emitted');
  return recoveryEscrow.interface.parseLog(log).args.recoveryId as string;
};

const readRecovery = async (
  escrow: Contract,
  recoveryId: string,
): Promise<RecoveryRecord> => {
  const recovery = (await ccipEscrow(escrow.address, escrow.signer).recoveries(
    recoveryId,
  )) as RecoveryRecord;
  return {
    ...recovery,
    originalSourceChainSelector: BigNumber.from(
      recovery.originalSourceChainSelector,
    ),
    amount: BigNumber.from(recovery.amount),
    status: Number(recovery.status),
  };
};

const pendingCount = (escrow: Contract) =>
  ccipEscrow(escrow.address, escrow.signer).pendingCount();

const prepareInitialFallback = async (lane: Lane, amount: BigNumberish) => {
  await lane.accessControl.grantRole(
    await lane.b.token.BLACKLISTED_ROLE(),
    lane.bob.address,
  );
  const outbound = await sendV2(
    lane.a,
    lane.b,
    lane.alice,
    lane.bob.address,
    amount,
  );
  const execution = await executeV2(lane.b, outbound);
  expect(execution.state).eq(MessageExecutionState.SUCCESS);
  const recoveryId = await newestRecoveryId(lane.b.escrow, execution.receipt);
  return { outbound, execution, recoveryId };
};

const dispatchReturn = async (
  lane: Lane,
  recoveryId: string,
  admin = false,
): Promise<EncodedOutbound> => {
  const signer = admin ? lane.owner : lane.bob;
  const escrow = ccipEscrow(lane.b.escrow.address, signer);
  const fee = await escrow.getReturnToSourceFee(recoveryId);
  const transaction = await escrow.returnToSource(recoveryId, { value: fee });
  const receipt = await transaction.wait();
  const sent = parseEvent(receipt, lane.b.onRamp, 'CCIPMessageSent');
  const verifierResults = [...sent.args.verifierBlobs] as string[];
  const receipts = [...sent.args.receipts] as Array<{ issuer: string }>;
  return {
    messageId: sent.args.messageId,
    encodedMessage: sent.args.encodedMessage,
    verifierResults,
    ccvs: receipts
      .slice(0, verifierResults.length)
      .map((entry) => entry.issuer),
  };
};

const executeEncoded = async (
  destination: Lane['a'],
  outbound: EncodedOutbound,
) => {
  const transaction = await destination.offRamp.execute(
    outbound.encodedMessage,
    outbound.ccvs,
    outbound.verifierResults,
    0,
    { gasLimit: 12_000_000 },
  );
  const receipt = await transaction.wait();
  return {
    receipt,
    state: Number(
      await destination.offRamp.getExecutionState(outbound.messageId),
    ),
  };
};

const prepareReturnedFallback = async (lane: Lane, amount: BigNumberish) => {
  await ccipEscrow(lane.a.escrow.address, lane.owner).setPeerEscrow(
    lane.b.selector,
    lane.b.escrow.address,
    true,
  );
  const initial = await prepareInitialFallback(lane, amount);
  await lane.accessControl.grantRole(
    await lane.a.token.BLACKLISTED_ROLE(),
    lane.alice.address,
  );
  const returned = await dispatchReturn(lane, initial.recoveryId);
  const execution = await executeEncoded(lane.a, returned);
  expect(execution.state).eq(MessageExecutionState.SUCCESS);
  const sourceRecoveryId = await newestRecoveryId(
    lane.a.escrow,
    execution.receipt,
  );
  return { initial, returned, execution, sourceRecoveryId };
};

describe('Midas CCIP one-hop return outcomes', () => {
  it('completes a return to an eligible original sender without a new recovery', async () => {
    const lane = await loadFixture(ccipV2LaneFixture);
    const amount = 7;
    const initial = await prepareInitialFallback(lane, amount);
    const aliceBefore = await lane.a.token.balanceOf(lane.alice.address);
    const pendingBefore = await pendingCount(lane.a.escrow);
    const returned = await dispatchReturn(lane, initial.recoveryId);
    const execution = await executeEncoded(lane.a, returned);

    expect(execution.state).eq(MessageExecutionState.SUCCESS);
    expect(await lane.a.token.balanceOf(lane.alice.address)).eq(
      aliceBefore.add(amount),
    );
    expect(await pendingCount(lane.a.escrow)).eq(pendingBefore);
    expect((await readRecovery(lane.b.escrow, initial.recoveryId)).status).eq(
      RecoveryStatus.ReturnDispatched,
    );
  });

  it('parks a failed return mint in source escrow as one funded recovery', async () => {
    const lane = await loadFixture(ccipV2LaneFixture);
    const amount = 11;
    const initial = await prepareInitialFallback(lane, amount);
    await lane.accessControl.grantRole(
      await lane.a.token.BLACKLISTED_ROLE(),
      lane.alice.address,
    );
    const pendingBefore = await pendingCount(lane.a.escrow);
    const returned = await dispatchReturn(lane, initial.recoveryId);
    const execution = await executeEncoded(lane.a, returned);
    const sourceRecoveryId = await newestRecoveryId(
      lane.a.escrow,
      execution.receipt,
    );

    expect(execution.state).eq(MessageExecutionState.SUCCESS);
    expect(await lane.a.token.balanceOf(lane.a.escrow.address)).eq(amount);
    expect(await pendingCount(lane.a.escrow)).eq(pendingBefore.add(1));
    const record = await readRecovery(lane.a.escrow, sourceRecoveryId);
    expect(record.originalRecipient).eq(lane.alice.address);
    expect(record.amount).eq(amount);
  });

  it('marks a fallback from the configured peer escrow non-returnable', async () => {
    const lane = await loadFixture(ccipV2LaneFixture);
    const result = await prepareReturnedFallback(lane, 1);
    const record = await readRecovery(lane.a.escrow, result.sourceRecoveryId);
    expect(record.originalSender).eq(lane.b.escrow.address);
    expect(record.originalSourceChainSelector).eq(lane.b.selector);
    expect(record.returnable).eq(false);
  });

  it('resolves the return-generated record locally after the original sender becomes eligible', async () => {
    const lane = await loadFixture(ccipV2LaneFixture);
    const result = await prepareReturnedFallback(lane, 3);
    await lane.accessControl.revokeRole(
      await lane.a.token.BLACKLISTED_ROLE(),
      lane.alice.address,
    );
    const before = await lane.a.token.balanceOf(lane.carol.address);
    await ccipEscrow(lane.a.escrow.address, lane.alice).claim(
      result.sourceRecoveryId,
      lane.carol.address,
    );

    expect(await lane.a.token.balanceOf(lane.carol.address)).eq(before.add(3));
    expect(
      (await readRecovery(lane.a.escrow, result.sourceRecoveryId)).status,
    ).eq(RecoveryStatus.Claimed);
  });

  it('permits admin local recovery or confiscation of return-generated records', async () => {
    const lane = await loadFixture(ccipV2LaneFixture);
    const first = await prepareReturnedFallback(lane, 2);
    await lane.accessControl.revokeRole(
      await lane.a.token.BLACKLISTED_ROLE(),
      lane.alice.address,
    );
    const secondInitial = await prepareInitialFallback(lane, 5);
    await lane.accessControl.grantRole(
      await lane.a.token.BLACKLISTED_ROLE(),
      lane.alice.address,
    );
    const secondReturned = await dispatchReturn(
      lane,
      secondInitial.recoveryId,
      true,
    );
    const secondExecution = await executeEncoded(lane.a, secondReturned);
    const secondRecoveryId = await newestRecoveryId(
      lane.a.escrow,
      secondExecution.receipt,
    );
    const escrow = ccipEscrow(lane.a.escrow.address, lane.owner);

    await escrow.adminRecoverBulk([
      { recoveryId: first.sourceRecoveryId, recipient: lane.carol.address },
    ]);
    await escrow.confiscateBulk([secondRecoveryId]);
    expect(
      (await readRecovery(lane.a.escrow, first.sourceRecoveryId)).status,
    ).eq(RecoveryStatus.AdminRecovered);
    expect((await readRecovery(lane.a.escrow, secondRecoveryId)).status).eq(
      RecoveryStatus.Confiscated,
    );
  });

  it('rejects any attempt to return a return-generated record again', async () => {
    const lane = await loadFixture(ccipV2LaneFixture);
    const result = await prepareReturnedFallback(lane, 1);
    const bobEscrow = ccipEscrow(lane.a.escrow.address, lane.alice);
    const adminEscrow = ccipEscrow(lane.a.escrow.address, lane.owner);

    await expect(
      bobEscrow.returnToSource(result.sourceRecoveryId, { value: 0 }),
    ).revertedWithCustomError(bobEscrow, 'RecoveryNotReturnable');
    await expect(
      adminEscrow.returnToSource(result.sourceRecoveryId, { value: 0 }),
    ).revertedWithCustomError(adminEscrow, 'RecoveryNotReturnable');
  });

  it('keeps the outbound return accepted when both original-sender mint and source fallback fail', async () => {
    const lane = await loadFixture(ccipV2LaneFixture);
    await ccipEscrow(lane.a.escrow.address, lane.owner).setPeerEscrow(
      lane.b.selector,
      lane.b.escrow.address,
      true,
    );
    const initial = await prepareInitialFallback(lane, 7);
    await lane.accessControl.grantRole(
      await lane.a.token.BLACKLISTED_ROLE(),
      lane.alice.address,
    );
    await lane.accessControl.grantRole(
      await lane.a.token.BLACKLISTED_ROLE(),
      lane.a.escrow.address,
    );
    const returned = await dispatchReturn(lane, initial.recoveryId);
    const pendingBefore = await pendingCount(lane.a.escrow);
    const execution = await executeEncoded(lane.a, returned);

    expect(execution.state).eq(MessageExecutionState.FAILURE);
    expect(await pendingCount(lane.a.escrow)).eq(pendingBefore);
    expect((await readRecovery(lane.b.escrow, initial.recoveryId)).status).eq(
      RecoveryStatus.ReturnDispatched,
    );
  });

  it('manually executes the same failed return once after repair', async () => {
    const lane = await loadFixture(ccipV2LaneFixture);
    await ccipEscrow(lane.a.escrow.address, lane.owner).setPeerEscrow(
      lane.b.selector,
      lane.b.escrow.address,
      true,
    );
    const initial = await prepareInitialFallback(lane, 7);
    await lane.accessControl.grantRole(
      await lane.a.token.BLACKLISTED_ROLE(),
      lane.alice.address,
    );
    await lane.accessControl.grantRole(
      await lane.a.token.BLACKLISTED_ROLE(),
      lane.a.escrow.address,
    );
    const returned = await dispatchReturn(lane, initial.recoveryId);
    expect((await executeEncoded(lane.a, returned)).state).eq(
      MessageExecutionState.FAILURE,
    );
    await lane.accessControl.revokeRole(
      await lane.a.token.BLACKLISTED_ROLE(),
      lane.a.escrow.address,
    );

    const retried = await executeEncoded(lane.a, returned);
    expect(retried.state).eq(MessageExecutionState.SUCCESS);
    expect(await pendingCount(lane.a.escrow)).eq(1);
    await expect(executeEncoded(lane.a, returned)).reverted;
  });

  it('leaves no recovery when source-side base validation rejects the return', async () => {
    const lane = await loadFixture(ccipV2LaneFixture);
    const amount = 2;
    const initial = await prepareInitialFallback(lane, amount);
    const returned = await dispatchReturn(lane, initial.recoveryId);
    await lane.a.pool.setRateLimitConfig([
      {
        remoteChainSelector: lane.b.selector,
        fastFinality: false,
        outboundRateLimiterConfig: {
          isEnabled: false,
          capacity: 0,
          rate: 0,
        },
        inboundRateLimiterConfig: {
          isEnabled: true,
          capacity: 1,
          rate: 1,
        },
      },
    ]);
    const pendingBefore = await pendingCount(lane.a.escrow);
    const failed = await executeEncoded(lane.a, returned);

    expect(failed.state).eq(MessageExecutionState.FAILURE);
    expect(await pendingCount(lane.a.escrow)).eq(pendingBefore);
    await lane.a.pool.setRateLimitConfig([
      {
        remoteChainSelector: lane.b.selector,
        fastFinality: false,
        outboundRateLimiterConfig: {
          isEnabled: false,
          capacity: 0,
          rate: 0,
        },
        inboundRateLimiterConfig: {
          isEnabled: false,
          capacity: 0,
          rate: 0,
        },
      },
    ]);
    expect((await executeEncoded(lane.a, returned)).state).eq(
      MessageExecutionState.SUCCESS,
    );
  });
});
