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

import {
  // eslint-disable-next-line camelcase
  DataFeedTest__factory,
  ERC20,
  // eslint-disable-next-line camelcase
  ERC20__factory,
  IERC20,
  RedemptionVault,
  RedemptionVaultWIthBUIDL,
  RedemptionVaultWithSwapper,
  RedemptionVaultWithUSTB,
} from '../../typechain-types';

type CommonParamsRedeem = Pick<
  Awaited<ReturnType<typeof defaultDeploy>>,
  'owner' | 'mTBILL' | 'mTokenToUsdDataFeed'
> & {
  redemptionVault:
    | RedemptionVault
    | RedemptionVaultWIthBUIDL
    | RedemptionVaultWithUSTB
    | RedemptionVaultWithSwapper;
};

type CommonParams = Pick<Awaited<ReturnType<typeof defaultDeploy>>, 'owner'> & {
  redemptionVault:
    | RedemptionVault
    | RedemptionVaultWIthBUIDL
    | RedemptionVaultWithUSTB
    | RedemptionVaultWithSwapper;
};

export const redeemInstantTest = async (
  {
    redemptionVault,
    owner,
    mTBILL,
    mTokenToUsdDataFeed,
    waivedFee,
    minAmount,
    customRecipient,
    checkSupply = true,
  }: CommonParamsRedeem & {
    waivedFee?: boolean;
    minAmount?: BigNumberish;
    customRecipient?: AccountOrContract;
    checkSupply?: boolean;
  },
  tokenOut: IERC20 | ERC20 | string,
  amountTBillIn: number,
  opt?: OptionalCommonParams,
) => {
  tokenOut = getAccount(tokenOut);

  // eslint-disable-next-line camelcase
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
        withRecipient
          ? 'RedeemInstantWithCustomRecipient(address,address,address,uint256,uint256,uint256)'
          : 'RedeemInstant(address,address,uint256,uint256,uint256)'
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
  expect(balanceAfterUser).eq(balanceBeforeUser.sub(amountIn));
  expect(balanceAfterReceiver).eq(balanceBeforeReceiver);
  expect(balanceAfterFeeReceiver).eq(balanceBeforeFeeReceiver.add(fee));
  expect(balanceAfterTokenOutRecipient).eq(
    balanceBeforeTokenOutRecipient.add(amountOut),
  );
  if (recipient !== sender.address) {
    expect(balanceAfterTokenOut).eq(balanceBeforeTokenOut);
  }
  if (waivedFee) {
    expect(balanceAfterFeeReceiver).eq(balanceBeforeFeeReceiver);
  }
};

