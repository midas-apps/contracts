import { loadFixture } from '@nomicfoundation/hardhat-network-helpers';
import { expect } from 'chai';
import { constants } from 'ethers';
import { parseUnits } from 'ethers/lib/utils';
import { ethers } from 'hardhat';

import { encodeFnSelector } from '../../helpers/utils';
import {
  ManageableVaultTester__factory,
  MorphoVaultMock__factory,
} from '../../typechain-types';
import { acErrors, blackList, greenList } from '../common/ac.helpers';
import {
  approveBase18,
  mintToken,
  pauseVault,
  pauseVaultFn,
} from '../common/common.helpers';
import { setRoundData } from '../common/data-feed.helpers';
import {
  depositInstantWithMorphoTest,
  depositRequestWithMorphoTest,
  removeMorphoVaultTest,
  setAutoInvestFallbackEnabledMorphoTest,
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
  setInstantLimitConfigTest,
  setMinAmountToDepositTest,
  setInstantFeeTest,
  setMinAmountTest,
  setVariabilityToleranceTest,
  withdrawTest,
} from '../common/manageable-vault.helpers';
import { sanctionUser } from '../common/with-sanctions-list.helpers';

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

  describe('initialization', () => {
    it('should fail: call initialize() when already initialized', async () => {
      const { depositVaultWithMorpho } = await loadFixture(defaultDeploy);

      await expect(
        depositVaultWithMorpho.initialize(
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

  describe('setAutoInvestFallbackEnabled()', () => {
    it('should fail: call from address without DEPOSIT_VAULT_ADMIN_ROLE role', async () => {
      const { depositVaultWithMorpho, owner, regularAccounts } =
        await loadFixture(defaultDeploy);

      await setAutoInvestFallbackEnabledMorphoTest(
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

      await setInstantLimitConfigTest(
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

      await setInstantLimitConfigTest(
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

  describe('freeFromMinAmount()', async () => {
    it('should fail: call from address without vault admin role', async () => {
      const { depositVaultWithMorpho, regularAccounts } = await loadFixture(
        defaultDeploy,
      );
      await expect(
        depositVaultWithMorpho
          .connect(regularAccounts[0])
          .freeFromMinAmount(regularAccounts[1].address, true),
      ).to.be.revertedWith('WMAC: hasnt role');
    });
    it('should not fail', async () => {
      const { depositVaultWithMorpho, regularAccounts } = await loadFixture(
        defaultDeploy,
      );
      await expect(
        depositVaultWithMorpho.freeFromMinAmount(
          regularAccounts[0].address,
          true,
        ),
      ).to.not.reverted;

      expect(
        await depositVaultWithMorpho.isFreeFromMinAmount(
          regularAccounts[0].address,
        ),
      ).to.eq(true);
    });
    it('should fail: already in list', async () => {
      const { depositVaultWithMorpho, regularAccounts } = await loadFixture(
        defaultDeploy,
      );
      await expect(
        depositVaultWithMorpho.freeFromMinAmount(
          regularAccounts[0].address,
          true,
        ),
      ).to.not.reverted;

      expect(
        await depositVaultWithMorpho.isFreeFromMinAmount(
          regularAccounts[0].address,
        ),
      ).to.eq(true);

      await expect(
        depositVaultWithMorpho.freeFromMinAmount(
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

    it('should fail: when trying to deposit 0 amount', async () => {
      const {
        owner,
        depositVaultWithMorpho,
        stableCoins,
        mTBILL,
        dataFeed,
        mTokenToUsdDataFeed,
        morphoVaultMock,
      } = await loadFixture(defaultDeploy);
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
        },
        stableCoins.usdc,
        0,
        {
          revertMessage: 'DV: invalid amount',
        },
      );
    });

    it('should fail: when rounding is invalid', async () => {
      const {
        owner,
        depositVaultWithMorpho,
        stableCoins,
        mTBILL,
        dataFeed,
        mTokenToUsdDataFeed,
        morphoVaultMock,
      } = await loadFixture(defaultDeploy);

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
        100.0000000001,
        {
          revertMessage: 'MV: invalid rounding',
        },
      );
    });

    it('should fail: call with insufficient allowance', async () => {
      const {
        owner,
        depositVaultWithMorpho,
        stableCoins,
        mTBILL,
        dataFeed,
        mTokenToUsdDataFeed,
        morphoVaultMock,
      } = await loadFixture(defaultDeploy);

      await mintToken(stableCoins.usdc, owner, 100);
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
          revertMessage: 'ERC20: insufficient allowance',
        },
      );
    });

    it('should fail: call with insufficient balance', async () => {
      const {
        owner,
        depositVaultWithMorpho,
        stableCoins,
        mTBILL,
        dataFeed,
        mTokenToUsdDataFeed,
        morphoVaultMock,
      } = await loadFixture(defaultDeploy);

      await approveBase18(owner, stableCoins.usdc, depositVaultWithMorpho, 100);
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
          revertMessage: 'ERC20: transfer amount exceeds balance',
        },
      );
    });

    it('should fail: dataFeed rate 0', async () => {
      const {
        owner,
        depositVaultWithMorpho,
        stableCoins,
        mTBILL,
        dataFeed,
        mockedAggregator,
        mTokenToUsdDataFeed,
        morphoVaultMock,
      } = await loadFixture(defaultDeploy);

      await approveBase18(owner, stableCoins.usdc, depositVaultWithMorpho, 10);
      await addPaymentTokenTest(
        { vault: depositVaultWithMorpho, owner },
        stableCoins.usdc,
        dataFeed.address,
        0,
        true,
      );
      await mintToken(stableCoins.usdc, owner, 100_000);
      await setRoundData({ mockedAggregator }, 0);
      await depositInstantWithMorphoTest(
        {
          depositVaultWithMorpho,
          owner,
          mTBILL,
          mTokenToUsdDataFeed,
          morphoVaultMock,
        },
        stableCoins.usdc,
        1,
        {
          revertMessage: 'DF: feed is deprecated',
        },
      );
    });

    it('should fail: call for amount < minAmountToDepositTest', async () => {
      const {
        depositVaultWithMorpho,
        mockedAggregator,
        owner,
        mTBILL,
        stableCoins,
        dataFeed,
        mTokenToUsdDataFeed,
        morphoVaultMock,
      } = await loadFixture(defaultDeploy);
      await addPaymentTokenTest(
        { vault: depositVaultWithMorpho, owner },
        stableCoins.usdc,
        dataFeed.address,
        0,
        true,
      );
      await setRoundData({ mockedAggregator }, 1);

      await mintToken(stableCoins.usdc, owner, 100_000);
      await approveBase18(
        owner,
        stableCoins.usdc,
        depositVaultWithMorpho,
        100_000,
      );

      await setMinAmountToDepositTest(
        { depositVault: depositVaultWithMorpho, owner },
        100_000,
      );
      await setInstantLimitConfigTest(
        { vault: depositVaultWithMorpho, owner },
        150_000,
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
        99_999,
        {
          revertMessage: 'DV: mint amount < min',
        },
      );
    });

    it('should fail: call for amount < minAmount', async () => {
      const {
        depositVaultWithMorpho,
        mockedAggregator,
        owner,
        mTBILL,
        stableCoins,
        dataFeed,
        mTokenToUsdDataFeed,
        morphoVaultMock,
      } = await loadFixture(defaultDeploy);
      await addPaymentTokenTest(
        { vault: depositVaultWithMorpho, owner },
        stableCoins.usdc,
        dataFeed.address,
        0,
        true,
      );
      await setRoundData({ mockedAggregator }, 1);

      await mintToken(stableCoins.usdc, owner, 100_000);
      await approveBase18(
        owner,
        stableCoins.usdc,
        depositVaultWithMorpho,
        100_000,
      );

      await setMinAmountToDepositTest(
        { depositVault: depositVaultWithMorpho, owner },
        100_000,
      );
      await setInstantLimitConfigTest(
        { vault: depositVaultWithMorpho, owner },
        150_000,
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
        99,
        {
          revertMessage: 'DV: mToken amount < min',
        },
      );
    });

    it('should fail: if exceed allowance of deposit for token', async () => {
      const {
        depositVaultWithMorpho,
        mockedAggregator,
        owner,
        mTBILL,
        stableCoins,
        dataFeed,
        mTokenToUsdDataFeed,
        morphoVaultMock,
      } = await loadFixture(defaultDeploy);
      await addPaymentTokenTest(
        { vault: depositVaultWithMorpho, owner },
        stableCoins.usdc,
        dataFeed.address,
        0,
        true,
      );
      await setRoundData({ mockedAggregator }, 4);

      await mintToken(stableCoins.usdc, owner, 100_000);
      await changeTokenAllowanceTest(
        { vault: depositVaultWithMorpho, owner },
        stableCoins.usdc.address,
        100,
      );
      await approveBase18(
        owner,
        stableCoins.usdc,
        depositVaultWithMorpho,
        100_000,
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
        99_999,
        {
          revertMessage: 'MV: exceed allowance',
        },
      );
    });

    it('should fail: if mint limit exceeded', async () => {
      const {
        depositVaultWithMorpho,
        mockedAggregator,
        owner,
        mTBILL,
        stableCoins,
        dataFeed,
        mTokenToUsdDataFeed,
        morphoVaultMock,
      } = await loadFixture(defaultDeploy);
      await addPaymentTokenTest(
        { vault: depositVaultWithMorpho, owner },
        stableCoins.usdc,
        dataFeed.address,
        0,
        true,
      );
      await setRoundData({ mockedAggregator }, 4);

      await mintToken(stableCoins.usdc, owner, 100_000);
      await setInstantLimitConfigTest(
        { vault: depositVaultWithMorpho, owner },
        1000,
      );

      await approveBase18(
        owner,
        stableCoins.usdc,
        depositVaultWithMorpho,
        100_000,
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
        99_999,
        {
          revertMessage: 'MV: exceed limit',
        },
      );
    });

    it('should fail: if min receive amount greater then actual', async () => {
      const {
        depositVaultWithMorpho,
        mockedAggregator,
        owner,
        mTBILL,
        stableCoins,
        dataFeed,
        mTokenToUsdDataFeed,
        morphoVaultMock,
      } = await loadFixture(defaultDeploy);
      await addPaymentTokenTest(
        { vault: depositVaultWithMorpho, owner },
        stableCoins.usdc,
        dataFeed.address,
        0,
        true,
      );
      await setRoundData({ mockedAggregator }, 4);

      await mintToken(stableCoins.usdc, owner, 100_000);

      await approveBase18(
        owner,
        stableCoins.usdc,
        depositVaultWithMorpho,
        100_000,
      );

      await depositInstantWithMorphoTest(
        {
          depositVaultWithMorpho,
          owner,
          mTBILL,
          mTokenToUsdDataFeed,
          morphoVaultMock,
          minAmount: parseUnits('100000'),
        },
        stableCoins.usdc,
        99_999,
        {
          revertMessage: 'DV: minReceiveAmount > actual',
        },
      );
    });

    it('should fail: if some fee = 100%', async () => {
      const {
        owner,
        depositVaultWithMorpho,
        stableCoins,
        mTBILL,
        dataFeed,
        mTokenToUsdDataFeed,
        morphoVaultMock,
      } = await loadFixture(defaultDeploy);

      await mintToken(stableCoins.usdc, owner, 100);
      await approveBase18(owner, stableCoins.usdc, depositVaultWithMorpho, 100);
      await addPaymentTokenTest(
        { vault: depositVaultWithMorpho, owner },
        stableCoins.usdc,
        dataFeed.address,
        10000,
        true,
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
          revertMessage: 'DV: mToken amount < min',
        },
      );

      await removePaymentTokenTest(
        { vault: depositVaultWithMorpho, owner },
        stableCoins.usdc,
      );
      await addPaymentTokenTest(
        { vault: depositVaultWithMorpho, owner },
        stableCoins.usdc,
        dataFeed.address,
        0,
        true,
      );
      await setInstantFeeTest({ vault: depositVaultWithMorpho, owner }, 10000);
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
        { revertMessage: 'DV: mToken amount < min' },
      );
    });

    it('should fail: greenlist enabled and user not in greenlist', async () => {
      const {
        owner,
        depositVaultWithMorpho,
        stableCoins,
        mTBILL,
        mTokenToUsdDataFeed,
        morphoVaultMock,
      } = await loadFixture(defaultDeploy);

      await depositVaultWithMorpho.setGreenlistEnable(true);

      await depositInstantWithMorphoTest(
        {
          depositVaultWithMorpho,
          owner,
          mTBILL,
          mTokenToUsdDataFeed,
          morphoVaultMock,
        },
        stableCoins.usdc,
        1,
        {
          revertMessage: 'WMAC: hasnt role',
        },
      );
    });

    it('should fail: user in sanctions list', async () => {
      const {
        owner,
        depositVaultWithMorpho,
        stableCoins,
        mTBILL,
        mTokenToUsdDataFeed,
        regularAccounts,
        mockedSanctionsList,
        morphoVaultMock,
      } = await loadFixture(defaultDeploy);

      await sanctionUser(
        { sanctionsList: mockedSanctionsList },
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
        1,
        {
          from: regularAccounts[0],
          revertMessage: 'WSL: sanctioned',
        },
      );
    });

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

    it('should fail: greenlist enabled and recipient not in greenlist (custom recipient overload)', async () => {
      const {
        owner,
        depositVaultWithMorpho,
        stableCoins,
        mTBILL,
        mTokenToUsdDataFeed,
        greenListableTester,
        accessControl,
        customRecipient,
        morphoVaultMock,
      } = await loadFixture(defaultDeploy);

      await greenList(
        { greenlistable: greenListableTester, accessControl, owner },
        owner,
      );

      await depositVaultWithMorpho.setGreenlistEnable(true);

      await depositInstantWithMorphoTest(
        {
          depositVaultWithMorpho,
          owner,
          mTBILL,
          mTokenToUsdDataFeed,
          morphoVaultMock,
          customRecipient,
        },
        stableCoins.usdc,
        1,
        {
          revertMessage: 'WMAC: hasnt role',
        },
      );
    });

    it('should fail: recipient in blacklist (custom recipient overload)', async () => {
      const {
        owner,
        depositVaultWithMorpho,
        stableCoins,
        mTBILL,
        mTokenToUsdDataFeed,
        accessControl,
        regularAccounts,
        customRecipient,
        morphoVaultMock,
      } = await loadFixture(defaultDeploy);

      await blackList(
        { blacklistable: depositVaultWithMorpho, accessControl, owner },
        customRecipient,
      );

      await depositInstantWithMorphoTest(
        {
          depositVaultWithMorpho,
          owner,
          mTBILL,
          mTokenToUsdDataFeed,
          morphoVaultMock,
          customRecipient,
        },
        stableCoins.usdc,
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
        depositVaultWithMorpho,
        stableCoins,
        mTBILL,
        mTokenToUsdDataFeed,
        regularAccounts,
        mockedSanctionsList,
        customRecipient,
        morphoVaultMock,
      } = await loadFixture(defaultDeploy);

      await sanctionUser(
        { sanctionsList: mockedSanctionsList },
        customRecipient,
      );

      await depositInstantWithMorphoTest(
        {
          depositVaultWithMorpho,
          owner,
          mTBILL,
          mTokenToUsdDataFeed,
          morphoVaultMock,
          customRecipient,
        },
        stableCoins.usdc,
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
        depositVaultWithMorpho,
        stableCoins,
        mTBILL,
        dataFeed,
        mTokenToUsdDataFeed,
        regularAccounts,
        customRecipient,
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
      const selector = encodeFnSelector(
        'depositInstant(address,uint256,uint256,bytes32,address)',
      );
      await pauseVaultFn(depositVaultWithMorpho, selector);
      await depositInstantWithMorphoTest(
        {
          depositVaultWithMorpho,
          owner,
          mTBILL,
          mTokenToUsdDataFeed,
          morphoVaultMock,
          customRecipient,
        },
        stableCoins.usdc,
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
