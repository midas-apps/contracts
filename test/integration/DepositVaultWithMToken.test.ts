import { loadFixture } from '@nomicfoundation/hardhat-network-helpers';

import { mTokenDepositFixture } from './fixtures/mtoken.fixture';
import {
  assertAutoInvestDisabled,
  assertAutoInvestEnabled,
  depositInstantMToken,
} from './helpers/deposit.helpers';

describe('DepositVaultWithMToken - Mainnet Fork Integration Tests', function () {
  this.timeout(300000);

  describe('Scenario 1: Auto-invest enabled', function () {
    it('should deposit USDC into target DV and send mTBILL to tokensReceiver', async function () {
      const {
        vaultAdmin,
        testUser,
        tokensReceiver,
        mFONE,
        mTBILL,
        depositVaultWithMToken,
        usdc,
        usdcWhale,
      } = await loadFixture(mTokenDepositFixture);

      await depositVaultWithMToken
        .connect(vaultAdmin)
        .setMTokenDepositsEnabled(true);

      const result = await depositInstantMToken({
        depositVault: depositVaultWithMToken,
        user: testUser,
        usdc,
        targetMToken: mTBILL,
        mToken: mFONE,
        tokensReceiverAddress: tokensReceiver.address,
        usdcWhale,
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
        mFONE,
        mTBILL,
        depositVaultWithMToken,
        usdc,
        usdcWhale,
      } = await loadFixture(mTokenDepositFixture);

      const result = await depositInstantMToken({
        depositVault: depositVaultWithMToken,
        user: testUser,
        usdc,
        targetMToken: mTBILL,
        mToken: mFONE,
        tokensReceiverAddress: tokensReceiver.address,
        usdcWhale,
        amountUsd: 100,
      });

      assertAutoInvestDisabled(result);
    });
  });

  describe('Scenario 3: Toggle mid-flight', function () {
    it('should switch between mTBILL and USDC delivery when toggled', async function () {
      const {
        vaultAdmin,
        testUser,
        tokensReceiver,
        mFONE,
        mTBILL,
        depositVaultWithMToken,
        usdc,
        usdcWhale,
      } = await loadFixture(mTokenDepositFixture);

      await depositVaultWithMToken
        .connect(vaultAdmin)
        .setMTokenDepositsEnabled(true);

      const result1 = await depositInstantMToken({
        depositVault: depositVaultWithMToken,
        user: testUser,
        usdc,
        targetMToken: mTBILL,
        mToken: mFONE,
        tokensReceiverAddress: tokensReceiver.address,
        usdcWhale,
        amountUsd: 100,
      });

      assertAutoInvestEnabled(result1);

      await depositVaultWithMToken
        .connect(vaultAdmin)
        .setMTokenDepositsEnabled(false);

      const result2 = await depositInstantMToken({
        depositVault: depositVaultWithMToken,
        user: testUser,
        usdc,
        targetMToken: mTBILL,
        mToken: mFONE,
        tokensReceiverAddress: tokensReceiver.address,
        usdcWhale,
        amountUsd: 100,
      });

      assertAutoInvestDisabled(result2);
    });
  });
});
