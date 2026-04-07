import { loadFixture } from '@nomicfoundation/hardhat-network-helpers';
import { expect } from 'chai';
import { parseUnits } from 'ethers/lib/utils';

import { mTokenRedemptionFixture } from './fixtures/mtoken.fixture';

import { mintToken, approveBase18 } from '../common/common.helpers';

describe('RedemptionVaultWithMToken - Mainnet Fork Integration Tests', function () {
  this.timeout(300000);

  describe('Scenario 1: Vault has sufficient USDC', function () {
    it('should redeem mFONE for USDC directly without touching mTBILL', async function () {
      const {
        testUser,
        mFONE,
        mTBILL,
        redemptionVaultWithMToken,
        usdc,
        usdcWhale,
      } = await loadFixture(mTokenRedemptionFixture);

      const mFONEAmount = 1000;

      // Fund product RV with USDC so no mTBILL redemption is needed
      await usdc
        .connect(usdcWhale)
        .transfer(redemptionVaultWithMToken.address, parseUnits('10000', 6));

      // Mint mFONE to user
      await mintToken(mFONE, testUser, mFONEAmount);

      // Approve product RV
      await approveBase18(
        testUser,
        mFONE,
        redemptionVaultWithMToken,
        mFONEAmount,
      );

      // Get balances before
      const vaultUSDCBefore = await usdc.balanceOf(
        redemptionVaultWithMToken.address,
      );
      const vaultMTBILLBefore = await mTBILL.balanceOf(
        redemptionVaultWithMToken.address,
      );
      const userUSDCBefore = await usdc.balanceOf(testUser.address);

      // Perform redemption
      await redemptionVaultWithMToken
        .connect(testUser)
        ['redeemInstant(address,uint256,uint256)'](
          usdc.address,
          parseUnits(String(mFONEAmount)),
          0,
        );

      // Get balances after
      const vaultUSDCAfter = await usdc.balanceOf(
        redemptionVaultWithMToken.address,
      );
      const vaultMTBILLAfter = await mTBILL.balanceOf(
        redemptionVaultWithMToken.address,
      );
      const userUSDCAfter = await usdc.balanceOf(testUser.address);

      // Verify user received USDC (990 after 1% fee)
      expect(userUSDCAfter.sub(userUSDCBefore)).to.equal(parseUnits('990', 6));

      // Verify vault USDC decreased
      expect(vaultUSDCBefore.sub(vaultUSDCAfter)).to.equal(
        parseUnits('990', 6),
      );

      // Verify mTBILL was NOT used
      expect(vaultMTBILLAfter).to.equal(vaultMTBILLBefore);

      // Verify mFONE was burned from user
      expect(await mFONE.balanceOf(testUser.address)).to.equal(0);
    });
  });

  describe('Scenario 2: Vault uses mTBILL for liquidity', function () {
    it('should redeem mTBILL through target RV when vault has no direct USDC', async function () {
      const { testUser, mFONE, mTBILL, redemptionVaultWithMToken, usdc } =
        await loadFixture(mTokenRedemptionFixture);

      const mFONEAmount = 1000;

      // Vault has no direct USDC but has mTBILL (loaded in fixture)
      expect(await usdc.balanceOf(redemptionVaultWithMToken.address)).to.equal(
        0,
      );
      expect(
        await mTBILL.balanceOf(redemptionVaultWithMToken.address),
      ).to.be.gte(parseUnits('1000'));

      // Mint mFONE to user
      await mintToken(mFONE, testUser, mFONEAmount);

      // Approve product RV
      await approveBase18(
        testUser,
        mFONE,
        redemptionVaultWithMToken,
        mFONEAmount,
      );

      // Get balances before
      const vaultMTBILLBefore = await mTBILL.balanceOf(
        redemptionVaultWithMToken.address,
      );
      const userUSDCBefore = await usdc.balanceOf(testUser.address);

      // Perform redemption
      await redemptionVaultWithMToken
        .connect(testUser)
        ['redeemInstant(address,uint256,uint256)'](
          usdc.address,
          parseUnits(String(mFONEAmount)),
          0,
        );

      // Get balances after
      const vaultMTBILLAfter = await mTBILL.balanceOf(
        redemptionVaultWithMToken.address,
      );
      const userUSDCAfter = await usdc.balanceOf(testUser.address);

      // Verify mTBILL was used (redeemed through target RV)
      expect(vaultMTBILLBefore.sub(vaultMTBILLAfter)).to.be.gt(0);

      // Verify user received USDC (990 after 1% fee)
      expect(userUSDCAfter.sub(userUSDCBefore)).to.equal(parseUnits('990', 6));

      // Verify mFONE was burned from user
      expect(await mFONE.balanceOf(testUser.address)).to.equal(0);
    });
  });

  describe('Scenario 3: Partial mTBILL redemption', function () {
    it('should only redeem mTBILL for the shortfall when vault has partial USDC', async function () {
      const {
        testUser,
        mFONE,
        mTBILL,
        redemptionVaultWithMToken,
        usdc,
        usdcWhale,
      } = await loadFixture(mTokenRedemptionFixture);

      const mFONEAmount = 1000;
      const partialUSDC = parseUnits('500', 6);

      // Fund product RV with partial USDC
      await usdc
        .connect(usdcWhale)
        .transfer(redemptionVaultWithMToken.address, partialUSDC);

      // Mint mFONE to user
      await mintToken(mFONE, testUser, mFONEAmount);

      // Approve product RV
      await approveBase18(
        testUser,
        mFONE,
        redemptionVaultWithMToken,
        mFONEAmount,
      );

      // Get balances before
      const vaultMTBILLBefore = await mTBILL.balanceOf(
        redemptionVaultWithMToken.address,
      );
      const vaultUSDCBefore = await usdc.balanceOf(
        redemptionVaultWithMToken.address,
      );
      const userUSDCBefore = await usdc.balanceOf(testUser.address);

      // Perform redemption: 1000 mFONE @ 1:1 rate, 1% fee = 990 USDC needed
      // Vault has 500 USDC, shortfall = 490 USDC from mTBILL redemption
      await redemptionVaultWithMToken
        .connect(testUser)
        ['redeemInstant(address,uint256,uint256)'](
          usdc.address,
          parseUnits(String(mFONEAmount)),
          0,
        );

      // Get balances after
      const vaultMTBILLAfter = await mTBILL.balanceOf(
        redemptionVaultWithMToken.address,
      );
      const vaultUSDCAfter = await usdc.balanceOf(
        redemptionVaultWithMToken.address,
      );
      const userUSDCAfter = await usdc.balanceOf(testUser.address);

      // Verify user received USDC
      expect(userUSDCAfter.sub(userUSDCBefore)).to.equal(parseUnits('990', 6));

      // Verify mTBILL was used for the shortfall portion
      expect(vaultMTBILLBefore.sub(vaultMTBILLAfter)).to.be.gt(0);

      // Verify some vault USDC was also used
      expect(vaultUSDCBefore.sub(vaultUSDCAfter)).to.be.gt(0);

      // Verify mFONE was burned from user
      expect(await mFONE.balanceOf(testUser.address)).to.equal(0);
    });
  });

  describe('Error Cases', function () {
    it('should revert when vault has insufficient mTBILL balance', async function () {
      const {
        owner,
        testUser,
        mFONE,
        mTBILL,
        redemptionVaultWithMToken,
        usdc,
      } = await loadFixture(mTokenRedemptionFixture);

      // Withdraw all mTBILL from the product RV so it has no fallback
      const vaultMTBILL = await mTBILL.balanceOf(
        redemptionVaultWithMToken.address,
      );
      await redemptionVaultWithMToken
        .connect(owner)
        .withdrawToken(mTBILL.address, vaultMTBILL);

      const mFONEAmount = 1000;

      // Mint mFONE
      await mintToken(mFONE, testUser, mFONEAmount);

      // Approve
      await approveBase18(
        testUser,
        mFONE,
        redemptionVaultWithMToken,
        mFONEAmount,
      );

      // Should revert because vault has no USDC and no mTBILL
      await expect(
        redemptionVaultWithMToken
          .connect(testUser)
          ['redeemInstant(address,uint256,uint256)'](
            usdc.address,
            parseUnits(String(mFONEAmount)),
            0,
          ),
      ).to.be.revertedWith('RVMT: insufficient mToken balance');
    });
  });
});
