import { loadFixture } from '@nomicfoundation/hardhat-network-helpers';
import { expect } from 'chai';
import { constants } from 'ethers';
import { parseUnits } from 'ethers/lib/utils';
import { ethers } from 'hardhat';

import { encodeFnSelector } from '../../helpers/utils';
import {
  ManageableVaultTester__factory,
  RedemptionVaultWithMorphoTest__factory,
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
import {
  approveRedeemRequestTest,
  redeemFiatRequestTest,
  redeemInstantTest,
  redeemRequestTest,
  rejectRedeemRequestTest,
  setFiatAdditionalFeeTest,
  setMinFiatRedeemAmountTest,
} from '../common/redemption-vault.helpers';
import { sanctionUser } from '../common/with-sanctions-list.helpers';

describe('RedemptionVaultWithMorpho', function () {
  it('deployment', async () => {
    const {
      redemptionVaultWithMorpho,
      morphoVaultMock,
      mTBILL,
      tokensReceiver,
      feeReceiver,
      mTokenToUsdDataFeed,
      roles,
    } = await loadFixture(defaultDeploy);

    expect(await redemptionVaultWithMorpho.mToken()).eq(mTBILL.address);

    expect(await redemptionVaultWithMorpho.ONE_HUNDRED_PERCENT()).eq('10000');

    expect(await redemptionVaultWithMorpho.paused()).eq(false);

    expect(await redemptionVaultWithMorpho.tokensReceiver()).eq(
      tokensReceiver.address,
    );
    expect(await redemptionVaultWithMorpho.feeReceiver()).eq(
      feeReceiver.address,
    );

    expect(await redemptionVaultWithMorpho.minAmount()).eq(1000);
    expect(await redemptionVaultWithMorpho.minFiatRedeemAmount()).eq(1000);

    expect(await redemptionVaultWithMorpho.instantFee()).eq('100');

    expect(await redemptionVaultWithMorpho.instantDailyLimit()).eq(
      parseUnits('100000'),
    );

    expect(await redemptionVaultWithMorpho.mTokenDataFeed()).eq(
      mTokenToUsdDataFeed.address,
    );
    expect(await redemptionVaultWithMorpho.variationTolerance()).eq(1);

    expect(await redemptionVaultWithMorpho.vaultRole()).eq(
      roles.tokenRoles.mTBILL.redemptionVaultAdmin,
    );

    expect(await redemptionVaultWithMorpho.MANUAL_FULLFILMENT_TOKEN()).eq(
      ethers.constants.AddressZero,
    );

    expect(await redemptionVaultWithMorpho.morphoVault()).eq(
      morphoVaultMock.address,
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

    const redemptionVaultWithMorpho =
      await new RedemptionVaultWithMorphoTest__factory(owner).deploy();

    await expect(
      redemptionVaultWithMorpho[
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
      const { redemptionVaultWithMorpho } = await loadFixture(defaultDeploy);

      await expect(
        redemptionVaultWithMorpho[
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

    it('should fail: when morphoVault address zero', async () => {
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

      const redemptionVaultWithMorpho =
        await new RedemptionVaultWithMorphoTest__factory(owner).deploy();

      await expect(
        redemptionVaultWithMorpho[
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

  describe('setMorphoVault()', () => {
    it('should fail: call from address without vault admin role', async () => {
      const { redemptionVaultWithMorpho, regularAccounts } = await loadFixture(
        defaultDeploy,
      );
      await expect(
        redemptionVaultWithMorpho
          .connect(regularAccounts[0])
          .setMorphoVault(regularAccounts[1].address),
      ).revertedWith('WMAC: hasnt role');
    });

    it('should fail: zero address', async () => {
      const { redemptionVaultWithMorpho } = await loadFixture(defaultDeploy);
      await expect(
        redemptionVaultWithMorpho.setMorphoVault(constants.AddressZero),
      ).revertedWith('zero address');
    });

    it('should succeed and emit SetMorphoVault event', async () => {
      const { redemptionVaultWithMorpho, regularAccounts } = await loadFixture(
        defaultDeploy,
      );
      await expect(
        redemptionVaultWithMorpho.setMorphoVault(regularAccounts[1].address),
      )
        .to.emit(redemptionVaultWithMorpho, 'SetMorphoVault')
        .withArgs(
          (
            await ethers.getSigners()
          )[0].address,
          regularAccounts[1].address,
        );
    });
  });

  describe('setMinAmount()', () => {
    it('should fail: call from address without vault admin role', async () => {
      const { redemptionVaultWithMorpho, regularAccounts } = await loadFixture(
        defaultDeploy,
      );
      await setMinAmountTest(
        { vault: redemptionVaultWithMorpho, owner: regularAccounts[0] },
        1,
        { revertMessage: 'WMAC: hasnt role', from: regularAccounts[0] },
      );
    });

    it('call from address with vault admin role', async () => {
      const { owner, redemptionVaultWithMorpho } = await loadFixture(
        defaultDeploy,
      );
      await setMinAmountTest({ vault: redemptionVaultWithMorpho, owner }, 1);
    });
  });

  describe('setMinFiatRedeemAmount()', () => {
    it('should fail: call from address without vault admin role', async () => {
      const { redemptionVaultWithMorpho, regularAccounts } = await loadFixture(
        defaultDeploy,
      );
      await setMinFiatRedeemAmountTest(
        {
          redemptionVault: redemptionVaultWithMorpho,
          owner: regularAccounts[0],
        },
        1,
        { revertMessage: 'WMAC: hasnt role', from: regularAccounts[0] },
      );
    });

    it('call from address with vault admin role', async () => {
      const { owner, redemptionVaultWithMorpho } = await loadFixture(
        defaultDeploy,
      );
      await setMinFiatRedeemAmountTest(
        { redemptionVault: redemptionVaultWithMorpho, owner },
        1,
      );
    });
  });

  describe('setFiatAdditionalFee()', () => {
    it('should fail: call from address without vault admin role', async () => {
      const { redemptionVaultWithMorpho, regularAccounts } = await loadFixture(
        defaultDeploy,
      );
      await setFiatAdditionalFeeTest(
        {
          redemptionVault: redemptionVaultWithMorpho,
          owner: regularAccounts[0],
        },
        1,
        { revertMessage: 'WMAC: hasnt role', from: regularAccounts[0] },
      );
    });

    it('call from address with vault admin role', async () => {
      const { owner, redemptionVaultWithMorpho } = await loadFixture(
        defaultDeploy,
      );
      await setFiatAdditionalFeeTest(
        { redemptionVault: redemptionVaultWithMorpho, owner },
        1,
      );
    });
  });

  describe('setInstantDailyLimit()', () => {
    it('should fail: call from address without vault admin role', async () => {
      const { redemptionVaultWithMorpho, regularAccounts } = await loadFixture(
        defaultDeploy,
      );
      await setInstantDailyLimitTest(
        { vault: redemptionVaultWithMorpho, owner: regularAccounts[0] },
        1,
        { revertMessage: 'WMAC: hasnt role', from: regularAccounts[0] },
      );
    });

    it('should fail: try to set 0 limit', async () => {
      const { owner, redemptionVaultWithMorpho } = await loadFixture(
        defaultDeploy,
      );
      await setInstantDailyLimitTest(
        { vault: redemptionVaultWithMorpho, owner },
        constants.Zero,
        { revertMessage: 'MV: limit zero' },
      );
    });

    it('call from address with vault admin role', async () => {
      const { owner, redemptionVaultWithMorpho } = await loadFixture(
        defaultDeploy,
      );
      await setInstantDailyLimitTest(
        { vault: redemptionVaultWithMorpho, owner },
        1,
      );
    });
  });

  describe('addPaymentToken()', () => {
    it('should fail: call from address without vault admin role', async () => {
      const {
        redemptionVaultWithMorpho,
        regularAccounts,
        dataFeed,
        stableCoins,
      } = await loadFixture(defaultDeploy);
      await addPaymentTokenTest(
        { vault: redemptionVaultWithMorpho, owner: regularAccounts[0] },
        stableCoins.usdc,
        dataFeed.address,
        0,
        true,
        constants.MaxUint256,
        { revertMessage: 'WMAC: hasnt role', from: regularAccounts[0] },
      );
    });

    it('call from address with vault admin role', async () => {
      const { owner, redemptionVaultWithMorpho, stableCoins, dataFeed } =
        await loadFixture(defaultDeploy);
      await addPaymentTokenTest(
        { vault: redemptionVaultWithMorpho, owner },
        stableCoins.usdc,
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
        redemptionVaultWithMorpho,
        regularAccounts,
        stableCoins,
        dataFeed,
      } = await loadFixture(defaultDeploy);
      await addPaymentTokenTest(
        { vault: redemptionVaultWithMorpho, owner },
        stableCoins.usdc,
        dataFeed.address,
        0,
        true,
      );
      await removePaymentTokenTest(
        { vault: redemptionVaultWithMorpho, owner: regularAccounts[0] },
        stableCoins.usdc,
        { revertMessage: 'WMAC: hasnt role', from: regularAccounts[0] },
      );
    });

    it('call from address with vault admin role', async () => {
      const { owner, redemptionVaultWithMorpho, stableCoins, dataFeed } =
        await loadFixture(defaultDeploy);
      await addPaymentTokenTest(
        { vault: redemptionVaultWithMorpho, owner },
        stableCoins.usdc,
        dataFeed.address,
        0,
        true,
      );
      await removePaymentTokenTest(
        { vault: redemptionVaultWithMorpho, owner },
        stableCoins.usdc,
      );
    });
  });

  describe('addWaivedFeeAccount()', () => {
    it('should fail: call from address without vault admin role', async () => {
      const { redemptionVaultWithMorpho, regularAccounts } = await loadFixture(
        defaultDeploy,
      );
      await addWaivedFeeAccountTest(
        { vault: redemptionVaultWithMorpho, owner: regularAccounts[0] },
        regularAccounts[1].address,
        { revertMessage: 'WMAC: hasnt role', from: regularAccounts[0] },
      );
    });

    it('call from address with vault admin role', async () => {
      const { owner, redemptionVaultWithMorpho, regularAccounts } =
        await loadFixture(defaultDeploy);
      await addWaivedFeeAccountTest(
        { vault: redemptionVaultWithMorpho, owner },
        regularAccounts[0].address,
      );
    });
  });

  describe('removeWaivedFeeAccount()', () => {
    it('should fail: call from address without vault admin role', async () => {
      const { owner, redemptionVaultWithMorpho, regularAccounts } =
        await loadFixture(defaultDeploy);
      await addWaivedFeeAccountTest(
        { vault: redemptionVaultWithMorpho, owner },
        regularAccounts[0].address,
      );
      await removeWaivedFeeAccountTest(
        { vault: redemptionVaultWithMorpho, owner: regularAccounts[0] },
        regularAccounts[0].address,
        { revertMessage: 'WMAC: hasnt role', from: regularAccounts[0] },
      );
    });

    it('call from address with vault admin role', async () => {
      const { owner, redemptionVaultWithMorpho, regularAccounts } =
        await loadFixture(defaultDeploy);
      await addWaivedFeeAccountTest(
        { vault: redemptionVaultWithMorpho, owner },
        regularAccounts[0].address,
      );
      await removeWaivedFeeAccountTest(
        { vault: redemptionVaultWithMorpho, owner },
        regularAccounts[0].address,
      );
    });
  });

  describe('setFee()', () => {
    it('should fail: call from address without vault admin role', async () => {
      const { redemptionVaultWithMorpho, regularAccounts } = await loadFixture(
        defaultDeploy,
      );
      await setInstantFeeTest(
        { vault: redemptionVaultWithMorpho, owner: regularAccounts[0] },
        1,
        { revertMessage: 'WMAC: hasnt role', from: regularAccounts[0] },
      );
    });

    it('call from address with vault admin role', async () => {
      const { owner, redemptionVaultWithMorpho } = await loadFixture(
        defaultDeploy,
      );
      await setInstantFeeTest({ vault: redemptionVaultWithMorpho, owner }, 1);
    });
  });

  describe('setVariabilityTolerance()', () => {
    it('should fail: call from address without vault admin role', async () => {
      const { redemptionVaultWithMorpho, regularAccounts } = await loadFixture(
        defaultDeploy,
      );
      await setVariabilityToleranceTest(
        { vault: redemptionVaultWithMorpho, owner: regularAccounts[0] },
        1,
        { revertMessage: 'WMAC: hasnt role', from: regularAccounts[0] },
      );
    });

    it('call from address with vault admin role', async () => {
      const { owner, redemptionVaultWithMorpho } = await loadFixture(
        defaultDeploy,
      );
      await setVariabilityToleranceTest(
        { vault: redemptionVaultWithMorpho, owner },
        1,
      );
    });
  });

  describe('withdrawToken()', () => {
    it('should fail: call from address without vault admin role', async () => {
      const { redemptionVaultWithMorpho, stableCoins, regularAccounts } =
        await loadFixture(defaultDeploy);
      await withdrawTest(
        { vault: redemptionVaultWithMorpho, owner: regularAccounts[0] },
        stableCoins.usdc,
        1,
        regularAccounts[0],
        { revertMessage: 'WMAC: hasnt role', from: regularAccounts[0] },
      );
    });

    it('call from address with vault admin role', async () => {
      const { owner, redemptionVaultWithMorpho, stableCoins } =
        await loadFixture(defaultDeploy);
      await mintToken(stableCoins.usdc, redemptionVaultWithMorpho, 1);
      await withdrawTest(
        { vault: redemptionVaultWithMorpho, owner },
        stableCoins.usdc,
        1,
        owner,
      );
    });
  });

  describe('freeFromMinAmount()', async () => {
    it('should fail: call from address without vault admin role', async () => {
      const { redemptionVaultWithMorpho, regularAccounts } = await loadFixture(
        defaultDeploy,
      );
      await expect(
        redemptionVaultWithMorpho
          .connect(regularAccounts[0])
          .freeFromMinAmount(regularAccounts[0].address, true),
      ).revertedWith('WMAC: hasnt role');
    });

    it('should not fail', async () => {
      const { owner, redemptionVaultWithMorpho } = await loadFixture(
        defaultDeploy,
      );

      expect(
        await redemptionVaultWithMorpho.isFreeFromMinAmount(owner.address),
      ).eq(false);
      await redemptionVaultWithMorpho.freeFromMinAmount(owner.address, true);
      expect(
        await redemptionVaultWithMorpho.isFreeFromMinAmount(owner.address),
      ).eq(true);
    });
  });

  describe('changeTokenAllowance()', () => {
    it('should fail: call from address without vault admin role', async () => {
      const {
        owner,
        redemptionVaultWithMorpho,
        regularAccounts,
        stableCoins,
        dataFeed,
      } = await loadFixture(defaultDeploy);
      await addPaymentTokenTest(
        { vault: redemptionVaultWithMorpho, owner },
        stableCoins.usdc,
        dataFeed.address,
        0,
        true,
      );
      await changeTokenAllowanceTest(
        { vault: redemptionVaultWithMorpho, owner: regularAccounts[0] },
        stableCoins.usdc.address,
        100,
        { revertMessage: 'WMAC: hasnt role', from: regularAccounts[0] },
      );
    });

    it('call from address with vault admin role', async () => {
      const { owner, redemptionVaultWithMorpho, stableCoins, dataFeed } =
        await loadFixture(defaultDeploy);
      await addPaymentTokenTest(
        { vault: redemptionVaultWithMorpho, owner },
        stableCoins.usdc,
        dataFeed.address,
        0,
        true,
      );
      await changeTokenAllowanceTest(
        { vault: redemptionVaultWithMorpho, owner },
        stableCoins.usdc.address,
        100,
      );
    });
  });

  describe('changeTokenFee()', () => {
    it('should fail: call from address without vault admin role', async () => {
      const {
        owner,
        redemptionVaultWithMorpho,
        regularAccounts,
        stableCoins,
        dataFeed,
      } = await loadFixture(defaultDeploy);
      await addPaymentTokenTest(
        { vault: redemptionVaultWithMorpho, owner },
        stableCoins.usdc,
        dataFeed.address,
        0,
        true,
      );
      await changeTokenFeeTest(
        { vault: redemptionVaultWithMorpho, owner: regularAccounts[0] },
        stableCoins.usdc.address,
        100,
        { revertMessage: 'WMAC: hasnt role', from: regularAccounts[0] },
      );
    });

    it('call from address with vault admin role', async () => {
      const { owner, redemptionVaultWithMorpho, stableCoins, dataFeed } =
        await loadFixture(defaultDeploy);
      await addPaymentTokenTest(
        { vault: redemptionVaultWithMorpho, owner },
        stableCoins.usdc,
        dataFeed.address,
        0,
        true,
      );
      await changeTokenFeeTest(
        { vault: redemptionVaultWithMorpho, owner },
        stableCoins.usdc.address,
        100,
      );
    });
  });

  describe('checkAndRedeemMorpho()', () => {
    it('should not withdraw from Morpho when contract has enough balance', async () => {
      const { redemptionVaultWithMorpho, stableCoins, morphoVaultMock } =
        await loadFixture(defaultDeploy);

      const usdcAmount = parseUnits('1000', 8);
      await stableCoins.usdc.mint(
        redemptionVaultWithMorpho.address,
        usdcAmount,
      );

      const balanceBefore = await stableCoins.usdc.balanceOf(
        redemptionVaultWithMorpho.address,
      );
      const sharesBefore = await morphoVaultMock.balanceOf(
        redemptionVaultWithMorpho.address,
      );

      await redemptionVaultWithMorpho.checkAndRedeemMorpho(
        stableCoins.usdc.address,
        parseUnits('500', 8),
      );

      const balanceAfter = await stableCoins.usdc.balanceOf(
        redemptionVaultWithMorpho.address,
      );
      const sharesAfter = await morphoVaultMock.balanceOf(
        redemptionVaultWithMorpho.address,
      );
      expect(balanceAfter).to.equal(balanceBefore);
      expect(sharesAfter).to.equal(sharesBefore);
    });

    it('should withdraw missing amount from Morpho', async () => {
      const { redemptionVaultWithMorpho, stableCoins, morphoVaultMock } =
        await loadFixture(defaultDeploy);

      // Vault has 500 USDC, needs 1000
      const initialUsdc = parseUnits('500', 8);
      await stableCoins.usdc.mint(
        redemptionVaultWithMorpho.address,
        initialUsdc,
      );

      // Vault has 600 Morpho shares (1:1 exchange rate by default)
      const sharesAmount = parseUnits('600', 8);
      await morphoVaultMock.mint(
        redemptionVaultWithMorpho.address,
        sharesAmount,
      );

      await redemptionVaultWithMorpho.checkAndRedeemMorpho(
        stableCoins.usdc.address,
        parseUnits('1000', 8),
      );

      // Vault should now have 1000 USDC (500 original + 500 withdrawn from Morpho)
      const usdcAfter = await stableCoins.usdc.balanceOf(
        redemptionVaultWithMorpho.address,
      );
      expect(usdcAfter).to.equal(parseUnits('1000', 8));

      // Share balance should decrease by 500 (1:1 rate)
      const sharesAfter = await morphoVaultMock.balanceOf(
        redemptionVaultWithMorpho.address,
      );
      expect(sharesAfter).to.equal(parseUnits('100', 8));
    });

    it('should revert when token not vault asset', async () => {
      const { redemptionVaultWithMorpho, stableCoins } = await loadFixture(
        defaultDeploy,
      );

      // DAI is not the Morpho vault's underlying asset (USDC is)
      await expect(
        redemptionVaultWithMorpho.checkAndRedeemMorpho(
          stableCoins.dai.address,
          parseUnits('1000', 9),
        ),
      ).to.be.revertedWith('RVM: token not vault asset');
    });

    it('should revert when contract has insufficient shares', async () => {
      const { redemptionVaultWithMorpho, stableCoins, morphoVaultMock } =
        await loadFixture(defaultDeploy);

      // Vault has 200 USDC, needs 1000
      await stableCoins.usdc.mint(
        redemptionVaultWithMorpho.address,
        parseUnits('200', 8),
      );

      // Vault has only 300 shares (not enough for 800 missing at 1:1 rate)
      await morphoVaultMock.mint(
        redemptionVaultWithMorpho.address,
        parseUnits('300', 8),
      );

      await expect(
        redemptionVaultWithMorpho.checkAndRedeemMorpho(
          stableCoins.usdc.address,
          parseUnits('1000', 8),
        ),
      ).to.be.revertedWith('RVM: insufficient shares');
    });

    it('should revert when Morpho vault has insufficient underlying liquidity', async () => {
      const { redemptionVaultWithMorpho, stableCoins, morphoVaultMock } =
        await loadFixture(defaultDeploy);

      // Vault needs to withdraw from Morpho
      await stableCoins.usdc.mint(
        redemptionVaultWithMorpho.address,
        parseUnits('200', 8),
      );

      // Vault has enough shares
      await morphoVaultMock.mint(
        redemptionVaultWithMorpho.address,
        parseUnits('1000', 8),
      );

      // Drain the mock's USDC
      const mockBalance = await stableCoins.usdc.balanceOf(
        morphoVaultMock.address,
      );
      await morphoVaultMock.withdrawAdmin(
        stableCoins.usdc.address,
        (
          await ethers.getSigners()
        )[10].address,
        mockBalance,
      );

      await expect(
        redemptionVaultWithMorpho.checkAndRedeemMorpho(
          stableCoins.usdc.address,
          parseUnits('1000', 8),
        ),
      ).to.be.revertedWith('MorphoVaultMock: InsufficientLiquidity');
    });

    it('should withdraw correctly with non-1:1 exchange rate (shares worth more)', async () => {
      const { redemptionVaultWithMorpho, stableCoins, morphoVaultMock } =
        await loadFixture(defaultDeploy);

      // Set exchange rate: 1 share = 1.05 underlying (5% interest accrued)
      await morphoVaultMock.setExchangeRate(parseUnits('1.05', 18));

      // Vault has 200 USDC, needs 1000 → missing 800
      await stableCoins.usdc.mint(
        redemptionVaultWithMorpho.address,
        parseUnits('200', 8),
      );

      // At 1.05 rate, 800 assets needs ceil(800 / 1.05) ≈ 762 shares
      // Mint 800 shares (more than enough)
      await morphoVaultMock.mint(
        redemptionVaultWithMorpho.address,
        parseUnits('800', 8),
      );

      const sharesBefore = await morphoVaultMock.balanceOf(
        redemptionVaultWithMorpho.address,
      );

      await redemptionVaultWithMorpho.checkAndRedeemMorpho(
        stableCoins.usdc.address,
        parseUnits('1000', 8),
      );

      const usdcAfter = await stableCoins.usdc.balanceOf(
        redemptionVaultWithMorpho.address,
      );
      expect(usdcAfter).to.equal(parseUnits('1000', 8));

      const sharesAfter = await morphoVaultMock.balanceOf(
        redemptionVaultWithMorpho.address,
      );
      // Shares burned should be less than 800 because each share is worth 1.05
      expect(sharesAfter).to.be.gt(0);
      const sharesBurned = sharesBefore.sub(sharesAfter);
      expect(sharesBurned).to.be.lt(parseUnits('800', 8));
    });

    it('should revert with insufficient shares at non-1:1 exchange rate', async () => {
      const { redemptionVaultWithMorpho, stableCoins, morphoVaultMock } =
        await loadFixture(defaultDeploy);

      // Set exchange rate: 1 share = 0.95 underlying (loss scenario)
      await morphoVaultMock.setExchangeRate(parseUnits('0.95', 18));

      // Vault has 200 USDC, needs 1000 → missing 800
      await stableCoins.usdc.mint(
        redemptionVaultWithMorpho.address,
        parseUnits('200', 8),
      );

      // At 0.95 rate, 800 assets needs ceil(800 / 0.95) ≈ 843 shares
      // Mint only 800 shares (not enough at this rate)
      await morphoVaultMock.mint(
        redemptionVaultWithMorpho.address,
        parseUnits('800', 8),
      );

      await expect(
        redemptionVaultWithMorpho.checkAndRedeemMorpho(
          stableCoins.usdc.address,
          parseUnits('1000', 8),
        ),
      ).to.be.revertedWith('RVM: insufficient shares');
    });
  });

  describe('redeemInstant()', () => {
    it('should fail: when there is no token in vault', async () => {
      const {
        owner,
        redemptionVaultWithMorpho,
        stableCoins,
        mTBILL,
        mTokenToUsdDataFeed,
      } = await loadFixture(defaultDeploy);

      await redeemInstantTest(
        {
          redemptionVault: redemptionVaultWithMorpho,
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
        redemptionVaultWithMorpho,
        stableCoins,
        mTBILL,
        dataFeed,
        mTokenToUsdDataFeed,
      } = await loadFixture(defaultDeploy);
      await addPaymentTokenTest(
        { vault: redemptionVaultWithMorpho, owner },
        stableCoins.usdc,
        dataFeed.address,
        0,
        true,
      );
      await redeemInstantTest(
        {
          redemptionVault: redemptionVaultWithMorpho,
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
        redemptionVaultWithMorpho,
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
        redemptionVaultWithMorpho,
        100,
      );
      await addPaymentTokenTest(
        { vault: redemptionVaultWithMorpho, owner },
        stableCoins.dai,
        dataFeed.address,
        0,
        true,
      );
      const selector = encodeFnSelector(
        'redeemInstant(address,uint256,uint256)',
      );
      await pauseVaultFn(redemptionVaultWithMorpho, selector);
      await redeemInstantTest(
        {
          redemptionVault: redemptionVaultWithMorpho,
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
        redemptionVaultWithMorpho,
        stableCoins,
        mTBILL,
        dataFeed,
        mTokenToUsdDataFeed,
      } = await loadFixture(defaultDeploy);

      await mintToken(mTBILL, owner, 100);
      await addPaymentTokenTest(
        { vault: redemptionVaultWithMorpho, owner },
        stableCoins.usdc,
        dataFeed.address,
        0,
        true,
      );
      await redeemInstantTest(
        {
          redemptionVault: redemptionVaultWithMorpho,
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
        redemptionVaultWithMorpho,
        stableCoins,
        mTBILL,
        dataFeed,
        mTokenToUsdDataFeed,
      } = await loadFixture(defaultDeploy);

      await approveBase18(owner, mTBILL, redemptionVaultWithMorpho, 100);
      await addPaymentTokenTest(
        { vault: redemptionVaultWithMorpho, owner },
        stableCoins.usdc,
        dataFeed.address,
        0,
        true,
      );
      await redeemInstantTest(
        {
          redemptionVault: redemptionVaultWithMorpho,
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

    it('should fail: dataFeed rate 0', async () => {
      const {
        owner,
        redemptionVaultWithMorpho,
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
        redemptionVaultWithMorpho,
        10,
      );
      await addPaymentTokenTest(
        { vault: redemptionVaultWithMorpho, owner },
        stableCoins.usdc,
        dataFeed.address,
        0,
        true,
      );
      await mintToken(mTBILL, owner, 100_000);
      await setRoundData({ mockedAggregator }, 0);
      await redeemInstantTest(
        {
          redemptionVault: redemptionVaultWithMorpho,
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

    it('should fail: call for amount < minAmount', async () => {
      const {
        redemptionVaultWithMorpho,
        mockedAggregator,
        owner,
        mTBILL,
        stableCoins,
        dataFeed,
        mTokenToUsdDataFeed,
      } = await loadFixture(defaultDeploy);
      await addPaymentTokenTest(
        { vault: redemptionVaultWithMorpho, owner },
        stableCoins.usdc,
        dataFeed.address,
        0,
        true,
      );
      await setRoundData({ mockedAggregator }, 1);

      await mintToken(mTBILL, owner, 100_000);
      await approveBase18(owner, mTBILL, redemptionVaultWithMorpho, 100_000);

      await setMinAmountTest(
        { vault: redemptionVaultWithMorpho, owner },
        100_000,
      );

      await redeemInstantTest(
        {
          redemptionVault: redemptionVaultWithMorpho,
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

    it('should fail: if exceeds token allowance', async () => {
      const {
        owner,
        redemptionVaultWithMorpho,
        stableCoins,
        mTBILL,
        dataFeed,
        mockedAggregator,
        mTokenToUsdDataFeed,
      } = await loadFixture(defaultDeploy);

      await addPaymentTokenTest(
        { vault: redemptionVaultWithMorpho, owner },
        stableCoins.usdc,
        dataFeed.address,
        0,
        true,
      );
      await setRoundData({ mockedAggregator }, 4);

      await mintToken(mTBILL, owner, 100_000);
      await changeTokenAllowanceTest(
        { vault: redemptionVaultWithMorpho, owner },
        stableCoins.usdc.address,
        100,
      );
      await approveBase18(owner, mTBILL, redemptionVaultWithMorpho, 100_000);

      await redeemInstantTest(
        {
          redemptionVault: redemptionVaultWithMorpho,
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

    it('should fail: if daily limit exceeded', async () => {
      const {
        owner,
        redemptionVaultWithMorpho,
        stableCoins,
        mTBILL,
        dataFeed,
        mockedAggregator,
        mTokenToUsdDataFeed,
      } = await loadFixture(defaultDeploy);

      await addPaymentTokenTest(
        { vault: redemptionVaultWithMorpho, owner },
        stableCoins.usdc,
        dataFeed.address,
        0,
        true,
      );
      await setRoundData({ mockedAggregator }, 4);

      await mintToken(mTBILL, owner, 100_000);
      await setInstantDailyLimitTest(
        { vault: redemptionVaultWithMorpho, owner },
        1000,
      );

      await approveBase18(owner, mTBILL, redemptionVaultWithMorpho, 100_000);

      await redeemInstantTest(
        {
          redemptionVault: redemptionVaultWithMorpho,
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
        redemptionVaultWithMorpho,
        stableCoins,
        mTBILL,
        dataFeed,
        mTokenToUsdDataFeed,
      } = await loadFixture(defaultDeploy);

      await mintToken(mTBILL, owner, 100);
      await approveBase18(owner, mTBILL, redemptionVaultWithMorpho, 100);
      await addPaymentTokenTest(
        { vault: redemptionVaultWithMorpho, owner },
        stableCoins.usdc,
        dataFeed.address,
        10000,
        true,
      );
      await redeemInstantTest(
        {
          redemptionVault: redemptionVaultWithMorpho,
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
    });

    it('should fail: greenlist enabled and user not in greenlist', async () => {
      const {
        owner,
        redemptionVaultWithMorpho,
        stableCoins,
        mTBILL,
        mTokenToUsdDataFeed,
      } = await loadFixture(defaultDeploy);

      await redemptionVaultWithMorpho.setGreenlistEnable(true);

      await redeemInstantTest(
        {
          redemptionVault: redemptionVaultWithMorpho,
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

    it('should fail: user in blacklist', async () => {
      const {
        owner,
        redemptionVaultWithMorpho,
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
          redemptionVault: redemptionVaultWithMorpho,
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
        redemptionVaultWithMorpho,
        stableCoins,
        mTBILL,
        dataFeed,
        mTokenToUsdDataFeed,
        mockedSanctionsList,
        regularAccounts,
      } = await loadFixture(defaultDeploy);

      await sanctionUser(
        { sanctionsList: mockedSanctionsList },
        regularAccounts[0],
      );

      await mintToken(mTBILL, regularAccounts[0], 100);
      await approveBase18(
        regularAccounts[0],
        mTBILL,
        redemptionVaultWithMorpho,
        100,
      );
      await addPaymentTokenTest(
        { vault: redemptionVaultWithMorpho, owner },
        stableCoins.usdc,
        dataFeed.address,
        0,
        true,
      );
      await redeemInstantTest(
        {
          redemptionVault: redemptionVaultWithMorpho,
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

    // ── Happy path tests ─────────────────────────────────────────────────

    it('redeem 100 mTBILL when vault has enough USDC (no Morpho needed)', async () => {
      const {
        owner,
        redemptionVaultWithMorpho,
        stableCoins,
        mTBILL,
        mTokenToUsdDataFeed,
        dataFeed,
        morphoVaultMock,
      } = await loadFixture(defaultDeploy);

      await mintToken(stableCoins.usdc, redemptionVaultWithMorpho, 100000);
      await mintToken(mTBILL, owner, 100);
      await approveBase18(owner, mTBILL, redemptionVaultWithMorpho, 100);
      await addPaymentTokenTest(
        { vault: redemptionVaultWithMorpho, owner },
        stableCoins.usdc,
        dataFeed.address,
        0,
        true,
      );

      const sharesBefore = await morphoVaultMock.balanceOf(
        redemptionVaultWithMorpho.address,
      );

      await redeemInstantTest(
        {
          redemptionVault: redemptionVaultWithMorpho,
          owner,
          mTBILL,
          mTokenToUsdDataFeed,
        },
        stableCoins.usdc,
        100,
      );

      // Share balance should not change
      const sharesAfter = await morphoVaultMock.balanceOf(
        redemptionVaultWithMorpho.address,
      );
      expect(sharesAfter).to.equal(sharesBefore);
    });

    it('redeem 1000 mTBILL when vault has no USDC but has Morpho shares', async () => {
      const {
        owner,
        mockedAggregator,
        mockedAggregatorMToken,
        redemptionVaultWithMorpho,
        stableCoins,
        mTBILL,
        dataFeed,
        mTokenToUsdDataFeed,
        morphoVaultMock,
      } = await loadFixture(defaultDeploy);

      // Mint shares to vault (enough for redemption at 1:1 rate)
      await morphoVaultMock.mint(
        redemptionVaultWithMorpho.address,
        parseUnits('9900', 8),
      );
      await mintToken(mTBILL, owner, 1000);
      await approveBase18(owner, mTBILL, redemptionVaultWithMorpho, 1000);
      await addPaymentTokenTest(
        { vault: redemptionVaultWithMorpho, owner },
        stableCoins.usdc,
        dataFeed.address,
        0,
        true,
      );
      await setInstantFeeTest({ vault: redemptionVaultWithMorpho, owner }, 0);
      await setRoundData({ mockedAggregator }, 1);
      await setRoundData({ mockedAggregator: mockedAggregatorMToken }, 1);

      const sharesBefore = await morphoVaultMock.balanceOf(
        redemptionVaultWithMorpho.address,
      );

      await redeemInstantTest(
        {
          redemptionVault: redemptionVaultWithMorpho,
          owner,
          mTBILL,
          mTokenToUsdDataFeed,
        },
        stableCoins.usdc,
        1000,
      );

      const sharesAfter = await morphoVaultMock.balanceOf(
        redemptionVaultWithMorpho.address,
      );

      // Shares should decrease
      expect(sharesAfter).to.be.lt(sharesBefore);
    });

    it('redeem 1000 mTBILL when vault has 100 USDC and sufficient shares (partial Morpho)', async () => {
      const {
        owner,
        mockedAggregator,
        mockedAggregatorMToken,
        redemptionVaultWithMorpho,
        stableCoins,
        mTBILL,
        dataFeed,
        mTokenToUsdDataFeed,
        morphoVaultMock,
      } = await loadFixture(defaultDeploy);

      // Vault has 100 USDC + shares
      await mintToken(stableCoins.usdc, redemptionVaultWithMorpho, 100);
      await morphoVaultMock.mint(
        redemptionVaultWithMorpho.address,
        parseUnits('9900', 8),
      );
      await mintToken(mTBILL, owner, 1000);
      await approveBase18(owner, mTBILL, redemptionVaultWithMorpho, 1000);
      await addPaymentTokenTest(
        { vault: redemptionVaultWithMorpho, owner },
        stableCoins.usdc,
        dataFeed.address,
        0,
        true,
      );
      await setRoundData({ mockedAggregator }, 1);
      await setRoundData({ mockedAggregator: mockedAggregatorMToken }, 1);

      await redeemInstantTest(
        {
          redemptionVault: redemptionVaultWithMorpho,
          owner,
          mTBILL,
          mTokenToUsdDataFeed,
        },
        stableCoins.usdc,
        1000,
      );
    });

    it('redeem 1000 mTBILL with different prices (stable 1.03$, mToken 5$) and partial Morpho', async () => {
      const {
        owner,
        mockedAggregator,
        mockedAggregatorMToken,
        redemptionVaultWithMorpho,
        stableCoins,
        mTBILL,
        dataFeed,
        mTokenToUsdDataFeed,
        morphoVaultMock,
      } = await loadFixture(defaultDeploy);

      await mintToken(stableCoins.usdc, redemptionVaultWithMorpho, 100);
      await morphoVaultMock.mint(
        redemptionVaultWithMorpho.address,
        parseUnits('15000', 8),
      );
      await mintToken(mTBILL, owner, 1000);
      await approveBase18(owner, mTBILL, redemptionVaultWithMorpho, 1000);
      await addPaymentTokenTest(
        { vault: redemptionVaultWithMorpho, owner },
        stableCoins.usdc,
        dataFeed.address,
        100,
        true,
      );
      await setRoundData({ mockedAggregator }, 1.03);
      await setRoundData({ mockedAggregator: mockedAggregatorMToken }, 5);
      await redemptionVaultWithMorpho.freeFromMinAmount(owner.address, true);

      await redeemInstantTest(
        {
          redemptionVault: redemptionVaultWithMorpho,
          owner,
          mTBILL,
          mTokenToUsdDataFeed,
        },
        stableCoins.usdc,
        1000,
      );
    });

    it('redeem 1000 mTBILL with waived fee and Morpho withdrawal', async () => {
      const {
        owner,
        mockedAggregator,
        mockedAggregatorMToken,
        redemptionVaultWithMorpho,
        stableCoins,
        mTBILL,
        dataFeed,
        mTokenToUsdDataFeed,
        morphoVaultMock,
      } = await loadFixture(defaultDeploy);

      await mintToken(stableCoins.usdc, redemptionVaultWithMorpho, 100);
      await morphoVaultMock.mint(
        redemptionVaultWithMorpho.address,
        parseUnits('15000', 8),
      );
      await mintToken(mTBILL, owner, 1000);
      await approveBase18(owner, mTBILL, redemptionVaultWithMorpho, 1000);
      await addPaymentTokenTest(
        { vault: redemptionVaultWithMorpho, owner },
        stableCoins.usdc,
        dataFeed.address,
        100,
        true,
      );
      await setRoundData({ mockedAggregator }, 1.03);
      await setRoundData({ mockedAggregator: mockedAggregatorMToken }, 5);

      await addWaivedFeeAccountTest(
        { vault: redemptionVaultWithMorpho, owner },
        owner.address,
      );

      await redeemInstantTest(
        {
          redemptionVault: redemptionVaultWithMorpho,
          owner,
          mTBILL,
          mTokenToUsdDataFeed,
          waivedFee: true,
        },
        stableCoins.usdc,
        1000,
      );
    });

    it('should fail: insufficient shares during redeemInstant', async () => {
      const {
        owner,
        mockedAggregator,
        mockedAggregatorMToken,
        redemptionVaultWithMorpho,
        stableCoins,
        mTBILL,
        dataFeed,
        mTokenToUsdDataFeed,
        morphoVaultMock,
      } = await loadFixture(defaultDeploy);

      // Vault has no USDC and only 10 shares (not enough for 1000 mTBILL redemption)
      await morphoVaultMock.mint(
        redemptionVaultWithMorpho.address,
        parseUnits('10', 8),
      );
      await mintToken(mTBILL, owner, 1000);
      await approveBase18(owner, mTBILL, redemptionVaultWithMorpho, 1000);
      await addPaymentTokenTest(
        { vault: redemptionVaultWithMorpho, owner },
        stableCoins.usdc,
        dataFeed.address,
        0,
        true,
      );
      await setInstantFeeTest({ vault: redemptionVaultWithMorpho, owner }, 0);
      await setRoundData({ mockedAggregator }, 1);
      await setRoundData({ mockedAggregator: mockedAggregatorMToken }, 1);

      await expect(
        redemptionVaultWithMorpho['redeemInstant(address,uint256,uint256)'](
          stableCoins.usdc.address,
          parseUnits('1000'),
          0,
        ),
      ).to.be.revertedWith('RVM: insufficient shares');
    });

    it('should fail: Morpho vault has insufficient liquidity during redeemInstant', async () => {
      const {
        owner,
        mockedAggregator,
        mockedAggregatorMToken,
        redemptionVaultWithMorpho,
        stableCoins,
        mTBILL,
        dataFeed,
        mTokenToUsdDataFeed,
        morphoVaultMock,
      } = await loadFixture(defaultDeploy);

      // Vault has shares but mock has no liquidity
      await morphoVaultMock.mint(
        redemptionVaultWithMorpho.address,
        parseUnits('10000', 8),
      );
      await mintToken(mTBILL, owner, 100000);
      await approveBase18(owner, mTBILL, redemptionVaultWithMorpho, 100000);
      await addPaymentTokenTest(
        { vault: redemptionVaultWithMorpho, owner },
        stableCoins.usdc,
        dataFeed.address,
        0,
        true,
      );
      await setInstantFeeTest({ vault: redemptionVaultWithMorpho, owner }, 0);
      await setRoundData({ mockedAggregator }, 1);
      await setRoundData({ mockedAggregator: mockedAggregatorMToken }, 1);

      // Drain the mock
      const mockBalance = await stableCoins.usdc.balanceOf(
        morphoVaultMock.address,
      );
      await morphoVaultMock.withdrawAdmin(
        stableCoins.usdc.address,
        (
          await ethers.getSigners()
        )[10].address,
        mockBalance,
      );

      await expect(
        redemptionVaultWithMorpho['redeemInstant(address,uint256,uint256)'](
          stableCoins.usdc.address,
          parseUnits('1000'),
          0,
        ),
      ).to.be.revertedWith('MorphoVaultMock: InsufficientLiquidity');
    });

    // ── Custom recipient tests ───────────────────────────────────────────

    it('redeem 100 mTBILL (custom recipient overload)', async () => {
      const {
        owner,
        redemptionVaultWithMorpho,
        stableCoins,
        mTBILL,
        mTokenToUsdDataFeed,
        regularAccounts,
        dataFeed,
        customRecipient,
      } = await loadFixture(defaultDeploy);

      await mintToken(stableCoins.usdc, redemptionVaultWithMorpho, 100000);
      await mintToken(mTBILL, regularAccounts[0], 100);
      await approveBase18(
        regularAccounts[0],
        mTBILL,
        redemptionVaultWithMorpho,
        100,
      );
      await addPaymentTokenTest(
        { vault: redemptionVaultWithMorpho, owner },
        stableCoins.usdc,
        dataFeed.address,
        0,
        true,
      );

      await redeemInstantTest(
        {
          redemptionVault: redemptionVaultWithMorpho,
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

    it('redeem 100 mTBILL when other fn overload is paused (custom recipient overload)', async () => {
      const {
        owner,
        redemptionVaultWithMorpho,
        stableCoins,
        mTBILL,
        mTokenToUsdDataFeed,
        regularAccounts,
        dataFeed,
        customRecipient,
      } = await loadFixture(defaultDeploy);

      await pauseVaultFn(
        redemptionVaultWithMorpho,
        encodeFnSelector('redeemInstant(address,uint256,uint256)'),
      );
      await mintToken(stableCoins.usdc, redemptionVaultWithMorpho, 100000);
      await mintToken(mTBILL, regularAccounts[0], 100);
      await approveBase18(
        regularAccounts[0],
        mTBILL,
        redemptionVaultWithMorpho,
        100,
      );
      await addPaymentTokenTest(
        { vault: redemptionVaultWithMorpho, owner },
        stableCoins.usdc,
        dataFeed.address,
        0,
        true,
      );

      await redeemInstantTest(
        {
          redemptionVault: redemptionVaultWithMorpho,
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
        redemptionVaultWithMorpho,
        stableCoins,
        mTBILL,
        mTokenToUsdDataFeed,
        regularAccounts,
        dataFeed,
      } = await loadFixture(defaultDeploy);

      await pauseVaultFn(
        redemptionVaultWithMorpho,
        encodeFnSelector('redeemInstant(address,uint256,uint256,address)'),
      );
      await mintToken(stableCoins.usdc, redemptionVaultWithMorpho, 100000);
      await mintToken(mTBILL, regularAccounts[0], 100);
      await approveBase18(
        regularAccounts[0],
        mTBILL,
        redemptionVaultWithMorpho,
        100,
      );
      await addPaymentTokenTest(
        { vault: redemptionVaultWithMorpho, owner },
        stableCoins.usdc,
        dataFeed.address,
        0,
        true,
      );

      await redeemInstantTest(
        {
          redemptionVault: redemptionVaultWithMorpho,
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
        redemptionVaultWithMorpho,
        stableCoins,
        mTBILL,
        mTokenToUsdDataFeed,
      } = await loadFixture(defaultDeploy);

      await redeemRequestTest(
        {
          redemptionVault: redemptionVaultWithMorpho,
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
        redemptionVaultWithMorpho,
        stableCoins,
        mTBILL,
        dataFeed,
        mTokenToUsdDataFeed,
      } = await loadFixture(defaultDeploy);
      await addPaymentTokenTest(
        { vault: redemptionVaultWithMorpho, owner },
        stableCoins.dai,
        dataFeed.address,
        0,
        true,
      );
      await redeemRequestTest(
        {
          redemptionVault: redemptionVaultWithMorpho,
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
        redemptionVaultWithMorpho,
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
        redemptionVaultWithMorpho,
        100,
      );
      await addPaymentTokenTest(
        { vault: redemptionVaultWithMorpho, owner },
        stableCoins.dai,
        dataFeed.address,
        0,
        true,
      );
      const selector = encodeFnSelector('redeemRequest(address,uint256)');
      await pauseVaultFn(redemptionVaultWithMorpho, selector);
      await redeemRequestTest(
        {
          redemptionVault: redemptionVaultWithMorpho,
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

    it('should fail: call with insufficient balance', async () => {
      const {
        owner,
        redemptionVaultWithMorpho,
        stableCoins,
        mTBILL,
        dataFeed,
        mTokenToUsdDataFeed,
      } = await loadFixture(defaultDeploy);

      await approveBase18(owner, mTBILL, redemptionVaultWithMorpho, 100);
      await addPaymentTokenTest(
        { vault: redemptionVaultWithMorpho, owner },
        stableCoins.dai,
        dataFeed.address,
        0,
        true,
      );
      await redeemRequestTest(
        {
          redemptionVault: redemptionVaultWithMorpho,
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

    it('redeem request: happy path', async () => {
      const {
        owner,
        redemptionVaultWithMorpho,
        stableCoins,
        mTBILL,
        dataFeed,
        mTokenToUsdDataFeed,
      } = await loadFixture(defaultDeploy);

      await mintToken(mTBILL, owner, 100);
      await approveBase18(owner, mTBILL, redemptionVaultWithMorpho, 100);
      await addPaymentTokenTest(
        { vault: redemptionVaultWithMorpho, owner },
        stableCoins.usdc,
        dataFeed.address,
        0,
        true,
      );
      await redeemRequestTest(
        {
          redemptionVault: redemptionVaultWithMorpho,
          owner,
          mTBILL,
          mTokenToUsdDataFeed,
        },
        stableCoins.usdc,
        100,
      );
    });
  });

  describe('redeemFiatRequest()', () => {
    it('should fail: when function paused', async () => {
      const {
        owner,
        redemptionVaultWithMorpho,
        mTBILL,
        mTokenToUsdDataFeed,
        regularAccounts,
      } = await loadFixture(defaultDeploy);
      await mintToken(mTBILL, regularAccounts[0], 100000);
      await approveBase18(
        regularAccounts[0],
        mTBILL,
        redemptionVaultWithMorpho,
        100000,
      );
      const selector = encodeFnSelector('redeemFiatRequest(uint256)');
      await pauseVaultFn(redemptionVaultWithMorpho, selector);
      await redeemFiatRequestTest(
        {
          redemptionVault: redemptionVaultWithMorpho,
          owner,
          mTBILL,
          mTokenToUsdDataFeed,
        },
        100000,
        {
          from: regularAccounts[0],
          revertMessage: 'Pausable: fn paused',
        },
      );
    });

    it('redeem fiat request: happy path', async () => {
      const { owner, redemptionVaultWithMorpho, mTBILL, mTokenToUsdDataFeed } =
        await loadFixture(defaultDeploy);

      await mintToken(mTBILL, owner, 100000);
      await approveBase18(owner, mTBILL, redemptionVaultWithMorpho, 100000);
      await redeemFiatRequestTest(
        {
          redemptionVault: redemptionVaultWithMorpho,
          owner,
          mTBILL,
          mTokenToUsdDataFeed,
        },
        100000,
      );
    });
  });

  describe('approveRequest()', () => {
    it('should fail: when there is no request', async () => {
      const {
        owner,
        redemptionVaultWithMorpho,
        stableCoins,
        mTBILL,
        dataFeed,
        mTokenToUsdDataFeed,
      } = await loadFixture(defaultDeploy);

      await addPaymentTokenTest(
        { vault: redemptionVaultWithMorpho, owner },
        stableCoins.usdc,
        dataFeed.address,
        0,
        true,
      );

      await approveRedeemRequestTest(
        {
          redemptionVault: redemptionVaultWithMorpho,
          owner,
          mTBILL,
          mTokenToUsdDataFeed,
        },
        +new Date(),
        parseUnits('1'),
        {
          revertMessage: 'RV: request not exist',
        },
      );
    });

    it('approve request: happy path', async () => {
      const {
        owner,
        mockedAggregator,
        mockedAggregatorMToken,
        redemptionVaultWithMorpho,
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
        redemptionVaultWithMorpho,
        100000,
      );

      await mintToken(mTBILL, owner, 100);
      await approveBase18(owner, mTBILL, redemptionVaultWithMorpho, 100);
      await addPaymentTokenTest(
        { vault: redemptionVaultWithMorpho, owner },
        stableCoins.dai,
        dataFeed.address,
        0,
        true,
      );
      await setRoundData({ mockedAggregator }, 1.03);
      await setRoundData({ mockedAggregator: mockedAggregatorMToken }, 5);

      await redeemRequestTest(
        {
          redemptionVault: redemptionVaultWithMorpho,
          owner,
          mTBILL,
          mTokenToUsdDataFeed,
        },
        stableCoins.dai,
        100,
      );
      const requestId = 0;

      await approveRedeemRequestTest(
        {
          redemptionVault: redemptionVaultWithMorpho,
          owner,
          mTBILL,
          mTokenToUsdDataFeed,
        },
        +requestId,
        parseUnits('1'),
      );
    });
  });

  describe('rejectRequest()', () => {
    it('reject request: happy path', async () => {
      const {
        owner,
        mockedAggregator,
        mockedAggregatorMToken,
        redemptionVaultWithMorpho,
        stableCoins,
        mTBILL,
        dataFeed,
        mTokenToUsdDataFeed,
      } = await loadFixture(defaultDeploy);

      await mintToken(mTBILL, owner, 100);
      await approveBase18(owner, mTBILL, redemptionVaultWithMorpho, 100);
      await addPaymentTokenTest(
        { vault: redemptionVaultWithMorpho, owner },
        stableCoins.dai,
        dataFeed.address,
        0,
        true,
      );
      await setRoundData({ mockedAggregator }, 1.03);
      await setRoundData({ mockedAggregator: mockedAggregatorMToken }, 5);

      await redeemRequestTest(
        {
          redemptionVault: redemptionVaultWithMorpho,
          owner,
          mTBILL,
          mTokenToUsdDataFeed,
        },
        stableCoins.dai,
        100,
      );
      const requestId = 0;

      await rejectRedeemRequestTest(
        {
          redemptionVault: redemptionVaultWithMorpho,
          owner,
          mTBILL,
          mTokenToUsdDataFeed,
        },
        +requestId,
      );
    });
  });
});
