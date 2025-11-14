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
  DepositVault,
  DepositVaultTest,
  DepositVaultWithUSTBTest,
  ERC20,
  ERC20__factory,
  MToken,
} from '../../typechain-types';

type CommonParamsDeposit = {
  depositVault: DepositVault | DepositVaultTest | DepositVaultWithUSTBTest;
  mTBILL: MToken;
} & Pick<
  Awaited<ReturnType<typeof defaultDeploy>>,
  'owner' | 'mTokenToUsdDataFeed'
>;

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
  }: CommonParamsDeposit & {
    waivedFee?: boolean;
    minAmount?: BigNumberish;
    customRecipient?: AccountOrContract;
    checkTokensReceiver?: boolean;
    expectedMintAmount?: BigNumberish;
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

  const callFn = withRecipient
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
        );

  if (opt?.revertMessage) {
    await expect(callFn()).revertedWith(opt?.revertMessage);
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

  await expect(callFn())
    .to.emit(
      depositVault,
      depositVault.interface.events[
        withRecipient
          ? 'DepositInstantWithCustomRecipient(address,address,address,uint256,uint256,uint256,uint256,bytes32)'
          : 'DepositInstant(address,address,uint256,uint256,uint256,uint256,bytes32)'
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

  expect(balanceMtBillAfterUser.sub(balanceMtBillBeforeUser)).eq(
    expectedMinted,
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
  expect(balanceAfterUser).eq(balanceBeforeUser.sub(amountIn));
  expect(maxSupplyCapAfter).eq(maxSupplyCapBefore);
};

export const depositRequestTest = async (
  {
    depositVault,
    owner,
    mTokenToUsdDataFeed,
    waivedFee,
    customRecipient,
  }: CommonParamsDeposit & {
    waivedFee?: boolean;
    customRecipient?: AccountOrContract;
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

  const callFn = withRecipient
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

  if (opt?.revertMessage) {
    await expect(callFn()).revertedWith(opt?.revertMessage);
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

  const { fee, mintAmount, amountInWithoutFee, actualAmountInUsd } =
    await calcExpectedMintAmount(
      sender,
      tokenIn,
      depositVault,
      mTokenRate,
      amountIn,
      false,
    );

  await expect(callFn())
    .to.emit(
      depositVault,
      depositVault.interface.events[
        withRecipient
          ? 'DepositRequestWithCustomRecipient(uint256,address,address,address,uint256,uint256,uint256,uint256,bytes32)'
          : 'DepositRequest(uint256,address,address,uint256,uint256,uint256,uint256,bytes32)'
      ].name,
    )
    .withArgs(
      ...[
        latestRequestIdBefore.add(1),
        sender.address,
        tokenContract.address,
        withRecipient ? recipient : undefined,
        amountIn,
        actualAmountInUsd,
        fee,
        mintAmount,
        constants.HashZero,
      ].filter((v) => v !== undefined),
    ).to.not.reverted;

  const latestRequestIdAfter = await depositVault.currentRequestId();
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

  expect(request.depositedUsdAmount).eq(actualAmountInUsd);
  expect(request.tokenOutRate).eq(mTokenRate);
  expect(request.sender).eq(recipient);
  expect(request.status).eq(0);
  expect(request.tokenIn).eq(tokenContract.address);

  expect(latestRequestIdAfter).eq(latestRequestIdBefore.add(1));
  expect(balanceAfterContract).eq(
    balanceBeforeContract.add(amountInWithoutFee),
  );
  expect(feeReceiverBalanceAfterContract).eq(
    feeReceiverBalanceBeforeContract.add(fee),
  );
  if (waivedFee) {
    expect(feeReceiverBalanceAfterContract).eq(
      feeReceiverBalanceBeforeContract,
    );
  }
  expect(balanceAfterUser).eq(balanceBeforeUser.sub(amountIn));

  expect(maxSupplyCapAfter).eq(maxSupplyCapBefore);

  return {
    requestId: latestRequestIdBefore,
    rate: mTokenRate,
  };
};

export const approveRequestTest = async (
  { depositVault, owner, mTBILL }: CommonParamsDeposit,
  requestId: BigNumberish,
  newRate: BigNumberish,
  opt?: OptionalCommonParams,
) => {
  const sender = opt?.from ?? owner;

  if (opt?.revertMessage) {
    await expect(
      depositVault.connect(sender).approveRequest(requestId, newRate),
    ).revertedWith(opt?.revertMessage);
    return;
  }
  const balanceMtBillBeforeUser = await balanceOfBase18(mTBILL, sender.address);

  const totalDepositedBefore = await depositVault.totalMinted(sender.address);

  const requestData = await depositVault.mintRequests(requestId);

  const feePercent = await getFeePercent(
    requestData.sender,
    requestData.tokenIn,
    depositVault,
    false,
  );

  const expectedMintAmount = requestData.depositedUsdAmount
    .sub(requestData.depositedUsdAmount.mul(feePercent).div(10000))
    .mul(constants.WeiPerEther)
    .div(newRate);

  await expect(depositVault.connect(sender).approveRequest(requestId, newRate))
    .to.emit(
      depositVault,
      depositVault.interface.events['ApproveRequest(uint256,uint256)'].name,
    )
    .withArgs(requestId, newRate).to.not.reverted;

  const requestDataAfter = await depositVault.mintRequests(requestId);

  const totalDepositedAfter = await depositVault.totalMinted(sender.address);

  const balanceMtBillAfterUser = await balanceOfBase18(mTBILL, sender.address);

  expect(balanceMtBillAfterUser.sub(balanceMtBillBeforeUser)).eq(
    expectedMintAmount,
  );
  expect(totalDepositedAfter).eq(totalDepositedBefore.add(expectedMintAmount));
  expect(requestDataAfter.sender).eq(requestData.sender);
  expect(requestDataAfter.tokenIn).eq(requestData.tokenIn);
  expect(requestDataAfter.tokenOutRate).eq(newRate);
  expect(requestDataAfter.depositedUsdAmount).eq(
    requestData.depositedUsdAmount,
  );
  expect(requestDataAfter.status).eq(1);
};

export const safeApproveRequestTest = async (
  { depositVault, owner, mTBILL }: CommonParamsDeposit,
  requestId: BigNumberish,
  newRate: BigNumberish,
  opt?: OptionalCommonParams,
) => {
  const sender = opt?.from ?? owner;

  if (opt?.revertMessage) {
    await expect(
      depositVault.connect(sender).safeApproveRequest(requestId, newRate),
    ).revertedWith(opt?.revertMessage);
    return;
  }
  const requestData = await depositVault.mintRequests(requestId);

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
    .div(newRate);

  await expect(
    depositVault.connect(sender).safeApproveRequest(requestId, newRate),
  )
    .to.emit(
      depositVault,
      depositVault.interface.events['SafeApproveRequest(uint256,uint256)'].name,
    )
    .withArgs(requestId, newRate).to.not.reverted;

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
  expect(requestDataAfter.tokenOutRate).eq(newRate);
  expect(requestDataAfter.depositedUsdAmount).eq(
    requestData.depositedUsdAmount,
  );
  expect(requestDataAfter.status).eq(1);
};

export const safeBulkApproveRequestTest = async (
  { depositVault, owner, mTBILL, mTokenToUsdDataFeed }: CommonParamsDeposit,
  requests: { id: BigNumberish; expectedToExecute?: boolean }[],
  newRate?: BigNumberish | 'request-rate',
  opt?: OptionalCommonParams,
) => {
  const sender = opt?.from ?? owner;

  const requestIds = requests.map(({ id }) => id);

  const callFn =
    newRate && newRate !== 'request-rate'
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

  if (opt?.revertMessage) {
    await expect(callFn()).revertedWith(opt?.revertMessage);
    return;
  }

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
  const newExpectedRate =
    newRate === 'request-rate' ? undefined : newRate ?? currentRate;

  const expectedMintAmounts = requestDatasBefore.map((requestData, i) =>
    requestData.depositedUsdAmount
      .sub(requestData.depositedUsdAmount.mul(feePercents[i]).div(10000))
      .mul(constants.WeiPerEther)
      .div(newExpectedRate ?? requestData.tokenOutRate),
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
    .filter((v) => v.name === 'SafeApproveRequest')
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

    expect(requestDataAfter.sender).eq(requestDataBefore.sender);
    expect(requestDataAfter.tokenIn).eq(requestDataBefore.tokenIn);
    expect(requestDataAfter.depositedUsdAmount).eq(
      requestDataBefore.depositedUsdAmount,
    );

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
      expect(requestDataAfter.tokenOutRate).eq(requestDataBefore.tokenOutRate);
      expect(requestDataAfter.status).eq(0);
    } else {
      expect(logs.length).eq(1);
      expect(requestDataAfter.tokenOutRate).eq(
        newExpectedRate ?? requestDataBefore.tokenOutRate,
      );
      expect(requestDataAfter.status).eq(1);
      expect(totalDepositedAfter).eq(
        totalDepositedBefore.add(expectedMintedAggregatedByUser),
      );
      const log = logs[0];

      expect(log.newOutRate).eq(
        newExpectedRate ?? requestDataBefore.tokenOutRate,
      );
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

  if (opt?.revertMessage) {
    await expect(
      depositVault.connect(sender).rejectRequest(requestId),
    ).revertedWith(opt?.revertMessage);
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

  if (opt?.revertMessage) {
    await expect(
      depositVault.connect(opt?.from ?? owner).setMaxSupplyCap(value),
    ).revertedWith(opt?.revertMessage);
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
  depositVault: DepositVault | DepositVaultTest | DepositVaultWithUSTBTest,
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
  depositVault: DepositVault | DepositVaultTest | DepositVaultWithUSTBTest,
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
