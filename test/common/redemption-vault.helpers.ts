import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { expect } from 'chai';
import { BigNumber, BigNumberish, constants } from 'ethers';
import { parseUnits } from 'ethers/lib/utils';

import {
  AccountOrContract,
  OptionalCommonParams,
  balanceOfBase18,
  getAccount,
} from './common.helpers';
import { defaultDeploy } from './fixtures';

import {
  DataFeedTest__factory,
  ERC20,
  ERC20__factory,
  IERC20,
  MTBILL,
  MToken,
  RedemptionVault,
  RedemptionVaultWithAave,
  RedemptionVaultWithMorpho,
  RedemptionVaultWithMToken,
  RedemptionVaultWithSwapper,
  RedemptionVaultWithUSTB,
  RedemptionVaultTest__factory,
} from '../../typechain-types';

type CommonParamsRedeem = {
  mTBILL: MToken | MTBILL;
} & Pick<
  Awaited<ReturnType<typeof defaultDeploy>>,
  'owner' | 'mTokenToUsdDataFeed'
> & {
    redemptionVault:
      | RedemptionVault
      | RedemptionVaultWithAave
      | RedemptionVaultWithMorpho
      | RedemptionVaultWithMToken
      | RedemptionVaultWithUSTB
      | RedemptionVaultWithSwapper;
  };

