import { anyValue } from '@nomicfoundation/hardhat-chai-matchers/withArgs';
import { expect } from 'chai';
import { BigNumberish, Contract, constants } from 'ethers';
import { ethers } from 'hardhat';

import { blackList } from './ac.helpers';
import { Account, OptionalCommonParams, getAccount } from './common.helpers';
import { ccipCctFixture } from './fixtures';

type Fixture = Awaited<ReturnType<typeof ccipCctFixture>>;

export const MessageStatus = {
  Pending: 0,
  Claimed: 1,
  Recovered: 2,
  Closed: 3,
} as const;

export const encodeDecimals = (decimals: number) =>
  ethers.utils.defaultAbiCoder.encode(['uint256'], [decimals]);

export const encodeEscrowMessageId = (
  originalRecipient: string,
  tokenAmount: BigNumberish,
  index: BigNumberish,
) =>
  ethers.utils.solidityKeccak256(
    ['address', 'uint256', 'uint256'],
    [originalRecipient, tokenAmount, index],
  );

// In CCIP 2.0.0 lockOrBurn/releaseOrMint are overloaded, so the single-arg
const LOCK_OR_BURN_SIG = 'lockOrBurn((bytes,uint64,address,uint256,address))';
const RELEASE_OR_MINT_SIG =
  'releaseOrMint((bytes,uint64,address,uint256,address,bytes,bytes,bytes))';

type LockOrBurnParams = {
  amount: BigNumberish;
  receiver?: string;
  originalSender?: string;
  localToken?: string;
  remoteChainSelector?: BigNumberish;
};

type CcipRevertParams = {
  revertWithCustomError?: {
    contract: Contract;
    error: string;
    args?: unknown[];
  };
} & OptionalCommonParams;

export const setFallbackReceiver = async (
  fixture: Fixture,
  newFallbackReceiver: Account,
  opt?: CcipRevertParams,
) => {
  const { pool, owner } = fixture;
  const caller = opt?.from ?? owner;
  const receiver = getAccount(newFallbackReceiver);

  const tx = () => pool.connect(caller).setFallbackReceiver(receiver);

  if (opt?.revertMessage) {
    await expect(tx()).revertedWith(opt.revertMessage);
    return;
  }

  if (opt?.revertWithCustomError) {
    const assertion = expect(tx()).revertedWithCustomError(
      opt.revertWithCustomError.contract,
      opt.revertWithCustomError.error,
    );
    if (opt.revertWithCustomError.args) {
      await assertion.withArgs(...opt.revertWithCustomError.args);
    } else {
      await assertion;
    }
    return;
  }

  await expect(tx()).to.emit(pool, 'FallbackReceiverSet').withArgs(receiver);

  expect(await pool.fallbackReceiver()).eq(receiver);
};

export const lockOrBurn = async (
  fixture: Fixture,
  {
    amount,
    receiver = '0x',
    originalSender,
    localToken,
    remoteChainSelector,
  }: LockOrBurnParams,
  opt?: CcipRevertParams,
) => {
  const { pool, mTBILL, onRamp, owner, remoteTokenAddress } = fixture;

  const caller = opt?.from ?? onRamp;

  const lockOrBurnIn = {
    receiver,
    remoteChainSelector: remoteChainSelector ?? fixture.remoteChainSelector,
    originalSender: originalSender ?? owner.address,
    amount,
    localToken: localToken ?? mTBILL.address,
  };

  const tx = () => pool.connect(caller)[LOCK_OR_BURN_SIG](lockOrBurnIn);

  if (opt?.revertMessage) {
    await expect(tx()).revertedWith(opt.revertMessage);
    return;
  }

  if (opt?.revertWithCustomError) {
    const assertion = expect(tx()).revertedWithCustomError(
      opt.revertWithCustomError.contract,
      opt.revertWithCustomError.error,
    );
    if (opt.revertWithCustomError.args) {
      await assertion.withArgs(...opt.revertWithCustomError.args);
    } else {
      await assertion;
    }
    return;
  }

  const totalSupplyBefore = await mTBILL.totalSupply();
  const poolBalanceBefore = await mTBILL.balanceOf(pool.address);

  const out = await pool
    .connect(caller)
    .callStatic[LOCK_OR_BURN_SIG](lockOrBurnIn);
  expect(out.destTokenAddress).eq(remoteTokenAddress);
  expect(out.destPoolData).eq(encodeDecimals(18));

  await expect(tx())
    .to.emit(pool, 'LockedOrBurned')
    .withArgs(
      lockOrBurnIn.remoteChainSelector,
      mTBILL.address,
      caller.address,
      amount,
    );

  const totalSupplyAfter = await mTBILL.totalSupply();
  const poolBalanceAfter = await mTBILL.balanceOf(pool.address);

  expect(totalSupplyAfter).eq(totalSupplyBefore.sub(amount));
  expect(poolBalanceAfter).eq(poolBalanceBefore.sub(amount));
};

