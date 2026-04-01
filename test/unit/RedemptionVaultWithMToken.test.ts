import { loadFixture } from '@nomicfoundation/hardhat-network-helpers';
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { expect } from 'chai';
import { BigNumber, constants } from 'ethers';
import { parseUnits } from 'ethers/lib/utils';

import { redemptionVaultSuits } from './suits/redemption-vault.suits';

import { encodeFnSelector } from '../../helpers/utils';
import { RedemptionVaultWithMTokenTest__factory } from '../../typechain-types';
import {
  approveBase18,
  mintToken,
  pauseVaultFn,
} from '../common/common.helpers';
import { setRoundData } from '../common/data-feed.helpers';
import { defaultDeploy } from '../common/fixtures';
import {
  addPaymentTokenTest,
  setInstantFeeTest,
  setMinAmountTest,
  addWaivedFeeAccountTest,
} from '../common/manageable-vault.helpers';
import {
  redeemInstantWithMTokenTest,
  setRedemptionVaultTest,
} from '../common/redemption-vault-mtoken.helpers';
import { setLoanLpTest } from '../common/redemption-vault.helpers';

redemptionVaultSuits(
  'RedemptionVaultWithMToken',
  defaultDeploy,
  {
    createNew: async (owner: SignerWithAddress) =>
      new RedemptionVaultWithMTokenTest__factory(owner).deploy(),
    key: 'redemptionVaultWithMToken',
  },
  async (fixture) => {
    const { redemptionVaultWithMToken, redemptionVaultLoanSwapper } = fixture;
    expect(await redemptionVaultWithMToken.redemptionVault()).eq(
      redemptionVaultLoanSwapper.address,
    );
  },
  async (defaultDeploy) => {
    describe('RedemptionVaultWithMToken', () => {
      it('failing deployment', async () => {
        const {
          mTokenLoan,
          mTokenLoanToUsdDataFeed,
          tokensReceiver,
          feeReceiver,
          accessControl,
          mockedSanctionsList,
          owner,
        } = await loadFixture(defaultDeploy);

        const redemptionVaultWithMToken =
          await new RedemptionVaultWithMTokenTest__factory(owner).deploy();

        await expect(
          redemptionVaultWithMToken[
            'initialize((address,address,uint256,uint256),(address,address),(address,address),(uint256,uint256),(uint256,uint256,uint256,address,address,address,address,address),address)'
          ](
            {
              ac: accessControl.address,
              sanctionsList: mockedSanctionsList.address,
              variationTolerance: 1,
              minAmount: parseUnits('100'),
            },
            {
              mToken: mTokenLoan.address,
              mTokenDataFeed: mTokenLoanToUsdDataFeed.address,
            },
            {
              feeReceiver: feeReceiver.address,
              tokensReceiver: tokensReceiver.address,
            },
            {
              instantFee: 100,
              instantDailyLimit: parseUnits('100000'),
            },
            {
              fiatAdditionalFee: 10000,
              fiatFlatFee: parseUnits('1'),
              minFiatRedeemAmount: parseUnits('100'),
              requestRedeemer: constants.AddressZero,
              loanLp: constants.AddressZero,
              loanLpFeeReceiver: constants.AddressZero,
              loanRepaymentAddress: constants.AddressZero,
              loanSwapperVault: constants.AddressZero,
            },
            constants.AddressZero,
          ),
        ).to.be.reverted;
      });

      describe('initialization', () => {
        it('should fail: call initialize() when already initialized', async () => {
          const { redemptionVaultWithMToken } = await loadFixture(
            defaultDeploy,
          );

          await expect(
            redemptionVaultWithMToken[
              'initialize((address,address,uint256,uint256),(address,address),(address,address),(uint256,uint256),(uint256,uint256,uint256,address,address,address,address,address),address)'
            ](
              {
                ac: constants.AddressZero,
                sanctionsList: constants.AddressZero,
                variationTolerance: 1,
                minAmount: parseUnits('100'),
              },
              {
                mToken: constants.AddressZero,
                mTokenDataFeed: constants.AddressZero,
              },
              {
                feeReceiver: constants.AddressZero,
                tokensReceiver: constants.AddressZero,
              },
              {
                instantFee: 100,
                instantDailyLimit: parseUnits('100000'),
              },
              {
                fiatAdditionalFee: 10000,
                fiatFlatFee: parseUnits('1'),
                minFiatRedeemAmount: parseUnits('100'),
                requestRedeemer: constants.AddressZero,
                loanLp: constants.AddressZero,
                loanLpFeeReceiver: constants.AddressZero,
                loanRepaymentAddress: constants.AddressZero,
                loanSwapperVault: constants.AddressZero,
              },
              constants.AddressZero,
            ),
          ).revertedWith('Initializable: contract is already initialized');
        });

        it('should fail: when redemptionVaultLoanSwapper address zero', async () => {
          const {
            owner,
            accessControl,
            mTokenLoan,
            mTokenLoanToUsdDataFeed,
            tokensReceiver,
            feeReceiver,
            mockedSanctionsList,
          } = await loadFixture(defaultDeploy);

          const redemptionVaultWithMToken =
            await new RedemptionVaultWithMTokenTest__factory(owner).deploy();

          await expect(
            redemptionVaultWithMToken[
              'initialize((address,address,uint256,uint256),(address,address),(address,address),(uint256,uint256),(uint256,uint256,uint256,address,address,address,address,address),address)'
            ](
              {
                ac: accessControl.address,
                sanctionsList: mockedSanctionsList.address,
                variationTolerance: 1,
                minAmount: parseUnits('100'),
              },
              {
                mToken: mTokenLoan.address,
                mTokenDataFeed: mTokenLoanToUsdDataFeed.address,
              },
              {
                feeReceiver: feeReceiver.address,
                tokensReceiver: tokensReceiver.address,
              },
              {
                instantFee: 100,
                instantDailyLimit: parseUnits('100000'),
              },
              {
                fiatAdditionalFee: 10000,
                fiatFlatFee: parseUnits('1'),
                minFiatRedeemAmount: parseUnits('100'),
                requestRedeemer: constants.AddressZero,
                loanLp: constants.AddressZero,
                loanLpFeeReceiver: constants.AddressZero,
                loanRepaymentAddress: constants.AddressZero,
                loanSwapperVault: constants.AddressZero,
              },
              constants.AddressZero,
            ),
          ).revertedWith('zero address');
        });
      });

      describe('setRedemptionVault()', () => {
        it('should fail: call from address without vault admin role', async () => {
          const { redemptionVaultWithMToken, regularAccounts } =
            await loadFixture(defaultDeploy);
          await expect(
            redemptionVaultWithMToken
              .connect(regularAccounts[0])
              .setRedemptionVault(regularAccounts[1].address),
          ).to.be.revertedWith('WMAC: hasnt role');
        });

        it('should fail: zero address', async () => {
          const { redemptionVaultWithMToken } = await loadFixture(
            defaultDeploy,
          );
          await expect(
            redemptionVaultWithMToken.setRedemptionVault(constants.AddressZero),
          ).to.be.revertedWith('zero address');
        });

        it('should fail: same address', async () => {
          const { redemptionVaultWithMToken, redemptionVaultLoanSwapper } =
            await loadFixture(defaultDeploy);
          await expect(
            redemptionVaultWithMToken.setRedemptionVault(
              redemptionVaultLoanSwapper.address,
            ),
          ).to.be.revertedWith('RVMT: already set');
        });

        it('should fail: when function is paused', async () => {
          const { redemptionVaultWithMToken, owner, regularAccounts } =
            await loadFixture(defaultDeploy);
          await pauseVaultFn(
            redemptionVaultWithMToken,
            encodeFnSelector('setRedemptionVault(address)'),
          );
          await setRedemptionVaultTest(
            { vault: redemptionVaultWithMToken, owner },
            regularAccounts[0].address,
            { revertMessage: 'WMAC: paused fn' },
          );
        });

        it('should succeed and emit SetRedemptionVault event', async () => {
          const { redemptionVaultWithMToken, owner, regularAccounts } =
            await loadFixture(defaultDeploy);

          const newVault = regularAccounts[0].address;

          await expect(redemptionVaultWithMToken.setRedemptionVault(newVault))
            .to.emit(redemptionVaultWithMToken, 'SetRedemptionVault')
            .withArgs(owner.address, newVault);

          expect(await redemptionVaultWithMToken.redemptionVault()).eq(
            newVault,
          );
        });
      });

      describe('checkAndRedeemMToken()', () => {
        it('should not redeem mTokenLoan when vault has sufficient tokenOut balance', async () => {
          const {
            redemptionVaultWithMToken,
            stableCoins,
            mTokenLoan,
            owner,
            dataFeed,
            redemptionVaultLoanSwapper,
          } = await loadFixture(defaultDeploy);

          await addPaymentTokenTest(
            { vault: redemptionVaultWithMToken, owner },
            stableCoins.dai,
            dataFeed.address,
            0,
            true,
          );
          await addPaymentTokenTest(
            { vault: redemptionVaultLoanSwapper, owner },
            stableCoins.dai,
            dataFeed.address,
            0,
            true,
          );

          await mintToken(stableCoins.dai, redemptionVaultWithMToken, 1000);
          await mintToken(mTokenLoan, redemptionVaultWithMToken, 1000);

          const mTbillBefore = await mTokenLoan.balanceOf(
            redemptionVaultWithMToken.address,
          );

          await redemptionVaultWithMToken.checkAndRedeemMToken(
            stableCoins.dai.address,
            parseUnits('500', 9),
            parseUnits('1'),
          );

          const mTbillAfter = await mTokenLoan.balanceOf(
            redemptionVaultWithMToken.address,
          );
          expect(mTbillAfter).to.equal(mTbillBefore);
        });

        it('should redeem missing amount via mToken RV', async () => {
          const {
            redemptionVaultWithMToken,
            stableCoins,
            mTokenLoan,
            owner,
            dataFeed,
            redemptionVaultLoanSwapper,
          } = await loadFixture(defaultDeploy);

          await addPaymentTokenTest(
            { vault: redemptionVaultWithMToken, owner },
            stableCoins.dai,
            dataFeed.address,
            0,
            true,
          );
          await addPaymentTokenTest(
            { vault: redemptionVaultLoanSwapper, owner },
            stableCoins.dai,
            dataFeed.address,
            0,
            true,
          );

          await mintToken(stableCoins.dai, redemptionVaultWithMToken, 500);
          await mintToken(mTokenLoan, redemptionVaultWithMToken, 10000);
          await mintToken(
            stableCoins.dai,
            redemptionVaultLoanSwapper,
            1_000_000,
          );

          const mTokenLoanBefore = await mTokenLoan.balanceOf(
            redemptionVaultWithMToken.address,
          );

          await redemptionVaultWithMToken.checkAndRedeemMToken(
            stableCoins.dai.address,
            parseUnits('1000', 9),
            parseUnits('1'),
          );

          const mTokenLoanAfter = await mTokenLoan.balanceOf(
            redemptionVaultWithMToken.address,
          );
          expect(mTokenLoanAfter).to.be.lt(mTokenLoanBefore);

          const daiAfter = await stableCoins.dai.balanceOf(
            redemptionVaultWithMToken.address,
          );
          expect(daiAfter).to.be.gte(parseUnits('1000', 9));
        });

        it('shouldnt revert when insufficient mTokenLoan balance', async () => {
          const {
            redemptionVaultWithMToken,
            stableCoins,
            owner,
            dataFeed,
            redemptionVaultLoanSwapper,
          } = await loadFixture(defaultDeploy);

          await addPaymentTokenTest(
            { vault: redemptionVaultWithMToken, owner },
            stableCoins.dai,
            dataFeed.address,
            0,
            true,
          );
          await addPaymentTokenTest(
            { vault: redemptionVaultLoanSwapper, owner },
            stableCoins.dai,
            dataFeed.address,
            0,
            true,
          );

          await expect(
            redemptionVaultWithMToken.checkAndRedeemMToken(
              stableCoins.dai.address,
              parseUnits('1000', 9),
              parseUnits('1'),
            ),
          ).to.not.be.reverted;
        });
      });

      describe('redeemInstant()', () => {
        it('should fail: when inner vault fee is not waived', async () => {
          const {
            owner,
            redemptionVaultWithMToken,
            stableCoins,
            mTokenLoan,
            mTBILL,
            mTokenLoanToUsdDataFeed,
            mTokenToUsdDataFeed,
            dataFeed,
            redemptionVaultLoanSwapper,
          } = await loadFixture(defaultDeploy);

          await setLoanLpTest(
            { redemptionVault: redemptionVaultWithMToken, owner },
            constants.AddressZero,
          );

          await addPaymentTokenTest(
            { vault: redemptionVaultWithMToken, owner },
            stableCoins.dai,
            dataFeed.address,
            0,
            true,
          );
          await addPaymentTokenTest(
            { vault: redemptionVaultLoanSwapper, owner },
            stableCoins.dai,
            dataFeed.address,
            0,
            true,
          );

          // Remove the waived fee — inner vault will charge fee on this contract
          await redemptionVaultLoanSwapper.removeWaivedFeeAccount(
            redemptionVaultWithMToken.address,
          );

          await mintToken(mTBILL, owner, 100_000);
          await mintToken(mTokenLoan, redemptionVaultWithMToken, 100_000);
          await mintToken(
            stableCoins.dai,
            redemptionVaultLoanSwapper,
            1_000_000,
          );
          await approveBase18(
            owner,
            mTBILL,
            redemptionVaultWithMToken,
            100_000,
          );

          // No DAI on vault — forces mTokenLoan redemption path where inner vault fee causes revert
          await redeemInstantWithMTokenTest(
            {
              redemptionVaultWithMToken,
              owner,
              mTokenLoan,
              mTBILL,
              mTokenToUsdDataFeed,
              mTokenLoanToUsdDataFeed,
            },
            stableCoins.dai,
            100,
            {
              revertMessage: 'RV: loan lp not configured',
            },
          );
        });

        it('should fail: vault has no mTokenLoan and no DAI', async () => {
          const {
            owner,
            redemptionVaultWithMToken,
            stableCoins,
            mTokenLoan,
            mTBILL,
            mTokenLoanToUsdDataFeed,
            mTokenToUsdDataFeed,
            dataFeed,
            redemptionVaultLoanSwapper,
          } = await loadFixture(defaultDeploy);

          await setLoanLpTest(
            { redemptionVault: redemptionVaultWithMToken, owner },
            constants.AddressZero,
          );

          await addPaymentTokenTest(
            { vault: redemptionVaultWithMToken, owner },
            stableCoins.dai,
            dataFeed.address,
            0,
            true,
          );
          await addPaymentTokenTest(
            { vault: redemptionVaultLoanSwapper, owner },
            stableCoins.dai,
            dataFeed.address,
            0,
            true,
          );

          await mintToken(mTBILL, owner, 100_000);
          await approveBase18(
            owner,
            mTBILL,
            redemptionVaultWithMToken,
            100_000,
          );

          await redeemInstantWithMTokenTest(
            {
              redemptionVaultWithMToken,
              owner,
              mTokenLoan,
              mTBILL,
              mTokenToUsdDataFeed,
              mTokenLoanToUsdDataFeed,
            },
            stableCoins.dai,
            100,
            {
              revertMessage: 'RV: loan lp not configured',
            },
          );
        });

        it('redeem 100 mTBILL, when vault has enough DAI and all fees are 0', async () => {
          const {
            owner,
            redemptionVaultWithMToken,
            stableCoins,
            mTokenLoan,
            mTBILL,
            mTokenLoanToUsdDataFeed,
            mTokenToUsdDataFeed,
            dataFeed,
            mockedAggregator,
          } = await loadFixture(defaultDeploy);

          await addPaymentTokenTest(
            { vault: redemptionVaultWithMToken, owner },
            stableCoins.dai,
            dataFeed.address,
            0,
            true,
          );

          await setRoundData({ mockedAggregator }, 1);

          await mintToken(mTBILL, owner, 100_000);
          await mintToken(
            stableCoins.dai,
            redemptionVaultWithMToken,
            1_000_000,
          );
          await mintToken(mTokenLoan, redemptionVaultWithMToken, 100_000);
          await approveBase18(
            owner,
            mTBILL,
            redemptionVaultWithMToken,
            100_000,
          );

          await setInstantFeeTest(
            { vault: redemptionVaultWithMToken, owner },
            0,
          );

          await redeemInstantWithMTokenTest(
            {
              redemptionVaultWithMToken,
              owner,
              mTokenLoan,
              mTBILL,
              mTokenToUsdDataFeed,
              mTokenLoanToUsdDataFeed,
            },
            stableCoins.dai,
            100,
          );
        });

        it('redeem 100 mTBILL, when vault has enough DAI (with fees)', async () => {
          const {
            owner,
            redemptionVaultWithMToken,
            stableCoins,
            mTokenLoan,
            mTBILL,
            mTokenLoanToUsdDataFeed,
            mTokenToUsdDataFeed,
            dataFeed,
            mockedAggregator,
          } = await loadFixture(defaultDeploy);

          await addPaymentTokenTest(
            { vault: redemptionVaultWithMToken, owner },
            stableCoins.dai,
            dataFeed.address,
            0,
            true,
          );

          await setRoundData({ mockedAggregator }, 1);

          await mintToken(mTBILL, owner, 100_000);
          await mintToken(
            stableCoins.dai,
            redemptionVaultWithMToken,
            1_000_000,
          );
          await mintToken(mTokenLoan, redemptionVaultWithMToken, 100_000);
          await approveBase18(
            owner,
            mTBILL,
            redemptionVaultWithMToken,
            100_000,
          );

          await redeemInstantWithMTokenTest(
            {
              redemptionVaultWithMToken,
              owner,
              mTokenLoan,
              mTBILL,
              mTokenToUsdDataFeed,
              mTokenLoanToUsdDataFeed,
            },
            stableCoins.dai,
            100,
          );
        });

        it('redeem 100 mTBILL, vault has no DAI => triggers mTokenLoan redemption', async () => {
          const {
            owner,
            redemptionVaultWithMToken,
            stableCoins,
            mTokenLoan,
            mTBILL,
            mTokenLoanToUsdDataFeed,
            mTokenToUsdDataFeed,
            dataFeed,
            redemptionVaultLoanSwapper,
          } = await loadFixture(defaultDeploy);

          await addPaymentTokenTest(
            { vault: redemptionVaultWithMToken, owner },
            stableCoins.dai,
            dataFeed.address,
            0,
            true,
          );
          await addPaymentTokenTest(
            { vault: redemptionVaultLoanSwapper, owner },
            stableCoins.dai,
            dataFeed.address,
            0,
            true,
          );

          await mintToken(mTBILL, owner, 100_000);
          await mintToken(mTokenLoan, redemptionVaultWithMToken, 100_000);
          await mintToken(
            stableCoins.dai,
            redemptionVaultLoanSwapper,
            1_000_000,
          );
          await approveBase18(
            owner,
            mTBILL,
            redemptionVaultWithMToken,
            100_000,
          );

          await redeemInstantWithMTokenTest(
            {
              redemptionVaultWithMToken,
              owner,
              mTokenLoan,
              mTBILL,
              mTokenToUsdDataFeed,
              mTokenLoanToUsdDataFeed,
              useMTokenSleeve: true,
              additionalLiquidity: async () => {
                return (
                  await mTokenLoan.balanceOf(redemptionVaultWithMToken.address)
                ).div(10 ** (await stableCoins.dai.decimals()));
              },
            },
            stableCoins.dai,
            100,
          );
        });

        it('redeem 100 mTBILL, vault has partial DAI => triggers partial mTokenLoan redemption', async () => {
          const {
            owner,
            redemptionVaultWithMToken,
            stableCoins,
            mTokenLoan,
            mTBILL,
            mTokenLoanToUsdDataFeed,
            mTokenToUsdDataFeed,
            dataFeed,
            redemptionVaultLoanSwapper,
          } = await loadFixture(defaultDeploy);

          await addPaymentTokenTest(
            { vault: redemptionVaultWithMToken, owner },
            stableCoins.dai,
            dataFeed.address,
            0,
            true,
          );
          await addPaymentTokenTest(
            { vault: redemptionVaultLoanSwapper, owner },
            stableCoins.dai,
            dataFeed.address,
            0,
            true,
          );

          await mintToken(mTBILL, owner, 100_000);
          await mintToken(mTokenLoan, redemptionVaultWithMToken, 100_000);
          await mintToken(stableCoins.dai, redemptionVaultWithMToken, 10);
          await mintToken(
            stableCoins.dai,
            redemptionVaultLoanSwapper,
            1_000_000,
          );
          await approveBase18(
            owner,
            mTBILL,
            redemptionVaultWithMToken,
            100_000,
          );

          await redeemInstantWithMTokenTest(
            {
              redemptionVaultWithMToken,
              owner,
              mTokenLoan,
              mTBILL,
              mTokenToUsdDataFeed,
              mTokenLoanToUsdDataFeed,
              useMTokenSleeve: true,
              additionalLiquidity: async () => {
                return (
                  await mTokenLoan.balanceOf(redemptionVaultWithMToken.address)
                ).div(10 ** (await stableCoins.dai.decimals()));
              },
            },
            stableCoins.dai,
            100,
          );
        });

        it('redeem 100 mTBILL with divergent rates (mTBILL=$5, mTokenLoan=$2) => triggers mTokenLoan redemption', async () => {
          const {
            owner,
            redemptionVaultWithMToken,
            stableCoins,
            mTokenLoan,
            mTBILL,
            mTokenLoanToUsdDataFeed,
            mTokenToUsdDataFeed,
            dataFeed,
            redemptionVaultLoanSwapper,
            mockedAggregatorMTokenLoan,
          } = await loadFixture(defaultDeploy);

          await addWaivedFeeAccountTest(
            { vault: redemptionVaultWithMToken, owner },
            redemptionVaultLoanSwapper.address,
          );

          await addPaymentTokenTest(
            { vault: redemptionVaultWithMToken, owner },
            stableCoins.dai,
            dataFeed.address,
            0,
            true,
          );
          await addPaymentTokenTest(
            { vault: redemptionVaultLoanSwapper, owner },
            stableCoins.dai,
            dataFeed.address,
            0,
            true,
          );

          await setRoundData(
            { mockedAggregator: mockedAggregatorMTokenLoan },
            2,
          );

          await mintToken(mTBILL, owner, 100_000);
          await mintToken(mTokenLoan, redemptionVaultWithMToken, 100_000);
          await mintToken(
            stableCoins.dai,
            redemptionVaultLoanSwapper,
            1_000_000,
          );
          await approveBase18(
            owner,
            mTBILL,
            redemptionVaultWithMToken,
            100_000,
          );

          await redeemInstantWithMTokenTest(
            {
              redemptionVaultWithMToken,
              owner,
              mTokenLoan,
              mTBILL,
              mTokenToUsdDataFeed,
              mTokenLoanToUsdDataFeed,
              useMTokenSleeve: true,
              additionalLiquidity: async () => {
                return (
                  await mTokenLoan.balanceOf(redemptionVaultWithMToken.address)
                )
                  .div(10 ** (await stableCoins.dai.decimals()))
                  .mul(2);
              },
            },
            stableCoins.dai,
            100,
          );
        });

        it('redeem with waived fee', async () => {
          const {
            owner,
            redemptionVaultWithMToken,
            stableCoins,
            mTokenLoan,
            mTBILL,
            mTokenLoanToUsdDataFeed,
            mTokenToUsdDataFeed,
            dataFeed,
            mockedAggregator,
          } = await loadFixture(defaultDeploy);

          await addPaymentTokenTest(
            { vault: redemptionVaultWithMToken, owner },
            stableCoins.dai,
            dataFeed.address,
            0,
            true,
          );
          await addWaivedFeeAccountTest(
            { vault: redemptionVaultWithMToken, owner },
            owner.address,
          );

          await setRoundData({ mockedAggregator }, 1);

          await mintToken(mTBILL, owner, 100_000);
          await mintToken(
            stableCoins.dai,
            redemptionVaultWithMToken,
            1_000_000,
          );
          await mintToken(mTokenLoan, redemptionVaultWithMToken, 100_000);
          await approveBase18(
            owner,
            mTBILL,
            redemptionVaultWithMToken,
            100_000,
          );

          await redeemInstantWithMTokenTest(
            {
              redemptionVaultWithMToken,
              owner,
              mTokenLoan,
              mTBILL,
              mTokenToUsdDataFeed,
              mTokenLoanToUsdDataFeed,
              waivedFee: true,
            },
            stableCoins.dai,
            100,
          );
        });
      });

      describe('ceiling division math correctness', () => {
        const TOKEN_DECIMALS: Record<string, number> = {
          usdc6: 6,
          usdc: 8,
          dai: 9,
          usdt: 18,
        };

        /**
         * Mirrors the Solidity math in RedemptionVaultWithMToken._redeemInstant:
         *   amountTokenOutWithoutFee = truncate(
         *     (amountMTokenWithoutFee * mTokenRate / tokenOutRate), tokenDecimals
         *   )
         * Returns the expected user output in NATIVE decimals.
         */
        function computeExpectedTokenOut(
          amountMTokenIn: BigNumber,
          mTokenRate: BigNumber,
          tokenOutRate: BigNumber,
          tokenDecimals: number,
          feePercent: number,
          isWaived: boolean,
        ): BigNumber {
          const fee = isWaived
            ? BigNumber.from(0)
            : amountMTokenIn.mul(feePercent).div(10000);
          const amountWithoutFee = amountMTokenIn.sub(fee);
          const base18Out = amountWithoutFee.mul(mTokenRate).div(tokenOutRate);
          const scale = BigNumber.from(10).pow(18 - tokenDecimals);
          const truncated = base18Out.div(scale);
          return truncated;
        }

        /**
         * Lean helper: configures both outer + inner vault for a given tokenOut,
         * sets rates, mints tokens, and returns everything needed to call redeemInstant.
         * The outer vault has ZERO tokenOut to force the inner-vault redemption path.
         */
        async function setupCeilDivTest(opts: {
          fixture: Awaited<ReturnType<typeof defaultDeploy>>;
          tokenKey: 'usdc6' | 'usdc' | 'dai' | 'usdt';
          mTbillRate: number;
          isStable: boolean;
          tokenOutRate?: number;
          redeemAmount?: number;
        }) {
          const {
            redemptionVaultWithMToken,
            redemptionVaultLoanSwapper,
            owner,
            mTokenLoan,
            mTBILL,
            mTokenToUsdDataFeed,
            mTokenLoanToUsdDataFeed,
            mockedAggregatorMToken,
            mockedAggregatorMTokenLoan,
            mockedAggregator,
            dataFeed,
            stableCoins,
          } = opts.fixture;

          const token = stableCoins[opts.tokenKey];

          await addPaymentTokenTest(
            { vault: redemptionVaultWithMToken, owner },
            token,
            dataFeed.address,
            0,
            opts.isStable,
          );
          await addPaymentTokenTest(
            { vault: redemptionVaultLoanSwapper, owner },
            token,
            dataFeed.address,
            0,
            opts.isStable,
          );

          await setRoundData(
            { mockedAggregator: mockedAggregatorMToken },
            opts.mTbillRate,
          );
          if (opts.tokenOutRate !== undefined) {
            await setRoundData({ mockedAggregator }, opts.tokenOutRate);
          }

          await setInstantFeeTest(
            { vault: redemptionVaultWithMToken, owner },
            0,
          );

          const amount = opts.redeemAmount ?? 100;

          await mintToken(mTBILL, owner, amount * 100);
          await mintToken(mTokenLoan, redemptionVaultWithMToken, amount * 100);
          await mintToken(token, redemptionVaultLoanSwapper, amount * 10000);
          await approveBase18(
            owner,
            mTBILL,
            redemptionVaultWithMToken,
            amount * 100,
          );

          const mFoneRate = await mTokenToUsdDataFeed.getDataInBase18();
          const tokenOutRate = opts.isStable
            ? parseUnits('1')
            : await dataFeed.getDataInBase18();

          return {
            token,
            amount,
            redemptionVaultWithMToken,
            redemptionVaultLoanSwapper,
            owner,
            mTokenLoan,
            mTBILL,
            mTokenToUsdDataFeed,
            mTokenLoanToUsdDataFeed,
            mockedAggregatorMTokenLoan,
            mockedAggregator,
            mFoneRate,
            tokenOutRate,
          };
        }

        describe('with base RedemptionVault as inner vault', () => {
          const tokenVariants: Array<{
            key: 'usdc6' | 'usdc' | 'dai' | 'usdt';
            label: string;
          }> = [
            { key: 'usdc6', label: '6-dec' },
            { key: 'usdc', label: '8-dec' },
            { key: 'dai', label: '9-dec' },
            { key: 'usdt', label: '18-dec' },
          ];

          for (const { key, label } of tokenVariants) {
            describe(`tokenOut ${label} (${key})`, () => {
              it('succeeds with exact division (mTokenLoan=5, stable)', async () => {
                const fixture = await loadFixture(defaultDeploy);
                const {
                  token,
                  amount,
                  redemptionVaultWithMToken,
                  owner,
                  mTokenLoan,
                  mFoneRate,
                  tokenOutRate,
                } = await setupCeilDivTest({
                  fixture,
                  tokenKey: key,
                  mTbillRate: 5,
                  isStable: true,
                });

                const mTbillBefore = await mTokenLoan.balanceOf(
                  redemptionVaultWithMToken.address,
                );
                const userTokenBefore = await token.balanceOf(owner.address);

                await redemptionVaultWithMToken
                  .connect(owner)
                  ['redeemInstant(address,uint256,uint256)'](
                    token.address,
                    parseUnits(amount.toString()),
                    0,
                  );

                expect(
                  await mTokenLoan.balanceOf(redemptionVaultWithMToken.address),
                ).to.be.lt(mTbillBefore);

                const expected = computeExpectedTokenOut(
                  parseUnits(amount.toString()),
                  mFoneRate,
                  tokenOutRate,
                  TOKEN_DECIMALS[key],
                  0,
                  true,
                );
                const userTokenAfter = await token.balanceOf(owner.address);
                expect(userTokenAfter.sub(userTokenBefore)).to.equal(expected);
              });

              it('succeeds with remainder-producing rate (mTokenLoan=1.05, stable)', async () => {
                const fixture = await loadFixture(defaultDeploy);
                const {
                  token,
                  amount,
                  redemptionVaultWithMToken,
                  owner,
                  mTokenLoan,
                  mFoneRate,
                  tokenOutRate,
                } = await setupCeilDivTest({
                  fixture,
                  tokenKey: key,
                  mTbillRate: 1.05,
                  isStable: true,
                });

                const mTbillBefore = await mTokenLoan.balanceOf(
                  redemptionVaultWithMToken.address,
                );
                const userTokenBefore = await token.balanceOf(owner.address);

                await redemptionVaultWithMToken
                  .connect(owner)
                  ['redeemInstant(address,uint256,uint256)'](
                    token.address,
                    parseUnits(amount.toString()),
                    0,
                  );

                expect(
                  await mTokenLoan.balanceOf(redemptionVaultWithMToken.address),
                ).to.be.lt(mTbillBefore);

                const expected = computeExpectedTokenOut(
                  parseUnits(amount.toString()),
                  mFoneRate,
                  tokenOutRate,
                  TOKEN_DECIMALS[key],
                  0,
                  true,
                );
                const userTokenAfter = await token.balanceOf(owner.address);
                expect(userTokenAfter.sub(userTokenBefore)).to.equal(expected);
              });

              it('succeeds with high mTokenLoan rate (mTokenLoan=100, stable)', async () => {
                const fixture = await loadFixture(defaultDeploy);
                const {
                  token,
                  amount,
                  redemptionVaultWithMToken,
                  owner,
                  mTokenLoan,
                  mFoneRate,
                  tokenOutRate,
                } = await setupCeilDivTest({
                  fixture,
                  tokenKey: key,
                  mTbillRate: 100,
                  isStable: true,
                });

                const mTbillBefore = await mTokenLoan.balanceOf(
                  redemptionVaultWithMToken.address,
                );
                const userTokenBefore = await token.balanceOf(owner.address);

                await redemptionVaultWithMToken
                  .connect(owner)
                  ['redeemInstant(address,uint256,uint256)'](
                    token.address,
                    parseUnits(amount.toString()),
                    0,
                  );

                expect(
                  await mTokenLoan.balanceOf(redemptionVaultWithMToken.address),
                ).to.be.lt(mTbillBefore);

                const expected = computeExpectedTokenOut(
                  parseUnits(amount.toString()),
                  mFoneRate,
                  tokenOutRate,
                  TOKEN_DECIMALS[key],
                  0,
                  true,
                );
                const userTokenAfter = await token.balanceOf(owner.address);
                expect(userTokenAfter.sub(userTokenBefore)).to.equal(expected);
              });

              it('succeeds with low mTokenLoan rate (mTokenLoan=0.5, stable)', async () => {
                const fixture = await loadFixture(defaultDeploy);
                const {
                  token,
                  amount,
                  redemptionVaultWithMToken,
                  owner,
                  mTokenLoan,
                  mFoneRate,
                  tokenOutRate,
                } = await setupCeilDivTest({
                  fixture,
                  tokenKey: key,
                  mTbillRate: 0.5,
                  isStable: true,
                });

                const mTbillBefore = await mTokenLoan.balanceOf(
                  redemptionVaultWithMToken.address,
                );
                const userTokenBefore = await token.balanceOf(owner.address);

                await redemptionVaultWithMToken
                  .connect(owner)
                  ['redeemInstant(address,uint256,uint256)'](
                    token.address,
                    parseUnits(amount.toString()),
                    0,
                  );

                expect(
                  await mTokenLoan.balanceOf(redemptionVaultWithMToken.address),
                ).to.be.lt(mTbillBefore);

                const expected = computeExpectedTokenOut(
                  parseUnits(amount.toString()),
                  mFoneRate,
                  tokenOutRate,
                  TOKEN_DECIMALS[key],
                  0,
                  true,
                );
                const userTokenAfter = await token.balanceOf(owner.address);
                expect(userTokenAfter.sub(userTokenBefore)).to.equal(expected);
              });

              it('succeeds with near-boundary rate (mTokenLoan=1.00000003, stable)', async () => {
                const fixture = await loadFixture(defaultDeploy);
                const {
                  token,
                  redemptionVaultWithMToken,
                  owner,
                  mTokenLoan,
                  mFoneRate,
                  tokenOutRate,
                } = await setupCeilDivTest({
                  fixture,
                  tokenKey: key,
                  mTbillRate: 1.00000003,
                  isStable: true,
                  redeemAmount: 10000,
                });

                const mTbillBefore = await mTokenLoan.balanceOf(
                  redemptionVaultWithMToken.address,
                );
                const userTokenBefore = await token.balanceOf(owner.address);

                await redemptionVaultWithMToken
                  .connect(owner)
                  ['redeemInstant(address,uint256,uint256)'](
                    token.address,
                    parseUnits('10000'),
                    0,
                  );

                expect(
                  await mTokenLoan.balanceOf(redemptionVaultWithMToken.address),
                ).to.be.lt(mTbillBefore);

                const expected = computeExpectedTokenOut(
                  parseUnits('10000'),
                  mFoneRate,
                  tokenOutRate,
                  TOKEN_DECIMALS[key],
                  0,
                  true,
                );
                const userTokenAfter = await token.balanceOf(owner.address);
                expect(userTokenAfter.sub(userTokenBefore)).to.equal(expected);
              });

              it('succeeds with non-stable tokenOut (mTokenLoan=1.05, tokenOut=1.03)', async () => {
                const fixture = await loadFixture(defaultDeploy);
                const {
                  token,
                  amount,
                  redemptionVaultWithMToken,
                  owner,
                  mTokenLoan,
                  mFoneRate,
                  tokenOutRate,
                } = await setupCeilDivTest({
                  fixture,
                  tokenKey: key,
                  mTbillRate: 1.05,
                  isStable: false,
                  tokenOutRate: 1.03,
                });

                const mTbillBefore = await mTokenLoan.balanceOf(
                  redemptionVaultWithMToken.address,
                );
                const userTokenBefore = await token.balanceOf(owner.address);

                await redemptionVaultWithMToken
                  .connect(owner)
                  ['redeemInstant(address,uint256,uint256)'](
                    token.address,
                    parseUnits(amount.toString()),
                    0,
                  );

                expect(
                  await mTokenLoan.balanceOf(redemptionVaultWithMToken.address),
                ).to.be.lt(mTbillBefore);

                const expected = computeExpectedTokenOut(
                  parseUnits(amount.toString()),
                  mFoneRate,
                  tokenOutRate,
                  TOKEN_DECIMALS[key],
                  0,
                  true,
                );
                const userTokenAfter = await token.balanceOf(owner.address);
                expect(userTokenAfter.sub(userTokenBefore)).to.equal(expected);
              });

              it('succeeds with small redeem (1 mTBILL, mTokenLoan=1.05, stable)', async () => {
                const fixture = await loadFixture(defaultDeploy);
                const {
                  token,
                  redemptionVaultWithMToken,
                  owner,
                  mTokenLoan,
                  mFoneRate,
                  tokenOutRate,
                } = await setupCeilDivTest({
                  fixture,
                  tokenKey: key,
                  mTbillRate: 1.05,
                  isStable: true,
                  redeemAmount: 1,
                });

                const mTbillBefore = await mTokenLoan.balanceOf(
                  redemptionVaultWithMToken.address,
                );
                const userTokenBefore = await token.balanceOf(owner.address);

                await setMinAmountTest(
                  { vault: redemptionVaultWithMToken, owner },
                  0,
                );

                await redemptionVaultWithMToken
                  .connect(owner)
                  ['redeemInstant(address,uint256,uint256)'](
                    token.address,
                    parseUnits('1'),
                    0,
                  );

                expect(
                  await mTokenLoan.balanceOf(redemptionVaultWithMToken.address),
                ).to.be.lt(mTbillBefore);

                const expected = computeExpectedTokenOut(
                  parseUnits('1'),
                  mFoneRate,
                  tokenOutRate,
                  TOKEN_DECIMALS[key],
                  0,
                  true,
                );
                const userTokenAfter = await token.balanceOf(owner.address);
                expect(userTokenAfter.sub(userTokenBefore)).to.equal(expected);
              });

              it('succeeds with large redeem near daily limit (mTokenLoan=1.05, stable)', async () => {
                const fixture = await loadFixture(defaultDeploy);
                const {
                  token,
                  redemptionVaultWithMToken,
                  owner,
                  mTokenLoan,
                  mFoneRate,
                  tokenOutRate,
                } = await setupCeilDivTest({
                  fixture,
                  tokenKey: key,
                  mTbillRate: 1.05,
                  isStable: true,
                  redeemAmount: 50000,
                });

                const mTbillBefore = await mTokenLoan.balanceOf(
                  redemptionVaultWithMToken.address,
                );
                const userTokenBefore = await token.balanceOf(owner.address);

                await redemptionVaultWithMToken
                  .connect(owner)
                  ['redeemInstant(address,uint256,uint256)'](
                    token.address,
                    parseUnits('50000'),
                    0,
                  );

                expect(
                  await mTokenLoan.balanceOf(redemptionVaultWithMToken.address),
                ).to.be.lt(mTbillBefore);

                const expected = computeExpectedTokenOut(
                  parseUnits('50000'),
                  mFoneRate,
                  tokenOutRate,
                  TOKEN_DECIMALS[key],
                  0,
                  true,
                );
                const userTokenAfter = await token.balanceOf(owner.address);
                expect(userTokenAfter.sub(userTokenBefore)).to.equal(expected);
              });
            });
          }
        });

        describe('with RedemptionVaultWithAave as inner vault', () => {
          for (const { key, label } of [
            { key: 'usdc' as const, label: '8-dec' },
            { key: 'usdc6' as const, label: '6-dec' },
          ]) {
            describe(`tokenOut ${label} (${key})`, () => {
              async function setupAaveInnerVault(
                fixture: Awaited<ReturnType<typeof defaultDeploy>>,
                tokenKey: 'usdc' | 'usdc6',
              ) {
                const {
                  redemptionVaultWithMToken,
                  redemptionVaultWithAave,
                  aavePoolMock,
                  aUSDC,
                  owner,
                  mTBILL,
                  mTokenToUsdDataFeed,
                  mTokenLoanToUsdDataFeed,
                  mockedAggregatorMToken,
                  dataFeed,
                  stableCoins,
                } = fixture;

                const token = stableCoins[tokenKey];

                await redemptionVaultWithMToken.setRedemptionVault(
                  redemptionVaultWithAave.address,
                );

                await addPaymentTokenTest(
                  { vault: redemptionVaultWithMToken, owner },
                  token,
                  dataFeed.address,
                  0,
                  true,
                );
                await addPaymentTokenTest(
                  { vault: redemptionVaultWithAave, owner },
                  token,
                  dataFeed.address,
                  0,
                  true,
                );

                await redemptionVaultWithAave.addWaivedFeeAccount(
                  redemptionVaultWithMToken.address,
                );

                if (tokenKey === 'usdc6') {
                  const { ERC20Mock__factory } = await import(
                    '../../typechain-types'
                  );
                  const aUsdc6 = await new ERC20Mock__factory(owner).deploy(6);
                  await aavePoolMock.setReserveAToken(
                    token.address,
                    aUsdc6.address,
                  );
                  await token.mint(
                    aavePoolMock.address,
                    parseUnits('1000000', 6),
                  );
                  await aUsdc6.mint(
                    redemptionVaultWithAave.address,
                    parseUnits('1000000', 6),
                  );
                  await redemptionVaultWithAave.setAavePool(
                    token.address,
                    aavePoolMock.address,
                  );
                } else {
                  await token.mint(aavePoolMock.address, parseUnits('1000000'));
                  await aUSDC.mint(
                    redemptionVaultWithAave.address,
                    parseUnits('1000000'),
                  );
                  await redemptionVaultWithAave.setAavePool(
                    token.address,
                    aavePoolMock.address,
                  );
                }

                await setInstantFeeTest(
                  { vault: redemptionVaultWithMToken, owner },
                  0,
                );

                return {
                  token,
                  redemptionVaultWithMToken,
                  owner,
                  mTBILL,
                  mTokenToUsdDataFeed,
                  mTokenLoanToUsdDataFeed,
                  mockedAggregatorMToken,
                };
              }

              it('succeeds with remainder-producing rate (mTokenLoan=1.05, stable)', async () => {
                const fixture = await loadFixture(defaultDeploy);
                const {
                  token,
                  redemptionVaultWithMToken,
                  owner,
                  mTBILL,
                  mockedAggregatorMToken,
                } = await setupAaveInnerVault(fixture, key);

                await setRoundData(
                  { mockedAggregator: mockedAggregatorMToken },
                  1.05,
                );
                await mintToken(mTBILL, owner, 10000);
                await mintToken(mTBILL, redemptionVaultWithMToken, 10000);
                await approveBase18(
                  owner,
                  mTBILL,
                  redemptionVaultWithMToken,
                  10000,
                );

                const mTbillBefore = await mTBILL.balanceOf(
                  redemptionVaultWithMToken.address,
                );

                await redemptionVaultWithMToken
                  .connect(owner)
                  ['redeemInstant(address,uint256,uint256)'](
                    token.address,
                    parseUnits('100'),
                    0,
                  );

                expect(
                  await mTBILL.balanceOf(redemptionVaultWithMToken.address),
                ).to.be.lt(mTbillBefore);
              });

              it('succeeds with high mTokenLoan rate (mTokenLoan=100, stable)', async () => {
                const fixture = await loadFixture(defaultDeploy);
                const {
                  token,
                  redemptionVaultWithMToken,
                  owner,
                  mTBILL,
                  mockedAggregatorMToken,
                } = await setupAaveInnerVault(fixture, key);

                await setRoundData(
                  { mockedAggregator: mockedAggregatorMToken },
                  100,
                );
                await mintToken(mTBILL, owner, 10000);
                await mintToken(mTBILL, redemptionVaultWithMToken, 10000);
                await approveBase18(
                  owner,
                  mTBILL,
                  redemptionVaultWithMToken,
                  10000,
                );

                const mTbillBefore = await mTBILL.balanceOf(
                  redemptionVaultWithMToken.address,
                );

                await redemptionVaultWithMToken
                  .connect(owner)
                  ['redeemInstant(address,uint256,uint256)'](
                    token.address,
                    parseUnits('100'),
                    0,
                  );

                expect(
                  await mTBILL.balanceOf(redemptionVaultWithMToken.address),
                ).to.be.lt(mTbillBefore);
              });

              it('succeeds with near-boundary rate (mTokenLoan=1.00000003, stable)', async () => {
                const fixture = await loadFixture(defaultDeploy);
                const {
                  token,
                  redemptionVaultWithMToken,
                  owner,
                  mTBILL,
                  mockedAggregatorMToken,
                } = await setupAaveInnerVault(fixture, key);

                await setRoundData(
                  { mockedAggregator: mockedAggregatorMToken },
                  1.00000003,
                );
                await mintToken(mTBILL, owner, 100000);
                await mintToken(mTBILL, redemptionVaultWithMToken, 100000);
                await approveBase18(
                  owner,
                  mTBILL,
                  redemptionVaultWithMToken,
                  100000,
                );

                const mTbillBefore = await mTBILL.balanceOf(
                  redemptionVaultWithMToken.address,
                );

                await redemptionVaultWithMToken
                  .connect(owner)
                  ['redeemInstant(address,uint256,uint256)'](
                    token.address,
                    parseUnits('10000'),
                    0,
                  );

                expect(
                  await mTBILL.balanceOf(redemptionVaultWithMToken.address),
                ).to.be.lt(mTbillBefore);
              });
            });
          }
        });

        describe('with RedemptionVaultWithMorpho as inner vault', () => {
          for (const { key, label } of [
            { key: 'usdc' as const, label: '8-dec' },
            { key: 'usdc6' as const, label: '6-dec' },
          ]) {
            describe(`tokenOut ${label} (${key})`, () => {
              async function setupMorphoInnerVault(
                fixture: Awaited<ReturnType<typeof defaultDeploy>>,
                tokenKey: 'usdc' | 'usdc6',
              ) {
                const {
                  redemptionVaultWithMToken,
                  redemptionVaultWithMorpho,
                  morphoVaultMock,
                  owner,
                  mTBILL,
                  mTokenToUsdDataFeed,
                  mTokenLoanToUsdDataFeed,
                  mockedAggregatorMToken,
                  dataFeed,
                  stableCoins,
                } = fixture;

                const token = stableCoins[tokenKey];

                await redemptionVaultWithMToken.setRedemptionVault(
                  redemptionVaultWithMorpho.address,
                );

                await addPaymentTokenTest(
                  { vault: redemptionVaultWithMToken, owner },
                  token,
                  dataFeed.address,
                  0,
                  true,
                );
                await addPaymentTokenTest(
                  { vault: redemptionVaultWithMorpho, owner },
                  token,
                  dataFeed.address,
                  0,
                  true,
                );

                await redemptionVaultWithMorpho.addWaivedFeeAccount(
                  redemptionVaultWithMToken.address,
                );

                if (tokenKey === 'usdc6') {
                  const { MorphoVaultMock__factory } = await import(
                    '../../typechain-types'
                  );
                  const morphoUsdc6 = await new MorphoVaultMock__factory(
                    owner,
                  ).deploy(token.address);
                  await token.mint(
                    morphoUsdc6.address,
                    parseUnits('1000000', 6),
                  );
                  await morphoUsdc6.mint(
                    redemptionVaultWithMorpho.address,
                    parseUnits('1000000', 6),
                  );
                  await redemptionVaultWithMorpho.setMorphoVault(
                    token.address,
                    morphoUsdc6.address,
                  );
                } else {
                  await token.mint(
                    morphoVaultMock.address,
                    parseUnits('1000000'),
                  );
                  await morphoVaultMock.mint(
                    redemptionVaultWithMorpho.address,
                    parseUnits('1000000'),
                  );
                  await redemptionVaultWithMorpho.setMorphoVault(
                    token.address,
                    morphoVaultMock.address,
                  );
                }

                await setInstantFeeTest(
                  { vault: redemptionVaultWithMToken, owner },
                  0,
                );

                return {
                  token,
                  redemptionVaultWithMToken,
                  owner,
                  mTBILL,
                  mTokenToUsdDataFeed,
                  mTokenLoanToUsdDataFeed,
                  mockedAggregatorMToken,
                };
              }

              it('succeeds with remainder-producing rate (mTokenLoan=1.05, stable)', async () => {
                const fixture = await loadFixture(defaultDeploy);
                const {
                  token,
                  redemptionVaultWithMToken,
                  owner,
                  mTBILL,
                  mockedAggregatorMToken,
                } = await setupMorphoInnerVault(fixture, key);

                await setRoundData(
                  { mockedAggregator: mockedAggregatorMToken },
                  1.05,
                );
                await mintToken(mTBILL, owner, 10000);
                await mintToken(mTBILL, redemptionVaultWithMToken, 10000);
                await approveBase18(
                  owner,
                  mTBILL,
                  redemptionVaultWithMToken,
                  10000,
                );

                const mTbillBefore = await mTBILL.balanceOf(
                  redemptionVaultWithMToken.address,
                );

                await redemptionVaultWithMToken
                  .connect(owner)
                  ['redeemInstant(address,uint256,uint256)'](
                    token.address,
                    parseUnits('100'),
                    0,
                  );

                expect(
                  await mTBILL.balanceOf(redemptionVaultWithMToken.address),
                ).to.be.lt(mTbillBefore);
              });

              it('succeeds with high mTokenLoan rate (mTokenLoan=100, stable)', async () => {
                const fixture = await loadFixture(defaultDeploy);
                const {
                  token,
                  redemptionVaultWithMToken,
                  owner,
                  mTBILL,
                  mockedAggregatorMToken,
                } = await setupMorphoInnerVault(fixture, key);

                await setRoundData(
                  { mockedAggregator: mockedAggregatorMToken },
                  100,
                );
                await mintToken(mTBILL, owner, 10000);
                await mintToken(mTBILL, redemptionVaultWithMToken, 10000);
                await approveBase18(
                  owner,
                  mTBILL,
                  redemptionVaultWithMToken,
                  10000,
                );

                const mTbillBefore = await mTBILL.balanceOf(
                  redemptionVaultWithMToken.address,
                );

                await redemptionVaultWithMToken
                  .connect(owner)
                  ['redeemInstant(address,uint256,uint256)'](
                    token.address,
                    parseUnits('100'),
                    0,
                  );

                expect(
                  await mTBILL.balanceOf(redemptionVaultWithMToken.address),
                ).to.be.lt(mTbillBefore);
              });

              it('succeeds with near-boundary rate (mTokenLoan=1.00000003, stable)', async () => {
                const fixture = await loadFixture(defaultDeploy);
                const {
                  token,
                  redemptionVaultWithMToken,
                  owner,
                  mTBILL,
                  mockedAggregatorMToken,
                } = await setupMorphoInnerVault(fixture, key);

                await setRoundData(
                  { mockedAggregator: mockedAggregatorMToken },
                  1.00000003,
                );
                await mintToken(mTBILL, owner, 100000);
                await mintToken(mTBILL, redemptionVaultWithMToken, 100000);
                await approveBase18(
                  owner,
                  mTBILL,
                  redemptionVaultWithMToken,
                  100000,
                );

                const mTbillBefore = await mTBILL.balanceOf(
                  redemptionVaultWithMToken.address,
                );

                await redemptionVaultWithMToken
                  .connect(owner)
                  ['redeemInstant(address,uint256,uint256)'](
                    token.address,
                    parseUnits('10000'),
                    0,
                  );

                expect(
                  await mTBILL.balanceOf(redemptionVaultWithMToken.address),
                ).to.be.lt(mTbillBefore);
              });
            });
          }
        });

        describe('with RedemptionVaultWithUSTB as inner vault', () => {
          describe('tokenOut 8-dec (usdc — USTB only supports its configured USDC)', () => {
            async function setupUstbInnerVault(
              fixture: Awaited<ReturnType<typeof defaultDeploy>>,
            ) {
              const {
                redemptionVaultWithMToken,
                redemptionVaultWithUSTB,
                ustbToken,
                ustbRedemption,
                owner,
                mTBILL,
                mTokenToUsdDataFeed,
                mTokenLoanToUsdDataFeed,
                mockedAggregatorMToken,
                dataFeed,
                stableCoins,
              } = fixture;

              const token = stableCoins.usdc;

              await redemptionVaultWithMToken.setRedemptionVault(
                redemptionVaultWithUSTB.address,
              );

              await addPaymentTokenTest(
                { vault: redemptionVaultWithMToken, owner },
                token,
                dataFeed.address,
                0,
                true,
              );
              await addPaymentTokenTest(
                { vault: redemptionVaultWithUSTB, owner },
                token,
                dataFeed.address,
                0,
                true,
              );

              await redemptionVaultWithUSTB.addWaivedFeeAccount(
                redemptionVaultWithMToken.address,
              );

              await ustbToken.mint(
                redemptionVaultWithUSTB.address,
                parseUnits('1000000', 6),
              );
              await token.mint(ustbRedemption.address, parseUnits('1000000'));

              await setInstantFeeTest(
                { vault: redemptionVaultWithMToken, owner },
                0,
              );

              return {
                token,
                redemptionVaultWithMToken,
                owner,
                mTBILL,
                mTokenToUsdDataFeed,
                mTokenLoanToUsdDataFeed,
                mockedAggregatorMToken,
              };
            }

            it('succeeds with remainder-producing rate (mTokenLoan=1.05, stable)', async () => {
              const fixture = await loadFixture(defaultDeploy);
              const {
                token,
                redemptionVaultWithMToken,
                owner,
                mTBILL,
                mockedAggregatorMToken,
              } = await setupUstbInnerVault(fixture);

              await setRoundData(
                { mockedAggregator: mockedAggregatorMToken },
                1.05,
              );
              await mintToken(mTBILL, owner, 10000);
              await mintToken(mTBILL, redemptionVaultWithMToken, 10000);
              await approveBase18(
                owner,
                mTBILL,
                redemptionVaultWithMToken,
                10000,
              );

              const mTbillBefore = await mTBILL.balanceOf(
                redemptionVaultWithMToken.address,
              );

              await redemptionVaultWithMToken
                .connect(owner)
                ['redeemInstant(address,uint256,uint256)'](
                  token.address,
                  parseUnits('100'),
                  0,
                );

              expect(
                await mTBILL.balanceOf(redemptionVaultWithMToken.address),
              ).to.be.lt(mTbillBefore);
            });

            it('succeeds with high mTokenLoan rate (mTokenLoan=100, stable)', async () => {
              const fixture = await loadFixture(defaultDeploy);
              const {
                token,
                redemptionVaultWithMToken,
                owner,
                mTBILL,
                mockedAggregatorMToken,
              } = await setupUstbInnerVault(fixture);

              await setRoundData(
                { mockedAggregator: mockedAggregatorMToken },
                100,
              );
              await mintToken(mTBILL, owner, 10000);
              await mintToken(mTBILL, redemptionVaultWithMToken, 10000);
              await approveBase18(
                owner,
                mTBILL,
                redemptionVaultWithMToken,
                10000,
              );

              const mTbillBefore = await mTBILL.balanceOf(
                redemptionVaultWithMToken.address,
              );

              await redemptionVaultWithMToken
                .connect(owner)
                ['redeemInstant(address,uint256,uint256)'](
                  token.address,
                  parseUnits('100'),
                  0,
                );

              expect(
                await mTBILL.balanceOf(redemptionVaultWithMToken.address),
              ).to.be.lt(mTbillBefore);
            });

            it('succeeds with near-boundary rate (mTokenLoan=1.00000003, stable)', async () => {
              const fixture = await loadFixture(defaultDeploy);
              const {
                token,
                redemptionVaultWithMToken,
                owner,
                mTBILL,
                mockedAggregatorMToken,
              } = await setupUstbInnerVault(fixture);

              await setRoundData(
                { mockedAggregator: mockedAggregatorMToken },
                1.00000003,
              );
              await mintToken(mTBILL, owner, 100000);
              await mintToken(mTBILL, redemptionVaultWithMToken, 100000);
              await approveBase18(
                owner,
                mTBILL,
                redemptionVaultWithMToken,
                100000,
              );

              const mTbillBefore = await mTBILL.balanceOf(
                redemptionVaultWithMToken.address,
              );

              await redemptionVaultWithMToken
                .connect(owner)
                ['redeemInstant(address,uint256,uint256)'](
                  token.address,
                  parseUnits('10000'),
                  0,
                );

              expect(
                await mTBILL.balanceOf(redemptionVaultWithMToken.address),
              ).to.be.lt(mTbillBefore);
            });
          });
        });

        describe('with outer vault fee enabled', () => {
          it('succeeds with 1% fee, usdc6 (6-dec), mTokenLoan=1.05, stable', async () => {
            const fixture = await loadFixture(defaultDeploy);
            const {
              token,
              amount,
              redemptionVaultWithMToken,
              owner,
              mTokenLoan,
            } = await setupCeilDivTest({
              fixture,
              tokenKey: 'usdc6',
              mTbillRate: 1.05,
              isStable: true,
            });

            await setInstantFeeTest(
              { vault: redemptionVaultWithMToken, owner },
              100,
            );

            const mTbillBefore = await mTokenLoan.balanceOf(
              redemptionVaultWithMToken.address,
            );
            const userTokenBefore = await token.balanceOf(owner.address);

            await redemptionVaultWithMToken
              .connect(owner)
              ['redeemInstant(address,uint256,uint256)'](
                token.address,
                parseUnits(amount.toString()),
                0,
              );

            expect(
              await mTokenLoan.balanceOf(redemptionVaultWithMToken.address),
            ).to.be.lt(mTbillBefore);
            expect(await token.balanceOf(owner.address)).to.be.gt(
              userTokenBefore,
            );
          });

          it('succeeds with 1% fee, usdc (8-dec), mTokenLoan=1.05, stable', async () => {
            const fixture = await loadFixture(defaultDeploy);
            const {
              token,
              amount,
              redemptionVaultWithMToken,
              owner,
              mTokenLoan,
            } = await setupCeilDivTest({
              fixture,
              tokenKey: 'usdc',
              mTbillRate: 1.05,
              isStable: true,
            });

            await setInstantFeeTest(
              { vault: redemptionVaultWithMToken, owner },
              100,
            );

            const mTbillBefore = await mTokenLoan.balanceOf(
              redemptionVaultWithMToken.address,
            );
            const userTokenBefore = await token.balanceOf(owner.address);

            await redemptionVaultWithMToken
              .connect(owner)
              ['redeemInstant(address,uint256,uint256)'](
                token.address,
                parseUnits(amount.toString()),
                0,
              );

            expect(
              await mTokenLoan.balanceOf(redemptionVaultWithMToken.address),
            ).to.be.lt(mTbillBefore);
            expect(await token.balanceOf(owner.address)).to.be.gt(
              userTokenBefore,
            );
          });

          it('succeeds with 1% fee, usdt (18-dec), mTokenLoan=1.05, stable', async () => {
            const fixture = await loadFixture(defaultDeploy);
            const {
              token,
              amount,
              redemptionVaultWithMToken,
              owner,
              mTokenLoan,
            } = await setupCeilDivTest({
              fixture,
              tokenKey: 'usdt',
              mTbillRate: 1.05,
              isStable: true,
            });

            await setInstantFeeTest(
              { vault: redemptionVaultWithMToken, owner },
              100,
            );

            const mTbillBefore = await mTokenLoan.balanceOf(
              redemptionVaultWithMToken.address,
            );
            const userTokenBefore = await token.balanceOf(owner.address);

            await redemptionVaultWithMToken
              .connect(owner)
              ['redeemInstant(address,uint256,uint256)'](
                token.address,
                parseUnits(amount.toString()),
                0,
              );

            expect(
              await mTokenLoan.balanceOf(redemptionVaultWithMToken.address),
            ).to.be.lt(mTbillBefore);
            expect(await token.balanceOf(owner.address)).to.be.gt(
              userTokenBefore,
            );
          });

          it('succeeds with 1% fee, usdc6 (6-dec), mTokenLoan=100, stable', async () => {
            const fixture = await loadFixture(defaultDeploy);
            const {
              token,
              amount,
              redemptionVaultWithMToken,
              owner,
              mTokenLoan,
            } = await setupCeilDivTest({
              fixture,
              tokenKey: 'usdc6',
              mTbillRate: 100,
              isStable: true,
            });

            await setInstantFeeTest(
              { vault: redemptionVaultWithMToken, owner },
              100,
            );

            const mTbillBefore = await mTokenLoan.balanceOf(
              redemptionVaultWithMToken.address,
            );

            await redemptionVaultWithMToken
              .connect(owner)
              ['redeemInstant(address,uint256,uint256)'](
                token.address,
                parseUnits(amount.toString()),
                0,
              );

            expect(
              await mTokenLoan.balanceOf(redemptionVaultWithMToken.address),
            ).to.be.lt(mTbillBefore);
          });

          it('succeeds with 1% fee, usdc (8-dec), non-stable mTokenLoan=1.05 tokenOut=1.03', async () => {
            const fixture = await loadFixture(defaultDeploy);
            const {
              token,
              amount,
              redemptionVaultWithMToken,
              owner,
              mTokenLoan,
            } = await setupCeilDivTest({
              fixture,
              tokenKey: 'usdc',
              mTbillRate: 1.05,
              isStable: false,
              tokenOutRate: 1.03,
            });

            await setInstantFeeTest(
              { vault: redemptionVaultWithMToken, owner },
              100,
            );

            const mTbillBefore = await mTokenLoan.balanceOf(
              redemptionVaultWithMToken.address,
            );
            const userTokenBefore = await token.balanceOf(owner.address);

            await redemptionVaultWithMToken
              .connect(owner)
              ['redeemInstant(address,uint256,uint256)'](
                token.address,
                parseUnits(amount.toString()),
                0,
              );

            expect(
              await mTokenLoan.balanceOf(redemptionVaultWithMToken.address),
            ).to.be.lt(mTbillBefore);
            expect(await token.balanceOf(owner.address)).to.be.gt(
              userTokenBefore,
            );
          });

          it('succeeds with 1% fee, usdc6 (6-dec), near-boundary mTokenLoan=1.00000003', async () => {
            const fixture = await loadFixture(defaultDeploy);
            const { token, redemptionVaultWithMToken, owner, mTokenLoan } =
              await setupCeilDivTest({
                fixture,
                tokenKey: 'usdc6',
                mTbillRate: 1.00000003,
                isStable: true,
                redeemAmount: 10000,
              });

            await setInstantFeeTest(
              { vault: redemptionVaultWithMToken, owner },
              100,
            );

            const mTbillBefore = await mTokenLoan.balanceOf(
              redemptionVaultWithMToken.address,
            );

            await redemptionVaultWithMToken
              .connect(owner)
              ['redeemInstant(address,uint256,uint256)'](
                token.address,
                parseUnits('10000'),
                0,
              );

            expect(
              await mTokenLoan.balanceOf(redemptionVaultWithMToken.address),
            ).to.be.lt(mTbillBefore);
          });
        });

        describe('minReceiveAmount assertions', () => {
          it('succeeds with exact minReceiveAmount (6-dec, mTokenLoan=1.05)', async () => {
            const fixture = await loadFixture(defaultDeploy);
            const {
              token,
              amount,
              redemptionVaultWithMToken,
              owner,
              mFoneRate,
              tokenOutRate,
            } = await setupCeilDivTest({
              fixture,
              tokenKey: 'usdc6',
              mTbillRate: 1.05,
              isStable: true,
            });

            const expectedNative = computeExpectedTokenOut(
              parseUnits(amount.toString()),
              mFoneRate,
              tokenOutRate,
              TOKEN_DECIMALS['usdc6'],
              0,
              true,
            );
            const expectedBase18 = expectedNative.mul(
              BigNumber.from(10).pow(18 - TOKEN_DECIMALS['usdc6']),
            );

            const userTokenBefore = await token.balanceOf(owner.address);

            await redemptionVaultWithMToken
              .connect(owner)
              ['redeemInstant(address,uint256,uint256)'](
                token.address,
                parseUnits(amount.toString()),
                expectedBase18,
              );

            const userTokenAfter = await token.balanceOf(owner.address);
            expect(userTokenAfter.sub(userTokenBefore)).to.equal(
              expectedNative,
            );
          });

          it('reverts when minReceiveAmount exceeds actual (6-dec, mTokenLoan=1.05)', async () => {
            const fixture = await loadFixture(defaultDeploy);
            const {
              token,
              amount,
              redemptionVaultWithMToken,
              owner,
              mFoneRate,
              tokenOutRate,
            } = await setupCeilDivTest({
              fixture,
              tokenKey: 'usdc6',
              mTbillRate: 1.05,
              isStable: true,
            });

            const expectedNative = computeExpectedTokenOut(
              parseUnits(amount.toString()),
              mFoneRate,
              tokenOutRate,
              TOKEN_DECIMALS['usdc6'],
              0,
              true,
            );
            const tooHigh = expectedNative
              .mul(BigNumber.from(10).pow(18 - TOKEN_DECIMALS['usdc6']))
              .add(1);

            await expect(
              redemptionVaultWithMToken
                .connect(owner)
                ['redeemInstant(address,uint256,uint256)'](
                  token.address,
                  parseUnits(amount.toString()),
                  tooHigh,
                ),
            ).to.be.revertedWith('RV: minReceiveAmount > actual');
          });
        });

        describe('partial outer vault balance', () => {
          it('succeeds with 30% tokenOut present in outer vault (6-dec, mTokenLoan=1.05)', async () => {
            const fixture = await loadFixture(defaultDeploy);
            const {
              token,
              amount,
              redemptionVaultWithMToken,
              owner,
              mTokenLoan,
              mFoneRate,
              tokenOutRate,
            } = await setupCeilDivTest({
              fixture,
              tokenKey: 'usdc6',
              mTbillRate: 1.05,
              isStable: true,
            });

            const expectedNative = computeExpectedTokenOut(
              parseUnits(amount.toString()),
              mFoneRate,
              tokenOutRate,
              TOKEN_DECIMALS['usdc6'],
              0,
              true,
            );
            const thirtyPercent = expectedNative.mul(30).div(100);
            await token.mint(redemptionVaultWithMToken.address, thirtyPercent);

            const mTbillBefore = await mTokenLoan.balanceOf(
              redemptionVaultWithMToken.address,
            );
            const userTokenBefore = await token.balanceOf(owner.address);

            await redemptionVaultWithMToken
              .connect(owner)
              ['redeemInstant(address,uint256,uint256)'](
                token.address,
                parseUnits(amount.toString()),
                0,
              );

            expect(
              await mTokenLoan.balanceOf(redemptionVaultWithMToken.address),
            ).to.be.lt(mTbillBefore);

            const userTokenAfter = await token.balanceOf(owner.address);
            expect(userTokenAfter.sub(userTokenBefore)).to.equal(
              expectedNative,
            );
          });

          it('succeeds with 99% tokenOut present in outer vault (6-dec, mTokenLoan=1.05)', async () => {
            const fixture = await loadFixture(defaultDeploy);
            const {
              token,
              amount,
              redemptionVaultWithMToken,
              owner,
              mTokenLoan,
              mFoneRate,
              tokenOutRate,
            } = await setupCeilDivTest({
              fixture,
              tokenKey: 'usdc6',
              mTbillRate: 1.05,
              isStable: true,
            });

            const expectedNative = computeExpectedTokenOut(
              parseUnits(amount.toString()),
              mFoneRate,
              tokenOutRate,
              TOKEN_DECIMALS['usdc6'],
              0,
              true,
            );
            const ninetyNinePercent = expectedNative.mul(99).div(100);
            await token.mint(
              redemptionVaultWithMToken.address,
              ninetyNinePercent,
            );

            const mTbillBefore = await mTokenLoan.balanceOf(
              redemptionVaultWithMToken.address,
            );
            const userTokenBefore = await token.balanceOf(owner.address);

            await redemptionVaultWithMToken
              .connect(owner)
              ['redeemInstant(address,uint256,uint256)'](
                token.address,
                parseUnits(amount.toString()),
                0,
              );

            expect(
              await mTokenLoan.balanceOf(redemptionVaultWithMToken.address),
            ).to.be.lt(mTbillBefore);

            const userTokenAfter = await token.balanceOf(owner.address);
            expect(userTokenAfter.sub(userTokenBefore)).to.equal(
              expectedNative,
            );
          });
        });

        describe('mTBILL rate variation', () => {
          it('succeeds with high mTBILL rate (mTBILL=3.5, mTokenLoan=1.05, 6-dec)', async () => {
            const fixture = await loadFixture(defaultDeploy);
            const {
              token,
              amount,
              redemptionVaultWithMToken,
              owner,
              mTokenLoan,
              mTokenToUsdDataFeed,
              mockedAggregatorMTokenLoan,
              tokenOutRate,
            } = await setupCeilDivTest({
              fixture,
              tokenKey: 'usdc6',
              mTbillRate: 1.05,
              isStable: true,
            });

            await setRoundData(
              { mockedAggregator: mockedAggregatorMTokenLoan },
              3.5,
            );
            const mFoneRate = await mTokenToUsdDataFeed.getDataInBase18();

            const mTbillBefore = await mTokenLoan.balanceOf(
              redemptionVaultWithMToken.address,
            );
            const userTokenBefore = await token.balanceOf(owner.address);

            await redemptionVaultWithMToken
              .connect(owner)
              ['redeemInstant(address,uint256,uint256)'](
                token.address,
                parseUnits(amount.toString()),
                0,
              );

            expect(
              await mTokenLoan.balanceOf(redemptionVaultWithMToken.address),
            ).to.be.lt(mTbillBefore);

            const expected = computeExpectedTokenOut(
              parseUnits(amount.toString()),
              mFoneRate,
              tokenOutRate,
              TOKEN_DECIMALS['usdc6'],
              0,
              true,
            );
            const userTokenAfter = await token.balanceOf(owner.address);
            expect(userTokenAfter.sub(userTokenBefore)).to.equal(expected);
          });

          it('succeeds with low mTBILL rate (mTBILL=0.5, mTokenLoan=1.05, 6-dec)', async () => {
            const fixture = await loadFixture(defaultDeploy);
            const {
              token,
              amount,
              redemptionVaultWithMToken,
              owner,
              mTokenLoan,
              mTokenToUsdDataFeed,
              mockedAggregatorMTokenLoan,
              tokenOutRate,
            } = await setupCeilDivTest({
              fixture,
              tokenKey: 'usdc6',
              mTbillRate: 1.05,
              isStable: true,
            });

            await setRoundData(
              { mockedAggregator: mockedAggregatorMTokenLoan },
              0.5,
            );
            const mFoneRate = await mTokenToUsdDataFeed.getDataInBase18();

            const mTbillBefore = await mTokenLoan.balanceOf(
              redemptionVaultWithMToken.address,
            );
            const userTokenBefore = await token.balanceOf(owner.address);

            await redemptionVaultWithMToken
              .connect(owner)
              ['redeemInstant(address,uint256,uint256)'](
                token.address,
                parseUnits(amount.toString()),
                0,
              );

            expect(
              await mTokenLoan.balanceOf(redemptionVaultWithMToken.address),
            ).to.be.lt(mTbillBefore);

            const expected = computeExpectedTokenOut(
              parseUnits(amount.toString()),
              mFoneRate,
              tokenOutRate,
              TOKEN_DECIMALS['usdc6'],
              0,
              true,
            );
            const userTokenAfter = await token.balanceOf(owner.address);
            expect(userTokenAfter.sub(userTokenBefore)).to.equal(expected);
          });
        });
      });
    });
  },
);
