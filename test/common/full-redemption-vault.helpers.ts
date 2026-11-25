import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { expect } from 'chai';
import {
  BigNumber,
  BigNumberish,
  constants,
  ContractTransaction,
} from 'ethers';
import { parseUnits } from 'ethers/lib/utils';
import { ethers } from 'hardhat';

import {
  AccountOrContract,
  OptionalCommonParams,
  amountFromBase18,
  approveBase18,
  balanceOfBase18,
  getAccount,
  handleRevert,
  mintToken,
} from './common.helpers';
import { defaultDeploy } from './fixtures';
import { addPaymentTokenTest } from './manageable-vault.helpers';
import { truncateToTokenDecimals } from './redemption-vault.helpers';

import {
  AggregatorV3Mock__factory,
  DataFeedTest__factory,
  ERC20,
  ERC20__factory,
  FullRedemptionVaultTest,
  FullRedemptionVaultTest__factory,
  IDataFeed__factory,
  RedemptionVault__factory,
} from '../../typechain-types';

export const FrvStatus = {
  Submitted: 0,
  ReadyToRedeem: 1,
  PartiallyRedeemed: 2,
  Completed: 3,
  Reallocated: 4,
  Cancelled: 5,
} as const;

const FINAL_STATUSES: number[] = [
  FrvStatus.Completed,
  FrvStatus.Reallocated,
  FrvStatus.Cancelled,
];

const ONE = parseUnits('1');
const ONE_HUNDRED_PERCENT = 10_000;

/**
 * These numbers are for the tests only.
 * Product has not given the real values.
 */
export const FRV_TEST_SETTINGS = {
  depositPercentageBps: 200,
  serviceFeeAmount: parseUnits('4000'),
  claimPeriod: 30 * 24 * 3600,
  rateToleranceBps: 500,
  maxRateAdjustmentBps: 100,
};

type FrvCommonParams = {
  fullRedemptionVault: FullRedemptionVaultTest;
  owner: SignerWithAddress;
};

type Token = ERC20 | string;

type FrvRequest = Awaited<ReturnType<FullRedemptionVaultTest['getRequest']>>;

/**
 * `defaultDeploy` plus an FRV that is linked to `redemptionVault`.
 *
 * Payment tokens of the linked RV:
 * - usdc: 8 decimals, stable, no token fee, feed `dataFeed`
 * - dai: 9 decimals, stable, token fee 1%, its own feed `daiDataFeed`
 * - usdc6: 6 decimals, stable, no token fee, feed `dataFeed`
 * - wbtc: not stable
 *
 * `regularAccounts[0]` and `regularAccounts[1]` have mTokens and stable tokens,
 * and have approved FRV for all of them.
 */
