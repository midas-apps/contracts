import { expect } from 'chai';
import { BigNumber, BigNumberish, constants } from 'ethers';
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
import { usycSetterTest } from './usyc-common.helpers';

import {
  DepositVaultTest__factory,
  ERC20,
  ERC20__factory,
  IDataFeed__factory,
  IERC20,
  IUSYCTeller__factory,
} from '../../typechain-types';

type Fixture = Awaited<ReturnType<typeof defaultDeploy>>;

type CommonParamsUsycRv = {
  redemptionVaultWithUSYC: Fixture['redemptionVaultWithUSYC'];
  owner: Fixture['owner'];
};

export const setUsycDepositVaultTest = (
  { redemptionVaultWithUSYC, owner }: CommonParamsUsycRv,
  depositVault: string,
  opt?: OptionalCommonParams,
) =>
  usycSetterTest(
    { vault: redemptionVaultWithUSYC, owner },
    'setDepositVault',
    'SetDepositVault',
    'depositVault',
    depositVault,
    opt,
  );

/**
 * Value of the USYC the vault is able to redeem right now, expressed in
 * `tokenOut` native units. Mirrors the strategy guards, so it is 0 whenever
 * the strategy would not be used (unsupported tokenOut, fee rate mismatch,
 * fees not waived on the deposit vault, USDC not accepted by it)
 */
export const usycLiquidityInTokenOut = async (
  redemptionVaultWithUSYC: Fixture['redemptionVaultWithUSYC'],
  tokenOut: string,
) => {
  const signer = redemptionVaultWithUSYC.signer;
  const teller = IUSYCTeller__factory.connect(
    await redemptionVaultWithUSYC.usycTeller(),
    signer,
  );
  const usdc = await teller.asset();

  const feeRate = await teller.redemptionFeeRate(
    redemptionVaultWithUSYC.address,
  );
  if (!feeRate.eq(await redemptionVaultWithUSYC.anticipatedFeeRate())) {
    return constants.Zero;
  }

  const maxShares = await teller.maxRedeem(redemptionVaultWithUSYC.address);
  if (maxShares.isZero()) return constants.Zero;

  const [usdcValue] = await teller.previewRedeemData(
    redemptionVaultWithUSYC.address,
    maxShares,
  );

  if (tokenOut === usdc) return usdcValue;

  const dvAddress = await redemptionVaultWithUSYC.depositVault();
  if (dvAddress === constants.AddressZero) return constants.Zero;

  const dv = DepositVaultTest__factory.connect(dvAddress, signer);
  if ((await dv.mToken()) !== tokenOut) return constants.Zero;
  if (!(await dv.waivedFeeRestriction(redemptionVaultWithUSYC.address))) {
    return constants.Zero;
  }

  const getRate = (feed: string) =>
    IDataFeed__factory.connect(feed, signer).getDataInBase18();

  const usdcDecimals = await ERC20__factory.connect(usdc, signer).decimals();
  const { dataFeed, stable } = await dv.tokensConfig(usdc);
  if (dataFeed === constants.AddressZero) return constants.Zero;
  const usdcRate = stable ? parseUnits('1') : await getRate(dataFeed);
  const mTokenRate = await getRate(await dv.mTokenDataFeed());

  // same rounding as DepositVault: floor(floor(usdc * usdcRate) / mTokenRate)
  const usd = usdcValue
    .mul(parseUnits('1', 18 - usdcDecimals))
    .mul(usdcRate)
    .div(parseUnits('1'));
  return usd.mul(parseUnits('1')).div(mTokenRate);
};

/**
 * Calls the USYC strategy directly (through the tester), bypassing the
 * try/catch the vault wraps it with, so each guard can be asserted on its own.
 * Checks that the returned amount matches what the vault actually received.
 * @param missing missing amount of `tokenOut`, in its native decimals
 * @param expectation `none` asserts the strategy obtained nothing and no USYC
 * was redeemed, `obtained` asserts some USYC was redeemed
 */
