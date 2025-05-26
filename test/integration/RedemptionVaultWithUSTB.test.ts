import { loadFixture } from '@nomicfoundation/hardhat-network-helpers';
import { expect } from 'chai';
import { parseUnits } from 'ethers/lib/utils';

import { ustbRedemptionVaultFixture } from './fixtures/ustb.fixture';
import { transferUSTBFromWhale } from './helpers/usdtb-helpers';

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
        usdcWhale,
      } = await loadFixture(ustbRedemptionVaultFixture);

      const mTBILLAmount = parseUnits('1000', 18);

      // Fund vault with USDC
      await usdc
        .connect(usdcWhale)
        .transfer(redemptionVaultWithUSTB.address, parseUnits('10000', 6));

      // Mint mTBILL to user
      await mTBILL.connect(owner).mint(testUser.address, mTBILLAmount);

      // Approve vault
      await mTBILL
        .connect(testUser)
        .approve(redemptionVaultWithUSTB.address, mTBILLAmount);

      // Get balances before
      const userUSDCBefore = await usdc.balanceOf(testUser.address);
      const vaultUSDCBefore = await usdc.balanceOf(
        redemptionVaultWithUSTB.address,
      );

      // Perform redemption
      const tx = await redemptionVaultWithUSTB
        .connect(testUser)
        .redeemInstant(usdc.address, mTBILLAmount, 0);

      await tx.wait();

      // Check balances after
      const userUSDCAfter = await usdc.balanceOf(testUser.address);
      const userMTBILLAfter = await mTBILL.balanceOf(testUser.address);
      const vaultUSDCAfter = await usdc.balanceOf(
        redemptionVaultWithUSTB.address,
      );

      // Verify user received USDC (990 after 1% fee)
      expect(userUSDCAfter.sub(userUSDCBefore)).to.equal(parseUnits('990', 6));

      // Verify mTBILL was burned from user
      expect(userMTBILLAfter).to.equal(0);

      // Verify vault USDC decreased
      expect(vaultUSDCBefore.sub(vaultUSDCAfter)).to.equal(
        parseUnits('990', 6),
      );
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
      } = await loadFixture(ustbRedemptionVaultFixture);

      const mTBILLAmount = parseUnits('5000', 18);

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
      await mTBILL.connect(owner).mint(testUser.address, mTBILLAmount);

      // Approve vault
      await mTBILL
        .connect(testUser)
        .approve(redemptionVaultWithUSTB.address, mTBILLAmount);

      // Get balances before
      const vaultUSTBBefore = await ustbToken.balanceOf(
        redemptionVaultWithUSTB.address,
      );
      const userUSDCBefore = await usdc.balanceOf(testUser.address);

      // Perform redemption
      const tx = await redemptionVaultWithUSTB
        .connect(testUser)
        .redeemInstant(usdc.address, mTBILLAmount, 0);

      await tx.wait();

      // Check that USTB was used
      const vaultUSTBAfter = await ustbToken.balanceOf(
        redemptionVaultWithUSTB.address,
      );
      const ustbUsed = vaultUSTBBefore.sub(vaultUSTBAfter);

      expect(ustbUsed).to.be.gt(0);

      // Verify user received USDC
      const userUSDCAfter = await usdc.balanceOf(testUser.address);
      const usdcReceived = userUSDCAfter.sub(userUSDCBefore);

      // Should receive 4950 USDC (5000 - 1% fee)
      expect(usdcReceived).to.equal(parseUnits('4950', 6));
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
        vaultAdmin,
        ustbWhale,
      } = await loadFixture(ustbRedemptionVaultFixture);

      const mTBILLAmount = parseUnits('100000000', 18); // 100 million mTBILL
      await mTBILL.connect(owner).mint(testUser.address, mTBILLAmount);
      await mTBILL
        .connect(testUser)
        .approve(redemptionVaultWithUSTB.address, mTBILLAmount);

      const vaultUSDC = await usdc.balanceOf(redemptionVaultWithUSTB.address);
      const vaultUSTB = await ustbToken.balanceOf(
        redemptionVaultWithUSTB.address,
      );

      if (vaultUSDC.gt(0)) {
        await redemptionVaultWithUSTB
          .connect(vaultAdmin)
          .withdrawToken(usdc.address, vaultUSDC, vaultAdmin.address);
      }

      if (vaultUSTB.gt(0)) {
        await redemptionVaultWithUSTB
          .connect(vaultAdmin)
          .withdrawToken(ustbToken.address, vaultUSTB, vaultAdmin.address);
      }

      // Add a small amount of USTB that's insufficient for the large redemption
      const smallUSTBAmount = parseUnits('1000', 6); // Only 1000 USTB
      await transferUSTBFromWhale(
        ustbToken,
        ustbWhale,
        redemptionVaultWithUSTB.address,
        smallUSTBAmount,
      );

      await expect(
        redemptionVaultWithUSTB
          .connect(testUser)
          .redeemInstant(usdc.address, mTBILLAmount, 0),
      ).rejectedWith('RVU: insufficient USTB balance');
    });
  });
});
