import { anyValue } from '@nomicfoundation/hardhat-chai-matchers/withArgs';
import { expect } from 'chai';
import { BigNumberish, Contract } from 'ethers';
import { ethers } from 'hardhat';

import { Account, OptionalCommonParams, getAccount } from './common.helpers';
import { ccipCctFixture } from './fixtures';

type Fixture = Awaited<ReturnType<typeof ccipCctFixture>>;

export const encodeDecimals = (decimals: number) =>
  ethers.utils.defaultAbiCoder.encode(['uint256'], [decimals]);

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
  }: ReleaseOrMintParams,
  opt?: CcipRevertParams,
) => {
  const { pool, mTBILL, offRamp, owner, remotePoolAddress } = fixture;

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

  const tx = () => pool.connect(caller)[RELEASE_OR_MINT_SIG](releaseOrMintIn);

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
  const balanceToBefore = await mTBILL.balanceOf(to);
  const balanceFallbackBefore = await mTBILL.balanceOf(fallback);

  const out = await pool
    .connect(caller)
    .callStatic[RELEASE_OR_MINT_SIG](releaseOrMintIn);
  expect(out.destinationAmount).eq(amount);

  const assertion = expect(tx())
    .to.emit(pool, 'ReleasedOrMinted')
    .withArgs(
      releaseOrMintIn.remoteChainSelector,
      mTBILL.address,
      caller.address,
      to,
      amount,
    );

  if (expectFallback) {
    await assertion.and.to
      .emit(pool, 'FallbackHit')
      .withArgs(to, fallback, amount, anyValue);
  } else {
    await assertion.and.to.not.emit(pool, 'FallbackHit');
  }

  const totalSupplyAfter = await mTBILL.totalSupply();
  const balanceToAfter = await mTBILL.balanceOf(to);
  const balanceFallbackAfter = await mTBILL.balanceOf(fallback);

  expect(totalSupplyAfter).eq(totalSupplyBefore.add(amount));

  if (expectFallback) {
    expect(balanceToAfter).eq(balanceToBefore);
    expect(balanceFallbackAfter).eq(balanceFallbackBefore.add(amount));
  } else {
    expect(balanceToAfter).eq(balanceToBefore.add(amount));
    if (fallback !== to) {
      expect(balanceFallbackAfter).eq(balanceFallbackBefore);
    }
  }
};
