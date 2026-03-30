import { loadFixture } from '@nomicfoundation/hardhat-network-helpers';
import { expect } from 'chai';
import { constants } from 'ethers';
import { parseUnits } from 'ethers/lib/utils';
import { ethers } from 'hardhat';

import { redemptionVaultSuits } from './suits/redemption-vault.suits';

import { encodeFnSelector } from '../../helpers/utils';
import { acErrors, blackList, greenList } from '../common/ac.helpers';
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
  setInstantDailyLimitTest,
  addWaivedFeeAccountTest,
  changeTokenAllowanceTest,
} from '../common/manageable-vault.helpers';
import {
  redeemInstantTest,
  setLoanLpTest,
} from '../common/redemption-vault.helpers';
import { sanctionUser } from '../common/with-sanctions-list.helpers';

redemptionVaultSuits(
  'RedemptionVaultWithAave',
  defaultDeploy,
  'redemptionVaultWithAave',
  async (fixture) => {
    const { redemptionVaultWithAave, stableCoins, aavePoolMock } = fixture;
    expect(
      await redemptionVaultWithAave.aavePools(stableCoins.usdc.address),
    ).eq(aavePoolMock.address);
  },
  (defaultDeploy) => {
    describe('RedemptionVaultWithAave', () => {
      describe('setAavePool()', () => {
        it('should fail: call from address without vault admin role', async () => {
          const {
            redemptionVaultWithAave,
            regularAccounts,
            stableCoins,
            aavePoolMock,
          } = await loadFixture(defaultDeploy);
          await expect(
            redemptionVaultWithAave
              .connect(regularAccounts[0])
              .setAavePool(stableCoins.usdc.address, aavePoolMock.address),
          ).to.be.revertedWith('WMAC: hasnt role');
        });

        it('should fail: zero address', async () => {
          const { redemptionVaultWithAave, stableCoins } = await loadFixture(
            defaultDeploy,
          );
          await expect(
            redemptionVaultWithAave.setAavePool(
              stableCoins.usdc.address,
              constants.AddressZero,
            ),
          ).to.be.revertedWith('zero address');
        });

        it('should succeed and emit SetAavePool event', async () => {
          const { redemptionVaultWithAave, owner, stableCoins, aavePoolMock } =
            await loadFixture(defaultDeploy);

          await expect(
            redemptionVaultWithAave.setAavePool(
              stableCoins.usdc.address,
              aavePoolMock.address,
            ),
          )
            .to.emit(redemptionVaultWithAave, 'SetAavePool')
            .withArgs(
              owner.address,
              stableCoins.usdc.address,
              aavePoolMock.address,
            );

          expect(
            await redemptionVaultWithAave.aavePools(stableCoins.usdc.address),
          ).eq(aavePoolMock.address);
        });
      });

      describe('removeAavePool()', () => {
        it('should fail: call from address without vault admin role', async () => {
          const { redemptionVaultWithAave, regularAccounts, stableCoins } =
            await loadFixture(defaultDeploy);
          await expect(
            redemptionVaultWithAave
              .connect(regularAccounts[0])
              .removeAavePool(stableCoins.usdc.address),
          ).to.be.revertedWith('WMAC: hasnt role');
        });

        it('should fail: pool not set', async () => {
          const { redemptionVaultWithAave, stableCoins } = await loadFixture(
            defaultDeploy,
          );
          await expect(
            redemptionVaultWithAave.removeAavePool(stableCoins.dai.address),
          ).to.be.revertedWith('RVA: pool not set');
        });

        it('should succeed and emit RemoveAavePool event', async () => {
          const { redemptionVaultWithAave, owner, stableCoins } =
            await loadFixture(defaultDeploy);

          await expect(
            redemptionVaultWithAave.removeAavePool(stableCoins.usdc.address),
          )
            .to.emit(redemptionVaultWithAave, 'RemoveAavePool')
            .withArgs(owner.address, stableCoins.usdc.address);

          expect(
            await redemptionVaultWithAave.aavePools(stableCoins.usdc.address),
          ).eq(constants.AddressZero);
        });
      });

      describe('checkAndRedeemAave()', () => {
        it('should not withdraw from Aave when contract has enough balance', async () => {
          const { redemptionVaultWithAave, stableCoins, aUSDC } =
            await loadFixture(defaultDeploy);

          const usdcAmount = parseUnits('1000', 8);
          await stableCoins.usdc.mint(
            redemptionVaultWithAave.address,
            usdcAmount,
          );

          const balanceBefore = await stableCoins.usdc.balanceOf(
            redemptionVaultWithAave.address,
          );
          const aTokenBefore = await aUSDC.balanceOf(
            redemptionVaultWithAave.address,
          );

          await redemptionVaultWithAave.checkAndRedeemAave(
            stableCoins.usdc.address,
            parseUnits('500', 8),
          );

          const balanceAfter = await stableCoins.usdc.balanceOf(
            redemptionVaultWithAave.address,
          );
          const aTokenAfter = await aUSDC.balanceOf(
            redemptionVaultWithAave.address,
          );
          expect(balanceAfter).to.equal(balanceBefore);
          expect(aTokenAfter).to.equal(aTokenBefore);
        });

        it('should withdraw missing amount from Aave', async () => {
          const { redemptionVaultWithAave, stableCoins, aUSDC } =
            await loadFixture(defaultDeploy);

          // Vault has 500 USDC, needs 1000
          const initialUsdc = parseUnits('500', 8);
          await stableCoins.usdc.mint(
            redemptionVaultWithAave.address,
            initialUsdc,
          );

          // Vault has 600 aUSDC
          const aTokenAmount = parseUnits('600', 8);
          await aUSDC.mint(redemptionVaultWithAave.address, aTokenAmount);

          await redemptionVaultWithAave.checkAndRedeemAave(
            stableCoins.usdc.address,
            parseUnits('1000', 8),
          );

          // Vault should now have 1000 USDC (500 original + 500 withdrawn from Aave)
          const usdcAfter = await stableCoins.usdc.balanceOf(
            redemptionVaultWithAave.address,
          );
          expect(usdcAfter).to.equal(parseUnits('1000', 8));

          // aToken balance should decrease by 500
          const aTokenAfter = await aUSDC.balanceOf(
            redemptionVaultWithAave.address,
          );
          expect(aTokenAfter).to.equal(parseUnits('100', 8));
        });

        it('should revert: when Aave withdraws less than missing amount', async () => {
          const { redemptionVaultWithAave, stableCoins, aUSDC, aavePoolMock } =
            await loadFixture(defaultDeploy);

          // Vault has 200 USDC, needs 1000
          await stableCoins.usdc.mint(
            redemptionVaultWithAave.address,
            parseUnits('200', 8),
          );

          // Vault has enough aTokens to cover the gap
          await aUSDC.mint(
            redemptionVaultWithAave.address,
            parseUnits('1000', 8),
          );

          // Simulate partial Aave withdrawal
          await aavePoolMock.setWithdrawReturnBps(5000);

          await expect(
            redemptionVaultWithAave.checkAndRedeemAave(
              stableCoins.usdc.address,
              parseUnits('1000', 8),
            ),
          ).to.be.revertedWith('RVA: insufficient withdrawal amount');
        });
      });

      describe('redeemInstant()', () => {
        it('should fail: when there is no token in vault', async () => {
          const {
            owner,
            redemptionVaultWithAave,
            stableCoins,
            mTBILL,
            mTokenToUsdDataFeed,
          } = await loadFixture(defaultDeploy);

          await redeemInstantTest(
            {
              redemptionVault: redemptionVaultWithAave,
              owner,
              mTBILL,
              mTokenToUsdDataFeed,
            },
            stableCoins.usdc,
            1,
            {
              revertMessage: 'MV: token not exists',
            },
          );
        });

        it('should fail: when trying to redeem 0 amount', async () => {
          const {
            owner,
            redemptionVaultWithAave,
            stableCoins,
            mTBILL,
            dataFeed,
            mTokenToUsdDataFeed,
          } = await loadFixture(defaultDeploy);
          await addPaymentTokenTest(
            { vault: redemptionVaultWithAave, owner },
            stableCoins.usdc,
            dataFeed.address,
            0,
            true,
          );
          await redeemInstantTest(
            {
              redemptionVault: redemptionVaultWithAave,
              owner,
              mTBILL,
              mTokenToUsdDataFeed,
            },
            stableCoins.usdc,
            0,
            {
              revertMessage: 'RV: invalid amount',
            },
          );
        });

        it('should fail: when function paused', async () => {
          const {
            owner,
            redemptionVaultWithAave,
            stableCoins,
            mTBILL,
            dataFeed,
            mTokenToUsdDataFeed,
            regularAccounts,
          } = await loadFixture(defaultDeploy);
          await mintToken(mTBILL, regularAccounts[0], 100);
          await approveBase18(
            regularAccounts[0],
            stableCoins.dai,
            redemptionVaultWithAave,
            100,
          );
          await addPaymentTokenTest(
            { vault: redemptionVaultWithAave, owner },
            stableCoins.dai,
            dataFeed.address,
            0,
            true,
          );
          const selector = encodeFnSelector(
            'redeemInstant(address,uint256,uint256)',
          );
          await pauseVaultFn(redemptionVaultWithAave, selector);
          await redeemInstantTest(
            {
              redemptionVault: redemptionVaultWithAave,
              owner,
              mTBILL,
              mTokenToUsdDataFeed,
            },
            stableCoins.dai,
            100,
            {
              from: regularAccounts[0],
              revertMessage: 'Pausable: fn paused',
            },
          );
        });

        it('should fail: call with insufficient balance', async () => {
          const {
            owner,
            redemptionVaultWithAave,
            stableCoins,
            mTBILL,
            dataFeed,
            mTokenToUsdDataFeed,
          } = await loadFixture(defaultDeploy);

          await approveBase18(owner, mTBILL, redemptionVaultWithAave, 100);
          await addPaymentTokenTest(
            { vault: redemptionVaultWithAave, owner },
            stableCoins.usdc,
            dataFeed.address,
            0,
            true,
          );
          await redeemInstantTest(
            {
              redemptionVault: redemptionVaultWithAave,
              owner,
              mTBILL,
              mTokenToUsdDataFeed,
            },
            stableCoins.usdc,
            100,
            {
              revertMessage: 'ERC20: burn amount exceeds balance',
            },
          );
        });

        it('should fail: dataFeed rate 0', async () => {
          const {
            owner,
            redemptionVaultWithAave,
            stableCoins,
            mTBILL,
            dataFeed,
            mockedAggregator,
            mockedAggregatorMToken,
            mTokenToUsdDataFeed,
          } = await loadFixture(defaultDeploy);

          await approveBase18(
            owner,
            stableCoins.usdc,
            redemptionVaultWithAave,
            10,
          );
          await addPaymentTokenTest(
            { vault: redemptionVaultWithAave, owner },
            stableCoins.usdc,
            dataFeed.address,
            0,
            true,
          );
          await mintToken(mTBILL, owner, 100_000);
          await setRoundData({ mockedAggregator }, 0);
          await redeemInstantTest(
            {
              redemptionVault: redemptionVaultWithAave,
              owner,
              mTBILL,
              mTokenToUsdDataFeed,
            },
            stableCoins.usdc,
            1,
            {
              revertMessage: 'DF: feed is deprecated',
            },
          );
        });

        it('should fail: call for amount < minAmount', async () => {
          const {
            redemptionVaultWithAave,
            mockedAggregator,
            owner,
            mTBILL,
            stableCoins,
            dataFeed,
            mTokenToUsdDataFeed,
          } = await loadFixture(defaultDeploy);
          await addPaymentTokenTest(
            { vault: redemptionVaultWithAave, owner },
            stableCoins.usdc,
            dataFeed.address,
            0,
            true,
          );
          await setRoundData({ mockedAggregator }, 1);

          await mintToken(mTBILL, owner, 100_000);
          await approveBase18(owner, mTBILL, redemptionVaultWithAave, 100_000);

          await setMinAmountTest(
            { vault: redemptionVaultWithAave, owner },
            100_000,
          );

          await redeemInstantTest(
            {
              redemptionVault: redemptionVaultWithAave,
              owner,
              mTBILL,
              mTokenToUsdDataFeed,
            },
            stableCoins.usdc,
            99_999,
            {
              revertMessage: 'RV: amount < min',
            },
          );
        });

        it('should fail: if exceeds token allowance', async () => {
          const {
            owner,
            redemptionVaultWithAave,
            stableCoins,
            mTBILL,
            dataFeed,
            mockedAggregator,
            mTokenToUsdDataFeed,
          } = await loadFixture(defaultDeploy);

          await addPaymentTokenTest(
            { vault: redemptionVaultWithAave, owner },
            stableCoins.usdc,
            dataFeed.address,
            0,
            true,
          );
          await setRoundData({ mockedAggregator }, 4);

          await mintToken(mTBILL, owner, 100_000);
          await changeTokenAllowanceTest(
            { vault: redemptionVaultWithAave, owner },
            stableCoins.usdc.address,
            100,
          );
          await approveBase18(owner, mTBILL, redemptionVaultWithAave, 100_000);

          await redeemInstantTest(
            {
              redemptionVault: redemptionVaultWithAave,
              owner,
              mTBILL,
              mTokenToUsdDataFeed,
            },
            stableCoins.usdc,
            99_999,
            {
              revertMessage: 'MV: exceed allowance',
            },
          );
        });

        it('should fail: if daily limit exceeded', async () => {
          const {
            owner,
            redemptionVaultWithAave,
            stableCoins,
            mTBILL,
            dataFeed,
            mockedAggregator,
            mTokenToUsdDataFeed,
          } = await loadFixture(defaultDeploy);

          await addPaymentTokenTest(
            { vault: redemptionVaultWithAave, owner },
            stableCoins.usdc,
            dataFeed.address,
            0,
            true,
          );
          await setRoundData({ mockedAggregator }, 4);

          await mintToken(mTBILL, owner, 100_000);
          await setInstantDailyLimitTest(
            { vault: redemptionVaultWithAave, owner },
            1000,
          );

          await approveBase18(owner, mTBILL, redemptionVaultWithAave, 100_000);

          await redeemInstantTest(
            {
              redemptionVault: redemptionVaultWithAave,
              owner,
              mTBILL,
              mTokenToUsdDataFeed,
            },
            stableCoins.usdc,
            99_999,
            {
              revertMessage: 'MV: exceed limit',
            },
          );
        });

        it('should fail: if some fee = 100%', async () => {
          const {
            owner,
            redemptionVaultWithAave,
            stableCoins,
            mTBILL,
            dataFeed,
            mTokenToUsdDataFeed,
          } = await loadFixture(defaultDeploy);

          await mintToken(mTBILL, owner, 100);
          await approveBase18(owner, mTBILL, redemptionVaultWithAave, 100);
          await addPaymentTokenTest(
            { vault: redemptionVaultWithAave, owner },
            stableCoins.usdc,
            dataFeed.address,
            10000,
            true,
          );
          await redeemInstantTest(
            {
              redemptionVault: redemptionVaultWithAave,
              owner,
              mTBILL,
              mTokenToUsdDataFeed,
            },
            stableCoins.usdc,
            100,
            {
              revertMessage: 'RV: amountTokenOut < fee',
            },
          );
        });

        it('should fail: greenlist enabled and user not in greenlist', async () => {
          const {
            owner,
            redemptionVaultWithAave,
            stableCoins,
            mTBILL,
            mTokenToUsdDataFeed,
          } = await loadFixture(defaultDeploy);

          await redemptionVaultWithAave.setGreenlistEnable(true);

          await redeemInstantTest(
            {
              redemptionVault: redemptionVaultWithAave,
              owner,
              mTBILL,
              mTokenToUsdDataFeed,
            },
            stableCoins.dai,
            1,
            {
              revertMessage: 'WMAC: hasnt role',
            },
          );
        });

        it('should fail: user in blacklist', async () => {
          const {
            owner,
            redemptionVaultWithAave,
            stableCoins,
            mTBILL,
            mTokenToUsdDataFeed,
            blackListableTester,
            accessControl,
            regularAccounts,
          } = await loadFixture(defaultDeploy);

          await blackList(
            { blacklistable: blackListableTester, accessControl, owner },
            regularAccounts[0],
          );

          await redeemInstantTest(
            {
              redemptionVault: redemptionVaultWithAave,
              owner,
              mTBILL,
              mTokenToUsdDataFeed,
            },
            stableCoins.dai,
            1,
            {
              from: regularAccounts[0],
              revertMessage: acErrors.WMAC_HAS_ROLE,
            },
          );
        });

        it('should fail: user in sanctions list', async () => {
          const {
            owner,
            redemptionVaultWithAave,
            stableCoins,
            mTBILL,
            dataFeed,
            mTokenToUsdDataFeed,
            mockedSanctionsList,
            regularAccounts,
          } = await loadFixture(defaultDeploy);

          await sanctionUser(
            { sanctionsList: mockedSanctionsList },
            regularAccounts[0],
          );

          await mintToken(mTBILL, regularAccounts[0], 100);
          await approveBase18(
            regularAccounts[0],
            mTBILL,
            redemptionVaultWithAave,
            100,
          );
          await addPaymentTokenTest(
            { vault: redemptionVaultWithAave, owner },
            stableCoins.usdc,
            dataFeed.address,
            0,
            true,
          );
          await redeemInstantTest(
            {
              redemptionVault: redemptionVaultWithAave,
              owner,
              mTBILL,
              mTokenToUsdDataFeed,
            },
            stableCoins.usdc,
            100,
            {
              from: regularAccounts[0],
              revertMessage: 'WSL: sanctioned',
            },
          );
        });

        // ── Happy path tests ─────────────────────────────────────────────────

        it('redeem 100 mTBILL when vault has enough USDC (no Aave needed)', async () => {
          const {
            owner,
            redemptionVaultWithAave,
            stableCoins,
            mTBILL,
            mTokenToUsdDataFeed,
            dataFeed,
            aUSDC,
          } = await loadFixture(defaultDeploy);

          await mintToken(stableCoins.usdc, redemptionVaultWithAave, 100000);
          await mintToken(mTBILL, owner, 100);
          await approveBase18(owner, mTBILL, redemptionVaultWithAave, 100);
          await addPaymentTokenTest(
            { vault: redemptionVaultWithAave, owner },
            stableCoins.usdc,
            dataFeed.address,
            0,
            true,
          );

          const aTokenBefore = await aUSDC.balanceOf(
            redemptionVaultWithAave.address,
          );

          await redeemInstantTest(
            {
              redemptionVault: redemptionVaultWithAave,
              owner,
              mTBILL,
              mTokenToUsdDataFeed,
            },
            stableCoins.usdc,
            100,
          );

          // aToken balance should not change
          const aTokenAfter = await aUSDC.balanceOf(
            redemptionVaultWithAave.address,
          );
          expect(aTokenAfter).to.equal(aTokenBefore);
        });

        it('redeem 1000 mTBILL when vault has no USDC but has aTokens', async () => {
          const {
            owner,
            mockedAggregator,
            mockedAggregatorMToken,
            redemptionVaultWithAave,
            stableCoins,
            mTBILL,
            dataFeed,
            mTokenToUsdDataFeed,
            aUSDC,
          } = await loadFixture(defaultDeploy);

          // Mint aTokens to vault (enough for redemption)
          await aUSDC.mint(
            redemptionVaultWithAave.address,
            parseUnits('9900', 8),
          );

          await mintToken(mTBILL, owner, 1000);
          await approveBase18(owner, mTBILL, redemptionVaultWithAave, 1000);
          await addPaymentTokenTest(
            { vault: redemptionVaultWithAave, owner },
            stableCoins.usdc,
            dataFeed.address,
            0,
            true,
          );
          await setInstantFeeTest({ vault: redemptionVaultWithAave, owner }, 0);
          await setRoundData({ mockedAggregator }, 1);
          await setRoundData({ mockedAggregator: mockedAggregatorMToken }, 1);

          const aTokenBefore = await aUSDC.balanceOf(
            redemptionVaultWithAave.address,
          );

          await redeemInstantTest(
            {
              redemptionVault: redemptionVaultWithAave,
              owner,
              mTBILL,
              mTokenToUsdDataFeed,
              additionalLiquidity: async () => {
                return await aUSDC.balanceOf(redemptionVaultWithAave.address);
              },
            },
            stableCoins.usdc,
            1000,
          );

          const aTokenAfter = await aUSDC.balanceOf(
            redemptionVaultWithAave.address,
          );
          // aTokens should decrease
          expect(aTokenAfter).to.be.lt(aTokenBefore);
        });

        it('redeem 1000 mTBILL when vault has 100 USDC and sufficient aTokens (partial Aave)', async () => {
          const {
            owner,
            mockedAggregator,
            mockedAggregatorMToken,
            redemptionVaultWithAave,
            stableCoins,
            mTBILL,
            dataFeed,
            mTokenToUsdDataFeed,
            aUSDC,
          } = await loadFixture(defaultDeploy);

          // Vault has 100 USDC + 9900 aTokens
          await mintToken(stableCoins.usdc, redemptionVaultWithAave, 100);
          await aUSDC.mint(
            redemptionVaultWithAave.address,
            parseUnits('9900', 8),
          );
          await mintToken(mTBILL, owner, 1000);
          await approveBase18(owner, mTBILL, redemptionVaultWithAave, 1000);
          await addPaymentTokenTest(
            { vault: redemptionVaultWithAave, owner },
            stableCoins.usdc,
            dataFeed.address,
            0,
            true,
          );
          await setRoundData({ mockedAggregator }, 1);
          await setRoundData({ mockedAggregator: mockedAggregatorMToken }, 1);

          await redeemInstantTest(
            {
              redemptionVault: redemptionVaultWithAave,
              owner,
              mTBILL,
              mTokenToUsdDataFeed,
              additionalLiquidity: async () => {
                return await aUSDC.balanceOf(redemptionVaultWithAave.address);
              },
            },
            stableCoins.usdc,
            1000,
          );
        });

        it('redeem 1000 mTBILL when vault has 100 USDC and insufficient aTokens (partial Aave, partial lp flow)', async () => {
          const {
            owner,
            mockedAggregator,
            mockedAggregatorMToken,
            redemptionVaultWithAave,
            stableCoins,
            mTBILL,
            dataFeed,
            mTokenToUsdDataFeed,
            aUSDC,
            loanLp,
            mTokenLoan,
            redemptionVaultLoanSwapper,
          } = await loadFixture(defaultDeploy);

          // Vault has 100 USDC + 9900 aTokens
          await mintToken(stableCoins.usdc, redemptionVaultWithAave, 100);
          await mintToken(mTokenLoan, loanLp, 200);
          await approveBase18(loanLp, mTokenLoan, redemptionVaultWithAave, 200);
          await addPaymentTokenTest(
            { vault: redemptionVaultLoanSwapper, owner },
            stableCoins.usdc,
            dataFeed.address,
            0,
            true,
          );
          await mintToken(stableCoins.usdc, redemptionVaultLoanSwapper, 200);

          await aUSDC.mint(
            redemptionVaultWithAave.address,
            parseUnits('700', 8),
          );
          await mintToken(mTBILL, owner, 1000);
          await approveBase18(owner, mTBILL, redemptionVaultWithAave, 1000);
          await addPaymentTokenTest(
            { vault: redemptionVaultWithAave, owner },
            stableCoins.usdc,
            dataFeed.address,
            0,
            true,
          );
          await setRoundData({ mockedAggregator }, 1);
          await setRoundData({ mockedAggregator: mockedAggregatorMToken }, 1);

          const loanRequestId =
            await redemptionVaultWithAave.currentLoanRequestId();
          await redeemInstantTest(
            {
              redemptionVault: redemptionVaultWithAave,
              owner,
              mTBILL,
              mTokenToUsdDataFeed,
              additionalLiquidity: async () => {
                return await aUSDC.balanceOf(redemptionVaultWithAave.address);
              },
            },
            stableCoins.usdc,
            1000,
          );
          const loanRequest = await redemptionVaultWithAave.loanRequests(
            loanRequestId,
          );
          expect(loanRequest.status).eq(0);
          expect(loanRequest.amountTokenOut).eq(parseUnits('198'));
        });

        it('redeem 1000 mTBILL with different prices (stable 1.03$, mToken 5$) and partial Aave', async () => {
          const {
            owner,
            mockedAggregator,
            mockedAggregatorMToken,
            redemptionVaultWithAave,
            stableCoins,
            mTBILL,
            dataFeed,
            mTokenToUsdDataFeed,
            aUSDC,
          } = await loadFixture(defaultDeploy);

          await mintToken(stableCoins.usdc, redemptionVaultWithAave, 100);
          await aUSDC.mint(
            redemptionVaultWithAave.address,
            parseUnits('15000', 8),
          );
          await mintToken(mTBILL, owner, 1000);
          await approveBase18(owner, mTBILL, redemptionVaultWithAave, 1000);
          await addPaymentTokenTest(
            { vault: redemptionVaultWithAave, owner },
            stableCoins.usdc,
            dataFeed.address,
            100,
            true,
          );
          await setRoundData({ mockedAggregator }, 1.03);
          await setRoundData({ mockedAggregator: mockedAggregatorMToken }, 5);
          await redemptionVaultWithAave.freeFromMinAmount(owner.address, true);

          await redeemInstantTest(
            {
              redemptionVault: redemptionVaultWithAave,
              owner,
              mTBILL,
              mTokenToUsdDataFeed,
              additionalLiquidity: async () => {
                return await aUSDC.balanceOf(redemptionVaultWithAave.address);
              },
            },
            stableCoins.usdc,
            1000,
          );
        });

        it('redeem 1000 mTBILL with waived fee and Aave withdrawal', async () => {
          const {
            owner,
            mockedAggregator,
            mockedAggregatorMToken,
            redemptionVaultWithAave,
            stableCoins,
            mTBILL,
            dataFeed,
            mTokenToUsdDataFeed,
            aUSDC,
          } = await loadFixture(defaultDeploy);

          await mintToken(stableCoins.usdc, redemptionVaultWithAave, 100);
          await aUSDC.mint(
            redemptionVaultWithAave.address,
            parseUnits('15000', 8),
          );
          await mintToken(mTBILL, owner, 1000);
          await approveBase18(owner, mTBILL, redemptionVaultWithAave, 1000);
          await addPaymentTokenTest(
            { vault: redemptionVaultWithAave, owner },
            stableCoins.usdc,
            dataFeed.address,
            100,
            true,
          );
          await setRoundData({ mockedAggregator }, 1.03);
          await setRoundData({ mockedAggregator: mockedAggregatorMToken }, 5);

          await addWaivedFeeAccountTest(
            { vault: redemptionVaultWithAave, owner },
            owner.address,
          );

          await redeemInstantTest(
            {
              redemptionVault: redemptionVaultWithAave,
              owner,
              mTBILL,
              mTokenToUsdDataFeed,
              waivedFee: true,
              additionalLiquidity: async () => {
                return await aUSDC.balanceOf(redemptionVaultWithAave.address);
              },
            },
            stableCoins.usdc,
            1000,
          );
        });

        it('should fail: insufficient aToken balance during redeemInstant and it hits loan lp flow', async () => {
          const {
            owner,
            mockedAggregator,
            mockedAggregatorMToken,
            redemptionVaultWithAave,
            stableCoins,
            mTBILL,
            dataFeed,
            aUSDC,
          } = await loadFixture(defaultDeploy);

          await setLoanLpTest(
            { redemptionVault: redemptionVaultWithAave, owner },
            ethers.constants.AddressZero,
          );

          // Vault has no USDC and only 10 aTokens (not enough for 1000 mTBILL redemption)
          await aUSDC.mint(
            redemptionVaultWithAave.address,
            parseUnits('10', 8),
          );
          await mintToken(mTBILL, owner, 1000);
          await approveBase18(owner, mTBILL, redemptionVaultWithAave, 1000);
          await addPaymentTokenTest(
            { vault: redemptionVaultWithAave, owner },
            stableCoins.usdc,
            dataFeed.address,
            0,
            true,
          );
          await setInstantFeeTest({ vault: redemptionVaultWithAave, owner }, 0);
          await setRoundData({ mockedAggregator }, 1);
          await setRoundData({ mockedAggregator: mockedAggregatorMToken }, 1);

          await expect(
            redemptionVaultWithAave['redeemInstant(address,uint256,uint256)'](
              stableCoins.usdc.address,
              parseUnits('1000'),
              0,
            ),
          ).to.be.revertedWith('RV: loan lp not configured');
        });

        it('should fail: when aave pool is not configured and it hits loan lp flow', async () => {
          const {
            owner,
            mockedAggregator,
            mockedAggregatorMToken,
            redemptionVaultWithAave,
            stableCoins,
            mTBILL,
            dataFeed,
          } = await loadFixture(defaultDeploy);

          await setLoanLpTest(
            { redemptionVault: redemptionVaultWithAave, owner },
            ethers.constants.AddressZero,
          );
          // Vault has no USDC and only 10 aTokens (not enough for 1000 mTBILL redemption)
          await mintToken(mTBILL, owner, 1000);
          await approveBase18(owner, mTBILL, redemptionVaultWithAave, 1000);
          await addPaymentTokenTest(
            { vault: redemptionVaultWithAave, owner },
            stableCoins.usdc,
            dataFeed.address,
            0,
            true,
          );
          await setInstantFeeTest({ vault: redemptionVaultWithAave, owner }, 0);
          await setRoundData({ mockedAggregator }, 1);
          await setRoundData({ mockedAggregator: mockedAggregatorMToken }, 1);

          await redemptionVaultWithAave.removeAavePool(
            stableCoins.usdc.address,
          );

          await expect(
            redemptionVaultWithAave['redeemInstant(address,uint256,uint256)'](
              stableCoins.usdc.address,
              parseUnits('1000'),
              0,
            ),
          ).to.be.revertedWith('RV: loan lp not configured');
        });

        it('should fail: when aave pool is configured but aToken is not in the pool and it hits loan lp flow', async () => {
          const {
            owner,
            mockedAggregator,
            mockedAggregatorMToken,
            redemptionVaultWithAave,
            stableCoins,
            mTBILL,
            dataFeed,
            aavePoolMock,
          } = await loadFixture(defaultDeploy);

          await setLoanLpTest(
            { redemptionVault: redemptionVaultWithAave, owner },
            ethers.constants.AddressZero,
          );

          // Vault has no USDC and only 10 aTokens (not enough for 1000 mTBILL redemption)
          await mintToken(mTBILL, owner, 1000);
          await approveBase18(owner, mTBILL, redemptionVaultWithAave, 1000);
          await addPaymentTokenTest(
            { vault: redemptionVaultWithAave, owner },
            stableCoins.usdc,
            dataFeed.address,
            0,
            true,
          );
          await setInstantFeeTest({ vault: redemptionVaultWithAave, owner }, 0);
          await setRoundData({ mockedAggregator }, 1);
          await setRoundData({ mockedAggregator: mockedAggregatorMToken }, 1);

          await aavePoolMock.setReserveAToken(
            stableCoins.usdc.address,
            ethers.constants.AddressZero,
          );

          await expect(
            redemptionVaultWithAave['redeemInstant(address,uint256,uint256)'](
              stableCoins.usdc.address,
              parseUnits('1000'),
              0,
            ),
          ).to.be.revertedWith('RV: loan lp not configured');
        });

        it('should fail: Aave pool has insufficient liquidity during redeemInstant', async () => {
          const {
            owner,
            mockedAggregator,
            mockedAggregatorMToken,
            redemptionVaultWithAave,
            stableCoins,
            mTBILL,
            dataFeed,
            mTokenToUsdDataFeed,
            aUSDC,
            aavePoolMock,
          } = await loadFixture(defaultDeploy);

          // Vault has aTokens but pool has no liquidity
          await aUSDC.mint(
            redemptionVaultWithAave.address,
            parseUnits('10000', 8),
          );
          await mintToken(mTBILL, owner, 100000);
          await approveBase18(owner, mTBILL, redemptionVaultWithAave, 100000);
          await addPaymentTokenTest(
            { vault: redemptionVaultWithAave, owner },
            stableCoins.usdc,
            dataFeed.address,
            0,
            true,
          );
          await setInstantFeeTest({ vault: redemptionVaultWithAave, owner }, 0);
          await setRoundData({ mockedAggregator }, 1);
          await setRoundData({ mockedAggregator: mockedAggregatorMToken }, 1);

          // Drain the pool
          const poolBalance = await stableCoins.usdc.balanceOf(
            aavePoolMock.address,
          );
          await aavePoolMock.withdrawAdmin(
            stableCoins.usdc.address,
            (
              await ethers.getSigners()
            )[10].address,
            poolBalance,
          );

          await expect(
            redemptionVaultWithAave['redeemInstant(address,uint256,uint256)'](
              stableCoins.usdc.address,
              parseUnits('1000'),
              0,
            ),
          ).to.be.revertedWith('AaveV3PoolMock: InsufficientLiquidity');
        });

        it('should fail: short Aave withdrawal during redeemInstant', async () => {
          const {
            owner,
            mockedAggregator,
            mockedAggregatorMToken,
            redemptionVaultWithAave,
            stableCoins,
            mTBILL,
            dataFeed,
            aUSDC,
            aavePoolMock,
          } = await loadFixture(defaultDeploy);

          await aUSDC.mint(
            redemptionVaultWithAave.address,
            parseUnits('10000', 8),
          );
          await mintToken(mTBILL, owner, 100000);
          await approveBase18(owner, mTBILL, redemptionVaultWithAave, 100000);
          await addPaymentTokenTest(
            { vault: redemptionVaultWithAave, owner },
            stableCoins.usdc,
            dataFeed.address,
            0,
            true,
          );
          await setInstantFeeTest({ vault: redemptionVaultWithAave, owner }, 0);
          await setRoundData({ mockedAggregator }, 1);
          await setRoundData({ mockedAggregator: mockedAggregatorMToken }, 1);
          await aavePoolMock.setWithdrawReturnBps(5000);

          await expect(
            redemptionVaultWithAave['redeemInstant(address,uint256,uint256)'](
              stableCoins.usdc.address,
              parseUnits('1000'),
              0,
            ),
          ).to.be.revertedWith('RVA: insufficient withdrawal amount');
        });

        // ── Custom recipient tests ───────────────────────────────────────────

        it('redeem 100 mTBILL (custom recipient overload)', async () => {
          const {
            owner,
            redemptionVaultWithAave,
            stableCoins,
            mTBILL,
            mTokenToUsdDataFeed,
            regularAccounts,
            dataFeed,
            customRecipient,
          } = await loadFixture(defaultDeploy);

          await mintToken(stableCoins.usdc, redemptionVaultWithAave, 100000);
          await mintToken(mTBILL, regularAccounts[0], 100);
          await approveBase18(
            regularAccounts[0],
            mTBILL,
            redemptionVaultWithAave,
            100,
          );
          await addPaymentTokenTest(
            { vault: redemptionVaultWithAave, owner },
            stableCoins.usdc,
            dataFeed.address,
            0,
            true,
          );

          await redeemInstantTest(
            {
              redemptionVault: redemptionVaultWithAave,
              owner,
              mTBILL,
              mTokenToUsdDataFeed,
              customRecipient,
            },
            stableCoins.usdc,
            100,
            {
              from: regularAccounts[0],
            },
          );
        });

        it('redeem 100 mTBILL when other fn overload is paused (custom recipient overload)', async () => {
          const {
            owner,
            redemptionVaultWithAave,
            stableCoins,
            mTBILL,
            mTokenToUsdDataFeed,
            regularAccounts,
            dataFeed,
            customRecipient,
          } = await loadFixture(defaultDeploy);

          await pauseVaultFn(
            redemptionVaultWithAave,
            encodeFnSelector('redeemInstant(address,uint256,uint256)'),
          );
          await mintToken(stableCoins.usdc, redemptionVaultWithAave, 100000);
          await mintToken(mTBILL, regularAccounts[0], 100);
          await approveBase18(
            regularAccounts[0],
            mTBILL,
            redemptionVaultWithAave,
            100,
          );
          await addPaymentTokenTest(
            { vault: redemptionVaultWithAave, owner },
            stableCoins.usdc,
            dataFeed.address,
            0,
            true,
          );

          await redeemInstantTest(
            {
              redemptionVault: redemptionVaultWithAave,
              owner,
              mTBILL,
              mTokenToUsdDataFeed,
              customRecipient,
            },
            stableCoins.usdc,
            100,
            {
              from: regularAccounts[0],
            },
          );
        });

        it('redeem 100 mTBILL when other fn overload is paused', async () => {
          const {
            owner,
            redemptionVaultWithAave,
            stableCoins,
            mTBILL,
            mTokenToUsdDataFeed,
            regularAccounts,
            dataFeed,
          } = await loadFixture(defaultDeploy);

          await pauseVaultFn(
            redemptionVaultWithAave,
            encodeFnSelector('redeemInstant(address,uint256,uint256,address)'),
          );
          await mintToken(stableCoins.usdc, redemptionVaultWithAave, 100000);
          await mintToken(mTBILL, regularAccounts[0], 100);
          await approveBase18(
            regularAccounts[0],
            mTBILL,
            redemptionVaultWithAave,
            100,
          );
          await addPaymentTokenTest(
            { vault: redemptionVaultWithAave, owner },
            stableCoins.usdc,
            dataFeed.address,
            0,
            true,
          );

          await redeemInstantTest(
            {
              redemptionVault: redemptionVaultWithAave,
              owner,
              mTBILL,
              mTokenToUsdDataFeed,
            },
            stableCoins.usdc,
            100,
            {
              from: regularAccounts[0],
            },
          );
        });

        it('should fail: when function with custom recipient is paused', async () => {
          const {
            owner,
            redemptionVaultWithAave,
            stableCoins,
            mTBILL,
            dataFeed,
            mTokenToUsdDataFeed,
            regularAccounts,
            customRecipient,
          } = await loadFixture(defaultDeploy);
          await mintToken(mTBILL, regularAccounts[0], 100);
          await approveBase18(
            regularAccounts[0],
            stableCoins.dai,
            redemptionVaultWithAave,
            100,
          );
          await addPaymentTokenTest(
            { vault: redemptionVaultWithAave, owner },
            stableCoins.dai,
            dataFeed.address,
            0,
            true,
          );
          const selector = encodeFnSelector(
            'redeemInstant(address,uint256,uint256,address)',
          );
          await pauseVaultFn(redemptionVaultWithAave, selector);
          await redeemInstantTest(
            {
              redemptionVault: redemptionVaultWithAave,
              owner,
              mTBILL,
              mTokenToUsdDataFeed,
              customRecipient,
            },
            stableCoins.dai,
            100,
            {
              from: regularAccounts[0],
              revertMessage: 'Pausable: fn paused',
            },
          );
        });

        it('should fail: greenlist enabled and recipient not in greenlist (custom recipient overload)', async () => {
          const {
            owner,
            redemptionVaultWithAave,
            stableCoins,
            mTBILL,
            mTokenToUsdDataFeed,
            greenListableTester,
            accessControl,
            customRecipient,
          } = await loadFixture(defaultDeploy);

          await redemptionVaultWithAave.setGreenlistEnable(true);

          await greenList(
            { greenlistable: greenListableTester, accessControl, owner },
            owner,
          );

          await redeemInstantTest(
            {
              redemptionVault: redemptionVaultWithAave,
              owner,
              mTBILL,
              mTokenToUsdDataFeed,
              customRecipient,
            },
            stableCoins.dai,
            1,
            {
              revertMessage: 'WMAC: hasnt role',
            },
          );
        });

        it('should fail: recipient in blacklist (custom recipient overload)', async () => {
          const {
            owner,
            redemptionVaultWithAave,
            stableCoins,
            mTBILL,
            mTokenToUsdDataFeed,
            blackListableTester,
            accessControl,
            regularAccounts,
            customRecipient,
          } = await loadFixture(defaultDeploy);

          await blackList(
            { blacklistable: blackListableTester, accessControl, owner },
            customRecipient,
          );

          await redeemInstantTest(
            {
              redemptionVault: redemptionVaultWithAave,
              owner,
              mTBILL,
              mTokenToUsdDataFeed,
              customRecipient,
            },
            stableCoins.dai,
            1,
            {
              from: regularAccounts[0],
              revertMessage: acErrors.WMAC_HAS_ROLE,
            },
          );
        });

        it('should fail: recipient in sanctions list (custom recipient overload)', async () => {
          const {
            owner,
            redemptionVaultWithAave,
            stableCoins,
            mTBILL,
            mTokenToUsdDataFeed,
            regularAccounts,
            mockedSanctionsList,
            customRecipient,
          } = await loadFixture(defaultDeploy);

          await sanctionUser(
            { sanctionsList: mockedSanctionsList },
            customRecipient,
          );

          await redeemInstantTest(
            {
              redemptionVault: redemptionVaultWithAave,
              owner,
              mTBILL,
              mTokenToUsdDataFeed,
              customRecipient,
            },
            stableCoins.dai,
            1,
            {
              from: regularAccounts[0],
              revertMessage: 'WSL: sanctioned',
            },
          );
        });
      });
    });
  },
);