export const redeemRequestTest = async (
  {
    redemptionVault,
    owner,
    mTBILL,
    mTokenToUsdDataFeed,
    waivedFee,
    customRecipient,
  }: CommonParamsRedeem & {
    waivedFee?: boolean;
    customRecipient?: AccountOrContract;
  },
  tokenOut: ERC20 | string,
  amountTBillIn: number,
  opt?: OptionalCommonParams,
) => {
  tokenOut = getAccount(tokenOut);

  // eslint-disable-next-line camelcase
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
        ['redeemRequest(address,uint256,address)'].bind(
          this,
          tokenOut,
          amountIn,
          recipient,
        )
    : redemptionVault
        .connect(sender)
        ['redeemRequest(address,uint256)'].bind(this, tokenOut, amountIn);

  if (opt?.revertMessage) {
    await expect(callFn()).revertedWith(opt?.revertMessage);
    return;
  }

  const balanceBeforeUser = await mTBILL.balanceOf(sender.address);
  const balanceBeforeContract = await mTBILL.balanceOf(redemptionVault.address);
  const balanceBeforeReceiver = await mTBILL.balanceOf(tokensReceiver);
  const balanceBeforeFeeReceiver = await mTBILL.balanceOf(feeReceiver);

  const balanceBeforeTokenOut = await tokenContract.balanceOf(sender.address);

  const supplyBefore = await mTBILL.totalSupply();

  const latestRequestIdBefore = await redemptionVault.currentRequestId();
  const mTokenRate = await mTokenToUsdDataFeed.getDataInBase18();

  const { fee, currentStableRate, amountInWithoutFee } =
    await calcExpectedTokenOutAmount(
      sender,
      tokenContract,
      redemptionVault,
      mTokenRate,
      amountIn,
      false,
    );

  await expect(callFn())
    .to.emit(
      redemptionVault,
      redemptionVault.interface.events[
        withRecipient
          ? 'RedeemRequestWithCustomRecipient(uint256,address,address,address,uint256,uint256)'
          : 'RedeemRequest(uint256,address,address,uint256,uint256)'
      ].name,
    )
    .withArgs(
      ...[
        latestRequestIdBefore.add(1),
        sender,
        tokenOut,
        withRecipient ? recipient : undefined,
        amountTBillIn,
        fee,
      ].filter((v) => v !== undefined),
    ).to.not.reverted;

  const latestRequestIdAfter = await redemptionVault.currentRequestId();
  const request = await redemptionVault.redeemRequests(latestRequestIdBefore);

  expect(request.sender).eq(recipient);
  expect(request.tokenOut).eq(tokenOut);
  expect(request.amountMToken).eq(amountInWithoutFee);
  expect(request.mTokenRate).eq(mTokenRate);
  expect(request.tokenOutRate).eq(currentStableRate);

  const balanceAfterUser = await mTBILL.balanceOf(sender.address);
  const balanceAfterReceiver = await mTBILL.balanceOf(tokensReceiver);
  const balanceAfterFeeReceiver = await mTBILL.balanceOf(feeReceiver);
  const balanceAfterContract = await mTBILL.balanceOf(redemptionVault.address);

  const balanceAfterTokenOut = await tokenContract.balanceOf(sender.address);

  const supplyAfter = await mTBILL.totalSupply();

  expect(supplyAfter).eq(supplyBefore);
  expect(latestRequestIdAfter).eq(latestRequestIdBefore.add(1));
  expect(balanceAfterUser).eq(balanceBeforeUser.sub(amountIn));
  expect(balanceAfterContract).eq(
    balanceBeforeContract.add(amountInWithoutFee),
  );
  expect(balanceAfterReceiver).eq(balanceBeforeReceiver);
  expect(balanceAfterFeeReceiver).eq(balanceBeforeFeeReceiver.add(fee));
  expect(balanceAfterTokenOut).eq(balanceBeforeTokenOut);
  if (waivedFee) {
    expect(balanceAfterFeeReceiver).eq(balanceBeforeFeeReceiver);
  }
};