type ReleaseOrMintParams = {
  amount: BigNumberish;
  receiver?: string;
  originalSender?: string;
  localToken?: string;
  remoteChainSelector?: BigNumberish;
  sourcePoolAddress?: string;
  sourcePoolData?: string;
  expectFallback?: boolean;
  expectFallbackFail?: boolean;
  expectFallbackCallback?: boolean;
  expectEscrowRecord?: boolean;
  expectMinted?: boolean;
};

export const releaseOrMint = async (
  fixture: Fixture,
  {
    amount,
    receiver,
    originalSender,
    localToken,
    remoteChainSelector,
    sourcePoolAddress,
    sourcePoolData,
    expectFallback = false,
    expectFallbackFail = false,
    expectFallbackCallback = expectFallback,
    expectEscrowRecord = expectFallback && expectFallbackCallback,
    expectMinted = !expectFallbackFail,
  }: ReleaseOrMintParams,
  opt?: CcipRevertParams,
): Promise<string> => {
  const { pool, mTBILL, offRamp, owner, remotePoolAddress, escrow } = fixture;

  const caller = opt?.from ?? offRamp;
  const to = receiver ?? owner.address;
  const fallback = await pool.fallbackReceiver();

  const releaseOrMintIn = {
    originalSender: originalSender ?? owner.address,
    remoteChainSelector: remoteChainSelector ?? fixture.remoteChainSelector,
    receiver: to,
    sourceDenominatedAmount: amount,
    localToken: localToken ?? mTBILL.address,
    sourcePoolAddress: sourcePoolAddress ?? remotePoolAddress,
    sourcePoolData: sourcePoolData ?? encodeDecimals(18),
    offchainTokenData: '0x',
  };

  const tx = async () => {
    const estimated = await pool
      .connect(caller)
      .estimateGas[RELEASE_OR_MINT_SIG](releaseOrMintIn);
    // Nested self-calls in the fallback path only forward 63/64 of remaining gas,
    // so the estimate alone is often too tight for handleFallback + escrow callback.
    return pool.connect(caller)[RELEASE_OR_MINT_SIG](releaseOrMintIn, {
      gasLimit: estimated.mul(3).div(2),
    });
  };

  if (opt?.revertMessage) {
    await expect(tx()).revertedWith(opt.revertMessage);
    return constants.HashZero;
  }

  if (opt?.revertWithCustomError) {
    const assertion = expect(tx()).revertedWithCustomError(
      opt.revertWithCustomError.contract,
      opt.revertWithCustomError.error,
    );
    if (opt.revertWithCustomError.args) {
      await assertion.withArgs(...opt.revertWithCustomError.args);
    } else {
      await assertion;
    }
    return constants.HashZero;
  }

  const totalSupplyBefore = await mTBILL.totalSupply();
  const balanceToBefore = await mTBILL.balanceOf(to);
  const balanceFallbackBefore = await mTBILL.balanceOf(fallback);
  const failedMessageCountBefore = await escrow.failedMessageCount();
  const pendingIdsBefore = await escrow.getFailedMessageIds();

  const out = await pool
    .connect(caller)
    .callStatic[RELEASE_OR_MINT_SIG](releaseOrMintIn);
  expect(out.destinationAmount).eq(amount);

  const expectedMessageId = encodeEscrowMessageId(
    to,
    amount,
    failedMessageCountBefore,
  );

  const txPromise = tx();

  await expect(txPromise)
    .to.emit(pool, 'ReleasedOrMinted')
    .withArgs(
      releaseOrMintIn.remoteChainSelector,
      mTBILL.address,
      caller.address,
      to,
      amount,
    );

  if (expectFallback) {
    await expect(txPromise)
      .to.emit(pool, 'FallbackHit')
      .withArgs(to, fallback, amount, expectFallbackCallback, anyValue);
  } else {
    await expect(txPromise).to.not.emit(pool, 'FallbackHit');
  }

  if (expectFallbackFail) {
    await expect(txPromise)
      .to.emit(pool, 'FallbackFail')
      .withArgs(to, fallback, amount, anyValue);
  } else {
    await expect(txPromise).to.not.emit(pool, 'FallbackFail');
  }

  if (expectEscrowRecord) {
    await expect(txPromise)
      .to.emit(escrow, 'OnFailedMessage')
      .withArgs(expectedMessageId);
  }

  const totalSupplyAfter = await mTBILL.totalSupply();
  const balanceToAfter = await mTBILL.balanceOf(to);
  const balanceFallbackAfter = await mTBILL.balanceOf(fallback);

  if (expectMinted) {
    expect(totalSupplyAfter).eq(totalSupplyBefore.add(amount));
  } else {
    expect(totalSupplyAfter).eq(totalSupplyBefore);
  }

  if (expectFallback) {
    expect(balanceToAfter).eq(balanceToBefore);
    expect(balanceFallbackAfter).eq(balanceFallbackBefore.add(amount));
  } else if (expectFallbackFail) {
    expect(balanceToAfter).eq(balanceToBefore);
    expect(balanceFallbackAfter).eq(balanceFallbackBefore);
  } else {
    expect(balanceToAfter).eq(balanceToBefore.add(amount));
    if (fallback !== to) {
      expect(balanceFallbackAfter).eq(balanceFallbackBefore);
    }
  }

  if (expectEscrowRecord) {
    expect(await escrow.failedMessageCount()).eq(
      failedMessageCountBefore.add(1),
    );
    expect(await escrow.getFailedMessageIds()).deep.eq([
      ...pendingIdsBefore,
      expectedMessageId,
    ]);

    const failedMessage = await escrow.getFailedMessage(expectedMessageId);
    expect(failedMessage.originalRecipient).eq(to);
    expect(failedMessage.tokenAmount).eq(amount);
    expect(failedMessage.status).eq(MessageStatus.Pending);

    return expectedMessageId;
  }

  return constants.HashZero;
};

