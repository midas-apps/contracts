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
  RedemptionVaultWithSwapper,
} from '../../typechain-types';

type CommonParamsRedeem = Pick<
  Awaited<ReturnType<typeof defaultDeploy>>,
  | 'owner'
  | 'mTBILL'
  | 'mBASIS'
  | 'redemptionVaultWithSwapper'
  | 'mTokenToUsdDataFeed'
  | 'mBasisToUsdDataFeed'
>;
type CommonParamsProvider = {
  vault: RedemptionVaultWithSwapper;
  owner: SignerWithAddress;
};

export const redeemInstantWithSwapperTest = async (
  {
    redemptionVaultWithSwapper,
    owner,
    mTBILL,
    mBASIS,
    mBasisToUsdDataFeed,
    mTokenToUsdDataFeed,
    swap,
    minAmount,
    waivedFee,
    customRecipient,
  }: CommonParamsRedeem & {
    swap?: boolean;
    waivedFee?: boolean;
    minAmount?: BigNumberish;
    customRecipient?: AccountOrContract;
  },
  tokenOut: ERC20 | string,
  amountTBillIn: number,
  opt?: OptionalCommonParams,
) => {
  tokenOut = getAccount(tokenOut);

  const tokenContract = ERC20__factory.connect(tokenOut, owner);

  const sender = opt?.from ?? owner;

  const amountIn = parseUnits(amountTBillIn.toString());
  const tokensReceiver = await redemptionVaultWithSwapper.tokensReceiver();
  const feeReceiver = await redemptionVaultWithSwapper.feeReceiver();
  const liquidityProvider =
    await redemptionVaultWithSwapper.liquidityProvider();

  if (opt?.revertMessage) {
    await redeemInstantTest(
      {
        redemptionVault: redemptionVaultWithSwapper,
        owner,
        mTBILL: mBASIS,
        mTokenToUsdDataFeed: mBasisToUsdDataFeed,
        waivedFee,
        minAmount,
        customRecipient,
        checkSupply: !swap,
      },
      tokenOut,
      amountTBillIn,
      opt,
    );

    return;
  }

  const balanceBeforeUserMTBILL = await mTBILL.balanceOf(sender.address);
  const balanceBeforeUserMBASIS = await mBASIS.balanceOf(sender.address);

  const balanceBeforeContractMTBILL = await mTBILL.balanceOf(
    redemptionVaultWithSwapper.address,
  );
  const balanceBeforeContractMBASIS = await mBASIS.balanceOf(
    redemptionVaultWithSwapper.address,
  );

  const balanceBeforeProviderMTBILL = await mTBILL.balanceOf(liquidityProvider);
  const balanceBeforeProviderMBASIS = await mBASIS.balanceOf(liquidityProvider);

  const balanceBeforeReceiverMTBILL = await mTBILL.balanceOf(tokensReceiver);

  const balanceBeforeFeeReceiverMTBILL = await mTBILL.balanceOf(feeReceiver);

  const supplyBeforeMTBILL = await mTBILL.totalSupply();
  const supplyBeforeMBASIS = await mBASIS.totalSupply();

  const mBasisRate = await mBasisToUsdDataFeed.getDataInBase18();
  const mTokenRate = await mTokenToUsdDataFeed.getDataInBase18();

  const { amountInWithoutFee } = await calcExpectedTokenOutAmount(
    sender,
    tokenContract,
    redemptionVaultWithSwapper,
    mBasisRate,
    amountIn,
    true,
  );

  const expectedMToken = amountInWithoutFee.mul(mBasisRate).div(mTokenRate);

  await redeemInstantTest(
    {
      redemptionVault: redemptionVaultWithSwapper,
      owner,
      mTBILL: mBASIS,
      mTokenToUsdDataFeed: mBasisToUsdDataFeed,
      waivedFee,
      minAmount,
      customRecipient,
      checkSupply: !swap,
    },
    tokenOut,
    amountTBillIn,
    opt,
  );

  const balanceAfterUserMTBILL = await mTBILL.balanceOf(sender.address);
  const balanceAfterUserMBASIS = await mBASIS.balanceOf(sender.address);

  const balanceAfterContractMTBILL = await mTBILL.balanceOf(
    redemptionVaultWithSwapper.address,
  );
  const balanceAfterContractMBASIS = await mBASIS.balanceOf(
    redemptionVaultWithSwapper.address,
  );

  const balanceAfterProviderMTBILL = await mTBILL.balanceOf(liquidityProvider);
  const balanceAfterProviderMBASIS = await mBASIS.balanceOf(liquidityProvider);

  const balanceAfterReceiverMTBILL = await mTBILL.balanceOf(tokensReceiver);

  const balanceAfterFeeReceiverMTBILL = await mTBILL.balanceOf(feeReceiver);

  const supplyAfterMTBILL = await mTBILL.totalSupply();
  const supplyAfterMBASIS = await mBASIS.totalSupply();

  expect(balanceAfterUserMBASIS).eq(balanceBeforeUserMBASIS.sub(amountIn));
  expect(balanceAfterUserMTBILL).eq(balanceBeforeUserMTBILL);

  expect(balanceAfterReceiverMTBILL).eq(balanceBeforeReceiverMTBILL);

  expect(balanceAfterContractMTBILL).eq(balanceBeforeContractMTBILL);
  expect(balanceAfterContractMBASIS).eq(balanceBeforeContractMBASIS);

  expect(balanceAfterFeeReceiverMTBILL).eq(balanceBeforeFeeReceiverMTBILL);

  if (swap) {
    expect(supplyAfterMTBILL).eq(supplyBeforeMTBILL.sub(expectedMToken));
    expect(balanceAfterProviderMBASIS).eq(
      balanceBeforeProviderMBASIS.add(amountInWithoutFee),
    );
    expect(balanceAfterProviderMTBILL).eq(
      balanceBeforeProviderMTBILL.sub(expectedMToken),
    );
  } else {
    expect(supplyAfterMBASIS).eq(supplyBeforeMBASIS.sub(amountInWithoutFee));
    expect(balanceAfterProviderMBASIS).eq(balanceBeforeProviderMBASIS);
    expect(balanceAfterProviderMTBILL).eq(balanceBeforeProviderMTBILL);
  }
};

