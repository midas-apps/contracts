import { expect } from 'chai';
import { BigNumberish, Contract } from 'ethers';
import { ethers } from 'hardhat';

import { OptionalCommonParams } from './common.helpers';
import { ccipCctFixture } from './fixtures';

type Fixture = Awaited<ReturnType<typeof ccipCctFixture>>;

export const encodeDecimals = (decimals: number) =>
  ethers.utils.defaultAbiCoder.encode(['uint256'], [decimals]);

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

  const tx = () => pool.connect(caller).lockOrBurn(lockOrBurnIn);

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

  const out = await pool.connect(caller).callStatic.lockOrBurn(lockOrBurnIn);
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
  }: ReleaseOrMintParams,
  opt?: CcipRevertParams,
) => {
  const { pool, mTBILL, offRamp, owner, remotePoolAddress } = fixture;

  const caller = opt?.from ?? offRamp;
  const to = receiver ?? owner.address;

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

  const tx = () => pool.connect(caller).releaseOrMint(releaseOrMintIn);

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

  const out = await pool
    .connect(caller)
    .callStatic.releaseOrMint(releaseOrMintIn);
  expect(out.destinationAmount).eq(amount);

  await expect(tx())
    .to.emit(pool, 'ReleasedOrMinted')
    .withArgs(
      releaseOrMintIn.remoteChainSelector,
      mTBILL.address,
      caller.address,
      to,
      amount,
    );

  const totalSupplyAfter = await mTBILL.totalSupply();
  const balanceToAfter = await mTBILL.balanceOf(to);

  expect(totalSupplyAfter).eq(totalSupplyBefore.add(amount));
  expect(balanceToAfter).eq(balanceToBefore.add(amount));
};