export const createEscrowFailedMessage = async (
  fixture: Fixture,
  {
    amount,
    receiver,
  }: {
    amount: BigNumberish;
    receiver?: Account;
  },
): Promise<string> => {
  const { mTBILL, accessControl, owner, alice } = fixture;
  const to = getAccount(receiver ?? alice);

  await blackList({ blacklistable: mTBILL, accessControl, owner }, to);

  return releaseOrMint(fixture, {
    amount,
    receiver: to,
    expectFallback: true,
    expectFallbackCallback: true,
    expectEscrowRecord: true,
  });
};

export type OrphanedMessage = {
  originalRecipient: string;
  tokenAmount: BigNumberish;
};

export const registerOrphanedBulk = async (
  fixture: Fixture,
  messages: OrphanedMessage[],
  opt?: CcipRevertParams,
) => {
  const { escrow, owner } = fixture;
  const caller = opt?.from ?? owner;

  const tx = () => escrow.connect(caller).registerOrphanedBulk(messages);

  if (opt?.revertMessage) {
    await expect(tx()).revertedWith(opt.revertMessage);
    return [];
  }

  if (opt?.revertWithCustomError) {
    const assertion = expect(tx()).revertedWithCustomError(
      opt.revertWithCustomError.contract,
      opt.revertWithCustomError.error,
    );
    if (opt.revertWithCustomError.args) {
      await assertion.withArgs(...opt.revertWithCustomError.args);
    } else {
      await assertion;
    }
    return [];
  }

  const failedMessageCountBefore = await escrow.failedMessageCount();
  const pendingIdsBefore = await escrow.getFailedMessageIds();
  const messageIds = messages.map((message, index) =>
    encodeEscrowMessageId(
      message.originalRecipient,
      message.tokenAmount,
      failedMessageCountBefore.add(index),
    ),
  );

  await expect(tx()).to.emit(escrow, 'RegisterOrphanedBulk');

  expect(await escrow.failedMessageCount()).eq(
    failedMessageCountBefore.add(messages.length),
  );
  expect(await escrow.getFailedMessageIds()).deep.eq([
    ...pendingIdsBefore,
    ...messageIds,
  ]);

  for (let i = 0; i < messages.length; i++) {
    const failedMessage = await escrow.getFailedMessage(messageIds[i]);
    expect(failedMessage.originalRecipient).eq(messages[i].originalRecipient);
    expect(failedMessage.tokenAmount).eq(messages[i].tokenAmount);
    expect(failedMessage.status).eq(MessageStatus.Pending);
  }

  return messageIds;
};

