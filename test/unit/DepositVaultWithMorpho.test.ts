import { loadFixture } from '@nomicfoundation/hardhat-network-helpers';
import { expect } from 'chai';
import { constants } from 'ethers';
import { parseUnits } from 'ethers/lib/utils';
import { ethers } from 'hardhat';

import { MorphoVaultMock__factory } from '../../typechain-types';
import { acErrors, blackList, greenList } from '../common/ac.helpers';
import { approveBase18, mintToken, pauseVault } from '../common/common.helpers';
import {
  depositInstantWithMorphoTest,
  removeMorphoVaultTest,
  setMorphoDepositsEnabledTest,
  setMorphoVaultTest,
} from '../common/deposit-vault-morpho.helpers';
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
  changeTokenFeeTest,
  removePaymentTokenTest,
  removeWaivedFeeAccountTest,
  setInstantDailyLimitTest,
  setMinAmountToDepositTest,
  setMinAmountTest,
  setVariabilityToleranceTest,
  withdrawTest,
} from '../common/manageable-vault.helpers';

describe('DepositVaultWithMorpho', function () {
  it('deployment', async () => {
    const {
      depositVaultWithMorpho,
      mTBILL,
      tokensReceiver,
      feeReceiver,
      mTokenToUsdDataFeed,
      roles,
    } = await loadFixture(defaultDeploy);

    expect(await depositVaultWithMorpho.mToken()).eq(mTBILL.address);
    expect(await depositVaultWithMorpho.paused()).eq(false);
    expect(await depositVaultWithMorpho.tokensReceiver()).eq(
      tokensReceiver.address,
    );
    expect(await depositVaultWithMorpho.feeReceiver()).eq(feeReceiver.address);
    expect(await depositVaultWithMorpho.ONE_HUNDRED_PERCENT()).eq('10000');
    expect(await depositVaultWithMorpho.minMTokenAmountForFirstDeposit()).eq(
      '0',
    );
    expect(await depositVaultWithMorpho.minAmount()).eq(parseUnits('100'));
    expect(await depositVaultWithMorpho.instantFee()).eq('100');
    expect(await depositVaultWithMorpho.instantDailyLimit()).eq(
      parseUnits('100000'),
    );
    expect(await depositVaultWithMorpho.mTokenDataFeed()).eq(
      mTokenToUsdDataFeed.address,
    );
    expect(await depositVaultWithMorpho.variationTolerance()).eq(1);
    expect(await depositVaultWithMorpho.vaultRole()).eq(
      roles.tokenRoles.mTBILL.depositVaultAdmin,
    );
    expect(await depositVaultWithMorpho.MANUAL_FULLFILMENT_TOKEN()).eq(
      ethers.constants.AddressZero,
    );
    expect(await depositVaultWithMorpho.morphoDepositsEnabled()).eq(false);
  });

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
          revertMessage: 'WMAC: hasnt role',
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
      const { depositVaultWithMorpho, owner, stableCoins } = await loadFixture(
        defaultDeploy,
      );

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
      const { depositVaultWithMorpho, owner, stableCoins, morphoVaultMock } =
        await loadFixture(defaultDeploy);

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
      const { depositVaultWithMorpho, owner, stableCoins, morphoVaultMock } =
        await loadFixture(defaultDeploy);

      await setMorphoVaultTest(
        { depositVaultWithMorpho, owner },
        stableCoins.usdc.address,
        morphoVaultMock.address,
      );
    });
  });

  describe('removeMorphoVault()', () => {
    it('should fail: call from address without DEPOSIT_VAULT_ADMIN_ROLE role', async () => {
      const { depositVaultWithMorpho, owner, regularAccounts, stableCoins } =
        await loadFixture(defaultDeploy);

      await removeMorphoVaultTest(
        { depositVaultWithMorpho, owner },
        stableCoins.usdc.address,
        {
          from: regularAccounts[0],
          revertMessage: 'WMAC: hasnt role',
        },
      );
    });

    it('should fail: vault not set', async () => {
      const { depositVaultWithMorpho, owner, stableCoins } = await loadFixture(
        defaultDeploy,
      );

      await removeMorphoVaultTest(
        { depositVaultWithMorpho, owner },
        stableCoins.usdc.address,
        {
          revertMessage: 'DVM: vault not set',
        },
      );
    });

    it('call from address with DEPOSIT_VAULT_ADMIN_ROLE role', async () => {
      const { depositVaultWithMorpho, owner, stableCoins, morphoVaultMock } =
        await loadFixture(defaultDeploy);

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
          revertMessage: 'WMAC: hasnt role',
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

  describe('setMinAmount()', () => {
    it('should fail: call from address without DEPOSIT_VAULT_ADMIN_ROLE role', async () => {
      const { depositVaultWithMorpho, regularAccounts, owner } =
        await loadFixture(defaultDeploy);
      await setMinAmountTest({ vault: depositVaultWithMorpho, owner }, 10, {
        from: regularAccounts[0],
        revertMessage: 'WMAC: hasnt role',
      });
    });

    it('call from address with DEPOSIT_VAULT_ADMIN_ROLE role', async () => {
      const { depositVaultWithMorpho, owner } = await loadFixture(
        defaultDeploy,
      );
      await setMinAmountTest({ vault: depositVaultWithMorpho, owner }, 10);
    });
  });

  describe('setMinMTokenAmountForFirstDeposit()', () => {
    it('should fail: call from address without DEPOSIT_VAULT_ADMIN_ROLE role', async () => {
      const { depositVaultWithMorpho, regularAccounts, owner } =
        await loadFixture(defaultDeploy);

      await setMinAmountToDepositTest(
        { depositVault: depositVaultWithMorpho, owner },
        10,
        {
          from: regularAccounts[0],
          revertMessage: 'WMAC: hasnt role',
        },
      );
    });

    it('call from address with DEPOSIT_VAULT_ADMIN_ROLE role', async () => {
      const { depositVaultWithMorpho, owner } = await loadFixture(
        defaultDeploy,
      );

      await setMinAmountToDepositTest(
        { depositVault: depositVaultWithMorpho, owner },
        10,
      );
    });
  });

  describe('setInstantDailyLimit()', () => {
    it('should fail: call from address without DEPOSIT_VAULT_ADMIN_ROLE role', async () => {
      const { depositVaultWithMorpho, regularAccounts, owner } =
        await loadFixture(defaultDeploy);

      await setInstantDailyLimitTest(
        { vault: depositVaultWithMorpho, owner },
        10,
        {
          from: regularAccounts[0],
          revertMessage: 'WMAC: hasnt role',
        },
      );
    });

    it('call from address with DEPOSIT_VAULT_ADMIN_ROLE role', async () => {
      const { depositVaultWithMorpho, owner } = await loadFixture(
        defaultDeploy,
      );

      await setInstantDailyLimitTest(
        { vault: depositVaultWithMorpho, owner },
        10,
      );
    });
  });

  describe('setVariabilityTolerance()', () => {
    it('should fail: call from address without DEPOSIT_VAULT_ADMIN_ROLE role', async () => {
      const { depositVaultWithMorpho, regularAccounts, owner } =
        await loadFixture(defaultDeploy);

      await setVariabilityToleranceTest(
        { vault: depositVaultWithMorpho, owner },
        100,
        {
          from: regularAccounts[0],
          revertMessage: 'WMAC: hasnt role',
        },
      );
    });

    it('call from address with DEPOSIT_VAULT_ADMIN_ROLE role', async () => {
      const { depositVaultWithMorpho, owner } = await loadFixture(
        defaultDeploy,
      );

      await setVariabilityToleranceTest(
        { vault: depositVaultWithMorpho, owner },
        100,
      );
    });
  });

  describe('addPaymentToken()', () => {
    it('should fail: call from address without DEPOSIT_VAULT_ADMIN_ROLE role', async () => {
      const {
        depositVaultWithMorpho,
        regularAccounts,
        owner,
        stableCoins,
        dataFeed,
      } = await loadFixture(defaultDeploy);
      await addPaymentTokenTest(
        { vault: depositVaultWithMorpho, owner },
        stableCoins.usdc,
        dataFeed.address,
        0,
        true,
        constants.MaxUint256,
        { from: regularAccounts[0], revertMessage: 'WMAC: hasnt role' },
      );
    });

    it('call from address with DEPOSIT_VAULT_ADMIN_ROLE role', async () => {
      const { depositVaultWithMorpho, owner, stableCoins, dataFeed } =
        await loadFixture(defaultDeploy);
      await addPaymentTokenTest(
        { vault: depositVaultWithMorpho, owner },
        stableCoins.usdc,
        dataFeed.address,
        0,
        true,
      );
    });
  });

  describe('removePaymentToken()', () => {
    it('should fail: call from address without DEPOSIT_VAULT_ADMIN_ROLE role', async () => {
      const { depositVaultWithMorpho, regularAccounts, owner, stableCoins } =
        await loadFixture(defaultDeploy);

      await removePaymentTokenTest(
        { vault: depositVaultWithMorpho, owner },
        stableCoins.usdc,
        {
          from: regularAccounts[0],
          revertMessage: 'WMAC: hasnt role',
        },
      );
    });

    it('call from address with DEPOSIT_VAULT_ADMIN_ROLE role', async () => {
      const { depositVaultWithMorpho, owner, stableCoins, dataFeed } =
        await loadFixture(defaultDeploy);
      await addPaymentTokenTest(
        { vault: depositVaultWithMorpho, owner },
        stableCoins.usdc,
        dataFeed.address,
        0,
        true,
      );
      await removePaymentTokenTest(
        { vault: depositVaultWithMorpho, owner },
        stableCoins.usdc,
      );
    });
  });

  describe('addWaivedFeeAccount()', () => {
    it('should fail: call from address without DEPOSIT_VAULT_ADMIN_ROLE role', async () => {
      const { depositVaultWithMorpho, regularAccounts, owner } =
        await loadFixture(defaultDeploy);
      await addWaivedFeeAccountTest(
        { vault: depositVaultWithMorpho, owner },
        regularAccounts[1].address,
        {
          from: regularAccounts[0],
          revertMessage: 'WMAC: hasnt role',
        },
      );
    });

    it('call from address with DEPOSIT_VAULT_ADMIN_ROLE role', async () => {
      const { depositVaultWithMorpho, regularAccounts, owner } =
        await loadFixture(defaultDeploy);
      await addWaivedFeeAccountTest(
        { vault: depositVaultWithMorpho, owner },
        regularAccounts[0].address,
      );
    });
  });

  describe('removeWaivedFeeAccount()', () => {
    it('should fail: call from address without DEPOSIT_VAULT_ADMIN_ROLE role', async () => {
      const { depositVaultWithMorpho, regularAccounts, owner } =
        await loadFixture(defaultDeploy);

      await addWaivedFeeAccountTest(
        { vault: depositVaultWithMorpho, owner },
        regularAccounts[1].address,
      );

      await removeWaivedFeeAccountTest(
        { vault: depositVaultWithMorpho, owner },
        regularAccounts[1].address,
        {
          from: regularAccounts[0],
          revertMessage: 'WMAC: hasnt role',
        },
      );
    });

    it('call from address with DEPOSIT_VAULT_ADMIN_ROLE role', async () => {
      const { depositVaultWithMorpho, regularAccounts, owner } =
        await loadFixture(defaultDeploy);

      await addWaivedFeeAccountTest(
        { vault: depositVaultWithMorpho, owner },
        regularAccounts[0].address,
      );
      await removeWaivedFeeAccountTest(
        { vault: depositVaultWithMorpho, owner },
        regularAccounts[0].address,
      );
    });
  });

  describe('withdrawToken()', () => {
    it('should fail: call from address without DEPOSIT_VAULT_ADMIN_ROLE role', async () => {
      const { depositVaultWithMorpho, owner, stableCoins, regularAccounts } =
        await loadFixture(defaultDeploy);
      await mintToken(stableCoins.usdc, depositVaultWithMorpho, 1);
      await withdrawTest(
        { vault: depositVaultWithMorpho, owner },
        stableCoins.usdc.address,
        1,
        owner,
        {
          from: regularAccounts[0],
          revertMessage: 'WMAC: hasnt role',
        },
      );
    });

    it('call from address with DEPOSIT_VAULT_ADMIN_ROLE role', async () => {
      const { depositVaultWithMorpho, owner, stableCoins } = await loadFixture(
        defaultDeploy,
      );
      await mintToken(stableCoins.usdc, depositVaultWithMorpho, 100);
      const usdcDecimals = await stableCoins.usdc.decimals();
      await withdrawTest(
        { vault: depositVaultWithMorpho, owner },
        stableCoins.usdc,
        parseUnits('100', usdcDecimals),
        owner,
      );
    });
  });

  describe('changeTokenAllowance()', () => {
    it('should fail: call from address without DEPOSIT_VAULT_ADMIN_ROLE role', async () => {
      const { depositVaultWithMorpho, owner, stableCoins, regularAccounts } =
        await loadFixture(defaultDeploy);
      await changeTokenAllowanceTest(
        { vault: depositVaultWithMorpho, owner },
        stableCoins.usdc.address,
        100,
        {
          from: regularAccounts[0],
          revertMessage: 'WMAC: hasnt role',
        },
      );
    });

    it('call from address with DEPOSIT_VAULT_ADMIN_ROLE role', async () => {
      const { depositVaultWithMorpho, owner, stableCoins, dataFeed } =
        await loadFixture(defaultDeploy);
      await addPaymentTokenTest(
        { vault: depositVaultWithMorpho, owner },
        stableCoins.usdc,
        dataFeed.address,
        0,
        true,
      );
      await changeTokenAllowanceTest(
        { vault: depositVaultWithMorpho, owner },
        stableCoins.usdc.address,
        parseUnits('200'),
      );
    });
  });

  describe('changeTokenFee()', () => {
    it('should fail: call from address without DEPOSIT_VAULT_ADMIN_ROLE role', async () => {
      const { depositVaultWithMorpho, owner, stableCoins, regularAccounts } =
        await loadFixture(defaultDeploy);
      await changeTokenFeeTest(
        { vault: depositVaultWithMorpho, owner },
        stableCoins.usdc.address,
        100,
        {
          from: regularAccounts[0],
          revertMessage: 'WMAC: hasnt role',
        },
      );
    });

    it('call from address with DEPOSIT_VAULT_ADMIN_ROLE role', async () => {
      const { depositVaultWithMorpho, owner, stableCoins, dataFeed } =
        await loadFixture(defaultDeploy);
      await addPaymentTokenTest(
        { vault: depositVaultWithMorpho, owner },
        stableCoins.usdc,
        dataFeed.address,
        0,
        true,
      );
      await changeTokenFeeTest(
        { vault: depositVaultWithMorpho, owner },
        stableCoins.usdc.address,
        100,
      );
    });
  });

  describe('depositInstant()', async () => {
    it('should fail: when there is no token in vault', async () => {
      const {
        owner,
        depositVaultWithMorpho,
        stableCoins,
        mTBILL,
        mTokenToUsdDataFeed,
        regularAccounts,
        morphoVaultMock,
      } = await loadFixture(defaultDeploy);

      await mintToken(stableCoins.usdc, regularAccounts[0], 100);
      await approveBase18(
        regularAccounts[0],
        stableCoins.usdc,
        depositVaultWithMorpho,
        100,
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
          revertMessage: 'MV: token not exists',
        },
      );
    });

    it('should fail: when function paused', async () => {
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

      await pauseVault(depositVaultWithMorpho, {
        from: owner,
      });

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
          revertMessage: 'Pausable: paused',
        },
      );
    });

    it('should fail: user in blacklist', async () => {
      const {
        owner,
        depositVaultWithMorpho,
        stableCoins,
        mTBILL,
        mTokenToUsdDataFeed,
        regularAccounts,
        dataFeed,
        accessControl,
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

      await blackList(
        { blacklistable: depositVaultWithMorpho, accessControl, owner },
        regularAccounts[0],
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
          revertMessage: acErrors.WMAC_HAS_ROLE,
        },
      );
    });

    it('should fail: morphoDepositsEnabled but no vault for token', async () => {
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
          revertMessage: 'DVM: no vault for token',
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
      await approveBase18(owner, stableCoins.usdc, depositVaultWithMorpho, 1);
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

    it('deposit with waived fee', async () => {
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

      await addWaivedFeeAccountTest(
        { vault: depositVaultWithMorpho, owner },
        regularAccounts[0].address,
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
          waivedFee: true,
        },
        stableCoins.usdc,
        100,
        {
          from: regularAccounts[0],
        },
      );
    });

    it('deposit with greenlist enabled and user in greenlist', async () => {
      const {
        owner,
        depositVaultWithMorpho,
        stableCoins,
        mTBILL,
        greenListableTester,
        mTokenToUsdDataFeed,
        accessControl,
        regularAccounts,
        dataFeed,
        morphoVaultMock,
      } = await loadFixture(defaultDeploy);

      await depositVaultWithMorpho.setGreenlistEnable(true);

      await greenList(
        { greenlistable: greenListableTester, accessControl, owner },
        regularAccounts[0],
      );

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

      const daiMorphoVault = await new MorphoVaultMock__factory(owner).deploy(
        stableCoins.dai.address,
      );
      await stableCoins.dai.mint(daiMorphoVault.address, parseUnits('1000000'));

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
    it('deposit request 100 USDC', async () => {
      const {
        owner,
        depositVaultWithMorpho,
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

      await depositRequestTest(
        {
          depositVault: depositVaultWithMorpho,
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
        depositVaultWithMorpho,
        stableCoins,
        mTBILL,
        mTokenToUsdDataFeed,
        dataFeed,
      } = await loadFixture(defaultDeploy);

      await mintToken(stableCoins.usdc, owner, 100);
      await approveBase18(owner, stableCoins.usdc, depositVaultWithMorpho, 100);
      await addPaymentTokenTest(
        { vault: depositVaultWithMorpho, owner },
        stableCoins.usdc,
        dataFeed.address,
        0,
        true,
      );
      await setMinAmountTest({ vault: depositVaultWithMorpho, owner }, 10);

      const request = await depositRequestTest(
        {
          depositVault: depositVaultWithMorpho,
          owner,
          mTBILL,
          mTokenToUsdDataFeed,
        },
        stableCoins.usdc,
        100,
      );

      await approveRequestTest(
        {
          depositVault: depositVaultWithMorpho,
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
        depositVaultWithMorpho,
        stableCoins,
        mTBILL,
        mTokenToUsdDataFeed,
        dataFeed,
      } = await loadFixture(defaultDeploy);

      await mintToken(stableCoins.usdc, owner, 100);
      await approveBase18(owner, stableCoins.usdc, depositVaultWithMorpho, 100);
      await addPaymentTokenTest(
        { vault: depositVaultWithMorpho, owner },
        stableCoins.usdc,
        dataFeed.address,
        0,
        true,
      );
      await setMinAmountTest({ vault: depositVaultWithMorpho, owner }, 10);

      const request = await depositRequestTest(
        {
          depositVault: depositVaultWithMorpho,
          owner,
          mTBILL,
          mTokenToUsdDataFeed,
        },
        stableCoins.usdc,
        100,
      );

      await approveRequestTest(
        {
          depositVault: depositVaultWithMorpho,
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
        depositVaultWithMorpho,
        stableCoins,
        mTBILL,
        mTokenToUsdDataFeed,
        dataFeed,
      } = await loadFixture(defaultDeploy);

      await mintToken(stableCoins.usdc, owner, 100);
      await approveBase18(owner, stableCoins.usdc, depositVaultWithMorpho, 100);
      await addPaymentTokenTest(
        { vault: depositVaultWithMorpho, owner },
        stableCoins.usdc,
        dataFeed.address,
        0,
        true,
      );
      await setMinAmountTest({ vault: depositVaultWithMorpho, owner }, 10);

      const request = await depositRequestTest(
        {
          depositVault: depositVaultWithMorpho,
          owner,
          mTBILL,
          mTokenToUsdDataFeed,
        },
        stableCoins.usdc,
        100,
      );

      await safeApproveRequestTest(
        {
          depositVault: depositVaultWithMorpho,
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
        depositVaultWithMorpho,
        stableCoins,
        mTBILL,
        mTokenToUsdDataFeed,
        dataFeed,
      } = await loadFixture(defaultDeploy);

      await mintToken(stableCoins.usdc, owner, 100);
      await approveBase18(owner, stableCoins.usdc, depositVaultWithMorpho, 100);
      await addPaymentTokenTest(
        { vault: depositVaultWithMorpho, owner },
        stableCoins.usdc,
        dataFeed.address,
        0,
        true,
      );
      await setMinAmountTest({ vault: depositVaultWithMorpho, owner }, 10);

      const request = await depositRequestTest(
        {
          depositVault: depositVaultWithMorpho,
          owner,
          mTBILL,
          mTokenToUsdDataFeed,
        },
        stableCoins.usdc,
        100,
      );

      await safeApproveRequestTest(
        {
          depositVault: depositVaultWithMorpho,
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
        depositVaultWithMorpho,
        stableCoins,
        mTBILL,
        mTokenToUsdDataFeed,
        dataFeed,
      } = await loadFixture(defaultDeploy);

      await mintToken(stableCoins.usdc, owner, 100);
      await approveBase18(owner, stableCoins.usdc, depositVaultWithMorpho, 100);
      await addPaymentTokenTest(
        { vault: depositVaultWithMorpho, owner },
        stableCoins.usdc,
        dataFeed.address,
        0,
        true,
      );
      await setMinAmountTest({ vault: depositVaultWithMorpho, owner }, 10);

      const request = await depositRequestTest(
        {
          depositVault: depositVaultWithMorpho,
          owner,
          mTBILL,
          mTokenToUsdDataFeed,
        },
        stableCoins.usdc,
        100,
      );

      await safeBulkApproveRequestTest(
        {
          depositVault: depositVaultWithMorpho,
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
        depositVaultWithMorpho,
        stableCoins,
        mTBILL,
        mTokenToUsdDataFeed,
        dataFeed,
      } = await loadFixture(defaultDeploy);

      await mintToken(stableCoins.usdc, owner, 100);
      await approveBase18(owner, stableCoins.usdc, depositVaultWithMorpho, 100);
      await addPaymentTokenTest(
        { vault: depositVaultWithMorpho, owner },
        stableCoins.usdc,
        dataFeed.address,
        0,
        true,
      );
      await setMinAmountTest({ vault: depositVaultWithMorpho, owner }, 10);

      const request = await depositRequestTest(
        {
          depositVault: depositVaultWithMorpho,
          owner,
          mTBILL,
          mTokenToUsdDataFeed,
        },
        stableCoins.usdc,
        100,
      );

      await safeBulkApproveRequestTest(
        {
          depositVault: depositVaultWithMorpho,
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
        depositVaultWithMorpho,
        stableCoins,
        mTBILL,
        mTokenToUsdDataFeed,
        dataFeed,
      } = await loadFixture(defaultDeploy);

      await mintToken(stableCoins.usdc, owner, 100);
      await approveBase18(owner, stableCoins.usdc, depositVaultWithMorpho, 100);
      await addPaymentTokenTest(
        { vault: depositVaultWithMorpho, owner },
        stableCoins.usdc,
        dataFeed.address,
        0,
        true,
      );
      await setMinAmountTest({ vault: depositVaultWithMorpho, owner }, 10);

      const request = await depositRequestTest(
        {
          depositVault: depositVaultWithMorpho,
          owner,
          mTBILL,
          mTokenToUsdDataFeed,
        },
        stableCoins.usdc,
        100,
      );

      await rejectRequestTest(
        {
          depositVault: depositVaultWithMorpho,
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
        depositVaultWithMorpho,
        stableCoins,
        mTBILL,
        mTokenToUsdDataFeed,
        dataFeed,
      } = await loadFixture(defaultDeploy);

      await mintToken(stableCoins.usdc, owner, 100);
      await approveBase18(owner, stableCoins.usdc, depositVaultWithMorpho, 100);
      await addPaymentTokenTest(
        { vault: depositVaultWithMorpho, owner },
        stableCoins.usdc,
        dataFeed.address,
        0,
        true,
      );
      await setMinAmountTest({ vault: depositVaultWithMorpho, owner }, 10);

      const request = await depositRequestTest(
        {
          depositVault: depositVaultWithMorpho,
          owner,
          mTBILL,
          mTokenToUsdDataFeed,
        },
        stableCoins.usdc,
        100,
      );

      await rejectRequestTest(
        {
          depositVault: depositVaultWithMorpho,
          owner,
          mTBILL,
          mTokenToUsdDataFeed,
        },
        request.requestId!,
      );
    });
  });
});
