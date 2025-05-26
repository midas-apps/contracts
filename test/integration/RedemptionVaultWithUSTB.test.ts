import { loadFixture } from '@nomicfoundation/hardhat-network-helpers';
import { expect } from 'chai';
import { parseUnits } from 'ethers/lib/utils';

import { ustbRedemptionVaultFixture } from './fixtures/ustb.fixture';
import { transferUSTBFromWhale } from './helpers/ustb-helpers';

import { mintToken, approveBase18 } from '../common/common.helpers';
import { redeemInstantWithUstbTest } from '../common/redemption-vault-ustb.helpers';

describe('RedemptionVaultWithUSTB - Mainnet Fork Integration Tests', function () {
  this.timeout(120000);

  describe('Scenario 1: Vault has sufficient USDC', function () {
    it('should redeem mTBILL for USDC directly without USTB', async function () {
      const {
        owner,
        testUser,
        mTBILL,
        redemptionVaultWithUSTB,
        usdc,
        ustbToken,
        usdcWhale,
        mTokenToUsdDataFeed,
      } = await loadFixture(ustbRedemptionVaultFixture);

      const mTBILLAmount = 1000;

      // Fund vault with USDC
      await usdc
        .connect(usdcWhale)
        .transfer(redemptionVaultWithUSTB.address, parseUnits('10000', 6));

      // Mint mTBILL to user
      await mintToken(mTBILL, testUser, mTBILLAmount);

      // Approve vault
      await approveBase18(
        testUser,
        mTBILL,
        redemptionVaultWithUSTB,
        mTBILLAmount,
      );

      // Get balances before
      const vaultUSDCBefore = await usdc.balanceOf(
        redemptionVaultWithUSTB.address,
      );

      // Perform redemption
      const result = await redeemInstantWithUstbTest(
        {
          redemptionVault: redemptionVaultWithUSTB,
          owner,
          mTBILL,
          mTokenToUsdDataFeed,
          usdc,
          ustbToken,
          expectedUstbUsed: parseUnits('0', 6),
          expectedUsdcUsed: parseUnits('990', 6), // 990 USDC (1000 - 1% fee)
        },
        mTBILLAmount,
        { from: testUser },
      );

      // Verify user received USDC (990 after 1% fee)
      expect(result?.userUSDCReceived).to.equal(parseUnits('990', 6));

      // Verify vault USDC decreased
      expect(vaultUSDCBefore.sub(result?.vaultUSDCAfter ?? '0')).to.equal(
        parseUnits('990', 6),
      );

      // Verify mTBILL was burned from user
      expect(await mTBILL.balanceOf(testUser.address)).to.equal(0);
    });
  });

  describe('Scenario 2: Vault uses USTB for liquidity', function () {
    it('should redeem USTB when vault has insufficient USDC', async function () {
      const {
        owner,
        testUser,
        mTBILL,
        redemptionVaultWithUSTB,
        usdc,
        ustbToken,
        ustbWhale,
        usdcWhale,
        redemptionIdle,
        mTokenToUsdDataFeed,
      } = await loadFixture(ustbRedemptionVaultFixture);

      const mTBILLAmount = 5000;

      // Fund RedemptionIdle with USDC for USTB redemptions
      await usdc
        .connect(usdcWhale)
        .transfer(redemptionIdle.address, parseUnits('1000000', 6));

      // Fund vault with minimal USDC (only 1000 USDC)
      await usdc
        .connect(usdcWhale)
        .transfer(redemptionVaultWithUSTB.address, parseUnits('1000', 6));

      // Fund vault with USTB
      await transferUSTBFromWhale(
        ustbToken,
        ustbWhale,
        redemptionVaultWithUSTB.address,
        parseUnits('10000', 6),
      );

      // Mint mTBILL to user
      await mintToken(mTBILL, testUser, mTBILLAmount);

      // Approve vault
      await approveBase18(
        testUser,
        mTBILL,
        redemptionVaultWithUSTB,
        mTBILLAmount,
      );

      // Get balances before
      const vaultUSTBBefore = await ustbToken.balanceOf(
        redemptionVaultWithUSTB.address,
      );

      // Perform redemption
      const result = await redeemInstantWithUstbTest(
        {
          redemptionVault: redemptionVaultWithUSTB,
          owner,
          mTBILL,
          mTokenToUsdDataFeed,
          usdc,
          ustbToken,
        },
        mTBILLAmount,
        { from: testUser },
      );

      // Check that USTB was used
      expect(result?.ustbUsed).to.be.gt(0);

      // Verify user received USDC
      expect(result?.userUSDCReceived).to.equal(parseUnits('4950', 6));

      // Verify mTBILL was burned from user
      expect(await mTBILL.balanceOf(testUser.address)).to.equal(0);
    });
  });

  describe('Error Cases', function () {
    it('should revert when vault has insufficient funds', async function () {
      const {
        owner,
        testUser,
        mTBILL,
        redemptionVaultWithUSTB,
        usdc,
        ustbToken,
        ustbWhale,
        mTokenToUsdDataFeed,
      } = await loadFixture(ustbRedemptionVaultFixture);

      const mTBILLAmount = 100000000; // 100 million mTBILL

      // Mint mTBILL
      await mintToken(mTBILL, testUser, mTBILLAmount);

      // Approve
      await approveBase18(
        testUser,
        mTBILL,
        redemptionVaultWithUSTB,
        mTBILLAmount,
      );

      // Add a small amount of USTB that's insufficient for the large redemption
      const smallUSTBAmount = parseUnits('1000', 6); // Only 1000 USTB
      await transferUSTBFromWhale(
        ustbToken,
        ustbWhale,
        redemptionVaultWithUSTB.address,
        smallUSTBAmount,
      );

      await redeemInstantWithUstbTest(
        {
          redemptionVault: redemptionVaultWithUSTB,
          owner,
          mTBILL,
          mTokenToUsdDataFeed,
          usdc,
          ustbToken,
        },
        mTBILLAmount,
        {
          from: testUser,
          revertMessage: 'RVU: insufficient USTB balance',
        },
      );
    });
  });
});
