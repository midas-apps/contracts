import { loadFixture } from '@nomicfoundation/hardhat-network-helpers';
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { expect } from 'chai';
import { parseUnits } from 'ethers/lib/utils';
import { ethers } from 'hardhat';

import { depositVaultSuits } from './suits/deposit-vault.suits';

import {
  DepositVaultWithMorphoTest__factory,
  MorphoVaultMock__factory,
} from '../../typechain-types';
import { acErrors } from '../common/ac.helpers';
import { approveBase18, mintToken } from '../common/common.helpers';
import {
  depositInstantWithMorphoTest,
  depositRequestWithMorphoTest,
  removeMorphoVaultTest,
  setAutoInvestFallbackEnabledMorphoTest,
  setMorphoDepositsEnabledTest,
  setMorphoVaultTest,
} from '../common/deposit-vault-morpho.helpers';
import { defaultDeploy } from '../common/fixtures';
import {
  addPaymentTokenTest,
  setMinAmountTest,
} from '../common/manageable-vault.helpers';

depositVaultSuits(
  'DepositVaultWithMorpho',
  defaultDeploy,
  {
    createNew: async (owner: SignerWithAddress) =>
      new DepositVaultWithMorphoTest__factory(owner).deploy(),
    key: 'depositVaultWithMorpho',
  },
  async (fixture) => {
    const { depositVaultWithMorpho } = fixture;
    expect(await depositVaultWithMorpho.morphoDepositsEnabled()).eq(false);
  },
  async (defaultDeploy) => {
    describe('DepositVaultWithMorpho', function () {
      describe('setMorphoVault()', () => {
        it('should fail: call from address without DEPOSIT_VAULT_ADMIN_ROLE role', async () => {
          const {
            depositVaultWithMorpho,
            owner,
            regularAccounts,
            stableCoins,
            morphoVaultMock,
          } = await loadFixture(defaultDeploy);

          await setMorphoVaultTest(
            { depositVaultWithMorpho, owner },
            stableCoins.usdc.address,
            morphoVaultMock.address,
            {
              from: regularAccounts[0],
              revertMessage: acErrors.WMAC_HASNT_PERMISSION,
            },
          );
        });

        it('should fail: zero token address', async () => {
          const { depositVaultWithMorpho, owner, morphoVaultMock } =
            await loadFixture(defaultDeploy);

          await setMorphoVaultTest(
            { depositVaultWithMorpho, owner },
            ethers.constants.AddressZero,
            morphoVaultMock.address,
            {
              revertMessage: 'zero address',
            },
          );
        });

        it('should fail: zero vault address', async () => {
          const { depositVaultWithMorpho, owner, stableCoins } =
            await loadFixture(defaultDeploy);

          await setMorphoVaultTest(
            { depositVaultWithMorpho, owner },
            stableCoins.usdc.address,
            ethers.constants.AddressZero,
            {
              revertMessage: 'zero address',
            },
          );
        });

        it('should fail: asset mismatch', async () => {
          const {
            depositVaultWithMorpho,
            owner,
            stableCoins,
            morphoVaultMock,
          } = await loadFixture(defaultDeploy);

          // morphoVaultMock is configured for USDC; passing DAI should fail
          await setMorphoVaultTest(
            { depositVaultWithMorpho, owner },
            stableCoins.dai.address,
            morphoVaultMock.address,
            {
              revertMessage: 'DVM: asset mismatch',
            },
          );
        });

        it('call from address with DEPOSIT_VAULT_ADMIN_ROLE role', async () => {
          const {
            depositVaultWithMorpho,
            owner,
            stableCoins,
            morphoVaultMock,
          } = await loadFixture(defaultDeploy);

          await setMorphoVaultTest(
            { depositVaultWithMorpho, owner },
            stableCoins.usdc.address,
            morphoVaultMock.address,
          );
        });
      });

      describe('removeMorphoVault()', () => {
        it('should fail: call from address without DEPOSIT_VAULT_ADMIN_ROLE role', async () => {
          const {
            depositVaultWithMorpho,
            owner,
            regularAccounts,
            stableCoins,
          } = await loadFixture(defaultDeploy);

          await removeMorphoVaultTest(
            { depositVaultWithMorpho, owner },
            stableCoins.usdc.address,
            {
              from: regularAccounts[0],
              revertMessage: acErrors.WMAC_HASNT_PERMISSION,
            },
          );
        });

        it('should fail: vault not set', async () => {
          const { depositVaultWithMorpho, owner, stableCoins } =
            await loadFixture(defaultDeploy);

          await removeMorphoVaultTest(
            { depositVaultWithMorpho, owner },
            stableCoins.usdc.address,
            {
              revertMessage: 'DVM: vault not set',
            },
          );
        });

        it('call from address with DEPOSIT_VAULT_ADMIN_ROLE role', async () => {
          const {
            depositVaultWithMorpho,
            owner,
            stableCoins,
            morphoVaultMock,
          } = await loadFixture(defaultDeploy);

          await setMorphoVaultTest(
            { depositVaultWithMorpho, owner },
            stableCoins.usdc.address,
            morphoVaultMock.address,
          );

          await removeMorphoVaultTest(
            { depositVaultWithMorpho, owner },
            stableCoins.usdc.address,
          );
        });
      });

      describe('setMorphoDepositsEnabled()', () => {
        it('should fail: call from address without DEPOSIT_VAULT_ADMIN_ROLE role', async () => {
          const { depositVaultWithMorpho, owner, regularAccounts } =
            await loadFixture(defaultDeploy);

          await setMorphoDepositsEnabledTest(
            { depositVaultWithMorpho, owner },
            true,
            {
              from: regularAccounts[0],
              revertMessage: acErrors.WMAC_HASNT_PERMISSION,
            },
          );
        });

        it('call from address with DEPOSIT_VAULT_ADMIN_ROLE role', async () => {
          const { depositVaultWithMorpho, owner } = await loadFixture(
            defaultDeploy,
          );

          await setMorphoDepositsEnabledTest(
            { depositVaultWithMorpho, owner },
            true,
          );
        });

        it('toggle on and off', async () => {
          const { depositVaultWithMorpho, owner } = await loadFixture(
            defaultDeploy,
          );

          await setMorphoDepositsEnabledTest(
            { depositVaultWithMorpho, owner },
            true,
          );

          await setMorphoDepositsEnabledTest(
            { depositVaultWithMorpho, owner },
            false,
          );
        });
      });

      describe('setAutoInvestFallbackEnabled()', () => {
        it('should fail: call from address without DEPOSIT_VAULT_ADMIN_ROLE role', async () => {
          const { depositVaultWithMorpho, owner, regularAccounts } =
            await loadFixture(defaultDeploy);

          await setAutoInvestFallbackEnabledMorphoTest(
            { depositVaultWithMorpho, owner },
            true,
            {
              from: regularAccounts[0],
              revertMessage: acErrors.WMAC_HASNT_PERMISSION,
            },
          );
        });

        it('call from address with DEPOSIT_VAULT_ADMIN_ROLE role', async () => {
          const { depositVaultWithMorpho, owner } = await loadFixture(
            defaultDeploy,
          );

          await setAutoInvestFallbackEnabledMorphoTest(
            { depositVaultWithMorpho, owner },
            true,
          );
        });

        it('toggle on and off', async () => {
          const { depositVaultWithMorpho, owner } = await loadFixture(
            defaultDeploy,
          );

          await setAutoInvestFallbackEnabledMorphoTest(
            { depositVaultWithMorpho, owner },
            true,
          );

          await setAutoInvestFallbackEnabledMorphoTest(
            { depositVaultWithMorpho, owner },
            false,
          );
        });
      });

      describe('depositInstant()', async () => {
        it('morphoDepositsEnabled but no vault for token: fallback to normal flow', async () => {
          const {
            owner,
            depositVaultWithMorpho,
            stableCoins,
            mTBILL,
            mTokenToUsdDataFeed,
            regularAccounts,
            dataFeed,
            morphoVaultMock,
          } = await loadFixture(defaultDeploy);

          await setMorphoDepositsEnabledTest(
            { depositVaultWithMorpho, owner },
            true,
          );

          await mintToken(stableCoins.usdc, regularAccounts[0], 100);
          await approveBase18(
            regularAccounts[0],
            stableCoins.usdc,
            depositVaultWithMorpho,
            100,
          );
          await addPaymentTokenTest(
            { vault: depositVaultWithMorpho, owner },
            stableCoins.usdc,
            dataFeed.address,
            0,
            true,
          );
          await setMinAmountTest({ vault: depositVaultWithMorpho, owner }, 10);

          await depositInstantWithMorphoTest(
            {
              depositVaultWithMorpho,
              owner,
              mTBILL,
              mTokenToUsdDataFeed,
              morphoVaultMock,
              expectedMorphoDeposited: false,
            },
            stableCoins.usdc,
            100,
            {
              from: regularAccounts[0],
            },
          );
        });

        it('morphoDepositsEnabled, vault configured but deposit reverts, fallback enabled: fallback to normal flow', async () => {
          const {
            owner,
            depositVaultWithMorpho,
            stableCoins,
            mTBILL,
            mTokenToUsdDataFeed,
            regularAccounts,
            dataFeed,
            morphoVaultMock,
          } = await loadFixture(defaultDeploy);

          await setMorphoDepositsEnabledTest(
            { depositVaultWithMorpho, owner },
            true,
          );
          await setAutoInvestFallbackEnabledMorphoTest(
            { depositVaultWithMorpho, owner },
            true,
          );

          await setMorphoVaultTest(
            { depositVaultWithMorpho, owner },
            stableCoins.usdc.address,
            morphoVaultMock.address,
          );

          await mintToken(stableCoins.usdc, regularAccounts[0], 100);
          await approveBase18(
            regularAccounts[0],
            stableCoins.usdc,
            depositVaultWithMorpho,
            100,
          );
          await addPaymentTokenTest(
            { vault: depositVaultWithMorpho, owner },
            stableCoins.usdc,
            dataFeed.address,
            0,
            true,
          );
          await setMinAmountTest({ vault: depositVaultWithMorpho, owner }, 10);

          await morphoVaultMock.setShouldRevertDeposit(true);

          await depositInstantWithMorphoTest(
            {
              depositVaultWithMorpho,
              owner,
              mTBILL,
              mTokenToUsdDataFeed,
              morphoVaultMock,
              expectedMorphoDeposited: false,
            },
            stableCoins.usdc,
            100,
            {
              from: regularAccounts[0],
            },
          );
        });

        it('should fail: morphoDepositsEnabled, vault configured but deposit reverts, fallback disabled', async () => {
          const {
            owner,
            depositVaultWithMorpho,
            stableCoins,
            mTBILL,
            mTokenToUsdDataFeed,
            regularAccounts,
            dataFeed,
            morphoVaultMock,
          } = await loadFixture(defaultDeploy);

          await setMorphoDepositsEnabledTest(
            { depositVaultWithMorpho, owner },
            true,
          );

          await setMorphoVaultTest(
            { depositVaultWithMorpho, owner },
            stableCoins.usdc.address,
            morphoVaultMock.address,
          );

          await mintToken(stableCoins.usdc, regularAccounts[0], 100);
          await approveBase18(
            regularAccounts[0],
            stableCoins.usdc,
            depositVaultWithMorpho,
            100,
          );
          await addPaymentTokenTest(
            { vault: depositVaultWithMorpho, owner },
            stableCoins.usdc,
            dataFeed.address,
            0,
            true,
          );
          await setMinAmountTest({ vault: depositVaultWithMorpho, owner }, 10);

          await morphoVaultMock.setShouldRevertDeposit(true);

          await depositInstantWithMorphoTest(
            {
              depositVaultWithMorpho,
              owner,
              mTBILL,
              mTokenToUsdDataFeed,
              morphoVaultMock,
              expectedMorphoDeposited: false,
            },
            stableCoins.usdc,
            100,
            {
              from: regularAccounts[0],
              revertMessage: 'DVM: auto-invest failed',
            },
          );
        });

        it('should fail: when Morpho deposit mints zero shares', async () => {
          const {
            owner,
            depositVaultWithMorpho,
            stableCoins,
            mTBILL,
            mTokenToUsdDataFeed,
            dataFeed,
            morphoVaultMock,
          } = await loadFixture(defaultDeploy);

          await setMorphoDepositsEnabledTest(
            { depositVaultWithMorpho, owner },
            true,
          );
          await setMorphoVaultTest(
            { depositVaultWithMorpho, owner },
            stableCoins.usdc.address,
            morphoVaultMock.address,
          );
          await setMinAmountTest({ vault: depositVaultWithMorpho, owner }, 0);
          await morphoVaultMock.setExchangeRate(parseUnits('1000000000000'));

          await mintToken(stableCoins.usdc, owner, 1);
          await approveBase18(
            owner,
            stableCoins.usdc,
            depositVaultWithMorpho,
            1,
          );
          await addPaymentTokenTest(
            { vault: depositVaultWithMorpho, owner },
            stableCoins.usdc,
            dataFeed.address,
            0,
            true,
          );

          await depositInstantWithMorphoTest(
            {
              depositVaultWithMorpho,
              owner,
              mTBILL,
              mTokenToUsdDataFeed,
              morphoVaultMock,
              expectedMorphoDeposited: false,
            },
            stableCoins.usdc,
            0.000001,
            {
              revertMessage: 'DVM: zero shares',
            },
          );
        });

        it('deposit 100 USDC when morphoDepositsEnabled is true', async () => {
          const {
            owner,
            depositVaultWithMorpho,
            stableCoins,
            mTBILL,
            mTokenToUsdDataFeed,
            regularAccounts,
            dataFeed,
            morphoVaultMock,
          } = await loadFixture(defaultDeploy);

          await setMorphoDepositsEnabledTest(
            { depositVaultWithMorpho, owner },
            true,
          );

          await setMorphoVaultTest(
            { depositVaultWithMorpho, owner },
            stableCoins.usdc.address,
            morphoVaultMock.address,
          );

          await mintToken(stableCoins.usdc, regularAccounts[0], 100);
          await approveBase18(
            regularAccounts[0],
            stableCoins.usdc,
            depositVaultWithMorpho,
            100,
          );
          await addPaymentTokenTest(
            { vault: depositVaultWithMorpho, owner },
            stableCoins.usdc,
            dataFeed.address,
            0,
            true,
          );
          await setMinAmountTest({ vault: depositVaultWithMorpho, owner }, 10);

          await depositInstantWithMorphoTest(
            {
              depositVaultWithMorpho,
              owner,
              mTBILL,
              mTokenToUsdDataFeed,
              morphoVaultMock,
            },
            stableCoins.usdc,
            100,
            {
              from: regularAccounts[0],
            },
          );
        });

        it('when morphoDepositsEnabled is false, normal DV flow', async () => {
          const {
            owner,
            depositVaultWithMorpho,
            stableCoins,
            mTBILL,
            mTokenToUsdDataFeed,
            regularAccounts,
            dataFeed,
            morphoVaultMock,
          } = await loadFixture(defaultDeploy);

          await mintToken(stableCoins.usdc, regularAccounts[0], 100);
          await approveBase18(
            regularAccounts[0],
            stableCoins.usdc,
            depositVaultWithMorpho,
            100,
          );
          await addPaymentTokenTest(
            { vault: depositVaultWithMorpho, owner },
            stableCoins.usdc,
            dataFeed.address,
            0,
            true,
          );
          await setMinAmountTest({ vault: depositVaultWithMorpho, owner }, 10);

          await depositInstantWithMorphoTest(
            {
              depositVaultWithMorpho,
              owner,
              mTBILL,
              mTokenToUsdDataFeed,
              morphoVaultMock,
              expectedMorphoDeposited: false,
            },
            stableCoins.usdc,
            100,
            {
              from: regularAccounts[0],
            },
          );
        });

        it('deposit with custom recipient, morphoDepositsEnabled is true', async () => {
          const {
            owner,
            depositVaultWithMorpho,
            stableCoins,
            mTBILL,
            mTokenToUsdDataFeed,
            regularAccounts,
            dataFeed,
            morphoVaultMock,
          } = await loadFixture(defaultDeploy);

          await setMorphoDepositsEnabledTest(
            { depositVaultWithMorpho, owner },
            true,
          );

          await setMorphoVaultTest(
            { depositVaultWithMorpho, owner },
            stableCoins.usdc.address,
            morphoVaultMock.address,
          );

          await mintToken(stableCoins.usdc, regularAccounts[0], 100);
          await approveBase18(
            regularAccounts[0],
            stableCoins.usdc,
            depositVaultWithMorpho,
            100,
          );
          await addPaymentTokenTest(
            { vault: depositVaultWithMorpho, owner },
            stableCoins.usdc,
            dataFeed.address,
            0,
            true,
          );
          await setMinAmountTest({ vault: depositVaultWithMorpho, owner }, 10);

          await depositInstantWithMorphoTest(
            {
              depositVaultWithMorpho,
              owner,
              mTBILL,
              mTokenToUsdDataFeed,
              morphoVaultMock,
              customRecipient: regularAccounts[1],
            },
            stableCoins.usdc,
            100,
            {
              from: regularAccounts[0],
            },
          );
        });

        it('deposit 100 DAI with morpho enabled (per-asset vault mapping)', async () => {
          const {
            owner,
            depositVaultWithMorpho,
            stableCoins,
            mTBILL,
            mTokenToUsdDataFeed,
            regularAccounts,
            dataFeed,
          } = await loadFixture(defaultDeploy);

          const daiMorphoVault = await new MorphoVaultMock__factory(
            owner,
          ).deploy(stableCoins.dai.address);
          await stableCoins.dai.mint(
            daiMorphoVault.address,
            parseUnits('1000000'),
          );

          await setMorphoDepositsEnabledTest(
            { depositVaultWithMorpho, owner },
            true,
          );

          await setMorphoVaultTest(
            { depositVaultWithMorpho, owner },
            stableCoins.dai.address,
            daiMorphoVault.address,
          );

          await mintToken(stableCoins.dai, regularAccounts[0], 100);
          await approveBase18(
            regularAccounts[0],
            stableCoins.dai,
            depositVaultWithMorpho,
            100,
          );
          await addPaymentTokenTest(
            { vault: depositVaultWithMorpho, owner },
            stableCoins.dai,
            dataFeed.address,
            0,
            false,
          );
          await setMinAmountTest({ vault: depositVaultWithMorpho, owner }, 10);

          await depositInstantWithMorphoTest(
            {
              depositVaultWithMorpho,
              owner,
              mTBILL,
              mTokenToUsdDataFeed,
              morphoVaultMock: daiMorphoVault,
            },
            stableCoins.dai,
            100,
            {
              from: regularAccounts[0],
            },
          );
        });

        it('toggle mid-flight: morpho enabled then disabled', async () => {
          const {
            owner,
            depositVaultWithMorpho,
            stableCoins,
            mTBILL,
            mTokenToUsdDataFeed,
            regularAccounts,
            dataFeed,
            morphoVaultMock,
          } = await loadFixture(defaultDeploy);

          await setMorphoVaultTest(
            { depositVaultWithMorpho, owner },
            stableCoins.usdc.address,
            morphoVaultMock.address,
          );

          await addPaymentTokenTest(
            { vault: depositVaultWithMorpho, owner },
            stableCoins.usdc,
            dataFeed.address,
            0,
            true,
          );
          await setMinAmountTest({ vault: depositVaultWithMorpho, owner }, 10);

          // Deposit 1: morpho enabled
          await setMorphoDepositsEnabledTest(
            { depositVaultWithMorpho, owner },
            true,
          );

          await mintToken(stableCoins.usdc, regularAccounts[0], 200);
          await approveBase18(
            regularAccounts[0],
            stableCoins.usdc,
            depositVaultWithMorpho,
            200,
          );

          await depositInstantWithMorphoTest(
            {
              depositVaultWithMorpho,
              owner,
              mTBILL,
              mTokenToUsdDataFeed,
              morphoVaultMock,
            },
            stableCoins.usdc,
            100,
            {
              from: regularAccounts[0],
            },
          );

          // Deposit 2: morpho disabled
          await setMorphoDepositsEnabledTest(
            { depositVaultWithMorpho, owner },
            false,
          );

          await depositInstantWithMorphoTest(
            {
              depositVaultWithMorpho,
              owner,
              mTBILL,
              mTokenToUsdDataFeed,
              morphoVaultMock,
              expectedMorphoDeposited: false,
            },
            stableCoins.usdc,
            100,
            {
              from: regularAccounts[0],
            },
          );
        });
      });

      describe('depositRequest()', () => {
        it('deposit request 100 USDC with morpho auto-invest', async () => {
          const {
            owner,
            depositVaultWithMorpho,
            stableCoins,
            mTBILL,
            mTokenToUsdDataFeed,
            regularAccounts,
            dataFeed,
            morphoVaultMock,
          } = await loadFixture(defaultDeploy);

          await setMorphoDepositsEnabledTest(
            { depositVaultWithMorpho, owner },
            true,
          );
          await setMorphoVaultTest(
            { depositVaultWithMorpho, owner },
            stableCoins.usdc.address,
            morphoVaultMock.address,
          );
          await setMinAmountTest({ vault: depositVaultWithMorpho, owner }, 10);

          await mintToken(stableCoins.usdc, regularAccounts[0], 100);
          await approveBase18(
            regularAccounts[0],
            stableCoins.usdc,
            depositVaultWithMorpho,
            100,
          );
          await addPaymentTokenTest(
            { vault: depositVaultWithMorpho, owner },
            stableCoins.usdc,
            dataFeed.address,
            0,
            true,
          );

          await depositRequestWithMorphoTest(
            {
              depositVaultWithMorpho,
              owner,
              mTBILL,
              mTokenToUsdDataFeed,
              morphoVaultMock,
            },
            stableCoins.usdc,
            100,
            {
              from: regularAccounts[0],
            },
          );
        });

        it('deposit request with morpho auto-invest, deposit reverts, fallback enabled: fallback to normal flow', async () => {
          const {
            owner,
            depositVaultWithMorpho,
            stableCoins,
            mTBILL,
            mTokenToUsdDataFeed,
            regularAccounts,
            dataFeed,
            morphoVaultMock,
          } = await loadFixture(defaultDeploy);

          await setMorphoDepositsEnabledTest(
            { depositVaultWithMorpho, owner },
            true,
          );
          await setAutoInvestFallbackEnabledMorphoTest(
            { depositVaultWithMorpho, owner },
            true,
          );
          await setMorphoVaultTest(
            { depositVaultWithMorpho, owner },
            stableCoins.usdc.address,
            morphoVaultMock.address,
          );
          await setMinAmountTest({ vault: depositVaultWithMorpho, owner }, 10);

          await mintToken(stableCoins.usdc, regularAccounts[0], 100);
          await approveBase18(
            regularAccounts[0],
            stableCoins.usdc,
            depositVaultWithMorpho,
            100,
          );
          await addPaymentTokenTest(
            { vault: depositVaultWithMorpho, owner },
            stableCoins.usdc,
            dataFeed.address,
            0,
            true,
          );

          await morphoVaultMock.setShouldRevertDeposit(true);

          await depositRequestWithMorphoTest(
            {
              depositVaultWithMorpho,
              owner,
              mTBILL,
              mTokenToUsdDataFeed,
              morphoVaultMock,
              expectedMorphoDeposited: false,
            },
            stableCoins.usdc,
            100,
            {
              from: regularAccounts[0],
            },
          );
        });

        it('should fail: deposit request with morpho auto-invest, deposit reverts, fallback disabled', async () => {
          const {
            owner,
            depositVaultWithMorpho,
            stableCoins,
            mTBILL,
            mTokenToUsdDataFeed,
            regularAccounts,
            dataFeed,
            morphoVaultMock,
          } = await loadFixture(defaultDeploy);

          await setMorphoDepositsEnabledTest(
            { depositVaultWithMorpho, owner },
            true,
          );
          await setMorphoVaultTest(
            { depositVaultWithMorpho, owner },
            stableCoins.usdc.address,
            morphoVaultMock.address,
          );
          await setMinAmountTest({ vault: depositVaultWithMorpho, owner }, 10);

          await mintToken(stableCoins.usdc, regularAccounts[0], 100);
          await approveBase18(
            regularAccounts[0],
            stableCoins.usdc,
            depositVaultWithMorpho,
            100,
          );
          await addPaymentTokenTest(
            { vault: depositVaultWithMorpho, owner },
            stableCoins.usdc,
            dataFeed.address,
            0,
            true,
          );

          await morphoVaultMock.setShouldRevertDeposit(true);

          await depositRequestWithMorphoTest(
            {
              depositVaultWithMorpho,
              owner,
              mTBILL,
              mTokenToUsdDataFeed,
              morphoVaultMock,
              expectedMorphoDeposited: false,
            },
            stableCoins.usdc,
            100,
            {
              from: regularAccounts[0],
              revertMessage: 'DVM: auto-invest failed',
            },
          );
        });
      });
    });
  },
);