export const redeemFiatRequestTest = async (
  {
    redemptionVault,
    owner,
    mTBILL,
    mTokenToUsdDataFeed,
    waivedFee,
  }: CommonParamsRedeem & { waivedFee?: boolean },
  amountTBillIn: number,
  opt?: OptionalCommonParams,
) => {
  const sender = opt?.from ?? owner;

  const amountIn = parseUnits(amountTBillIn.toString());
  const tokensReceiver = await redemptionVault.tokensReceiver();
  const feeReceiver = await redemptionVault.feeReceiver();

  if (opt?.revertMessage) {
    await expect(
      redemptionVault.connect(sender).redeemFiatRequest(amountIn),
    ).revertedWith(opt?.revertMessage);
    return;
  }

  const balanceBeforeUser = await mTBILL.balanceOf(sender.address);
  const balanceBeforeContract = await mTBILL.balanceOf(redemptionVault.address);
  const balanceBeforeReceiver = await mTBILL.balanceOf(tokensReceiver);
  const balanceBeforeFeeReceiver = await mTBILL.balanceOf(feeReceiver);

  const supplyBefore = await mTBILL.totalSupply();

  const latestRequestIdBefore = await redemptionVault.currentRequestId();
  const manualToken = await redemptionVault.MANUAL_FULLFILMENT_TOKEN();
  const fiatAdditionalFee = await redemptionVault.fiatAdditionalFee();
  const hundredPercent = await redemptionVault.ONE_HUNDRED_PERCENT();
  const flatFee = await redemptionVault.fiatFlatFee();

  const mTokenRate = await mTokenToUsdDataFeed.getDataInBase18();

  const feePercent = await getFeePercent(
    sender.address,
    manualToken,
    redemptionVault,
    false,
    fiatAdditionalFee,
  );
  const fee = amountIn
    .mul(feePercent)
    .div(hundredPercent)
    .add(waivedFee ? 0 : flatFee);
  const amountInWithoutFee = amountIn.sub(fee);

  await expect(redemptionVault.connect(sender).redeemFiatRequest(amountIn))
    .to.emit(
      redemptionVault,
      redemptionVault.interface.events[
        'RedeemRequest(uint256,address,address,uint256,uint256)'
      ].name,
    )
    .withArgs(
      latestRequestIdBefore.add(1),
      sender,
      manualToken,
      amountTBillIn,
      fee,
    ).to.not.reverted;

  const latestRequestIdAfter = await redemptionVault.currentRequestId();
  const request = await redemptionVault.redeemRequests(latestRequestIdBefore);

  expect(request.sender).eq(sender.address);
  expect(request.tokenOut).eq(manualToken);
  expect(request.amountMToken).eq(amountInWithoutFee);
  expect(request.mTokenRate).eq(mTokenRate);
  expect(request.tokenOutRate).eq(parseUnits('1'));

  const balanceAfterUser = await mTBILL.balanceOf(sender.address);
  const balanceAfterReceiver = await mTBILL.balanceOf(tokensReceiver);
  const balanceAfterFeeReceiver = await mTBILL.balanceOf(feeReceiver);
  const balanceAfterContract = await mTBILL.balanceOf(redemptionVault.address);

  const supplyAfter = await mTBILL.totalSupply();

  expect(supplyAfter).eq(supplyBefore);
  expect(latestRequestIdAfter).eq(latestRequestIdBefore.add(1));
  expect(balanceAfterUser).eq(balanceBeforeUser.sub(amountIn));
  expect(balanceAfterContract).eq(
    balanceBeforeContract.add(amountInWithoutFee),
  );
  expect(balanceAfterReceiver).eq(balanceBeforeReceiver);
  expect(balanceAfterFeeReceiver).eq(balanceBeforeFeeReceiver.add(fee));
  if (waivedFee) {
    expect(balanceAfterFeeReceiver).eq(balanceBeforeFeeReceiver);
  }
};

