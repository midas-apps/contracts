import { loadFixture } from '@nomicfoundation/hardhat-network-helpers';
import { expect } from 'chai';

import {
  MessageExecutionState,
  OutboundV2Message,
  ccipV2LaneFixture,
  executeV2,
  sendV2,
} from '../../common/ccip-v2.fixture';

type Lane = Awaited<ReturnType<typeof ccipV2LaneFixture>>;

const disabledRateLimiter = { isEnabled: false, capacity: 0, rate: 0 };

const setInboundRateLimit = async (
  lane: Lane,
  config: { isEnabled: boolean; capacity: number; rate: number },
) =>
  lane.b.pool.setRateLimitConfig([
    {
      remoteChainSelector: lane.a.selector,
      fastFinality: false,
      outboundRateLimiterConfig: disabledRateLimiter,
      inboundRateLimiterConfig: config,
    },
  ]);

const executeAs = async (
  lane: Lane,
  outbound: OutboundV2Message,
  signer: Lane['unlisted'],
) => {
  const transaction = await lane.b.offRamp
    .connect(signer)
    .execute(
      outbound.encodedMessage,
      outbound.ccvs,
      outbound.verifierResults,
      0,
      { gasLimit: 12_000_000 },
    );
  await transaction.wait();
  return Number(await lane.b.offRamp.getExecutionState(outbound.messageId));
};

describe('Midas CCIP retry and manual-execution boundaries', () => {
  it('treats a funded escrow fallback as CCIP SUCCESS', async () => {
    const lane = await loadFixture(ccipV2LaneFixture);
    await lane.accessControl.grantRole(
      await lane.b.token.BLACKLISTED_ROLE(),
      lane.bob.address,
    );
    const amount = 7;
    const outbound = await sendV2(
      lane.a,
      lane.b,
      lane.alice,
      lane.bob.address,
      amount,
    );
    const execution = await executeV2(lane.b, outbound);

    expect(execution.state).eq(MessageExecutionState.SUCCESS);
    expect(await lane.b.escrow.pendingCount()).eq(1);
    expect(await lane.b.token.balanceOf(lane.b.escrow.address)).eq(amount);
    await expect(executeV2(lane.b, outbound)).reverted;
  });

  it('keeps a failed pool fallback manual-execution eligible with no record', async () => {
    const lane = await loadFixture(ccipV2LaneFixture);
    await lane.accessControl.grantRole(
      await lane.b.token.BLACKLISTED_ROLE(),
      lane.bob.address,
    );
    await lane.accessControl.grantRole(
      await lane.b.token.BLACKLISTED_ROLE(),
      lane.b.escrow.address,
    );
    const outbound = await sendV2(
      lane.a,
      lane.b,
      lane.alice,
      lane.bob.address,
      1,
    );
    const execution = await executeV2(lane.b, outbound);

    expect(execution.state).eq(MessageExecutionState.FAILURE);
    expect(await lane.b.escrow.pendingCount()).eq(0);
    expect(await lane.b.token.balanceOf(lane.b.escrow.address)).eq(0);
  });

  it('creates no recovery when base inbound validation fails', async () => {
    const lane = await loadFixture(ccipV2LaneFixture);
    await setInboundRateLimit(lane, {
      isEnabled: true,
      capacity: 1,
      rate: 1,
    });
    const supplyBefore = await lane.b.token.totalSupply();
    const outbound = await sendV2(
      lane.a,
      lane.b,
      lane.alice,
      lane.bob.address,
      2,
    );
    const execution = await executeV2(lane.b, outbound);

    expect(execution.state).eq(MessageExecutionState.FAILURE);
    expect(await lane.b.escrow.pendingCount()).eq(0);
    expect(await lane.b.token.totalSupply()).eq(supplyBefore);
  });

  it('lets any EOA manually execute after repair without another source burn', async () => {
    const lane = await loadFixture(ccipV2LaneFixture);
    await setInboundRateLimit(lane, {
      isEnabled: true,
      capacity: 1,
      rate: 1,
    });
    const outbound = await sendV2(
      lane.a,
      lane.b,
      lane.alice,
      lane.bob.address,
      2,
    );
    expect((await executeV2(lane.b, outbound)).state).eq(
      MessageExecutionState.FAILURE,
    );
    const sourceSupplyAfterSend = await lane.a.token.totalSupply();
    const destinationBalanceBefore = await lane.b.token.balanceOf(
      lane.bob.address,
    );
    await setInboundRateLimit(lane, disabledRateLimiter);

    expect(await executeAs(lane, outbound, lane.unlisted)).eq(
      MessageExecutionState.SUCCESS,
    );
    expect(await lane.a.token.totalSupply()).eq(sourceSupplyAfterSend);
    expect(await lane.b.token.balanceOf(lane.bob.address)).eq(
      destinationBalanceBefore.add(2),
    );
  });

  it('can fail manual execution repeatedly before the cause is fixed', async () => {
    const lane = await loadFixture(ccipV2LaneFixture);
    await setInboundRateLimit(lane, {
      isEnabled: true,
      capacity: 1,
      rate: 1,
    });
    const outbound = await sendV2(
      lane.a,
      lane.b,
      lane.alice,
      lane.bob.address,
      2,
    );

    expect(await executeAs(lane, outbound, lane.unlisted)).eq(
      MessageExecutionState.FAILURE,
    );
    await expect(
      lane.b.offRamp
        .connect(lane.carol)
        .execute(
          outbound.encodedMessage,
          outbound.ccvs,
          outbound.verifierResults,
          0,
          { gasLimit: 12_000_000 },
        ),
    ).revertedWithCustomError(lane.b.offRamp, 'NoStateProgressMade');
    expect(await lane.b.offRamp.getExecutionState(outbound.messageId)).eq(
      MessageExecutionState.FAILURE,
    );
    expect(await lane.b.escrow.pendingCount()).eq(0);
  });

  it('can finish a manual retry through exactly one escrow fallback', async () => {
    const lane = await loadFixture(ccipV2LaneFixture);
    await setInboundRateLimit(lane, {
      isEnabled: true,
      capacity: 1,
      rate: 1,
    });
    const outbound = await sendV2(
      lane.a,
      lane.b,
      lane.alice,
      lane.bob.address,
      2,
    );
    expect(await executeAs(lane, outbound, lane.unlisted)).eq(
      MessageExecutionState.FAILURE,
    );
    await setInboundRateLimit(lane, disabledRateLimiter);
    await lane.accessControl.grantRole(
      await lane.b.token.BLACKLISTED_ROLE(),
      lane.bob.address,
    );

    expect(await executeAs(lane, outbound, lane.unlisted)).eq(
      MessageExecutionState.SUCCESS,
    );
    expect(await lane.b.escrow.pendingCount()).eq(1);
    expect(await lane.b.token.balanceOf(lane.b.escrow.address)).eq(2);
  });
});
