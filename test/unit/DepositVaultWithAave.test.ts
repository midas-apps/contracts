import { loadFixture } from '@nomicfoundation/hardhat-network-helpers';
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { expect } from 'chai';
import { ethers } from 'hardhat';

import { depositVaultSuits } from './suits/deposit-vault.suits';

import { DepositVaultWithAaveTest__factory } from '../../typechain-types';
import { acErrors } from '../common/ac.helpers';
import { approveBase18, mintToken } from '../common/common.helpers';
import {
  depositInstantWithAaveTest,
  depositRequestWithAaveTest,
  removeAavePoolTest,
  setAaveDepositsEnabledTest,
  setAavePoolTest,
  setAutoInvestFallbackEnabledAaveTest,
} from '../common/deposit-vault-aave.helpers';
import { defaultDeploy } from '../common/fixtures';
import {
  addPaymentTokenTest,
  setMinAmountTest,
} from '../common/manageable-vault.helpers';

depositVaultSuits(
  'DepositVaultWithAave',
  defaultDeploy,
  {
    createNew: async (owner: SignerWithAddress) =>
      new DepositVaultWithAaveTest__factory(owner).deploy(),
    key: 'depositVaultWithAave',
  },
  async (fixture) => {
    const { depositVaultWithAave, stableCoins, aavePoolMock } = fixture;
    expect(await depositVaultWithAave.aavePools(stableCoins.usdc.address)).eq(
      aavePoolMock.address,
    );
    expect(await depositVaultWithAave.aaveDepositsEnabled()).eq(false);
  },
  async (defaultDeploy) => {
    describe('DepositVaultWithAave', () => {
      describe('setAavePool()', () => {
        it('should fail: call from address without DEPOSIT_VAULT_ADMIN_ROLE role', async () => {
          const {
            depositVaultWithAave,
            owner,
            regularAccounts,
            stableCoins,
            aavePoolMock,
          } = await loadFixture(defaultDeploy);

          await setAavePoolTest(
            { depositVaultWithAave, owner },
            stableCoins.usdc.address,
            aavePoolMock.address,
            {
              from: regularAccounts[0],
              revertCustomError: acErrors.WMAC_HASNT_PERMISSION,
            },
          );
        });

        it('should fail: zero address', async () => {
          const { depositVaultWithAave, owner, stableCoins } =
            await loadFixture(defaultDeploy);

          await setAavePoolTest(
            { depositVaultWithAave, owner },
            stableCoins.usdc.address,
            ethers.constants.AddressZero,
            {
              revertCustomError: {
                customErrorName: 'InvalidAddress',
              },
            },
          );
        });

        it('should fail: token not in pool', async () => {
          const { depositVaultWithAave, owner, stableCoins, aavePoolMock } =
            await loadFixture(defaultDeploy);

          await setAavePoolTest(
            { depositVaultWithAave, owner },
            stableCoins.dai.address,
            aavePoolMock.address,
            {
              revertCustomError: {
                customErrorName: 'TokenNotInPool',
              },
            },
          );
        });

        it('call from address with DEPOSIT_VAULT_ADMIN_ROLE role', async () => {
          const { depositVaultWithAave, owner, stableCoins, aavePoolMock } =
            await loadFixture(defaultDeploy);

          await setAavePoolTest(
            { depositVaultWithAave, owner },
            stableCoins.usdc.address,
            aavePoolMock.address,
          );
        });
      });

      describe('removeAavePool()', () => {
        it('should fail: call from address without DEPOSIT_VAULT_ADMIN_ROLE role', async () => {
          const { depositVaultWithAave, owner, regularAccounts, stableCoins } =
            await loadFixture(defaultDeploy);

          await removeAavePoolTest(
            { depositVaultWithAave, owner },
            stableCoins.usdc.address,
            {
              from: regularAccounts[0],
              revertCustomError: acErrors.WMAC_HASNT_PERMISSION,
            },
          );
        });

        it('should fail: pool not set', async () => {
          const { depositVaultWithAave, owner, stableCoins } =
            await loadFixture(defaultDeploy);

          await removeAavePoolTest(
            { depositVaultWithAave, owner },
            stableCoins.dai.address,
            {
              revertCustomError: {
                customErrorName: 'PoolNotSet',
              },
            },
          );
        });

        it('call from address with DEPOSIT_VAULT_ADMIN_ROLE role', async () => {
          const { depositVaultWithAave, owner, stableCoins, aavePoolMock } =
            await loadFixture(defaultDeploy);

          await setAavePoolTest(
            { depositVaultWithAave, owner },
            stableCoins.usdc.address,
            aavePoolMock.address,
          );

          await removeAavePoolTest(
            { depositVaultWithAave, owner },
            stableCoins.usdc.address,
          );
        });
      });

      describe('setAaveDepositsEnabled()', () => {
        it('should fail: call from address without DEPOSIT_VAULT_ADMIN_ROLE role', async () => {
          const { depositVaultWithAave, owner, regularAccounts } =
            await loadFixture(defaultDeploy);

          await setAaveDepositsEnabledTest(
            { depositVaultWithAave, owner },
            true,
            {
              from: regularAccounts[0],
              revertCustomError: acErrors.WMAC_HASNT_PERMISSION,
            },
          );
        });

        it('call from address with DEPOSIT_VAULT_ADMIN_ROLE role', async () => {
          const { depositVaultWithAave, owner } = await loadFixture(
            defaultDeploy,
          );

          await setAaveDepositsEnabledTest(
            { depositVaultWithAave, owner },
            true,
          );
        });

        it('toggle on and off', async () => {
          const { depositVaultWithAave, owner } = await loadFixture(
            defaultDeploy,
          );

          await setAaveDepositsEnabledTest(
            { depositVaultWithAave, owner },
            true,
          );

          await setAaveDepositsEnabledTest(
            { depositVaultWithAave, owner },
            false,
          );
        });
      });

      describe('setAutoInvestFallbackEnabled()', () => {
        it('should fail: call from address without DEPOSIT_VAULT_ADMIN_ROLE role', async () => {
          const { depositVaultWithAave, owner, regularAccounts } =
            await loadFixture(defaultDeploy);

          await setAutoInvestFallbackEnabledAaveTest(
            { depositVaultWithAave, owner },
            true,
            {
              from: regularAccounts[0],
              revertCustomError: acErrors.WMAC_HASNT_PERMISSION,
            },
          );
        });

        it('call from address with DEPOSIT_VAULT_ADMIN_ROLE role', async () => {
          const { depositVaultWithAave, owner } = await loadFixture(
            defaultDeploy,
          );

          await setAutoInvestFallbackEnabledAaveTest(
            { depositVaultWithAave, owner },
            true,
          );
        });

        it('toggle on and off', async () => {
          const { depositVaultWithAave, owner } = await loadFixture(
            defaultDeploy,
          );

          await setAutoInvestFallbackEnabledAaveTest(
            { depositVaultWithAave, owner },
            true,
          );

          await setAutoInvestFallbackEnabledAaveTest(
            { depositVaultWithAave, owner },
            false,
          );
        });
      });

      describe('depositInstant()', () => {
        it('deposit 100 USDC when aaveDepositsEnabled is true', async () => {
          const {
            owner,
            depositVaultWithAave,
            stableCoins,
            mTBILL,
            mTokenToUsdDataFeed,
            regularAccounts,
            dataFeed,
            aavePoolMock,
          } = await loadFixture(defaultDeploy);

          await setAaveDepositsEnabledTest(
            { depositVaultWithAave, owner },
            true,
          );

          await mintToken(stableCoins.usdc, regularAccounts[0], 100);
          await approveBase18(
            regularAccounts[0],
            stableCoins.usdc,
            depositVaultWithAave,
            100,
          );
          await addPaymentTokenTest(
            { vault: depositVaultWithAave, owner },
            stableCoins.usdc,
            dataFeed.address,
            0,
            true,
          );
          await setMinAmountTest({ vault: depositVaultWithAave, owner }, 10);

          await depositInstantWithAaveTest(
            {
              depositVaultWithAave,
              owner,
              mTBILL,
              mTokenToUsdDataFeed,
              aavePoolMock,
            },
            stableCoins.usdc,
            100,
            {
              from: regularAccounts[0],
            },
          );
        });

        it('when aaveDepositsEnabled is false, normal DV flow', async () => {
          const {
            owner,
            depositVaultWithAave,
            stableCoins,
            mTBILL,
            mTokenToUsdDataFeed,
            regularAccounts,
            dataFeed,
            aavePoolMock,
          } = await loadFixture(defaultDeploy);

          await mintToken(stableCoins.usdc, regularAccounts[0], 100);
          await approveBase18(
            regularAccounts[0],
            stableCoins.usdc,
            depositVaultWithAave,
            100,
          );
          await addPaymentTokenTest(
            { vault: depositVaultWithAave, owner },
            stableCoins.usdc,
            dataFeed.address,
            0,
            true,
          );
          await setMinAmountTest({ vault: depositVaultWithAave, owner }, 10);

          await depositInstantWithAaveTest(
            {
              depositVaultWithAave,
              owner,
              mTBILL,
              mTokenToUsdDataFeed,
              aavePoolMock,
              expectedAaveDeposited: false,
            },
            stableCoins.usdc,
            100,
            {
              from: regularAccounts[0],
            },
          );
        });

        it('deposit with custom recipient, aaveDepositsEnabled is true', async () => {
          const {
            owner,
            depositVaultWithAave,
            stableCoins,
            mTBILL,
            mTokenToUsdDataFeed,
            regularAccounts,
            dataFeed,
            aavePoolMock,
          } = await loadFixture(defaultDeploy);

          await setAaveDepositsEnabledTest(
            { depositVaultWithAave, owner },
            true,
          );

          await mintToken(stableCoins.usdc, regularAccounts[0], 100);
          await approveBase18(
            regularAccounts[0],
            stableCoins.usdc,
            depositVaultWithAave,
            100,
          );
          await addPaymentTokenTest(
            { vault: depositVaultWithAave, owner },
            stableCoins.usdc,
            dataFeed.address,
            0,
            true,
          );
          await setMinAmountTest({ vault: depositVaultWithAave, owner }, 10);

          await depositInstantWithAaveTest(
            {
              depositVaultWithAave,
              owner,
              mTBILL,
              mTokenToUsdDataFeed,
              aavePoolMock,
              customRecipient: regularAccounts[1],
            },
            stableCoins.usdc,
            100,
            {
              from: regularAccounts[0],
            },
          );
        });

        it('aaveDepositsEnabled but no pool for token: fallback to normal flow', async () => {
          const {
            owner,
            depositVaultWithAave,
            stableCoins,
            mTBILL,
            mTokenToUsdDataFeed,
            dataFeed,
            aavePoolMock,
            regularAccounts,
          } = await loadFixture(defaultDeploy);

          await setAaveDepositsEnabledTest(
            { depositVaultWithAave, owner },
            true,
          );
          await setMinAmountTest({ vault: depositVaultWithAave, owner }, 10);

          await mintToken(stableCoins.dai, regularAccounts[0], 100);
          await approveBase18(
            regularAccounts[0],
            stableCoins.dai,
            depositVaultWithAave,
            100,
          );
          await addPaymentTokenTest(
            { vault: depositVaultWithAave, owner },
            stableCoins.dai,
            dataFeed.address,
            0,
            false,
          );

          await depositInstantWithAaveTest(
            {
              depositVaultWithAave,
              owner,
              mTBILL,
              mTokenToUsdDataFeed,
              aavePoolMock,
              expectedAaveDeposited: false,
            },
            stableCoins.dai,
            100,
            {
              from: regularAccounts[0],
            },
          );
        });

        it('aaveDepositsEnabled, pool configured but supply reverts, fallback enabled: fallback to normal flow', async () => {
          const {
            owner,
            depositVaultWithAave,
            stableCoins,
            mTBILL,
            mTokenToUsdDataFeed,
            dataFeed,
            aavePoolMock,
            regularAccounts,
          } = await loadFixture(defaultDeploy);

          await setAaveDepositsEnabledTest(
            { depositVaultWithAave, owner },
            true,
          );
          await setAutoInvestFallbackEnabledAaveTest(
            { depositVaultWithAave, owner },
            true,
          );
          await setMinAmountTest({ vault: depositVaultWithAave, owner }, 10);

          await mintToken(stableCoins.usdc, regularAccounts[0], 100);
          await approveBase18(
            regularAccounts[0],
            stableCoins.usdc,
            depositVaultWithAave,
            100,
          );
          await addPaymentTokenTest(
            { vault: depositVaultWithAave, owner },
            stableCoins.usdc,
            dataFeed.address,
            0,
            true,
          );

          await aavePoolMock.setShouldRevertSupply(true);

          await depositInstantWithAaveTest(
            {
              depositVaultWithAave,
              owner,
              mTBILL,
              mTokenToUsdDataFeed,
              aavePoolMock,
              expectedAaveDeposited: false,
            },
            stableCoins.usdc,
            100,
            {
              from: regularAccounts[0],
            },
          );
        });

        it('should fail: aaveDepositsEnabled, pool configured but supply reverts, fallback disabled', async () => {
          const {
            owner,
            depositVaultWithAave,
            stableCoins,
            mTBILL,
            mTokenToUsdDataFeed,
            dataFeed,
            aavePoolMock,
            regularAccounts,
          } = await loadFixture(defaultDeploy);

          await setAaveDepositsEnabledTest(
            { depositVaultWithAave, owner },
            true,
          );
          await setMinAmountTest({ vault: depositVaultWithAave, owner }, 10);

          await mintToken(stableCoins.usdc, regularAccounts[0], 100);
          await approveBase18(
            regularAccounts[0],
            stableCoins.usdc,
            depositVaultWithAave,
            100,
          );
          await addPaymentTokenTest(
            { vault: depositVaultWithAave, owner },
            stableCoins.usdc,
            dataFeed.address,
            0,
            true,
          );

          await aavePoolMock.setShouldRevertSupply(true);

          await depositInstantWithAaveTest(
            {
              depositVaultWithAave,
              owner,
              mTBILL,
              mTokenToUsdDataFeed,
              aavePoolMock,
              expectedAaveDeposited: false,
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
        it('deposit request 100 USDC with aave auto-invest', async () => {
          const {
            owner,
            depositVaultWithAave,
            stableCoins,
            mTBILL,
            mTokenToUsdDataFeed,
            regularAccounts,
            dataFeed,
            aavePoolMock,
          } = await loadFixture(defaultDeploy);

          await setAaveDepositsEnabledTest(
            { depositVaultWithAave, owner },
            true,
          );
          await setMinAmountTest({ vault: depositVaultWithAave, owner }, 10);

          await mintToken(stableCoins.usdc, regularAccounts[0], 100);
          await approveBase18(
            regularAccounts[0],
            stableCoins.usdc,
            depositVaultWithAave,
            100,
          );
          await addPaymentTokenTest(
            { vault: depositVaultWithAave, owner },
            stableCoins.usdc,
            dataFeed.address,
            0,
            true,
          );

          await depositRequestWithAaveTest(
            {
              depositVaultWithAave,
              owner,
              mTBILL,
              mTokenToUsdDataFeed,
              aavePoolMock,
            },
            stableCoins.usdc,
            100,
            {
              from: regularAccounts[0],
            },
          );
        });

        it('deposit request with aave auto-invest, supply reverts, fallback enabled: fallback to normal flow', async () => {
          const {
            owner,
            depositVaultWithAave,
            stableCoins,
            mTBILL,
            mTokenToUsdDataFeed,
            regularAccounts,
            dataFeed,
            aavePoolMock,
          } = await loadFixture(defaultDeploy);

          await setAaveDepositsEnabledTest(
            { depositVaultWithAave, owner },
            true,
          );
          await setAutoInvestFallbackEnabledAaveTest(
            { depositVaultWithAave, owner },
            true,
          );
          await setMinAmountTest({ vault: depositVaultWithAave, owner }, 10);

          await mintToken(stableCoins.usdc, regularAccounts[0], 100);
          await approveBase18(
            regularAccounts[0],
            stableCoins.usdc,
            depositVaultWithAave,
            100,
          );
          await addPaymentTokenTest(
            { vault: depositVaultWithAave, owner },
            stableCoins.usdc,
            dataFeed.address,
            0,
            true,
          );

          await aavePoolMock.setShouldRevertSupply(true);

          await depositRequestWithAaveTest(
            {
              depositVaultWithAave,
              owner,
              mTBILL,
              mTokenToUsdDataFeed,
              aavePoolMock,
              expectedAaveDeposited: false,
            },
            stableCoins.usdc,
            100,
            {
              from: regularAccounts[0],
            },
          );
        });

        it('should fail: deposit request with aave auto-invest, supply reverts, fallback disabled', async () => {
          const {
            owner,
            depositVaultWithAave,
            stableCoins,
            mTBILL,
            mTokenToUsdDataFeed,
            regularAccounts,
            dataFeed,
            aavePoolMock,
          } = await loadFixture(defaultDeploy);

          await setAaveDepositsEnabledTest(
            { depositVaultWithAave, owner },
            true,
          );
          await setMinAmountTest({ vault: depositVaultWithAave, owner }, 10);

          await mintToken(stableCoins.usdc, regularAccounts[0], 100);
          await approveBase18(
            regularAccounts[0],
            stableCoins.usdc,
            depositVaultWithAave,
            100,
          );
          await addPaymentTokenTest(
            { vault: depositVaultWithAave, owner },
            stableCoins.usdc,
            dataFeed.address,
            0,
            true,
          );

          await aavePoolMock.setShouldRevertSupply(true);

          await depositRequestWithAaveTest(
            {
              depositVaultWithAave,
              owner,
              mTBILL,
              mTokenToUsdDataFeed,
              aavePoolMock,
              expectedAaveDeposited: false,
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
