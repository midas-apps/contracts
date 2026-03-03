import { loadFixture } from '@nomicfoundation/hardhat-network-helpers';
import { expect } from 'chai';
import { constants } from 'ethers';
import { parseUnits } from 'ethers/lib/utils';
import { ethers } from 'hardhat';

import { morphoRedemptionFixture } from './fixtures/morpho.fixture';

import { mintToken, approveBase18 } from '../common/common.helpers';
import { redeemInstantWithMorphoTest } from '../common/redemption-vault-morpho.helpers';

describe('RedemptionVaultWithMorpho - Mainnet Fork Integration Tests', function () {
  this.timeout(300000);

  describe('Scenario 1: Vault has sufficient USDC', function () {
    it('should redeem mTBILL for USDC directly without Morpho withdrawal', async function () {
      const {
        owner,
        testUser,
        mTBILL,
        redemptionVaultWithMorpho,
        usdc,
        morphoVault,
        usdcWhale,
        mTokenToUsdDataFeed,
      } = await loadFixture(morphoRedemptionFixture);

      const mTBILLAmount = 1000;

      // Fund vault with USDC
      await usdc
        .connect(usdcWhale)
        .transfer(redemptionVaultWithMorpho.address, parseUnits('10000', 6));

      // Mint mTBILL to user
      await mintToken(mTBILL, testUser, mTBILLAmount);

      // Approve vault
      await approveBase18(
        testUser,
        mTBILL,
        redemptionVaultWithMorpho,
        mTBILLAmount,
      );

      // Get balances before
      const vaultUSDCBefore = await usdc.balanceOf(
        redemptionVaultWithMorpho.address,
      );

      // Perform redemption
      const result = await redeemInstantWithMorphoTest(
        {
          redemptionVault: redemptionVaultWithMorpho,
          owner,
          mTBILL,
          mTokenToUsdDataFeed,
          usdc,
          morphoVault,
          expectedSharesUsed: parseUnits('0'),
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

  describe('Scenario 2: Vault uses Morpho for liquidity', function () {
    it('should withdraw from Morpho when vault has no direct USDC', async function () {
      const {
        owner,
        testUser,
        mTBILL,
        redemptionVaultWithMorpho,
        usdc,
        morphoVault,
        morphoShareWhale,
        mTokenToUsdDataFeed,
      } = await loadFixture(morphoRedemptionFixture);

      const mTBILLAmount = 1000;

      // Fund vault with Morpho shares only (no direct USDC)
      const shareAmount = parseUnits('10000', 18);
      await morphoVault
        .connect(morphoShareWhale)
        .transfer(redemptionVaultWithMorpho.address, shareAmount);

      // Verify vault has no direct USDC
      expect(await usdc.balanceOf(redemptionVaultWithMorpho.address)).to.equal(
        0,
      );

      // Verify vault has shares
      expect(
        await morphoVault.balanceOf(redemptionVaultWithMorpho.address),
      ).to.be.gte(shareAmount);

      // Mint mTBILL to user
      await mintToken(mTBILL, testUser, mTBILLAmount);

      // Approve vault
      await approveBase18(
        testUser,
        mTBILL,
        redemptionVaultWithMorpho,
        mTBILLAmount,
      );

      // Perform redemption
      const result = await redeemInstantWithMorphoTest(
        {
          redemptionVault: redemptionVaultWithMorpho,
          owner,
          mTBILL,
          mTokenToUsdDataFeed,
          usdc,
          morphoVault,
        },
        mTBILLAmount,
        { from: testUser },
      );

      // Check that shares were used
      expect(result?.sharesUsed).to.be.gt(0);

      // Verify user received USDC
      expect(result?.userUSDCReceived).to.equal(parseUnits('990', 6));

      // Verify mTBILL was burned from user
      expect(await mTBILL.balanceOf(testUser.address)).to.equal(0);
    });
  });

  describe('Scenario 3: Partial Morpho withdrawal', function () {
    it('should only withdraw shortfall from Morpho when vault has partial USDC', async function () {
      const {
        owner,
        testUser,
        mTBILL,
        redemptionVaultWithMorpho,
        usdc,
        morphoVault,
        usdcWhale,
        morphoShareWhale,
        mTokenToUsdDataFeed,
      } = await loadFixture(morphoRedemptionFixture);

      const mTBILLAmount = 1000;
      const partialUSDC = parseUnits('500', 6); // 500 USDC in vault

      // Fund vault with partial USDC
      await usdc
        .connect(usdcWhale)
        .transfer(redemptionVaultWithMorpho.address, partialUSDC);

      // Fund vault with Morpho shares for the rest
      const shareAmount = parseUnits('10000', 18);
      await morphoVault
        .connect(morphoShareWhale)
        .transfer(redemptionVaultWithMorpho.address, shareAmount);

      // Mint mTBILL to user
      await mintToken(mTBILL, testUser, mTBILLAmount);

      // Approve vault
      await approveBase18(
        testUser,
        mTBILL,
        redemptionVaultWithMorpho,
        mTBILLAmount,
      );

      // Perform redemption: 1000 mTBILL @ 1:1 rate, 1% fee = 990 USDC needed
      // Vault has 500 USDC, so shortfall = 490 USDC from Morpho
      const result = await redeemInstantWithMorphoTest(
        {
          redemptionVault: redemptionVaultWithMorpho,
          owner,
          mTBILL,
          mTokenToUsdDataFeed,
          usdc,
          morphoVault,
        },
        mTBILLAmount,
        { from: testUser },
      );

      // Verify user received USDC
      expect(result?.userUSDCReceived).to.equal(parseUnits('990', 6));

      // Verify shares were used (for the shortfall portion)
      expect(result?.sharesUsed).to.be.gt(0);

      // Verify some vault USDC was also used
      expect(result?.usdcUsed).to.be.gt(0);

      // Verify mTBILL was burned from user
      expect(await mTBILL.balanceOf(testUser.address)).to.equal(0);
    });
  });

  describe('Error Cases', function () {
    it('should revert when vault has insufficient shares', async function () {
      const {
        owner,
        testUser,
        mTBILL,
        redemptionVaultWithMorpho,
        usdc,
        morphoVault,
        mTokenToUsdDataFeed,
      } = await loadFixture(morphoRedemptionFixture);

      const mTBILLAmount = 100000; // 100k mTBILL - vault has no USDC and no shares

      // Mint mTBILL
      await mintToken(mTBILL, testUser, mTBILLAmount);

      // Approve
      await approveBase18(
        testUser,
        mTBILL,
        redemptionVaultWithMorpho,
        mTBILLAmount,
      );

      // Should revert because vault has no USDC and no Morpho shares
      await redeemInstantWithMorphoTest(
        {
          redemptionVault: redemptionVaultWithMorpho,
          owner,
          mTBILL,
          mTokenToUsdDataFeed,
          usdc,
          morphoVault,
        },
        mTBILLAmount,
        {
          from: testUser,
          revertMessage: 'RVM: insufficient shares',
        },
      );
    });

    it('should revert when trying to redeem a token not matching vault asset', async function () {
      const {
        owner,
        testUser,
        mTBILL,
        redemptionVaultWithMorpho,
        morphoVault,
        mTokenToUsdDataFeed,
      } = await loadFixture(morphoRedemptionFixture);

      // Deploy a fake token that isn't the Morpho vault's underlying asset
      const fakeTokenFactory = await ethers.getContractFactory('ERC20Mock');
      const fakeToken = await fakeTokenFactory.deploy(6);
      await fakeToken.deployed();

      // Add the fake token as a payment token on our vault
      await redemptionVaultWithMorpho
        .connect(owner)
        .addPaymentToken(
          fakeToken.address,
          mTokenToUsdDataFeed.address,
          0,
          constants.MaxUint256,
          true,
        );

      const mTBILLAmount = 1000;

      // Mint mTBILL to user
      await mintToken(mTBILL, testUser, mTBILLAmount);

      // Approve vault
      await approveBase18(
        testUser,
        mTBILL,
        redemptionVaultWithMorpho,
        mTBILLAmount,
      );

      // Should revert because fakeToken is not the Morpho vault's asset
      // The vault has no fakeToken balance, so it tries Morpho withdrawal
      // which fails with "RVM: token not vault asset"
      await redeemInstantWithMorphoTest(
        {
          redemptionVault: redemptionVaultWithMorpho,
          owner,
          mTBILL,
          mTokenToUsdDataFeed,
          usdc: fakeToken,
          morphoVault,
        },
        mTBILLAmount,
        {
          from: testUser,
          revertMessage: 'RVM: token not vault asset',
        },
      );
    });
  });
});