export const fullRedemptionVaultFixture = async () => {
  const fixture = await defaultDeploy();
  const {
    owner,
    accessControl,
    mockedSanctionsList,
    redemptionVault,
    mTBILL,
    stableCoins,
    otherCoins,
    dataFeed,
    regularAccounts,
  } = fixture;

  const serviceFeeReceiver = regularAccounts[regularAccounts.length - 1];

  const fullRedemptionVault = await new FullRedemptionVaultTest__factory(
    owner,
  ).deploy();

  await fullRedemptionVault.initialize({
    ac: accessControl.address,
    sanctionsList: mockedSanctionsList.address,
    redemptionVault: redemptionVault.address,
    serviceFeeReceiver: serviceFeeReceiver.address,
    ...FRV_TEST_SETTINGS,
  });

  await accessControl['grantRole(bytes32,address)'](
    await fullRedemptionVault.contractAdminRole(),
    owner.address,
  );
  await accessControl['grantRole(bytes32,address)'](
    await mTBILL.burnerRole(),
    fullRedemptionVault.address,
  );

  const daiAggregator = await new AggregatorV3Mock__factory(owner).deploy();
  const daiAggregatorDecimals = await daiAggregator.decimals();
  await daiAggregator.setRoundData(parseUnits('1', daiAggregatorDecimals));

  const daiDataFeed = await new DataFeedTest__factory(owner).deploy();
  await daiDataFeed.initialize(
    accessControl.address,
    daiAggregator.address,
    3 * 24 * 3600,
    parseUnits('0.99', daiAggregatorDecimals),
    parseUnits('1.01', daiAggregatorDecimals),
    constants.AddressZero,
  );

  const rvParams = { vault: redemptionVault, owner };
  await addPaymentTokenTest(
    rvParams,
    stableCoins.usdc,
    dataFeed.address,
    0,
    true,
  );
  await addPaymentTokenTest(
    rvParams,
    stableCoins.dai,
    daiDataFeed.address,
    100,
    true,
  );
  await addPaymentTokenTest(
    rvParams,
    stableCoins.usdc6,
    dataFeed.address,
    0,
    true,
  );
  await addPaymentTokenTest(
    rvParams,
    otherCoins.wbtc,
    dataFeed.address,
    0,
    false,
  );

  const [user, otherUser] = regularAccounts;

  for (const account of [user, otherUser]) {
    await mintToken(mTBILL, account, 1_000_000);
    await approveBase18(account, mTBILL, fullRedemptionVault, 1_000_000);

    for (const token of [
      stableCoins.usdc,
      stableCoins.dai,
      stableCoins.usdc6,
    ]) {
      await mintToken(token, account, 1_000_000);
      await approveBase18(account, token, fullRedemptionVault, 1_000_000);
    }
  }

  return {
    ...fixture,
    fullRedemptionVault,
    serviceFeeReceiver,
    daiAggregator,
    daiDataFeed,
    user,
    otherUser,
  };
};

const linkedRedemptionVault = async (frv: FullRedemptionVaultTest) =>
  RedemptionVault__factory.connect(
    await frv.redemptionVault(),
    ethers.provider,
  );

const currentMTokenRate = async (frv: FullRedemptionVaultTest) =>
  IDataFeed__factory.connect(
    await (await linkedRedemptionVault(frv)).mTokenDataFeed(),
    ethers.provider,
  ).getDataInBase18();

const tokenDecimals = (token: string) =>
  ERC20__factory.connect(token, ethers.provider).decimals();

/**
 * `reserved` of a request at a given rate: mTokens to pay for x rate,
 * minus the token fee, rounded down to the decimals of the payment token.
 * mTokens to pay for = `remaining`, plus `depositLeft` for a deposit in mTokens
 */
const calcReserved = async (
  frv: FullRedemptionVaultTest,
  request: FrvRequest,
  rate: BigNumberish,
) => {
  const mTokensToPayFor =
    request.depositAsset === (await frv.mToken())
      ? request.remaining.add(request.depositLeft)
      : request.remaining;

  return truncateToTokenDecimals(
    mTokensToPayFor
      .mul(rate)
      .mul(BigNumber.from(ONE_HUNDRED_PERCENT).sub(request.feePercent))
      .div(ONE.mul(ONE_HUNDRED_PERCENT)),
    await tokenDecimals(request.paymentToken),
  );
};

/**
 * Reads balances now. The returned function reads them again and checks that
 * each balance changed by exactly the sum of its expected deltas. A balance
 * with no expected delta must not change.
 */
const trackBalances = async (tokens: string[], accounts: string[]) => {
  const read = async () => {
    const balances: Record<string, BigNumber> = {};

    for (const token of new Set(tokens)) {
      for (const account of new Set(accounts)) {
        balances[`${token}:${account}`] = await balanceOfBase18(token, account);
      }
    }

    return balances;
  };

  const before = await read();

  return async (
    deltas: [token: string, account: string, delta: BigNumber][],
  ) => {
    const after = await read();
    const expected: Record<string, BigNumber> = {};

    for (const [token, account, delta] of deltas) {
      const key = `${token}:${account}`;
      expected[key] = (expected[key] ?? constants.Zero).add(delta);
    }

    for (const key of Object.keys(before)) {
      expect(after[key].sub(before[key]), `balance change of ${key}`).eq(
        expected[key] ?? constants.Zero,
      );
    }
  };
};

