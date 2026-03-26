import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { expect } from 'chai';
import { BigNumber, BigNumberish, constants } from 'ethers';
import { parseUnits } from 'ethers/lib/utils';

import {
  AccountOrContract,
  OptionalCommonParams,
  getAccount,
} from './common.helpers';
import { defaultDeploy } from './fixtures';
import { getFeePercent } from './redemption-vault.helpers';

import {
  DataFeedTest__factory,
  ERC20,
  ERC20__factory,
  IERC20,
  MTBILL,
  MToken,
  RedemptionVault,
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

type CommonParamsRedeemLegacy = {
  mTBILL: MToken | MTBILL;
} & Pick<
  Awaited<ReturnType<typeof defaultDeploy>>,
  'owner' | 'mTokenToUsdDataFeed'
> & {
    redemptionVault: RedemptionVault | RedemptionVaultWithSwapper;
  };

const redeemInstantLegacyTest = async (
  {
    redemptionVault,
    owner,
    mTBILL,
    mTokenToUsdDataFeed,
    waivedFee,
    minAmount,
    customRecipient,
    checkSupply = true,
    expectedAmountOut,
  }: CommonParamsRedeemLegacy & {
    waivedFee?: boolean;
    minAmount?: BigNumberish;
    customRecipient?: AccountOrContract;
    checkSupply?: boolean;
    expectedAmountOut?: BigNumberish;
  },
  tokenOut: IERC20 | ERC20 | string,
  amountTBillIn: number,
  opt?: OptionalCommonParams,
) => {
  tokenOut = getAccount(tokenOut);

  const tokenContract = ERC20__factory.connect(tokenOut, owner);

  const sender = opt?.from ?? owner;

  const amountIn = parseUnits(amountTBillIn.toString());
  const tokensReceiver = await redemptionVault.tokensReceiver();
  const feeReceiver = await redemptionVault.feeReceiver();

  const withRecipient = customRecipient !== undefined;
  const recipient = customRecipient
    ? getAccount(customRecipient)
    : sender.address;

  const callFn = withRecipient
    ? redemptionVault
        .connect(sender)
        ['redeemInstant(address,uint256,uint256,address)'].bind(
          this,
          tokenOut,
          amountIn,
          minAmount ?? constants.Zero,
          recipient,
        )
    : redemptionVault
        .connect(sender)
        ['redeemInstant(address,uint256,uint256)'].bind(
          this,
          tokenOut,
          amountIn,
          minAmount ?? constants.Zero,
        );

  if (opt?.revertMessage) {
    await expect(callFn()).revertedWith(opt?.revertMessage);
    return;
  }

  const balanceBeforeUser = await mTBILL.balanceOf(sender.address);
  const balanceBeforeReceiver = await mTBILL.balanceOf(tokensReceiver);
  const balanceBeforeFeeReceiver = await mTBILL.balanceOf(feeReceiver);

  const balanceBeforeTokenOutRecipient = await tokenContract.balanceOf(
    recipient,
  );
  const balanceBeforeTokenOut = await tokenContract.balanceOf(sender.address);

  const supplyBefore = await mTBILL.totalSupply();

  const mTokenRate = await mTokenToUsdDataFeed.getDataInBase18();

  const { fee, amountOut, amountInWithoutFee } =
    await calcExpectedTokenOutAmount(
      sender,
      tokenContract,
      redemptionVault,
      mTokenRate,
      amountIn,
      true,
    );

  await expect(callFn())
    .to.emit(
      redemptionVault,
      redemptionVault.interface.events[
        'RedeemInstantV2(address,address,address,uint256,uint256,uint256)'
      ].name,
    )
    .withArgs(
      ...[
        sender,
        tokenOut,
        withRecipient ? recipient : undefined,
        amountTBillIn,
        fee,
        amountOut,
      ].filter((v) => v !== undefined),
    ).to.not.reverted;

  const balanceAfterUser = await mTBILL.balanceOf(sender.address);
  const balanceAfterReceiver = await mTBILL.balanceOf(tokensReceiver);
  const balanceAfterFeeReceiver = await mTBILL.balanceOf(feeReceiver);

  const balanceAfterTokenOutRecipient = await tokenContract.balanceOf(
    recipient,
  );
  const balanceAfterTokenOut = await tokenContract.balanceOf(sender.address);

  const supplyAfter = await mTBILL.totalSupply();

  if (checkSupply) {
    expect(supplyAfter).eq(supplyBefore.sub(amountInWithoutFee));
  }

  expect(balanceAfterReceiver).eq(
    balanceBeforeReceiver.add(
      tokensReceiver === feeReceiver ? fee : constants.Zero,
    ),
  );
  expect(balanceAfterFeeReceiver).eq(balanceBeforeFeeReceiver.add(fee));

  expect(balanceAfterUser).eq(balanceBeforeUser.sub(amountIn));

  const expectedAmountToReceive = expectedAmountOut ?? amountOut;
  expect(balanceAfterTokenOutRecipient).eq(
    balanceBeforeTokenOutRecipient.add(expectedAmountToReceive),
  );
  if (recipient !== sender.address) {
    expect(balanceAfterTokenOut).eq(balanceBeforeTokenOut);
  }
  if (waivedFee) {
    expect(balanceAfterFeeReceiver).eq(balanceBeforeFeeReceiver);
  }
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
    await redeemInstantLegacyTest(
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

  await redeemInstantLegacyTest(
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

export const calcExpectedTokenOutAmount = async (
  sender: SignerWithAddress,
  token: ERC20,
  redemptionVault: RedemptionVaultWithSwapper | RedemptionVault,
  mTokenRate: BigNumber,
  amountIn: BigNumber,
  isInstant: boolean,
) => {
  const tokenConfig = await redemptionVault.tokensConfig(token.address);

  const dataFeedContract = DataFeedTest__factory.connect(
    tokenConfig.dataFeed,
    sender,
  );
  const currentTokenInRate = tokenConfig.stable
    ? constants.WeiPerEther
    : await dataFeedContract.getDataInBase18();
  if (currentTokenInRate.isZero())
    return {
      amountOut: constants.Zero,
      amountInWithoutFee: constants.Zero,
      fee: constants.Zero,
      currentStableRate: constants.Zero,
    };

  const feePercent = await getFeePercent(
    sender.address,
    token.address,
    redemptionVault,
    isInstant,
  );

  const hundredPercent = await redemptionVault.ONE_HUNDRED_PERCENT();
  const fee = amountIn.mul(feePercent).div(hundredPercent);

  const amountInWithoutFee = amountIn.sub(fee);

  const tokenDecimals = await token.decimals();

  const amountOut = amountInWithoutFee
    .mul(mTokenRate)
    .div(currentTokenInRate)
    .div(10 ** (18 - tokenDecimals));

  return {
    amountOut,
    amountInWithoutFee,
    fee,
    currentStableRate: currentTokenInRate,
  };
};
