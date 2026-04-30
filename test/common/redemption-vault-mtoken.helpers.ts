import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { expect } from 'chai';
import { BigNumberish } from 'ethers';
import { parseUnits } from 'ethers/lib/utils';

import {
  AccountOrContract,
  OptionalCommonParams,
  getAccount,
  handleRevert,
  shouldRevert,
} from './common.helpers';
import { defaultDeploy } from './fixtures';
import { redeemInstantTest } from './redemption-vault.helpers';

import {
  ERC20,
  ERC20__factory,
  RedemptionVaultWithMToken,
} from '../../typechain-types';

type CommonParamsRedeem = Pick<
  Awaited<ReturnType<typeof defaultDeploy>>,
  | 'owner'
  | 'mTokenLoan'
  | 'mTBILL'
  | 'redemptionVaultWithMToken'
  | 'mTokenLoanToUsdDataFeed'
  | 'mTokenToUsdDataFeed'
>;

type CommonParamsSetVault = {
  vault: RedemptionVaultWithMToken;
  owner: SignerWithAddress;
};

export const redeemInstantWithMTokenTest = async (
  {
    redemptionVaultWithMToken,
    owner,
    mTokenLoan,
    mTBILL,
    mTokenToUsdDataFeed,
    useMTokenSleeve,
    minAmount,
    waivedFee,
    customRecipient,
    additionalLiquidity,
  }: CommonParamsRedeem & {
    useMTokenSleeve?: boolean;
    waivedFee?: boolean;
    minAmount?: BigNumberish;
    customRecipient?: AccountOrContract;
    additionalLiquidity?: () => Promise<BigNumberish>;
  },
  tokenOut: ERC20 | string,
  amountMFoneIn: number,
  opt?: OptionalCommonParams,
) => {
  tokenOut = getAccount(tokenOut);

  const tokenContract = ERC20__factory.connect(tokenOut, owner);

  const sender = opt?.from ?? owner;

  const amountIn = parseUnits(amountMFoneIn.toString());

  if (shouldRevert(opt)) {
    await redeemInstantTest(
      {
        redemptionVault: redemptionVaultWithMToken,
        owner,
        mTBILL,
        mTokenToUsdDataFeed,
        waivedFee,
        minAmount,
        customRecipient,
        additionalLiquidity,
      },
      tokenOut,
      amountMFoneIn,
      opt,
    );

    return;
  }

  const balanceBeforeUserMFone = await mTBILL.balanceOf(sender.address);
  const balanceBeforeVaultMTbill = await mTokenLoan.balanceOf(
    redemptionVaultWithMToken.address,
  );
  const supplyBeforeMFone = await mTBILL.totalSupply();
  const supplyBeforeMTbill = await mTokenLoan.totalSupply();

  await redeemInstantTest(
    {
      redemptionVault: redemptionVaultWithMToken,
      owner,
      mTBILL,
      mTokenToUsdDataFeed,
      waivedFee,
      minAmount,
      customRecipient,
      additionalLiquidity,
    },
    tokenOut,
    amountMFoneIn,
    opt,
  );

  const balanceAfterUserMFone = await mTBILL.balanceOf(sender.address);
  const balanceAfterVaultMTbill = await mTokenLoan.balanceOf(
    redemptionVaultWithMToken.address,
  );
  const supplyAfterMFone = await mTBILL.totalSupply();
  const supplyAfterMTbill = await mTokenLoan.totalSupply();

  // mTBILL is always burned from user
  expect(balanceAfterUserMFone).eq(balanceBeforeUserMFone.sub(amountIn));
  expect(supplyAfterMFone).eq(supplyBeforeMFone.sub(amountIn));

  if (useMTokenSleeve) {
    // mTokenLoan was redeemed from the vault's holdings
    expect(balanceAfterVaultMTbill).lt(balanceBeforeVaultMTbill);
    expect(supplyAfterMTbill).lt(supplyBeforeMTbill);
  } else {
    // Vault had enough tokenOut, mTokenLoan untouched
    expect(balanceAfterVaultMTbill).eq(balanceBeforeVaultMTbill);
    expect(supplyAfterMTbill).eq(supplyBeforeMTbill);
  }
};

export const setRedemptionVaultTest = async (
  { vault, owner }: CommonParamsSetVault,
  newVault: string,
  opt?: OptionalCommonParams,
) => {
  if (
    await handleRevert(
      vault.connect(opt?.from ?? owner).setRedemptionVault.bind(this, newVault),
      vault,
      opt,
    )
  ) {
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