export const approveRedeemRequestTest = async (
  {
    redemptionVault,
    owner,
    mTBILL,
    waivedFee,
  }: CommonParamsRedeem & { waivedFee?: boolean },
  requestId: number,
  newTokenRate: BigNumber,
  opt?: OptionalCommonParams,
) => {
  const sender = opt?.from ?? owner;

  const tokensReceiver = await redemptionVault.tokensReceiver();
  const feeReceiver = await redemptionVault.feeReceiver();

  if (opt?.revertMessage) {
    await expect(
      redemptionVault.connect(sender).approveRequest(requestId, newTokenRate),
    ).revertedWith(opt?.revertMessage);
    return;
  }

  const requestDataBefore = await redemptionVault.redeemRequests(requestId);

  const manualToken = await redemptionVault.MANUAL_FULLFILMENT_TOKEN();

  let tokenContract;
  if (requestDataBefore.tokenOut !== manualToken) {
    // eslint-disable-next-line camelcase
    tokenContract = ERC20__factory.connect(requestDataBefore.tokenOut, owner);
  }

  const balanceBeforeUser = await mTBILL.balanceOf(sender.address);
  const balanceBeforeContract = await mTBILL.balanceOf(redemptionVault.address);
  const balanceBeforeReceiver = await mTBILL.balanceOf(tokensReceiver);
  const balanceBeforeFeeReceiver = await mTBILL.balanceOf(feeReceiver);

  const supplyBefore = await mTBILL.totalSupply();

  const balanceUserTokenOutBefore =
    tokenContract && (await tokenContract.balanceOf(sender.address));

  await expect(
    redemptionVault.connect(sender).approveRequest(requestId, newTokenRate),
  )
    .to.emit(
      redemptionVault,
      redemptionVault.interface.events['ApproveRequest(uint256,uint256)'].name,
    )
    .withArgs(requestId, newTokenRate).to.not.reverted;

  const requestDataAfter = await redemptionVault.redeemRequests(requestId);

  expect(requestDataBefore.status).not.eq(requestDataAfter.status);
  expect(requestDataAfter.status).eq(1);

  const balanceAfterUser = await mTBILL.balanceOf(sender.address);
  const balanceAfterReceiver = await mTBILL.balanceOf(tokensReceiver);
  const balanceAfterFeeReceiver = await mTBILL.balanceOf(feeReceiver);
  const balanceAfterContract = await mTBILL.balanceOf(redemptionVault.address);
  const balanceUserTokenOutAfter =
    tokenContract && (await tokenContract.balanceOf(sender.address));

  const supplyAfter = await mTBILL.totalSupply();

  if (requestDataBefore.tokenOut !== manualToken) {
    const tokenDecimals = !tokenContract ? 18 : await tokenContract.decimals();

    const amountOut = requestDataBefore.amountMToken
      .mul(newTokenRate)
      .div(requestDataBefore.tokenOutRate)
      .div(10 ** (18 - tokenDecimals));

    expect(balanceUserTokenOutAfter).eq(
      balanceUserTokenOutBefore?.add(amountOut),
    );
  }
  expect(supplyAfter).eq(supplyBefore.sub(requestDataBefore.amountMToken));

  expect(balanceAfterUser).eq(balanceBeforeUser);

  expect(balanceAfterContract).eq(
    balanceBeforeContract.sub(requestDataBefore.amountMToken),
  );

  expect(balanceAfterReceiver).eq(balanceBeforeReceiver);
  expect(balanceAfterFeeReceiver).eq(balanceBeforeFeeReceiver);
  if (waivedFee) {
    expect(balanceAfterFeeReceiver).eq(balanceBeforeFeeReceiver);
  }
};

export const safeApproveRedeemRequestTest = async (
  {
    redemptionVault,
    owner,
    mTBILL,
    waivedFee,
  }: CommonParamsRedeem & { waivedFee?: boolean },
  requestId: BigNumberish,
  newTokenRate: BigNumber,
  opt?: OptionalCommonParams,
) => {
  const sender = opt?.from ?? owner;

  const tokensReceiver = await redemptionVault.tokensReceiver();
  const feeReceiver = await redemptionVault.feeReceiver();

  if (opt?.revertMessage) {
    await expect(
      redemptionVault
        .connect(sender)
        .safeApproveRequest(requestId, newTokenRate),
    ).revertedWith(opt?.revertMessage);
    return;
  }

  const requestDataBefore = await redemptionVault.redeemRequests(requestId);

  // eslint-disable-next-line camelcase
  const tokenContract = ERC20__factory.connect(
    requestDataBefore.tokenOut,
    owner,
  );

  const balanceBeforeUser = await mTBILL.balanceOf(sender.address);
  const balanceBeforeContract = await mTBILL.balanceOf(redemptionVault.address);
  const balanceBeforeReceiver = await mTBILL.balanceOf(tokensReceiver);
  const balanceBeforeFeeReceiver = await mTBILL.balanceOf(feeReceiver);

  const supplyBefore = await mTBILL.totalSupply();

  const balanceUserTokenOutBefore = await tokenContract.balanceOf(
    sender.address,
  );

  await expect(
    redemptionVault.connect(sender).safeApproveRequest(requestId, newTokenRate),
  )
    .to.emit(
      redemptionVault,
      redemptionVault.interface.events['SafeApproveRequest(uint256,uint256)']
        .name,
    )
    .withArgs(requestId, newTokenRate).to.not.reverted;

  const requestDataAfter = await redemptionVault.redeemRequests(requestId);

  expect(requestDataBefore.status).not.eq(requestDataAfter.status);
  expect(requestDataAfter.status).eq(1);

  const balanceAfterUser = await mTBILL.balanceOf(sender.address);
  const balanceAfterReceiver = await mTBILL.balanceOf(tokensReceiver);
  const balanceAfterFeeReceiver = await mTBILL.balanceOf(feeReceiver);
  const balanceAfterContract = await mTBILL.balanceOf(redemptionVault.address);
  const balanceUserTokenOutAfter = await tokenContract.balanceOf(
    sender.address,
  );

  const supplyAfter = await mTBILL.totalSupply();

  const tokenDecimals = await tokenContract.decimals();

  const amountOut = requestDataBefore.amountMToken
    .mul(newTokenRate)
    .div(requestDataBefore.tokenOutRate)
    .div(10 ** (18 - tokenDecimals));

  expect(balanceUserTokenOutAfter).eq(
    balanceUserTokenOutBefore?.add(amountOut),
  );
  expect(supplyAfter).eq(supplyBefore.sub(requestDataBefore.amountMToken));

  expect(balanceAfterUser).eq(balanceBeforeUser);

  expect(balanceAfterContract).eq(
    balanceBeforeContract.sub(requestDataBefore.amountMToken),
  );

  expect(balanceAfterReceiver).eq(balanceBeforeReceiver);
  expect(balanceAfterFeeReceiver).eq(balanceBeforeFeeReceiver);
  if (waivedFee) {
    expect(balanceAfterFeeReceiver).eq(balanceBeforeFeeReceiver);
  }
};

