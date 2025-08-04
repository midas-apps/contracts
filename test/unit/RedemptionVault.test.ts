import { loadFixture } from '@nomicfoundation/hardhat-network-helpers';
import { expect } from 'chai';
import { constants } from 'ethers';
import { parseUnits } from 'ethers/lib/utils';
import { ethers } from 'hardhat';

import { encodeFnSelector } from '../../helpers/utils';
import {
  // eslint-disable-next-line camelcase
  ManageableVaultTester__factory,
  // eslint-disable-next-line camelcase
  MBasisRedemptionVault__factory,
  // eslint-disable-next-line camelcase
  RedemptionVaultTest__factory,
} from '../../typechain-types';
import { acErrors, blackList, greenList } from '../common/ac.helpers';
import {
  approveBase18,
  mintToken,
  pauseVault,
  pauseVaultFn,
} from '../common/common.helpers';
import {
  setMinGrowthApr,
  setRoundDataGrowth,
} from '../common/custom-feed-growth.helpers';
import { setRoundData } from '../common/data-feed.helpers';
import { defaultDeploy } from '../common/fixtures';
import {
  addPaymentTokenTest,
  addWaivedFeeAccountTest,
  changeTokenAllowanceTest,
  removePaymentTokenTest,
  removeWaivedFeeAccountTest,
  setInstantFeeTest,
  setInstantDailyLimitTest,
  setMinAmountTest,
  setVariabilityToleranceTest,
  withdrawTest,
  changeTokenFeeTest,
  setTokensReceiverTest,
  setFeeReceiverTest,
} from '../common/manageable-vault.helpers';
import {
  approveRedeemRequestTest,
  redeemFiatRequestTest,
  redeemInstantTest,
  redeemRequestTest,
  rejectRedeemRequestTest,
  safeApproveRedeemRequestTest,
  safeBulkApproveRequestTest,
  setFiatAdditionalFeeTest,
  setFiatFlatFeeTest,
  setMinFiatRedeemAmountTest,
  setRequestRedeemerTest,
} from '../common/redemption-vault.helpers';
import { sanctionUser } from '../common/with-sanctions-list.helpers';

