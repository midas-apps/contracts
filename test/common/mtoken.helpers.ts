import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { expect } from 'chai';
import { BigNumberish, constants } from 'ethers';
import { defaultAbiCoder, solidityKeccak256 } from 'ethers/lib/utils';

import {
  Account,
  OptionalCommonParams,
  getAccount,
  getCurrentBlockTimestamp,
  handleRevert,
} from './common.helpers';
import { calculateWindowRateLimitCapacity } from './manageable-vault.helpers';

import { MToken, MTokenPermissioned } from '../../typechain-types';

type CommonParams = {
  tokenContract: MToken | MTokenPermissioned;
  owner: SignerWithAddress;
};

export const setMetadataTest = async (
  { tokenContract, owner }: CommonParams,
  key: string,
  value: string,
  opt?: OptionalCommonParams,
) => {
  const keyBytes32 = solidityKeccak256(['string'], [key]);
  const valueBytes = defaultAbiCoder.encode(['string'], [value]);

  if (
    await handleRevert(
      tokenContract
        .connect(opt?.from ?? owner)
        .setMetadata.bind(this, keyBytes32, valueBytes),
      tokenContract,
      opt,
    )
  ) {
    return;
  }

  await tokenContract
    .connect(opt?.from ?? owner)
    .setMetadata(keyBytes32, valueBytes);

  expect(await tokenContract.metadata(keyBytes32)).eq(valueBytes);
};

export const setClawbackReceiverTest = async (
  { tokenContract, owner }: CommonParams,
  newReceiver: string,
  opt?: OptionalCommonParams,
) => {
  const from = opt?.from ?? owner;

  if (
    await handleRevert(
      tokenContract.connect(from).setClawbackReceiver.bind(this, newReceiver),
      tokenContract,
      opt,
    )
  ) {
    return;
  }

  await expect(tokenContract.connect(from).setClawbackReceiver(newReceiver))
    .to.emit(
      tokenContract,
      tokenContract.interface.events['ClawbackReceiverSet(address)'].name,
    )
    .withArgs(newReceiver);
  expect(await tokenContract.clawbackReceiver()).eq(newReceiver);
};

export const clawbackTest = async (
  { tokenContract, owner }: CommonParams,
  amount: BigNumberish,
  from: Account,
  opt?: OptionalCommonParams,
) => {
  const fromAddr = getAccount(from);
  const caller = opt?.from ?? owner;
  const receiver = await tokenContract.clawbackReceiver();

  if (
    await handleRevert(
      tokenContract.connect(caller).clawback.bind(this, amount, fromAddr),
      tokenContract,
      opt,
    )
  ) {
    return;
  }

  const balanceFromBefore = await tokenContract.balanceOf(fromAddr);
  const balanceReceiverBefore = await tokenContract.balanceOf(receiver);

  await expect(
    tokenContract.connect(caller).clawback(amount, fromAddr),
  ).to.emit(
    tokenContract,
    tokenContract.interface.events['Transfer(address,address,uint256)'].name,
  );

  expect(await tokenContract.balanceOf(fromAddr)).eq(
    balanceFromBefore.sub(amount),
  );
  expect(await tokenContract.balanceOf(receiver)).eq(
    balanceReceiverBefore.add(amount),
  );
};

export const mint = async (
  {
    tokenContract,
    owner,
    isGoverned = false,
  }: CommonParams & { isGoverned?: boolean },
  to: Account,
  amount: BigNumberish,
  opt?: OptionalCommonParams,
) => {
  to = getAccount(to);

  const caller = opt?.from ?? owner;

  const callFn = isGoverned
    ? tokenContract.connect(caller).mintGoverned.bind(this, to, amount)
    : tokenContract.connect(caller).mint.bind(this, to, amount);

  if (await handleRevert(callFn, tokenContract, opt)) {
    return;
  }

  const balanceBefore = await tokenContract.balanceOf(to);

  const rateLimitConfigsBefore = await tokenContract.getMintRateLimitStatuses();

  const timetsampBefore = await getCurrentBlockTimestamp();

  await expect(callFn()).to.emit(
    tokenContract,
    tokenContract.interface.events['Transfer(address,address,uint256)'].name,
  );

  const rateLimitConfigsAfter = await tokenContract.getMintRateLimitStatuses();
  const timestampAfter = await getCurrentBlockTimestamp();

  const expectedLimitsAfter = await Promise.all(
    rateLimitConfigsBefore.map(async (limit) => {
      const { remaining, inFlight } = calculateWindowRateLimitCapacity({
        amountInFlight: limit.inFlight,
        lastUpdated: timetsampBefore,
        limit: limit.limit,
        window: limit.window,
        now: timestampAfter,
      });

      return {
        ...limit,
        remaining: remaining.gte(amount)
          ? remaining.sub(amount)
          : constants.Zero,
        inFlight: inFlight.add(amount),
      };
    }),
  );

  const currentTimestamp = await getCurrentBlockTimestamp();

  for (const [index, limit] of rateLimitConfigsBefore.entries()) {
    expect(rateLimitConfigsAfter[index].inFlight).eq(
      expectedLimitsAfter[index].inFlight,
    );
    expect(rateLimitConfigsAfter[index].remaining).eq(
      expectedLimitsAfter[index].remaining,
    );
    expect(rateLimitConfigsAfter[index].lastUpdated).eq(currentTimestamp);
    expect(rateLimitConfigsAfter[index].window).eq(limit.window);
    expect(rateLimitConfigsAfter[index].limit).eq(limit.limit);
  }

  const balanceAfter = await tokenContract.balanceOf(to);

  expect(balanceAfter.sub(balanceBefore)).eq(amount);
};