export const checkAndRedeemUsycTest = async (
  {
    redemptionVaultWithUSYC,
    expectation = 'obtained',
  }: Pick<CommonParamsUsycRv, 'redemptionVaultWithUSYC'> & {
    expectation?: 'obtained' | 'none';
  },
  tokenOut: AccountOrContract,
  missing: BigNumberish,
  opt?: OptionalCommonParams,
) => {
  const signer = redemptionVaultWithUSYC.signer;
  const vault = redemptionVaultWithUSYC.address;
  const teller = IUSYCTeller__factory.connect(
    await redemptionVaultWithUSYC.usycTeller(),
    signer,
  );
  const usyc = ERC20__factory.connect(await teller.share(), signer);
  const token = ERC20__factory.connect(getAccount(tokenOut), signer);

  const balanceBefore = await token.balanceOf(vault);
  const callFn = () =>
    redemptionVaultWithUSYC.checkAndRedeemUSYC(
      token.address,
      balanceBefore.add(missing),
    );

  if (await handleRevert(callFn, redemptionVaultWithUSYC, opt)) {
    return undefined;
  }

  const usycBefore = await usyc.balanceOf(vault);
  const obtained = await redemptionVaultWithUSYC.callStatic.checkAndRedeemUSYC(
    token.address,
    balanceBefore.add(missing),
  );
  await expect(callFn()).to.not.reverted;

  const [balanceAfter, usycAfter] = await Promise.all([
    token.balanceOf(vault),
    usyc.balanceOf(vault),
  ]);
  const usycUsed = usycBefore.sub(usycAfter);
  const decimals = await token.decimals();

  expect(
    balanceAfter.sub(balanceBefore).mul(parseUnits('1', 18 - decimals)),
  ).eq(obtained);

  if (expectation === 'none') {
    expect(obtained).eq(0);
    expect(usycUsed).eq(0);
  } else {
    expect(obtained).gt(0);
    expect(usycUsed).gt(0);
  }

  return {
    obtained,
    usycUsed,
    missingBase18: BigNumber.from(missing).mul(parseUnits('1', 18 - decimals)),
  };
};

type RedeemWithUsycParams = CommonParamsUsycRv &
  Pick<Fixture, 'mTBILL' | 'mTokenToUsdDataFeed'> & {
    /** whether USYC is expected to be redeemed during the call */
    expectUsycUsed?: boolean;
    waivedFee?: boolean;
    minAmount?: BigNumberish;
    customRecipient?: AccountOrContract;
    /** extra dust allowed on the vault liquidity accounting, native units */
    vaultBalanceTolerance?: BigNumberish;
  };

export const redeemInstantWithUsycTest = async (
  {
    redemptionVaultWithUSYC,
    owner,
    mTBILL,
    mTokenToUsdDataFeed,
    expectUsycUsed = true,
    waivedFee,
    minAmount,
    customRecipient,
    vaultBalanceTolerance,
  }: RedeemWithUsycParams,
  tokenOut: IERC20 | ERC20 | string,
  amountTBillIn: number,
  opt?: OptionalCommonParams,
) => {
  tokenOut = getAccount(tokenOut);

  const signer = redemptionVaultWithUSYC.signer;
  const teller = IUSYCTeller__factory.connect(
    await redemptionVaultWithUSYC.usycTeller(),
    signer,
  );
  const usdc = ERC20__factory.connect(await teller.asset(), signer);
  const usyc = ERC20__factory.connect(await teller.share(), signer);
  const tokenOutDecimals = await ERC20__factory.connect(
    tokenOut,
    signer,
  ).decimals();
  const usdcDecimals = await usdc.decimals();

  const params = {
    redemptionVault: redemptionVaultWithUSYC,
    owner,
    mTBILL,
    mTokenToUsdDataFeed,
    waivedFee,
    minAmount,
    customRecipient,
    additionalLiquidity: () =>
      usycLiquidityInTokenOut(redemptionVaultWithUSYC, tokenOut as string),
    // conversion dust: up to 100 smallest USDC units, in tokenOut decimals
    vaultBalanceTolerance:
      vaultBalanceTolerance ??
      BigNumber.from(100).mul(
        tokenOutDecimals >= usdcDecimals
          ? parseUnits('1', tokenOutDecimals - usdcDecimals)
          : 1,
      ),
  };

  if (shouldRevert(opt)) {
    await redeemInstantTest(params, tokenOut, amountTBillIn, opt);
    return undefined;
  }

  const [usycBefore, usdcBefore] = await Promise.all([
    usyc.balanceOf(redemptionVaultWithUSYC.address),
    usdc.balanceOf(redemptionVaultWithUSYC.address),
  ]);

  await redeemInstantTest(params, tokenOut, amountTBillIn, opt);

  const [usycAfter, usdcAfter] = await Promise.all([
    usyc.balanceOf(redemptionVaultWithUSYC.address),
    usdc.balanceOf(redemptionVaultWithUSYC.address),
  ]);

  const usycUsed = usycBefore.sub(usycAfter);

  if (expectUsycUsed) {
    expect(usycUsed).gt(0);
  } else {
    expect(usycUsed).eq(0);
  }

  // when converting into the mToken all redeemed USDC is deposited
  if (tokenOut !== usdc.address) {
    expect(usdcAfter).eq(usdcBefore);
  }

  return { usycUsed };
};
