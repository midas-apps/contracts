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
  RedemptionVaultWithUSTBTest__factory,
} from '../../typechain-types';
import { acErrors, blackList, greenList } from '../common/ac.helpers';
import {
  approveBase18,
  mintToken,
  pauseVault,
  pauseVaultFn,
} from '../common/common.helpers';
import { setRoundData } from '../common/data-feed.helpers';
import { defaultDeploy } from '../common/fixtures';
import {
  addPaymentTokenTest,
  setInstantFeeTest,
  setMinAmountTest,
  setInstantDailyLimitTest,
  addWaivedFeeAccountTest,
  removeWaivedFeeAccountTest,
  setVariabilityToleranceTest,
  removePaymentTokenTest,
  withdrawTest,
  changeTokenFeeTest,
  changeTokenAllowanceTest,
} from '../common/manageable-vault.helpers';
import {
  approveRedeemRequestTest,
  redeemFiatRequestTest,
  redeemInstantTest,
  redeemRequestTest,
  rejectRedeemRequestTest,
  safeApproveRedeemRequestTest,
  setFiatAdditionalFeeTest,
  setMinFiatRedeemAmountTest,
} from '../common/redemption-vault.helpers';
import { sanctionUser } from '../common/with-sanctions-list.helpers';

describe('RedemptionVaultWithUSTB', function () {
  it('deployment', async () => {
    const {
      redemptionVaultWithUSTB,
      ustbRedemption,
      mTBILL,
      tokensReceiver,
      feeReceiver,
      mTokenToUsdDataFeed,
      roles,
    } = await loadFixture(defaultDeploy);

    expect(await redemptionVaultWithUSTB.mToken()).eq(mTBILL.address);

    expect(await redemptionVaultWithUSTB.ONE_HUNDRED_PERCENT()).eq('10000');

    expect(await redemptionVaultWithUSTB.paused()).eq(false);

    expect(await redemptionVaultWithUSTB.tokensReceiver()).eq(
      tokensReceiver.address,
    );
    expect(await redemptionVaultWithUSTB.feeReceiver()).eq(feeReceiver.address);

    expect(await redemptionVaultWithUSTB.minAmount()).eq(1000);
    expect(await redemptionVaultWithUSTB.minFiatRedeemAmount()).eq(1000);

    expect(await redemptionVaultWithUSTB.instantFee()).eq('100');

    expect(await redemptionVaultWithUSTB.instantDailyLimit()).eq(
      parseUnits('100000'),
    );

    expect(await redemptionVaultWithUSTB.mTokenDataFeed()).eq(
      mTokenToUsdDataFeed.address,
    );
    expect(await redemptionVaultWithUSTB.variationTolerance()).eq(1);

    expect(await redemptionVaultWithUSTB.vaultRole()).eq(
      roles.tokenRoles.mTBILL.redemptionVaultAdmin,
    );

    expect(await redemptionVaultWithUSTB.MANUAL_FULLFILMENT_TOKEN()).eq(
      ethers.constants.AddressZero,
    );

    expect(await redemptionVaultWithUSTB.ustbRedemption()).eq(
      ustbRedemption.address,
    );
  });

  it('failing deployment', async () => {
    const {
      mTBILL,
      tokensReceiver,
      feeReceiver,
      mTokenToUsdDataFeed,
      accessControl,
      mockedSanctionsList,
      owner,
    } = await loadFixture(defaultDeploy);

    const redemptionVaultWithUSTB =
      await new RedemptionVaultWithUSTBTest__factory(owner).deploy();

    await expect(
      redemptionVaultWithUSTB[
        'initialize(address,(address,address),(address,address),(uint256,uint256),address,uint256,uint256,(uint256,uint256,uint256),address)'
      ](
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
          fiatAdditionalFee: 10000,
          fiatFlatFee: parseUnits('1'),
          minFiatRedeemAmount: parseUnits('100'),
        },
        constants.AddressZero,
      ),
    ).to.be.reverted;
  });

  describe('initialization', () => {
    it('should fail: call initialize() when already initialized', async () => {
      const { redemptionVaultWithUSTB } = await loadFixture(defaultDeploy);

      await expect(
        redemptionVaultWithUSTB[
          'initialize(address,(address,address),(address,address),(uint256,uint256),address,uint256,uint256,(uint256,uint256,uint256),address,address)'
        ](
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

    it('should fail: when ustbRedemption address zero', async () => {
      const {
        owner,
        accessControl,
        mTBILL,
        tokensReceiver,
        feeReceiver,
        mTokenToUsdDataFeed,
        mockedSanctionsList,
        requestRedeemer,
      } = await loadFixture(defaultDeploy);

      const redemptionVaultWithUSTB =
        await new RedemptionVaultWithUSTBTest__factory(owner).deploy();

      await expect(
        redemptionVaultWithUSTB[
          'initialize(address,(address,address),(address,address),(uint256,uint256),address,uint256,uint256,(uint256,uint256,uint256),address,address)'
        ](
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
          {
            fiatAdditionalFee: 100,
            fiatFlatFee: parseUnits('1'),
            minFiatRedeemAmount: 1000,
          },
          requestRedeemer.address,
          constants.AddressZero,
        ),
      ).revertedWith('zero address');
    });
  });

  describe('setMinAmount()', () => {
    it('should fail: call from address without DEPOSIT_VAULT_ADMIN_ROLE role', async () => {
      const { owner, redemptionVaultWithUSTB, regularAccounts } =
        await loadFixture(defaultDeploy);

      await setMinAmountTest({ vault: redemptionVaultWithUSTB, owner }, 1.1, {
        from: regularAccounts[0],
        revertMessage: acErrors.WMAC_HASNT_ROLE,
      });
    });

    it('call from address with DEPOSIT_VAULT_ADMIN_ROLE role', async () => {
      const { owner, redemptionVaultWithUSTB } = await loadFixture(
        defaultDeploy,
      );
      await setMinAmountTest({ vault: redemptionVaultWithUSTB, owner }, 1.1);
    });
  });

  describe('setMinFiatRedeemAmount()', () => {
    it('should fail: call from address without REDEMPTION_VAULT_ADMIN_ROLE role', async () => {
      const { owner, redemptionVaultWithUSTB, regularAccounts } =
        await loadFixture(defaultDeploy);

      await setMinFiatRedeemAmountTest(
        { redemptionVault: redemptionVaultWithUSTB, owner },
        1.1,
        {
          from: regularAccounts[0],
          revertMessage: acErrors.WMAC_HASNT_ROLE,
        },
      );
    });

    it('call from address with REDEMPTION_VAULT_ADMIN_ROLE role', async () => {
      const { owner, redemptionVaultWithUSTB } = await loadFixture(
        defaultDeploy,
      );
      await setMinFiatRedeemAmountTest(
        { redemptionVault: redemptionVaultWithUSTB, owner },
        1.1,
      );
    });
  });

  describe('setFiatAdditionalFee()', () => {
    it('should fail: call from address without REDEMPTION_VAULT_ADMIN_ROLE role', async () => {
      const { owner, redemptionVaultWithUSTB, regularAccounts } =
        await loadFixture(defaultDeploy);

      await setFiatAdditionalFeeTest(
        { redemptionVault: redemptionVaultWithUSTB, owner },
        100,
        {
          from: regularAccounts[0],
          revertMessage: acErrors.WMAC_HASNT_ROLE,
        },
      );
    });

    it('call from address with REDEMPTION_VAULT_ADMIN_ROLE role', async () => {
      const { owner, redemptionVaultWithUSTB } = await loadFixture(
        defaultDeploy,
      );
      await setFiatAdditionalFeeTest(
        { redemptionVault: redemptionVaultWithUSTB, owner },
        100,
      );
    });
  });

  describe('setInstantDailyLimit()', () => {
    it('should fail: call from address without REDEMPTION_VAULT_ADMIN_ROLE role', async () => {
      const { owner, redemptionVaultWithUSTB, regularAccounts } =
        await loadFixture(defaultDeploy);

      await setInstantDailyLimitTest(
        { vault: redemptionVaultWithUSTB, owner },
        parseUnits('1000'),
        {
          from: regularAccounts[0],
          revertMessage: acErrors.WMAC_HASNT_ROLE,
        },
      );
    });

    it('should fail: try to set 0 limit', async () => {
      const { owner, redemptionVaultWithUSTB } = await loadFixture(
        defaultDeploy,
      );

      await setInstantDailyLimitTest(
        { vault: redemptionVaultWithUSTB, owner },
        constants.Zero,
        {
          revertMessage: 'MV: limit zero',
        },
      );
    });

    it('call from address with REDEMPTION_VAULT_ADMIN_ROLE role', async () => {
      const { owner, redemptionVaultWithUSTB } = await loadFixture(
        defaultDeploy,
      );
      await setInstantDailyLimitTest(
        { vault: redemptionVaultWithUSTB, owner },
        parseUnits('1000'),
      );
    });
  });

  describe('addPaymentToken()', () => {
    it('should fail: call from address without REDEMPTION_VAULT_ADMIN_ROLE role', async () => {
      const { redemptionVaultWithUSTB, regularAccounts, owner } =
        await loadFixture(defaultDeploy);
      await addPaymentTokenTest(
        { vault: redemptionVaultWithUSTB, owner },
        ethers.constants.AddressZero,
        ethers.constants.AddressZero,
        0,
        true,
        constants.MaxUint256,
        { revertMessage: acErrors.WMAC_HASNT_ROLE, from: regularAccounts[0] },
      );
    });

    it('should fail: when token is already added', async () => {
      const { redemptionVaultWithUSTB, stableCoins, owner, dataFeed } =
        await loadFixture(defaultDeploy);
      await addPaymentTokenTest(
        { vault: redemptionVaultWithUSTB, owner },
        stableCoins.dai,
        dataFeed.address,
        0,
        true,
      );
      await addPaymentTokenTest(
        { vault: redemptionVaultWithUSTB, owner },
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
      const { redemptionVaultWithUSTB, stableCoins, owner } = await loadFixture(
        defaultDeploy,
      );
      await addPaymentTokenTest(
        { vault: redemptionVaultWithUSTB, owner },
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
      const { redemptionVaultWithUSTB, stableCoins, owner, dataFeed } =
        await loadFixture(defaultDeploy);
      await addPaymentTokenTest(
        { vault: redemptionVaultWithUSTB, owner },
        stableCoins.dai,
        dataFeed.address,
        0,
        false,
        constants.Zero,
      );
    });

    it('call when allowance is not uint256 max', async () => {
      const { redemptionVaultWithUSTB, stableCoins, owner, dataFeed } =
        await loadFixture(defaultDeploy);
      await addPaymentTokenTest(
        { vault: redemptionVaultWithUSTB, owner },
        stableCoins.dai,
        dataFeed.address,
        0,
        false,
        parseUnits('100'),
      );
    });

    it('call from address with REDEMPTION_VAULT_ADMIN_ROLE role', async () => {
      const { redemptionVaultWithUSTB, stableCoins, owner, dataFeed } =
        await loadFixture(defaultDeploy);
      await addPaymentTokenTest(
        { vault: redemptionVaultWithUSTB, owner },
        stableCoins.dai,
        dataFeed.address,
        0,
        true,
      );
    });

    it('call from address with REDEMPTION_VAULT_ADMIN_ROLE role and add 3 options on a row', async () => {
      const { redemptionVaultWithUSTB, stableCoins, owner, dataFeed } =
        await loadFixture(defaultDeploy);

      await addPaymentTokenTest(
        { vault: redemptionVaultWithUSTB, owner },
        stableCoins.dai,
        dataFeed.address,
        0,
        true,
      );
      await addPaymentTokenTest(
        { vault: redemptionVaultWithUSTB, owner },
        stableCoins.usdc,
        dataFeed.address,
        0,
        true,
      );
      await addPaymentTokenTest(
        { vault: redemptionVaultWithUSTB, owner },
        stableCoins.usdt,
        dataFeed.address,
        0,
        true,
      );
    });
  });

  describe('addWaivedFeeAccount()', () => {
    it('should fail: call from address without REDEMPTION_VAULT_ADMIN_ROLE role', async () => {
      const { redemptionVaultWithUSTB, regularAccounts, owner } =
        await loadFixture(defaultDeploy);
      await addWaivedFeeAccountTest(
        { vault: redemptionVaultWithUSTB, owner },
        ethers.constants.AddressZero,
        { revertMessage: acErrors.WMAC_HASNT_ROLE, from: regularAccounts[0] },
      );
    });
    it('should fail: if account fee already waived', async () => {
      const { redemptionVaultWithUSTB, owner } = await loadFixture(
        defaultDeploy,
      );
      await addWaivedFeeAccountTest(
        { vault: redemptionVaultWithUSTB, owner },
        owner.address,
      );
      await addWaivedFeeAccountTest(
        { vault: redemptionVaultWithUSTB, owner },
        owner.address,
        { revertMessage: 'MV: already added' },
      );
    });

    it('call from address with REDEMPTION_VAULT_ADMIN_ROLE role', async () => {
      const { redemptionVaultWithUSTB, owner } = await loadFixture(
        defaultDeploy,
      );
      await addWaivedFeeAccountTest(
        { vault: redemptionVaultWithUSTB, owner },
        owner.address,
      );
    });
  });

  describe('removeWaivedFeeAccount()', () => {
    it('should fail: call from address without REDEMPTION_VAULT_ADMIN_ROLE role', async () => {
      const { redemptionVaultWithUSTB, regularAccounts, owner } =
        await loadFixture(defaultDeploy);
      await removeWaivedFeeAccountTest(
        { vault: redemptionVaultWithUSTB, owner },
        ethers.constants.AddressZero,
        { revertMessage: acErrors.WMAC_HASNT_ROLE, from: regularAccounts[0] },
      );
    });
    it('should fail: if account not found in restriction', async () => {
      const { redemptionVaultWithUSTB, owner } = await loadFixture(
        defaultDeploy,
      );
      await removeWaivedFeeAccountTest(
        { vault: redemptionVaultWithUSTB, owner },
        owner.address,
        { revertMessage: 'MV: not found' },
      );
    });

    it('call from address with REDEMPTION_VAULT_ADMIN_ROLE role', async () => {
      const { redemptionVaultWithUSTB, owner } = await loadFixture(
        defaultDeploy,
      );
      await addWaivedFeeAccountTest(
        { vault: redemptionVaultWithUSTB, owner },
        owner.address,
      );
      await removeWaivedFeeAccountTest(
        { vault: redemptionVaultWithUSTB, owner },
        owner.address,
      );
    });
  });

  describe('setFee()', () => {
    it('should fail: call from address without REDEMPTION_VAULT_ADMIN_ROLE role', async () => {
      const { redemptionVaultWithUSTB, regularAccounts, owner } =
        await loadFixture(defaultDeploy);
      await setInstantFeeTest(
        { vault: redemptionVaultWithUSTB, owner },
        ethers.constants.Zero,
        { revertMessage: acErrors.WMAC_HASNT_ROLE, from: regularAccounts[0] },
      );
    });

    it('should fail: if new value greater then 100%', async () => {
      const { redemptionVaultWithUSTB, owner } = await loadFixture(
        defaultDeploy,
      );
      await setInstantFeeTest(
        { vault: redemptionVaultWithUSTB, owner },
        10001,
        {
          revertMessage: 'fee > 100%',
        },
      );
    });

    it('call from address with REDEMPTION_VAULT_ADMIN_ROLE role', async () => {
      const { redemptionVaultWithUSTB, owner } = await loadFixture(
        defaultDeploy,
      );
      await setInstantFeeTest({ vault: redemptionVaultWithUSTB, owner }, 100);
    });
  });

  describe('setVariabilityTolerance()', () => {
    it('should fail: call from address without REDEMPTION_VAULT_ADMIN_ROLE role', async () => {
      const { redemptionVaultWithUSTB, regularAccounts, owner } =
        await loadFixture(defaultDeploy);
      await setVariabilityToleranceTest(
        { vault: redemptionVaultWithUSTB, owner },
        ethers.constants.Zero,
        { revertMessage: acErrors.WMAC_HASNT_ROLE, from: regularAccounts[0] },
      );
    });
    it('should fail: if new value zero', async () => {
      const { redemptionVaultWithUSTB, owner } = await loadFixture(
        defaultDeploy,
      );
      await setVariabilityToleranceTest(
        { vault: redemptionVaultWithUSTB, owner },
        ethers.constants.Zero,
        { revertMessage: 'fee == 0' },
      );
    });

    it('should fail: if new value greater then 100%', async () => {
      const { redemptionVaultWithUSTB, owner } = await loadFixture(
        defaultDeploy,
      );
      await setVariabilityToleranceTest(
        { vault: redemptionVaultWithUSTB, owner },
        10001,
        { revertMessage: 'fee > 100%' },
      );
    });

    it('call from address with REDEMPTION_VAULT_ADMIN_ROLE role', async () => {
      const { redemptionVaultWithUSTB, owner } = await loadFixture(
        defaultDeploy,
      );
      await setVariabilityToleranceTest(
        { vault: redemptionVaultWithUSTB, owner },
        100,
      );
    });
  });

  describe('removePaymentToken()', () => {
    it('should fail: call from address without REDEMPTION_VAULT_ADMIN_ROLE role', async () => {
      const { redemptionVaultWithUSTB, regularAccounts, owner } =
        await loadFixture(defaultDeploy);
      await removePaymentTokenTest(
        { vault: redemptionVaultWithUSTB, owner },
        ethers.constants.AddressZero,
        { revertMessage: acErrors.WMAC_HASNT_ROLE, from: regularAccounts[0] },
      );
    });

    it('should fail: when token is not exists', async () => {
      const { owner, redemptionVaultWithUSTB, stableCoins } = await loadFixture(
        defaultDeploy,
      );
      await removePaymentTokenTest(
        { vault: redemptionVaultWithUSTB, owner },
        stableCoins.dai.address,
        { revertMessage: 'MV: not exists' },
      );
    });

    it('call from address with REDEMPTION_VAULT_ADMIN_ROLE role', async () => {
      const { redemptionVaultWithUSTB, stableCoins, owner, dataFeed } =
        await loadFixture(defaultDeploy);
      await addPaymentTokenTest(
        { vault: redemptionVaultWithUSTB, owner },
        stableCoins.dai,
        dataFeed.address,
        0,
        true,
      );
      await removePaymentTokenTest(
        { vault: redemptionVaultWithUSTB, owner },
        stableCoins.dai.address,
      );
    });

    it('call from address with REDEMPTION_VAULT_ADMIN_ROLE role and add 3 options on a row', async () => {
      const { redemptionVaultWithUSTB, owner, stableCoins, dataFeed } =
        await loadFixture(defaultDeploy);

      await addPaymentTokenTest(
        { vault: redemptionVaultWithUSTB, owner },
        stableCoins.dai,
        dataFeed.address,
        0,
        true,
      );
      await addPaymentTokenTest(
        { vault: redemptionVaultWithUSTB, owner },
        stableCoins.usdc,
        dataFeed.address,
        0,
        true,
      );
      await addPaymentTokenTest(
        { vault: redemptionVaultWithUSTB, owner },
        stableCoins.usdt,
        dataFeed.address,
        0,
        true,
      );

      await removePaymentTokenTest(
        { vault: redemptionVaultWithUSTB, owner },
        stableCoins.dai.address,
      );
      await removePaymentTokenTest(
        { vault: redemptionVaultWithUSTB, owner },
        stableCoins.usdc.address,
      );
      await removePaymentTokenTest(
        { vault: redemptionVaultWithUSTB, owner },
        stableCoins.usdt.address,
      );

      await removePaymentTokenTest(
        { vault: redemptionVaultWithUSTB, owner },
        stableCoins.usdt.address,
        { revertMessage: 'MV: not exists' },
      );
    });
  });

  describe('withdrawToken()', () => {
    it('should fail: call from address without REDEMPTION_VAULT_ADMIN_ROLE role', async () => {
      const { redemptionVaultWithUSTB, regularAccounts, owner } =
        await loadFixture(defaultDeploy);
      await withdrawTest(
        { vault: redemptionVaultWithUSTB, owner },
        ethers.constants.AddressZero,
        0,
        ethers.constants.AddressZero,
        { revertMessage: acErrors.WMAC_HASNT_ROLE, from: regularAccounts[0] },
      );
    });

    it('should fail: when there is no token in vault', async () => {
      const { owner, redemptionVaultWithUSTB, regularAccounts, stableCoins } =
        await loadFixture(defaultDeploy);
      await withdrawTest(
        { vault: redemptionVaultWithUSTB, owner },
        stableCoins.dai,
        1,
        regularAccounts[0],
        { revertMessage: 'ERC20: transfer amount exceeds balance' },
      );
    });

    it('call from address with REDEMPTION_VAULT_ADMIN_ROLE role', async () => {
      const { redemptionVaultWithUSTB, regularAccounts, stableCoins, owner } =
        await loadFixture(defaultDeploy);
      await mintToken(stableCoins.dai, redemptionVaultWithUSTB, 1);
      await withdrawTest(
        { vault: redemptionVaultWithUSTB, owner },
        stableCoins.dai,
        1,
        regularAccounts[0],
      );
    });
  });

  describe('checkAndRedeemUSTB', () => {
    it('should not redeem USTB when contract has enough balance', async () => {
      const { redemptionVaultWithUSTB, stableCoins } = await loadFixture(
        defaultDeploy,
      );

      const usdcAmount = parseUnits('1000', 8);
      await stableCoins.usdc.mint(redemptionVaultWithUSTB.address, usdcAmount);

      const balanceBefore = await stableCoins.usdc.balanceOf(
        redemptionVaultWithUSTB.address,
      );

      await redemptionVaultWithUSTB.checkAndRedeemUSTB(
        stableCoins.usdc.address,
        parseUnits('500', 8),
      );

      const balanceAfter = await stableCoins.usdc.balanceOf(
        redemptionVaultWithUSTB.address,
      );
      expect(balanceAfter).to.equal(balanceBefore);
    });

    it('should revert when contract has insufficient USTB balance', async () => {
      const { redemptionVaultWithUSTB, stableCoins } = await loadFixture(
        defaultDeploy,
      );

      // Contract has less USDC than needed
      const usdcAmount = parseUnits('500', 8);
      await stableCoins.usdc.mint(redemptionVaultWithUSTB.address, usdcAmount);

      // Try to redeem more than available
      await expect(
        redemptionVaultWithUSTB.checkAndRedeemUSTB(
          stableCoins.usdc.address,
          parseUnits('1000', 8),
        ),
      ).to.be.revertedWith('RVU: insufficient USTB balance');
    });
  });

  describe('freeFromMinAmount()', async () => {
    it('should fail: call from address without vault admin role', async () => {
      const { redemptionVaultWithUSTB, regularAccounts } = await loadFixture(
        defaultDeploy,
      );
      await expect(
        redemptionVaultWithUSTB
          .connect(regularAccounts[0])
          .freeFromMinAmount(regularAccounts[1].address, true),
      ).to.be.revertedWith('WMAC: hasnt role');
    });
    it('should not fail', async () => {
      const { redemptionVaultWithUSTB, regularAccounts } = await loadFixture(
        defaultDeploy,
      );
      await expect(
        redemptionVaultWithUSTB.freeFromMinAmount(
          regularAccounts[0].address,
          true,
        ),
      ).to.not.reverted;

      expect(
        await redemptionVaultWithUSTB.isFreeFromMinAmount(
          regularAccounts[0].address,
        ),
      ).to.eq(true);
    });
    it('should fail: already in list', async () => {
      const { redemptionVaultWithUSTB, regularAccounts } = await loadFixture(
        defaultDeploy,
      );
      await expect(
        redemptionVaultWithUSTB.freeFromMinAmount(
          regularAccounts[0].address,
          true,
        ),
      ).to.not.reverted;

      expect(
        await redemptionVaultWithUSTB.isFreeFromMinAmount(
          regularAccounts[0].address,
        ),
      ).to.eq(true);

      await expect(
        redemptionVaultWithUSTB.freeFromMinAmount(
          regularAccounts[0].address,
          true,
        ),
      ).to.revertedWith('DV: already free');
    });
  });

  describe('changeTokenAllowance()', () => {
    it('should fail: call from address without REDEMPTION_VAULT_ADMIN_ROLE role', async () => {
      const { redemptionVaultWithUSTB, regularAccounts, owner } =
        await loadFixture(defaultDeploy);
      await changeTokenAllowanceTest(
        { vault: redemptionVaultWithUSTB, owner },
        ethers.constants.AddressZero,
        0,
        { revertMessage: acErrors.WMAC_HASNT_ROLE, from: regularAccounts[0] },
      );
    });
    it('should fail: token not exist', async () => {
      const { redemptionVaultWithUSTB, owner, stableCoins } = await loadFixture(
        defaultDeploy,
      );
      await changeTokenAllowanceTest(
        { vault: redemptionVaultWithUSTB, owner },
        stableCoins.dai.address,
        0,
        { revertMessage: 'MV: token not exists' },
      );
    });
    it('should fail: allowance zero', async () => {
      const { redemptionVaultWithUSTB, owner, stableCoins, dataFeed } =
        await loadFixture(defaultDeploy);
      await addPaymentTokenTest(
        { vault: redemptionVaultWithUSTB, owner },
        stableCoins.dai,
        dataFeed.address,
        0,
        true,
      );
      await changeTokenAllowanceTest(
        { vault: redemptionVaultWithUSTB, owner },
        stableCoins.dai.address,
        0,
        { revertMessage: 'MV: zero allowance' },
      );
    });
    it('should fail: if mint exceed allowance', async () => {
      const {
        redemptionVaultWithUSTB,
        stableCoins,
        owner,
        dataFeed,
        mTBILL,
        mTokenToUsdDataFeed,
      } = await loadFixture(defaultDeploy);
      await mintToken(mTBILL, owner, 100000);
      await mintToken(stableCoins.usdc, redemptionVaultWithUSTB, 100000);
      await approveBase18(owner, mTBILL, redemptionVaultWithUSTB, 100000);
      await addPaymentTokenTest(
        { vault: redemptionVaultWithUSTB, owner },
        stableCoins.usdc,
        dataFeed.address,
        0,
        true,
      );
      await changeTokenAllowanceTest(
        { vault: redemptionVaultWithUSTB, owner },
        stableCoins.usdc.address,
        100,
      );

      await redeemInstantTest(
        {
          redemptionVault: redemptionVaultWithUSTB,
          owner,
          mTBILL,
          mTokenToUsdDataFeed,
        },
        stableCoins.usdc,
        99_999,
        {
          revertMessage: 'MV: exceed allowance',
        },
      );
    });
    it('call from address with REDEMPTION_VAULT_ADMIN_ROLE role', async () => {
      const { redemptionVaultWithUSTB, owner, stableCoins, dataFeed } =
        await loadFixture(defaultDeploy);
      await addPaymentTokenTest(
        { vault: redemptionVaultWithUSTB, owner },
        stableCoins.dai,
        dataFeed.address,
        0,
        true,
      );
      await changeTokenAllowanceTest(
        { vault: redemptionVaultWithUSTB, owner },
        stableCoins.dai.address,
        100000000,
      );
    });
    it('should decrease if allowance < UINT_MAX', async () => {
      const {
        redemptionVaultWithUSTB,
        stableCoins,
        owner,
        dataFeed,
        mTBILL,
        mTokenToUsdDataFeed,
        mockedAggregator,
        mockedAggregatorMToken,
      } = await loadFixture(defaultDeploy);
      await mintToken(stableCoins.usdc, redemptionVaultWithUSTB, 100000);
      await mintToken(mTBILL, owner, 100000);
      await approveBase18(owner, mTBILL, redemptionVaultWithUSTB, 100000);

      await addPaymentTokenTest(
        { vault: redemptionVaultWithUSTB, owner },
        stableCoins.usdc,
        dataFeed.address,
        0,
        true,
      );
      await changeTokenAllowanceTest(
        { vault: redemptionVaultWithUSTB, owner },
        stableCoins.usdc.address,
        parseUnits('1000'),
      );
      await setRoundData({ mockedAggregator }, 1);
      await setRoundData({ mockedAggregator: mockedAggregatorMToken }, 1);

      const tokenConfigBefore = await redemptionVaultWithUSTB.tokensConfig(
        stableCoins.usdc.address,
      );

      await redeemInstantTest(
        {
          redemptionVault: redemptionVaultWithUSTB,
          owner,
          mTBILL,
          mTokenToUsdDataFeed,
        },
        stableCoins.usdc,
        999,
      );

      const tokenConfigAfter = await redemptionVaultWithUSTB.tokensConfig(
        stableCoins.usdc.address,
      );

      expect(tokenConfigBefore.allowance.sub(tokenConfigAfter.allowance)).eq(
        parseUnits('999'),
      );
    });
    it('should not decrease if allowance = UINT_MAX', async () => {
      const {
        redemptionVaultWithUSTB,
        stableCoins,
        owner,
        dataFeed,
        mTBILL,
        mTokenToUsdDataFeed,
        mockedAggregator,
        mockedAggregatorMToken,
      } = await loadFixture(defaultDeploy);
      await mintToken(stableCoins.usdc, redemptionVaultWithUSTB, 100000);
      await mintToken(mTBILL, owner, 100000);
      await approveBase18(owner, mTBILL, redemptionVaultWithUSTB, 100000);

      await addPaymentTokenTest(
        { vault: redemptionVaultWithUSTB, owner },
        stableCoins.usdc,
        dataFeed.address,
        0,
        true,
      );
      await changeTokenAllowanceTest(
        { vault: redemptionVaultWithUSTB, owner },
        stableCoins.usdc.address,
        constants.MaxUint256,
      );

      await setRoundData({ mockedAggregator }, 1);
      await setRoundData({ mockedAggregator: mockedAggregatorMToken }, 1);

      const tokenConfigBefore = await redemptionVaultWithUSTB.tokensConfig(
        stableCoins.usdc.address,
      );

      await redeemInstantTest(
        {
          redemptionVault: redemptionVaultWithUSTB,
          owner,
          mTBILL,
          mTokenToUsdDataFeed,
        },
        stableCoins.usdc,
        999,
      );

      const tokenConfigAfter = await redemptionVaultWithUSTB.tokensConfig(
        stableCoins.usdc.address,
      );

      expect(tokenConfigBefore.allowance).eq(tokenConfigAfter.allowance);
    });
  });

  describe('changeTokenFee()', () => {
    it('should fail: call from address without REDEMPTION_VAULT_ADMIN_ROLE role', async () => {
      const { redemptionVaultWithUSTB, regularAccounts, owner } =
        await loadFixture(defaultDeploy);
      await changeTokenFeeTest(
        { vault: redemptionVaultWithUSTB, owner },
        ethers.constants.AddressZero,
        0,
        { revertMessage: acErrors.WMAC_HASNT_ROLE, from: regularAccounts[0] },
      );
    });
    it('should fail: token not exist', async () => {
      const { redemptionVaultWithUSTB, owner, stableCoins } = await loadFixture(
        defaultDeploy,
      );
      await changeTokenFeeTest(
        { vault: redemptionVaultWithUSTB, owner },
        stableCoins.dai.address,
        0,
        { revertMessage: 'MV: token not exists' },
      );
    });
    it('should fail: fee > 100%', async () => {
      const { redemptionVaultWithUSTB, owner, stableCoins, dataFeed } =
        await loadFixture(defaultDeploy);
      await addPaymentTokenTest(
        { vault: redemptionVaultWithUSTB, owner },
        stableCoins.dai,
        dataFeed.address,
        0,
        true,
      );
      await changeTokenFeeTest(
        { vault: redemptionVaultWithUSTB, owner },
        stableCoins.dai.address,
        10001,
        { revertMessage: 'fee > 100%' },
      );
    });
    it('call from address with REDEMPTION_VAULT_ADMIN_ROLE role', async () => {
      const { redemptionVaultWithUSTB, owner, stableCoins, dataFeed } =
        await loadFixture(defaultDeploy);
      await addPaymentTokenTest(
        { vault: redemptionVaultWithUSTB, owner },
        stableCoins.dai,
        dataFeed.address,
        0,
        true,
      );
      await changeTokenFeeTest(
        { vault: redemptionVaultWithUSTB, owner },
        stableCoins.dai.address,
        100,
      );
    });
  });

  describe('redeemInstant()', () => {
    it('should fail: when there is no token in vault', async () => {
      const {
        owner,
        redemptionVaultWithUSTB,
        stableCoins,
        mTBILL,
        mTokenToUsdDataFeed,
      } = await loadFixture(defaultDeploy);

      await redeemInstantTest(
        {
          redemptionVault: redemptionVaultWithUSTB,
          owner,
          mTBILL,
          mTokenToUsdDataFeed,
        },
        stableCoins.usdc,
        1,
        {
          revertMessage: 'MV: token not exists',
        },
      );
    });

    it('should fail: when trying to redeem 0 amount', async () => {
      const {
        owner,
        redemptionVaultWithUSTB,
        stableCoins,
        mTBILL,
        dataFeed,
        mTokenToUsdDataFeed,
      } = await loadFixture(defaultDeploy);
      await addPaymentTokenTest(
        { vault: redemptionVaultWithUSTB, owner },
        stableCoins.usdc,
        dataFeed.address,
        0,
        true,
      );
      await redeemInstantTest(
        {
          redemptionVault: redemptionVaultWithUSTB,
          owner,
          mTBILL,
          mTokenToUsdDataFeed,
        },
        stableCoins.usdc,
        0,
        {
          revertMessage: 'RV: invalid amount',
        },
      );
    });

    it('should fail: when function paused', async () => {
      const {
        owner,
        redemptionVaultWithUSTB,
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
        redemptionVaultWithUSTB,
        100,
      );
      await addPaymentTokenTest(
        { vault: redemptionVaultWithUSTB, owner },
        stableCoins.dai,
        dataFeed.address,
        0,
        true,
      );
      const selector = encodeFnSelector(
        'redeemInstant(address,uint256,uint256)',
      );
      await pauseVaultFn(redemptionVaultWithUSTB, selector);
      await redeemInstantTest(
        {
          redemptionVault: redemptionVaultWithUSTB,
          owner,
          mTBILL,
          mTokenToUsdDataFeed,
        },
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
        redemptionVaultWithUSTB,
        stableCoins,
        mTBILL,
        dataFeed,
        mTokenToUsdDataFeed,
      } = await loadFixture(defaultDeploy);

      await mintToken(mTBILL, owner, 100);
      await addPaymentTokenTest(
        { vault: redemptionVaultWithUSTB, owner },
        stableCoins.usdc,
        dataFeed.address,
        0,
        true,
      );
      await redeemInstantTest(
        {
          redemptionVault: redemptionVaultWithUSTB,
          owner,
          mTBILL,
          mTokenToUsdDataFeed,
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
        redemptionVaultWithUSTB,
        stableCoins,
        mTBILL,
        dataFeed,
        mTokenToUsdDataFeed,
      } = await loadFixture(defaultDeploy);

      await approveBase18(owner, mTBILL, redemptionVaultWithUSTB, 100);
      await addPaymentTokenTest(
        { vault: redemptionVaultWithUSTB, owner },
        stableCoins.usdc,
        dataFeed.address,
        0,
        true,
      );
      await redeemInstantTest(
        {
          redemptionVault: redemptionVaultWithUSTB,
          owner,
          mTBILL,
          mTokenToUsdDataFeed,
        },
        stableCoins.usdc,
        100,
        {
          revertMessage: 'ERC20: burn amount exceeds balance',
        },
      );
    });

    it('should fail: dataFeed rate 0 ', async () => {
      const {
        owner,
        redemptionVaultWithUSTB,
        stableCoins,
        mTBILL,
        dataFeed,
        mockedAggregator,
        mockedAggregatorMToken,
        mTokenToUsdDataFeed,
      } = await loadFixture(defaultDeploy);

      await approveBase18(owner, stableCoins.usdc, redemptionVaultWithUSTB, 10);
      await addPaymentTokenTest(
        { vault: redemptionVaultWithUSTB, owner },
        stableCoins.usdc,
        dataFeed.address,
        0,
        true,
      );
      await mintToken(mTBILL, owner, 100_000);
      await setRoundData({ mockedAggregator }, 0);
      await redeemInstantTest(
        {
          redemptionVault: redemptionVaultWithUSTB,
          owner,
          mTBILL,
          mTokenToUsdDataFeed,
        },
        stableCoins.usdc,
        1,
        {
          revertMessage: 'DF: feed is deprecated',
        },
      );
      await setRoundData({ mockedAggregator }, 1);
      await setRoundData({ mockedAggregator: mockedAggregatorMToken }, 0);
      await redeemInstantTest(
        {
          redemptionVault: redemptionVaultWithUSTB,
          owner,
          mTBILL,
          mTokenToUsdDataFeed,
        },
        stableCoins.usdc,
        1,
        {
          revertMessage: 'DF: feed is deprecated',
        },
      );
    });

    it('should fail: if min receive amount greater then actual', async () => {
      const {
        redemptionVaultWithUSTB,
        mockedAggregator,
        owner,
        mTBILL,
        stableCoins,
        dataFeed,
        mTokenToUsdDataFeed,
      } = await loadFixture(defaultDeploy);
      await addPaymentTokenTest(
        { vault: redemptionVaultWithUSTB, owner },
        stableCoins.usdc,
        dataFeed.address,
        0,
        true,
      );
      await setRoundData({ mockedAggregator }, 4);

      await mintToken(mTBILL, owner, 100_000);

      await approveBase18(owner, mTBILL, redemptionVaultWithUSTB, 100_000);

      await redeemInstantTest(
        {
          redemptionVault: redemptionVaultWithUSTB,
          owner,
          mTBILL,
          mTokenToUsdDataFeed,
          minAmount: parseUnits('1000000'),
        },
        stableCoins.usdc,
        99_999,
        {
          revertMessage: 'RVU: minReceiveAmount > actual',
        },
      );
    });

    it('should fail: call for amount < minAmount', async () => {
      const {
        redemptionVaultWithUSTB,
        mockedAggregator,
        owner,
        mTBILL,
        stableCoins,
        dataFeed,
        mTokenToUsdDataFeed,
      } = await loadFixture(defaultDeploy);
      await addPaymentTokenTest(
        { vault: redemptionVaultWithUSTB, owner },
        stableCoins.usdc,
        dataFeed.address,
        0,
        true,
      );
      await setRoundData({ mockedAggregator }, 1);

      await mintToken(mTBILL, owner, 100_000);
      await approveBase18(owner, mTBILL, redemptionVaultWithUSTB, 100_000);

      await setMinAmountTest(
        { vault: redemptionVaultWithUSTB, owner },
        100_000,
      );

      await redeemInstantTest(
        {
          redemptionVault: redemptionVaultWithUSTB,
          owner,
          mTBILL,
          mTokenToUsdDataFeed,
        },
        stableCoins.usdc,
        99_999,
        {
          revertMessage: 'RV: amount < min',
        },
      );
    });

    it('should fail: call when token is invalid', async () => {
      const {
        redemptionVaultWithUSTB,
        owner,
        mTBILL,
        stableCoins,
        dataFeed,
        mTokenToUsdDataFeed,
        ustbToken,
        ustbRedemption,
        mockedAggregator,
        mockedAggregatorMToken,
      } = await loadFixture(defaultDeploy);

      await ustbRedemption.setChainlinkData(parseUnits('1', 8), false);
      await mintToken(mTBILL, owner, 1000);
      await approveBase18(owner, mTBILL, redemptionVaultWithUSTB, 1000);
      await mintToken(ustbToken, redemptionVaultWithUSTB, 9900);

      await addPaymentTokenTest(
        { vault: redemptionVaultWithUSTB, owner },
        stableCoins.dai,
        dataFeed.address,
        0,
        true,
      );

      await setInstantFeeTest({ vault: redemptionVaultWithUSTB, owner }, 0);
      await setRoundData({ mockedAggregator }, 1);
      await setRoundData({ mockedAggregator: mockedAggregatorMToken }, 1);

      await redeemInstantTest(
        {
          redemptionVault: redemptionVaultWithUSTB,
          owner,
          mTBILL,
          mTokenToUsdDataFeed,
        },
        stableCoins.dai,
        1000,
        {
          revertMessage: 'RVU: invalid token',
        },
      );
    });

    it('should fail: if exceed allowance of redeem by token', async () => {
      const {
        redemptionVaultWithUSTB,
        mockedAggregator,
        owner,
        mTBILL,
        stableCoins,
        dataFeed,
        mTokenToUsdDataFeed,
      } = await loadFixture(defaultDeploy);
      await addPaymentTokenTest(
        { vault: redemptionVaultWithUSTB, owner },
        stableCoins.usdc,
        dataFeed.address,
        0,
        true,
      );
      await setRoundData({ mockedAggregator }, 4);

      await mintToken(mTBILL, owner, 100_000);
      await changeTokenAllowanceTest(
        { vault: redemptionVaultWithUSTB, owner },
        stableCoins.usdc.address,
        100,
      );
      await approveBase18(owner, mTBILL, redemptionVaultWithUSTB, 100_000);

      await redeemInstantTest(
        {
          redemptionVault: redemptionVaultWithUSTB,
          owner,
          mTBILL,
          mTokenToUsdDataFeed,
        },
        stableCoins.usdc,
        99_999,
        {
          revertMessage: 'MV: exceed allowance',
        },
      );
    });

    it('should fail: if redeem daily limit exceeded', async () => {
      const {
        redemptionVaultWithUSTB,
        mockedAggregator,
        owner,
        mTBILL,
        stableCoins,
        dataFeed,
        mTokenToUsdDataFeed,
      } = await loadFixture(defaultDeploy);
      await addPaymentTokenTest(
        { vault: redemptionVaultWithUSTB, owner },
        stableCoins.usdc,
        dataFeed.address,
        0,
        true,
      );
      await setRoundData({ mockedAggregator }, 4);

      await mintToken(mTBILL, owner, 100_000);
      await setInstantDailyLimitTest(
        { vault: redemptionVaultWithUSTB, owner },
        1000,
      );

      await approveBase18(owner, mTBILL, redemptionVaultWithUSTB, 100_000);

      await redeemInstantTest(
        {
          redemptionVault: redemptionVaultWithUSTB,
          owner,
          mTBILL,
          mTokenToUsdDataFeed,
        },
        stableCoins.usdc,
        99_999,
        {
          revertMessage: 'MV: exceed limit',
        },
      );
    });

    it('should fail: if some fee = 100%', async () => {
      const {
        owner,
        redemptionVaultWithUSTB,
        stableCoins,
        mTBILL,
        dataFeed,
        mTokenToUsdDataFeed,
      } = await loadFixture(defaultDeploy);

      await mintToken(mTBILL, owner, 100);
      await approveBase18(owner, mTBILL, redemptionVaultWithUSTB, 100);
      await addPaymentTokenTest(
        { vault: redemptionVaultWithUSTB, owner },
        stableCoins.usdc,
        dataFeed.address,
        10000,
        true,
      );
      await redeemInstantTest(
        {
          redemptionVault: redemptionVaultWithUSTB,
          owner,
          mTBILL,
          mTokenToUsdDataFeed,
        },
        stableCoins.usdc,
        100,
        {
          revertMessage: 'RV: amountMTokenIn < fee',
        },
      );

      await removePaymentTokenTest(
        { vault: redemptionVaultWithUSTB, owner },
        stableCoins.usdc,
      );
      await addPaymentTokenTest(
        { vault: redemptionVaultWithUSTB, owner },
        stableCoins.usdc,
        dataFeed.address,
        0,
        true,
      );
      await setInstantFeeTest({ vault: redemptionVaultWithUSTB, owner }, 10000);
      await redeemInstantTest(
        {
          redemptionVault: redemptionVaultWithUSTB,
          owner,
          mTBILL,
          mTokenToUsdDataFeed,
        },
        stableCoins.usdc,
        100,
        { revertMessage: 'RV: amountMTokenIn < fee' },
      );
    });

    it('should fail: greenlist enabled and user not in greenlist ', async () => {
      const {
        owner,
        redemptionVaultWithUSTB,
        stableCoins,
        mTBILL,
        mTokenToUsdDataFeed,
      } = await loadFixture(defaultDeploy);

      await redemptionVaultWithUSTB.setGreenlistEnable(true);

      await redeemInstantTest(
        {
          redemptionVault: redemptionVaultWithUSTB,
          owner,
          mTBILL,
          mTokenToUsdDataFeed,
        },
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
        redemptionVaultWithUSTB,
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
        {
          redemptionVault: redemptionVaultWithUSTB,
          owner,
          mTBILL,
          mTokenToUsdDataFeed,
        },
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
        redemptionVaultWithUSTB,
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
        {
          redemptionVault: redemptionVaultWithUSTB,
          owner,
          mTBILL,
          mTokenToUsdDataFeed,
        },
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
        redemptionVaultWithUSTB,
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
        redemptionVaultWithUSTB,
        100,
      );
      await addPaymentTokenTest(
        { vault: redemptionVaultWithUSTB, owner },
        stableCoins.dai,
        dataFeed.address,
        0,
        true,
      );
      const selector = encodeFnSelector(
        'redeemInstant(address,uint256,uint256,address)',
      );
      await pauseVaultFn(redemptionVaultWithUSTB, selector);
      await redeemInstantTest(
        {
          redemptionVault: redemptionVaultWithUSTB,
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
        redemptionVaultWithUSTB,
        stableCoins,
        mTBILL,
        mTokenToUsdDataFeed,
        greenListableTester,
        accessControl,
        customRecipient,
      } = await loadFixture(defaultDeploy);

      await redemptionVaultWithUSTB.setGreenlistEnable(true);

      await greenList(
        { greenlistable: greenListableTester, accessControl, owner },
        owner,
      );

      await redeemInstantTest(
        {
          redemptionVault: redemptionVaultWithUSTB,
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
        redemptionVaultWithUSTB,
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
          redemptionVault: redemptionVaultWithUSTB,
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
        redemptionVaultWithUSTB,
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
          redemptionVault: redemptionVaultWithUSTB,
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

    it('should fail: user try to instant redeem more than contract can redeem', async () => {
      const {
        owner,
        redemptionVaultWithUSTB,
        stableCoins,
        mTBILL,
        mTokenToUsdDataFeed,
        dataFeed,
        ustbToken,
      } = await loadFixture(defaultDeploy);

      await mintToken(mTBILL, owner, 100000);
      await mintToken(stableCoins.usdc, redemptionVaultWithUSTB, 100);
      await mintToken(ustbToken, redemptionVaultWithUSTB, 100);

      await approveBase18(owner, mTBILL, redemptionVaultWithUSTB, 100000);

      await addPaymentTokenTest(
        { vault: redemptionVaultWithUSTB, owner },
        stableCoins.usdc,
        dataFeed.address,
        100,
        true,
      );

      await redeemInstantTest(
        {
          redemptionVault: redemptionVaultWithUSTB,
          owner,
          mTBILL,
          mTokenToUsdDataFeed,
        },
        stableCoins.usdc,
        100000,
        {
          revertMessage: 'RVU: insufficient USTB balance',
        },
      );
    });

    it('redeem 100 mTBILL, when price of stable is 1$ and mToken price is 1$ and contract has 100 USDC', async () => {
      const {
        owner,
        mockedAggregator,
        mockedAggregatorMToken,
        redemptionVaultWithUSTB,
        ustbRedemption,
        stableCoins,
        mTBILL,
        dataFeed,
        mTokenToUsdDataFeed,
      } = await loadFixture(defaultDeploy);

      await mintToken(stableCoins.usdc, redemptionVaultWithUSTB, 100);
      await mintToken(mTBILL, owner, 100);
      await approveBase18(owner, mTBILL, redemptionVaultWithUSTB, 100);
      await addPaymentTokenTest(
        { vault: redemptionVaultWithUSTB, owner },
        stableCoins.usdc,
        dataFeed.address,
        0,
        true,
      );
      await setRoundData({ mockedAggregator }, 1);
      await setRoundData({ mockedAggregator: mockedAggregatorMToken }, 1);
      await ustbRedemption.setMaxUstbRedemptionAmount(parseUnits('100', 6));
      await redeemInstantTest(
        {
          redemptionVault: redemptionVaultWithUSTB,
          owner,
          mTBILL,
          mTokenToUsdDataFeed,
        },
        stableCoins.usdc,
        100,
      );
    });

    it('redeem 1000 mTBILL, when price of stable is 1$ and mToken price is 1$ and contract does not have USDC, but has 9900 USTB', async () => {
      const {
        owner,
        mockedAggregator,
        mockedAggregatorMToken,
        redemptionVaultWithUSTB,
        stableCoins,
        mTBILL,
        dataFeed,
        mTokenToUsdDataFeed,
        ustbToken,
        ustbRedemption,
      } = await loadFixture(defaultDeploy);

      await ustbRedemption.setChainlinkData(parseUnits('1', 8), false); // Set USTB price to $1

      await mintToken(ustbToken, redemptionVaultWithUSTB, 9900);
      await mintToken(mTBILL, owner, 1000);
      await approveBase18(owner, mTBILL, redemptionVaultWithUSTB, 1000);
      await addPaymentTokenTest(
        { vault: redemptionVaultWithUSTB, owner },
        stableCoins.usdc,
        dataFeed.address,
        0,
        true,
      );
      await setInstantFeeTest({ vault: redemptionVaultWithUSTB, owner }, 0);
      await setRoundData({ mockedAggregator }, 1);
      await setRoundData({ mockedAggregator: mockedAggregatorMToken }, 1);

      const ustbBalanceBefore = await ustbToken.balanceOf(
        redemptionVaultWithUSTB.address,
      );

      await ustbRedemption.setMaxUstbRedemptionAmount(parseUnits('1000', 6));
      await redeemInstantTest(
        {
          redemptionVault: redemptionVaultWithUSTB,
          owner,
          mTBILL,
          mTokenToUsdDataFeed,
        },
        stableCoins.usdc,
        1000,
      );

      const ustbBalanceAfter = await ustbToken.balanceOf(
        redemptionVaultWithUSTB.address,
      );

      expect(ustbBalanceAfter).to.be.lt(ustbBalanceBefore);
    });

    it('redeem 1000 mTBILL, when price of stable is 1$ and mToken price is 1$ and contract has 100 USDC and 9900 USTB', async () => {
      const {
        owner,
        mockedAggregator,
        mockedAggregatorMToken,
        redemptionVaultWithUSTB,
        stableCoins,
        mTBILL,
        dataFeed,
        mTokenToUsdDataFeed,
        ustbToken,
        ustbRedemption,
      } = await loadFixture(defaultDeploy);

      await ustbRedemption.setChainlinkData(parseUnits('1', 8), false); // Set USTB price to $1

      await mintToken(stableCoins.usdc, redemptionVaultWithUSTB, 100);
      await mintToken(ustbToken, redemptionVaultWithUSTB, 9900);
      await mintToken(mTBILL, owner, 1000);
      await approveBase18(owner, mTBILL, redemptionVaultWithUSTB, 1000);
      await addPaymentTokenTest(
        { vault: redemptionVaultWithUSTB, owner },
        stableCoins.usdc,
        dataFeed.address,
        0,
        true,
      );
      await setRoundData({ mockedAggregator }, 1);
      await setRoundData({ mockedAggregator: mockedAggregatorMToken }, 1);

      await ustbRedemption.setMaxUstbRedemptionAmount(parseUnits('1000', 6));
      await redeemInstantTest(
        {
          redemptionVault: redemptionVaultWithUSTB,
          owner,
          mTBILL,
          mTokenToUsdDataFeed,
        },
        stableCoins.usdc,
        1000,
      );
    });

    it('redeem 1000 mTBILL, when price of stable is 1.03$ and mToken price is 5$ and contract has 100 USDC and sufficient USTB without checking of minDepositAmount', async () => {
      const {
        owner,
        mockedAggregator,
        mockedAggregatorMToken,
        redemptionVaultWithUSTB,
        stableCoins,
        mTBILL,
        dataFeed,
        mTokenToUsdDataFeed,
        ustbToken,
        ustbRedemption,
      } = await loadFixture(defaultDeploy);

      await ustbRedemption.setChainlinkData(parseUnits('1', 8), false); // Set USTB price to $1

      await mintToken(stableCoins.usdc, redemptionVaultWithUSTB, 100);
      await mintToken(ustbToken, redemptionVaultWithUSTB, 15000);
      await mintToken(mTBILL, owner, 1000);
      await approveBase18(owner, mTBILL, redemptionVaultWithUSTB, 1000);
      await addPaymentTokenTest(
        { vault: redemptionVaultWithUSTB, owner },
        stableCoins.usdc,
        dataFeed.address,
        100,
        true,
      );
      await setRoundData({ mockedAggregator }, 1.03);
      await setRoundData({ mockedAggregator: mockedAggregatorMToken }, 5);
      await redemptionVaultWithUSTB.freeFromMinAmount(owner.address, true);

      await ustbRedemption.setMaxUstbRedemptionAmount(parseUnits('6000', 6));
      await redeemInstantTest(
        {
          redemptionVault: redemptionVaultWithUSTB,
          owner,
          mTBILL,
          mTokenToUsdDataFeed,
        },
        stableCoins.usdc,
        1000,
      );
    });

    it('redeem 1000 mTBILL, when price of stable is 1.03$ and mToken price is 5$ and contract has 100 USDC and sufficient USTB and user in waivedFeeRestriction', async () => {
      const {
        owner,
        mockedAggregator,
        mockedAggregatorMToken,
        redemptionVaultWithUSTB,
        stableCoins,
        mTBILL,
        dataFeed,
        mTokenToUsdDataFeed,
        ustbToken,
        ustbRedemption,
      } = await loadFixture(defaultDeploy);

      await ustbRedemption.setChainlinkData(parseUnits('1', 8), false); // Set USTB price to $1

      await mintToken(stableCoins.usdc, redemptionVaultWithUSTB, 100);
      await mintToken(ustbToken, redemptionVaultWithUSTB, 15000);
      await mintToken(mTBILL, owner, 1000);
      await approveBase18(owner, mTBILL, redemptionVaultWithUSTB, 1000);
      await addPaymentTokenTest(
        { vault: redemptionVaultWithUSTB, owner },
        stableCoins.usdc,
        dataFeed.address,
        100,
        true,
      );
      await setRoundData({ mockedAggregator }, 1.03);
      await setRoundData({ mockedAggregator: mockedAggregatorMToken }, 5);

      await addWaivedFeeAccountTest(
        { vault: redemptionVaultWithUSTB, owner },
        owner.address,
      );

      await ustbRedemption.setMaxUstbRedemptionAmount(parseUnits('6000', 6));
      await redeemInstantTest(
        {
          redemptionVault: redemptionVaultWithUSTB,
          owner,
          mTBILL,
          mTokenToUsdDataFeed,
          waivedFee: true,
        },
        stableCoins.usdc,
        1000,
      );
    });

    it('should fail: when redemption exceeds available USDC in USTB redemption contract', async () => {
      const {
        owner,
        redemptionVaultWithUSTB,
        stableCoins,
        mTBILL,
        dataFeed,
        ustbToken,
        ustbRedemption,
      } = await loadFixture(defaultDeploy);

      await ustbRedemption.setChainlinkData(parseUnits('1', 8), false); // Set USTB price to $1

      await mintToken(ustbToken, redemptionVaultWithUSTB, 1000000);
      await mintToken(stableCoins.usdc, redemptionVaultWithUSTB, 100);

      const mockBalance = await stableCoins.usdc.balanceOf(
        ustbRedemption.address,
      );
      await ustbRedemption.withdraw(
        stableCoins.usdc.address,
        owner.address,
        mockBalance,
      );

      expect(await stableCoins.usdc.balanceOf(ustbRedemption.address)).to.equal(
        0,
      );

      await mintToken(mTBILL, owner, 100000);
      await approveBase18(owner, mTBILL, redemptionVaultWithUSTB, 100000);
      await addPaymentTokenTest(
        { vault: redemptionVaultWithUSTB, owner },
        stableCoins.usdc,
        dataFeed.address,
        0,
        true,
      );

      // Try to redeem - should fail because USTB redemption has no USDC
      await expect(
        redemptionVaultWithUSTB['redeemInstant(address,uint256,uint256)'](
          stableCoins.usdc.address,
          parseUnits('10000'),
          0,
        ),
      ).to.be.revertedWith('USTBRedemptionMock: InsufficientBalance');
    });

    it('redeem 100 mTBILL (custom recipient overload)', async () => {
      const {
        owner,
        redemptionVaultWithUSTB,
        stableCoins,
        mTBILL,
        mTokenToUsdDataFeed,
        regularAccounts,
        dataFeed,
        customRecipient,
      } = await loadFixture(defaultDeploy);

      await mintToken(stableCoins.usdc, redemptionVaultWithUSTB, 100000);
      await mintToken(mTBILL, regularAccounts[0], 100);
      await approveBase18(
        regularAccounts[0],
        mTBILL,
        redemptionVaultWithUSTB,
        100,
      );
      await addPaymentTokenTest(
        { vault: redemptionVaultWithUSTB, owner },
        stableCoins.usdc,
        dataFeed.address,
        0,
        true,
      );

      await redeemInstantTest(
        {
          redemptionVault: redemptionVaultWithUSTB,
          owner,
          mTBILL,
          mTokenToUsdDataFeed,
          customRecipient,
        },
        stableCoins.usdc,
        100,
        {
          from: regularAccounts[0],
        },
      );
    });

    it('redeem 100 mTBILL when recipient == msg.sender (custom recipient overload)', async () => {
      const {
        owner,
        redemptionVaultWithUSTB,
        stableCoins,
        mTBILL,
        mTokenToUsdDataFeed,
        regularAccounts,
        dataFeed,
      } = await loadFixture(defaultDeploy);

      await mintToken(stableCoins.usdc, redemptionVaultWithUSTB, 100000);
      await mintToken(mTBILL, regularAccounts[0], 100);
      await approveBase18(
        regularAccounts[0],
        mTBILL,
        redemptionVaultWithUSTB,
        100,
      );
      await addPaymentTokenTest(
        { vault: redemptionVaultWithUSTB, owner },
        stableCoins.usdc,
        dataFeed.address,
        0,
        true,
      );

      await redeemInstantTest(
        {
          redemptionVault: redemptionVaultWithUSTB,
          owner,
          mTBILL,
          mTokenToUsdDataFeed,
          customRecipient: regularAccounts[0],
        },
        stableCoins.usdc,
        100,
        {
          from: regularAccounts[0],
        },
      );
    });

    it('redeem 100 mTBILL when other fn overload is paused (custom recipient overload)', async () => {
      const {
        owner,
        redemptionVaultWithUSTB,
        stableCoins,
        mTBILL,
        mTokenToUsdDataFeed,
        regularAccounts,
        dataFeed,
        customRecipient,
      } = await loadFixture(defaultDeploy);

      await pauseVaultFn(
        redemptionVaultWithUSTB,
        encodeFnSelector('redeemInstant(address,uint256,uint256)'),
      );
      await mintToken(stableCoins.usdc, redemptionVaultWithUSTB, 100000);
      await mintToken(mTBILL, regularAccounts[0], 100);
      await approveBase18(
        regularAccounts[0],
        mTBILL,
        redemptionVaultWithUSTB,
        100,
      );
      await addPaymentTokenTest(
        { vault: redemptionVaultWithUSTB, owner },
        stableCoins.usdc,
        dataFeed.address,
        0,
        true,
      );

      await redeemInstantTest(
        {
          redemptionVault: redemptionVaultWithUSTB,
          owner,
          mTBILL,
          mTokenToUsdDataFeed,
          customRecipient,
        },
        stableCoins.usdc,
        100,
        {
          from: regularAccounts[0],
        },
      );
    });

    it('redeem 100 mTBILL when other fn overload is paused', async () => {
      const {
        owner,
        redemptionVaultWithUSTB,
        stableCoins,
        mTBILL,
        mTokenToUsdDataFeed,
        regularAccounts,
        dataFeed,
      } = await loadFixture(defaultDeploy);

      await pauseVaultFn(
        redemptionVaultWithUSTB,
        encodeFnSelector('redeemInstant(address,uint256,uint256,address)'),
      );
      await mintToken(stableCoins.usdc, redemptionVaultWithUSTB, 100000);
      await mintToken(mTBILL, regularAccounts[0], 100);
      await approveBase18(
        regularAccounts[0],
        mTBILL,
        redemptionVaultWithUSTB,
        100,
      );
      await addPaymentTokenTest(
        { vault: redemptionVaultWithUSTB, owner },
        stableCoins.usdc,
        dataFeed.address,
        0,
        true,
      );

      await redeemInstantTest(
        {
          redemptionVault: redemptionVaultWithUSTB,
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

  describe('redeemRequest()', () => {
    it('should fail: when there is no token in vault', async () => {
      const {
        owner,
        redemptionVaultWithUSTB,
        stableCoins,
        mTBILL,
        mTokenToUsdDataFeed,
      } = await loadFixture(defaultDeploy);

      await redeemRequestTest(
        {
          redemptionVault: redemptionVaultWithUSTB,
          owner,
          mTBILL,
          mTokenToUsdDataFeed,
        },
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
        redemptionVaultWithUSTB,
        stableCoins,
        mTBILL,
        dataFeed,
        mTokenToUsdDataFeed,
      } = await loadFixture(defaultDeploy);
      await addPaymentTokenTest(
        { vault: redemptionVaultWithUSTB, owner },
        stableCoins.dai,
        dataFeed.address,
        0,
        true,
      );
      await redeemRequestTest(
        {
          redemptionVault: redemptionVaultWithUSTB,
          owner,
          mTBILL,
          mTokenToUsdDataFeed,
        },
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
        redemptionVaultWithUSTB,
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
        redemptionVaultWithUSTB,
        100,
      );
      await addPaymentTokenTest(
        { vault: redemptionVaultWithUSTB, owner },
        stableCoins.dai,
        dataFeed.address,
        0,
        true,
      );
      const selector = encodeFnSelector('redeemRequest(address,uint256)');
      await pauseVaultFn(redemptionVaultWithUSTB, selector);
      await redeemRequestTest(
        {
          redemptionVault: redemptionVaultWithUSTB,
          owner,
          mTBILL,
          mTokenToUsdDataFeed,
        },
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
        redemptionVaultWithUSTB,
        stableCoins,
        mTBILL,
        dataFeed,
        mTokenToUsdDataFeed,
      } = await loadFixture(defaultDeploy);

      await mintToken(mTBILL, owner, 100);
      await addPaymentTokenTest(
        { vault: redemptionVaultWithUSTB, owner },
        stableCoins.dai,
        dataFeed.address,
        0,
        true,
      );
      await redeemRequestTest(
        {
          redemptionVault: redemptionVaultWithUSTB,
          owner,
          mTBILL,
          mTokenToUsdDataFeed,
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
        redemptionVaultWithUSTB,
        stableCoins,
        mTBILL,
        dataFeed,
        mTokenToUsdDataFeed,
      } = await loadFixture(defaultDeploy);

      await approveBase18(owner, mTBILL, redemptionVaultWithUSTB, 100);
      await addPaymentTokenTest(
        { vault: redemptionVaultWithUSTB, owner },
        stableCoins.dai,
        dataFeed.address,
        0,
        true,
      );
      await redeemRequestTest(
        {
          redemptionVault: redemptionVaultWithUSTB,
          owner,
          mTBILL,
          mTokenToUsdDataFeed,
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
        redemptionVaultWithUSTB,
        stableCoins,
        mTBILL,
        dataFeed,
        mockedAggregator,
        mockedAggregatorMToken,
        mTokenToUsdDataFeed,
      } = await loadFixture(defaultDeploy);

      await approveBase18(owner, stableCoins.dai, redemptionVaultWithUSTB, 10);
      await addPaymentTokenTest(
        { vault: redemptionVaultWithUSTB, owner },
        stableCoins.dai,
        dataFeed.address,
        0,
        true,
      );
      await mintToken(mTBILL, owner, 100_000);
      await setRoundData({ mockedAggregator }, 0);
      await redeemRequestTest(
        {
          redemptionVault: redemptionVaultWithUSTB,
          owner,
          mTBILL,
          mTokenToUsdDataFeed,
        },
        stableCoins.dai,
        1,
        {
          revertMessage: 'DF: feed is deprecated',
        },
      );
      await setRoundData({ mockedAggregator }, 1);
      await setRoundData({ mockedAggregator: mockedAggregatorMToken }, 0);
      await redeemRequestTest(
        {
          redemptionVault: redemptionVaultWithUSTB,
          owner,
          mTBILL,
          mTokenToUsdDataFeed,
        },
        stableCoins.dai,
        1,
        {
          revertMessage: 'DF: feed is deprecated',
        },
      );
    });

    it('should fail: call for amount < minAmount', async () => {
      const {
        redemptionVaultWithUSTB,
        mockedAggregator,
        owner,
        mTBILL,
        stableCoins,
        dataFeed,
        mTokenToUsdDataFeed,
      } = await loadFixture(defaultDeploy);
      await addPaymentTokenTest(
        { vault: redemptionVaultWithUSTB, owner },
        stableCoins.dai,
        dataFeed.address,
        0,
        true,
      );
      await setRoundData({ mockedAggregator }, 1);

      await mintToken(mTBILL, owner, 100_000);
      await approveBase18(owner, mTBILL, redemptionVaultWithUSTB, 100_000);

      await setMinAmountTest(
        { vault: redemptionVaultWithUSTB, owner },
        100_000,
      );

      await redeemRequestTest(
        {
          redemptionVault: redemptionVaultWithUSTB,
          owner,
          mTBILL,
          mTokenToUsdDataFeed,
        },
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
        redemptionVaultWithUSTB,
        stableCoins,
        mTBILL,
        dataFeed,
        mTokenToUsdDataFeed,
      } = await loadFixture(defaultDeploy);

      await mintToken(mTBILL, owner, 100);
      await approveBase18(owner, mTBILL, redemptionVaultWithUSTB, 100);
      await addPaymentTokenTest(
        { vault: redemptionVaultWithUSTB, owner },
        stableCoins.dai,
        dataFeed.address,
        10000,
        true,
      );
      await redeemRequestTest(
        {
          redemptionVault: redemptionVaultWithUSTB,
          owner,
          mTBILL,
          mTokenToUsdDataFeed,
        },
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
        redemptionVaultWithUSTB,
        stableCoins,
        mTBILL,
        mTokenToUsdDataFeed,
      } = await loadFixture(defaultDeploy);

      await redemptionVaultWithUSTB.setGreenlistEnable(true);

      await redeemRequestTest(
        {
          redemptionVault: redemptionVaultWithUSTB,
          owner,
          mTBILL,
          mTokenToUsdDataFeed,
        },
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
        redemptionVaultWithUSTB,
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
        {
          redemptionVault: redemptionVaultWithUSTB,
          owner,
          mTBILL,
          mTokenToUsdDataFeed,
        },
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
        redemptionVaultWithUSTB,
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
        {
          redemptionVault: redemptionVaultWithUSTB,
          owner,
          mTBILL,
          mTokenToUsdDataFeed,
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
        redemptionVaultWithUSTB,
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
        redemptionVaultWithUSTB,
        100,
      );
      await addPaymentTokenTest(
        { vault: redemptionVaultWithUSTB, owner },
        stableCoins.dai,
        dataFeed.address,
        0,
        true,
      );
      const selector = encodeFnSelector(
        'redeemRequest(address,uint256,address)',
      );
      await pauseVaultFn(redemptionVaultWithUSTB, selector);
      await redeemRequestTest(
        {
          redemptionVault: redemptionVaultWithUSTB,
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
        redemptionVaultWithUSTB,
        stableCoins,
        mTBILL,
        mTokenToUsdDataFeed,
        greenListableTester,
        accessControl,
        customRecipient,
      } = await loadFixture(defaultDeploy);

      await redemptionVaultWithUSTB.setGreenlistEnable(true);

      await greenList(
        { greenlistable: greenListableTester, accessControl, owner },
        owner,
      );

      await redeemRequestTest(
        {
          redemptionVault: redemptionVaultWithUSTB,
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
        redemptionVaultWithUSTB,
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
          redemptionVault: redemptionVaultWithUSTB,
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
        redemptionVaultWithUSTB,
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
          redemptionVault: redemptionVaultWithUSTB,
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
        redemptionVaultWithUSTB,
        stableCoins,
        mTBILL,
        mTokenToUsdDataFeed,
        dataFeed,
        customRecipient,
      } = await loadFixture(defaultDeploy);

      await mintToken(mTBILL, owner, 100);
      await approveBase18(owner, mTBILL, redemptionVaultWithUSTB, 100);

      await addPaymentTokenTest(
        { vault: redemptionVaultWithUSTB, owner },
        stableCoins.dai,
        dataFeed.address,
        100,
        true,
      );

      await redeemRequestTest(
        {
          redemptionVault: redemptionVaultWithUSTB,
          owner,
          mTBILL,
          mTokenToUsdDataFeed,
          customRecipient,
        },
        await redemptionVaultWithUSTB.MANUAL_FULLFILMENT_TOKEN(),
        100,
        {
          revertMessage: 'RV: tokenOut == fiat',
        },
      );
    });

    it('should fail: user try to redeem fiat in basic request', async () => {
      const {
        owner,
        redemptionVaultWithUSTB,
        stableCoins,
        mTBILL,
        mTokenToUsdDataFeed,
        dataFeed,
      } = await loadFixture(defaultDeploy);

      await mintToken(mTBILL, owner, 100);
      await approveBase18(owner, mTBILL, redemptionVaultWithUSTB, 100);

      await addPaymentTokenTest(
        { vault: redemptionVaultWithUSTB, owner },
        stableCoins.dai,
        dataFeed.address,
        100,
        true,
      );

      await redeemRequestTest(
        {
          redemptionVault: redemptionVaultWithUSTB,
          owner,
          mTBILL,
          mTokenToUsdDataFeed,
        },
        await redemptionVaultWithUSTB.MANUAL_FULLFILMENT_TOKEN(),
        100,
        {
          revertMessage: 'RV: tokenOut == fiat',
        },
      );
    });

    it('redeem request 100 mTBILL, greenlist enabled and user in greenlist ', async () => {
      const {
        owner,
        redemptionVaultWithUSTB,
        stableCoins,
        mTBILL,
        greenListableTester,
        mTokenToUsdDataFeed,
        accessControl,
        regularAccounts,
        dataFeed,
      } = await loadFixture(defaultDeploy);

      await redemptionVaultWithUSTB.setGreenlistEnable(true);

      await greenList(
        { greenlistable: greenListableTester, accessControl, owner },
        regularAccounts[0],
      );

      await mintToken(stableCoins.dai, redemptionVaultWithUSTB, 100000);
      await mintToken(mTBILL, regularAccounts[0], 100);
      await approveBase18(
        regularAccounts[0],
        mTBILL,
        redemptionVaultWithUSTB,
        100,
      );
      await addPaymentTokenTest(
        { vault: redemptionVaultWithUSTB, owner },
        stableCoins.dai,
        dataFeed.address,
        0,
        true,
      );

      await redeemRequestTest(
        {
          redemptionVault: redemptionVaultWithUSTB,
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

    it('redeem request 100 mTBILL, when price of stable is 1.03$ and mToken price is 5$', async () => {
      const {
        owner,
        mockedAggregator,
        mockedAggregatorMToken,
        redemptionVaultWithUSTB,
        stableCoins,
        mTBILL,
        dataFeed,
        mTokenToUsdDataFeed,
      } = await loadFixture(defaultDeploy);

      await mintToken(stableCoins.dai, redemptionVaultWithUSTB, 100000);
      await mintToken(mTBILL, owner, 100);
      await approveBase18(owner, mTBILL, redemptionVaultWithUSTB, 100);
      await addPaymentTokenTest(
        { vault: redemptionVaultWithUSTB, owner },
        stableCoins.dai,
        dataFeed.address,
        0,
        true,
      );
      await setRoundData({ mockedAggregator }, 1.03);
      await setRoundData({ mockedAggregator: mockedAggregatorMToken }, 5);

      await redeemRequestTest(
        {
          redemptionVault: redemptionVaultWithUSTB,
          owner,
          mTBILL,
          mTokenToUsdDataFeed,
        },
        stableCoins.dai,
        100,
      );
    });

    it('redeem request 100 mTBILL, when price of stable is 1.03$ and mToken price is 5$ and token fee 1%', async () => {
      const {
        owner,
        mockedAggregator,
        mockedAggregatorMToken,
        redemptionVaultWithUSTB,
        stableCoins,
        mTBILL,
        dataFeed,
        mTokenToUsdDataFeed,
      } = await loadFixture(defaultDeploy);

      await mintToken(stableCoins.dai, redemptionVaultWithUSTB, 100000);
      await mintToken(mTBILL, owner, 100);
      await approveBase18(owner, mTBILL, redemptionVaultWithUSTB, 100);
      await addPaymentTokenTest(
        { vault: redemptionVaultWithUSTB, owner },
        stableCoins.dai,
        dataFeed.address,
        100,
        true,
      );
      await setRoundData({ mockedAggregator }, 1.03);
      await setRoundData({ mockedAggregator: mockedAggregatorMToken }, 5);
      await redeemRequestTest(
        {
          redemptionVault: redemptionVaultWithUSTB,
          owner,
          mTBILL,
          mTokenToUsdDataFeed,
        },
        stableCoins.dai,
        100,
      );
    });

    it('redeem request 100 mTBILL, when price of stable is 1.03$ and mToken price is 5$ without checking of minDepositAmount', async () => {
      const {
        owner,
        mockedAggregator,
        mockedAggregatorMToken,
        redemptionVaultWithUSTB,
        stableCoins,
        mTBILL,
        dataFeed,
        mTokenToUsdDataFeed,
      } = await loadFixture(defaultDeploy);

      await mintToken(stableCoins.dai, redemptionVaultWithUSTB, 100000);
      await mintToken(mTBILL, owner, 100);
      await approveBase18(owner, mTBILL, redemptionVaultWithUSTB, 100);
      await addPaymentTokenTest(
        { vault: redemptionVaultWithUSTB, owner },
        stableCoins.dai,
        dataFeed.address,
        100,
        true,
      );
      await setRoundData({ mockedAggregator }, 1.03);
      await setRoundData({ mockedAggregator: mockedAggregatorMToken }, 5);
      await redemptionVaultWithUSTB.freeFromMinAmount(owner.address, true);
      await redeemRequestTest(
        {
          redemptionVault: redemptionVaultWithUSTB,
          owner,
          mTBILL,
          mTokenToUsdDataFeed,
        },
        stableCoins.dai,
        100,
      );
    });

    it('redeem request 100 mTBILL, when price of stable is 1.03$ and mToken price is 5$ and user in waivedFeeRestriction', async () => {
      const {
        owner,
        mockedAggregator,
        mockedAggregatorMToken,
        redemptionVaultWithUSTB,
        stableCoins,
        mTBILL,
        dataFeed,
        mTokenToUsdDataFeed,
      } = await loadFixture(defaultDeploy);

      await mintToken(stableCoins.dai, redemptionVaultWithUSTB, 100000);
      await mintToken(mTBILL, owner, 100);
      await approveBase18(owner, mTBILL, redemptionVaultWithUSTB, 100);
      await addPaymentTokenTest(
        { vault: redemptionVaultWithUSTB, owner },
        stableCoins.dai,
        dataFeed.address,
        100,
        true,
      );
      await setRoundData({ mockedAggregator }, 1.03);
      await setRoundData({ mockedAggregator: mockedAggregatorMToken }, 5);
      await addWaivedFeeAccountTest(
        { vault: redemptionVaultWithUSTB, owner },
        owner.address,
      );
      await redeemRequestTest(
        {
          redemptionVault: redemptionVaultWithUSTB,
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
        redemptionVaultWithUSTB,
        stableCoins,
        mTBILL,
        mTokenToUsdDataFeed,
        regularAccounts,
        dataFeed,
        customRecipient,
      } = await loadFixture(defaultDeploy);

      await mintToken(stableCoins.usdc, redemptionVaultWithUSTB, 100000);
      await mintToken(mTBILL, regularAccounts[0], 100);
      await approveBase18(
        regularAccounts[0],
        mTBILL,
        redemptionVaultWithUSTB,
        100,
      );
      await addPaymentTokenTest(
        { vault: redemptionVaultWithUSTB, owner },
        stableCoins.usdc,
        dataFeed.address,
        0,
        true,
      );

      await redeemRequestTest(
        {
          redemptionVault: redemptionVaultWithUSTB,
          owner,
          mTBILL,
          mTokenToUsdDataFeed,
          customRecipient,
        },
        stableCoins.usdc,
        100,
        {
          from: regularAccounts[0],
        },
      );
    });

    it('redeem request 100 mTBILL when recipient == msg.sender (custom recipient overload)', async () => {
      const {
        owner,
        redemptionVaultWithUSTB,
        stableCoins,
        mTBILL,
        mTokenToUsdDataFeed,
        regularAccounts,
        dataFeed,
      } = await loadFixture(defaultDeploy);

      await mintToken(stableCoins.usdc, redemptionVaultWithUSTB, 100000);
      await mintToken(mTBILL, regularAccounts[0], 100);
      await approveBase18(
        regularAccounts[0],
        mTBILL,
        redemptionVaultWithUSTB,
        100,
      );
      await addPaymentTokenTest(
        { vault: redemptionVaultWithUSTB, owner },
        stableCoins.usdc,
        dataFeed.address,
        0,
        true,
      );

      await redeemRequestTest(
        {
          redemptionVault: redemptionVaultWithUSTB,
          owner,
          mTBILL,
          mTokenToUsdDataFeed,
          customRecipient: regularAccounts[0],
        },
        stableCoins.usdc,
        100,
        {
          from: regularAccounts[0],
        },
      );
    });

    it('redeem request 100 mTBILL when other fn overload is paused (custom recipient overload)', async () => {
      const {
        owner,
        redemptionVaultWithUSTB,
        stableCoins,
        mTBILL,
        mTokenToUsdDataFeed,
        regularAccounts,
        dataFeed,
        customRecipient,
      } = await loadFixture(defaultDeploy);

      await pauseVaultFn(
        redemptionVaultWithUSTB,
        encodeFnSelector('redeemRequest(address,uint256)'),
      );
      await mintToken(stableCoins.usdc, redemptionVaultWithUSTB, 100000);
      await mintToken(mTBILL, regularAccounts[0], 100);
      await approveBase18(
        regularAccounts[0],
        mTBILL,
        redemptionVaultWithUSTB,
        100,
      );
      await addPaymentTokenTest(
        { vault: redemptionVaultWithUSTB, owner },
        stableCoins.usdc,
        dataFeed.address,
        0,
        true,
      );

      await redeemRequestTest(
        {
          redemptionVault: redemptionVaultWithUSTB,
          owner,
          mTBILL,
          mTokenToUsdDataFeed,
          customRecipient,
        },
        stableCoins.usdc,
        100,
        {
          from: regularAccounts[0],
        },
      );
    });

    it('redeem request 100 mTBILL when other fn overload is paused', async () => {
      const {
        owner,
        redemptionVaultWithUSTB,
        stableCoins,
        mTBILL,
        mTokenToUsdDataFeed,
        regularAccounts,
        dataFeed,
      } = await loadFixture(defaultDeploy);

      await pauseVaultFn(
        redemptionVaultWithUSTB,
        encodeFnSelector('redeemRequest(address,uint256,address)'),
      );
      await mintToken(stableCoins.usdc, redemptionVaultWithUSTB, 100000);
      await mintToken(mTBILL, regularAccounts[0], 100);
      await approveBase18(
        regularAccounts[0],
        mTBILL,
        redemptionVaultWithUSTB,
        100,
      );
      await addPaymentTokenTest(
        { vault: redemptionVaultWithUSTB, owner },
        stableCoins.usdc,
        dataFeed.address,
        0,
        true,
      );

      await redeemRequestTest(
        {
          redemptionVault: redemptionVaultWithUSTB,
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

  describe('redeemFiatRequest()', () => {
    it('should fail: when trying to redeem 0 amount', async () => {
      const {
        owner,
        redemptionVaultWithUSTB: redemptionVault,
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
        redemptionVaultWithUSTB: redemptionVault,
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
        redemptionVaultWithUSTB: redemptionVault,
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
        redemptionVaultWithUSTB: redemptionVault,
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
        redemptionVaultWithUSTB: redemptionVault,
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
        redemptionVaultWithUSTB: redemptionVault,
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
        redemptionVaultWithUSTB: redemptionVault,
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
      const {
        owner,
        redemptionVaultWithUSTB: redemptionVault,
        mTBILL,
        mTokenToUsdDataFeed,
      } = await loadFixture(defaultDeploy);

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
        redemptionVaultWithUSTB: redemptionVault,
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
        redemptionVaultWithUSTB: redemptionVault,
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
        redemptionVaultWithUSTB: redemptionVault,
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
        redemptionVaultWithUSTB: redemptionVault,
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
        redemptionVaultWithUSTB: redemptionVault,
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
        redemptionVaultWithUSTB: redemptionVault,
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
        redemptionVaultWithUSTB: redemptionVault,
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
      const {
        redemptionVaultWithUSTB: redemptionVault,
        regularAccounts,
        mTokenToUsdDataFeed,
        mTBILL,
      } = await loadFixture(defaultDeploy);
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
        redemptionVaultWithUSTB: redemptionVault,
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
        redemptionVaultWithUSTB: redemptionVault,
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
        redemptionVaultWithUSTB: redemptionVault,
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
        redemptionVaultWithUSTB: redemptionVault,
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
      const {
        redemptionVaultWithUSTB: redemptionVault,
        regularAccounts,
        mTokenToUsdDataFeed,
        mTBILL,
      } = await loadFixture(defaultDeploy);
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
        redemptionVaultWithUSTB: redemptionVault,
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
        redemptionVaultWithUSTB: redemptionVault,
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
        redemptionVaultWithUSTB: redemptionVault,
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
        redemptionVaultWithUSTB: redemptionVault,
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

  describe('rejectRequest()', async () => {
    it('should fail: call from address without vault admin role', async () => {
      const {
        redemptionVaultWithUSTB: redemptionVault,
        regularAccounts,
        mTokenToUsdDataFeed,
        mTBILL,
      } = await loadFixture(defaultDeploy);
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
        redemptionVaultWithUSTB: redemptionVault,
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
        redemptionVaultWithUSTB: redemptionVault,
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
        redemptionVaultWithUSTB: redemptionVault,
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

  describe('redeemRequest() complex', () => {
    it('should fail: when is paused', async () => {
      const {
        redemptionVaultWithUSTB: redemptionVault,
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
        redemptionVaultWithUSTB: redemptionVault,
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
        redemptionVaultWithUSTB: redemptionVault,
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
        redemptionVaultWithUSTB: redemptionVault,
        mockedAggregator,
        mockedAggregatorMToken,
        owner,
        mTBILL,
        stableCoins,
        dataFeed,
        requestRedeemer,
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
      await mintToken(stableCoins.dai, requestRedeemer, 100000);
      await approveBase18(
        requestRedeemer,
        stableCoins.dai,
        redemptionVault,
        100000,
      );
      await approveBase18(owner, mTBILL, redemptionVault, 100_000);

      await setRoundData({ mockedAggregator: mockedAggregatorMToken }, 1);
      await setMinAmountTest({ vault: redemptionVault, owner }, 10_000);

      await redeemRequestTest(
        { redemptionVault, owner, mTBILL, mTokenToUsdDataFeed },
        stableCoins.dai,
        10_000,
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
        redemptionVaultWithUSTB: redemptionVault,
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

  describe('redeemInstant() complex', () => {
    it('should fail: when is paused', async () => {
      const {
        redemptionVaultWithUSTB: redemptionVault,
        owner,
        mTBILL,
        stableCoins,
        regularAccounts,
        dataFeed,
        mTokenToUsdDataFeed,
      } = await loadFixture(defaultDeploy);

      await pauseVault(redemptionVault);
      await mintToken(stableCoins.usdc, redemptionVault, 100);
      await mintToken(mTBILL, regularAccounts[0], 100);
      await approveBase18(
        regularAccounts[0],
        stableCoins.usdc,
        redemptionVault,
        100,
      );
      await addPaymentTokenTest(
        { vault: redemptionVault, owner },
        stableCoins.usdc,
        dataFeed.address,
        0,
        true,
      );

      await redeemInstantTest(
        { redemptionVault, owner, mTBILL, mTokenToUsdDataFeed },
        stableCoins.usdc,
        100,
        {
          from: regularAccounts[0],
          revertMessage: 'Pausable: paused',
        },
      );
    });

    it('is on pause, but admin can use everything', async () => {
      const {
        redemptionVaultWithUSTB: redemptionVault,
        owner,
        mTBILL,
        stableCoins,
        dataFeed,
        mTokenToUsdDataFeed,
      } = await loadFixture(defaultDeploy);

      await pauseVault(redemptionVault);

      await mintToken(stableCoins.usdc, redemptionVault, 100);
      await mintToken(mTBILL, owner, 100);
      await approveBase18(owner, mTBILL, redemptionVault, 100);
      await addPaymentTokenTest(
        { vault: redemptionVault, owner },
        stableCoins.usdc,
        dataFeed.address,
        0,
        true,
      );

      await redeemInstantTest(
        { redemptionVault, owner, mTBILL, mTokenToUsdDataFeed },
        stableCoins.usdc,
        100,
        {
          revertMessage: 'Pausable: paused',
        },
      );
    });

    it('redeem 100 mtbill, when price is 5$ and contract balance 100 USDC and USTB to cover remaining amount, 125 mtbill when price is 5.1$, 114 mtbill when price is 5.4$', async () => {
      const {
        owner,
        mockedAggregator,
        redemptionVaultWithUSTB: redemptionVault,
        stableCoins,
        mTBILL,
        dataFeed,
        mTokenToUsdDataFeed,
        mockedAggregatorMToken,
        ustbToken,
        ustbRedemption,
      } = await loadFixture(defaultDeploy);

      await ustbRedemption.setChainlinkData(parseUnits('1', 8), false); // Set USTB price to $1

      await mintToken(mTBILL, owner, 100 + 125 + 114);

      await mintToken(stableCoins.usdc, redemptionVault, 100);
      await mintToken(ustbToken, redemptionVault, 100000);

      await approveBase18(owner, mTBILL, redemptionVault, 100 + 125 + 114);

      await addPaymentTokenTest(
        { vault: redemptionVault, owner },
        stableCoins.usdc,
        dataFeed.address,
        0,
        true,
      );

      await ustbRedemption.setMaxUstbRedemptionAmount(parseUnits('10000', 6));

      await setRoundData({ mockedAggregator: mockedAggregatorMToken }, 5);
      await setRoundData({ mockedAggregator }, 1.04);
      await redeemInstantTest(
        { redemptionVault, owner, mTBILL, mTokenToUsdDataFeed },
        stableCoins.usdc,
        100,
      );

      await setRoundData({ mockedAggregator }, 1);
      await setRoundData({ mockedAggregator: mockedAggregatorMToken }, 5.1);
      await redeemInstantTest(
        { redemptionVault, owner, mTBILL, mTokenToUsdDataFeed },
        stableCoins.usdc,
        125,
      );

      await setRoundData({ mockedAggregator }, 1.01);
      await setRoundData({ mockedAggregator: mockedAggregatorMToken }, 5.4);
      await redeemInstantTest(
        { redemptionVault, owner, mTBILL, mTokenToUsdDataFeed },
        stableCoins.usdc,
        114,
      );
    });
  });
});
