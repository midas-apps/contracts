import { loadFixture } from '@nomicfoundation/hardhat-network-helpers';
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { expect } from 'chai';
import { constants } from 'ethers';
import { parseUnits } from 'ethers/lib/utils';

import {
  baseInitParamsDv,
  depositVaultSuits,
} from './suits/deposit-vault.suits';

import {
  DepositVaultWithUSYC__factory,
  DepositVaultWithUSYCTest__factory,
  ERC20Mock__factory,
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
import {
  depositInstantWithUsycTest,
  depositRequestWithUsycTest,
  setAutoInvestFallbackEnabledUsycTest,
  setUsycDepositsEnabledTest,
  toDepositAmountBase18,
} from '../common/deposit-vault-usyc.helpers';
import { DefaultFixture, defaultDeploy } from '../common/fixtures';
import {
  addPaymentTokenTest,
  removePaymentTokenTest,
  setInstantFeeTest,
  setInstantLimitConfigTest,
  setMinAmountTest,
} from '../common/manageable-vault.helpers';
import {
  setUsycAnticipatedFeeRatesTest,
  usycMaxFee,
  usycSetterTest,
} from '../common/usyc-common.helpers';
import {
  initializeDvWithUsyc,
  InitializerParamsDvWithUsyc,
} from '../common/vault-initializer.helpers';

const NOT_ROUND_MINT_PRICE = parseUnits('1.142435462021293868');
const NOT_ROUND_REDEEM_PRICE = parseUnits('1.142315458569453803');

const baseInitParamsDvWithUsyc = (
  fixture: Parameters<typeof baseInitParamsDv>[0],
): InitializerParamsDvWithUsyc => ({
  ...baseInitParamsDv(fixture),
  usycTeller: fixture.usycTeller,
  usycRedemptionVault: fixture.redemptionVaultLoanSwapper,
});

const dvWithUsycInitializeParamCases: InitializeParamCase<InitializerParamsDvWithUsyc>[] =
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
      contract: (fixture) =>
        new DepositVaultWithUSYCTest__factory(fixture.owner).deploy(),
      params: (_, contract) => ({ usycTeller: contract!.address }),
      revertCustomError: {
        customErrorName: 'InvalidAddress',
        args: (_, contract) => [contract!.address],
      },
    },
  ];

/**
 * Common setup: auto-invest enabled, USDC (8 decimals) and mTokenLoan (radUSD)
 * accepted as payment tokens, radUSD RV able to pay USDC out
 */
const setupUsycDv = async (
  fixture: DefaultFixture,
  { enable = true }: { enable?: boolean } = {},
) => {
  const {
    owner,
    depositVaultWithUSYC,
    redemptionVaultLoanSwapper,
    stableCoins,
    dataFeed,
    mTokenLoan,
    mTokenLoanToUsdDataFeed,
    mockedAggregator,
  } = fixture;

  // USDC at exactly 1$ so the stable flag and the feed agree
  await mockedAggregator.setRoundData(
    parseUnits('1', await mockedAggregator.decimals()),
  );

  if (enable) {
    await setUsycDepositsEnabledTest({ depositVaultWithUSYC, owner }, true);
  }

  await addPaymentTokenTest(
    { vault: depositVaultWithUSYC, owner },
    stableCoins.usdc,
    dataFeed.address,
    0,
    true,
  );
  await addPaymentTokenTest(
    { vault: depositVaultWithUSYC, owner },
    mTokenLoan,
    mTokenLoanToUsdDataFeed.address,
    0,
    true,
  );
  await setMinAmountTest({ vault: depositVaultWithUSYC, owner }, 10);

  // radUSD RV pays USDC out
  await addPaymentTokenTest(
    { vault: redemptionVaultLoanSwapper, owner },
    stableCoins.usdc,
    dataFeed.address,
    0,
    true,
  );
  await mintToken(stableCoins.usdc, redemptionVaultLoanSwapper, 1_000_000);
};

/**
 * 6-decimal setup: the vault is switched to a new Teller whose asset is a
 * 6-decimal USDC and share a 6-decimal USYC with a non-round USYC price, and
 * the radUSD RV pays that USDC out. The original (8-decimal) Teller stays
 * deployed but unused.
 */
const setupUsdc6UsycDv = async (fixture: DefaultFixture) => {
  const {
    owner,
    depositVaultWithUSYC,
    redemptionVaultLoanSwapper,
    stableCoins,
    dataFeed,
  } = fixture;
  await setupUsycDv(fixture);

  const usdc = stableCoins.usdc6;
  const usyc = await new ERC20Mock__factory(owner).deploy(6);
  const teller = await new USYCTellerMock__factory(owner).deploy(
    usdc.address,
    usyc.address,
    constants.AddressZero,
    constants.AddressZero,
  );
  await teller.setPrices(NOT_ROUND_MINT_PRICE, NOT_ROUND_REDEEM_PRICE);
  await usycSetterTest(
    { vault: depositVaultWithUSYC, owner },
    'setUsycTeller',
    'SetUsycTeller',
    'usycTeller',
    teller.address,
  );

  await addPaymentTokenTest(
    { vault: depositVaultWithUSYC, owner },
    usdc,
    dataFeed.address,
    0,
    true,
  );
  await addPaymentTokenTest(
    { vault: redemptionVaultLoanSwapper, owner },
    usdc,
    dataFeed.address,
    0,
    true,
  );
  await mintToken(usdc, redemptionVaultLoanSwapper, 1_000_000);

  return { usdc, teller };
};

const usycDvParams = (fixture: DefaultFixture) => ({
  depositVaultWithUSYC: fixture.depositVaultWithUSYC,
  owner: fixture.owner,
  mTBILL: fixture.mTBILL,
  mTokenToUsdDataFeed: fixture.mTokenToUsdDataFeed,
});

/** `AutoInvestFailed` wrapping the `FeesNotMatched` error of the vault */
const feesNotMatchedError = (fixture: DefaultFixture) => ({
  customErrorName: 'AutoInvestFailed',
  args: [
    fixture.depositVaultWithUSYC.interface.encodeErrorResult('FeesNotMatched'),
  ],
});

const fundUser = async (
  fixture: DefaultFixture,
  token: Parameters<typeof mintToken>[0],
  amount: number,
) => {
  const user = fixture.regularAccounts[0];
  await mintToken(token, user, amount);
  await approveBase18(user, token, fixture.depositVaultWithUSYC, amount);
  return user;
};

