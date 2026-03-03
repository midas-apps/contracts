import { loadFixture } from '@nomicfoundation/hardhat-network-helpers';
import { expect } from 'chai';
import { constants } from 'ethers';
import { parseUnits } from 'ethers/lib/utils';
import { ethers } from 'hardhat';

import { acErrors, blackList, greenList } from '../common/ac.helpers';
import { approveBase18, mintToken, pauseVault } from '../common/common.helpers';
import {
  depositInstantWithMTokenTest,
  setMTokenDepositsEnabledTest,
  setMTokenDepositVaultTest,
} from '../common/deposit-vault-mtoken.helpers';
import {
  approveRequestTest,
  depositRequestTest,
  rejectRequestTest,
  safeApproveRequestTest,
  safeBulkApproveRequestTest,
} from '../common/deposit-vault.helpers';
import { defaultDeploy } from '../common/fixtures';
import {
  addPaymentTokenTest,
  addWaivedFeeAccountTest,
  changeTokenAllowanceTest,
  removePaymentTokenTest,
  removeWaivedFeeAccountTest,
  setInstantFeeTest,
  setInstantDailyLimitTest,
  setMinAmountToDepositTest,
  setMinAmountTest,
  setVariabilityToleranceTest,
  withdrawTest,
  changeTokenFeeTest,
} from '../common/manageable-vault.helpers';
import { sanctionUser } from '../common/with-sanctions-list.helpers';

