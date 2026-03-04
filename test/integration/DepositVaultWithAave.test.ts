import { loadFixture } from '@nomicfoundation/hardhat-network-helpers';

import { aaveDepositFixture } from './fixtures/aave.fixture';
import {
  assertAutoInvestDisabled,
  assertAutoInvestEnabled,
  depositInstantAave,
} from './helpers/deposit.helpers';

describe('DepositVaultWithAave - Mainnet Fork Integration Tests', function () {
  this.timeout(300000);

  describe('Scenario 1: Auto-invest enabled', function () {
    it('should supply USDC into Aave and send aTokens to tokensReceiver', async function () {
      const {
        vaultAdmin,
        testUser,
        tokensReceiver,
        mTBILL,
        depositVaultWithAave,
        usdc,
        aUsdc,
        usdcWhale,
      } = await loadFixture(aaveDepositFixture);

      await depositVaultWithAave
        .connect(vaultAdmin)
        .setAaveDepositsEnabled(true);

      const result = await depositInstantAave({
        depositVault: depositVaultWithAave,
        user: testUser,
        tokenIn: usdc,
        receiptToken: aUsdc,
        mToken: mTBILL,
        tokensReceiverAddress: tokensReceiver.address,
        tokenWhale: usdcWhale,
        amountUsd: 100,
      });

      assertAutoInvestEnabled(result);
    });
  });

  describe('Scenario 2: Auto-invest disabled', function () {
    it('should send USDC directly to tokensReceiver', async function () {
      const {
        testUser,
        tokensReceiver,
        mTBILL,
        depositVaultWithAave,
        usdc,
        aUsdc,
        usdcWhale,
      } = await loadFixture(aaveDepositFixture);

      const result = await depositInstantAave({
        depositVault: depositVaultWithAave,
        user: testUser,
        tokenIn: usdc,
        receiptToken: aUsdc,
        mToken: mTBILL,
        tokensReceiverAddress: tokensReceiver.address,
        tokenWhale: usdcWhale,
        amountUsd: 100,
      });

      assertAutoInvestDisabled(result);
    });
  });

  describe('Scenario 3: Toggle mid-flight', function () {
    it('should switch between aToken and USDC delivery when toggled', async function () {
      const {
        vaultAdmin,
        testUser,
        tokensReceiver,
        mTBILL,
        depositVaultWithAave,
        usdc,
        aUsdc,
        usdcWhale,
      } = await loadFixture(aaveDepositFixture);

      await depositVaultWithAave
        .connect(vaultAdmin)
        .setAaveDepositsEnabled(true);

      const result1 = await depositInstantAave({
        depositVault: depositVaultWithAave,
        user: testUser,
        tokenIn: usdc,
        receiptToken: aUsdc,
        mToken: mTBILL,
        tokensReceiverAddress: tokensReceiver.address,
        tokenWhale: usdcWhale,
        amountUsd: 100,
      });

      assertAutoInvestEnabled(result1);

      await depositVaultWithAave
        .connect(vaultAdmin)
        .setAaveDepositsEnabled(false);

      const result2 = await depositInstantAave({
        depositVault: depositVaultWithAave,
        user: testUser,
        tokenIn: usdc,
        receiptToken: aUsdc,
        mToken: mTBILL,
        tokensReceiverAddress: tokensReceiver.address,
        tokenWhale: usdcWhale,
        amountUsd: 100,
      });

      assertAutoInvestDisabled(result2);
    });
  });

  describe('Multi-token: USDT with auto-invest', function () {
    it('should supply USDT into Aave and send aUSDT to tokensReceiver', async function () {
      const {
        vaultAdmin,
        testUser,
        tokensReceiver,
        mTBILL,
        depositVaultWithAave,
        usdt,
        aUsdt,
        usdtWhale,
      } = await loadFixture(aaveDepositFixture);

      await depositVaultWithAave
        .connect(vaultAdmin)
        .setAaveDepositsEnabled(true);

      const result = await depositInstantAave({
        depositVault: depositVaultWithAave,
        user: testUser,
        tokenIn: usdt,
        receiptToken: aUsdt,
        mToken: mTBILL,
        tokensReceiverAddress: tokensReceiver.address,
        tokenWhale: usdtWhale,
        amountUsd: 100,
      });

      assertAutoInvestEnabled(result);
    });

    it('should handle USDC and USDT deposits sequentially', async function () {
      const {
        vaultAdmin,
        testUser,
        tokensReceiver,
        mTBILL,
        depositVaultWithAave,
        usdc,
        aUsdc,
        usdcWhale,
        usdt,
        aUsdt,
        usdtWhale,
      } = await loadFixture(aaveDepositFixture);

      await depositVaultWithAave
        .connect(vaultAdmin)
        .setAaveDepositsEnabled(true);

      const result1 = await depositInstantAave({
        depositVault: depositVaultWithAave,
        user: testUser,
        tokenIn: usdc,
        receiptToken: aUsdc,
        mToken: mTBILL,
        tokensReceiverAddress: tokensReceiver.address,
        tokenWhale: usdcWhale,
        amountUsd: 100,
      });

      assertAutoInvestEnabled(result1);

      const result2 = await depositInstantAave({
        depositVault: depositVaultWithAave,
        user: testUser,
        tokenIn: usdt,
        receiptToken: aUsdt,
        mToken: mTBILL,
        tokensReceiverAddress: tokensReceiver.address,
        tokenWhale: usdtWhale,
        amountUsd: 100,
      });

      assertAutoInvestEnabled(result2);
    });
  });
});
