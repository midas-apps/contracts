import { setNextBlockTimestamp } from '@nomicfoundation/hardhat-network-helpers/dist/src/helpers/time';
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { expect } from 'chai';
import {
  BigNumber,
  BigNumberish,
  constants,
  ContractTransaction,
} from 'ethers';
import { formatUnits, parseUnits } from 'ethers/lib/utils';

import {
  AccountOrContract,
  OptionalCommonParams,
  balanceOfBase18,
  getAccount,
  getCurrentBlockTimestamp,
  handleRevert,
} from './common.helpers';
import { defaultDeploy } from './fixtures';

import {
  DataFeedTest__factory,
  DepositVault,
  DepositVaultTest,
  DepositVaultWithAaveTest,
  DepositVaultWithMorphoTest,
  DepositVaultWithMTokenTest,
  DepositVaultWithUSTBTest,
  ERC20,
  ERC20__factory,
  MToken,
} from '../../typechain-types';

type DepositVaultType =
  | DepositVault
  | DepositVaultTest
  | DepositVaultWithAaveTest
  | DepositVaultWithMorphoTest
  | DepositVaultWithMTokenTest
  | DepositVaultWithUSTBTest;
type CommonParamsDeposit = {
  depositVault: DepositVaultType;
  mTBILL: MToken;
} & Pick<
  Awaited<ReturnType<typeof defaultDeploy>>,
  'owner' | 'mTokenToUsdDataFeed'
>;

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

export const depositInstantTest = async (
  {
    depositVault,
    owner,
    mTBILL,
    mTokenToUsdDataFeed,
    waivedFee,
    minAmount,
    customRecipient,
    checkTokensReceiver = true,
    expectedMintAmount,
    holdback,
  }: CommonParamsDeposit & {
    waivedFee?: boolean;
    minAmount?: BigNumberish;
    customRecipient?: AccountOrContract;
    checkTokensReceiver?: boolean;
    expectedMintAmount?: BigNumberish;
    holdback?: {
      callFunction: () => Promise<ContractTransaction>;
      instantShare: BigNumberish;
    };
  },
  tokenIn: ERC20 | string,
  amountUsdIn: number,
  opt?: OptionalCommonParams,
) => {
  tokenIn = getAccount(tokenIn);

  const sender = opt?.from ?? owner;

  const tokenContract = ERC20__factory.connect(tokenIn, owner);

  const tokensReceiver = await depositVault.tokensReceiver();
  const feeReceiver = await depositVault.feeReceiver();

  const amountIn = parseUnits(amountUsdIn.toFixed(18).replace(/\.?0+$/, ''));

  const withRecipient = customRecipient !== undefined;
  const recipient = customRecipient
    ? getAccount(customRecipient)
    : sender.address;

  const callFn =
    holdback?.callFunction ??
    (withRecipient
      ? depositVault
          .connect(sender)
          ['depositInstant(address,uint256,uint256,bytes32,address)'].bind(
            this,
            tokenIn,
            amountIn,
            minAmount ?? constants.Zero,
            constants.HashZero,
            recipient,
          )
      : depositVault
          .connect(sender)
          ['depositInstant(address,uint256,uint256,bytes32)'].bind(
            this,
            tokenIn,
            amountIn,
            minAmount ?? constants.Zero,
            constants.HashZero,
          ));

  if (await handleRevert(callFn, depositVault, opt)) {
    return;
  }

  const balanceBeforeContract = await balanceOfBase18(
    tokenContract,
    tokensReceiver,
  );
  const feeReceiverBalanceBeforeContract = await balanceOfBase18(
    tokenContract,
    feeReceiver,
  );
  const balanceBeforeUser = await balanceOfBase18(
    tokenContract,
    sender.address,
  );
  const balanceMtBillBeforeUser = await balanceOfBase18(mTBILL, recipient);

  const totalMintedBefore = await depositVault.totalMinted(sender.address);
  const totalMintedBeforeRecipient = await depositVault.totalMinted(recipient);
  const maxSupplyCapBefore = await depositVault.maxSupplyCap();

  const mTokenRate = await mTokenToUsdDataFeed.getDataInBase18();

  const { fee, mintAmount, amountInWithoutFee, actualAmountInUsd } =
    await calcExpectedMintAmount(
      sender,
      tokenIn,
      depositVault,
      mTokenRate,
      amountIn,
      true,
    );

  const callPromise = callFn();

  await expect(callPromise)
    .to.emit(
      depositVault,
      depositVault.interface.events[
        'DepositInstantV2(address,address,address,uint256,uint256,uint256,uint256,bytes32)'
      ].name,
    )
    .withArgs(
      ...[
        sender.address,
        tokenContract.address,
        withRecipient ? recipient : undefined,
        actualAmountInUsd,
        amountUsdIn,
        fee,
        0,
        constants.HashZero,
      ].filter((v) => v !== undefined),
    ).to.not.reverted;

  const totalMintedAfter = await depositVault.totalMinted(sender.address);
  const totalMintedAfterRecipient = await depositVault.totalMinted(recipient);

  const balanceAfterContract = await balanceOfBase18(
    tokenContract,
    tokensReceiver,
  );
  const feeReceiverBalanceAfterContract = await balanceOfBase18(
    tokenContract,
    feeReceiver,
  );
  const balanceAfterUser = await balanceOfBase18(tokenContract, sender.address);
  const balanceMtBillAfterUser = await balanceOfBase18(mTBILL, recipient);

  const maxSupplyCapAfter = await depositVault.maxSupplyCap();

  const expectedMinted = expectedMintAmount ?? mintAmount;

  expect(balanceMtBillAfterUser).eq(
    balanceMtBillBeforeUser.add(expectedMinted),
  );
  expect(totalMintedAfter).eq(totalMintedBefore.add(expectedMinted));
  if (recipient !== sender.address) {
    expect(totalMintedAfterRecipient).eq(totalMintedBeforeRecipient);
  }

  if (checkTokensReceiver) {
    expect(balanceAfterContract).eq(
      balanceBeforeContract.add(amountInWithoutFee),
    );
  }

  expect(feeReceiverBalanceAfterContract).eq(
    feeReceiverBalanceBeforeContract.add(fee),
  );
  if (waivedFee) {
    expect(feeReceiverBalanceAfterContract).eq(
      feeReceiverBalanceBeforeContract,
    );
  }

  if (!holdback) {
    expect(balanceAfterUser).eq(balanceBeforeUser.sub(amountIn));
  }

  expect(maxSupplyCapAfter).eq(maxSupplyCapBefore);

  return callPromise;
};

