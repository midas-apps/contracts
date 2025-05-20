import { loadFixture } from '@nomicfoundation/hardhat-network-helpers';
import { expect } from 'chai';
import { constants } from 'ethers';
import { parseUnits } from 'ethers/lib/utils';
import { ethers } from 'hardhat';

import { acErrors, blackList, greenList } from './common/ac.helpers';
import {
  approveBase18,
  mintToken,
  pauseVault,
  pauseVaultFn,
} from './common/common.helpers';
import { setRoundData } from './common/data-feed.helpers';
import { defaultDeploy } from './common/fixtures';
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
  setMinBuidlToRedeem,
} from './common/manageable-vault.helpers';
import {
  approveRedeemRequestTest,
  redeemFiatRequestTest,
  redeemInstantTest,
  redeemRequestTest,
  rejectRedeemRequestTest,
  safeApproveRedeemRequestTest,
  setFiatAdditionalFeeTest,
  setMinFiatRedeemAmountTest,
} from './common/redemption-vault.helpers';
import { sanctionUser } from './common/with-sanctions-list.helpers';

import { encodeFnSelector } from '../helpers/utils';
import {
  // eslint-disable-next-line camelcase
  EUsdRedemptionVaultWithBUIDL__factory,
  // eslint-disable-next-line camelcase
  ManageableVaultTester__factory,
  // eslint-disable-next-line camelcase
  MBasisRedemptionVaultWithBUIDL__factory,
} from '../typechain-types';