depositVaultSuits(
  'DepositVaultWithUSYC',
  defaultDeploy,
  {
    createNew: async (owner: SignerWithAddress) =>
      new DepositVaultWithUSYCTest__factory(owner).deploy(),
    key: 'depositVaultWithUSYC',
  },
  async (fixture) => {
    const { depositVaultWithUSYC, usycTeller, redemptionVaultLoanSwapper } =
      fixture;
    expect(await depositVaultWithUSYC.usycTeller()).eq(usycTeller.address);
    expect(await depositVaultWithUSYC.redemptionVault()).eq(
      redemptionVaultLoanSwapper.address,
    );
    expect(await depositVaultWithUSYC.redemptionVaultPaired()).eq(
      fixture.redemptionVaultWithUSYC.address,
    );
    expect(await depositVaultWithUSYC.anticipatedFeeRate()).eq(0);
    expect(await depositVaultWithUSYC.usycDepositsEnabled()).eq(false);
    expect(await depositVaultWithUSYC.autoInvestFallbackEnabled()).eq(false);
    await validateImplementation(DepositVaultWithUSYC__factory);
  },
  {
    deployUninitialized: (fixture) =>
      new DepositVaultWithUSYCTest__factory(fixture.owner).deploy(),
    initialize: async (fixture, params, opt) => {
      await initializeDvWithUsyc(
        { ...baseInitParamsDvWithUsyc(fixture), ...params },
        opt?.contract,
        opt,
      );
    },
    extraParamCases: dvWithUsycInitializeParamCases,
  },
  async (defaultDeploy) => {
    describe('DepositVaultWithUSYC', function () {
      describe('initialize()', () => {
        it('stores the mToken and the paired redemption vaults and the anticipated fee rate', async () => {
          const fixture = await loadFixture(defaultDeploy);
          const vault = await initializeDvWithUsyc({
            ...baseInitParamsDvWithUsyc(fixture),
            usycRedemptionVault: fixture.redemptionVaultLoanSwapper,
            usycRedemptionVaultPaired: fixture.redemptionVaultWithUSYC,
            anticipatedFeeRate: parseUnits('4'),
          });

          expect(await vault.redemptionVault()).eq(
            fixture.redemptionVaultLoanSwapper.address,
          );
          expect(await vault.redemptionVaultPaired()).eq(
            fixture.redemptionVaultWithUSYC.address,
          );
          expect(await vault.anticipatedFeeRate()).eq(parseUnits('4'));
        });

        it('paired redemption vault is optional', async () => {
          const fixture = await loadFixture(defaultDeploy);
          const vault = await initializeDvWithUsyc(
            baseInitParamsDvWithUsyc(fixture),
          );

          expect(await vault.redemptionVaultPaired()).eq(constants.AddressZero);
        });
      });

      describe('depositInstant()', () => {
        it('when usycDepositsEnabled is false, tokenIn goes to tokensReceiver', async () => {
          const fixture = await loadFixture(defaultDeploy);
          const { owner, depositVaultWithUSYC, stableCoins, mTBILL } = fixture;
          await setupUsycDv(fixture, { enable: false });
          const user = await fundUser(fixture, stableCoins.usdc, 100);

          await depositInstantWithUsycTest(
            {
              depositVaultWithUSYC,
              owner,
              mTBILL,
              mTokenToUsdDataFeed: fixture.mTokenToUsdDataFeed,
              expectation: 'disabled',
            },
            stableCoins.usdc,
            100,
            { from: user },
          );
        });

        it('deposit 100 USDC: USDC is invested into USYC and USYC goes to tokensReceiver', async () => {
          const fixture = await loadFixture(defaultDeploy);
          const { owner, depositVaultWithUSYC, stableCoins, mTBILL } = fixture;
          await setupUsycDv(fixture);
          const user = await fundUser(fixture, stableCoins.usdc, 100);

          await depositInstantWithUsycTest(
            {
              depositVaultWithUSYC,
              owner,
              mTBILL,
              mTokenToUsdDataFeed: fixture.mTokenToUsdDataFeed,
            },
            stableCoins.usdc,
            100,
            { from: user },
          );
        });

        it('deposit 100 USDC when USYC price is not round (1.142435462021293868)', async () => {
          const fixture = await loadFixture(defaultDeploy);
          const {
            owner,
            depositVaultWithUSYC,
            stableCoins,
            mTBILL,
            usycTeller,
          } = fixture;
          await setupUsycDv(fixture);
          await usycTeller.setPrices(
            NOT_ROUND_MINT_PRICE,
            NOT_ROUND_REDEEM_PRICE,
          );
          const user = await fundUser(fixture, stableCoins.usdc, 100);

          await depositInstantWithUsycTest(
            {
              depositVaultWithUSYC,
              owner,
              mTBILL,
              mTokenToUsdDataFeed: fixture.mTokenToUsdDataFeed,
            },
            stableCoins.usdc,
            100,
            { from: user },
          );
        });

        it('deposit 100 radUSD (mToken): radUSD is redeemed to USDC, USDC invested into USYC', async () => {
          const fixture = await loadFixture(defaultDeploy);
          const { owner, depositVaultWithUSYC, mTokenLoan, mTBILL } = fixture;
          await setupUsycDv(fixture);
          const user = await fundUser(fixture, mTokenLoan, 100);

          await depositInstantWithUsycTest(
            {
              depositVaultWithUSYC,
              owner,
              mTBILL,
              mTokenToUsdDataFeed: fixture.mTokenToUsdDataFeed,
              // 100 radUSD at 1$ -> 100 USDC (8 decimals)
              expectedUsdcInvested: parseUnits('100', 8),
            },
            mTokenLoan,
            100,
            { from: user },
          );
        });

        it('deposit 100 radUSD when radUSD price is 1.0000013$ and USYC price is not round', async () => {
          const fixture = await loadFixture(defaultDeploy);
          const {
            owner,
            depositVaultWithUSYC,
            mTokenLoan,
            mTBILL,
            usycTeller,
            mockedAggregatorMTokenLoan,
          } = fixture;
          await setupUsycDv(fixture);
          await mockedAggregatorMTokenLoan.setRoundData(
            parseUnits(
              '1.0000013',
              await mockedAggregatorMTokenLoan.decimals(),
            ),
          );
          await usycTeller.setPrices(
            NOT_ROUND_MINT_PRICE,
            NOT_ROUND_REDEEM_PRICE,
          );
          const user = await fundUser(fixture, mTokenLoan, 100);

          await depositInstantWithUsycTest(
            {
              depositVaultWithUSYC,
              owner,
              mTBILL,
              mTokenToUsdDataFeed: fixture.mTokenToUsdDataFeed,
              expectedUsdcInvested: parseUnits('100.00013', 8),
            },
            mTokenLoan,
            100,
            { from: user },
          );
        });

        it('should fail: when payment token is neither USDC nor radUSD', async () => {
          const fixture = await loadFixture(defaultDeploy);
          const { owner, depositVaultWithUSYC, stableCoins, mTBILL, dataFeed } =
            fixture;
          await setupUsycDv(fixture);
          await addPaymentTokenTest(
            { vault: depositVaultWithUSYC, owner },
            stableCoins.dai,
            dataFeed.address,
            0,
            true,
          );
          const user = await fundUser(fixture, stableCoins.dai, 100);

          await depositInstantWithUsycTest(
            {
              depositVaultWithUSYC,
              owner,
              mTBILL,
              mTokenToUsdDataFeed: fixture.mTokenToUsdDataFeed,
            },
            stableCoins.dai,
            100,
            {
              from: user,
              revertCustomError: {
                customErrorName: 'UnsupportedToken',
                args: [stableCoins.dai.address],
              },
            },
          );
        });

        it('should fail: radUSD deposit when fees are not waived on the radUSD redemption vault', async () => {
          const fixture = await loadFixture(defaultDeploy);
          const {
            owner,
            depositVaultWithUSYC,
            mTokenLoan,
            mTBILL,
            redemptionVaultLoanSwapper,
          } = fixture;
          await setupUsycDv(fixture);
          await redemptionVaultLoanSwapper.setWaivedFeeAccount(
            depositVaultWithUSYC.address,
            false,
          );
          const user = await fundUser(fixture, mTokenLoan, 100);

          await depositInstantWithUsycTest(
            {
              depositVaultWithUSYC,
              owner,
              mTBILL,
              mTokenToUsdDataFeed: fixture.mTokenToUsdDataFeed,
            },
            mTokenLoan,
            100,
            {
              from: user,
              revertCustomError: { customErrorName: 'FeesNotWaivedOnTarget' },
            },
          );
        });

        it('should fail: radUSD deposit when the radUSD redemption vault pays out less USDC than the vault values radUSD at', async () => {
          const fixture = await loadFixture(defaultDeploy);
          const {
            owner,
            depositVaultWithUSYC,
            mTokenLoan,
            mTBILL,
            redemptionVaultLoanSwapper,
            mockedAggregatorMTokenLoan,
          } = fixture;
          await setupUsycDv(fixture);
          // radUSD is stable on the USYC vault, so it is still valued at 1$,
          // while the radUSD RV redeems it at 0.9997$
          await mockedAggregatorMTokenLoan.setRoundData(
            parseUnits('0.9997', await mockedAggregatorMTokenLoan.decimals()),
          );
          const user = await fundUser(fixture, mTokenLoan, 100);

          await depositInstantWithUsycTest(
            {
              depositVaultWithUSYC,
              owner,
              mTBILL,
              mTokenToUsdDataFeed: fixture.mTokenToUsdDataFeed,
            },
            mTokenLoan,
            100,
            {
              from: user,
              revertCustomError: {
                customErrorName: 'SlippageExceeded',
                // the error is thrown by the radUSD RV
                contract: redemptionVaultLoanSwapper,
                args: [parseUnits('100'), parseUnits('99.97')],
              },
            },
          );
        });

        it('should fail: radUSD deposit when the radUSD redemption vault has no USDC liquidity', async () => {
          const fixture = await loadFixture(defaultDeploy);
          const {
            owner,
            depositVaultWithUSYC,
            mTokenLoan,
            mTBILL,
            stableCoins,
            redemptionVaultLoanSwapper,
          } = fixture;
          await setupUsycDv(fixture);
          await redemptionVaultLoanSwapper.withdrawToken(
            stableCoins.usdc.address,
            await stableCoins.usdc.balanceOf(
              redemptionVaultLoanSwapper.address,
            ),
          );
          const user = await fundUser(fixture, mTokenLoan, 100);

          await depositInstantWithUsycTest(
            {
              depositVaultWithUSYC,
              owner,
              mTBILL,
              mTokenToUsdDataFeed: fixture.mTokenToUsdDataFeed,
            },
            mTokenLoan,
            100,
            {
              from: user,
              revertMessage: 'ERC20: transfer amount exceeds balance',
            },
          );
        });

        describe('anticipated fee rate', () => {
          it('invests when teller subscription fee rate equals non-zero anticipated fee rate', async () => {
            const fixture = await loadFixture(defaultDeploy);
            const {
              owner,
              depositVaultWithUSYC,
              stableCoins,
              mTBILL,
              usycTeller,
            } = fixture;
            await setupUsycDv(fixture);
            await usycTeller.setFeeRates(parseUnits('4'), parseUnits('3'));
            await setUsycAnticipatedFeeRatesTest(
              fixture,
              parseUnits('4'),
              parseUnits('3'),
            );
            const user = await fundUser(fixture, stableCoins.usdc, 100);

            await depositInstantWithUsycTest(
              {
                depositVaultWithUSYC,
                owner,
                mTBILL,
                mTokenToUsdDataFeed: fixture.mTokenToUsdDataFeed,
              },
              stableCoins.usdc,
              100,
              { from: user },
            );
          });

          it('should fail: fee rate mismatch and fallback disabled', async () => {
            const fixture = await loadFixture(defaultDeploy);
            const {
              owner,
              depositVaultWithUSYC,
              stableCoins,
              mTBILL,
              usycTeller,
            } = fixture;
            await setupUsycDv(fixture);
            await usycTeller.setFeeRates(parseUnits('4'), 0);
            const user = await fundUser(fixture, stableCoins.usdc, 100);

            await depositInstantWithUsycTest(
              {
                depositVaultWithUSYC,
                owner,
                mTBILL,
                mTokenToUsdDataFeed: fixture.mTokenToUsdDataFeed,
              },
              stableCoins.usdc,
              100,
              {
                from: user,
                revertCustomError: feesNotMatchedError(fixture),
              },
            );
          });

          it('Teller redemption fee rate changes: auto-invest is blocked until the anticipated fee rates are updated', async () => {
            const fixture = await loadFixture(defaultDeploy);
            const { stableCoins, usycTeller } = fixture;
            await setupUsycDv(fixture);
            await usycTeller.setFeeRates(parseUnits('4'), parseUnits('3'));
            await setUsycAnticipatedFeeRatesTest(
              fixture,
              parseUnits('4'),
              parseUnits('3'),
            );
            const user = await fundUser(fixture, stableCoins.usdc, 100);

            await depositInstantWithUsycTest(
              usycDvParams(fixture),
              stableCoins.usdc,
              100,
              { from: user },
            );

            // only the fee the vault itself is never charged changes
            await usycTeller.setFeeRates(parseUnits('4'), parseUnits('5'));
            await fundUser(fixture, stableCoins.usdc, 100);

            await depositInstantWithUsycTest(
              usycDvParams(fixture),
              stableCoins.usdc,
              100,
              {
                from: user,
                revertCustomError: feesNotMatchedError(fixture),
              },
            );

            await setUsycAnticipatedFeeRatesTest(
              fixture,
              parseUnits('4'),
              parseUnits('5'),
            );

            await depositInstantWithUsycTest(
              usycDvParams(fixture),
              stableCoins.usdc,
              100,
              { from: user },
            );
          });

          it('fee rate mismatch and fallback enabled: USDC goes to tokensReceiver exactly once', async () => {
            const fixture = await loadFixture(defaultDeploy);
            const {
              owner,
              depositVaultWithUSYC,
              stableCoins,
              mTBILL,
              usycTeller,
            } = fixture;
            await setupUsycDv(fixture);
            await setAutoInvestFallbackEnabledUsycTest(
              { depositVaultWithUSYC, owner },
              true,
            );
            await usycTeller.setFeeRates(parseUnits('4'), 0);
            const user = await fundUser(fixture, stableCoins.usdc, 100);

            await depositInstantWithUsycTest(
              {
                depositVaultWithUSYC,
                owner,
                mTBILL,
                mTokenToUsdDataFeed: fixture.mTokenToUsdDataFeed,
                expectation: 'fallback',
              },
              stableCoins.usdc,
              100,
              { from: user },
            );
          });

          it('fee rate mismatch and fallback enabled: idle USDC held by the vault is not sent out', async () => {
            const fixture = await loadFixture(defaultDeploy);
            const {
              owner,
              depositVaultWithUSYC,
              stableCoins,
              mTBILL,
              usycTeller,
            } = fixture;
            await setupUsycDv(fixture);
            await setAutoInvestFallbackEnabledUsycTest(
              { depositVaultWithUSYC, owner },
              true,
            );
            await usycTeller.setFeeRates(parseUnits('4'), 0);
            await mintToken(stableCoins.usdc, depositVaultWithUSYC, 1000);
            const user = await fundUser(fixture, stableCoins.usdc, 100);

            // the helper asserts the vault USDC balance is unchanged and that
            // tokensReceiver got exactly the deposited amount
            await depositInstantWithUsycTest(
              {
                depositVaultWithUSYC,
                owner,
                mTBILL,
                mTokenToUsdDataFeed: fixture.mTokenToUsdDataFeed,
                expectation: 'fallback',
              },
              stableCoins.usdc,
              100,
              { from: user },
            );
          });
        });

        describe('teller failures', () => {
          it('should fail: teller deposit reverts and fallback disabled', async () => {
            const fixture = await loadFixture(defaultDeploy);
            const {
              owner,
              depositVaultWithUSYC,
              stableCoins,
              mTBILL,
              usycTeller,
            } = fixture;
            await setupUsycDv(fixture);
            await usycTeller.setDepositReverts(true);
            const user = await fundUser(fixture, stableCoins.usdc, 100);

            await depositInstantWithUsycTest(
              {
                depositVaultWithUSYC,
                owner,
                mTBILL,
                mTokenToUsdDataFeed: fixture.mTokenToUsdDataFeed,
              },
              stableCoins.usdc,
              100,
              {
                from: user,
                revertCustomError: { customErrorName: 'AutoInvestFailed' },
              },
            );
          });

          it('teller deposit reverts and fallback enabled: USDC goes to tokensReceiver, teller allowance reset', async () => {
            const fixture = await loadFixture(defaultDeploy);
            const {
              owner,
              depositVaultWithUSYC,
              stableCoins,
              mTBILL,
              usycTeller,
            } = fixture;
            await setupUsycDv(fixture);
            await setAutoInvestFallbackEnabledUsycTest(
              { depositVaultWithUSYC, owner },
              true,
            );
            await usycTeller.setDepositReverts(true);
            const user = await fundUser(fixture, stableCoins.usdc, 100);

            await depositInstantWithUsycTest(
              {
                depositVaultWithUSYC,
                owner,
                mTBILL,
                mTokenToUsdDataFeed: fixture.mTokenToUsdDataFeed,
                expectation: 'fallback',
              },
              stableCoins.usdc,
              100,
              { from: user },
            );
          });

          it('radUSD deposit, teller reverts and fallback enabled: USDC (not radUSD) goes to tokensReceiver', async () => {
            const fixture = await loadFixture(defaultDeploy);
            const {
              owner,
              depositVaultWithUSYC,
              mTokenLoan,
              mTBILL,
              usycTeller,
            } = fixture;
            await setupUsycDv(fixture);
            await setAutoInvestFallbackEnabledUsycTest(
              { depositVaultWithUSYC, owner },
              true,
            );
            await usycTeller.setDepositReverts(true);
            const user = await fundUser(fixture, mTokenLoan, 100);

            await depositInstantWithUsycTest(
              {
                depositVaultWithUSYC,
                owner,
                mTBILL,
                mTokenToUsdDataFeed: fixture.mTokenToUsdDataFeed,
                expectation: 'fallback',
                expectedUsdcInvested: parseUnits('100', 8),
              },
              mTokenLoan,
              100,
              { from: user },
            );
          });

          it('should fail: teller returns zero shares, even with fallback enabled', async () => {
            const fixture = await loadFixture(defaultDeploy);
            const {
              owner,
              depositVaultWithUSYC,
              stableCoins,
              mTBILL,
              usycTeller,
            } = fixture;
            await setupUsycDv(fixture);
            await setAutoInvestFallbackEnabledUsycTest(
              { depositVaultWithUSYC, owner },
              true,
            );
            await usycTeller.setDepositReturnsZero(true);
            const user = await fundUser(fixture, stableCoins.usdc, 100);

            await depositInstantWithUsycTest(
              {
                depositVaultWithUSYC,
                owner,
                mTBILL,
                mTokenToUsdDataFeed: fixture.mTokenToUsdDataFeed,
              },
              stableCoins.usdc,
              100,
              {
                from: user,
                revertCustomError: { customErrorName: 'ZeroTokensReceived' },
              },
            );
          });
        });

        describe('radUSD redemption leg failures (not covered by fallback)', () => {
          it('should fail: radUSD RV is paused, even with fallback enabled', async () => {
            const fixture = await loadFixture(defaultDeploy);
            const {
              owner,
              depositVaultWithUSYC,
              mTokenLoan,
              mTBILL,
              pauseManager,
              redemptionVaultLoanSwapper,
            } = fixture;
            await setupUsycDv(fixture);
            await setAutoInvestFallbackEnabledUsycTest(
              { depositVaultWithUSYC, owner },
              true,
            );
            await pauseVault(
              { pauseManager, owner },
              redemptionVaultLoanSwapper,
            );
            const user = await fundUser(fixture, mTokenLoan, 100);

            await depositInstantWithUsycTest(
              {
                depositVaultWithUSYC,
                owner,
                mTBILL,
                mTokenToUsdDataFeed: fixture.mTokenToUsdDataFeed,
              },
              mTokenLoan,
              100,
              {
                from: user,
                revertCustomError: {
                  customErrorName: 'Paused',
                  contract: redemptionVaultLoanSwapper,
                },
              },
            );
          });

          it('should fail: radUSD RV instant limit is exceeded, even with fallback enabled', async () => {
            const fixture = await loadFixture(defaultDeploy);
            const {
              owner,
              depositVaultWithUSYC,
              mTokenLoan,
              mTBILL,
              redemptionVaultLoanSwapper,
            } = fixture;
            await setupUsycDv(fixture);
            await setAutoInvestFallbackEnabledUsycTest(
              { depositVaultWithUSYC, owner },
              true,
            );
            await setInstantLimitConfigTest(
              { vault: redemptionVaultLoanSwapper, owner },
              parseUnits('10'),
            );
            const user = await fundUser(fixture, mTokenLoan, 100);

            await depositInstantWithUsycTest(
              {
                depositVaultWithUSYC,
                owner,
                mTBILL,
                mTokenToUsdDataFeed: fixture.mTokenToUsdDataFeed,
              },
              mTokenLoan,
              100,
              {
                from: user,
                revertCustomError: {
                  customErrorName: 'WindowLimitExceeded',
                  contract: redemptionVaultLoanSwapper,
                },
              },
            );
          });
        });

        describe('6-decimal USDC and USYC through a replaced Teller', () => {
          it('USDC is invested through the new Teller, the previous Teller is not touched', async () => {
            const fixture = await loadFixture(defaultDeploy);
            const {
              owner,
              depositVaultWithUSYC,
              mTBILL,
              usycTeller: previousTeller,
              stableCoins,
            } = fixture;
            const { usdc } = await setupUsdc6UsycDv(fixture);
            const previousTellerUsdc = await stableCoins.usdc.balanceOf(
              previousTeller.address,
            );
            const user = await fundUser(fixture, usdc, 100);

            await depositInstantWithUsycTest(
              {
                depositVaultWithUSYC,
                owner,
                mTBILL,
                mTokenToUsdDataFeed: fixture.mTokenToUsdDataFeed,
              },
              usdc,
              100,
              { from: user },
            );

            expect(await stableCoins.usdc.balanceOf(previousTeller.address)).eq(
              previousTellerUsdc,
            );
          });

          // amounts stay above the vault min amount (10 mTBILL at 5$)
          for (const amount of [100, 133.333333, 99.999999]) {
            it(`radUSD deposit of ${amount} when radUSD price is 1.0000013$`, async () => {
              const fixture = await loadFixture(defaultDeploy);
              const {
                owner,
                depositVaultWithUSYC,
                mTokenLoan,
                mTBILL,
                mockedAggregatorMTokenLoan,
              } = fixture;
              await setupUsdc6UsycDv(fixture);
              await mockedAggregatorMTokenLoan.setRoundData(
                parseUnits(
                  '1.0000013',
                  await mockedAggregatorMTokenLoan.decimals(),
                ),
              );
              // headroom: the base helper derives the deposited amount through
              // `toFixed(18)`, which can exceed the decimal amount by a few wei
              const user = await fundUser(fixture, mTokenLoan, amount + 1);

              // radUSD RV pays floor(amount * 1.0000013) in 6-decimal USDC
              const expectedUsdc = toDepositAmountBase18(amount)
                .mul(parseUnits('1.0000013'))
                .div(parseUnits('1'))
                .div(parseUnits('1', 12));

              await depositInstantWithUsycTest(
                {
                  depositVaultWithUSYC,
                  owner,
                  mTBILL,
                  mTokenToUsdDataFeed: fixture.mTokenToUsdDataFeed,
                  expectedUsdcInvested: expectedUsdc,
                },
                mTokenLoan,
                amount,
                { from: user },
              );
            });

            it(`radUSD deposit of ${amount} when radUSD is non-stable at 0.9999999$ on both vaults`, async () => {
              const fixture = await loadFixture(defaultDeploy);
              const {
                owner,
                depositVaultWithUSYC,
                mTokenLoan,
                mTBILL,
                mTokenLoanToUsdDataFeed,
                mockedAggregatorMTokenLoan,
              } = fixture;
              await setupUsdc6UsycDv(fixture);
              // the vault prices radUSD with the same feed as the radUSD RV,
              // so the RV payout equals the vault min receive amount exactly
              await removePaymentTokenTest(
                { vault: depositVaultWithUSYC, owner },
                mTokenLoan,
              );
              await addPaymentTokenTest(
                { vault: depositVaultWithUSYC, owner },
                mTokenLoan,
                mTokenLoanToUsdDataFeed.address,
                0,
                false,
              );
              await mockedAggregatorMTokenLoan.setRoundData(
                parseUnits(
                  '0.9999999',
                  await mockedAggregatorMTokenLoan.decimals(),
                ),
              );
              const user = await fundUser(fixture, mTokenLoan, amount + 1);

              // radUSD RV pays floor(amount * 0.9999999) in 6-decimal USDC
              const expectedUsdc = toDepositAmountBase18(amount)
                .mul(parseUnits('0.9999999'))
                .div(parseUnits('1'))
                .div(parseUnits('1', 12));

              await depositInstantWithUsycTest(
                {
                  depositVaultWithUSYC,
                  owner,
                  mTBILL,
                  mTokenToUsdDataFeed: fixture.mTokenToUsdDataFeed,
                  expectedUsdcInvested: expectedUsdc,
                },
                mTokenLoan,
                amount,
                { from: user },
              );
            });
          }
        });

        describe('Teller charging fees', () => {
          it('subscription fee is charged: only the net USYC goes to tokensReceiver', async () => {
            const fixture = await loadFixture(defaultDeploy);
            const {
              owner,
              depositVaultWithUSYC,
              stableCoins,
              mTBILL,
              usycTeller,
            } = fixture;
            await setupUsycDv(fixture);
            await usycTeller.setFeeRates(parseUnits('4'), 0);
            await usycTeller.setFreeTierThreshold(0);
            await setUsycAnticipatedFeeRatesTest(fixture, parseUnits('4'), 0);
            const user = await fundUser(fixture, stableCoins.usdc, 100);

            const [netShares, fee] = await usycTeller.previewDepositData(
              depositVaultWithUSYC.address,
              parseUnits('100', 8),
            );
            // the 4% rate applies to the net amount: net = floor(100 / 1.04)
            expect(fee).eq(parseUnits('3.84615385', 8));
            expect(netShares).eq(parseUnits('96.15384615', 8));

            // the helper asserts tokensReceiver got exactly the previewed net shares
            await depositInstantWithUsycTest(
              {
                depositVaultWithUSYC,
                owner,
                mTBILL,
                mTokenToUsdDataFeed: fixture.mTokenToUsdDataFeed,
              },
              stableCoins.usdc,
              100,
              { from: user },
            );
          });

          it('should fail: fee is charged but anticipated fee rate is 0', async () => {
            const fixture = await loadFixture(defaultDeploy);
            const {
              owner,
              depositVaultWithUSYC,
              stableCoins,
              mTBILL,
              usycTeller,
            } = fixture;
            await setupUsycDv(fixture);
            await usycTeller.setFeeRates(parseUnits('4'), 0);
            await usycTeller.setFreeTierThreshold(0);
            const user = await fundUser(fixture, stableCoins.usdc, 100);

            await depositInstantWithUsycTest(
              {
                depositVaultWithUSYC,
                owner,
                mTBILL,
                mTokenToUsdDataFeed: fixture.mTokenToUsdDataFeed,
              },
              stableCoins.usdc,
              100,
              {
                from: user,
                revertCustomError: { customErrorName: 'AutoInvestFailed' },
              },
            );
          });

          it('free tier partially used: average fee below the anticipated rate, deposit is invested', async () => {
            const fixture = await loadFixture(defaultDeploy);
            const {
              owner,
              depositVaultWithUSYC,
              stableCoins,
              mTBILL,
              usycTeller,
            } = fixture;
            await setupUsycDv(fixture);
            await usycTeller.setFeeRates(parseUnits('4'), 0);
            // half of the deposit is fee-free
            await usycTeller.setFreeTierThreshold(parseUnits('50', 8));
            await setUsycAnticipatedFeeRatesTest(fixture, parseUnits('4'), 0);
            const user = await fundUser(fixture, stableCoins.usdc, 100);

            const amount = parseUnits('100', 8);
            const [, fee] = await usycTeller.previewDepositData(
              depositVaultWithUSYC.address,
              amount,
            );
            // 4% on the net of the 50 USDC over the free tier: 50 - 50 / 1.04
            expect(fee).eq(parseUnits('1.92307693', 8));
            expect(fee).lt(usycMaxFee(amount, parseUnits('4')));

            await depositInstantWithUsycTest(
              {
                depositVaultWithUSYC,
                owner,
                mTBILL,
                mTokenToUsdDataFeed: fixture.mTokenToUsdDataFeed,
              },
              stableCoins.usdc,
              100,
              { from: user },
            );
          });

          it('Teller charges a premium over its reported rate: fallback to USDC transfer', async () => {
            const fixture = await loadFixture(defaultDeploy);
            const {
              owner,
              depositVaultWithUSYC,
              stableCoins,
              mTBILL,
              usycTeller,
            } = fixture;
            await setupUsycDv(fixture);
            await setAutoInvestFallbackEnabledUsycTest(
              { depositVaultWithUSYC, owner },
              true,
            );
            // reported rate 0 equals the anticipated one, 1% is charged anyway
            await usycTeller.setFeeRatePremium(parseUnits('1'));
            await usycTeller.setFreeTierThreshold(0);
            const user = await fundUser(fixture, stableCoins.usdc, 100);

            const [, fee] = await usycTeller.previewDepositData(
              depositVaultWithUSYC.address,
              parseUnits('100', 8),
            );
            expect(fee).gt(0);

            await depositInstantWithUsycTest(
              {
                depositVaultWithUSYC,
                owner,
                mTBILL,
                mTokenToUsdDataFeed: fixture.mTokenToUsdDataFeed,
                expectation: 'fallback',
              },
              stableCoins.usdc,
              100,
              { from: user },
            );
          });

          it('should fail: Teller charges a premium over its reported rate and fallback is disabled', async () => {
            const fixture = await loadFixture(defaultDeploy);
            const {
              owner,
              depositVaultWithUSYC,
              stableCoins,
              mTBILL,
              usycTeller,
            } = fixture;
            await setupUsycDv(fixture);
            await usycTeller.setFeeRates(parseUnits('4'), 0);
            await usycTeller.setFeeRatePremium(parseUnits('1'));
            await usycTeller.setFreeTierThreshold(0);
            await setUsycAnticipatedFeeRatesTest(fixture, parseUnits('4'), 0);
            const user = await fundUser(fixture, stableCoins.usdc, 100);

            const amount = parseUnits('100', 8);
            const [, fee] = await usycTeller.previewDepositData(
              depositVaultWithUSYC.address,
              amount,
            );
            const maxFee = usycMaxFee(amount, parseUnits('4'));

            await depositInstantWithUsycTest(
              {
                depositVaultWithUSYC,
                owner,
                mTBILL,
                mTokenToUsdDataFeed: fixture.mTokenToUsdDataFeed,
              },
              stableCoins.usdc,
              100,
              {
                from: user,
                revertCustomError: {
                  customErrorName: 'AutoInvestFailed',
                  args: [
                    depositVaultWithUSYC.interface.encodeErrorResult(
                      'FeeExceeded',
                      [fee, maxFee],
                    ),
                  ],
                },
              },
            );
          });

          it('should fail: Teller mints less USYC than previewed', async () => {
            const fixture = await loadFixture(defaultDeploy);
            const {
              owner,
              depositVaultWithUSYC,
              stableCoins,
              mTBILL,
              usycTeller,
            } = fixture;
            await setupUsycDv(fixture);
            // the shortfall is caught after the deposit, fallback is not applicable
            await setAutoInvestFallbackEnabledUsycTest(
              { depositVaultWithUSYC, owner },
              true,
            );
            await usycTeller.setDepositShortfall(1);
            const user = await fundUser(fixture, stableCoins.usdc, 100);

            const [expectedShares] = await usycTeller.previewDepositData(
              depositVaultWithUSYC.address,
              parseUnits('100', 8),
            );

            await depositInstantWithUsycTest(
              {
                depositVaultWithUSYC,
                owner,
                mTBILL,
                mTokenToUsdDataFeed: fixture.mTokenToUsdDataFeed,
              },
              stableCoins.usdc,
              100,
              {
                from: user,
                revertCustomError: {
                  customErrorName: 'InsufficientAmountReceived',
                  // the error is declared by the USYC library
                  contract: VaultsWithUSYCLibrary__factory.connect(
                    depositVaultWithUSYC.address,
                    owner,
                  ),
                  args: [expectedShares.sub(1), expectedShares],
                },
              },
            );
          });
        });

        it('USDC-only product (redemptionVault not set): USDC is invested directly', async () => {
          const fixture = await loadFixture(defaultDeploy);
          const { owner, depositVaultWithUSYC, stableCoins, mTBILL } = fixture;
          await setupUsycDv(fixture);
          await usycSetterTest(
            { vault: depositVaultWithUSYC, owner },
            'setRedemptionVault',
            'SetRedemptionVault',
            'redemptionVault',
            constants.AddressZero,
          );
          const user = await fundUser(fixture, stableCoins.usdc, 100);

          await depositInstantWithUsycTest(
            {
              depositVaultWithUSYC,
              owner,
              mTBILL,
              mTokenToUsdDataFeed: fixture.mTokenToUsdDataFeed,
            },
            stableCoins.usdc,
            100,
            { from: user },
          );
        });

        it('should fail: USDC-only product (redemptionVault not set) and radUSD payment token', async () => {
          const fixture = await loadFixture(defaultDeploy);
          const { owner, depositVaultWithUSYC, mTokenLoan, mTBILL } = fixture;
          await setupUsycDv(fixture);
          await usycSetterTest(
            { vault: depositVaultWithUSYC, owner },
            'setRedemptionVault',
            'SetRedemptionVault',
            'redemptionVault',
            constants.AddressZero,
          );
          const user = await fundUser(fixture, mTokenLoan, 100);

          await depositInstantWithUsycTest(
            {
              depositVaultWithUSYC,
              owner,
              mTBILL,
              mTokenToUsdDataFeed: fixture.mTokenToUsdDataFeed,
            },
            mTokenLoan,
            100,
            {
              from: user,
              revertCustomError: {
                customErrorName: 'UnsupportedToken',
                args: [mTokenLoan.address],
              },
            },
          );
        });
      });

      describe('depositRequest()', () => {
        it('when usycDepositsEnabled is true, USDC is invested at request time', async () => {
          const fixture = await loadFixture(defaultDeploy);
          const { owner, depositVaultWithUSYC, stableCoins, mTBILL } = fixture;
          await setupUsycDv(fixture);
          const user = await fundUser(fixture, stableCoins.usdc, 100);

          await depositRequestWithUsycTest(
            {
              depositVaultWithUSYC,
              owner,
              mTBILL,
              mTokenToUsdDataFeed: fixture.mTokenToUsdDataFeed,
            },
            stableCoins.usdc,
            100,
            { from: user },
          );
        });

        it('radUSD is redeemed to USDC and invested at request time', async () => {
          const fixture = await loadFixture(defaultDeploy);
          const { owner, depositVaultWithUSYC, mTokenLoan, mTBILL } = fixture;
          await setupUsycDv(fixture);
          const user = await fundUser(fixture, mTokenLoan, 100);

          await depositRequestWithUsycTest(
            {
              depositVaultWithUSYC,
              owner,
              mTBILL,
              mTokenToUsdDataFeed: fixture.mTokenToUsdDataFeed,
              expectedUsdcInvested: parseUnits('100', 8),
            },
            mTokenLoan,
            100,
            { from: user },
          );
        });

        it('should fail: radUSD request when the radUSD redemption vault pays out less USDC than the vault values radUSD at', async () => {
          const fixture = await loadFixture(defaultDeploy);
          const {
            owner,
            depositVaultWithUSYC,
            mTokenLoan,
            mTBILL,
            redemptionVaultLoanSwapper,
            mockedAggregatorMTokenLoan,
          } = fixture;
          await setupUsycDv(fixture);
          await mockedAggregatorMTokenLoan.setRoundData(
            parseUnits('0.9997', await mockedAggregatorMTokenLoan.decimals()),
          );
          const user = await fundUser(fixture, mTokenLoan, 100);

          await depositRequestWithUsycTest(
            {
              depositVaultWithUSYC,
              owner,
              mTBILL,
              mTokenToUsdDataFeed: fixture.mTokenToUsdDataFeed,
            },
            mTokenLoan,
            100,
            {
              from: user,
              revertCustomError: {
                customErrorName: 'SlippageExceeded',
                contract: redemptionVaultLoanSwapper,
                args: [parseUnits('100'), parseUnits('99.97')],
              },
            },
          );
        });

        for (const token of ['USDC', 'radUSD'] as const) {
          it(`${token} request with 50% instant share: both the instant and the request parts are invested`, async () => {
            const fixture = await loadFixture(defaultDeploy);
            const {
              owner,
              depositVaultWithUSYC,
              stableCoins,
              mTokenLoan,
              mTBILL,
            } = fixture;
            await setupUsycDv(fixture);
            // the base helper expects instant fees in tokenIn on tokensReceiver,
            // which receives USYC here, so the fee is set to 0
            await setInstantFeeTest({ vault: depositVaultWithUSYC, owner }, 0);
            const tokenIn = token === 'USDC' ? stableCoins.usdc : mTokenLoan;
            const user = await fundUser(fixture, tokenIn, 200);

            await depositRequestWithUsycTest(
              {
                depositVaultWithUSYC,
                owner,
                mTBILL,
                mTokenToUsdDataFeed: fixture.mTokenToUsdDataFeed,
                instantShare: 50_00,
                expectedUsdcInvested: parseUnits('200', 8),
              },
              tokenIn,
              200,
              { from: user },
            );
          });
        }

        it('should fail: request with instant share when fee rate mismatches and fallback is disabled', async () => {
          const fixture = await loadFixture(defaultDeploy);
          const {
            owner,
            depositVaultWithUSYC,
            stableCoins,
            mTBILL,
            usycTeller,
          } = fixture;
          await setupUsycDv(fixture);
          await usycTeller.setFeeRates(parseUnits('4'), 0);
          const user = await fundUser(fixture, stableCoins.usdc, 200);

          await depositRequestWithUsycTest(
            {
              depositVaultWithUSYC,
              owner,
              mTBILL,
              mTokenToUsdDataFeed: fixture.mTokenToUsdDataFeed,
              instantShare: 50_00,
            },
            stableCoins.usdc,
            200,
            {
              from: user,
              revertCustomError: feesNotMatchedError(fixture),
            },
          );
        });

        it('when usycDepositsEnabled is false, tokenIn goes to tokensReceiver', async () => {
          const fixture = await loadFixture(defaultDeploy);
          const { owner, depositVaultWithUSYC, stableCoins, mTBILL } = fixture;
          await setupUsycDv(fixture, { enable: false });
          const user = await fundUser(fixture, stableCoins.usdc, 100);

          await depositRequestWithUsycTest(
            {
              depositVaultWithUSYC,
              owner,
              mTBILL,
              mTokenToUsdDataFeed: fixture.mTokenToUsdDataFeed,
              expectation: 'disabled',
            },
            stableCoins.usdc,
            100,
            { from: user },
          );
        });
      });

      describe('Teller fee rates validation', () => {
        /**
         * The vault anticipates a 4% subscription fee rate and its paired
         * redemption vault a 3% redemption fee rate, every scenario is run
         * with each auto-invest mode for both instant and request deposits
         */
        type FeeScenario = {
          title: string;
          /** Teller default subscription / redemption rates, in % */
          tellerRates: readonly [string, string];
          /** rates overridden for the vault, in % */
          override?: readonly [string, string];
          /** rates overridden for the paired redemption vault, in % */
          pairedOverride?: readonly [string, string];
          /** redemption fee rate the paired vault anticipates, in % */
          pairedAnticipatedRate?: string;
          /** the vault has no paired redemption vault */
          unpaired?: boolean;
          /** added to the rates the Teller charges but not reports, in % */
          premium?: string;
          /** free tier is exhausted, so the Teller charges its fees */
          chargeFees?: boolean;
          /** fee previewed by the Teller for a 100 USDC deposit */
          expectedFee?: string;
          /** auto-invest outcome when it is enabled */
          outcome: 'invested' | 'FeesNotMatched' | 'FeeExceeded';
        };

        // 4% on the net amount: 100 - floor(100 / 1.04)
        const feeAtAnticipatedRate = '3.84615385';

        const feeScenarios: FeeScenario[] = [
          {
            title: 'Teller fee rates equal the anticipated ones',
            tellerRates: ['4', '3'],
            chargeFees: true,
            expectedFee: feeAtAnticipatedRate,
            outcome: 'invested',
          },
          {
            title: 'Teller subscription fee rate differs',
            tellerRates: ['5', '3'],
            outcome: 'FeesNotMatched',
          },
          {
            title: 'Teller redemption fee rate differs',
            tellerRates: ['4', '2'],
            outcome: 'FeesNotMatched',
          },
          {
            title: 'both Teller fee rates differ',
            tellerRates: ['5', '2'],
            outcome: 'FeesNotMatched',
          },
          {
            title: 'Teller redemption fee rate is 0',
            tellerRates: ['4', '0'],
            outcome: 'FeesNotMatched',
          },
          {
            title: 'vault subscription fee rate override is 0',
            tellerRates: ['4', '3'],
            override: ['0', '3'],
            chargeFees: true,
            expectedFee: '0',
            outcome: 'FeesNotMatched',
          },
          {
            title:
              'vault subscription fee rate override is lower than the anticipated rate and the deposit is under the free tier',
            tellerRates: ['4', '3'],
            override: ['2', '3'],
            expectedFee: '0',
            outcome: 'FeesNotMatched',
          },
          {
            title:
              'vault subscription fee rate override is higher than the anticipated rate',
            tellerRates: ['4', '3'],
            override: ['5', '3'],
            chargeFees: true,
            outcome: 'FeesNotMatched',
          },
          {
            title:
              'vault subscription fee rate override equals the anticipated rate but the default rate differs',
            tellerRates: ['5', '3'],
            override: ['4', '3'],
            chargeFees: true,
            expectedFee: feeAtAnticipatedRate,
            outcome: 'invested',
          },
          {
            title: 'only the vault redemption fee rate override differs',
            tellerRates: ['4', '3'],
            override: ['4', '9'],
            chargeFees: true,
            expectedFee: feeAtAnticipatedRate,
            outcome: 'invested',
          },
          {
            title:
              'paired vault redemption fee rate override differs from its anticipated rate',
            tellerRates: ['4', '3'],
            pairedOverride: ['4', '5'],
            outcome: 'FeesNotMatched',
          },
          {
            title:
              'paired vault redemption fee rate override equals its anticipated rate but the default rate differs',
            tellerRates: ['4', '2'],
            pairedOverride: ['4', '3'],
            chargeFees: true,
            expectedFee: feeAtAnticipatedRate,
            outcome: 'invested',
          },
          {
            title:
              'only the paired vault subscription fee rate override differs',
            tellerRates: ['4', '3'],
            pairedOverride: ['9', '3'],
            chargeFees: true,
            expectedFee: feeAtAnticipatedRate,
            outcome: 'invested',
          },
          {
            title: 'paired vault anticipates another redemption fee rate',
            tellerRates: ['4', '3'],
            pairedAnticipatedRate: '5',
            outcome: 'FeesNotMatched',
          },
          {
            title:
              'Teller redemption fee rate differs but the vault is not paired',
            tellerRates: ['4', '2'],
            unpaired: true,
            chargeFees: true,
            expectedFee: feeAtAnticipatedRate,
            outcome: 'invested',
          },
          {
            title:
              'Teller charges more than the subscription fee rate it reports',
            tellerRates: ['4', '3'],
            premium: '1',
            chargeFees: true,
            // 5% on the net amount: 100 - floor(100 / 1.05)
            expectedFee: '4.76190477',
            outcome: 'FeeExceeded',
          },
        ];

        const autoInvestModes = [
          {
            title: 'auto-invest disabled',
            depositsEnabled: false,
            fallbackEnabled: false,
          },
          {
            title: 'auto-invest enabled and fallback disabled',
            depositsEnabled: true,
            fallbackEnabled: false,
          },
          {
            title: 'auto-invest enabled and fallback enabled',
            depositsEnabled: true,
            fallbackEnabled: true,
          },
        ] as const;

        const depositFns = {
          'depositInstant()': depositInstantWithUsycTest,
          'depositRequest()': depositRequestWithUsycTest,
        };

        const expectationTitles = {
          disabled: 'tokenIn goes to tokensReceiver, fee rates are not checked',
          invested: 'deposit is invested',
          fallback: 'USDC goes to tokensReceiver',
        };

        for (const [fnName, depositFn] of Object.entries(depositFns)) {
          describe(fnName, () => {
            for (const scenario of feeScenarios) {
              for (const mode of autoInvestModes) {
                const blocked = scenario.outcome !== 'invested';
                const shouldFail =
                  mode.depositsEnabled && blocked && !mode.fallbackEnabled;
                const expectation = !mode.depositsEnabled
                  ? 'disabled'
                  : blocked
                  ? 'fallback'
                  : 'invested';

                it(`${shouldFail ? 'should fail: ' : ''}${scenario.title}, ${
                  mode.title
                }${
                  shouldFail ? '' : `: ${expectationTitles[expectation]}`
                }`, async () => {
                  const fixture = await loadFixture(defaultDeploy);
                  const {
                    owner,
                    depositVaultWithUSYC,
                    redemptionVaultWithUSYC,
                    stableCoins,
                    usycTeller,
                  } = fixture;
                  await setupUsycDv(fixture, { enable: mode.depositsEnabled });
                  if (mode.fallbackEnabled) {
                    await setAutoInvestFallbackEnabledUsycTest(
                      { depositVaultWithUSYC, owner },
                      true,
                    );
                  }
                  if (scenario.unpaired) {
                    await usycSetterTest(
                      { vault: depositVaultWithUSYC, owner },
                      'setRedemptionVaultPaired',
                      'SetRedemptionVaultPaired',
                      'redemptionVaultPaired',
                      constants.AddressZero,
                    );
                  }
                  await setUsycAnticipatedFeeRatesTest(
                    fixture,
                    parseUnits('4'),
                    parseUnits(scenario.pairedAnticipatedRate ?? '3'),
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
                      depositVaultWithUSYC.address,
                      parseUnits(scenario.override[0]),
                      parseUnits(scenario.override[1]),
                    );
                  }
                  if (scenario.pairedOverride) {
                    await usycTeller.setFeeRatesOverride(
                      redemptionVaultWithUSYC.address,
                      parseUnits(scenario.pairedOverride[0]),
                      parseUnits(scenario.pairedOverride[1]),
                    );
                  }

                  // the rates the Teller reports for each vault are the
                  // overridden ones, or the default ones without an override
                  expect(
                    await usycTeller.subscriptionFeeRate(
                      depositVaultWithUSYC.address,
                    ),
                  ).eq(
                    parseUnits(
                      scenario.override?.[0] ?? scenario.tellerRates[0],
                    ),
                  );
                  expect(
                    await usycTeller.redemptionFeeRate(
                      redemptionVaultWithUSYC.address,
                    ),
                  ).eq(
                    parseUnits(
                      scenario.pairedOverride?.[1] ?? scenario.tellerRates[1],
                    ),
                  );

                  const amount = parseUnits('100', 8);
                  const [, fee] = await usycTeller.previewDepositData(
                    depositVaultWithUSYC.address,
                    amount,
                  );
                  const maxFee = usycMaxFee(amount, parseUnits('4'));
                  if (scenario.expectedFee !== undefined) {
                    expect(fee).eq(parseUnits(scenario.expectedFee, 8));
                  }
                  if (scenario.outcome === 'FeeExceeded') {
                    expect(fee).gt(maxFee);
                  } else if (scenario.outcome === 'invested') {
                    expect(fee).lte(maxFee);
                  }

                  const user = await fundUser(fixture, stableCoins.usdc, 100);

                  await depositFn(
                    { ...usycDvParams(fixture), expectation },
                    stableCoins.usdc,
                    100,
                    {
                      from: user,
                      ...(shouldFail && {
                        revertCustomError: {
                          customErrorName: 'AutoInvestFailed',
                          args: [
                            scenario.outcome === 'FeesNotMatched'
                              ? depositVaultWithUSYC.interface.encodeErrorResult(
                                  'FeesNotMatched',
                                )
                              : depositVaultWithUSYC.interface.encodeErrorResult(
                                  'FeeExceeded',
                                  [fee, maxFee],
                                ),
                          ],
                        },
                      }),
                    },
                  );
                });
              }
            }
          });
        }

        it('should fail: paired vault does not report an anticipated fee rate, even when fallback is enabled', async () => {
          const fixture = await loadFixture(defaultDeploy);
          const {
            owner,
            depositVaultWithUSYC,
            redemptionVaultLoanSwapper,
            stableCoins,
          } = fixture;
          await setupUsycDv(fixture);
          await setAutoInvestFallbackEnabledUsycTest(
            { depositVaultWithUSYC, owner },
            true,
          );
          // the mToken redemption vault is not a USYC vault
          await usycSetterTest(
            { vault: depositVaultWithUSYC, owner },
            'setRedemptionVaultPaired',
            'SetRedemptionVaultPaired',
            'redemptionVaultPaired',
            redemptionVaultLoanSwapper.address,
          );
          const user = await fundUser(fixture, stableCoins.usdc, 100);

          await expect(
            depositVaultWithUSYC
              .connect(user)
              ['depositInstant(address,uint256,uint256,bytes32)'](
                stableCoins.usdc.address,
                parseUnits('100'),
                0,
                constants.HashZero,
              ),
          ).to.be.revertedWithoutReason();
        });
      });

      describe('admin setters', () => {
        const setterCases = [
          {
            fn: 'setUsycDepositsEnabled',
            event: 'SetUsycDepositsEnabled',
            getter: 'usycDepositsEnabled',
            value: () => true,
          },
          {
            fn: 'setAutoInvestFallbackEnabled',
            event: 'SetAutoInvestFallbackEnabled',
            getter: 'autoInvestFallbackEnabled',
            value: () => true,
          },
          {
            fn: 'setUsycTeller',
            event: 'SetUsycTeller',
            getter: 'usycTeller',
            value: (f: DefaultFixture) => f.regularAccounts[5].address,
          },
          {
            fn: 'setRedemptionVault',
            event: 'SetRedemptionVault',
            getter: 'redemptionVault',
            value: (f: DefaultFixture) => f.regularAccounts[5].address,
          },
          {
            fn: 'setRedemptionVaultPaired',
            event: 'SetRedemptionVaultPaired',
            getter: 'redemptionVaultPaired',
            value: (f: DefaultFixture) => f.regularAccounts[5].address,
          },
          {
            fn: 'setAnticipatedFeeRate',
            event: 'SetAnticipatedFeeRate',
            getter: 'anticipatedFeeRate',
            value: () => parseUnits('4'),
          },
        ] as const;

        for (const { fn, event, getter, value } of setterCases) {
          describe(`${fn}()`, () => {
            it('should fail: call from address without vault admin role', async () => {
              const fixture = await loadFixture(defaultDeploy);
              await usycSetterTest(
                { vault: fixture.depositVaultWithUSYC, owner: fixture.owner },
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
                { vault: fixture.depositVaultWithUSYC, owner: fixture.owner },
                fn,
                event,
                getter,
                value(fixture),
              );
            });
          });
        }

        it('anticipated fee rate and paired vault can be set back to 0', async () => {
          const fixture = await loadFixture(defaultDeploy);
          const vault = {
            vault: fixture.depositVaultWithUSYC,
            owner: fixture.owner,
          };
          await usycSetterTest(
            vault,
            'setAnticipatedFeeRate',
            'SetAnticipatedFeeRate',
            'anticipatedFeeRate',
            parseUnits('4'),
          );
          await usycSetterTest(
            vault,
            'setAnticipatedFeeRate',
            'SetAnticipatedFeeRate',
            'anticipatedFeeRate',
            0,
          );
          await usycSetterTest(
            vault,
            'setRedemptionVaultPaired',
            'SetRedemptionVaultPaired',
            'redemptionVaultPaired',
            constants.AddressZero,
          );
        });

        it('should fail: setUsycTeller to zero address', async () => {
          const fixture = await loadFixture(defaultDeploy);
          await usycSetterTest(
            { vault: fixture.depositVaultWithUSYC, owner: fixture.owner },
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
          const { depositVaultWithUSYC, owner } = fixture;
          await usycSetterTest(
            { vault: depositVaultWithUSYC, owner },
            'setUsycTeller',
            'SetUsycTeller',
            'usycTeller',
            depositVaultWithUSYC.address,
            {
              revertCustomError: {
                customErrorName: 'InvalidAddress',
                args: [depositVaultWithUSYC.address],
              },
            },
          );
        });
      });
    });
  },
);
