import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { expect } from 'chai';
import { BigNumber, BigNumberish, Contract } from 'ethers';
import { parseUnits } from 'ethers/lib/utils';
import { ethers } from 'hardhat';

import {
  ERC20,
  ERC20Mock,
  MidasAccessControl,
  MTBILL,
  Pausable,
} from '../../typechain-types';

export type OptionalCommonParams = {
  from?: SignerWithAddress;
  revertMessage?: string;
};

export type Account = SignerWithAddress | string;
export type AccountOrContract = Account | Contract;

export const getAccount = (account: AccountOrContract) => {
  return (
    (account as SignerWithAddress).address ??
    (account as Contract).address ??
    (account as string)
  );
};

export const pauseVault = async (
  vault: Pausable,
  opt?: OptionalCommonParams,
) => {
  const [defaultSigner] = await ethers.getSigners();

  if (opt?.revertMessage) {
    await expect(
      vault.connect(opt?.from ?? defaultSigner).pause(),
    ).revertedWith(opt?.revertMessage);
    return;
  }

  await expect(await vault.connect(opt?.from ?? defaultSigner).pause()).not
    .reverted;

  expect(await vault.paused()).eq(true);
};

export const pauseVaultFn = async (
  vault: Pausable,
  fnSelector: string,
  opt?: OptionalCommonParams,
) => {
  const [defaultSigner] = await ethers.getSigners();

  if (opt?.revertMessage) {
    await expect(
      vault.connect(opt?.from ?? defaultSigner).pauseFn(fnSelector),
    ).revertedWith(opt?.revertMessage);
    return;
  }

  await expect(
    await vault.connect(opt?.from ?? defaultSigner).pauseFn(fnSelector),
  ).not.reverted;

  expect(await vault.fnPaused(fnSelector)).eq(true);
};

export const unpauseVaultFn = async (
  vault: Pausable,
  fnSelector: string,
  opt?: OptionalCommonParams,
) => {
  const [defaultSigner] = await ethers.getSigners();

  if (opt?.revertMessage) {
    await expect(
      vault.connect(opt?.from ?? defaultSigner).unpauseFn(fnSelector),
    ).revertedWith(opt?.revertMessage);
    return;
  }

  await expect(
    await vault.connect(opt?.from ?? defaultSigner).unpauseFn(fnSelector),
  ).not.reverted;

  expect(await vault.fnPaused(fnSelector)).eq(false);
};

export const unpauseVault = async (
  vault: Pausable,
  opt?: OptionalCommonParams,
) => {
  const [defaultSigner] = await ethers.getSigners();

  if (opt?.revertMessage) {
    await expect(
      vault.connect(opt?.from ?? defaultSigner).unpause(),
    ).revertedWith(opt?.revertMessage);
    return;
  }

  await expect(await vault.connect(opt?.from ?? defaultSigner).unpause()).not
    .reverted;

  expect(await vault.paused()).eq(false);
};

export const mintToken = async (
  token: ERC20Mock | MTBILL,
  to: AccountOrContract,
  amountN: number,
) => {
  to = getAccount(to);
  const amount = await tokenAmountFromBase18(
    token,
    parseUnits(amountN.toString()),
  );
  await token.mint(to, amount);
};

export const approveBase18 = async (
  from: SignerWithAddress,
  token: ERC20,
  to: AccountOrContract,
  amountN: number,
) => {
  to = getAccount(to);
  const amount = await tokenAmountToBase18(
    token,
    parseUnits(amountN.toString()),
  );
  await expect(token.connect(from).approve(to, amount)).not.reverted;
};

export const amountToBase18 = async (
  decimals: BigNumberish,
  amount: BigNumberish,
) => {
  amount = BigNumber.from(amount);
  return amount.mul(parseUnits('1')).div(parseUnits('1', decimals));
};

export const amountFromBase18 = async (
  decimals: BigNumberish,
  amount: BigNumberish,
) => {
  amount = BigNumber.from(amount);
  return amount.mul(parseUnits('1', decimals)).div(parseUnits('1'));
};

export const tokenAmountToBase18 = async (
  token: ERC20,
  amount: BigNumberish,
) => {
  const decimals = await token.decimals();
  return amountToBase18(decimals, amount);
};

export const tokenAmountFromBase18 = async (
  token: ERC20,
  amount: BigNumberish,
) => {
  const decimals = await token.decimals();
  return amountFromBase18(decimals, amount);
};

export const balanceOfBase18 = async (token: ERC20, of: AccountOrContract) => {
  if (token.address === ethers.constants.AddressZero)
    return ethers.constants.Zero;
  of = getAccount(of);
  const balance = await token.balanceOf(of);
  return tokenAmountToBase18(token, balance);
};