export const rejectRedeemRequestTest = async (
  { redemptionVault, owner, mTBILL }: CommonParamsRedeem,
  requestId: BigNumberish,
  opt?: OptionalCommonParams,
) => {
  const sender = opt?.from ?? owner;

  const tokensReceiver = await redemptionVault.tokensReceiver();
  const feeReceiver = await redemptionVault.feeReceiver();

  if (opt?.revertMessage) {
    await expect(
      redemptionVault.connect(sender).rejectRequest(requestId),
    ).revertedWith(opt?.revertMessage);
    return;
  }

  const requestDataBefore = await redemptionVault.redeemRequests(requestId);

  const balanceBeforeUser = await mTBILL.balanceOf(sender.address);
  const balanceBeforeContract = await mTBILL.balanceOf(redemptionVault.address);
  const balanceBeforeReceiver = await mTBILL.balanceOf(tokensReceiver);
  const balanceBeforeFeeReceiver = await mTBILL.balanceOf(feeReceiver);

  const supplyBefore = await mTBILL.totalSupply();

  await expect(redemptionVault.connect(sender).rejectRequest(requestId))
    .to.emit(
      redemptionVault,
      redemptionVault.interface.events['RejectRequest(uint256,address)'].name,
    )
    .withArgs(requestId, sender).to.not.reverted;

  const requestDataAfter = await redemptionVault.redeemRequests(requestId);

  expect(requestDataBefore.status).not.eq(requestDataAfter.status);
  expect(requestDataAfter.status).eq(2);

  const balanceAfterUser = await mTBILL.balanceOf(sender.address);
  const balanceAfterReceiver = await mTBILL.balanceOf(tokensReceiver);
  const balanceAfterFeeReceiver = await mTBILL.balanceOf(feeReceiver);
  const balanceAfterContract = await mTBILL.balanceOf(redemptionVault.address);

  const supplyAfter = await mTBILL.totalSupply();

  expect(supplyAfter).eq(supplyBefore);
  expect(balanceAfterUser).eq(balanceBeforeUser);
  expect(balanceAfterContract).eq(balanceBeforeContract);
  expect(balanceAfterReceiver).eq(balanceBeforeReceiver);
  expect(balanceAfterFeeReceiver).eq(balanceBeforeFeeReceiver);
};

