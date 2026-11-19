import { expect } from 'chai';
import { BigNumber, BigNumberish, constants } from 'ethers';
import { parseUnits } from 'ethers/lib/utils';

import {
  AccountOrContract,
  OptionalCommonParams,
  getAccount,
  shouldRevert,
} from './common.helpers';
import {
  depositInstantTest,
  depositRequestTest,
} from './deposit-vault.helpers';
import { defaultDeploy } from './fixtures';
import { usycSetterTest } from './usyc-common.helpers';

import {
  ERC20,
  ERC20__factory,
  IERC20Metadata,
  IUSYCTeller__factory,
} from '../../typechain-types';

type Fixture = Awaited<ReturnType<typeof defaultDeploy>>;

type CommonParamsUsycDv = {
  depositVaultWithUSYC: Fixture['depositVaultWithUSYC'];
  owner: Fixture['owner'];
};

export const setUsycDepositsEnabledTest = (
  { depositVaultWithUSYC, owner }: CommonParamsUsycDv,
  enabled: boolean,
  opt?: OptionalCommonParams,
) =>
  usycSetterTest(
    { vault: depositVaultWithUSYC, owner },
    'setUsycDepositsEnabled',
    'SetUsycDepositsEnabled',
    'usycDepositsEnabled',
    enabled,
    opt,
  );

export const setAutoInvestFallbackEnabledUsycTest = (
  { depositVaultWithUSYC, owner }: CommonParamsUsycDv,
  enabled: boolean,
  opt?: OptionalCommonParams,
) =>
  usycSetterTest(
    { vault: depositVaultWithUSYC, owner },
    'setAutoInvestFallbackEnabled',
    'SetAutoInvestFallbackEnabled',
    'autoInvestFallbackEnabled',
    enabled,
    opt,
  );

/**
 * Snapshot of balances touched by the USYC auto-invest flow
 */
const snapshotDv = async (
  depositVaultWithUSYC: Fixture['depositVaultWithUSYC'],
  tokenIn: string,
) => {
  const owner = depositVaultWithUSYC.signer;
  const teller = IUSYCTeller__factory.connect(
    await depositVaultWithUSYC.usycTeller(),
    owner,
  );
  const usdc = ERC20__factory.connect(await teller.asset(), owner);
  const usyc = ERC20__factory.connect(await teller.share(), owner);
  const tokenInContract = ERC20__factory.connect(tokenIn, owner);
  const tokensReceiver = await depositVaultWithUSYC.tokensReceiver();

  const [
    blockNumber,
    receiverUsyc,
    receiverUsdc,
    receiverTokenIn,
    vaultUsdc,
    vaultUsyc,
    vaultTokenIn,
    tellerUsdc,
    tokenInSupply,
    tellerAllowance,
  ] = await Promise.all([
    // `getBlockNumber` is cached by ethers and goes stale across fixture reverts
    depositVaultWithUSYC.provider.getBlock('latest').then((b) => b.number),
    usyc.balanceOf(tokensReceiver),
    usdc.balanceOf(tokensReceiver),
    tokenInContract.balanceOf(tokensReceiver),
    usdc.balanceOf(depositVaultWithUSYC.address),
    usyc.balanceOf(depositVaultWithUSYC.address),
    tokenInContract.balanceOf(depositVaultWithUSYC.address),
    usdc.balanceOf(teller.address),
    tokenInContract.totalSupply(),
    usdc.allowance(depositVaultWithUSYC.address, teller.address),
  ]);

  return {
    teller,
    usdc,
    usyc,
    tokensReceiver,
    blockNumber,
    receiverUsyc,
    receiverUsdc,
    receiverTokenIn,
    vaultUsdc,
    vaultUsyc,
    vaultTokenIn,
    tellerUsdc,
    tokenInSupply,
    tellerAllowance,
  };
};

/**
 * Same conversion as `depositInstantTest` / `depositRequestTest`, so that
 * amounts that are not exact doubles match what was actually deposited
 */
export const toDepositAmountBase18 = (amountUsdIn: number) =>
  parseUnits(amountUsdIn.toFixed(18).replace(/\.?0+$/, ''));

export type UsycDepositExpectation =
  /** USYC is minted to tokensReceiver */
  | 'invested'
  /** auto-invest failed, USDC fell back to tokensReceiver */
  | 'fallback'
  /** usyc deposits are disabled, tokenIn goes to tokensReceiver as is */
  | 'disabled';