/**
 * Checks the invariants that are a function of the contract state only.
 * Every helper below calls it after its transaction.
 *
 * - for every token, the balance of FRV is at least `held[token]`
 * - for every token, `held[token]` is the sum of `reserved`,
 *   `depositLeft` and `serviceFee` of all requests that are not final
 * - a request in a final status holds nothing
 */
export const checkFrvInvariants = async (frv: FullRedemptionVaultTest) => {
  const requestsCount = (await frv.currentRequestId()).toNumber();
  const expectedHeld: Record<string, BigNumber> = {};

  const add = (token: string, amount: BigNumber) => {
    expectedHeld[token] = (expectedHeld[token] ?? constants.Zero).add(amount);
  };

  for (let id = 0; id < requestsCount; id++) {
    const request = await frv.getRequest(id);

    add(request.paymentToken, constants.Zero);
    add(request.depositAsset, constants.Zero);

    if (FINAL_STATUSES.includes(request.status)) {
      expect(request.reserved, `reserved of final request ${id}`).eq(0);
      expect(request.depositLeft, `depositLeft of final request ${id}`).eq(0);
      expect(request.serviceFee, `serviceFee of final request ${id}`).eq(0);
      continue;
    }

    add(request.paymentToken, request.reserved);
    add(request.depositAsset, request.depositLeft.add(request.serviceFee));
  }

  for (const [token, expected] of Object.entries(expectedHeld)) {
    const held = await frv.held(token);

    expect(held, `held of ${token} is not the sum over the requests`).eq(
      expected,
    );
    expect(
      (await balanceOfBase18(token, frv.address)).gte(held),
      `balance of ${token} is less than held`,
    ).eq(true);
  }
};

/**
 * @param amountMToken mTokens to redeem, 18 decimals
 * @returns the id of the new request, or undefined if a revert was expected
 */
export const createFullRedemptionRequestTest = async (
  { fullRedemptionVault: frv, owner }: FrvCommonParams,
  paymentToken: Token,
  depositAsset: Token,
  amountMToken: BigNumberish,
  opt?: OptionalCommonParams & { maxPayAmount?: BigNumberish },
) => {
  const sender = opt?.from ?? owner;
  const paymentTokenAddr = getAccount(paymentToken);
  const depositAssetAddr = getAccount(depositAsset);
  const maxPayAmount = opt?.maxPayAmount ?? constants.MaxUint256;
  amountMToken = BigNumber.from(amountMToken);

  const call = () =>
    frv
      .connect(sender)
      .createRequest(
        paymentTokenAddr,
        depositAssetAddr,
        amountMToken,
        maxPayAmount,
      );

  if (await handleRevert(call, frv, opt)) {
    return;
  }

  const rv = await linkedRedemptionVault(frv);
  const mTokenRate = await currentMTokenRate(frv);
  const depositInMToken = depositAssetAddr === (await frv.mToken());
  const depositPercentageBps = await frv.depositPercentageBps();
  const serviceFeeAmount = await frv.serviceFeeAmount();

  let expectedDeposit: BigNumber;
  let expectedServiceFee: BigNumber;

  if (depositInMToken) {
    // a share of the requested mTokens. No rate is needed
    expectedDeposit = amountMToken
      .mul(depositPercentageBps)
      .div(ONE_HUNDRED_PERCENT);
    // the service fee is in USD and is converted at the mToken rate
    expectedServiceFee = serviceFeeAmount.mul(ONE).div(mTokenRate);
  } else {
    const depositDecimals = await tokenDecimals(depositAssetAddr);

    expectedDeposit = truncateToTokenDecimals(
      amountMToken
        .mul(mTokenRate)
        .mul(depositPercentageBps)
        .div(ONE.mul(ONE_HUNDRED_PERCENT)),
      depositDecimals,
    );
    expectedServiceFee = truncateToTokenDecimals(
      serviceFeeAmount,
      depositDecimals,
    );
  }

  const expectedFeePercent = (await rv.waivedFeeRestriction(sender.address))
    ? constants.Zero
    : (await rv.tokensConfig(paymentTokenAddr)).fee;
  const expectedPaid = expectedDeposit.add(expectedServiceFee);

  const requestId = await frv.currentRequestId();

  expect(
    await frv
      .connect(sender)
      .callStatic.createRequest(
        paymentTokenAddr,
        depositAssetAddr,
        amountMToken,
        maxPayAmount,
      ),
  ).eq(requestId);

  const expectBalanceChanges = await trackBalances(
    [paymentTokenAddr, depositAssetAddr],
    [sender.address, frv.address],
  );

  await expect(call())
    .to.emit(frv, 'RequestCreated')
    .withArgs(
      requestId,
      sender.address,
      paymentTokenAddr,
      depositAssetAddr,
      amountMToken,
      expectedDeposit,
      expectedServiceFee,
      expectedFeePercent,
      mTokenRate,
    );

  await expectBalanceChanges([
    [depositAssetAddr, sender.address, expectedPaid.mul(-1)],
    [depositAssetAddr, frv.address, expectedPaid],
  ]);

  const request = await frv.getRequest(requestId);

  expect(request.wallet).eq(sender.address);
  expect(request.paymentToken).eq(paymentTokenAddr);
  expect(request.depositAsset).eq(depositAssetAddr);
  expect(request.status).eq(FrvStatus.Submitted);
  expect(request.paused).eq(false);
  expect(request.requested).eq(amountMToken);
  expect(request.remaining).eq(amountMToken);
  expect(request.depositLeft).eq(expectedDeposit);
  expect(request.serviceFee).eq(expectedServiceFee);
  expect(request.feePercent).eq(expectedFeePercent);
  expect(request.savedRate).eq(mTokenRate);
  expect(request.processedRate).eq(0);
  expect(request.rate).eq(0);
  expect(request.reserved).eq(0);
  expect(request.deadline).eq(0);

  expect(await frv.currentRequestId()).eq(requestId.add(1));

  await checkFrvInvariants(frv);

  return requestId;
};

