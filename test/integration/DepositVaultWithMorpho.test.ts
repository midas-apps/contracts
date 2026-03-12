import { loadFixture } from '@nomicfoundation/hardhat-network-helpers';

import { morphoDepositFixture } from './fixtures/morpho.fixture';
import {
  assertAutoInvestDisabled,
  assertAutoInvestEnabled,
  depositInstantMorpho,
} from './helpers/deposit.helpers';

describe('DepositVaultWithMorpho - Mainnet Fork Integration Tests', function () {
  this.timeout(300000);

  describe('Scenario 1: Auto-invest enabled', function () {
    it('should deposit USDC into Morpho vault and send shares to tokensReceiver', async function () {
      const {
        vaultAdmin,
        testUser,
        tokensReceiver,
        mTBILL,
        depositVaultWithMorpho,
        usdc,
        morphoVault,
        usdcWhale,
      } = await loadFixture(morphoDepositFixture);

      await depositVaultWithMorpho
        .connect(vaultAdmin)
        .setMorphoDepositsEnabled(true);

      const result = await depositInstantMorpho({
        depositVault: depositVaultWithMorpho,
        user: testUser,
        tokenIn: usdc,
        receiptToken: morphoVault,
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
        depositVaultWithMorpho,
        usdc,
        morphoVault,
        usdcWhale,
      } = await loadFixture(morphoDepositFixture);

      const result = await depositInstantMorpho({
        depositVault: depositVaultWithMorpho,
        user: testUser,
        tokenIn: usdc,
        receiptToken: morphoVault,
        mToken: mTBILL,
        tokensReceiverAddress: tokensReceiver.address,
        tokenWhale: usdcWhale,
        amountUsd: 100,
      });

      assertAutoInvestDisabled(result);
    });
  });

  describe('Scenario 3: Toggle mid-flight', function () {
    it('should switch between Morpho shares and USDC delivery when toggled', async function () {
      const {
        vaultAdmin,
        testUser,
        tokensReceiver,
        mTBILL,
        depositVaultWithMorpho,
        usdc,
        morphoVault,
        usdcWhale,
      } = await loadFixture(morphoDepositFixture);

      await depositVaultWithMorpho
        .connect(vaultAdmin)
        .setMorphoDepositsEnabled(true);

      const result1 = await depositInstantMorpho({
        depositVault: depositVaultWithMorpho,
        user: testUser,
        tokenIn: usdc,
        receiptToken: morphoVault,
        mToken: mTBILL,
        tokensReceiverAddress: tokensReceiver.address,
        tokenWhale: usdcWhale,
        amountUsd: 100,
      });

      assertAutoInvestEnabled(result1);

      await depositVaultWithMorpho
        .connect(vaultAdmin)
        .setMorphoDepositsEnabled(false);

      const result2 = await depositInstantMorpho({
        depositVault: depositVaultWithMorpho,
        user: testUser,
        tokenIn: usdc,
        receiptToken: morphoVault,
        mToken: mTBILL,
        tokensReceiverAddress: tokensReceiver.address,
        tokenWhale: usdcWhale,
        amountUsd: 100,
      });

      assertAutoInvestDisabled(result2);
    });
  });

  describe('Multi-token: USDT with different Morpho vault', function () {
    it('should deposit USDT into Smokehouse USDT vault and send shares to tokensReceiver', async function () {
      const {
        vaultAdmin,
        testUser,
        tokensReceiver,
        mTBILL,
        depositVaultWithMorpho,
        usdt,
        morphoUsdtVault,
        usdtWhale,
      } = await loadFixture(morphoDepositFixture);

      await depositVaultWithMorpho
        .connect(vaultAdmin)
        .setMorphoDepositsEnabled(true);

      const result = await depositInstantMorpho({
        depositVault: depositVaultWithMorpho,
        user: testUser,
        tokenIn: usdt,
        receiptToken: morphoUsdtVault,
        mToken: mTBILL,
        tokensReceiverAddress: tokensReceiver.address,
        tokenWhale: usdtWhale,
        amountUsd: 100,
      });

      assertAutoInvestEnabled(result);
    });

    it('should route USDC to Steakhouse and USDT to Smokehouse', async function () {
      const {
        vaultAdmin,
        testUser,
        tokensReceiver,
        mTBILL,
        depositVaultWithMorpho,
        usdc,
        morphoVault,
        usdcWhale,
        usdt,
        morphoUsdtVault,
        usdtWhale,
      } = await loadFixture(morphoDepositFixture);

      await depositVaultWithMorpho
        .connect(vaultAdmin)
        .setMorphoDepositsEnabled(true);

      const resultUsdc = await depositInstantMorpho({
        depositVault: depositVaultWithMorpho,
        user: testUser,
        tokenIn: usdc,
        receiptToken: morphoVault,
        mToken: mTBILL,
        tokensReceiverAddress: tokensReceiver.address,
        tokenWhale: usdcWhale,
        amountUsd: 100,
      });

      assertAutoInvestEnabled(resultUsdc);

      const resultUsdt = await depositInstantMorpho({
        depositVault: depositVaultWithMorpho,
        user: testUser,
        tokenIn: usdt,
        receiptToken: morphoUsdtVault,
        mToken: mTBILL,
        tokensReceiverAddress: tokensReceiver.address,
        tokenWhale: usdtWhale,
        amountUsd: 100,
      });

      assertAutoInvestEnabled(resultUsdt);
    });
  });

  describe('Fallback: No vault configured for token', function () {
    it('deposit succeeds with raw tokens when no vault configured (fallback to normal flow)', async function () {
      const {
        vaultAdmin,
        testUser,
        tokensReceiver,
        mTBILL,
        depositVaultWithMorpho,
        usdc,
        morphoVault,
        usdcWhale,
      } = await loadFixture(morphoDepositFixture);

      await depositVaultWithMorpho
        .connect(vaultAdmin)
        .setMorphoDepositsEnabled(true);

      await depositVaultWithMorpho
        .connect(vaultAdmin)
        .removeMorphoVault(usdc.address);

      const result = await depositInstantMorpho({
        depositVault: depositVaultWithMorpho,
        user: testUser,
        tokenIn: usdc,
        receiptToken: morphoVault,
        mToken: mTBILL,
        tokensReceiverAddress: tokensReceiver.address,
        tokenWhale: usdcWhale,
        amountUsd: 100,
      });

      assertAutoInvestDisabled(result);
    });
  });
});