export const setDefaultRecipient = async (
  fixture: Fixture,
  newDefaultRecipient: Account,
  opt?: CcipRevertParams,
) => {
  const { escrow, owner } = fixture;
  const caller = opt?.from ?? owner;
  const recipient = getAccount(newDefaultRecipient);

  const tx = () => escrow.connect(caller).setDefaultRecipient(recipient);

  if (opt?.revertMessage) {
    await expect(tx()).revertedWith(opt.revertMessage);
    return;
  }

  if (opt?.revertWithCustomError) {
    const assertion = expect(tx()).revertedWithCustomError(
      opt.revertWithCustomError.contract,
      opt.revertWithCustomError.error,
    );
    if (opt.revertWithCustomError.args) {
      await assertion.withArgs(...opt.revertWithCustomError.args);
    } else {
      await assertion;
    }
    return;
  }

  await expect(tx()).to.emit(escrow, 'SetDefaultRecipient').withArgs(recipient);

  expect(await escrow.defaultRecipient()).eq(recipient);
};

export const onFailedMessage = async (
  fixture: Fixture,
  {
    originalRecipient,
    tokenAmount,
  }: {
    originalRecipient: Account;
    tokenAmount: BigNumberish;
  },
  opt?: CcipRevertParams,
) => {
  const { escrow, owner } = fixture;
  const caller = opt?.from ?? owner;
  const recipient = getAccount(originalRecipient);

  const tx = () =>
    escrow.connect(caller).onFailedMessage(recipient, tokenAmount);

  if (opt?.revertMessage) {
    await expect(tx()).revertedWith(opt.revertMessage);
    return;
  }

  if (opt?.revertWithCustomError) {
    const assertion = expect(tx()).revertedWithCustomError(
      opt.revertWithCustomError.contract,
      opt.revertWithCustomError.error,
    );
    if (opt.revertWithCustomError.args) {
      await assertion.withArgs(...opt.revertWithCustomError.args);
    } else {
      await assertion;
    }
    return;
  }

  const failedMessageCountBefore = await escrow.failedMessageCount();
  const expectedMessageId = encodeEscrowMessageId(
    recipient,
    tokenAmount,
    failedMessageCountBefore,
  );

  await expect(tx())
    .to.emit(escrow, 'OnFailedMessage')
    .withArgs(expectedMessageId);

  const failedMessage = await escrow.getFailedMessage(expectedMessageId);
  expect(failedMessage.originalRecipient).eq(recipient);
  expect(failedMessage.tokenAmount).eq(tokenAmount);
  expect(failedMessage.status).eq(MessageStatus.Pending);
  expect(await escrow.getFailedMessageIds()).to.include(expectedMessageId);

  return expectedMessageId;
};

export const claimFailedMessage = async (
  fixture: Fixture,
  {
    messageId,
    recipient,
  }: {
    messageId: string;
    recipient: Account;
  },
  opt?: CcipRevertParams,
) => {
  const { escrow, mTBILL, owner } = fixture;
  const caller = opt?.from ?? owner;
  const to = getAccount(recipient);

  const tx = () => escrow.connect(caller).claim(messageId, to);

  if (opt?.revertMessage) {
    await expect(tx()).revertedWith(opt.revertMessage);
    return;
  }

  if (opt?.revertWithCustomError) {
    const assertion = expect(tx()).revertedWithCustomError(
      opt.revertWithCustomError.contract,
      opt.revertWithCustomError.error,
    );
    if (opt.revertWithCustomError.args) {
      await assertion.withArgs(...opt.revertWithCustomError.args);
    } else {
      await assertion;
    }
    return;
  }

  const failedMessage = await escrow.getFailedMessage(messageId);
  const escrowBalanceBefore = await mTBILL.balanceOf(escrow.address);
  const recipientBalanceBefore = await mTBILL.balanceOf(to);
  const pendingIdsBefore = await escrow.getFailedMessageIds();

  await expect(tx()).to.emit(escrow, 'Claim').withArgs(messageId, to);

  expect(await mTBILL.balanceOf(escrow.address)).eq(
    escrowBalanceBefore.sub(failedMessage.tokenAmount),
  );
  expect(await mTBILL.balanceOf(to)).eq(
    recipientBalanceBefore.add(failedMessage.tokenAmount),
  );
  expect((await escrow.getFailedMessage(messageId)).status).eq(
    MessageStatus.Claimed,
  );
  expect(await escrow.getFailedMessageIds()).deep.eq(
    pendingIdsBefore.filter((id) => id !== messageId),
  );
};

