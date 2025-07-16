import { loadFixture } from '@nomicfoundation/hardhat-network-helpers';
import { BigNumber, constants } from 'ethers';
import { parseUnits } from 'ethers/lib/utils';

import { ustbRedemptionVaultFixture } from './fixtures/ustb.fixture';

import { approveBase18 } from '../common/common.helpers';
import {
  depositInstantWithUstbTest,
  setMockUstbStablecoinConfig,
  setUstbDepositsEnabledTest,
} from '../common/deposit-vault-ustb.helpers';

describe('DepositVaultWithUSTB - Mainnet Fork Integration Tests', function () {
  this.timeout(120000);

  describe('Scenario 1: USTB deposits are enabled and stablecoin config exists', function () {
    it('should invest USDC into USTB', async function () {
      const {
        owner,
        vaultAdmin,
        testUser,
        mTBILL,
        depositVaultWithUSTB,
        usdc,
        ustbToken,
        usdcWhale,
        mTokenToUsdDataFeed,
      } = await loadFixture(ustbRedemptionVaultFixture);

      const usdcAmount = 100;

      await setUstbDepositsEnabledTest({ depositVaultWithUSTB, owner }, true, {
        from: vaultAdmin,
      });

      // Fund vault with USDC
      await usdc
        .connect(usdcWhale)
        .transfer(testUser.address, parseUnits('100', 6));

      // Approve vault
      await approveBase18(testUser, usdc, depositVaultWithUSTB, usdcAmount);

      // Perform deposit
      await depositInstantWithUstbTest(
        {
          depositVaultWithUSTB,
          owner,
          mTBILL,
          mTokenToUsdDataFeed,
          ustbToken,
          expectedUstbDeposited: true,
          expectedUstbMinted: BigNumber.from(9264844),
        },
        usdc,
        usdcAmount,
        { from: testUser },
      );
    });
  });

  describe('Scenario 2: USTB does not support stablecoin', function () {
    it('should not deposit in USTB if USTB does not support stablecoin', async function () {
      const {
        owner,
        vaultAdmin,
        testUser,
        mTBILL,
        depositVaultWithUSTB,
        usdc,
        ustbToken,
        ustbTokenOwner,
        usdcWhale,
        mTokenToUsdDataFeed,
      } = await loadFixture(ustbRedemptionVaultFixture);

      const usdcAmount = 100;

      await setUstbDepositsEnabledTest({ depositVaultWithUSTB, owner }, true, {
        from: vaultAdmin,
      });

      // Fund vault with USDC
      await usdc
        .connect(usdcWhale)
        .transfer(testUser.address, parseUnits('100', 6));

      // Approve vault
      await approveBase18(testUser, usdc, depositVaultWithUSTB, usdcAmount);

      await setMockUstbStablecoinConfig(
        { ustbToken },
        usdc,
        {
          sweepDestination: constants.AddressZero,
          fee: 0,
        },
        {
          from: ustbTokenOwner,
        },
      );

      // Perform deposit
      await depositInstantWithUstbTest(
        {
          depositVaultWithUSTB,
          owner,
          mTBILL,
          mTokenToUsdDataFeed,
          ustbToken,
          expectedUstbDeposited: false,
        },
        usdc,
        usdcAmount,
        { from: testUser },
      );
    });
  });
});
