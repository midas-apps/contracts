import { loadFixture } from '@nomicfoundation/hardhat-network-helpers';
import { expect } from 'chai';
import { BigNumber, constants } from 'ethers';
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

      await redemptionVaultWithMToken.checkAndRedeemMToken(
        stableCoins.dai.address,
        parseUnits('500', 9),
        parseUnits('1'),
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

      await redemptionVaultWithMToken.checkAndRedeemMToken(
        stableCoins.dai.address,
        parseUnits('1000', 9),
        parseUnits('1'),
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

      await expect(
        redemptionVaultWithMToken.checkAndRedeemMToken(
          stableCoins.dai.address,
          parseUnits('1000', 9),
          parseUnits('1'),
        ),
      ).to.be.revertedWith('RVMT: insufficient mToken balance');
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

    it('redeem 100 mFONE with divergent rates (mFONE=$5, mTBILL=$2) => triggers mTBILL redemption', async () => {
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
        mockedAggregatorMFone,
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

      await setRoundData({ mockedAggregator: mockedAggregatorMFone }, 5);

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

  describe('ceiling division math correctness', () => {
    const TOKEN_DECIMALS: Record<string, number> = {
      usdc6: 6,
      usdc: 8,
      dai: 9,
      usdt: 18,
    };

    /**
     * Mirrors the Solidity math in RedemptionVaultWithMToken._redeemInstant:
     *   amountTokenOutWithoutFee = truncate(
     *     (amountMTokenWithoutFee * mTokenRate / tokenOutRate), tokenDecimals
     *   )
     * Returns the expected user output in NATIVE decimals.
     */
    function computeExpectedTokenOut(
      amountMTokenIn: BigNumber,
      mTokenRate: BigNumber,
      tokenOutRate: BigNumber,
      tokenDecimals: number,
      feePercent: number,
      isWaived: boolean,
    ): BigNumber {
      const fee = isWaived
        ? BigNumber.from(0)
        : amountMTokenIn.mul(feePercent).div(10000);
      const amountWithoutFee = amountMTokenIn.sub(fee);
      const base18Out = amountWithoutFee.mul(mTokenRate).div(tokenOutRate);
      const scale = BigNumber.from(10).pow(18 - tokenDecimals);
      const truncated = base18Out.div(scale);
      return truncated;
    }

    /**
     * Lean helper: configures both outer + inner vault for a given tokenOut,
     * sets rates, mints tokens, and returns everything needed to call redeemInstant.
     * The outer vault has ZERO tokenOut to force the inner-vault redemption path.
     */
    async function setupCeilDivTest(opts: {
      fixture: Awaited<ReturnType<typeof defaultDeploy>>;
      tokenKey: 'usdc6' | 'usdc' | 'dai' | 'usdt';
      mTbillRate: number;
      isStable: boolean;
      tokenOutRate?: number;
      redeemAmount?: number;
    }) {
      const {
        redemptionVaultWithMToken,
        redemptionVault,
        owner,
        mTBILL,
        mFONE,
        mFoneToUsdDataFeed,
        mTokenToUsdDataFeed,
        mockedAggregatorMToken,
        mockedAggregatorMFone,
        mockedAggregator,
        dataFeed,
        stableCoins,
      } = opts.fixture;

      const token = stableCoins[opts.tokenKey];

      await addPaymentTokenTest(
        { vault: redemptionVaultWithMToken, owner },
        token,
        dataFeed.address,
        0,
        opts.isStable,
      );
      await addPaymentTokenTest(
        { vault: redemptionVault, owner },
        token,
        dataFeed.address,
        0,
        opts.isStable,
      );

      await setRoundData(
        { mockedAggregator: mockedAggregatorMToken },
        opts.mTbillRate,
      );
      if (opts.tokenOutRate !== undefined) {
        await setRoundData({ mockedAggregator }, opts.tokenOutRate);
      }

      await setInstantFeeTest({ vault: redemptionVaultWithMToken, owner }, 0);

      const amount = opts.redeemAmount ?? 100;

      await mintToken(mFONE, owner, amount * 100);
      await mintToken(mTBILL, redemptionVaultWithMToken, amount * 100);
      await mintToken(token, redemptionVault, amount * 10000);
      await approveBase18(
        owner,
        mFONE,
        redemptionVaultWithMToken,
        amount * 100,
      );

      const mFoneRate = await mFoneToUsdDataFeed.getDataInBase18();
      const tokenOutRate = opts.isStable
        ? parseUnits('1')
        : await dataFeed.getDataInBase18();

      return {
        token,
        amount,
        redemptionVaultWithMToken,
        redemptionVault,
        owner,
        mTBILL,
        mFONE,
        mFoneToUsdDataFeed,
        mTokenToUsdDataFeed,
        mockedAggregatorMFone,
        mockedAggregator,
        mFoneRate,
        tokenOutRate,
      };
    }

    describe('with base RedemptionVault as inner vault', () => {
      const tokenVariants: Array<{
        key: 'usdc6' | 'usdc' | 'dai' | 'usdt';
        label: string;
      }> = [
        { key: 'usdc6', label: '6-dec' },
        { key: 'usdc', label: '8-dec' },
        { key: 'dai', label: '9-dec' },
        { key: 'usdt', label: '18-dec' },
      ];

      for (const { key, label } of tokenVariants) {
        describe(`tokenOut ${label} (${key})`, () => {
          it('succeeds with exact division (mTBILL=5, stable)', async () => {
            const fixture = await loadFixture(defaultDeploy);
            const {
              token,
              amount,
              redemptionVaultWithMToken,
              owner,
              mTBILL,
              mFoneRate,
              tokenOutRate,
            } = await setupCeilDivTest({
              fixture,
              tokenKey: key,
              mTbillRate: 5,
              isStable: true,
            });

            const mTbillBefore = await mTBILL.balanceOf(
              redemptionVaultWithMToken.address,
            );
            const userTokenBefore = await token.balanceOf(owner.address);

            await redemptionVaultWithMToken
              .connect(owner)
              ['redeemInstant(address,uint256,uint256)'](
                token.address,
                parseUnits(amount.toString()),
                0,
              );

            expect(
              await mTBILL.balanceOf(redemptionVaultWithMToken.address),
            ).to.be.lt(mTbillBefore);

            const expected = computeExpectedTokenOut(
              parseUnits(amount.toString()),
              mFoneRate,
              tokenOutRate,
              TOKEN_DECIMALS[key],
              0,
              true,
            );
            const userTokenAfter = await token.balanceOf(owner.address);
            expect(userTokenAfter.sub(userTokenBefore)).to.equal(expected);
          });

          it('succeeds with remainder-producing rate (mTBILL=1.05, stable)', async () => {
            const fixture = await loadFixture(defaultDeploy);
            const {
              token,
              amount,
              redemptionVaultWithMToken,
              owner,
              mTBILL,
              mFoneRate,
              tokenOutRate,
            } = await setupCeilDivTest({
              fixture,
              tokenKey: key,
              mTbillRate: 1.05,
              isStable: true,
            });

            const mTbillBefore = await mTBILL.balanceOf(
              redemptionVaultWithMToken.address,
            );
            const userTokenBefore = await token.balanceOf(owner.address);

            await redemptionVaultWithMToken
              .connect(owner)
              ['redeemInstant(address,uint256,uint256)'](
                token.address,
                parseUnits(amount.toString()),
                0,
              );

            expect(
              await mTBILL.balanceOf(redemptionVaultWithMToken.address),
            ).to.be.lt(mTbillBefore);

            const expected = computeExpectedTokenOut(
              parseUnits(amount.toString()),
              mFoneRate,
              tokenOutRate,
              TOKEN_DECIMALS[key],
              0,
              true,
            );
            const userTokenAfter = await token.balanceOf(owner.address);
            expect(userTokenAfter.sub(userTokenBefore)).to.equal(expected);
          });

          it('succeeds with high mTBILL rate (mTBILL=100, stable)', async () => {
            const fixture = await loadFixture(defaultDeploy);
            const {
              token,
              amount,
              redemptionVaultWithMToken,
              owner,
              mTBILL,
              mFoneRate,
              tokenOutRate,
            } = await setupCeilDivTest({
              fixture,
              tokenKey: key,
              mTbillRate: 100,
              isStable: true,
            });

            const mTbillBefore = await mTBILL.balanceOf(
              redemptionVaultWithMToken.address,
            );
            const userTokenBefore = await token.balanceOf(owner.address);

            await redemptionVaultWithMToken
              .connect(owner)
              ['redeemInstant(address,uint256,uint256)'](
                token.address,
                parseUnits(amount.toString()),
                0,
              );

            expect(
              await mTBILL.balanceOf(redemptionVaultWithMToken.address),
            ).to.be.lt(mTbillBefore);

            const expected = computeExpectedTokenOut(
              parseUnits(amount.toString()),
              mFoneRate,
              tokenOutRate,
              TOKEN_DECIMALS[key],
              0,
              true,
            );
            const userTokenAfter = await token.balanceOf(owner.address);
            expect(userTokenAfter.sub(userTokenBefore)).to.equal(expected);
          });

          it('succeeds with low mTBILL rate (mTBILL=0.5, stable)', async () => {
            const fixture = await loadFixture(defaultDeploy);
            const {
              token,
              amount,
              redemptionVaultWithMToken,
              owner,
              mTBILL,
              mFoneRate,
              tokenOutRate,
            } = await setupCeilDivTest({
              fixture,
              tokenKey: key,
              mTbillRate: 0.5,
              isStable: true,
            });

            const mTbillBefore = await mTBILL.balanceOf(
              redemptionVaultWithMToken.address,
            );
            const userTokenBefore = await token.balanceOf(owner.address);

            await redemptionVaultWithMToken
              .connect(owner)
              ['redeemInstant(address,uint256,uint256)'](
                token.address,
                parseUnits(amount.toString()),
                0,
              );

            expect(
              await mTBILL.balanceOf(redemptionVaultWithMToken.address),
            ).to.be.lt(mTbillBefore);

            const expected = computeExpectedTokenOut(
              parseUnits(amount.toString()),
              mFoneRate,
              tokenOutRate,
              TOKEN_DECIMALS[key],
              0,
              true,
            );
            const userTokenAfter = await token.balanceOf(owner.address);
            expect(userTokenAfter.sub(userTokenBefore)).to.equal(expected);
          });

          it('succeeds with near-boundary rate (mTBILL=1.00000003, stable)', async () => {
            const fixture = await loadFixture(defaultDeploy);
            const {
              token,
              redemptionVaultWithMToken,
              owner,
              mTBILL,
              mFoneRate,
              tokenOutRate,
            } = await setupCeilDivTest({
              fixture,
              tokenKey: key,
              mTbillRate: 1.00000003,
              isStable: true,
              redeemAmount: 10000,
            });

            const mTbillBefore = await mTBILL.balanceOf(
              redemptionVaultWithMToken.address,
            );
            const userTokenBefore = await token.balanceOf(owner.address);

            await redemptionVaultWithMToken
              .connect(owner)
              ['redeemInstant(address,uint256,uint256)'](
                token.address,
                parseUnits('10000'),
                0,
              );

            expect(
              await mTBILL.balanceOf(redemptionVaultWithMToken.address),
            ).to.be.lt(mTbillBefore);

            const expected = computeExpectedTokenOut(
              parseUnits('10000'),
              mFoneRate,
              tokenOutRate,
              TOKEN_DECIMALS[key],
              0,
              true,
            );
            const userTokenAfter = await token.balanceOf(owner.address);
            expect(userTokenAfter.sub(userTokenBefore)).to.equal(expected);
          });

          it('succeeds with non-stable tokenOut (mTBILL=1.05, tokenOut=1.03)', async () => {
            const fixture = await loadFixture(defaultDeploy);
            const {
              token,
              amount,
              redemptionVaultWithMToken,
              owner,
              mTBILL,
              mFoneRate,
              tokenOutRate,
            } = await setupCeilDivTest({
              fixture,
              tokenKey: key,
              mTbillRate: 1.05,
              isStable: false,
              tokenOutRate: 1.03,
            });

            const mTbillBefore = await mTBILL.balanceOf(
              redemptionVaultWithMToken.address,
            );
            const userTokenBefore = await token.balanceOf(owner.address);

            await redemptionVaultWithMToken
              .connect(owner)
              ['redeemInstant(address,uint256,uint256)'](
                token.address,
                parseUnits(amount.toString()),
                0,
              );

            expect(
              await mTBILL.balanceOf(redemptionVaultWithMToken.address),
            ).to.be.lt(mTbillBefore);

            const expected = computeExpectedTokenOut(
              parseUnits(amount.toString()),
              mFoneRate,
              tokenOutRate,
              TOKEN_DECIMALS[key],
              0,
              true,
            );
            const userTokenAfter = await token.balanceOf(owner.address);
            expect(userTokenAfter.sub(userTokenBefore)).to.equal(expected);
          });

          it('succeeds with small redeem (1 mFONE, mTBILL=1.05, stable)', async () => {
            const fixture = await loadFixture(defaultDeploy);
            const {
              token,
              redemptionVaultWithMToken,
              owner,
              mTBILL,
              mFoneRate,
              tokenOutRate,
            } = await setupCeilDivTest({
              fixture,
              tokenKey: key,
              mTbillRate: 1.05,
              isStable: true,
              redeemAmount: 1,
            });

            const mTbillBefore = await mTBILL.balanceOf(
              redemptionVaultWithMToken.address,
            );
            const userTokenBefore = await token.balanceOf(owner.address);

            await setMinAmountTest(
              { vault: redemptionVaultWithMToken, owner },
              0,
            );

            await redemptionVaultWithMToken
              .connect(owner)
              ['redeemInstant(address,uint256,uint256)'](
                token.address,
                parseUnits('1'),
                0,
              );

            expect(
              await mTBILL.balanceOf(redemptionVaultWithMToken.address),
            ).to.be.lt(mTbillBefore);

            const expected = computeExpectedTokenOut(
              parseUnits('1'),
              mFoneRate,
              tokenOutRate,
              TOKEN_DECIMALS[key],
              0,
              true,
            );
            const userTokenAfter = await token.balanceOf(owner.address);
            expect(userTokenAfter.sub(userTokenBefore)).to.equal(expected);
          });

          it('succeeds with large redeem near daily limit (mTBILL=1.05, stable)', async () => {
            const fixture = await loadFixture(defaultDeploy);
            const {
              token,
              redemptionVaultWithMToken,
              owner,
              mTBILL,
              mFoneRate,
              tokenOutRate,
            } = await setupCeilDivTest({
              fixture,
              tokenKey: key,
              mTbillRate: 1.05,
              isStable: true,
              redeemAmount: 50000,
            });

            const mTbillBefore = await mTBILL.balanceOf(
              redemptionVaultWithMToken.address,
            );
            const userTokenBefore = await token.balanceOf(owner.address);

            await redemptionVaultWithMToken
              .connect(owner)
              ['redeemInstant(address,uint256,uint256)'](
                token.address,
                parseUnits('50000'),
                0,
              );

            expect(
              await mTBILL.balanceOf(redemptionVaultWithMToken.address),
            ).to.be.lt(mTbillBefore);

            const expected = computeExpectedTokenOut(
              parseUnits('50000'),
              mFoneRate,
              tokenOutRate,
              TOKEN_DECIMALS[key],
              0,
              true,
            );
            const userTokenAfter = await token.balanceOf(owner.address);
            expect(userTokenAfter.sub(userTokenBefore)).to.equal(expected);
          });
        });
      }
    });

    describe('with RedemptionVaultWithAave as inner vault', () => {
      for (const { key, label } of [
        { key: 'usdc' as const, label: '8-dec' },
        { key: 'usdc6' as const, label: '6-dec' },
      ]) {
        describe(`tokenOut ${label} (${key})`, () => {
          async function setupAaveInnerVault(
            fixture: Awaited<ReturnType<typeof defaultDeploy>>,
            tokenKey: 'usdc' | 'usdc6',
          ) {
            const {
              redemptionVaultWithMToken,
              redemptionVaultWithAave,
              aavePoolMock,
              aUSDC,
              owner,
              mTBILL,
              mFONE,
              mFoneToUsdDataFeed,
              mTokenToUsdDataFeed,
              mockedAggregatorMToken,
              mockedAggregator,
              dataFeed,
              stableCoins,
            } = fixture;

            const token = stableCoins[tokenKey];

            await redemptionVaultWithMToken.setRedemptionVault(
              redemptionVaultWithAave.address,
            );

            await addPaymentTokenTest(
              { vault: redemptionVaultWithMToken, owner },
              token,
              dataFeed.address,
              0,
              true,
            );
            await addPaymentTokenTest(
              { vault: redemptionVaultWithAave, owner },
              token,
              dataFeed.address,
              0,
              true,
            );

            await redemptionVaultWithAave.addWaivedFeeAccount(
              redemptionVaultWithMToken.address,
            );

            if (tokenKey === 'usdc6') {
              const { ERC20Mock__factory } = await import(
                '../../typechain-types'
              );
              const aUsdc6 = await new ERC20Mock__factory(owner).deploy(6);
              await aavePoolMock.setReserveAToken(
                token.address,
                aUsdc6.address,
              );
              await token.mint(aavePoolMock.address, parseUnits('1000000', 6));
              await aUsdc6.mint(
                redemptionVaultWithAave.address,
                parseUnits('1000000', 6),
              );
              await redemptionVaultWithAave.setAavePool(
                token.address,
                aavePoolMock.address,
              );
            } else {
              await token.mint(aavePoolMock.address, parseUnits('1000000'));
              await aUSDC.mint(
                redemptionVaultWithAave.address,
                parseUnits('1000000'),
              );
            }

            await setInstantFeeTest(
              { vault: redemptionVaultWithMToken, owner },
              0,
            );

            return {
              token,
              redemptionVaultWithMToken,
              owner,
              mTBILL,
              mFONE,
              mFoneToUsdDataFeed,
              mTokenToUsdDataFeed,
              mockedAggregatorMToken,
            };
          }

          it('succeeds with remainder-producing rate (mTBILL=1.05, stable)', async () => {
            const fixture = await loadFixture(defaultDeploy);
            const {
              token,
              redemptionVaultWithMToken,
              owner,
              mTBILL,
              mFONE,
              mockedAggregatorMToken,
            } = await setupAaveInnerVault(fixture, key);

            await setRoundData(
              { mockedAggregator: mockedAggregatorMToken },
              1.05,
            );
            await mintToken(mFONE, owner, 10000);
            await mintToken(mTBILL, redemptionVaultWithMToken, 10000);
            await approveBase18(owner, mFONE, redemptionVaultWithMToken, 10000);

            const mTbillBefore = await mTBILL.balanceOf(
              redemptionVaultWithMToken.address,
            );

            await redemptionVaultWithMToken
              .connect(owner)
              ['redeemInstant(address,uint256,uint256)'](
                token.address,
                parseUnits('100'),
                0,
              );

            expect(
              await mTBILL.balanceOf(redemptionVaultWithMToken.address),
            ).to.be.lt(mTbillBefore);
          });

          it('succeeds with high mTBILL rate (mTBILL=100, stable)', async () => {
            const fixture = await loadFixture(defaultDeploy);
            const {
              token,
              redemptionVaultWithMToken,
              owner,
              mTBILL,
              mFONE,
              mockedAggregatorMToken,
            } = await setupAaveInnerVault(fixture, key);

            await setRoundData(
              { mockedAggregator: mockedAggregatorMToken },
              100,
            );
            await mintToken(mFONE, owner, 10000);
            await mintToken(mTBILL, redemptionVaultWithMToken, 10000);
            await approveBase18(owner, mFONE, redemptionVaultWithMToken, 10000);

            const mTbillBefore = await mTBILL.balanceOf(
              redemptionVaultWithMToken.address,
            );

            await redemptionVaultWithMToken
              .connect(owner)
              ['redeemInstant(address,uint256,uint256)'](
                token.address,
                parseUnits('100'),
                0,
              );

            expect(
              await mTBILL.balanceOf(redemptionVaultWithMToken.address),
            ).to.be.lt(mTbillBefore);
          });

          it('succeeds with near-boundary rate (mTBILL=1.00000003, stable)', async () => {
            const fixture = await loadFixture(defaultDeploy);
            const {
              token,
              redemptionVaultWithMToken,
              owner,
              mTBILL,
              mFONE,
              mockedAggregatorMToken,
            } = await setupAaveInnerVault(fixture, key);

            await setRoundData(
              { mockedAggregator: mockedAggregatorMToken },
              1.00000003,
            );
            await mintToken(mFONE, owner, 100000);
            await mintToken(mTBILL, redemptionVaultWithMToken, 100000);
            await approveBase18(
              owner,
              mFONE,
              redemptionVaultWithMToken,
              100000,
            );

            const mTbillBefore = await mTBILL.balanceOf(
              redemptionVaultWithMToken.address,
            );

            await redemptionVaultWithMToken
              .connect(owner)
              ['redeemInstant(address,uint256,uint256)'](
                token.address,
                parseUnits('10000'),
                0,
              );

            expect(
              await mTBILL.balanceOf(redemptionVaultWithMToken.address),
            ).to.be.lt(mTbillBefore);
          });
        });
      }
    });

    describe('with RedemptionVaultWithMorpho as inner vault', () => {
      for (const { key, label } of [
        { key: 'usdc' as const, label: '8-dec' },
        { key: 'usdc6' as const, label: '6-dec' },
      ]) {
        describe(`tokenOut ${label} (${key})`, () => {
          async function setupMorphoInnerVault(
            fixture: Awaited<ReturnType<typeof defaultDeploy>>,
            tokenKey: 'usdc' | 'usdc6',
          ) {
            const {
              redemptionVaultWithMToken,
              redemptionVaultWithMorpho,
              morphoVaultMock,
              owner,
              mTBILL,
              mFONE,
              mFoneToUsdDataFeed,
              mTokenToUsdDataFeed,
              mockedAggregatorMToken,
              mockedAggregator,
              dataFeed,
              stableCoins,
            } = fixture;

            const token = stableCoins[tokenKey];

            await redemptionVaultWithMToken.setRedemptionVault(
              redemptionVaultWithMorpho.address,
            );

            await addPaymentTokenTest(
              { vault: redemptionVaultWithMToken, owner },
              token,
              dataFeed.address,
              0,
              true,
            );
            await addPaymentTokenTest(
              { vault: redemptionVaultWithMorpho, owner },
              token,
              dataFeed.address,
              0,
              true,
            );

            await redemptionVaultWithMorpho.addWaivedFeeAccount(
              redemptionVaultWithMToken.address,
            );

            if (tokenKey === 'usdc6') {
              const { MorphoVaultMock__factory } = await import(
                '../../typechain-types'
              );
              const morphoUsdc6 = await new MorphoVaultMock__factory(
                owner,
              ).deploy(token.address);
              await token.mint(morphoUsdc6.address, parseUnits('1000000', 6));
              await morphoUsdc6.mint(
                redemptionVaultWithMorpho.address,
                parseUnits('1000000', 6),
              );
              await redemptionVaultWithMorpho.setMorphoVault(
                token.address,
                morphoUsdc6.address,
              );
            } else {
              await token.mint(morphoVaultMock.address, parseUnits('1000000'));
              await morphoVaultMock.mint(
                redemptionVaultWithMorpho.address,
                parseUnits('1000000'),
              );
            }

            await setInstantFeeTest(
              { vault: redemptionVaultWithMToken, owner },
              0,
            );

            return {
              token,
              redemptionVaultWithMToken,
              owner,
              mTBILL,
              mFONE,
              mFoneToUsdDataFeed,
              mTokenToUsdDataFeed,
              mockedAggregatorMToken,
            };
          }

          it('succeeds with remainder-producing rate (mTBILL=1.05, stable)', async () => {
            const fixture = await loadFixture(defaultDeploy);
            const {
              token,
              redemptionVaultWithMToken,
              owner,
              mTBILL,
              mFONE,
              mockedAggregatorMToken,
            } = await setupMorphoInnerVault(fixture, key);

            await setRoundData(
              { mockedAggregator: mockedAggregatorMToken },
              1.05,
            );
            await mintToken(mFONE, owner, 10000);
            await mintToken(mTBILL, redemptionVaultWithMToken, 10000);
            await approveBase18(owner, mFONE, redemptionVaultWithMToken, 10000);

            const mTbillBefore = await mTBILL.balanceOf(
              redemptionVaultWithMToken.address,
            );

            await redemptionVaultWithMToken
              .connect(owner)
              ['redeemInstant(address,uint256,uint256)'](
                token.address,
                parseUnits('100'),
                0,
              );

            expect(
              await mTBILL.balanceOf(redemptionVaultWithMToken.address),
            ).to.be.lt(mTbillBefore);
          });

          it('succeeds with high mTBILL rate (mTBILL=100, stable)', async () => {
            const fixture = await loadFixture(defaultDeploy);
            const {
              token,
              redemptionVaultWithMToken,
              owner,
              mTBILL,
              mFONE,
              mockedAggregatorMToken,
            } = await setupMorphoInnerVault(fixture, key);

            await setRoundData(
              { mockedAggregator: mockedAggregatorMToken },
              100,
            );
            await mintToken(mFONE, owner, 10000);
            await mintToken(mTBILL, redemptionVaultWithMToken, 10000);
            await approveBase18(owner, mFONE, redemptionVaultWithMToken, 10000);

            const mTbillBefore = await mTBILL.balanceOf(
              redemptionVaultWithMToken.address,
            );

            await redemptionVaultWithMToken
              .connect(owner)
              ['redeemInstant(address,uint256,uint256)'](
                token.address,
                parseUnits('100'),
                0,
              );

            expect(
              await mTBILL.balanceOf(redemptionVaultWithMToken.address),
            ).to.be.lt(mTbillBefore);
          });

          it('succeeds with near-boundary rate (mTBILL=1.00000003, stable)', async () => {
            const fixture = await loadFixture(defaultDeploy);
            const {
              token,
              redemptionVaultWithMToken,
              owner,
              mTBILL,
              mFONE,
              mockedAggregatorMToken,
            } = await setupMorphoInnerVault(fixture, key);

            await setRoundData(
              { mockedAggregator: mockedAggregatorMToken },
              1.00000003,
            );
            await mintToken(mFONE, owner, 100000);
            await mintToken(mTBILL, redemptionVaultWithMToken, 100000);
            await approveBase18(
              owner,
              mFONE,
              redemptionVaultWithMToken,
              100000,
            );

            const mTbillBefore = await mTBILL.balanceOf(
              redemptionVaultWithMToken.address,
            );

            await redemptionVaultWithMToken
              .connect(owner)
              ['redeemInstant(address,uint256,uint256)'](
                token.address,
                parseUnits('10000'),
                0,
              );

            expect(
              await mTBILL.balanceOf(redemptionVaultWithMToken.address),
            ).to.be.lt(mTbillBefore);
          });
        });
      }
    });

    describe('with RedemptionVaultWithUSTB as inner vault', () => {
      describe('tokenOut 8-dec (usdc — USTB only supports its configured USDC)', () => {
        async function setupUstbInnerVault(
          fixture: Awaited<ReturnType<typeof defaultDeploy>>,
        ) {
          const {
            redemptionVaultWithMToken,
            redemptionVaultWithUSTB,
            ustbToken,
            ustbRedemption,
            owner,
            mTBILL,
            mFONE,
            mFoneToUsdDataFeed,
            mTokenToUsdDataFeed,
            mockedAggregatorMToken,
            mockedAggregator,
            dataFeed,
            stableCoins,
          } = fixture;

          const token = stableCoins.usdc;

          await redemptionVaultWithMToken.setRedemptionVault(
            redemptionVaultWithUSTB.address,
          );

          await addPaymentTokenTest(
            { vault: redemptionVaultWithMToken, owner },
            token,
            dataFeed.address,
            0,
            true,
          );
          await addPaymentTokenTest(
            { vault: redemptionVaultWithUSTB, owner },
            token,
            dataFeed.address,
            0,
            true,
          );

          await redemptionVaultWithUSTB.addWaivedFeeAccount(
            redemptionVaultWithMToken.address,
          );

          await ustbToken.mint(
            redemptionVaultWithUSTB.address,
            parseUnits('1000000', 6),
          );
          await token.mint(ustbRedemption.address, parseUnits('1000000'));

          await setInstantFeeTest(
            { vault: redemptionVaultWithMToken, owner },
            0,
          );

          return {
            token,
            redemptionVaultWithMToken,
            owner,
            mTBILL,
            mFONE,
            mFoneToUsdDataFeed,
            mTokenToUsdDataFeed,
            mockedAggregatorMToken,
          };
        }

        it('succeeds with remainder-producing rate (mTBILL=1.05, stable)', async () => {
          const fixture = await loadFixture(defaultDeploy);
          const {
            token,
            redemptionVaultWithMToken,
            owner,
            mTBILL,
            mFONE,
            mockedAggregatorMToken,
          } = await setupUstbInnerVault(fixture);

          await setRoundData(
            { mockedAggregator: mockedAggregatorMToken },
            1.05,
          );
          await mintToken(mFONE, owner, 10000);
          await mintToken(mTBILL, redemptionVaultWithMToken, 10000);
          await approveBase18(owner, mFONE, redemptionVaultWithMToken, 10000);

          const mTbillBefore = await mTBILL.balanceOf(
            redemptionVaultWithMToken.address,
          );

          await redemptionVaultWithMToken
            .connect(owner)
            ['redeemInstant(address,uint256,uint256)'](
              token.address,
              parseUnits('100'),
              0,
            );

          expect(
            await mTBILL.balanceOf(redemptionVaultWithMToken.address),
          ).to.be.lt(mTbillBefore);
        });

        it('succeeds with high mTBILL rate (mTBILL=100, stable)', async () => {
          const fixture = await loadFixture(defaultDeploy);
          const {
            token,
            redemptionVaultWithMToken,
            owner,
            mTBILL,
            mFONE,
            mockedAggregatorMToken,
          } = await setupUstbInnerVault(fixture);

          await setRoundData({ mockedAggregator: mockedAggregatorMToken }, 100);
          await mintToken(mFONE, owner, 10000);
          await mintToken(mTBILL, redemptionVaultWithMToken, 10000);
          await approveBase18(owner, mFONE, redemptionVaultWithMToken, 10000);

          const mTbillBefore = await mTBILL.balanceOf(
            redemptionVaultWithMToken.address,
          );

          await redemptionVaultWithMToken
            .connect(owner)
            ['redeemInstant(address,uint256,uint256)'](
              token.address,
              parseUnits('100'),
              0,
            );

          expect(
            await mTBILL.balanceOf(redemptionVaultWithMToken.address),
          ).to.be.lt(mTbillBefore);
        });

        it('succeeds with near-boundary rate (mTBILL=1.00000003, stable)', async () => {
          const fixture = await loadFixture(defaultDeploy);
          const {
            token,
            redemptionVaultWithMToken,
            owner,
            mTBILL,
            mFONE,
            mockedAggregatorMToken,
          } = await setupUstbInnerVault(fixture);

          await setRoundData(
            { mockedAggregator: mockedAggregatorMToken },
            1.00000003,
          );
          await mintToken(mFONE, owner, 100000);
          await mintToken(mTBILL, redemptionVaultWithMToken, 100000);
          await approveBase18(owner, mFONE, redemptionVaultWithMToken, 100000);

          const mTbillBefore = await mTBILL.balanceOf(
            redemptionVaultWithMToken.address,
          );

          await redemptionVaultWithMToken
            .connect(owner)
            ['redeemInstant(address,uint256,uint256)'](
              token.address,
              parseUnits('10000'),
              0,
            );

          expect(
            await mTBILL.balanceOf(redemptionVaultWithMToken.address),
          ).to.be.lt(mTbillBefore);
        });
      });
    });

    describe('with RedemptionVaultWithSwapper as inner vault - direct path', () => {
      async function setupSwapperDirectPath(
        fixture: Awaited<ReturnType<typeof defaultDeploy>>,
        tokenKey: 'usdc6' | 'usdc' | 'dai' | 'usdt',
      ) {
        const {
          redemptionVaultWithMToken,
          redemptionVaultWithSwapper,
          owner,
          mBASIS,
          mFONE,
          mFoneToUsdDataFeed,
          mBasisToUsdDataFeed,
          mockedAggregatorMBasis,
          mockedAggregator,
          dataFeed,
          stableCoins,
        } = fixture;

        const token = stableCoins[tokenKey];

        await redemptionVaultWithMToken.setRedemptionVault(
          redemptionVaultWithSwapper.address,
        );

        await addPaymentTokenTest(
          { vault: redemptionVaultWithMToken, owner },
          token,
          dataFeed.address,
          0,
          true,
        );
        await addPaymentTokenTest(
          { vault: redemptionVaultWithSwapper, owner },
          token,
          dataFeed.address,
          0,
          true,
        );

        await redemptionVaultWithSwapper.addWaivedFeeAccount(
          redemptionVaultWithMToken.address,
        );

        await setInstantFeeTest({ vault: redemptionVaultWithMToken, owner }, 0);

        await mintToken(token, redemptionVaultWithSwapper, 1_000_000);

        return {
          token,
          redemptionVaultWithMToken,
          redemptionVaultWithSwapper,
          owner,
          mBASIS,
          mFONE,
          mFoneToUsdDataFeed,
          mBasisToUsdDataFeed,
          mockedAggregatorMBasis,
          mockedAggregator,
        };
      }

      for (const { key, label } of [
        { key: 'usdc6' as const, label: '6-dec' },
        { key: 'usdc' as const, label: '8-dec' },
        { key: 'dai' as const, label: '9-dec' },
        { key: 'usdt' as const, label: '18-dec' },
      ]) {
        describe(`tokenOut ${label} (${key})`, () => {
          it('succeeds with exact division (mBasis=5, stable)', async () => {
            const fixture = await loadFixture(defaultDeploy);
            const {
              token,
              redemptionVaultWithMToken,
              owner,
              mBASIS,
              mFONE,
              mockedAggregatorMBasis,
            } = await setupSwapperDirectPath(fixture, key);

            await setRoundData({ mockedAggregator: mockedAggregatorMBasis }, 5);
            await mintToken(mFONE, owner, 10000);
            await mintToken(mBASIS, redemptionVaultWithMToken, 10000);
            await approveBase18(owner, mFONE, redemptionVaultWithMToken, 10000);

            const mBasisBefore = await mBASIS.balanceOf(
              redemptionVaultWithMToken.address,
            );

            await redemptionVaultWithMToken
              .connect(owner)
              ['redeemInstant(address,uint256,uint256)'](
                token.address,
                parseUnits('100'),
                0,
              );

            expect(
              await mBASIS.balanceOf(redemptionVaultWithMToken.address),
            ).to.be.lt(mBasisBefore);
          });

          it('succeeds with remainder-producing rate (mBasis=1.05, stable)', async () => {
            const fixture = await loadFixture(defaultDeploy);
            const {
              token,
              redemptionVaultWithMToken,
              owner,
              mBASIS,
              mFONE,
              mockedAggregatorMBasis,
            } = await setupSwapperDirectPath(fixture, key);

            await setRoundData(
              { mockedAggregator: mockedAggregatorMBasis },
              1.05,
            );
            await mintToken(mFONE, owner, 10000);
            await mintToken(mBASIS, redemptionVaultWithMToken, 10000);
            await approveBase18(owner, mFONE, redemptionVaultWithMToken, 10000);

            const mBasisBefore = await mBASIS.balanceOf(
              redemptionVaultWithMToken.address,
            );
            const userTokenBefore = await token.balanceOf(owner.address);

            await redemptionVaultWithMToken
              .connect(owner)
              ['redeemInstant(address,uint256,uint256)'](
                token.address,
                parseUnits('100'),
                0,
              );

            expect(
              await mBASIS.balanceOf(redemptionVaultWithMToken.address),
            ).to.be.lt(mBasisBefore);
            expect(await token.balanceOf(owner.address)).to.be.gt(
              userTokenBefore,
            );
          });

          it('succeeds with high rate (mBasis=100, stable)', async () => {
            const fixture = await loadFixture(defaultDeploy);
            const {
              token,
              redemptionVaultWithMToken,
              owner,
              mBASIS,
              mFONE,
              mockedAggregatorMBasis,
            } = await setupSwapperDirectPath(fixture, key);

            await setRoundData(
              { mockedAggregator: mockedAggregatorMBasis },
              100,
            );
            await mintToken(mFONE, owner, 10000);
            await mintToken(mBASIS, redemptionVaultWithMToken, 10000);
            await approveBase18(owner, mFONE, redemptionVaultWithMToken, 10000);

            const mBasisBefore = await mBASIS.balanceOf(
              redemptionVaultWithMToken.address,
            );

            await redemptionVaultWithMToken
              .connect(owner)
              ['redeemInstant(address,uint256,uint256)'](
                token.address,
                parseUnits('100'),
                0,
              );

            expect(
              await mBASIS.balanceOf(redemptionVaultWithMToken.address),
            ).to.be.lt(mBasisBefore);
          });

          it('succeeds with near-boundary rate (mBasis=1.00000003, stable)', async () => {
            const fixture = await loadFixture(defaultDeploy);
            const {
              token,
              redemptionVaultWithMToken,
              owner,
              mBASIS,
              mFONE,
              mockedAggregatorMBasis,
            } = await setupSwapperDirectPath(fixture, key);

            await setRoundData(
              { mockedAggregator: mockedAggregatorMBasis },
              1.00000003,
            );
            await mintToken(mFONE, owner, 100000);
            await mintToken(mBASIS, redemptionVaultWithMToken, 100000);
            await approveBase18(
              owner,
              mFONE,
              redemptionVaultWithMToken,
              100000,
            );

            const mBasisBefore = await mBASIS.balanceOf(
              redemptionVaultWithMToken.address,
            );

            await redemptionVaultWithMToken
              .connect(owner)
              ['redeemInstant(address,uint256,uint256)'](
                token.address,
                parseUnits('10000'),
                0,
              );

            expect(
              await mBASIS.balanceOf(redemptionVaultWithMToken.address),
            ).to.be.lt(mBasisBefore);
          });

          it('succeeds with non-stable tokenOut (mBasis=1.05, tokenOut=1.03)', async () => {
            const fixture = await loadFixture(defaultDeploy);
            const {
              token,
              redemptionVaultWithMToken,
              owner,
              mBASIS,
              mFONE,
              mockedAggregatorMBasis,
              mockedAggregator,
            } = await setupSwapperDirectPath(fixture, key);

            await removePaymentTokenTest(
              { vault: redemptionVaultWithMToken, owner },
              token,
            );
            await addPaymentTokenTest(
              { vault: redemptionVaultWithMToken, owner },
              token,
              fixture.dataFeed.address,
              0,
              false,
            );
            await removePaymentTokenTest(
              { vault: fixture.redemptionVaultWithSwapper, owner },
              token,
            );
            await addPaymentTokenTest(
              { vault: fixture.redemptionVaultWithSwapper, owner },
              token,
              fixture.dataFeed.address,
              0,
              false,
            );

            await setRoundData(
              { mockedAggregator: mockedAggregatorMBasis },
              1.05,
            );
            await setRoundData({ mockedAggregator }, 1.03);
            await mintToken(mFONE, owner, 10000);
            await mintToken(mBASIS, redemptionVaultWithMToken, 10000);
            await approveBase18(owner, mFONE, redemptionVaultWithMToken, 10000);

            const mBasisBefore = await mBASIS.balanceOf(
              redemptionVaultWithMToken.address,
            );

            await redemptionVaultWithMToken
              .connect(owner)
              ['redeemInstant(address,uint256,uint256)'](
                token.address,
                parseUnits('100'),
                0,
              );

            expect(
              await mBASIS.balanceOf(redemptionVaultWithMToken.address),
            ).to.be.lt(mBasisBefore);
          });
        });
      }
    });

    describe('with RedemptionVaultWithSwapper as inner vault - swap path', () => {
      async function setupSwapperSwapPath(
        fixture: Awaited<ReturnType<typeof defaultDeploy>>,
        tokenKey: 'usdc6' | 'usdc' | 'dai' | 'usdt',
      ) {
        const {
          redemptionVaultWithMToken,
          redemptionVaultWithSwapper,
          redemptionVault,
          owner,
          mTBILL,
          mBASIS,
          mFONE,
          mFoneToUsdDataFeed,
          mBasisToUsdDataFeed,
          mockedAggregatorMBasis,
          mockedAggregatorMToken,
          mockedAggregator,
          dataFeed,
          stableCoins,
          liquidityProvider,
        } = fixture;

        const token = stableCoins[tokenKey];

        await redemptionVaultWithMToken.setRedemptionVault(
          redemptionVaultWithSwapper.address,
        );

        await addPaymentTokenTest(
          { vault: redemptionVaultWithMToken, owner },
          token,
          dataFeed.address,
          0,
          true,
        );
        await addPaymentTokenTest(
          { vault: redemptionVaultWithSwapper, owner },
          token,
          dataFeed.address,
          0,
          true,
        );
        await addPaymentTokenTest(
          { vault: redemptionVault, owner },
          token,
          dataFeed.address,
          0,
          true,
        );

        await redemptionVaultWithSwapper.addWaivedFeeAccount(
          redemptionVaultWithMToken.address,
        );

        await setInstantFeeTest({ vault: redemptionVaultWithMToken, owner }, 0);

        await mintToken(mTBILL, liquidityProvider, 1_000_000);
        await approveBase18(
          liquidityProvider,
          mTBILL,
          redemptionVaultWithSwapper,
          1_000_000,
        );
        await mintToken(token, redemptionVault, 1_000_000);

        return {
          token,
          redemptionVaultWithMToken,
          redemptionVaultWithSwapper,
          redemptionVault,
          owner,
          mTBILL,
          mBASIS,
          mFONE,
          mFoneToUsdDataFeed,
          mBasisToUsdDataFeed,
          mockedAggregatorMBasis,
          mockedAggregatorMToken,
          mockedAggregator,
          liquidityProvider,
        };
      }

      for (const { key, label } of [
        { key: 'usdc6' as const, label: '6-dec' },
        { key: 'usdc' as const, label: '8-dec' },
        { key: 'dai' as const, label: '9-dec' },
        { key: 'usdt' as const, label: '18-dec' },
      ]) {
        describe(`tokenOut ${label} (${key})`, () => {
          it('succeeds with equal mBasis/mTBILL rates (mBasis=5, mTBILL=5, stable)', async () => {
            const fixture = await loadFixture(defaultDeploy);
            const {
              token,
              redemptionVaultWithMToken,
              owner,
              mBASIS,
              mFONE,
              mockedAggregatorMBasis,
              mockedAggregatorMToken,
            } = await setupSwapperSwapPath(fixture, key);

            await setRoundData({ mockedAggregator: mockedAggregatorMBasis }, 5);
            await setRoundData({ mockedAggregator: mockedAggregatorMToken }, 5);
            await mintToken(mFONE, owner, 10000);
            await mintToken(mBASIS, redemptionVaultWithMToken, 10000);
            await approveBase18(owner, mFONE, redemptionVaultWithMToken, 10000);

            const mBasisBefore = await mBASIS.balanceOf(
              redemptionVaultWithMToken.address,
            );

            await redemptionVaultWithMToken
              .connect(owner)
              ['redeemInstant(address,uint256,uint256)'](
                token.address,
                parseUnits('100'),
                0,
              );

            expect(
              await mBASIS.balanceOf(redemptionVaultWithMToken.address),
            ).to.be.lt(mBasisBefore);
          });

          it('succeeds with clean-division rates (mBasis=6, mTBILL=3, stable)', async () => {
            const fixture = await loadFixture(defaultDeploy);
            const {
              token,
              redemptionVaultWithMToken,
              owner,
              mBASIS,
              mFONE,
              mockedAggregatorMBasis,
              mockedAggregatorMToken,
            } = await setupSwapperSwapPath(fixture, key);

            await setRoundData({ mockedAggregator: mockedAggregatorMBasis }, 6);
            await setRoundData({ mockedAggregator: mockedAggregatorMToken }, 3);
            await mintToken(mFONE, owner, 10000);
            await mintToken(mBASIS, redemptionVaultWithMToken, 10000);
            await approveBase18(owner, mFONE, redemptionVaultWithMToken, 10000);

            const mBasisBefore = await mBASIS.balanceOf(
              redemptionVaultWithMToken.address,
            );

            await redemptionVaultWithMToken
              .connect(owner)
              ['redeemInstant(address,uint256,uint256)'](
                token.address,
                parseUnits('100'),
                0,
              );

            expect(
              await mBASIS.balanceOf(redemptionVaultWithMToken.address),
            ).to.be.lt(mBasisBefore);
          });

          it('succeeds with remainder-producing swap (mBasis=1.05, mTBILL=1.03, stable)', async () => {
            const fixture = await loadFixture(defaultDeploy);
            const {
              token,
              redemptionVaultWithMToken,
              owner,
              mBASIS,
              mFONE,
              mockedAggregatorMBasis,
              mockedAggregatorMToken,
            } = await setupSwapperSwapPath(fixture, key);

            await setRoundData(
              { mockedAggregator: mockedAggregatorMBasis },
              1.05,
            );
            await setRoundData(
              { mockedAggregator: mockedAggregatorMToken },
              1.03,
            );
            await mintToken(mFONE, owner, 10000);
            await mintToken(mBASIS, redemptionVaultWithMToken, 10000);
            await approveBase18(owner, mFONE, redemptionVaultWithMToken, 10000);

            const mBasisBefore = await mBASIS.balanceOf(
              redemptionVaultWithMToken.address,
            );

            await redemptionVaultWithMToken
              .connect(owner)
              ['redeemInstant(address,uint256,uint256)'](
                token.address,
                parseUnits('100'),
                0,
              );

            expect(
              await mBASIS.balanceOf(redemptionVaultWithMToken.address),
            ).to.be.lt(mBasisBefore);
          });

          it('succeeds with high divergent rates (mBasis=100, mTBILL=7, stable)', async () => {
            const fixture = await loadFixture(defaultDeploy);
            const {
              token,
              redemptionVaultWithMToken,
              owner,
              mBASIS,
              mFONE,
              mockedAggregatorMBasis,
              mockedAggregatorMToken,
            } = await setupSwapperSwapPath(fixture, key);

            await setRoundData(
              { mockedAggregator: mockedAggregatorMBasis },
              100,
            );
            await setRoundData({ mockedAggregator: mockedAggregatorMToken }, 7);
            await mintToken(mFONE, owner, 10000);
            await mintToken(mBASIS, redemptionVaultWithMToken, 10000);
            await approveBase18(owner, mFONE, redemptionVaultWithMToken, 10000);

            const mBasisBefore = await mBASIS.balanceOf(
              redemptionVaultWithMToken.address,
            );

            await redemptionVaultWithMToken
              .connect(owner)
              ['redeemInstant(address,uint256,uint256)'](
                token.address,
                parseUnits('100'),
                0,
              );

            expect(
              await mBASIS.balanceOf(redemptionVaultWithMToken.address),
            ).to.be.lt(mBasisBefore);
          });

          it('succeeds with near-boundary rates (mBasis=1.00000003, mTBILL=1.00000007, stable)', async () => {
            const fixture = await loadFixture(defaultDeploy);
            const {
              token,
              redemptionVaultWithMToken,
              owner,
              mBASIS,
              mFONE,
              mockedAggregatorMBasis,
              mockedAggregatorMToken,
            } = await setupSwapperSwapPath(fixture, key);

            await setRoundData(
              { mockedAggregator: mockedAggregatorMBasis },
              1.00000003,
            );
            await setRoundData(
              { mockedAggregator: mockedAggregatorMToken },
              1.00000007,
            );
            await mintToken(mFONE, owner, 100000);
            await mintToken(mBASIS, redemptionVaultWithMToken, 100000);
            await approveBase18(
              owner,
              mFONE,
              redemptionVaultWithMToken,
              100000,
            );

            const mBasisBefore = await mBASIS.balanceOf(
              redemptionVaultWithMToken.address,
            );

            await redemptionVaultWithMToken
              .connect(owner)
              ['redeemInstant(address,uint256,uint256)'](
                token.address,
                parseUnits('10000'),
                0,
              );

            expect(
              await mBASIS.balanceOf(redemptionVaultWithMToken.address),
            ).to.be.lt(mBasisBefore);
          });
        });
      }
    });

    describe('with outer vault fee enabled', () => {
      it('succeeds with 1% fee, usdc6 (6-dec), mTBILL=1.05, stable', async () => {
        const fixture = await loadFixture(defaultDeploy);
        const { token, amount, redemptionVaultWithMToken, owner, mTBILL } =
          await setupCeilDivTest({
            fixture,
            tokenKey: 'usdc6',
            mTbillRate: 1.05,
            isStable: true,
          });

        await setInstantFeeTest(
          { vault: redemptionVaultWithMToken, owner },
          100,
        );

        const mTbillBefore = await mTBILL.balanceOf(
          redemptionVaultWithMToken.address,
        );
        const userTokenBefore = await token.balanceOf(owner.address);

        await redemptionVaultWithMToken
          .connect(owner)
          ['redeemInstant(address,uint256,uint256)'](
            token.address,
            parseUnits(amount.toString()),
            0,
          );

        expect(
          await mTBILL.balanceOf(redemptionVaultWithMToken.address),
        ).to.be.lt(mTbillBefore);
        expect(await token.balanceOf(owner.address)).to.be.gt(userTokenBefore);
      });

      it('succeeds with 1% fee, usdc (8-dec), mTBILL=1.05, stable', async () => {
        const fixture = await loadFixture(defaultDeploy);
        const { token, amount, redemptionVaultWithMToken, owner, mTBILL } =
          await setupCeilDivTest({
            fixture,
            tokenKey: 'usdc',
            mTbillRate: 1.05,
            isStable: true,
          });

        await setInstantFeeTest(
          { vault: redemptionVaultWithMToken, owner },
          100,
        );

        const mTbillBefore = await mTBILL.balanceOf(
          redemptionVaultWithMToken.address,
        );
        const userTokenBefore = await token.balanceOf(owner.address);

        await redemptionVaultWithMToken
          .connect(owner)
          ['redeemInstant(address,uint256,uint256)'](
            token.address,
            parseUnits(amount.toString()),
            0,
          );

        expect(
          await mTBILL.balanceOf(redemptionVaultWithMToken.address),
        ).to.be.lt(mTbillBefore);
        expect(await token.balanceOf(owner.address)).to.be.gt(userTokenBefore);
      });

      it('succeeds with 1% fee, usdt (18-dec), mTBILL=1.05, stable', async () => {
        const fixture = await loadFixture(defaultDeploy);
        const { token, amount, redemptionVaultWithMToken, owner, mTBILL } =
          await setupCeilDivTest({
            fixture,
            tokenKey: 'usdt',
            mTbillRate: 1.05,
            isStable: true,
          });

        await setInstantFeeTest(
          { vault: redemptionVaultWithMToken, owner },
          100,
        );

        const mTbillBefore = await mTBILL.balanceOf(
          redemptionVaultWithMToken.address,
        );
        const userTokenBefore = await token.balanceOf(owner.address);

        await redemptionVaultWithMToken
          .connect(owner)
          ['redeemInstant(address,uint256,uint256)'](
            token.address,
            parseUnits(amount.toString()),
            0,
          );

        expect(
          await mTBILL.balanceOf(redemptionVaultWithMToken.address),
        ).to.be.lt(mTbillBefore);
        expect(await token.balanceOf(owner.address)).to.be.gt(userTokenBefore);
      });

      it('succeeds with 1% fee, usdc6 (6-dec), mTBILL=100, stable', async () => {
        const fixture = await loadFixture(defaultDeploy);
        const { token, amount, redemptionVaultWithMToken, owner, mTBILL } =
          await setupCeilDivTest({
            fixture,
            tokenKey: 'usdc6',
            mTbillRate: 100,
            isStable: true,
          });

        await setInstantFeeTest(
          { vault: redemptionVaultWithMToken, owner },
          100,
        );

        const mTbillBefore = await mTBILL.balanceOf(
          redemptionVaultWithMToken.address,
        );

        await redemptionVaultWithMToken
          .connect(owner)
          ['redeemInstant(address,uint256,uint256)'](
            token.address,
            parseUnits(amount.toString()),
            0,
          );

        expect(
          await mTBILL.balanceOf(redemptionVaultWithMToken.address),
        ).to.be.lt(mTbillBefore);
      });

      it('succeeds with 1% fee, usdc (8-dec), non-stable mTBILL=1.05 tokenOut=1.03', async () => {
        const fixture = await loadFixture(defaultDeploy);
        const { token, amount, redemptionVaultWithMToken, owner, mTBILL } =
          await setupCeilDivTest({
            fixture,
            tokenKey: 'usdc',
            mTbillRate: 1.05,
            isStable: false,
            tokenOutRate: 1.03,
          });

        await setInstantFeeTest(
          { vault: redemptionVaultWithMToken, owner },
          100,
        );

        const mTbillBefore = await mTBILL.balanceOf(
          redemptionVaultWithMToken.address,
        );
        const userTokenBefore = await token.balanceOf(owner.address);

        await redemptionVaultWithMToken
          .connect(owner)
          ['redeemInstant(address,uint256,uint256)'](
            token.address,
            parseUnits(amount.toString()),
            0,
          );

        expect(
          await mTBILL.balanceOf(redemptionVaultWithMToken.address),
        ).to.be.lt(mTbillBefore);
        expect(await token.balanceOf(owner.address)).to.be.gt(userTokenBefore);
      });

      it('succeeds with 1% fee, usdc6 (6-dec), near-boundary mTBILL=1.00000003', async () => {
        const fixture = await loadFixture(defaultDeploy);
        const { token, redemptionVaultWithMToken, owner, mTBILL } =
          await setupCeilDivTest({
            fixture,
            tokenKey: 'usdc6',
            mTbillRate: 1.00000003,
            isStable: true,
            redeemAmount: 10000,
          });

        await setInstantFeeTest(
          { vault: redemptionVaultWithMToken, owner },
          100,
        );

        const mTbillBefore = await mTBILL.balanceOf(
          redemptionVaultWithMToken.address,
        );

        await redemptionVaultWithMToken
          .connect(owner)
          ['redeemInstant(address,uint256,uint256)'](
            token.address,
            parseUnits('10000'),
            0,
          );

        expect(
          await mTBILL.balanceOf(redemptionVaultWithMToken.address),
        ).to.be.lt(mTbillBefore);
      });
    });

    describe('minReceiveAmount assertions', () => {
      it('succeeds with exact minReceiveAmount (6-dec, mTBILL=1.05)', async () => {
        const fixture = await loadFixture(defaultDeploy);
        const {
          token,
          amount,
          redemptionVaultWithMToken,
          owner,
          mFoneRate,
          tokenOutRate,
        } = await setupCeilDivTest({
          fixture,
          tokenKey: 'usdc6',
          mTbillRate: 1.05,
          isStable: true,
        });

        const expectedNative = computeExpectedTokenOut(
          parseUnits(amount.toString()),
          mFoneRate,
          tokenOutRate,
          TOKEN_DECIMALS['usdc6'],
          0,
          true,
        );
        const expectedBase18 = expectedNative.mul(
          BigNumber.from(10).pow(18 - TOKEN_DECIMALS['usdc6']),
        );

        const userTokenBefore = await token.balanceOf(owner.address);

        await redemptionVaultWithMToken
          .connect(owner)
          ['redeemInstant(address,uint256,uint256)'](
            token.address,
            parseUnits(amount.toString()),
            expectedBase18,
          );

        const userTokenAfter = await token.balanceOf(owner.address);
        expect(userTokenAfter.sub(userTokenBefore)).to.equal(expectedNative);
      });

      it('reverts when minReceiveAmount exceeds actual (6-dec, mTBILL=1.05)', async () => {
        const fixture = await loadFixture(defaultDeploy);
        const {
          token,
          amount,
          redemptionVaultWithMToken,
          owner,
          mFoneRate,
          tokenOutRate,
        } = await setupCeilDivTest({
          fixture,
          tokenKey: 'usdc6',
          mTbillRate: 1.05,
          isStable: true,
        });

        const expectedNative = computeExpectedTokenOut(
          parseUnits(amount.toString()),
          mFoneRate,
          tokenOutRate,
          TOKEN_DECIMALS['usdc6'],
          0,
          true,
        );
        const tooHigh = expectedNative
          .mul(BigNumber.from(10).pow(18 - TOKEN_DECIMALS['usdc6']))
          .add(1);

        await expect(
          redemptionVaultWithMToken
            .connect(owner)
            ['redeemInstant(address,uint256,uint256)'](
              token.address,
              parseUnits(amount.toString()),
              tooHigh,
            ),
        ).to.be.revertedWith('RVMT: minReceiveAmount > actual');
      });
    });

    describe('partial outer vault balance', () => {
      it('succeeds with 30% tokenOut present in outer vault (6-dec, mTBILL=1.05)', async () => {
        const fixture = await loadFixture(defaultDeploy);
        const {
          token,
          amount,
          redemptionVaultWithMToken,
          owner,
          mTBILL,
          mFoneRate,
          tokenOutRate,
        } = await setupCeilDivTest({
          fixture,
          tokenKey: 'usdc6',
          mTbillRate: 1.05,
          isStable: true,
        });

        const expectedNative = computeExpectedTokenOut(
          parseUnits(amount.toString()),
          mFoneRate,
          tokenOutRate,
          TOKEN_DECIMALS['usdc6'],
          0,
          true,
        );
        const thirtyPercent = expectedNative.mul(30).div(100);
        await token.mint(redemptionVaultWithMToken.address, thirtyPercent);

        const mTbillBefore = await mTBILL.balanceOf(
          redemptionVaultWithMToken.address,
        );
        const userTokenBefore = await token.balanceOf(owner.address);

        await redemptionVaultWithMToken
          .connect(owner)
          ['redeemInstant(address,uint256,uint256)'](
            token.address,
            parseUnits(amount.toString()),
            0,
          );

        expect(
          await mTBILL.balanceOf(redemptionVaultWithMToken.address),
        ).to.be.lt(mTbillBefore);

        const userTokenAfter = await token.balanceOf(owner.address);
        expect(userTokenAfter.sub(userTokenBefore)).to.equal(expectedNative);
      });

      it('succeeds with 99% tokenOut present in outer vault (6-dec, mTBILL=1.05)', async () => {
        const fixture = await loadFixture(defaultDeploy);
        const {
          token,
          amount,
          redemptionVaultWithMToken,
          owner,
          mTBILL,
          mFoneRate,
          tokenOutRate,
        } = await setupCeilDivTest({
          fixture,
          tokenKey: 'usdc6',
          mTbillRate: 1.05,
          isStable: true,
        });

        const expectedNative = computeExpectedTokenOut(
          parseUnits(amount.toString()),
          mFoneRate,
          tokenOutRate,
          TOKEN_DECIMALS['usdc6'],
          0,
          true,
        );
        const ninetyNinePercent = expectedNative.mul(99).div(100);
        await token.mint(redemptionVaultWithMToken.address, ninetyNinePercent);

        const mTbillBefore = await mTBILL.balanceOf(
          redemptionVaultWithMToken.address,
        );
        const userTokenBefore = await token.balanceOf(owner.address);

        await redemptionVaultWithMToken
          .connect(owner)
          ['redeemInstant(address,uint256,uint256)'](
            token.address,
            parseUnits(amount.toString()),
            0,
          );

        expect(
          await mTBILL.balanceOf(redemptionVaultWithMToken.address),
        ).to.be.lt(mTbillBefore);

        const userTokenAfter = await token.balanceOf(owner.address);
        expect(userTokenAfter.sub(userTokenBefore)).to.equal(expectedNative);
      });
    });

    describe('mFONE rate variation', () => {
      it('succeeds with high mFONE rate (mFONE=3.5, mTBILL=1.05, 6-dec)', async () => {
        const fixture = await loadFixture(defaultDeploy);
        const {
          token,
          amount,
          redemptionVaultWithMToken,
          owner,
          mTBILL,
          mFoneToUsdDataFeed,
          mockedAggregatorMFone,
          tokenOutRate,
        } = await setupCeilDivTest({
          fixture,
          tokenKey: 'usdc6',
          mTbillRate: 1.05,
          isStable: true,
        });

        await setRoundData({ mockedAggregator: mockedAggregatorMFone }, 3.5);
        const mFoneRate = await mFoneToUsdDataFeed.getDataInBase18();

        const mTbillBefore = await mTBILL.balanceOf(
          redemptionVaultWithMToken.address,
        );
        const userTokenBefore = await token.balanceOf(owner.address);

        await redemptionVaultWithMToken
          .connect(owner)
          ['redeemInstant(address,uint256,uint256)'](
            token.address,
            parseUnits(amount.toString()),
            0,
          );

        expect(
          await mTBILL.balanceOf(redemptionVaultWithMToken.address),
        ).to.be.lt(mTbillBefore);

        const expected = computeExpectedTokenOut(
          parseUnits(amount.toString()),
          mFoneRate,
          tokenOutRate,
          TOKEN_DECIMALS['usdc6'],
          0,
          true,
        );
        const userTokenAfter = await token.balanceOf(owner.address);
        expect(userTokenAfter.sub(userTokenBefore)).to.equal(expected);
      });

      it('succeeds with low mFONE rate (mFONE=0.5, mTBILL=1.05, 6-dec)', async () => {
        const fixture = await loadFixture(defaultDeploy);
        const {
          token,
          amount,
          redemptionVaultWithMToken,
          owner,
          mTBILL,
          mFoneToUsdDataFeed,
          mockedAggregatorMFone,
          tokenOutRate,
        } = await setupCeilDivTest({
          fixture,
          tokenKey: 'usdc6',
          mTbillRate: 1.05,
          isStable: true,
        });

        await setRoundData({ mockedAggregator: mockedAggregatorMFone }, 0.5);
        const mFoneRate = await mFoneToUsdDataFeed.getDataInBase18();

        const mTbillBefore = await mTBILL.balanceOf(
          redemptionVaultWithMToken.address,
        );
        const userTokenBefore = await token.balanceOf(owner.address);

        await redemptionVaultWithMToken
          .connect(owner)
          ['redeemInstant(address,uint256,uint256)'](
            token.address,
            parseUnits(amount.toString()),
            0,
          );

        expect(
          await mTBILL.balanceOf(redemptionVaultWithMToken.address),
        ).to.be.lt(mTbillBefore);

        const expected = computeExpectedTokenOut(
          parseUnits(amount.toString()),
          mFoneRate,
          tokenOutRate,
          TOKEN_DECIMALS['usdc6'],
          0,
          true,
        );
        const userTokenAfter = await token.balanceOf(owner.address);
        expect(userTokenAfter.sub(userTokenBefore)).to.equal(expected);
      });
    });
  });
});
