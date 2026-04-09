import { loadFixture } from '@nomicfoundation/hardhat-network-helpers';
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { expect } from 'chai';
import { constants } from 'ethers';
import { ethers } from 'hardhat';

import { depositVaultSuits } from './suits/deposit-vault.suits';

import { DepositVaultWithMTokenTest__factory } from '../../typechain-types';
import { acErrors } from '../common/ac.helpers';
import { approveBase18, mintToken } from '../common/common.helpers';
import {
  depositInstantWithMTokenTest,
  depositRequestWithMTokenTest,
  setAutoInvestFallbackEnabledMTokenTest,
  setMTokenDepositsEnabledTest,
  setMTokenDepositVaultTest,
} from '../common/deposit-vault-mtoken.helpers';
import { defaultDeploy } from '../common/fixtures';
import {
  addPaymentTokenTest,
  addWaivedFeeAccountTest,
  setMinAmountTest,
} from '../common/manageable-vault.helpers';

depositVaultSuits(
  'DepositVaultWithMToken',
  defaultDeploy,
  {
    createNew: async (owner: SignerWithAddress) =>
      new DepositVaultWithMTokenTest__factory(owner).deploy(),
    key: 'depositVaultWithMToken',
  },
  async (fixture) => {
    const { depositVaultWithMToken, depositVault } = fixture;
    expect(await depositVaultWithMToken.mTokenDepositVault()).eq(
      depositVault.address,
    );
    expect(await depositVaultWithMToken.mTokenDepositsEnabled()).eq(false);
  },
  async (defaultDeploy) => {
    describe('DepositVaultWithMToken', function () {
      describe('initialization', () => {
        it('should fail: call initialize() when already initialized', async () => {
          const { depositVaultWithMToken } = await loadFixture(defaultDeploy);

          await expect(
            depositVaultWithMToken[
              'initialize((address,address,uint256,uint256,address,address,address,address,uint256),(uint64,uint64,(uint256,uint256)[]),uint256,uint256,address)'
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
              },
              0,
              0,
              constants.AddressZero,
            ),
          ).revertedWith('Initializable: contract is already initialized');
        });
      });

      describe('setMTokenDepositVault()', () => {
        it('should fail: call from address without DEPOSIT_VAULT_ADMIN_ROLE role', async () => {
          const {
            depositVaultWithMToken,
            owner,
            regularAccounts,
            depositVault,
          } = await loadFixture(defaultDeploy);

          await setMTokenDepositVaultTest(
            { depositVaultWithMToken, owner },
            depositVault.address,
            {
              from: regularAccounts[0],
              revertMessage: acErrors.WMAC_HASNT_PERMISSION,
            },
          );
        });

        it('should fail: zero address', async () => {
          const { depositVaultWithMToken, owner } = await loadFixture(
            defaultDeploy,
          );

          await setMTokenDepositVaultTest(
            { depositVaultWithMToken, owner },
            ethers.constants.AddressZero,
            {
              revertMessage: 'zero address',
            },
          );
        });

        it('should fail: already set to same address', async () => {
          const { depositVaultWithMToken, owner, depositVault } =
            await loadFixture(defaultDeploy);

          await setMTokenDepositVaultTest(
            { depositVaultWithMToken, owner },
            depositVault.address,
            {
              revertMessage: 'DVMT: already set',
            },
          );
        });

        it('call from address with DEPOSIT_VAULT_ADMIN_ROLE role', async () => {
          const { depositVaultWithMToken, owner, regularAccounts } =
            await loadFixture(defaultDeploy);

          await setMTokenDepositVaultTest(
            { depositVaultWithMToken, owner },
            regularAccounts[1].address,
          );
        });
      });

      describe('setMTokenDepositsEnabled()', () => {
        it('should fail: call from address without DEPOSIT_VAULT_ADMIN_ROLE role', async () => {
          const { depositVaultWithMToken, owner, regularAccounts } =
            await loadFixture(defaultDeploy);

          await setMTokenDepositsEnabledTest(
            { depositVaultWithMToken, owner },
            true,
            {
              from: regularAccounts[0],
              revertMessage: acErrors.WMAC_HASNT_PERMISSION,
            },
          );
        });

        it('call from address with DEPOSIT_VAULT_ADMIN_ROLE role', async () => {
          const { depositVaultWithMToken, owner } = await loadFixture(
            defaultDeploy,
          );

          await setMTokenDepositsEnabledTest(
            { depositVaultWithMToken, owner },
            true,
          );
        });

        it('toggle on and off', async () => {
          const { depositVaultWithMToken, owner } = await loadFixture(
            defaultDeploy,
          );

          await setMTokenDepositsEnabledTest(
            { depositVaultWithMToken, owner },
            true,
          );

          await setMTokenDepositsEnabledTest(
            { depositVaultWithMToken, owner },
            false,
          );
        });
      });

      describe('setAutoInvestFallbackEnabled()', () => {
        it('should fail: call from address without DEPOSIT_VAULT_ADMIN_ROLE role', async () => {
          const { depositVaultWithMToken, owner, regularAccounts } =
            await loadFixture(defaultDeploy);

          await setAutoInvestFallbackEnabledMTokenTest(
            { depositVaultWithMToken, owner },
            true,
            {
              from: regularAccounts[0],
              revertMessage: acErrors.WMAC_HASNT_PERMISSION,
            },
          );
        });

        it('call from address with DEPOSIT_VAULT_ADMIN_ROLE role', async () => {
          const { depositVaultWithMToken, owner } = await loadFixture(
            defaultDeploy,
          );

          await setAutoInvestFallbackEnabledMTokenTest(
            { depositVaultWithMToken, owner },
            true,
          );
        });

        it('toggle on and off', async () => {
          const { depositVaultWithMToken, owner } = await loadFixture(
            defaultDeploy,
          );

          await setAutoInvestFallbackEnabledMTokenTest(
            { depositVaultWithMToken, owner },
            true,
          );

          await setAutoInvestFallbackEnabledMTokenTest(
            { depositVaultWithMToken, owner },
            false,
          );
        });
      });

      describe('depositInstant()', async () => {
        it('deposit 100 USDC when mTokenDepositsEnabled is true', async () => {
          const {
            owner,
            depositVaultWithMToken,
            depositVault,
            stableCoins,
            mTBILL,
            mTokenToUsdDataFeed,
            regularAccounts,
            dataFeed,
          } = await loadFixture(defaultDeploy);

          await setMTokenDepositsEnabledTest(
            { depositVaultWithMToken, owner },
            true,
          );

          await mintToken(stableCoins.usdc, regularAccounts[0], 100);
          await approveBase18(
            regularAccounts[0],
            stableCoins.usdc,
            depositVaultWithMToken,
            100,
          );
          await addPaymentTokenTest(
            { vault: depositVaultWithMToken, owner },
            stableCoins.usdc,
            dataFeed.address,
            0,
            true,
          );
          await addPaymentTokenTest(
            { vault: depositVault, owner },
            stableCoins.usdc,
            dataFeed.address,
            0,
            true,
          );
          await setMinAmountTest({ vault: depositVaultWithMToken, owner }, 10);
          await setMinAmountTest({ vault: depositVault, owner }, 0);

          await depositInstantWithMTokenTest(
            {
              depositVaultWithMToken,
              owner,
              mTBILL,
              mTokenToUsdDataFeed,
            },
            stableCoins.usdc,
            100,
            {
              from: regularAccounts[0],
            },
          );
        });

        it('when mTokenDepositsEnabled is false, normal DV flow', async () => {
          const {
            owner,
            depositVaultWithMToken,
            stableCoins,
            mTBILL,
            mTokenToUsdDataFeed,
            regularAccounts,
            dataFeed,
          } = await loadFixture(defaultDeploy);

          await mintToken(stableCoins.usdc, regularAccounts[0], 100);
          await approveBase18(
            regularAccounts[0],
            stableCoins.usdc,
            depositVaultWithMToken,
            100,
          );
          await addPaymentTokenTest(
            { vault: depositVaultWithMToken, owner },
            stableCoins.usdc,
            dataFeed.address,
            0,
            true,
          );
          await setMinAmountTest({ vault: depositVaultWithMToken, owner }, 10);

          await depositInstantWithMTokenTest(
            {
              depositVaultWithMToken,
              owner,
              mTBILL,
              mTokenToUsdDataFeed,
              expectedMTokenDeposited: false,
            },
            stableCoins.usdc,
            100,
            {
              from: regularAccounts[0],
            },
          );
        });

        it('deposit with waived fee', async () => {
          const {
            owner,
            depositVaultWithMToken,
            depositVault,
            stableCoins,
            mTBILL,
            mTokenToUsdDataFeed,
            regularAccounts,
            dataFeed,
          } = await loadFixture(defaultDeploy);

          await setMTokenDepositsEnabledTest(
            { depositVaultWithMToken, owner },
            true,
          );

          await addWaivedFeeAccountTest(
            { vault: depositVaultWithMToken, owner },
            regularAccounts[0].address,
          );

          await mintToken(stableCoins.usdc, regularAccounts[0], 100);
          await approveBase18(
            regularAccounts[0],
            stableCoins.usdc,
            depositVaultWithMToken,
            100,
          );
          await addPaymentTokenTest(
            { vault: depositVaultWithMToken, owner },
            stableCoins.usdc,
            dataFeed.address,
            0,
            true,
          );
          await addPaymentTokenTest(
            { vault: depositVault, owner },
            stableCoins.usdc,
            dataFeed.address,
            0,
            true,
          );
          await setMinAmountTest({ vault: depositVaultWithMToken, owner }, 10);
          await setMinAmountTest({ vault: depositVault, owner }, 0);

          await depositInstantWithMTokenTest(
            {
              depositVaultWithMToken,
              owner,
              mTBILL,
              mTokenToUsdDataFeed,
              waivedFee: true,
            },
            stableCoins.usdc,
            100,
            {
              from: regularAccounts[0],
            },
          );
        });

        it('deposit 100 DAI with mToken enabled (non-stablecoin feed)', async () => {
          const {
            owner,
            depositVaultWithMToken,
            depositVault,
            stableCoins,
            mTBILL,
            mTokenToUsdDataFeed,
            regularAccounts,
            dataFeed,
          } = await loadFixture(defaultDeploy);

          await setMTokenDepositsEnabledTest(
            { depositVaultWithMToken, owner },
            true,
          );

          await mintToken(stableCoins.dai, regularAccounts[0], 100);
          await approveBase18(
            regularAccounts[0],
            stableCoins.dai,
            depositVaultWithMToken,
            100,
          );
          await addPaymentTokenTest(
            { vault: depositVaultWithMToken, owner },
            stableCoins.dai,
            dataFeed.address,
            0,
            false,
          );
          await addPaymentTokenTest(
            { vault: depositVault, owner },
            stableCoins.dai,
            dataFeed.address,
            0,
            false,
          );
          await setMinAmountTest({ vault: depositVaultWithMToken, owner }, 10);
          await setMinAmountTest({ vault: depositVault, owner }, 0);

          await depositInstantWithMTokenTest(
            {
              depositVaultWithMToken,
              owner,
              mTBILL,
              mTokenToUsdDataFeed,
            },
            stableCoins.dai,
            100,
            {
              from: regularAccounts[0],
            },
          );
        });

        it('should fail: mToken deposit enabled with token not in target DV', async () => {
          const {
            owner,
            depositVaultWithMToken,
            stableCoins,
            mTBILL,
            mTokenToUsdDataFeed,
            dataFeed,
          } = await loadFixture(defaultDeploy);

          await setMTokenDepositsEnabledTest(
            { depositVaultWithMToken, owner },
            true,
          );
          await setMinAmountTest({ vault: depositVaultWithMToken, owner }, 10);

          await mintToken(stableCoins.dai, owner, 100);
          await approveBase18(
            owner,
            stableCoins.dai,
            depositVaultWithMToken,
            100,
          );
          await addPaymentTokenTest(
            { vault: depositVaultWithMToken, owner },
            stableCoins.dai,
            dataFeed.address,
            0,
            false,
          );

          await depositInstantWithMTokenTest(
            {
              depositVaultWithMToken,
              owner,
              mTBILL,
              mTokenToUsdDataFeed,
            },
            stableCoins.dai,
            100,
            {
              revertMessage: 'DVMT: auto-invest failed',
            },
          );
        });

        it('mTokenDepositsEnabled, auto-invest fails, fallback enabled: fallback to normal flow', async () => {
          const {
            owner,
            depositVaultWithMToken,
            stableCoins,
            mTBILL,
            mTokenToUsdDataFeed,
            regularAccounts,
            dataFeed,
          } = await loadFixture(defaultDeploy);

          await setMTokenDepositsEnabledTest(
            { depositVaultWithMToken, owner },
            true,
          );
          await setAutoInvestFallbackEnabledMTokenTest(
            { depositVaultWithMToken, owner },
            true,
          );

          await mintToken(stableCoins.usdc, regularAccounts[0], 100);
          await approveBase18(
            regularAccounts[0],
            stableCoins.usdc,
            depositVaultWithMToken,
            100,
          );
          await addPaymentTokenTest(
            { vault: depositVaultWithMToken, owner },
            stableCoins.usdc,
            dataFeed.address,
            0,
            true,
          );
          await setMinAmountTest({ vault: depositVaultWithMToken, owner }, 10);

          await depositInstantWithMTokenTest(
            {
              depositVaultWithMToken,
              owner,
              mTBILL,
              mTokenToUsdDataFeed,
              expectedMTokenDeposited: false,
            },
            stableCoins.usdc,
            100,
            {
              from: regularAccounts[0],
            },
          );
        });

        it('should fail: mTokenDepositsEnabled, auto-invest fails, fallback disabled', async () => {
          const {
            owner,
            depositVaultWithMToken,
            stableCoins,
            mTBILL,
            mTokenToUsdDataFeed,
            regularAccounts,
            dataFeed,
          } = await loadFixture(defaultDeploy);

          await setMTokenDepositsEnabledTest(
            { depositVaultWithMToken, owner },
            true,
          );

          await mintToken(stableCoins.usdc, regularAccounts[0], 100);
          await approveBase18(
            regularAccounts[0],
            stableCoins.usdc,
            depositVaultWithMToken,
            100,
          );
          await addPaymentTokenTest(
            { vault: depositVaultWithMToken, owner },
            stableCoins.usdc,
            dataFeed.address,
            0,
            true,
          );
          await setMinAmountTest({ vault: depositVaultWithMToken, owner }, 10);

          await depositInstantWithMTokenTest(
            {
              depositVaultWithMToken,
              owner,
              mTBILL,
              mTokenToUsdDataFeed,
              expectedMTokenDeposited: false,
            },
            stableCoins.usdc,
            100,
            {
              from: regularAccounts[0],
              revertMessage: 'DVMT: auto-invest failed',
            },
          );
        });
      });

      describe('depositRequest()', () => {
        it('deposit request 100 USDC with mToken auto-invest', async () => {
          const {
            owner,
            depositVaultWithMToken,
            depositVault,
            stableCoins,
            mTBILL,
            mTokenToUsdDataFeed,
            regularAccounts,
            dataFeed,
          } = await loadFixture(defaultDeploy);

          await setMTokenDepositsEnabledTest(
            { depositVaultWithMToken, owner },
            true,
          );

          await mintToken(stableCoins.usdc, regularAccounts[0], 100);
          await approveBase18(
            regularAccounts[0],
            stableCoins.usdc,
            depositVaultWithMToken,
            100,
          );
          await addPaymentTokenTest(
            { vault: depositVaultWithMToken, owner },
            stableCoins.usdc,
            dataFeed.address,
            0,
            true,
          );
          await addPaymentTokenTest(
            { vault: depositVault, owner },
            stableCoins.usdc,
            dataFeed.address,
            0,
            true,
          );
          await setMinAmountTest({ vault: depositVaultWithMToken, owner }, 10);
          await setMinAmountTest({ vault: depositVault, owner }, 0);

          await depositRequestWithMTokenTest(
            {
              depositVaultWithMToken,
              owner,
              mTBILL,
              mTokenToUsdDataFeed,
            },
            stableCoins.usdc,
            100,
            {
              from: regularAccounts[0],
            },
          );
        });

        it('deposit request with mToken auto-invest fails, fallback enabled: fallback to normal flow', async () => {
          const {
            owner,
            depositVaultWithMToken,
            stableCoins,
            mTBILL,
            mTokenToUsdDataFeed,
            regularAccounts,
            dataFeed,
          } = await loadFixture(defaultDeploy);

          await setMTokenDepositsEnabledTest(
            { depositVaultWithMToken, owner },
            true,
          );
          await setAutoInvestFallbackEnabledMTokenTest(
            { depositVaultWithMToken, owner },
            true,
          );

          await mintToken(stableCoins.usdc, regularAccounts[0], 100);
          await approveBase18(
            regularAccounts[0],
            stableCoins.usdc,
            depositVaultWithMToken,
            100,
          );
          await addPaymentTokenTest(
            { vault: depositVaultWithMToken, owner },
            stableCoins.usdc,
            dataFeed.address,
            0,
            true,
          );
          await setMinAmountTest({ vault: depositVaultWithMToken, owner }, 10);

          await depositRequestWithMTokenTest(
            {
              depositVaultWithMToken,
              owner,
              mTBILL,
              mTokenToUsdDataFeed,
              expectedMTokenDeposited: false,
            },
            stableCoins.usdc,
            100,
            {
              from: regularAccounts[0],
            },
          );
        });

        it('should fail: deposit request with mToken auto-invest fails, fallback disabled', async () => {
          const {
            owner,
            depositVaultWithMToken,
            stableCoins,
            mTBILL,
            mTokenToUsdDataFeed,
            regularAccounts,
            dataFeed,
          } = await loadFixture(defaultDeploy);

          await setMTokenDepositsEnabledTest(
            { depositVaultWithMToken, owner },
            true,
          );

          await mintToken(stableCoins.usdc, regularAccounts[0], 100);
          await approveBase18(
            regularAccounts[0],
            stableCoins.usdc,
            depositVaultWithMToken,
            100,
          );
          await addPaymentTokenTest(
            { vault: depositVaultWithMToken, owner },
            stableCoins.usdc,
            dataFeed.address,
            0,
            true,
          );
          await setMinAmountTest({ vault: depositVaultWithMToken, owner }, 10);

          await depositRequestWithMTokenTest(
            {
              depositVaultWithMToken,
              owner,
              mTBILL,
              mTokenToUsdDataFeed,
              expectedMTokenDeposited: false,
            },
            stableCoins.usdc,
            100,
            {
              from: regularAccounts[0],
              revertMessage: 'DVMT: auto-invest failed',
            },
          );
        });
      });
    });
  },
);