describe('RedemptionVaultWithBUIDL', function () {
  it('deployment', async () => {
    const {
      redemptionVaultWithBUIDL,
      buidlRedemption,
      mTBILL,
      tokensReceiver,
      feeReceiver,
      mTokenToUsdDataFeed,
      roles,
    } = await loadFixture(defaultDeploy);

    expect(await redemptionVaultWithBUIDL.mToken()).eq(mTBILL.address);

    expect(await redemptionVaultWithBUIDL.ONE_HUNDRED_PERCENT()).eq('10000');

    expect(await redemptionVaultWithBUIDL.paused()).eq(false);

    expect(await redemptionVaultWithBUIDL.tokensReceiver()).eq(
      tokensReceiver.address,
    );
    expect(await redemptionVaultWithBUIDL.feeReceiver()).eq(
      feeReceiver.address,
    );

    expect(await redemptionVaultWithBUIDL.minAmount()).eq(1000);
    expect(await redemptionVaultWithBUIDL.minFiatRedeemAmount()).eq(1000);

    expect(await redemptionVaultWithBUIDL.instantFee()).eq('100');

    expect(await redemptionVaultWithBUIDL.instantDailyLimit()).eq(
      parseUnits('100000'),
    );

    expect(await redemptionVaultWithBUIDL.mTokenDataFeed()).eq(
      mTokenToUsdDataFeed.address,
    );
    expect(await redemptionVaultWithBUIDL.variationTolerance()).eq(1);

    expect(await redemptionVaultWithBUIDL.vaultRole()).eq(
      roles.tokenRoles.mTBILL.redemptionVaultAdmin,
    );

    expect(await redemptionVaultWithBUIDL.MANUAL_FULLFILMENT_TOKEN()).eq(
      ethers.constants.AddressZero,
    );

    expect(await redemptionVaultWithBUIDL.buidlRedemption()).eq(
      buidlRedemption.address,
    );
    expect(await redemptionVaultWithBUIDL.minBuidlToRedeem()).eq(
      parseUnits('250000', 6),
    );
  });

  it('MBasisRedemptionVault', async () => {
    const fixture = await loadFixture(defaultDeploy);

    const tester = await new MBasisRedemptionVaultWithBUIDL__factory(
      fixture.owner,
    ).deploy();

    expect(await tester.vaultRole()).eq(
      await tester.M_BASIS_REDEMPTION_VAULT_ADMIN_ROLE(),
    );
  });

  it('EUsdRedemptionVault', async () => {
    const fixture = await loadFixture(defaultDeploy);

    const tester = await new EUsdRedemptionVaultWithBUIDL__factory(
      fixture.owner,
    ).deploy();

    expect(await tester.vaultRole()).eq(
      await tester.E_USD_REDEMPTION_VAULT_ADMIN_ROLE(),
    );

    expect(await tester.greenlistedRole()).eq(
      await tester.E_USD_GREENLISTED_ROLE(),
    );
  });

  describe('initialization', () => {
    it('should fail: cal; initialize() when already initialized', async () => {
      const { redemptionVaultWithBUIDL } = await loadFixture(defaultDeploy);

      await expect(
        redemptionVaultWithBUIDL[
          'initialize(address,(address,address),(address,address),(uint256,uint256),address,uint256,uint256,(uint256,uint256,uint256),address,address,uint256,uint256)'
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

  describe('setMinBuidlToRedeem()', () => {
    it('should fail: call from address without REDEMPTION_VAULT_ADMIN_ROLE role', async () => {
      const { owner, redemptionVaultWithBUIDL, regularAccounts } =
        await loadFixture(defaultDeploy);

      await setMinBuidlToRedeem(
        { vault: redemptionVaultWithBUIDL, owner },
        parseUnits('100000', 6),
        {
          from: regularAccounts[0],
          revertMessage: acErrors.WMAC_HASNT_ROLE,
        },
      );
    });

    it('call from address with REDEMPTION_VAULT_ADMIN_ROLE role', async () => {
      const { owner, redemptionVaultWithBUIDL } = await loadFixture(
        defaultDeploy,
      );
      await setMinBuidlToRedeem(
        { vault: redemptionVaultWithBUIDL, owner },
        parseUnits('100000', 6),
      );
    });
  });

  describe('setMinAmount()', () => {
    it('should fail: call from address without DEPOSIT_VAULT_ADMIN_ROLE role', async () => {
      const { owner, redemptionVaultWithBUIDL, regularAccounts } =
        await loadFixture(defaultDeploy);

      await setMinAmountTest({ vault: redemptionVaultWithBUIDL, owner }, 1.1, {
        from: regularAccounts[0],
        revertMessage: acErrors.WMAC_HASNT_ROLE,
      });
    });

    it('call from address with DEPOSIT_VAULT_ADMIN_ROLE role', async () => {
      const { owner, redemptionVaultWithBUIDL } = await loadFixture(
        defaultDeploy,
      );
      await setMinAmountTest({ vault: redemptionVaultWithBUIDL, owner }, 1.1);
    });
  });

  describe('setMinFiatRedeemAmount()', () => {
    it('should fail: call from address without REDEMPTION_VAULT_ADMIN_ROLE role', async () => {
      const { owner, redemptionVaultWithBUIDL, regularAccounts } =
        await loadFixture(defaultDeploy);

      await setMinFiatRedeemAmountTest(
        { redemptionVault: redemptionVaultWithBUIDL, owner },
        1.1,
        {
          from: regularAccounts[0],
          revertMessage: acErrors.WMAC_HASNT_ROLE,
        },
      );
    });

    it('call from address with REDEMPTION_VAULT_ADMIN_ROLE role', async () => {
      const { owner, redemptionVaultWithBUIDL } = await loadFixture(
        defaultDeploy,
      );
      await setMinFiatRedeemAmountTest(
        { redemptionVault: redemptionVaultWithBUIDL, owner },
        1.1,
      );
    });
  });

  describe('setFiatAdditionalFee()', () => {
    it('should fail: call from address without REDEMPTION_VAULT_ADMIN_ROLE role', async () => {
      const { owner, redemptionVaultWithBUIDL, regularAccounts } =
        await loadFixture(defaultDeploy);

      await setFiatAdditionalFeeTest(
        { redemptionVault: redemptionVaultWithBUIDL, owner },
        100,
        {
          from: regularAccounts[0],
          revertMessage: acErrors.WMAC_HASNT_ROLE,
        },
      );
    });

    it('call from address with REDEMPTION_VAULT_ADMIN_ROLE role', async () => {
      const { owner, redemptionVaultWithBUIDL } = await loadFixture(
        defaultDeploy,
      );
      await setFiatAdditionalFeeTest(
        { redemptionVault: redemptionVaultWithBUIDL, owner },
        100,
      );
    });
  });

  describe('setInstantDailyLimit()', () => {
    it('should fail: call from address without REDEMPTION_VAULT_ADMIN_ROLE role', async () => {
      const { owner, redemptionVaultWithBUIDL, regularAccounts } =
        await loadFixture(defaultDeploy);

      await setInstantDailyLimitTest(
        { vault: redemptionVaultWithBUIDL, owner },
        parseUnits('1000'),
        {
          from: regularAccounts[0],
          revertMessage: acErrors.WMAC_HASNT_ROLE,
        },
      );
    });

    it('should fail: try to set 0 limit', async () => {
      const { owner, redemptionVaultWithBUIDL } = await loadFixture(
        defaultDeploy,
      );

      await setInstantDailyLimitTest(
        { vault: redemptionVaultWithBUIDL, owner },
        constants.Zero,
        {
          revertMessage: 'MV: limit zero',
        },
      );
    });

    it('call from address with REDEMPTION_VAULT_ADMIN_ROLE role', async () => {
      const { owner, redemptionVaultWithBUIDL } = await loadFixture(
        defaultDeploy,
      );
      await setInstantDailyLimitTest(
        { vault: redemptionVaultWithBUIDL, owner },
        parseUnits('1000'),
      );
    });
  });

  describe('addPaymentToken()', () => {
    it('should fail: call from address without REDEMPTION_VAULT_ADMIN_ROLE role', async () => {
      const { redemptionVaultWithBUIDL, regularAccounts, owner } =
        await loadFixture(defaultDeploy);
      await addPaymentTokenTest(
        { vault: redemptionVaultWithBUIDL, owner },
        ethers.constants.AddressZero,
        ethers.constants.AddressZero,
        0,
        true,
        { revertMessage: acErrors.WMAC_HASNT_ROLE, from: regularAccounts[0] },
      );
    });

    it('should fail: when token is already added', async () => {
      const { redemptionVaultWithBUIDL, stableCoins, owner, dataFeed } =
        await loadFixture(defaultDeploy);
      await addPaymentTokenTest(
        { vault: redemptionVaultWithBUIDL, owner },
        stableCoins.dai,
        dataFeed.address,
        0,
        true,
      );
      await addPaymentTokenTest(
        { vault: redemptionVaultWithBUIDL, owner },
        stableCoins.dai,
        dataFeed.address,
        0,
        true,
        {
          revertMessage: 'MV: already added',
        },
      );
    });

    it('should fail: when token dataFeed address zero', async () => {
      const { redemptionVaultWithBUIDL, stableCoins, owner } =
        await loadFixture(defaultDeploy);
      await addPaymentTokenTest(
        { vault: redemptionVaultWithBUIDL, owner },
        stableCoins.dai,
        constants.AddressZero,
        0,
        true,
        {
          revertMessage: 'zero address',
        },
      );
    });

    it('call from address with REDEMPTION_VAULT_ADMIN_ROLE role', async () => {
      const { redemptionVaultWithBUIDL, stableCoins, owner, dataFeed } =
        await loadFixture(defaultDeploy);
      await addPaymentTokenTest(
        { vault: redemptionVaultWithBUIDL, owner },
        stableCoins.dai,
        dataFeed.address,
        0,
        true,
      );
    });

    it('call from address with REDEMPTION_VAULT_ADMIN_ROLE role and add 3 options on a row', async () => {
      const { redemptionVaultWithBUIDL, stableCoins, owner, dataFeed } =
        await loadFixture(defaultDeploy);

      await addPaymentTokenTest(
        { vault: redemptionVaultWithBUIDL, owner },
        stableCoins.dai,
        dataFeed.address,
        0,
        true,
      );
      await addPaymentTokenTest(
        { vault: redemptionVaultWithBUIDL, owner },
        stableCoins.usdc,
        dataFeed.address,
        0,
        true,
      );
      await addPaymentTokenTest(
        { vault: redemptionVaultWithBUIDL, owner },
        stableCoins.usdt,
        dataFeed.address,
        0,
        true,
      );
    });
  });

  describe('addWaivedFeeAccount()', () => {
    it('should fail: call from address without REDEMPTION_VAULT_ADMIN_ROLE role', async () => {
      const { redemptionVaultWithBUIDL, regularAccounts, owner } =
        await loadFixture(defaultDeploy);
      await addWaivedFeeAccountTest(
        { vault: redemptionVaultWithBUIDL, owner },
        ethers.constants.AddressZero,
        { revertMessage: acErrors.WMAC_HASNT_ROLE, from: regularAccounts[0] },
      );
    });
    it('should fail: if account fee already waived', async () => {
      const { redemptionVaultWithBUIDL, owner } = await loadFixture(
        defaultDeploy,
      );
      await addWaivedFeeAccountTest(
        { vault: redemptionVaultWithBUIDL, owner },
        owner.address,
      );
      await addWaivedFeeAccountTest(
        { vault: redemptionVaultWithBUIDL, owner },
        owner.address,
        { revertMessage: 'MV: already added' },
      );
    });

    it('call from address with REDEMPTION_VAULT_ADMIN_ROLE role', async () => {
      const { redemptionVaultWithBUIDL, owner } = await loadFixture(
        defaultDeploy,
      );
      await addWaivedFeeAccountTest(
        { vault: redemptionVaultWithBUIDL, owner },
        owner.address,
      );
    });
  });

  describe('removeWaivedFeeAccount()', () => {
    it('should fail: call from address without REDEMPTION_VAULT_ADMIN_ROLE role', async () => {
      const { redemptionVaultWithBUIDL, regularAccounts, owner } =
        await loadFixture(defaultDeploy);
      await removeWaivedFeeAccountTest(
        { vault: redemptionVaultWithBUIDL, owner },
        ethers.constants.AddressZero,
        { revertMessage: acErrors.WMAC_HASNT_ROLE, from: regularAccounts[0] },
      );
    });
    it('should fail: if account not found in restriction', async () => {
      const { redemptionVaultWithBUIDL, owner } = await loadFixture(
        defaultDeploy,
      );
      await removeWaivedFeeAccountTest(
        { vault: redemptionVaultWithBUIDL, owner },
        owner.address,
        { revertMessage: 'MV: not found' },
      );
    });

    it('call from address with REDEMPTION_VAULT_ADMIN_ROLE role', async () => {
      const { redemptionVaultWithBUIDL, owner } = await loadFixture(
        defaultDeploy,
      );
      await addWaivedFeeAccountTest(
        { vault: redemptionVaultWithBUIDL, owner },
        owner.address,
      );
      await removeWaivedFeeAccountTest(
        { vault: redemptionVaultWithBUIDL, owner },
        owner.address,
      );
    });
  });

  describe('setFee()', () => {
    it('should fail: call from address without REDEMPTION_VAULT_ADMIN_ROLE role', async () => {
      const { redemptionVaultWithBUIDL, regularAccounts, owner } =
        await loadFixture(defaultDeploy);
      await setInstantFeeTest(
        { vault: redemptionVaultWithBUIDL, owner },
        ethers.constants.Zero,
        { revertMessage: acErrors.WMAC_HASNT_ROLE, from: regularAccounts[0] },
      );
    });

    it('should fail: if new value greater then 100%', async () => {
      const { redemptionVaultWithBUIDL, owner } = await loadFixture(
        defaultDeploy,
      );
      await setInstantFeeTest(
        { vault: redemptionVaultWithBUIDL, owner },
        10001,
        {
          revertMessage: 'fee > 100%',
        },
      );
    });

    it('call from address with REDEMPTION_VAULT_ADMIN_ROLE role', async () => {
      const { redemptionVaultWithBUIDL, owner } = await loadFixture(
        defaultDeploy,
      );
      await setInstantFeeTest({ vault: redemptionVaultWithBUIDL, owner }, 100);
    });
  });

  describe('setVariabilityTolerance()', () => {
    it('should fail: call from address without REDEMPTION_VAULT_ADMIN_ROLE role', async () => {
      const { redemptionVaultWithBUIDL, regularAccounts, owner } =
        await loadFixture(defaultDeploy);
      await setVariabilityToleranceTest(
        { vault: redemptionVaultWithBUIDL, owner },
        ethers.constants.Zero,
        { revertMessage: acErrors.WMAC_HASNT_ROLE, from: regularAccounts[0] },
      );
    });
    it('should fail: if new value zero', async () => {
      const { redemptionVaultWithBUIDL, owner } = await loadFixture(
        defaultDeploy,
      );
      await setVariabilityToleranceTest(
        { vault: redemptionVaultWithBUIDL, owner },
        ethers.constants.Zero,
        { revertMessage: 'fee == 0' },
      );
    });

    it('should fail: if new value greater then 100%', async () => {
      const { redemptionVaultWithBUIDL, owner } = await loadFixture(
        defaultDeploy,
      );
      await setVariabilityToleranceTest(
        { vault: redemptionVaultWithBUIDL, owner },
        10001,
        { revertMessage: 'fee > 100%' },
      );
    });

    it('call from address with REDEMPTION_VAULT_ADMIN_ROLE role', async () => {
      const { redemptionVaultWithBUIDL, owner } = await loadFixture(
        defaultDeploy,
      );
      await setVariabilityToleranceTest(
        { vault: redemptionVaultWithBUIDL, owner },
        100,
      );
    });
  });

  describe('removePaymentToken()', () => {
    it('should fail: call from address without REDEMPTION_VAULT_ADMIN_ROLE role', async () => {
      const { redemptionVaultWithBUIDL, regularAccounts, owner } =
        await loadFixture(defaultDeploy);
      await removePaymentTokenTest(
        { vault: redemptionVaultWithBUIDL, owner },
        ethers.constants.AddressZero,
        { revertMessage: acErrors.WMAC_HASNT_ROLE, from: regularAccounts[0] },
      );
    });

    it('should fail: when token is not exists', async () => {
      const { owner, redemptionVaultWithBUIDL, stableCoins } =
        await loadFixture(defaultDeploy);
      await removePaymentTokenTest(
        { vault: redemptionVaultWithBUIDL, owner },
        stableCoins.dai.address,
        { revertMessage: 'MV: not exists' },
      );
    });

    it('call from address with REDEMPTION_VAULT_ADMIN_ROLE role', async () => {
      const { redemptionVaultWithBUIDL, stableCoins, owner, dataFeed } =
        await loadFixture(defaultDeploy);
      await addPaymentTokenTest(
        { vault: redemptionVaultWithBUIDL, owner },
        stableCoins.dai,
        dataFeed.address,
        0,
        true,
      );
      await removePaymentTokenTest(
        { vault: redemptionVaultWithBUIDL, owner },
        stableCoins.dai.address,
      );
    });

    it('call from address with REDEMPTION_VAULT_ADMIN_ROLE role and add 3 options on a row', async () => {
      const { redemptionVaultWithBUIDL, owner, stableCoins, dataFeed } =
        await loadFixture(defaultDeploy);

      await addPaymentTokenTest(
        { vault: redemptionVaultWithBUIDL, owner },
        stableCoins.dai,
        dataFeed.address,
        0,
        true,
      );
      await addPaymentTokenTest(
        { vault: redemptionVaultWithBUIDL, owner },
        stableCoins.usdc,
        dataFeed.address,
        0,
        true,
      );
      await addPaymentTokenTest(
        { vault: redemptionVaultWithBUIDL, owner },
        stableCoins.usdt,
        dataFeed.address,
        0,
        true,
      );

      await removePaymentTokenTest(
        { vault: redemptionVaultWithBUIDL, owner },
        stableCoins.dai.address,
      );
      await removePaymentTokenTest(
        { vault: redemptionVaultWithBUIDL, owner },
        stableCoins.usdc.address,
      );
      await removePaymentTokenTest(
        { vault: redemptionVaultWithBUIDL, owner },
        stableCoins.usdt.address,
      );

      await removePaymentTokenTest(
        { vault: redemptionVaultWithBUIDL, owner },
        stableCoins.usdt.address,
        { revertMessage: 'MV: not exists' },
      );
    });
  });

  describe('withdrawToken()', () => {
    it('should fail: call from address without REDEMPTION_VAULT_ADMIN_ROLE role', async () => {
      const { redemptionVaultWithBUIDL, regularAccounts, owner } =
        await loadFixture(defaultDeploy);
      await withdrawTest(
        { vault: redemptionVaultWithBUIDL, owner },
        ethers.constants.AddressZero,
        0,
        ethers.constants.AddressZero,
        { revertMessage: acErrors.WMAC_HASNT_ROLE, from: regularAccounts[0] },
      );
    });

    it('should fail: when there is no token in vault', async () => {
      const { owner, redemptionVaultWithBUIDL, regularAccounts, stableCoins } =
        await loadFixture(defaultDeploy);
      await withdrawTest(
        { vault: redemptionVaultWithBUIDL, owner },
        stableCoins.dai,
        1,
        regularAccounts[0],
        { revertMessage: 'ERC20: transfer amount exceeds balance' },
      );
    });

    it('call from address with REDEMPTION_VAULT_ADMIN_ROLE role', async () => {
      const { redemptionVaultWithBUIDL, regularAccounts, stableCoins, owner } =
        await loadFixture(defaultDeploy);
      await mintToken(stableCoins.dai, redemptionVaultWithBUIDL, 1);
      await withdrawTest(
        { vault: redemptionVaultWithBUIDL, owner },
        stableCoins.dai,
        1,
        regularAccounts[0],
      );
    });
  });

  describe('freeFromMinAmount()', async () => {
    it('should fail: call from address without vault admin role', async () => {
      const { redemptionVaultWithBUIDL, regularAccounts } = await loadFixture(
        defaultDeploy,
      );
      await expect(
        redemptionVaultWithBUIDL
          .connect(regularAccounts[0])
          .freeFromMinAmount(regularAccounts[1].address, true),
      ).to.be.revertedWith('WMAC: hasnt role');
    });
    it('should not fail', async () => {
      const { redemptionVaultWithBUIDL, regularAccounts } = await loadFixture(
        defaultDeploy,
      );
      await expect(
        redemptionVaultWithBUIDL.freeFromMinAmount(
          regularAccounts[0].address,
          true,
        ),
      ).to.not.reverted;

      expect(
        await redemptionVaultWithBUIDL.isFreeFromMinAmount(
          regularAccounts[0].address,
        ),
      ).to.eq(true);
    });
    it('should fail: already in list', async () => {
      const { redemptionVaultWithBUIDL, regularAccounts } = await loadFixture(
        defaultDeploy,
      );
      await expect(
        redemptionVaultWithBUIDL.freeFromMinAmount(
          regularAccounts[0].address,
          true,
        ),
      ).to.not.reverted;

      expect(
        await redemptionVaultWithBUIDL.isFreeFromMinAmount(
          regularAccounts[0].address,
        ),
      ).to.eq(true);

      await expect(
        redemptionVaultWithBUIDL.freeFromMinAmount(
          regularAccounts[0].address,
          true,
        ),
      ).to.revertedWith('DV: already free');
    });
  });

  describe('changeTokenAllowance()', () => {
    it('should fail: call from address without REDEMPTION_VAULT_ADMIN_ROLE role', async () => {
      const { redemptionVaultWithBUIDL, regularAccounts, owner } =
        await loadFixture(defaultDeploy);
      await changeTokenAllowanceTest(
        { vault: redemptionVaultWithBUIDL, owner },
        ethers.constants.AddressZero,
        0,
        { revertMessage: acErrors.WMAC_HASNT_ROLE, from: regularAccounts[0] },
      );
    });
    it('should fail: token not exist', async () => {
      const { redemptionVaultWithBUIDL, owner, stableCoins } =
        await loadFixture(defaultDeploy);
      await changeTokenAllowanceTest(
        { vault: redemptionVaultWithBUIDL, owner },
        stableCoins.dai.address,
        0,
        { revertMessage: 'MV: token not exists' },
      );
    });
    it('should fail: allowance zero', async () => {
      const { redemptionVaultWithBUIDL, owner, stableCoins, dataFeed } =
        await loadFixture(defaultDeploy);
      await addPaymentTokenTest(
        { vault: redemptionVaultWithBUIDL, owner },
        stableCoins.dai,
        dataFeed.address,
        0,
        true,
      );
      await changeTokenAllowanceTest(
        { vault: redemptionVaultWithBUIDL, owner },
        stableCoins.dai.address,
        0,
        { revertMessage: 'MV: zero allowance' },
      );
    });
    it('should fail: if mint exceed allowance', async () => {
      const {
        redemptionVaultWithBUIDL,
        stableCoins,
        owner,
        dataFeed,
        mTBILL,
        mTokenToUsdDataFeed,
      } = await loadFixture(defaultDeploy);
      await mintToken(mTBILL, owner, 100000);
      await mintToken(stableCoins.usdc, redemptionVaultWithBUIDL, 100000);
      await approveBase18(owner, mTBILL, redemptionVaultWithBUIDL, 100000);
      await addPaymentTokenTest(
        { vault: redemptionVaultWithBUIDL, owner },
        stableCoins.usdc,
        dataFeed.address,
        0,
        true,
      );
      await changeTokenAllowanceTest(
        { vault: redemptionVaultWithBUIDL, owner },
        stableCoins.usdc.address,
        100,
      );

      await redeemInstantTest(
        {
          redemptionVault: redemptionVaultWithBUIDL,
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
      const { redemptionVaultWithBUIDL, owner, stableCoins, dataFeed } =
        await loadFixture(defaultDeploy);
      await addPaymentTokenTest(
        { vault: redemptionVaultWithBUIDL, owner },
        stableCoins.dai,
        dataFeed.address,
        0,
        true,
      );
      await changeTokenAllowanceTest(
        { vault: redemptionVaultWithBUIDL, owner },
        stableCoins.dai.address,
        100000000,
      );
    });
    it('should decrease if allowance < UINT_MAX', async () => {
      const {
        redemptionVaultWithBUIDL,
        stableCoins,
        owner,
        dataFeed,
        mTBILL,
        mTokenToUsdDataFeed,
        mockedAggregator,
        mockedAggregatorMToken,
      } = await loadFixture(defaultDeploy);
      await mintToken(stableCoins.usdc, redemptionVaultWithBUIDL, 100000);
      await mintToken(mTBILL, owner, 100000);
      await approveBase18(owner, mTBILL, redemptionVaultWithBUIDL, 100000);

      await addPaymentTokenTest(
        { vault: redemptionVaultWithBUIDL, owner },
        stableCoins.usdc,
        dataFeed.address,
        0,
        true,
      );
      await changeTokenAllowanceTest(
        { vault: redemptionVaultWithBUIDL, owner },
        stableCoins.usdc.address,
        parseUnits('1000'),
      );
      await setRoundData({ mockedAggregator }, 1);
      await setRoundData({ mockedAggregator: mockedAggregatorMToken }, 1);

      const tokenConfigBefore = await redemptionVaultWithBUIDL.tokensConfig(
        stableCoins.usdc.address,
      );

      await redeemInstantTest(
        {
          redemptionVault: redemptionVaultWithBUIDL,
          owner,
          mTBILL,
          mTokenToUsdDataFeed,
        },
        stableCoins.usdc,
        999,
      );

      const tokenConfigAfter = await redemptionVaultWithBUIDL.tokensConfig(
        stableCoins.usdc.address,
      );

      expect(tokenConfigBefore.allowance.sub(tokenConfigAfter.allowance)).eq(
        parseUnits('999'),
      );
    });
    it('should not decrease if allowance = UINT_MAX', async () => {
      const {
        redemptionVaultWithBUIDL,
        stableCoins,
        owner,
        dataFeed,
        mTBILL,
        mTokenToUsdDataFeed,
        mockedAggregator,
        mockedAggregatorMToken,
      } = await loadFixture(defaultDeploy);
      await mintToken(stableCoins.usdc, redemptionVaultWithBUIDL, 100000);
      await mintToken(mTBILL, owner, 100000);
      await approveBase18(owner, mTBILL, redemptionVaultWithBUIDL, 100000);

      await addPaymentTokenTest(
        { vault: redemptionVaultWithBUIDL, owner },
        stableCoins.usdc,
        dataFeed.address,
        0,
        true,
      );
      await changeTokenAllowanceTest(
        { vault: redemptionVaultWithBUIDL, owner },
        stableCoins.usdc.address,
        constants.MaxUint256,
      );

      await setRoundData({ mockedAggregator }, 1);
      await setRoundData({ mockedAggregator: mockedAggregatorMToken }, 1);

      const tokenConfigBefore = await redemptionVaultWithBUIDL.tokensConfig(
        stableCoins.usdc.address,
      );

      await redeemInstantTest(
        {
          redemptionVault: redemptionVaultWithBUIDL,
          owner,
          mTBILL,
          mTokenToUsdDataFeed,
        },
        stableCoins.usdc,
        999,
      );

      const tokenConfigAfter = await redemptionVaultWithBUIDL.tokensConfig(
        stableCoins.usdc.address,
      );

      expect(tokenConfigBefore.allowance).eq(tokenConfigAfter.allowance);
    });
  });

  describe('changeTokenFee()', () => {
    it('should fail: call from address without REDEMPTION_VAULT_ADMIN_ROLE role', async () => {
      const { redemptionVaultWithBUIDL, regularAccounts, owner } =
        await loadFixture(defaultDeploy);
      await changeTokenFeeTest(
        { vault: redemptionVaultWithBUIDL, owner },
        ethers.constants.AddressZero,
        0,
        { revertMessage: acErrors.WMAC_HASNT_ROLE, from: regularAccounts[0] },
      );
    });
    it('should fail: token not exist', async () => {
      const { redemptionVaultWithBUIDL, owner, stableCoins } =
        await loadFixture(defaultDeploy);
      await changeTokenFeeTest(
        { vault: redemptionVaultWithBUIDL, owner },
        stableCoins.dai.address,
        0,
        { revertMessage: 'MV: token not exists' },
      );
    });
    it('should fail: fee > 100%', async () => {
      const { redemptionVaultWithBUIDL, owner, stableCoins, dataFeed } =
        await loadFixture(defaultDeploy);
      await addPaymentTokenTest(
        { vault: redemptionVaultWithBUIDL, owner },
        stableCoins.dai,
        dataFeed.address,
        0,
        true,
      );
      await changeTokenFeeTest(
        { vault: redemptionVaultWithBUIDL, owner },
        stableCoins.dai.address,
        10001,
        { revertMessage: 'fee > 100%' },
      );
    });
    it('call from address with REDEMPTION_VAULT_ADMIN_ROLE role', async () => {
      const { redemptionVaultWithBUIDL, owner, stableCoins, dataFeed } =
        await loadFixture(defaultDeploy);
      await addPaymentTokenTest(
        { vault: redemptionVaultWithBUIDL, owner },
        stableCoins.dai,
        dataFeed.address,
        0,
        true,
      );
      await changeTokenFeeTest(
        { vault: redemptionVaultWithBUIDL, owner },
        stableCoins.dai.address,
        100,
      );
    });
  });

  describe('redeemInstant()', () => {
    it('should fail: when there is no token in vault', async () => {
      const {
        owner,
        redemptionVaultWithBUIDL,
        stableCoins,
        mTBILL,
        mTokenToUsdDataFeed,
      } = await loadFixture(defaultDeploy);

      await redeemInstantTest(
        {
          redemptionVault: redemptionVaultWithBUIDL,
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
        redemptionVaultWithBUIDL,
        stableCoins,
        mTBILL,
        dataFeed,
        mTokenToUsdDataFeed,
      } = await loadFixture(defaultDeploy);
      await addPaymentTokenTest(
        { vault: redemptionVaultWithBUIDL, owner },
        stableCoins.usdc,
        dataFeed.address,
        0,
        true,
      );
      await redeemInstantTest(
        {
          redemptionVault: redemptionVaultWithBUIDL,
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
        redemptionVaultWithBUIDL,
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
        redemptionVaultWithBUIDL,
        100,
      );
      await addPaymentTokenTest(
        { vault: redemptionVaultWithBUIDL, owner },
        stableCoins.dai,
        dataFeed.address,
        0,
        true,
      );
      const selector = encodeFnSelector(
        'redeemInstant(address,uint256,uint256)',
      );
      await pauseVaultFn(redemptionVaultWithBUIDL, selector);
      await redeemInstantTest(
        {
          redemptionVault: redemptionVaultWithBUIDL,
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
        redemptionVaultWithBUIDL,
        stableCoins,
        mTBILL,
        dataFeed,
        mTokenToUsdDataFeed,
      } = await loadFixture(defaultDeploy);

      await mintToken(mTBILL, owner, 100);
      await addPaymentTokenTest(
        { vault: redemptionVaultWithBUIDL, owner },
        stableCoins.usdc,
        dataFeed.address,
        0,
        true,
      );
      await redeemInstantTest(
        {
          redemptionVault: redemptionVaultWithBUIDL,
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
        redemptionVaultWithBUIDL,
        stableCoins,
        mTBILL,
        dataFeed,
        mTokenToUsdDataFeed,
      } = await loadFixture(defaultDeploy);

      await approveBase18(owner, mTBILL, redemptionVaultWithBUIDL, 100);
      await addPaymentTokenTest(
        { vault: redemptionVaultWithBUIDL, owner },
        stableCoins.usdc,
        dataFeed.address,
        0,
        true,
      );
      await redeemInstantTest(
        {
          redemptionVault: redemptionVaultWithBUIDL,
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
        redemptionVaultWithBUIDL,
        stableCoins,
        mTBILL,
        dataFeed,
        mockedAggregator,
        mockedAggregatorMToken,
        mTokenToUsdDataFeed,
      } = await loadFixture(defaultDeploy);

      await approveBase18(
        owner,
        stableCoins.usdc,
        redemptionVaultWithBUIDL,
        10,
      );
      await addPaymentTokenTest(
        { vault: redemptionVaultWithBUIDL, owner },
        stableCoins.usdc,
        dataFeed.address,
        0,
        true,
      );
      await mintToken(mTBILL, owner, 100_000);
      await setRoundData({ mockedAggregator }, 0);
      await redeemInstantTest(
        {
          redemptionVault: redemptionVaultWithBUIDL,
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
          redemptionVault: redemptionVaultWithBUIDL,
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
        redemptionVaultWithBUIDL,
        mockedAggregator,
        owner,
        mTBILL,
        stableCoins,
        dataFeed,
        mTokenToUsdDataFeed,
      } = await loadFixture(defaultDeploy);
      await addPaymentTokenTest(
        { vault: redemptionVaultWithBUIDL, owner },
        stableCoins.usdc,
        dataFeed.address,
        0,
        true,
      );
      await setRoundData({ mockedAggregator }, 4);

      await mintToken(mTBILL, owner, 100_000);

      await approveBase18(owner, mTBILL, redemptionVaultWithBUIDL, 100_000);

      await redeemInstantTest(
        {
          redemptionVault: redemptionVaultWithBUIDL,
          owner,
          mTBILL,
          mTokenToUsdDataFeed,
          minAmount: parseUnits('1000000'),
        },
        stableCoins.usdc,
        99_999,
        {
          revertMessage: 'RVB: minReceiveAmount > actual',
        },
      );
    });

    it('should fail: call for amount < minAmount', async () => {
      const {
        redemptionVaultWithBUIDL,
        mockedAggregator,
        owner,
        mTBILL,
        stableCoins,
        dataFeed,
        mTokenToUsdDataFeed,
      } = await loadFixture(defaultDeploy);
      await addPaymentTokenTest(
        { vault: redemptionVaultWithBUIDL, owner },
        stableCoins.usdc,
        dataFeed.address,
        0,
        true,
      );
      await setRoundData({ mockedAggregator }, 1);

      await mintToken(mTBILL, owner, 100_000);
      await approveBase18(owner, mTBILL, redemptionVaultWithBUIDL, 100_000);

      await setMinAmountTest(
        { vault: redemptionVaultWithBUIDL, owner },
        100_000,
      );

      await redeemInstantTest(
        {
          redemptionVault: redemptionVaultWithBUIDL,
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
        redemptionVaultWithBUIDL,
        mockedAggregator,
        owner,
        mTBILL,
        stableCoins,
        dataFeed,
        mTokenToUsdDataFeed,
      } = await loadFixture(defaultDeploy);
      await addPaymentTokenTest(
        { vault: redemptionVaultWithBUIDL, owner },
        stableCoins.usdc,
        dataFeed.address,
        0,
        true,
      );
      await redeemInstantTest(
        {
          redemptionVault: redemptionVaultWithBUIDL,
          owner,
          mTBILL,
          mTokenToUsdDataFeed,
        },
        stableCoins.dai,
        99_999,
        {
          revertMessage: 'RVB: invalid token',
        },
      );
    });

    it('should fail: if exceed allowance of redeem by token', async () => {
      const {
        redemptionVaultWithBUIDL,
        mockedAggregator,
        owner,
        mTBILL,
        stableCoins,
        dataFeed,
        mTokenToUsdDataFeed,
      } = await loadFixture(defaultDeploy);
      await addPaymentTokenTest(
        { vault: redemptionVaultWithBUIDL, owner },
        stableCoins.usdc,
        dataFeed.address,
        0,
        true,
      );
      await setRoundData({ mockedAggregator }, 4);

      await mintToken(mTBILL, owner, 100_000);
      await changeTokenAllowanceTest(
        { vault: redemptionVaultWithBUIDL, owner },
        stableCoins.usdc.address,
        100,
      );
      await approveBase18(owner, mTBILL, redemptionVaultWithBUIDL, 100_000);

      await redeemInstantTest(
        {
          redemptionVault: redemptionVaultWithBUIDL,
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
        redemptionVaultWithBUIDL,
        mockedAggregator,
        owner,
        mTBILL,
        stableCoins,
        dataFeed,
        mTokenToUsdDataFeed,
      } = await loadFixture(defaultDeploy);
      await addPaymentTokenTest(
        { vault: redemptionVaultWithBUIDL, owner },
        stableCoins.usdc,
        dataFeed.address,
        0,
        true,
      );
      await setRoundData({ mockedAggregator }, 4);

      await mintToken(mTBILL, owner, 100_000);
      await setInstantDailyLimitTest(
        { vault: redemptionVaultWithBUIDL, owner },
        1000,
      );

      await approveBase18(owner, mTBILL, redemptionVaultWithBUIDL, 100_000);

      await redeemInstantTest(
        {
          redemptionVault: redemptionVaultWithBUIDL,
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
        redemptionVaultWithBUIDL,
        stableCoins,
        mTBILL,
        dataFeed,
        mTokenToUsdDataFeed,
      } = await loadFixture(defaultDeploy);

      await mintToken(mTBILL, owner, 100);
      await approveBase18(owner, mTBILL, redemptionVaultWithBUIDL, 100);
      await addPaymentTokenTest(
        { vault: redemptionVaultWithBUIDL, owner },
        stableCoins.usdc,
        dataFeed.address,
        10000,
        true,
      );
      await redeemInstantTest(
        {
          redemptionVault: redemptionVaultWithBUIDL,
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
        { vault: redemptionVaultWithBUIDL, owner },
        stableCoins.usdc,
      );
      await addPaymentTokenTest(
        { vault: redemptionVaultWithBUIDL, owner },
        stableCoins.usdc,
        dataFeed.address,
        0,
        true,
      );
      await setInstantFeeTest(
        { vault: redemptionVaultWithBUIDL, owner },
        10000,
      );
      await redeemInstantTest(
        {
          redemptionVault: redemptionVaultWithBUIDL,
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
        redemptionVaultWithBUIDL,
        stableCoins,
        mTBILL,
        mTokenToUsdDataFeed,
      } = await loadFixture(defaultDeploy);

      await redemptionVaultWithBUIDL.setGreenlistEnable(true);

      await redeemInstantTest(
        {
          redemptionVault: redemptionVaultWithBUIDL,
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
        redemptionVaultWithBUIDL,
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
          redemptionVault: redemptionVaultWithBUIDL,
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
        redemptionVaultWithBUIDL,
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
          redemptionVault: redemptionVaultWithBUIDL,
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

    it('should fail: user try to instant redeem more then contract can redeem', async () => {
      const {
        owner,
        redemptionVaultWithBUIDL,
        stableCoins,
        mTBILL,
        mTokenToUsdDataFeed,
        dataFeed,
        buidl,
      } = await loadFixture(defaultDeploy);

      await mintToken(mTBILL, owner, 100000);
      await mintToken(stableCoins.usdc, redemptionVaultWithBUIDL, 100);
      await mintToken(buidl, redemptionVaultWithBUIDL, 100);

      await approveBase18(owner, mTBILL, redemptionVaultWithBUIDL, 100000);

      await addPaymentTokenTest(
        { vault: redemptionVaultWithBUIDL, owner },
        stableCoins.usdc,
        dataFeed.address,
        100,
        true,
      );

      await redeemInstantTest(
        {
          redemptionVault: redemptionVaultWithBUIDL,
          owner,
          mTBILL,
          mTokenToUsdDataFeed,
        },
        stableCoins.usdc,
        100000,
        {
          revertMessage: 'RVB: buidlToRedeem > balance',
        },
      );
    });

    it('redeem 100 mTBILL, when price of stable is 1$ and mToken price is 1$ and contract have 100 USDC', async () => {
      const {
        owner,
        mockedAggregator,
        mockedAggregatorMToken,
        redemptionVaultWithBUIDL,
        stableCoins,
        mTBILL,
        dataFeed,
        mTokenToUsdDataFeed,
      } = await loadFixture(defaultDeploy);

      await mintToken(stableCoins.usdc, redemptionVaultWithBUIDL, 100);
      await mintToken(mTBILL, owner, 100);
      await approveBase18(owner, mTBILL, redemptionVaultWithBUIDL, 100);
      await addPaymentTokenTest(
        { vault: redemptionVaultWithBUIDL, owner },
        stableCoins.usdc,
        dataFeed.address,
        0,
        true,
      );
      await setRoundData({ mockedAggregator }, 1);
      await setRoundData({ mockedAggregator: mockedAggregatorMToken }, 1);
      await redeemInstantTest(
        {
          redemptionVault: redemptionVaultWithBUIDL,
          owner,
          mTBILL,
          mTokenToUsdDataFeed,
        },
        stableCoins.usdc,
        100,
      );
    });

    it('redeem 1000 mTBILL, when price of stable is 1$ and mToken price is 1$ and contract do not have USDC, but have 9900 BUIDL', async () => {
      const {
        owner,
        mockedAggregator,
        mockedAggregatorMToken,
        redemptionVaultWithBUIDL,
        stableCoins,
        mTBILL,
        dataFeed,
        mTokenToUsdDataFeed,
        buidl,
      } = await loadFixture(defaultDeploy);

      await mintToken(buidl, redemptionVaultWithBUIDL, 9900);
      await mintToken(mTBILL, owner, 1000);
      await approveBase18(owner, mTBILL, redemptionVaultWithBUIDL, 1000);
      await addPaymentTokenTest(
        { vault: redemptionVaultWithBUIDL, owner },
        stableCoins.usdc,
        dataFeed.address,
        0,
        true,
      );
      await setInstantFeeTest({ vault: redemptionVaultWithBUIDL, owner }, 0);
      await setRoundData({ mockedAggregator }, 1);
      await setRoundData({ mockedAggregator: mockedAggregatorMToken }, 1);
      const buidlBalanceBefore = await buidl.balanceOf(
        redemptionVaultWithBUIDL.address,
      );
      await redeemInstantTest(
        {
          redemptionVault: redemptionVaultWithBUIDL,
          owner,
          mTBILL,
          mTokenToUsdDataFeed,
        },
        stableCoins.usdc,
        1000,
      );
      const buidlBalanceAfter = await buidl.balanceOf(
        redemptionVaultWithBUIDL.address,
      );
      expect(buidlBalanceAfter).eq(
        buidlBalanceBefore.sub(parseUnits('250000', 6)),
      );
    });

    it('redeem 1000 mTBILL, when price of stable is 1$ and mToken price is 1$ and contract have 100 USDC and 9900 BUIDL', async () => {
      const {
        owner,
        mockedAggregator,
        mockedAggregatorMToken,
        redemptionVaultWithBUIDL,
        stableCoins,
        mTBILL,
        dataFeed,
        mTokenToUsdDataFeed,
        buidl,
      } = await loadFixture(defaultDeploy);

      await mintToken(stableCoins.usdc, redemptionVaultWithBUIDL, 100);
      await mintToken(buidl, redemptionVaultWithBUIDL, 9900);
      await mintToken(mTBILL, owner, 1000);
      await approveBase18(owner, mTBILL, redemptionVaultWithBUIDL, 1000);
      await addPaymentTokenTest(
        { vault: redemptionVaultWithBUIDL, owner },
        stableCoins.usdc,
        dataFeed.address,
        0,
        true,
      );
      await setRoundData({ mockedAggregator }, 1);
      await setRoundData({ mockedAggregator: mockedAggregatorMToken }, 1);
      await redeemInstantTest(
        {
          redemptionVault: redemptionVaultWithBUIDL,
          owner,
          mTBILL,
          mTokenToUsdDataFeed,
        },
        stableCoins.usdc,
        1000,
      );
    });

    it('redeem 1000 mTBILL, when price of stable is 1.03$ and mToken price is 5$ and contract have 100 USDC and 15000 BUIDL without checking of minDepositAmount', async () => {
      const {
        owner,
        mockedAggregator,
        mockedAggregatorMToken,
        redemptionVaultWithBUIDL,
        stableCoins,
        mTBILL,
        dataFeed,
        mTokenToUsdDataFeed,
        buidl,
      } = await loadFixture(defaultDeploy);

      await mintToken(stableCoins.usdc, redemptionVaultWithBUIDL, 100);
      await mintToken(buidl, redemptionVaultWithBUIDL, 15000);
      await mintToken(mTBILL, owner, 1000);
      await approveBase18(owner, mTBILL, redemptionVaultWithBUIDL, 1000);
      await addPaymentTokenTest(
        { vault: redemptionVaultWithBUIDL, owner },
        stableCoins.usdc,
        dataFeed.address,
        100,
        true,
      );
      await setRoundData({ mockedAggregator }, 1.03);
      await setRoundData({ mockedAggregator: mockedAggregatorMToken }, 5);
      await redemptionVaultWithBUIDL.freeFromMinAmount(owner.address, true);
      await redeemInstantTest(
        {
          redemptionVault: redemptionVaultWithBUIDL,
          owner,
          mTBILL,
          mTokenToUsdDataFeed,
        },
        stableCoins.usdc,
        1000,
      );
    });

    it('redeem 1000 mTBILL, when price of stable is 1.03$ and mToken price is 5$ and contract have 100 USDC and 15000 BUIDL and user in waivedFeeRestriction', async () => {
      const {
        owner,
        mockedAggregator,
        mockedAggregatorMToken,
        redemptionVaultWithBUIDL,
        stableCoins,
        mTBILL,
        dataFeed,
        mTokenToUsdDataFeed,
        buidl,
      } = await loadFixture(defaultDeploy);

      await mintToken(stableCoins.usdc, redemptionVaultWithBUIDL, 100);
      await mintToken(buidl, redemptionVaultWithBUIDL, 15000);
      await mintToken(mTBILL, owner, 1000);
      await approveBase18(owner, mTBILL, redemptionVaultWithBUIDL, 1000);
      await addPaymentTokenTest(
        { vault: redemptionVaultWithBUIDL, owner },
        stableCoins.usdc,
        dataFeed.address,
        100,
        true,
      );
      await setRoundData({ mockedAggregator }, 1.03);
      await setRoundData({ mockedAggregator: mockedAggregatorMToken }, 5);

      await addWaivedFeeAccountTest(
        { vault: redemptionVaultWithBUIDL, owner },
        owner.address,
      );
      await redeemInstantTest(
        {
          redemptionVault: redemptionVaultWithBUIDL,
          owner,
          mTBILL,
          mTokenToUsdDataFeed,
          waivedFee: true,
        },
        stableCoins.usdc,
        1000,
      );
    });
  });

  describe('redeemRequest()', () => {
    it('should fail: when there is no token in vault', async () => {
      const {
        owner,
        redemptionVaultWithBUIDL,
        stableCoins,
        mTBILL,
        mTokenToUsdDataFeed,
      } = await loadFixture(defaultDeploy);

      await redeemRequestTest(
        {
          redemptionVault: redemptionVaultWithBUIDL,
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
        redemptionVaultWithBUIDL,
        stableCoins,
        mTBILL,
        dataFeed,
        mTokenToUsdDataFeed,
      } = await loadFixture(defaultDeploy);
      await addPaymentTokenTest(
        { vault: redemptionVaultWithBUIDL, owner },
        stableCoins.dai,
        dataFeed.address,
        0,
        true,
      );
      await redeemRequestTest(
        {
          redemptionVault: redemptionVaultWithBUIDL,
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
        redemptionVaultWithBUIDL,
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
        redemptionVaultWithBUIDL,
        100,
      );
      await addPaymentTokenTest(
        { vault: redemptionVaultWithBUIDL, owner },
        stableCoins.dai,
        dataFeed.address,
        0,
        true,
      );
      const selector = encodeFnSelector('redeemRequest(address,uint256)');
      await pauseVaultFn(redemptionVaultWithBUIDL, selector);
      await redeemRequestTest(
        {
          redemptionVault: redemptionVaultWithBUIDL,
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
        redemptionVaultWithBUIDL,
        stableCoins,
        mTBILL,
        dataFeed,
        mTokenToUsdDataFeed,
      } = await loadFixture(defaultDeploy);

      await mintToken(mTBILL, owner, 100);
      await addPaymentTokenTest(
        { vault: redemptionVaultWithBUIDL, owner },
        stableCoins.dai,
        dataFeed.address,
        0,
        true,
      );
      await redeemRequestTest(
        {
          redemptionVault: redemptionVaultWithBUIDL,
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
        redemptionVaultWithBUIDL,
        stableCoins,
        mTBILL,
        dataFeed,
        mTokenToUsdDataFeed,
      } = await loadFixture(defaultDeploy);

      await approveBase18(owner, mTBILL, redemptionVaultWithBUIDL, 100);
      await addPaymentTokenTest(
        { vault: redemptionVaultWithBUIDL, owner },
        stableCoins.dai,
        dataFeed.address,
        0,
        true,
      );
      await redeemRequestTest(
        {
          redemptionVault: redemptionVaultWithBUIDL,
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
        redemptionVaultWithBUIDL,
        stableCoins,
        mTBILL,
        dataFeed,
        mockedAggregator,
        mockedAggregatorMToken,
        mTokenToUsdDataFeed,
      } = await loadFixture(defaultDeploy);

      await approveBase18(owner, stableCoins.dai, redemptionVaultWithBUIDL, 10);
      await addPaymentTokenTest(
        { vault: redemptionVaultWithBUIDL, owner },
        stableCoins.dai,
        dataFeed.address,
        0,
        true,
      );
      await mintToken(mTBILL, owner, 100_000);
      await setRoundData({ mockedAggregator }, 0);
      await redeemRequestTest(
        {
          redemptionVault: redemptionVaultWithBUIDL,
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
          redemptionVault: redemptionVaultWithBUIDL,
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
        redemptionVaultWithBUIDL,
        mockedAggregator,
        owner,
        mTBILL,
        stableCoins,
        dataFeed,
        mTokenToUsdDataFeed,
      } = await loadFixture(defaultDeploy);
      await addPaymentTokenTest(
        { vault: redemptionVaultWithBUIDL, owner },
        stableCoins.dai,
        dataFeed.address,
        0,
        true,
      );
      await setRoundData({ mockedAggregator }, 1);

      await mintToken(mTBILL, owner, 100_000);
      await approveBase18(owner, mTBILL, redemptionVaultWithBUIDL, 100_000);

      await setMinAmountTest(
        { vault: redemptionVaultWithBUIDL, owner },
        100_000,
      );

      await redeemRequestTest(
        {
          redemptionVault: redemptionVaultWithBUIDL,
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
        redemptionVaultWithBUIDL,
        stableCoins,
        mTBILL,
        dataFeed,
        mTokenToUsdDataFeed,
      } = await loadFixture(defaultDeploy);

      await mintToken(mTBILL, owner, 100);
      await approveBase18(owner, mTBILL, redemptionVaultWithBUIDL, 100);
      await addPaymentTokenTest(
        { vault: redemptionVaultWithBUIDL, owner },
        stableCoins.dai,
        dataFeed.address,
        10000,
        true,
      );
      await redeemRequestTest(
        {
          redemptionVault: redemptionVaultWithBUIDL,
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
        redemptionVaultWithBUIDL,
        stableCoins,
        mTBILL,
        mTokenToUsdDataFeed,
      } = await loadFixture(defaultDeploy);

      await redemptionVaultWithBUIDL.setGreenlistEnable(true);

      await redeemRequestTest(
        {
          redemptionVault: redemptionVaultWithBUIDL,
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
        redemptionVaultWithBUIDL,
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
          redemptionVault: redemptionVaultWithBUIDL,
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
        redemptionVaultWithBUIDL,
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
          redemptionVault: redemptionVaultWithBUIDL,
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

    it('should fail: user try to redeem fiat in basic request', async () => {
      const {
        owner,
        redemptionVaultWithBUIDL,
        stableCoins,
        mTBILL,
        mTokenToUsdDataFeed,
        dataFeed,
      } = await loadFixture(defaultDeploy);

      await mintToken(mTBILL, owner, 100);
      await approveBase18(owner, mTBILL, redemptionVaultWithBUIDL, 100);

      await addPaymentTokenTest(
        { vault: redemptionVaultWithBUIDL, owner },
        stableCoins.dai,
        dataFeed.address,
        100,
        true,
      );

      await redeemRequestTest(
        {
          redemptionVault: redemptionVaultWithBUIDL,
          owner,
          mTBILL,
          mTokenToUsdDataFeed,
        },
        await redemptionVaultWithBUIDL.MANUAL_FULLFILMENT_TOKEN(),
        100,
        {
          revertMessage: 'RV: tokenOut == fiat',
        },
      );
    });

    it('redeem request 100 mTBILL, greenlist enabled and user in greenlist ', async () => {
      const {
        owner,
        redemptionVaultWithBUIDL,
        stableCoins,
        mTBILL,
        greenListableTester,
        mTokenToUsdDataFeed,
        accessControl,
        regularAccounts,
        dataFeed,
      } = await loadFixture(defaultDeploy);

      await redemptionVaultWithBUIDL.setGreenlistEnable(true);

      await greenList(
        { greenlistable: greenListableTester, accessControl, owner },
        regularAccounts[0],
      );

      await mintToken(stableCoins.dai, redemptionVaultWithBUIDL, 100000);
      await mintToken(mTBILL, regularAccounts[0], 100);
      await approveBase18(
        regularAccounts[0],
        mTBILL,
        redemptionVaultWithBUIDL,
        100,
      );
      await addPaymentTokenTest(
        { vault: redemptionVaultWithBUIDL, owner },
        stableCoins.dai,
        dataFeed.address,
        0,
        true,
      );

      await redeemRequestTest(
        {
          redemptionVault: redemptionVaultWithBUIDL,
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
        redemptionVaultWithBUIDL,
        stableCoins,
        mTBILL,
        dataFeed,
        mTokenToUsdDataFeed,
      } = await loadFixture(defaultDeploy);

      await mintToken(stableCoins.dai, redemptionVaultWithBUIDL, 100000);
      await mintToken(mTBILL, owner, 100);
      await approveBase18(owner, mTBILL, redemptionVaultWithBUIDL, 100);
      await addPaymentTokenTest(
        { vault: redemptionVaultWithBUIDL, owner },
        stableCoins.dai,
        dataFeed.address,
        0,
        true,
      );
      await setRoundData({ mockedAggregator }, 1.03);
      await setRoundData({ mockedAggregator: mockedAggregatorMToken }, 5);

      await redeemRequestTest(
        {
          redemptionVault: redemptionVaultWithBUIDL,
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
        redemptionVaultWithBUIDL,
        stableCoins,
        mTBILL,
        dataFeed,
        mTokenToUsdDataFeed,
      } = await loadFixture(defaultDeploy);

      await mintToken(stableCoins.dai, redemptionVaultWithBUIDL, 100000);
      await mintToken(mTBILL, owner, 100);
      await approveBase18(owner, mTBILL, redemptionVaultWithBUIDL, 100);
      await addPaymentTokenTest(
        { vault: redemptionVaultWithBUIDL, owner },
        stableCoins.dai,
        dataFeed.address,
        100,
        true,
      );
      await setRoundData({ mockedAggregator }, 1.03);
      await setRoundData({ mockedAggregator: mockedAggregatorMToken }, 5);
      await redeemRequestTest(
        {
          redemptionVault: redemptionVaultWithBUIDL,
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
        redemptionVaultWithBUIDL,
        stableCoins,
        mTBILL,
        dataFeed,
        mTokenToUsdDataFeed,
      } = await loadFixture(defaultDeploy);

      await mintToken(stableCoins.dai, redemptionVaultWithBUIDL, 100000);
      await mintToken(mTBILL, owner, 100);
      await approveBase18(owner, mTBILL, redemptionVaultWithBUIDL, 100);
      await addPaymentTokenTest(
        { vault: redemptionVaultWithBUIDL, owner },
        stableCoins.dai,
        dataFeed.address,
        100,
        true,
      );
      await setRoundData({ mockedAggregator }, 1.03);
      await setRoundData({ mockedAggregator: mockedAggregatorMToken }, 5);
      await redemptionVaultWithBUIDL.freeFromMinAmount(owner.address, true);
      await redeemRequestTest(
        {
          redemptionVault: redemptionVaultWithBUIDL,
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
        redemptionVaultWithBUIDL,
        stableCoins,
        mTBILL,
        dataFeed,
        mTokenToUsdDataFeed,
      } = await loadFixture(defaultDeploy);

      await mintToken(stableCoins.dai, redemptionVaultWithBUIDL, 100000);
      await mintToken(mTBILL, owner, 100);
      await approveBase18(owner, mTBILL, redemptionVaultWithBUIDL, 100);
      await addPaymentTokenTest(
        { vault: redemptionVaultWithBUIDL, owner },
        stableCoins.dai,
        dataFeed.address,
        100,
        true,
      );
      await setRoundData({ mockedAggregator }, 1.03);
      await setRoundData({ mockedAggregator: mockedAggregatorMToken }, 5);
      await addWaivedFeeAccountTest(
        { vault: redemptionVaultWithBUIDL, owner },
        owner.address,
      );
      await redeemRequestTest(
        {
          redemptionVault: redemptionVaultWithBUIDL,
          owner,
          mTBILL,
          mTokenToUsdDataFeed,
          waivedFee: true,
        },
        stableCoins.dai,
        100,
      );
    });
  });

  describe('redeemFiatRequest()', () => {
    it('should fail: when trying to redeem 0 amount', async () => {
      const {
        owner,
        redemptionVaultWithBUIDL: redemptionVault,
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
        redemptionVaultWithBUIDL: redemptionVault,
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
        redemptionVaultWithBUIDL: redemptionVault,
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
        redemptionVaultWithBUIDL: redemptionVault,
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
        redemptionVaultWithBUIDL: redemptionVault,
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
        redemptionVaultWithBUIDL: redemptionVault,
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
        redemptionVaultWithBUIDL: redemptionVault,
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
        redemptionVaultWithBUIDL: redemptionVault,
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
        redemptionVaultWithBUIDL: redemptionVault,
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
        redemptionVaultWithBUIDL: redemptionVault,
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
        redemptionVaultWithBUIDL: redemptionVault,
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
        redemptionVaultWithBUIDL: redemptionVault,
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
        redemptionVaultWithBUIDL: redemptionVault,
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
        redemptionVaultWithBUIDL: redemptionVault,
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
        redemptionVaultWithBUIDL: redemptionVault,
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
        redemptionVaultWithBUIDL: redemptionVault,
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
        redemptionVaultWithBUIDL: redemptionVault,
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
        redemptionVaultWithBUIDL: redemptionVault,
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
        redemptionVaultWithBUIDL: redemptionVault,
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
        redemptionVaultWithBUIDL: redemptionVault,
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
        redemptionVaultWithBUIDL: redemptionVault,
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
        redemptionVaultWithBUIDL: redemptionVault,
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
        redemptionVaultWithBUIDL: redemptionVault,
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
        redemptionVaultWithBUIDL: redemptionVault,
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
        redemptionVaultWithBUIDL: redemptionVault,
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
        redemptionVaultWithBUIDL: redemptionVault,
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
        redemptionVaultWithBUIDL: redemptionVault,
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
        redemptionVaultWithBUIDL: redemptionVault,
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
        redemptionVaultWithBUIDL: redemptionVault,
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
        redemptionVaultWithBUIDL: redemptionVault,
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
        redemptionVaultWithBUIDL: redemptionVault,
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

    it('call for amount == minAmount, if USDC balance minAmount/2 and BUIDL balance minAmount/2', async () => {
      const {
        redemptionVaultWithBUIDL: redemptionVault,
        mockedAggregator,
        mockedAggregatorMToken,
        owner,
        mTBILL,
        stableCoins,
        dataFeed,
        mTokenToUsdDataFeed,
        buidl,
      } = await loadFixture(defaultDeploy);
      await addPaymentTokenTest(
        { vault: redemptionVault, owner },
        stableCoins.usdc,
        dataFeed.address,
        0,
        true,
      );
      await setRoundData({ mockedAggregator }, 1);

      await mintToken(mTBILL, owner, 100_000);
      await mintToken(stableCoins.usdc, redemptionVault, 50_000);
      await mintToken(buidl, redemptionVault, 50_000);
      await approveBase18(owner, mTBILL, redemptionVault, 100_000);

      await setRoundData({ mockedAggregator: mockedAggregatorMToken }, 1);
      await setMinAmountTest({ vault: redemptionVault, owner }, 100_000);

      await redeemInstantTest(
        { redemptionVault, owner, mTBILL, mTokenToUsdDataFeed },
        stableCoins.usdc,
        100_000,
      );
    });

    it('redeem 100 mtbill, when price is 5$ and contract balance 100 USDC and 100000 BUIDL, 125 mtbill when price is 5.1$, 114 mtbill when price is 5.4$', async () => {
      const {
        owner,
        mockedAggregator,
        redemptionVaultWithBUIDL: redemptionVault,
        stableCoins,
        mTBILL,
        dataFeed,
        mTokenToUsdDataFeed,
        mockedAggregatorMToken,
        buidl,
      } = await loadFixture(defaultDeploy);

      await mintToken(mTBILL, owner, 100 + 125 + 114);

      await mintToken(stableCoins.usdc, redemptionVault, 100);
      await mintToken(buidl, redemptionVault, 100000);

      await approveBase18(owner, mTBILL, redemptionVault, 100 + 125 + 114);

      await addPaymentTokenTest(
        { vault: redemptionVault, owner },
        stableCoins.usdc,
        dataFeed.address,
        0,
        true,
      );

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

  describe('redeemRequest() complex', () => {
    it('should fail: when is paused', async () => {
      const {
        redemptionVaultWithBUIDL: redemptionVault,
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
        redemptionVaultWithBUIDL: redemptionVault,
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
        redemptionVaultWithBUIDL: redemptionVault,
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
        redemptionVaultWithBUIDL: redemptionVault,
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
        redemptionVaultWithBUIDL: redemptionVault,
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
});
