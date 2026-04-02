import { loadFixture } from '@nomicfoundation/hardhat-network-helpers';
import { expect } from 'chai';
import { constants } from 'ethers';
import { parseUnits } from 'ethers/lib/utils';
import { ethers } from 'hardhat';

import { encodeFnSelector } from '../../helpers/utils';
import { ManageableVaultTester__factory } from '../../typechain-types';
import { acErrors, blackList, greenList } from '../common/ac.helpers';
import {
  approveBase18,
  mintToken,
  pauseVault,
  pauseVaultFn,
} from '../common/common.helpers';
import { setRoundData } from '../common/data-feed.helpers';
import {
  depositInstantWithAaveTest,
  depositRequestWithAaveTest,
  removeAavePoolTest,
  setAaveDepositsEnabledTest,
  setAavePoolTest,
  setAutoInvestFallbackEnabledAaveTest,
} from '../common/deposit-vault-aave.helpers';
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
  setInstantLimitConfigTest,
  setMinAmountToDepositTest,
  setMinAmountTest,
  setVariabilityToleranceTest,
  withdrawTest,
  changeTokenFeeTest,
} from '../common/manageable-vault.helpers';
import { sanctionUser } from '../common/with-sanctions-list.helpers';

describe('DepositVaultWithAave', function () {
  it('deployment', async () => {
    const {
      depositVaultWithAave,
      mTBILL,
      tokensReceiver,
      feeReceiver,
      mTokenToUsdDataFeed,
      roles,
      aavePoolMock,
      stableCoins,
    } = await loadFixture(defaultDeploy);

    expect(await depositVaultWithAave.mToken()).eq(mTBILL.address);
    expect(await depositVaultWithAave.paused()).eq(false);
    expect(await depositVaultWithAave.tokensReceiver()).eq(
      tokensReceiver.address,
    );
    expect(await depositVaultWithAave.feeReceiver()).eq(feeReceiver.address);
    expect(await depositVaultWithAave.ONE_HUNDRED_PERCENT()).eq('10000');
    expect(await depositVaultWithAave.minMTokenAmountForFirstDeposit()).eq('0');
    expect(await depositVaultWithAave.minAmount()).eq(parseUnits('100'));
    expect(await depositVaultWithAave.instantFee()).eq('100');
    expect(await depositVaultWithAave.instantDailyLimit()).eq(
      parseUnits('100000'),
    );
    expect(await depositVaultWithAave.mTokenDataFeed()).eq(
      mTokenToUsdDataFeed.address,
    );
    expect(await depositVaultWithAave.variationTolerance()).eq(1);
    expect(await depositVaultWithAave.vaultRole()).eq(
      roles.tokenRoles.mTBILL.depositVaultAdmin,
    );
    expect(await depositVaultWithAave.MANUAL_FULLFILMENT_TOKEN()).eq(
      ethers.constants.AddressZero,
    );
    expect(await depositVaultWithAave.aavePools(stableCoins.usdc.address)).eq(
      aavePoolMock.address,
    );
    expect(await depositVaultWithAave.aaveDepositsEnabled()).eq(false);
  });

  describe('initialization', () => {
    it('should fail: call initialize() when already initialized', async () => {
      const { depositVaultWithAave } = await loadFixture(defaultDeploy);

      await expect(
        depositVaultWithAave.initialize(
          constants.AddressZero,
          {
            mToken: constants.AddressZero,
            mTokenDataFeed: constants.AddressZero,
          },
          {
            feeReceiver: constants.AddressZero,
            tokensReceiver: constants.AddressZero,
          },
          {
            instantFee: 0,
            instantDailyLimit: 0,
          },
          constants.AddressZero,
          0,
          0,
          0,
          0,
        ),
      ).revertedWith('Initializable: contract is already initialized');
    });

    it('should fail: call with initializing == false', async () => {
      const {
        owner,
        accessControl,
        mTBILL,
        tokensReceiver,
        feeReceiver,
        mTokenToUsdDataFeed,
        mockedSanctionsList,
      } = await loadFixture(defaultDeploy);

      const vault = await new ManageableVaultTester__factory(owner).deploy();

      await expect(
        vault.initializeWithoutInitializer(
          accessControl.address,
          {
            mToken: mTBILL.address,
            mTokenDataFeed: mTokenToUsdDataFeed.address,
          },
          {
            feeReceiver: feeReceiver.address,
            tokensReceiver: tokensReceiver.address,
          },
          {
            instantFee: 100,
            instantDailyLimit: parseUnits('100000'),
          },
          mockedSanctionsList.address,
          1,
          parseUnits('100'),
        ),
      ).revertedWith('Initializable: contract is not initializing');
    });
  });

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
          revertMessage: 'WMAC: hasnt role',
        },
      );
    });

    it('should fail: zero address', async () => {
      const { depositVaultWithAave, owner, stableCoins } = await loadFixture(
        defaultDeploy,
      );

      await setAavePoolTest(
        { depositVaultWithAave, owner },
        stableCoins.usdc.address,
        ethers.constants.AddressZero,
        {
          revertMessage: 'zero address',
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
          revertMessage: 'DVA: token not in pool',
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
          revertMessage: 'WMAC: hasnt role',
        },
      );
    });

    it('should fail: pool not set', async () => {
      const { depositVaultWithAave, owner, stableCoins } = await loadFixture(
        defaultDeploy,
      );

      await removeAavePoolTest(
        { depositVaultWithAave, owner },
        stableCoins.dai.address,
        {
          revertMessage: 'DVA: pool not set',
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

      await setAaveDepositsEnabledTest({ depositVaultWithAave, owner }, true, {
        from: regularAccounts[0],
        revertMessage: 'WMAC: hasnt role',
      });
    });

    it('call from address with DEPOSIT_VAULT_ADMIN_ROLE role', async () => {
      const { depositVaultWithAave, owner } = await loadFixture(defaultDeploy);

      await setAaveDepositsEnabledTest({ depositVaultWithAave, owner }, true);
    });

    it('toggle on and off', async () => {
      const { depositVaultWithAave, owner } = await loadFixture(defaultDeploy);

      await setAaveDepositsEnabledTest({ depositVaultWithAave, owner }, true);

      await setAaveDepositsEnabledTest({ depositVaultWithAave, owner }, false);
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
          revertMessage: 'WMAC: hasnt role',
        },
      );
    });

    it('call from address with DEPOSIT_VAULT_ADMIN_ROLE role', async () => {
      const { depositVaultWithAave, owner } = await loadFixture(defaultDeploy);

      await setAutoInvestFallbackEnabledAaveTest(
        { depositVaultWithAave, owner },
        true,
      );
    });

    it('toggle on and off', async () => {
      const { depositVaultWithAave, owner } = await loadFixture(defaultDeploy);

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

  describe('setMinAmount()', () => {
    it('should fail: call from address without DEPOSIT_VAULT_ADMIN_ROLE role', async () => {
      const { depositVaultWithAave, regularAccounts, owner } =
        await loadFixture(defaultDeploy);
      await setMinAmountTest({ vault: depositVaultWithAave, owner }, 10, {
        from: regularAccounts[0],
        revertMessage: 'WMAC: hasnt role',
      });
    });

    it('call from address with DEPOSIT_VAULT_ADMIN_ROLE role', async () => {
      const { depositVaultWithAave, owner } = await loadFixture(defaultDeploy);
      await setMinAmountTest({ vault: depositVaultWithAave, owner }, 10);
    });
  });

  describe('setMinMTokenAmountForFirstDeposit()', () => {
    it('should fail: call from address without DEPOSIT_VAULT_ADMIN_ROLE role', async () => {
      const { depositVaultWithAave, regularAccounts, owner } =
        await loadFixture(defaultDeploy);

      await setMinAmountToDepositTest(
        { depositVault: depositVaultWithAave, owner },
        10,
        {
          from: regularAccounts[0],
          revertMessage: 'WMAC: hasnt role',
        },
      );
    });

    it('call from address with DEPOSIT_VAULT_ADMIN_ROLE role', async () => {
      const { depositVaultWithAave, owner } = await loadFixture(defaultDeploy);

      await setMinAmountToDepositTest(
        { depositVault: depositVaultWithAave, owner },
        10,
      );
    });
  });

  describe('setVariabilityTolerance()', () => {
    it('should fail: call from address without DEPOSIT_VAULT_ADMIN_ROLE role', async () => {
      const { depositVaultWithAave, regularAccounts, owner } =
        await loadFixture(defaultDeploy);

      await setVariabilityToleranceTest(
        { vault: depositVaultWithAave, owner },
        100,
        {
          from: regularAccounts[0],
          revertMessage: 'WMAC: hasnt role',
        },
      );
    });

    it('call from address with DEPOSIT_VAULT_ADMIN_ROLE role', async () => {
      const { depositVaultWithAave, owner } = await loadFixture(defaultDeploy);

      await setVariabilityToleranceTest(
        { vault: depositVaultWithAave, owner },
        100,
      );
    });
  });

  describe('setInstantDailyLimit()', () => {
    it('should fail: call from address without DEPOSIT_VAULT_ADMIN_ROLE role', async () => {
      const { depositVaultWithAave, regularAccounts, owner } =
        await loadFixture(defaultDeploy);
      await setInstantLimitConfigTest(
        { vault: depositVaultWithAave, owner },
        10,
        { from: regularAccounts[0], revertMessage: 'WMAC: hasnt role' },
      );
    });

    it('call from address with DEPOSIT_VAULT_ADMIN_ROLE role', async () => {
      const { depositVaultWithAave, owner } = await loadFixture(defaultDeploy);
      await setInstantLimitConfigTest(
        { vault: depositVaultWithAave, owner },
        10,
      );
    });
  });

  describe('addPaymentToken()', () => {
    it('should fail: call from address without DEPOSIT_VAULT_ADMIN_ROLE role', async () => {
      const {
        depositVaultWithAave,
        regularAccounts,
        owner,
        stableCoins,
        dataFeed,
      } = await loadFixture(defaultDeploy);
      await addPaymentTokenTest(
        { vault: depositVaultWithAave, owner },
        stableCoins.usdc,
        dataFeed.address,
        0,
        true,
        constants.MaxUint256,
        { from: regularAccounts[0], revertMessage: 'WMAC: hasnt role' },
      );
    });

    it('call from address with DEPOSIT_VAULT_ADMIN_ROLE role', async () => {
      const { depositVaultWithAave, owner, stableCoins, dataFeed } =
        await loadFixture(defaultDeploy);
      await addPaymentTokenTest(
        { vault: depositVaultWithAave, owner },
        stableCoins.usdc,
        dataFeed.address,
        0,
        true,
      );
    });
  });

  describe('removePaymentToken()', () => {
    it('should fail: call from address without DEPOSIT_VAULT_ADMIN_ROLE role', async () => {
      const { depositVaultWithAave, regularAccounts, owner, stableCoins } =
        await loadFixture(defaultDeploy);
      await removePaymentTokenTest(
        { vault: depositVaultWithAave, owner },
        stableCoins.usdc,
        { from: regularAccounts[0], revertMessage: 'WMAC: hasnt role' },
      );
    });

    it('call from address with DEPOSIT_VAULT_ADMIN_ROLE role', async () => {
      const { depositVaultWithAave, owner, stableCoins, dataFeed } =
        await loadFixture(defaultDeploy);
      await addPaymentTokenTest(
        { vault: depositVaultWithAave, owner },
        stableCoins.usdc,
        dataFeed.address,
        0,
        true,
      );
      await removePaymentTokenTest(
        { vault: depositVaultWithAave, owner },
        stableCoins.usdc,
      );
    });
  });

  describe('addWaivedFeeAccount()', () => {
    it('should fail: call from address without DEPOSIT_VAULT_ADMIN_ROLE role', async () => {
      const { depositVaultWithAave, regularAccounts, owner } =
        await loadFixture(defaultDeploy);
      await addWaivedFeeAccountTest(
        { vault: depositVaultWithAave, owner },
        regularAccounts[0].address,
        { from: regularAccounts[0], revertMessage: 'WMAC: hasnt role' },
      );
    });

    it('call from address with DEPOSIT_VAULT_ADMIN_ROLE role', async () => {
      const { depositVaultWithAave, regularAccounts, owner } =
        await loadFixture(defaultDeploy);
      await addWaivedFeeAccountTest(
        { vault: depositVaultWithAave, owner },
        regularAccounts[0].address,
      );
    });
  });

  describe('removeWaivedFeeAccount()', () => {
    it('should fail: call from address without DEPOSIT_VAULT_ADMIN_ROLE role', async () => {
      const { depositVaultWithAave, regularAccounts, owner } =
        await loadFixture(defaultDeploy);
      await removeWaivedFeeAccountTest(
        { vault: depositVaultWithAave, owner },
        regularAccounts[0].address,
        { from: regularAccounts[0], revertMessage: 'WMAC: hasnt role' },
      );
    });

    it('call from address with DEPOSIT_VAULT_ADMIN_ROLE role', async () => {
      const { depositVaultWithAave, regularAccounts, owner } =
        await loadFixture(defaultDeploy);
      await addWaivedFeeAccountTest(
        { vault: depositVaultWithAave, owner },
        regularAccounts[0].address,
      );
      await removeWaivedFeeAccountTest(
        { vault: depositVaultWithAave, owner },
        regularAccounts[0].address,
      );
    });
  });

  describe('setFee()', () => {
    it('should fail: call from address without DEPOSIT_VAULT_ADMIN_ROLE role', async () => {
      const { depositVaultWithAave, regularAccounts, owner } =
        await loadFixture(defaultDeploy);
      await setInstantFeeTest({ vault: depositVaultWithAave, owner }, 100, {
        from: regularAccounts[0],
        revertMessage: 'WMAC: hasnt role',
      });
    });

    it('call from address with DEPOSIT_VAULT_ADMIN_ROLE role', async () => {
      const { depositVaultWithAave, owner } = await loadFixture(defaultDeploy);
      await setInstantFeeTest({ vault: depositVaultWithAave, owner }, 100);
    });
  });

  describe('withdrawToken()', () => {
    it('should fail: call from address without DEPOSIT_VAULT_ADMIN_ROLE role', async () => {
      const { depositVaultWithAave, regularAccounts, owner, stableCoins } =
        await loadFixture(defaultDeploy);
      await withdrawTest(
        { vault: depositVaultWithAave, owner },
        stableCoins.usdc.address,
        0,
        owner,
        { from: regularAccounts[0], revertMessage: 'WMAC: hasnt role' },
      );
    });

    it('call from address with DEPOSIT_VAULT_ADMIN_ROLE role', async () => {
      const { depositVaultWithAave, owner, stableCoins } = await loadFixture(
        defaultDeploy,
      );
      await mintToken(stableCoins.usdc, depositVaultWithAave, 1);
      await withdrawTest(
        { vault: depositVaultWithAave, owner },
        stableCoins.usdc,
        1,
        owner,
      );
    });
  });

  describe('changeTokenAllowance()', () => {
    it('should fail: call from address without DEPOSIT_VAULT_ADMIN_ROLE role', async () => {
      const { depositVaultWithAave, regularAccounts, owner, stableCoins } =
        await loadFixture(defaultDeploy);
      await changeTokenAllowanceTest(
        { vault: depositVaultWithAave, owner },
        stableCoins.usdc.address,
        100,
        { from: regularAccounts[0], revertMessage: 'WMAC: hasnt role' },
      );
    });

    it('call from address with DEPOSIT_VAULT_ADMIN_ROLE role', async () => {
      const { depositVaultWithAave, owner, stableCoins, dataFeed } =
        await loadFixture(defaultDeploy);
      await addPaymentTokenTest(
        { vault: depositVaultWithAave, owner },
        stableCoins.usdc,
        dataFeed.address,
        0,
        true,
      );
      await changeTokenAllowanceTest(
        { vault: depositVaultWithAave, owner },
        stableCoins.usdc.address,
        parseUnits('200'),
      );
    });
  });

  describe('changeTokenFee()', () => {
    it('should fail: call from address without DEPOSIT_VAULT_ADMIN_ROLE role', async () => {
      const { depositVaultWithAave, regularAccounts, owner, stableCoins } =
        await loadFixture(defaultDeploy);
      await changeTokenFeeTest(
        { vault: depositVaultWithAave, owner },
        stableCoins.usdc.address,
        100,
        { from: regularAccounts[0], revertMessage: 'WMAC: hasnt role' },
      );
    });

    it('call from address with DEPOSIT_VAULT_ADMIN_ROLE role', async () => {
      const { depositVaultWithAave, owner, stableCoins, dataFeed } =
        await loadFixture(defaultDeploy);
      await addPaymentTokenTest(
        { vault: depositVaultWithAave, owner },
        stableCoins.usdc,
        dataFeed.address,
        0,
        true,
      );
      await changeTokenFeeTest(
        { vault: depositVaultWithAave, owner },
        stableCoins.usdc.address,
        100,
      );
    });
  });

  describe('freeFromMinAmount()', async () => {
    it('should fail: call from address without vault admin role', async () => {
      const { depositVaultWithAave, regularAccounts } = await loadFixture(
        defaultDeploy,
      );
      await expect(
        depositVaultWithAave
          .connect(regularAccounts[0])
          .freeFromMinAmount(regularAccounts[1].address, true),
      ).to.be.revertedWith('WMAC: hasnt role');
    });
    it('should not fail', async () => {
      const { depositVaultWithAave, regularAccounts } = await loadFixture(
        defaultDeploy,
      );
      await expect(
        depositVaultWithAave.freeFromMinAmount(
          regularAccounts[0].address,
          true,
        ),
      ).to.not.reverted;

      expect(
        await depositVaultWithAave.isFreeFromMinAmount(
          regularAccounts[0].address,
        ),
      ).to.eq(true);
    });
    it('should fail: already in list', async () => {
      const { depositVaultWithAave, regularAccounts } = await loadFixture(
        defaultDeploy,
      );
      await expect(
        depositVaultWithAave.freeFromMinAmount(
          regularAccounts[0].address,
          true,
        ),
      ).to.not.reverted;

      expect(
        await depositVaultWithAave.isFreeFromMinAmount(
          regularAccounts[0].address,
        ),
      ).to.eq(true);

      await expect(
        depositVaultWithAave.freeFromMinAmount(
          regularAccounts[0].address,
          true,
        ),
      ).to.revertedWith('DV: already free');
    });
  });

  describe('depositInstant()', async () => {
    it('should fail: when there is no token in vault', async () => {
      const {
        owner,
        depositVaultWithAave,
        stableCoins,
        mTBILL,
        mTokenToUsdDataFeed,
        regularAccounts,
        aavePoolMock,
      } = await loadFixture(defaultDeploy);

      await mintToken(stableCoins.usdc, regularAccounts[0], 100);
      await approveBase18(
        regularAccounts[0],
        stableCoins.usdc,
        depositVaultWithAave,
        100,
      );

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
          revertMessage: 'MV: token not exists',
        },
      );
    });

    it('should fail: when function paused', async () => {
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

      await pauseVault(depositVaultWithAave, {
        from: owner,
      });

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
          revertMessage: 'Pausable: paused',
        },
      );
    });

    it('should fail: user in blacklist', async () => {
      const {
        owner,
        depositVaultWithAave,
        stableCoins,
        mTBILL,
        mTokenToUsdDataFeed,
        regularAccounts,
        dataFeed,
        accessControl,
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

      await blackList(
        { blacklistable: depositVaultWithAave, accessControl, owner },
        regularAccounts[0],
      );

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
          revertMessage: acErrors.WMAC_HAS_ROLE,
        },
      );
    });

    it('should fail: user in sanctions list', async () => {
      const {
        owner,
        depositVaultWithAave,
        stableCoins,
        mTBILL,
        mTokenToUsdDataFeed,
        regularAccounts,
        dataFeed,
        mockedSanctionsList,
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

      await sanctionUser(
        { sanctionsList: mockedSanctionsList },
        regularAccounts[0],
      );

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
          revertMessage: 'WSL: sanctioned',
        },
      );
    });

    it('should fail: when trying to deposit 0 amount', async () => {
      const {
        owner,
        depositVaultWithAave,
        stableCoins,
        mTBILL,
        dataFeed,
        mTokenToUsdDataFeed,
        aavePoolMock,
      } = await loadFixture(defaultDeploy);
      await addPaymentTokenTest(
        { vault: depositVaultWithAave, owner },
        stableCoins.dai,
        dataFeed.address,
        0,
        true,
      );
      await depositInstantWithAaveTest(
        {
          depositVaultWithAave,
          owner,
          mTBILL,
          mTokenToUsdDataFeed,
          aavePoolMock,
        },
        stableCoins.dai,
        0,
        {
          revertMessage: 'DV: invalid amount',
        },
      );
    });

    it('should fail: when rounding is invalid', async () => {
      const {
        owner,
        depositVaultWithAave,
        stableCoins,
        mTBILL,
        dataFeed,
        mTokenToUsdDataFeed,
        aavePoolMock,
      } = await loadFixture(defaultDeploy);

      await addPaymentTokenTest(
        { vault: depositVaultWithAave, owner },
        stableCoins.dai,
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
        stableCoins.dai,
        100.0000000001,
        {
          revertMessage: 'MV: invalid rounding',
        },
      );
    });

    it('should fail: call with insufficient allowance', async () => {
      const {
        owner,
        depositVaultWithAave,
        stableCoins,
        mTBILL,
        dataFeed,
        mTokenToUsdDataFeed,
        aavePoolMock,
      } = await loadFixture(defaultDeploy);

      await mintToken(stableCoins.dai, owner, 100);
      await addPaymentTokenTest(
        { vault: depositVaultWithAave, owner },
        stableCoins.dai,
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
        stableCoins.dai,
        100,
        {
          revertMessage: 'ERC20: insufficient allowance',
        },
      );
    });

    it('should fail: call with insufficient balance', async () => {
      const {
        owner,
        depositVaultWithAave,
        stableCoins,
        mTBILL,
        dataFeed,
        mTokenToUsdDataFeed,
        aavePoolMock,
      } = await loadFixture(defaultDeploy);

      await approveBase18(owner, stableCoins.dai, depositVaultWithAave, 100);
      await addPaymentTokenTest(
        { vault: depositVaultWithAave, owner },
        stableCoins.dai,
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
        stableCoins.dai,
        100,
        {
          revertMessage: 'ERC20: transfer amount exceeds balance',
        },
      );
    });

    it('should fail: dataFeed rate 0 ', async () => {
      const {
        owner,
        depositVaultWithAave,
        stableCoins,
        mTBILL,
        dataFeed,
        mockedAggregator,
        mTokenToUsdDataFeed,
        aavePoolMock,
      } = await loadFixture(defaultDeploy);

      await approveBase18(owner, stableCoins.dai, depositVaultWithAave, 10);
      await addPaymentTokenTest(
        { vault: depositVaultWithAave, owner },
        stableCoins.dai,
        dataFeed.address,
        0,
        true,
      );
      await mintToken(stableCoins.dai, owner, 100_000);
      await setRoundData({ mockedAggregator }, 0);
      await depositInstantWithAaveTest(
        {
          depositVaultWithAave,
          owner,
          mTBILL,
          mTokenToUsdDataFeed,
          aavePoolMock,
        },
        stableCoins.dai,
        1,
        {
          revertMessage: 'DF: feed is deprecated',
        },
      );
    });

    it('should fail: call for amount < minAmountToDepositTest', async () => {
      const {
        depositVaultWithAave,
        mockedAggregator,
        owner,
        mTBILL,
        stableCoins,
        dataFeed,
        mTokenToUsdDataFeed,
        aavePoolMock,
      } = await loadFixture(defaultDeploy);
      await addPaymentTokenTest(
        { vault: depositVaultWithAave, owner },
        stableCoins.dai,
        dataFeed.address,
        0,
        true,
      );
      await setRoundData({ mockedAggregator }, 1);

      await mintToken(stableCoins.dai, owner, 100_000);
      await approveBase18(
        owner,
        stableCoins.dai,
        depositVaultWithAave,
        100_000,
      );

      await setMinAmountToDepositTest(
        { depositVault: depositVaultWithAave, owner },
        100_000,
      );
      await setInstantLimitConfigTest(
        { vault: depositVaultWithAave, owner },
        150_000,
      );

      await depositInstantWithAaveTest(
        {
          depositVaultWithAave,
          owner,
          mTBILL,
          mTokenToUsdDataFeed,
          aavePoolMock,
        },
        stableCoins.dai,
        99_999,
        {
          revertMessage: 'DV: mint amount < min',
        },
      );
    });

    it('should fail: call for amount < minAmount', async () => {
      const {
        depositVaultWithAave,
        mockedAggregator,
        owner,
        mTBILL,
        stableCoins,
        dataFeed,
        mTokenToUsdDataFeed,
        aavePoolMock,
      } = await loadFixture(defaultDeploy);
      await addPaymentTokenTest(
        { vault: depositVaultWithAave, owner },
        stableCoins.dai,
        dataFeed.address,
        0,
        true,
      );
      await setRoundData({ mockedAggregator }, 1);

      await mintToken(stableCoins.dai, owner, 100_000);
      await approveBase18(
        owner,
        stableCoins.dai,
        depositVaultWithAave,
        100_000,
      );

      await setMinAmountToDepositTest(
        { depositVault: depositVaultWithAave, owner },
        100_000,
      );
      await setInstantLimitConfigTest(
        { vault: depositVaultWithAave, owner },
        150_000,
      );

      await depositInstantWithAaveTest(
        {
          depositVaultWithAave,
          owner,
          mTBILL,
          mTokenToUsdDataFeed,
          aavePoolMock,
        },
        stableCoins.dai,
        99,
        {
          revertMessage: 'DV: mToken amount < min',
        },
      );
    });

    it('should fail: if exceed allowance of deposit for token', async () => {
      const {
        depositVaultWithAave,
        mockedAggregator,
        owner,
        mTBILL,
        stableCoins,
        dataFeed,
        mTokenToUsdDataFeed,
        aavePoolMock,
      } = await loadFixture(defaultDeploy);
      await addPaymentTokenTest(
        { vault: depositVaultWithAave, owner },
        stableCoins.dai,
        dataFeed.address,
        0,
        true,
      );
      await setRoundData({ mockedAggregator }, 4);

      await mintToken(stableCoins.dai, owner, 100_000);
      await changeTokenAllowanceTest(
        { vault: depositVaultWithAave, owner },
        stableCoins.dai.address,
        100,
      );
      await approveBase18(
        owner,
        stableCoins.dai,
        depositVaultWithAave,
        100_000,
      );

      await depositInstantWithAaveTest(
        {
          depositVaultWithAave,
          owner,
          mTBILL,
          mTokenToUsdDataFeed,
          aavePoolMock,
        },
        stableCoins.dai,
        99_999,
        {
          revertMessage: 'MV: exceed allowance',
        },
      );
    });

    it('should fail: if mint limit exceeded', async () => {
      const {
        depositVaultWithAave,
        mockedAggregator,
        owner,
        mTBILL,
        stableCoins,
        dataFeed,
        mTokenToUsdDataFeed,
        aavePoolMock,
      } = await loadFixture(defaultDeploy);
      await addPaymentTokenTest(
        { vault: depositVaultWithAave, owner },
        stableCoins.dai,
        dataFeed.address,
        0,
        true,
      );
      await setRoundData({ mockedAggregator }, 4);

      await mintToken(stableCoins.dai, owner, 100_000);
      await setInstantLimitConfigTest(
        { vault: depositVaultWithAave, owner },
        1000,
      );

      await approveBase18(
        owner,
        stableCoins.dai,
        depositVaultWithAave,
        100_000,
      );

      await depositInstantWithAaveTest(
        {
          depositVaultWithAave,
          owner,
          mTBILL,
          mTokenToUsdDataFeed,
          aavePoolMock,
        },
        stableCoins.dai,
        99_999,
        {
          revertMessage: 'MV: exceed limit',
        },
      );
    });

    it('should fail: if min receive amount greater then actual', async () => {
      const {
        depositVaultWithAave,
        mockedAggregator,
        owner,
        mTBILL,
        stableCoins,
        dataFeed,
        mTokenToUsdDataFeed,
        aavePoolMock,
      } = await loadFixture(defaultDeploy);
      await addPaymentTokenTest(
        { vault: depositVaultWithAave, owner },
        stableCoins.dai,
        dataFeed.address,
        0,
        true,
      );
      await setRoundData({ mockedAggregator }, 4);

      await mintToken(stableCoins.dai, owner, 100_000);

      await approveBase18(
        owner,
        stableCoins.dai,
        depositVaultWithAave,
        100_000,
      );

      await depositInstantWithAaveTest(
        {
          depositVaultWithAave,
          owner,
          mTBILL,
          mTokenToUsdDataFeed,
          aavePoolMock,
          minAmount: parseUnits('100000'),
        },
        stableCoins.dai,
        99_999,
        {
          revertMessage: 'DV: minReceiveAmount > actual',
        },
      );
    });

    it('should fail: if some fee = 100%', async () => {
      const {
        owner,
        depositVaultWithAave,
        stableCoins,
        mTBILL,
        dataFeed,
        mTokenToUsdDataFeed,
        aavePoolMock,
      } = await loadFixture(defaultDeploy);

      await mintToken(stableCoins.dai, owner, 100);
      await approveBase18(owner, stableCoins.dai, depositVaultWithAave, 100);
      await addPaymentTokenTest(
        { vault: depositVaultWithAave, owner },
        stableCoins.dai,
        dataFeed.address,
        10000,
        true,
      );
      await depositInstantWithAaveTest(
        {
          depositVaultWithAave,
          owner,
          mTBILL,
          mTokenToUsdDataFeed,
          aavePoolMock,
        },
        stableCoins.dai,
        100,
        {
          revertMessage: 'DV: mToken amount < min',
        },
      );

      await removePaymentTokenTest(
        { vault: depositVaultWithAave, owner },
        stableCoins.dai,
      );
      await addPaymentTokenTest(
        { vault: depositVaultWithAave, owner },
        stableCoins.dai,
        dataFeed.address,
        0,
        true,
      );
      await setInstantFeeTest({ vault: depositVaultWithAave, owner }, 10000);
      await depositInstantWithAaveTest(
        {
          depositVaultWithAave,
          owner,
          mTBILL,
          mTokenToUsdDataFeed,
          aavePoolMock,
        },
        stableCoins.dai,
        100,
        { revertMessage: 'DV: mToken amount < min' },
      );
    });

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

      await setAaveDepositsEnabledTest({ depositVaultWithAave, owner }, true);

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

    it('deposit with waived fee', async () => {
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

      await setAaveDepositsEnabledTest({ depositVaultWithAave, owner }, true);

      await addWaivedFeeAccountTest(
        { vault: depositVaultWithAave, owner },
        regularAccounts[0].address,
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
          waivedFee: true,
        },
        stableCoins.usdc,
        100,
        {
          from: regularAccounts[0],
        },
      );
    });

    it('deposit 100 DAI with aave enabled (non-stablecoin feed)', async () => {
      const {
        owner,
        depositVaultWithAave,
        stableCoins,
        mTBILL,
        mTokenToUsdDataFeed,
        regularAccounts,
        dataFeed,
        aavePoolMock,
        aUSDC,
      } = await loadFixture(defaultDeploy);

      const aDAI = aUSDC; // reuse the aToken mock for DAI in tests
      await aavePoolMock.setReserveAToken(
        stableCoins.dai.address,
        aDAI.address,
      );

      await setAavePoolTest(
        { depositVaultWithAave, owner },
        stableCoins.dai.address,
        aavePoolMock.address,
      );

      await setAaveDepositsEnabledTest({ depositVaultWithAave, owner }, true);

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
      await setMinAmountTest({ vault: depositVaultWithAave, owner }, 10);

      await depositInstantWithAaveTest(
        {
          depositVaultWithAave,
          owner,
          mTBILL,
          mTokenToUsdDataFeed,
          aavePoolMock,
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
        depositVaultWithAave,
        stableCoins,
        mTBILL,
        greenListableTester,
        mTokenToUsdDataFeed,
        accessControl,
        regularAccounts,
        dataFeed,
        aavePoolMock,
      } = await loadFixture(defaultDeploy);

      await depositVaultWithAave.setGreenlistEnable(true);

      await greenList(
        { greenlistable: greenListableTester, accessControl, owner },
        regularAccounts[0],
      );

      await setAaveDepositsEnabledTest({ depositVaultWithAave, owner }, true);

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

      await setAaveDepositsEnabledTest({ depositVaultWithAave, owner }, true);

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

    it('deposit with custom recipient, aaveDepositsEnabled is false', async () => {
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
        depositVaultWithAave,
        stableCoins,
        mTBILL,
        mTokenToUsdDataFeed,
        regularAccounts,
        dataFeed,
        aavePoolMock,
      } = await loadFixture(defaultDeploy);

      await depositVaultWithAave.setGreenlistEnable(true);

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
          revertMessage: acErrors.WMAC_HASNT_ROLE,
        },
      );
    });

    it('should fail: first deposit mint amount below configured minimum', async () => {
      const {
        owner,
        depositVaultWithAave,
        stableCoins,
        mTBILL,
        mTokenToUsdDataFeed,
        dataFeed,
        aavePoolMock,
      } = await loadFixture(defaultDeploy);

      await setAaveDepositsEnabledTest({ depositVaultWithAave, owner }, true);
      await setMinAmountTest({ vault: depositVaultWithAave, owner }, 0);
      await setMinAmountToDepositTest(
        { depositVault: depositVaultWithAave, owner },
        200,
      );

      await mintToken(stableCoins.usdc, owner, 100);
      await approveBase18(owner, stableCoins.usdc, depositVaultWithAave, 100);
      await addPaymentTokenTest(
        { vault: depositVaultWithAave, owner },
        stableCoins.usdc,
        dataFeed.address,
        0,
        true,
      );

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
          revertMessage: 'DV: mint amount < min',
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

      await setAaveDepositsEnabledTest({ depositVaultWithAave, owner }, true);
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

      await setAaveDepositsEnabledTest({ depositVaultWithAave, owner }, true);
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

      await setAaveDepositsEnabledTest({ depositVaultWithAave, owner }, true);
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
          revertMessage: 'DVA: auto-invest failed',
        },
      );
    });

    it('should fail: greenlist enabled and recipient not in greenlist (custom recipient overload)', async () => {
      const {
        owner,
        depositVaultWithAave,
        stableCoins,
        mTBILL,
        mTokenToUsdDataFeed,
        greenListableTester,
        accessControl,
        customRecipient,
        aavePoolMock,
      } = await loadFixture(defaultDeploy);

      await greenList(
        { greenlistable: greenListableTester, accessControl, owner },
        owner,
      );

      await depositVaultWithAave.setGreenlistEnable(true);

      await depositInstantWithAaveTest(
        {
          depositVaultWithAave,
          owner,
          mTBILL,
          mTokenToUsdDataFeed,
          aavePoolMock,
          customRecipient,
        },
        stableCoins.dai,
        1,
        {
          revertMessage: 'WMAC: hasnt role',
        },
      );
    });

    it('should fail: recipient in blacklist (custom recipient overload)', async () => {
      const {
        owner,
        depositVaultWithAave,
        stableCoins,
        mTBILL,
        mTokenToUsdDataFeed,
        blackListableTester,
        accessControl,
        regularAccounts,
        customRecipient,
        aavePoolMock,
      } = await loadFixture(defaultDeploy);

      await blackList(
        { blacklistable: blackListableTester, accessControl, owner },
        customRecipient,
      );

      await depositInstantWithAaveTest(
        {
          depositVaultWithAave,
          owner,
          mTBILL,
          mTokenToUsdDataFeed,
          aavePoolMock,
          customRecipient,
        },
        stableCoins.dai,
        1,
        {
          from: regularAccounts[0],
          revertMessage: acErrors.WMAC_HAS_ROLE,
        },
      );
    });

    it('should fail: recipient in sanctions list (custom recipient overload)', async () => {
      const {
        owner,
        depositVaultWithAave,
        stableCoins,
        mTBILL,
        mTokenToUsdDataFeed,
        regularAccounts,
        mockedSanctionsList,
        customRecipient,
        aavePoolMock,
      } = await loadFixture(defaultDeploy);

      await sanctionUser(
        { sanctionsList: mockedSanctionsList },
        customRecipient,
      );

      await depositInstantWithAaveTest(
        {
          depositVaultWithAave,
          owner,
          mTBILL,
          mTokenToUsdDataFeed,
          aavePoolMock,
          customRecipient,
        },
        stableCoins.dai,
        1,
        {
          from: regularAccounts[0],
          revertMessage: 'WSL: sanctioned',
        },
      );
    });

    it('should fail: when function paused (custom recipient overload)', async () => {
      const {
        owner,
        depositVaultWithAave,
        stableCoins,
        mTBILL,
        dataFeed,
        mTokenToUsdDataFeed,
        regularAccounts,
        customRecipient,
        aavePoolMock,
      } = await loadFixture(defaultDeploy);
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
        true,
      );
      const selector = encodeFnSelector(
        'depositInstant(address,uint256,uint256,bytes32,address)',
      );
      await pauseVaultFn(depositVaultWithAave, selector);
      await depositInstantWithAaveTest(
        {
          depositVaultWithAave,
          owner,
          mTBILL,
          mTokenToUsdDataFeed,
          aavePoolMock,
          customRecipient,
        },
        stableCoins.dai,
        100,
        {
          from: regularAccounts[0],
          revertMessage: 'Pausable: fn paused',
        },
      );
    });
  });

  describe('depositRequest()', () => {
    it('deposit request 100 USDC', async () => {
      const {
        owner,
        depositVaultWithAave,
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

      await depositRequestTest(
        {
          depositVault: depositVaultWithAave,
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

      await setAaveDepositsEnabledTest({ depositVaultWithAave, owner }, true);
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

      await setAaveDepositsEnabledTest({ depositVaultWithAave, owner }, true);
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

      await setAaveDepositsEnabledTest({ depositVaultWithAave, owner }, true);
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
          revertMessage: 'DVA: auto-invest failed',
        },
      );
    });
  });

  describe('approveRequest()', () => {
    it('should fail: call from address without DEPOSIT_VAULT_ADMIN_ROLE role', async () => {
      const {
        owner,
        regularAccounts,
        depositVaultWithAave,
        stableCoins,
        mTBILL,
        mTokenToUsdDataFeed,
        dataFeed,
      } = await loadFixture(defaultDeploy);

      await mintToken(stableCoins.usdc, owner, 100);
      await approveBase18(owner, stableCoins.usdc, depositVaultWithAave, 100);
      await addPaymentTokenTest(
        { vault: depositVaultWithAave, owner },
        stableCoins.usdc,
        dataFeed.address,
        0,
        true,
      );
      await setMinAmountTest({ vault: depositVaultWithAave, owner }, 10);

      const request = await depositRequestTest(
        {
          depositVault: depositVaultWithAave,
          owner,
          mTBILL,
          mTokenToUsdDataFeed,
        },
        stableCoins.usdc,
        100,
      );

      await approveRequestTest(
        {
          depositVault: depositVaultWithAave,
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
        depositVaultWithAave,
        stableCoins,
        mTBILL,
        mTokenToUsdDataFeed,
        dataFeed,
      } = await loadFixture(defaultDeploy);

      await mintToken(stableCoins.usdc, owner, 100);
      await approveBase18(owner, stableCoins.usdc, depositVaultWithAave, 100);
      await addPaymentTokenTest(
        { vault: depositVaultWithAave, owner },
        stableCoins.usdc,
        dataFeed.address,
        0,
        true,
      );
      await setMinAmountTest({ vault: depositVaultWithAave, owner }, 10);

      const request = await depositRequestTest(
        {
          depositVault: depositVaultWithAave,
          owner,
          mTBILL,
          mTokenToUsdDataFeed,
        },
        stableCoins.usdc,
        100,
      );

      await approveRequestTest(
        {
          depositVault: depositVaultWithAave,
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
        depositVaultWithAave,
        stableCoins,
        mTBILL,
        mTokenToUsdDataFeed,
        dataFeed,
      } = await loadFixture(defaultDeploy);

      await mintToken(stableCoins.usdc, owner, 100);
      await approveBase18(owner, stableCoins.usdc, depositVaultWithAave, 100);
      await addPaymentTokenTest(
        { vault: depositVaultWithAave, owner },
        stableCoins.usdc,
        dataFeed.address,
        0,
        true,
      );
      await setMinAmountTest({ vault: depositVaultWithAave, owner }, 10);

      const request = await depositRequestTest(
        {
          depositVault: depositVaultWithAave,
          owner,
          mTBILL,
          mTokenToUsdDataFeed,
        },
        stableCoins.usdc,
        100,
      );

      await safeApproveRequestTest(
        {
          depositVault: depositVaultWithAave,
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
        depositVaultWithAave,
        stableCoins,
        mTBILL,
        mTokenToUsdDataFeed,
        dataFeed,
      } = await loadFixture(defaultDeploy);

      await mintToken(stableCoins.usdc, owner, 100);
      await approveBase18(owner, stableCoins.usdc, depositVaultWithAave, 100);
      await addPaymentTokenTest(
        { vault: depositVaultWithAave, owner },
        stableCoins.usdc,
        dataFeed.address,
        0,
        true,
      );
      await setMinAmountTest({ vault: depositVaultWithAave, owner }, 10);

      const request = await depositRequestTest(
        {
          depositVault: depositVaultWithAave,
          owner,
          mTBILL,
          mTokenToUsdDataFeed,
        },
        stableCoins.usdc,
        100,
      );

      await safeApproveRequestTest(
        {
          depositVault: depositVaultWithAave,
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
        depositVaultWithAave,
        stableCoins,
        mTBILL,
        mTokenToUsdDataFeed,
        dataFeed,
      } = await loadFixture(defaultDeploy);

      await mintToken(stableCoins.usdc, owner, 100);
      await approveBase18(owner, stableCoins.usdc, depositVaultWithAave, 100);
      await addPaymentTokenTest(
        { vault: depositVaultWithAave, owner },
        stableCoins.usdc,
        dataFeed.address,
        0,
        true,
      );
      await setMinAmountTest({ vault: depositVaultWithAave, owner }, 10);

      const request = await depositRequestTest(
        {
          depositVault: depositVaultWithAave,
          owner,
          mTBILL,
          mTokenToUsdDataFeed,
        },
        stableCoins.usdc,
        100,
      );

      await safeBulkApproveRequestTest(
        {
          depositVault: depositVaultWithAave,
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
        depositVaultWithAave,
        stableCoins,
        mTBILL,
        mTokenToUsdDataFeed,
        dataFeed,
      } = await loadFixture(defaultDeploy);

      await mintToken(stableCoins.usdc, owner, 100);
      await approveBase18(owner, stableCoins.usdc, depositVaultWithAave, 100);
      await addPaymentTokenTest(
        { vault: depositVaultWithAave, owner },
        stableCoins.usdc,
        dataFeed.address,
        0,
        true,
      );
      await setMinAmountTest({ vault: depositVaultWithAave, owner }, 10);

      const request = await depositRequestTest(
        {
          depositVault: depositVaultWithAave,
          owner,
          mTBILL,
          mTokenToUsdDataFeed,
        },
        stableCoins.usdc,
        100,
      );

      await safeBulkApproveRequestTest(
        {
          depositVault: depositVaultWithAave,
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
        depositVaultWithAave,
        stableCoins,
        mTBILL,
        mTokenToUsdDataFeed,
        dataFeed,
      } = await loadFixture(defaultDeploy);

      await mintToken(stableCoins.usdc, owner, 100);
      await approveBase18(owner, stableCoins.usdc, depositVaultWithAave, 100);
      await addPaymentTokenTest(
        { vault: depositVaultWithAave, owner },
        stableCoins.usdc,
        dataFeed.address,
        0,
        true,
      );
      await setMinAmountTest({ vault: depositVaultWithAave, owner }, 10);

      const request = await depositRequestTest(
        {
          depositVault: depositVaultWithAave,
          owner,
          mTBILL,
          mTokenToUsdDataFeed,
        },
        stableCoins.usdc,
        100,
      );

      await rejectRequestTest(
        {
          depositVault: depositVaultWithAave,
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
        depositVaultWithAave,
        stableCoins,
        mTBILL,
        mTokenToUsdDataFeed,
        dataFeed,
      } = await loadFixture(defaultDeploy);

      await mintToken(stableCoins.usdc, owner, 100);
      await approveBase18(owner, stableCoins.usdc, depositVaultWithAave, 100);
      await addPaymentTokenTest(
        { vault: depositVaultWithAave, owner },
        stableCoins.usdc,
        dataFeed.address,
        0,
        true,
      );
      await setMinAmountTest({ vault: depositVaultWithAave, owner }, 10);

      const request = await depositRequestTest(
        {
          depositVault: depositVaultWithAave,
          owner,
          mTBILL,
          mTokenToUsdDataFeed,
        },
        stableCoins.usdc,
        100,
      );

      await rejectRequestTest(
        {
          depositVault: depositVaultWithAave,
          owner,
          mTBILL,
          mTokenToUsdDataFeed,
        },
        request.requestId!,
      );
    });
  });
});
