import { loadFixture } from '@nomicfoundation/hardhat-network-helpers';
import { expect } from 'chai';
import { parseUnits } from 'ethers/lib/utils';
import { ethers } from 'hardhat';

import { createRequire } from 'module';

import {
  CCIP_V2_DEFAULT_TOKEN_GAS,
  CCIP_V2_SOURCE_TOKEN_DATA_BYTES,
  CCIP_V2_WAIT_FOR_FINALITY,
  MessageExecutionState,
  abiEncodedAddress,
  buildTokenOnlyMessage,
  buildTokenTransferV1,
  ccipV2LaneFixture,
  executeV2,
  sendV2,
} from '../../common/ccip-v2.fixture';

const loadPackage = createRequire(__filename);

describe('CCIP 2.0 exact harness qualification', () => {
  it('uses the pinned V2 pool and ramps', async () => {
    const lane = await loadFixture(ccipV2LaneFixture);
    const imports = await (
      await ethers.getContractFactory('CCIPV2TestImports')
    ).deploy();
    await imports.deployed();

    const ccipPackage = loadPackage(
      '@chainlink/contracts-ccip/package.json',
    ) as { version: string };

    expect(ccipPackage.version).eq('2.0.0');
    expect(
      await lane.a.pool.supportsInterface(await imports.poolV2InterfaceId()),
    ).eq(true);
    expect(await lane.a.onRamp.typeAndVersion()).eq('OnRamp 2.0.0');
    expect(await lane.b.offRamp.typeAndVersion()).eq('OffRamp 2.0.0');
    expect(await lane.a.router.typeAndVersion()).eq('Router 1.2.0');
  });

  it('sends and executes the configured hub edge in both directions', async () => {
    const lane = await loadFixture(ccipV2LaneFixture);
    const amountAB = parseUnits('10', 18);
    const amountBA = parseUnits('3', 18);

    expect(await lane.a.registry.getPool(lane.a.token.address)).eq(
      lane.a.pool.address,
    );
    expect(await lane.b.registry.getPool(lane.b.token.address)).eq(
      lane.b.pool.address,
    );
    expect(await lane.a.router.getOnRamp(lane.b.selector)).eq(
      lane.a.onRamp.address,
    );
    expect(
      await lane.b.router.isOffRamp(lane.a.selector, lane.b.offRamp.address),
    ).eq(true);

    const bobBefore = await lane.b.token.balanceOf(lane.bob.address);
    const outboundAB = await sendV2(
      lane.a,
      lane.b,
      lane.alice,
      lane.bob.address,
      amountAB,
    );
    const executionAB = await executeV2(lane.b, outboundAB);
    expect(executionAB.state).eq(MessageExecutionState.SUCCESS);
    expect(await lane.b.token.balanceOf(lane.bob.address)).eq(
      bobBefore.add(amountAB),
    );

    const aliceBefore = await lane.a.token.balanceOf(lane.alice.address);
    const outboundBA = await sendV2(
      lane.b,
      lane.a,
      lane.bob,
      lane.alice.address,
      amountBA,
    );
    const executionBA = await executeV2(lane.a, outboundBA);
    expect(executionBA.state).eq(MessageExecutionState.SUCCESS);
    expect(await lane.a.token.balanceOf(lane.alice.address)).eq(
      aliceBefore.add(amountBA),
    );
  });

  it('accepts zero recipient delta when the exact amount is funded in escrow', async () => {
    const lane = await loadFixture(ccipV2LaneFixture);
    const amount = parseUnits('7', 18);
    await lane.accessControl.revokeRole(
      lane.b.greenlistedRole,
      lane.bob.address,
    );

    const bobBefore = await lane.b.token.balanceOf(lane.bob.address);
    const escrowBefore = await lane.b.token.balanceOf(lane.b.escrow.address);
    const recordCountBefore = await lane.b.escrow.recoveryCount();
    const outbound = await sendV2(
      lane.a,
      lane.b,
      lane.alice,
      lane.bob.address,
      amount,
    );
    const execution = await executeV2(lane.b, outbound);

    expect(execution.state).eq(MessageExecutionState.SUCCESS);
    expect(await lane.b.token.balanceOf(lane.bob.address)).eq(bobBefore);
    expect(await lane.b.token.balanceOf(lane.b.escrow.address)).eq(
      escrowBefore.add(amount),
    );
    expect(await lane.b.escrow.recoveryCount()).eq(recordCountBefore.add(1));
  });

  it('skips ccipReceive for a token-only V3 transfer with callback gas zero', async () => {
    const lane = await loadFixture(ccipV2LaneFixture);
    const receiver = await (
      await ethers.getContractFactory('LogMessageDataReceiver')
    ).deploy();
    await receiver.deployed();
    await lane.accessControl.grantRole(
      lane.b.greenlistedRole,
      receiver.address,
    );

    const amount = parseUnits('2', 18);
    const outbound = await sendV2(
      lane.a,
      lane.b,
      lane.alice,
      receiver.address,
      amount,
    );
    const execution = await executeV2(lane.b, outbound);
    const receiveTopic = receiver.interface.getEventTopic('MessageReceived');
    const routerTopic =
      lane.b.router.interface.getEventTopic('MessageExecuted');

    expect(execution.state).eq(MessageExecutionState.SUCCESS);
    expect(await lane.b.token.balanceOf(receiver.address)).eq(amount);
    expect(
      execution.receipt.logs.some(
        (log) =>
          log.address.toLowerCase() === receiver.address.toLowerCase() &&
          log.topics[0] === receiveTopic,
      ),
    ).eq(false);
    expect(
      execution.receipt.logs.some(
        (log) =>
          log.address.toLowerCase() === lane.b.router.address.toLowerCase() &&
          log.topics[0] === routerTopic,
      ),
    ).eq(false);
  });

  it('keeps pool validation failures retryable and successes non-replayable', async () => {
    const lane = await loadFixture(ccipV2LaneFixture);
    const amount = parseUnits('5', 18);
    const outbound = await sendV2(
      lane.a,
      lane.b,
      lane.alice,
      lane.bob.address,
      amount,
    );
    const sourcePool = abiEncodedAddress(lane.a.pool.address);
    const bobBefore = await lane.b.token.balanceOf(lane.bob.address);

    await lane.b.pool.removeRemotePool(lane.a.selector, sourcePool);
    const failedExecution = await executeV2(lane.b, outbound);
    expect(failedExecution.state).eq(MessageExecutionState.FAILURE);
    expect(await lane.b.token.balanceOf(lane.bob.address)).eq(bobBefore);

    await lane.b.pool.addRemotePool(lane.a.selector, sourcePool);
    const retriedExecution = await executeV2(lane.b, outbound);
    expect(retriedExecution.state).eq(MessageExecutionState.SUCCESS);
    expect(await lane.b.token.balanceOf(lane.bob.address)).eq(
      bobBefore.add(amount),
    );

    await expect(
      lane.b.offRamp.execute(
        outbound.encodedMessage,
        outbound.ccvs,
        outbound.verifierResults,
        0,
      ),
    )
      .revertedWithCustomError(lane.b.offRamp, 'SkippedAlreadyExecutedMessage')
      .withArgs(outbound.messageId, lane.a.selector, 1);
  });

  it('enforces the 32-byte source-token-data budget', async () => {
    const lane = await loadFixture(ccipV2LaneFixture);
    const amount = parseUnits('1', 18);
    const defaultFeeConfig = await lane.a.feeQuoter.getTokenTransferFee(
      lane.b.selector,
      lane.a.token.address,
    );
    expect(defaultFeeConfig.destBytesOverhead).eq(
      CCIP_V2_SOURCE_TOKEN_DATA_BYTES,
    );

    await lane.a.pool.applyTokenTransferFeeConfigUpdates(
      [
        {
          destChainSelector: lane.b.selector,
          tokenTransferFeeConfig: {
            destGasOverhead: CCIP_V2_DEFAULT_TOKEN_GAS,
            destBytesOverhead: CCIP_V2_SOURCE_TOKEN_DATA_BYTES - 1,
            finalityFeeUSDCents: 0,
            fastFinalityFeeUSDCents: 0,
            finalityTransferFeeBps: 0,
            fastFinalityTransferFeeBps: 0,
            isEnabled: true,
          },
        },
      ],
      [],
    );

    const message = buildTokenOnlyMessage(
      lane.a.token.address,
      amount,
      lane.bob.address,
    );
    const aliceBalanceBefore = await lane.a.token.balanceOf(lane.alice.address);
    const supplyBefore = await lane.a.token.totalSupply();
    await lane.a.token
      .connect(lane.alice)
      .approve(lane.a.router.address, amount);
    const fee = await lane.a.router.getFee(lane.b.selector, message);

    await expect(
      lane.a.router
        .connect(lane.alice)
        .ccipSend(lane.b.selector, message, { value: fee }),
    )
      .revertedWithCustomError(lane.a.onRamp, 'SourceTokenDataTooLarge')
      .withArgs(
        lane.a.token.address,
        CCIP_V2_SOURCE_TOKEN_DATA_BYTES,
        CCIP_V2_SOURCE_TOKEN_DATA_BYTES - 1,
      );
    expect(await lane.a.token.balanceOf(lane.alice.address)).eq(
      aliceBalanceBefore,
    );
    expect(await lane.a.token.totalSupply()).eq(supplyBefore);
  });

  it('meters the complete token segment and propagates its reverting branch', async () => {
    const lane = await loadFixture(ccipV2LaneFixture);
    const amount = parseUnits('1', 18);
    const originalSender = abiEncodedAddress(lane.alice.address);

    const direct = await lane.b.offRamp.callStatic.releaseOrMintAndMeasure(
      buildTokenTransferV1(lane.a, lane.b, lane.carol.address, amount),
      originalSender,
      lane.a.selector,
      CCIP_V2_WAIT_FOR_FINALITY,
    );
    expect(direct.gasUsed).gt(0);
    expect(direct.receiverDelta).eq(amount);

    const fallback = await lane.b.offRamp.callStatic.releaseOrMintAndMeasure(
      buildTokenTransferV1(lane.a, lane.b, lane.unlisted.address, amount),
      originalSender,
      lane.a.selector,
      CCIP_V2_WAIT_FOR_FINALITY,
    );
    expect(fallback.gasUsed).gt(direct.gasUsed);
    expect(fallback.receiverDelta).eq(0);

    await lane.accessControl.revokeRole(
      lane.b.greenlistedRole,
      lane.b.escrow.address,
    );
    await expect(
      lane.b.offRamp.releaseOrMintAndMeasure(
        buildTokenTransferV1(lane.a, lane.b, lane.unlisted.address, amount),
        originalSender,
        lane.a.selector,
        CCIP_V2_WAIT_FOR_FINALITY,
      ),
    ).revertedWithCustomError(lane.b.offRamp, 'TokenHandlingError');
  });
});