export const setMinFiatRedeemAmountTest = async (
  { redemptionVault, owner }: CommonParams,
  valueN: number,
  opt?: OptionalCommonParams,
) => {
  const value = parseUnits(valueN.toString());

  if (opt?.revertMessage) {
    await expect(
      redemptionVault.connect(opt?.from ?? owner).setMinFiatRedeemAmount(value),
    ).revertedWith(opt?.revertMessage);
    return;
  }

  await expect(
    redemptionVault.connect(opt?.from ?? owner).setMinFiatRedeemAmount(value),
  ).to.emit(
    redemptionVault,
    redemptionVault.interface.events['SetMinFiatRedeemAmount(address,uint256)']
      .name,
  ).to.not.reverted;

  const newMin = await redemptionVault.minFiatRedeemAmount();
  expect(newMin).eq(value);
};

export const setFiatAdditionalFeeTest = async (
  { redemptionVault, owner }: CommonParams,
  valueN: number,
  opt?: OptionalCommonParams,
) => {
  if (opt?.revertMessage) {
    await expect(
      redemptionVault.connect(opt?.from ?? owner).setFiatAdditionalFee(valueN),
    ).revertedWith(opt?.revertMessage);
    return;
  }

  await expect(
    redemptionVault.connect(opt?.from ?? owner).setFiatAdditionalFee(valueN),
  ).to.emit(
    redemptionVault,
    redemptionVault.interface.events['SetFiatAdditionalFee(address,uint256)']
      .name,
  ).to.not.reverted;

  const newfee = await redemptionVault.fiatAdditionalFee();
  expect(newfee).eq(valueN);
};

export const setFiatFlatFeeTest = async (
  { redemptionVault, owner }: CommonParams,
  valueN: number,
  opt?: OptionalCommonParams,
) => {
  if (opt?.revertMessage) {
    await expect(
      redemptionVault.connect(opt?.from ?? owner).setFiatFlatFee(valueN),
    ).revertedWith(opt?.revertMessage);
    return;
  }

  await expect(
    redemptionVault.connect(opt?.from ?? owner).setFiatFlatFee(valueN),
  ).to.emit(
    redemptionVault,
    redemptionVault.interface.events['SetFiatFlatFee(address,uint256)'].name,
  ).to.not.reverted;

  const newfee = await redemptionVault.fiatFlatFee();
  expect(newfee).eq(valueN);
};

export const setRequestRedeemerTest = async (
  { redemptionVault, owner }: CommonParams,
  redeemer: string,
  opt?: OptionalCommonParams,
) => {
  if (opt?.revertMessage) {
    await expect(
      redemptionVault.connect(opt?.from ?? owner).setRequestRedeemer(redeemer),
    ).revertedWith(opt?.revertMessage);
    return;
  }

  await expect(
    redemptionVault.connect(opt?.from ?? owner).setRequestRedeemer(redeemer),
  ).to.emit(
    redemptionVault,
    redemptionVault.interface.events['SetRequestRedeemer(address,address)']
      .name,
  ).to.not.reverted;

  const newRedeemer = await redemptionVault.requestRedeemer();
  expect(newRedeemer).eq(redeemer);
};

export const getFeePercent = async (
  sender: string,
  token: string,
  redemptionVault:
    | RedemptionVault
    | RedemptionVaultWIthBUIDL
    | RedemptionVaultWithSwapper
    | RedemptionVaultWithUSTB,
  isInstant: boolean,
  additionalFee?: BigNumber,
) => {
  const tokenConfig = await redemptionVault.tokensConfig(token);
  let feePercent = constants.Zero;
  const isWaived = await redemptionVault.waivedFeeRestriction(sender);
  if (!isWaived) {
    feePercent = additionalFee ?? tokenConfig.fee;
    if (isInstant) {
      const instantFee = await redemptionVault.instantFee();
      feePercent = feePercent.add(instantFee);
    }
  }
  return feePercent;
};

export const calcExpectedTokenOutAmount = async (
  sender: SignerWithAddress,
  token: ERC20,
  redemptionVault:
    | RedemptionVault
    | RedemptionVaultWIthBUIDL
    | RedemptionVaultWithSwapper
    | RedemptionVaultWithUSTB,
  mTokenRate: BigNumber,
  amountIn: BigNumber,
  isInstant: boolean,
) => {
  const tokenConfig = await redemptionVault.tokensConfig(token.address);
  // eslint-disable-next-line camelcase
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
