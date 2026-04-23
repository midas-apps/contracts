import { setNextBlockTimestamp } from '@nomicfoundation/hardhat-network-helpers/dist/src/helpers/time';
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { expect } from 'chai';
import { BigNumber, BigNumberish, constants } from 'ethers';
import { formatUnits, parseUnits, solidityKeccak256 } from 'ethers/lib/utils';
import { ethers } from 'hardhat';

import {
  AccountOrContract,
  OptionalCommonParams,
  balanceOfBase18,
  getAccount,
  getCurrentBlockTimestamp,
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

type RedemptionVaultType =
  | RedemptionVault
  | RedemptionVaultWithAave
  | RedemptionVaultWithMorpho
  | RedemptionVaultWithMToken
  | RedemptionVaultWithUSTB
  | RedemptionVaultWithSwapper;

type CommonParamsRedeem = {
  mTBILL: MToken | MTBILL;
} & Pick<
  Awaited<ReturnType<typeof defaultDeploy>>,
  'owner' | 'mTokenToUsdDataFeed'
> & {
    redemptionVault: RedemptionVaultType;
  };

type CommonParams = Pick<Awaited<ReturnType<typeof defaultDeploy>>, 'owner'> & {
  redemptionVault: RedemptionVaultType;
};

/**
 * Writes a legacy v1 `Request` into the current `redeemRequests` mapping storage.
 *
 * The current contract stores `RequestV2` at `redeemRequests`, but all approve entry points
 * validate `request.version == 1` (v2) and reject v1 (version != 1).
 *
 * Used by unit tests to ensure backward compatibility behavior:
 * - `redeemRequests()` getter must not revert when v1 data exists
 * - approve-style entry points must revert with `RV: not v2 request`
 */
export const setV1RedeemRequestInStorage = async (
  vault: { address: string },
  requestId: number,
  params: {
    sender: string;
    tokenOut: string;
    amountMToken: bigint;
    mTokenRate: bigint;
    tokenOutRate: bigint;
    status?: number; // RequestStatus enum: 0=Pending
  },
) => {
  const REDEMPTION_REQUESTS_SLOT = 422;
  const STATUS_OFFSET_IN_TOKENOUT_SLOT = 20n; // tokenOut is 20 bytes; status is the next byte

  const toWordHex = (value: bigint) => {
    return `0x${value.toString(16).padStart(64, '0')}`;
  };

  const { sender, tokenOut, amountMToken, mTokenRate, tokenOutRate } = params;
  const status = params.status ?? 0;

  // mappingSlot = keccak256(abi.encode(key, mappingSlotBase))
  const mappingSlotHex = solidityKeccak256(
    ['uint256', 'uint256'],
    [requestId, REDEMPTION_REQUESTS_SLOT],
  );
  const mappingSlot = BigInt(mappingSlotHex);

  const slotAt = (offset: number) => {
    return `0x${(mappingSlot + BigInt(offset)).toString(16)}`;
  };

  // v1 legacy struct layout inside RequestV2 mapping:
  // sender @ slot + 0
  // tokenOut + status packed @ slot + 1
  // amountMToken @ slot + 2
  // mTokenRate @ slot + 3
  // tokenOutRate @ slot + 4
  //
  // v2 getter will still read feePercent @ slot + 5 and version @ slot + 6.
  const senderWord = BigInt(sender);
  const tokenOutWord =
    BigInt(tokenOut) +
    BigInt(status) * (1n << (8n * STATUS_OFFSET_IN_TOKENOUT_SLOT));
  const amountMTokenWord = amountMToken;
  const mTokenRateWord = mTokenRate;
  const tokenOutRateWord = tokenOutRate;

  await ethers.provider.send('hardhat_setStorageAt', [
    vault.address,
    slotAt(0),
    toWordHex(senderWord),
  ]);
  await ethers.provider.send('hardhat_setStorageAt', [
    vault.address,
    slotAt(1),
    toWordHex(tokenOutWord),
  ]);
  await ethers.provider.send('hardhat_setStorageAt', [
    vault.address,
    slotAt(2),
    toWordHex(amountMTokenWord),
  ]);
  await ethers.provider.send('hardhat_setStorageAt', [
    vault.address,
    slotAt(3),
    toWordHex(mTokenRateWord),
  ]);
  await ethers.provider.send('hardhat_setStorageAt', [
    vault.address,
    slotAt(4),
    toWordHex(tokenOutRateWord),
  ]);

  // feePercent (slot + 5) and version (slot + 6) must decode as 0 for v1 data.
  await ethers.provider.send('hardhat_setStorageAt', [
    vault.address,
    slotAt(5),
    toWordHex(0n),
  ]);
  await ethers.provider.send('hardhat_setStorageAt', [
    vault.address,
    slotAt(6),
    toWordHex(0n),
  ]);
};

const getTotalFromInstantShare = (
  amountIn: BigNumber,
  instantShare?: BigNumberish,
) => {
  if (instantShare === undefined) {
    return amountIn;
  }

  if (BigNumber.from(instantShare).eq(constants.Zero)) {
    return BigNumber.from(0);
  }

  return amountIn.mul(100_00).div(instantShare);
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
    holdback,
  }: CommonParamsRedeem & {
    waivedFee?: boolean;
    minAmount?: BigNumberish;
    customRecipient?: AccountOrContract;
    checkSupply?: boolean;
    expectedAmountOut?: BigNumberish;
    additionalLiquidity?: () => Promise<BigNumberish>;
    holdback?: {
      callFunction: () => Promise<unknown>;
      instantShare: BigNumberish;
    };
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

  const callFn =
    holdback?.callFunction ??
    (withRecipient
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
          ));

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

  const callPromise = callFn();
  await expect(callPromise)
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
  expect(balanceAfterUser).eq(
    balanceBeforeUser.sub(
      getTotalFromInstantShare(amountIn, holdback?.instantShare),
    ),
  );
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
    expect(loanRequest.createdAt).eq(await getCurrentBlockTimestamp());
  } else {
    expect(lastLoanRequestIdAfter).eq(lastLoanRequestIdBefore);
  }

  return callPromise;
};