export const burn = async (
  {
    tokenContract,
    owner,
    isGoverned = false,
  }: CommonParams & { isGoverned?: boolean },
  from: Account,
  amount: BigNumberish,
  opt?: OptionalCommonParams,
) => {
  from = getAccount(from);

  const caller = opt?.from ?? owner;

  const callFn = isGoverned
    ? tokenContract.connect(caller).burnGoverned.bind(this, from, amount)
    : tokenContract.connect(caller).burn.bind(this, from, amount);

  if (await handleRevert(callFn, tokenContract, opt)) {
    return;
  }

  const balanceBefore = await tokenContract.balanceOf(from);

  const rateLimitConfigsBefore = await tokenContract.getMintRateLimitStatuses();

  await expect(callFn()).to.emit(
    tokenContract,
    tokenContract.interface.events['Transfer(address,address,uint256)'].name,
  );

  const rateLimitConfigsAfter = await tokenContract.getMintRateLimitStatuses();

  for (const [index, limit] of rateLimitConfigsBefore.entries()) {
    expect(rateLimitConfigsAfter[index].limit).eq(limit.limit);
    expect(rateLimitConfigsAfter[index].inFlight).gte(limit.inFlight);
    expect(rateLimitConfigsAfter[index].remaining).lte(limit.remaining);
    expect(rateLimitConfigsAfter[index].lastUpdated).eq(limit.lastUpdated);
    expect(rateLimitConfigsAfter[index].window).eq(limit.window);
  }

  const balanceAfter = await tokenContract.balanceOf(from);

  expect(balanceBefore.sub(balanceAfter)).eq(amount);
};

export const increaseMintRateLimitTest = async (
  { tokenContract, owner }: CommonParams,
  window: number,
  newLimit: BigNumberish,
  opt?: OptionalCommonParams,
) => {
  if (
    await handleRevert(
      tokenContract
        .connect(opt?.from ?? owner)
        .increaseMintRateLimit.bind(this, window, newLimit),
      tokenContract,
      opt,
    )
  ) {
    return;
  }

  const rateLimitConfigsBefore = await tokenContract.getMintRateLimitStatuses();

  await expect(
    tokenContract.connect(owner).increaseMintRateLimit(window, newLimit),
  )
    .to.emit(tokenContract, 'WindowLimitSet')
    .withArgs(window, newLimit);
  const currentTimestamp = await getCurrentBlockTimestamp();
  const rateLimitConfigsAfter = await tokenContract.getMintRateLimitStatuses();

  const configBefore = rateLimitConfigsBefore.filter((limit) =>
    limit.window.eq(window),
  )?.[0];
  const configAfter = rateLimitConfigsAfter.filter((limit) =>
    limit.window.eq(window),
  )?.[0];

  if (configBefore) {
    const { inFlight, remaining } = calculateWindowRateLimitCapacity({
      amountInFlight: configBefore.inFlight,
      lastUpdated: configBefore.lastUpdated,
      limit: newLimit,
      window,
      now: currentTimestamp,
    });

    expect(configAfter).not.eq(undefined);
    expect(configBefore).not.eq(undefined);
    expect(configAfter.limit).eq(newLimit);
    expect(configAfter.lastUpdated).eq(currentTimestamp);
    expect(configAfter.inFlight).eq(inFlight);
    expect(configAfter.remaining).eq(remaining);
  } else {
    expect(configAfter).not.eq(undefined);
    expect(configBefore).eq(undefined);
    expect(configAfter.limit).eq(newLimit);
    expect(configAfter.inFlight).eq(0);
    expect(configAfter.lastUpdated).eq(currentTimestamp);
    expect(configAfter.remaining).eq(newLimit);
  }
};

export const decreaseMintRateLimitTest = async (
  { tokenContract, owner }: CommonParams,
  window: number,
  newLimit: BigNumberish,
  opt?: OptionalCommonParams,
) => {
  if (
    await handleRevert(
      tokenContract
        .connect(opt?.from ?? owner)
        .decreaseMintRateLimit.bind(this, window, newLimit),
      tokenContract,
      opt,
    )
  ) {
    return;
  }

  const rateLimitConfigsBefore = await tokenContract.getMintRateLimitStatuses();

  await expect(
    tokenContract.connect(owner).decreaseMintRateLimit(window, newLimit),
  )
    .to.emit(tokenContract, 'WindowLimitSet')
    .withArgs(window, newLimit);

  const currentTimestamp = await getCurrentBlockTimestamp();
  const rateLimitConfigsAfter = await tokenContract.getMintRateLimitStatuses();

  const configBefore = rateLimitConfigsBefore.filter((limit) =>
    limit.window.eq(window),
  )?.[0];

  const configAfter = rateLimitConfigsAfter.filter((limit) =>
    limit.window.eq(window),
  )?.[0];

  if (configBefore) {
    const { inFlight, remaining } = calculateWindowRateLimitCapacity({
      amountInFlight: configBefore.inFlight,
      lastUpdated: configBefore.lastUpdated,
      limit: newLimit,
      window,
      now: currentTimestamp,
    });

    expect(configAfter).not.eq(undefined);
    expect(configBefore).not.eq(undefined);
    expect(configAfter.limit).eq(newLimit);
    expect(configAfter.lastUpdated).eq(currentTimestamp);
    expect(configAfter.inFlight).eq(inFlight);
    expect(configAfter.remaining).eq(remaining);
  } else {
    expect(configAfter).not.eq(undefined);
    expect(configBefore).eq(undefined);
    expect(configAfter.limit).eq(newLimit);
    expect(configAfter.inFlight).eq(0);
    expect(configAfter.lastUpdated).eq(currentTimestamp);
    expect(configAfter.remaining).eq(newLimit);
  }
};