export const depositRequestTest = async (
  {
    depositVault,
    owner,
    mTokenToUsdDataFeed,
    waivedFee,
    customRecipient,
    checkTokensReceiver = true,
    customRecipientInstant,
    instantShare,
    minReceiveAmountInstantShare,
    mTBILL,
  }: CommonParamsDeposit & {
    waivedFee?: boolean;
    customRecipient?: AccountOrContract;
    checkTokensReceiver?: boolean;
    customRecipientInstant?: AccountOrContract;
    instantShare?: BigNumberish;
    minReceiveAmountInstantShare?: BigNumberish;
  },
  tokenIn: ERC20 | string,
  amountUsdIn: number,
  opt?: OptionalCommonParams,
) => {
  tokenIn = getAccount(tokenIn);

  const sender = opt?.from ?? owner;

  const tokenContract = ERC20__factory.connect(tokenIn, owner);

  const tokensReceiver = await depositVault.tokensReceiver();
  const feeReceiver = await depositVault.feeReceiver();

  const amountIn = parseUnits(amountUsdIn.toFixed(18).replace(/\.?0+$/, ''));

  const withRecipient = customRecipient !== undefined;
  const recipient = customRecipient
    ? getAccount(customRecipient)
    : sender.address;

  const recipientInstant = customRecipientInstant
    ? getAccount(customRecipientInstant)
    : sender.address;

  const callFn = instantShare
    ? depositVault
        .connect(sender)
        [
          'depositRequest(address,uint256,bytes32,address,uint256,uint256,address)'
        ].bind(
          this,
          tokenIn,
          amountIn,
          constants.HashZero,
          recipient,
          instantShare,
          minReceiveAmountInstantShare ?? constants.Zero,
          recipientInstant,
        )
    : withRecipient
    ? depositVault
        .connect(sender)
        ['depositRequest(address,uint256,bytes32,address)'].bind(
          this,
          tokenIn,
          amountIn,
          constants.HashZero,
          recipient,
        )
    : depositVault
        .connect(sender)
        ['depositRequest(address,uint256,bytes32)'].bind(
          this,
          tokenIn,
          amountIn,
          constants.HashZero,
        );

  if (await handleRevert(callFn, depositVault, opt)) {
    return {};
  }

  const balanceBeforeContract = await balanceOfBase18(
    tokenContract,
    tokensReceiver,
  );
  const feeReceiverBalanceBeforeContract = await balanceOfBase18(
    tokenContract,
    feeReceiver,
  );
  const balanceBeforeUser = await balanceOfBase18(
    tokenContract,
    sender.address,
  );

  const latestRequestIdBefore = await depositVault.currentRequestId();
  const mTokenRate = await mTokenToUsdDataFeed.getDataInBase18();

  const maxSupplyCapBefore = await depositVault.maxSupplyCap();
  const supplyBefore = await mTBILL.totalSupply();

  const amountTokenInInstant = amountIn
    .mul(instantShare ?? constants.Zero)
    .div(100_00);
  const amountTokenInRequest = amountIn.sub(amountTokenInInstant);

  const calcMintAmountRequest = await calcExpectedMintAmount(
    sender,
    tokenIn,
    depositVault,
    mTokenRate,
    amountTokenInRequest,
    false,
  );

  const calcMintAmountInstant = await calcExpectedMintAmount(
    sender,
    tokenIn,
    depositVault,
    mTokenRate,
    amountTokenInInstant,
    true,
  );

  let callPromise: Awaited<ReturnType<typeof depositInstantTest>>;

  if (amountTokenInInstant.gt(0)) {
    callPromise = await depositInstantTest(
      {
        depositVault,
        owner,
        mTBILL,
        mTokenToUsdDataFeed,
        waivedFee,
        minAmount: minReceiveAmountInstantShare ?? constants.Zero,
        customRecipient: customRecipientInstant,
        checkTokensReceiver: false,
        holdback: {
          callFunction: callFn,
          instantShare: instantShare ?? constants.Zero,
        },
      },
      tokenIn,
      +formatUnits(amountTokenInInstant, 18),
      { from: sender },
    );
  }

  await expect(callPromise ?? callFn())
    .to.emit(
      depositVault,
      depositVault.interface.events[
        'DepositRequestV2(uint256,address,address,address,uint256,uint256,uint256,uint256,bytes32)'
      ].name,
    )
    .withArgs(
      ...[
        latestRequestIdBefore.add(1),
        sender.address,
        tokenContract.address,
        withRecipient ? recipient : undefined,
        amountTokenInRequest,
        calcMintAmountRequest.actualAmountInUsd,
        calcMintAmountRequest.fee,
        calcMintAmountRequest.mintAmount,
        constants.HashZero,
      ].filter((v) => v !== undefined),
    ).to.not.reverted;

  const latestRequestIdAfter = await depositVault.currentRequestId();
  const supplyAfter = await mTBILL.totalSupply();
  const balanceAfterContract = await balanceOfBase18(
    tokenContract,
    tokensReceiver,
  );
  const feeReceiverBalanceAfterContract = await balanceOfBase18(
    tokenContract,
    feeReceiver,
  );
  const balanceAfterUser = await balanceOfBase18(tokenContract, sender.address);
  const request = await depositVault.mintRequests(latestRequestIdBefore);
  const maxSupplyCapAfter = await depositVault.maxSupplyCap();

  expect(request.depositedUsdAmount).eq(
    calcMintAmountRequest.actualAmountInUsd,
  );
  expect(request.tokenOutRate).eq(mTokenRate);
  expect(request.sender).eq(recipient);
  expect(request.status).eq(0);
  expect(request.tokenIn).eq(tokenContract.address);

  expect(latestRequestIdAfter).eq(latestRequestIdBefore.add(1));
  if (checkTokensReceiver) {
    expect(balanceAfterContract).eq(
      balanceBeforeContract.add(
        calcMintAmountRequest.amountInWithoutFee.add(
          calcMintAmountInstant.amountInWithoutFee,
        ),
      ),
    );
  }
  expect(feeReceiverBalanceAfterContract).eq(
    feeReceiverBalanceBeforeContract.add(
      calcMintAmountRequest.fee.add(calcMintAmountInstant.fee),
    ),
  );
  if (waivedFee) {
    expect(feeReceiverBalanceAfterContract).eq(
      feeReceiverBalanceBeforeContract,
    );
  }
  expect(balanceAfterUser).eq(balanceBeforeUser.sub(amountIn));

  expect(maxSupplyCapAfter).eq(maxSupplyCapBefore);

  // those checks is already made in redeemInstantTest
  if (!amountTokenInInstant.gt(0)) {
    expect(supplyAfter).eq(supplyBefore);
  }

  return {
    requestId: latestRequestIdBefore,
    rate: mTokenRate,
  };
};