const assertUsycDeposit = async (
  depositVaultWithUSYC: Fixture['depositVaultWithUSYC'],
  tokenIn: string,
  amountIn: BigNumber,
  before: Awaited<ReturnType<typeof snapshotDv>>,
  expectation: UsycDepositExpectation,
  expectedUsdcInvested?: BigNumberish,
) => {
  const after = await snapshotDv(depositVaultWithUSYC, tokenIn);
  const isUsdc = tokenIn === before.usdc.address;
  const decimals = await ERC20__factory.connect(
    tokenIn,
    depositVaultWithUSYC.signer,
  ).decimals();
  const amountInNative = amountIn.div(parseUnits('1', 18 - decimals));

  // vault never keeps any proceeds or approvals
  expect(after.vaultUsdc).eq(before.vaultUsdc);
  expect(after.vaultUsyc).eq(before.vaultUsyc);
  expect(after.vaultTokenIn).eq(before.vaultTokenIn);
  expect(after.tellerAllowance).eq(0);

  if (expectation === 'disabled') {
    expect(after.receiverTokenIn).eq(
      before.receiverTokenIn.add(amountInNative),
    );
    expect(after.receiverUsyc).eq(before.receiverUsyc);
    return;
  }

  // for mToken payment token, the whole amount is redeemed (burned)
  if (!isUsdc) {
    expect(after.tokenInSupply).eq(before.tokenInSupply.sub(amountIn));
    expect(after.receiverTokenIn).eq(before.receiverTokenIn);
  }

  if (expectation === 'invested') {
    const usdcInvested = after.tellerUsdc.sub(before.tellerUsdc);
    if (isUsdc) {
      expect(usdcInvested).eq(amountInNative);
    } else {
      expect(usdcInvested).gt(0);
    }
    if (expectedUsdcInvested !== undefined) {
      expect(usdcInvested).eq(expectedUsdcInvested);
    }

    // shares are priced at the state before the deposit: the deposit itself
    // adds to the daily volume the Teller free tier is computed from
    const [expectedShares] = await before.teller.previewDepositData(
      depositVaultWithUSYC.address,
      usdcInvested,
      { blockTag: before.blockNumber },
    );
    const usycReceived = after.receiverUsyc.sub(before.receiverUsyc);
    expect(usycReceived).eq(expectedShares);
    expect(usycReceived).gt(0);

    // USYC is minted by the Teller straight to tokensReceiver
    // and never passes through the vault
    const usycTransfers = await before.usyc.queryFilter(
      before.usyc.filters.Transfer(),
      before.blockNumber + 1,
    );
    expect(usycTransfers.length).gt(0);
    for (const { args } of usycTransfers) {
      expect(args.from).eq(constants.AddressZero);
      expect(args.to).eq(before.tokensReceiver);
    }
    expect(
      usycTransfers.reduce(
        (sum, { args }) => sum.add(args.value),
        constants.Zero,
      ),
    ).eq(usycReceived);
    expect(after.receiverUsdc).eq(before.receiverUsdc);
    return;
  }

  // fallback: USDC (never the original mToken) goes to tokensReceiver exactly once
  expect(after.tellerUsdc).eq(before.tellerUsdc);
  expect(after.receiverUsyc).eq(before.receiverUsyc);
  const usdcToReceiver = after.receiverUsdc.sub(before.receiverUsdc);
  if (isUsdc) {
    expect(usdcToReceiver).eq(amountInNative);
  } else {
    expect(usdcToReceiver).gt(0);
  }
  if (expectedUsdcInvested !== undefined) {
    expect(usdcToReceiver).eq(expectedUsdcInvested);
  }
};

type DepositWithUsycParams = CommonParamsUsycDv &
  Pick<Fixture, 'mTBILL' | 'mTokenToUsdDataFeed'> & {
    expectation?: UsycDepositExpectation;
    expectedUsdcInvested?: BigNumberish;
    waivedFee?: boolean;
    minAmount?: BigNumberish;
    customRecipient?: AccountOrContract;
    /** request only: part deposited instantly, so both transfer hooks run */
    instantShare?: BigNumberish;
  };

export const depositInstantWithUsycTest = async (
  {
    depositVaultWithUSYC,
    owner,
    mTBILL,
    mTokenToUsdDataFeed,
    expectation = 'invested',
    expectedUsdcInvested,
    waivedFee,
    minAmount,
    customRecipient,
  }: DepositWithUsycParams,
  tokenIn: ERC20 | IERC20Metadata | string,
  amountUsdIn: number,
  opt?: OptionalCommonParams,
) => {
  tokenIn = getAccount(tokenIn);

  const params = {
    depositVault: depositVaultWithUSYC,
    owner,
    mTBILL,
    mTokenToUsdDataFeed,
    waivedFee,
    minAmount,
    customRecipient,
    checkTokensReceiver: expectation === 'disabled',
  };

  if (shouldRevert(opt)) {
    await depositInstantTest(params, tokenIn, amountUsdIn, opt);
    return;
  }

  const before = await snapshotDv(depositVaultWithUSYC, tokenIn);
  await depositInstantTest(params, tokenIn, amountUsdIn, opt);

  await assertUsycDeposit(
    depositVaultWithUSYC,
    tokenIn,
    toDepositAmountBase18(amountUsdIn),
    before,
    expectation,
    expectedUsdcInvested,
  );
};

export const depositRequestWithUsycTest = async (
  {
    depositVaultWithUSYC,
    owner,
    mTBILL,
    mTokenToUsdDataFeed,
    expectation = 'invested',
    expectedUsdcInvested,
    waivedFee,
    customRecipient,
    instantShare,
  }: Omit<DepositWithUsycParams, 'minAmount'>,
  tokenIn: ERC20 | IERC20Metadata | string,
  amountUsdIn: number,
  opt?: OptionalCommonParams,
) => {
  tokenIn = getAccount(tokenIn);

  const params = {
    depositVault: depositVaultWithUSYC,
    owner,
    mTBILL,
    mTokenToUsdDataFeed,
    waivedFee,
    customRecipient,
    instantShare,
    checkTokensReceiver: expectation === 'disabled',
  };

  if (shouldRevert(opt)) {
    await depositRequestTest(params, tokenIn, amountUsdIn, opt);
    return;
  }

  const before = await snapshotDv(depositVaultWithUSYC, tokenIn);
  await depositRequestTest(params, tokenIn, amountUsdIn, opt);

  await assertUsycDeposit(
    depositVaultWithUSYC,
    tokenIn,
    toDepositAmountBase18(amountUsdIn),
    before,
    expectation,
    expectedUsdcInvested,
  );
};