describe('DepositVaultWithMToken', function () {
  it('deployment', async () => {
    const {
      depositVaultWithMToken,
      depositVault,
      mTBILL,
      tokensReceiver,
      feeReceiver,
      mTokenToUsdDataFeed,
      roles,
    } = await loadFixture(defaultDeploy);

    expect(await depositVaultWithMToken.mToken()).eq(mTBILL.address);
    expect(await depositVaultWithMToken.paused()).eq(false);
    expect(await depositVaultWithMToken.tokensReceiver()).eq(
      tokensReceiver.address,
    );
    expect(await depositVaultWithMToken.feeReceiver()).eq(feeReceiver.address);
    expect(await depositVaultWithMToken.ONE_HUNDRED_PERCENT()).eq('10000');
    expect(await depositVaultWithMToken.minMTokenAmountForFirstDeposit()).eq(
      '0',
    );
    expect(await depositVaultWithMToken.minAmount()).eq(parseUnits('100'));
    expect(await depositVaultWithMToken.instantFee()).eq('100');
    expect(await depositVaultWithMToken.instantDailyLimit()).eq(
      parseUnits('100000'),
    );
    expect(await depositVaultWithMToken.mTokenDataFeed()).eq(
      mTokenToUsdDataFeed.address,
    );
    expect(await depositVaultWithMToken.variationTolerance()).eq(1);
    expect(await depositVaultWithMToken.vaultRole()).eq(
      roles.tokenRoles.mTBILL.depositVaultAdmin,
    );
    expect(await depositVaultWithMToken.MANUAL_FULLFILMENT_TOKEN()).eq(
      ethers.constants.AddressZero,
    );
    expect(await depositVaultWithMToken.mTokenDepositVault()).eq(
      depositVault.address,
    );
    expect(await depositVaultWithMToken.mTokenDepositsEnabled()).eq(false);
  });

  describe('setMTokenDepositVault()', () => {
    it('should fail: call from address without DEPOSIT_VAULT_ADMIN_ROLE role', async () => {
      const { depositVaultWithMToken, owner, regularAccounts, depositVault } =
        await loadFixture(defaultDeploy);

      await setMTokenDepositVaultTest(
        { depositVaultWithMToken, owner },
        depositVault.address,
        {
          from: regularAccounts[0],
          revertMessage: 'WMAC: hasnt role',
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
      const { depositVaultWithMToken, owner, depositVault } = await loadFixture(
        defaultDeploy,
      );

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
          revertMessage: 'WMAC: hasnt role',
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

  describe('setMinAmount()', () => {
    it('should fail: call from address without DEPOSIT_VAULT_ADMIN_ROLE role', async () => {
      const { depositVaultWithMToken, regularAccounts, owner } =
        await loadFixture(defaultDeploy);
      await setMinAmountTest({ vault: depositVaultWithMToken, owner }, 10, {
        from: regularAccounts[0],
        revertMessage: 'WMAC: hasnt role',
      });
    });

    it('call from address with DEPOSIT_VAULT_ADMIN_ROLE role', async () => {
      const { depositVaultWithMToken, owner } = await loadFixture(
        defaultDeploy,
      );
      await setMinAmountTest({ vault: depositVaultWithMToken, owner }, 10);
    });
  });

  describe('setMinMTokenAmountForFirstDeposit()', () => {
    it('should fail: call from address without DEPOSIT_VAULT_ADMIN_ROLE role', async () => {
      const { depositVaultWithMToken, regularAccounts, owner } =
        await loadFixture(defaultDeploy);

      await setMinAmountToDepositTest(
        { depositVault: depositVaultWithMToken, owner },
        10,
        {
          from: regularAccounts[0],
          revertMessage: 'WMAC: hasnt role',
        },
      );
    });

    it('call from address with DEPOSIT_VAULT_ADMIN_ROLE role', async () => {
      const { depositVaultWithMToken, owner } = await loadFixture(
        defaultDeploy,
      );

      await setMinAmountToDepositTest(
        { depositVault: depositVaultWithMToken, owner },
        10,
      );
    });
  });

  describe('setVariabilityTolerance()', () => {
    it('should fail: call from address without DEPOSIT_VAULT_ADMIN_ROLE role', async () => {
      const { depositVaultWithMToken, regularAccounts, owner } =
        await loadFixture(defaultDeploy);

      await setVariabilityToleranceTest(
        { vault: depositVaultWithMToken, owner },
        100,
        {
          from: regularAccounts[0],
          revertMessage: 'WMAC: hasnt role',
        },
      );
    });

    it('call from address with DEPOSIT_VAULT_ADMIN_ROLE role', async () => {
      const { depositVaultWithMToken, owner } = await loadFixture(
        defaultDeploy,
      );

      await setVariabilityToleranceTest(
        { vault: depositVaultWithMToken, owner },
        100,
      );
    });
  });

  describe('setInstantDailyLimit()', () => {
    it('should fail: call from address without DEPOSIT_VAULT_ADMIN_ROLE role', async () => {
      const { depositVaultWithMToken, regularAccounts, owner } =
        await loadFixture(defaultDeploy);
      await setInstantDailyLimitTest(
        { vault: depositVaultWithMToken, owner },
        10,
        { from: regularAccounts[0], revertMessage: 'WMAC: hasnt role' },
      );
    });

    it('call from address with DEPOSIT_VAULT_ADMIN_ROLE role', async () => {
      const { depositVaultWithMToken, owner } = await loadFixture(
        defaultDeploy,
      );
      await setInstantDailyLimitTest(
        { vault: depositVaultWithMToken, owner },
        10,
      );
    });
  });

  describe('addPaymentToken()', () => {
    it('should fail: call from address without DEPOSIT_VAULT_ADMIN_ROLE role', async () => {
      const {
        depositVaultWithMToken,
        regularAccounts,
        owner,
        stableCoins,
        dataFeed,
      } = await loadFixture(defaultDeploy);
      await addPaymentTokenTest(
        { vault: depositVaultWithMToken, owner },
        stableCoins.usdc,
        dataFeed.address,
        0,
        true,
        constants.MaxUint256,
        { from: regularAccounts[0], revertMessage: 'WMAC: hasnt role' },
      );
    });

    it('call from address with DEPOSIT_VAULT_ADMIN_ROLE role', async () => {
      const { depositVaultWithMToken, owner, stableCoins, dataFeed } =
        await loadFixture(defaultDeploy);
      await addPaymentTokenTest(
        { vault: depositVaultWithMToken, owner },
        stableCoins.usdc,
        dataFeed.address,
        0,
        true,
      );
    });
  });

  describe('removePaymentToken()', () => {
    it('should fail: call from address without DEPOSIT_VAULT_ADMIN_ROLE role', async () => {
      const { depositVaultWithMToken, regularAccounts, owner, stableCoins } =
        await loadFixture(defaultDeploy);
      await removePaymentTokenTest(
        { vault: depositVaultWithMToken, owner },
        stableCoins.usdc,
        { from: regularAccounts[0], revertMessage: 'WMAC: hasnt role' },
      );
    });

    it('call from address with DEPOSIT_VAULT_ADMIN_ROLE role', async () => {
      const { depositVaultWithMToken, owner, stableCoins, dataFeed } =
        await loadFixture(defaultDeploy);
      await addPaymentTokenTest(
        { vault: depositVaultWithMToken, owner },
        stableCoins.usdc,
        dataFeed.address,
        0,
        true,
      );
      await removePaymentTokenTest(
        { vault: depositVaultWithMToken, owner },
        stableCoins.usdc,
      );
    });
  });

  describe('addWaivedFeeAccount()', () => {
    it('should fail: call from address without DEPOSIT_VAULT_ADMIN_ROLE role', async () => {
      const { depositVaultWithMToken, regularAccounts, owner } =
        await loadFixture(defaultDeploy);
      await addWaivedFeeAccountTest(
        { vault: depositVaultWithMToken, owner },
        regularAccounts[0].address,
        { from: regularAccounts[0], revertMessage: 'WMAC: hasnt role' },
      );
    });

    it('call from address with DEPOSIT_VAULT_ADMIN_ROLE role', async () => {
      const { depositVaultWithMToken, regularAccounts, owner } =
        await loadFixture(defaultDeploy);
      await addWaivedFeeAccountTest(
        { vault: depositVaultWithMToken, owner },
        regularAccounts[0].address,
      );
    });
  });

  describe('removeWaivedFeeAccount()', () => {
    it('should fail: call from address without DEPOSIT_VAULT_ADMIN_ROLE role', async () => {
      const { depositVaultWithMToken, regularAccounts, owner } =
        await loadFixture(defaultDeploy);
      await removeWaivedFeeAccountTest(
        { vault: depositVaultWithMToken, owner },
        regularAccounts[0].address,
        { from: regularAccounts[0], revertMessage: 'WMAC: hasnt role' },
      );
    });

    it('call from address with DEPOSIT_VAULT_ADMIN_ROLE role', async () => {
      const { depositVaultWithMToken, regularAccounts, owner } =
        await loadFixture(defaultDeploy);
      await addWaivedFeeAccountTest(
        { vault: depositVaultWithMToken, owner },
        regularAccounts[0].address,
      );
      await removeWaivedFeeAccountTest(
        { vault: depositVaultWithMToken, owner },
        regularAccounts[0].address,
      );
    });
  });

  describe('setFee()', () => {
    it('should fail: call from address without DEPOSIT_VAULT_ADMIN_ROLE role', async () => {
      const { depositVaultWithMToken, regularAccounts, owner } =
        await loadFixture(defaultDeploy);
      await setInstantFeeTest({ vault: depositVaultWithMToken, owner }, 100, {
        from: regularAccounts[0],
        revertMessage: 'WMAC: hasnt role',
      });
    });

    it('call from address with DEPOSIT_VAULT_ADMIN_ROLE role', async () => {
      const { depositVaultWithMToken, owner } = await loadFixture(
        defaultDeploy,
      );
      await setInstantFeeTest({ vault: depositVaultWithMToken, owner }, 100);
    });
  });

  describe('withdrawToken()', () => {
    it('should fail: call from address without DEPOSIT_VAULT_ADMIN_ROLE role', async () => {
      const { depositVaultWithMToken, regularAccounts, owner, stableCoins } =
        await loadFixture(defaultDeploy);
      await withdrawTest(
        { vault: depositVaultWithMToken, owner },
        stableCoins.usdc.address,
        0,
        owner,
        { from: regularAccounts[0], revertMessage: 'WMAC: hasnt role' },
      );
    });

    it('call from address with DEPOSIT_VAULT_ADMIN_ROLE role', async () => {
      const { depositVaultWithMToken, owner, stableCoins } = await loadFixture(
        defaultDeploy,
      );
      await mintToken(stableCoins.usdc, depositVaultWithMToken, 1);
      await withdrawTest(
        { vault: depositVaultWithMToken, owner },
        stableCoins.usdc,
        1,
        owner,
      );
    });
  });

  describe('changeTokenAllowance()', () => {
    it('should fail: call from address without DEPOSIT_VAULT_ADMIN_ROLE role', async () => {
      const { depositVaultWithMToken, regularAccounts, owner, stableCoins } =
        await loadFixture(defaultDeploy);
      await changeTokenAllowanceTest(
        { vault: depositVaultWithMToken, owner },
        stableCoins.usdc.address,
        100,
        { from: regularAccounts[0], revertMessage: 'WMAC: hasnt role' },
      );
    });

    it('call from address with DEPOSIT_VAULT_ADMIN_ROLE role', async () => {
      const { depositVaultWithMToken, owner, stableCoins, dataFeed } =
        await loadFixture(defaultDeploy);
      await addPaymentTokenTest(
        { vault: depositVaultWithMToken, owner },
        stableCoins.usdc,
        dataFeed.address,
        0,
        true,
      );
      await changeTokenAllowanceTest(
        { vault: depositVaultWithMToken, owner },
        stableCoins.usdc.address,
        parseUnits('200'),
      );
    });
  });

  describe('changeTokenFee()', () => {
    it('should fail: call from address without DEPOSIT_VAULT_ADMIN_ROLE role', async () => {
      const { depositVaultWithMToken, regularAccounts, owner, stableCoins } =
        await loadFixture(defaultDeploy);
      await changeTokenFeeTest(
        { vault: depositVaultWithMToken, owner },
        stableCoins.usdc.address,
        100,
        { from: regularAccounts[0], revertMessage: 'WMAC: hasnt role' },
      );
    });

    it('call from address with DEPOSIT_VAULT_ADMIN_ROLE role', async () => {
      const { depositVaultWithMToken, owner, stableCoins, dataFeed } =
        await loadFixture(defaultDeploy);
      await addPaymentTokenTest(
        { vault: depositVaultWithMToken, owner },
        stableCoins.usdc,
        dataFeed.address,
        0,
        true,
      );
      await changeTokenFeeTest(
        { vault: depositVaultWithMToken, owner },
        stableCoins.usdc.address,
        100,
      );
    });
  });

  describe('depositInstant()', async () => {
    it('should fail: when there is no token in vault', async () => {
      const {
        owner,
        depositVaultWithMToken,
        stableCoins,
        mTBILL,
        mTokenToUsdDataFeed,
        regularAccounts,
      } = await loadFixture(defaultDeploy);

      await mintToken(stableCoins.usdc, regularAccounts[0], 100);
      await approveBase18(
        regularAccounts[0],
        stableCoins.usdc,
        depositVaultWithMToken,
        100,
      );

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
          revertMessage: 'MV: token not exists',
        },
      );
    });

    it('should fail: when function paused', async () => {
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

      await pauseVault(depositVaultWithMToken, {
        from: owner,
      });

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
          revertMessage: 'Pausable: paused',
        },
      );
    });

    it('should fail: user in blacklist', async () => {
      const {
        owner,
        depositVaultWithMToken,
        stableCoins,
        mTBILL,
        mTokenToUsdDataFeed,
        regularAccounts,
        dataFeed,
        accessControl,
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

      await blackList(
        { blacklistable: depositVaultWithMToken, accessControl, owner },
        regularAccounts[0],
      );

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
          revertMessage: acErrors.WMAC_HAS_ROLE,
        },
      );
    });

    it('should fail: user in sanctions list', async () => {
      const {
        owner,
        depositVaultWithMToken,
        stableCoins,
        mTBILL,
        mTokenToUsdDataFeed,
        regularAccounts,
        dataFeed,
        mockedSanctionsList,
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

      await sanctionUser(
        { sanctionsList: mockedSanctionsList },
        regularAccounts[0],
      );

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
          revertMessage: 'WSL: sanctioned',
        },
      );
    });

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

    it('deposit with greenlist enabled and user in greenlist', async () => {
      const {
        owner,
        depositVaultWithMToken,
        depositVault,
        stableCoins,
        mTBILL,
        greenListableTester,
        mTokenToUsdDataFeed,
        accessControl,
        regularAccounts,
        dataFeed,
      } = await loadFixture(defaultDeploy);

      await depositVaultWithMToken.setGreenlistEnable(true);

      await greenList(
        { greenlistable: greenListableTester, accessControl, owner },
        regularAccounts[0],
      );

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

    it('deposit with custom recipient, mTokenDepositsEnabled is true', async () => {
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
          customRecipient: regularAccounts[1],
        },
        stableCoins.usdc,
        100,
        {
          from: regularAccounts[0],
        },
      );
    });

    it('deposit with custom recipient, mTokenDepositsEnabled is false', async () => {
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
          customRecipient: regularAccounts[1],
        },
        stableCoins.usdc,
        100,
        {
          from: regularAccounts[0],
        },
      );
    });

    it('should fail: greenlist enabled and user not in greenlist', async () => {
      const {
        owner,
        depositVaultWithMToken,
        stableCoins,
        mTBILL,
        mTokenToUsdDataFeed,
        regularAccounts,
        dataFeed,
      } = await loadFixture(defaultDeploy);

      await depositVaultWithMToken.setGreenlistEnable(true);

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
        },
        stableCoins.usdc,
        100,
        {
          from: regularAccounts[0],
          revertMessage: acErrors.WMAC_HASNT_ROLE,
        },
      );
    });

    it('should fail: first deposit mint amount below configured minimum', async () => {
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
      await setMinAmountTest({ vault: depositVaultWithMToken, owner }, 0);
      await setMinAmountToDepositTest(
        { depositVault: depositVaultWithMToken, owner },
        200,
      );

      await mintToken(stableCoins.usdc, owner, 100);
      await approveBase18(owner, stableCoins.usdc, depositVaultWithMToken, 100);
      await addPaymentTokenTest(
        { vault: depositVaultWithMToken, owner },
        stableCoins.usdc,
        dataFeed.address,
        0,
        true,
      );

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
          revertMessage: 'DV: mint amount < min',
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
      await approveBase18(owner, stableCoins.dai, depositVaultWithMToken, 100);
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
          revertMessage: 'MV: token not exists',
        },
      );
    });
  });

  describe('depositRequest()', () => {
    it('deposit request 100 USDC', async () => {
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

      await depositRequestTest(
        {
          depositVault: depositVaultWithMToken,
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
  });

  describe('approveRequest()', () => {
    it('should fail: call from address without DEPOSIT_VAULT_ADMIN_ROLE role', async () => {
      const {
        owner,
        regularAccounts,
        depositVaultWithMToken,
        stableCoins,
        mTBILL,
        mTokenToUsdDataFeed,
        dataFeed,
      } = await loadFixture(defaultDeploy);

      await mintToken(stableCoins.usdc, owner, 100);
      await approveBase18(owner, stableCoins.usdc, depositVaultWithMToken, 100);
      await addPaymentTokenTest(
        { vault: depositVaultWithMToken, owner },
        stableCoins.usdc,
        dataFeed.address,
        0,
        true,
      );
      await setMinAmountTest({ vault: depositVaultWithMToken, owner }, 10);

      const request = await depositRequestTest(
        {
          depositVault: depositVaultWithMToken,
          owner,
          mTBILL,
          mTokenToUsdDataFeed,
        },
        stableCoins.usdc,
        100,
      );

      await approveRequestTest(
        {
          depositVault: depositVaultWithMToken,
          owner,
          mTBILL,
          mTokenToUsdDataFeed,
        },
        request.requestId!,
        request.rate!,
        {
          from: regularAccounts[0],
          revertMessage: 'WMAC: hasnt role',
        },
      );
    });

    it('approve request: happy path', async () => {
      const {
        owner,
        depositVaultWithMToken,
        stableCoins,
        mTBILL,
        mTokenToUsdDataFeed,
        dataFeed,
      } = await loadFixture(defaultDeploy);

      await mintToken(stableCoins.usdc, owner, 100);
      await approveBase18(owner, stableCoins.usdc, depositVaultWithMToken, 100);
      await addPaymentTokenTest(
        { vault: depositVaultWithMToken, owner },
        stableCoins.usdc,
        dataFeed.address,
        0,
        true,
      );
      await setMinAmountTest({ vault: depositVaultWithMToken, owner }, 10);

      const request = await depositRequestTest(
        {
          depositVault: depositVaultWithMToken,
          owner,
          mTBILL,
          mTokenToUsdDataFeed,
        },
        stableCoins.usdc,
        100,
      );

      await approveRequestTest(
        {
          depositVault: depositVaultWithMToken,
          owner,
          mTBILL,
          mTokenToUsdDataFeed,
        },
        request.requestId!,
        request.rate!,
      );
    });
  });

  describe('safeApproveRequest()', () => {
    it('should fail: call from address without DEPOSIT_VAULT_ADMIN_ROLE role', async () => {
      const {
        owner,
        regularAccounts,
        depositVaultWithMToken,
        stableCoins,
        mTBILL,
        mTokenToUsdDataFeed,
        dataFeed,
      } = await loadFixture(defaultDeploy);

      await mintToken(stableCoins.usdc, owner, 100);
      await approveBase18(owner, stableCoins.usdc, depositVaultWithMToken, 100);
      await addPaymentTokenTest(
        { vault: depositVaultWithMToken, owner },
        stableCoins.usdc,
        dataFeed.address,
        0,
        true,
      );
      await setMinAmountTest({ vault: depositVaultWithMToken, owner }, 10);

      const request = await depositRequestTest(
        {
          depositVault: depositVaultWithMToken,
          owner,
          mTBILL,
          mTokenToUsdDataFeed,
        },
        stableCoins.usdc,
        100,
      );

      await safeApproveRequestTest(
        {
          depositVault: depositVaultWithMToken,
          owner,
          mTBILL,
          mTokenToUsdDataFeed,
        },
        request.requestId!,
        request.rate!,
        {
          from: regularAccounts[0],
          revertMessage: 'WMAC: hasnt role',
        },
      );
    });

    it('safe approve request: happy path', async () => {
      const {
        owner,
        depositVaultWithMToken,
        stableCoins,
        mTBILL,
        mTokenToUsdDataFeed,
        dataFeed,
      } = await loadFixture(defaultDeploy);

      await mintToken(stableCoins.usdc, owner, 100);
      await approveBase18(owner, stableCoins.usdc, depositVaultWithMToken, 100);
      await addPaymentTokenTest(
        { vault: depositVaultWithMToken, owner },
        stableCoins.usdc,
        dataFeed.address,
        0,
        true,
      );
      await setMinAmountTest({ vault: depositVaultWithMToken, owner }, 10);

      const request = await depositRequestTest(
        {
          depositVault: depositVaultWithMToken,
          owner,
          mTBILL,
          mTokenToUsdDataFeed,
        },
        stableCoins.usdc,
        100,
      );

      await safeApproveRequestTest(
        {
          depositVault: depositVaultWithMToken,
          owner,
          mTBILL,
          mTokenToUsdDataFeed,
        },
        request.requestId!,
        request.rate!,
      );
    });
  });

  describe('safeBulkApproveRequest()', () => {
    it('should fail: call from address without DEPOSIT_VAULT_ADMIN_ROLE role', async () => {
      const {
        owner,
        regularAccounts,
        depositVaultWithMToken,
        stableCoins,
        mTBILL,
        mTokenToUsdDataFeed,
        dataFeed,
      } = await loadFixture(defaultDeploy);

      await mintToken(stableCoins.usdc, owner, 100);
      await approveBase18(owner, stableCoins.usdc, depositVaultWithMToken, 100);
      await addPaymentTokenTest(
        { vault: depositVaultWithMToken, owner },
        stableCoins.usdc,
        dataFeed.address,
        0,
        true,
      );
      await setMinAmountTest({ vault: depositVaultWithMToken, owner }, 10);

      const request = await depositRequestTest(
        {
          depositVault: depositVaultWithMToken,
          owner,
          mTBILL,
          mTokenToUsdDataFeed,
        },
        stableCoins.usdc,
        100,
      );

      await safeBulkApproveRequestTest(
        {
          depositVault: depositVaultWithMToken,
          owner,
          mTBILL,
          mTokenToUsdDataFeed,
        },
        [{ id: request.requestId! }],
        request.rate!,
        {
          from: regularAccounts[0],
          revertMessage: 'WMAC: hasnt role',
        },
      );
    });

    it('safe bulk approve request: happy path', async () => {
      const {
        owner,
        depositVaultWithMToken,
        stableCoins,
        mTBILL,
        mTokenToUsdDataFeed,
        dataFeed,
      } = await loadFixture(defaultDeploy);

      await mintToken(stableCoins.usdc, owner, 100);
      await approveBase18(owner, stableCoins.usdc, depositVaultWithMToken, 100);
      await addPaymentTokenTest(
        { vault: depositVaultWithMToken, owner },
        stableCoins.usdc,
        dataFeed.address,
        0,
        true,
      );
      await setMinAmountTest({ vault: depositVaultWithMToken, owner }, 10);

      const request = await depositRequestTest(
        {
          depositVault: depositVaultWithMToken,
          owner,
          mTBILL,
          mTokenToUsdDataFeed,
        },
        stableCoins.usdc,
        100,
      );

      await safeBulkApproveRequestTest(
        {
          depositVault: depositVaultWithMToken,
          owner,
          mTBILL,
          mTokenToUsdDataFeed,
        },
        [{ id: request.requestId! }],
        request.rate!,
      );
    });
  });

  describe('rejectRequest()', () => {
    it('should fail: call from address without DEPOSIT_VAULT_ADMIN_ROLE role', async () => {
      const {
        owner,
        regularAccounts,
        depositVaultWithMToken,
        stableCoins,
        mTBILL,
        mTokenToUsdDataFeed,
        dataFeed,
      } = await loadFixture(defaultDeploy);

      await mintToken(stableCoins.usdc, owner, 100);
      await approveBase18(owner, stableCoins.usdc, depositVaultWithMToken, 100);
      await addPaymentTokenTest(
        { vault: depositVaultWithMToken, owner },
        stableCoins.usdc,
        dataFeed.address,
        0,
        true,
      );
      await setMinAmountTest({ vault: depositVaultWithMToken, owner }, 10);

      const request = await depositRequestTest(
        {
          depositVault: depositVaultWithMToken,
          owner,
          mTBILL,
          mTokenToUsdDataFeed,
        },
        stableCoins.usdc,
        100,
      );

      await rejectRequestTest(
        {
          depositVault: depositVaultWithMToken,
          owner,
          mTBILL,
          mTokenToUsdDataFeed,
        },
        request.requestId!,
        {
          from: regularAccounts[0],
          revertMessage: 'WMAC: hasnt role',
        },
      );
    });

    it('reject request: happy path', async () => {
      const {
        owner,
        depositVaultWithMToken,
        stableCoins,
        mTBILL,
        mTokenToUsdDataFeed,
        dataFeed,
      } = await loadFixture(defaultDeploy);

      await mintToken(stableCoins.usdc, owner, 100);
      await approveBase18(owner, stableCoins.usdc, depositVaultWithMToken, 100);
      await addPaymentTokenTest(
        { vault: depositVaultWithMToken, owner },
        stableCoins.usdc,
        dataFeed.address,
        0,
        true,
      );
      await setMinAmountTest({ vault: depositVaultWithMToken, owner }, 10);

      const request = await depositRequestTest(
        {
          depositVault: depositVaultWithMToken,
          owner,
          mTBILL,
          mTokenToUsdDataFeed,
        },
        stableCoins.usdc,
        100,
      );

      await rejectRequestTest(
        {
          depositVault: depositVaultWithMToken,
          owner,
          mTBILL,
          mTokenToUsdDataFeed,
        },
        request.requestId!,
      );
    });
  });
});
