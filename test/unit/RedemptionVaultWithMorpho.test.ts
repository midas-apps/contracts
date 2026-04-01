import { loadFixture } from '@nomicfoundation/hardhat-network-helpers';
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { expect } from 'chai';
import { constants } from 'ethers';
import { parseUnits } from 'ethers/lib/utils';
import { ethers } from 'hardhat';

import { redemptionVaultSuits } from './suits/redemption-vault.suits';

import { encodeFnSelector } from '../../helpers/utils';
import { RedemptionVaultWithMorphoTest__factory } from '../../typechain-types';
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
  addWaivedFeeAccountTest,
} from '../common/manageable-vault.helpers';
import {
  setMorphoVaultTest,
  removeMorphoVaultTest,
} from '../common/redemption-vault-morpho.helpers';
import {
  redeemInstantTest,
  setLoanLpTest,
} from '../common/redemption-vault.helpers';

redemptionVaultSuits(
  'RedemptionVaultWithMorpho',
  defaultDeploy,
  {
    createNew: async (owner: SignerWithAddress) =>
      new RedemptionVaultWithMorphoTest__factory(owner).deploy(),
    key: 'redemptionVaultWithMorpho',
  },
  async (fixture) => {
    const { redemptionVaultWithMorpho, stableCoins, morphoVaultMock } = fixture;
    expect(
      await redemptionVaultWithMorpho.morphoVaults(stableCoins.usdc.address),
    ).eq(morphoVaultMock.address);
  },
  async (defaultDeploy) => {
    describe('RedemptionVaultWithMorpho', () => {
      describe('setMorphoVault()', () => {
        it('should fail: call from address without vault admin role', async () => {
          const {
            redemptionVaultWithMorpho,
            owner,
            regularAccounts,
            stableCoins,
            morphoVaultMock,
          } = await loadFixture(defaultDeploy);

          await setMorphoVaultTest(
            { redemptionVault: redemptionVaultWithMorpho, owner },
            stableCoins.usdc.address,
            morphoVaultMock.address,
            {
              from: regularAccounts[0],
              revertMessage: 'WMAC: hasnt role',
            },
          );
        });

        it('should fail: zero token address', async () => {
          const { redemptionVaultWithMorpho, owner, morphoVaultMock } =
            await loadFixture(defaultDeploy);

          await setMorphoVaultTest(
            { redemptionVault: redemptionVaultWithMorpho, owner },
            constants.AddressZero,
            morphoVaultMock.address,
            {
              revertMessage: 'zero address',
            },
          );
        });

        it('should fail: zero vault address', async () => {
          const { redemptionVaultWithMorpho, owner, stableCoins } =
            await loadFixture(defaultDeploy);

          await setMorphoVaultTest(
            { redemptionVault: redemptionVaultWithMorpho, owner },
            stableCoins.usdc.address,
            constants.AddressZero,
            {
              revertMessage: 'zero address',
            },
          );
        });

        it('should fail: asset mismatch', async () => {
          const {
            redemptionVaultWithMorpho,
            owner,
            stableCoins,
            morphoVaultMock,
          } = await loadFixture(defaultDeploy);

          await setMorphoVaultTest(
            { redemptionVault: redemptionVaultWithMorpho, owner },
            stableCoins.dai.address,
            morphoVaultMock.address,
            {
              revertMessage: 'RVM: asset mismatch',
            },
          );
        });

        it('should fail: when function is paused', async () => {
          const {
            redemptionVaultWithMorpho,
            owner,
            stableCoins,
            morphoVaultMock,
          } = await loadFixture(defaultDeploy);

          await pauseVaultFn(
            redemptionVaultWithMorpho,
            encodeFnSelector('setMorphoVault(address,address)'),
          );

          await setMorphoVaultTest(
            { redemptionVault: redemptionVaultWithMorpho, owner },
            stableCoins.usdc.address,
            morphoVaultMock.address,
            { revertMessage: 'WMAC: paused fn' },
          );
        });

        it('call from address with vault admin role', async () => {
          const {
            redemptionVaultWithMorpho,
            owner,
            stableCoins,
            morphoVaultMock,
          } = await loadFixture(defaultDeploy);

          await setMorphoVaultTest(
            { redemptionVault: redemptionVaultWithMorpho, owner },
            stableCoins.usdc.address,
            morphoVaultMock.address,
          );
        });
      });

      describe('removeMorphoVault()', () => {
        it('should fail: call from address without vault admin role', async () => {
          const {
            redemptionVaultWithMorpho,
            owner,
            regularAccounts,
            stableCoins,
          } = await loadFixture(defaultDeploy);

          await removeMorphoVaultTest(
            { redemptionVault: redemptionVaultWithMorpho, owner },
            stableCoins.usdc.address,
            {
              from: regularAccounts[0],
              revertMessage: 'WMAC: hasnt role',
            },
          );
        });

        it('should fail: vault not set', async () => {
          const { redemptionVaultWithMorpho, owner, stableCoins } =
            await loadFixture(defaultDeploy);

          await removeMorphoVaultTest(
            { redemptionVault: redemptionVaultWithMorpho, owner },
            stableCoins.dai.address,
            {
              revertMessage: 'RVM: vault not set',
            },
          );
        });

        it('should fail: when function is paused', async () => {
          const { redemptionVaultWithMorpho, owner, stableCoins } =
            await loadFixture(defaultDeploy);

          await pauseVaultFn(
            redemptionVaultWithMorpho,
            encodeFnSelector('removeMorphoVault(address)'),
          );

          await removeMorphoVaultTest(
            { redemptionVault: redemptionVaultWithMorpho, owner },
            stableCoins.usdc.address,
            { revertMessage: 'WMAC: paused fn' },
          );
        });

        it('call from address with vault admin role', async () => {
          const { redemptionVaultWithMorpho, owner, stableCoins } =
            await loadFixture(defaultDeploy);

          await removeMorphoVaultTest(
            { redemptionVault: redemptionVaultWithMorpho, owner },
            stableCoins.usdc.address,
          );
        });
      });

      describe('checkAndRedeemMorpho()', () => {
        it('should not withdraw from Morpho when contract has enough balance', async () => {
          const { redemptionVaultWithMorpho, stableCoins, morphoVaultMock } =
            await loadFixture(defaultDeploy);

          const usdcAmount = parseUnits('1000', 8);
          await stableCoins.usdc.mint(
            redemptionVaultWithMorpho.address,
            usdcAmount,
          );

          const balanceBefore = await stableCoins.usdc.balanceOf(
            redemptionVaultWithMorpho.address,
          );
          const sharesBefore = await morphoVaultMock.balanceOf(
            redemptionVaultWithMorpho.address,
          );

          await redemptionVaultWithMorpho.checkAndRedeemMorpho(
            stableCoins.usdc.address,
            parseUnits('500', 8),
          );

          const balanceAfter = await stableCoins.usdc.balanceOf(
            redemptionVaultWithMorpho.address,
          );
          const sharesAfter = await morphoVaultMock.balanceOf(
            redemptionVaultWithMorpho.address,
          );
          expect(balanceAfter).to.equal(balanceBefore);
          expect(sharesAfter).to.equal(sharesBefore);
        });

        it('should withdraw missing amount from Morpho', async () => {
          const { redemptionVaultWithMorpho, stableCoins, morphoVaultMock } =
            await loadFixture(defaultDeploy);

          // Vault has 500 USDC, needs 1000
          const initialUsdc = parseUnits('500', 8);
          await stableCoins.usdc.mint(
            redemptionVaultWithMorpho.address,
            initialUsdc,
          );

          // Vault has 600 Morpho shares (1:1 exchange rate by default)
          const sharesAmount = parseUnits('600', 8);
          await morphoVaultMock.mint(
            redemptionVaultWithMorpho.address,
            sharesAmount,
          );

          await redemptionVaultWithMorpho.checkAndRedeemMorpho(
            stableCoins.usdc.address,
            parseUnits('1000', 8),
          );

          // Vault should now have 1000 USDC (500 original + 500 withdrawn from Morpho)
          const usdcAfter = await stableCoins.usdc.balanceOf(
            redemptionVaultWithMorpho.address,
          );
          expect(usdcAfter).to.equal(parseUnits('1000', 8));

          // Share balance should decrease by 500 (1:1 rate)
          const sharesAfter = await morphoVaultMock.balanceOf(
            redemptionVaultWithMorpho.address,
          );
          expect(sharesAfter).to.equal(parseUnits('100', 8));
        });

        it('should revert when Morpho vault has insufficient underlying liquidity', async () => {
          const { redemptionVaultWithMorpho, stableCoins, morphoVaultMock } =
            await loadFixture(defaultDeploy);

          // Vault needs to withdraw from Morpho
          await stableCoins.usdc.mint(
            redemptionVaultWithMorpho.address,
            parseUnits('200', 8),
          );

          // Vault has enough shares
          await morphoVaultMock.mint(
            redemptionVaultWithMorpho.address,
            parseUnits('1000', 8),
          );

          // Drain the mock's USDC
          const mockBalance = await stableCoins.usdc.balanceOf(
            morphoVaultMock.address,
          );
          await morphoVaultMock.withdrawAdmin(
            stableCoins.usdc.address,
            (
              await ethers.getSigners()
            )[10].address,
            mockBalance,
          );

          await expect(
            redemptionVaultWithMorpho.checkAndRedeemMorpho(
              stableCoins.usdc.address,
              parseUnits('1000', 8),
            ),
          ).to.be.revertedWith('MorphoVaultMock: InsufficientLiquidity');
        });

        it('should withdraw correctly with non-1:1 exchange rate (shares worth more)', async () => {
          const { redemptionVaultWithMorpho, stableCoins, morphoVaultMock } =
            await loadFixture(defaultDeploy);

          // Set exchange rate: 1 share = 1.05 underlying (5% interest accrued)
          await morphoVaultMock.setExchangeRate(parseUnits('1.05', 18));

          // Vault has 200 USDC, needs 1000 → missing 800
          await stableCoins.usdc.mint(
            redemptionVaultWithMorpho.address,
            parseUnits('200', 8),
          );

          // At 1.05 rate, 800 assets needs ceil(800 / 1.05) ≈ 762 shares
          // Mint 800 shares (more than enough)
          await morphoVaultMock.mint(
            redemptionVaultWithMorpho.address,
            parseUnits('800', 8),
          );

          const sharesBefore = await morphoVaultMock.balanceOf(
            redemptionVaultWithMorpho.address,
          );

          await redemptionVaultWithMorpho.checkAndRedeemMorpho(
            stableCoins.usdc.address,
            parseUnits('1000', 8),
          );

          const usdcAfter = await stableCoins.usdc.balanceOf(
            redemptionVaultWithMorpho.address,
          );
          expect(usdcAfter).to.equal(parseUnits('1000', 8));

          const sharesAfter = await morphoVaultMock.balanceOf(
            redemptionVaultWithMorpho.address,
          );
          // Shares burned should be less than 800 because each share is worth 1.05
          expect(sharesAfter).to.be.gt(0);
          const sharesBurned = sharesBefore.sub(sharesAfter);
          expect(sharesBurned).to.be.lt(parseUnits('800', 8));
        });

        it('shouldnt revert with insufficient shares at non-1:1 exchange rate', async () => {
          const { redemptionVaultWithMorpho, stableCoins, morphoVaultMock } =
            await loadFixture(defaultDeploy);

          // Set exchange rate: 1 share = 0.95 underlying (loss scenario)
          await morphoVaultMock.setExchangeRate(parseUnits('0.95', 18));

          // Vault has 200 USDC, needs 1000 → missing 800
          await stableCoins.usdc.mint(
            redemptionVaultWithMorpho.address,
            parseUnits('200', 8),
          );

          // At 0.95 rate, 800 assets needs ceil(800 / 0.95) ≈ 843 shares
          // Mint only 800 shares (not enough at this rate)
          await morphoVaultMock.mint(
            redemptionVaultWithMorpho.address,
            parseUnits('800', 8),
          );

          await expect(
            redemptionVaultWithMorpho.checkAndRedeemMorpho(
              stableCoins.usdc.address,
              parseUnits('1000', 8),
            ),
          ).to.not.be.reverted;
        });
      });

      describe('redeemInstant()', () => {
        it('redeem 100 mTBILL when vault has enough USDC (no Morpho needed)', async () => {
          const {
            owner,
            redemptionVaultWithMorpho,
            stableCoins,
            mTBILL,
            mTokenToUsdDataFeed,
            dataFeed,
            morphoVaultMock,
          } = await loadFixture(defaultDeploy);

          await mintToken(stableCoins.usdc, redemptionVaultWithMorpho, 100000);
          await mintToken(mTBILL, owner, 100);
          await approveBase18(owner, mTBILL, redemptionVaultWithMorpho, 100);
          await addPaymentTokenTest(
            { vault: redemptionVaultWithMorpho, owner },
            stableCoins.usdc,
            dataFeed.address,
            0,
            true,
          );

          const sharesBefore = await morphoVaultMock.balanceOf(
            redemptionVaultWithMorpho.address,
          );

          await redeemInstantTest(
            {
              redemptionVault: redemptionVaultWithMorpho,
              owner,
              mTBILL,
              mTokenToUsdDataFeed,
            },
            stableCoins.usdc,
            100,
          );

          // Share balance should not change
          const sharesAfter = await morphoVaultMock.balanceOf(
            redemptionVaultWithMorpho.address,
          );
          expect(sharesAfter).to.equal(sharesBefore);
        });

        it('redeem 1000 mTBILL when vault has no USDC but has Morpho shares', async () => {
          const {
            owner,
            mockedAggregator,
            mockedAggregatorMToken,
            redemptionVaultWithMorpho,
            stableCoins,
            mTBILL,
            dataFeed,
            mTokenToUsdDataFeed,
            morphoVaultMock,
          } = await loadFixture(defaultDeploy);

          // Mint shares to vault (enough for redemption at 1:1 rate)
          await morphoVaultMock.mint(
            redemptionVaultWithMorpho.address,
            parseUnits('9900', 8),
          );
          await mintToken(mTBILL, owner, 1000);
          await approveBase18(owner, mTBILL, redemptionVaultWithMorpho, 1000);
          await addPaymentTokenTest(
            { vault: redemptionVaultWithMorpho, owner },
            stableCoins.usdc,
            dataFeed.address,
            0,
            true,
          );
          await setInstantFeeTest(
            { vault: redemptionVaultWithMorpho, owner },
            0,
          );
          await setRoundData({ mockedAggregator }, 1);
          await setRoundData({ mockedAggregator: mockedAggregatorMToken }, 1);

          const sharesBefore = await morphoVaultMock.balanceOf(
            redemptionVaultWithMorpho.address,
          );

          await redeemInstantTest(
            {
              redemptionVault: redemptionVaultWithMorpho,
              owner,
              mTBILL,
              mTokenToUsdDataFeed,
              additionalLiquidity: async () => {
                return await morphoVaultMock.balanceOf(
                  redemptionVaultWithMorpho.address,
                );
              },
            },
            stableCoins.usdc,
            1000,
          );

          const sharesAfter = await morphoVaultMock.balanceOf(
            redemptionVaultWithMorpho.address,
          );

          // Shares should decrease
          expect(sharesAfter).to.be.lt(sharesBefore);
        });

        it('redeem 1000 mTBILL when vault has 100 USDC and sufficient shares (partial Morpho)', async () => {
          const {
            owner,
            mockedAggregator,
            mockedAggregatorMToken,
            redemptionVaultWithMorpho,
            stableCoins,
            mTBILL,
            dataFeed,
            mTokenToUsdDataFeed,
            morphoVaultMock,
          } = await loadFixture(defaultDeploy);

          // Vault has 100 USDC + shares
          await mintToken(stableCoins.usdc, redemptionVaultWithMorpho, 100);
          await morphoVaultMock.mint(
            redemptionVaultWithMorpho.address,
            parseUnits('9900', 8),
          );
          await mintToken(mTBILL, owner, 1000);
          await approveBase18(owner, mTBILL, redemptionVaultWithMorpho, 1000);
          await addPaymentTokenTest(
            { vault: redemptionVaultWithMorpho, owner },
            stableCoins.usdc,
            dataFeed.address,
            0,
            true,
          );
          await setRoundData({ mockedAggregator }, 1);
          await setRoundData({ mockedAggregator: mockedAggregatorMToken }, 1);

          await redeemInstantTest(
            {
              redemptionVault: redemptionVaultWithMorpho,
              owner,
              mTBILL,
              mTokenToUsdDataFeed,
              additionalLiquidity: async () => {
                return await morphoVaultMock.balanceOf(
                  redemptionVaultWithMorpho.address,
                );
              },
            },
            stableCoins.usdc,
            1000,
          );
        });

        it('redeem 1000 mTBILL when vault has 100 USDC and insufficient shares (partial Morpho, partial loan lp)', async () => {
          const {
            owner,
            mockedAggregator,
            mockedAggregatorMToken,
            redemptionVaultWithMorpho,
            stableCoins,
            mTBILL,
            dataFeed,
            mTokenToUsdDataFeed,
            morphoVaultMock,
            redemptionVaultLoanSwapper,
            loanLp,
            mTokenLoan,
          } = await loadFixture(defaultDeploy);

          await mintToken(mTokenLoan, loanLp, 200);
          await approveBase18(
            loanLp,
            mTokenLoan,
            redemptionVaultWithMorpho,
            200,
          );
          await mintToken(stableCoins.usdc, redemptionVaultLoanSwapper, 200);

          await addPaymentTokenTest(
            { vault: redemptionVaultLoanSwapper, owner },
            stableCoins.usdc,
            dataFeed.address,
            0,
            true,
          );
          // Vault has 100 USDC + shares
          await mintToken(stableCoins.usdc, redemptionVaultWithMorpho, 100);
          await morphoVaultMock.mint(
            redemptionVaultWithMorpho.address,
            parseUnits('700', 8),
          );
          await mintToken(mTBILL, owner, 1000);
          await approveBase18(owner, mTBILL, redemptionVaultWithMorpho, 1000);
          await addPaymentTokenTest(
            { vault: redemptionVaultWithMorpho, owner },
            stableCoins.usdc,
            dataFeed.address,
            0,
            true,
          );
          await setRoundData({ mockedAggregator }, 1);
          await setRoundData({ mockedAggregator: mockedAggregatorMToken }, 1);

          await redeemInstantTest(
            {
              redemptionVault: redemptionVaultWithMorpho,
              owner,
              mTBILL,
              mTokenToUsdDataFeed,
              additionalLiquidity: async () => {
                return await morphoVaultMock.balanceOf(
                  redemptionVaultWithMorpho.address,
                );
              },
            },
            stableCoins.usdc,
            1000,
          );
        });

        it('redeem 1000 mTBILL with different prices (stable 1.03$, mToken 5$) and partial Morpho', async () => {
          const {
            owner,
            mockedAggregator,
            mockedAggregatorMToken,
            redemptionVaultWithMorpho,
            stableCoins,
            mTBILL,
            dataFeed,
            mTokenToUsdDataFeed,
            morphoVaultMock,
          } = await loadFixture(defaultDeploy);

          await mintToken(stableCoins.usdc, redemptionVaultWithMorpho, 100);
          await morphoVaultMock.mint(
            redemptionVaultWithMorpho.address,
            parseUnits('15000', 8),
          );
          await mintToken(mTBILL, owner, 1000);
          await approveBase18(owner, mTBILL, redemptionVaultWithMorpho, 1000);
          await addPaymentTokenTest(
            { vault: redemptionVaultWithMorpho, owner },
            stableCoins.usdc,
            dataFeed.address,
            100,
            true,
          );
          await setRoundData({ mockedAggregator }, 1.03);
          await setRoundData({ mockedAggregator: mockedAggregatorMToken }, 5);
          await redemptionVaultWithMorpho.freeFromMinAmount(
            owner.address,
            true,
          );

          await redeemInstantTest(
            {
              redemptionVault: redemptionVaultWithMorpho,
              owner,
              mTBILL,
              mTokenToUsdDataFeed,
              additionalLiquidity: async () => {
                return await morphoVaultMock.balanceOf(
                  redemptionVaultWithMorpho.address,
                );
              },
            },
            stableCoins.usdc,
            1000,
          );
        });

        it('redeem 1000 mTBILL with waived fee and Morpho withdrawal', async () => {
          const {
            owner,
            mockedAggregator,
            mockedAggregatorMToken,
            redemptionVaultWithMorpho,
            stableCoins,
            mTBILL,
            dataFeed,
            mTokenToUsdDataFeed,
            morphoVaultMock,
          } = await loadFixture(defaultDeploy);

          await mintToken(stableCoins.usdc, redemptionVaultWithMorpho, 100);
          await morphoVaultMock.mint(
            redemptionVaultWithMorpho.address,
            parseUnits('15000', 8),
          );
          await mintToken(mTBILL, owner, 1000);
          await approveBase18(owner, mTBILL, redemptionVaultWithMorpho, 1000);
          await addPaymentTokenTest(
            { vault: redemptionVaultWithMorpho, owner },
            stableCoins.usdc,
            dataFeed.address,
            100,
            true,
          );
          await setRoundData({ mockedAggregator }, 1.03);
          await setRoundData({ mockedAggregator: mockedAggregatorMToken }, 5);

          await addWaivedFeeAccountTest(
            { vault: redemptionVaultWithMorpho, owner },
            owner.address,
          );

          await redeemInstantTest(
            {
              redemptionVault: redemptionVaultWithMorpho,
              owner,
              mTBILL,
              mTokenToUsdDataFeed,
              waivedFee: true,
              additionalLiquidity: async () => {
                return await morphoVaultMock.balanceOf(
                  redemptionVaultWithMorpho.address,
                );
              },
            },
            stableCoins.usdc,
            1000,
          );
        });

        it('should fail: insufficient shares so it fallback to loan lp flow', async () => {
          const {
            owner,
            mockedAggregator,
            mockedAggregatorMToken,
            redemptionVaultWithMorpho,
            stableCoins,
            mTBILL,
            dataFeed,
            morphoVaultMock,
          } = await loadFixture(defaultDeploy);

          await setLoanLpTest(
            { redemptionVault: redemptionVaultWithMorpho, owner },
            ethers.constants.AddressZero,
          );
          // Vault has no USDC and only 10 shares (not enough for 1000 mTBILL redemption)
          await morphoVaultMock.mint(
            redemptionVaultWithMorpho.address,
            parseUnits('10', 8),
          );
          await mintToken(mTBILL, owner, 1000);
          await approveBase18(owner, mTBILL, redemptionVaultWithMorpho, 1000);
          await addPaymentTokenTest(
            { vault: redemptionVaultWithMorpho, owner },
            stableCoins.usdc,
            dataFeed.address,
            0,
            true,
          );
          await setInstantFeeTest(
            { vault: redemptionVaultWithMorpho, owner },
            0,
          );
          await setRoundData({ mockedAggregator }, 1);
          await setRoundData({ mockedAggregator: mockedAggregatorMToken }, 1);

          await expect(
            redemptionVaultWithMorpho['redeemInstant(address,uint256,uint256)'](
              stableCoins.usdc.address,
              parseUnits('1000'),
              0,
            ),
          ).to.be.revertedWith('RV: loan lp not configured');
        });

        it('should fail: Morpho vault has insufficient liquidity during redeemInstant', async () => {
          const {
            owner,
            mockedAggregator,
            mockedAggregatorMToken,
            redemptionVaultWithMorpho,
            stableCoins,
            mTBILL,
            dataFeed,
            morphoVaultMock,
          } = await loadFixture(defaultDeploy);

          // Vault has shares but mock has no liquidity
          await morphoVaultMock.mint(
            redemptionVaultWithMorpho.address,
            parseUnits('10000', 8),
          );
          await mintToken(mTBILL, owner, 100000);
          await approveBase18(owner, mTBILL, redemptionVaultWithMorpho, 100000);
          await addPaymentTokenTest(
            { vault: redemptionVaultWithMorpho, owner },
            stableCoins.usdc,
            dataFeed.address,
            0,
            true,
          );
          await setInstantFeeTest(
            { vault: redemptionVaultWithMorpho, owner },
            0,
          );
          await setRoundData({ mockedAggregator }, 1);
          await setRoundData({ mockedAggregator: mockedAggregatorMToken }, 1);

          // Drain the mock
          const mockBalance = await stableCoins.usdc.balanceOf(
            morphoVaultMock.address,
          );
          await morphoVaultMock.withdrawAdmin(
            stableCoins.usdc.address,
            (
              await ethers.getSigners()
            )[10].address,
            mockBalance,
          );

          await expect(
            redemptionVaultWithMorpho['redeemInstant(address,uint256,uint256)'](
              stableCoins.usdc.address,
              parseUnits('1000'),
              0,
            ),
          ).to.be.revertedWith('MorphoVaultMock: InsufficientLiquidity');
        });
      });
    });
  },
);
