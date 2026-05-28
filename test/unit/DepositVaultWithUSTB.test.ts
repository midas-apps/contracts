import { loadFixture } from '@nomicfoundation/hardhat-network-helpers';
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { expect } from 'chai';

import { depositVaultSuits } from './suits/deposit-vault.suits';

import {
  DepositVaultWithUSTB__factory,
  DepositVaultWithUSTBTest__factory,
} from '../../typechain-types';
import { acErrors } from '../common/ac.helpers';
import {
  approveBase18,
  mintToken,
  validateImplementation,
} from '../common/common.helpers';
import {
  setMockUstbStablecoinConfig,
  setUstbDepositsEnabledTest,
  depositInstantWithUstbTest,
} from '../common/deposit-vault-ustb.helpers';
import { defaultDeploy } from '../common/fixtures';
import {
  addPaymentTokenTest,
  setMinAmountTest,
} from '../common/manageable-vault.helpers';

depositVaultSuits(
  'DepositVaultWithUSTB',
  defaultDeploy,
  {
    createNew: async (owner: SignerWithAddress) =>
      new DepositVaultWithUSTBTest__factory(owner).deploy(),
    key: 'depositVaultWithUSTB',
  },
  async (fixture) => {
    const { depositVaultWithUSTB, ustbToken } = fixture;
    expect(await depositVaultWithUSTB.ustb()).eq(ustbToken.address);
    await validateImplementation(DepositVaultWithUSTB__factory);
  },
  async (defaultDeploy) => {
    describe('DepositVaultWithUSTB', function () {
      describe('depositInstant()', async () => {
        it('should fail: when ustbDepositsEnabled is true and payment token is not set in USTB contract', async () => {
          const {
            owner,
            depositVaultWithUSTB,
            stableCoins,
            mTBILL,
            mTokenToUsdDataFeed,
            regularAccounts,
            dataFeed,
            ustbToken,
          } = await loadFixture(defaultDeploy);

          await setUstbDepositsEnabledTest(
            {
              depositVaultWithUSTB,
              owner,
            },
            true,
          );

          await mintToken(stableCoins.usdc, regularAccounts[0], 100);
          await approveBase18(
            regularAccounts[0],
            stableCoins.usdc,
            depositVaultWithUSTB,
            100,
          );
          await addPaymentTokenTest(
            { vault: depositVaultWithUSTB, owner },
            stableCoins.usdc,
            dataFeed.address,
            0,
            true,
          );
          await setMinAmountTest({ vault: depositVaultWithUSTB, owner }, 10);

          await depositInstantWithUstbTest(
            {
              depositVaultWithUSTB,
              owner,
              mTBILL,
              mTokenToUsdDataFeed,
              ustbToken,
              expectedUstbDeposited: false,
            },
            stableCoins.usdc,
            100,
            {
              from: regularAccounts[0],
              revertCustomError: {
                customErrorName: 'UnsupportedUSTBToken',
              },
            },
          );
        });

        it('should fail: when ustbDepositsEnabled is true and payment token is set in USTB contract but fee is not 0', async () => {
          const {
            owner,
            depositVaultWithUSTB,
            stableCoins,
            mTBILL,
            mTokenToUsdDataFeed,
            regularAccounts,
            dataFeed,
            ustbToken,
          } = await loadFixture(defaultDeploy);

          await setUstbDepositsEnabledTest(
            {
              depositVaultWithUSTB,
              owner,
            },
            true,
          );

          await setMockUstbStablecoinConfig({ ustbToken }, stableCoins.usdc, {
            fee: 100,
            sweepDestination: ustbToken.address,
          });

          await mintToken(stableCoins.usdc, regularAccounts[0], 100);
          await approveBase18(
            regularAccounts[0],
            stableCoins.usdc,
            depositVaultWithUSTB,
            100,
          );
          await addPaymentTokenTest(
            { vault: depositVaultWithUSTB, owner },
            stableCoins.usdc,
            dataFeed.address,
            0,
            true,
          );
          await setMinAmountTest({ vault: depositVaultWithUSTB, owner }, 10);

          await depositInstantWithUstbTest(
            {
              depositVaultWithUSTB,
              owner,
              mTBILL,
              mTokenToUsdDataFeed,
              ustbToken,
              expectedUstbDeposited: false,
            },
            stableCoins.usdc,
            100,
            {
              from: regularAccounts[0],
              revertCustomError: {
                customErrorName: 'USTBFeeNotZero',
              },
            },
          );
        });

        it('deposit 100 USDC when ustbDepositsEnabled is true', async () => {
          const {
            owner,
            depositVaultWithUSTB,
            stableCoins,
            mTBILL,
            mTokenToUsdDataFeed,
            regularAccounts,
            dataFeed,
            ustbToken,
          } = await loadFixture(defaultDeploy);

          await setUstbDepositsEnabledTest(
            {
              depositVaultWithUSTB,
              owner,
            },
            true,
          );
          await setMockUstbStablecoinConfig({ ustbToken }, stableCoins.usdc);

          await mintToken(stableCoins.usdc, regularAccounts[0], 100);
          await approveBase18(
            regularAccounts[0],
            stableCoins.usdc,
            depositVaultWithUSTB,
            100,
          );
          await addPaymentTokenTest(
            { vault: depositVaultWithUSTB, owner },
            stableCoins.usdc,
            dataFeed.address,
            0,
            true,
          );
          await setMinAmountTest({ vault: depositVaultWithUSTB, owner }, 10);

          await depositInstantWithUstbTest(
            {
              depositVaultWithUSTB,
              owner,
              mTBILL,
              mTokenToUsdDataFeed,
              ustbToken,
            },
            stableCoins.usdc,
            100,
            {
              from: regularAccounts[0],
            },
          );
        });

        it('when ustbDepositsEnabled is false and payment token is not set in USTB contract', async () => {
          const {
            owner,
            depositVaultWithUSTB,
            stableCoins,
            mTBILL,
            mTokenToUsdDataFeed,
            regularAccounts,
            dataFeed,
            ustbToken,
          } = await loadFixture(defaultDeploy);

          await mintToken(stableCoins.usdc, regularAccounts[0], 100);
          await approveBase18(
            regularAccounts[0],
            stableCoins.usdc,
            depositVaultWithUSTB,
            100,
          );
          await addPaymentTokenTest(
            { vault: depositVaultWithUSTB, owner },
            stableCoins.usdc,
            dataFeed.address,
            0,
            true,
          );
          await setMinAmountTest({ vault: depositVaultWithUSTB, owner }, 10);

          await depositInstantWithUstbTest(
            {
              depositVaultWithUSTB,
              owner,
              mTBILL,
              mTokenToUsdDataFeed,
              ustbToken,
            },
            stableCoins.usdc,
            100,
            {
              from: regularAccounts[0],
            },
          );
        });
      });

      describe('setUstbDepositsEnabled', () => {
        it('should fail: call from address without vault admin role', async () => {
          const { depositVaultWithUSTB, owner, regularAccounts } =
            await loadFixture(defaultDeploy);
          await setUstbDepositsEnabledTest(
            { depositVaultWithUSTB, owner },
            true,
            {
              from: regularAccounts[0],
              revertCustomError: acErrors.WMAC_HASNT_PERMISSION(),
            },
          );
        });

        it('call from address with vault admin role', async () => {
          const { depositVaultWithUSTB, owner } = await loadFixture(
            defaultDeploy,
          );
          await setUstbDepositsEnabledTest(
            { depositVaultWithUSTB, owner },
            true,
          );
        });

        it('set true when ustbDepositsEnabled is already true', async () => {
          const { depositVaultWithUSTB, owner } = await loadFixture(
            defaultDeploy,
          );
          await setUstbDepositsEnabledTest(
            { depositVaultWithUSTB, owner },
            true,
          );
          await setUstbDepositsEnabledTest(
            { depositVaultWithUSTB, owner },
            true,
          );
        });

        it('set false when ustbDepositsEnabled is already false', async () => {
          const { depositVaultWithUSTB, owner } = await loadFixture(
            defaultDeploy,
          );
          await setUstbDepositsEnabledTest(
            { depositVaultWithUSTB, owner },
            false,
          );
        });
      });
    });
  },
);
