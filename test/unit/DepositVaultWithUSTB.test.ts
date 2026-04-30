import { loadFixture } from '@nomicfoundation/hardhat-network-helpers';
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { expect } from 'chai';
import { constants } from 'ethers';

import { depositVaultSuits } from './suits/deposit-vault.suits';

import { DepositVaultWithUSTBTest__factory } from '../../typechain-types';
import { acErrors } from '../common/ac.helpers';
import { approveBase18, mintToken } from '../common/common.helpers';
import {
  depositInstantWithUstbTest,
  setMockUstbStablecoinConfig,
  setUstbDepositsEnabledTest,
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
  },
  async (defaultDeploy) => {
    describe('DepositVaultWithUSTB', function () {
      describe('initialization', () => {
        it('should fail: cal; initialize() when already initialized', async () => {
          const { depositVaultWithUSTB } = await loadFixture(defaultDeploy);

          await expect(
            depositVaultWithUSTB[
              'initialize((address,address,uint256,uint256,address,address,address,address,uint256),(uint64,uint64,uint64,(uint256,uint256)[]),uint256,uint256,address)'
            ](
              {
                ac: constants.AddressZero,
                sanctionsList: constants.AddressZero,
                variationTolerance: 1,
                minAmount: 0,
                mToken: constants.AddressZero,
                mTokenDataFeed: constants.AddressZero,
                feeReceiver: constants.AddressZero,
                tokensReceiver: constants.AddressZero,
                instantFee: 0,
              },
              {
                minInstantFee: 0,
                maxInstantFee: 0,
                limitConfigs: [],
                maxInstantShare: 100_00,
              },
              0,
              0,
              constants.AddressZero,
            ),
          ).revertedWith('Initializable: contract is already initialized');
        });
      });

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