/**
 * Sends one processing transaction and checks every request in it
 */
const processTest = async (
  frv: FullRedemptionVaultTest,
  requestIds: BigNumberish[],
  rates: BigNumberish[],
  send: () => Promise<ContractTransaction>,
) => {
  const before: FrvRequest[] = [];
  const expectedReserved: BigNumber[] = [];
  const reservedByToken: Record<string, BigNumber> = {};
  const freeLiquidityBefore: Record<string, BigNumber> = {};

  for (let i = 0; i < requestIds.length; i++) {
    const request = await frv.getRequest(requestIds[i]);
    const reserved = await calcReserved(frv, request, rates[i]);
    const token = request.paymentToken;

    before.push(request);
    expectedReserved.push(reserved);
    reservedByToken[token] = (reservedByToken[token] ?? constants.Zero).add(
      reserved,
    );
    freeLiquidityBefore[token] = await frv.freeLiquidity(token);
  }

  // processing moves no tokens
  const expectBalanceChanges = await trackBalances(
    before.flatMap((request) => [request.paymentToken, request.depositAsset]),
    [frv.address, ...before.map((request) => request.wallet)],
  );

  const tx = await send();
  const { timestamp } = await ethers.provider.getBlock(
    (
      await tx.wait()
    ).blockNumber,
  );
  const expectedDeadline = (await frv.claimPeriod()).add(timestamp);

  await expectBalanceChanges([]);

  for (let i = 0; i < requestIds.length; i++) {
    await expect(tx)
      .to.emit(frv, 'RequestProcessed')
      .withArgs(requestIds[i], rates[i], expectedReserved[i], expectedDeadline);

    const after = await frv.getRequest(requestIds[i]);

    expect(after.status).eq(FrvStatus.ReadyToRedeem);
    expect(after.processedRate).eq(rates[i]);
    expect(after.rate).eq(rates[i]);
    expect(after.reserved).eq(expectedReserved[i]);
    expect(after.deadline).eq(expectedDeadline);
    expect(after.remaining).eq(before[i].remaining);
    expect(after.depositLeft).eq(before[i].depositLeft);
    expect(after.serviceFee).eq(before[i].serviceFee);
    expect(after.paused).eq(before[i].paused);
  }

  for (const [token, reserved] of Object.entries(reservedByToken)) {
    expect(await frv.freeLiquidity(token)).eq(
      freeLiquidityBefore[token].sub(reserved),
    );
  }

  await checkFrvInvariants(frv);
};