export const approveRequestTest = async (
  {
    depositVault,
    owner,
    mTBILL,
    isSafe = false,
    isAvgRate = false,
  }: CommonParamsDeposit & {
    isSafe?: boolean;
    isAvgRate?: boolean;
  },
  requestId: BigNumberish,
  newRate: BigNumberish,
  opt?: OptionalCommonParams,
) => {
  const sender = opt?.from ?? owner;

  const callFn = isAvgRate
    ? isSafe
      ? depositVault
          .connect(sender)
          .safeApproveRequestAvgRate.bind(this, requestId, newRate)
      : depositVault
          .connect(sender)
          .approveRequestAvgRate.bind(this, requestId, newRate)
    : isSafe
    ? depositVault
        .connect(sender)
        .safeApproveRequest.bind(this, requestId, newRate)
    : depositVault
        .connect(sender)
        .approveRequest.bind(this, requestId, newRate);

  if (await handleRevert(callFn, depositVault, opt)) {
    return;
  }

  const requestData = await depositVault.mintRequests(requestId);

  const actualRate = !isAvgRate
    ? newRate
    : expectedDepositHoldbackPartRateFromAvg(
        requestData.depositedUsdAmount,
        requestData.depositedInstantUsdAmount,
        requestData.tokenOutRate,
        newRate,
      );

  const balanceMtBillBeforeUser = await balanceOfBase18(
    mTBILL,
    requestData.sender,
  );

  const totalDepositedBefore = await depositVault.totalMinted(
    requestData.sender,
  );

  const feePercent = await getFeePercent(
    requestData.sender,
    requestData.tokenIn,
    depositVault,
    false,
  );

  const expectedMintAmount = requestData.depositedUsdAmount
    .sub(requestData.depositedUsdAmount.mul(feePercent).div(10000))
    .mul(constants.WeiPerEther)
    .div(BigNumber.from(0).eq(actualRate) ? parseUnits('1') : actualRate);

  await expect(callFn())
    .to.emit(
      depositVault,
      depositVault.interface.events[
        'ApproveRequestV2(uint256,uint256,bool,bool)'
      ].name,
    )
    .withArgs(requestId, actualRate, isSafe, isAvgRate).to.not.reverted;

  const requestDataAfter = await depositVault.mintRequests(requestId);

  const totalDepositedAfter = await depositVault.totalMinted(
    requestData.sender,
  );

  const balanceMtBillAfterUser = await balanceOfBase18(
    mTBILL,
    requestData.sender,
  );

  expect(balanceMtBillAfterUser.sub(balanceMtBillBeforeUser)).eq(
    expectedMintAmount,
  );
  expect(totalDepositedAfter).eq(totalDepositedBefore.add(expectedMintAmount));
  expect(requestDataAfter.sender).eq(requestData.sender);
  expect(requestDataAfter.tokenIn).eq(requestData.tokenIn);
  expect(requestDataAfter.tokenOutRate).eq(requestData.tokenOutRate);
  expect(requestDataAfter.approvedTokenOutRate).eq(actualRate);
  expect(requestDataAfter.depositedUsdAmount).eq(
    requestData.depositedUsdAmount,
  );
  expect(requestDataAfter.status).eq(1);
  expect(requestDataAfter.depositedInstantUsdAmount).eq(
    requestData.depositedInstantUsdAmount,
  );
};

