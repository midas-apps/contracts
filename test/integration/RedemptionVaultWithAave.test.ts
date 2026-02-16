import { loadFixture } from '@nomicfoundation/hardhat-network-helpers';
import { expect } from 'chai';
import { constants } from 'ethers';
import { parseUnits } from 'ethers/lib/utils';

import { aaveRedemptionVaultFixture } from './fixtures/aave.fixture';

import { mintToken, approveBase18 } from '../common/common.helpers';
import { redeemInstantWithAaveTest } from '../common/redemption-vault-aave.helpers';

describe('RedemptionVaultWithAave - Mainnet Fork Integration Tests', function () {
  this.timeout(300000);

  describe('Scenario 1: Vault has sufficient USDC', function () {
    it('should redeem mTBILL for USDC directly without Aave withdrawal', async function () {
      const {
        owner,
        testUser,
        mTBILL,
        redemptionVaultWithAave,
        usdc,
        aUsdc,
        usdcWhale,
        mTokenToUsdDataFeed,
      } = await loadFixture(aaveRedemptionVaultFixture);

      const mTBILLAmount = 1000;

      // Fund vault with USDC
      await usdc
        .connect(usdcWhale)
        .transfer(redemptionVaultWithAave.address, parseUnits('10000', 6));

      // Mint mTBILL to user
      await mintToken(mTBILL, testUser, mTBILLAmount);

      // Approve vault
      await approveBase18(
        testUser,
        mTBILL,
        redemptionVaultWithAave,
        mTBILLAmount,
      );

      // Get balances before
      const vaultUSDCBefore = await usdc.balanceOf(
        redemptionVaultWithAave.address,
      );

      // Perform redemption
      const result = await redeemInstantWithAaveTest(
        {
          redemptionVault: redemptionVaultWithAave,
          owner,
          mTBILL,
          mTokenToUsdDataFeed,
          usdc,
          aToken: aUsdc,
          expectedATokenUsed: parseUnits('0', 6),
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

  describe('Scenario 2: Vault uses Aave for liquidity', function () {
    it('should withdraw from Aave when vault has no direct USDC', async function () {
      const {
        owner,
        testUser,
        mTBILL,
        redemptionVaultWithAave,
        usdc,
        aUsdc,
        aUsdcWhale,
        mTokenToUsdDataFeed,
      } = await loadFixture(aaveRedemptionVaultFixture);

      const mTBILLAmount = 1000;

      // Fund vault with aUSDC only (no direct USDC)
      await aUsdc
        .connect(aUsdcWhale)
        .transfer(redemptionVaultWithAave.address, parseUnits('10000', 6));

      // Verify vault has no direct USDC
      expect(await usdc.balanceOf(redemptionVaultWithAave.address)).to.equal(0);

      // Verify vault has aTokens
      expect(await aUsdc.balanceOf(redemptionVaultWithAave.address)).to.be.gte(
        parseUnits('10000', 6),
      );

      // Mint mTBILL to user
      await mintToken(mTBILL, testUser, mTBILLAmount);

      // Approve vault
      await approveBase18(
        testUser,
        mTBILL,
        redemptionVaultWithAave,
        mTBILLAmount,
      );

      // Perform redemption
      const result = await redeemInstantWithAaveTest(
        {
          redemptionVault: redemptionVaultWithAave,
          owner,
          mTBILL,
          mTokenToUsdDataFeed,
          usdc,
          aToken: aUsdc,
        },
        mTBILLAmount,
        { from: testUser },
      );

      // Check that aTokens were used
      expect(result?.aTokenUsed).to.be.gt(0);

      // Verify user received USDC
      expect(result?.userUSDCReceived).to.equal(parseUnits('990', 6));

      // Verify mTBILL was burned from user
      expect(await mTBILL.balanceOf(testUser.address)).to.equal(0);
    });
  });

  describe('Scenario 3: Partial Aave withdrawal', function () {
    it('should only withdraw shortfall from Aave when vault has partial USDC', async function () {
      const {
        owner,
        testUser,
        mTBILL,
        redemptionVaultWithAave,
        usdc,
        aUsdc,
        usdcWhale,
        aUsdcWhale,
        mTokenToUsdDataFeed,
      } = await loadFixture(aaveRedemptionVaultFixture);

      const mTBILLAmount = 1000;
      const partialUSDC = parseUnits('500', 6); // 500 USDC in vault

      // Fund vault with partial USDC
      await usdc
        .connect(usdcWhale)
        .transfer(redemptionVaultWithAave.address, partialUSDC);

      // Fund vault with aUSDC for the rest
      await aUsdc
        .connect(aUsdcWhale)
        .transfer(redemptionVaultWithAave.address, parseUnits('10000', 6));

      // Mint mTBILL to user
      await mintToken(mTBILL, testUser, mTBILLAmount);

      // Approve vault
      await approveBase18(
        testUser,
        mTBILL,
        redemptionVaultWithAave,
        mTBILLAmount,
      );

      // Perform redemption: 1000 mTBILL @ 1:1 rate, 1% fee = 990 USDC needed
      // Vault has 500 USDC, so shortfall = 490 USDC from Aave
      const result = await redeemInstantWithAaveTest(
        {
          redemptionVault: redemptionVaultWithAave,
          owner,
          mTBILL,
          mTokenToUsdDataFeed,
          usdc,
          aToken: aUsdc,
        },
        mTBILLAmount,
        { from: testUser },
      );

      // Verify user received USDC
      expect(result?.userUSDCReceived).to.equal(parseUnits('990', 6));

      // Verify aToken decrease equals the shortfall (990 - 500 = 490)
      const expectedShortfall = parseUnits('490', 6);
      expect(result?.aTokenUsed).to.be.closeTo(
        expectedShortfall,
        parseUnits('1', 6), // 1 USDC tolerance for Aave interest accrual
      );

      // Verify some vault USDC was also used
      expect(result?.usdcUsed).to.be.gt(0);

      // Verify mTBILL was burned from user
      expect(await mTBILL.balanceOf(testUser.address)).to.equal(0);
    });
  });

  describe('Error Cases', function () {
    it('should revert when vault has insufficient aToken balance', async function () {
      const {
        owner,
        testUser,
        mTBILL,
        redemptionVaultWithAave,
        usdc,
        aUsdc,
        mTokenToUsdDataFeed,
      } = await loadFixture(aaveRedemptionVaultFixture);

      const mTBILLAmount = 100000; // 100k mTBILL - vault has no USDC and no aTokens

      // Mint mTBILL
      await mintToken(mTBILL, testUser, mTBILLAmount);

      // Approve
      await approveBase18(
        testUser,
        mTBILL,
        redemptionVaultWithAave,
        mTBILLAmount,
      );

      // Should revert because vault has no USDC and no aTokens
      await redeemInstantWithAaveTest(
        {
          redemptionVault: redemptionVaultWithAave,
          owner,
          mTBILL,
          mTokenToUsdDataFeed,
          usdc,
          aToken: aUsdc,
        },
        mTBILLAmount,
        {
          from: testUser,
          revertMessage: 'RVA: insufficient aToken balance',
        },
      );
    });

    it('should revert when trying to redeem a token not in Aave pool', async function () {
      const {
        owner,
        testUser,
        mTBILL,
        redemptionVaultWithAave,
        aUsdc,
        mTokenToUsdDataFeed,
      } = await loadFixture(aaveRedemptionVaultFixture);

      // Deploy a fake token that isn't registered in Aave
      const fakeTokenFactory = await (
        await import('hardhat')
      ).ethers.getContractFactory('ERC20Mock');
      const fakeToken = await fakeTokenFactory.deploy(6);
      await fakeToken.deployed();

      // Add the fake token as a payment token on our vault
      await redemptionVaultWithAave
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
        redemptionVaultWithAave,
        mTBILLAmount,
      );

      // Should revert because fakeToken is not in Aave pool
      // The vault has no fakeToken balance, so it tries Aave withdrawal
      // Aave's getReserveAToken returns address(0)
      await redeemInstantWithAaveTest(
        {
          redemptionVault: redemptionVaultWithAave,
          owner,
          mTBILL,
          mTokenToUsdDataFeed,
          usdc: fakeToken,
          aToken: aUsdc,
        },
        mTBILLAmount,
        {
          from: testUser,
          revertMessage: 'RVA: token not in Aave pool',
        },
      );
    });
  });
});