/**
 * `processAtCustomRate`: one request, no tolerance check
 * @param rate mToken/USD rate, 18 decimals
 */
export const processFullRedemptionRequestTest = async (
  { fullRedemptionVault: frv, owner }: FrvCommonParams,
  requestId: BigNumberish,
  rate: BigNumberish,
  opt?: OptionalCommonParams,
) => {
  const sender = opt?.from ?? owner;

  const call = () => frv.connect(sender).processAtCustomRate(requestId, rate);

  if (await handleRevert(call, frv, opt)) {
    return;
  }

  await processTest(frv, [requestId], [rate], call);
};

/**
 * The three safe bulk functions
 * @param mode `saved`: the rate of each request at its creation.
 * `current`: the mToken rate of the data feed now. An array: one custom rate for each request
 */
export const safeProcessFullRedemptionRequestsTest = async (
  { fullRedemptionVault: frv, owner }: FrvCommonParams,
  requestIds: BigNumberish[],
  mode: 'saved' | 'current' | BigNumberish[],
  opt?: OptionalCommonParams,
) => {
  const vault = frv.connect(opt?.from ?? owner);

  const call = () =>
    mode === 'saved'
      ? vault.safeProcessAtSavedRateBulk(requestIds)
      : mode === 'current'
      ? vault.safeProcessAtCurrentRateBulk(requestIds)
      : vault.safeProcessAtCustomRateBulk(requestIds, mode);

  if (await handleRevert(call, frv, opt)) {
    return;
  }

  let rates: BigNumberish[];

  if (mode === 'saved') {
    rates = [];
    for (const id of requestIds) {
      rates.push((await frv.getRequest(id)).savedRate);
    }
  } else if (mode === 'current') {
    const rate = await currentMTokenRate(frv);
    rates = requestIds.map(() => rate);
  } else {
    rates = mode;
  }

  await processTest(frv, requestIds, rates, call);
};

/**
 * @param amountMToken mTokens to claim, 18 decimals
 * @returns payout and deposit share (18 decimals), or undefined if a revert was expected
 */