export const setLiquidityProviderTest = async (
  { vault, owner }: CommonParamsProvider,
  newProvider: string,
  opt?: OptionalCommonParams,
) => {
  if (opt?.revertMessage) {
    await expect(
      vault.connect(opt?.from ?? owner).setLiquidityProvider(newProvider),
    ).revertedWith(opt?.revertMessage);
    return;
  }

  await expect(
    vault.connect(opt?.from ?? owner).setLiquidityProvider(newProvider),
  )
    .to.emit(
      vault,
      vault.interface.events['SetLiquidityProvider(address,address)'].name,
    )
    .withArgs((opt?.from ?? owner).address, newProvider).to.not.reverted;

  const provider = await vault.liquidityProvider();
  expect(provider).eq(newProvider);
};

export const setSwapperVaultTest = async (
  { vault, owner }: CommonParamsProvider,
  newVault: string,
  opt?: OptionalCommonParams,
) => {
  if (opt?.revertMessage) {
    await expect(
      vault.connect(opt?.from ?? owner).setSwapperVault(newVault),
    ).revertedWith(opt?.revertMessage);
    return;
  }

  await expect(vault.connect(opt?.from ?? owner).setSwapperVault(newVault))
    .to.emit(
      vault,
      vault.interface.events['SetSwapperVault(address,address)'].name,
    )
    .withArgs((opt?.from ?? owner).address, newVault).to.not.reverted;

  const provider = await vault.mTbillRedemptionVault();
  expect(provider).eq(newVault);
};
