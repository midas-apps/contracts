import { loadFixture, time } from '@nomicfoundation/hardhat-network-helpers';
import { expect } from 'chai';
import {
  BigNumber,
  BigNumberish,
  Contract,
  ContractReceipt,
  Signer,
} from 'ethers';
import { ethers, network } from 'hardhat';

import {
  CCIP_V2_WAIT_FOR_FINALITY,
  buildTokenOnlyMessage,
  ccipV2LaneFixture,
  sendV2,
} from '../../common/ccip-v2.fixture';
import {
  RecoveryStatus,
  ccipEscrow,
  expectedRecoveryId,
} from '../../common/ccip.helpers';

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

const disabledRateLimiter = { isEnabled: false, capacity: 0, rate: 0 };
// FeeQuoter V2 rounds a nonzero execution cost up to whole USD cents.
// This price is deliberately high enough to move the quote above that floor.
const materialGasPrice = BigNumber.from('2000000000000');

const deploy = async (name: string, ...args: unknown[]) => {
  const factory = await ethers.getContractFactory(name);
  const contract = await factory.deploy(...args);
  await contract.deployed();
  return contract;
};

const impersonate = async (address: string) => {
  await network.provider.request({
    method: 'hardhat_impersonateAccount',
    params: [address],
  });
  await network.provider.send('hardhat_setBalance', [
    address,
    '0x56BC75E2D63100000',
  ]);
  return ethers.getSigner(address);
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

const decodeOutbound = async (encodedMessage: string) => {
  const imports = await deploy('CCIPV2TestImports');
  return imports.decodeMessageV1(encodedMessage);
};

const decodeAbiAddress = (encoded: string) =>
  ethers.utils.defaultAbiCoder.decode(['address'], encoded)[0] as string;

const decodeRawAddress = (encoded: string) => ethers.utils.getAddress(encoded);

const seedReturnRecovery = async (params: {
  lane: Lane;
  originalSender?: string;
  originalRecipient?: string;
  amount?: BigNumberish;
}) => {
  const {
    lane,
    originalSender = lane.alice.address,
    originalRecipient = lane.bob.address,
    amount = 1,
  } = params;
  await lane.b.token.mint(lane.b.escrow.address, amount);
  const poolSigner = await impersonate(lane.b.pool.address);
  const recoveryEscrow = ccipEscrow(lane.b.escrow.address, poolSigner);
  const nonce = await recoveryEscrow.recoveryCount();
  const recoveryId = expectedRecoveryId({
    chainId: (await ethers.provider.getNetwork()).chainId,
    escrow: lane.b.escrow.address,
    nonce,
    originalSender,
    originalRecipient,
    sourceSelector: lane.a.selector,
    amount,
  });
  await recoveryEscrow.onFallbackMinted(
    originalSender,
    originalRecipient,
    lane.a.selector,
    amount,
  );
  return recoveryId;
};

const readRecovery = async (
  lane: Lane,
  recoveryId: string,
): Promise<RecoveryRecord> => {
  const recovery = (await ccipEscrow(
    lane.b.escrow.address,
    lane.owner,
  ).recoveries(recoveryId)) as RecoveryRecord;
  return {
    ...recovery,
    originalSourceChainSelector: BigNumber.from(
      recovery.originalSourceChainSelector,
    ),
    amount: BigNumber.from(recovery.amount),
    status: Number(recovery.status),
  };
};

const readEscrowAccounting = async (lane: Lane) => {
  const escrow = ccipEscrow(lane.b.escrow.address, lane.owner);
  return {
    pending: (await escrow.pendingCount()) as BigNumber,
    reserve: (await escrow.totalReserved()) as BigNumber,
  };
};

const returnSnapshot = async (lane: Lane, recoveryId: string) => {
  const record = await readRecovery(lane, recoveryId);
  const accounting = await readEscrowAccounting(lane);
  return {
    escrowToken: (
      await lane.b.token.balanceOf(lane.b.escrow.address)
    ).toString(),
    poolToken: (await lane.b.token.balanceOf(lane.b.pool.address)).toString(),
    totalSupply: (await lane.b.token.totalSupply()).toString(),
    allowance: (
      await lane.b.token.allowance(
        lane.b.escrow.address,
        (
          await lane.b.pool.getDynamicConfig()
        ).router,
      )
    ).toString(),
    escrowNative: (
      await ethers.provider.getBalance(lane.b.escrow.address)
    ).toString(),
    nextMessageNumber: (
      await lane.b.onRamp.getExpectedNextMessageNumber(lane.a.selector)
    ).toString(),
    record: {
      ...record,
      originalSourceChainSelector:
        record.originalSourceChainSelector.toString(),
      amount: record.amount.toString(),
    },
    accounting: {
      pending: accounting.pending.toString(),
      reserve: accounting.reserve.toString(),
    },
  };
};

const expectedReturnMessage = (
  lane: Lane,
  originalSender: string,
  amount: BigNumberish,
) => buildTokenOnlyMessage(lane.b.token.address, amount, originalSender);

const dispatchReturn = async (
  lane: Lane,
  recoveryId: string,
  signer: Signer,
  value: BigNumberish,
) => {
  const escrow = ccipEscrow(lane.b.escrow.address, signer);
  const outboundId = await escrow.callStatic.returnToSource(recoveryId, {
    value,
  });
  const transaction = await escrow.returnToSource(recoveryId, { value });
  const receipt = await transaction.wait();
  const sent = parseEvent(receipt, lane.b.onRamp, 'CCIPMessageSent');
  return { outboundId, transaction, receipt, sent };
};

const setGasPrice = async (lane: Lane, usdPerUnitGas: BigNumberish) =>
  lane.b.feeQuoter.updatePrices({
    tokenPriceUpdates: [],
    gasPriceUpdates: [{ destChainSelector: lane.a.selector, usdPerUnitGas }],
  });

const setOutboundRateLimit = async (
  lane: Lane,
  config: { isEnabled: boolean; capacity: BigNumberish; rate: BigNumberish },
) =>
  lane.b.pool.setRateLimitConfig([
    {
      remoteChainSelector: lane.a.selector,
      fastFinality: false,
      outboundRateLimiterConfig: config,
      inboundRateLimiterConfig: disabledRateLimiter,
    },
  ]);

const overwritePoolRouter = async (pool: Contract, newRouter: string) => {
  const currentRouter = (await pool.getDynamicConfig()).router as string;
  const needle = currentRouter.slice(2).toLowerCase();
  const replacement = newRouter.slice(2).toLowerCase();

  for (let slot = 0; slot < 128; ++slot) {
    const slotKey = ethers.utils.hexValue(slot);
    const word = await ethers.provider.getStorageAt(pool.address, slotKey);
    const offset = word.slice(2).toLowerCase().indexOf(needle);
    if (offset === -1) continue;
    const body = word.slice(2);
    const updated = `0x${body.slice(0, offset)}${replacement}${body.slice(
      offset + needle.length,
    )}`;
    await network.provider.send('hardhat_setStorageAt', [
      pool.address,
      slotKey,
      updated,
    ]);
    await network.provider.send('evm_mine');
    expect((await pool.getDynamicConfig()).router).eq(newRouter);
    return;
  }

  throw new Error('TokenPool Router storage slot was not found');
};

describe('Midas CCIP source-only return', () => {
  it('quotes the exact immutable source-return message', async () => {
    const lane = await loadFixture(ccipV2LaneFixture);
    const amount = 7;
    const recoveryId = await seedReturnRecovery({ lane, amount });
    const expected = expectedReturnMessage(lane, lane.alice.address, amount);
    const directQuote = await lane.b.router.getFee(lane.a.selector, expected);

    expect(
      await ccipEscrow(
        lane.b.escrow.address,
        lane.unlisted,
      ).getReturnToSourceFee(recoveryId),
    ).eq(directQuote);
  });

  it('rejects quote requests for unknown, terminal, or non-returnable records', async () => {
    const lane = await loadFixture(ccipV2LaneFixture);
    const escrow = ccipEscrow(lane.b.escrow.address, lane.owner);
    await expect(escrow.getReturnToSourceFee(ethers.utils.keccak256('0xabcd')))
      .reverted;

    const terminal = await seedReturnRecovery({ lane });
    await ccipEscrow(lane.b.escrow.address, lane.bob).claim(
      terminal,
      lane.bob.address,
    );
    await expect(escrow.getReturnToSourceFee(terminal)).reverted;

    await escrow.setPeerEscrow(lane.a.selector, lane.alice.address, true);
    const nonReturnable = await seedReturnRecovery({ lane });
    await expect(escrow.getReturnToSourceFee(nonReturnable)).reverted;
  });

  it('encodes only the recorded source selector, original sender, amount, native fee, and pinned V2 args', async () => {
    const lane = await loadFixture(ccipV2LaneFixture);
    const amount = 11;
    const recoveryId = await seedReturnRecovery({ lane, amount });
    const escrow = ccipEscrow(lane.b.escrow.address, lane.bob);
    const fee = await escrow.getReturnToSourceFee(recoveryId);
    const { sent } = await dispatchReturn(lane, recoveryId, lane.bob, fee);
    const decoded = await decodeOutbound(sent.args.encodedMessage);

    expect(decoded.sourceChainSelector).eq(lane.b.selector);
    expect(decoded.destChainSelector).eq(lane.a.selector);
    expect(decodeAbiAddress(decoded.sender)).eq(lane.b.escrow.address);
    expect(decodeRawAddress(decoded.receiver)).eq(lane.alice.address);
    expect(decoded.data).eq('0x');
    expect(decoded.ccipReceiveGasLimit).eq(0);
    expect(decoded.finality).eq(CCIP_V2_WAIT_FOR_FINALITY);
    expect(decoded.tokenTransfer).length(1);
    expect(decoded.tokenTransfer[0].amount).eq(amount);
    expect(decodeRawAddress(decoded.tokenTransfer[0].tokenReceiver)).eq(
      lane.alice.address,
    );
  });

  it('prices and sends one byte-identical message built by one path', async () => {
    const lane = await loadFixture(ccipV2LaneFixture);
    const amount = 5;
    const recoveryId = await seedReturnRecovery({ lane, amount });
    const router = await deploy('CCIPV2ReturnRouterTester', 0, false);
    await router.setUseMessageHashFee(true);
    await lane.accessControl.grantRole(lane.b.greenlistedRole, router.address);
    await lane.b.pool.setDynamicConfig(
      router.address,
      ethers.constants.AddressZero,
      ethers.constants.AddressZero,
    );
    const message = expectedReturnMessage(lane, lane.alice.address, amount);
    const expectedHash = await router.hashMessage(lane.a.selector, message);
    const expectedFee = await router.getFee(lane.a.selector, message);
    const escrow = ccipEscrow(lane.b.escrow.address, lane.bob);

    expect(await escrow.getReturnToSourceFee(recoveryId)).eq(expectedFee);
    await escrow.returnToSource(recoveryId, { value: expectedFee });
    expect(await router.lastSendHash()).eq(expectedHash);
  });

  it('burns exact principal and stores the accepted outbound ID', async () => {
    const lane = await loadFixture(ccipV2LaneFixture);
    const amount = 13;
    const recoveryId = await seedReturnRecovery({ lane, amount });
    const supplyBefore = await lane.b.token.totalSupply();
    const escrow = ccipEscrow(lane.b.escrow.address, lane.bob);
    const fee = await escrow.getReturnToSourceFee(recoveryId);
    const { outboundId, sent } = await dispatchReturn(
      lane,
      recoveryId,
      lane.bob,
      fee,
    );
    const record = await readRecovery(lane, recoveryId);

    expect(await lane.b.token.totalSupply()).eq(supplyBefore.sub(amount));
    expect(await lane.b.token.balanceOf(lane.b.escrow.address)).eq(0);
    expect(record.status).eq(RecoveryStatus.ReturnDispatched);
    expect(record.outboundCcipMessageId).eq(outboundId);
    expect(sent.args.messageId).eq(outboundId);
    expect((await readEscrowAccounting(lane)).reserve).eq(0);
  });

  it('lets a blacklisted original recipient invoke only the fixed source return', async () => {
    const lane = await loadFixture(ccipV2LaneFixture);
    const recoveryId = await seedReturnRecovery({ lane });
    await lane.accessControl.grantRole(
      await lane.b.token.BLACKLISTED_ROLE(),
      lane.bob.address,
    );
    const escrow = ccipEscrow(lane.b.escrow.address, lane.bob);
    const fee = await escrow.getReturnToSourceFee(recoveryId);
    await expect(escrow.returnToSource(recoveryId, { value: fee })).not
      .reverted;
  });

  it('lets shared admin return while the original recipient is blacklisted', async () => {
    const lane = await loadFixture(ccipV2LaneFixture);
    const recoveryId = await seedReturnRecovery({ lane });
    await lane.accessControl.grantRole(
      await lane.b.token.BLACKLISTED_ROLE(),
      lane.bob.address,
    );
    const escrow = ccipEscrow(lane.b.escrow.address, lane.owner);
    const fee = await escrow.getReturnToSourceFee(recoveryId);
    await expect(escrow.returnToSource(recoveryId, { value: fee })).not
      .reverted;
  });

  it('rejects a caller who is neither the original recipient nor escrow admin', async () => {
    const lane = await loadFixture(ccipV2LaneFixture);
    const recoveryId = await seedReturnRecovery({ lane });
    const escrow = ccipEscrow(lane.b.escrow.address, lane.unlisted);
    const fee = await ccipEscrow(
      lane.b.escrow.address,
      lane.owner,
    ).getReturnToSourceFee(recoveryId);
    const before = await returnSnapshot(lane, recoveryId);
    await expect(escrow.returnToSource(recoveryId, { value: fee }))
      .revertedWithCustomError(escrow, 'UnauthorizedRecoveryCaller')
      .withArgs(recoveryId, lane.unlisted.address);
    expect(await returnSnapshot(lane, recoveryId)).deep.eq(before);
  });

  it('rejects underpayment before approval, burn, or status change', async () => {
    const lane = await loadFixture(ccipV2LaneFixture);
    const recoveryId = await seedReturnRecovery({ lane });
    const escrow = ccipEscrow(lane.b.escrow.address, lane.bob);
    const fee = await escrow.getReturnToSourceFee(recoveryId);
    const before = await returnSnapshot(lane, recoveryId);
    await expect(escrow.returnToSource(recoveryId, { value: fee.sub(1) }))
      .revertedWithCustomError(escrow, 'InsufficientCcipFee')
      .withArgs(fee.sub(1), fee);
    expect(await returnSnapshot(lane, recoveryId)).deep.eq(before);
  });

  it('sends exactly the current quote and performs no refund callback', async () => {
    const lane = await loadFixture(ccipV2LaneFixture);
    const caller = await deploy('CCIPV2EscrowReturnCaller');
    await caller.configureRefund(true, ethers.constants.AddressZero, '0x');
    const recoveryId = await seedReturnRecovery({
      lane,
      originalRecipient: caller.address,
    });
    const escrow = ccipEscrow(lane.b.escrow.address, lane.owner);
    const fee = await escrow.getReturnToSourceFee(recoveryId);
    const wrappedBefore = await lane.b.wrappedNative.totalSupply();

    await expect(
      caller.returnToSource(lane.b.escrow.address, recoveryId, { value: fee }),
    ).not.reverted;
    expect(await caller.refundCallbacks()).eq(0);
    expect(await lane.b.wrappedNative.totalSupply()).eq(wrappedBefore.add(fee));
  });

  it('sends only the quote and refunds exact excess', async () => {
    const lane = await loadFixture(ccipV2LaneFixture);
    const caller = await deploy('CCIPV2EscrowReturnCaller');
    const recoveryId = await seedReturnRecovery({
      lane,
      originalRecipient: caller.address,
    });
    const escrow = ccipEscrow(lane.b.escrow.address, lane.owner);
    const fee = await escrow.getReturnToSourceFee(recoveryId);
    const excess = BigNumber.from(17);
    const wrappedBefore = await lane.b.wrappedNative.totalSupply();

    await caller.returnToSource(lane.b.escrow.address, recoveryId, {
      value: fee.add(excess),
    });
    expect(await caller.refundCallbacks()).eq(1);
    expect(await ethers.provider.getBalance(caller.address)).eq(excess);
    expect(await lane.b.wrappedNative.totalSupply()).eq(wrappedBefore.add(fee));
    expect(await ethers.provider.getBalance(lane.b.escrow.address)).eq(0);
  });

  it('rolls back the nested send when required refund is rejected', async () => {
    const lane = await loadFixture(ccipV2LaneFixture);
    const caller = await deploy('CCIPV2EscrowReturnCaller');
    await caller.configureRefund(true, ethers.constants.AddressZero, '0x');
    const recoveryId = await seedReturnRecovery({
      lane,
      originalRecipient: caller.address,
    });
    const escrow = ccipEscrow(lane.b.escrow.address, lane.owner);
    const fee = await escrow.getReturnToSourceFee(recoveryId);
    const before = await returnSnapshot(lane, recoveryId);

    await expect(
      caller.returnToSource(lane.b.escrow.address, recoveryId, {
        value: fee.add(1),
      }),
    ).reverted;
    expect(await returnSnapshot(lane, recoveryId)).deep.eq(before);
  });

  it('succeeds for a nonpayable original-recipient contract when no refund is needed', async () => {
    const lane = await loadFixture(ccipV2LaneFixture);
    const caller = await deploy('CCIPV2EscrowReturnCaller');
    await caller.configureRefund(true, ethers.constants.AddressZero, '0x');
    const recoveryId = await seedReturnRecovery({
      lane,
      originalRecipient: caller.address,
    });
    const fee = await ccipEscrow(
      lane.b.escrow.address,
      lane.owner,
    ).getReturnToSourceFee(recoveryId);

    await expect(
      caller.returnToSource(lane.b.escrow.address, recoveryId, { value: fee }),
    ).not.reverted;
  });

  it('re-quotes in-transaction and rejects a stale low maximum', async () => {
    const lane = await loadFixture(ccipV2LaneFixture);
    const recoveryId = await seedReturnRecovery({ lane });
    const escrow = ccipEscrow(lane.b.escrow.address, lane.bob);
    const oldFee = await escrow.getReturnToSourceFee(recoveryId);
    await setGasPrice(lane, materialGasPrice);
    const currentFee = await escrow.getReturnToSourceFee(recoveryId);
    expect(currentFee).gt(oldFee);
    const before = await returnSnapshot(lane, recoveryId);

    await expect(escrow.returnToSource(recoveryId, { value: oldFee }))
      .revertedWithCustomError(escrow, 'InsufficientCcipFee')
      .withArgs(oldFee, currentFee);
    expect(await returnSnapshot(lane, recoveryId)).deep.eq(before);
  });

  it('re-quotes a lower fee and refunds the difference', async () => {
    const lane = await loadFixture(ccipV2LaneFixture);
    const caller = await deploy('CCIPV2EscrowReturnCaller');
    const recoveryId = await seedReturnRecovery({
      lane,
      originalRecipient: caller.address,
    });
    const escrow = ccipEscrow(lane.b.escrow.address, lane.owner);
    await setGasPrice(lane, materialGasPrice);
    const oldFee = await escrow.getReturnToSourceFee(recoveryId);
    await setGasPrice(lane, 1);
    const currentFee = await escrow.getReturnToSourceFee(recoveryId);
    expect(currentFee).lt(oldFee);

    await caller.returnToSource(lane.b.escrow.address, recoveryId, {
      value: oldFee,
    });
    expect(await ethers.provider.getBalance(caller.address)).eq(
      oldFee.sub(currentFee),
    );
  });

  it('rejects a zero/EOA Router and propagates a Router contract error', async () => {
    const run = async (
      configure: (lane: Lane) => Promise<string>,
      expectInvalidRouter: boolean,
    ) => {
      const lane = await loadFixture(ccipV2LaneFixture);
      const recoveryId = await seedReturnRecovery({ lane });
      const router = await configure(lane);
      const escrow = ccipEscrow(lane.b.escrow.address, lane.bob);
      if (expectInvalidRouter) {
        await expect(escrow.getReturnToSourceFee(recoveryId))
          .revertedWithCustomError(escrow, 'InvalidRouter')
          .withArgs(router);
      } else {
        await expect(escrow.getReturnToSourceFee(recoveryId)).reverted;
      }
      expect((await readRecovery(lane, recoveryId)).status).eq(
        RecoveryStatus.Pending,
      );
    };

    await run(async (lane) => {
      await overwritePoolRouter(lane.b.pool, ethers.constants.AddressZero);
      return ethers.constants.AddressZero;
    }, true);
    await run(async (lane) => {
      await lane.b.pool.setDynamicConfig(
        lane.unlisted.address,
        ethers.constants.AddressZero,
        ethers.constants.AddressZero,
      );
      return lane.unlisted.address;
    }, true);
    await run(async (lane) => {
      const revertingRouter = await deploy('CCIPV2NoFallbackInterface');
      await lane.b.pool.setDynamicConfig(
        revertingRouter.address,
        ethers.constants.AddressZero,
        ethers.constants.AddressZero,
      );
      return revertingRouter.address;
    }, false);
  });

  it('leaves Pending when the reverse Router route is absent', async () => {
    const lane = await loadFixture(ccipV2LaneFixture);
    const recoveryId = await seedReturnRecovery({ lane });
    const escrow = ccipEscrow(lane.b.escrow.address, lane.bob);
    const fee = await escrow.getReturnToSourceFee(recoveryId);
    await lane.b.router.applyRampUpdates(
      [
        {
          destChainSelector: lane.a.selector,
          onRamp: ethers.constants.AddressZero,
        },
      ],
      [],
      [],
    );
    const before = await returnSnapshot(lane, recoveryId);
    await expect(escrow.returnToSource(recoveryId, { value: fee })).reverted;
    expect(await returnSnapshot(lane, recoveryId)).deep.eq(before);
  });

  it('rolls back on exhausted outbound rate limit and retries after refill', async () => {
    const lane = await loadFixture(ccipV2LaneFixture);
    await setOutboundRateLimit(lane, {
      isEnabled: true,
      capacity: 100,
      rate: 1,
    });
    await sendV2(lane.b, lane.a, lane.alice, lane.alice.address, 100);
    const recoveryId = await seedReturnRecovery({ lane, amount: 20 });
    const escrow = ccipEscrow(lane.b.escrow.address, lane.bob);
    const fee = await escrow.getReturnToSourceFee(recoveryId);
    const before = await returnSnapshot(lane, recoveryId);
    await expect(escrow.returnToSource(recoveryId, { value: fee })).reverted;
    expect(await returnSnapshot(lane, recoveryId)).deep.eq(before);

    await time.increase(20);
    const refreshedFee = await escrow.getReturnToSourceFee(recoveryId);
    await expect(escrow.returnToSource(recoveryId, { value: refreshedFee })).not
      .reverted;
  });

  it('rolls back every escrow or pool permission and burn failure', async () => {
    const run = async (mutate: (lane: Lane) => Promise<unknown>) => {
      const lane = await loadFixture(ccipV2LaneFixture);
      const recoveryId = await seedReturnRecovery({ lane });
      const escrow = ccipEscrow(lane.b.escrow.address, lane.bob);
      const fee = await escrow.getReturnToSourceFee(recoveryId);
      await mutate(lane);
      const before = await returnSnapshot(lane, recoveryId);
      await expect(escrow.returnToSource(recoveryId, { value: fee })).reverted;
      expect(await returnSnapshot(lane, recoveryId)).deep.eq(before);
    };

    await run(async (lane) =>
      lane.accessControl.grantRole(
        await lane.b.token.BLACKLISTED_ROLE(),
        lane.b.escrow.address,
      ),
    );
    await run((lane) =>
      lane.accessControl.revokeRole(
        lane.b.greenlistedRole,
        lane.b.escrow.address,
      ),
    );
    await run(async (lane) => {
      await lane.accessControl.grantRole(
        await lane.b.token.M_TOKEN_TEST_PAUSE_OPERATOR_ROLE(),
        lane.owner.address,
      );
      return lane.b.token.pause();
    });
    await run((lane) =>
      lane.accessControl.revokeRole(lane.b.burnerRole, lane.b.pool.address),
    );
  });

  it('restores approval, funds, and state when Router reverts after pull', async () => {
    const lane = await loadFixture(ccipV2LaneFixture);
    const recoveryId = await seedReturnRecovery({ lane });
    const router = await deploy('CCIPV2ReturnRouterTester', 17, true);
    await lane.accessControl.grantRole(lane.b.greenlistedRole, router.address);
    await lane.b.pool.setDynamicConfig(
      router.address,
      ethers.constants.AddressZero,
      ethers.constants.AddressZero,
    );
    const before = await returnSnapshot(lane, recoveryId);
    const escrow = ccipEscrow(lane.b.escrow.address, lane.bob);

    await expect(
      escrow.returnToSource(recoveryId, { value: 17 }),
    ).revertedWithCustomError(router, 'RouterRejectedAfterPull');
    expect(await returnSnapshot(lane, recoveryId)).deep.eq(before);
    expect(
      await lane.b.token.allowance(lane.b.escrow.address, router.address),
    ).eq(0);
    expect(await lane.b.token.balanceOf(router.address)).eq(0);
  });

  it('makes ReturnDispatched terminal for return and local claim', async () => {
    const lane = await loadFixture(ccipV2LaneFixture);
    const recoveryId = await seedReturnRecovery({ lane });
    const escrow = ccipEscrow(lane.b.escrow.address, lane.bob);
    const fee = await escrow.getReturnToSourceFee(recoveryId);
    await escrow.returnToSource(recoveryId, { value: fee });

    await expect(escrow.returnToSource(recoveryId, { value: fee })).reverted;
    await expect(escrow.claim(recoveryId, lane.bob.address)).reverted;
  });

  it('rejects a second return hop but leaves every local terminal available', async () => {
    const lane = await loadFixture(ccipV2LaneFixture);
    const escrow = ccipEscrow(lane.b.escrow.address, lane.owner);
    await escrow.setPeerEscrow(lane.a.selector, lane.alice.address, true);
    const recoveryId = await seedReturnRecovery({ lane });
    expect((await readRecovery(lane, recoveryId)).returnable).eq(false);

    await expect(
      ccipEscrow(lane.b.escrow.address, lane.bob).returnToSource(recoveryId, {
        value: 0,
      }),
    ).revertedWithCustomError(escrow, 'RecoveryNotReturnable');
    await expect(
      escrow.returnToSource(recoveryId, { value: 0 }),
    ).revertedWithCustomError(escrow, 'RecoveryNotReturnable');
    await expect(
      ccipEscrow(lane.b.escrow.address, lane.bob).claim(
        recoveryId,
        lane.carol.address,
      ),
    ).not.reverted;
  });

  it('blocks reentrant recovery during a native refund callback', async () => {
    const lane = await loadFixture(ccipV2LaneFixture);
    const caller = await deploy('CCIPV2EscrowReturnCaller');
    const recoveryId = await seedReturnRecovery({
      lane,
      originalRecipient: caller.address,
    });
    const escrow = ccipEscrow(lane.b.escrow.address, lane.owner);
    const fee = await escrow.getReturnToSourceFee(recoveryId);
    await caller.configureRefund(
      false,
      lane.b.escrow.address,
      escrow.interface.encodeFunctionData('returnToSource', [recoveryId]),
    );

    await caller.returnToSource(lane.b.escrow.address, recoveryId, {
      value: fee.add(1),
    });
    expect(await caller.refundCallbacks()).eq(1);
    expect(await caller.reentrySucceeded()).eq(false);
    expect((await readRecovery(lane, recoveryId)).status).eq(
      RecoveryStatus.ReturnDispatched,
    );
  });

  it('returns tokens to a contract original sender without invoking ccipReceive', async () => {
    const lane = await loadFixture(ccipV2LaneFixture);
    const originalSender = await deploy('CCIPV2MessageReceiverTester', true);
    await lane.accessControl.grantRole(
      lane.a.greenlistedRole,
      originalSender.address,
    );
    const amount = 7;
    const recoveryId = await seedReturnRecovery({
      lane,
      originalSender: originalSender.address,
      amount,
    });
    const escrow = ccipEscrow(lane.b.escrow.address, lane.bob);
    const fee = await escrow.getReturnToSourceFee(recoveryId);
    const { sent } = await dispatchReturn(lane, recoveryId, lane.bob, fee);
    const verifierResults = [...sent.args.verifierBlobs] as string[];
    const receipts = [...sent.args.receipts] as Array<{ issuer: string }>;
    const ccvs = receipts
      .slice(0, verifierResults.length)
      .map((receipt) => receipt.issuer);

    await lane.a.offRamp.execute(
      sent.args.encodedMessage,
      ccvs,
      verifierResults,
      0,
      { gasLimit: 12_000_000 },
    );
    expect(await lane.a.token.balanceOf(originalSender.address)).eq(amount);
    expect(await originalSender.callbackCount()).eq(0);
    expect(await lane.a.offRamp.getExecutionState(sent.args.messageId)).eq(2);
  });

  it('leaves no Router allowance, native balance, or fee revenue in the escrow', async () => {
    const lane = await loadFixture(ccipV2LaneFixture);
    const recoveryId = await seedReturnRecovery({ lane });
    const escrow = ccipEscrow(lane.b.escrow.address, lane.bob);
    const fee = await escrow.getReturnToSourceFee(recoveryId);
    await escrow.returnToSource(recoveryId, { value: fee.add(3) });

    expect(
      await lane.b.token.allowance(
        lane.b.escrow.address,
        lane.b.router.address,
      ),
    ).eq(0);
    expect(await ethers.provider.getBalance(lane.b.escrow.address)).eq(0);
    expect(await lane.b.token.balanceOf(lane.b.escrow.address)).eq(0);
  });

  it('removes every arbitrary remote-forwarding selector', async () => {
    const factory = await ethers.getContractFactory('MidasCCTFallbackEscrow');
    expect(
      factory.interface.functions['claimToRemote(bytes32,bytes,uint64)'],
    ).eq(undefined);
    expect(
      factory.interface.functions['returnToRemote(bytes32,uint64,bytes)'],
    ).eq(undefined);
  });
});
