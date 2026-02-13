import { loadFixture } from '@nomicfoundation/hardhat-network-helpers';
import { expect } from 'chai';
import { constants } from 'ethers';
import { parseUnits } from 'ethers/lib/utils';
import { ethers } from 'hardhat';

import { encodeFnSelector } from '../../helpers/utils';
import {
  ManageableVaultTester__factory,
  RedemptionVaultWithAaveTest__factory,
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

describe('RedemptionVaultWithAave', function () {
  it('deployment', async () => {
    const {
      redemptionVaultWithAave,
      aavePoolMock,
      mTBILL,
      tokensReceiver,
      feeReceiver,
      mTokenToUsdDataFeed,
      roles,
    } = await loadFixture(defaultDeploy);

    expect(await redemptionVaultWithAave.mToken()).eq(mTBILL.address);

    expect(await redemptionVaultWithAave.ONE_HUNDRED_PERCENT()).eq('10000');

    expect(await redemptionVaultWithAave.paused()).eq(false);

    expect(await redemptionVaultWithAave.tokensReceiver()).eq(
      tokensReceiver.address,
    );
    expect(await redemptionVaultWithAave.feeReceiver()).eq(feeReceiver.address);

    expect(await redemptionVaultWithAave.minAmount()).eq(1000);
    expect(await redemptionVaultWithAave.minFiatRedeemAmount()).eq(1000);

    expect(await redemptionVaultWithAave.instantFee()).eq('100');

    expect(await redemptionVaultWithAave.instantDailyLimit()).eq(
      parseUnits('100000'),
    );

    expect(await redemptionVaultWithAave.mTokenDataFeed()).eq(
      mTokenToUsdDataFeed.address,
    );
    expect(await redemptionVaultWithAave.variationTolerance()).eq(1);

    expect(await redemptionVaultWithAave.vaultRole()).eq(
      roles.tokenRoles.mTBILL.redemptionVaultAdmin,
    );

    expect(await redemptionVaultWithAave.MANUAL_FULLFILMENT_TOKEN()).eq(
      ethers.constants.AddressZero,
    );

    expect(await redemptionVaultWithAave.aavePool()).eq(aavePoolMock.address);
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

    const redemptionVaultWithAave =
      await new RedemptionVaultWithAaveTest__factory(owner).deploy();

    await expect(
      redemptionVaultWithAave[
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
      const { redemptionVaultWithAave } = await loadFixture(defaultDeploy);

      await expect(
        redemptionVaultWithAave[
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

    it('should fail: when aavePool address zero', async () => {
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

      const redemptionVaultWithAave =
        await new RedemptionVaultWithAaveTest__factory(owner).deploy();

      await expect(
        redemptionVaultWithAave[
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

  describe('setAavePool()', () => {
    it('should fail: call from address without vault admin role', async () => {
      const { redemptionVaultWithAave, regularAccounts } = await loadFixture(
        defaultDeploy,
      );
      await expect(
        redemptionVaultWithAave
          .connect(regularAccounts[0])
          .setAavePool(regularAccounts[1].address),
      ).to.be.revertedWith('WMAC: hasnt role');
    });

    it('should fail: zero address', async () => {
      const { redemptionVaultWithAave } = await loadFixture(defaultDeploy);
      await expect(
        redemptionVaultWithAave.setAavePool(constants.AddressZero),
      ).to.be.revertedWith('zero address');
    });

    it('should succeed and emit SetAavePool event', async () => {
      const { redemptionVaultWithAave, owner, regularAccounts } =
        await loadFixture(defaultDeploy);

      const newPool = regularAccounts[0].address;

      await expect(redemptionVaultWithAave.setAavePool(newPool))
        .to.emit(redemptionVaultWithAave, 'SetAavePool')
        .withArgs(owner.address, newPool);

      expect(await redemptionVaultWithAave.aavePool()).eq(newPool);
    });
  });

  describe('setMinAmount()', () => {
    it('should fail: call from address without vault admin role', async () => {
      const { owner, redemptionVaultWithAave, regularAccounts } =
        await loadFixture(defaultDeploy);

      await setMinAmountTest({ vault: redemptionVaultWithAave, owner }, 1.1, {
        from: regularAccounts[0],
        revertMessage: acErrors.WMAC_HASNT_ROLE,
      });
    });

    it('call from address with vault admin role', async () => {
      const { owner, redemptionVaultWithAave } = await loadFixture(
        defaultDeploy,
      );
      await setMinAmountTest({ vault: redemptionVaultWithAave, owner }, 1.1);
    });
  });

  describe('setMinFiatRedeemAmount()', () => {
    it('should fail: call from address without vault admin role', async () => {
      const { owner, redemptionVaultWithAave, regularAccounts } =
        await loadFixture(defaultDeploy);

      await setMinFiatRedeemAmountTest(
        { redemptionVault: redemptionVaultWithAave, owner },
        1.1,
        {
          from: regularAccounts[0],
          revertMessage: acErrors.WMAC_HASNT_ROLE,
        },
      );
    });

    it('call from address with vault admin role', async () => {
      const { owner, redemptionVaultWithAave } = await loadFixture(
        defaultDeploy,
      );
      await setMinFiatRedeemAmountTest(
        { redemptionVault: redemptionVaultWithAave, owner },
        1.1,
      );
    });
  });

  describe('setFiatAdditionalFee()', () => {
    it('should fail: call from address without vault admin role', async () => {
      const { owner, redemptionVaultWithAave, regularAccounts } =
        await loadFixture(defaultDeploy);

      await setFiatAdditionalFeeTest(
        { redemptionVault: redemptionVaultWithAave, owner },
        100,
        {
          from: regularAccounts[0],
          revertMessage: acErrors.WMAC_HASNT_ROLE,
        },
      );
    });

    it('call from address with vault admin role', async () => {
      const { owner, redemptionVaultWithAave } = await loadFixture(
        defaultDeploy,
      );
      await setFiatAdditionalFeeTest(
        { redemptionVault: redemptionVaultWithAave, owner },
        100,
      );
    });
  });

  describe('setInstantDailyLimit()', () => {
    it('should fail: call from address without vault admin role', async () => {
      const { owner, redemptionVaultWithAave, regularAccounts } =
        await loadFixture(defaultDeploy);

      await setInstantDailyLimitTest(
        { vault: redemptionVaultWithAave, owner },
        parseUnits('1000'),
        {
          from: regularAccounts[0],
          revertMessage: acErrors.WMAC_HASNT_ROLE,
        },
      );
    });

    it('should fail: try to set 0 limit', async () => {
      const { owner, redemptionVaultWithAave } = await loadFixture(
        defaultDeploy,
      );

      await setInstantDailyLimitTest(
        { vault: redemptionVaultWithAave, owner },
        constants.Zero,
        {
          revertMessage: 'MV: limit zero',
        },
      );
    });

    it('call from address with vault admin role', async () => {
      const { owner, redemptionVaultWithAave } = await loadFixture(
        defaultDeploy,
      );
      await setInstantDailyLimitTest(
        { vault: redemptionVaultWithAave, owner },
        parseUnits('1000'),
      );
    });
  });

  describe('addPaymentToken()', () => {
    it('should fail: call from address without vault admin role', async () => {
      const { owner, redemptionVaultWithAave, regularAccounts } =
        await loadFixture(defaultDeploy);
      await addPaymentTokenTest(
        { vault: redemptionVaultWithAave, owner },
        ethers.constants.AddressZero,
        ethers.constants.AddressZero,
        0,
        true,
        constants.MaxUint256,
        { revertMessage: acErrors.WMAC_HASNT_ROLE, from: regularAccounts[0] },
      );
    });

    it('call from address with vault admin role', async () => {
      const { owner, redemptionVaultWithAave, stableCoins, dataFeed } =
        await loadFixture(defaultDeploy);
      await addPaymentTokenTest(
        { vault: redemptionVaultWithAave, owner },
        stableCoins.dai,
        dataFeed.address,
        0,
        true,
      );
    });
  });

  describe('removePaymentToken()', () => {
    it('should fail: call from address without vault admin role', async () => {
      const { owner, redemptionVaultWithAave, stableCoins, dataFeed } =
        await loadFixture(defaultDeploy);
      await addPaymentTokenTest(
        { vault: redemptionVaultWithAave, owner },
        stableCoins.dai,
        dataFeed.address,
        0,
        true,
      );
      await removePaymentTokenTest(
        { vault: redemptionVaultWithAave, owner },
        stableCoins.dai,
        {
          from: (await ethers.getSigners())[10],
          revertMessage: acErrors.WMAC_HASNT_ROLE,
        },
      );
    });

    it('call from address with vault admin role', async () => {
      const { owner, redemptionVaultWithAave, stableCoins, dataFeed } =
        await loadFixture(defaultDeploy);
      await addPaymentTokenTest(
        { vault: redemptionVaultWithAave, owner },
        stableCoins.dai,
        dataFeed.address,
        0,
        true,
      );
      await removePaymentTokenTest(
        { vault: redemptionVaultWithAave, owner },
        stableCoins.dai,
      );
    });
  });

  describe('addWaivedFeeAccount()', () => {
    it('should fail: call from address without vault admin role', async () => {
      const { owner, redemptionVaultWithAave, regularAccounts } =
        await loadFixture(defaultDeploy);
      await addWaivedFeeAccountTest(
        { vault: redemptionVaultWithAave, owner },
        regularAccounts[0].address,
        {
          from: regularAccounts[0],
          revertMessage: acErrors.WMAC_HASNT_ROLE,
        },
      );
    });

    it('call from address with vault admin role', async () => {
      const { owner, redemptionVaultWithAave, regularAccounts } =
        await loadFixture(defaultDeploy);
      await addWaivedFeeAccountTest(
        { vault: redemptionVaultWithAave, owner },
        regularAccounts[0].address,
      );
    });
  });

  describe('removeWaivedFeeAccount()', () => {
    it('should fail: call from address without vault admin role', async () => {
      const { owner, redemptionVaultWithAave, regularAccounts } =
        await loadFixture(defaultDeploy);
      await addWaivedFeeAccountTest(
        { vault: redemptionVaultWithAave, owner },
        regularAccounts[0].address,
      );
      await removeWaivedFeeAccountTest(
        { vault: redemptionVaultWithAave, owner },
        regularAccounts[0].address,
        {
          from: regularAccounts[0],
          revertMessage: acErrors.WMAC_HASNT_ROLE,
        },
      );
    });

    it('call from address with vault admin role', async () => {
      const { owner, redemptionVaultWithAave, regularAccounts } =
        await loadFixture(defaultDeploy);
      await addWaivedFeeAccountTest(
        { vault: redemptionVaultWithAave, owner },
        regularAccounts[0].address,
      );
      await removeWaivedFeeAccountTest(
        { vault: redemptionVaultWithAave, owner },
        regularAccounts[0].address,
      );
    });
  });

  describe('setFee()', () => {
    it('should fail: call from address without vault admin role', async () => {
      const { owner, redemptionVaultWithAave, regularAccounts } =
        await loadFixture(defaultDeploy);
      await setInstantFeeTest({ vault: redemptionVaultWithAave, owner }, 100, {
        from: regularAccounts[0],
        revertMessage: acErrors.WMAC_HASNT_ROLE,
      });
    });

    it('call from address with vault admin role', async () => {
      const { owner, redemptionVaultWithAave } = await loadFixture(
        defaultDeploy,
      );
      await setInstantFeeTest({ vault: redemptionVaultWithAave, owner }, 100);
    });
  });

  describe('setVariabilityTolerance()', () => {
    it('should fail: call from address without vault admin role', async () => {
      const { owner, redemptionVaultWithAave, regularAccounts } =
        await loadFixture(defaultDeploy);
      await setVariabilityToleranceTest(
        { vault: redemptionVaultWithAave, owner },
        100,
        {
          from: regularAccounts[0],
          revertMessage: acErrors.WMAC_HASNT_ROLE,
        },
      );
    });

    it('call from address with vault admin role', async () => {
      const { owner, redemptionVaultWithAave } = await loadFixture(
        defaultDeploy,
      );
      await setVariabilityToleranceTest(
        { vault: redemptionVaultWithAave, owner },
        100,
      );
    });
  });

  describe('withdrawToken()', () => {
    it('should fail: call from address without vault admin role', async () => {
      const { owner, redemptionVaultWithAave, stableCoins, regularAccounts } =
        await loadFixture(defaultDeploy);
      await mintToken(stableCoins.dai, redemptionVaultWithAave, 1);
      await withdrawTest(
        { vault: redemptionVaultWithAave, owner },
        stableCoins.dai,
        1,
        regularAccounts[0],
        {
          from: regularAccounts[0],
          revertMessage: acErrors.WMAC_HASNT_ROLE,
        },
      );
    });

    it('call from address with vault admin role', async () => {
      const { owner, redemptionVaultWithAave, stableCoins, regularAccounts } =
        await loadFixture(defaultDeploy);
      await mintToken(stableCoins.dai, redemptionVaultWithAave, 1);
      await withdrawTest(
        { vault: redemptionVaultWithAave, owner },
        stableCoins.dai,
        1,
        regularAccounts[0],
      );
    });
  });

  describe('freeFromMinAmount()', async () => {
    it('should fail: call from address without vault admin role', async () => {
      const { redemptionVaultWithAave, regularAccounts } = await loadFixture(
        defaultDeploy,
      );
      await expect(
        redemptionVaultWithAave
          .connect(regularAccounts[0])
          .freeFromMinAmount(regularAccounts[1].address, true),
      ).to.be.revertedWith('WMAC: hasnt role');
    });
    it('should not fail', async () => {
      const { redemptionVaultWithAave, regularAccounts } = await loadFixture(
        defaultDeploy,
      );
      await expect(
        redemptionVaultWithAave.freeFromMinAmount(
          regularAccounts[0].address,
          true,
        ),
      ).to.not.reverted;

      expect(
        await redemptionVaultWithAave.isFreeFromMinAmount(
          regularAccounts[0].address,
        ),
      ).to.eq(true);
    });
  });

  describe('changeTokenAllowance()', () => {
    it('should fail: call from address without vault admin role', async () => {
      const { owner, redemptionVaultWithAave, stableCoins, dataFeed } =
        await loadFixture(defaultDeploy);
      await addPaymentTokenTest(
        { vault: redemptionVaultWithAave, owner },
        stableCoins.dai,
        dataFeed.address,
        0,
        true,
      );
      await changeTokenAllowanceTest(
        { vault: redemptionVaultWithAave, owner },
        stableCoins.dai.address,
        100,
        {
          from: (await ethers.getSigners())[10],
          revertMessage: acErrors.WMAC_HASNT_ROLE,
        },
      );
    });

    it('call from address with vault admin role', async () => {
      const { owner, redemptionVaultWithAave, stableCoins, dataFeed } =
        await loadFixture(defaultDeploy);
      await addPaymentTokenTest(
        { vault: redemptionVaultWithAave, owner },
        stableCoins.dai,
        dataFeed.address,
        0,
        true,
      );
      await changeTokenAllowanceTest(
        { vault: redemptionVaultWithAave, owner },
        stableCoins.dai.address,
        100,
      );
    });
  });

  describe('changeTokenFee()', () => {
    it('should fail: call from address without vault admin role', async () => {
      const { owner, redemptionVaultWithAave, stableCoins, dataFeed } =
        await loadFixture(defaultDeploy);
      await addPaymentTokenTest(
        { vault: redemptionVaultWithAave, owner },
        stableCoins.dai,
        dataFeed.address,
        0,
        true,
      );
      await changeTokenFeeTest(
        { vault: redemptionVaultWithAave, owner },
        stableCoins.dai.address,
        100,
        {
          from: (await ethers.getSigners())[10],
          revertMessage: acErrors.WMAC_HASNT_ROLE,
        },
      );
    });

    it('call from address with vault admin role', async () => {
      const { owner, redemptionVaultWithAave, stableCoins, dataFeed } =
        await loadFixture(defaultDeploy);
      await addPaymentTokenTest(
        { vault: redemptionVaultWithAave, owner },
        stableCoins.dai,
        dataFeed.address,
        0,
        true,
      );
      await changeTokenFeeTest(
        { vault: redemptionVaultWithAave, owner },
        stableCoins.dai.address,
        100,
      );
    });
  });

  describe('checkAndRedeemAave()', () => {
    it('should not withdraw from Aave when contract has enough balance', async () => {
      const { redemptionVaultWithAave, stableCoins, aUSDC } = await loadFixture(
        defaultDeploy,
      );

      const usdcAmount = parseUnits('1000', 8);
      await stableCoins.usdc.mint(redemptionVaultWithAave.address, usdcAmount);

      const balanceBefore = await stableCoins.usdc.balanceOf(
        redemptionVaultWithAave.address,
      );
      const aTokenBefore = await aUSDC.balanceOf(
        redemptionVaultWithAave.address,
      );

      await redemptionVaultWithAave.checkAndRedeemAave(
        stableCoins.usdc.address,
        parseUnits('500', 8),
      );

      const balanceAfter = await stableCoins.usdc.balanceOf(
        redemptionVaultWithAave.address,
      );
      const aTokenAfter = await aUSDC.balanceOf(
        redemptionVaultWithAave.address,
      );
      expect(balanceAfter).to.equal(balanceBefore);
      expect(aTokenAfter).to.equal(aTokenBefore);
    });

    it('should withdraw missing amount from Aave', async () => {
      const { redemptionVaultWithAave, stableCoins, aUSDC } = await loadFixture(
        defaultDeploy,
      );

      // Vault has 500 USDC, needs 1000
      const initialUsdc = parseUnits('500', 8);
      await stableCoins.usdc.mint(redemptionVaultWithAave.address, initialUsdc);

      // Vault has 600 aUSDC
      const aTokenAmount = parseUnits('600', 8);
      await aUSDC.mint(redemptionVaultWithAave.address, aTokenAmount);

      await redemptionVaultWithAave.checkAndRedeemAave(
        stableCoins.usdc.address,
        parseUnits('1000', 8),
      );

      // Vault should now have 1000 USDC (500 original + 500 withdrawn from Aave)
      const usdcAfter = await stableCoins.usdc.balanceOf(
        redemptionVaultWithAave.address,
      );
      expect(usdcAfter).to.equal(parseUnits('1000', 8));

      // aToken balance should decrease by 500
      const aTokenAfter = await aUSDC.balanceOf(
        redemptionVaultWithAave.address,
      );
      expect(aTokenAfter).to.equal(parseUnits('100', 8));
    });

    it('should revert when token not in Aave pool', async () => {
      const { redemptionVaultWithAave, stableCoins } = await loadFixture(
        defaultDeploy,
      );

      // DAI is not registered in Aave pool mock
      await expect(
        redemptionVaultWithAave.checkAndRedeemAave(
          stableCoins.dai.address,
          parseUnits('1000', 9),
        ),
      ).to.be.revertedWith('RVA: token not in Aave pool');
    });

    it('should revert when contract has insufficient aToken balance', async () => {
      const { redemptionVaultWithAave, stableCoins, aUSDC } = await loadFixture(
        defaultDeploy,
      );

      // Vault has 200 USDC, needs 1000
      await stableCoins.usdc.mint(
        redemptionVaultWithAave.address,
        parseUnits('200', 8),
      );

      // Vault has only 300 aUSDC (not enough for 800 missing)
      await aUSDC.mint(redemptionVaultWithAave.address, parseUnits('300', 8));

      await expect(
        redemptionVaultWithAave.checkAndRedeemAave(
          stableCoins.usdc.address,
          parseUnits('1000', 8),
        ),
      ).to.be.revertedWith('RVA: insufficient aToken balance');
    });

    it('should revert when Aave pool has insufficient underlying liquidity', async () => {
      const { redemptionVaultWithAave, stableCoins, aUSDC, aavePoolMock } =
        await loadFixture(defaultDeploy);

      // Vault needs to withdraw from Aave
      await stableCoins.usdc.mint(
        redemptionVaultWithAave.address,
        parseUnits('200', 8),
      );

      // Vault has enough aTokens
      await aUSDC.mint(redemptionVaultWithAave.address, parseUnits('1000', 8));

      // Drain the pool's USDC
      const poolBalance = await stableCoins.usdc.balanceOf(
        aavePoolMock.address,
      );
      await aavePoolMock.withdrawAdmin(
        stableCoins.usdc.address,
        (
          await ethers.getSigners()
        )[10].address,
        poolBalance,
      );

      await expect(
        redemptionVaultWithAave.checkAndRedeemAave(
          stableCoins.usdc.address,
          parseUnits('1000', 8),
        ),
      ).to.be.revertedWith('AaveV3PoolMock: InsufficientLiquidity');
    });
  });

  describe('redeemInstant()', () => {
    it('should fail: when there is no token in vault', async () => {
      const {
        owner,
        redemptionVaultWithAave,
        stableCoins,
        mTBILL,
        mTokenToUsdDataFeed,
      } = await loadFixture(defaultDeploy);

      await redeemInstantTest(
        {
          redemptionVault: redemptionVaultWithAave,
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
        redemptionVaultWithAave,
        stableCoins,
        mTBILL,
        dataFeed,
        mTokenToUsdDataFeed,
      } = await loadFixture(defaultDeploy);
      await addPaymentTokenTest(
        { vault: redemptionVaultWithAave, owner },
        stableCoins.usdc,
        dataFeed.address,
        0,
        true,
      );
      await redeemInstantTest(
        {
          redemptionVault: redemptionVaultWithAave,
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
        redemptionVaultWithAave,
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
        redemptionVaultWithAave,
        100,
      );
      await addPaymentTokenTest(
        { vault: redemptionVaultWithAave, owner },
        stableCoins.dai,
        dataFeed.address,
        0,
        true,
      );
      const selector = encodeFnSelector(
        'redeemInstant(address,uint256,uint256)',
      );
      await pauseVaultFn(redemptionVaultWithAave, selector);
      await redeemInstantTest(
        {
          redemptionVault: redemptionVaultWithAave,
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
        redemptionVaultWithAave,
        stableCoins,
        mTBILL,
        dataFeed,
        mTokenToUsdDataFeed,
      } = await loadFixture(defaultDeploy);

      await mintToken(mTBILL, owner, 100);
      await addPaymentTokenTest(
        { vault: redemptionVaultWithAave, owner },
        stableCoins.usdc,
        dataFeed.address,
        0,
        true,
      );
      await redeemInstantTest(
        {
          redemptionVault: redemptionVaultWithAave,
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
        redemptionVaultWithAave,
        stableCoins,
        mTBILL,
        dataFeed,
        mTokenToUsdDataFeed,
      } = await loadFixture(defaultDeploy);

      await approveBase18(owner, mTBILL, redemptionVaultWithAave, 100);
      await addPaymentTokenTest(
        { vault: redemptionVaultWithAave, owner },
        stableCoins.usdc,
        dataFeed.address,
        0,
        true,
      );
      await redeemInstantTest(
        {
          redemptionVault: redemptionVaultWithAave,
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
        redemptionVaultWithAave,
        stableCoins,
        mTBILL,
        dataFeed,
        mockedAggregator,
        mockedAggregatorMToken,
        mTokenToUsdDataFeed,
      } = await loadFixture(defaultDeploy);

      await approveBase18(owner, stableCoins.usdc, redemptionVaultWithAave, 10);
      await addPaymentTokenTest(
        { vault: redemptionVaultWithAave, owner },
        stableCoins.usdc,
        dataFeed.address,
        0,
        true,
      );
      await mintToken(mTBILL, owner, 100_000);
      await setRoundData({ mockedAggregator }, 0);
      await redeemInstantTest(
        {
          redemptionVault: redemptionVaultWithAave,
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
        redemptionVaultWithAave,
        mockedAggregator,
        owner,
        mTBILL,
        stableCoins,
        dataFeed,
        mTokenToUsdDataFeed,
      } = await loadFixture(defaultDeploy);
      await addPaymentTokenTest(
        { vault: redemptionVaultWithAave, owner },
        stableCoins.usdc,
        dataFeed.address,
        0,
        true,
      );
      await setRoundData({ mockedAggregator }, 1);

      await mintToken(mTBILL, owner, 100_000);
      await approveBase18(owner, mTBILL, redemptionVaultWithAave, 100_000);

      await setMinAmountTest(
        { vault: redemptionVaultWithAave, owner },
        100_000,
      );

      await redeemInstantTest(
        {
          redemptionVault: redemptionVaultWithAave,
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
        redemptionVaultWithAave,
        stableCoins,
        mTBILL,
        dataFeed,
        mockedAggregator,
        mTokenToUsdDataFeed,
      } = await loadFixture(defaultDeploy);

      await addPaymentTokenTest(
        { vault: redemptionVaultWithAave, owner },
        stableCoins.usdc,
        dataFeed.address,
        0,
        true,
      );
      await setRoundData({ mockedAggregator }, 4);

      await mintToken(mTBILL, owner, 100_000);
      await changeTokenAllowanceTest(
        { vault: redemptionVaultWithAave, owner },
        stableCoins.usdc.address,
        100,
      );
      await approveBase18(owner, mTBILL, redemptionVaultWithAave, 100_000);

      await redeemInstantTest(
        {
          redemptionVault: redemptionVaultWithAave,
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
        redemptionVaultWithAave,
        stableCoins,
        mTBILL,
        dataFeed,
        mockedAggregator,
        mTokenToUsdDataFeed,
      } = await loadFixture(defaultDeploy);

      await addPaymentTokenTest(
        { vault: redemptionVaultWithAave, owner },
        stableCoins.usdc,
        dataFeed.address,
        0,
        true,
      );
      await setRoundData({ mockedAggregator }, 4);

      await mintToken(mTBILL, owner, 100_000);
      await setInstantDailyLimitTest(
        { vault: redemptionVaultWithAave, owner },
        1000,
      );

      await approveBase18(owner, mTBILL, redemptionVaultWithAave, 100_000);

      await redeemInstantTest(
        {
          redemptionVault: redemptionVaultWithAave,
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
        redemptionVaultWithAave,
        stableCoins,
        mTBILL,
        dataFeed,
        mTokenToUsdDataFeed,
      } = await loadFixture(defaultDeploy);

      await mintToken(mTBILL, owner, 100);
      await approveBase18(owner, mTBILL, redemptionVaultWithAave, 100);
      await addPaymentTokenTest(
        { vault: redemptionVaultWithAave, owner },
        stableCoins.usdc,
        dataFeed.address,
        10000,
        true,
      );
      await redeemInstantTest(
        {
          redemptionVault: redemptionVaultWithAave,
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
        redemptionVaultWithAave,
        stableCoins,
        mTBILL,
        mTokenToUsdDataFeed,
      } = await loadFixture(defaultDeploy);

      await redemptionVaultWithAave.setGreenlistEnable(true);

      await redeemInstantTest(
        {
          redemptionVault: redemptionVaultWithAave,
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
        redemptionVaultWithAave,
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
          redemptionVault: redemptionVaultWithAave,
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
        redemptionVaultWithAave,
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
        redemptionVaultWithAave,
        100,
      );
      await addPaymentTokenTest(
        { vault: redemptionVaultWithAave, owner },
        stableCoins.usdc,
        dataFeed.address,
        0,
        true,
      );
      await redeemInstantTest(
        {
          redemptionVault: redemptionVaultWithAave,
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

    it('redeem 100 mTBILL when vault has enough USDC (no Aave needed)', async () => {
      const {
        owner,
        redemptionVaultWithAave,
        stableCoins,
        mTBILL,
        mTokenToUsdDataFeed,
        dataFeed,
        aUSDC,
      } = await loadFixture(defaultDeploy);

      await mintToken(stableCoins.usdc, redemptionVaultWithAave, 100000);
      await mintToken(mTBILL, owner, 100);
      await approveBase18(owner, mTBILL, redemptionVaultWithAave, 100);
      await addPaymentTokenTest(
        { vault: redemptionVaultWithAave, owner },
        stableCoins.usdc,
        dataFeed.address,
        0,
        true,
      );

      const aTokenBefore = await aUSDC.balanceOf(
        redemptionVaultWithAave.address,
      );

      await redeemInstantTest(
        {
          redemptionVault: redemptionVaultWithAave,
          owner,
          mTBILL,
          mTokenToUsdDataFeed,
        },
        stableCoins.usdc,
        100,
      );

      // aToken balance should not change
      const aTokenAfter = await aUSDC.balanceOf(
        redemptionVaultWithAave.address,
      );
      expect(aTokenAfter).to.equal(aTokenBefore);
    });

    it('redeem 1000 mTBILL when vault has no USDC but has aTokens', async () => {
      const {
        owner,
        mockedAggregator,
        mockedAggregatorMToken,
        redemptionVaultWithAave,
        stableCoins,
        mTBILL,
        dataFeed,
        mTokenToUsdDataFeed,
        aUSDC,
      } = await loadFixture(defaultDeploy);

      // Mint aTokens to vault (enough for redemption)
      await aUSDC.mint(redemptionVaultWithAave.address, parseUnits('9900', 8));
      await mintToken(mTBILL, owner, 1000);
      await approveBase18(owner, mTBILL, redemptionVaultWithAave, 1000);
      await addPaymentTokenTest(
        { vault: redemptionVaultWithAave, owner },
        stableCoins.usdc,
        dataFeed.address,
        0,
        true,
      );
      await setInstantFeeTest({ vault: redemptionVaultWithAave, owner }, 0);
      await setRoundData({ mockedAggregator }, 1);
      await setRoundData({ mockedAggregator: mockedAggregatorMToken }, 1);

      const aTokenBefore = await aUSDC.balanceOf(
        redemptionVaultWithAave.address,
      );

      await redeemInstantTest(
        {
          redemptionVault: redemptionVaultWithAave,
          owner,
          mTBILL,
          mTokenToUsdDataFeed,
        },
        stableCoins.usdc,
        1000,
      );

      const aTokenAfter = await aUSDC.balanceOf(
        redemptionVaultWithAave.address,
      );

      // aTokens should decrease
      expect(aTokenAfter).to.be.lt(aTokenBefore);
    });

    it('redeem 1000 mTBILL when vault has 100 USDC and sufficient aTokens (partial Aave)', async () => {
      const {
        owner,
        mockedAggregator,
        mockedAggregatorMToken,
        redemptionVaultWithAave,
        stableCoins,
        mTBILL,
        dataFeed,
        mTokenToUsdDataFeed,
        aUSDC,
      } = await loadFixture(defaultDeploy);

      // Vault has 100 USDC + 9900 aTokens
      await mintToken(stableCoins.usdc, redemptionVaultWithAave, 100);
      await aUSDC.mint(redemptionVaultWithAave.address, parseUnits('9900', 8));
      await mintToken(mTBILL, owner, 1000);
      await approveBase18(owner, mTBILL, redemptionVaultWithAave, 1000);
      await addPaymentTokenTest(
        { vault: redemptionVaultWithAave, owner },
        stableCoins.usdc,
        dataFeed.address,
        0,
        true,
      );
      await setRoundData({ mockedAggregator }, 1);
      await setRoundData({ mockedAggregator: mockedAggregatorMToken }, 1);

      await redeemInstantTest(
        {
          redemptionVault: redemptionVaultWithAave,
          owner,
          mTBILL,
          mTokenToUsdDataFeed,
        },
        stableCoins.usdc,
        1000,
      );
    });

    it('redeem 1000 mTBILL with different prices (stable 1.03$, mToken 5$) and partial Aave', async () => {
      const {
        owner,
        mockedAggregator,
        mockedAggregatorMToken,
        redemptionVaultWithAave,
        stableCoins,
        mTBILL,
        dataFeed,
        mTokenToUsdDataFeed,
        aUSDC,
      } = await loadFixture(defaultDeploy);

      await mintToken(stableCoins.usdc, redemptionVaultWithAave, 100);
      await aUSDC.mint(redemptionVaultWithAave.address, parseUnits('15000', 8));
      await mintToken(mTBILL, owner, 1000);
      await approveBase18(owner, mTBILL, redemptionVaultWithAave, 1000);
      await addPaymentTokenTest(
        { vault: redemptionVaultWithAave, owner },
        stableCoins.usdc,
        dataFeed.address,
        100,
        true,
      );
      await setRoundData({ mockedAggregator }, 1.03);
      await setRoundData({ mockedAggregator: mockedAggregatorMToken }, 5);
      await redemptionVaultWithAave.freeFromMinAmount(owner.address, true);

      await redeemInstantTest(
        {
          redemptionVault: redemptionVaultWithAave,
          owner,
          mTBILL,
          mTokenToUsdDataFeed,
        },
        stableCoins.usdc,
        1000,
      );
    });

    it('redeem 1000 mTBILL with waived fee and Aave withdrawal', async () => {
      const {
        owner,
        mockedAggregator,
        mockedAggregatorMToken,
        redemptionVaultWithAave,
        stableCoins,
        mTBILL,
        dataFeed,
        mTokenToUsdDataFeed,
        aUSDC,
      } = await loadFixture(defaultDeploy);

      await mintToken(stableCoins.usdc, redemptionVaultWithAave, 100);
      await aUSDC.mint(redemptionVaultWithAave.address, parseUnits('15000', 8));
      await mintToken(mTBILL, owner, 1000);
      await approveBase18(owner, mTBILL, redemptionVaultWithAave, 1000);
      await addPaymentTokenTest(
        { vault: redemptionVaultWithAave, owner },
        stableCoins.usdc,
        dataFeed.address,
        100,
        true,
      );
      await setRoundData({ mockedAggregator }, 1.03);
      await setRoundData({ mockedAggregator: mockedAggregatorMToken }, 5);

      await addWaivedFeeAccountTest(
        { vault: redemptionVaultWithAave, owner },
        owner.address,
      );

      await redeemInstantTest(
        {
          redemptionVault: redemptionVaultWithAave,
          owner,
          mTBILL,
          mTokenToUsdDataFeed,
          waivedFee: true,
        },
        stableCoins.usdc,
        1000,
      );
    });

    it('should fail: insufficient aToken balance during redeemInstant', async () => {
      const {
        owner,
        mockedAggregator,
        mockedAggregatorMToken,
        redemptionVaultWithAave,
        stableCoins,
        mTBILL,
        dataFeed,
        mTokenToUsdDataFeed,
        aUSDC,
      } = await loadFixture(defaultDeploy);

      // Vault has no USDC and only 10 aTokens (not enough for 1000 mTBILL redemption)
      await aUSDC.mint(redemptionVaultWithAave.address, parseUnits('10', 8));
      await mintToken(mTBILL, owner, 1000);
      await approveBase18(owner, mTBILL, redemptionVaultWithAave, 1000);
      await addPaymentTokenTest(
        { vault: redemptionVaultWithAave, owner },
        stableCoins.usdc,
        dataFeed.address,
        0,
        true,
      );
      await setInstantFeeTest({ vault: redemptionVaultWithAave, owner }, 0);
      await setRoundData({ mockedAggregator }, 1);
      await setRoundData({ mockedAggregator: mockedAggregatorMToken }, 1);

      await expect(
        redemptionVaultWithAave['redeemInstant(address,uint256,uint256)'](
          stableCoins.usdc.address,
          parseUnits('1000'),
          0,
        ),
      ).to.be.revertedWith('RVA: insufficient aToken balance');
    });

    it('should fail: Aave pool has insufficient liquidity during redeemInstant', async () => {
      const {
        owner,
        mockedAggregator,
        mockedAggregatorMToken,
        redemptionVaultWithAave,
        stableCoins,
        mTBILL,
        dataFeed,
        mTokenToUsdDataFeed,
        aUSDC,
        aavePoolMock,
      } = await loadFixture(defaultDeploy);

      // Vault has aTokens but pool has no liquidity
      await aUSDC.mint(redemptionVaultWithAave.address, parseUnits('10000', 8));
      await mintToken(mTBILL, owner, 100000);
      await approveBase18(owner, mTBILL, redemptionVaultWithAave, 100000);
      await addPaymentTokenTest(
        { vault: redemptionVaultWithAave, owner },
        stableCoins.usdc,
        dataFeed.address,
        0,
        true,
      );
      await setInstantFeeTest({ vault: redemptionVaultWithAave, owner }, 0);
      await setRoundData({ mockedAggregator }, 1);
      await setRoundData({ mockedAggregator: mockedAggregatorMToken }, 1);

      // Drain the pool
      const poolBalance = await stableCoins.usdc.balanceOf(
        aavePoolMock.address,
      );
      await aavePoolMock.withdrawAdmin(
        stableCoins.usdc.address,
        (
          await ethers.getSigners()
        )[10].address,
        poolBalance,
      );

      await expect(
        redemptionVaultWithAave['redeemInstant(address,uint256,uint256)'](
          stableCoins.usdc.address,
          parseUnits('1000'),
          0,
        ),
      ).to.be.revertedWith('AaveV3PoolMock: InsufficientLiquidity');
    });

    // ── Custom recipient tests ───────────────────────────────────────────

    it('redeem 100 mTBILL (custom recipient overload)', async () => {
      const {
        owner,
        redemptionVaultWithAave,
        stableCoins,
        mTBILL,
        mTokenToUsdDataFeed,
        regularAccounts,
        dataFeed,
        customRecipient,
      } = await loadFixture(defaultDeploy);

      await mintToken(stableCoins.usdc, redemptionVaultWithAave, 100000);
      await mintToken(mTBILL, regularAccounts[0], 100);
      await approveBase18(
        regularAccounts[0],
        mTBILL,
        redemptionVaultWithAave,
        100,
      );
      await addPaymentTokenTest(
        { vault: redemptionVaultWithAave, owner },
        stableCoins.usdc,
        dataFeed.address,
        0,
        true,
      );

      await redeemInstantTest(
        {
          redemptionVault: redemptionVaultWithAave,
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
        redemptionVaultWithAave,
        stableCoins,
        mTBILL,
        mTokenToUsdDataFeed,
        regularAccounts,
        dataFeed,
        customRecipient,
      } = await loadFixture(defaultDeploy);

      await pauseVaultFn(
        redemptionVaultWithAave,
        encodeFnSelector('redeemInstant(address,uint256,uint256)'),
      );
      await mintToken(stableCoins.usdc, redemptionVaultWithAave, 100000);
      await mintToken(mTBILL, regularAccounts[0], 100);
      await approveBase18(
        regularAccounts[0],
        mTBILL,
        redemptionVaultWithAave,
        100,
      );
      await addPaymentTokenTest(
        { vault: redemptionVaultWithAave, owner },
        stableCoins.usdc,
        dataFeed.address,
        0,
        true,
      );

      await redeemInstantTest(
        {
          redemptionVault: redemptionVaultWithAave,
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
        redemptionVaultWithAave,
        stableCoins,
        mTBILL,
        mTokenToUsdDataFeed,
        regularAccounts,
        dataFeed,
      } = await loadFixture(defaultDeploy);

      await pauseVaultFn(
        redemptionVaultWithAave,
        encodeFnSelector('redeemInstant(address,uint256,uint256,address)'),
      );
      await mintToken(stableCoins.usdc, redemptionVaultWithAave, 100000);
      await mintToken(mTBILL, regularAccounts[0], 100);
      await approveBase18(
        regularAccounts[0],
        mTBILL,
        redemptionVaultWithAave,
        100,
      );
      await addPaymentTokenTest(
        { vault: redemptionVaultWithAave, owner },
        stableCoins.usdc,
        dataFeed.address,
        0,
        true,
      );

      await redeemInstantTest(
        {
          redemptionVault: redemptionVaultWithAave,
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
        redemptionVaultWithAave,
        stableCoins,
        mTBILL,
        mTokenToUsdDataFeed,
      } = await loadFixture(defaultDeploy);

      await redeemRequestTest(
        {
          redemptionVault: redemptionVaultWithAave,
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
        redemptionVaultWithAave,
        stableCoins,
        mTBILL,
        dataFeed,
        mTokenToUsdDataFeed,
      } = await loadFixture(defaultDeploy);
      await addPaymentTokenTest(
        { vault: redemptionVaultWithAave, owner },
        stableCoins.dai,
        dataFeed.address,
        0,
        true,
      );
      await redeemRequestTest(
        {
          redemptionVault: redemptionVaultWithAave,
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
        redemptionVaultWithAave,
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
        redemptionVaultWithAave,
        100,
      );
      await addPaymentTokenTest(
        { vault: redemptionVaultWithAave, owner },
        stableCoins.dai,
        dataFeed.address,
        0,
        true,
      );
      const selector = encodeFnSelector('redeemRequest(address,uint256)');
      await pauseVaultFn(redemptionVaultWithAave, selector);
      await redeemRequestTest(
        {
          redemptionVault: redemptionVaultWithAave,
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
        redemptionVaultWithAave,
        stableCoins,
        mTBILL,
        dataFeed,
        mTokenToUsdDataFeed,
      } = await loadFixture(defaultDeploy);

      await approveBase18(owner, mTBILL, redemptionVaultWithAave, 100);
      await addPaymentTokenTest(
        { vault: redemptionVaultWithAave, owner },
        stableCoins.dai,
        dataFeed.address,
        0,
        true,
      );
      await redeemRequestTest(
        {
          redemptionVault: redemptionVaultWithAave,
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
        redemptionVaultWithAave,
        stableCoins,
        mTBILL,
        dataFeed,
        mTokenToUsdDataFeed,
      } = await loadFixture(defaultDeploy);

      await mintToken(mTBILL, owner, 100);
      await approveBase18(owner, mTBILL, redemptionVaultWithAave, 100);
      await addPaymentTokenTest(
        { vault: redemptionVaultWithAave, owner },
        stableCoins.usdc,
        dataFeed.address,
        0,
        true,
      );
      await redeemRequestTest(
        {
          redemptionVault: redemptionVaultWithAave,
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
        redemptionVaultWithAave,
        mTBILL,
        mTokenToUsdDataFeed,
        regularAccounts,
      } = await loadFixture(defaultDeploy);
      await mintToken(mTBILL, regularAccounts[0], 100000);
      await approveBase18(
        regularAccounts[0],
        mTBILL,
        redemptionVaultWithAave,
        100000,
      );
      const selector = encodeFnSelector('redeemFiatRequest(uint256)');
      await pauseVaultFn(redemptionVaultWithAave, selector);
      await redeemFiatRequestTest(
        {
          redemptionVault: redemptionVaultWithAave,
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
      const { owner, redemptionVaultWithAave, mTBILL, mTokenToUsdDataFeed } =
        await loadFixture(defaultDeploy);

      await mintToken(mTBILL, owner, 100000);
      await approveBase18(owner, mTBILL, redemptionVaultWithAave, 100000);
      await redeemFiatRequestTest(
        {
          redemptionVault: redemptionVaultWithAave,
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
        redemptionVaultWithAave,
        stableCoins,
        mTBILL,
        dataFeed,
        mTokenToUsdDataFeed,
      } = await loadFixture(defaultDeploy);

      await addPaymentTokenTest(
        { vault: redemptionVaultWithAave, owner },
        stableCoins.usdc,
        dataFeed.address,
        0,
        true,
      );

      await approveRedeemRequestTest(
        {
          redemptionVault: redemptionVaultWithAave,
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
        redemptionVaultWithAave,
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
        redemptionVaultWithAave,
        100000,
      );

      await mintToken(mTBILL, owner, 100);
      await approveBase18(owner, mTBILL, redemptionVaultWithAave, 100);
      await addPaymentTokenTest(
        { vault: redemptionVaultWithAave, owner },
        stableCoins.dai,
        dataFeed.address,
        0,
        true,
      );
      await setRoundData({ mockedAggregator }, 1.03);
      await setRoundData({ mockedAggregator: mockedAggregatorMToken }, 5);

      await redeemRequestTest(
        {
          redemptionVault: redemptionVaultWithAave,
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
          redemptionVault: redemptionVaultWithAave,
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
        redemptionVaultWithAave,
        stableCoins,
        mTBILL,
        dataFeed,
        mTokenToUsdDataFeed,
      } = await loadFixture(defaultDeploy);

      await mintToken(mTBILL, owner, 100);
      await approveBase18(owner, mTBILL, redemptionVaultWithAave, 100);
      await addPaymentTokenTest(
        { vault: redemptionVaultWithAave, owner },
        stableCoins.dai,
        dataFeed.address,
        0,
        true,
      );
      await setRoundData({ mockedAggregator }, 1.03);
      await setRoundData({ mockedAggregator: mockedAggregatorMToken }, 5);

      await redeemRequestTest(
        {
          redemptionVault: redemptionVaultWithAave,
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
          redemptionVault: redemptionVaultWithAave,
          owner,
          mTBILL,
          mTokenToUsdDataFeed,
        },
        +requestId,
      );
    });
  });
});