export const expectedDepositHoldbackPartRateFromAvg = (
  depositedUsdAmount: BigNumberish,
  depositedInstantUsdAmount: BigNumberish,
  tokenOutRate: BigNumberish,
  avgMTokenRate: BigNumberish,
): bigint => {
  depositedUsdAmount = BigInt(depositedUsdAmount.toString());
  depositedInstantUsdAmount = BigInt(depositedInstantUsdAmount.toString());
  tokenOutRate = BigInt(tokenOutRate.toString());
  avgMTokenRate = BigInt(avgMTokenRate.toString());

  if (avgMTokenRate === 0n || tokenOutRate === 0n) {
    return 0n;
  }

  const targetTotalMTokenValue =
    ((depositedUsdAmount + depositedInstantUsdAmount) * 10n ** 18n) /
    avgMTokenRate;
  const instantPartMTokenValue =
    (depositedInstantUsdAmount * 10n ** 18n) / tokenOutRate;

  if (targetTotalMTokenValue <= instantPartMTokenValue) {
    return 0n;
  }

  const holdbackPartValue = targetTotalMTokenValue - instantPartMTokenValue;

  if (holdbackPartValue === 0n) {
    return 0n;
  }

  return (depositedUsdAmount * 10n ** 18n) / holdbackPartValue;
};