export const claimFullRedemptionTest = async (
  { fullRedemptionVault: frv, owner }: FrvCommonParams,
  requestId: BigNumberish,
  amountMToken: BigNumberish,
  opt?: OptionalCommonParams & {
    minReceiveAmount?: BigNumberish;
    recipient?: AccountOrContract;
  },
) => {
  const sender = opt?.from ?? owner;
  const minReceiveAmount = opt?.minReceiveAmount ?? 0;
  const customRecipient = opt?.recipient && getAccount(opt.recipient);
  const recipient = customRecipient ?? sender.address;
  amountMToken = BigNumber.from(amountMToken);

  const call = () =>
    customRecipient
      ? frv
          .connect(sender)
          ['claim(uint256,uint256,uint256,address)'](
            requestId,
            amountMToken,
            minReceiveAmount,
            customRecipient,
          )
      : frv
          .connect(sender)
          ['claim(uint256,uint256,uint256)'](
            requestId,
            amountMToken,
            minReceiveAmount,
          );

  if (await handleRevert(call, frv, opt)) {
    return;
  }

  const before = await frv.getRequest(requestId);
  const { paymentToken, depositAsset } = before;
  const mToken = ERC20__factory.connect(await frv.mToken(), ethers.provider);
  const depositInMToken = depositAsset === mToken.address;
  const serviceFeeReceiver = await frv.serviceFeeReceiver();

  const expectedPayout = truncateToTokenDecimals(
    before.reserved.mul(amountMToken).div(before.remaining),
    await tokenDecimals(paymentToken),
  );
  const expectedDepositShare = truncateToTokenDecimals(
    before.depositLeft.mul(amountMToken).div(before.remaining),
    await tokenDecimals(depositAsset),
  );
  const completes = amountMToken.eq(before.remaining);

  const vault = frv.connect(sender);
  const returned = await (customRecipient
    ? vault.callStatic['claim(uint256,uint256,uint256,address)'](
        requestId,
        amountMToken,
        minReceiveAmount,
        customRecipient,
      )
    : vault.callStatic['claim(uint256,uint256,uint256)'](
        requestId,
        amountMToken,
        minReceiveAmount,
      ));

  // the returned amount is in the decimals of the payment token,
  // as the amount that `redeemInstant` of the RV returns
  expect(returned).eq(
    await amountFromBase18(await tokenDecimals(paymentToken), expectedPayout),
  );

  const mTokenSupplyBefore = await mToken.totalSupply();
  const expectBalanceChanges = await trackBalances(
    [paymentToken, depositAsset, mToken.address],
    [sender.address, recipient, frv.address, serviceFeeReceiver],
  );

  const tx = await call();

  await expect(tx)
    .to.emit(frv, 'Redeemed')
    .withArgs(
      requestId,
      sender.address,
      recipient,
      amountMToken,
      expectedPayout,
    );
  await expect(tx)
    .to.emit(frv, 'DepositReturned')
    .withArgs(requestId, expectedDepositShare);

  if (completes) {
    await expect(tx).to.emit(frv, 'RequestCompleted').withArgs(requestId);
    await expect(tx)
      .to.emit(frv, 'ServiceFeeTransferred')
      .withArgs(requestId, serviceFeeReceiver, before.serviceFee);
  } else {
    await expect(tx).to.not.emit(frv, 'RequestCompleted');
    await expect(tx).to.not.emit(frv, 'ServiceFeeTransferred');
  }

  await expectBalanceChanges([
    // the mTokens always come from the wallet of the request
    [mToken.address, sender.address, amountMToken.mul(-1)],
    [paymentToken, recipient, expectedPayout],
    [paymentToken, frv.address, expectedPayout.mul(-1)],
    [depositAsset, frv.address, expectedDepositShare.mul(-1)],
    // a deposit in mTokens is burned. Its payment tokens are in the payout
    ...(depositInMToken
      ? []
      : ([[depositAsset, recipient, expectedDepositShare]] as [
          string,
          string,
          BigNumber,
        ][])),
    ...(completes
      ? ([
          [depositAsset, serviceFeeReceiver, before.serviceFee],
          [depositAsset, frv.address, before.serviceFee.mul(-1)],
        ] as [string, string, BigNumber][])
      : []),
  ]);

  expect(await mToken.totalSupply()).eq(
    mTokenSupplyBefore
      .sub(amountMToken)
      .sub(depositInMToken ? expectedDepositShare : 0),
  );

  const after = await frv.getRequest(requestId);

  // these three only go down in a claim
  expect(after.remaining).eq(before.remaining.sub(amountMToken));
  expect(after.reserved).eq(before.reserved.sub(expectedPayout));
  expect(after.depositLeft).eq(before.depositLeft.sub(expectedDepositShare));

  expect(after.rate).eq(before.rate);
  expect(after.processedRate).eq(before.processedRate);
  expect(after.deadline).eq(before.deadline);
  expect(after.requested).eq(before.requested);

  if (completes) {
    expect(after.status).eq(FrvStatus.Completed);
    expect(after.reserved).eq(0);
    expect(after.depositLeft).eq(0);
    expect(after.serviceFee).eq(0);
  } else {
    expect(after.status).eq(FrvStatus.PartiallyRedeemed);
    expect(after.serviceFee).eq(before.serviceFee);
  }

  await checkFrvInvariants(frv);

  return { payout: expectedPayout, depositShare: expectedDepositShare };
};

/**
 * @param newRate mToken/USD rate, 18 decimals
 */
