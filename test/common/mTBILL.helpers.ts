import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { expect } from 'chai';
import { BigNumberish } from 'ethers';
import { defaultAbiCoder, solidityKeccak256 } from 'ethers/lib/utils';

import {
  Account,
  OptionalCommonParams,
  getAccount,
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

  await expect(tokenContract.connect(owner).mint(to, amount)).to.emit(
    tokenContract,
    tokenContract.interface.events['Transfer(address,address,uint256)'].name,
  ).to.not.reverted;

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

  await expect(tokenContract.connect(owner).burn(from, amount)).to.emit(
    tokenContract,
    tokenContract.interface.events['Transfer(address,address,uint256)'].name,
  ).to.not.reverted;

  const balanceAfter = await tokenContract.balanceOf(from);

  expect(balanceBefore.sub(balanceAfter)).eq(amount);
};