export const safeBulkApproveRequestTest = async (
  {
    depositVault,
    owner,
    mTBILL,
    mTokenToUsdDataFeed,
    isAvgRate = false,
  }: CommonParamsDeposit & {
    isAvgRate?: boolean;
  },
  requests: { id: BigNumberish; expectedToExecute?: boolean }[],
  newRate?: BigNumberish | 'request-rate',
  opt?: OptionalCommonParams,
) => {
  const sender = opt?.from ?? owner;

  const requestIds = requests.map(({ id }) => id);

  const callFn = isAvgRate
    ? newRate && newRate !== 'request-rate'
      ? depositVault
          .connect(sender)
          ['safeBulkApproveRequestAvgRate(uint256[],uint256)'].bind(
            this,
            requestIds,
            newRate,
          )
      : newRate === 'request-rate'
      ? depositVault
          .connect(sender)
          .safeBulkApproveRequestAtSavedRate.bind(this, requestIds)
      : depositVault
          .connect(sender)
          ['safeBulkApproveRequestAvgRate(uint256[])'].bind(this, requestIds)
    : newRate && newRate !== 'request-rate'
    ? depositVault
        .connect(sender)
        ['safeBulkApproveRequest(uint256[],uint256)'].bind(
          this,
          requestIds,
          newRate,
        )
    : newRate === 'request-rate'
    ? depositVault
        .connect(sender)
        .safeBulkApproveRequestAtSavedRate.bind(this, requestIds)
    : depositVault
        .connect(sender)
        ['safeBulkApproveRequest(uint256[])'].bind(this, requestIds);

  if (await handleRevert(callFn, depositVault, opt)) {
    return;
  }

  await setNextBlockTimestamp((await getCurrentBlockTimestamp()) + 1);

  const requestDatasBefore = await Promise.all(
    requestIds.map((requestId) => depositVault.mintRequests(requestId)),
  );

  const balancesBefore = await Promise.all(
    requestDatasBefore.map(({ sender }) => balanceOfBase18(mTBILL, sender)),
  );

  const totalDepositedsBefore = await Promise.all(
    requestDatasBefore.map(({ sender }) => depositVault.totalMinted(sender)),
  );

  const feePercents = await Promise.all(
    requestDatasBefore.map((requestData) =>
      getFeePercent(
        requestData.sender,
        requestData.tokenIn,
        depositVault,
        false,
      ),
    ),
  );

  const totalSupplyBefore = await mTBILL.totalSupply();
  const supplyCap = await depositVault.maxSupplyCap();

  const txPromise = callFn();
  await expect(txPromise).to.not.reverted;

  const currentRate = await mTokenToUsdDataFeed.getDataInBase18();

  const newExpectedRate = (
    requestData: (typeof requestDatasBefore)[number],
  ) => {
    let rate =
      newRate === 'request-rate'
        ? requestData.tokenOutRate
        : newRate ?? currentRate;

    if (isAvgRate) {
      rate = expectedDepositHoldbackPartRateFromAvg(
        requestData.depositedUsdAmount,
        requestData.depositedInstantUsdAmount,
        requestData.tokenOutRate,
        rate,
      );
    }
    return BigNumber.from(rate);
  };

  const expectedMintAmounts = requestDatasBefore.map((requestData, i) =>
    requestData.depositedUsdAmount
      .sub(requestData.depositedUsdAmount.mul(feePercents[i]).div(10000))
      .mul(constants.WeiPerEther)
      .div(newExpectedRate(requestData)),
  );

  const groupedDataBefore = requests.map(({ id, expectedToExecute }, index) => {
    return {
      id,
      expectedToExecute: expectedToExecute ?? true,
      request: requestDatasBefore[index],
      feePercent: feePercents[index],
      expectedMintAmount: expectedMintAmounts[index],
      balance: balancesBefore[index],
      totalDeposited: totalDepositedsBefore[index],
    };
  });

  const txReceipt = await (await txPromise).wait();

  const parsedLogs = txReceipt.logs
    .filter((v) => v.address === depositVault.address)
    .map((log) => depositVault.interface.parseLog(log))
    .filter((v) => v.name === 'ApproveRequestV2')
    .map((v) => v.args);

  const requestDatasAfter = await Promise.all(
    requestIds.map((requestId) => depositVault.mintRequests(requestId)),
  );

  const balancesAfter = await Promise.all(
    requestDatasAfter.map(({ sender }) => balanceOfBase18(mTBILL, sender)),
  );

  const totalDepositedsAfter = await Promise.all(
    requestDatasAfter.map(({ sender }) => depositVault.totalMinted(sender)),
  );

  const groupedDataAfter = requests.map(({ id }, index) => {
    return {
      id,
      request: requestDatasAfter[index],
      balance: balancesAfter[index],
      totalDeposited: totalDepositedsAfter[index],
    };
  });

  for (const [
    i,
    { id, expectedToExecute, ...dataBefore },
  ] of groupedDataBefore.entries()) {
    const dataAfter = groupedDataAfter[i];

    const requestDataBefore = dataBefore.request;
    const requestDataAfter = dataAfter.request;

    const balanceAfter = dataAfter.balance;
    const balanceBefore = dataBefore.balance;

    const totalDepositedAfter = dataAfter.totalDeposited;
    const totalDepositedBefore = dataBefore.totalDeposited;

    expect(requestDataAfter.depositedInstantUsdAmount).eq(
      requestDataBefore.depositedInstantUsdAmount,
    );
    expect(requestDataAfter.sender).eq(requestDataBefore.sender);
    expect(requestDataAfter.tokenIn).eq(requestDataBefore.tokenIn);
    expect(requestDataAfter.depositedUsdAmount).eq(
      requestDataBefore.depositedUsdAmount,
    );
    expect(requestDataAfter.tokenOutRate).eq(requestDataBefore.tokenOutRate);

    const logs = parsedLogs.filter((log) => log.requestId.eq(id));

    const expectedMintedAggregatedByUser = groupedDataBefore
      .filter(
        (v) =>
          v.request.sender === requestDataBefore.sender && v.expectedToExecute,
      )
      .reduce((prev, curr) => {
        return prev.add(curr.expectedMintAmount);
      }, BigNumber.from(0));

    if (!expectedToExecute) {
      expect(logs.length).eq(0);
      expect(requestDataAfter.status).eq(0);
      expect(requestDataAfter.approvedTokenOutRate).eq(0);
    } else {
      expect(logs.length).eq(1);

      expect(requestDataAfter.status).eq(1);
      expect(totalDepositedAfter).eq(
        totalDepositedBefore.add(expectedMintedAggregatedByUser),
      );
      expect(requestDataAfter.approvedTokenOutRate).eq(
        newExpectedRate(requestDataBefore),
      );
      const log = logs[0];

      expect(log.newOutRate).eq(newExpectedRate(requestDataBefore));
      expect(log.requestId).eq(id);
    }
    expect(totalDepositedAfter).eq(
      totalDepositedBefore.add(expectedMintedAggregatedByUser),
    );

    expect(balanceAfter).eq(balanceBefore.add(expectedMintedAggregatedByUser));
  }
};

