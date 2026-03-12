import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { expect } from 'chai';
import { BigNumberish } from 'ethers';
import { parseUnits } from 'ethers/lib/utils';

import {
  AccountOrContract,
  OptionalCommonParams,
  getAccount,
} from './common.helpers';
import { defaultDeploy } from './fixtures';
import {
  calcExpectedTokenOutAmount,
  redeemInstantTest,
} from './redemption-vault.helpers';

import {
  ERC20,
  ERC20__factory,
  RedemptionVaultWithMToken,
} from '../../typechain-types';

type CommonParamsRedeem = Pick<
  Awaited<ReturnType<typeof defaultDeploy>>,
  | 'owner'
  | 'mTBILL'
  | 'mFONE'
  | 'redemptionVaultWithMToken'
  | 'mTokenToUsdDataFeed'
  | 'mFoneToUsdDataFeed'
>;

type CommonParamsSetVault = {
  vault: RedemptionVaultWithMToken;
  owner: SignerWithAddress;
};

export const redeemInstantWithMTokenTest = async (
  {
    redemptionVaultWithMToken,
    owner,
    mTBILL,
    mFONE,
    mFoneToUsdDataFeed,
    useMTokenSleeve,
    minAmount,
    waivedFee,
    customRecipient,
  }: CommonParamsRedeem & {
    useMTokenSleeve?: boolean;
    waivedFee?: boolean;
    minAmount?: BigNumberish;
    customRecipient?: AccountOrContract;
  },
  tokenOut: ERC20 | string,
  amountMFoneIn: number,
  opt?: OptionalCommonParams,
) => {
  tokenOut = getAccount(tokenOut);

  const tokenContract = ERC20__factory.connect(tokenOut, owner);

  const sender = opt?.from ?? owner;

  const amountIn = parseUnits(amountMFoneIn.toString());

  if (opt?.revertMessage) {
    await redeemInstantTest(
      {
        redemptionVault: redemptionVaultWithMToken,
        owner,
        mTBILL: mFONE,
        mTokenToUsdDataFeed: mFoneToUsdDataFeed,
        waivedFee,
        minAmount,
        customRecipient,
      },
      tokenOut,
      amountMFoneIn,
      opt,
    );

    return;
  }

  const balanceBeforeUserMFone = await mFONE.balanceOf(sender.address);
  const balanceBeforeVaultMTbill = await mTBILL.balanceOf(
    redemptionVaultWithMToken.address,
  );
  const supplyBeforeMFone = await mFONE.totalSupply();
  const supplyBeforeMTbill = await mTBILL.totalSupply();

  const mFoneRate = await mFoneToUsdDataFeed.getDataInBase18();

  const { amountInWithoutFee } = await calcExpectedTokenOutAmount(
    sender,
    tokenContract,
    redemptionVaultWithMToken,
    mFoneRate,
    amountIn,
    true,
  );

  await redeemInstantTest(
    {
      redemptionVault: redemptionVaultWithMToken,
      owner,
      mTBILL: mFONE,
      mTokenToUsdDataFeed: mFoneToUsdDataFeed,
      waivedFee,
      minAmount,
      customRecipient,
    },
    tokenOut,
    amountMFoneIn,
    opt,
  );

  const balanceAfterUserMFone = await mFONE.balanceOf(sender.address);
  const balanceAfterVaultMTbill = await mTBILL.balanceOf(
    redemptionVaultWithMToken.address,
  );
  const supplyAfterMFone = await mFONE.totalSupply();
  const supplyAfterMTbill = await mTBILL.totalSupply();

  // mFONE is always burned from user
  expect(balanceAfterUserMFone).eq(balanceBeforeUserMFone.sub(amountIn));
  expect(supplyAfterMFone).eq(supplyBeforeMFone.sub(amountInWithoutFee));

  if (useMTokenSleeve) {
    // mTBILL was redeemed from the vault's holdings
    expect(balanceAfterVaultMTbill).lt(balanceBeforeVaultMTbill);
    expect(supplyAfterMTbill).lt(supplyBeforeMTbill);
  } else {
    // Vault had enough tokenOut, mTBILL untouched
    expect(balanceAfterVaultMTbill).eq(balanceBeforeVaultMTbill);
    expect(supplyAfterMTbill).eq(supplyBeforeMTbill);
  }
};

export const setRedemptionVaultTest = async (
  { vault, owner }: CommonParamsSetVault,
  newVault: string,
  opt?: OptionalCommonParams,
) => {
  if (opt?.revertMessage) {
    await expect(
      vault.connect(opt?.from ?? owner).setRedemptionVault(newVault),
    ).revertedWith(opt?.revertMessage);
    return;
  }

  await expect(vault.connect(opt?.from ?? owner).setRedemptionVault(newVault))
    .to.emit(
      vault,
      vault.interface.events['SetRedemptionVault(address,address)'].name,
    )
    .withArgs((opt?.from ?? owner).address, newVault).to.not.reverted;

  const provider = await vault.redemptionVault();
  expect(provider).eq(newVault);
};