export const redeemRequestTest = async (
  {
    redemptionVault,
    owner,
    mTBILL,
    mTokenToUsdDataFeed,
    waivedFee,
    customRecipient,
    customRecipientInstant,
    instantShare,
    minReceiveAmountInstantShare,
  }: CommonParamsRedeem & {
    waivedFee?: boolean;
    customRecipient?: AccountOrContract;
    instantShare?: BigNumberish;
    minReceiveAmountInstantShare?: BigNumberish;
    customRecipientInstant?: AccountOrContract;
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

  const recipientRequest = customRecipient
    ? getAccount(customRecipient)
    : sender.address;
  const recipientInstant = customRecipientInstant
    ? getAccount(customRecipientInstant)
    : sender.address;

  const callFn =
    instantShare !== undefined
      ? redemptionVault
          .connect(sender)
          [
            'redeemRequest(address,uint256,address,uint256,uint256,address)'
          ].bind(
            this,
            tokenOut,
            amountIn,
            recipientRequest,
            instantShare,
            minReceiveAmountInstantShare ?? constants.Zero,
            recipientInstant,
          )
      : withRecipient
      ? redemptionVault
          .connect(sender)
          ['redeemRequest(address,uint256,address)'].bind(
            this,
            tokenOut,
            amountIn,
            recipientRequest,
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

  const amountMTokenInInstant = amountIn
    .mul(instantShare ?? constants.Zero)
    .div(100_00);
  const amountMTokenInRequest = amountIn.sub(amountMTokenInInstant);

  let callPromise: Awaited<ReturnType<typeof redeemInstantTest>>;

  if (amountMTokenInInstant.gt(0)) {
    callPromise = await redeemInstantTest(
      {
        redemptionVault,
        owner,
        mTBILL,
        mTokenToUsdDataFeed,
        waivedFee,
        minAmount: constants.Zero,
        customRecipient: recipientInstant,
        holdback: {
          callFunction: callFn,
          instantShare: instantShare ?? constants.Zero,
        },
      },
      tokenOut,
      +formatUnits(amountMTokenInInstant, 18),
      { from: sender },
    );
  }

  await expect(callPromise ?? callFn())
    .to.emit(
      redemptionVault,
      redemptionVault.interface.events[
        'RedeemRequestV2(uint256,address,address,address,uint256,uint256,uint256,uint256)'
      ].name,
    )
    .withArgs(
      ...[
        latestRequestIdBefore.add(1),
        sender,
        tokenOut,
        withRecipient ? recipientRequest : undefined,
        amountMTokenInRequest,
        feeBase18,
      ].filter((v) => v !== undefined),
    ).to.not.reverted;

  const latestRequestIdAfter = await redemptionVault.currentRequestId();
  const request = await redemptionVault.redeemRequests(latestRequestIdBefore);

  expect(request.sender).eq(recipientRequest);
  expect(request.tokenOut).eq(tokenOut);
  expect(request.amountMToken).eq(amountMTokenInRequest);
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

  expect(latestRequestIdAfter).eq(latestRequestIdBefore.add(1));
  expect(balanceAfterUser).eq(balanceBeforeUser.sub(amountIn));
  expect(balanceAfterContract).eq(balanceBeforeContract);
  expect(balanceAfterReceiver).eq(balanceBeforeReceiver);
  expect(balanceAfterFeeReceiver).eq(balanceBeforeFeeReceiver);

  // thos checks is already made in redeemInstantTest
  if (!amountMTokenInInstant.gt(0)) {
    expect(supplyAfter).eq(supplyBefore);
    expect(balanceAfterTokenOut).eq(balanceBeforeTokenOut);
  }

  expect(balanceAfterRequestRedeemer).eq(
    balanceBeforeRequestRedeemer.add(amountMTokenInRequest),
  );

  return {
    requestId: latestRequestIdBefore,
    rate: mTokenRate,
  };
};

export const approveRedeemRequestTest = async (
  {
    redemptionVault,
    owner,
    mTBILL,
    waivedFee,
    isSafe,
    isAvgRate,
  }: CommonParamsRedeem & {
    waivedFee?: boolean;
    isSafe?: boolean;
    isAvgRate?: boolean;
  },
  requestId: BigNumberish,
  rate: BigNumber,
  opt?: OptionalCommonParams,
) => {
  const sender = opt?.from ?? owner;

  const tokensReceiver = await redemptionVault.tokensReceiver();
  const feeReceiver = await redemptionVault.feeReceiver();

  const callFn = isAvgRate
    ? isSafe
      ? redemptionVault
          .connect(sender)
          .safeApproveRequestAvgRate.bind(this, requestId, rate)
      : redemptionVault
          .connect(sender)
          .approveRequestAvgRate.bind(this, requestId, rate)
    : isSafe
    ? redemptionVault
        .connect(sender)
        .safeApproveRequest.bind(this, requestId, rate)
    : redemptionVault
        .connect(sender)
        .approveRequest.bind(this, requestId, rate);

  if (opt?.revertMessage) {
    await expect(callFn()).revertedWith(opt?.revertMessage);
    return;
  }

  const requestDataBefore = await redemptionVault.redeemRequests(requestId);

  const actualRate = !isAvgRate
    ? rate
    : expectedHoldbackPartRateFromAvg(
        requestDataBefore.amountMToken,
        requestDataBefore.amountMTokenInstant,
        requestDataBefore.mTokenRate,
        rate,
      );

  const tokenContract = ERC20__factory.connect(
    requestDataBefore.tokenOut,
    owner,
  );

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

  await expect(callFn())
    .to.emit(
      redemptionVault,
      redemptionVault.interface.events[
        'ApproveRequestV2(uint256,uint256,bool,bool)'
      ].name,
    )
    .withArgs(requestId, actualRate, isSafe, isAvgRate).to.not.reverted;

  const requestDataAfter = await redemptionVault.redeemRequests(requestId);

  expect(requestDataAfter.status).eq(1);
  expect(requestDataAfter.approvedMTokenRate).eq(actualRate);
  expect(requestDataAfter.mTokenRate).eq(requestDataBefore.mTokenRate);

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

  const tokenDecimals = !tokenContract ? 18 : await tokenContract.decimals();

  const amountOut = requestDataBefore.amountMToken
    .mul(actualRate)
    .div(requestDataBefore.tokenOutRate)
    .div(10 ** (18 - tokenDecimals));

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
  loanApr = BigNumber.from(0) as BigNumberish,
  opt?: OptionalCommonParams,
) => {
  const sender = opt?.from ?? owner;

  const requestIds = requests.map(({ id }) => id);

  const callFn = redemptionVault
    .connect(sender)
    .bulkRepayLpLoanRequest.bind(this, requestIds, loanApr);

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
      expectedReceivedFeeAmount: BigNumber.from(0),
      balance: balancesBefore[index],
      balanceFee: balancesFeeBefore[index],
      balanceLp: balancesLpBefore[index],
    };
  });
  const expectedTotalBurned = BigNumber.from(0);

  const txPromise = callFn();
  await expect(txPromise).to.not.reverted;

  const txReceipt = await (await txPromise).wait();
  const txBlock = await ethers.provider.getBlock(txReceipt.blockNumber);
  const currentTimestamp = txBlock.timestamp;

  const feePercents = await Promise.all(
    requestDatasBefore.map((requestData) => {
      const duration = BigNumber.from(currentTimestamp).sub(
        requestData.createdAt,
      );

      const accruedInterest = requestData.amountTokenOut
        .mul(loanApr)
        .mul(duration)
        .div(BigNumber.from(10_000).mul(365).mul(86400));

      const amountFee = accruedInterest.gt(requestData.amountFee)
        ? accruedInterest
        : requestData.amountFee;

      return amountFee;
    }),
  );

  for (const [index, feePercent] of feePercents.entries()) {
    groupedDataBefore[index].expectedReceivedFeeAmount = feePercent;
  }

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

    expect(requestDataAfter.amountFee).eq(dataBefore.expectedReceivedFeeAmount);
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
    expect(requestDataAfter.createdAt).eq(requestDataBefore.createdAt);
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
  {
    redemptionVault,
    owner,
    mTBILL,
    mTokenToUsdDataFeed,
    isAvgRate,
    feedIsGrowth = false,
  }: CommonParamsRedeem & {
    isAvgRate?: boolean;
    feedIsGrowth?: boolean;
  },
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
          [
            `safeBulkApproveRequest${
              isAvgRate ? 'AvgRate' : ''
            }(uint256[],uint256)`
          ].bind(this, requestIds, newRate)
      : newRate === 'request-rate'
      ? redemptionVault
          .connect(sender)
          .safeBulkApproveRequestAtSavedRate.bind(this, requestIds)
      : redemptionVault
          .connect(sender)
          [
            `safeBulkApproveRequest${isAvgRate ? 'AvgRate' : ''}(uint256[])`
          ].bind(this, requestIds);

  if (opt?.revertMessage) {
    await expect(callFn()).revertedWith(opt?.revertMessage);
    return;
  }

  await setNextBlockTimestamp((await getCurrentBlockTimestamp()) + 1);

  const requestDatasBefore = await Promise.all(
    requestIds.map((requestId) => redemptionVault.redeemRequests(requestId)),
  );

  const balancesBefore = await Promise.all(
    requestDatasBefore.map(({ tokenOut, sender }) =>
      balanceOfBase18(ERC20__factory.connect(tokenOut, owner), sender),
    ),
  );

  const totalSupplyBefore = await mTBILL.totalSupply();

  const _tokenDecimals = await Promise.all(
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
  const txPromise = callFn();
  await expect(txPromise).to.not.reverted;

  const currentRate = await mTokenToUsdDataFeed.getDataInBase18();

  const newExpectedRate = (
    requestData: (typeof requestDatasBefore)[number],
  ) => {
    let rate =
      newRate === 'request-rate'
        ? requestData.mTokenRate
        : newRate ?? currentRate;

    if (isAvgRate) {
      rate = expectedHoldbackPartRateFromAvg(
        requestData.amountMToken,
        requestData.amountMTokenInstant,
        requestData.mTokenRate,
        rate,
      );
    }
    return BigNumber.from(rate);
  };

  const expectedReceivedAmounts = await Promise.all(
    requestDatasBefore.map(async (requestData) => {
      const { amountOutWithoutFeeBase18 } = await calcExpectedTokenOutAmount(
        sender,
        ERC20__factory.connect(requestData.tokenOut, owner),
        redemptionVault,
        newExpectedRate(requestData),
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

  const txReceipt = await (await txPromise).wait();

  const parsedLogs = txReceipt.logs
    .filter((v) => v.address === redemptionVault.address)
    .map((log) => redemptionVault.interface.parseLog(log))
    .filter((v) => v.name === 'ApproveRequestV2')
    .map((v) => v.args);

  const requestDatasAfter = await Promise.all(
    requestIds.map((requestId) => redemptionVault.redeemRequests(requestId)),
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
      const expectedRate = newExpectedRate(requestDataBefore);
      expect(logs.length).eq(1);
      expect(requestDataAfter.approvedMTokenRate).eq(expectedRate);
      expect(requestDataAfter.mTokenRate).eq(requestDataBefore.mTokenRate);
      expect(requestDataAfter.status).eq(1);
      expect(balanceAfter).eq(
        balanceBefore.add(expectedReceivedAggregatedByUser),
      );
      const log = logs[0];

      expect(log.newMTokenRate).eq(expectedRate);
      expect(log.requestId).eq(id);
    } else {
      expect(logs.length).eq(0);
      expect(requestDataAfter.mTokenRate).eq(requestDataBefore.mTokenRate);
      expect(requestDataAfter.approvedMTokenRate).eq(0);
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

export const setMaxLoanAprTest = async (
  { redemptionVault, owner }: CommonParams,
  maxLoanApr: number,
  opt?: OptionalCommonParams,
) => {
  if (opt?.revertMessage) {
    await expect(
      redemptionVault.connect(opt?.from ?? owner).setMaxLoanApr(maxLoanApr),
    ).revertedWith(opt?.revertMessage);
    return;
  }

  await expect(
    redemptionVault.connect(opt?.from ?? owner).setMaxLoanApr(maxLoanApr),
  ).to.emit(
    redemptionVault,
    redemptionVault.interface.events['SetMaxLoanApr(address,uint64)'].name,
  ).to.not.reverted;

  const newMaxLoanApr = await redemptionVault.maxLoanApr();
  expect(newMaxLoanApr).eq(maxLoanApr);
};

export const setMaxInstantShareTest = async (
  { redemptionVault, owner }: CommonParams,
  maxInstantShare: number,
  opt?: OptionalCommonParams,
) => {
  if (opt?.revertMessage) {
    await expect(
      redemptionVault
        .connect(opt?.from ?? owner)
        .setMaxInstantShare(maxInstantShare),
    ).revertedWith(opt?.revertMessage);
    return;
  }

  await expect(
    redemptionVault
      .connect(opt?.from ?? owner)
      .setMaxInstantShare(maxInstantShare),
  ).to.emit(
    redemptionVault,
    redemptionVault.interface.events['SetMaxInstantShare(address,uint64)'].name,
  ).to.not.reverted;

  const newMaxInstantShare = await redemptionVault.maxInstantShare();
  expect(newMaxInstantShare).eq(maxInstantShare);
};

export const setMaxApproveRequestIdTest = async (
  { redemptionVault, owner }: CommonParams,
  maxApproveRequestId: number,
  opt?: OptionalCommonParams,
) => {
  if (opt?.revertMessage) {
    await expect(
      redemptionVault
        .connect(opt?.from ?? owner)
        .setMaxApproveRequestId(maxApproveRequestId),
    ).revertedWith(opt?.revertMessage);
    return;
  }

  await expect(
    redemptionVault
      .connect(opt?.from ?? owner)
      .setMaxApproveRequestId(maxApproveRequestId),
  ).to.emit(
    redemptionVault,
    redemptionVault.interface.events['SetMaxApproveRequestId(address,uint256)']
      .name,
  ).to.not.reverted;

  const newMaxApproveRequestId = await redemptionVault.maxApproveRequestId();
  expect(newMaxApproveRequestId).eq(maxApproveRequestId);
};

export const setPreferLoanLiquidityTest = async (
  { redemptionVault, owner }: CommonParams,
  preferLoanLiquidity: boolean,
  opt?: OptionalCommonParams,
) => {
  if (opt?.revertMessage) {
    await expect(
      redemptionVault
        .connect(opt?.from ?? owner)
        .setPreferLoanLiquidity(preferLoanLiquidity),
    ).revertedWith(opt?.revertMessage);
    return;
  }

  await expect(
    redemptionVault
      .connect(opt?.from ?? owner)
      .setPreferLoanLiquidity(preferLoanLiquidity),
  ).to.emit(
    redemptionVault,
    redemptionVault.interface.events['SetPreferLoanLiquidity(address,bool)']
      .name,
  ).to.not.reverted;

  const newPreferLoanLiquidity = await redemptionVault.preferLoanLiquidity();
  expect(newPreferLoanLiquidity).eq(preferLoanLiquidity);
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
  redemptionVault: RedemptionVaultType,
  tokenOut: ERC20,
  amountTokenOutWithoutFeeBase18: BigNumber,
  feeAmountBase18: BigNumber,
  tokenOutRate: BigNumber,
  additionalLiquidity?: BigNumberish,
) => {
  const decimals = await tokenOut.decimals();
  const precision = BigNumber.from(10).pow(18 - decimals);
  const balanceVaultBase18 = (await tokenOut.balanceOf(redemptionVault.address))
    .add(additionalLiquidity ?? constants.Zero)
    .mul(precision);

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

  const loanSwapperVaultAddress = await redemptionVault.loanSwapperVault();
  const loanSwapperVault =
    loanSwapperVaultAddress !== constants.AddressZero
      ? RedemptionVaultTest__factory.connect(
          loanSwapperVaultAddress,
          redemptionVault.provider,
        )
      : undefined;
  const loanSwapperVaultMTokenDataFeed = loanSwapperVault
    ? DataFeedTest__factory.connect(
        await loanSwapperVault.mTokenDataFeed(),
        redemptionVault.provider,
      )
    : undefined;
  const loanSwapperVaultMToken = loanSwapperVault
    ? ERC20__factory.connect(
        await loanSwapperVault.mToken(),
        redemptionVault.provider,
      )
    : undefined;

  const truncateToTokenDecimals = (amount: BigNumber) =>
    amount.div(precision).mul(precision);

  const estimateUseLoanLpLiquidity = async (
    amountTokenOutBase18: BigNumber,
    totalAmount: BigNumber,
    totalFee: BigNumber,
  ) => {
    if (amountTokenOutBase18.eq(0)) {
      return {
        amountReceivedBase18: constants.Zero,
        feePortionBase18: constants.Zero,
      };
    }

    const loanLp = await redemptionVault.loanLp();
    if (
      !loanSwapperVaultMTokenDataFeed ||
      !loanSwapperVaultMToken ||
      loanLp === constants.AddressZero
    ) {
      return {
        amountReceivedBase18: constants.Zero,
        feePortionBase18: constants.Zero,
      };
    }

    const mTokenARate = await loanSwapperVaultMTokenDataFeed.getDataInBase18();
    if (mTokenARate.eq(0)) {
      return {
        amountReceivedBase18: constants.Zero,
        feePortionBase18: constants.Zero,
      };
    }

    let grossTokenOutAmount = (await loanSwapperVaultMToken.balanceOf(loanLp))
      .mul(mTokenARate)
      .div(tokenOutRate);

    if (grossTokenOutAmount.gt(amountTokenOutBase18)) {
      grossTokenOutAmount = amountTokenOutBase18;
    }

    if (grossTokenOutAmount.eq(0)) {
      return {
        amountReceivedBase18: constants.Zero,
        feePortionBase18: constants.Zero,
      };
    }

    const feePortionBase18 = truncateToTokenDecimals(
      totalFee.mul(grossTokenOutAmount).div(totalAmount),
    );

    if (grossTokenOutAmount.eq(feePortionBase18)) {
      return {
        amountReceivedBase18: constants.Zero,
        feePortionBase18,
      };
    }

    return {
      amountReceivedBase18: grossTokenOutAmount.sub(feePortionBase18),
      feePortionBase18,
    };
  };

  const preferLoanLiquidity = await redemptionVault.preferLoanLiquidity();
  let usedLpLiquidityBase18 = constants.Zero;
  let lpFeePortionBase18 = constants.Zero;

  if (preferLoanLiquidity) {
    ({
      amountReceivedBase18: usedLpLiquidityBase18,
      feePortionBase18: lpFeePortionBase18,
    } = await estimateUseLoanLpLiquidity(
      totalAmountBase18,
      totalAmountBase18,
      feeAmountBase18,
    ));
  } else {
    const obtainedVaultLiquidityBase18 = constants.Zero;
    const newBalanceBase18 = balanceVaultBase18.add(
      obtainedVaultLiquidityBase18,
    );

    if (newBalanceBase18.lt(totalAmountBase18)) {
      ({
        amountReceivedBase18: usedLpLiquidityBase18,
        feePortionBase18: lpFeePortionBase18,
      } = await estimateUseLoanLpLiquidity(
        totalAmountBase18.sub(newBalanceBase18),
        totalAmountBase18,
        feeAmountBase18,
      ));
    }
  }

  const toTransferFromLpBase18 = usedLpLiquidityBase18;
  const toTransferFromVaultBase18 = amountTokenOutWithoutFeeBase18.gte(
    toTransferFromLpBase18,
  )
    ? amountTokenOutWithoutFeeBase18.sub(toTransferFromLpBase18)
    : constants.Zero;
  const vaultFeePortionBase18 = feeAmountBase18.sub(lpFeePortionBase18);
  const toUseLpLiquidityBase18 = toTransferFromLpBase18.add(lpFeePortionBase18);
  const toUseVaultLiquidityBase18 = totalAmountBase18.sub(
    toUseLpLiquidityBase18,
  );

  const mTokenARate = loanSwapperVaultMTokenDataFeed
    ? await loanSwapperVaultMTokenDataFeed.getDataInBase18()
    : constants.Zero;
  const mTokenAAmount =
    toTransferFromLpBase18.eq(0) || mTokenARate.eq(0)
      ? constants.Zero
      : toTransferFromLpBase18
          .mul(tokenOutRate)
          .add(mTokenARate.sub(1))
          .div(mTokenARate);

  return {
    toTransferFromVaultBase18,
    toTransferFromLpBase18,
    lpFeePortionBase18,
    vaultFeePortionBase18,
    toUseVaultLiquidityBase18,
    toUseLpLiquidityBase18,
    toTransferFromVault: toTransferFromVaultBase18.div(precision),
    toTransferFromLpMToken: mTokenAAmount,
    lpFeePortion: lpFeePortionBase18.div(precision),
    vaultFeePortion: vaultFeePortionBase18.div(precision),
    toUseVaultLiquidity: toUseVaultLiquidityBase18.div(precision),
    toUseLpLiquidity: toUseLpLiquidityBase18.div(precision),
  };
};

export const expectedHoldbackPartRateFromAvg = (
  amountMToken: BigNumberish,
  amountMTokenInstant: BigNumberish,
  mTokenRate: BigNumberish,
  avgMTokenRate: BigNumberish,
): BigNumberish => {
  amountMToken = BigNumber.from(amountMToken).toBigInt();
  amountMTokenInstant = BigNumber.from(amountMTokenInstant).toBigInt();
  mTokenRate = BigNumber.from(mTokenRate).toBigInt();
  avgMTokenRate = BigNumber.from(avgMTokenRate).toBigInt();

  const targetTotalValue =
    ((amountMToken + amountMTokenInstant) * avgMTokenRate) / 10n ** 18n;
  const instantPartValue = (amountMTokenInstant * mTokenRate) / 10n ** 18n;
  if (targetTotalValue <= instantPartValue) {
    return 0n;
  }
  const holdbackPartValue = targetTotalValue - instantPartValue;
  return (holdbackPartValue * 10n ** 18n) / amountMToken;
};