export const rejectRequestTest = async (
  { depositVault, owner, mTBILL }: CommonParamsDeposit,
  requestId: BigNumberish,
  opt?: OptionalCommonParams,
) => {
  const sender = opt?.from ?? owner;

  if (
    await handleRevert(
      depositVault.connect(sender).rejectRequest.bind(this, requestId),
      depositVault,
      opt,
    )
  ) {
    return;
  }
  const balanceMtBillBeforeUser = await balanceOfBase18(mTBILL, sender.address);

  const totalDepositedBefore = await depositVault.totalMinted(sender.address);

  const requestData = await depositVault.mintRequests(requestId);

  await expect(depositVault.connect(sender).rejectRequest(requestId))
    .to.emit(
      depositVault,
      depositVault.interface.events['RejectRequest(uint256,address)'].name,
    )
    .withArgs(requestId, requestData.sender).to.not.reverted;

  const requestDataAfter = await depositVault.mintRequests(requestId);

  const totalDepositedAfter = await depositVault.totalMinted(sender.address);

  const balanceMtBillAfterUser = await balanceOfBase18(mTBILL, sender.address);

  expect(balanceMtBillAfterUser).eq(balanceMtBillBeforeUser);
  expect(totalDepositedAfter).eq(totalDepositedBefore);
  expect(requestDataAfter.sender).eq(requestData.sender);
  expect(requestDataAfter.tokenIn).eq(requestData.tokenIn);
  expect(requestDataAfter.tokenOutRate).eq(requestData.tokenOutRate);
  expect(requestDataAfter.depositedUsdAmount).eq(
    requestData.depositedUsdAmount,
  );
  expect(requestDataAfter.status).eq(2);
};