export const adjustFullRedemptionRateTest = async (
  { fullRedemptionVault: frv, owner }: FrvCommonParams,
  requestId: BigNumberish,
  newRate: BigNumberish,
  opt?: OptionalCommonParams,
) => {
  const sender = opt?.from ?? owner;

  const call = () => frv.connect(sender).adjustRate(requestId, newRate);

  if (await handleRevert(call, frv, opt)) {
    return;
  }

  const before = await frv.getRequest(requestId);
  const expectedReserved = await calcReserved(frv, before, newRate);
  const freeLiquidityBefore = await frv.freeLiquidity(before.paymentToken);
  // a rate change moves no tokens
  const expectBalanceChanges = await trackBalances(
    [before.paymentToken, before.depositAsset],
    [frv.address, before.wallet],
  );

  await expect(call())
    .to.emit(frv, 'ExchangeRateAdjusted')
    .withArgs(requestId, newRate, expectedReserved);

  await expectBalanceChanges([]);

  const after = await frv.getRequest(requestId);

  expect(after.rate).eq(newRate);
  expect(after.reserved).eq(expectedReserved);
  // the limit of the next change is still measured from the rate set at processing
  expect(after.processedRate).eq(before.processedRate);
  expect(after.status).eq(before.status);
  expect(after.remaining).eq(before.remaining);
  expect(after.depositLeft).eq(before.depositLeft);
  expect(after.serviceFee).eq(before.serviceFee);
  expect(after.deadline).eq(before.deadline);

  // what the request needs more comes from free liquidity,
  // what it needs less becomes free liquidity
  expect(await frv.freeLiquidity(before.paymentToken)).eq(
    freeLiquidityBefore.add(before.reserved).sub(expectedReserved),
  );

  await checkFrvInvariants(frv);
};

export const reallocateFullRedemptionTest = async (
  { fullRedemptionVault: frv, owner }: FrvCommonParams,
  requestId: BigNumberish,
  opt?: OptionalCommonParams,
) => {
  const sender = opt?.from ?? owner;

  const call = () => frv.connect(sender).reallocate(requestId);

  if (await handleRevert(call, frv, opt)) {
    return;
  }

  const before = await frv.getRequest(requestId);
  const { paymentToken, depositAsset } = before;
  const tokensReceiver = await (
    await linkedRedemptionVault(frv)
  ).tokensReceiver();
  const serviceFeeReceiver = await frv.serviceFeeReceiver();

  // the wallet of the request must get nothing
  const expectBalanceChanges = await trackBalances(
    [paymentToken, depositAsset],
    [frv.address, tokensReceiver, serviceFeeReceiver, before.wallet],
  );

  const tx = await call();

  await expect(tx)
    .to.emit(frv, 'DepositSeized')
    .withArgs(requestId, tokensReceiver, before.depositLeft);
  await expect(tx)
    .to.emit(frv, 'RequestReclaimed')
    .withArgs(requestId, tokensReceiver, before.reserved);
  await expect(tx)
    .to.emit(frv, 'ServiceFeeTransferred')
    .withArgs(requestId, serviceFeeReceiver, before.serviceFee);

  await expectBalanceChanges([
    [paymentToken, tokensReceiver, before.reserved],
    [paymentToken, frv.address, before.reserved.mul(-1)],
    [depositAsset, tokensReceiver, before.depositLeft],
    [depositAsset, frv.address, before.depositLeft.mul(-1)],
    [depositAsset, serviceFeeReceiver, before.serviceFee],
    [depositAsset, frv.address, before.serviceFee.mul(-1)],
  ]);

  const after = await frv.getRequest(requestId);

  expect(after.status).eq(FrvStatus.Reallocated);
  expect(after.reserved).eq(0);
  expect(after.depositLeft).eq(0);
  expect(after.serviceFee).eq(0);
  // what was claimed before stays on record
  expect(after.remaining).eq(before.remaining);
  expect(after.requested).eq(before.requested);

  await checkFrvInvariants(frv);
};

