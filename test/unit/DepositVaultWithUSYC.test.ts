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
  RedemptionVaultWithUSYCLibrary__factory,
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
  setInstantFeeTest,
  setInstantLimitConfigTest,
  setMinAmountTest,
} from '../common/manageable-vault.helpers';
import { usycMaxFee, usycSetterTest } from '../common/usyc-common.helpers';
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
            await usycSetterTest(
              { vault: depositVaultWithUSYC, owner },
              'setAnticipatedFeeRate',
              'SetAnticipatedFeeRate',
              'anticipatedFeeRate',
              parseUnits('4'),
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
                revertCustomError: { customErrorName: 'AutoInvestFailed' },
              },
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
            await usycSetterTest(
              { vault: depositVaultWithUSYC, owner },
              'setAnticipatedFeeRate',
              'SetAnticipatedFeeRate',
              'anticipatedFeeRate',
              parseUnits('4'),
            );
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
            await usycSetterTest(
              { vault: depositVaultWithUSYC, owner },
              'setAnticipatedFeeRate',
              'SetAnticipatedFeeRate',
              'anticipatedFeeRate',
              parseUnits('4'),
            );
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
            await usycSetterTest(
              { vault: depositVaultWithUSYC, owner },
              'setAnticipatedFeeRate',
              'SetAnticipatedFeeRate',
              'anticipatedFeeRate',
              parseUnits('4'),
            );
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
                  contract: RedemptionVaultWithUSYCLibrary__factory.connect(
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
              revertCustomError: { customErrorName: 'AutoInvestFailed' },
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
            fn: 'setAnticipatedFeeRate',
            event: 'SetAnticipatedFeeRate',
            getter: 'anticipatedFeeRate',
            value: () => parseUnits('4'),
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
      });
    });
  },
);
