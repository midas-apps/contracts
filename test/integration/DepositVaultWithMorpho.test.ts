import { loadFixture } from '@nomicfoundation/hardhat-network-helpers';
import { expect } from 'chai';
import { constants } from 'ethers';
import { parseUnits } from 'ethers/lib/utils';

import { morphoDepositFixture } from './fixtures/morpho.fixture';
import {
  assertAutoInvestDisabled,
  assertAutoInvestEnabled,
  depositInstantMorpho,
} from './helpers/deposit.helpers';

import { approveBase18 } from '../common/common.helpers';

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
        usdc,
        morphoVault,
        mToken: mTBILL,
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
        mTBILL,
        depositVaultWithMorpho,
        usdc,
        morphoVault,
        usdcWhale,
      } = await loadFixture(morphoDepositFixture);

      const result = await depositInstantMorpho({
        depositVault: depositVaultWithMorpho,
        user: testUser,
        usdc,
        morphoVault,
        mToken: mTBILL,
        tokensReceiverAddress: tokensReceiver.address,
        usdcWhale,
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
        usdc,
        morphoVault,
        mToken: mTBILL,
        tokensReceiverAddress: tokensReceiver.address,
        usdcWhale,
        amountUsd: 100,
      });

      assertAutoInvestEnabled(result1);

      await depositVaultWithMorpho
        .connect(vaultAdmin)
        .setMorphoDepositsEnabled(false);

      const result2 = await depositInstantMorpho({
        depositVault: depositVaultWithMorpho,
        user: testUser,
        usdc,
        morphoVault,
        mToken: mTBILL,
        tokensReceiverAddress: tokensReceiver.address,
        usdcWhale,
        amountUsd: 100,
      });

      assertAutoInvestDisabled(result2);
    });
  });

  describe('Error case: No vault configured for token', function () {
    it('should revert with DVM: no vault for token', async function () {
      const { vaultAdmin, testUser, depositVaultWithMorpho, usdc, usdcWhale } =
        await loadFixture(morphoDepositFixture);

      await depositVaultWithMorpho
        .connect(vaultAdmin)
        .setMorphoDepositsEnabled(true);

      await depositVaultWithMorpho
        .connect(vaultAdmin)
        .removeMorphoVault(usdc.address);

      const usdcAmountUsd = 100;

      await usdc
        .connect(usdcWhale)
        .transfer(testUser.address, parseUnits('100', 6));

      await approveBase18(
        testUser,
        usdc,
        depositVaultWithMorpho,
        usdcAmountUsd,
      );

      await expect(
        depositVaultWithMorpho
          .connect(testUser)
          ['depositInstant(address,uint256,uint256,bytes32)'](
            usdc.address,
            parseUnits(String(usdcAmountUsd)),
            constants.Zero,
            constants.HashZero,
          ),
      ).to.be.revertedWith('DVM: no vault for token');
    });
  });
});