type CommonParams = Pick<Awaited<ReturnType<typeof defaultDeploy>>, 'owner'> & {
  redemptionVault:
    | RedemptionVault
    | RedemptionVaultWithAave
    | RedemptionVaultWithMorpho
    | RedemptionVaultWithMToken
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
    expectedAmountOut,
    additionalLiquidity,
  }: CommonParamsRedeem & {
    waivedFee?: boolean;
    minAmount?: BigNumberish;
    customRecipient?: AccountOrContract;
    checkSupply?: boolean;
    expectedAmountOut?: BigNumberish;
    additionalLiquidity?: () => Promise<BigNumberish>;
  },
  tokenOut: IERC20 | ERC20 | string,
  amountTBillIn: number,
  opt?: OptionalCommonParams,
) => {
  tokenOut = getAccount(tokenOut);

  const tokenContract = ERC20__factory.connect(tokenOut, owner);

  const loanSwapperVault = await redemptionVault.loanSwapperVault();
  const loanSwapperVaultMToken =
    loanSwapperVault !== constants.AddressZero
      ? ERC20__factory.connect(
          await RedemptionVaultTest__factory.connect(
            loanSwapperVault,
            owner,
          ).mToken(),
          owner,
        )
      : undefined;

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
  const balanceBeforeFeeReceiverMToken = await mTBILL.balanceOf(feeReceiver);
  const balanceBeforeFeeReceiver = await tokenContract.balanceOf(feeReceiver);
  const balanceBeforeLoanLp = loanSwapperVaultMToken
    ? await loanSwapperVaultMToken.balanceOf(await redemptionVault.loanLp())
    : constants.Zero;
  const balanceBeforeLoanLpFeeReceiver = await tokenContract.balanceOf(
    await redemptionVault.loanLpFeeReceiver(),
  );
  const supplyBeforeLoanLp = loanSwapperVaultMToken
    ? await loanSwapperVaultMToken.totalSupply()
    : constants.Zero;
  const balanceBeforeVault = (
    await tokenContract.balanceOf(redemptionVault.address)
  ).add((await additionalLiquidity?.()) ?? constants.Zero);
  const balanceBeforeTokenOutRecipient = await tokenContract.balanceOf(
    recipient,
  );
  const balanceBeforeTokenOut = await tokenContract.balanceOf(sender.address);

  const supplyBefore = await mTBILL.totalSupply();
  const lastLoanRequestIdBefore = await redemptionVault.currentLoanRequestId();
  const mTokenRate = await mTokenToUsdDataFeed.getDataInBase18();

  const {
    fee,
    amountOut,
    amountOutWithoutFee,
    amountOutWithoutFeeBase18,
    feeBase18,
    tokenOutRate,
  } = await calcExpectedTokenOutAmount(
    sender,
    tokenContract,
    redemptionVault,
    mTokenRate,
    amountIn,
    true,
  );

  const {
    toTransferFromVault,
    toTransferFromLpBase18,
    toTransferFromLpMToken,
    lpFeePortionBase18,
    vaultFeePortion,
  } = await estimateSendTokensFromLiquidity(
    redemptionVault,
    tokenContract,
    amountOutWithoutFeeBase18!,
    feeBase18!,
    tokenOutRate,
    await additionalLiquidity?.(),
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
  const balanceAfterFeeReceiverMToken = await mTBILL.balanceOf(feeReceiver);
  const balanceAfterFeeReceiver = await tokenContract.balanceOf(feeReceiver);
  const balanceAfterLoanLp = loanSwapperVaultMToken
    ? await loanSwapperVaultMToken.balanceOf(await redemptionVault.loanLp())
    : constants.Zero;
  const supplyAfterLoanLp = loanSwapperVaultMToken
    ? await loanSwapperVaultMToken.totalSupply()
    : constants.Zero;

  const balanceAfterLoanLpFeeReceiver = await tokenContract.balanceOf(
    await redemptionVault.loanLpFeeReceiver(),
  );
  const balanceAfterTokenOutRecipient = await tokenContract.balanceOf(
    recipient,
  );
  const balanceAfterVault = (
    await tokenContract.balanceOf(redemptionVault.address)
  ).add((await additionalLiquidity?.()) ?? constants.Zero);
  const balanceAfterTokenOut = await tokenContract.balanceOf(sender.address);

  const supplyAfter = await mTBILL.totalSupply();
  const lastLoanRequestIdAfter = await redemptionVault.currentLoanRequestId();

  if (checkSupply) {
    expect(supplyAfter).eq(supplyBefore.sub(amountIn));
  }

  expect(balanceAfterReceiver).eq(balanceBeforeReceiver);
  expect(balanceAfterFeeReceiver).eq(
    balanceBeforeFeeReceiver.add(vaultFeePortion),
  );
  expect(balanceAfterFeeReceiverMToken).eq(balanceBeforeFeeReceiverMToken);
  expect(balanceAfterUser).eq(balanceBeforeUser.sub(amountIn));
  expect(balanceAfterVault).eq(
    balanceBeforeVault.sub(toTransferFromVault).sub(vaultFeePortion),
  );
  const expectedAmountToReceive = expectedAmountOut ?? amountOutWithoutFee!;
  expect(balanceAfterTokenOutRecipient).eq(
    balanceBeforeTokenOutRecipient.add(expectedAmountToReceive),
  );
  if (recipient !== sender.address) {
    expect(balanceAfterTokenOut).eq(balanceBeforeTokenOut);
  }
  if (waivedFee) {
    expect(balanceAfterFeeReceiver).eq(balanceBeforeFeeReceiver);
  }

  if (toTransferFromLpBase18.gt(0)) {
    expect(balanceAfterLoanLp).eq(
      balanceBeforeLoanLp.sub(toTransferFromLpMToken),
    );
    expect(supplyAfterLoanLp).eq(
      supplyBeforeLoanLp.sub(toTransferFromLpMToken),
    );
    expect(balanceAfterLoanLpFeeReceiver).eq(balanceBeforeLoanLpFeeReceiver);

    const loanRequest = await redemptionVault.loanRequests(
      lastLoanRequestIdAfter.sub(1),
    );
    expect(loanRequest.amountTokenOut).eq(toTransferFromLpBase18);
    expect(loanRequest.amountFee).eq(lpFeePortionBase18);
    expect(loanRequest.status).eq(0);
    expect(loanRequest.tokenOut).eq(tokenOut);
  } else {
    expect(lastLoanRequestIdAfter).eq(lastLoanRequestIdBefore);
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
    return {};
  }

  const balanceBeforeUser = await mTBILL.balanceOf(sender.address);
  const balanceBeforeContract = await mTBILL.balanceOf(redemptionVault.address);
  const balanceBeforeReceiver = await mTBILL.balanceOf(tokensReceiver);
  const balanceBeforeFeeReceiver = await mTBILL.balanceOf(feeReceiver);
  const balanceBeforeRequestRedeemer = await mTBILL.balanceOf(
    await redemptionVault.requestRedeemer(),
  );

  const balanceBeforeTokenOut = await tokenContract.balanceOf(sender.address);

  const supplyBefore = await mTBILL.totalSupply();

  const latestRequestIdBefore = await redemptionVault.currentRequestId();
  const mTokenRate = await mTokenToUsdDataFeed.getDataInBase18();

  const { currentStableRate, feeBase18, feePercent } =
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
        'RedeemRequestV2(uint256,address,address,address,uint256,uint256)'
      ].name,
    )
    .withArgs(
      ...[
        latestRequestIdBefore.add(1),
        sender,
        tokenOut,
        withRecipient ? recipient : undefined,
        amountTBillIn,
        feeBase18,
      ].filter((v) => v !== undefined),
    ).to.not.reverted;

  const latestRequestIdAfter = await redemptionVault.currentRequestId();
  const request = await redemptionVault.redeemRequestsV2(latestRequestIdBefore);

  expect(request.sender).eq(recipient);
  expect(request.tokenOut).eq(tokenOut);
  expect(request.amountMToken).eq(amountIn);
  expect(request.mTokenRate).eq(mTokenRate);
  expect(request.tokenOutRate).eq(currentStableRate);
  expect(request.version).eq(1);

  if (waivedFee) {
    expect(request.feePercent).eq(feePercent).eq(constants.Zero);
  } else {
    expect(request.feePercent).eq(feePercent);
  }

  const balanceAfterUser = await mTBILL.balanceOf(sender.address);
  const balanceAfterReceiver = await mTBILL.balanceOf(tokensReceiver);
  const balanceAfterFeeReceiver = await mTBILL.balanceOf(feeReceiver);
  const balanceAfterContract = await mTBILL.balanceOf(redemptionVault.address);
  const balanceAfterRequestRedeemer = await mTBILL.balanceOf(
    await redemptionVault.requestRedeemer(),
  );

  const balanceAfterTokenOut = await tokenContract.balanceOf(sender.address);

  const supplyAfter = await mTBILL.totalSupply();

  expect(supplyAfter).eq(supplyBefore);
  expect(latestRequestIdAfter).eq(latestRequestIdBefore.add(1));
  expect(balanceAfterUser).eq(balanceBeforeUser.sub(amountIn));
  expect(balanceAfterContract).eq(balanceBeforeContract);
  expect(balanceAfterReceiver).eq(balanceBeforeReceiver);
  expect(balanceAfterFeeReceiver).eq(balanceBeforeFeeReceiver);
  expect(balanceAfterTokenOut).eq(balanceBeforeTokenOut);
  expect(balanceAfterRequestRedeemer).eq(
    balanceBeforeRequestRedeemer.add(amountIn),
  );

  return {
    requestId: latestRequestIdBefore,
    rate: mTokenRate,
  };
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
  const balanceBeforeRequestRedeemer = await mTBILL.balanceOf(
    await redemptionVault.requestRedeemer(),
  );
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

  const amountOut = amountIn.mul(mTokenRate).div(parseUnits('1'));

  const fee = amountOut
    .mul(feePercent)
    .div(hundredPercent)
    .add(waivedFee ? 0 : flatFee.mul(mTokenRate).div(parseUnits('1')));

  const amountOutWithoutFee = amountOut.sub(fee);

  await expect(redemptionVault.connect(sender).redeemFiatRequest(amountIn))
    .to.emit(
      redemptionVault,
      redemptionVault.interface.events[
        'RedeemRequestV2(uint256,address,address,address,uint256,uint256)'
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
  const request = await redemptionVault.redeemRequestsV2(latestRequestIdBefore);

  expect(request.sender).eq(sender.address);
  expect(request.tokenOut).eq(manualToken);
  expect(request.amountMToken).eq(amountIn);
  expect(request.mTokenRate).eq(mTokenRate);
  expect(request.tokenOutRate).eq(parseUnits('1'));
  expect(request.version).eq(1);
  expect(request.feePercent).eq(feePercent);

  const balanceAfterUser = await mTBILL.balanceOf(sender.address);
  const balanceAfterReceiver = await mTBILL.balanceOf(tokensReceiver);
  const balanceAfterFeeReceiver = await mTBILL.balanceOf(feeReceiver);
  const balanceAfterContract = await mTBILL.balanceOf(redemptionVault.address);
  const balanceAfterRequestRedeemer = await mTBILL.balanceOf(
    await redemptionVault.requestRedeemer(),
  );
  const supplyAfter = await mTBILL.totalSupply();

  expect(supplyAfter).eq(supplyBefore);
  expect(latestRequestIdAfter).eq(latestRequestIdBefore.add(1));
  expect(balanceAfterUser).eq(balanceBeforeUser.sub(amountIn));
  expect(balanceAfterContract).eq(balanceBeforeContract);
  expect(balanceAfterReceiver).eq(balanceBeforeReceiver);
  expect(balanceAfterFeeReceiver).eq(balanceBeforeFeeReceiver);
  expect(balanceAfterRequestRedeemer).eq(
    balanceBeforeRequestRedeemer.add(amountIn),
  );
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
  requestId: BigNumberish,
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

  const requestDataBefore = await redemptionVault.redeemRequestsV2(requestId);

  const manualToken = await redemptionVault.MANUAL_FULLFILMENT_TOKEN();

  let tokenContract;
  if (requestDataBefore.tokenOut !== manualToken) {
    tokenContract = ERC20__factory.connect(requestDataBefore.tokenOut, owner);
  }

  const balanceBeforeUser = await mTBILL.balanceOf(sender.address);
  const balanceBeforeContract = await mTBILL.balanceOf(redemptionVault.address);
  const balanceBeforeReceiver = await mTBILL.balanceOf(tokensReceiver);
  const balanceBeforeFeeReceiver = await mTBILL.balanceOf(feeReceiver);
  const balanceBeforeRequestRedeemer = await mTBILL.balanceOf(
    await redemptionVault.requestRedeemer(),
  );
  const supplyBefore = await mTBILL.totalSupply();

  const balanceUserTokenOutBefore =
    tokenContract && (await tokenContract.balanceOf(sender.address));

  await expect(
    redemptionVault.connect(sender).approveRequest(requestId, newTokenRate),
  )
    .to.emit(
      redemptionVault,
      redemptionVault.interface.events['ApproveRequest(uint256,uint256,bool)']
        .name,
    )
    .withArgs(requestId, newTokenRate, false).to.not.reverted;

  const requestDataAfter = await redemptionVault.redeemRequestsV2(requestId);

  expect(requestDataBefore.status).not.eq(requestDataAfter.status);
  expect(requestDataAfter.status).eq(1);

  const balanceAfterUser = await mTBILL.balanceOf(sender.address);
  const balanceAfterReceiver = await mTBILL.balanceOf(tokensReceiver);
  const balanceAfterFeeReceiver = await mTBILL.balanceOf(feeReceiver);
  const balanceAfterRequestRedeemer = await mTBILL.balanceOf(
    await redemptionVault.requestRedeemer(),
  );
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

  expect(balanceAfterContract).eq(balanceBeforeContract);

  expect(balanceAfterRequestRedeemer).eq(
    balanceBeforeRequestRedeemer.sub(requestDataBefore.amountMToken),
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

  const requestDataBefore = await redemptionVault.redeemRequestsV2(requestId);

  const tokenContract = ERC20__factory.connect(
    requestDataBefore.tokenOut,
    owner,
  );

  const balanceBeforeUser = await mTBILL.balanceOf(requestDataBefore.sender);
  const balanceBeforeContract = await mTBILL.balanceOf(redemptionVault.address);
  const balanceBeforeReceiver = await mTBILL.balanceOf(tokensReceiver);
  const balanceBeforeFeeReceiver = await mTBILL.balanceOf(feeReceiver);
  const balanceBeforeRequestRedeemer = await mTBILL.balanceOf(
    await redemptionVault.requestRedeemer(),
  );

  const supplyBefore = await mTBILL.totalSupply();

  const balanceUserTokenOutBefore = await tokenContract.balanceOf(
    requestDataBefore.sender,
  );

  const { amountOutWithoutFee, feeBase18, amountOutWithoutFeeBase18 } =
    await calcExpectedTokenOutAmount(
      sender,
      tokenContract,
      redemptionVault,
      newTokenRate,
      requestDataBefore.amountMToken,
      false,
      requestDataBefore.feePercent,
      requestDataBefore.tokenOutRate,
    );

  await expect(
    redemptionVault.connect(sender).safeApproveRequest(requestId, newTokenRate),
  )
    .to.emit(
      redemptionVault,
      redemptionVault.interface.events['ApproveRequest(uint256,uint256,bool)']
        .name,
    )
    .withArgs(requestId, newTokenRate, true).to.not.reverted;

  const requestDataAfter = await redemptionVault.redeemRequestsV2(requestId);

  expect(requestDataBefore.status).not.eq(requestDataAfter.status);
  expect(requestDataAfter.status).eq(1);

  const balanceAfterUser = await mTBILL.balanceOf(sender.address);
  const balanceAfterReceiver = await mTBILL.balanceOf(tokensReceiver);
  const balanceAfterFeeReceiver = await mTBILL.balanceOf(feeReceiver);
  const balanceAfterContract = await mTBILL.balanceOf(redemptionVault.address);
  const balanceAfterRequestRedeemer = await mTBILL.balanceOf(
    await redemptionVault.requestRedeemer(),
  );
  const balanceUserTokenOutAfter = await tokenContract.balanceOf(
    requestDataAfter.sender,
  );

  const supplyAfter = await mTBILL.totalSupply();

  const amountOut = amountOutWithoutFee!;

  expect(balanceUserTokenOutAfter).eq(
    balanceUserTokenOutBefore?.add(amountOut),
  );
  expect(supplyAfter).eq(supplyBefore.sub(requestDataBefore.amountMToken));

  expect(balanceAfterUser).eq(balanceBeforeUser);

  expect(balanceAfterContract).eq(balanceBeforeContract);

  expect(balanceAfterRequestRedeemer).eq(
    balanceBeforeRequestRedeemer.sub(requestDataBefore.amountMToken),
  );

  expect(balanceAfterReceiver).eq(balanceBeforeReceiver);
  expect(balanceAfterFeeReceiver).eq(balanceBeforeFeeReceiver);
  if (waivedFee) {
    expect(balanceAfterFeeReceiver).eq(balanceBeforeFeeReceiver);
  }
};

export const bulkRepayLpLoanRequestTest = async (
  {
    redemptionVault,
    owner,
    mTBILL,
  }: Omit<CommonParamsRedeem, 'mTokenToUsdDataFeed'>,
  requests: { id: BigNumberish }[],
  opt?: OptionalCommonParams,
) => {
  const sender = opt?.from ?? owner;

  const requestIds = requests.map(({ id }) => id);

  const callFn = redemptionVault
    .connect(sender)
    .bulkRepayLpLoanRequest.bind(this, requestIds);

  if (opt?.revertMessage) {
    await expect(callFn()).revertedWith(opt?.revertMessage);
    return;
  }

  const loanRepaymentAddress = await redemptionVault.loanRepaymentAddress();
  const loanLpFeeReceiver = await redemptionVault.loanLpFeeReceiver();
  const loanLp = await redemptionVault.loanLp();

  const requestDatasBefore = await Promise.all(
    requestIds.map((requestId) => redemptionVault.loanRequests(requestId)),
  );

  const balancesBefore = await Promise.all(
    requestDatasBefore.map(({ tokenOut }) =>
      balanceOfBase18(
        ERC20__factory.connect(tokenOut, owner),
        loanRepaymentAddress,
      ),
    ),
  );

  const balancesLpBefore = await Promise.all(
    requestDatasBefore.map(({ tokenOut }) =>
      balanceOfBase18(ERC20__factory.connect(tokenOut, owner), loanLp),
    ),
  );

  const balancesFeeBefore = await Promise.all(
    requestDatasBefore.map(({ tokenOut }) =>
      balanceOfBase18(
        ERC20__factory.connect(tokenOut, owner),
        loanLpFeeReceiver,
      ),
    ),
  );

  const totalSupplyBefore = await mTBILL.totalSupply();

  const feePercents = await Promise.all(
    requestDatasBefore.map((requestData) => requestData.amountFee),
  );

  const expectedReceivedAmounts = await Promise.all(
    requestDatasBefore.map(async (requestData) => {
      return requestData.amountTokenOut;
    }),
  );

  const groupedDataBefore = requests.map(({ id }, index) => {
    return {
      id,
      request: requestDatasBefore[index],
      expectedReceivedAmount: expectedReceivedAmounts[index],
      expectedReceivedFeeAmount: feePercents[index],
      balance: balancesBefore[index],
      balanceFee: balancesFeeBefore[index],
      balanceLp: balancesLpBefore[index],
    };
  });
  const expectedTotalBurned = BigNumber.from(0);

  const txPromise = callFn();
  await expect(txPromise).to.not.reverted;

  const txReceipt = await (await txPromise).wait();

  const parsedLogs = txReceipt.logs
    .filter((v) => v.address === redemptionVault.address)
    .map((log) => redemptionVault.interface.parseLog(log))
    .filter((v) => v.name === 'RepayLpLoanRequest')
    .map((v) => v.args);

  const requestDatasAfter = await Promise.all(
    requestIds.map((requestId) => redemptionVault.loanRequests(requestId)),
  );

  const balancesAfter = await Promise.all(
    requestDatasAfter.map(({ tokenOut }) =>
      balanceOfBase18(
        ERC20__factory.connect(tokenOut, owner),
        loanRepaymentAddress,
      ),
    ),
  );

  const balancesFeeAfter = await Promise.all(
    requestDatasAfter.map(({ tokenOut }) =>
      balanceOfBase18(
        ERC20__factory.connect(tokenOut, owner),
        loanLpFeeReceiver,
      ),
    ),
  );

  const balancesLpAfter = await Promise.all(
    requestDatasAfter.map(({ tokenOut }) =>
      balanceOfBase18(ERC20__factory.connect(tokenOut, owner), loanLp),
    ),
  );

  const totalSupplyAfter = await mTBILL.totalSupply();

  const groupedDataAfter = requests.map(({ id }, index) => {
    return {
      id,
      request: requestDatasAfter[index],
      balance: balancesAfter[index],
      balanceFee: balancesFeeAfter[index],
      balanceLp: balancesLpAfter[index],
    };
  });

  expect(totalSupplyAfter).eq(totalSupplyBefore.sub(expectedTotalBurned));

  for (const [i, { id, ...dataBefore }] of groupedDataBefore.entries()) {
    const dataAfter = groupedDataAfter[i];

    const requestDataBefore = dataBefore.request;
    const requestDataAfter = dataAfter.request;

    const balanceAfter = dataAfter.balance;
    const balanceFeeAfter = dataAfter.balanceFee;
    const balanceLpAfter = dataAfter.balanceLp;

    const balanceBefore = dataBefore.balance;
    const balanceFeeBefore = dataBefore.balanceFee;
    const balanceLpBefore = dataBefore.balanceLp;

    expect(requestDataAfter.amountFee).eq(requestDataBefore.amountFee);
    expect(requestDataAfter.tokenOut).eq(requestDataBefore.tokenOut);
    expect(requestDataAfter.amountTokenOut).eq(
      requestDataBefore.amountTokenOut,
    );

    const logs = parsedLogs.filter((log) => log.requestId.eq(id));

    const expectedReceivedAggregatedByUser = groupedDataBefore
      .filter((v) => v.request.tokenOut === requestDataBefore.tokenOut)
      .reduce((prev, curr) => {
        return prev.add(curr.expectedReceivedAmount);
      }, BigNumber.from(0));

    const expectedReceivedFeeAggregatedByUser = groupedDataBefore
      .filter((v) => v.request.tokenOut === requestDataBefore.tokenOut)
      .reduce((prev, curr) => {
        return prev.add(curr.expectedReceivedFeeAmount);
      }, BigNumber.from(0));

    expect(logs.length).eq(1);
    expect(requestDataAfter.status).eq(1);
    expect(balanceAfter).eq(
      balanceBefore.sub(
        expectedReceivedAggregatedByUser.add(
          expectedReceivedFeeAggregatedByUser,
        ),
      ),
    );
    expect(balanceFeeAfter).eq(
      balanceFeeBefore.add(expectedReceivedFeeAggregatedByUser),
    );
    expect(balanceLpAfter).eq(
      balanceLpBefore.add(expectedReceivedAggregatedByUser),
    );
    const log = logs[0];

    expect(log.requestId).eq(id);
  }
};

export const safeBulkApproveRequestTest = async (
  { redemptionVault, owner, mTBILL, mTokenToUsdDataFeed }: CommonParamsRedeem,
  requests: { id: BigNumberish; expectedToExecute?: boolean }[],
  newRate?: BigNumberish | 'request-rate',
  opt?: OptionalCommonParams,
) => {
  const sender = opt?.from ?? owner;

  const requestIds = requests.map(({ id }) => id);

  const callFn =
    newRate && newRate !== 'request-rate'
      ? redemptionVault
          .connect(sender)
          ['safeBulkApproveRequest(uint256[],uint256)'].bind(
            this,
            requestIds,
            newRate,
          )
      : newRate === 'request-rate'
      ? redemptionVault
          .connect(sender)
          .safeBulkApproveRequestAtSavedRate.bind(this, requestIds)
      : redemptionVault
          .connect(sender)
          ['safeBulkApproveRequest(uint256[])'].bind(this, requestIds);

  if (opt?.revertMessage) {
    await expect(callFn()).revertedWith(opt?.revertMessage);
    return;
  }

  const requestDatasBefore = await Promise.all(
    requestIds.map((requestId) => redemptionVault.redeemRequestsV2(requestId)),
  );

  const balancesBefore = await Promise.all(
    requestDatasBefore.map(({ tokenOut, sender }) =>
      balanceOfBase18(ERC20__factory.connect(tokenOut, owner), sender),
    ),
  );

  const totalSupplyBefore = await mTBILL.totalSupply();

  const tokenDecimals = await Promise.all(
    requestDatasBefore.map(({ tokenOut }) =>
      ERC20__factory.connect(tokenOut, owner).decimals(),
    ),
  );

  const feePercents = await Promise.all(
    requestDatasBefore.map((requestData) =>
      getFeePercent(
        requestData.sender,
        requestData.tokenOut,
        redemptionVault,
        false,
      ),
    ),
  );

  const currentRate = await mTokenToUsdDataFeed.getDataInBase18();
  const newExpectedRate =
    newRate === 'request-rate' ? undefined : newRate ?? currentRate;

  const expectedReceivedAmounts = await Promise.all(
    requestDatasBefore.map(async (requestData) => {
      const { amountOutWithoutFeeBase18 } = await calcExpectedTokenOutAmount(
        sender,
        ERC20__factory.connect(requestData.tokenOut, owner),
        redemptionVault,
        newExpectedRate
          ? BigNumber.from(newExpectedRate)
          : requestData.mTokenRate,
        requestData.amountMToken,
        false,
        requestData.feePercent,
        requestData.tokenOutRate,
      );

      return amountOutWithoutFeeBase18!;
    }),
  );

  const groupedDataBefore = requests.map(({ id, expectedToExecute }, index) => {
    return {
      id,
      expectedToExecute: expectedToExecute ?? true,
      request: requestDatasBefore[index],
      expectedReceivedAmount: expectedReceivedAmounts[index],
      balance: balancesBefore[index],
      feePercent: feePercents[index],
    };
  });
  const hundredPercent = await redemptionVault.ONE_HUNDRED_PERCENT();

  const expectedTotalBurned = groupedDataBefore
    .filter((v) => v.expectedToExecute)
    .reduce((prev, curr) => {
      return prev.add(
        curr.request.amountMToken.sub(
          curr.request.amountMToken.mul(curr.feePercent).div(hundredPercent),
        ),
      );
    }, BigNumber.from(0));

  const txPromise = callFn();
  await expect(txPromise).to.not.reverted;

  const txReceipt = await (await txPromise).wait();

  const parsedLogs = txReceipt.logs
    .filter((v) => v.address === redemptionVault.address)
    .map((log) => redemptionVault.interface.parseLog(log))
    .filter((v) => v.name === 'ApproveRequest')
    .map((v) => v.args);

  const requestDatasAfter = await Promise.all(
    requestIds.map((requestId) => redemptionVault.redeemRequestsV2(requestId)),
  );

  const balancesAfter = await Promise.all(
    requestDatasAfter.map(({ tokenOut, sender }) =>
      balanceOfBase18(ERC20__factory.connect(tokenOut, owner), sender),
    ),
  );

  const totalSupplyAfter = await mTBILL.totalSupply();

  const groupedDataAfter = requests.map(({ id, expectedToExecute }, index) => {
    return {
      id,
      expectedToExecute,
      request: requestDatasAfter[index],
      balance: balancesAfter[index],
    };
  });

  expect(totalSupplyAfter).eq(totalSupplyBefore.sub(expectedTotalBurned));

  for (const [
    i,
    { expectedToExecute, id, ...dataBefore },
  ] of groupedDataBefore.entries()) {
    const dataAfter = groupedDataAfter[i];

    const requestDataBefore = dataBefore.request;
    const requestDataAfter = dataAfter.request;

    const balanceAfter = dataAfter.balance;
    const balanceBefore = dataBefore.balance;

    expect(requestDataAfter.sender).eq(requestDataBefore.sender);
    expect(requestDataAfter.tokenOut).eq(requestDataBefore.tokenOut);
    expect(requestDataAfter.amountMToken).eq(requestDataBefore.amountMToken);
    expect(requestDataAfter.tokenOutRate).eq(requestDataBefore.tokenOutRate);

    const logs = parsedLogs.filter((log) => log.requestId.eq(id));

    const expectedReceivedAggregatedByUser = groupedDataBefore
      .filter(
        (v) =>
          v.request.sender === requestDataBefore.sender &&
          v.request.tokenOut === requestDataBefore.tokenOut &&
          v.expectedToExecute,
      )
      .reduce((prev, curr) => {
        return prev.add(curr.expectedReceivedAmount);
      }, BigNumber.from(0));

    if (expectedToExecute) {
      expect(logs.length).eq(1);
      expect(requestDataAfter.mTokenRate).eq(
        newExpectedRate ?? requestDataBefore.mTokenRate,
      );
      expect(requestDataAfter.status).eq(1);
      expect(balanceAfter).eq(
        balanceBefore.add(expectedReceivedAggregatedByUser),
      );
      const log = logs[0];

      expect(log.newMTokenRate).eq(
        newExpectedRate ?? requestDataBefore.mTokenRate,
      );
      expect(log.requestId).eq(id);
    } else {
      expect(logs.length).eq(0);
      expect(requestDataAfter.mTokenRate).eq(requestDataBefore.mTokenRate);
      expect(requestDataAfter.status).eq(0);
    }
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

  const requestDataBefore = await redemptionVault.redeemRequestsV2(requestId);

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

  const requestDataAfter = await redemptionVault.redeemRequestsV2(requestId);

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

export const cancelLpLoanRequestTest = async (
  {
    redemptionVault,
    owner,
    mTBILL,
  }: Omit<CommonParamsRedeem, 'mTokenToUsdDataFeed'>,
  requestId: BigNumberish,
  opt?: OptionalCommonParams,
) => {
  const sender = opt?.from ?? owner;

  const loanLp = await redemptionVault.loanLp();
  const loanLpFeeReceiver = await redemptionVault.loanLpFeeReceiver();
  const loanRepaymentAddress = await redemptionVault.loanRepaymentAddress();

  if (opt?.revertMessage) {
    await expect(
      redemptionVault.connect(sender).cancelLpLoanRequest(requestId),
    ).revertedWith(opt?.revertMessage);
    return;
  }

  const requestDataBefore = await redemptionVault.loanRequests(requestId);

  const loanToken = ERC20__factory.connect(requestDataBefore.tokenOut, owner);

  const balanceBeforeLpRepayment = await loanToken.balanceOf(
    loanRepaymentAddress,
  );
  const balanceBeforeLpFee = await loanToken.balanceOf(loanLpFeeReceiver);
  const balanceBeforeLp = await loanToken.balanceOf(loanLp);
  const balanceBeforeSender = await loanToken.balanceOf(sender.address);

  const supplyBefore = await mTBILL.totalSupply();

  await expect(redemptionVault.connect(sender).cancelLpLoanRequest(requestId))
    .to.emit(
      redemptionVault,
      redemptionVault.interface.events['CancelLpLoanRequest(address,uint256)']
        .name,
    )
    .withArgs(requestId, sender).to.not.reverted;

  const requestDataAfter = await redemptionVault.loanRequests(requestId);

  const balanceAfterLpRepayment = await loanToken.balanceOf(
    loanRepaymentAddress,
  );
  const balanceAfterLpFee = await loanToken.balanceOf(loanLpFeeReceiver);
  const balanceAfterLp = await loanToken.balanceOf(loanLp);
  const balanceAfterSender = await loanToken.balanceOf(sender.address);

  const supplyAfter = await mTBILL.totalSupply();

  expect(requestDataAfter.amountFee).eq(requestDataAfter.amountFee);
  expect(requestDataAfter.amountTokenOut).eq(requestDataAfter.amountTokenOut);
  expect(requestDataAfter.status).eq(2);

  expect(supplyAfter).eq(supplyBefore);
  expect(balanceAfterLpRepayment).eq(balanceBeforeLpRepayment);
  expect(balanceAfterLpFee).eq(balanceBeforeLpFee);
  expect(balanceAfterLp).eq(balanceBeforeLp);
  expect(balanceAfterSender).eq(balanceBeforeSender);
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
  const value = parseUnits(valueN.toString());

  if (opt?.revertMessage) {
    await expect(
      redemptionVault.connect(opt?.from ?? owner).setFiatFlatFee(value),
    ).revertedWith(opt?.revertMessage);
    return;
  }

  await expect(
    redemptionVault.connect(opt?.from ?? owner).setFiatFlatFee(value),
  ).to.emit(
    redemptionVault,
    redemptionVault.interface.events['SetFiatFlatFee(address,uint256)'].name,
  ).to.not.reverted;

  const newfee = await redemptionVault.fiatFlatFee();
  expect(newfee).eq(value);
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

export const setLoanLpFeeReceiverTest = async (
  { redemptionVault, owner }: CommonParams,
  loanLpFeeReceiver: string,
  opt?: OptionalCommonParams,
) => {
  if (opt?.revertMessage) {
    await expect(
      redemptionVault
        .connect(opt?.from ?? owner)
        .setLoanLpFeeReceiver(loanLpFeeReceiver),
    ).revertedWith(opt?.revertMessage);
    return;
  }

  await expect(
    redemptionVault
      .connect(opt?.from ?? owner)
      .setLoanLpFeeReceiver(loanLpFeeReceiver),
  ).to.emit(
    redemptionVault,
    redemptionVault.interface.events['SetLoanLpFeeReceiver(address,address)']
      .name,
  ).to.not.reverted;

  const newLoanLpFeeReceiver = await redemptionVault.loanLpFeeReceiver();
  expect(newLoanLpFeeReceiver).eq(loanLpFeeReceiver);
};

export const setLoanLpTest = async (
  { redemptionVault, owner }: CommonParams,
  loanLp: string,
  opt?: OptionalCommonParams,
) => {
  if (opt?.revertMessage) {
    await expect(
      redemptionVault.connect(opt?.from ?? owner).setLoanLp(loanLp),
    ).revertedWith(opt?.revertMessage);
    return;
  }

  await expect(
    redemptionVault.connect(opt?.from ?? owner).setLoanLp(loanLp),
  ).to.emit(
    redemptionVault,
    redemptionVault.interface.events['SetLoanLp(address,address)'].name,
  ).to.not.reverted;

  const newLoanLp = await redemptionVault.loanLp();
  expect(newLoanLp).eq(loanLp);
};

export const setLoanRepaymentAddressTest = async (
  { redemptionVault, owner }: CommonParams,
  loanRepaymentAddress: string,
  opt?: OptionalCommonParams,
) => {
  if (opt?.revertMessage) {
    await expect(
      redemptionVault
        .connect(opt?.from ?? owner)
        .setLoanRepaymentAddress(loanRepaymentAddress),
    ).revertedWith(opt?.revertMessage);
    return;
  }

  await expect(
    redemptionVault
      .connect(opt?.from ?? owner)
      .setLoanRepaymentAddress(loanRepaymentAddress),
  ).to.emit(
    redemptionVault,
    redemptionVault.interface.events['SetLoanRepaymentAddress(address,address)']
      .name,
  ).to.not.reverted;

  const newLoanRepaymentAddress = await redemptionVault.loanRepaymentAddress();
  expect(newLoanRepaymentAddress).eq(loanRepaymentAddress);
};

export const setLoanSwapperVaultTest = async (
  { redemptionVault, owner }: CommonParams,
  loanSwapperVault: string,
  opt?: OptionalCommonParams,
) => {
  if (opt?.revertMessage) {
    await expect(
      redemptionVault
        .connect(opt?.from ?? owner)
        .setLoanSwapperVault(loanSwapperVault),
    ).revertedWith(opt?.revertMessage);
    return;
  }

  await expect(
    redemptionVault
      .connect(opt?.from ?? owner)
      .setLoanSwapperVault(loanSwapperVault),
  ).to.emit(
    redemptionVault,
    redemptionVault.interface.events['SetLoanSwapperVault(address,address)']
      .name,
  ).to.not.reverted;

  const newLoanSwapperVault = await redemptionVault.loanSwapperVault();
  expect(newLoanSwapperVault).eq(loanSwapperVault);
};

export const getFeePercent = async (
  sender: string,
  token: string,
  redemptionVault:
    | RedemptionVault
    | RedemptionVaultWithAave
    | RedemptionVaultWithMorpho
    | RedemptionVaultWithMToken
    | RedemptionVaultWithSwapper
    | RedemptionVaultWithUSTB,
  isInstant: boolean,
  overrideTokenFee?: BigNumber,
) => {
  const tokenConfig = await redemptionVault.tokensConfig(token);
  let feePercent = constants.Zero;
  const isWaived = await redemptionVault.waivedFeeRestriction(sender);
  if (!isWaived) {
    feePercent = overrideTokenFee ?? tokenConfig.fee;
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
    | RedemptionVaultWithAave
    | RedemptionVaultWithMorpho
    | RedemptionVaultWithMToken
    | RedemptionVaultWithSwapper
    | RedemptionVaultWithUSTB,
  mTokenRate: BigNumber,
  amountIn: BigNumber,
  isInstant: boolean,
  overrideTokenFee?: BigNumber,
  overrideTokenOutRate?: BigNumber,
) => {
  const tokenConfig = await redemptionVault.tokensConfig(token.address);

  const dataFeedContract = DataFeedTest__factory.connect(
    tokenConfig.dataFeed,
    sender,
  );
  const currentTokenOutRate =
    overrideTokenOutRate ??
    (tokenConfig.stable
      ? constants.WeiPerEther
      : await dataFeedContract.getDataInBase18());
  if (currentTokenOutRate.isZero())
    return {
      amountOut: constants.Zero,
      amountInWithoutFee: constants.Zero,
      fee: constants.Zero,
      currentStableRate: constants.Zero,
      tokenOutRate: constants.Zero,
    };

  const tokenDecimals = await token.decimals();

  const amountOut = amountIn
    .mul(mTokenRate)
    .div(currentTokenOutRate)
    .div(10 ** (18 - tokenDecimals));

  const feePercent =
    overrideTokenFee ??
    (await getFeePercent(
      sender.address,
      token.address,
      redemptionVault,
      isInstant,
    ));

  const hundredPercent = await redemptionVault.ONE_HUNDRED_PERCENT();
  const fee = amountOut.mul(feePercent).div(hundredPercent);

  const amountOutWithoutFee = amountOut.sub(fee);

  return {
    amountOut,
    amountOutWithoutFee: amountOutWithoutFee,
    fee,
    feePercent,
    currentStableRate: currentTokenOutRate,
    amountOutBase18: amountOut.mul(10 ** (18 - tokenDecimals)),
    amountOutWithoutFeeBase18: amountOutWithoutFee.mul(
      10 ** (18 - tokenDecimals),
    ),
    feeBase18: fee.mul(10 ** (18 - tokenDecimals)),
    tokenOutRate: currentTokenOutRate,
  };
};

export const estimateSendTokensFromLiquidity = async (
  redemptionVault:
    | RedemptionVault
    | RedemptionVaultWithAave
    | RedemptionVaultWithMorpho
    | RedemptionVaultWithMToken
    | RedemptionVaultWithSwapper
    | RedemptionVaultWithUSTB,
  tokenOut: ERC20,
  amountTokenOutWithoutFeeBase18: BigNumber,
  feeAmountBase18: BigNumber,
  tokenOutRate: BigNumber,
  additionalLiquidity?: BigNumberish,
) => {
  const decimals = await tokenOut.decimals();
  const balanceVaultBase18 = (await tokenOut.balanceOf(redemptionVault.address))
    .add(additionalLiquidity ?? constants.Zero)
    .mul(10 ** (18 - decimals));

  const totalAmountBase18 = amountTokenOutWithoutFeeBase18.add(feeAmountBase18);

  if (totalAmountBase18.eq(0)) {
    return {
      toTransferFromVaultBase18: constants.Zero,
      toTransferFromLpBase18: constants.Zero,
      lpFeePortionBase18: constants.Zero,
      vaultFeePortionBase18: constants.Zero,
      toUseVaultLiquidityBase18: constants.Zero,
      toUseLpLiquidityBase18: constants.Zero,
      toTransferFromVault: constants.Zero,
      toTransferFromLpMToken: constants.Zero,
      lpFeePortion: constants.Zero,
      vaultFeePortion: constants.Zero,
      toUseVaultLiquidity: constants.Zero,
      toUseLpLiquidity: constants.Zero,
    };
  }

  const toUseVaultLiquidityBase18 = balanceVaultBase18.gte(totalAmountBase18)
    ? totalAmountBase18
    : balanceVaultBase18;

  const toUseLpLiquidityBase18 = totalAmountBase18.sub(
    toUseVaultLiquidityBase18,
  );

  const lpFeePortionBase18 = feeAmountBase18
    .mul(toUseLpLiquidityBase18)
    .div(totalAmountBase18)
    .div(10 ** (18 - decimals))
    .mul(10 ** (18 - decimals));

  const vaultFeePortionBase18 = feeAmountBase18.sub(lpFeePortionBase18);

  const toTransferFromVaultBase18 = toUseVaultLiquidityBase18.sub(
    vaultFeePortionBase18,
  );

  const toTransferFromLpBase18 = toUseLpLiquidityBase18.sub(lpFeePortionBase18);

  const loanSwapperVault = await redemptionVault.loanSwapperVault();
  const loanSwapperVaultMTokenDataFeed =
    loanSwapperVault !== constants.AddressZero
      ? DataFeedTest__factory.connect(
          await RedemptionVaultTest__factory.connect(
            loanSwapperVault,
            redemptionVault.provider,
          ).mTokenDataFeed(),
          redemptionVault.provider,
        )
      : undefined;

  const mTokenARate = loanSwapperVaultMTokenDataFeed
    ? await loanSwapperVaultMTokenDataFeed.getDataInBase18()
    : constants.Zero;

  if (mTokenARate.eq(0)) {
    return {
      toTransferFromVaultBase18,
      toTransferFromLpBase18,
      lpFeePortionBase18,
      vaultFeePortionBase18,
      toUseVaultLiquidityBase18,
      toUseLpLiquidityBase18,
      toTransferFromLpMToken: constants.Zero,
      toTransferFromVault: toTransferFromVaultBase18.div(10 ** (18 - decimals)),
      lpFeePortion: lpFeePortionBase18.div(10 ** (18 - decimals)),
      vaultFeePortion: vaultFeePortionBase18.div(10 ** (18 - decimals)),
      toUseVaultLiquidity: toUseVaultLiquidityBase18.div(10 ** (18 - decimals)),
      toUseLpLiquidity: toUseLpLiquidityBase18.div(10 ** (18 - decimals)),
    };
  }

  let mTokenAAmount = toTransferFromLpBase18.mul(tokenOutRate).div(mTokenARate);

  mTokenAAmount = mTokenAAmount.add(
    toTransferFromLpBase18
      .mul(tokenOutRate)
      .sub(mTokenAAmount.mul(mTokenARate)),
  );

  return {
    toTransferFromVaultBase18,
    toTransferFromLpBase18,
    lpFeePortionBase18,
    vaultFeePortionBase18,
    toUseVaultLiquidityBase18,
    toUseLpLiquidityBase18,
    toTransferFromVault: toTransferFromVaultBase18.div(10 ** (18 - decimals)),
    toTransferFromLpMToken: mTokenAAmount,
    lpFeePortion: lpFeePortionBase18.div(10 ** (18 - decimals)),
    vaultFeePortion: vaultFeePortionBase18.div(10 ** (18 - decimals)),
    toUseVaultLiquidity: toUseVaultLiquidityBase18.div(10 ** (18 - decimals)),
    toUseLpLiquidity: toUseLpLiquidityBase18.div(10 ** (18 - decimals)),
  };
};
