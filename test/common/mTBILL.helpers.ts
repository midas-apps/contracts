import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { expect } from 'chai';
import { BigNumber, BigNumberish } from 'ethers';
import { defaultAbiCoder, solidityKeccak256 } from 'ethers/lib/utils';

import {
  Account,
  OptionalCommonParams,
  getAccount,
  getCurrentBlockTimestamp,
  handleRevert,
} from './common.helpers';

import { MTBILL, MToken, MTokenPermissioned } from '../../typechain-types';

type CommonParams = {
  tokenContract: MToken | MTBILL | MTokenPermissioned;
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

  await expect(
    tokenContract
      .connect(opt?.from ?? owner)
      .setMetadata(keyBytes32, valueBytes),
  ).not.reverted;

  expect(await tokenContract.metadata(keyBytes32)).eq(valueBytes);
};

export const mint = async (
  { tokenContract, owner }: CommonParams,
  to: Account,
  amount: BigNumberish,
  opt?: OptionalCommonParams,
) => {
  to = getAccount(to);

  if (
    await handleRevert(
      tokenContract.connect(opt?.from ?? owner).mint.bind(this, to, amount),
      tokenContract,
      opt,
    )
  ) {
    return;
  }

  const balanceBefore = await tokenContract.balanceOf(to);

  const rateLimitConfigsBefore = await tokenContract.getMintRateLimitConfigs();

  const currentTimeBefore = await getCurrentBlockTimestamp();

  const lastEpochesBefore = rateLimitConfigsBefore.windows.map((window) =>
    BigNumber.from(currentTimeBefore).div(window),
  );

  await expect(tokenContract.connect(owner).mint(to, amount)).to.emit(
    tokenContract,
    tokenContract.interface.events['Transfer(address,address,uint256)'].name,
  ).to.not.reverted;

  const rateLimitConfigsAfter = await tokenContract.getMintRateLimitConfigs();

  const currentTimeAfter = await getCurrentBlockTimestamp();

  const lastEpochesAfter = rateLimitConfigsAfter.windows.map((window) =>
    BigNumber.from(currentTimeAfter).div(window),
  );

  for (const [i] of rateLimitConfigsBefore.windows.entries()) {
    const currentEpoch = lastEpochesAfter[i];
    const lastEpoch = lastEpochesBefore[i];

    const resetEpoch = currentEpoch.eq(lastEpoch);
    const expectedLimitUsed = resetEpoch
      ? amount
      : rateLimitConfigsBefore.configs[i].limitUsed.add(amount);

    expect(rateLimitConfigsAfter.configs[i].limit).eq(
      rateLimitConfigsBefore.configs[i].limit,
    );
    expect(rateLimitConfigsAfter.configs[i].limitUsed).eq(expectedLimitUsed);
    expect(rateLimitConfigsAfter.configs[i].lastEpoch).eq(currentEpoch);
  }

  const balanceAfter = await tokenContract.balanceOf(to);

  expect(balanceAfter.sub(balanceBefore)).eq(amount);
};

export const burn = async (
  { tokenContract, owner }: CommonParams,
  from: Account,
  amount: BigNumberish,
  opt?: OptionalCommonParams,
) => {
  from = getAccount(from);

  if (
    await handleRevert(
      tokenContract.connect(opt?.from ?? owner).burn.bind(this, from, amount),
      tokenContract,
      opt,
    )
  ) {
    return;
  }

  const balanceBefore = await tokenContract.balanceOf(from);

  const rateLimitConfigsBefore = await tokenContract.getMintRateLimitConfigs();
  await expect(tokenContract.connect(owner).burn(from, amount)).to.emit(
    tokenContract,
    tokenContract.interface.events['Transfer(address,address,uint256)'].name,
  ).to.not.reverted;

  const rateLimitConfigsAfter = await tokenContract.getMintRateLimitConfigs();

  for (const [i] of rateLimitConfigsBefore.windows.entries()) {
    expect(rateLimitConfigsAfter.configs[i].limit).eq(
      rateLimitConfigsBefore.configs[i].limit,
    );
    expect(rateLimitConfigsAfter.configs[i].limitUsed).eq(
      rateLimitConfigsBefore.configs[i].limitUsed,
    );
    expect(rateLimitConfigsAfter.configs[i].lastEpoch).eq(
      rateLimitConfigsBefore.configs[i].lastEpoch,
    );
  }

  const balanceAfter = await tokenContract.balanceOf(from);

  expect(balanceBefore.sub(balanceAfter)).eq(amount);
};

export const increaseMintRateLimit = async (
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

  const rateLimitConfigsBefore = await tokenContract.getMintRateLimitConfigs();

  await expect(
    tokenContract.connect(owner).increaseMintRateLimit(window, newLimit),
  ).to.emit(
    tokenContract,
    tokenContract.interface.events[
      'SetMintRateLimitConfig(address,uint256,uint256)'
    ].name,
  ).to.not.reverted;

  const rateLimitConfigsAfter = await tokenContract.getMintRateLimitConfigs();

  const configBefore = rateLimitConfigsBefore.windows
    .map((w, i) => ({ window: w, config: rateLimitConfigsBefore.configs[i] }))
    .filter((w) => w.window.eq(window))?.[0];

  const configAfter = rateLimitConfigsAfter.windows
    .map((w, i) => ({ window: w, config: rateLimitConfigsAfter.configs[i] }))
    .filter((w) => w.window.eq(window))?.[0];

  if (configBefore) {
    expect(configAfter).not.eq(undefined);
    expect(configBefore).not.eq(undefined);
    expect(configAfter.config.limit).eq(newLimit);
    expect(configAfter.config.limitUsed).eq(configBefore.config.limitUsed);
    expect(configAfter.config.lastEpoch).eq(configBefore.config.lastEpoch);
  } else {
    expect(configAfter).not.eq(undefined);
    expect(configBefore).eq(undefined);
    expect(configAfter.config.limit).eq(newLimit);
    expect(configAfter.config.limitUsed).eq(0);
    expect(configAfter.config.lastEpoch).eq(0);
  }
};

export const decreaseMintRateLimit = async (
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

  const rateLimitConfigsBefore = await tokenContract.getMintRateLimitConfigs();

  await expect(
    tokenContract.connect(owner).decreaseMintRateLimit(window, newLimit),
  ).to.emit(
    tokenContract,
    tokenContract.interface.events[
      'SetMintRateLimitConfig(address,uint256,uint256)'
    ].name,
  ).to.not.reverted;

  const rateLimitConfigsAfter = await tokenContract.getMintRateLimitConfigs();

  const configBefore = rateLimitConfigsBefore.windows
    .map((w, i) => ({ window: w, config: rateLimitConfigsBefore.configs[i] }))
    .filter((w) => w.window.eq(window))?.[0];

  const configAfter = rateLimitConfigsAfter.windows
    .map((w, i) => ({ window: w, config: rateLimitConfigsAfter.configs[i] }))
    .filter((w) => w.window.eq(window))?.[0];

  if (configBefore) {
    expect(configAfter).not.eq(undefined);
    expect(configBefore).not.eq(undefined);
    expect(configAfter.config.limit).eq(newLimit);
    expect(configAfter.config.limitUsed).eq(configBefore.config.limitUsed);
    expect(configAfter.config.lastEpoch).eq(configBefore.config.lastEpoch);
  } else {
    expect(configAfter).not.eq(undefined);
    expect(configBefore).eq(undefined);
    expect(configAfter.config.limit).eq(newLimit);
    expect(configAfter.config.limitUsed).eq(0);
    expect(configAfter.config.lastEpoch).eq(0);
  }
};
