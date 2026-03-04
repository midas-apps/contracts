import { loadFixture } from '@nomicfoundation/hardhat-network-helpers';
import { expect } from 'chai';
import { constants } from 'ethers';
import { parseUnits } from 'ethers/lib/utils';
import { ethers } from 'hardhat';

import { encodeFnSelector } from '../../helpers/utils';
import {
  ManageableVaultTester__factory,
  RedemptionVaultWithMTokenTest__factory,
} from '../../typechain-types';
import { acErrors, blackList } from '../common/ac.helpers';
import {
  approveBase18,
  mintToken,
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
import { redeemInstantWithMTokenTest } from '../common/redemption-vault-mtoken.helpers';
import {
  approveRedeemRequestTest,
  redeemFiatRequestTest,
  redeemRequestTest,
  rejectRedeemRequestTest,
  setFiatAdditionalFeeTest,
  setMinFiatRedeemAmountTest,
} from '../common/redemption-vault.helpers';
import { sanctionUser } from '../common/with-sanctions-list.helpers';

describe('RedemptionVaultWithMToken', function () {
  it('deployment', async () => {
    const {
      redemptionVaultWithMToken,
      redemptionVault,
      mFONE,
      tokensReceiver,
      feeReceiver,
      mFoneToUsdDataFeed,
      roles,
    } = await loadFixture(defaultDeploy);

    expect(await redemptionVaultWithMToken.mToken()).eq(mFONE.address);

    expect(await redemptionVaultWithMToken.ONE_HUNDRED_PERCENT()).eq('10000');

    expect(await redemptionVaultWithMToken.paused()).eq(false);

    expect(await redemptionVaultWithMToken.tokensReceiver()).eq(
      tokensReceiver.address,
    );
    expect(await redemptionVaultWithMToken.feeReceiver()).eq(
      feeReceiver.address,
    );

    expect(await redemptionVaultWithMToken.minAmount()).eq(1000);
    expect(await redemptionVaultWithMToken.minFiatRedeemAmount()).eq(1000);

    expect(await redemptionVaultWithMToken.instantFee()).eq('100');

    expect(await redemptionVaultWithMToken.instantDailyLimit()).eq(
      parseUnits('100000'),
    );

    expect(await redemptionVaultWithMToken.mTokenDataFeed()).eq(
      mFoneToUsdDataFeed.address,
    );
    expect(await redemptionVaultWithMToken.variationTolerance()).eq(1);

    expect(await redemptionVaultWithMToken.vaultRole()).eq(
      roles.tokenRoles.mTBILL.redemptionVaultAdmin,
    );

    expect(await redemptionVaultWithMToken.MANUAL_FULLFILMENT_TOKEN()).eq(
      ethers.constants.AddressZero,
    );

    expect(await redemptionVaultWithMToken.redemptionVault()).eq(
      redemptionVault.address,
    );
  });

  it('failing deployment', async () => {
    const {
      mFONE,
      tokensReceiver,
      feeReceiver,
      mFoneToUsdDataFeed,
      accessControl,
      mockedSanctionsList,
      owner,
    } = await loadFixture(defaultDeploy);

    const redemptionVaultWithMToken =
      await new RedemptionVaultWithMTokenTest__factory(owner).deploy();

    await expect(
      redemptionVaultWithMToken[
        'initialize(address,(address,address),(address,address),(uint256,uint256),address,uint256,uint256,(uint256,uint256,uint256),address)'
      ](
        accessControl.address,
        {
          mToken: mFONE.address,
          mTokenDataFeed: mFoneToUsdDataFeed.address,
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
      const { redemptionVaultWithMToken } = await loadFixture(defaultDeploy);

      await expect(
        redemptionVaultWithMToken[
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
        mFONE,
        tokensReceiver,
        feeReceiver,
        mFoneToUsdDataFeed,
        mockedSanctionsList,
      } = await loadFixture(defaultDeploy);

      const vault = await new ManageableVaultTester__factory(owner).deploy();

      await expect(
        vault.initializeWithoutInitializer(
          accessControl.address,
          {
            mToken: mFONE.address,
            mTokenDataFeed: mFoneToUsdDataFeed.address,
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

    it('should fail: when redemptionVault address zero', async () => {
      const {
        owner,
        accessControl,
        mFONE,
        tokensReceiver,
        feeReceiver,
        mFoneToUsdDataFeed,
        mockedSanctionsList,
        requestRedeemer,
      } = await loadFixture(defaultDeploy);

      const redemptionVaultWithMToken =
        await new RedemptionVaultWithMTokenTest__factory(owner).deploy();

      await expect(
        redemptionVaultWithMToken[
          'initialize(address,(address,address),(address,address),(uint256,uint256),address,uint256,uint256,(uint256,uint256,uint256),address,address)'
        ](
          accessControl.address,
          {
            mToken: mFONE.address,
            mTokenDataFeed: mFoneToUsdDataFeed.address,
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

  describe('setRedemptionVault()', () => {
    it('should fail: call from address without vault admin role', async () => {
      const { redemptionVaultWithMToken, regularAccounts } = await loadFixture(
        defaultDeploy,
      );
      await expect(
        redemptionVaultWithMToken
          .connect(regularAccounts[0])
          .setRedemptionVault(regularAccounts[1].address),
      ).to.be.revertedWith('WMAC: hasnt role');
    });

    it('should fail: zero address', async () => {
      const { redemptionVaultWithMToken } = await loadFixture(defaultDeploy);
      await expect(
        redemptionVaultWithMToken.setRedemptionVault(constants.AddressZero),
      ).to.be.revertedWith('zero address');
    });

    it('should fail: same address', async () => {
      const { redemptionVaultWithMToken, redemptionVault } = await loadFixture(
        defaultDeploy,
      );
      await expect(
        redemptionVaultWithMToken.setRedemptionVault(redemptionVault.address),
      ).to.be.revertedWith('RVMT: already set');
    });

    it('should succeed and emit SetRedemptionVault event', async () => {
      const { redemptionVaultWithMToken, owner, regularAccounts } =
        await loadFixture(defaultDeploy);

      const newVault = regularAccounts[0].address;

      await expect(redemptionVaultWithMToken.setRedemptionVault(newVault))
        .to.emit(redemptionVaultWithMToken, 'SetRedemptionVault')
        .withArgs(owner.address, newVault);

      expect(await redemptionVaultWithMToken.redemptionVault()).eq(newVault);
    });
  });

  describe('setMinAmount()', () => {
    it('should fail: call from address without vault admin role', async () => {
      const { owner, redemptionVaultWithMToken, regularAccounts } =
        await loadFixture(defaultDeploy);
      await setMinAmountTest(
        { vault: redemptionVaultWithMToken, owner },
        10000,
        { revertMessage: acErrors.WMAC_HASNT_ROLE, from: regularAccounts[0] },
      );
    });
    it('call from address with vault admin role', async () => {
      const { owner, redemptionVaultWithMToken } = await loadFixture(
        defaultDeploy,
      );
      await setMinAmountTest(
        { vault: redemptionVaultWithMToken, owner },
        10000,
      );
    });
  });

  describe('setMinFiatRedeemAmount()', () => {
    it('should fail: call from address without vault admin role', async () => {
      const { owner, redemptionVaultWithMToken, regularAccounts } =
        await loadFixture(defaultDeploy);
      await setMinFiatRedeemAmountTest(
        { redemptionVault: redemptionVaultWithMToken, owner },
        10000,
        { revertMessage: acErrors.WMAC_HASNT_ROLE, from: regularAccounts[0] },
      );
    });
    it('call from address with vault admin role', async () => {
      const { owner, redemptionVaultWithMToken } = await loadFixture(
        defaultDeploy,
      );
      await setMinFiatRedeemAmountTest(
        { redemptionVault: redemptionVaultWithMToken, owner },
        10000,
      );
    });
  });

  describe('setFiatAdditionalFee()', () => {
    it('should fail: call from address without vault admin role', async () => {
      const { owner, redemptionVaultWithMToken, regularAccounts } =
        await loadFixture(defaultDeploy);
      await setFiatAdditionalFeeTest(
        { redemptionVault: redemptionVaultWithMToken, owner },
        100,
        { revertMessage: acErrors.WMAC_HASNT_ROLE, from: regularAccounts[0] },
      );
    });
    it('call from address with vault admin role', async () => {
      const { owner, redemptionVaultWithMToken } = await loadFixture(
        defaultDeploy,
      );
      await setFiatAdditionalFeeTest(
        { redemptionVault: redemptionVaultWithMToken, owner },
        100,
      );
    });
  });

  describe('setInstantDailyLimit()', () => {
    it('should fail: call from address without vault admin role', async () => {
      const { owner, redemptionVaultWithMToken, regularAccounts } =
        await loadFixture(defaultDeploy);
      await setInstantDailyLimitTest(
        { vault: redemptionVaultWithMToken, owner },
        parseUnits('1000'),
        { revertMessage: acErrors.WMAC_HASNT_ROLE, from: regularAccounts[0] },
      );
    });
    it('call from address with vault admin role', async () => {
      const { owner, redemptionVaultWithMToken } = await loadFixture(
        defaultDeploy,
      );
      await setInstantDailyLimitTest(
        { vault: redemptionVaultWithMToken, owner },
        parseUnits('1000'),
      );
    });
    it('should fail: when limit is zero', async () => {
      const { owner, redemptionVaultWithMToken } = await loadFixture(
        defaultDeploy,
      );
      await setInstantDailyLimitTest(
        { vault: redemptionVaultWithMToken, owner },
        constants.Zero,
        { revertMessage: 'MV: limit zero' },
      );
    });
  });

  describe('addPaymentToken()', () => {
    it('should fail: call from address without vault admin role', async () => {
      const {
        owner,
        redemptionVaultWithMToken,
        stableCoins,
        regularAccounts,
        dataFeed,
      } = await loadFixture(defaultDeploy);
      await addPaymentTokenTest(
        { vault: redemptionVaultWithMToken, owner },
        stableCoins.dai,
        dataFeed.address,
        0,
        true,
        undefined,
        { revertMessage: acErrors.WMAC_HASNT_ROLE, from: regularAccounts[0] },
      );
    });
    it('call from address with vault admin role', async () => {
      const { owner, redemptionVaultWithMToken, stableCoins, dataFeed } =
        await loadFixture(defaultDeploy);
      await addPaymentTokenTest(
        { vault: redemptionVaultWithMToken, owner },
        stableCoins.dai,
        dataFeed.address,
        0,
        true,
      );
    });
  });

  describe('removePaymentToken()', () => {
    it('should fail: call from address without vault admin role', async () => {
      const {
        owner,
        redemptionVaultWithMToken,
        stableCoins,
        regularAccounts,
        dataFeed,
      } = await loadFixture(defaultDeploy);
      await addPaymentTokenTest(
        { vault: redemptionVaultWithMToken, owner },
        stableCoins.dai,
        dataFeed.address,
        0,
        true,
      );
      await removePaymentTokenTest(
        { vault: redemptionVaultWithMToken, owner },
        stableCoins.dai,
        { revertMessage: acErrors.WMAC_HASNT_ROLE, from: regularAccounts[0] },
      );
    });
    it('call from address with vault admin role', async () => {
      const { owner, redemptionVaultWithMToken, stableCoins, dataFeed } =
        await loadFixture(defaultDeploy);
      await addPaymentTokenTest(
        { vault: redemptionVaultWithMToken, owner },
        stableCoins.dai,
        dataFeed.address,
        0,
        true,
      );
      await removePaymentTokenTest(
        { vault: redemptionVaultWithMToken, owner },
        stableCoins.dai,
      );
    });
  });

  describe('addWaivedFeeAccount()', () => {
    it('should fail: call from address without vault admin role', async () => {
      const { owner, redemptionVaultWithMToken, regularAccounts } =
        await loadFixture(defaultDeploy);
      await addWaivedFeeAccountTest(
        { vault: redemptionVaultWithMToken, owner },
        regularAccounts[0].address,
        { revertMessage: acErrors.WMAC_HASNT_ROLE, from: regularAccounts[0] },
      );
    });
    it('call from address with vault admin role', async () => {
      const { owner, redemptionVaultWithMToken, regularAccounts } =
        await loadFixture(defaultDeploy);
      await addWaivedFeeAccountTest(
        { vault: redemptionVaultWithMToken, owner },
        regularAccounts[0].address,
      );
    });
  });

  describe('removeWaivedFeeAccount()', () => {
    it('should fail: call from address without vault admin role', async () => {
      const { owner, redemptionVaultWithMToken, regularAccounts } =
        await loadFixture(defaultDeploy);
      await addWaivedFeeAccountTest(
        { vault: redemptionVaultWithMToken, owner },
        regularAccounts[0].address,
      );
      await removeWaivedFeeAccountTest(
        { vault: redemptionVaultWithMToken, owner },
        regularAccounts[0].address,
        { revertMessage: acErrors.WMAC_HASNT_ROLE, from: regularAccounts[0] },
      );
    });
    it('call from address with vault admin role', async () => {
      const { owner, redemptionVaultWithMToken, regularAccounts } =
        await loadFixture(defaultDeploy);
      await addWaivedFeeAccountTest(
        { vault: redemptionVaultWithMToken, owner },
        regularAccounts[0].address,
      );
      await removeWaivedFeeAccountTest(
        { vault: redemptionVaultWithMToken, owner },
        regularAccounts[0].address,
      );
    });
  });

  describe('setFee()', () => {
    it('should fail: call from address without vault admin role', async () => {
      const { owner, redemptionVaultWithMToken, regularAccounts } =
        await loadFixture(defaultDeploy);
      await setInstantFeeTest(
        { vault: redemptionVaultWithMToken, owner },
        100,
        { revertMessage: acErrors.WMAC_HASNT_ROLE, from: regularAccounts[0] },
      );
    });
    it('call from address with vault admin role', async () => {
      const { owner, redemptionVaultWithMToken } = await loadFixture(
        defaultDeploy,
      );
      await setInstantFeeTest({ vault: redemptionVaultWithMToken, owner }, 100);
    });
  });

  describe('setVariabilityTolerance()', () => {
    it('should fail: call from address without vault admin role', async () => {
      const { owner, redemptionVaultWithMToken, regularAccounts } =
        await loadFixture(defaultDeploy);
      await setVariabilityToleranceTest(
        { vault: redemptionVaultWithMToken, owner },
        100,
        { revertMessage: acErrors.WMAC_HASNT_ROLE, from: regularAccounts[0] },
      );
    });
    it('call from address with vault admin role', async () => {
      const { owner, redemptionVaultWithMToken } = await loadFixture(
        defaultDeploy,
      );
      await setVariabilityToleranceTest(
        { vault: redemptionVaultWithMToken, owner },
        100,
      );
    });
  });

  describe('withdrawToken()', () => {
    it('should fail: call from address without vault admin role', async () => {
      const { owner, redemptionVaultWithMToken, stableCoins, regularAccounts } =
        await loadFixture(defaultDeploy);
      await mintToken(stableCoins.dai, redemptionVaultWithMToken, 1);
      await withdrawTest(
        { vault: redemptionVaultWithMToken, owner },
        stableCoins.dai,
        1,
        owner,
        { revertMessage: acErrors.WMAC_HASNT_ROLE, from: regularAccounts[0] },
      );
    });
    it('call from address with vault admin role', async () => {
      const { owner, redemptionVaultWithMToken, stableCoins } =
        await loadFixture(defaultDeploy);
      await mintToken(stableCoins.dai, redemptionVaultWithMToken, 100);
      await withdrawTest(
        { vault: redemptionVaultWithMToken, owner },
        stableCoins.dai,
        100,
        owner,
      );
    });
  });

  describe('freeFromMinAmount()', async () => {
    it('should fail: call from address without vault admin role', async () => {
      const { redemptionVaultWithMToken, regularAccounts } = await loadFixture(
        defaultDeploy,
      );
      await expect(
        redemptionVaultWithMToken
          .connect(regularAccounts[0])
          .freeFromMinAmount(regularAccounts[1].address, true),
      ).to.be.revertedWith('WMAC: hasnt role');
    });

    it('should not fail', async () => {
      const { redemptionVaultWithMToken, regularAccounts } = await loadFixture(
        defaultDeploy,
      );
      await expect(
        redemptionVaultWithMToken.freeFromMinAmount(
          regularAccounts[0].address,
          true,
        ),
      ).to.not.reverted;

      expect(
        await redemptionVaultWithMToken.isFreeFromMinAmount(
          regularAccounts[0].address,
        ),
      ).to.eq(true);
    });
  });

  describe('changeTokenFee()', () => {
    it('should fail: call from address without vault admin role', async () => {
      const {
        owner,
        redemptionVaultWithMToken,
        stableCoins,
        regularAccounts,
        dataFeed,
      } = await loadFixture(defaultDeploy);
      await addPaymentTokenTest(
        { vault: redemptionVaultWithMToken, owner },
        stableCoins.dai,
        dataFeed.address,
        0,
        true,
      );
      await changeTokenFeeTest(
        { vault: redemptionVaultWithMToken, owner },
        stableCoins.dai.address,
        100,
        { revertMessage: acErrors.WMAC_HASNT_ROLE, from: regularAccounts[0] },
      );
    });
    it('call from address with vault admin role', async () => {
      const { owner, redemptionVaultWithMToken, stableCoins, dataFeed } =
        await loadFixture(defaultDeploy);
      await addPaymentTokenTest(
        { vault: redemptionVaultWithMToken, owner },
        stableCoins.dai,
        dataFeed.address,
        0,
        true,
      );
      await changeTokenFeeTest(
        { vault: redemptionVaultWithMToken, owner },
        stableCoins.dai.address,
        100,
      );
    });
  });

  describe('changeTokenAllowance()', () => {
    it('should fail: call from address without vault admin role', async () => {
      const {
        owner,
        redemptionVaultWithMToken,
        stableCoins,
        regularAccounts,
        dataFeed,
      } = await loadFixture(defaultDeploy);
      await addPaymentTokenTest(
        { vault: redemptionVaultWithMToken, owner },
        stableCoins.dai,
        dataFeed.address,
        0,
        true,
      );
      await changeTokenAllowanceTest(
        { vault: redemptionVaultWithMToken, owner },
        stableCoins.dai.address,
        100,
        { revertMessage: acErrors.WMAC_HASNT_ROLE, from: regularAccounts[0] },
      );
    });
    it('call from address with vault admin role', async () => {
      const { owner, redemptionVaultWithMToken, stableCoins, dataFeed } =
        await loadFixture(defaultDeploy);
      await addPaymentTokenTest(
        { vault: redemptionVaultWithMToken, owner },
        stableCoins.dai,
        dataFeed.address,
        0,
        true,
      );
      await changeTokenAllowanceTest(
        { vault: redemptionVaultWithMToken, owner },
        stableCoins.dai.address,
        100,
      );
    });
  });

  describe('checkAndRedeemMToken()', () => {
    it('should not redeem mTBILL when vault has sufficient tokenOut balance', async () => {
      const {
        redemptionVaultWithMToken,
        stableCoins,
        mTBILL,
        owner,
        dataFeed,
        redemptionVault,
      } = await loadFixture(defaultDeploy);

      await addPaymentTokenTest(
        { vault: redemptionVaultWithMToken, owner },
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
      );

      await mintToken(stableCoins.dai, redemptionVaultWithMToken, 1000);
      await mintToken(mTBILL, redemptionVaultWithMToken, 1000);

      const mTbillBefore = await mTBILL.balanceOf(
        redemptionVaultWithMToken.address,
      );
      const tokenOutRate = await dataFeed.getDataInBase18();

      await redemptionVaultWithMToken.checkAndRedeemMToken(
        stableCoins.dai.address,
        parseUnits('500', 9),
        tokenOutRate,
      );

      const mTbillAfter = await mTBILL.balanceOf(
        redemptionVaultWithMToken.address,
      );
      expect(mTbillAfter).to.equal(mTbillBefore);
    });

    it('should redeem missing amount via mToken RV', async () => {
      const {
        redemptionVaultWithMToken,
        stableCoins,
        mTBILL,
        owner,
        dataFeed,
        redemptionVault,
      } = await loadFixture(defaultDeploy);

      await addPaymentTokenTest(
        { vault: redemptionVaultWithMToken, owner },
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
      );

      await mintToken(stableCoins.dai, redemptionVaultWithMToken, 500);
      await mintToken(mTBILL, redemptionVaultWithMToken, 10000);
      await mintToken(stableCoins.dai, redemptionVault, 1_000_000);

      const mTbillBefore = await mTBILL.balanceOf(
        redemptionVaultWithMToken.address,
      );
      const tokenOutRate = await dataFeed.getDataInBase18();

      await redemptionVaultWithMToken.checkAndRedeemMToken(
        stableCoins.dai.address,
        parseUnits('1000', 9),
        tokenOutRate,
      );

      const mTbillAfter = await mTBILL.balanceOf(
        redemptionVaultWithMToken.address,
      );
      expect(mTbillAfter).to.be.lt(mTbillBefore);

      const daiAfter = await stableCoins.dai.balanceOf(
        redemptionVaultWithMToken.address,
      );
      expect(daiAfter).to.be.gte(parseUnits('1000', 9));
    });

    it('should revert when insufficient mTBILL balance', async () => {
      const {
        redemptionVaultWithMToken,
        stableCoins,
        owner,
        dataFeed,
        redemptionVault,
      } = await loadFixture(defaultDeploy);

      await addPaymentTokenTest(
        { vault: redemptionVaultWithMToken, owner },
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
      );

      const tokenOutRate = await dataFeed.getDataInBase18();

      await expect(
        redemptionVaultWithMToken.checkAndRedeemMToken(
          stableCoins.dai.address,
          parseUnits('1000', 9),
          tokenOutRate,
        ),
      ).to.be.revertedWith('RVMT: insufficient mToken balance');
    });

    it('should succeed with truncation-prone rates (ceil rounding)', async () => {
      const {
        redemptionVaultWithMToken,
        stableCoins,
        mTBILL,
        owner,
        dataFeed,
        redemptionVault,
        mockedAggregatorMToken,
      } = await loadFixture(defaultDeploy);

      await addPaymentTokenTest(
        { vault: redemptionVaultWithMToken, owner },
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
      );

      // Set mTBILL rate to 3 — causes (amount * 1e18) / 3e18 to have remainder
      await setRoundData({ mockedAggregator: mockedAggregatorMToken }, 3);

      await mintToken(mTBILL, redemptionVaultWithMToken, 100_000);
      await mintToken(stableCoins.dai, redemptionVault, 1_000_000);

      // Use STABLECOIN_RATE (1e18) — matches what _redeemInstant passes
      // for stable tokens via _convertUsdToToken, NOT the data feed rate
      // (which is 1.02e18). The inner vault also uses STABLECOIN_RATE for
      // stable tokens, so both sides see the same rate and ceil rounding matters.
      const tokenOutRate = parseUnits('1', 18);

      // Without ceil rounding, the inner vault reverts because:
      // mTokenAAmount = (1000e18 * 1e18) / 3e18 = 333...333 (truncated)
      // Inner vault: _truncate((333...333 * 3e18) / 1e18, 9) = 999.999999999e18 < 1000e18
      await redemptionVaultWithMToken.checkAndRedeemMToken(
        stableCoins.dai.address,
        parseUnits('1000', 9),
        tokenOutRate,
      );

      const daiAfter = await stableCoins.dai.balanceOf(
        redemptionVaultWithMToken.address,
      );
      expect(daiAfter).to.be.gte(parseUnits('1000', 9));
    });

    it('should not over-redeem when division is exact', async () => {
      const {
        redemptionVaultWithMToken,
        stableCoins,
        mTBILL,
        owner,
        dataFeed,
        redemptionVault,
        mockedAggregatorMToken,
      } = await loadFixture(defaultDeploy);

      await addPaymentTokenTest(
        { vault: redemptionVaultWithMToken, owner },
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
      );

      // 1000 * 1e18 / 2e18 = 500 exactly, so no +1 should be applied.
      await setRoundData({ mockedAggregator: mockedAggregatorMToken }, 2);

      // If rounding is exact ceil, 500 mTBILL is enough. With unconditional +1, this reverts.
      await mintToken(mTBILL, redemptionVaultWithMToken, 500);
      await mintToken(stableCoins.dai, redemptionVault, 1_000_000);

      const tokenOutRate = parseUnits('1', 18);
      await redemptionVaultWithMToken.checkAndRedeemMToken(
        stableCoins.dai.address,
        parseUnits('1000', 9),
        tokenOutRate,
      );

      const daiAfter = await stableCoins.dai.balanceOf(
        redemptionVaultWithMToken.address,
      );
      expect(daiAfter).to.be.gte(parseUnits('1000', 9));
    });
  });

  describe('redeemInstant()', () => {
    it('should fail: when there is no token in vault', async () => {
      const {
        owner,
        redemptionVaultWithMToken,
        stableCoins,
        mTBILL,
        mFONE,
        mTokenToUsdDataFeed,
        mFoneToUsdDataFeed,
      } = await loadFixture(defaultDeploy);

      await redeemInstantWithMTokenTest(
        {
          redemptionVaultWithMToken,
          owner,
          mTBILL,
          mFONE,
          mFoneToUsdDataFeed,
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
        redemptionVaultWithMToken,
        stableCoins,
        mTBILL,
        mFONE,
        mTokenToUsdDataFeed,
        mFoneToUsdDataFeed,
        dataFeed,
      } = await loadFixture(defaultDeploy);

      await addPaymentTokenTest(
        { vault: redemptionVaultWithMToken, owner },
        stableCoins.dai,
        dataFeed.address,
        0,
        true,
      );

      await redeemInstantWithMTokenTest(
        {
          redemptionVaultWithMToken,
          owner,
          mTBILL,
          mFONE,
          mFoneToUsdDataFeed,
          mTokenToUsdDataFeed,
        },
        stableCoins.dai,
        0,
        {
          revertMessage: 'RV: invalid amount',
        },
      );
    });

    it('should fail: call is paused', async () => {
      const {
        owner,
        redemptionVaultWithMToken,
        stableCoins,
        mTBILL,
        mFONE,
        mTokenToUsdDataFeed,
        mFoneToUsdDataFeed,
        dataFeed,
        regularAccounts,
      } = await loadFixture(defaultDeploy);

      await addPaymentTokenTest(
        { vault: redemptionVaultWithMToken, owner },
        stableCoins.dai,
        dataFeed.address,
        0,
        true,
      );
      const selector = encodeFnSelector(
        'redeemInstant(address,uint256,uint256)',
      );
      await pauseVaultFn(redemptionVaultWithMToken, selector);
      await redeemInstantWithMTokenTest(
        {
          redemptionVaultWithMToken,
          owner,
          mTBILL,
          mFONE,
          mFoneToUsdDataFeed,
          mTokenToUsdDataFeed,
        },
        stableCoins.dai,
        1,
        {
          from: regularAccounts[0],
          revertMessage: 'Pausable: fn paused',
        },
      );
    });

    it('should fail: when user has no mFONE allowance', async () => {
      const {
        owner,
        redemptionVaultWithMToken,
        stableCoins,
        mTBILL,
        mFONE,
        mTokenToUsdDataFeed,
        mFoneToUsdDataFeed,
        dataFeed,
      } = await loadFixture(defaultDeploy);

      await addPaymentTokenTest(
        { vault: redemptionVaultWithMToken, owner },
        stableCoins.dai,
        dataFeed.address,
        0,
        true,
      );
      await mintToken(mFONE, owner, 100_000);

      await redeemInstantWithMTokenTest(
        {
          redemptionVaultWithMToken,
          owner,
          mTBILL,
          mFONE,
          mFoneToUsdDataFeed,
          mTokenToUsdDataFeed,
        },
        stableCoins.dai,
        100,
        {
          revertMessage: 'ERC20: insufficient allowance',
        },
      );
    });

    it('should fail: when user has no mFONE balance', async () => {
      const {
        owner,
        redemptionVaultWithMToken,
        stableCoins,
        mTBILL,
        mFONE,
        mTokenToUsdDataFeed,
        mFoneToUsdDataFeed,
        dataFeed,
      } = await loadFixture(defaultDeploy);

      await addPaymentTokenTest(
        { vault: redemptionVaultWithMToken, owner },
        stableCoins.dai,
        dataFeed.address,
        0,
        true,
      );
      await approveBase18(owner, mFONE, redemptionVaultWithMToken, 100_000);

      await redeemInstantWithMTokenTest(
        {
          redemptionVaultWithMToken,
          owner,
          mTBILL,
          mFONE,
          mFoneToUsdDataFeed,
          mTokenToUsdDataFeed,
        },
        stableCoins.dai,
        100,
        {
          revertMessage: 'ERC20: burn amount exceeds balance',
        },
      );
    });

    it('should fail: when data feed rate is 0', async () => {
      const {
        owner,
        redemptionVaultWithMToken,
        stableCoins,
        mTBILL,
        mFONE,
        mTokenToUsdDataFeed,
        mFoneToUsdDataFeed,
        dataFeed,
        mockedAggregatorMFone,
      } = await loadFixture(defaultDeploy);

      await addPaymentTokenTest(
        { vault: redemptionVaultWithMToken, owner },
        stableCoins.dai,
        dataFeed.address,
        0,
        true,
      );
      await mintToken(mFONE, owner, 100_000);
      await approveBase18(owner, mFONE, redemptionVaultWithMToken, 100_000);
      await setRoundData({ mockedAggregator: mockedAggregatorMFone }, 0);

      await redeemInstantWithMTokenTest(
        {
          redemptionVaultWithMToken,
          owner,
          mTBILL,
          mFONE,
          mFoneToUsdDataFeed,
          mTokenToUsdDataFeed,
        },
        stableCoins.dai,
        100,
        {
          revertMessage: 'DF: feed is deprecated',
        },
      );
    });

    it('should fail: when amount < minAmount', async () => {
      const {
        owner,
        redemptionVaultWithMToken,
        stableCoins,
        mTBILL,
        mFONE,
        mTokenToUsdDataFeed,
        mFoneToUsdDataFeed,
        dataFeed,
      } = await loadFixture(defaultDeploy);

      await addPaymentTokenTest(
        { vault: redemptionVaultWithMToken, owner },
        stableCoins.dai,
        dataFeed.address,
        0,
        true,
      );
      await mintToken(mFONE, owner, 100_000);
      await approveBase18(owner, mFONE, redemptionVaultWithMToken, 100_000);

      await setMinAmountTest(
        { vault: redemptionVaultWithMToken, owner },
        100_000,
      );

      await redeemInstantWithMTokenTest(
        {
          redemptionVaultWithMToken,
          owner,
          mTBILL,
          mFONE,
          mFoneToUsdDataFeed,
          mTokenToUsdDataFeed,
        },
        stableCoins.dai,
        999,
        {
          revertMessage: 'RV: amount < min',
        },
      );
    });

    it('should fail: when token allowance exceeded', async () => {
      const {
        owner,
        redemptionVaultWithMToken,
        stableCoins,
        mTBILL,
        mFONE,
        mTokenToUsdDataFeed,
        mFoneToUsdDataFeed,
        dataFeed,
        mockedAggregator,
      } = await loadFixture(defaultDeploy);

      await addPaymentTokenTest(
        { vault: redemptionVaultWithMToken, owner },
        stableCoins.dai,
        dataFeed.address,
        0,
        true,
      );
      await mintToken(mFONE, owner, 100_000);
      await mintToken(stableCoins.dai, redemptionVaultWithMToken, 1_000_000);
      await approveBase18(owner, mFONE, redemptionVaultWithMToken, 100_000);
      await changeTokenAllowanceTest(
        { vault: redemptionVaultWithMToken, owner },
        stableCoins.dai.address,
        100,
      );
      await setRoundData({ mockedAggregator }, 4);

      await redeemInstantWithMTokenTest(
        {
          redemptionVaultWithMToken,
          owner,
          mTBILL,
          mFONE,
          mFoneToUsdDataFeed,
          mTokenToUsdDataFeed,
        },
        stableCoins.dai,
        99_999,
        {
          revertMessage: 'MV: exceed allowance',
        },
      );
    });

    it('should fail: when daily limit exceeded', async () => {
      const {
        owner,
        redemptionVaultWithMToken,
        stableCoins,
        mTBILL,
        mFONE,
        mTokenToUsdDataFeed,
        mFoneToUsdDataFeed,
        dataFeed,
        mockedAggregator,
      } = await loadFixture(defaultDeploy);

      await addPaymentTokenTest(
        { vault: redemptionVaultWithMToken, owner },
        stableCoins.dai,
        dataFeed.address,
        0,
        true,
      );
      await mintToken(mFONE, owner, 100_000);
      await mintToken(stableCoins.dai, redemptionVaultWithMToken, 1_000_000);
      await approveBase18(owner, mFONE, redemptionVaultWithMToken, 100_000);
      await setInstantDailyLimitTest(
        { vault: redemptionVaultWithMToken, owner },
        parseUnits('1000'),
      );
      await setRoundData({ mockedAggregator }, 4);

      await redeemInstantWithMTokenTest(
        {
          redemptionVaultWithMToken,
          owner,
          mTBILL,
          mFONE,
          mFoneToUsdDataFeed,
          mTokenToUsdDataFeed,
        },
        stableCoins.dai,
        99_999,
        {
          revertMessage: 'MV: exceed limit',
        },
      );
    });

    it('should fail: when fee is 100%', async () => {
      const {
        owner,
        redemptionVaultWithMToken,
        stableCoins,
        mTBILL,
        mFONE,
        mTokenToUsdDataFeed,
        mFoneToUsdDataFeed,
        dataFeed,
      } = await loadFixture(defaultDeploy);

      await addPaymentTokenTest(
        { vault: redemptionVaultWithMToken, owner },
        stableCoins.dai,
        dataFeed.address,
        0,
        true,
      );
      await mintToken(mFONE, owner, 100_000);
      await approveBase18(owner, mFONE, redemptionVaultWithMToken, 100_000);
      await setInstantFeeTest(
        { vault: redemptionVaultWithMToken, owner },
        10000,
      );

      await redeemInstantWithMTokenTest(
        {
          redemptionVaultWithMToken,
          owner,
          mTBILL,
          mFONE,
          mFoneToUsdDataFeed,
          mTokenToUsdDataFeed,
        },
        stableCoins.dai,
        100,
        {
          revertMessage: 'RV: amountMTokenIn < fee',
        },
      );
    });

    it('should fail: greenlist enabled and user not in greenlist', async () => {
      const {
        owner,
        redemptionVaultWithMToken,
        stableCoins,
        mTBILL,
        mFONE,
        mTokenToUsdDataFeed,
        mFoneToUsdDataFeed,
      } = await loadFixture(defaultDeploy);

      await redemptionVaultWithMToken.setGreenlistEnable(true);

      await redeemInstantWithMTokenTest(
        {
          redemptionVaultWithMToken,
          owner,
          mTBILL,
          mFONE,
          mFoneToUsdDataFeed,
          mTokenToUsdDataFeed,
        },
        stableCoins.dai,
        1,
        {
          revertMessage: 'WMAC: hasnt role',
        },
      );
    });

    it('should fail: user is blacklisted', async () => {
      const {
        owner,
        redemptionVaultWithMToken,
        stableCoins,
        mTBILL,
        mFONE,
        mTokenToUsdDataFeed,
        mFoneToUsdDataFeed,
        blackListableTester,
        accessControl,
        regularAccounts,
      } = await loadFixture(defaultDeploy);

      await blackList(
        { blacklistable: blackListableTester, accessControl, owner },
        regularAccounts[0],
      );

      await redeemInstantWithMTokenTest(
        {
          redemptionVaultWithMToken,
          owner,
          mTBILL,
          mFONE,
          mFoneToUsdDataFeed,
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

    it('should fail: user is sanctioned', async () => {
      const {
        owner,
        redemptionVaultWithMToken,
        stableCoins,
        mTBILL,
        mFONE,
        mTokenToUsdDataFeed,
        mFoneToUsdDataFeed,
        mockedSanctionsList,
        regularAccounts,
      } = await loadFixture(defaultDeploy);

      await sanctionUser(
        { sanctionsList: mockedSanctionsList },
        regularAccounts[0],
      );

      await redeemInstantWithMTokenTest(
        {
          redemptionVaultWithMToken,
          owner,
          mTBILL,
          mFONE,
          mFoneToUsdDataFeed,
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

    it('should fail: user try to instant redeem fiat', async () => {
      const {
        owner,
        redemptionVaultWithMToken,
        mTBILL,
        mFONE,
        mTokenToUsdDataFeed,
        mFoneToUsdDataFeed,
      } = await loadFixture(defaultDeploy);

      await mintToken(mFONE, owner, 100_000);
      await mintToken(mTBILL, redemptionVaultWithMToken, 100_000);
      await approveBase18(owner, mFONE, redemptionVaultWithMToken, 100_000);

      await redeemInstantWithMTokenTest(
        {
          redemptionVaultWithMToken,
          owner,
          mTBILL,
          mFONE,
          mFoneToUsdDataFeed,
          mTokenToUsdDataFeed,
        },
        await redemptionVaultWithMToken.MANUAL_FULLFILMENT_TOKEN(),
        99_999,
        {
          revertMessage: 'MV: token not exists',
        },
      );
    });

    it('should fail: when inner vault fee is not waived', async () => {
      const {
        owner,
        redemptionVaultWithMToken,
        stableCoins,
        mTBILL,
        mFONE,
        mTokenToUsdDataFeed,
        mFoneToUsdDataFeed,
        dataFeed,
        redemptionVault,
      } = await loadFixture(defaultDeploy);

      await addPaymentTokenTest(
        { vault: redemptionVaultWithMToken, owner },
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
      );

      // Remove the waived fee — inner vault will charge fee on this contract
      await redemptionVault.removeWaivedFeeAccount(
        redemptionVaultWithMToken.address,
      );

      await mintToken(mFONE, owner, 100_000);
      await mintToken(mTBILL, redemptionVaultWithMToken, 100_000);
      await mintToken(stableCoins.dai, redemptionVault, 1_000_000);
      await approveBase18(owner, mFONE, redemptionVaultWithMToken, 100_000);

      // No DAI on vault — forces mTBILL redemption path where inner vault fee causes revert
      await redeemInstantWithMTokenTest(
        {
          redemptionVaultWithMToken,
          owner,
          mTBILL,
          mFONE,
          mFoneToUsdDataFeed,
          mTokenToUsdDataFeed,
        },
        stableCoins.dai,
        100,
        {
          revertMessage: 'RV: minReceiveAmount > actual',
        },
      );
    });

    it('should fail: vault has no mTBILL and no DAI', async () => {
      const {
        owner,
        redemptionVaultWithMToken,
        stableCoins,
        mTBILL,
        mFONE,
        mTokenToUsdDataFeed,
        mFoneToUsdDataFeed,
        dataFeed,
        redemptionVault,
      } = await loadFixture(defaultDeploy);

      await addPaymentTokenTest(
        { vault: redemptionVaultWithMToken, owner },
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
      );

      await mintToken(mFONE, owner, 100_000);
      await approveBase18(owner, mFONE, redemptionVaultWithMToken, 100_000);

      await redeemInstantWithMTokenTest(
        {
          redemptionVaultWithMToken,
          owner,
          mTBILL,
          mFONE,
          mFoneToUsdDataFeed,
          mTokenToUsdDataFeed,
        },
        stableCoins.dai,
        100,
        {
          revertMessage: 'RVMT: insufficient mToken balance',
        },
      );
    });

    it('redeem 100 mFONE, when vault has enough DAI and all fees are 0', async () => {
      const {
        owner,
        redemptionVaultWithMToken,
        stableCoins,
        mTBILL,
        mFONE,
        mTokenToUsdDataFeed,
        mFoneToUsdDataFeed,
        dataFeed,
        mockedAggregator,
      } = await loadFixture(defaultDeploy);

      await addPaymentTokenTest(
        { vault: redemptionVaultWithMToken, owner },
        stableCoins.dai,
        dataFeed.address,
        0,
        true,
      );

      await setRoundData({ mockedAggregator }, 1);

      await mintToken(mFONE, owner, 100_000);
      await mintToken(stableCoins.dai, redemptionVaultWithMToken, 1_000_000);
      await mintToken(mTBILL, redemptionVaultWithMToken, 100_000);
      await approveBase18(owner, mFONE, redemptionVaultWithMToken, 100_000);

      await setInstantFeeTest({ vault: redemptionVaultWithMToken, owner }, 0);

      await redeemInstantWithMTokenTest(
        {
          redemptionVaultWithMToken,
          owner,
          mTBILL,
          mFONE,
          mFoneToUsdDataFeed,
          mTokenToUsdDataFeed,
        },
        stableCoins.dai,
        100,
      );
    });

    it('redeem 100 mFONE, when vault has enough DAI (with fees)', async () => {
      const {
        owner,
        redemptionVaultWithMToken,
        stableCoins,
        mTBILL,
        mFONE,
        mTokenToUsdDataFeed,
        mFoneToUsdDataFeed,
        dataFeed,
        mockedAggregator,
      } = await loadFixture(defaultDeploy);

      await addPaymentTokenTest(
        { vault: redemptionVaultWithMToken, owner },
        stableCoins.dai,
        dataFeed.address,
        0,
        true,
      );

      await setRoundData({ mockedAggregator }, 1);

      await mintToken(mFONE, owner, 100_000);
      await mintToken(stableCoins.dai, redemptionVaultWithMToken, 1_000_000);
      await mintToken(mTBILL, redemptionVaultWithMToken, 100_000);
      await approveBase18(owner, mFONE, redemptionVaultWithMToken, 100_000);

      await redeemInstantWithMTokenTest(
        {
          redemptionVaultWithMToken,
          owner,
          mTBILL,
          mFONE,
          mFoneToUsdDataFeed,
          mTokenToUsdDataFeed,
        },
        stableCoins.dai,
        100,
      );
    });

    it('redeem 100 mFONE, vault has no DAI => triggers mTBILL redemption', async () => {
      const {
        owner,
        redemptionVaultWithMToken,
        stableCoins,
        mTBILL,
        mFONE,
        mTokenToUsdDataFeed,
        mFoneToUsdDataFeed,
        dataFeed,
        redemptionVault,
      } = await loadFixture(defaultDeploy);

      await addPaymentTokenTest(
        { vault: redemptionVaultWithMToken, owner },
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
      );

      await mintToken(mFONE, owner, 100_000);
      await mintToken(mTBILL, redemptionVaultWithMToken, 100_000);
      await mintToken(stableCoins.dai, redemptionVault, 1_000_000);
      await approveBase18(owner, mFONE, redemptionVaultWithMToken, 100_000);

      await redeemInstantWithMTokenTest(
        {
          redemptionVaultWithMToken,
          owner,
          mTBILL,
          mFONE,
          mFoneToUsdDataFeed,
          mTokenToUsdDataFeed,
          useMTokenSleeve: true,
        },
        stableCoins.dai,
        100,
      );
    });

    it('redeem 100 mFONE, vault has partial DAI => triggers partial mTBILL redemption', async () => {
      const {
        owner,
        redemptionVaultWithMToken,
        stableCoins,
        mTBILL,
        mFONE,
        mTokenToUsdDataFeed,
        mFoneToUsdDataFeed,
        dataFeed,
        redemptionVault,
      } = await loadFixture(defaultDeploy);

      await addPaymentTokenTest(
        { vault: redemptionVaultWithMToken, owner },
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
      );

      await mintToken(mFONE, owner, 100_000);
      await mintToken(mTBILL, redemptionVaultWithMToken, 100_000);
      await mintToken(stableCoins.dai, redemptionVaultWithMToken, 10);
      await mintToken(stableCoins.dai, redemptionVault, 1_000_000);
      await approveBase18(owner, mFONE, redemptionVaultWithMToken, 100_000);

      await redeemInstantWithMTokenTest(
        {
          redemptionVaultWithMToken,
          owner,
          mTBILL,
          mFONE,
          mFoneToUsdDataFeed,
          mTokenToUsdDataFeed,
          useMTokenSleeve: true,
        },
        stableCoins.dai,
        100,
      );
    });

    it('redeem with waived fee', async () => {
      const {
        owner,
        redemptionVaultWithMToken,
        stableCoins,
        mTBILL,
        mFONE,
        mTokenToUsdDataFeed,
        mFoneToUsdDataFeed,
        dataFeed,
        mockedAggregator,
      } = await loadFixture(defaultDeploy);

      await addPaymentTokenTest(
        { vault: redemptionVaultWithMToken, owner },
        stableCoins.dai,
        dataFeed.address,
        0,
        true,
      );
      await addWaivedFeeAccountTest(
        { vault: redemptionVaultWithMToken, owner },
        owner.address,
      );

      await setRoundData({ mockedAggregator }, 1);

      await mintToken(mFONE, owner, 100_000);
      await mintToken(stableCoins.dai, redemptionVaultWithMToken, 1_000_000);
      await mintToken(mTBILL, redemptionVaultWithMToken, 100_000);
      await approveBase18(owner, mFONE, redemptionVaultWithMToken, 100_000);

      await redeemInstantWithMTokenTest(
        {
          redemptionVaultWithMToken,
          owner,
          mTBILL,
          mFONE,
          mFoneToUsdDataFeed,
          mTokenToUsdDataFeed,
          waivedFee: true,
        },
        stableCoins.dai,
        100,
      );
    });
    it('redeem 100 mFONE (custom recipient overload)', async () => {
      const {
        owner,
        redemptionVaultWithMToken,
        stableCoins,
        mTokenToUsdDataFeed,
        regularAccounts,
        dataFeed,
        customRecipient,
        mFoneToUsdDataFeed,
        mFONE,
        mTBILL,
      } = await loadFixture(defaultDeploy);

      await mintToken(stableCoins.dai, redemptionVaultWithMToken, 100000);
      await mintToken(mTBILL, redemptionVaultWithMToken, 100000);
      await mintToken(mFONE, regularAccounts[0], 100);
      await approveBase18(
        regularAccounts[0],
        mFONE,
        redemptionVaultWithMToken,
        100,
      );
      await addPaymentTokenTest(
        { vault: redemptionVaultWithMToken, owner },
        stableCoins.dai,
        dataFeed.address,
        0,
        true,
      );

      await redeemInstantWithMTokenTest(
        {
          redemptionVaultWithMToken,
          owner,
          mTBILL,
          mTokenToUsdDataFeed,
          customRecipient,
          mFoneToUsdDataFeed,
          mFONE,
        },
        stableCoins.dai,
        100,
        {
          from: regularAccounts[0],
        },
      );
    });

    it('redeem 100 mFONE when other fn overload is paused (custom recipient overload)', async () => {
      const {
        owner,
        redemptionVaultWithMToken,
        stableCoins,
        mTBILL,
        mTokenToUsdDataFeed,
        regularAccounts,
        dataFeed,
        customRecipient,
        mFoneToUsdDataFeed,
        mFONE,
      } = await loadFixture(defaultDeploy);

      await pauseVaultFn(
        redemptionVaultWithMToken,
        encodeFnSelector('redeemInstant(address,uint256,uint256)'),
      );
      await mintToken(stableCoins.dai, redemptionVaultWithMToken, 100000);
      await mintToken(mTBILL, redemptionVaultWithMToken, 100000);
      await mintToken(mFONE, regularAccounts[0], 100);
      await approveBase18(
        regularAccounts[0],
        mFONE,
        redemptionVaultWithMToken,
        100,
      );
      await addPaymentTokenTest(
        { vault: redemptionVaultWithMToken, owner },
        stableCoins.dai,
        dataFeed.address,
        0,
        true,
      );

      await redeemInstantWithMTokenTest(
        {
          redemptionVaultWithMToken,
          owner,
          mTBILL,
          mTokenToUsdDataFeed,
          customRecipient,
          mFoneToUsdDataFeed,
          mFONE,
        },
        stableCoins.dai,
        100,
        {
          from: regularAccounts[0],
        },
      );
    });

    it('redeem 100 mFONE when other fn overload is paused', async () => {
      const {
        owner,
        redemptionVaultWithMToken,
        stableCoins,
        mTBILL,
        mTokenToUsdDataFeed,
        regularAccounts,
        dataFeed,
        mFoneToUsdDataFeed,
        mFONE,
      } = await loadFixture(defaultDeploy);

      await pauseVaultFn(
        redemptionVaultWithMToken,
        encodeFnSelector('redeemInstant(address,uint256,uint256,address)'),
      );
      await mintToken(stableCoins.dai, redemptionVaultWithMToken, 100000);
      await mintToken(mTBILL, redemptionVaultWithMToken, 100000);
      await mintToken(mFONE, regularAccounts[0], 100);
      await approveBase18(
        regularAccounts[0],
        mFONE,
        redemptionVaultWithMToken,
        100,
      );
      await addPaymentTokenTest(
        { vault: redemptionVaultWithMToken, owner },
        stableCoins.dai,
        dataFeed.address,
        0,
        true,
      );

      await redeemInstantWithMTokenTest(
        {
          redemptionVaultWithMToken,
          owner,
          mTBILL,
          mTokenToUsdDataFeed,
          mFoneToUsdDataFeed,
          mFONE,
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
        redemptionVaultWithMToken,
        stableCoins,
        mFONE,
        mFoneToUsdDataFeed,
      } = await loadFixture(defaultDeploy);

      await redeemRequestTest(
        {
          redemptionVault: redemptionVaultWithMToken,
          owner,
          mTBILL: mFONE,
          mTokenToUsdDataFeed: mFoneToUsdDataFeed,
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
        redemptionVaultWithMToken,
        stableCoins,
        mFONE,
        mFoneToUsdDataFeed,
        dataFeed,
      } = await loadFixture(defaultDeploy);

      await addPaymentTokenTest(
        { vault: redemptionVaultWithMToken, owner },
        stableCoins.dai,
        dataFeed.address,
        0,
        true,
      );

      await redeemRequestTest(
        {
          redemptionVault: redemptionVaultWithMToken,
          owner,
          mTBILL: mFONE,
          mTokenToUsdDataFeed: mFoneToUsdDataFeed,
        },
        stableCoins.dai,
        0,
        {
          revertMessage: 'RV: invalid amount',
        },
      );
    });

    it('should fail: call is paused', async () => {
      const {
        owner,
        redemptionVaultWithMToken,
        stableCoins,
        mFONE,
        mFoneToUsdDataFeed,
        dataFeed,
      } = await loadFixture(defaultDeploy);

      await addPaymentTokenTest(
        { vault: redemptionVaultWithMToken, owner },
        stableCoins.dai,
        dataFeed.address,
        0,
        true,
      );
      await pauseVaultFn(
        redemptionVaultWithMToken,
        encodeFnSelector('redeemRequest(address,uint256)'),
      );

      await redeemRequestTest(
        {
          redemptionVault: redemptionVaultWithMToken,
          owner,
          mTBILL: mFONE,
          mTokenToUsdDataFeed: mFoneToUsdDataFeed,
        },
        stableCoins.dai,
        1,
        {
          revertMessage: 'Pausable: fn paused',
        },
      );
    });

    it('should fail: when user has no mFONE balance', async () => {
      const {
        owner,
        redemptionVaultWithMToken,
        stableCoins,
        mFONE,
        mFoneToUsdDataFeed,
        dataFeed,
      } = await loadFixture(defaultDeploy);

      await addPaymentTokenTest(
        { vault: redemptionVaultWithMToken, owner },
        stableCoins.dai,
        dataFeed.address,
        0,
        true,
      );
      await approveBase18(owner, mFONE, redemptionVaultWithMToken, 100_000);

      await redeemRequestTest(
        {
          redemptionVault: redemptionVaultWithMToken,
          owner,
          mTBILL: mFONE,
          mTokenToUsdDataFeed: mFoneToUsdDataFeed,
        },
        stableCoins.dai,
        100,
        {
          revertMessage: 'ERC20: transfer amount exceeds balance',
        },
      );
    });

    it('redeem request 100 mFONE', async () => {
      const {
        owner,
        redemptionVaultWithMToken,
        stableCoins,
        mFONE,
        mFoneToUsdDataFeed,
        dataFeed,
      } = await loadFixture(defaultDeploy);

      await addPaymentTokenTest(
        { vault: redemptionVaultWithMToken, owner },
        stableCoins.dai,
        dataFeed.address,
        0,
        true,
      );
      await mintToken(mFONE, owner, 100_000);
      await approveBase18(owner, mFONE, redemptionVaultWithMToken, 100_000);

      await redeemRequestTest(
        {
          redemptionVault: redemptionVaultWithMToken,
          owner,
          mTBILL: mFONE,
          mTokenToUsdDataFeed: mFoneToUsdDataFeed,
        },
        stableCoins.dai,
        100,
      );
    });
  });

  describe('redeemFiatRequest()', () => {
    it('should fail: call is paused', async () => {
      const { owner, redemptionVaultWithMToken, mFONE, mFoneToUsdDataFeed } =
        await loadFixture(defaultDeploy);

      await pauseVaultFn(
        redemptionVaultWithMToken,
        encodeFnSelector('redeemFiatRequest(uint256)'),
      );

      await redeemFiatRequestTest(
        {
          redemptionVault: redemptionVaultWithMToken,
          owner,
          mTBILL: mFONE,
          mTokenToUsdDataFeed: mFoneToUsdDataFeed,
        },
        100,
        {
          revertMessage: 'Pausable: fn paused',
        },
      );
    });

    it('redeem fiat request 100 mFONE', async () => {
      const { owner, redemptionVaultWithMToken, mFONE, mFoneToUsdDataFeed } =
        await loadFixture(defaultDeploy);

      await mintToken(mFONE, owner, 100_000);
      await approveBase18(owner, mFONE, redemptionVaultWithMToken, 100_000);

      await redeemFiatRequestTest(
        {
          redemptionVault: redemptionVaultWithMToken,
          owner,
          mTBILL: mFONE,
          mTokenToUsdDataFeed: mFoneToUsdDataFeed,
        },
        100,
      );
    });
  });

  describe('approveRequest()', () => {
    it('approve request', async () => {
      const {
        owner,
        redemptionVaultWithMToken,
        stableCoins,
        mFONE,
        mFoneToUsdDataFeed,
        dataFeed,
        requestRedeemer,
        mockedAggregator,
        mockedAggregatorMFone,
      } = await loadFixture(defaultDeploy);

      await mintToken(stableCoins.dai, requestRedeemer, 100000);
      await approveBase18(
        requestRedeemer,
        stableCoins.dai,
        redemptionVaultWithMToken,
        100000,
      );

      await mintToken(mFONE, owner, 100);
      await approveBase18(owner, mFONE, redemptionVaultWithMToken, 100);
      await addPaymentTokenTest(
        { vault: redemptionVaultWithMToken, owner },
        stableCoins.dai,
        dataFeed.address,
        0,
        true,
      );
      await setRoundData({ mockedAggregator }, 1.03);
      await setRoundData({ mockedAggregator: mockedAggregatorMFone }, 5);

      await redeemRequestTest(
        {
          redemptionVault: redemptionVaultWithMToken,
          owner,
          mTBILL: mFONE,
          mTokenToUsdDataFeed: mFoneToUsdDataFeed,
        },
        stableCoins.dai,
        100,
      );

      const requestId = 0;

      await approveRedeemRequestTest(
        {
          redemptionVault: redemptionVaultWithMToken,
          owner,
          mTBILL: mFONE,
          mTokenToUsdDataFeed: mFoneToUsdDataFeed,
        },
        +requestId,
        parseUnits('1'),
      );
    });
  });

  describe('rejectRequest()', () => {
    it('reject request', async () => {
      const {
        owner,
        redemptionVaultWithMToken,
        stableCoins,
        mFONE,
        mFoneToUsdDataFeed,
        dataFeed,
        mockedAggregator,
        mockedAggregatorMFone,
      } = await loadFixture(defaultDeploy);

      await mintToken(mFONE, owner, 100);
      await approveBase18(owner, mFONE, redemptionVaultWithMToken, 100);
      await addPaymentTokenTest(
        { vault: redemptionVaultWithMToken, owner },
        stableCoins.dai,
        dataFeed.address,
        0,
        true,
      );
      await setRoundData({ mockedAggregator }, 1.03);
      await setRoundData({ mockedAggregator: mockedAggregatorMFone }, 5);

      await redeemRequestTest(
        {
          redemptionVault: redemptionVaultWithMToken,
          owner,
          mTBILL: mFONE,
          mTokenToUsdDataFeed: mFoneToUsdDataFeed,
        },
        stableCoins.dai,
        100,
      );

      const requestId = 0;

      await rejectRedeemRequestTest(
        {
          redemptionVault: redemptionVaultWithMToken,
          owner,
          mTBILL: mFONE,
          mTokenToUsdDataFeed: mFoneToUsdDataFeed,
        },
        +requestId,
      );
    });
  });
});
