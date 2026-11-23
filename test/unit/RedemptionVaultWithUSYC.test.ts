import { loadFixture } from '@nomicfoundation/hardhat-network-helpers';
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { expect } from 'chai';
import { BigNumberish, constants } from 'ethers';
import { parseUnits } from 'ethers/lib/utils';

import {
  baseInitParamsRv,
  redemptionVaultSuits,
} from './suits/redemption-vault.suits';

import {
  ERC20Mock__factory,
  RedemptionVaultWithUSYC__factory,
  VaultsWithUSYCLibrary__factory,
  USYCTellerMock__factory,
} from '../../typechain-types';
import { acErrors } from '../common/ac.helpers';
import {
  approveBase18,
  InitializeParamCase,
  mintToken,
  pauseVault,
  validateImplementation,
} from '../common/common.helpers';
import { DefaultFixture, defaultDeploy } from '../common/fixtures';
import {
  addPaymentTokenTest,
  removePaymentTokenTest,
  setInstantFeeTest,
  setInstantLimitConfigTest,
  setWaivedFeeAccountTest,
} from '../common/manageable-vault.helpers';
import {
  checkAndRedeemUsycTest,
  redeemInstantWithUsycTest,
  setUsycDepositVaultPairedTest,
  setUsycDepositVaultTest,
  usycLiquidityInTokenOut,
} from '../common/redemption-vault-usyc.helpers';
import {
  setLoanLpTest,
  setPreferLoanLiquidityTest,
} from '../common/redemption-vault.helpers';
import {
  setUsycAnticipatedFeeRatesTest,
  usycMaxFee,
  usycSetterTest,
} from '../common/usyc-common.helpers';
import {
  deployRvWithUsycTest,
  initializeRvWithUsyc,
  InitializerParamsRvWithUsyc,
} from '../common/vault-initializer.helpers';

const baseInitParamsRvWithUsyc = (
  fixture: Parameters<typeof baseInitParamsRv>[0],
): InitializerParamsRvWithUsyc => ({
  ...baseInitParamsRv(fixture),
  usycTeller: fixture.usycTeller,
  usycDepositVault: fixture.depositVaultMTokenLoan,
});

const rvWithUsycInitializeParamCases: InitializeParamCase<InitializerParamsRvWithUsyc>[] =
  [
    {
      title: 'usycTeller is zero address',
      params: { usycTeller: constants.AddressZero },
      revertCustomError: {
        customErrorName: 'InvalidAddress',
        args: [constants.AddressZero],
      },
    },
    {
      title: 'usycTeller is the vault itself',
      contract: (fixture) => deployRvWithUsycTest(fixture.owner),
      params: (_, contract) => ({ usycTeller: contract!.address }),
      revertCustomError: {
        customErrorName: 'InvalidAddress',
        args: (_, contract) => [contract!.address],
      },
    },
  ];

const NOT_ROUND_REDEEM_PRICE = parseUnits('1.142315458569453803');
const NOT_ROUND_MINT_PRICE = parseUnits('1.142435462021293868');

/**
 * Common setup: USDC (8 decimals) and mTokenLoan (radUSD) as payment tokens,
 * radUSD DV accepts USDC, no loan LP so the USYC strategy is the only source,
 * vault holds `usyc` USYC and the user holds 1000 mTBILL (radYC)
 */
const setupUsycRv = async (
  fixture: DefaultFixture,
  { usyc = 10_000 }: { usyc?: number } = {},
) => {
  const {
    owner,
    redemptionVaultWithUSYC,
    depositVaultMTokenLoan,
    stableCoins,
    dataFeed,
    mTokenLoan,
    mTokenLoanToUsdDataFeed,
    mockedAggregator,
    usycToken,
    mTBILL,
    regularAccounts,
  } = fixture;

  await mockedAggregator.setRoundData(
    parseUnits('1', await mockedAggregator.decimals()),
  );

  await addPaymentTokenTest(
    { vault: redemptionVaultWithUSYC, owner },
    stableCoins.usdc,
    dataFeed.address,
    0,
    true,
  );
  await addPaymentTokenTest(
    { vault: redemptionVaultWithUSYC, owner },
    mTokenLoan,
    mTokenLoanToUsdDataFeed.address,
    0,
    false,
  );
  await addPaymentTokenTest(
    { vault: depositVaultMTokenLoan, owner },
    stableCoins.usdc,
    dataFeed.address,
    0,
    true,
  );
  await setLoanLpTest(
    { redemptionVault: redemptionVaultWithUSYC, owner },
    constants.AddressZero,
  );

  if (usyc > 0) {
    await mintToken(usycToken, redemptionVaultWithUSYC, usyc);
  }

  const user = regularAccounts[0];
  await mintToken(mTBILL, user, 1000);
  await approveBase18(user, mTBILL, redemptionVaultWithUSYC, 1000);

  return { user };
};

/**
 * 6-decimal setup for rounding tests: USDC and USYC both have 6 decimals (so
 * the teller rounding does not over-cover the strategy rounding) and the
 * vault instant fee is 0 (so no fee portion absorbs a shortfall)
 */
const setupTightUsycRv = async (fixture: DefaultFixture) => {
  const {
    owner,
    redemptionVaultWithUSYC,
    depositVaultMTokenLoan,
    stableCoins,
    dataFeed,
  } = fixture;
  const { user } = await setupUsycRv(fixture, { usyc: 0 });

  const usdc = stableCoins.usdc6;
  const usycToken = await new ERC20Mock__factory(owner).deploy(6);
  const teller = await new USYCTellerMock__factory(owner).deploy(
    usdc.address,
    usycToken.address,
    constants.AddressZero,
    constants.AddressZero,
  );
  await mintToken(usdc, teller, 1_000_000);
  await usycSetterTest(
    { vault: redemptionVaultWithUSYC, owner },
    'setUsycTeller',
    'SetUsycTeller',
    'usycTeller',
    teller.address,
  );
  await addPaymentTokenTest(
    { vault: redemptionVaultWithUSYC, owner },
    usdc,
    dataFeed.address,
    0,
    true,
  );
  await addPaymentTokenTest(
    { vault: depositVaultMTokenLoan, owner },
    usdc,
    dataFeed.address,
    0,
    true,
  );
  await setInstantFeeTest({ vault: redemptionVaultWithUSYC, owner }, 0);
  await mintToken(usycToken, redemptionVaultWithUSYC, 10_000);
  await teller.setPrices(NOT_ROUND_MINT_PRICE, NOT_ROUND_REDEEM_PRICE);

  return { user, usdc, teller };
};

/**
 * With 6-decimal USDC and USYC the strategy over-covers the missing amount by
 * at most: 1 USDC unit from rounding the USDC amount up, ~1.14 USDC units from
 * rounding the USYC shares up (one share unit) and the USD rounding up steps.
 * 3 USDC units, expressed in base18
 */
const MAX_COVERING_EXCESS_USDC6 = parseUnits('3', 12);

/**
 * Leaves `liquidity` (native units) of redeemable USDC on the teller
 */
const limitTellerLiquidity = async (
  fixture: DefaultFixture,
  liquidity: BigNumberish,
) => {
  const { usycTeller, stableCoins, owner } = fixture;
  const balance = await stableCoins.usdc.balanceOf(usycTeller.address);
  await usycTeller.withdrawLiquidity(owner.address, balance.sub(liquidity));
};

/**
 * Enables the loan LP flow on top of `setupUsycRv`: the loan LP holds
 * `lpMTokenLoan` radUSD that the loan swapper RV converts into USDC
 */
const setupLoanLp = async (fixture: DefaultFixture, lpMTokenLoan: number) => {
  const {
    owner,
    loanLp,
    mTokenLoan,
    stableCoins,
    dataFeed,
    redemptionVaultWithUSYC,
    redemptionVaultLoanSwapper,
  } = fixture;

  await setLoanLpTest(
    { redemptionVault: redemptionVaultWithUSYC, owner },
    loanLp.address,
  );
  await addPaymentTokenTest(
    { vault: redemptionVaultLoanSwapper, owner },
    stableCoins.usdc,
    dataFeed.address,
    0,
    true,
  );
  await mintToken(stableCoins.usdc, redemptionVaultLoanSwapper, 100_000);
  await mintToken(mTokenLoan, loanLp, lpMTokenLoan);
  await approveBase18(
    loanLp,
    mTokenLoan,
    redemptionVaultWithUSYC,
    lpMTokenLoan,
  );
};