export const cancelFullRedemptionRequestTest = async (
  { fullRedemptionVault: frv, owner }: FrvCommonParams,
  requestId: BigNumberish,
  refundAddress: AccountOrContract,
  opt?: OptionalCommonParams,
) => {
  const sender = opt?.from ?? owner;
  const refundTo = getAccount(refundAddress);

  const call = () => frv.connect(sender).cancelRequest(requestId, refundTo);

  if (await handleRevert(call, frv, opt)) {
    return;
  }

  const before = await frv.getRequest(requestId);
  const { paymentToken, depositAsset } = before;
  const refund = before.depositLeft.add(before.serviceFee);

  // only the refund address gets tokens
  const expectBalanceChanges = await trackBalances(
    [paymentToken, depositAsset],
    [
      frv.address,
      refundTo,
      before.wallet,
      await frv.serviceFeeReceiver(),
      await (await linkedRedemptionVault(frv)).tokensReceiver(),
    ],
  );

  await expect(call())
    .to.emit(frv, 'RequestCancelled')
    .withArgs(requestId, refundTo, before.depositLeft, before.serviceFee);

  await expectBalanceChanges([
    [depositAsset, refundTo, refund],
    [depositAsset, frv.address, refund.mul(-1)],
  ]);

  const after = await frv.getRequest(requestId);

  expect(after.status).eq(FrvStatus.Cancelled);
  expect(after.depositLeft).eq(0);
  expect(after.serviceFee).eq(0);
  expect(after.reserved).eq(0);
  expect(after.remaining).eq(before.remaining);

  await checkFrvInvariants(frv);
};

const setRequestPausedTest = async (
  { fullRedemptionVault: frv, owner }: FrvCommonParams,
  requestId: BigNumberish,
  paused: boolean,
  opt?: OptionalCommonParams,
) => {
  const vault = frv.connect(opt?.from ?? owner);

  const call = () =>
    paused ? vault.pauseRequest(requestId) : vault.unpauseRequest(requestId);

  if (await handleRevert(call, frv, opt)) {
    return;
  }

  const before = await frv.getRequest(requestId);

  await expect(call())
    .to.emit(frv, paused ? 'RequestPaused' : 'RequestUnpaused')
    .withArgs(requestId);

  const after = await frv.getRequest(requestId);

  expect(after.paused).eq(paused);
  // a pause changes nothing else, also not the deadline
  expect(after.status).eq(before.status);
  expect(after.reserved).eq(before.reserved);
  expect(after.depositLeft).eq(before.depositLeft);
  expect(after.serviceFee).eq(before.serviceFee);
  expect(after.remaining).eq(before.remaining);
  expect(after.deadline).eq(before.deadline);

  await checkFrvInvariants(frv);
};

export const pauseFullRedemptionRequestTest = (
  params: FrvCommonParams,
  requestId: BigNumberish,
  opt?: OptionalCommonParams,
) => setRequestPausedTest(params, requestId, true, opt);

/**
 * A direct call. It works only when the unpause delay of the pause manager is "no delay"
 */
export const unpauseFullRedemptionRequestTest = (
  params: FrvCommonParams,
  requestId: BigNumberish,
  opt?: OptionalCommonParams,
) => setRequestPausedTest(params, requestId, false, opt);

/**
 * @param amount amount in the decimals of the token, as `withdrawToken` of the v2 vaults
 */
export const withdrawFullRedemptionTokenTest = async (
  { fullRedemptionVault: frv, owner }: FrvCommonParams,
  token: Token,
  amount: BigNumberish,
  opt?: OptionalCommonParams,
) => {
  const sender = opt?.from ?? owner;
  const tokenAddr = getAccount(token);

  const call = () => frv.connect(sender).withdrawToken(tokenAddr, amount);

  if (await handleRevert(call, frv, opt)) {
    return;
  }

  const tokenContract = ERC20__factory.connect(tokenAddr, ethers.provider);
  const tokensReceiver = await (
    await linkedRedemptionVault(frv)
  ).tokensReceiver();

  const balanceVaultBefore = await tokenContract.balanceOf(frv.address);
  const balanceReceiverBefore = await tokenContract.balanceOf(tokensReceiver);
  const heldBefore = await frv.held(tokenAddr);

  await expect(call())
    .to.emit(frv, 'WithdrawToken')
    .withArgs(tokenAddr, tokensReceiver, amount);

  expect(await tokenContract.balanceOf(frv.address)).eq(
    balanceVaultBefore.sub(amount),
  );
  expect(await tokenContract.balanceOf(tokensReceiver)).eq(
    balanceReceiverBefore.add(amount),
  );
  expect(await frv.held(tokenAddr)).eq(heldBefore);

  await checkFrvInvariants(frv);
};