export const recoverBulk = async (
  fixture: Fixture,
  messageIds: string[],
  opt?: CcipRevertParams,
) => {
  const { escrow, mTBILL, owner } = fixture;
  const caller = opt?.from ?? owner;

  const tx = () => escrow.connect(caller).recoverBulk(messageIds);

  if (opt?.revertMessage) {
    await expect(tx()).revertedWith(opt.revertMessage);
    return;
  }

  if (opt?.revertWithCustomError) {
    const assertion = expect(tx()).revertedWithCustomError(
      opt.revertWithCustomError.contract,
      opt.revertWithCustomError.error,
    );
    if (opt.revertWithCustomError.args) {
      await assertion.withArgs(...opt.revertWithCustomError.args);
    } else {
      await assertion;
    }
    return;
  }

  const messages = await Promise.all(
    messageIds.map((id) => escrow.getFailedMessage(id)),
  );
  const escrowBalanceBefore = await mTBILL.balanceOf(escrow.address);
  const recipientBalancesBefore = await Promise.all(
    messages.map((message) => mTBILL.balanceOf(message.originalRecipient)),
  );
  const pendingIdsBefore = await escrow.getFailedMessageIds();
  const totalAmount = messages.reduce(
    (acc, message) => acc.add(message.tokenAmount),
    ethers.BigNumber.from(0),
  );

  await expect(tx()).to.emit(escrow, 'RecoverBulk').withArgs(messageIds);

  expect(await mTBILL.balanceOf(escrow.address)).eq(
    escrowBalanceBefore.sub(totalAmount),
  );

  for (let i = 0; i < messageIds.length; i++) {
    expect(await mTBILL.balanceOf(messages[i].originalRecipient)).eq(
      recipientBalancesBefore[i].add(messages[i].tokenAmount),
    );
    expect((await escrow.getFailedMessage(messageIds[i])).status).eq(
      MessageStatus.Recovered,
    );
  }

  expect(await escrow.getFailedMessageIds()).deep.eq(
    pendingIdsBefore.filter((id) => !messageIds.includes(id)),
  );
};

export const closeBulk = async (
  fixture: Fixture,
  messageIds: string[],
  opt?: CcipRevertParams,
) => {
  const { escrow, mTBILL, owner } = fixture;
  const caller = opt?.from ?? owner;
  const defaultRecipient = await escrow.defaultRecipient();

  const tx = () => escrow.connect(caller).closeBulk(messageIds);

  if (opt?.revertMessage) {
    await expect(tx()).revertedWith(opt.revertMessage);
    return;
  }

  if (opt?.revertWithCustomError) {
    const assertion = expect(tx()).revertedWithCustomError(
      opt.revertWithCustomError.contract,
      opt.revertWithCustomError.error,
    );
    if (opt.revertWithCustomError.args) {
      await assertion.withArgs(...opt.revertWithCustomError.args);
    } else {
      await assertion;
    }
    return;
  }

  const messages = await Promise.all(
    messageIds.map((id) => escrow.getFailedMessage(id)),
  );
  const escrowBalanceBefore = await mTBILL.balanceOf(escrow.address);
  const defaultRecipientBalanceBefore = await mTBILL.balanceOf(
    defaultRecipient,
  );
  const pendingIdsBefore = await escrow.getFailedMessageIds();
  const totalAmount = messages.reduce(
    (acc, message) => acc.add(message.tokenAmount),
    ethers.BigNumber.from(0),
  );

  await expect(tx()).to.emit(escrow, 'CloseBulk').withArgs(messageIds);

  expect(await mTBILL.balanceOf(escrow.address)).eq(
    escrowBalanceBefore.sub(totalAmount),
  );
  expect(await mTBILL.balanceOf(defaultRecipient)).eq(
    defaultRecipientBalanceBefore.add(totalAmount),
  );

  for (const messageId of messageIds) {
    expect((await escrow.getFailedMessage(messageId)).status).eq(
      MessageStatus.Closed,
    );
  }

  expect(await escrow.getFailedMessageIds()).deep.eq(
    pendingIdsBefore.filter((id) => !messageIds.includes(id)),
  );
};