describe('RedemptionVault', function () {
  it('deployment', async () => {
    const {
      redemptionVault,
      mTBILL,
      tokensReceiver,
      feeReceiver,
      mTokenToUsdDataFeed,
      roles,
    } = await loadFixture(defaultDeploy);

    expect(await redemptionVault.mToken()).eq(mTBILL.address);

    expect(await redemptionVault.ONE_HUNDRED_PERCENT()).eq('10000');

    expect(await redemptionVault.paused()).eq(false);

    expect(await redemptionVault.tokensReceiver()).eq(tokensReceiver.address);
    expect(await redemptionVault.feeReceiver()).eq(feeReceiver.address);

    expect(await redemptionVault.minAmount()).eq(1000);
    expect(await redemptionVault.minFiatRedeemAmount()).eq(1000);

    expect(await redemptionVault.instantFee()).eq('100');

    expect(await redemptionVault.instantDailyLimit()).eq(parseUnits('100000'));

    expect(await redemptionVault.mTokenDataFeed()).eq(
      mTokenToUsdDataFeed.address,
    );
    expect(await redemptionVault.variationTolerance()).eq(1);

    expect(await redemptionVault.vaultRole()).eq(
      roles.tokenRoles.mTBILL.redemptionVaultAdmin,
    );

    expect(await redemptionVault.MANUAL_FULLFILMENT_TOKEN()).eq(
      ethers.constants.AddressZero,
    );
  });

  it('failing deployment', async () => {
    const {
      redemptionVault,
      mTokenToUsdDataFeed,
      feeReceiver,
      tokensReceiver,
      mockedSanctionsList,
      requestRedeemer,
      accessControl,
      owner,
      mTBILL,
    } = await loadFixture(defaultDeploy);

    const redemptionVaultUninitialized = await new RedemptionVaultTest__factory(
      owner,
    ).deploy();

    await expect(
      redemptionVaultUninitialized.initialize(
        ethers.constants.AddressZero,
        {
          mToken: ethers.constants.AddressZero,
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
        {
          fiatAdditionalFee: 100,
          fiatFlatFee: parseUnits('1'),
          minFiatRedeemAmount: parseUnits('100'),
        },
        requestRedeemer.address,
      ),
    ).to.be.reverted;
    await expect(
      redemptionVaultUninitialized.initialize(
        accessControl.address,
        {
          mToken: mTBILL.address,
          mTokenDataFeed: ethers.constants.AddressZero,
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
        {
          fiatAdditionalFee: 100,
          fiatFlatFee: parseUnits('1'),
          minFiatRedeemAmount: parseUnits('100'),
        },
        requestRedeemer.address,
      ),
    ).to.be.reverted;
    await expect(
      redemptionVaultUninitialized.initialize(
        accessControl.address,
        {
          mToken: mTBILL.address,
          mTokenDataFeed: mTokenToUsdDataFeed.address,
        },
        {
          feeReceiver: ethers.constants.AddressZero,
          tokensReceiver: tokensReceiver.address,
        },
        {
          instantFee: 100,
          instantDailyLimit: parseUnits('100000'),
        },
        mockedSanctionsList.address,
        1,
        parseUnits('100'),
        {
          fiatAdditionalFee: 100,
          fiatFlatFee: parseUnits('1'),
          minFiatRedeemAmount: parseUnits('100'),
        },
        requestRedeemer.address,
      ),
    ).to.be.reverted;
    await expect(
      redemptionVaultUninitialized.initialize(
        accessControl.address,
        {
          mToken: mTBILL.address,
          mTokenDataFeed: mTokenToUsdDataFeed.address,
        },
        {
          feeReceiver: feeReceiver.address,
          tokensReceiver: ethers.constants.AddressZero,
        },
        {
          instantFee: 100,
          instantDailyLimit: parseUnits('100000'),
        },
        mockedSanctionsList.address,
        1,
        parseUnits('100'),
        {
          fiatAdditionalFee: 100,
          fiatFlatFee: parseUnits('1'),
          minFiatRedeemAmount: parseUnits('100'),
        },
        requestRedeemer.address,
      ),
    ).to.be.reverted;
    await expect(
      redemptionVaultUninitialized.initialize(
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
          instantFee: 10001,
          instantDailyLimit: parseUnits('100000'),
        },
        mockedSanctionsList.address,
        1,
        parseUnits('100'),
        {
          fiatAdditionalFee: 100,
          fiatFlatFee: parseUnits('1'),
          minFiatRedeemAmount: parseUnits('100'),
        },
        requestRedeemer.address,
      ),
    ).to.be.reverted;
    await expect(
      redemptionVaultUninitialized.initialize(
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
        {
          fiatAdditionalFee: 10001,
          fiatFlatFee: parseUnits('1'),
          minFiatRedeemAmount: parseUnits('100'),
        },
        requestRedeemer.address,
      ),
    ).to.be.reverted;

    await expect(
      redemptionVaultUninitialized.initialize(
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
        {
          fiatAdditionalFee: 100,
          fiatFlatFee: parseUnits('1'),
          minFiatRedeemAmount: parseUnits('100'),
        },
        constants.AddressZero,
      ),
    ).to.be.reverted;

    await expect(
      redemptionVault.initializeWithoutInitializer(
        ethers.constants.AddressZero,
        {
          mToken: ethers.constants.AddressZero,
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
        {
          fiatAdditionalFee: 100,
          fiatFlatFee: parseUnits('1'),
          minFiatRedeemAmount: parseUnits('100'),
        },
        requestRedeemer.address,
      ),
    ).to.be.revertedWith('Initializable: contract is not initializing');
  });

  describe('MBasisRedemptionVault', () => {
    describe('deployment', () => {
      it('vaultRole', async () => {
        const fixture = await loadFixture(defaultDeploy);

        const tester = await new MBasisRedemptionVault__factory(
          fixture.owner,
        ).deploy();

        expect(await tester.vaultRole()).eq(
          await tester.M_BASIS_REDEMPTION_VAULT_ADMIN_ROLE(),
        );
      });
    });
  });

  describe('initialization', () => {
    it('should fail: cal; initialize() when already initialized', async () => {
      const { redemptionVault } = await loadFixture(defaultDeploy);

      await expect(
        redemptionVault.initialize(
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
          {
            fiatAdditionalFee: 0,
            fiatFlatFee: 0,
            minFiatRedeemAmount: 0,
          },
          constants.AddressZero,
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
          1000,
        ),
      ).revertedWith('Initializable: contract is not initializing');
    });

    it('should fail: when _tokensReceiver == address(this)', async () => {
      const {
        owner,
        accessControl,
        mTBILL,
        feeReceiver,
        mTokenToUsdDataFeed,
        mockedSanctionsList,
      } = await loadFixture(defaultDeploy);

      const vault = await new ManageableVaultTester__factory(owner).deploy();

      await expect(
        vault.initialize(
          accessControl.address,
          {
            mToken: mTBILL.address,
            mTokenDataFeed: mTokenToUsdDataFeed.address,
          },
          {
            feeReceiver: feeReceiver.address,
            tokensReceiver: vault.address,
          },
          {
            instantFee: 100,
            instantDailyLimit: parseUnits('100000'),
          },
          mockedSanctionsList.address,
          1,
          1000,
        ),
      ).revertedWith('invalid address');
    });
    it('should fail: when _feeReceiver == address(this)', async () => {
      const {
        owner,
        accessControl,
        mTBILL,
        tokensReceiver,
        mTokenToUsdDataFeed,
        mockedSanctionsList,
      } = await loadFixture(defaultDeploy);

      const vault = await new ManageableVaultTester__factory(owner).deploy();

      await expect(
        vault.initialize(
          accessControl.address,
          {
            mToken: mTBILL.address,
            mTokenDataFeed: mTokenToUsdDataFeed.address,
          },
          {
            feeReceiver: vault.address,
            tokensReceiver: tokensReceiver.address,
          },
          {
            instantFee: 100,
            instantDailyLimit: parseUnits('100000'),
          },
          mockedSanctionsList.address,
          1,
          1000,
        ),
      ).revertedWith('invalid address');
    });
    it('should fail: when limit = 0', async () => {
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
        vault.initialize(
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
            instantDailyLimit: 0,
          },
          mockedSanctionsList.address,
          1,
          1000,
        ),
      ).revertedWith('zero limit');
    });
    it('should fail: when mToken dataFeed address zero', async () => {
      const {
        owner,
        accessControl,
        mTBILL,
        tokensReceiver,
        feeReceiver,
        mockedSanctionsList,
      } = await loadFixture(defaultDeploy);

      const vault = await new ManageableVaultTester__factory(owner).deploy();

      await expect(
        vault.initialize(
          accessControl.address,
          {
            mToken: mTBILL.address,
            mTokenDataFeed: constants.AddressZero,
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
          1000,
        ),
      ).revertedWith('zero address');
    });
    it('should fail: when variationTolarance zero', async () => {
      const {
        owner,
        accessControl,
        mTBILL,
        tokensReceiver,
        feeReceiver,
        mockedSanctionsList,
        mTokenToUsdDataFeed,
      } = await loadFixture(defaultDeploy);

      const vault = await new ManageableVaultTester__factory(owner).deploy();

      await expect(
        vault.initialize(
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
          0,
          1000,
        ),
      ).revertedWith('fee == 0');
    });
  });

  describe('setTokensReceiver()', () => {
    it('should fail: call from address without REDEMPTION_VAULT_ADMIN_ROLE role', async () => {
      const { owner, redemptionVault, regularAccounts } = await loadFixture(
        defaultDeploy,
      );

      await setTokensReceiverTest(
        { vault: redemptionVault, owner },
        regularAccounts[0].address,
        {
          from: regularAccounts[0],
          revertMessage: acErrors.WMAC_HASNT_ROLE,
        },
      );
    });

    it('should fail: call with zero address receiver', async () => {
      const { owner, redemptionVault } = await loadFixture(defaultDeploy);

      await setTokensReceiverTest(
        { vault: redemptionVault, owner },
        constants.AddressZero,
        {
          revertMessage: 'zero address',
        },
      );
    });

    it('should fail: call with address(this) receiver', async () => {
      const { owner, redemptionVault } = await loadFixture(defaultDeploy);

      await setTokensReceiverTest(
        { vault: redemptionVault, owner },
        redemptionVault.address,
        {
          revertMessage: 'invalid address',
        },
      );
    });

    it('call from address without REDEMPTION_VAULT_ADMIN_ROLE role', async () => {
      const { owner, redemptionVault, regularAccounts } = await loadFixture(
        defaultDeploy,
      );

      await setTokensReceiverTest(
        { vault: redemptionVault, owner },
        regularAccounts[0].address,
      );
    });
  });

  describe('setMinAmount()', () => {
    it('should fail: call from address without DEPOSIT_VAULT_ADMIN_ROLE role', async () => {
      const { owner, redemptionVault, regularAccounts } = await loadFixture(
        defaultDeploy,
      );

      await setMinAmountTest({ vault: redemptionVault, owner }, 1.1, {
        from: regularAccounts[0],
        revertMessage: acErrors.WMAC_HASNT_ROLE,
      });
    });

    it('call from address with DEPOSIT_VAULT_ADMIN_ROLE role', async () => {
      const { owner, redemptionVault } = await loadFixture(defaultDeploy);
      await setMinAmountTest({ vault: redemptionVault, owner }, 1.1);
    });
  });

  describe('setMinFiatRedeemAmount()', () => {
    it('should fail: call from address without REDEMPTION_VAULT_ADMIN_ROLE role', async () => {
      const { owner, redemptionVault, regularAccounts } = await loadFixture(
        defaultDeploy,
      );

      await setMinFiatRedeemAmountTest({ redemptionVault, owner }, 1.1, {
        from: regularAccounts[0],
        revertMessage: acErrors.WMAC_HASNT_ROLE,
      });
    });

    it('call from address with REDEMPTION_VAULT_ADMIN_ROLE role', async () => {
      const { owner, redemptionVault } = await loadFixture(defaultDeploy);
      await setMinFiatRedeemAmountTest({ redemptionVault, owner }, 1.1);
    });
  });

  describe('setFeeReceiver()', () => {
    it('should fail: call from address without REDEMPTION_VAULT_ADMIN_ROLE role', async () => {
      const { owner, redemptionVault, regularAccounts } = await loadFixture(
        defaultDeploy,
      );

      await setFeeReceiverTest(
        { vault: redemptionVault, owner },
        regularAccounts[0].address,
        {
          from: regularAccounts[0],
          revertMessage: acErrors.WMAC_HASNT_ROLE,
        },
      );
    });

    it('call from address with REDEMPTION_VAULT_ADMIN_ROLE role', async () => {
      const { owner, redemptionVault, regularAccounts } = await loadFixture(
        defaultDeploy,
      );
      await setFeeReceiverTest(
        { vault: redemptionVault, owner },
        regularAccounts[0].address,
      );
    });
  });

  describe('sanctionsListAdminRole()', () => {
    it('should return same role as vaultRole()', async () => {
      const { redemptionVault } = await loadFixture(defaultDeploy);
      const vaultRole = await redemptionVault.vaultRole();
      const sanctionsListAdminRole =
        await redemptionVault.sanctionsListAdminRole();

      expect(sanctionsListAdminRole).eq(vaultRole);
    });
  });

  describe('setFiatFlatFee()', () => {
    it('should fail: call from address without REDEMPTION_VAULT_ADMIN_ROLE role', async () => {
      const { owner, redemptionVault, regularAccounts } = await loadFixture(
        defaultDeploy,
      );

      await setFiatFlatFeeTest({ redemptionVault, owner }, 100, {
        from: regularAccounts[0],
        revertMessage: acErrors.WMAC_HASNT_ROLE,
      });
    });

    it('call from address with REDEMPTION_VAULT_ADMIN_ROLE role', async () => {
      const { owner, redemptionVault } = await loadFixture(defaultDeploy);
      await setFiatFlatFeeTest({ redemptionVault, owner }, 100);
    });
  });

  describe('setFiatAdditionalFee()', () => {
    it('should fail: call from address without REDEMPTION_VAULT_ADMIN_ROLE role', async () => {
      const { owner, redemptionVault, regularAccounts } = await loadFixture(
        defaultDeploy,
      );

      await setFiatAdditionalFeeTest({ redemptionVault, owner }, 100, {
        from: regularAccounts[0],
        revertMessage: acErrors.WMAC_HASNT_ROLE,
      });
    });

    it('call from address with REDEMPTION_VAULT_ADMIN_ROLE role', async () => {
      const { owner, redemptionVault } = await loadFixture(defaultDeploy);
      await setFiatAdditionalFeeTest({ redemptionVault, owner }, 100);
    });
  });

  describe('setInstantDailyLimit()', () => {
    it('should fail: call from address without REDEMPTION_VAULT_ADMIN_ROLE role', async () => {
      const { owner, redemptionVault, regularAccounts } = await loadFixture(
        defaultDeploy,
      );

      await setInstantDailyLimitTest(
        { vault: redemptionVault, owner },
        parseUnits('1000'),
        {
          from: regularAccounts[0],
          revertMessage: acErrors.WMAC_HASNT_ROLE,
        },
      );
    });

    it('should fail: try to set 0 limit', async () => {
      const { owner, redemptionVault } = await loadFixture(defaultDeploy);

      await setInstantDailyLimitTest(
        { vault: redemptionVault, owner },
        constants.Zero,
        {
          revertMessage: 'MV: limit zero',
        },
      );
    });

    it('call from address with REDEMPTION_VAULT_ADMIN_ROLE role', async () => {
      const { owner, redemptionVault } = await loadFixture(defaultDeploy);
      await setInstantDailyLimitTest(
        { vault: redemptionVault, owner },
        parseUnits('1000'),
      );
    });
  });

  describe('addPaymentToken()', () => {
    it('should fail: call from address without REDEMPTION_VAULT_ADMIN_ROLE role', async () => {
      const { redemptionVault, regularAccounts, owner } = await loadFixture(
        defaultDeploy,
      );
      await addPaymentTokenTest(
        { vault: redemptionVault, owner },
        ethers.constants.AddressZero,
        ethers.constants.AddressZero,
        0,
        true,
        constants.MaxUint256,
        { revertMessage: acErrors.WMAC_HASNT_ROLE, from: regularAccounts[0] },
      );
    });

    it('should fail: when token is already added', async () => {
      const { redemptionVault, stableCoins, owner, dataFeed } =
        await loadFixture(defaultDeploy);
      await addPaymentTokenTest(
        { vault: redemptionVault, owner },
        stableCoins.dai,
        dataFeed.address,
        0,
        true,
      );
      await addPaymentTokenTest(
        { vault: redemptionVault, owner },
        stableCoins.dai,
        dataFeed.address,
        0,
        true,
        constants.MaxUint256,
        {
          revertMessage: 'MV: already added',
        },
      );
    });

    it('should fail: when token dataFeed address zero', async () => {
      const { redemptionVault, stableCoins, owner } = await loadFixture(
        defaultDeploy,
      );
      await addPaymentTokenTest(
        { vault: redemptionVault, owner },
        stableCoins.dai,
        constants.AddressZero,
        0,
        true,
        constants.MaxUint256,
        {
          revertMessage: 'zero address',
        },
      );
    });

    it('call when allowance is zero', async () => {
      const { redemptionVault, stableCoins, owner, dataFeed } =
        await loadFixture(defaultDeploy);
      await addPaymentTokenTest(
        { vault: redemptionVault, owner },
        stableCoins.dai,
        dataFeed.address,
        0,
        false,
        constants.Zero,
      );
    });

    it('call when allowance is not uint256 max', async () => {
      const { redemptionVault, stableCoins, owner, dataFeed } =
        await loadFixture(defaultDeploy);
      await addPaymentTokenTest(
        { vault: redemptionVault, owner },
        stableCoins.dai,
        dataFeed.address,
        0,
        false,
        parseUnits('100'),
      );
    });

    it('call from address with REDEMPTION_VAULT_ADMIN_ROLE role', async () => {
      const { redemptionVault, stableCoins, owner, dataFeed } =
        await loadFixture(defaultDeploy);
      await addPaymentTokenTest(
        { vault: redemptionVault, owner },
        stableCoins.dai,
        dataFeed.address,
        0,
        true,
      );
    });

    it('call from address with REDEMPTION_VAULT_ADMIN_ROLE role and add 3 options on a row', async () => {
      const { redemptionVault, stableCoins, owner, dataFeed } =
        await loadFixture(defaultDeploy);

      await addPaymentTokenTest(
        { vault: redemptionVault, owner },
        stableCoins.dai,
        dataFeed.address,
        0,
        true,
      );
      await addPaymentTokenTest(
        { vault: redemptionVault, owner },
        stableCoins.usdc,
        dataFeed.address,
        0,
        true,
      );
      await addPaymentTokenTest(
        { vault: redemptionVault, owner },
        stableCoins.usdt,
        dataFeed.address,
        0,
        true,
      );
    });
  });

  describe('addWaivedFeeAccount()', () => {
    it('should fail: call from address without REDEMPTION_VAULT_ADMIN_ROLE role', async () => {
      const { redemptionVault, regularAccounts, owner } = await loadFixture(
        defaultDeploy,
      );
      await addWaivedFeeAccountTest(
        { vault: redemptionVault, owner },
        ethers.constants.AddressZero,
        { revertMessage: acErrors.WMAC_HASNT_ROLE, from: regularAccounts[0] },
      );
    });
    it('should fail: if account fee already waived', async () => {
      const { redemptionVault, owner } = await loadFixture(defaultDeploy);
      await addWaivedFeeAccountTest(
        { vault: redemptionVault, owner },
        owner.address,
      );
      await addWaivedFeeAccountTest(
        { vault: redemptionVault, owner },
        owner.address,
        { revertMessage: 'MV: already added' },
      );
    });

    it('call from address with REDEMPTION_VAULT_ADMIN_ROLE role', async () => {
      const { redemptionVault, owner } = await loadFixture(defaultDeploy);
      await addWaivedFeeAccountTest(
        { vault: redemptionVault, owner },
        owner.address,
      );
    });
  });

  describe('removeWaivedFeeAccount()', () => {
    it('should fail: call from address without REDEMPTION_VAULT_ADMIN_ROLE role', async () => {
      const { redemptionVault, regularAccounts, owner } = await loadFixture(
        defaultDeploy,
      );
      await removeWaivedFeeAccountTest(
        { vault: redemptionVault, owner },
        ethers.constants.AddressZero,
        { revertMessage: acErrors.WMAC_HASNT_ROLE, from: regularAccounts[0] },
      );
    });
    it('should fail: if account not found in restriction', async () => {
      const { redemptionVault, owner } = await loadFixture(defaultDeploy);
      await removeWaivedFeeAccountTest(
        { vault: redemptionVault, owner },
        owner.address,
        { revertMessage: 'MV: not found' },
      );
    });

    it('call from address with REDEMPTION_VAULT_ADMIN_ROLE role', async () => {
      const { redemptionVault, owner } = await loadFixture(defaultDeploy);
      await addWaivedFeeAccountTest(
        { vault: redemptionVault, owner },
        owner.address,
      );
      await removeWaivedFeeAccountTest(
        { vault: redemptionVault, owner },
        owner.address,
      );
    });
  });

  describe('setFee()', () => {
    it('should fail: call from address without REDEMPTION_VAULT_ADMIN_ROLE role', async () => {
      const { redemptionVault, regularAccounts, owner } = await loadFixture(
        defaultDeploy,
      );
      await setInstantFeeTest(
        { vault: redemptionVault, owner },
        ethers.constants.Zero,
        { revertMessage: acErrors.WMAC_HASNT_ROLE, from: regularAccounts[0] },
      );
    });

    it('should fail: if new value greater then 100%', async () => {
      const { redemptionVault, owner } = await loadFixture(defaultDeploy);
      await setInstantFeeTest({ vault: redemptionVault, owner }, 10001, {
        revertMessage: 'fee > 100%',
      });
    });

    it('call from address with REDEMPTION_VAULT_ADMIN_ROLE role', async () => {
      const { redemptionVault, owner } = await loadFixture(defaultDeploy);
      await setInstantFeeTest({ vault: redemptionVault, owner }, 100);
    });
  });

  describe('setVariabilityTolerance()', () => {
    it('should fail: call from address without REDEMPTION_VAULT_ADMIN_ROLE role', async () => {
      const { redemptionVault, regularAccounts, owner } = await loadFixture(
        defaultDeploy,
      );
      await setVariabilityToleranceTest(
        { vault: redemptionVault, owner },
        ethers.constants.Zero,
        { revertMessage: acErrors.WMAC_HASNT_ROLE, from: regularAccounts[0] },
      );
    });
    it('should fail: if new value zero', async () => {
      const { redemptionVault, owner } = await loadFixture(defaultDeploy);
      await setVariabilityToleranceTest(
        { vault: redemptionVault, owner },
        ethers.constants.Zero,
        { revertMessage: 'fee == 0' },
      );
    });

    it('should fail: if new value greater then 100%', async () => {
      const { redemptionVault, owner } = await loadFixture(defaultDeploy);
      await setVariabilityToleranceTest(
        { vault: redemptionVault, owner },
        10001,
        { revertMessage: 'fee > 100%' },
      );
    });

    it('call from address with REDEMPTION_VAULT_ADMIN_ROLE role', async () => {
      const { redemptionVault, owner } = await loadFixture(defaultDeploy);
      await setVariabilityToleranceTest({ vault: redemptionVault, owner }, 100);
    });
  });

  describe('setRequestRedeemer()', () => {
    it('should fail: call from address without REDEMPTION_VAULT_ADMIN_ROLE role', async () => {
      const { redemptionVault, regularAccounts, owner } = await loadFixture(
        defaultDeploy,
      );
      await setRequestRedeemerTest(
        { redemptionVault, owner },
        ethers.constants.AddressZero,
        { revertMessage: acErrors.WMAC_HASNT_ROLE, from: regularAccounts[0] },
      );
    });
    it('should fail: if redeemer address zero', async () => {
      const { redemptionVault, owner } = await loadFixture(defaultDeploy);
      await setRequestRedeemerTest(
        { redemptionVault, owner },
        ethers.constants.AddressZero,
        { revertMessage: 'zero address' },
      );
    });

    it('call from address with REDEMPTION_VAULT_ADMIN_ROLE role', async () => {
      const { redemptionVault, owner } = await loadFixture(defaultDeploy);
      await setRequestRedeemerTest({ redemptionVault, owner }, owner.address);
    });
  });

  describe('removePaymentToken()', () => {
    it('should fail: call from address without REDEMPTION_VAULT_ADMIN_ROLE role', async () => {
      const { redemptionVault, regularAccounts, owner } = await loadFixture(
        defaultDeploy,
      );
      await removePaymentTokenTest(
        { vault: redemptionVault, owner },
        ethers.constants.AddressZero,
        { revertMessage: acErrors.WMAC_HASNT_ROLE, from: regularAccounts[0] },
      );
    });

    it('should fail: when token is not exists', async () => {
      const { owner, redemptionVault, stableCoins } = await loadFixture(
        defaultDeploy,
      );
      await removePaymentTokenTest(
        { vault: redemptionVault, owner },
        stableCoins.dai.address,
        { revertMessage: 'MV: not exists' },
      );
    });

    it('call from address with REDEMPTION_VAULT_ADMIN_ROLE role', async () => {
      const { redemptionVault, stableCoins, owner, dataFeed } =
        await loadFixture(defaultDeploy);
      await addPaymentTokenTest(
        { vault: redemptionVault, owner },
        stableCoins.dai,
        dataFeed.address,
        0,
        true,
      );
      await removePaymentTokenTest(
        { vault: redemptionVault, owner },
        stableCoins.dai.address,
      );
    });

    it('call from address with REDEMPTION_VAULT_ADMIN_ROLE role and add 3 options on a row', async () => {
      const { redemptionVault, owner, stableCoins, dataFeed } =
        await loadFixture(defaultDeploy);

      await addPaymentTokenTest(
        { vault: redemptionVault, owner },
        stableCoins.dai,
        dataFeed.address,
        0,
        true,
      );
      await addPaymentTokenTest(
        { vault: redemptionVault, owner },
        stableCoins.usdc,
        dataFeed.address,
        0,
        true,
      );
      await addPaymentTokenTest(
        { vault: redemptionVault, owner },
        stableCoins.usdt,
        dataFeed.address,
        0,
        true,
      );

      await removePaymentTokenTest(
        { vault: redemptionVault, owner },
        stableCoins.dai.address,
      );
      await removePaymentTokenTest(
        { vault: redemptionVault, owner },
        stableCoins.usdc.address,
      );
      await removePaymentTokenTest(
        { vault: redemptionVault, owner },
        stableCoins.usdt.address,
      );

      await removePaymentTokenTest(
        { vault: redemptionVault, owner },
        stableCoins.usdt.address,
        { revertMessage: 'MV: not exists' },
      );
    });
  });

  describe('withdrawToken()', () => {
    it('should fail: call from address without REDEMPTION_VAULT_ADMIN_ROLE role', async () => {
      const { redemptionVault, regularAccounts, owner } = await loadFixture(
        defaultDeploy,
      );
      await withdrawTest(
        { vault: redemptionVault, owner },
        ethers.constants.AddressZero,
        0,
        ethers.constants.AddressZero,
        { revertMessage: acErrors.WMAC_HASNT_ROLE, from: regularAccounts[0] },
      );
    });

    it('should fail: when there is no token in vault', async () => {
      const { owner, redemptionVault, regularAccounts, stableCoins } =
        await loadFixture(defaultDeploy);
      await withdrawTest(
        { vault: redemptionVault, owner },
        stableCoins.dai,
        1,
        regularAccounts[0],
        { revertMessage: 'ERC20: transfer amount exceeds balance' },
      );
    });

    it('call from address with REDEMPTION_VAULT_ADMIN_ROLE role', async () => {
      const { redemptionVault, regularAccounts, stableCoins, owner } =
        await loadFixture(defaultDeploy);
      await mintToken(stableCoins.dai, redemptionVault, 1);
      await withdrawTest(
        { vault: redemptionVault, owner },
        stableCoins.dai,
        1,
        regularAccounts[0],
      );
    });
  });

  describe('freeFromMinAmount()', async () => {
    it('should fail: call from address without vault admin role', async () => {
      const { redemptionVault, regularAccounts } = await loadFixture(
        defaultDeploy,
      );
      await expect(
        redemptionVault
          .connect(regularAccounts[0])
          .freeFromMinAmount(regularAccounts[1].address, true),
      ).to.be.revertedWith('WMAC: hasnt role');
    });
    it('should not fail', async () => {
      const { redemptionVault, regularAccounts } = await loadFixture(
        defaultDeploy,
      );
      await expect(
        redemptionVault.freeFromMinAmount(regularAccounts[0].address, true),
      ).to.not.reverted;

      expect(
        await redemptionVault.isFreeFromMinAmount(regularAccounts[0].address),
      ).to.eq(true);
    });
    it('should fail: already in list', async () => {
      const { redemptionVault, regularAccounts } = await loadFixture(
        defaultDeploy,
      );
      await expect(
        redemptionVault.freeFromMinAmount(regularAccounts[0].address, true),
      ).to.not.reverted;

      expect(
        await redemptionVault.isFreeFromMinAmount(regularAccounts[0].address),
      ).to.eq(true);

      await expect(
        redemptionVault.freeFromMinAmount(regularAccounts[0].address, true),
      ).to.revertedWith('DV: already free');
    });
  });

  describe('changeTokenAllowance()', () => {
    it('should fail: call from address without REDEMPTION_VAULT_ADMIN_ROLE role', async () => {
      const { redemptionVault, regularAccounts, owner } = await loadFixture(
        defaultDeploy,
      );
      await changeTokenAllowanceTest(
        { vault: redemptionVault, owner },
        ethers.constants.AddressZero,
        0,
        { revertMessage: acErrors.WMAC_HASNT_ROLE, from: regularAccounts[0] },
      );
    });
    it('should fail: token not exist', async () => {
      const { redemptionVault, owner, stableCoins } = await loadFixture(
        defaultDeploy,
      );
      await changeTokenAllowanceTest(
        { vault: redemptionVault, owner },
        stableCoins.dai.address,
        0,
        { revertMessage: 'MV: token not exists' },
      );
    });
    it('should fail: allowance zero', async () => {
      const { redemptionVault, owner, stableCoins, dataFeed } =
        await loadFixture(defaultDeploy);
      await addPaymentTokenTest(
        { vault: redemptionVault, owner },
        stableCoins.dai,
        dataFeed.address,
        0,
        true,
      );
      await changeTokenAllowanceTest(
        { vault: redemptionVault, owner },
        stableCoins.dai.address,
        0,
        { revertMessage: 'MV: zero allowance' },
      );
    });
    it('should fail: if mint exceed allowance', async () => {
      const {
        redemptionVault,
        stableCoins,
        owner,
        dataFeed,
        mTBILL,
        mTokenToUsdDataFeed,
      } = await loadFixture(defaultDeploy);
      await mintToken(stableCoins.dai, owner, 100000);
      await approveBase18(owner, stableCoins.dai, redemptionVault, 100000);
      await addPaymentTokenTest(
        { vault: redemptionVault, owner },
        stableCoins.dai,
        dataFeed.address,
        0,
        true,
      );
      await changeTokenAllowanceTest(
        { vault: redemptionVault, owner },
        stableCoins.dai.address,
        100,
      );

      await redeemInstantTest(
        { redemptionVault, owner, mTBILL, mTokenToUsdDataFeed },
        stableCoins.dai,
        99_999,
        {
          revertMessage: 'MV: exceed allowance',
        },
      );

      await redeemInstantTest(
        { redemptionVault, owner, mTBILL, mTokenToUsdDataFeed },
        stableCoins.dai,
        99_999,
        {
          revertMessage: 'MV: exceed allowance',
        },
      );
    });
    it('call from address with REDEMPTION_VAULT_ADMIN_ROLE role', async () => {
      const { redemptionVault, owner, stableCoins, dataFeed } =
        await loadFixture(defaultDeploy);
      await addPaymentTokenTest(
        { vault: redemptionVault, owner },
        stableCoins.dai,
        dataFeed.address,
        0,
        true,
      );
      await changeTokenAllowanceTest(
        { vault: redemptionVault, owner },
        stableCoins.dai.address,
        100000000,
      );
    });
    it('should decrease if allowance < UINT_MAX', async () => {
      const {
        redemptionVault,
        stableCoins,
        owner,
        dataFeed,
        mTBILL,
        mTokenToUsdDataFeed,
        mockedAggregator,
        mockedAggregatorMToken,
      } = await loadFixture(defaultDeploy);
      await mintToken(stableCoins.dai, redemptionVault, 100000);
      await mintToken(mTBILL, owner, 100000);
      await approveBase18(owner, mTBILL, redemptionVault, 100000);

      await addPaymentTokenTest(
        { vault: redemptionVault, owner },
        stableCoins.dai,
        dataFeed.address,
        0,
        true,
      );
      await changeTokenAllowanceTest(
        { vault: redemptionVault, owner },
        stableCoins.dai.address,
        parseUnits('1000'),
      );
      await setRoundData({ mockedAggregator }, 1);
      await setRoundData({ mockedAggregator: mockedAggregatorMToken }, 1);

      const tokenConfigBefore = await redemptionVault.tokensConfig(
        stableCoins.dai.address,
      );

      await redeemInstantTest(
        { redemptionVault, owner, mTBILL, mTokenToUsdDataFeed },
        stableCoins.dai,
        999,
      );

      const tokenConfigAfter = await redemptionVault.tokensConfig(
        stableCoins.dai.address,
      );

      expect(tokenConfigBefore.allowance.sub(tokenConfigAfter.allowance)).eq(
        parseUnits('999'),
      );
    });
    it('should not decrease if allowance = UINT_MAX', async () => {
      const {
        redemptionVault,
        stableCoins,
        owner,
        dataFeed,
        mTBILL,
        mTokenToUsdDataFeed,
        mockedAggregator,
        mockedAggregatorMToken,
      } = await loadFixture(defaultDeploy);
      await mintToken(stableCoins.dai, redemptionVault, 100000);
      await mintToken(mTBILL, owner, 100000);
      await approveBase18(owner, mTBILL, redemptionVault, 100000);

      await addPaymentTokenTest(
        { vault: redemptionVault, owner },
        stableCoins.dai,
        dataFeed.address,
        0,
        true,
      );
      await changeTokenAllowanceTest(
        { vault: redemptionVault, owner },
        stableCoins.dai.address,
        constants.MaxUint256,
      );

      await setRoundData({ mockedAggregator }, 1);
      await setRoundData({ mockedAggregator: mockedAggregatorMToken }, 1);

      const tokenConfigBefore = await redemptionVault.tokensConfig(
        stableCoins.dai.address,
      );

      await redeemInstantTest(
        { redemptionVault, owner, mTBILL, mTokenToUsdDataFeed },
        stableCoins.dai,
        999,
      );

      const tokenConfigAfter = await redemptionVault.tokensConfig(
        stableCoins.dai.address,
      );

      expect(tokenConfigBefore.allowance).eq(tokenConfigAfter.allowance);
    });
  });

  describe('changeTokenFee()', () => {
    it('should fail: call from address without REDEMPTION_VAULT_ADMIN_ROLE role', async () => {
      const { redemptionVault, regularAccounts, owner } = await loadFixture(
        defaultDeploy,
      );
      await changeTokenFeeTest(
        { vault: redemptionVault, owner },
        ethers.constants.AddressZero,
        0,
        { revertMessage: acErrors.WMAC_HASNT_ROLE, from: regularAccounts[0] },
      );
    });
    it('should fail: token not exist', async () => {
      const { redemptionVault, owner, stableCoins } = await loadFixture(
        defaultDeploy,
      );
      await changeTokenFeeTest(
        { vault: redemptionVault, owner },
        stableCoins.dai.address,
        0,
        { revertMessage: 'MV: token not exists' },
      );
    });
    it('should fail: fee > 100%', async () => {
      const { redemptionVault, owner, stableCoins, dataFeed } =
        await loadFixture(defaultDeploy);
      await addPaymentTokenTest(
        { vault: redemptionVault, owner },
        stableCoins.dai,
        dataFeed.address,
        0,
        true,
      );
      await changeTokenFeeTest(
        { vault: redemptionVault, owner },
        stableCoins.dai.address,
        10001,
        { revertMessage: 'fee > 100%' },
      );
    });
    it('call from address with REDEMPTION_VAULT_ADMIN_ROLE role', async () => {
      const { redemptionVault, owner, stableCoins, dataFeed } =
        await loadFixture(defaultDeploy);
      await addPaymentTokenTest(
        { vault: redemptionVault, owner },
        stableCoins.dai,
        dataFeed.address,
        0,
        true,
      );
      await changeTokenFeeTest(
        { vault: redemptionVault, owner },
        stableCoins.dai.address,
        100,
      );
    });
  });

  describe('redeemInstant()', () => {
    it('should fail: when there is no token in vault', async () => {
      const {
        owner,
        redemptionVault,
        stableCoins,
        mTBILL,
        mTokenToUsdDataFeed,
      } = await loadFixture(defaultDeploy);

      await redeemInstantTest(
        { redemptionVault, owner, mTBILL, mTokenToUsdDataFeed },
        stableCoins.dai,
        1,
        {
          revertMessage: 'MV: token not exists',
        },
      );
    });

    it('should fail: when trying to redeem 0 amount', async () => {
      const {
        owner,
        redemptionVault,
        stableCoins,
        mTBILL,
        dataFeed,
        mTokenToUsdDataFeed,
      } = await loadFixture(defaultDeploy);
      await addPaymentTokenTest(
        { vault: redemptionVault, owner },
        stableCoins.dai,
        dataFeed.address,
        0,
        true,
      );
      await redeemInstantTest(
        { redemptionVault, owner, mTBILL, mTokenToUsdDataFeed },
        stableCoins.dai,
        0,
        {
          revertMessage: 'RV: invalid amount',
        },
      );
    });

    it('should fail: when function paused', async () => {
      const {
        owner,
        redemptionVault,
        stableCoins,
        mTBILL,
        dataFeed,
        mTokenToUsdDataFeed,
        regularAccounts,
      } = await loadFixture(defaultDeploy);
      await mintToken(mTBILL, regularAccounts[0], 100);
      await approveBase18(
        regularAccounts[0],
        stableCoins.dai,
        redemptionVault,
        100,
      );
      await addPaymentTokenTest(
        { vault: redemptionVault, owner },
        stableCoins.dai,
        dataFeed.address,
        0,
        true,
      );
      const selector = encodeFnSelector(
        'redeemInstant(address,uint256,uint256)',
      );
      await pauseVaultFn(redemptionVault, selector);
      await redeemInstantTest(
        { redemptionVault, owner, mTBILL, mTokenToUsdDataFeed },
        stableCoins.dai,
        100,
        {
          from: regularAccounts[0],
          revertMessage: 'Pausable: fn paused',
        },
      );
    });

    it('should fail: call with insufficient allowance', async () => {
      const {
        owner,
        redemptionVault,
        stableCoins,
        mTBILL,
        dataFeed,
        mTokenToUsdDataFeed,
      } = await loadFixture(defaultDeploy);

      await mintToken(mTBILL, owner, 100);
      await addPaymentTokenTest(
        { vault: redemptionVault, owner },
        stableCoins.dai,
        dataFeed.address,
        0,
        true,
      );
      await redeemInstantTest(
        { redemptionVault, owner, mTBILL, mTokenToUsdDataFeed },
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
        redemptionVault,
        stableCoins,
        mTBILL,
        dataFeed,
        mTokenToUsdDataFeed,
      } = await loadFixture(defaultDeploy);

      await approveBase18(owner, mTBILL, redemptionVault, 100);
      await addPaymentTokenTest(
        { vault: redemptionVault, owner },
        stableCoins.dai,
        dataFeed.address,
        0,
        true,
      );
      await redeemInstantTest(
        { redemptionVault, owner, mTBILL, mTokenToUsdDataFeed },
        stableCoins.dai,
        100,
        {
          revertMessage: 'ERC20: burn amount exceeds balance',
        },
      );
    });

    it('should fail: dataFeed rate 0 ', async () => {
      const {
        owner,
        redemptionVault,
        stableCoins,
        mTBILL,
        dataFeed,
        mockedAggregator,
        mockedAggregatorMToken,
        mTokenToUsdDataFeed,
      } = await loadFixture(defaultDeploy);

      await approveBase18(owner, stableCoins.dai, redemptionVault, 10);
      await addPaymentTokenTest(
        { vault: redemptionVault, owner },
        stableCoins.dai,
        dataFeed.address,
        0,
        true,
      );
      await mintToken(mTBILL, owner, 100_000);
      await setRoundData({ mockedAggregator }, 0);
      await redeemInstantTest(
        { redemptionVault, owner, mTBILL, mTokenToUsdDataFeed },
        stableCoins.dai,
        1,
        {
          revertMessage: 'DF: feed is deprecated',
        },
      );
      await setRoundData({ mockedAggregator }, 1);
      await setRoundData({ mockedAggregator: mockedAggregatorMToken }, 0);
      await redeemInstantTest(
        { redemptionVault, owner, mTBILL, mTokenToUsdDataFeed },
        stableCoins.dai,
        1,
        {
          revertMessage: 'DF: feed is deprecated',
        },
      );
    });

    it('should fail: call for amount < minAmount', async () => {
      const {
        redemptionVault,
        mockedAggregator,
        owner,
        mTBILL,
        stableCoins,
        dataFeed,
        mTokenToUsdDataFeed,
      } = await loadFixture(defaultDeploy);
      await addPaymentTokenTest(
        { vault: redemptionVault, owner },
        stableCoins.dai,
        dataFeed.address,
        0,
        true,
      );
      await setRoundData({ mockedAggregator }, 1);

      await mintToken(mTBILL, owner, 100_000);
      await approveBase18(owner, mTBILL, redemptionVault, 100_000);

      await setMinAmountTest({ vault: redemptionVault, owner }, 100_000);

      await redeemInstantTest(
        { redemptionVault, owner, mTBILL, mTokenToUsdDataFeed },
        stableCoins.dai,
        99_999,
        {
          revertMessage: 'RV: amount < min',
        },
      );
    });

    it('should fail: if exceed allowance of deposit by token', async () => {
      const {
        redemptionVault,
        mockedAggregator,
        owner,
        mTBILL,
        stableCoins,
        dataFeed,
        mTokenToUsdDataFeed,
      } = await loadFixture(defaultDeploy);
      await addPaymentTokenTest(
        { vault: redemptionVault, owner },
        stableCoins.dai,
        dataFeed.address,
        0,
        true,
      );
      await setRoundData({ mockedAggregator }, 4);

      await mintToken(mTBILL, owner, 100_000);
      await changeTokenAllowanceTest(
        { vault: redemptionVault, owner },
        stableCoins.dai.address,
        100,
      );
      await approveBase18(owner, mTBILL, redemptionVault, 100_000);

      await redeemInstantTest(
        { redemptionVault, owner, mTBILL, mTokenToUsdDataFeed },
        stableCoins.dai,
        99_999,
        {
          revertMessage: 'MV: exceed allowance',
        },
      );
    });

    it('should fail: if redeem daily limit exceeded', async () => {
      const {
        redemptionVault,
        mockedAggregator,
        owner,
        mTBILL,
        stableCoins,
        dataFeed,
        mTokenToUsdDataFeed,
      } = await loadFixture(defaultDeploy);
      await addPaymentTokenTest(
        { vault: redemptionVault, owner },
        stableCoins.dai,
        dataFeed.address,
        0,
        true,
      );
      await setRoundData({ mockedAggregator }, 4);

      await mintToken(mTBILL, owner, 100_000);
      await setInstantDailyLimitTest({ vault: redemptionVault, owner }, 1000);

      await approveBase18(owner, mTBILL, redemptionVault, 100_000);

      await redeemInstantTest(
        { redemptionVault, owner, mTBILL, mTokenToUsdDataFeed },
        stableCoins.dai,
        99_999,
        {
          revertMessage: 'MV: exceed limit',
        },
      );
    });

    it('should fail: if min receive amount greater then actual', async () => {
      const {
        redemptionVault,
        mockedAggregator,
        owner,
        mTBILL,
        stableCoins,
        dataFeed,
        mTokenToUsdDataFeed,
      } = await loadFixture(defaultDeploy);
      await addPaymentTokenTest(
        { vault: redemptionVault, owner },
        stableCoins.dai,
        dataFeed.address,
        0,
        true,
      );
      await setRoundData({ mockedAggregator }, 4);

      await mintToken(mTBILL, owner, 100_000);

      await approveBase18(owner, mTBILL, redemptionVault, 100_000);

      await redeemInstantTest(
        {
          redemptionVault,
          owner,
          mTBILL,
          mTokenToUsdDataFeed,
          minAmount: parseUnits('1000000'),
        },
        stableCoins.dai,
        99_999,
        {
          revertMessage: 'RV: minReceiveAmount > actual',
        },
      );
    });

    it('should fail: if some fee = 100%', async () => {
      const {
        owner,
        redemptionVault,
        stableCoins,
        mTBILL,
        dataFeed,
        mTokenToUsdDataFeed,
      } = await loadFixture(defaultDeploy);

      await mintToken(mTBILL, owner, 100);
      await approveBase18(owner, mTBILL, redemptionVault, 100);
      await addPaymentTokenTest(
        { vault: redemptionVault, owner },
        stableCoins.dai,
        dataFeed.address,
        10000,
        true,
      );
      await redeemInstantTest(
        { redemptionVault, owner, mTBILL, mTokenToUsdDataFeed },
        stableCoins.dai,
        100,
        {
          revertMessage: 'RV: amountMTokenIn < fee',
        },
      );

      await removePaymentTokenTest(
        { vault: redemptionVault, owner },
        stableCoins.dai,
      );
      await addPaymentTokenTest(
        { vault: redemptionVault, owner },
        stableCoins.dai,
        dataFeed.address,
        0,
        true,
      );
      await setInstantFeeTest({ vault: redemptionVault, owner }, 10000);
      await redeemInstantTest(
        { redemptionVault, owner, mTBILL, mTokenToUsdDataFeed },
        stableCoins.dai,
        100,
        { revertMessage: 'RV: amountMTokenIn < fee' },
      );
    });

    it('should fail: greenlist enabled and user not in greenlist ', async () => {
      const {
        owner,
        redemptionVault,
        stableCoins,
        mTBILL,
        mTokenToUsdDataFeed,
      } = await loadFixture(defaultDeploy);

      await redemptionVault.setGreenlistEnable(true);

      await redeemInstantTest(
        { redemptionVault, owner, mTBILL, mTokenToUsdDataFeed },
        stableCoins.dai,
        1,
        {
          revertMessage: 'WMAC: hasnt role',
        },
      );
    });

    it('should fail: user in blacklist ', async () => {
      const {
        owner,
        redemptionVault,
        stableCoins,
        mTBILL,
        mTokenToUsdDataFeed,
        blackListableTester,
        accessControl,
        regularAccounts,
      } = await loadFixture(defaultDeploy);

      await blackList(
        { blacklistable: blackListableTester, accessControl, owner },
        regularAccounts[0],
      );

      await redeemInstantTest(
        { redemptionVault, owner, mTBILL, mTokenToUsdDataFeed },
        stableCoins.dai,
        1,
        {
          from: regularAccounts[0],
          revertMessage: acErrors.WMAC_HAS_ROLE,
        },
      );
    });

    it('should fail: user in sanctions list', async () => {
      const {
        owner,
        redemptionVault,
        stableCoins,
        mTBILL,
        mTokenToUsdDataFeed,
        regularAccounts,
        mockedSanctionsList,
      } = await loadFixture(defaultDeploy);

      await sanctionUser(
        { sanctionsList: mockedSanctionsList },
        regularAccounts[0],
      );

      await redeemInstantTest(
        { redemptionVault, owner, mTBILL, mTokenToUsdDataFeed },
        stableCoins.dai,
        1,
        {
          from: regularAccounts[0],
          revertMessage: 'WSL: sanctioned',
        },
      );
    });

    it('should fail: when function with custom recipient is paused', async () => {
      const {
        owner,
        redemptionVault,
        stableCoins,
        mTBILL,
        dataFeed,
        mTokenToUsdDataFeed,
        regularAccounts,
        customRecipient,
      } = await loadFixture(defaultDeploy);
      await mintToken(mTBILL, regularAccounts[0], 100);
      await approveBase18(
        regularAccounts[0],
        stableCoins.dai,
        redemptionVault,
        100,
      );
      await addPaymentTokenTest(
        { vault: redemptionVault, owner },
        stableCoins.dai,
        dataFeed.address,
        0,
        true,
      );
      const selector = encodeFnSelector(
        'redeemInstant(address,uint256,uint256,address)',
      );
      await pauseVaultFn(redemptionVault, selector);
      await redeemInstantTest(
        {
          redemptionVault,
          owner,
          mTBILL,
          mTokenToUsdDataFeed,
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

    it('should fail: greenlist enabled and recipient not in greenlist (custom recipient overload)', async () => {
      const {
        owner,
        redemptionVault,
        stableCoins,
        mTBILL,
        mTokenToUsdDataFeed,
        greenListableTester,
        accessControl,
        customRecipient,
      } = await loadFixture(defaultDeploy);

      await redemptionVault.setGreenlistEnable(true);

      await greenList(
        { greenlistable: greenListableTester, accessControl, owner },
        owner,
      );

      await redeemInstantTest(
        {
          redemptionVault,
          owner,
          mTBILL,
          mTokenToUsdDataFeed,
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
        redemptionVault,
        stableCoins,
        mTBILL,
        mTokenToUsdDataFeed,
        blackListableTester,
        accessControl,
        regularAccounts,
        customRecipient,
      } = await loadFixture(defaultDeploy);

      await blackList(
        { blacklistable: blackListableTester, accessControl, owner },
        customRecipient,
      );

      await redeemInstantTest(
        {
          redemptionVault,
          owner,
          mTBILL,
          mTokenToUsdDataFeed,
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
        redemptionVault,
        stableCoins,
        mTBILL,
        mTokenToUsdDataFeed,
        regularAccounts,
        mockedSanctionsList,
        customRecipient,
      } = await loadFixture(defaultDeploy);

      await sanctionUser(
        { sanctionsList: mockedSanctionsList },
        customRecipient,
      );

      await redeemInstantTest(
        {
          redemptionVault,
          owner,
          mTBILL,
          mTokenToUsdDataFeed,
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

    it('should fail: user try to instant redeem fiat', async () => {
      const {
        owner,
        redemptionVault,
        stableCoins,
        mTBILL,
        mTokenToUsdDataFeed,
        dataFeed,
      } = await loadFixture(defaultDeploy);

      await mintToken(mTBILL, owner, 100);
      await approveBase18(owner, mTBILL, redemptionVault, 100);

      await addPaymentTokenTest(
        { vault: redemptionVault, owner },
        stableCoins.dai,
        dataFeed.address,
        100,
        true,
      );

      await redeemInstantTest(
        { redemptionVault, owner, mTBILL, mTokenToUsdDataFeed },
        await redemptionVault.MANUAL_FULLFILMENT_TOKEN(),
        100,
        {
          revertMessage: 'MV: token not exists',
        },
      );
    });

    it('redeem 100 mTBILL, greenlist enabled and user in greenlist ', async () => {
      const {
        owner,
        redemptionVault,
        stableCoins,
        mTBILL,
        greenListableTester,
        mTokenToUsdDataFeed,
        accessControl,
        regularAccounts,
        dataFeed,
      } = await loadFixture(defaultDeploy);

      await redemptionVault.setGreenlistEnable(true);

      await greenList(
        { greenlistable: greenListableTester, accessControl, owner },
        regularAccounts[0],
      );

      await mintToken(stableCoins.dai, redemptionVault, 100000);
      await mintToken(mTBILL, regularAccounts[0], 100);
      await approveBase18(regularAccounts[0], mTBILL, redemptionVault, 100);
      await addPaymentTokenTest(
        { vault: redemptionVault, owner },
        stableCoins.dai,
        dataFeed.address,
        0,
        true,
      );

      await redeemInstantTest(
        { redemptionVault, owner, mTBILL, mTokenToUsdDataFeed },
        stableCoins.dai,
        100,
        {
          from: regularAccounts[0],
        },
      );
    });

    it('redeem 100 mTBILL when 10% growth is applied', async () => {
      const {
        owner,
        redemptionVault,
        stableCoins,
        mTBILL,
        mTokenToUsdDataFeed,
        regularAccounts,
        dataFeed,
        customFeedGrowth,
      } = await loadFixture(defaultDeploy);

      await mTokenToUsdDataFeed.changeAggregator(customFeedGrowth.address);
      await setRoundDataGrowth({ owner, customFeedGrowth }, 1, -1000, 10);

      await mintToken(stableCoins.dai, redemptionVault, 100000);
      await mintToken(mTBILL, regularAccounts[0], 100);
      await approveBase18(regularAccounts[0], mTBILL, redemptionVault, 100);
      await addPaymentTokenTest(
        { vault: redemptionVault, owner },
        stableCoins.dai,
        dataFeed.address,
        0,
        true,
      );

      await redeemInstantTest(
        {
          redemptionVault,
          owner,
          mTBILL,
          mTokenToUsdDataFeed,
          expectedAmountOut: parseUnits('99.000314820', 9),
        },
        stableCoins.dai,
        100,
        {
          from: regularAccounts[0],
        },
      );
    });

    it('redeem 100 mTBILL when -10% growth is applied', async () => {
      const {
        owner,
        redemptionVault,
        stableCoins,
        mTBILL,
        mTokenToUsdDataFeed,
        regularAccounts,
        dataFeed,
        customFeedGrowth,
      } = await loadFixture(defaultDeploy);

      await setMinGrowthApr({ owner, customFeedGrowth }, -10);
      await mTokenToUsdDataFeed.changeAggregator(customFeedGrowth.address);
      await setRoundDataGrowth({ owner, customFeedGrowth }, 1, -1000, -10);

      await mintToken(stableCoins.dai, redemptionVault, 100000);
      await mintToken(mTBILL, regularAccounts[0], 100);
      await approveBase18(regularAccounts[0], mTBILL, redemptionVault, 100);
      await addPaymentTokenTest(
        { vault: redemptionVault, owner },
        stableCoins.dai,
        dataFeed.address,
        0,
        true,
      );

      await redeemInstantTest(
        {
          redemptionVault,
          owner,
          mTBILL,
          mTokenToUsdDataFeed,
          expectedAmountOut: parseUnits('98.999685180', 9),
        },
        stableCoins.dai,
        100,
        {
          from: regularAccounts[0],
        },
      );
    });

    it('redeem 100 mTBILL, when price of stable is 1.03$ and mToken price is 5$', async () => {
      const {
        owner,
        mockedAggregator,
        mockedAggregatorMToken,
        redemptionVault,
        stableCoins,
        mTBILL,
        dataFeed,
        mTokenToUsdDataFeed,
      } = await loadFixture(defaultDeploy);

      await mintToken(stableCoins.dai, redemptionVault, 100000);
      await mintToken(mTBILL, owner, 100);
      await approveBase18(owner, mTBILL, redemptionVault, 100);
      await addPaymentTokenTest(
        { vault: redemptionVault, owner },
        stableCoins.dai,
        dataFeed.address,
        0,
        true,
      );
      await setRoundData({ mockedAggregator }, 1.03);
      await setRoundData({ mockedAggregator: mockedAggregatorMToken }, 5);

      await redeemInstantTest(
        { redemptionVault, owner, mTBILL, mTokenToUsdDataFeed },
        stableCoins.dai,
        100,
      );
    });

    it('redeem 100 mTBILL, when price of stable is 1.03$ and mToken price is 5$ and token fee 1%', async () => {
      const {
        owner,
        mockedAggregator,
        mockedAggregatorMToken,
        redemptionVault,
        stableCoins,
        mTBILL,
        dataFeed,
        mTokenToUsdDataFeed,
      } = await loadFixture(defaultDeploy);

      await mintToken(stableCoins.dai, redemptionVault, 100000);
      await mintToken(mTBILL, owner, 100);
      await approveBase18(owner, mTBILL, redemptionVault, 100);
      await addPaymentTokenTest(
        { vault: redemptionVault, owner },
        stableCoins.dai,
        dataFeed.address,
        100,
        true,
      );
      await setRoundData({ mockedAggregator }, 1.03);
      await setRoundData({ mockedAggregator: mockedAggregatorMToken }, 5);
      await redeemInstantTest(
        { redemptionVault, owner, mTBILL, mTokenToUsdDataFeed },
        stableCoins.dai,
        100,
      );
    });

    it('redeem 100 mTBILL, when price of stable is 1.03$ and mToken price is 5$ without checking of minDepositAmount', async () => {
      const {
        owner,
        mockedAggregator,
        mockedAggregatorMToken,
        redemptionVault,
        stableCoins,
        mTBILL,
        dataFeed,
        mTokenToUsdDataFeed,
      } = await loadFixture(defaultDeploy);

      await mintToken(stableCoins.dai, redemptionVault, 100000);
      await mintToken(mTBILL, owner, 100);
      await approveBase18(owner, mTBILL, redemptionVault, 100);
      await addPaymentTokenTest(
        { vault: redemptionVault, owner },
        stableCoins.dai,
        dataFeed.address,
        100,
        true,
      );
      await setRoundData({ mockedAggregator }, 1.03);
      await setRoundData({ mockedAggregator: mockedAggregatorMToken }, 5);
      await redemptionVault.freeFromMinAmount(owner.address, true);
      await redeemInstantTest(
        { redemptionVault, owner, mTBILL, mTokenToUsdDataFeed },
        stableCoins.dai,
        100,
      );
    });

    it('redeem 100 mTBILL, when price of stable is 1.03$ and mToken price is 5$ and user in waivedFeeRestriction', async () => {
      const {
        owner,
        mockedAggregator,
        mockedAggregatorMToken,
        redemptionVault,
        stableCoins,
        mTBILL,
        dataFeed,
        mTokenToUsdDataFeed,
      } = await loadFixture(defaultDeploy);

      await mintToken(stableCoins.dai, redemptionVault, 100000);
      await mintToken(mTBILL, owner, 100);
      await approveBase18(owner, mTBILL, redemptionVault, 100);
      await addPaymentTokenTest(
        { vault: redemptionVault, owner },
        stableCoins.dai,
        dataFeed.address,
        100,
        true,
      );
      await setRoundData({ mockedAggregator }, 1.03);
      await setRoundData({ mockedAggregator: mockedAggregatorMToken }, 5);
      await addWaivedFeeAccountTest(
        { vault: redemptionVault, owner },
        owner.address,
      );
      await redeemInstantTest(
        {
          redemptionVault,
          owner,
          mTBILL,
          mTokenToUsdDataFeed,
          waivedFee: true,
        },
        stableCoins.dai,
        100,
      );
    });

    it('redeem 100 mTBILL (custom recipient overload)', async () => {
      const {
        owner,
        redemptionVault,
        stableCoins,
        mTBILL,
        mTokenToUsdDataFeed,
        regularAccounts,
        dataFeed,
        customRecipient,
      } = await loadFixture(defaultDeploy);

      await mintToken(stableCoins.dai, redemptionVault, 100000);
      await mintToken(mTBILL, regularAccounts[0], 100);
      await approveBase18(regularAccounts[0], mTBILL, redemptionVault, 100);
      await addPaymentTokenTest(
        { vault: redemptionVault, owner },
        stableCoins.dai,
        dataFeed.address,
        0,
        true,
      );

      await redeemInstantTest(
        {
          redemptionVault,
          owner,
          mTBILL,
          mTokenToUsdDataFeed,
          customRecipient,
        },
        stableCoins.dai,
        100,
        {
          from: regularAccounts[0],
        },
      );
    });

    it('redeem 100 mTBILL when recipient == msg.sender (custom recipient overload)', async () => {
      const {
        owner,
        redemptionVault,
        stableCoins,
        mTBILL,
        mTokenToUsdDataFeed,
        regularAccounts,
        dataFeed,
      } = await loadFixture(defaultDeploy);

      await mintToken(stableCoins.dai, redemptionVault, 100000);
      await mintToken(mTBILL, regularAccounts[0], 100);
      await approveBase18(regularAccounts[0], mTBILL, redemptionVault, 100);
      await addPaymentTokenTest(
        { vault: redemptionVault, owner },
        stableCoins.dai,
        dataFeed.address,
        0,
        true,
      );

      await redeemInstantTest(
        {
          redemptionVault,
          owner,
          mTBILL,
          mTokenToUsdDataFeed,
          customRecipient: regularAccounts[0],
        },
        stableCoins.dai,
        100,
        {
          from: regularAccounts[0],
        },
      );
    });

    it('redeem 100 mTBILL when other fn overload is paused (custom recipient overload)', async () => {
      const {
        owner,
        redemptionVault,
        stableCoins,
        mTBILL,
        mTokenToUsdDataFeed,
        regularAccounts,
        dataFeed,
        customRecipient,
      } = await loadFixture(defaultDeploy);

      await pauseVaultFn(
        redemptionVault,
        encodeFnSelector('redeemInstant(address,uint256,uint256)'),
      );
      await mintToken(stableCoins.dai, redemptionVault, 100000);
      await mintToken(mTBILL, regularAccounts[0], 100);
      await approveBase18(regularAccounts[0], mTBILL, redemptionVault, 100);
      await addPaymentTokenTest(
        { vault: redemptionVault, owner },
        stableCoins.dai,
        dataFeed.address,
        0,
        true,
      );

      await redeemInstantTest(
        {
          redemptionVault,
          owner,
          mTBILL,
          mTokenToUsdDataFeed,
          customRecipient,
        },
        stableCoins.dai,
        100,
        {
          from: regularAccounts[0],
        },
      );
    });

    it('redeem 100 mTBILL when other fn overload is paused', async () => {
      const {
        owner,
        redemptionVault,
        stableCoins,
        mTBILL,
        mTokenToUsdDataFeed,
        regularAccounts,
        dataFeed,
      } = await loadFixture(defaultDeploy);

      await pauseVaultFn(
        redemptionVault,
        encodeFnSelector('redeemInstant(address,uint256,uint256,address)'),
      );
      await mintToken(stableCoins.dai, redemptionVault, 100000);
      await mintToken(mTBILL, regularAccounts[0], 100);
      await approveBase18(regularAccounts[0], mTBILL, redemptionVault, 100);
      await addPaymentTokenTest(
        { vault: redemptionVault, owner },
        stableCoins.dai,
        dataFeed.address,
        0,
        true,
      );

      await redeemInstantTest(
        {
          redemptionVault,
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
  });

  describe('redeemRequest()', () => {
    it('should fail: when there is no token in vault', async () => {
      const {
        owner,
        redemptionVault,
        stableCoins,
        mTBILL,
        mTokenToUsdDataFeed,
      } = await loadFixture(defaultDeploy);

      await redeemRequestTest(
        { redemptionVault, owner, mTBILL, mTokenToUsdDataFeed },
        stableCoins.dai,
        1,
        {
          revertMessage: 'MV: token not exists',
        },
      );
    });

    it('should fail: when trying to redeem 0 amount', async () => {
      const {
        owner,
        redemptionVault,
        stableCoins,
        mTBILL,
        dataFeed,
        mTokenToUsdDataFeed,
      } = await loadFixture(defaultDeploy);
      await addPaymentTokenTest(
        { vault: redemptionVault, owner },
        stableCoins.dai,
        dataFeed.address,
        0,
        true,
      );
      await redeemRequestTest(
        { redemptionVault, owner, mTBILL, mTokenToUsdDataFeed },
        stableCoins.dai,
        0,
        {
          revertMessage: 'RV: invalid amount',
        },
      );
    });

    it('should fail: when function paused', async () => {
      const {
        owner,
        redemptionVault,
        stableCoins,
        mTBILL,
        dataFeed,
        mTokenToUsdDataFeed,
        regularAccounts,
      } = await loadFixture(defaultDeploy);
      await mintToken(mTBILL, regularAccounts[0], 100);
      await approveBase18(
        regularAccounts[0],
        stableCoins.dai,
        redemptionVault,
        100,
      );
      await addPaymentTokenTest(
        { vault: redemptionVault, owner },
        stableCoins.dai,
        dataFeed.address,
        0,
        true,
      );
      const selector = encodeFnSelector('redeemRequest(address,uint256)');
      await pauseVaultFn(redemptionVault, selector);
      await redeemRequestTest(
        { redemptionVault, owner, mTBILL, mTokenToUsdDataFeed },
        stableCoins.dai,
        100,
        {
          from: regularAccounts[0],
          revertMessage: 'Pausable: fn paused',
        },
      );
    });

    it('should fail: call with insufficient allowance', async () => {
      const {
        owner,
        redemptionVault,
        stableCoins,
        mTBILL,
        dataFeed,
        mTokenToUsdDataFeed,
      } = await loadFixture(defaultDeploy);

      await mintToken(mTBILL, owner, 100);
      await addPaymentTokenTest(
        { vault: redemptionVault, owner },
        stableCoins.dai,
        dataFeed.address,
        0,
        true,
      );
      await redeemRequestTest(
        { redemptionVault, owner, mTBILL, mTokenToUsdDataFeed },
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
        redemptionVault,
        stableCoins,
        mTBILL,
        dataFeed,
        mTokenToUsdDataFeed,
      } = await loadFixture(defaultDeploy);

      await approveBase18(owner, mTBILL, redemptionVault, 100);
      await addPaymentTokenTest(
        { vault: redemptionVault, owner },
        stableCoins.dai,
        dataFeed.address,
        0,
        true,
      );
      await redeemRequestTest(
        { redemptionVault, owner, mTBILL, mTokenToUsdDataFeed },
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
        redemptionVault,
        stableCoins,
        mTBILL,
        dataFeed,
        mockedAggregator,
        mockedAggregatorMToken,
        mTokenToUsdDataFeed,
      } = await loadFixture(defaultDeploy);

      await approveBase18(owner, stableCoins.dai, redemptionVault, 10);
      await addPaymentTokenTest(
        { vault: redemptionVault, owner },
        stableCoins.dai,
        dataFeed.address,
        0,
        true,
      );
      await mintToken(mTBILL, owner, 100_000);
      await setRoundData({ mockedAggregator }, 0);
      await redeemRequestTest(
        { redemptionVault, owner, mTBILL, mTokenToUsdDataFeed },
        stableCoins.dai,
        1,
        {
          revertMessage: 'DF: feed is deprecated',
        },
      );
      await setRoundData({ mockedAggregator }, 1);
      await setRoundData({ mockedAggregator: mockedAggregatorMToken }, 0);
      await redeemRequestTest(
        { redemptionVault, owner, mTBILL, mTokenToUsdDataFeed },
        stableCoins.dai,
        1,
        {
          revertMessage: 'DF: feed is deprecated',
        },
      );
    });

    it('should fail: call for amount < minAmount', async () => {
      const {
        redemptionVault,
        mockedAggregator,
        owner,
        mTBILL,
        stableCoins,
        dataFeed,
        mTokenToUsdDataFeed,
      } = await loadFixture(defaultDeploy);
      await addPaymentTokenTest(
        { vault: redemptionVault, owner },
        stableCoins.dai,
        dataFeed.address,
        0,
        true,
      );
      await setRoundData({ mockedAggregator }, 1);

      await mintToken(mTBILL, owner, 100_000);
      await approveBase18(owner, mTBILL, redemptionVault, 100_000);

      await setMinAmountTest({ vault: redemptionVault, owner }, 100_000);

      await redeemRequestTest(
        { redemptionVault, owner, mTBILL, mTokenToUsdDataFeed },
        stableCoins.dai,
        99_999,
        {
          revertMessage: 'RV: amount < min',
        },
      );
    });

    it('should fail: if some fee = 100%', async () => {
      const {
        owner,
        redemptionVault,
        stableCoins,
        mTBILL,
        dataFeed,
        mTokenToUsdDataFeed,
      } = await loadFixture(defaultDeploy);

      await mintToken(mTBILL, owner, 100);
      await approveBase18(owner, mTBILL, redemptionVault, 100);
      await addPaymentTokenTest(
        { vault: redemptionVault, owner },
        stableCoins.dai,
        dataFeed.address,
        10000,
        true,
      );
      await redeemRequestTest(
        { redemptionVault, owner, mTBILL, mTokenToUsdDataFeed },
        stableCoins.dai,
        100,
        {
          revertMessage: 'RV: amountMTokenIn < fee',
        },
      );
    });

    it('should fail: greenlist enabled and user not in greenlist ', async () => {
      const {
        owner,
        redemptionVault,
        stableCoins,
        mTBILL,
        mTokenToUsdDataFeed,
      } = await loadFixture(defaultDeploy);

      await redemptionVault.setGreenlistEnable(true);

      await redeemRequestTest(
        { redemptionVault, owner, mTBILL, mTokenToUsdDataFeed },
        stableCoins.dai,
        1,
        {
          revertMessage: 'WMAC: hasnt role',
        },
      );
    });

    it('should fail: user in blacklist ', async () => {
      const {
        owner,
        redemptionVault,
        stableCoins,
        mTBILL,
        mTokenToUsdDataFeed,
        blackListableTester,
        accessControl,
        regularAccounts,
      } = await loadFixture(defaultDeploy);

      await blackList(
        { blacklistable: blackListableTester, accessControl, owner },
        regularAccounts[0],
      );

      await redeemRequestTest(
        { redemptionVault, owner, mTBILL, mTokenToUsdDataFeed },
        stableCoins.dai,
        1,
        {
          from: regularAccounts[0],
          revertMessage: acErrors.WMAC_HAS_ROLE,
        },
      );
    });

    it('should fail: user in sanctions list', async () => {
      const {
        owner,
        redemptionVault,
        stableCoins,
        mTBILL,
        mTokenToUsdDataFeed,
        regularAccounts,
        mockedSanctionsList,
      } = await loadFixture(defaultDeploy);

      await sanctionUser(
        { sanctionsList: mockedSanctionsList },
        regularAccounts[0],
      );

      await redeemRequestTest(
        { redemptionVault, owner, mTBILL, mTokenToUsdDataFeed },
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
        redemptionVault,
        stableCoins,
        mTBILL,
        dataFeed,
        mTokenToUsdDataFeed,
        regularAccounts,
        customRecipient,
      } = await loadFixture(defaultDeploy);
      await mintToken(mTBILL, regularAccounts[0], 100);
      await approveBase18(
        regularAccounts[0],
        stableCoins.dai,
        redemptionVault,
        100,
      );
      await addPaymentTokenTest(
        { vault: redemptionVault, owner },
        stableCoins.dai,
        dataFeed.address,
        0,
        true,
      );
      const selector = encodeFnSelector(
        'redeemRequest(address,uint256,address)',
      );
      await pauseVaultFn(redemptionVault, selector);
      await redeemRequestTest(
        {
          redemptionVault,
          owner,
          mTBILL,
          mTokenToUsdDataFeed,
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

    it('should fail: greenlist enabled and recipient not in greenlist (custom recipient overload)', async () => {
      const {
        owner,
        redemptionVault,
        stableCoins,
        mTBILL,
        mTokenToUsdDataFeed,
        greenListableTester,
        accessControl,
        customRecipient,
      } = await loadFixture(defaultDeploy);

      await redemptionVault.setGreenlistEnable(true);

      await greenList(
        { greenlistable: greenListableTester, accessControl, owner },
        owner,
      );

      await redeemRequestTest(
        {
          redemptionVault,
          owner,
          mTBILL,
          mTokenToUsdDataFeed,
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
        redemptionVault,
        stableCoins,
        mTBILL,
        mTokenToUsdDataFeed,
        blackListableTester,
        accessControl,
        regularAccounts,
        customRecipient,
      } = await loadFixture(defaultDeploy);

      await blackList(
        { blacklistable: blackListableTester, accessControl, owner },
        customRecipient,
      );

      await redeemRequestTest(
        {
          redemptionVault,
          owner,
          mTBILL,
          mTokenToUsdDataFeed,
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
        redemptionVault,
        stableCoins,
        mTBILL,
        mTokenToUsdDataFeed,
        regularAccounts,
        mockedSanctionsList,
        customRecipient,
      } = await loadFixture(defaultDeploy);

      await sanctionUser(
        { sanctionsList: mockedSanctionsList },
        customRecipient,
      );

      await redeemRequestTest(
        {
          redemptionVault,
          owner,
          mTBILL,
          mTokenToUsdDataFeed,
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

    it('should fail: user try to redeem fiat in basic request (custom recipient overload)', async () => {
      const {
        owner,
        redemptionVault,
        stableCoins,
        mTBILL,
        mTokenToUsdDataFeed,
        dataFeed,
        customRecipient,
      } = await loadFixture(defaultDeploy);

      await mintToken(mTBILL, owner, 100);
      await approveBase18(owner, mTBILL, redemptionVault, 100);

      await addPaymentTokenTest(
        { vault: redemptionVault, owner },
        stableCoins.dai,
        dataFeed.address,
        100,
        true,
      );

      await redeemRequestTest(
        {
          redemptionVault,
          owner,
          mTBILL,
          mTokenToUsdDataFeed,
          customRecipient,
        },
        await redemptionVault.MANUAL_FULLFILMENT_TOKEN(),
        100,
        {
          revertMessage: 'RV: tokenOut == fiat',
        },
      );
    });

    it('should fail: user try to redeem fiat in basic request', async () => {
      const {
        owner,
        redemptionVault,
        stableCoins,
        mTBILL,
        mTokenToUsdDataFeed,
        dataFeed,
      } = await loadFixture(defaultDeploy);

      await mintToken(mTBILL, owner, 100);
      await approveBase18(owner, mTBILL, redemptionVault, 100);

      await addPaymentTokenTest(
        { vault: redemptionVault, owner },
        stableCoins.dai,
        dataFeed.address,
        100,
        true,
      );

      await redeemRequestTest(
        { redemptionVault, owner, mTBILL, mTokenToUsdDataFeed },
        await redemptionVault.MANUAL_FULLFILMENT_TOKEN(),
        100,
        {
          revertMessage: 'RV: tokenOut == fiat',
        },
      );
    });

    it('redeem request 100 mTBILL, greenlist enabled and user in greenlist ', async () => {
      const {
        owner,
        redemptionVault,
        stableCoins,
        mTBILL,
        greenListableTester,
        mTokenToUsdDataFeed,
        accessControl,
        regularAccounts,
        dataFeed,
      } = await loadFixture(defaultDeploy);

      await redemptionVault.setGreenlistEnable(true);

      await greenList(
        { greenlistable: greenListableTester, accessControl, owner },
        regularAccounts[0],
      );

      await mintToken(stableCoins.dai, redemptionVault, 100000);
      await mintToken(mTBILL, regularAccounts[0], 100);
      await approveBase18(regularAccounts[0], mTBILL, redemptionVault, 100);
      await addPaymentTokenTest(
        { vault: redemptionVault, owner },
        stableCoins.dai,
        dataFeed.address,
        0,
        true,
      );

      await redeemRequestTest(
        { redemptionVault, owner, mTBILL, mTokenToUsdDataFeed },
        stableCoins.dai,
        100,
        {
          from: regularAccounts[0],
        },
      );
    });

    it('redeem request with 10% growth is applied', async () => {
      const {
        owner,
        redemptionVault,
        stableCoins,
        mTBILL,
        mTokenToUsdDataFeed,
        regularAccounts,
        dataFeed,
        customFeedGrowth,
      } = await loadFixture(defaultDeploy);

      await mTokenToUsdDataFeed.changeAggregator(customFeedGrowth.address);
      await setRoundDataGrowth({ owner, customFeedGrowth }, 1, -1000, 10);

      await mintToken(stableCoins.dai, redemptionVault, 100000);
      await mintToken(mTBILL, regularAccounts[0], 100);
      await approveBase18(regularAccounts[0], mTBILL, redemptionVault, 100);
      await addPaymentTokenTest(
        { vault: redemptionVault, owner },
        stableCoins.dai,
        dataFeed.address,
        0,
        true,
      );

      await redeemRequestTest(
        { redemptionVault, owner, mTBILL, mTokenToUsdDataFeed },
        stableCoins.dai,
        100,
        {
          from: regularAccounts[0],
        },
      );
    });

    it('redeem request with -10% growth is applied', async () => {
      const {
        owner,
        redemptionVault,
        stableCoins,
        mTBILL,
        mTokenToUsdDataFeed,
        regularAccounts,
        dataFeed,
        customFeedGrowth,
      } = await loadFixture(defaultDeploy);

      await mTokenToUsdDataFeed.changeAggregator(customFeedGrowth.address);
      await setMinGrowthApr({ owner, customFeedGrowth }, -10);
      await setRoundDataGrowth({ owner, customFeedGrowth }, 1, -1000, -10);

      await mintToken(stableCoins.dai, redemptionVault, 100000);
      await mintToken(mTBILL, regularAccounts[0], 100);
      await approveBase18(regularAccounts[0], mTBILL, redemptionVault, 100);
      await addPaymentTokenTest(
        { vault: redemptionVault, owner },
        stableCoins.dai,
        dataFeed.address,
        0,
        true,
      );

      await redeemRequestTest(
        { redemptionVault, owner, mTBILL, mTokenToUsdDataFeed },
        stableCoins.dai,
        100,
        {
          from: regularAccounts[0],
        },
      );
    });

    it('redeem request 100 mTBILL, when price of stable is 1.03$ and mToken price is 5$', async () => {
      const {
        owner,
        mockedAggregator,
        mockedAggregatorMToken,
        redemptionVault,
        stableCoins,
        mTBILL,
        dataFeed,
        mTokenToUsdDataFeed,
      } = await loadFixture(defaultDeploy);

      await mintToken(stableCoins.dai, redemptionVault, 100000);
      await mintToken(mTBILL, owner, 100);
      await approveBase18(owner, mTBILL, redemptionVault, 100);
      await addPaymentTokenTest(
        { vault: redemptionVault, owner },
        stableCoins.dai,
        dataFeed.address,
        0,
        true,
      );
      await setRoundData({ mockedAggregator }, 1.03);
      await setRoundData({ mockedAggregator: mockedAggregatorMToken }, 5);

      await redeemRequestTest(
        { redemptionVault, owner, mTBILL, mTokenToUsdDataFeed },
        stableCoins.dai,
        100,
      );
    });

    it('redeem request 100 mTBILL, when price of stable is 1.03$ and mToken price is 5$ and token fee 1%', async () => {
      const {
        owner,
        mockedAggregator,
        mockedAggregatorMToken,
        redemptionVault,
        stableCoins,
        mTBILL,
        dataFeed,
        mTokenToUsdDataFeed,
      } = await loadFixture(defaultDeploy);

      await mintToken(stableCoins.dai, redemptionVault, 100000);
      await mintToken(mTBILL, owner, 100);
      await approveBase18(owner, mTBILL, redemptionVault, 100);
      await addPaymentTokenTest(
        { vault: redemptionVault, owner },
        stableCoins.dai,
        dataFeed.address,
        100,
        true,
      );
      await setRoundData({ mockedAggregator }, 1.03);
      await setRoundData({ mockedAggregator: mockedAggregatorMToken }, 5);
      await redeemRequestTest(
        { redemptionVault, owner, mTBILL, mTokenToUsdDataFeed },
        stableCoins.dai,
        100,
      );
    });

    it('redeem request 100 mTBILL, when price of stable is 1.03$ and mToken price is 5$ without checking of minDepositAmount', async () => {
      const {
        owner,
        mockedAggregator,
        mockedAggregatorMToken,
        redemptionVault,
        stableCoins,
        mTBILL,
        dataFeed,
        mTokenToUsdDataFeed,
      } = await loadFixture(defaultDeploy);

      await mintToken(stableCoins.dai, redemptionVault, 100000);
      await mintToken(mTBILL, owner, 100);
      await approveBase18(owner, mTBILL, redemptionVault, 100);
      await addPaymentTokenTest(
        { vault: redemptionVault, owner },
        stableCoins.dai,
        dataFeed.address,
        100,
        true,
      );
      await setRoundData({ mockedAggregator }, 1.03);
      await setRoundData({ mockedAggregator: mockedAggregatorMToken }, 5);
      await redemptionVault.freeFromMinAmount(owner.address, true);
      await redeemRequestTest(
        { redemptionVault, owner, mTBILL, mTokenToUsdDataFeed },
        stableCoins.dai,
        100,
      );
    });

    it('redeem request 100 mTBILL, when price of stable is 1.03$ and mToken price is 5$ and user in waivedFeeRestriction', async () => {
      const {
        owner,
        mockedAggregator,
        mockedAggregatorMToken,
        redemptionVault,
        stableCoins,
        mTBILL,
        dataFeed,
        mTokenToUsdDataFeed,
      } = await loadFixture(defaultDeploy);

      await mintToken(stableCoins.dai, redemptionVault, 100000);
      await mintToken(mTBILL, owner, 100);
      await approveBase18(owner, mTBILL, redemptionVault, 100);
      await addPaymentTokenTest(
        { vault: redemptionVault, owner },
        stableCoins.dai,
        dataFeed.address,
        100,
        true,
      );
      await setRoundData({ mockedAggregator }, 1.03);
      await setRoundData({ mockedAggregator: mockedAggregatorMToken }, 5);
      await addWaivedFeeAccountTest(
        { vault: redemptionVault, owner },
        owner.address,
      );
      await redeemRequestTest(
        {
          redemptionVault,
          owner,
          mTBILL,
          mTokenToUsdDataFeed,
          waivedFee: true,
        },
        stableCoins.dai,
        100,
      );
    });
    it('redeem request 100 mTBILL (custom recipient overload)', async () => {
      const {
        owner,
        redemptionVault,
        stableCoins,
        mTBILL,
        mTokenToUsdDataFeed,
        regularAccounts,
        dataFeed,
        customRecipient,
      } = await loadFixture(defaultDeploy);

      await mintToken(stableCoins.dai, redemptionVault, 100000);
      await mintToken(mTBILL, regularAccounts[0], 100);
      await approveBase18(regularAccounts[0], mTBILL, redemptionVault, 100);
      await addPaymentTokenTest(
        { vault: redemptionVault, owner },
        stableCoins.dai,
        dataFeed.address,
        0,
        true,
      );

      await redeemRequestTest(
        {
          redemptionVault,
          owner,
          mTBILL,
          mTokenToUsdDataFeed,
          customRecipient,
        },
        stableCoins.dai,
        100,
        {
          from: regularAccounts[0],
        },
      );
    });

    it('redeem request 100 mTBILL when recipient == msg.sender (custom recipient overload)', async () => {
      const {
        owner,
        redemptionVault,
        stableCoins,
        mTBILL,
        mTokenToUsdDataFeed,
        regularAccounts,
        dataFeed,
      } = await loadFixture(defaultDeploy);

      await mintToken(stableCoins.dai, redemptionVault, 100000);
      await mintToken(mTBILL, regularAccounts[0], 100);
      await approveBase18(regularAccounts[0], mTBILL, redemptionVault, 100);
      await addPaymentTokenTest(
        { vault: redemptionVault, owner },
        stableCoins.dai,
        dataFeed.address,
        0,
        true,
      );

      await redeemRequestTest(
        {
          redemptionVault,
          owner,
          mTBILL,
          mTokenToUsdDataFeed,
          customRecipient: regularAccounts[0],
        },
        stableCoins.dai,
        100,
        {
          from: regularAccounts[0],
        },
      );
    });

    it('redeem request 100 mTBILL when other fn overload is paused (custom recipient overload)', async () => {
      const {
        owner,
        redemptionVault,
        stableCoins,
        mTBILL,
        mTokenToUsdDataFeed,
        regularAccounts,
        dataFeed,
        customRecipient,
      } = await loadFixture(defaultDeploy);

      await pauseVaultFn(
        redemptionVault,
        encodeFnSelector('redeemRequest(address,uint256)'),
      );
      await mintToken(stableCoins.dai, redemptionVault, 100000);
      await mintToken(mTBILL, regularAccounts[0], 100);
      await approveBase18(regularAccounts[0], mTBILL, redemptionVault, 100);
      await addPaymentTokenTest(
        { vault: redemptionVault, owner },
        stableCoins.dai,
        dataFeed.address,
        0,
        true,
      );

      await redeemRequestTest(
        {
          redemptionVault,
          owner,
          mTBILL,
          mTokenToUsdDataFeed,
          customRecipient,
        },
        stableCoins.dai,
        100,
        {
          from: regularAccounts[0],
        },
      );
    });

    it('redeem request 100 mTBILL when other fn overload is paused', async () => {
      const {
        owner,
        redemptionVault,
        stableCoins,
        mTBILL,
        mTokenToUsdDataFeed,
        regularAccounts,
        dataFeed,
      } = await loadFixture(defaultDeploy);

      await pauseVaultFn(
        redemptionVault,
        encodeFnSelector('redeemRequest(address,uint256,address)'),
      );
      await mintToken(stableCoins.dai, redemptionVault, 100000);
      await mintToken(mTBILL, regularAccounts[0], 100);
      await approveBase18(regularAccounts[0], mTBILL, redemptionVault, 100);
      await addPaymentTokenTest(
        { vault: redemptionVault, owner },
        stableCoins.dai,
        dataFeed.address,
        0,
        true,
      );

      await redeemRequestTest(
        {
          redemptionVault,
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
  });

  describe('redeemFiatRequest()', () => {
    it('should fail: when trying to redeem 0 amount', async () => {
      const {
        owner,
        redemptionVault,
        mTBILL,
        mTokenToUsdDataFeed,
        regularAccounts,
        greenListableTester,
        accessControl,
      } = await loadFixture(defaultDeploy);
      await greenList(
        { greenlistable: greenListableTester, accessControl, owner },
        regularAccounts[0],
      );
      await redeemFiatRequestTest(
        { redemptionVault, owner, mTBILL, mTokenToUsdDataFeed },
        0,
        {
          from: regularAccounts[0],
          revertMessage: 'RV: invalid amount',
        },
      );
    });

    it('should fail: call with insufficient allowance', async () => {
      const {
        owner,
        redemptionVault,
        mTBILL,
        mTokenToUsdDataFeed,
        greenListableTester,
        accessControl,
      } = await loadFixture(defaultDeploy);

      await greenList(
        { greenlistable: greenListableTester, accessControl, owner },
        owner,
      );

      await mintToken(mTBILL, owner, 100);
      await redeemFiatRequestTest(
        { redemptionVault, owner, mTBILL, mTokenToUsdDataFeed },
        100,
        {
          revertMessage: 'ERC20: insufficient allowance',
        },
      );
    });

    it('should fail: when function paused', async () => {
      const {
        owner,
        redemptionVault,
        stableCoins,
        mTBILL,
        dataFeed,
        mTokenToUsdDataFeed,
        regularAccounts,
      } = await loadFixture(defaultDeploy);
      await mintToken(mTBILL, regularAccounts[0], 100);
      await approveBase18(
        regularAccounts[0],
        stableCoins.dai,
        redemptionVault,
        100,
      );
      await addPaymentTokenTest(
        { vault: redemptionVault, owner },
        stableCoins.dai,
        dataFeed.address,
        0,
        true,
      );
      const selector = encodeFnSelector('redeemFiatRequest(uint256)');
      await pauseVaultFn(redemptionVault, selector);
      await redeemFiatRequestTest(
        { redemptionVault, owner, mTBILL, mTokenToUsdDataFeed },
        100,
        {
          from: regularAccounts[0],
          revertMessage: 'Pausable: fn paused',
        },
      );
    });

    it('should fail: call with insufficient balance', async () => {
      const {
        owner,
        redemptionVault,
        mTBILL,
        mTokenToUsdDataFeed,
        greenListableTester,
        accessControl,
      } = await loadFixture(defaultDeploy);

      await greenList(
        { greenlistable: greenListableTester, accessControl, owner },
        owner,
      );

      await approveBase18(owner, mTBILL, redemptionVault, 100);
      await redeemFiatRequestTest(
        { redemptionVault, owner, mTBILL, mTokenToUsdDataFeed },

        100,
        {
          revertMessage: 'ERC20: transfer amount exceeds balance',
        },
      );
    });

    it('should fail: dataFeed rate 0 ', async () => {
      const {
        owner,
        redemptionVault,
        mTBILL,
        mockedAggregatorMToken,
        mTokenToUsdDataFeed,
        greenListableTester,
        accessControl,
      } = await loadFixture(defaultDeploy);

      await greenList(
        { greenlistable: greenListableTester, accessControl, owner },
        owner,
      );

      await mintToken(mTBILL, owner, 100_000);
      await setRoundData({ mockedAggregator: mockedAggregatorMToken }, 0);
      await redeemFiatRequestTest(
        { redemptionVault, owner, mTBILL, mTokenToUsdDataFeed },
        10,
        {
          revertMessage: 'DF: feed is deprecated',
        },
      );
    });

    it('should fail: call for amount < minFiatRedeemAmount', async () => {
      const {
        redemptionVault,
        owner,
        mTBILL,
        mTokenToUsdDataFeed,
        greenListableTester,
        accessControl,
      } = await loadFixture(defaultDeploy);

      await greenList(
        { greenlistable: greenListableTester, accessControl, owner },
        owner,
      );

      await mintToken(mTBILL, owner, 100_000);
      await approveBase18(owner, mTBILL, redemptionVault, 100_000);

      await setMinFiatRedeemAmountTest({ redemptionVault, owner }, 100_000);

      await redeemFiatRequestTest(
        { redemptionVault, owner, mTBILL, mTokenToUsdDataFeed },
        99_999,
        {
          revertMessage: 'RV: amount < min',
        },
      );
    });

    it('should fail: if some fee = 100%', async () => {
      const {
        owner,
        redemptionVault,
        mTBILL,
        mTokenToUsdDataFeed,
        greenListableTester,
        accessControl,
      } = await loadFixture(defaultDeploy);

      await greenList(
        { greenlistable: greenListableTester, accessControl, owner },
        owner,
      );

      await mintToken(mTBILL, owner, 100);
      await approveBase18(owner, mTBILL, redemptionVault, 100);
      await setFiatAdditionalFeeTest({ redemptionVault, owner }, 10000);
      await redeemFiatRequestTest(
        { redemptionVault, owner, mTBILL, mTokenToUsdDataFeed },
        100,
        {
          revertMessage: 'RV: amountMTokenIn < fee',
        },
      );
    });

    it('should fail: greenlist enabled and user not in greenlist ', async () => {
      const { owner, redemptionVault, mTBILL, mTokenToUsdDataFeed } =
        await loadFixture(defaultDeploy);

      await redemptionVault.setGreenlistEnable(true);

      await redeemFiatRequestTest(
        { redemptionVault, owner, mTBILL, mTokenToUsdDataFeed },
        1,
        {
          revertMessage: 'WMAC: hasnt role',
        },
      );
    });

    it('should fail: user in blacklist ', async () => {
      const {
        owner,
        redemptionVault,
        mTBILL,
        mTokenToUsdDataFeed,
        blackListableTester,
        regularAccounts,
        greenListableTester,
        accessControl,
      } = await loadFixture(defaultDeploy);

      await greenList(
        { greenlistable: greenListableTester, accessControl, owner },
        regularAccounts[0],
      );

      await blackList(
        { blacklistable: blackListableTester, accessControl, owner },
        regularAccounts[0],
      );

      await redeemFiatRequestTest(
        { redemptionVault, owner, mTBILL, mTokenToUsdDataFeed },
        1,
        {
          from: regularAccounts[0],
          revertMessage: acErrors.WMAC_HAS_ROLE,
        },
      );
    });

    it('should fail: user in sanctions list', async () => {
      const {
        owner,
        redemptionVault,
        mTBILL,
        mTokenToUsdDataFeed,
        regularAccounts,
        mockedSanctionsList,
        greenListableTester,
        accessControl,
      } = await loadFixture(defaultDeploy);

      await greenList(
        { greenlistable: greenListableTester, accessControl, owner },
        regularAccounts[0],
      );

      await sanctionUser(
        { sanctionsList: mockedSanctionsList },
        regularAccounts[0],
      );

      await redeemFiatRequestTest(
        { redemptionVault, owner, mTBILL, mTokenToUsdDataFeed },
        1,
        {
          from: regularAccounts[0],
          revertMessage: 'WSL: sanctioned',
        },
      );
    });

    it('redeem fiat request 100 mTBILL, greenlist enabled and user in greenlist ', async () => {
      const {
        owner,
        redemptionVault,
        mTBILL,
        mTokenToUsdDataFeed,
        regularAccounts,
        greenListableTester,
        accessControl,
      } = await loadFixture(defaultDeploy);

      await greenList(
        { greenlistable: greenListableTester, accessControl, owner },
        owner,
      );

      await redemptionVault.setGreenlistEnable(true);

      await greenList(
        { greenlistable: greenListableTester, accessControl, owner },
        regularAccounts[0],
      );

      await mintToken(mTBILL, regularAccounts[0], 100);
      await approveBase18(regularAccounts[0], mTBILL, redemptionVault, 100);

      await redeemFiatRequestTest(
        { redemptionVault, owner, mTBILL, mTokenToUsdDataFeed },
        100,
        {
          from: regularAccounts[0],
        },
      );
    });

    it('redeem fiat request 100 mTBILL, when price of stable is 1.03$ and mToken price is 5$', async () => {
      const {
        owner,
        mockedAggregator,
        mockedAggregatorMToken,
        redemptionVault,
        mTBILL,
        mTokenToUsdDataFeed,
        greenListableTester,
        accessControl,
      } = await loadFixture(defaultDeploy);

      await greenList(
        { greenlistable: greenListableTester, accessControl, owner },
        owner,
      );

      await mintToken(mTBILL, owner, 100);
      await approveBase18(owner, mTBILL, redemptionVault, 100);

      await setRoundData({ mockedAggregator }, 1.03);
      await setRoundData({ mockedAggregator: mockedAggregatorMToken }, 5);

      await redeemFiatRequestTest(
        { redemptionVault, owner, mTBILL, mTokenToUsdDataFeed },
        100,
      );
    });

    it('redeem fiat request 100 mTBILL, when price of stable is 1.03$ and mToken price is 5$ and token fee 1%', async () => {
      const {
        owner,
        mockedAggregator,
        mockedAggregatorMToken,
        redemptionVault,
        mTBILL,
        mTokenToUsdDataFeed,
        greenListableTester,
        accessControl,
      } = await loadFixture(defaultDeploy);

      await greenList(
        { greenlistable: greenListableTester, accessControl, owner },
        owner,
      );

      await mintToken(mTBILL, owner, 100);
      await approveBase18(owner, mTBILL, redemptionVault, 100);

      await setRoundData({ mockedAggregator }, 1.03);
      await setRoundData({ mockedAggregator: mockedAggregatorMToken }, 5);
      await redeemFiatRequestTest(
        { redemptionVault, owner, mTBILL, mTokenToUsdDataFeed },
        100,
      );
    });

    it('redeem fiat request 100 mTBILL, when price of stable is 1.03$ and mToken price is 5$ without checking of minDepositAmount', async () => {
      const {
        owner,
        mockedAggregator,
        mockedAggregatorMToken,
        redemptionVault,
        mTBILL,
        mTokenToUsdDataFeed,
        greenListableTester,
        accessControl,
      } = await loadFixture(defaultDeploy);

      await greenList(
        { greenlistable: greenListableTester, accessControl, owner },
        owner,
      );

      await mintToken(mTBILL, owner, 100);
      await approveBase18(owner, mTBILL, redemptionVault, 100);

      await setRoundData({ mockedAggregator }, 1.03);
      await setRoundData({ mockedAggregator: mockedAggregatorMToken }, 5);
      await redemptionVault.freeFromMinAmount(owner.address, true);

      await redeemFiatRequestTest(
        { redemptionVault, owner, mTBILL, mTokenToUsdDataFeed },
        100,
      );
    });

    it('redeem fiat request 100 mTBILL, when price of stable is 1.03$ and mToken price is 5$ and user in waivedFeeRestriction', async () => {
      const {
        owner,
        mockedAggregator,
        mockedAggregatorMToken,
        redemptionVault,
        mTBILL,
        mTokenToUsdDataFeed,
        greenListableTester,
        accessControl,
      } = await loadFixture(defaultDeploy);

      await greenList(
        { greenlistable: greenListableTester, accessControl, owner },
        owner,
      );

      await mintToken(mTBILL, owner, 100);
      await approveBase18(owner, mTBILL, redemptionVault, 100);

      await setRoundData({ mockedAggregator }, 1.03);
      await setRoundData({ mockedAggregator: mockedAggregatorMToken }, 5);
      await addWaivedFeeAccountTest(
        { vault: redemptionVault, owner },
        owner.address,
      );
      await redeemFiatRequestTest(
        {
          redemptionVault,
          owner,
          mTBILL,
          mTokenToUsdDataFeed,
          waivedFee: true,
        },
        100,
      );
    });
  });

  describe('approveRequest()', async () => {
    it('should fail: call from address without vault admin role', async () => {
      const { redemptionVault, regularAccounts, mTokenToUsdDataFeed, mTBILL } =
        await loadFixture(defaultDeploy);
      await approveRedeemRequestTest(
        {
          redemptionVault,
          owner: regularAccounts[1],
          mTBILL,
          mTokenToUsdDataFeed,
        },
        1,
        parseUnits('1'),
        {
          revertMessage: 'WMAC: hasnt role',
        },
      );
    });

    it('should fail: request by id not exist', async () => {
      const {
        owner,
        redemptionVault,
        stableCoins,
        mTBILL,
        dataFeed,
        mTokenToUsdDataFeed,
      } = await loadFixture(defaultDeploy);
      await addPaymentTokenTest(
        { vault: redemptionVault, owner },
        stableCoins.dai,
        dataFeed.address,
        0,
        true,
      );
      await approveRedeemRequestTest(
        { redemptionVault, owner, mTBILL, mTokenToUsdDataFeed },
        1,
        parseUnits('1'),
        {
          revertMessage: 'RV: request not exist',
        },
      );
    });

    it('should fail: request already processed', async () => {
      const {
        owner,
        mockedAggregator,
        mockedAggregatorMToken,
        redemptionVault,
        stableCoins,
        mTBILL,
        dataFeed,
        mTokenToUsdDataFeed,
        requestRedeemer,
      } = await loadFixture(defaultDeploy);

      await mintToken(stableCoins.dai, requestRedeemer, 100000);
      await approveBase18(
        requestRedeemer,
        stableCoins.dai,
        redemptionVault,
        100000,
      );

      await mintToken(mTBILL, owner, 100);
      await approveBase18(owner, mTBILL, redemptionVault, 100);
      await addPaymentTokenTest(
        { vault: redemptionVault, owner },
        stableCoins.dai,
        dataFeed.address,
        0,
        true,
      );
      await setRoundData({ mockedAggregator }, 1.03);
      await setRoundData({ mockedAggregator: mockedAggregatorMToken }, 5);

      await redeemRequestTest(
        { redemptionVault, owner, mTBILL, mTokenToUsdDataFeed },
        stableCoins.dai,
        100,
      );
      const requestId = 0;

      await approveRedeemRequestTest(
        { redemptionVault, owner, mTBILL, mTokenToUsdDataFeed },
        +requestId,
        parseUnits('1'),
      );
      await approveRedeemRequestTest(
        { redemptionVault, owner, mTBILL, mTokenToUsdDataFeed },
        +requestId,
        parseUnits('1'),
        { revertMessage: 'RV: request not pending' },
      );
    });

    it('approve request from vaut admin account', async () => {
      const {
        owner,
        mockedAggregator,
        mockedAggregatorMToken,
        redemptionVault,
        stableCoins,
        mTBILL,
        dataFeed,
        mTokenToUsdDataFeed,
        requestRedeemer,
      } = await loadFixture(defaultDeploy);

      await mintToken(stableCoins.dai, requestRedeemer, 100000);
      await approveBase18(
        requestRedeemer,
        stableCoins.dai,
        redemptionVault,
        100000,
      );
      await mintToken(mTBILL, owner, 100);
      await approveBase18(owner, mTBILL, redemptionVault, 100);
      await addPaymentTokenTest(
        { vault: redemptionVault, owner },
        stableCoins.dai,
        dataFeed.address,
        0,
        true,
      );
      await setRoundData({ mockedAggregator }, 1.03);
      await setRoundData({ mockedAggregator: mockedAggregatorMToken }, 5);

      await redeemRequestTest(
        { redemptionVault, owner, mTBILL, mTokenToUsdDataFeed },
        stableCoins.dai,
        100,
      );
      const requestId = 0;

      await approveRedeemRequestTest(
        { redemptionVault, owner, mTBILL, mTokenToUsdDataFeed },
        +requestId,
        parseUnits('1'),
      );
    });
  });

  describe('approveRequest() with fiat', async () => {
    it('approve request from vaut admin account', async () => {
      const {
        owner,
        mockedAggregator,
        mockedAggregatorMToken,
        redemptionVault,
        mTBILL,
        mTokenToUsdDataFeed,
        greenListableTester,
        accessControl,
      } = await loadFixture(defaultDeploy);

      await greenList(
        { greenlistable: greenListableTester, accessControl, owner },
        owner,
      );

      await mintToken(mTBILL, owner, 100);
      await approveBase18(owner, mTBILL, redemptionVault, 100);
      await setRoundData({ mockedAggregator }, 1.03);
      await setRoundData({ mockedAggregator: mockedAggregatorMToken }, 5);

      await redeemFiatRequestTest(
        { redemptionVault, owner, mTBILL, mTokenToUsdDataFeed },
        100,
      );
      const requestId = 0;

      await changeTokenAllowanceTest(
        { vault: redemptionVault, owner },
        constants.AddressZero,
        parseUnits('100'),
      );

      await approveRedeemRequestTest(
        { redemptionVault, owner, mTBILL, mTokenToUsdDataFeed },
        +requestId,
        parseUnits('1'),
      );
    });
  });

  describe('safeApproveRequest()', async () => {
    it('should fail: call from address without vault admin role', async () => {
      const { redemptionVault, regularAccounts, mTokenToUsdDataFeed, mTBILL } =
        await loadFixture(defaultDeploy);
      await safeApproveRedeemRequestTest(
        {
          redemptionVault,
          owner: regularAccounts[1],
          mTBILL,
          mTokenToUsdDataFeed,
        },
        1,
        parseUnits('1'),
        {
          revertMessage: 'WMAC: hasnt role',
        },
      );
    });

    it('should fail: request by id not exist', async () => {
      const {
        owner,
        redemptionVault,
        stableCoins,
        mTBILL,
        dataFeed,
        mTokenToUsdDataFeed,
      } = await loadFixture(defaultDeploy);
      await addPaymentTokenTest(
        { vault: redemptionVault, owner },
        stableCoins.dai,
        dataFeed.address,
        0,
        true,
      );
      await safeApproveRedeemRequestTest(
        { redemptionVault, owner, mTBILL, mTokenToUsdDataFeed },
        1,
        parseUnits('1'),
        {
          revertMessage: 'RV: request not exist',
        },
      );
    });

    it('should fail: if new rate greater then variabilityTolerance', async () => {
      const {
        owner,
        mockedAggregator,
        mockedAggregatorMToken,
        redemptionVault,
        stableCoins,
        mTBILL,
        dataFeed,
        mTokenToUsdDataFeed,
        requestRedeemer,
      } = await loadFixture(defaultDeploy);

      await mintToken(stableCoins.dai, requestRedeemer, 100000);
      await approveBase18(
        requestRedeemer,
        stableCoins.dai,
        redemptionVault,
        100000,
      );
      await mintToken(mTBILL, owner, 100);
      await approveBase18(owner, mTBILL, redemptionVault, 100);
      await addPaymentTokenTest(
        { vault: redemptionVault, owner },
        stableCoins.dai,
        dataFeed.address,
        0,
        true,
      );
      await setRoundData({ mockedAggregator }, 1.001);
      await setRoundData({ mockedAggregator: mockedAggregatorMToken }, 5);

      await redeemRequestTest(
        { redemptionVault, owner, mTBILL, mTokenToUsdDataFeed },
        stableCoins.dai,
        100,
      );
      const requestId = 0;

      await safeApproveRedeemRequestTest(
        { redemptionVault, owner, mTBILL, mTokenToUsdDataFeed },
        +requestId,
        parseUnits('6'),
        { revertMessage: 'MV: exceed price diviation' },
      );
    });

    it('should fail: request already processed', async () => {
      const {
        owner,
        mockedAggregator,
        mockedAggregatorMToken,
        redemptionVault,
        stableCoins,
        mTBILL,
        dataFeed,
        mTokenToUsdDataFeed,
        requestRedeemer,
      } = await loadFixture(defaultDeploy);

      await mintToken(stableCoins.dai, requestRedeemer, 100000);
      await approveBase18(
        requestRedeemer,
        stableCoins.dai,
        redemptionVault,
        100000,
      );
      await mintToken(mTBILL, owner, 100);
      await approveBase18(owner, mTBILL, redemptionVault, 100);
      await addPaymentTokenTest(
        { vault: redemptionVault, owner },
        stableCoins.dai,
        dataFeed.address,
        0,
        true,
      );
      await setRoundData({ mockedAggregator }, 1.001);
      await setRoundData({ mockedAggregator: mockedAggregatorMToken }, 5);

      await redeemRequestTest(
        { redemptionVault, owner, mTBILL, mTokenToUsdDataFeed },
        stableCoins.dai,
        100,
      );
      const requestId = 0;

      await safeApproveRedeemRequestTest(
        { redemptionVault, owner, mTBILL, mTokenToUsdDataFeed },
        +requestId,
        parseUnits('5.000001'),
      );
      await safeApproveRedeemRequestTest(
        { redemptionVault, owner, mTBILL, mTokenToUsdDataFeed },
        +requestId,
        parseUnits('5.00001'),
        { revertMessage: 'RV: request not pending' },
      );
    });

    it('safe approve request from vaut admin account', async () => {
      const {
        owner,
        mockedAggregator,
        mockedAggregatorMToken,
        redemptionVault,
        stableCoins,
        mTBILL,
        mTokenToUsdDataFeed,
        dataFeed,
        requestRedeemer,
      } = await loadFixture(defaultDeploy);

      await mintToken(stableCoins.dai, requestRedeemer, 100000);
      await approveBase18(
        requestRedeemer,
        stableCoins.dai,
        redemptionVault,
        100000,
      );
      await mintToken(mTBILL, owner, 100);
      await approveBase18(owner, mTBILL, redemptionVault, 100);
      await addPaymentTokenTest(
        { vault: redemptionVault, owner },
        stableCoins.dai,
        dataFeed.address,
        0,
        true,
      );

      await setRoundData({ mockedAggregator }, 1.03);
      await setRoundData({ mockedAggregator: mockedAggregatorMToken }, 5);

      await redeemRequestTest(
        { redemptionVault, owner, mTBILL, mTokenToUsdDataFeed },
        stableCoins.dai,
        100,
      );
      const requestId = 0;

      await safeApproveRedeemRequestTest(
        { redemptionVault, owner, mTBILL, mTokenToUsdDataFeed },
        +requestId,
        parseUnits('5.000001'),
      );
    });
  });

  describe('safeBulkApproveRequest() (custom price overload)', async () => {
    it('should fail: call from address without vault admin role', async () => {
      const { redemptionVault, regularAccounts, mTokenToUsdDataFeed, mTBILL } =
        await loadFixture(defaultDeploy);
      await safeBulkApproveRequestTest(
        {
          redemptionVault,
          owner: regularAccounts[1],
          mTBILL,
          mTokenToUsdDataFeed,
        },
        [{ id: 1 }],
        parseUnits('1'),
        {
          revertMessage: 'WMAC: hasnt role',
        },
      );
    });

    it('should fail: request by id not exist', async () => {
      const {
        owner,
        redemptionVault,
        stableCoins,
        mTBILL,
        dataFeed,
        mTokenToUsdDataFeed,
      } = await loadFixture(defaultDeploy);
      await addPaymentTokenTest(
        { vault: redemptionVault, owner },
        stableCoins.dai,
        dataFeed.address,
        0,
        true,
      );
      await safeBulkApproveRequestTest(
        { redemptionVault, owner, mTBILL, mTokenToUsdDataFeed },
        [{ id: 1 }],
        parseUnits('1'),
        {
          revertMessage: 'RV: request not exist',
        },
      );
    });

    it('should fail: if new rate greater then variabilityTolerance', async () => {
      const {
        owner,
        mockedAggregator,
        mockedAggregatorMToken,
        redemptionVault,
        stableCoins,
        mTBILL,
        dataFeed,
        mTokenToUsdDataFeed,
        requestRedeemer,
      } = await loadFixture(defaultDeploy);

      await mintToken(stableCoins.dai, requestRedeemer, 100000);
      await approveBase18(
        requestRedeemer,
        stableCoins.dai,
        redemptionVault,
        100000,
      );
      await mintToken(mTBILL, owner, 100);
      await approveBase18(owner, mTBILL, redemptionVault, 100);
      await addPaymentTokenTest(
        { vault: redemptionVault, owner },
        stableCoins.dai,
        dataFeed.address,
        0,
        true,
      );
      await setRoundData({ mockedAggregator }, 1.001);
      await setRoundData({ mockedAggregator: mockedAggregatorMToken }, 5);

      await redeemRequestTest(
        { redemptionVault, owner, mTBILL, mTokenToUsdDataFeed },
        stableCoins.dai,
        100,
      );
      const requestId = 0;

      await safeBulkApproveRequestTest(
        { redemptionVault, owner, mTBILL, mTokenToUsdDataFeed },
        [{ id: requestId }],
        parseUnits('6'),
        { revertMessage: 'MV: exceed price diviation' },
      );
    });

    it('should fail: if new rate lower then variabilityTolerance', async () => {
      const {
        owner,
        mockedAggregator,
        mockedAggregatorMToken,
        redemptionVault,
        stableCoins,
        mTBILL,
        dataFeed,
        mTokenToUsdDataFeed,
        requestRedeemer,
      } = await loadFixture(defaultDeploy);

      await mintToken(stableCoins.dai, requestRedeemer, 100000);
      await approveBase18(
        requestRedeemer,
        stableCoins.dai,
        redemptionVault,
        100000,
      );
      await mintToken(mTBILL, owner, 100);
      await approveBase18(owner, mTBILL, redemptionVault, 100);
      await addPaymentTokenTest(
        { vault: redemptionVault, owner },
        stableCoins.dai,
        dataFeed.address,
        0,
        true,
      );
      await setRoundData({ mockedAggregator }, 1.001);
      await setRoundData({ mockedAggregator: mockedAggregatorMToken }, 5);

      await redeemRequestTest(
        { redemptionVault, owner, mTBILL, mTokenToUsdDataFeed },
        stableCoins.dai,
        100,
      );
      const requestId = 0;

      await safeBulkApproveRequestTest(
        { redemptionVault, owner, mTBILL, mTokenToUsdDataFeed },
        [{ id: requestId }],
        parseUnits('4'),
        { revertMessage: 'MV: exceed price diviation' },
      );
    });

    it('should fail: request already processed', async () => {
      const {
        owner,
        mockedAggregator,
        mockedAggregatorMToken,
        redemptionVault,
        stableCoins,
        mTBILL,
        dataFeed,
        mTokenToUsdDataFeed,
        requestRedeemer,
      } = await loadFixture(defaultDeploy);

      await mintToken(stableCoins.dai, requestRedeemer, 100000);
      await approveBase18(
        requestRedeemer,
        stableCoins.dai,
        redemptionVault,
        100000,
      );
      await mintToken(mTBILL, owner, 100);
      await approveBase18(owner, mTBILL, redemptionVault, 100);
      await addPaymentTokenTest(
        { vault: redemptionVault, owner },
        stableCoins.dai,
        dataFeed.address,
        0,
        true,
      );
      await setRoundData({ mockedAggregator }, 1.001);
      await setRoundData({ mockedAggregator: mockedAggregatorMToken }, 5);

      await redeemRequestTest(
        { redemptionVault, owner, mTBILL, mTokenToUsdDataFeed },
        stableCoins.dai,
        100,
      );
      const requestId = 0;

      await safeBulkApproveRequestTest(
        { redemptionVault, owner, mTBILL, mTokenToUsdDataFeed },
        [{ id: requestId }],
        parseUnits('5.000001'),
      );
      await safeBulkApproveRequestTest(
        { redemptionVault, owner, mTBILL, mTokenToUsdDataFeed },
        [{ id: requestId }],
        parseUnits('5.00001'),
        { revertMessage: 'RV: request not pending' },
      );
    });

    it('should fail: process multiple requests, when one of them already precessed', async () => {
      const {
        owner,
        mockedAggregator,
        mockedAggregatorMToken,
        redemptionVault,
        stableCoins,
        mTBILL,
        dataFeed,
        mTokenToUsdDataFeed,
        requestRedeemer,
      } = await loadFixture(defaultDeploy);

      await mintToken(stableCoins.dai, requestRedeemer, 100000);
      await approveBase18(
        requestRedeemer,
        stableCoins.dai,
        redemptionVault,
        100000,
      );
      await mintToken(mTBILL, owner, 200);
      await approveBase18(owner, mTBILL, redemptionVault, 200);
      await addPaymentTokenTest(
        { vault: redemptionVault, owner },
        stableCoins.dai,
        dataFeed.address,
        0,
        true,
      );
      await setRoundData({ mockedAggregator }, 1.001);
      await setRoundData({ mockedAggregator: mockedAggregatorMToken }, 5);

      await redeemRequestTest(
        { redemptionVault, owner, mTBILL, mTokenToUsdDataFeed },
        stableCoins.dai,
        100,
      );

      await redeemRequestTest(
        { redemptionVault, owner, mTBILL, mTokenToUsdDataFeed },
        stableCoins.dai,
        100,
      );

      await safeApproveRedeemRequestTest(
        { redemptionVault, owner, mTBILL, mTokenToUsdDataFeed },
        0,
        parseUnits('5.000001'),
      );
      await safeBulkApproveRequestTest(
        { redemptionVault, owner, mTBILL, mTokenToUsdDataFeed },
        [{ id: 1 }, { id: 0 }],
        parseUnits('5.00001'),
        { revertMessage: 'RV: request not pending' },
      );
    });

    it('should fail: process multiple requests, when couple of them have equal id', async () => {
      const {
        owner,
        mockedAggregator,
        mockedAggregatorMToken,
        redemptionVault,
        stableCoins,
        mTBILL,
        dataFeed,
        mTokenToUsdDataFeed,
        requestRedeemer,
      } = await loadFixture(defaultDeploy);

      await mintToken(stableCoins.dai, requestRedeemer, 100000);
      await approveBase18(
        requestRedeemer,
        stableCoins.dai,
        redemptionVault,
        100000,
      );
      await mintToken(mTBILL, owner, 200);
      await approveBase18(owner, mTBILL, redemptionVault, 200);
      await addPaymentTokenTest(
        { vault: redemptionVault, owner },
        stableCoins.dai,
        dataFeed.address,
        0,
        true,
      );
      await setRoundData({ mockedAggregator }, 1.001);
      await setRoundData({ mockedAggregator: mockedAggregatorMToken }, 5);

      await redeemRequestTest(
        { redemptionVault, owner, mTBILL, mTokenToUsdDataFeed },
        stableCoins.dai,
        100,
      );

      await redeemRequestTest(
        { redemptionVault, owner, mTBILL, mTokenToUsdDataFeed },
        stableCoins.dai,
        100,
      );

      await safeApproveRedeemRequestTest(
        { redemptionVault, owner, mTBILL, mTokenToUsdDataFeed },
        0,
        parseUnits('5.000001'),
      );
      await safeBulkApproveRequestTest(
        { redemptionVault, owner, mTBILL, mTokenToUsdDataFeed },
        [{ id: 1 }, { id: 1 }],
        parseUnits('5.00001'),
        { revertMessage: 'RV: request not pending' },
      );
    });

    it('approve 1 request from vaut admin account', async () => {
      const {
        owner,
        mockedAggregator,
        mockedAggregatorMToken,
        redemptionVault,
        stableCoins,
        mTBILL,
        mTokenToUsdDataFeed,
        dataFeed,
        requestRedeemer,
      } = await loadFixture(defaultDeploy);

      await mintToken(stableCoins.dai, requestRedeemer, 100000);
      await approveBase18(
        requestRedeemer,
        stableCoins.dai,
        redemptionVault,
        100000,
      );
      await mintToken(mTBILL, owner, 100);
      await approveBase18(owner, mTBILL, redemptionVault, 100);
      await addPaymentTokenTest(
        { vault: redemptionVault, owner },
        stableCoins.dai,
        dataFeed.address,
        0,
        true,
      );

      await setRoundData({ mockedAggregator }, 1.03);
      await setRoundData({ mockedAggregator: mockedAggregatorMToken }, 5);

      await redeemRequestTest(
        { redemptionVault, owner, mTBILL, mTokenToUsdDataFeed },
        stableCoins.dai,
        100,
      );
      const requestId = 0;

      await safeBulkApproveRequestTest(
        { redemptionVault, owner, mTBILL, mTokenToUsdDataFeed },
        [{ id: requestId }],
        parseUnits('5.000001'),
      );
    });

    it('approve 2 request from vaut admin account', async () => {
      const {
        owner,
        mockedAggregator,
        mockedAggregatorMToken,
        redemptionVault,
        stableCoins,
        mTBILL,
        mTokenToUsdDataFeed,
        dataFeed,
        requestRedeemer,
      } = await loadFixture(defaultDeploy);

      await mintToken(stableCoins.dai, requestRedeemer, 100000);
      await approveBase18(
        requestRedeemer,
        stableCoins.dai,
        redemptionVault,
        100000,
      );
      await mintToken(mTBILL, owner, 200);
      await approveBase18(owner, mTBILL, redemptionVault, 200);
      await addPaymentTokenTest(
        { vault: redemptionVault, owner },
        stableCoins.dai,
        dataFeed.address,
        0,
        true,
      );

      await setRoundData({ mockedAggregator }, 1.03);
      await setRoundData({ mockedAggregator: mockedAggregatorMToken }, 5);

      await redeemRequestTest(
        { redemptionVault, owner, mTBILL, mTokenToUsdDataFeed },
        stableCoins.dai,
        100,
      );

      await redeemRequestTest(
        { redemptionVault, owner, mTBILL, mTokenToUsdDataFeed },
        stableCoins.dai,
        100,
      );

      await safeBulkApproveRequestTest(
        { redemptionVault, owner, mTBILL, mTokenToUsdDataFeed },
        [{ id: 1 }, { id: 0 }],
        parseUnits('5.000001'),
      );
    });

    it('approve 10 request from vaut admin account', async () => {
      const {
        owner,
        mockedAggregator,
        mockedAggregatorMToken,
        redemptionVault,
        stableCoins,
        mTBILL,
        mTokenToUsdDataFeed,
        dataFeed,
        requestRedeemer,
        regularAccounts,
      } = await loadFixture(defaultDeploy);

      await mintToken(stableCoins.dai, requestRedeemer, 100000);
      await approveBase18(
        requestRedeemer,
        stableCoins.dai,
        redemptionVault,
        100000,
      );
      await mintToken(mTBILL, owner, 1000);
      await approveBase18(owner, mTBILL, redemptionVault, 1000);
      await addPaymentTokenTest(
        { vault: redemptionVault, owner },
        stableCoins.dai,
        dataFeed.address,
        0,
        true,
      );

      await setRoundData({ mockedAggregator }, 1.03);
      await setRoundData({ mockedAggregator: mockedAggregatorMToken }, 5);

      for (let i = 0; i < 10; i++) {
        await redeemRequestTest(
          {
            redemptionVault,
            owner,
            mTBILL,
            mTokenToUsdDataFeed,
            customRecipient: regularAccounts[i],
          },
          stableCoins.dai,
          100,
        );
      }

      await safeBulkApproveRequestTest(
        { redemptionVault, owner, mTBILL, mTokenToUsdDataFeed },
        Array.from({ length: 10 }, (_, i) => ({ id: i })),
        parseUnits('5.000001'),
      );
    });

    it('approve 1 request when there is not enough liquidity', async () => {
      const {
        owner,
        mockedAggregator,
        mockedAggregatorMToken,
        redemptionVault,
        stableCoins,
        mTBILL,
        mTokenToUsdDataFeed,
        dataFeed,
        requestRedeemer,
      } = await loadFixture(defaultDeploy);

      await approveBase18(
        requestRedeemer,
        stableCoins.dai,
        redemptionVault,
        100000,
      );
      await mintToken(mTBILL, owner, 100);
      await approveBase18(owner, mTBILL, redemptionVault, 100);
      await addPaymentTokenTest(
        { vault: redemptionVault, owner },
        stableCoins.dai,
        dataFeed.address,
        0,
        true,
      );

      await setRoundData({ mockedAggregator }, 1.03);
      await setRoundData({ mockedAggregator: mockedAggregatorMToken }, 5);

      await redeemRequestTest(
        { redemptionVault, owner, mTBILL, mTokenToUsdDataFeed },
        stableCoins.dai,
        100,
      );
      const requestId = 0;

      await safeBulkApproveRequestTest(
        { redemptionVault, owner, mTBILL, mTokenToUsdDataFeed },
        [{ id: requestId, expectedToExecute: false }],
        parseUnits('5.000001'),
      );
    });

    it('approve 2 request when there is enough liquidity only for first one', async () => {
      const {
        owner,
        mockedAggregator,
        mockedAggregatorMToken,
        redemptionVault,
        stableCoins,
        mTBILL,
        mTokenToUsdDataFeed,
        dataFeed,
        requestRedeemer,
      } = await loadFixture(defaultDeploy);

      await mintToken(stableCoins.dai, requestRedeemer, 600);

      await approveBase18(
        requestRedeemer,
        stableCoins.dai,
        redemptionVault,
        600,
      );
      await mintToken(mTBILL, owner, 200);
      await approveBase18(owner, mTBILL, redemptionVault, 200);
      await addPaymentTokenTest(
        { vault: redemptionVault, owner },
        stableCoins.dai,
        dataFeed.address,
        0,
        true,
      );

      await setRoundData({ mockedAggregator }, 1.03);
      await setRoundData({ mockedAggregator: mockedAggregatorMToken }, 5);

      await redeemRequestTest(
        { redemptionVault, owner, mTBILL, mTokenToUsdDataFeed },
        stableCoins.dai,
        100,
      );
      await redeemRequestTest(
        { redemptionVault, owner, mTBILL, mTokenToUsdDataFeed },
        stableCoins.dai,
        100,
      );
      await safeBulkApproveRequestTest(
        { redemptionVault, owner, mTBILL, mTokenToUsdDataFeed },
        [
          { id: 0, expectedToExecute: true },
          { id: 1, expectedToExecute: false },
        ],
        parseUnits('5.000001'),
      );
    });

    it('approve 2 requests both with different payment tokens', async () => {
      const {
        owner,
        mockedAggregator,
        mockedAggregatorMToken,
        redemptionVault,
        stableCoins,
        mTBILL,
        mTokenToUsdDataFeed,
        dataFeed,
        requestRedeemer,
      } = await loadFixture(defaultDeploy);

      await mintToken(stableCoins.dai, requestRedeemer, 100000);
      await mintToken(stableCoins.usdc, requestRedeemer, 100000);
      await approveBase18(
        requestRedeemer,
        stableCoins.dai,
        redemptionVault,
        100000,
      );
      await approveBase18(
        requestRedeemer,
        stableCoins.usdc,
        redemptionVault,
        100000,
      );
      await mintToken(mTBILL, owner, 200);
      await approveBase18(owner, mTBILL, redemptionVault, 200);
      await addPaymentTokenTest(
        { vault: redemptionVault, owner },
        stableCoins.dai,
        dataFeed.address,
        0,
        true,
      );
      await addPaymentTokenTest(
        { vault: redemptionVault, owner },
        stableCoins.usdc,
        dataFeed.address,
        0,
        true,
      );
      await setRoundData({ mockedAggregator }, 1.03);
      await setRoundData({ mockedAggregator: mockedAggregatorMToken }, 5);

      await redeemRequestTest(
        { redemptionVault, owner, mTBILL, mTokenToUsdDataFeed },
        stableCoins.dai,
        100,
      );

      await redeemRequestTest(
        { redemptionVault, owner, mTBILL, mTokenToUsdDataFeed },
        stableCoins.usdc,
        100,
      );

      await safeBulkApproveRequestTest(
        { redemptionVault, owner, mTBILL, mTokenToUsdDataFeed },
        [{ id: 1 }, { id: 0 }],
        parseUnits('5.000001'),
      );
    });

    it('approve 2 requests both with different payment tokens when there is not enough liquidity for first one', async () => {
      const {
        owner,
        mockedAggregator,
        mockedAggregatorMToken,
        redemptionVault,
        stableCoins,
        mTBILL,
        mTokenToUsdDataFeed,
        dataFeed,
        requestRedeemer,
      } = await loadFixture(defaultDeploy);

      await mintToken(stableCoins.usdc, requestRedeemer, 100000);

      await approveBase18(
        requestRedeemer,
        stableCoins.usdc,
        redemptionVault,
        100000,
      );
      await mintToken(mTBILL, owner, 200);
      await approveBase18(owner, mTBILL, redemptionVault, 200);
      await addPaymentTokenTest(
        { vault: redemptionVault, owner },
        stableCoins.dai,
        dataFeed.address,
        0,
        true,
      );
      await addPaymentTokenTest(
        { vault: redemptionVault, owner },
        stableCoins.usdc,
        dataFeed.address,
        0,
        true,
      );
      await setRoundData({ mockedAggregator }, 1.03);
      await setRoundData({ mockedAggregator: mockedAggregatorMToken }, 5);

      await redeemRequestTest(
        { redemptionVault, owner, mTBILL, mTokenToUsdDataFeed },
        stableCoins.dai,
        100,
      );

      await redeemRequestTest(
        { redemptionVault, owner, mTBILL, mTokenToUsdDataFeed },
        stableCoins.usdc,
        100,
      );

      await safeBulkApproveRequestTest(
        { redemptionVault, owner, mTBILL, mTokenToUsdDataFeed },
        [{ id: 1 }, { id: 0, expectedToExecute: false }],
        parseUnits('5.000001'),
      );
    });
  });

  describe('safeBulkApproveRequest() (current price overload)', async () => {
    it('should fail: call from address without vault admin role', async () => {
      const { redemptionVault, regularAccounts, mTokenToUsdDataFeed, mTBILL } =
        await loadFixture(defaultDeploy);
      await safeBulkApproveRequestTest(
        {
          redemptionVault,
          owner: regularAccounts[1],
          mTBILL,
          mTokenToUsdDataFeed,
        },
        [{ id: 1 }],
        undefined,
        {
          revertMessage: 'WMAC: hasnt role',
        },
      );
    });

    it('should fail: request by id not exist', async () => {
      const {
        owner,
        redemptionVault,
        stableCoins,
        mTBILL,
        dataFeed,
        mTokenToUsdDataFeed,
      } = await loadFixture(defaultDeploy);
      await addPaymentTokenTest(
        { vault: redemptionVault, owner },
        stableCoins.dai,
        dataFeed.address,
        0,
        true,
      );
      await safeBulkApproveRequestTest(
        { redemptionVault, owner, mTBILL, mTokenToUsdDataFeed },
        [{ id: 1 }],
        undefined,
        {
          revertMessage: 'RV: request not exist',
        },
      );
    });

    it('should fail: if new rate greater then variabilityTolerance', async () => {
      const {
        owner,
        mockedAggregator,
        mockedAggregatorMToken,
        redemptionVault,
        stableCoins,
        mTBILL,
        dataFeed,
        mTokenToUsdDataFeed,
        requestRedeemer,
      } = await loadFixture(defaultDeploy);

      await mintToken(stableCoins.dai, requestRedeemer, 100000);
      await approveBase18(
        requestRedeemer,
        stableCoins.dai,
        redemptionVault,
        100000,
      );
      await mintToken(mTBILL, owner, 100);
      await approveBase18(owner, mTBILL, redemptionVault, 100);
      await addPaymentTokenTest(
        { vault: redemptionVault, owner },
        stableCoins.dai,
        dataFeed.address,
        0,
        true,
      );
      await setRoundData({ mockedAggregator }, 1.001);
      await setRoundData({ mockedAggregator: mockedAggregatorMToken }, 5);

      await redeemRequestTest(
        { redemptionVault, owner, mTBILL, mTokenToUsdDataFeed },
        stableCoins.dai,
        100,
      );
      await setRoundData({ mockedAggregator: mockedAggregatorMToken }, 6);

      const requestId = 0;

      await safeBulkApproveRequestTest(
        { redemptionVault, owner, mTBILL, mTokenToUsdDataFeed },
        [{ id: requestId }],
        undefined,
        { revertMessage: 'MV: exceed price diviation' },
      );
    });

    it('should fail: if new rate lower then variabilityTolerance', async () => {
      const {
        owner,
        mockedAggregator,
        mockedAggregatorMToken,
        redemptionVault,
        stableCoins,
        mTBILL,
        dataFeed,
        mTokenToUsdDataFeed,
        requestRedeemer,
      } = await loadFixture(defaultDeploy);

      await mintToken(stableCoins.dai, requestRedeemer, 100000);
      await approveBase18(
        requestRedeemer,
        stableCoins.dai,
        redemptionVault,
        100000,
      );
      await mintToken(mTBILL, owner, 100);
      await approveBase18(owner, mTBILL, redemptionVault, 100);
      await addPaymentTokenTest(
        { vault: redemptionVault, owner },
        stableCoins.dai,
        dataFeed.address,
        0,
        true,
      );
      await setRoundData({ mockedAggregator }, 1.001);
      await setRoundData({ mockedAggregator: mockedAggregatorMToken }, 5);

      await redeemRequestTest(
        { redemptionVault, owner, mTBILL, mTokenToUsdDataFeed },
        stableCoins.dai,
        100,
      );
      await setRoundData({ mockedAggregator: mockedAggregatorMToken }, 4);

      const requestId = 0;

      await safeBulkApproveRequestTest(
        { redemptionVault, owner, mTBILL, mTokenToUsdDataFeed },
        [{ id: requestId }],
        undefined,
        { revertMessage: 'MV: exceed price diviation' },
      );
    });

    it('should fail: request already processed', async () => {
      const {
        owner,
        mockedAggregator,
        mockedAggregatorMToken,
        redemptionVault,
        stableCoins,
        mTBILL,
        dataFeed,
        mTokenToUsdDataFeed,
        requestRedeemer,
      } = await loadFixture(defaultDeploy);

      await mintToken(stableCoins.dai, requestRedeemer, 100000);
      await approveBase18(
        requestRedeemer,
        stableCoins.dai,
        redemptionVault,
        100000,
      );
      await mintToken(mTBILL, owner, 100);
      await approveBase18(owner, mTBILL, redemptionVault, 100);
      await addPaymentTokenTest(
        { vault: redemptionVault, owner },
        stableCoins.dai,
        dataFeed.address,
        0,
        true,
      );
      await setRoundData({ mockedAggregator }, 1.001);
      await setRoundData({ mockedAggregator: mockedAggregatorMToken }, 5);

      await redeemRequestTest(
        { redemptionVault, owner, mTBILL, mTokenToUsdDataFeed },
        stableCoins.dai,
        100,
      );
      const requestId = 0;

      await safeBulkApproveRequestTest(
        { redemptionVault, owner, mTBILL, mTokenToUsdDataFeed },
        [{ id: requestId }],
        undefined,
      );
      await safeBulkApproveRequestTest(
        { redemptionVault, owner, mTBILL, mTokenToUsdDataFeed },
        [{ id: requestId }],
        undefined,
        { revertMessage: 'RV: request not pending' },
      );
    });

    it('should fail: process multiple requests, when one of them already precessed', async () => {
      const {
        owner,
        mockedAggregator,
        mockedAggregatorMToken,
        redemptionVault,
        stableCoins,
        mTBILL,
        dataFeed,
        mTokenToUsdDataFeed,
        requestRedeemer,
      } = await loadFixture(defaultDeploy);

      await mintToken(stableCoins.dai, requestRedeemer, 100000);
      await approveBase18(
        requestRedeemer,
        stableCoins.dai,
        redemptionVault,
        100000,
      );
      await mintToken(mTBILL, owner, 200);
      await approveBase18(owner, mTBILL, redemptionVault, 200);
      await addPaymentTokenTest(
        { vault: redemptionVault, owner },
        stableCoins.dai,
        dataFeed.address,
        0,
        true,
      );
      await setRoundData({ mockedAggregator }, 1.001);
      await setRoundData({ mockedAggregator: mockedAggregatorMToken }, 5);

      await redeemRequestTest(
        { redemptionVault, owner, mTBILL, mTokenToUsdDataFeed },
        stableCoins.dai,
        100,
      );

      await redeemRequestTest(
        { redemptionVault, owner, mTBILL, mTokenToUsdDataFeed },
        stableCoins.dai,
        100,
      );

      await safeApproveRedeemRequestTest(
        { redemptionVault, owner, mTBILL, mTokenToUsdDataFeed },
        0,
        parseUnits('5.000001'),
      );
      await safeBulkApproveRequestTest(
        { redemptionVault, owner, mTBILL, mTokenToUsdDataFeed },
        [{ id: 1 }, { id: 0 }],
        undefined,
        { revertMessage: 'RV: request not pending' },
      );
    });

    it('should fail: process multiple requests, when couple of them have equal id', async () => {
      const {
        owner,
        mockedAggregator,
        mockedAggregatorMToken,
        redemptionVault,
        stableCoins,
        mTBILL,
        dataFeed,
        mTokenToUsdDataFeed,
        requestRedeemer,
      } = await loadFixture(defaultDeploy);

      await mintToken(stableCoins.dai, requestRedeemer, 100000);
      await approveBase18(
        requestRedeemer,
        stableCoins.dai,
        redemptionVault,
        100000,
      );
      await mintToken(mTBILL, owner, 200);
      await approveBase18(owner, mTBILL, redemptionVault, 200);
      await addPaymentTokenTest(
        { vault: redemptionVault, owner },
        stableCoins.dai,
        dataFeed.address,
        0,
        true,
      );
      await setRoundData({ mockedAggregator }, 1.001);
      await setRoundData({ mockedAggregator: mockedAggregatorMToken }, 5);

      await redeemRequestTest(
        { redemptionVault, owner, mTBILL, mTokenToUsdDataFeed },
        stableCoins.dai,
        100,
      );

      await redeemRequestTest(
        { redemptionVault, owner, mTBILL, mTokenToUsdDataFeed },
        stableCoins.dai,
        100,
      );

      await safeApproveRedeemRequestTest(
        { redemptionVault, owner, mTBILL, mTokenToUsdDataFeed },
        0,
        parseUnits('5.000001'),
      );
      await safeBulkApproveRequestTest(
        { redemptionVault, owner, mTBILL, mTokenToUsdDataFeed },
        [{ id: 1 }, { id: 1 }],
        undefined,
        { revertMessage: 'RV: request not pending' },
      );
    });

    it('approve 1 request from vaut admin account', async () => {
      const {
        owner,
        mockedAggregator,
        mockedAggregatorMToken,
        redemptionVault,
        stableCoins,
        mTBILL,
        mTokenToUsdDataFeed,
        dataFeed,
        requestRedeemer,
      } = await loadFixture(defaultDeploy);

      await mintToken(stableCoins.dai, requestRedeemer, 100000);
      await approveBase18(
        requestRedeemer,
        stableCoins.dai,
        redemptionVault,
        100000,
      );
      await mintToken(mTBILL, owner, 100);
      await approveBase18(owner, mTBILL, redemptionVault, 100);
      await addPaymentTokenTest(
        { vault: redemptionVault, owner },
        stableCoins.dai,
        dataFeed.address,
        0,
        true,
      );

      await setRoundData({ mockedAggregator }, 1.03);
      await setRoundData({ mockedAggregator: mockedAggregatorMToken }, 5);

      await redeemRequestTest(
        { redemptionVault, owner, mTBILL, mTokenToUsdDataFeed },
        stableCoins.dai,
        100,
      );
      const requestId = 0;

      await safeBulkApproveRequestTest(
        { redemptionVault, owner, mTBILL, mTokenToUsdDataFeed },
        [{ id: requestId }],
        undefined,
      );
    });

    it('approve 1 request from vaut admin account when 10% growth is applied', async () => {
      const {
        owner,
        mockedAggregator,
        mockedAggregatorMToken,
        redemptionVault,
        stableCoins,
        mTBILL,
        mTokenToUsdDataFeed,
        dataFeed,
        requestRedeemer,
        customFeedGrowth,
      } = await loadFixture(defaultDeploy);

      await mTokenToUsdDataFeed.changeAggregator(customFeedGrowth.address);
      await setRoundDataGrowth({ owner, customFeedGrowth }, 1, -1000, 10);

      await mintToken(stableCoins.dai, requestRedeemer, 100000);
      await approveBase18(
        requestRedeemer,
        stableCoins.dai,
        redemptionVault,
        100000,
      );
      await mintToken(mTBILL, owner, 100);
      await approveBase18(owner, mTBILL, redemptionVault, 100);
      await addPaymentTokenTest(
        { vault: redemptionVault, owner },
        stableCoins.dai,
        dataFeed.address,
        0,
        true,
      );

      await setRoundData({ mockedAggregator }, 1.03);
      await setRoundData({ mockedAggregator: mockedAggregatorMToken }, 5);

      await redeemRequestTest(
        { redemptionVault, owner, mTBILL, mTokenToUsdDataFeed },
        stableCoins.dai,
        100,
      );
      const requestId = 0;

      await safeBulkApproveRequestTest(
        { redemptionVault, owner, mTBILL, mTokenToUsdDataFeed },
        [{ id: requestId }],
        undefined,
      );
    });

    it('approve 1 request from vaut admin account when -10% growth is applied', async () => {
      const {
        owner,
        mockedAggregator,
        mockedAggregatorMToken,
        redemptionVault,
        stableCoins,
        mTBILL,
        mTokenToUsdDataFeed,
        dataFeed,
        requestRedeemer,
        customFeedGrowth,
      } = await loadFixture(defaultDeploy);

      await mTokenToUsdDataFeed.changeAggregator(customFeedGrowth.address);
      await setMinGrowthApr({ owner, customFeedGrowth }, -10);
      await setRoundDataGrowth({ owner, customFeedGrowth }, 1, -1000, -10);

      await mintToken(stableCoins.dai, requestRedeemer, 100000);
      await approveBase18(
        requestRedeemer,
        stableCoins.dai,
        redemptionVault,
        100000,
      );
      await mintToken(mTBILL, owner, 100);
      await approveBase18(owner, mTBILL, redemptionVault, 100);
      await addPaymentTokenTest(
        { vault: redemptionVault, owner },
        stableCoins.dai,
        dataFeed.address,
        0,
        true,
      );

      await setRoundData({ mockedAggregator }, 1.03);
      await setRoundData({ mockedAggregator: mockedAggregatorMToken }, 5);

      await redeemRequestTest(
        { redemptionVault, owner, mTBILL, mTokenToUsdDataFeed },
        stableCoins.dai,
        100,
      );
      const requestId = 0;

      await safeBulkApproveRequestTest(
        { redemptionVault, owner, mTBILL, mTokenToUsdDataFeed },
        [{ id: requestId }],
        undefined,
      );
    });

    it('approve 2 request from vaut admin account', async () => {
      const {
        owner,
        mockedAggregator,
        mockedAggregatorMToken,
        redemptionVault,
        stableCoins,
        mTBILL,
        mTokenToUsdDataFeed,
        dataFeed,
        requestRedeemer,
      } = await loadFixture(defaultDeploy);

      await mintToken(stableCoins.dai, requestRedeemer, 100000);
      await approveBase18(
        requestRedeemer,
        stableCoins.dai,
        redemptionVault,
        100000,
      );
      await mintToken(mTBILL, owner, 200);
      await approveBase18(owner, mTBILL, redemptionVault, 200);
      await addPaymentTokenTest(
        { vault: redemptionVault, owner },
        stableCoins.dai,
        dataFeed.address,
        0,
        true,
      );

      await setRoundData({ mockedAggregator }, 1.03);
      await setRoundData({ mockedAggregator: mockedAggregatorMToken }, 5);

      await redeemRequestTest(
        { redemptionVault, owner, mTBILL, mTokenToUsdDataFeed },
        stableCoins.dai,
        100,
      );

      await redeemRequestTest(
        { redemptionVault, owner, mTBILL, mTokenToUsdDataFeed },
        stableCoins.dai,
        100,
      );

      await safeBulkApproveRequestTest(
        { redemptionVault, owner, mTBILL, mTokenToUsdDataFeed },
        [{ id: 1 }, { id: 0 }],
        undefined,
      );
    });

    it('approve 10 request from vaut admin account', async () => {
      const {
        owner,
        mockedAggregator,
        mockedAggregatorMToken,
        redemptionVault,
        stableCoins,
        mTBILL,
        mTokenToUsdDataFeed,
        dataFeed,
        requestRedeemer,
        regularAccounts,
      } = await loadFixture(defaultDeploy);

      await mintToken(stableCoins.dai, requestRedeemer, 100000);
      await approveBase18(
        requestRedeemer,
        stableCoins.dai,
        redemptionVault,
        100000,
      );
      await mintToken(mTBILL, owner, 1000);
      await approveBase18(owner, mTBILL, redemptionVault, 1000);
      await addPaymentTokenTest(
        { vault: redemptionVault, owner },
        stableCoins.dai,
        dataFeed.address,
        0,
        true,
      );

      await setRoundData({ mockedAggregator }, 1.03);
      await setRoundData({ mockedAggregator: mockedAggregatorMToken }, 5);

      for (let i = 0; i < 10; i++) {
        await redeemRequestTest(
          {
            redemptionVault,
            owner,
            mTBILL,
            mTokenToUsdDataFeed,
            customRecipient: regularAccounts[i],
          },
          stableCoins.dai,
          100,
        );
      }

      await safeBulkApproveRequestTest(
        { redemptionVault, owner, mTBILL, mTokenToUsdDataFeed },
        Array.from({ length: 10 }, (_, i) => ({ id: i })),
        undefined,
      );
    });

    it('approve 1 request when there is not enough liquidity', async () => {
      const {
        owner,
        mockedAggregator,
        mockedAggregatorMToken,
        redemptionVault,
        stableCoins,
        mTBILL,
        mTokenToUsdDataFeed,
        dataFeed,
        requestRedeemer,
      } = await loadFixture(defaultDeploy);

      await approveBase18(
        requestRedeemer,
        stableCoins.dai,
        redemptionVault,
        100000,
      );
      await mintToken(mTBILL, owner, 100);
      await approveBase18(owner, mTBILL, redemptionVault, 100);
      await addPaymentTokenTest(
        { vault: redemptionVault, owner },
        stableCoins.dai,
        dataFeed.address,
        0,
        true,
      );

      await setRoundData({ mockedAggregator }, 1.03);
      await setRoundData({ mockedAggregator: mockedAggregatorMToken }, 5);

      await redeemRequestTest(
        { redemptionVault, owner, mTBILL, mTokenToUsdDataFeed },
        stableCoins.dai,
        100,
      );
      const requestId = 0;

      await safeBulkApproveRequestTest(
        { redemptionVault, owner, mTBILL, mTokenToUsdDataFeed },
        [{ id: requestId, expectedToExecute: false }],
        undefined,
      );
    });

    it('approve 2 request when there is enough liquidity only for first one', async () => {
      const {
        owner,
        mockedAggregator,
        mockedAggregatorMToken,
        redemptionVault,
        stableCoins,
        mTBILL,
        mTokenToUsdDataFeed,
        dataFeed,
        requestRedeemer,
      } = await loadFixture(defaultDeploy);

      await mintToken(stableCoins.dai, requestRedeemer, 600);

      await approveBase18(
        requestRedeemer,
        stableCoins.dai,
        redemptionVault,
        600,
      );
      await mintToken(mTBILL, owner, 200);
      await approveBase18(owner, mTBILL, redemptionVault, 200);
      await addPaymentTokenTest(
        { vault: redemptionVault, owner },
        stableCoins.dai,
        dataFeed.address,
        0,
        true,
      );

      await setRoundData({ mockedAggregator }, 1.03);
      await setRoundData({ mockedAggregator: mockedAggregatorMToken }, 5);

      await redeemRequestTest(
        { redemptionVault, owner, mTBILL, mTokenToUsdDataFeed },
        stableCoins.dai,
        100,
      );
      await redeemRequestTest(
        { redemptionVault, owner, mTBILL, mTokenToUsdDataFeed },
        stableCoins.dai,
        100,
      );
      await safeBulkApproveRequestTest(
        { redemptionVault, owner, mTBILL, mTokenToUsdDataFeed },
        [
          { id: 0, expectedToExecute: true },
          { id: 1, expectedToExecute: false },
        ],
        undefined,
      );
    });

    it('approve 2 requests both with different payment tokens', async () => {
      const {
        owner,
        mockedAggregator,
        mockedAggregatorMToken,
        redemptionVault,
        stableCoins,
        mTBILL,
        mTokenToUsdDataFeed,
        dataFeed,
        requestRedeemer,
      } = await loadFixture(defaultDeploy);

      await mintToken(stableCoins.dai, requestRedeemer, 100000);
      await mintToken(stableCoins.usdc, requestRedeemer, 100000);
      await approveBase18(
        requestRedeemer,
        stableCoins.dai,
        redemptionVault,
        100000,
      );
      await approveBase18(
        requestRedeemer,
        stableCoins.usdc,
        redemptionVault,
        100000,
      );
      await mintToken(mTBILL, owner, 200);
      await approveBase18(owner, mTBILL, redemptionVault, 200);
      await addPaymentTokenTest(
        { vault: redemptionVault, owner },
        stableCoins.dai,
        dataFeed.address,
        0,
        true,
      );
      await addPaymentTokenTest(
        { vault: redemptionVault, owner },
        stableCoins.usdc,
        dataFeed.address,
        0,
        true,
      );
      await setRoundData({ mockedAggregator }, 1.03);
      await setRoundData({ mockedAggregator: mockedAggregatorMToken }, 5);

      await redeemRequestTest(
        { redemptionVault, owner, mTBILL, mTokenToUsdDataFeed },
        stableCoins.dai,
        100,
      );

      await redeemRequestTest(
        { redemptionVault, owner, mTBILL, mTokenToUsdDataFeed },
        stableCoins.usdc,
        100,
      );

      await safeBulkApproveRequestTest(
        { redemptionVault, owner, mTBILL, mTokenToUsdDataFeed },
        [{ id: 1 }, { id: 0 }],
        undefined,
      );
    });

    it('approve 2 requests both with different payment tokens when there is not enough liquidity for first one', async () => {
      const {
        owner,
        mockedAggregator,
        mockedAggregatorMToken,
        redemptionVault,
        stableCoins,
        mTBILL,
        mTokenToUsdDataFeed,
        dataFeed,
        requestRedeemer,
      } = await loadFixture(defaultDeploy);

      await mintToken(stableCoins.usdc, requestRedeemer, 100000);

      await approveBase18(
        requestRedeemer,
        stableCoins.usdc,
        redemptionVault,
        100000,
      );
      await mintToken(mTBILL, owner, 200);
      await approveBase18(owner, mTBILL, redemptionVault, 200);
      await addPaymentTokenTest(
        { vault: redemptionVault, owner },
        stableCoins.dai,
        dataFeed.address,
        0,
        true,
      );
      await addPaymentTokenTest(
        { vault: redemptionVault, owner },
        stableCoins.usdc,
        dataFeed.address,
        0,
        true,
      );
      await setRoundData({ mockedAggregator }, 1.03);
      await setRoundData({ mockedAggregator: mockedAggregatorMToken }, 5);

      await redeemRequestTest(
        { redemptionVault, owner, mTBILL, mTokenToUsdDataFeed },
        stableCoins.dai,
        100,
      );

      await redeemRequestTest(
        { redemptionVault, owner, mTBILL, mTokenToUsdDataFeed },
        stableCoins.usdc,
        100,
      );

      await safeBulkApproveRequestTest(
        { redemptionVault, owner, mTBILL, mTokenToUsdDataFeed },
        [{ id: 1 }, { id: 0, expectedToExecute: false }],
        undefined,
      );
    });
  });

  describe('rejectRequest()', async () => {
    it('should fail: call from address without vault admin role', async () => {
      const { redemptionVault, regularAccounts, mTokenToUsdDataFeed, mTBILL } =
        await loadFixture(defaultDeploy);
      await rejectRedeemRequestTest(
        {
          redemptionVault,
          owner: regularAccounts[1],
          mTBILL,
          mTokenToUsdDataFeed,
        },
        1,
        {
          revertMessage: 'WMAC: hasnt role',
        },
      );
    });

    it('should fail: request by id not exist', async () => {
      const {
        owner,
        redemptionVault,
        stableCoins,
        mTBILL,
        dataFeed,
        mTokenToUsdDataFeed,
      } = await loadFixture(defaultDeploy);
      await addPaymentTokenTest(
        { vault: redemptionVault, owner },
        stableCoins.dai,
        dataFeed.address,
        0,
        true,
      );
      await rejectRedeemRequestTest(
        { redemptionVault, owner, mTBILL, mTokenToUsdDataFeed },
        1,
        {
          revertMessage: 'RV: request not exist',
        },
      );
    });

    it('should fail: request already processed', async () => {
      const {
        owner,
        mockedAggregator,
        mockedAggregatorMToken,
        redemptionVault,
        stableCoins,
        mTBILL,
        dataFeed,
        mTokenToUsdDataFeed,
      } = await loadFixture(defaultDeploy);

      await mintToken(stableCoins.dai, redemptionVault, 100000);
      await mintToken(mTBILL, owner, 100);
      await approveBase18(owner, mTBILL, redemptionVault, 100);
      await addPaymentTokenTest(
        { vault: redemptionVault, owner },
        stableCoins.dai,
        dataFeed.address,
        0,
        true,
      );
      await setRoundData({ mockedAggregator }, 1.001);
      await setRoundData({ mockedAggregator: mockedAggregatorMToken }, 5);

      await redeemRequestTest(
        { redemptionVault, owner, mTBILL, mTokenToUsdDataFeed },
        stableCoins.dai,
        100,
      );
      const requestId = 0;

      await rejectRedeemRequestTest(
        { redemptionVault, owner, mTBILL, mTokenToUsdDataFeed },
        +requestId,
      );
      await rejectRedeemRequestTest(
        { redemptionVault, owner, mTBILL, mTokenToUsdDataFeed },
        +requestId,
        { revertMessage: 'RV: request not pending' },
      );
    });

    it('safe approve request from vaut admin account', async () => {
      const {
        owner,
        mockedAggregator,
        mockedAggregatorMToken,
        redemptionVault,
        stableCoins,
        mTBILL,
        mTokenToUsdDataFeed,
        dataFeed,
      } = await loadFixture(defaultDeploy);

      await mintToken(stableCoins.dai, redemptionVault, 100000);
      await mintToken(mTBILL, owner, 100);
      await approveBase18(owner, mTBILL, redemptionVault, 100);
      await addPaymentTokenTest(
        { vault: redemptionVault, owner },
        stableCoins.dai,
        dataFeed.address,
        0,
        true,
      );

      await setRoundData({ mockedAggregator }, 1.03);
      await setRoundData({ mockedAggregator: mockedAggregatorMToken }, 5);

      await redeemRequestTest(
        { redemptionVault, owner, mTBILL, mTokenToUsdDataFeed },
        stableCoins.dai,
        100,
      );
      const requestId = 0;

      await rejectRedeemRequestTest(
        { redemptionVault, owner, mTBILL, mTokenToUsdDataFeed },
        +requestId,
      );
    });
  });

  describe('redeemInstant() complex', () => {
    it('should fail: when is paused', async () => {
      const {
        redemptionVault,
        owner,
        mTBILL,
        stableCoins,
        regularAccounts,
        dataFeed,
        mTokenToUsdDataFeed,
      } = await loadFixture(defaultDeploy);

      await pauseVault(redemptionVault);
      await mintToken(stableCoins.dai, redemptionVault, 100);
      await mintToken(mTBILL, regularAccounts[0], 100);
      await approveBase18(
        regularAccounts[0],
        stableCoins.dai,
        redemptionVault,
        100,
      );
      await addPaymentTokenTest(
        { vault: redemptionVault, owner },
        stableCoins.dai,
        dataFeed.address,
        0,
        true,
      );

      await redeemInstantTest(
        { redemptionVault, owner, mTBILL, mTokenToUsdDataFeed },
        stableCoins.dai,
        100,
        {
          from: regularAccounts[0],
          revertMessage: 'Pausable: paused',
        },
      );
    });

    it('is on pause, but admin can use everything', async () => {
      const {
        redemptionVault,
        owner,
        mTBILL,
        stableCoins,
        dataFeed,
        mTokenToUsdDataFeed,
      } = await loadFixture(defaultDeploy);

      await pauseVault(redemptionVault);

      await mintToken(stableCoins.dai, redemptionVault, 100);
      await mintToken(mTBILL, owner, 100);
      await approveBase18(owner, stableCoins.dai, redemptionVault, 100);
      await addPaymentTokenTest(
        { vault: redemptionVault, owner },
        stableCoins.dai,
        dataFeed.address,
        0,
        true,
      );

      await redeemInstantTest(
        { redemptionVault, owner, mTBILL, mTokenToUsdDataFeed },
        stableCoins.dai,
        100,
        {
          revertMessage: 'Pausable: paused',
        },
      );
    });

    it('call for amount == minAmount', async () => {
      const {
        redemptionVault,
        mockedAggregator,
        mockedAggregatorMToken,
        owner,
        mTBILL,
        stableCoins,
        dataFeed,
        mTokenToUsdDataFeed,
      } = await loadFixture(defaultDeploy);
      await addPaymentTokenTest(
        { vault: redemptionVault, owner },
        stableCoins.dai,
        dataFeed.address,
        0,
        true,
      );
      await setRoundData({ mockedAggregator }, 1);

      await mintToken(mTBILL, owner, 100_000);
      await mintToken(stableCoins.dai, redemptionVault, 100_000);
      await approveBase18(owner, mTBILL, redemptionVault, 100_000);

      await setRoundData({ mockedAggregator: mockedAggregatorMToken }, 1);
      await setMinAmountTest({ vault: redemptionVault, owner }, 100_000);

      await redeemInstantTest(
        { redemptionVault, owner, mTBILL, mTokenToUsdDataFeed },
        stableCoins.dai,
        100_000,
      );
    });

    it('redeem 100 mtbill, when price is 5$, 125 mtbill when price is 5.1$, 114 mtbill when price is 5.4$', async () => {
      const {
        owner,
        mockedAggregator,
        redemptionVault,
        stableCoins,
        mTBILL,
        dataFeed,
        mTokenToUsdDataFeed,
        mockedAggregatorMToken,
      } = await loadFixture(defaultDeploy);

      await mintToken(mTBILL, owner, 100);
      await mintToken(mTBILL, owner, 125);
      await mintToken(mTBILL, owner, 114);

      await mintToken(stableCoins.dai, redemptionVault, 1000);
      await mintToken(stableCoins.usdc, redemptionVault, 1250);
      await mintToken(stableCoins.usdt, redemptionVault, 1140);

      await approveBase18(owner, mTBILL, redemptionVault, 100 + 125 + 114);

      await addPaymentTokenTest(
        { vault: redemptionVault, owner },
        stableCoins.dai,
        dataFeed.address,
        0,
        true,
      );
      await addPaymentTokenTest(
        { vault: redemptionVault, owner },
        stableCoins.usdc,
        dataFeed.address,
        0,
        true,
      );
      await addPaymentTokenTest(
        { vault: redemptionVault, owner },
        stableCoins.usdt,
        dataFeed.address,
        0,
        true,
      );

      await setRoundData({ mockedAggregator: mockedAggregatorMToken }, 1);
      await setRoundData({ mockedAggregator }, 1.04);
      await redeemInstantTest(
        { redemptionVault, owner, mTBILL, mTokenToUsdDataFeed },
        stableCoins.dai,
        100,
      );

      await setRoundData({ mockedAggregator }, 1);
      await redeemInstantTest(
        { redemptionVault, owner, mTBILL, mTokenToUsdDataFeed },
        stableCoins.usdc,
        125,
      );

      await setRoundData({ mockedAggregator }, 1.01);
      await redeemInstantTest(
        { redemptionVault, owner, mTBILL, mTokenToUsdDataFeed },
        stableCoins.usdt,
        114,
      );
    });
  });

  describe('redeemRequest() complex', () => {
    it('should fail: when is paused', async () => {
      const {
        redemptionVault,
        owner,
        mTBILL,
        stableCoins,
        regularAccounts,
        dataFeed,
        mTokenToUsdDataFeed,
      } = await loadFixture(defaultDeploy);

      await pauseVault(redemptionVault);
      await mintToken(stableCoins.dai, redemptionVault, 100);
      await mintToken(mTBILL, regularAccounts[0], 100);
      await approveBase18(
        regularAccounts[0],
        stableCoins.dai,
        redemptionVault,
        100,
      );
      await addPaymentTokenTest(
        { vault: redemptionVault, owner },
        stableCoins.dai,
        dataFeed.address,
        0,
        true,
      );

      await redeemRequestTest(
        { redemptionVault, owner, mTBILL, mTokenToUsdDataFeed },
        stableCoins.dai,
        100,
        {
          from: regularAccounts[0],
          revertMessage: 'Pausable: paused',
        },
      );
    });

    it('is on pause, but admin can use everything', async () => {
      const {
        redemptionVault,
        owner,
        mTBILL,
        stableCoins,
        dataFeed,
        mTokenToUsdDataFeed,
      } = await loadFixture(defaultDeploy);

      await pauseVault(redemptionVault);

      await mintToken(stableCoins.dai, redemptionVault, 1000);
      await mintToken(mTBILL, owner, 100);
      await approveBase18(owner, stableCoins.dai, redemptionVault, 100);
      await addPaymentTokenTest(
        { vault: redemptionVault, owner },
        stableCoins.dai,
        dataFeed.address,
        0,
        true,
      );

      await redeemRequestTest(
        { redemptionVault, owner, mTBILL, mTokenToUsdDataFeed },
        stableCoins.dai,
        100,
        {
          revertMessage: 'Pausable: paused',
        },
      );
    });

    it('call for amount == minAmount, then approve', async () => {
      const {
        redemptionVault,
        mockedAggregator,
        mockedAggregatorMToken,
        owner,
        mTBILL,
        stableCoins,
        dataFeed,
        mTokenToUsdDataFeed,
        requestRedeemer,
      } = await loadFixture(defaultDeploy);
      await addPaymentTokenTest(
        { vault: redemptionVault, owner },
        stableCoins.dai,
        dataFeed.address,
        0,
        true,
      );
      await setRoundData({ mockedAggregator }, 1);

      await mintToken(mTBILL, owner, 100_000);
      await mintToken(stableCoins.dai, requestRedeemer, 100000);
      await approveBase18(
        requestRedeemer,
        stableCoins.dai,
        redemptionVault,
        100000,
      );
      await approveBase18(owner, mTBILL, redemptionVault, 100_000);

      await setRoundData({ mockedAggregator: mockedAggregatorMToken }, 1);
      await setMinAmountTest({ vault: redemptionVault, owner }, 100_000);

      await redeemRequestTest(
        { redemptionVault, owner, mTBILL, mTokenToUsdDataFeed },
        stableCoins.dai,
        100_000,
      );

      const requestId = 0;

      await approveRedeemRequestTest(
        { redemptionVault, owner, mTBILL, mTokenToUsdDataFeed },
        +requestId,
        parseUnits('1'),
      );
    });

    it('call for amount == minAmount, then safe approve', async () => {
      const {
        redemptionVault,
        mockedAggregator,
        mockedAggregatorMToken,
        owner,
        mTBILL,
        stableCoins,
        dataFeed,
        mTokenToUsdDataFeed,
        requestRedeemer,
      } = await loadFixture(defaultDeploy);
      await addPaymentTokenTest(
        { vault: redemptionVault, owner },
        stableCoins.dai,
        dataFeed.address,
        0,
        true,
      );
      await setRoundData({ mockedAggregator }, 1);

      await mintToken(mTBILL, owner, 100_000);
      await mintToken(stableCoins.dai, requestRedeemer, 1000000);
      await approveBase18(
        requestRedeemer,
        stableCoins.dai,
        redemptionVault,
        1000000,
      );
      await approveBase18(owner, mTBILL, redemptionVault, 100_000);

      await setRoundData({ mockedAggregator: mockedAggregatorMToken }, 1);
      await setMinAmountTest({ vault: redemptionVault, owner }, 100_000);

      await redeemRequestTest(
        { redemptionVault, owner, mTBILL, mTokenToUsdDataFeed },
        stableCoins.dai,
        100_000,
      );

      const requestId = 0;

      await safeApproveRedeemRequestTest(
        { redemptionVault, owner, mTBILL, mTokenToUsdDataFeed },
        +requestId,
        parseUnits('1.000001'),
      );
    });

    it('call for amount == minAmount, then reject', async () => {
      const {
        redemptionVault,
        mockedAggregator,
        mockedAggregatorMToken,
        owner,
        mTBILL,
        stableCoins,
        dataFeed,
        mTokenToUsdDataFeed,
      } = await loadFixture(defaultDeploy);
      await addPaymentTokenTest(
        { vault: redemptionVault, owner },
        stableCoins.dai,
        dataFeed.address,
        0,
        true,
      );
      await setRoundData({ mockedAggregator }, 1);

      await mintToken(mTBILL, owner, 100_000);
      await mintToken(stableCoins.dai, redemptionVault, 100_000);
      await approveBase18(owner, mTBILL, redemptionVault, 100_000);

      await setRoundData({ mockedAggregator: mockedAggregatorMToken }, 1);
      await setMinAmountTest({ vault: redemptionVault, owner }, 100_000);

      await redeemRequestTest(
        { redemptionVault, owner, mTBILL, mTokenToUsdDataFeed },
        stableCoins.dai,
        100_000,
      );

      const requestId = 0;

      await rejectRedeemRequestTest(
        { redemptionVault, owner, mTBILL, mTokenToUsdDataFeed },
        +requestId,
      );
    });
  });

  describe('_convertUsdToToken', () => {
    it('should fail: when amountUsd == 0', async () => {
      const { redemptionVault } = await loadFixture(defaultDeploy);

      await expect(
        redemptionVault.convertUsdToTokenTest(0, constants.AddressZero),
      ).revertedWith('RV: amount zero');
    });

    it('should fail: when tokenRate == 0', async () => {
      const { redemptionVault } = await loadFixture(defaultDeploy);

      await redemptionVault.setOverrideGetTokenRate(true);
      await redemptionVault.setGetTokenRateValue(0);

      await expect(
        redemptionVault.convertUsdToTokenTest(1, constants.AddressZero),
      ).revertedWith('RV: rate zero');
    });
  });

  describe('_convertMTokenToUsd', () => {
    it('should fail: when amountMToken == 0', async () => {
      const { redemptionVault } = await loadFixture(defaultDeploy);

      await expect(redemptionVault.convertMTokenToUsdTest(0)).revertedWith(
        'RV: amount zero',
      );
    });

    it('should fail: when amountMToken == 0', async () => {
      const { redemptionVault } = await loadFixture(defaultDeploy);

      await redemptionVault.setOverrideGetTokenRate(true);
      await redemptionVault.setGetTokenRateValue(0);

      await expect(redemptionVault.convertMTokenToUsdTest(1)).revertedWith(
        'RV: rate zero',
      );
    });
  });

  describe('_calcAndValidateRedeem', () => {
    it('should fail: when tokenOut is not MANUAL_FULLFILMENT_TOKEN but isFiat = true', async () => {
      const { redemptionVault, stableCoins, owner, dataFeed } =
        await loadFixture(defaultDeploy);

      await expect(
        redemptionVault.calcAndValidateRedeemTest(
          constants.AddressZero,
          stableCoins.dai.address,
          parseUnits('100'),
          false,
          true,
        ),
      ).revertedWith('RV: tokenOut != fiat');
    });
  });
});