export const setMaxSupplyCapTest = async (
  {
    depositVault,
    owner,
  }: {
    depositVault: DepositVault | DepositVaultTest;
    owner: SignerWithAddress;
  },
  valueN: number,
  opt?: OptionalCommonParams,
) => {
  const value = parseUnits(valueN.toString());

  if (
    await handleRevert(
      depositVault
        .connect(opt?.from ?? owner)
        .setMaxSupplyCap.bind(this, value),
      depositVault,
      opt,
    )
  ) {
    return;
  }

  await expect(
    depositVault.connect(opt?.from ?? owner).setMaxSupplyCap(value),
  ).to.emit(
    depositVault,
    depositVault.interface.events['SetMaxSupplyCap(address,uint256)'].name,
  ).to.not.reverted;

  const newMax = await depositVault.maxSupplyCap();
  expect(newMax).eq(value);
};

export const getFeePercent = async (
  sender: string,
  token: string,
  depositVault:
    | DepositVault
    | DepositVaultTest
    | DepositVaultWithAaveTest
    | DepositVaultWithMorphoTest
    | DepositVaultWithMTokenTest
    | DepositVaultWithUSTBTest,
  isInstant: boolean,
) => {
  const tokenConfig = await depositVault.tokensConfig(token);
  let feePercent = constants.Zero;
  const isWaived = await depositVault.waivedFeeRestriction(sender);
  if (!isWaived) {
    feePercent = tokenConfig.fee;
    if (isInstant) {
      const instantFee = await depositVault.instantFee();
      feePercent = feePercent.add(instantFee);
    }
  }
  return feePercent;
};

export const calcExpectedMintAmount = async (
  sender: SignerWithAddress,
  token: string,
  depositVault:
    | DepositVault
    | DepositVaultTest
    | DepositVaultWithAaveTest
    | DepositVaultWithMorphoTest
    | DepositVaultWithMTokenTest
    | DepositVaultWithUSTBTest,
  mTokenRate: BigNumber,
  amountIn: BigNumber,
  isInstant: boolean,
) => {
  const tokenConfig = await depositVault.tokensConfig(token);

  const dataFeedContract = DataFeedTest__factory.connect(
    tokenConfig.dataFeed,
    sender,
  );
  const currentTokenIn = tokenConfig.stable
    ? constants.WeiPerEther
    : await dataFeedContract.getDataInBase18();
  if (currentTokenIn.isZero())
    return {
      mintAmount: constants.Zero,
      amountInWithoutFee: constants.Zero,
      actualAmountInUsd: constants.Zero,
      fee: constants.Zero,
    };

  const feePercent = await getFeePercent(
    sender.address,
    token,
    depositVault,
    isInstant,
  );

  const hundredPercent = await depositVault.ONE_HUNDRED_PERCENT();
  const fee = amountIn.mul(feePercent).div(hundredPercent);

  const amountInWithoutFee = amountIn.sub(fee);

  const feeInUsd = fee.mul(currentTokenIn).div(constants.WeiPerEther);

  const actualAmountInUsd = amountIn
    .mul(currentTokenIn)
    .div(constants.WeiPerEther);

  const usdForMintConvertion = actualAmountInUsd.sub(feeInUsd);

  return {
    mintAmount: usdForMintConvertion.mul(constants.WeiPerEther).div(mTokenRate),
    actualAmountInUsd,
    amountInWithoutFee,
    fee,
  };
};