const commonParams = (fixture: DefaultFixture) => ({
  redemptionVaultWithUSYC: fixture.redemptionVaultWithUSYC,
  owner: fixture.owner,
  mTBILL: fixture.mTBILL,
  mTokenToUsdDataFeed: fixture.mTokenToUsdDataFeed,
});

redemptionVaultSuits(
  'RedemptionVaultWithUSYC',
  defaultDeploy,
  {
    createNew: async (owner: SignerWithAddress) => deployRvWithUsycTest(owner),
    key: 'redemptionVaultWithUSYC',
  },
  async (fixture) => {
    const { redemptionVaultWithUSYC, usycTeller, depositVaultMTokenLoan } =
      fixture;
    expect(await redemptionVaultWithUSYC.usycTeller()).eq(usycTeller.address);
    expect(await redemptionVaultWithUSYC.depositVault()).eq(
      depositVaultMTokenLoan.address,
    );
    expect(await redemptionVaultWithUSYC.depositVaultPaired()).eq(
      fixture.depositVaultWithUSYC.address,
    );
    expect(await redemptionVaultWithUSYC.anticipatedFeeRate()).eq(0);
    await validateImplementation(RedemptionVaultWithUSYC__factory);
  },
  {
    deployUninitialized: (fixture) => deployRvWithUsycTest(fixture.owner),
    initialize: async (fixture, params, opt) => {
      await initializeRvWithUsyc(
        { ...baseInitParamsRvWithUsyc(fixture), ...params },
        opt?.contract,
        opt,
      );
    },
    extraParamCases: rvWithUsycInitializeParamCases,
  },
  async (defaultDeploy) => {
    describe('RedemptionVaultWithUSYC', function () {
      describe('initialize()', () => {
        it('stores the mToken and the paired deposit vaults and the anticipated fee rate', async () => {
          const fixture = await loadFixture(defaultDeploy);
          const vault = await initializeRvWithUsyc({
            ...baseInitParamsRvWithUsyc(fixture),
            usycDepositVault: fixture.depositVaultMTokenLoan,
            usycDepositVaultPaired: fixture.depositVaultWithUSYC,
            anticipatedFeeRate: parseUnits('3'),
          });

          expect(await vault.depositVault()).eq(
            fixture.depositVaultMTokenLoan.address,
          );
          expect(await vault.depositVaultPaired()).eq(
            fixture.depositVaultWithUSYC.address,
          );
          expect(await vault.anticipatedFeeRate()).eq(parseUnits('3'));
        });

        it('paired deposit vault is optional', async () => {
          const fixture = await loadFixture(defaultDeploy);
          const vault = await initializeRvWithUsyc(
            baseInitParamsRvWithUsyc(fixture),
          );

          expect(await vault.depositVaultPaired()).eq(constants.AddressZero);
        });
      });

      describe('redeemInstant() to USDC', () => {
        it('redeem 100 mTBILL when vault has enough USDC: USYC is not used', async () => {
          const fixture = await loadFixture(defaultDeploy);
          const { user } = await setupUsycRv(fixture);
          await mintToken(
            fixture.stableCoins.usdc,
            fixture.redemptionVaultWithUSYC,
            100_000,
          );

          await redeemInstantWithUsycTest(
            { ...commonParams(fixture), expectUsycUsed: false },
            fixture.stableCoins.usdc,
            100,
            { from: user },
          );
        });

        it('redeem 100 mTBILL when vault has no USDC but has USYC', async () => {
          const fixture = await loadFixture(defaultDeploy);
          const { user } = await setupUsycRv(fixture);

          await redeemInstantWithUsycTest(
            commonParams(fixture),
            fixture.stableCoins.usdc,
            100,
            { from: user },
          );
        });

        it('redeem 100 mTBILL when vault has part in USDC and the rest in USYC', async () => {
          const fixture = await loadFixture(defaultDeploy);
          const { user } = await setupUsycRv(fixture);
          await mintToken(
            fixture.stableCoins.usdc,
            fixture.redemptionVaultWithUSYC,
            150,
          );

          await redeemInstantWithUsycTest(
            commonParams(fixture),
            fixture.stableCoins.usdc,
            100,
            { from: user },
          );
        });

        it('redeem mTBILL for several amounts when USYC price is not round', async () => {
          const fixture = await loadFixture(defaultDeploy);
          const { user } = await setupUsycRv(fixture);
          await fixture.usycTeller.setPrices(
            NOT_ROUND_MINT_PRICE,
            NOT_ROUND_REDEEM_PRICE,
          );

          for (const amount of [1.333333, 17, 99.999999]) {
            await redeemInstantWithUsycTest(
              commonParams(fixture),
              fixture.stableCoins.usdc,
              amount,
              { from: user },
            );
          }
        });

        it('USDC-only product (depositVault not set): USYC is redeemed to USDC directly', async () => {
          const fixture = await loadFixture(defaultDeploy);
          const { user } = await setupUsycRv(fixture);
          await setUsycDepositVaultTest(
            {
              redemptionVaultWithUSYC: fixture.redemptionVaultWithUSYC,
              owner: fixture.owner,
            },
            constants.AddressZero,
          );

          await redeemInstantWithUsycTest(
            commonParams(fixture),
            fixture.stableCoins.usdc,
            100,
            { from: user },
          );
        });
      });

      describe('redeemInstant() to radUSD (mToken)', () => {
        it('redeem 100 mTBILL when vault holds only USYC: USYC -> USDC -> radUSD', async () => {
          const fixture = await loadFixture(defaultDeploy);
          const { user } = await setupUsycRv(fixture);

          await redeemInstantWithUsycTest(
            commonParams(fixture),
            fixture.mTokenLoan,
            100,
            { from: user },
          );
        });

        for (const rate of ['1.0000013', '1.0123456', '0.9999999']) {
          it(`redeem several amounts with 0 fee and 6-decimal USDC when radUSD price is ${rate}$ and USYC price is not round`, async () => {
            const fixture = await loadFixture(defaultDeploy);
            const { user } = await setupTightUsycRv(fixture);
            await fixture.mockedAggregatorMTokenLoan.setRoundData(
              parseUnits(
                rate,
                await fixture.mockedAggregatorMTokenLoan.decimals(),
              ),
            );

            for (const amount of [1.333333, 17.777777, 99.999999]) {
              await redeemInstantWithUsycTest(
                commonParams(fixture),
                fixture.mTokenLoan,
                amount,
                { from: user },
              );
            }
          });
        }

        for (const rate of ['1.0123456', '0.9999999']) {
          it(`obtained radUSD covers the missing amount without over-redeeming when radUSD price is ${rate}$ (direct strategy call)`, async () => {
            const fixture = await loadFixture(defaultDeploy);
            await setupTightUsycRv(fixture);
            await fixture.mockedAggregatorMTokenLoan.setRoundData(
              parseUnits(
                rate,
                await fixture.mockedAggregatorMTokenLoan.decimals(),
              ),
            );
            const radUsdRate = parseUnits(rate);

            for (const amount of [
              '1.333333333333333333',
              '17.777777777777777777',
              '99.999999999',
              '0.000001234567890123',
            ]) {
              const result = await checkAndRedeemUsycTest(
                {
                  redemptionVaultWithUSYC: fixture.redemptionVaultWithUSYC,
                },
                fixture.mTokenLoan,
                parseUnits(amount),
              );
              const { obtained, missingBase18 } = result!;

              expect(obtained).gte(missingBase18);
              // the USDC excess is converted into radUSD at the radUSD price
              expect(obtained.sub(missingBase18)).lte(
                MAX_COVERING_EXCESS_USDC6.mul(parseUnits('1')).div(radUsdRate),
              );
            }
          });
        }

        it('obtained 6-decimal USDC covers the missing amount without over-redeeming (direct strategy call)', async () => {
          const fixture = await loadFixture(defaultDeploy);
          const { usdc } = await setupTightUsycRv(fixture);

          for (const amount of [
            '1.333333',
            '17.777777',
            '99.999999',
            '0.000001',
          ]) {
            const result = await checkAndRedeemUsycTest(
              { redemptionVaultWithUSYC: fixture.redemptionVaultWithUSYC },
              usdc,
              parseUnits(amount, 6),
            );
            const { obtained, missingBase18 } = result!;

            expect(obtained).gte(missingBase18);
            expect(obtained.sub(missingBase18)).lte(MAX_COVERING_EXCESS_USDC6);
          }
        });

        it('should fail: radUSD DV mints less radUSD than the USDC is worth to the vault (USDC priced at 0.9998$ by the radUSD DV), USYC is not used', async () => {
          const fixture = await loadFixture(defaultDeploy);
          const { user, usdc, teller } = await setupTightUsycRv(fixture);
          const {
            owner,
            depositVaultMTokenLoan,
            redemptionVaultWithUSYC,
            dataFeed,
            mockedAggregator,
          } = fixture;
          const usycToken = ERC20Mock__factory.connect(
            await teller.share(),
            owner,
          );
          await removePaymentTokenTest(
            { vault: depositVaultMTokenLoan, owner },
            usdc,
          );
          await addPaymentTokenTest(
            { vault: depositVaultMTokenLoan, owner },
            usdc,
            dataFeed.address,
            0,
            false,
          );
          await mockedAggregator.setRoundData(
            parseUnits('0.9998', await mockedAggregator.decimals()),
          );

          const usycBefore = await usycToken.balanceOf(
            redemptionVaultWithUSYC.address,
          );

          // the strategy failure is swallowed by the vault
          await redeemInstantWithUsycTest(
            commonParams(fixture),
            fixture.mTokenLoan,
            17.777777,
            {
              from: user,
              revertMessage: 'ERC20: transfer amount exceeds balance',
            },
          );

          // the strategy itself reverts on the radUSD DV slippage check
          await checkAndRedeemUsycTest(
            { redemptionVaultWithUSYC },
            fixture.mTokenLoan,
            parseUnits('17.777777777777777777'),
            {
              revertCustomError: {
                customErrorName: 'SlippageExceeded',
                contract: depositVaultMTokenLoan,
              },
            },
          );

          expect(await usycToken.balanceOf(redemptionVaultWithUSYC.address)).eq(
            usycBefore,
          );
        });

        it('should fail: radUSD DV prices radUSD higher than the vault does, USYC is not used', async () => {
          const fixture = await loadFixture(defaultDeploy);
          const { user } = await setupUsycRv(fixture);
          const {
            owner,
            depositVaultMTokenLoan,
            redemptionVaultWithUSYC,
            mTokenLoan,
            mTokenLoanToUsdDataFeed,
            mockedAggregatorMTokenLoan,
          } = fixture;
          // radUSD is stable (1$) on the vault while the radUSD DV mints it at 1.01$
          await removePaymentTokenTest(
            { vault: redemptionVaultWithUSYC, owner },
            mTokenLoan,
          );
          await addPaymentTokenTest(
            { vault: redemptionVaultWithUSYC, owner },
            mTokenLoan,
            mTokenLoanToUsdDataFeed.address,
            0,
            true,
          );
          await mockedAggregatorMTokenLoan.setRoundData(
            parseUnits('1.01', await mockedAggregatorMTokenLoan.decimals()),
          );

          await redeemInstantWithUsycTest(
            commonParams(fixture),
            mTokenLoan,
            100,
            {
              from: user,
              revertMessage: 'ERC20: transfer amount exceeds balance',
            },
          );

          await checkAndRedeemUsycTest(
            { redemptionVaultWithUSYC },
            mTokenLoan,
            parseUnits('100'),
            {
              revertCustomError: {
                customErrorName: 'SlippageExceeded',
                contract: depositVaultMTokenLoan,
              },
            },
          );
        });

        it('should fail: depositVault not set and tokenOut is radUSD', async () => {
          const fixture = await loadFixture(defaultDeploy);
          const { user } = await setupUsycRv(fixture);
          await setUsycDepositVaultTest(
            {
              redemptionVaultWithUSYC: fixture.redemptionVaultWithUSYC,
              owner: fixture.owner,
            },
            constants.AddressZero,
          );

          await redeemInstantWithUsycTest(
            commonParams(fixture),
            fixture.mTokenLoan,
            100,
            {
              from: user,
              revertMessage: 'ERC20: transfer amount exceeds balance',
            },
          );
        });

        it('should fail: fees are not waived for the vault on the radUSD deposit vault', async () => {
          const fixture = await loadFixture(defaultDeploy);
          const { user } = await setupUsycRv(fixture);
          await setWaivedFeeAccountTest(
            { vault: fixture.depositVaultMTokenLoan, owner: fixture.owner },
            fixture.redemptionVaultWithUSYC.address,
            false,
          );

          await redeemInstantWithUsycTest(
            commonParams(fixture),
            fixture.mTokenLoan,
            100,
            {
              from: user,
              revertMessage: 'ERC20: transfer amount exceeds balance',
            },
          );
        });

        it('should fail: USDC is not a payment token of the radUSD deposit vault', async () => {
          const fixture = await loadFixture(defaultDeploy);
          const { user } = await setupUsycRv(fixture);
          await fixture.depositVaultMTokenLoan.removePaymentToken(
            fixture.stableCoins.usdc.address,
          );

          await redeemInstantWithUsycTest(
            commonParams(fixture),
            fixture.mTokenLoan,
            100,
            {
              from: user,
              revertMessage: 'ERC20: transfer amount exceeds balance',
            },
          );
        });
      });

      describe('strategy guards', () => {
        it('redeem when teller redemption fee rate equals non-zero anticipated fee rate', async () => {
          const fixture = await loadFixture(defaultDeploy);
          const { user } = await setupUsycRv(fixture);
          await fixture.usycTeller.setFeeRates(
            parseUnits('4'),
            parseUnits('3'),
          );
          await setUsycAnticipatedFeeRatesTest(
            fixture,
            parseUnits('4'),
            parseUnits('3'),
          );

          await redeemInstantWithUsycTest(
            commonParams(fixture),
            fixture.stableCoins.usdc,
            100,
            { from: user },
          );
        });

        it('should fail: teller redemption fee rate differs from anticipated fee rate', async () => {
          const fixture = await loadFixture(defaultDeploy);
          const { user } = await setupUsycRv(fixture);
          await fixture.usycTeller.setFeeRates(0, parseUnits('3'));

          await redeemInstantWithUsycTest(
            commonParams(fixture),
            fixture.stableCoins.usdc,
            100,
            {
              from: user,
              revertMessage: 'ERC20: transfer amount exceeds balance',
            },
          );
        });

        it('should fail: teller subscription fee rate differs from anticipated fee rate', async () => {
          const fixture = await loadFixture(defaultDeploy);
          const { user } = await setupUsycRv(fixture);
          await fixture.usycTeller.setFeeRates(parseUnits('4'), 0);

          await redeemInstantWithUsycTest(
            commonParams(fixture),
            fixture.stableCoins.usdc,
            100,
            {
              from: user,
              revertMessage: 'ERC20: transfer amount exceeds balance',
            },
          );
        });

        it('Teller subscription fee rate changes: USYC is not used until the anticipated fee rates are updated', async () => {
          const fixture = await loadFixture(defaultDeploy);
          const { user } = await setupUsycRv(fixture);
          await fixture.usycTeller.setFeeRates(
            parseUnits('4'),
            parseUnits('3'),
          );
          await setUsycAnticipatedFeeRatesTest(
            fixture,
            parseUnits('4'),
            parseUnits('3'),
          );

          await redeemInstantWithUsycTest(
            commonParams(fixture),
            fixture.stableCoins.usdc,
            100,
            { from: user },
          );

          // only the fee the vault itself is never charged changes
          await fixture.usycTeller.setFeeRates(
            parseUnits('5'),
            parseUnits('3'),
          );

          await redeemInstantWithUsycTest(
            commonParams(fixture),
            fixture.stableCoins.usdc,
            100,
            {
              from: user,
              revertMessage: 'ERC20: transfer amount exceeds balance',
            },
          );

          await setUsycAnticipatedFeeRatesTest(
            fixture,
            parseUnits('5'),
            parseUnits('3'),
          );

          await redeemInstantWithUsycTest(
            commonParams(fixture),
            fixture.stableCoins.usdc,
            100,
            { from: user },
          );
        });

        it('should fail: teller liquidity is lower than the missing amount', async () => {
          const fixture = await loadFixture(defaultDeploy);
          const { user } = await setupUsycRv(fixture);
          const { usycTeller, stableCoins, owner } = fixture;
          const liquidity = await stableCoins.usdc.balanceOf(
            usycTeller.address,
          );
          await usycTeller.withdrawLiquidity(
            owner.address,
            liquidity.sub(parseUnits('10', 8)),
          );

          await redeemInstantWithUsycTest(
            commonParams(fixture),
            stableCoins.usdc,
            100,
            {
              from: user,
              revertMessage: 'ERC20: transfer amount exceeds balance',
            },
          );
        });

        it('teller liquidity covers only part of the amount and vault USDC covers the rest', async () => {
          const fixture = await loadFixture(defaultDeploy);
          const { user } = await setupUsycRv(fixture);
          const { usycTeller, stableCoins, owner, redemptionVaultWithUSYC } =
            fixture;
          const liquidity = await stableCoins.usdc.balanceOf(
            usycTeller.address,
          );
          await usycTeller.withdrawLiquidity(
            owner.address,
            liquidity.sub(parseUnits('300', 8)),
          );
          await mintToken(stableCoins.usdc, redemptionVaultWithUSYC, 250);

          // 100 mTBILL at 5$ = 500 USDC: 250 from the vault, the rest via USYC
          await redeemInstantWithUsycTest(
            commonParams(fixture),
            stableCoins.usdc,
            100,
            { from: user },
          );
        });

        it('should fail: vault does not hold enough USYC', async () => {
          const fixture = await loadFixture(defaultDeploy);
          const { user } = await setupUsycRv(fixture, { usyc: 10 });

          await redeemInstantWithUsycTest(
            commonParams(fixture),
            fixture.stableCoins.usdc,
            100,
            {
              from: user,
              revertMessage: 'ERC20: transfer amount exceeds balance',
            },
          );
        });

        it('should fail: teller redeem reverts', async () => {
          const fixture = await loadFixture(defaultDeploy);
          const { user } = await setupUsycRv(fixture);
          await fixture.usycTeller.setRedeemReverts(true);

          await redeemInstantWithUsycTest(
            commonParams(fixture),
            fixture.stableCoins.usdc,
            100,
            {
              from: user,
              revertMessage: 'ERC20: transfer amount exceeds balance',
            },
          );
        });

        it('should fail: teller fee exceeds the max fee and there is no other liquidity', async () => {
          const fixture = await loadFixture(defaultDeploy);
          const { user } = await setupUsycRv(fixture);
          // reported rate 0 equals the anticipated one, 1% is charged anyway
          await fixture.usycTeller.setFeeRatePremium(parseUnits('1'));
          await fixture.usycTeller.setFreeTierThreshold(0);

          await redeemInstantWithUsycTest(
            commonParams(fixture),
            fixture.stableCoins.usdc,
            100,
            {
              from: user,
              revertMessage: 'ERC20: transfer amount exceeds balance',
            },
          );
        });

        it('should fail: teller pays out less USDC than previewed, strategy reverts and USYC is not used', async () => {
          const fixture = await loadFixture(defaultDeploy);
          const { user } = await setupUsycRv(fixture);
          await fixture.usycTeller.setRedeemShortfall(1);

          await redeemInstantWithUsycTest(
            commonParams(fixture),
            fixture.stableCoins.usdc,
            100,
            {
              from: user,
              revertMessage: 'ERC20: transfer amount exceeds balance',
            },
          );
        });

        it('should fail: tokenOut not served by the strategy and the vault lacks it', async () => {
          const fixture = await loadFixture(defaultDeploy);
          const { user } = await setupUsycRv(fixture);
          const { owner, redemptionVaultWithUSYC, stableCoins, dataFeed } =
            fixture;
          await addPaymentTokenTest(
            { vault: redemptionVaultWithUSYC, owner },
            stableCoins.dai,
            dataFeed.address,
            0,
            true,
          );
          // 100 mTBILL at 5$ needs 500 DAI, so the strategy is asked for 400
          await mintToken(stableCoins.dai, redemptionVaultWithUSYC, 100);

          await redeemInstantWithUsycTest(
            commonParams(fixture),
            stableCoins.dai,
            100,
            {
              from: user,
              revertMessage: 'ERC20: transfer amount exceeds balance',
            },
          );
        });
      });

      describe('strategy guards (direct strategy call, no try/catch)', () => {
        it('tokenOut is neither USDC nor the DV mToken: nothing is obtained', async () => {
          const fixture = await loadFixture(defaultDeploy);
          await setupUsycRv(fixture);

          await checkAndRedeemUsycTest(
            {
              redemptionVaultWithUSYC: fixture.redemptionVaultWithUSYC,
              expectation: 'none',
            },
            fixture.stableCoins.dai,
            parseUnits('100'),
          );
        });

        // anticipated rates are 4% / 3%, the Teller default rates differ
        const mismatchCases = [
          { title: 'redemption fee rate', rates: ['4', '2'] },
          { title: 'subscription fee rate', rates: ['5', '3'] },
          { title: 'both fee rates', rates: ['5', '2'] },
          { title: 'zero subscription fee rate', rates: ['0', '3'] },
        ] as const;

        for (const { title, rates } of mismatchCases) {
          it(`teller ${title} differs from anticipated: nothing is obtained`, async () => {
            const fixture = await loadFixture(defaultDeploy);
            await setupUsycRv(fixture);
            await setUsycAnticipatedFeeRatesTest(
              fixture,
              parseUnits('4'),
              parseUnits('3'),
            );
            await fixture.usycTeller.setFeeRates(
              parseUnits(rates[0]),
              parseUnits(rates[1]),
            );

            for (const token of [
              fixture.stableCoins.usdc,
              fixture.mTokenLoan,
            ]) {
              await checkAndRedeemUsycTest(
                {
                  redemptionVaultWithUSYC: fixture.redemptionVaultWithUSYC,
                  expectation: 'none',
                },
                token,
                parseUnits('100', await token.decimals()),
              );
            }
          });
        }

        it('teller fee rates equal non-zero anticipated fee rates: USYC is redeemed', async () => {
          const fixture = await loadFixture(defaultDeploy);
          await setupUsycRv(fixture);
          await fixture.usycTeller.setFeeRates(
            parseUnits('4'),
            parseUnits('3'),
          );
          await setUsycAnticipatedFeeRatesTest(
            fixture,
            parseUnits('4'),
            parseUnits('3'),
          );

          for (const token of [fixture.stableCoins.usdc, fixture.mTokenLoan]) {
            await checkAndRedeemUsycTest(
              { redemptionVaultWithUSYC: fixture.redemptionVaultWithUSYC },
              token,
              parseUnits('100', await token.decimals()),
            );
          }
        });

        it('teller fee exceeds the max fee: nothing is obtained', async () => {
          const fixture = await loadFixture(defaultDeploy);
          await setupUsycRv(fixture);
          const { usycTeller, redemptionVaultWithUSYC } = fixture;
          // reported rate 0 equals the anticipated one, 1% is charged anyway
          await usycTeller.setFeeRatePremium(parseUnits('1'));
          await usycTeller.setFreeTierThreshold(0);

          for (const token of [fixture.stableCoins.usdc, fixture.mTokenLoan]) {
            await checkAndRedeemUsycTest(
              { redemptionVaultWithUSYC, expectation: 'none' },
              token,
              parseUnits('100', await token.decimals()),
            );
          }
        });

        it('should fail: teller pays out less USDC than previewed', async () => {
          const fixture = await loadFixture(defaultDeploy);
          await setupUsycRv(fixture);
          const { usycTeller, redemptionVaultWithUSYC, owner } = fixture;
          await usycTeller.setRedeemShortfall(1);

          const missing = parseUnits('100', 8);
          const [shares] = await usycTeller.previewWithdrawData(
            redemptionVaultWithUSYC.address,
            missing,
          );
          const [expectedUsdc] = await usycTeller.previewRedeemData(
            redemptionVaultWithUSYC.address,
            shares,
          );

          await checkAndRedeemUsycTest(
            { redemptionVaultWithUSYC },
            fixture.stableCoins.usdc,
            missing,
            {
              revertCustomError: {
                customErrorName: 'InsufficientAmountReceived',
                // the error is declared by the linked library
                contract: VaultsWithUSYCLibrary__factory.connect(
                  redemptionVaultWithUSYC.address,
                  owner,
                ),
                args: [expectedUsdc.sub(1), expectedUsdc],
              },
            },
          );
        });

        it('depositVault not set and tokenOut is radUSD: nothing is obtained', async () => {
          const fixture = await loadFixture(defaultDeploy);
          await setupUsycRv(fixture);
          await setUsycDepositVaultTest(
            {
              redemptionVaultWithUSYC: fixture.redemptionVaultWithUSYC,
              owner: fixture.owner,
            },
            constants.AddressZero,
          );

          await checkAndRedeemUsycTest(
            {
              redemptionVaultWithUSYC: fixture.redemptionVaultWithUSYC,
              expectation: 'none',
            },
            fixture.mTokenLoan,
            parseUnits('100'),
          );
        });

        it('fees are not waived for the vault on the radUSD DV: nothing is obtained', async () => {
          const fixture = await loadFixture(defaultDeploy);
          await setupUsycRv(fixture);
          await setWaivedFeeAccountTest(
            { vault: fixture.depositVaultMTokenLoan, owner: fixture.owner },
            fixture.redemptionVaultWithUSYC.address,
            false,
          );

          await checkAndRedeemUsycTest(
            {
              redemptionVaultWithUSYC: fixture.redemptionVaultWithUSYC,
              expectation: 'none',
            },
            fixture.mTokenLoan,
            parseUnits('100'),
          );
        });

        it('USDC is not a payment token of the radUSD DV: nothing is obtained', async () => {
          const fixture = await loadFixture(defaultDeploy);
          await setupUsycRv(fixture);
          await removePaymentTokenTest(
            { vault: fixture.depositVaultMTokenLoan, owner: fixture.owner },
            fixture.stableCoins.usdc,
          );

          await checkAndRedeemUsycTest(
            {
              redemptionVaultWithUSYC: fixture.redemptionVaultWithUSYC,
              expectation: 'none',
            },
            fixture.mTokenLoan,
            parseUnits('100'),
          );
        });

        it('vault holds no USYC: nothing is obtained', async () => {
          const fixture = await loadFixture(defaultDeploy);
          await setupUsycRv(fixture, { usyc: 0 });

          await checkAndRedeemUsycTest(
            {
              redemptionVaultWithUSYC: fixture.redemptionVaultWithUSYC,
              expectation: 'none',
            },
            fixture.stableCoins.usdc,
            parseUnits('100', 8),
          );
        });

        it('teller has no redemption liquidity: nothing is obtained', async () => {
          const fixture = await loadFixture(defaultDeploy);
          await setupUsycRv(fixture);
          await limitTellerLiquidity(fixture, 0);

          await checkAndRedeemUsycTest(
            {
              redemptionVaultWithUSYC: fixture.redemptionVaultWithUSYC,
              expectation: 'none',
            },
            fixture.stableCoins.usdc,
            parseUnits('100', 8),
          );
        });

        it('teller liquidity is lower than the missing amount: all of it is redeemed', async () => {
          const fixture = await loadFixture(defaultDeploy);
          await setupUsycRv(fixture);
          await limitTellerLiquidity(fixture, parseUnits('300', 8));
          const { redemptionVaultWithUSYC, stableCoins } = fixture;

          const available = await usycLiquidityInTokenOut(
            redemptionVaultWithUSYC,
            stableCoins.usdc.address,
          );
          const result = await checkAndRedeemUsycTest(
            { redemptionVaultWithUSYC },
            stableCoins.usdc,
            parseUnits('500', 8),
          );

          expect(result!.obtained).eq(available.mul(parseUnits('1', 10)));
          expect(result!.obtained).lt(result!.missingBase18);
        });

        it('should fail: teller redeem reverts (the vault swallows it, the strategy does not)', async () => {
          const fixture = await loadFixture(defaultDeploy);
          await setupUsycRv(fixture);
          await fixture.usycTeller.setRedeemReverts(true);

          await checkAndRedeemUsycTest(
            { redemptionVaultWithUSYC: fixture.redemptionVaultWithUSYC },
            fixture.stableCoins.usdc,
            parseUnits('100', 8),
            { revertMessage: 'USYCTellerMock: redeem reverts' },
          );
        });

        it('should fail: radUSD DV is paused', async () => {
          const fixture = await loadFixture(defaultDeploy);
          await setupUsycRv(fixture);
          await pauseVault(
            { pauseManager: fixture.pauseManager, owner: fixture.owner },
            fixture.depositVaultMTokenLoan,
          );

          await checkAndRedeemUsycTest(
            { redemptionVaultWithUSYC: fixture.redemptionVaultWithUSYC },
            fixture.mTokenLoan,
            parseUnits('100'),
            {
              revertCustomError: {
                customErrorName: 'Paused',
                contract: fixture.depositVaultMTokenLoan,
              },
            },
          );
        });

        it('should fail: radUSD DV instant limit is exceeded', async () => {
          const fixture = await loadFixture(defaultDeploy);
          await setupUsycRv(fixture);
          await setInstantLimitConfigTest(
            { vault: fixture.depositVaultMTokenLoan, owner: fixture.owner },
            parseUnits('10'),
          );

          await checkAndRedeemUsycTest(
            { redemptionVaultWithUSYC: fixture.redemptionVaultWithUSYC },
            fixture.mTokenLoan,
            parseUnits('100'),
            {
              revertCustomError: {
                customErrorName: 'WindowLimitExceeded',
                contract: fixture.depositVaultMTokenLoan,
              },
            },
          );
        });

        it('should fail: redemption to radUSD when radUSD DV is paused (strategy failure is swallowed)', async () => {
          const fixture = await loadFixture(defaultDeploy);
          const { user } = await setupUsycRv(fixture);
          await pauseVault(
            { pauseManager: fixture.pauseManager, owner: fixture.owner },
            fixture.depositVaultMTokenLoan,
          );

          await redeemInstantWithUsycTest(
            commonParams(fixture),
            fixture.mTokenLoan,
            100,
            {
              from: user,
              revertMessage: 'ERC20: transfer amount exceeds balance',
            },
          );
        });
      });

      describe('interplay with the loan LP liquidity', () => {
        it('preferLoanLiquidity=false: USYC is used first, loan LP covers the rest', async () => {
          const fixture = await loadFixture(defaultDeploy);
          const { user } = await setupUsycRv(fixture);
          await setupLoanLp(fixture, 100_000);
          await limitTellerLiquidity(fixture, parseUnits('300', 8));
          const { mTokenLoan, loanLp, redemptionVaultWithUSYC } = fixture;
          const lpBefore = await mTokenLoan.balanceOf(loanLp.address);
          const loanRequestId =
            await redemptionVaultWithUSYC.currentLoanRequestId();

          // 100 mTBILL at 5$ = 500 USDC: ~300 via USYC, the rest via loan LP
          await redeemInstantWithUsycTest(
            commonParams(fixture),
            fixture.stableCoins.usdc,
            100,
            { from: user },
          );

          expect(await mTokenLoan.balanceOf(loanLp.address)).lt(lpBefore);
          expect(
            await usycLiquidityInTokenOut(
              fixture.redemptionVaultWithUSYC,
              fixture.stableCoins.usdc.address,
            ),
          ).lt(parseUnits('1', 8));

          // 495 USDC payout - 300 USDC from USYC = 195 USDC shortfall,
          // LP fee share is 5 * 195 / 495 truncated to 8 decimals
          const loanRequest = await redemptionVaultWithUSYC.loanRequests(
            loanRequestId,
          );
          expect(loanRequest.amountTokenOut).eq(parseUnits('195'));
          expect(loanRequest.amountFee).eq(parseUnits('1.96969696'));
        });

        it('preferLoanLiquidity=false: USYC covers only the payout and loan LP is untouched', async () => {
          const fixture = await loadFixture(defaultDeploy);
          const { user } = await setupUsycRv(fixture);
          await setupLoanLp(fixture, 100_000);
          const { mTokenLoan, loanLp, redemptionVaultWithUSYC } = fixture;
          const loanRequestId =
            await redemptionVaultWithUSYC.currentLoanRequestId();

          // 500 USDC total, 1% instant fee: USYC (price 1) covers the 495 USDC payout
          const result = await redeemInstantWithUsycTest(
            commonParams(fixture),
            fixture.stableCoins.usdc,
            100,
            { from: user },
          );

          expect(result!.usycUsed).eq(parseUnits('495', 8));
          expect(await redemptionVaultWithUSYC.currentLoanRequestId()).eq(
            loanRequestId,
          );
          expect(await mTokenLoan.balanceOf(loanLp.address)).eq(
            parseUnits('100000'),
          );
        });

        it('fee rate mismatch: USYC is skipped and loan LP covers everything', async () => {
          const fixture = await loadFixture(defaultDeploy);
          const { user } = await setupUsycRv(fixture);
          await setupLoanLp(fixture, 100_000);
          await fixture.usycTeller.setFeeRates(0, parseUnits('3'));
          const { mTokenLoan, loanLp } = fixture;
          const lpBefore = await mTokenLoan.balanceOf(loanLp.address);

          await redeemInstantWithUsycTest(
            { ...commonParams(fixture), expectUsycUsed: false },
            fixture.stableCoins.usdc,
            100,
            { from: user },
          );

          expect(await mTokenLoan.balanceOf(loanLp.address)).lt(lpBefore);
        });

        it('teller fee exceeds the max fee: USYC is skipped and loan LP covers everything', async () => {
          const fixture = await loadFixture(defaultDeploy);
          const { user } = await setupUsycRv(fixture);
          await setupLoanLp(fixture, 100_000);
          // reported rate 0 equals the anticipated one, 1% is charged anyway
          await fixture.usycTeller.setFeeRatePremium(parseUnits('1'));
          await fixture.usycTeller.setFreeTierThreshold(0);
          const { mTokenLoan, loanLp } = fixture;
          const lpBefore = await mTokenLoan.balanceOf(loanLp.address);

          await redeemInstantWithUsycTest(
            { ...commonParams(fixture), expectUsycUsed: false },
            fixture.stableCoins.usdc,
            100,
            { from: user },
          );

          expect(await mTokenLoan.balanceOf(loanLp.address)).lt(lpBefore);
        });

        it('preferLoanLiquidity=true: loan LP is used first, USYC covers the rest', async () => {
          const fixture = await loadFixture(defaultDeploy);
          const { user } = await setupUsycRv(fixture);
          await setupLoanLp(fixture, 300);
          await setPreferLoanLiquidityTest(
            {
              redemptionVault: fixture.redemptionVaultWithUSYC,
              owner: fixture.owner,
            },
            true,
          );
          const loanRequestId =
            await fixture.redemptionVaultWithUSYC.currentLoanRequestId();

          const result = await redeemInstantWithUsycTest(
            commonParams(fixture),
            fixture.stableCoins.usdc,
            100,
            { from: user },
          );

          // the LP share of the vault fee stays with the LP, so it is not fully drained
          expect(await fixture.mTokenLoan.balanceOf(fixture.loanLp.address)).lt(
            parseUnits('300'),
          );

          // LP gross 300 incl. 3 fee share: 297 USDC cash, USYC covers 495 - 297
          const loanRequest =
            await fixture.redemptionVaultWithUSYC.loanRequests(loanRequestId);
          expect(loanRequest.amountTokenOut).eq(parseUnits('297'));
          expect(loanRequest.amountFee).eq(parseUnits('3'));
          expect(result!.usycUsed).eq(parseUnits('198', 8));
        });

        it('preferLoanLiquidity=true and loan LP covers the payout: USYC is not used for the vault fee', async () => {
          const fixture = await loadFixture(defaultDeploy);
          const { user } = await setupUsycRv(fixture);
          await setupLoanLp(fixture, 100_000);
          await setPreferLoanLiquidityTest(
            {
              redemptionVault: fixture.redemptionVaultWithUSYC,
              owner: fixture.owner,
            },
            true,
          );

          // 500 USDC total, 1% instant fee: the loan LP pays the 495 USDC net
          // and the 5 USDC fee is not materialised from USYC
          const result = await redeemInstantWithUsycTest(
            { ...commonParams(fixture), expectUsycUsed: false },
            fixture.stableCoins.usdc,
            100,
            { from: user },
          );
          expect(result!.usycUsed).eq(0);
        });

        it('preferLoanLiquidity=false and vault has the payout but not the payout + fee: USYC and loan LP are not used', async () => {
          const fixture = await loadFixture(defaultDeploy);
          const { user } = await setupUsycRv(fixture);
          await setupLoanLp(fixture, 100_000);
          const { mTokenLoan, loanLp, redemptionVaultWithUSYC, stableCoins } =
            fixture;

          // 500 USDC total, 1% instant fee: the 495 USDC payout is on the vault
          await mintToken(stableCoins.usdc, redemptionVaultWithUSYC, 495);
          const loanRequestId =
            await redemptionVaultWithUSYC.currentLoanRequestId();

          const result = await redeemInstantWithUsycTest(
            { ...commonParams(fixture), expectUsycUsed: false },
            stableCoins.usdc,
            100,
            { from: user },
          );

          expect(result!.usycUsed).eq(0);
          expect(await redemptionVaultWithUSYC.currentLoanRequestId()).eq(
            loanRequestId,
          );
          expect(await mTokenLoan.balanceOf(loanLp.address)).eq(
            parseUnits('100000'),
          );
          expect(
            await stableCoins.usdc.balanceOf(redemptionVaultWithUSYC.address),
          ).eq(0);
        });

        it('preferLoanLiquidity=true, loan LP covers everything and 0 fee: USYC is not used', async () => {
          const fixture = await loadFixture(defaultDeploy);
          const { user } = await setupUsycRv(fixture);
          await setupLoanLp(fixture, 100_000);
          await setInstantFeeTest(
            { vault: fixture.redemptionVaultWithUSYC, owner: fixture.owner },
            0,
          );
          await setPreferLoanLiquidityTest(
            {
              redemptionVault: fixture.redemptionVaultWithUSYC,
              owner: fixture.owner,
            },
            true,
          );

          await redeemInstantWithUsycTest(
            { ...commonParams(fixture), expectUsycUsed: false },
            fixture.stableCoins.usdc,
            100,
            { from: user },
          );
        });
      });

      describe('Teller charging fees', () => {
        const setupChargingTeller = async (fixture: DefaultFixture) => {
          const setup = await setupTightUsycRv(fixture);
          await setup.teller.setFeeRates(0, parseUnits('3'));
          await setup.teller.setFreeTierThreshold(0);
          await setUsycAnticipatedFeeRatesTest(fixture, 0, parseUnits('3'));
          return setup;
        };

        it('free tier partially used: average fee below the anticipated rate, USYC is redeemed', async () => {
          const fixture = await loadFixture(defaultDeploy);
          const { user, usdc, teller } = await setupChargingTeller(fixture);
          // ~half of the redeemed value is fee-free
          await teller.setFreeTierThreshold(parseUnits('50', 6));

          const [shares] = await teller.previewWithdrawData(
            fixture.redemptionVaultWithUSYC.address,
            parseUnits('100', 6),
          );
          const [net, fee] = await teller.previewRedeemData(
            fixture.redemptionVaultWithUSYC.address,
            shares,
          );
          expect(fee).gt(0);
          // the average fee is below the 3% anticipated rate
          expect(fee).lt(usycMaxFee(net.add(fee), parseUnits('3')));

          await redeemInstantWithUsycTest(commonParams(fixture), usdc, 100, {
            from: user,
          });
        });

        it('redeem several amounts to USDC and radUSD: redemption fee is covered by redeeming more USYC', async () => {
          const fixture = await loadFixture(defaultDeploy);
          const { user, usdc } = await setupChargingTeller(fixture);

          for (const token of [usdc, fixture.mTokenLoan]) {
            for (const amount of [1.333333, 17.777777, 99.999999]) {
              await redeemInstantWithUsycTest(
                commonParams(fixture),
                token,
                amount,
                { from: user },
              );
            }
          }
        });

        it('obtained USDC covers the missing amount net of fee without over-redeeming (direct strategy call)', async () => {
          const fixture = await loadFixture(defaultDeploy);
          const { usdc, teller } = await setupChargingTeller(fixture);

          for (const amount of ['1.333333', '17.777777', '99.999999']) {
            const missing = parseUnits(amount, 6);
            const [sharesNeeded, fee] = await teller.previewWithdrawData(
              fixture.redemptionVaultWithUSYC.address,
              missing,
            );
            expect(fee).gt(0);

            const result = await checkAndRedeemUsycTest(
              { redemptionVaultWithUSYC: fixture.redemptionVaultWithUSYC },
              usdc,
              missing,
            );
            const { obtained, missingBase18, usycUsed } = result!;

            expect(usycUsed).eq(sharesNeeded);
            expect(obtained).gte(missingBase18);
            expect(obtained.sub(missingBase18)).lte(MAX_COVERING_EXCESS_USDC6);
          }
        });

        describe('redemption fee rate overridden for the vault', () => {
          /**
           * Teller default rates are 4% / 3%, the vault itself is charged
           * the overridden redemption fee rate and anticipates
           * `anticipatedRate`. The paired deposit vault anticipates the
           * default subscription fee rate
           */
          const setupOverride = async (
            fixture: DefaultFixture,
            overrideRate: string,
            anticipatedRate: string,
          ) => {
            const { redemptionVaultWithUSYC } = fixture;
            const setup = await setupTightUsycRv(fixture);
            const { teller } = setup;
            await teller.setFeeRates(parseUnits('4'), parseUnits('3'));
            await teller.setFreeTierThreshold(0);
            await setUsycAnticipatedFeeRatesTest(
              fixture,
              parseUnits('4'),
              parseUnits(anticipatedRate),
            );
            // the subscription fee rate of the vault is never charged
            await teller.setFeeRatesOverride(
              redemptionVaultWithUSYC.address,
              parseUnits('9'),
              parseUnits(overrideRate),
            );

            // the default rate is not affected by the override
            expect(await teller.redemptionFeeRate(constants.AddressZero)).eq(
              parseUnits('3'),
            );
            expect(
              await teller.redemptionFeeRate(redemptionVaultWithUSYC.address),
            ).eq(parseUnits(overrideRate));

            return setup;
          };

          /** fee the Teller takes when 100 USDC is missing */
          const previewFee = async (
            fixture: DefaultFixture,
            teller: Awaited<ReturnType<typeof setupTightUsycRv>>['teller'],
          ) => {
            const [shares] = await teller.previewWithdrawData(
              fixture.redemptionVaultWithUSYC.address,
              parseUnits('100', 6),
            );
            const [net, fee] = await teller.previewRedeemData(
              fixture.redemptionVaultWithUSYC.address,
              shares,
            );
            return { shares, fee, gross: net.add(fee) };
          };

          it('override is 0 and is anticipated: no fee is charged, USYC is redeemed', async () => {
            const fixture = await loadFixture(defaultDeploy);
            const { user, usdc, teller } = await setupOverride(
              fixture,
              '0',
              '0',
            );

            const { shares, fee } = await previewFee(fixture, teller);
            expect(fee).eq(0);

            const result = await checkAndRedeemUsycTest(
              { redemptionVaultWithUSYC: fixture.redemptionVaultWithUSYC },
              usdc,
              parseUnits('100', 6),
            );
            expect(result!.usycUsed).eq(shares);

            await redeemInstantWithUsycTest(commonParams(fixture), usdc, 100, {
              from: user,
            });
          });

          it('override is lower than the default rate and is anticipated: lower fee is charged, USYC is redeemed', async () => {
            const fixture = await loadFixture(defaultDeploy);
            const { user, usdc, teller } = await setupOverride(
              fixture,
              '1',
              '1',
            );

            const { shares, fee, gross } = await previewFee(fixture, teller);
            expect(fee).gt(0);
            expect(fee).lte(usycMaxFee(gross, parseUnits('1')));
            expect(fee).lt(usycMaxFee(gross, parseUnits('3')));

            const result = await checkAndRedeemUsycTest(
              { redemptionVaultWithUSYC: fixture.redemptionVaultWithUSYC },
              usdc,
              parseUnits('100', 6),
            );
            expect(result!.usycUsed).eq(shares);

            await redeemInstantWithUsycTest(commonParams(fixture), usdc, 100, {
              from: user,
            });
          });

          it('override is higher than the default rate and is anticipated: higher fee is charged, USYC is redeemed', async () => {
            const fixture = await loadFixture(defaultDeploy);
            const { user, usdc, teller } = await setupOverride(
              fixture,
              '5',
              '5',
            );

            const { shares, fee, gross } = await previewFee(fixture, teller);
            expect(fee).gt(usycMaxFee(gross, parseUnits('3')));
            expect(fee).lte(usycMaxFee(gross, parseUnits('5')));

            const result = await checkAndRedeemUsycTest(
              { redemptionVaultWithUSYC: fixture.redemptionVaultWithUSYC },
              usdc,
              parseUnits('100', 6),
            );
            expect(result!.usycUsed).eq(shares);

            await redeemInstantWithUsycTest(commonParams(fixture), usdc, 100, {
              from: user,
            });
          });

          for (const overrideRate of ['0', '1', '5']) {
            it(`override is ${overrideRate}% but the default rate is anticipated: nothing is obtained`, async () => {
              const fixture = await loadFixture(defaultDeploy);
              const { usdc } = await setupOverride(fixture, overrideRate, '3');

              for (const token of [usdc, fixture.mTokenLoan]) {
                await checkAndRedeemUsycTest(
                  {
                    redemptionVaultWithUSYC: fixture.redemptionVaultWithUSYC,
                    expectation: 'none',
                  },
                  token,
                  parseUnits('100', await token.decimals()),
                );
              }
            });
          }
        });
      });

      describe('Teller fee rates validation', () => {
        /**
         * The vault anticipates a 3% redemption fee rate and its paired
         * deposit vault a 4% subscription fee rate, every scenario is run
         * with each source of liquidity the vault can pay the redemption from
         */
        type FeeScenario = {
          title: string;
          /** Teller default subscription / redemption rates, in % */
          tellerRates: readonly [string, string];
          /** rates overridden for the vault, in % */
          override?: readonly [string, string];
          /** rates overridden for the paired deposit vault, in % */
          pairedOverride?: readonly [string, string];
          /** subscription fee rate the paired vault anticipates, in % */
          pairedAnticipatedRate?: string;
          /** the vault has no paired deposit vault */
          unpaired?: boolean;
          /** added to the rates the Teller charges but not reports, in % */
          premium?: string;
          /** free tier is exhausted, so the Teller charges its fees */
          chargeFees?: boolean;
          /** whether the USYC strategy can be used */
          usycUsable: boolean;
        };

        const feeScenarios: FeeScenario[] = [
          {
            title: 'Teller fee rates equal the anticipated ones',
            tellerRates: ['4', '3'],
            chargeFees: true,
            usycUsable: true,
          },
          {
            title: 'Teller redemption fee rate differs',
            tellerRates: ['4', '2'],
            usycUsable: false,
          },
          {
            title: 'Teller subscription fee rate differs',
            tellerRates: ['5', '3'],
            usycUsable: false,
          },
          {
            title: 'both Teller fee rates differ',
            tellerRates: ['5', '2'],
            usycUsable: false,
          },
          {
            title: 'Teller subscription fee rate is 0',
            tellerRates: ['0', '3'],
            usycUsable: false,
          },
          {
            title: 'vault redemption fee rate override is 0',
            tellerRates: ['4', '3'],
            override: ['4', '0'],
            chargeFees: true,
            usycUsable: false,
          },
          {
            title:
              'vault redemption fee rate override is lower than the anticipated rate and the redemption is under the free tier',
            tellerRates: ['4', '3'],
            override: ['4', '1'],
            usycUsable: false,
          },
          {
            title:
              'vault redemption fee rate override is higher than the anticipated rate',
            tellerRates: ['4', '3'],
            override: ['4', '5'],
            chargeFees: true,
            usycUsable: false,
          },
          {
            title:
              'vault redemption fee rate override equals the anticipated rate but the default rate differs',
            tellerRates: ['4', '5'],
            override: ['4', '3'],
            chargeFees: true,
            usycUsable: true,
          },
          {
            title: 'only the vault subscription fee rate override differs',
            tellerRates: ['4', '3'],
            override: ['9', '3'],
            chargeFees: true,
            usycUsable: true,
          },
          {
            title:
              'paired vault subscription fee rate override differs from its anticipated rate',
            tellerRates: ['4', '3'],
            pairedOverride: ['5', '3'],
            usycUsable: false,
          },
          {
            title:
              'paired vault subscription fee rate override equals its anticipated rate but the default rate differs',
            tellerRates: ['5', '3'],
            pairedOverride: ['4', '3'],
            chargeFees: true,
            usycUsable: true,
          },
          {
            title: 'only the paired vault redemption fee rate override differs',
            tellerRates: ['4', '3'],
            pairedOverride: ['4', '9'],
            chargeFees: true,
            usycUsable: true,
          },
          {
            title: 'paired vault anticipates another subscription fee rate',
            tellerRates: ['4', '3'],
            pairedAnticipatedRate: '5',
            usycUsable: false,
          },
          {
            title:
              'Teller subscription fee rate differs but the vault is not paired',
            tellerRates: ['5', '3'],
            unpaired: true,
            chargeFees: true,
            usycUsable: true,
          },
          {
            title:
              'Teller charges more than the redemption fee rate it reports',
            tellerRates: ['4', '3'],
            premium: '1',
            chargeFees: true,
            usycUsable: false,
          },
        ];

        const liquidityModes = [
          'vault holds enough USDC',
          'USYC is the only liquidity',
          'loan LP is available',
        ] as const;

        for (const scenario of feeScenarios) {
          for (const mode of liquidityModes) {
            const shouldFail =
              mode === 'USYC is the only liquidity' && !scenario.usycUsable;
            const usycUsed =
              mode !== 'vault holds enough USDC' && scenario.usycUsable;
            const outcome =
              mode === 'vault holds enough USDC'
                ? 'USYC is not needed, fee rates are not checked'
                : usycUsed
                ? 'USYC is redeemed'
                : 'USYC is skipped and loan LP covers everything';

            it(`${shouldFail ? 'should fail: ' : ''}${scenario.title}, ${mode}${
              shouldFail ? '' : `: ${outcome}`
            }`, async () => {
              const fixture = await loadFixture(defaultDeploy);
              const {
                owner,
                depositVaultWithUSYC,
                redemptionVaultWithUSYC,
                usycTeller,
                stableCoins,
                mTokenLoan,
                loanLp,
              } = fixture;
              const { user } = await setupUsycRv(fixture);
              if (mode === 'vault holds enough USDC') {
                await mintToken(
                  stableCoins.usdc,
                  redemptionVaultWithUSYC,
                  100_000,
                );
              }
              if (mode === 'loan LP is available') {
                await setupLoanLp(fixture, 100_000);
              }
              if (scenario.unpaired) {
                await setUsycDepositVaultPairedTest(
                  { redemptionVaultWithUSYC, owner },
                  constants.AddressZero,
                );
              }
              await setUsycAnticipatedFeeRatesTest(
                fixture,
                parseUnits(scenario.pairedAnticipatedRate ?? '4'),
                parseUnits('3'),
              );

              await usycTeller.setFeeRates(
                parseUnits(scenario.tellerRates[0]),
                parseUnits(scenario.tellerRates[1]),
              );
              if (scenario.chargeFees) {
                await usycTeller.setFreeTierThreshold(0);
              }
              if (scenario.premium) {
                await usycTeller.setFeeRatePremium(
                  parseUnits(scenario.premium),
                );
              }
              if (scenario.override) {
                await usycTeller.setFeeRatesOverride(
                  redemptionVaultWithUSYC.address,
                  parseUnits(scenario.override[0]),
                  parseUnits(scenario.override[1]),
                );
              }
              if (scenario.pairedOverride) {
                await usycTeller.setFeeRatesOverride(
                  depositVaultWithUSYC.address,
                  parseUnits(scenario.pairedOverride[0]),
                  parseUnits(scenario.pairedOverride[1]),
                );
              }

              // the rates the Teller reports for each vault are the
              // overridden ones, or the default ones without an override
              expect(
                await usycTeller.redemptionFeeRate(
                  redemptionVaultWithUSYC.address,
                ),
              ).eq(
                parseUnits(scenario.override?.[1] ?? scenario.tellerRates[1]),
              );
              expect(
                await usycTeller.subscriptionFeeRate(
                  depositVaultWithUSYC.address,
                ),
              ).eq(
                parseUnits(
                  scenario.pairedOverride?.[0] ?? scenario.tellerRates[0],
                ),
              );

              const lpBefore = await mTokenLoan.balanceOf(loanLp.address);

              await redeemInstantWithUsycTest(
                { ...commonParams(fixture), expectUsycUsed: usycUsed },
                stableCoins.usdc,
                100,
                {
                  from: user,
                  ...(shouldFail && {
                    revertMessage: 'ERC20: transfer amount exceeds balance',
                  }),
                },
              );

              const lpAfter = await mTokenLoan.balanceOf(loanLp.address);
              if (mode === 'loan LP is available' && !scenario.usycUsable) {
                expect(lpAfter).lt(lpBefore);
              } else {
                expect(lpAfter).eq(lpBefore);
              }
            });
          }
        }

        describe('paired vault does not report an anticipated fee rate', () => {
          const setupNotUsycPairedVault = async (fixture: DefaultFixture) => {
            const { owner, redemptionVaultWithUSYC, depositVaultMTokenLoan } =
              fixture;
            const setup = await setupUsycRv(fixture);
            // the mToken deposit vault is not a USYC vault
            await setUsycDepositVaultPairedTest(
              { redemptionVaultWithUSYC, owner },
              depositVaultMTokenLoan.address,
            );
            return setup;
          };

          it('should fail: direct strategy call reverts', async () => {
            const fixture = await loadFixture(defaultDeploy);
            await setupNotUsycPairedVault(fixture);

            await expect(
              fixture.redemptionVaultWithUSYC.checkAndRedeemUSYC(
                fixture.stableCoins.usdc.address,
                parseUnits('100', 8),
              ),
            ).to.be.revertedWithoutReason();
          });

          it('should fail: USYC is the only liquidity, the strategy failure is caught and USYC is not used', async () => {
            const fixture = await loadFixture(defaultDeploy);
            const { user } = await setupNotUsycPairedVault(fixture);

            await redeemInstantWithUsycTest(
              commonParams(fixture),
              fixture.stableCoins.usdc,
              100,
              {
                from: user,
                revertMessage: 'ERC20: transfer amount exceeds balance',
              },
            );
          });
        });
      });

      describe('admin setters', () => {
        const setterCases = [
          {
            fn: 'setUsycTeller',
            event: 'SetUsycTeller',
            getter: 'usycTeller',
            value: (f: DefaultFixture) => f.regularAccounts[5].address,
          },
          {
            fn: 'setDepositVault',
            event: 'SetDepositVault',
            getter: 'depositVault',
            value: (f: DefaultFixture) => f.regularAccounts[5].address,
          },
          {
            fn: 'setDepositVaultPaired',
            event: 'SetDepositVaultPaired',
            getter: 'depositVaultPaired',
            value: (f: DefaultFixture) => f.regularAccounts[5].address,
          },
          {
            fn: 'setAnticipatedFeeRate',
            event: 'SetAnticipatedFeeRate',
            getter: 'anticipatedFeeRate',
            value: () => parseUnits('3'),
          },
        ] as const;

        it('anticipated fee rate and paired vault can be set back to 0', async () => {
          const fixture = await loadFixture(defaultDeploy);
          const vault = {
            vault: fixture.redemptionVaultWithUSYC,
            owner: fixture.owner,
          };
          await usycSetterTest(
            vault,
            'setAnticipatedFeeRate',
            'SetAnticipatedFeeRate',
            'anticipatedFeeRate',
            parseUnits('3'),
          );
          await usycSetterTest(
            vault,
            'setAnticipatedFeeRate',
            'SetAnticipatedFeeRate',
            'anticipatedFeeRate',
            0,
          );
          await setUsycDepositVaultPairedTest(
            {
              redemptionVaultWithUSYC: fixture.redemptionVaultWithUSYC,
              owner: fixture.owner,
            },
            constants.AddressZero,
          );
        });

        for (const { fn, event, getter, value } of setterCases) {
          describe(`${fn}()`, () => {
            it('should fail: call from address without vault admin role', async () => {
              const fixture = await loadFixture(defaultDeploy);
              await usycSetterTest(
                {
                  vault: fixture.redemptionVaultWithUSYC,
                  owner: fixture.owner,
                },
                fn,
                event,
                getter,
                value(fixture),
                {
                  from: fixture.regularAccounts[0],
                  revertCustomError: acErrors.WMAC_HASNT_PERMISSION(),
                },
              );
            });

            it('call from address with vault admin role', async () => {
              const fixture = await loadFixture(defaultDeploy);
              await usycSetterTest(
                {
                  vault: fixture.redemptionVaultWithUSYC,
                  owner: fixture.owner,
                },
                fn,
                event,
                getter,
                value(fixture),
              );
            });
          });
        }

        it('should fail: setUsycTeller to zero address', async () => {
          const fixture = await loadFixture(defaultDeploy);
          await usycSetterTest(
            { vault: fixture.redemptionVaultWithUSYC, owner: fixture.owner },
            'setUsycTeller',
            'SetUsycTeller',
            'usycTeller',
            constants.AddressZero,
            {
              revertCustomError: {
                customErrorName: 'InvalidAddress',
                args: [constants.AddressZero],
              },
            },
          );
        });

        it('should fail: setUsycTeller to the vault itself', async () => {
          const fixture = await loadFixture(defaultDeploy);
          const { redemptionVaultWithUSYC, owner } = fixture;
          await usycSetterTest(
            { vault: redemptionVaultWithUSYC, owner },
            'setUsycTeller',
            'SetUsycTeller',
            'usycTeller',
            redemptionVaultWithUSYC.address,
            {
              revertCustomError: {
                customErrorName: 'InvalidAddress',
                args: [redemptionVaultWithUSYC.address],
              },
            },
          );
        });
      });
    });
  },
);
