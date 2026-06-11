import { loadFixture } from '@nomicfoundation/hardhat-network-helpers';
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { expect } from 'chai';
import { constants } from 'ethers';
import { ethers } from 'hardhat';

import {
  baseInitParamsDv,
  depositVaultSuits,
} from './suits/deposit-vault.suits';

import {
  DepositVaultWithMToken__factory,
  DepositVaultWithMTokenTest__factory,
} from '../../typechain-types';
import { acErrors } from '../common/ac.helpers';
import {
  approveBase18,
  InitializeParamCase,
  mintToken,
  validateImplementation,
} from '../common/common.helpers';
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
import {
  initializeDvWithMToken,
  InitializerParamsDvWithMToken,
} from '../common/vault-initializer.helpers';

const baseInitParamsDvWithMToken = (
  fixture: Parameters<typeof baseInitParamsDv>[0],
): InitializerParamsDvWithMToken => ({
  ...baseInitParamsDv(fixture),
  depositVault: fixture.depositVault,
});

const dvWithMTokenInitializeParamCases: InitializeParamCase<InitializerParamsDvWithMToken>[] =
  [
    {
      title: 'depositVault is zero address',
      params: { depositVault: constants.AddressZero },
      revertCustomError: {
        customErrorName: 'InvalidAddress',
        args: [constants.AddressZero],
      },
    },
  ];

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
    await validateImplementation(DepositVaultWithMToken__factory);
  },
  {
    deployUninitialized: (fixture) =>
      new DepositVaultWithMTokenTest__factory(fixture.owner).deploy(),
    initialize: async (fixture, params, opt) => {
      await initializeDvWithMToken(
        { ...baseInitParamsDvWithMToken(fixture), ...params },
        opt?.contract,
        opt,
      );
    },
    extraParamCases: dvWithMTokenInitializeParamCases,
  },
  async (defaultDeploy) => {
    describe('DepositVaultWithMToken', function () {
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
              revertCustomError: acErrors.WMAC_HASNT_PERMISSION(),
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
              revertCustomError: {
                customErrorName: 'InvalidAddress',
              },
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
              revertCustomError: {
                customErrorName: 'SameAddressValue',
              },
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
              revertCustomError: acErrors.WMAC_HASNT_PERMISSION(),
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
              revertCustomError: acErrors.WMAC_HASNT_PERMISSION(),
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
              revertCustomError: {
                customErrorName: 'AutoInvestFailed',
              },
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
              revertCustomError: {
                customErrorName: 'AutoInvestFailed',
              },
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
              revertCustomError: {
                customErrorName: 'AutoInvestFailed',
              },
            },
          );
        });
      });
    });
  },
);
