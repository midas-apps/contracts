import { loadFixture } from '@nomicfoundation/hardhat-network-helpers';
import { expect } from 'chai';
import { constants } from 'ethers';
import { parseUnits } from 'ethers/lib/utils';
import { ethers } from 'hardhat';

import { encodeFnSelector } from '../../helpers/utils';
import {
  DepositVaultTest__factory,
  EUsdDepositVault__factory,
  ManageableVaultTester__factory,
  MBasisDepositVault__factory,
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
  depositInstantWithUstbTest,
  setMockUstbStablecoinConfig,
  setUstbDepositsEnabledTest,
} from '../common/deposit-vault-ustb.helpers';
import {
  approveRequestTest,
  depositInstantTest,
  depositRequestTest,
  rejectRequestTest,
  safeApproveRequestTest,
  safeBulkApproveRequestTest,
} from '../common/deposit-vault.helpers';
import { defaultDeploy } from '../common/fixtures';
import { greenListEnable } from '../common/greenlist.helpers';
import {
  addPaymentTokenTest,
  addWaivedFeeAccountTest,
  changeTokenAllowanceTest,
  removePaymentTokenTest,
  removeWaivedFeeAccountTest,
  setInstantFeeTest,
  setInstantDailyLimitTest,
  setMinAmountTest,
  setMinAmountToDepositTest,
  setVariabilityToleranceTest,
  withdrawTest,
  changeTokenFeeTest,
} from '../common/manageable-vault.helpers';
import { sanctionUser } from '../common/with-sanctions-list.helpers';

describe('DepositVaultWithUSTB', function () {
  it('deployment', async () => {
    const {
      depositVaultWithUSTB,
      mTBILL,
      tokensReceiver,
      feeReceiver,
      mTokenToUsdDataFeed,
      roles,
      ustbToken,
    } = await loadFixture(defaultDeploy);

    expect(await depositVaultWithUSTB.mToken()).eq(mTBILL.address);

    expect(await depositVaultWithUSTB.paused()).eq(false);

    expect(await depositVaultWithUSTB.tokensReceiver()).eq(
      tokensReceiver.address,
    );
    expect(await depositVaultWithUSTB.feeReceiver()).eq(feeReceiver.address);

    expect(await depositVaultWithUSTB.ONE_HUNDRED_PERCENT()).eq('10000');

    expect(await depositVaultWithUSTB.minMTokenAmountForFirstDeposit()).eq('0');
    expect(await depositVaultWithUSTB.minAmount()).eq(parseUnits('100'));

    expect(await depositVaultWithUSTB.instantFee()).eq('100');

    expect(await depositVaultWithUSTB.instantDailyLimit()).eq(
      parseUnits('100000'),
    );

    expect(await depositVaultWithUSTB.mTokenDataFeed()).eq(
      mTokenToUsdDataFeed.address,
    );
    expect(await depositVaultWithUSTB.variationTolerance()).eq(1);

    expect(await depositVaultWithUSTB.vaultRole()).eq(
      roles.tokenRoles.mTBILL.depositVaultAdmin,
    );

    expect(await depositVaultWithUSTB.MANUAL_FULLFILMENT_TOKEN()).eq(
      ethers.constants.AddressZero,
    );
    expect(await depositVaultWithUSTB.ustb()).eq(ustbToken.address);
  });

  it('failing deployment', async () => {
    const {
      accessControl,
      mTBILL,
      owner,
      mTokenToUsdDataFeed,
      feeReceiver,
      tokensReceiver,
      mockedSanctionsList,
    } = await loadFixture(defaultDeploy);
    const depositVaultWithUSTB = await new DepositVaultTest__factory(
      owner,
    ).deploy();

    await expect(
      depositVaultWithUSTB.initialize(
        ethers.constants.AddressZero,
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
        parseUnits('100'),
        constants.MaxUint256,
      ),
    ).to.be.reverted;
    await expect(
      depositVaultWithUSTB.initialize(
        accessControl.address,
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
        parseUnits('100'),
        constants.MaxUint256,
      ),
    ).to.be.reverted;
    await expect(
      depositVaultWithUSTB.initialize(
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
        parseUnits('100'),
        constants.MaxUint256,
      ),
    ).to.be.reverted;
    await expect(
      depositVaultWithUSTB.initialize(
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
        parseUnits('100'),
        constants.MaxUint256,
      ),
    ).to.be.reverted;
    await expect(
      depositVaultWithUSTB.initialize(
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
        parseUnits('100'),
        constants.MaxUint256,
      ),
    ).to.be.reverted;
    await expect(
      depositVaultWithUSTB.initialize(
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
          instantFee: 100001,
          instantDailyLimit: parseUnits('100000'),
        },
        mockedSanctionsList.address,
        1,
        parseUnits('100'),
        parseUnits('100'),
        constants.MaxUint256,
      ),
    ).to.be.reverted;
  });

  it('MBasisDepositVault', async () => {
    const fixture = await loadFixture(defaultDeploy);

    const tester = await new MBasisDepositVault__factory(
      fixture.owner,
    ).deploy();

    expect(await tester.vaultRole()).eq(
      await tester.M_BASIS_DEPOSIT_VAULT_ADMIN_ROLE(),
    );
  });

  it('EUsdDepositVault', async () => {
    const fixture = await loadFixture(defaultDeploy);

    const tester = await new EUsdDepositVault__factory(fixture.owner).deploy();

    expect(await tester.vaultRole()).eq(
      await tester.E_USD_DEPOSIT_VAULT_ADMIN_ROLE(),
    );
  });

  describe('initialization', () => {
    it('should fail: cal; initialize() when already initialized', async () => {
      const { depositVaultWithUSTB } = await loadFixture(defaultDeploy);

      await expect(
        depositVaultWithUSTB[
          'initialize(address,(address,address),(address,address),(uint256,uint256),address,uint256,uint256,uint256,uint256,address)'
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
          0,
          0,
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
          parseUnits('100'),
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
          parseUnits('100'),
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
          parseUnits('100'),
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
          parseUnits('100'),
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
          parseUnits('100'),
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
          parseUnits('100'),
        ),
      ).revertedWith('fee == 0');
    });
  });

  describe('setMinMTokenAmountForFirstDeposit()', () => {
    it('should fail: call from address without DEPOSIT_VAULT_ADMIN_ROLE role', async () => {
      const { owner, depositVaultWithUSTB, regularAccounts } =
        await loadFixture(defaultDeploy);

      await setMinAmountToDepositTest(
        { depositVault: depositVaultWithUSTB, owner },
        1.1,
        {
          from: regularAccounts[0],
          revertMessage: acErrors.WMAC_HASNT_ROLE,
        },
      );
    });

    it('call from address with DEPOSIT_VAULT_ADMIN_ROLE role', async () => {
      const { owner, depositVaultWithUSTB } = await loadFixture(defaultDeploy);
      await setMinAmountToDepositTest(
        { depositVault: depositVaultWithUSTB, owner },
        1.1,
      );
    });
  });

  describe('setMinAmount()', () => {
    it('should fail: call from address without DEPOSIT_VAULT_ADMIN_ROLE role', async () => {
      const { owner, depositVaultWithUSTB, regularAccounts } =
        await loadFixture(defaultDeploy);

      await setMinAmountTest({ vault: depositVaultWithUSTB, owner }, 1.1, {
        from: regularAccounts[0],
        revertMessage: acErrors.WMAC_HASNT_ROLE,
      });
    });

    it('call from address with DEPOSIT_VAULT_ADMIN_ROLE role', async () => {
      const { owner, depositVaultWithUSTB } = await loadFixture(defaultDeploy);
      await setMinAmountTest({ vault: depositVaultWithUSTB, owner }, 1.1);
    });
  });

  describe('setInstantDailyLimit()', () => {
    it('should fail: call from address without DEPOSIT_VAULT_ADMIN_ROLE role', async () => {
      const { owner, depositVaultWithUSTB, regularAccounts } =
        await loadFixture(defaultDeploy);

      await setInstantDailyLimitTest(
        { vault: depositVaultWithUSTB, owner },
        parseUnits('1000'),
        {
          from: regularAccounts[0],
          revertMessage: acErrors.WMAC_HASNT_ROLE,
        },
      );
    });

    it('should fail: try to set 0 limit', async () => {
      const { owner, depositVaultWithUSTB } = await loadFixture(defaultDeploy);

      await setInstantDailyLimitTest(
        { vault: depositVaultWithUSTB, owner },
        constants.Zero,
        {
          revertMessage: 'MV: limit zero',
        },
      );
    });

    it('call from address with DEPOSIT_VAULT_ADMIN_ROLE role', async () => {
      const { owner, depositVaultWithUSTB } = await loadFixture(defaultDeploy);
      await setInstantDailyLimitTest(
        { vault: depositVaultWithUSTB, owner },
        parseUnits('1000'),
      );
    });
  });

  describe('addPaymentToken()', () => {
    it('should fail: call from address without DEPOSIT_VAULT_ADMIN_ROLE role', async () => {
      const { depositVaultWithUSTB, regularAccounts, owner } =
        await loadFixture(defaultDeploy);
      await addPaymentTokenTest(
        { vault: depositVaultWithUSTB, owner },
        ethers.constants.AddressZero,
        ethers.constants.AddressZero,
        0,
        false,
        constants.MaxUint256,
        { revertMessage: acErrors.WMAC_HASNT_ROLE, from: regularAccounts[0] },
      );
    });

    it('should fail: when token is already added', async () => {
      const { depositVaultWithUSTB, stableCoins, owner, dataFeed } =
        await loadFixture(defaultDeploy);
      await addPaymentTokenTest(
        { vault: depositVaultWithUSTB, owner },
        stableCoins.dai,
        dataFeed.address,
        0,
        false,
      );
      await addPaymentTokenTest(
        { vault: depositVaultWithUSTB, owner },
        stableCoins.dai,
        dataFeed.address,
        0,
        false,
        constants.MaxUint256,
        {
          revertMessage: 'MV: already added',
        },
      );
    });

    it('should fail: when token dataFeed address zero', async () => {
      const { depositVaultWithUSTB, stableCoins, owner } = await loadFixture(
        defaultDeploy,
      );
      await addPaymentTokenTest(
        { vault: depositVaultWithUSTB, owner },
        stableCoins.dai,
        constants.AddressZero,
        0,
        false,
        constants.MaxUint256,
        {
          revertMessage: 'zero address',
        },
      );
    });

    it('call when allowance is zero', async () => {
      const { depositVaultWithUSTB, stableCoins, owner, dataFeed } =
        await loadFixture(defaultDeploy);
      await addPaymentTokenTest(
        { vault: depositVaultWithUSTB, owner },
        stableCoins.dai,
        dataFeed.address,
        0,
        false,
        constants.Zero,
      );
    });

    it('call when allowance is not uint256 max', async () => {
      const { depositVaultWithUSTB, stableCoins, owner, dataFeed } =
        await loadFixture(defaultDeploy);
      await addPaymentTokenTest(
        { vault: depositVaultWithUSTB, owner },
        stableCoins.dai,
        dataFeed.address,
        0,
        false,
        parseUnits('100'),
      );
    });

    it('call from address with DEPOSIT_VAULT_ADMIN_ROLE role', async () => {
      const { depositVaultWithUSTB, stableCoins, owner, dataFeed } =
        await loadFixture(defaultDeploy);
      await addPaymentTokenTest(
        { vault: depositVaultWithUSTB, owner },
        stableCoins.dai,
        dataFeed.address,
        0,
        false,
      );
    });

    it('call from address with DEPOSIT_VAULT_ADMIN_ROLE role and add 3 options on a row', async () => {
      const { depositVaultWithUSTB, stableCoins, owner, dataFeed } =
        await loadFixture(defaultDeploy);

      await addPaymentTokenTest(
        { vault: depositVaultWithUSTB, owner },
        stableCoins.dai,
        dataFeed.address,
        0,
        true,
      );
      await addPaymentTokenTest(
        { vault: depositVaultWithUSTB, owner },
        stableCoins.usdc,
        dataFeed.address,
        0,
        true,
      );
      await addPaymentTokenTest(
        { vault: depositVaultWithUSTB, owner },
        stableCoins.usdt,
        dataFeed.address,
        0,
        true,
      );
    });
  });

  describe('addWaivedFeeAccount()', () => {
    it('should fail: call from address without DEPOSIT_VAULT_ADMIN_ROLE role', async () => {
      const { depositVaultWithUSTB, regularAccounts, owner } =
        await loadFixture(defaultDeploy);
      await addWaivedFeeAccountTest(
        { vault: depositVaultWithUSTB, owner },
        ethers.constants.AddressZero,
        { revertMessage: acErrors.WMAC_HASNT_ROLE, from: regularAccounts[0] },
      );
    });
    it('should fail: if account fee already waived', async () => {
      const { depositVaultWithUSTB, owner } = await loadFixture(defaultDeploy);
      await addWaivedFeeAccountTest(
        { vault: depositVaultWithUSTB, owner },
        owner.address,
      );
      await addWaivedFeeAccountTest(
        { vault: depositVaultWithUSTB, owner },
        owner.address,
        { revertMessage: 'MV: already added' },
      );
    });

    it('call from address with DEPOSIT_VAULT_ADMIN_ROLE role', async () => {
      const { depositVaultWithUSTB, owner } = await loadFixture(defaultDeploy);
      await addWaivedFeeAccountTest(
        { vault: depositVaultWithUSTB, owner },
        owner.address,
      );
    });
  });

  describe('removeWaivedFeeAccount()', () => {
    it('should fail: call from address without DEPOSIT_VAULT_ADMIN_ROLE role', async () => {
      const { depositVaultWithUSTB, regularAccounts, owner } =
        await loadFixture(defaultDeploy);
      await removeWaivedFeeAccountTest(
        { vault: depositVaultWithUSTB, owner },
        ethers.constants.AddressZero,
        { revertMessage: acErrors.WMAC_HASNT_ROLE, from: regularAccounts[0] },
      );
    });
    it('should fail: if account not found in restriction', async () => {
      const { depositVaultWithUSTB, owner } = await loadFixture(defaultDeploy);
      await removeWaivedFeeAccountTest(
        { vault: depositVaultWithUSTB, owner },
        owner.address,
        { revertMessage: 'MV: not found' },
      );
    });

    it('call from address with DEPOSIT_VAULT_ADMIN_ROLE role', async () => {
      const { depositVaultWithUSTB, owner } = await loadFixture(defaultDeploy);
      await addWaivedFeeAccountTest(
        { vault: depositVaultWithUSTB, owner },
        owner.address,
      );
      await removeWaivedFeeAccountTest(
        { vault: depositVaultWithUSTB, owner },
        owner.address,
      );
    });
  });

  describe('setFee()', () => {
    it('should fail: call from address without DEPOSIT_VAULT_ADMIN_ROLE role', async () => {
      const { depositVaultWithUSTB, regularAccounts, owner } =
        await loadFixture(defaultDeploy);
      await setInstantFeeTest(
        { vault: depositVaultWithUSTB, owner },
        ethers.constants.Zero,
        { revertMessage: acErrors.WMAC_HASNT_ROLE, from: regularAccounts[0] },
      );
    });

    it('should fail: if new value greater then 100%', async () => {
      const { depositVaultWithUSTB, owner } = await loadFixture(defaultDeploy);
      await setInstantFeeTest({ vault: depositVaultWithUSTB, owner }, 10001, {
        revertMessage: 'fee > 100%',
      });
    });

    it('call from address with DEPOSIT_VAULT_ADMIN_ROLE role', async () => {
      const { depositVaultWithUSTB, owner } = await loadFixture(defaultDeploy);
      await setInstantFeeTest({ vault: depositVaultWithUSTB, owner }, 100);
    });
  });

  describe('setVariabilityTolerance()', () => {
    it('should fail: call from address without DEPOSIT_VAULT_ADMIN_ROLE role', async () => {
      const { depositVaultWithUSTB, regularAccounts, owner } =
        await loadFixture(defaultDeploy);
      await setVariabilityToleranceTest(
        { vault: depositVaultWithUSTB, owner },
        ethers.constants.Zero,
        { revertMessage: acErrors.WMAC_HASNT_ROLE, from: regularAccounts[0] },
      );
    });
    it('should fail: if new value zero', async () => {
      const { depositVaultWithUSTB, owner } = await loadFixture(defaultDeploy);
      await setVariabilityToleranceTest(
        { vault: depositVaultWithUSTB, owner },
        ethers.constants.Zero,
        { revertMessage: 'fee == 0' },
      );
    });

    it('call from address with DEPOSIT_VAULT_ADMIN_ROLE role', async () => {
      const { depositVaultWithUSTB, owner } = await loadFixture(defaultDeploy);
      await setVariabilityToleranceTest(
        { vault: depositVaultWithUSTB, owner },
        100,
      );
    });
  });

  describe('removePaymentToken()', () => {
    it('should fail: call from address without DEPOSIT_VAULT_ADMIN_ROLE role', async () => {
      const { depositVaultWithUSTB, regularAccounts, owner } =
        await loadFixture(defaultDeploy);
      await removePaymentTokenTest(
        { vault: depositVaultWithUSTB, owner },
        ethers.constants.AddressZero,
        { revertMessage: acErrors.WMAC_HASNT_ROLE, from: regularAccounts[0] },
      );
    });

    it('should fail: when token is not exists', async () => {
      const { owner, depositVaultWithUSTB, stableCoins } = await loadFixture(
        defaultDeploy,
      );
      await removePaymentTokenTest(
        { vault: depositVaultWithUSTB, owner },
        stableCoins.dai.address,
        { revertMessage: 'MV: not exists' },
      );
    });

    it('call from address with DEPOSIT_VAULT_ADMIN_ROLE role', async () => {
      const { depositVaultWithUSTB, stableCoins, owner, dataFeed } =
        await loadFixture(defaultDeploy);
      await addPaymentTokenTest(
        { vault: depositVaultWithUSTB, owner },
        stableCoins.dai,
        dataFeed.address,
        0,
        true,
      );
      await removePaymentTokenTest(
        { vault: depositVaultWithUSTB, owner },
        stableCoins.dai.address,
      );
    });

    it('call from address with DEPOSIT_VAULT_ADMIN_ROLE role and add 3 options on a row', async () => {
      const { depositVaultWithUSTB, owner, stableCoins, dataFeed } =
        await loadFixture(defaultDeploy);

      await addPaymentTokenTest(
        { vault: depositVaultWithUSTB, owner },
        stableCoins.dai,
        dataFeed.address,
        0,
        true,
      );
      await addPaymentTokenTest(
        { vault: depositVaultWithUSTB, owner },
        stableCoins.usdc,
        dataFeed.address,
        0,
        true,
      );
      await addPaymentTokenTest(
        { vault: depositVaultWithUSTB, owner },
        stableCoins.usdt,
        dataFeed.address,
        0,
        true,
      );

      await removePaymentTokenTest(
        { vault: depositVaultWithUSTB, owner },
        stableCoins.dai.address,
      );
      await removePaymentTokenTest(
        { vault: depositVaultWithUSTB, owner },
        stableCoins.usdc.address,
      );
      await removePaymentTokenTest(
        { vault: depositVaultWithUSTB, owner },
        stableCoins.usdt.address,
      );

      await removePaymentTokenTest(
        { vault: depositVaultWithUSTB, owner },
        stableCoins.usdt.address,
        { revertMessage: 'MV: not exists' },
      );
    });
  });

  describe('withdrawToken()', () => {
    it('should fail: call from address without DEPOSIT_VAULT_ADMIN_ROLE role', async () => {
      const { depositVaultWithUSTB, regularAccounts, owner } =
        await loadFixture(defaultDeploy);
      await withdrawTest(
        { vault: depositVaultWithUSTB, owner },
        ethers.constants.AddressZero,
        0,
        ethers.constants.AddressZero,
        { revertMessage: acErrors.WMAC_HASNT_ROLE, from: regularAccounts[0] },
      );
    });

    it('should fail: when there is no token in vault', async () => {
      const { owner, depositVaultWithUSTB, regularAccounts, stableCoins } =
        await loadFixture(defaultDeploy);
      await withdrawTest(
        { vault: depositVaultWithUSTB, owner },
        stableCoins.dai,
        1,
        regularAccounts[0],
        { revertMessage: 'ERC20: transfer amount exceeds balance' },
      );
    });

    it('call from address with DEPOSIT_VAULT_ADMIN_ROLE role', async () => {
      const { depositVaultWithUSTB, regularAccounts, stableCoins, owner } =
        await loadFixture(defaultDeploy);
      await mintToken(stableCoins.dai, depositVaultWithUSTB, 1);
      await withdrawTest(
        { vault: depositVaultWithUSTB, owner },
        stableCoins.dai,
        1,
        regularAccounts[0],
      );
    });
  });

  describe('freeFromMinAmount()', async () => {
    it('should fail: call from address without vault admin role', async () => {
      const { depositVaultWithUSTB, regularAccounts } = await loadFixture(
        defaultDeploy,
      );
      await expect(
        depositVaultWithUSTB
          .connect(regularAccounts[0])
          .freeFromMinAmount(regularAccounts[1].address, true),
      ).to.be.revertedWith('WMAC: hasnt role');
    });
    it('should not fail', async () => {
      const { depositVaultWithUSTB, regularAccounts } = await loadFixture(
        defaultDeploy,
      );
      await expect(
        depositVaultWithUSTB.freeFromMinAmount(
          regularAccounts[0].address,
          true,
        ),
      ).to.not.reverted;

      expect(
        await depositVaultWithUSTB.isFreeFromMinAmount(
          regularAccounts[0].address,
        ),
      ).to.eq(true);
    });
    it('should fail: already in list', async () => {
      const { depositVaultWithUSTB, regularAccounts } = await loadFixture(
        defaultDeploy,
      );
      await expect(
        depositVaultWithUSTB.freeFromMinAmount(
          regularAccounts[0].address,
          true,
        ),
      ).to.not.reverted;

      expect(
        await depositVaultWithUSTB.isFreeFromMinAmount(
          regularAccounts[0].address,
        ),
      ).to.eq(true);

      await expect(
        depositVaultWithUSTB.freeFromMinAmount(
          regularAccounts[0].address,
          true,
        ),
      ).to.revertedWith('DV: already free');
    });
  });

  describe('changeTokenAllowance()', () => {
    it('should fail: call from address without DEPOSIT_VAULT_ADMIN_ROLE role', async () => {
      const { depositVaultWithUSTB, regularAccounts, owner } =
        await loadFixture(defaultDeploy);
      await changeTokenAllowanceTest(
        { vault: depositVaultWithUSTB, owner },
        ethers.constants.AddressZero,
        0,
        { revertMessage: acErrors.WMAC_HASNT_ROLE, from: regularAccounts[0] },
      );
    });
    it('should fail: token not exist', async () => {
      const { depositVaultWithUSTB, owner, stableCoins } = await loadFixture(
        defaultDeploy,
      );
      await changeTokenAllowanceTest(
        { vault: depositVaultWithUSTB, owner },
        stableCoins.dai.address,
        0,
        { revertMessage: 'MV: token not exists' },
      );
    });
    it('should fail: allowance zero', async () => {
      const { depositVaultWithUSTB, owner, stableCoins, dataFeed } =
        await loadFixture(defaultDeploy);
      await addPaymentTokenTest(
        { vault: depositVaultWithUSTB, owner },
        stableCoins.dai,
        dataFeed.address,
        0,
        true,
      );
      await changeTokenAllowanceTest(
        { vault: depositVaultWithUSTB, owner },
        stableCoins.dai.address,
        0,
        { revertMessage: 'MV: zero allowance' },
      );
    });
    it('should fail: if mint exceed allowance', async () => {
      const {
        depositVaultWithUSTB,
        stableCoins,
        owner,
        dataFeed,
        mTBILL,
        mTokenToUsdDataFeed,
      } = await loadFixture(defaultDeploy);
      await mintToken(stableCoins.dai, owner, 100000);
      await approveBase18(owner, stableCoins.dai, depositVaultWithUSTB, 100000);
      await addPaymentTokenTest(
        { vault: depositVaultWithUSTB, owner },
        stableCoins.dai,
        dataFeed.address,
        0,
        true,
      );
      await changeTokenAllowanceTest(
        { vault: depositVaultWithUSTB, owner },
        stableCoins.dai.address,
        100,
      );

      await depositInstantTest(
        {
          depositVault: depositVaultWithUSTB,
          owner,
          mTBILL,
          mTokenToUsdDataFeed,
        },
        stableCoins.dai,
        99_999,
        {
          revertMessage: 'MV: exceed allowance',
        },
      );

      await depositRequestTest(
        {
          depositVault: depositVaultWithUSTB,
          owner,
          mTBILL,
          mTokenToUsdDataFeed,
        },
        stableCoins.dai,
        99_999,
        {
          revertMessage: 'MV: exceed allowance',
        },
      );
    });
    it('call from address with DEPOSIT_VAULT_ADMIN_ROLE role', async () => {
      const { depositVaultWithUSTB, owner, stableCoins, dataFeed } =
        await loadFixture(defaultDeploy);
      await addPaymentTokenTest(
        { vault: depositVaultWithUSTB, owner },
        stableCoins.dai,
        dataFeed.address,
        0,
        true,
      );
      await changeTokenAllowanceTest(
        { vault: depositVaultWithUSTB, owner },
        stableCoins.dai.address,
        100000000,
      );
    });
    it('should decrease if allowance < UINT_MAX', async () => {
      const {
        depositVaultWithUSTB,
        stableCoins,
        owner,
        dataFeed,
        mTBILL,
        mTokenToUsdDataFeed,
      } = await loadFixture(defaultDeploy);
      await mintToken(stableCoins.dai, owner, 100000);
      await approveBase18(owner, stableCoins.dai, depositVaultWithUSTB, 100000);
      await addPaymentTokenTest(
        { vault: depositVaultWithUSTB, owner },
        stableCoins.dai,
        dataFeed.address,
        0,
        true,
      );
      await changeTokenAllowanceTest(
        { vault: depositVaultWithUSTB, owner },
        stableCoins.dai.address,
        parseUnits('1000'),
      );

      const tokenConfigBefore = await depositVaultWithUSTB.tokensConfig(
        stableCoins.dai.address,
      );

      await depositInstantTest(
        {
          depositVault: depositVaultWithUSTB,
          owner,
          mTBILL,
          mTokenToUsdDataFeed,
        },
        stableCoins.dai,
        999,
      );

      const tokenConfigAfter = await depositVaultWithUSTB.tokensConfig(
        stableCoins.dai.address,
      );

      expect(tokenConfigBefore.allowance.sub(tokenConfigAfter.allowance)).eq(
        parseUnits('999'),
      );
    });
    it('should not decrease if allowance = UINT_MAX', async () => {
      const {
        depositVaultWithUSTB,
        stableCoins,
        owner,
        dataFeed,
        mTBILL,
        mTokenToUsdDataFeed,
      } = await loadFixture(defaultDeploy);
      await mintToken(stableCoins.dai, owner, 100000);
      await approveBase18(owner, stableCoins.dai, depositVaultWithUSTB, 100000);
      await addPaymentTokenTest(
        { vault: depositVaultWithUSTB, owner },
        stableCoins.dai,
        dataFeed.address,
        0,
        true,
      );
      await changeTokenAllowanceTest(
        { vault: depositVaultWithUSTB, owner },
        stableCoins.dai.address,
        constants.MaxUint256,
      );

      const tokenConfigBefore = await depositVaultWithUSTB.tokensConfig(
        stableCoins.dai.address,
      );

      await depositInstantTest(
        {
          depositVault: depositVaultWithUSTB,
          owner,
          mTBILL,
          mTokenToUsdDataFeed,
        },
        stableCoins.dai,
        999,
      );

      const tokenConfigAfter = await depositVaultWithUSTB.tokensConfig(
        stableCoins.dai.address,
      );

      expect(tokenConfigBefore.allowance).eq(tokenConfigAfter.allowance);
    });
  });

  describe('changeTokenFee()', () => {
    it('should fail: call from address without REDEMPTION_VAULT_ADMIN_ROLE role', async () => {
      const { depositVaultWithUSTB, regularAccounts, owner } =
        await loadFixture(defaultDeploy);
      await changeTokenFeeTest(
        { vault: depositVaultWithUSTB, owner },
        ethers.constants.AddressZero,
        0,
        { revertMessage: acErrors.WMAC_HASNT_ROLE, from: regularAccounts[0] },
      );
    });
    it('should fail: token not exist', async () => {
      const { depositVaultWithUSTB, owner, stableCoins } = await loadFixture(
        defaultDeploy,
      );
      await changeTokenFeeTest(
        { vault: depositVaultWithUSTB, owner },
        stableCoins.dai.address,
        0,
        { revertMessage: 'MV: token not exists' },
      );
    });
    it('should fail: fee > 100%', async () => {
      const { depositVaultWithUSTB, owner, stableCoins, dataFeed } =
        await loadFixture(defaultDeploy);
      await addPaymentTokenTest(
        { vault: depositVaultWithUSTB, owner },
        stableCoins.dai,
        dataFeed.address,
        0,
        true,
      );
      await changeTokenFeeTest(
        { vault: depositVaultWithUSTB, owner },
        stableCoins.dai.address,
        10001,
        { revertMessage: 'fee > 100%' },
      );
    });
    it('call from address with REDEMPTION_VAULT_ADMIN_ROLE role', async () => {
      const { depositVaultWithUSTB, owner, stableCoins, dataFeed } =
        await loadFixture(defaultDeploy);
      await addPaymentTokenTest(
        { vault: depositVaultWithUSTB, owner },
        stableCoins.dai,
        dataFeed.address,
        0,
        true,
      );
      await changeTokenFeeTest(
        { vault: depositVaultWithUSTB, owner },
        stableCoins.dai.address,
        100,
      );
    });
  });

  describe('depositInstant()', async () => {
    it('should fail: when there is no token in vault', async () => {
      const {
        owner,
        depositVaultWithUSTB,
        stableCoins,
        mTBILL,
        mTokenToUsdDataFeed,
      } = await loadFixture(defaultDeploy);

      await depositInstantTest(
        {
          depositVault: depositVaultWithUSTB,
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

    it('should fail: when trying to deposit 0 amount', async () => {
      const {
        owner,
        depositVaultWithUSTB,
        stableCoins,
        mTBILL,
        dataFeed,
        mTokenToUsdDataFeed,
      } = await loadFixture(defaultDeploy);
      await addPaymentTokenTest(
        { vault: depositVaultWithUSTB, owner },
        stableCoins.dai,
        dataFeed.address,
        0,
        true,
      );
      await depositInstantTest(
        {
          depositVault: depositVaultWithUSTB,
          owner,
          mTBILL,
          mTokenToUsdDataFeed,
        },
        stableCoins.dai,
        0,
        {
          revertMessage: 'DV: invalid amount',
        },
      );
    });

    it('should fail: when function paused', async () => {
      const {
        owner,
        depositVaultWithUSTB,
        stableCoins,
        mTBILL,
        dataFeed,
        mTokenToUsdDataFeed,
        regularAccounts,
      } = await loadFixture(defaultDeploy);
      await mintToken(stableCoins.dai, regularAccounts[0], 100);
      await approveBase18(
        regularAccounts[0],
        stableCoins.dai,
        depositVaultWithUSTB,
        100,
      );
      await addPaymentTokenTest(
        { vault: depositVaultWithUSTB, owner },
        stableCoins.dai,
        dataFeed.address,
        0,
        true,
      );
      const selector = encodeFnSelector(
        'depositInstant(address,uint256,uint256,bytes32)',
      );
      await pauseVaultFn(depositVaultWithUSTB, selector);
      await depositInstantTest(
        {
          depositVault: depositVaultWithUSTB,
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

    it('should fail: when rounding is invalid', async () => {
      const {
        owner,
        depositVaultWithUSTB,
        stableCoins,
        mTBILL,
        dataFeed,
        mTokenToUsdDataFeed,
      } = await loadFixture(defaultDeploy);

      await addPaymentTokenTest(
        { vault: depositVaultWithUSTB, owner },
        stableCoins.dai,
        dataFeed.address,
        0,
        true,
      );
      await setMinAmountTest({ vault: depositVaultWithUSTB, owner }, 10);
      await depositInstantTest(
        {
          depositVault: depositVaultWithUSTB,
          owner,
          mTBILL,
          mTokenToUsdDataFeed,
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
        depositVaultWithUSTB,
        stableCoins,
        mTBILL,
        dataFeed,
        mTokenToUsdDataFeed,
      } = await loadFixture(defaultDeploy);

      await mintToken(stableCoins.dai, owner, 100);
      await addPaymentTokenTest(
        { vault: depositVaultWithUSTB, owner },
        stableCoins.dai,
        dataFeed.address,
        0,
        true,
      );
      await setMinAmountTest({ vault: depositVaultWithUSTB, owner }, 10);
      await depositInstantTest(
        {
          depositVault: depositVaultWithUSTB,
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
        depositVaultWithUSTB,
        stableCoins,
        mTBILL,
        dataFeed,
        mTokenToUsdDataFeed,
      } = await loadFixture(defaultDeploy);

      await approveBase18(owner, stableCoins.dai, depositVaultWithUSTB, 100);
      await addPaymentTokenTest(
        { vault: depositVaultWithUSTB, owner },
        stableCoins.dai,
        dataFeed.address,
        0,
        true,
      );
      await setMinAmountTest({ vault: depositVaultWithUSTB, owner }, 10);
      await depositInstantTest(
        {
          depositVault: depositVaultWithUSTB,
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
        depositVaultWithUSTB,
        stableCoins,
        mTBILL,
        dataFeed,
        mockedAggregator,
        mTokenToUsdDataFeed,
      } = await loadFixture(defaultDeploy);

      await approveBase18(owner, stableCoins.dai, depositVaultWithUSTB, 10);
      await addPaymentTokenTest(
        { vault: depositVaultWithUSTB, owner },
        stableCoins.dai,
        dataFeed.address,
        0,
        true,
      );
      await mintToken(stableCoins.dai, owner, 100_000);
      await setRoundData({ mockedAggregator }, 0);
      await depositInstantTest(
        {
          depositVault: depositVaultWithUSTB,
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

    it('should fail: call for amount < minAmountToDepositTest', async () => {
      const {
        depositVaultWithUSTB,
        mockedAggregator,
        owner,
        mTBILL,
        stableCoins,
        dataFeed,
        mTokenToUsdDataFeed,
      } = await loadFixture(defaultDeploy);
      await addPaymentTokenTest(
        { vault: depositVaultWithUSTB, owner },
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
        depositVaultWithUSTB,
        100_000,
      );

      await setMinAmountToDepositTest(
        { depositVault: depositVaultWithUSTB, owner },
        100_000,
      );
      await setInstantDailyLimitTest(
        { vault: depositVaultWithUSTB, owner },
        150_000,
      );

      await depositInstantTest(
        {
          depositVault: depositVaultWithUSTB,
          owner,
          mTBILL,
          mTokenToUsdDataFeed,
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
        depositVaultWithUSTB,
        mockedAggregator,
        owner,
        mTBILL,
        stableCoins,
        dataFeed,
        mTokenToUsdDataFeed,
      } = await loadFixture(defaultDeploy);
      await addPaymentTokenTest(
        { vault: depositVaultWithUSTB, owner },
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
        depositVaultWithUSTB,
        100_000,
      );

      await setMinAmountToDepositTest(
        { depositVault: depositVaultWithUSTB, owner },
        100_000,
      );
      await setInstantDailyLimitTest(
        { vault: depositVaultWithUSTB, owner },
        150_000,
      );

      await depositInstantTest(
        {
          depositVault: depositVaultWithUSTB,
          owner,
          mTBILL,
          mTokenToUsdDataFeed,
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
        depositVaultWithUSTB,
        mockedAggregator,
        owner,
        mTBILL,
        stableCoins,
        dataFeed,
        mTokenToUsdDataFeed,
      } = await loadFixture(defaultDeploy);
      await addPaymentTokenTest(
        { vault: depositVaultWithUSTB, owner },
        stableCoins.dai,
        dataFeed.address,
        0,
        true,
      );
      await setRoundData({ mockedAggregator }, 4);

      await mintToken(stableCoins.dai, owner, 100_000);
      await changeTokenAllowanceTest(
        { vault: depositVaultWithUSTB, owner },
        stableCoins.dai.address,
        100,
      );
      await approveBase18(
        owner,
        stableCoins.dai,
        depositVaultWithUSTB,
        100_000,
      );

      await depositInstantTest(
        {
          depositVault: depositVaultWithUSTB,
          owner,
          mTBILL,
          mTokenToUsdDataFeed,
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
        depositVaultWithUSTB,
        mockedAggregator,
        owner,
        mTBILL,
        stableCoins,
        dataFeed,
        mTokenToUsdDataFeed,
      } = await loadFixture(defaultDeploy);
      await addPaymentTokenTest(
        { vault: depositVaultWithUSTB, owner },
        stableCoins.dai,
        dataFeed.address,
        0,
        true,
      );
      await setRoundData({ mockedAggregator }, 4);

      await mintToken(stableCoins.dai, owner, 100_000);
      await setInstantDailyLimitTest(
        { vault: depositVaultWithUSTB, owner },
        1000,
      );

      await approveBase18(
        owner,
        stableCoins.dai,
        depositVaultWithUSTB,
        100_000,
      );

      await depositInstantTest(
        {
          depositVault: depositVaultWithUSTB,
          owner,
          mTBILL,
          mTokenToUsdDataFeed,
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
        depositVaultWithUSTB,
        mockedAggregator,
        owner,
        mTBILL,
        stableCoins,
        dataFeed,
        mTokenToUsdDataFeed,
      } = await loadFixture(defaultDeploy);
      await addPaymentTokenTest(
        { vault: depositVaultWithUSTB, owner },
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
        depositVaultWithUSTB,
        100_000,
      );

      await depositInstantTest(
        {
          depositVault: depositVaultWithUSTB,
          owner,
          mTBILL,
          mTokenToUsdDataFeed,
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
        depositVaultWithUSTB,
        stableCoins,
        mTBILL,
        dataFeed,
        mTokenToUsdDataFeed,
      } = await loadFixture(defaultDeploy);

      await mintToken(stableCoins.dai, owner, 100);
      await approveBase18(owner, stableCoins.dai, depositVaultWithUSTB, 100);
      await addPaymentTokenTest(
        { vault: depositVaultWithUSTB, owner },
        stableCoins.dai,
        dataFeed.address,
        10000,
        true,
      );
      await depositInstantTest(
        {
          depositVault: depositVaultWithUSTB,
          owner,
          mTBILL,
          mTokenToUsdDataFeed,
        },
        stableCoins.dai,
        100,
        {
          revertMessage: 'DV: mToken amount < min',
        },
      );

      await removePaymentTokenTest(
        { vault: depositVaultWithUSTB, owner },
        stableCoins.dai,
      );
      await addPaymentTokenTest(
        { vault: depositVaultWithUSTB, owner },
        stableCoins.dai,
        dataFeed.address,
        0,
        true,
      );
      await setInstantFeeTest({ vault: depositVaultWithUSTB, owner }, 10000);
      await depositInstantTest(
        {
          depositVault: depositVaultWithUSTB,
          owner,
          mTBILL,
          mTokenToUsdDataFeed,
        },
        stableCoins.dai,
        100,
        { revertMessage: 'DV: mToken amount < min' },
      );
    });

    it('should fail: greenlist enabled and user not in greenlist ', async () => {
      const {
        owner,
        depositVaultWithUSTB,
        stableCoins,
        mTBILL,
        mTokenToUsdDataFeed,
      } = await loadFixture(defaultDeploy);

      await depositVaultWithUSTB.setGreenlistEnable(true);

      await depositInstantTest(
        {
          depositVault: depositVaultWithUSTB,
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
        depositVaultWithUSTB,
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

      await depositInstantTest(
        {
          depositVault: depositVaultWithUSTB,
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
        depositVaultWithUSTB,
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

      await depositInstantTest(
        {
          depositVault: depositVaultWithUSTB,
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

    it('should fail: greenlist enabled and recipient not in greenlist (custom recipient overload)', async () => {
      const {
        owner,
        depositVaultWithUSTB,
        stableCoins,
        mTBILL,
        mTokenToUsdDataFeed,
        greenListableTester,
        accessControl,
        customRecipient,
      } = await loadFixture(defaultDeploy);

      await greenList(
        { greenlistable: greenListableTester, accessControl, owner },
        owner,
      );

      await depositVaultWithUSTB.setGreenlistEnable(true);

      await depositInstantTest(
        {
          depositVault: depositVaultWithUSTB,
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
        depositVaultWithUSTB,
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

      await depositInstantTest(
        {
          depositVault: depositVaultWithUSTB,
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
        depositVaultWithUSTB,
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

      await depositInstantTest(
        {
          depositVault: depositVaultWithUSTB,
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

    it('should fail: when function paused (custom recipient overload)', async () => {
      const {
        owner,
        depositVaultWithUSTB,
        stableCoins,
        mTBILL,
        dataFeed,
        mTokenToUsdDataFeed,
        regularAccounts,
        customRecipient,
      } = await loadFixture(defaultDeploy);
      await mintToken(stableCoins.dai, regularAccounts[0], 100);
      await approveBase18(
        regularAccounts[0],
        stableCoins.dai,
        depositVaultWithUSTB,
        100,
      );
      await addPaymentTokenTest(
        { vault: depositVaultWithUSTB, owner },
        stableCoins.dai,
        dataFeed.address,
        0,
        true,
      );
      const selector = encodeFnSelector(
        'depositInstant(address,uint256,uint256,bytes32,address)',
      );
      await pauseVaultFn(depositVaultWithUSTB, selector);
      await depositInstantTest(
        {
          depositVault: depositVaultWithUSTB,
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

    it('should fail: when ustbDepositsEnabled is true and payment token is not set in USTB contract', async () => {
      const {
        owner,
        depositVaultWithUSTB,
        stableCoins,
        mTBILL,
        mTokenToUsdDataFeed,
        regularAccounts,
        dataFeed,
        ustbToken,
      } = await loadFixture(defaultDeploy);

      await setUstbDepositsEnabledTest(
        {
          depositVaultWithUSTB,
          owner,
        },
        true,
      );

      await mintToken(stableCoins.usdc, regularAccounts[0], 100);
      await approveBase18(
        regularAccounts[0],
        stableCoins.usdc,
        depositVaultWithUSTB,
        100,
      );
      await addPaymentTokenTest(
        { vault: depositVaultWithUSTB, owner },
        stableCoins.usdc,
        dataFeed.address,
        0,
        true,
      );
      await setMinAmountTest({ vault: depositVaultWithUSTB, owner }, 10);

      await depositInstantWithUstbTest(
        {
          depositVaultWithUSTB,
          owner,
          mTBILL,
          mTokenToUsdDataFeed,
          ustbToken,
          expectedUstbDeposited: false,
        },
        stableCoins.usdc,
        100,
        {
          from: regularAccounts[0],
          revertMessage: 'DVU: unsupported USTB token',
        },
      );
    });

    it('should fail: when ustbDepositsEnabled is true and payment token is set in USTB contract but fee is not 0', async () => {
      const {
        owner,
        depositVaultWithUSTB,
        stableCoins,
        mTBILL,
        mTokenToUsdDataFeed,
        regularAccounts,
        dataFeed,
        ustbToken,
      } = await loadFixture(defaultDeploy);

      await setUstbDepositsEnabledTest(
        {
          depositVaultWithUSTB,
          owner,
        },
        true,
      );

      await setMockUstbStablecoinConfig({ ustbToken }, stableCoins.usdc, {
        fee: 100,
        sweepDestination: ustbToken.address,
      });

      await mintToken(stableCoins.usdc, regularAccounts[0], 100);
      await approveBase18(
        regularAccounts[0],
        stableCoins.usdc,
        depositVaultWithUSTB,
        100,
      );
      await addPaymentTokenTest(
        { vault: depositVaultWithUSTB, owner },
        stableCoins.usdc,
        dataFeed.address,
        0,
        true,
      );
      await setMinAmountTest({ vault: depositVaultWithUSTB, owner }, 10);

      await depositInstantWithUstbTest(
        {
          depositVaultWithUSTB,
          owner,
          mTBILL,
          mTokenToUsdDataFeed,
          ustbToken,
          expectedUstbDeposited: false,
        },
        stableCoins.usdc,
        100,
        {
          from: regularAccounts[0],
          revertMessage: 'DVU: USTB fee is not 0',
        },
      );
    });

    it('deposit 100 DAI, greenlist enabled and user in greenlist ', async () => {
      const {
        owner,
        depositVaultWithUSTB,
        stableCoins,
        mTBILL,
        greenListableTester,
        mTokenToUsdDataFeed,
        accessControl,
        regularAccounts,
        dataFeed,
      } = await loadFixture(defaultDeploy);

      await depositVaultWithUSTB.setGreenlistEnable(true);

      await greenList(
        { greenlistable: greenListableTester, accessControl, owner },
        regularAccounts[0],
      );

      await mintToken(stableCoins.dai, regularAccounts[0], 100);
      await approveBase18(
        regularAccounts[0],
        stableCoins.dai,
        depositVaultWithUSTB,
        100,
      );
      await addPaymentTokenTest(
        { vault: depositVaultWithUSTB, owner },
        stableCoins.dai,
        dataFeed.address,
        0,
        true,
      );
      await setMinAmountTest({ vault: depositVaultWithUSTB, owner }, 10);

      await depositInstantTest(
        {
          depositVault: depositVaultWithUSTB,
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

    it('deposit 100 USDC when ustbDepositsEnabled is true', async () => {
      const {
        owner,
        depositVaultWithUSTB,
        stableCoins,
        mTBILL,
        mTokenToUsdDataFeed,
        regularAccounts,
        dataFeed,
        ustbToken,
      } = await loadFixture(defaultDeploy);

      await setUstbDepositsEnabledTest(
        {
          depositVaultWithUSTB,
          owner,
        },
        true,
      );
      await setMockUstbStablecoinConfig({ ustbToken }, stableCoins.usdc);

      await mintToken(stableCoins.usdc, regularAccounts[0], 100);
      await approveBase18(
        regularAccounts[0],
        stableCoins.usdc,
        depositVaultWithUSTB,
        100,
      );
      await addPaymentTokenTest(
        { vault: depositVaultWithUSTB, owner },
        stableCoins.usdc,
        dataFeed.address,
        0,
        true,
      );
      await setMinAmountTest({ vault: depositVaultWithUSTB, owner }, 10);

      await depositInstantWithUstbTest(
        {
          depositVaultWithUSTB,
          owner,
          mTBILL,
          mTokenToUsdDataFeed,
          ustbToken,
        },
        stableCoins.usdc,
        100,
        {
          from: regularAccounts[0],
        },
      );
    });

    it('when ustbDepositsEnabled is false and payment token is not set in USTB contract', async () => {
      const {
        owner,
        depositVaultWithUSTB,
        stableCoins,
        mTBILL,
        mTokenToUsdDataFeed,
        regularAccounts,
        dataFeed,
        ustbToken,
      } = await loadFixture(defaultDeploy);

      await mintToken(stableCoins.usdc, regularAccounts[0], 100);
      await approveBase18(
        regularAccounts[0],
        stableCoins.usdc,
        depositVaultWithUSTB,
        100,
      );
      await addPaymentTokenTest(
        { vault: depositVaultWithUSTB, owner },
        stableCoins.usdc,
        dataFeed.address,
        0,
        true,
      );
      await setMinAmountTest({ vault: depositVaultWithUSTB, owner }, 10);

      await depositInstantWithUstbTest(
        {
          depositVaultWithUSTB,
          owner,
          mTBILL,
          mTokenToUsdDataFeed,
          ustbToken,
        },
        stableCoins.usdc,
        100,
        {
          from: regularAccounts[0],
        },
      );
    });

    it('deposit 100 DAI, greenlist enabled and user in greenlist, tokenIn not stablecoin', async () => {
      const {
        owner,
        depositVaultWithUSTB,
        stableCoins,
        mTBILL,
        greenListableTester,
        mTokenToUsdDataFeed,
        accessControl,
        regularAccounts,
        dataFeed,
      } = await loadFixture(defaultDeploy);

      await depositVaultWithUSTB.setGreenlistEnable(true);

      await greenList(
        { greenlistable: greenListableTester, accessControl, owner },
        regularAccounts[0],
      );

      await mintToken(stableCoins.dai, regularAccounts[0], 100);
      await approveBase18(
        regularAccounts[0],
        stableCoins.dai,
        depositVaultWithUSTB,
        100,
      );
      await addPaymentTokenTest(
        { vault: depositVaultWithUSTB, owner },
        stableCoins.dai,
        dataFeed.address,
        0,
        false,
      );
      await setMinAmountTest({ vault: depositVaultWithUSTB, owner }, 10);

      await depositInstantTest(
        {
          depositVault: depositVaultWithUSTB,
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

    it('deposit 100 DAI, when price of stable is 1.03$ and mToken price is 5$', async () => {
      const {
        owner,
        mockedAggregator,
        mockedAggregatorMToken,
        depositVaultWithUSTB,
        stableCoins,
        mTBILL,
        dataFeed,
        mTokenToUsdDataFeed,
      } = await loadFixture(defaultDeploy);

      await mintToken(stableCoins.dai, owner, 100);
      await approveBase18(owner, stableCoins.dai, depositVaultWithUSTB, 100);
      await addPaymentTokenTest(
        { vault: depositVaultWithUSTB, owner },
        stableCoins.dai,
        dataFeed.address,
        0,
        true,
      );
      await setRoundData({ mockedAggregator }, 1.03);
      await setRoundData({ mockedAggregator: mockedAggregatorMToken }, 5);
      await setMinAmountTest({ vault: depositVaultWithUSTB, owner }, 10);

      await depositInstantTest(
        {
          depositVault: depositVaultWithUSTB,
          owner,
          mTBILL,
          mTokenToUsdDataFeed,
        },
        stableCoins.dai,
        100,
      );
    });

    it('deposit 100 DAI, when price of stable is 1.03$ and mToken price is 5$ and token fee 1%', async () => {
      const {
        owner,
        mockedAggregator,
        mockedAggregatorMToken,
        depositVaultWithUSTB,
        stableCoins,
        mTBILL,
        dataFeed,
        mTokenToUsdDataFeed,
      } = await loadFixture(defaultDeploy);

      await mintToken(stableCoins.dai, owner, 100);
      await approveBase18(owner, stableCoins.dai, depositVaultWithUSTB, 100);
      await addPaymentTokenTest(
        { vault: depositVaultWithUSTB, owner },
        stableCoins.dai,
        dataFeed.address,
        100,
        true,
      );
      await setRoundData({ mockedAggregator }, 1.03);
      await setRoundData({ mockedAggregator: mockedAggregatorMToken }, 5);
      await setMinAmountTest({ vault: depositVaultWithUSTB, owner }, 10);
      await depositInstantTest(
        {
          depositVault: depositVaultWithUSTB,
          owner,
          mTBILL,
          mTokenToUsdDataFeed,
        },
        stableCoins.dai,
        100,
      );
    });

    it('deposit 100 DAI, when price of stable is 1.03$ and mToken price is 5$ without checking of minDepositAmount', async () => {
      const {
        owner,
        mockedAggregator,
        mockedAggregatorMToken,
        depositVaultWithUSTB,
        stableCoins,
        mTBILL,
        dataFeed,
        mTokenToUsdDataFeed,
      } = await loadFixture(defaultDeploy);

      await mintToken(stableCoins.dai, owner, 100);
      await approveBase18(owner, stableCoins.dai, depositVaultWithUSTB, 100);
      await addPaymentTokenTest(
        { vault: depositVaultWithUSTB, owner },
        stableCoins.dai,
        dataFeed.address,
        100,
        true,
      );
      await setRoundData({ mockedAggregator }, 1.03);
      await setRoundData({ mockedAggregator: mockedAggregatorMToken }, 5);
      await depositVaultWithUSTB.freeFromMinAmount(owner.address, true);
      await depositInstantTest(
        {
          depositVault: depositVaultWithUSTB,
          owner,
          mTBILL,
          mTokenToUsdDataFeed,
        },
        stableCoins.dai,
        100,
      );
    });

    it('deposit 100 DAI, when price of stable is 1.03$ and mToken price is 5$ and user in waivedFeeRestriction', async () => {
      const {
        owner,
        mockedAggregator,
        mockedAggregatorMToken,
        depositVaultWithUSTB,
        stableCoins,
        mTBILL,
        dataFeed,
        mTokenToUsdDataFeed,
      } = await loadFixture(defaultDeploy);

      await mintToken(stableCoins.dai, owner, 100);
      await approveBase18(owner, stableCoins.dai, depositVaultWithUSTB, 100);
      await addPaymentTokenTest(
        { vault: depositVaultWithUSTB, owner },
        stableCoins.dai,
        dataFeed.address,
        100,
        true,
      );
      await setRoundData({ mockedAggregator }, 1.03);
      await setRoundData({ mockedAggregator: mockedAggregatorMToken }, 5);
      await addWaivedFeeAccountTest(
        { vault: depositVaultWithUSTB, owner },
        owner.address,
      );
      await setMinAmountTest({ vault: depositVaultWithUSTB, owner }, 10);
      await depositInstantTest(
        {
          depositVault: depositVaultWithUSTB,
          owner,
          mTBILL,
          mTokenToUsdDataFeed,
          waivedFee: true,
        },
        stableCoins.dai,
        100,
      );
    });

    it('deposit 100 DAI (custom recipient overload)', async () => {
      const {
        owner,
        depositVaultWithUSTB,
        stableCoins,
        mTBILL,
        greenListableTester,
        mTokenToUsdDataFeed,
        accessControl,
        regularAccounts,
        dataFeed,
        customRecipient,
      } = await loadFixture(defaultDeploy);

      await mintToken(stableCoins.dai, regularAccounts[0], 100);
      await approveBase18(
        regularAccounts[0],
        stableCoins.dai,
        depositVaultWithUSTB,
        100,
      );
      await addPaymentTokenTest(
        { vault: depositVaultWithUSTB, owner },
        stableCoins.dai,
        dataFeed.address,
        0,
        true,
      );
      await setMinAmountTest({ vault: depositVaultWithUSTB, owner }, 10);

      await depositInstantTest(
        {
          depositVault: depositVaultWithUSTB,
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

    it('deposit 100 DAI when recipient == msg.sender (custom recipient overload)', async () => {
      const {
        owner,
        depositVaultWithUSTB,
        stableCoins,
        mTBILL,
        mTokenToUsdDataFeed,
        regularAccounts,
        dataFeed,
      } = await loadFixture(defaultDeploy);

      await mintToken(stableCoins.dai, regularAccounts[0], 100);
      await approveBase18(
        regularAccounts[0],
        stableCoins.dai,
        depositVaultWithUSTB,
        100,
      );
      await addPaymentTokenTest(
        { vault: depositVaultWithUSTB, owner },
        stableCoins.dai,
        dataFeed.address,
        0,
        true,
      );
      await setMinAmountTest({ vault: depositVaultWithUSTB, owner }, 10);

      await depositInstantTest(
        {
          depositVault: depositVaultWithUSTB,
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

    it('deposit 100 DAI when other overload of depositInstant is paused (custom recipient overload)', async () => {
      const {
        owner,
        depositVaultWithUSTB,
        stableCoins,
        mTBILL,
        mTokenToUsdDataFeed,
        regularAccounts,
        dataFeed,
        customRecipient,
      } = await loadFixture(defaultDeploy);

      await pauseVaultFn(
        depositVaultWithUSTB,
        encodeFnSelector('depositInstant(address,uint256,uint256,bytes32)'),
      );

      await mintToken(stableCoins.dai, regularAccounts[0], 100);
      await approveBase18(
        regularAccounts[0],
        stableCoins.dai,
        depositVaultWithUSTB,
        100,
      );
      await addPaymentTokenTest(
        { vault: depositVaultWithUSTB, owner },
        stableCoins.dai,
        dataFeed.address,
        0,
        true,
      );
      await setMinAmountTest({ vault: depositVaultWithUSTB, owner }, 10);

      await depositInstantTest(
        {
          depositVault: depositVaultWithUSTB,
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

    it('deposit 100 DAI when other overload of depositInstant is paused', async () => {
      const {
        owner,
        depositVaultWithUSTB,
        stableCoins,
        mTBILL,
        mTokenToUsdDataFeed,
        regularAccounts,
        dataFeed,
      } = await loadFixture(defaultDeploy);

      await pauseVaultFn(
        depositVaultWithUSTB,
        encodeFnSelector(
          'depositInstant(address,uint256,uint256,bytes32,address)',
        ),
      );

      await mintToken(stableCoins.dai, regularAccounts[0], 100);
      await approveBase18(
        regularAccounts[0],
        stableCoins.dai,
        depositVaultWithUSTB,
        100,
      );
      await addPaymentTokenTest(
        { vault: depositVaultWithUSTB, owner },
        stableCoins.dai,
        dataFeed.address,
        0,
        true,
      );
      await setMinAmountTest({ vault: depositVaultWithUSTB, owner }, 10);

      await depositInstantTest(
        {
          depositVault: depositVaultWithUSTB,
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

  describe('depositRequest()', async () => {
    it('should fail: when there is no token in vault', async () => {
      const {
        owner,
        depositVaultWithUSTB,
        stableCoins,
        mTBILL,
        mTokenToUsdDataFeed,
      } = await loadFixture(defaultDeploy);

      await depositRequestTest(
        {
          depositVault: depositVaultWithUSTB,
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

    it('should fail: when trying to deposit 0 amount', async () => {
      const {
        owner,
        depositVaultWithUSTB,
        stableCoins,
        mTBILL,
        dataFeed,
        mTokenToUsdDataFeed,
      } = await loadFixture(defaultDeploy);
      await addPaymentTokenTest(
        { vault: depositVaultWithUSTB, owner },
        stableCoins.dai,
        dataFeed.address,
        0,
        true,
      );
      await depositRequestTest(
        {
          depositVault: depositVaultWithUSTB,
          owner,
          mTBILL,
          mTokenToUsdDataFeed,
        },
        stableCoins.dai,
        0,
        {
          revertMessage: 'DV: invalid amount',
        },
      );
    });

    it('should fail: when function paused', async () => {
      const {
        owner,
        depositVaultWithUSTB,
        stableCoins,
        mTBILL,
        dataFeed,
        mTokenToUsdDataFeed,
        regularAccounts,
      } = await loadFixture(defaultDeploy);
      await mintToken(stableCoins.dai, regularAccounts[0], 100);
      await approveBase18(
        regularAccounts[0],
        stableCoins.dai,
        depositVaultWithUSTB,
        100,
      );
      await addPaymentTokenTest(
        { vault: depositVaultWithUSTB, owner },
        stableCoins.dai,
        dataFeed.address,
        0,
        true,
      );
      const selector = encodeFnSelector(
        'depositRequest(address,uint256,bytes32)',
      );
      await pauseVaultFn(depositVaultWithUSTB, selector);
      await depositRequestTest(
        {
          depositVault: depositVaultWithUSTB,
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

    it('should fail: when function paused (custom recipient overload)', async () => {
      const {
        owner,
        depositVaultWithUSTB,
        stableCoins,
        mTBILL,
        dataFeed,
        mTokenToUsdDataFeed,
        regularAccounts,
        customRecipient,
      } = await loadFixture(defaultDeploy);
      await mintToken(stableCoins.dai, regularAccounts[0], 100);
      await approveBase18(
        regularAccounts[0],
        stableCoins.dai,
        depositVaultWithUSTB,
        100,
      );
      await addPaymentTokenTest(
        { vault: depositVaultWithUSTB, owner },
        stableCoins.dai,
        dataFeed.address,
        0,
        true,
      );
      const selector = encodeFnSelector(
        'depositRequest(address,uint256,bytes32,address)',
      );
      await pauseVaultFn(depositVaultWithUSTB, selector);
      await depositRequestTest(
        {
          depositVault: depositVaultWithUSTB,
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

    it('should fail: when rounding is invalid', async () => {
      const {
        owner,
        depositVaultWithUSTB,
        stableCoins,
        mTBILL,
        dataFeed,
        mTokenToUsdDataFeed,
      } = await loadFixture(defaultDeploy);

      await addPaymentTokenTest(
        { vault: depositVaultWithUSTB, owner },
        stableCoins.dai,
        dataFeed.address,
        0,
        true,
      );
      await setMinAmountTest({ vault: depositVaultWithUSTB, owner }, 10);
      await depositRequestTest(
        {
          depositVault: depositVaultWithUSTB,
          owner,
          mTBILL,
          mTokenToUsdDataFeed,
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
        depositVaultWithUSTB,
        stableCoins,
        mTBILL,
        dataFeed,
        mTokenToUsdDataFeed,
      } = await loadFixture(defaultDeploy);

      await mintToken(stableCoins.dai, owner, 100);
      await addPaymentTokenTest(
        { vault: depositVaultWithUSTB, owner },
        stableCoins.dai,
        dataFeed.address,
        0,
        true,
      );
      await setMinAmountTest({ vault: depositVaultWithUSTB, owner }, 10);
      await depositRequestTest(
        {
          depositVault: depositVaultWithUSTB,
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
        depositVaultWithUSTB,
        stableCoins,
        mTBILL,
        dataFeed,
        mTokenToUsdDataFeed,
      } = await loadFixture(defaultDeploy);

      await approveBase18(owner, stableCoins.dai, depositVaultWithUSTB, 100);
      await addPaymentTokenTest(
        { vault: depositVaultWithUSTB, owner },
        stableCoins.dai,
        dataFeed.address,
        0,
        true,
      );
      await setMinAmountTest({ vault: depositVaultWithUSTB, owner }, 10);
      await depositRequestTest(
        {
          depositVault: depositVaultWithUSTB,
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
        depositVaultWithUSTB,
        stableCoins,
        mTBILL,
        dataFeed,
        mockedAggregator,
        mTokenToUsdDataFeed,
      } = await loadFixture(defaultDeploy);

      await approveBase18(owner, stableCoins.dai, depositVaultWithUSTB, 10);
      await addPaymentTokenTest(
        { vault: depositVaultWithUSTB, owner },
        stableCoins.dai,
        dataFeed.address,
        0,
        true,
      );
      await mintToken(stableCoins.dai, owner, 100_000);
      await setRoundData({ mockedAggregator }, 0);
      await depositRequestTest(
        {
          depositVault: depositVaultWithUSTB,
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

    it('should fail: call for amount < minAmountToDepositTest', async () => {
      const {
        depositVaultWithUSTB,
        mockedAggregator,
        owner,
        mTBILL,
        stableCoins,
        dataFeed,
        mTokenToUsdDataFeed,
      } = await loadFixture(defaultDeploy);
      await addPaymentTokenTest(
        { vault: depositVaultWithUSTB, owner },
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
        depositVaultWithUSTB,
        100_000,
      );

      await setMinAmountToDepositTest(
        { depositVault: depositVaultWithUSTB, owner },
        100_000,
      );

      await depositRequestTest(
        {
          depositVault: depositVaultWithUSTB,
          owner,
          mTBILL,
          mTokenToUsdDataFeed,
        },
        stableCoins.dai,
        99_999,
        {
          revertMessage: 'DV: mint amount < min',
        },
      );
    });

    it('should fail: if exceed allowance of deposit for token', async () => {
      const {
        depositVaultWithUSTB,
        mockedAggregator,
        owner,
        mTBILL,
        stableCoins,
        dataFeed,
        mTokenToUsdDataFeed,
      } = await loadFixture(defaultDeploy);
      await addPaymentTokenTest(
        { vault: depositVaultWithUSTB, owner },
        stableCoins.dai,
        dataFeed.address,
        0,
        true,
      );
      await setRoundData({ mockedAggregator }, 4);

      await mintToken(stableCoins.dai, owner, 100_000);
      await changeTokenAllowanceTest(
        { vault: depositVaultWithUSTB, owner },
        stableCoins.dai.address,
        100,
      );
      await approveBase18(
        owner,
        stableCoins.dai,
        depositVaultWithUSTB,
        100_000,
      );

      await depositRequestTest(
        {
          depositVault: depositVaultWithUSTB,
          owner,
          mTBILL,
          mTokenToUsdDataFeed,
        },
        stableCoins.dai,
        99_999,
        {
          revertMessage: 'MV: exceed allowance',
        },
      );
    });

    it('should fail: if token fee = 100%', async () => {
      const {
        owner,
        depositVaultWithUSTB,
        stableCoins,
        mTBILL,
        dataFeed,
        mTokenToUsdDataFeed,
      } = await loadFixture(defaultDeploy);

      await mintToken(stableCoins.dai, owner, 100);
      await approveBase18(owner, stableCoins.dai, depositVaultWithUSTB, 100);
      await addPaymentTokenTest(
        { vault: depositVaultWithUSTB, owner },
        stableCoins.dai,
        dataFeed.address,
        10000,
        true,
      );
      await depositRequestTest(
        {
          depositVault: depositVaultWithUSTB,
          owner,
          mTBILL,
          mTokenToUsdDataFeed,
        },
        stableCoins.dai,
        100,
        {
          revertMessage: 'DV: mToken amount < min',
        },
      );
    });

    it('should fail: greenlist enabled and user not in greenlist ', async () => {
      const {
        owner,
        depositVaultWithUSTB,
        stableCoins,
        mTBILL,
        mTokenToUsdDataFeed,
      } = await loadFixture(defaultDeploy);

      await depositVaultWithUSTB.setGreenlistEnable(true);

      await depositRequestTest(
        {
          depositVault: depositVaultWithUSTB,
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
        depositVaultWithUSTB,
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

      await depositRequestTest(
        {
          depositVault: depositVaultWithUSTB,
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

    it('should fail: user in sanctionlist ', async () => {
      const {
        owner,
        depositVaultWithUSTB,
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

      await depositRequestTest(
        {
          depositVault: depositVaultWithUSTB,
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

    it('should fail: greenlist enabled and recipient not in greenlist (custom recipient overload)', async () => {
      const {
        owner,
        depositVaultWithUSTB,
        stableCoins,
        mTBILL,
        mTokenToUsdDataFeed,
        greenListableTester,
        accessControl,
        customRecipient,
      } = await loadFixture(defaultDeploy);

      await depositVaultWithUSTB.setGreenlistEnable(true);

      await greenList(
        { greenlistable: greenListableTester, accessControl, owner },
        owner,
      );
      await depositRequestTest(
        {
          depositVault: depositVaultWithUSTB,
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
        depositVaultWithUSTB,
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

      await depositRequestTest(
        {
          depositVault: depositVaultWithUSTB,
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

    it('should fail: recipient in sanctionlist (custom recipient overload)', async () => {
      const {
        owner,
        depositVaultWithUSTB,
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

      await depositRequestTest(
        {
          depositVault: depositVaultWithUSTB,
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

    it('deposit 100 DAI, greenlist enabled and user in greenlist ', async () => {
      const {
        owner,
        depositVaultWithUSTB,
        stableCoins,
        mTBILL,
        greenListableTester,
        mTokenToUsdDataFeed,
        accessControl,
        regularAccounts,
        dataFeed,
      } = await loadFixture(defaultDeploy);

      await greenListEnable(
        { greenlistable: greenListableTester, owner },
        true,
      );

      await greenList(
        { greenlistable: greenListableTester, accessControl, owner },
        regularAccounts[0],
      );

      await mintToken(stableCoins.dai, regularAccounts[0], 100);
      await approveBase18(
        regularAccounts[0],
        stableCoins.dai,
        depositVaultWithUSTB,
        100,
      );
      await addPaymentTokenTest(
        { vault: depositVaultWithUSTB, owner },
        stableCoins.dai,
        dataFeed.address,
        0,
        true,
      );
      await setMinAmountTest({ vault: depositVaultWithUSTB, owner }, 10);

      await depositRequestTest(
        {
          depositVault: depositVaultWithUSTB,
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

    it('deposit request with 100 DAI, when price of stable is 1.03$ and mToken price is 5$', async () => {
      const {
        owner,
        mockedAggregator,
        mockedAggregatorMToken,
        depositVaultWithUSTB,
        stableCoins,
        mTBILL,
        dataFeed,
        mTokenToUsdDataFeed,
      } = await loadFixture(defaultDeploy);

      await mintToken(stableCoins.dai, owner, 100);
      await approveBase18(owner, stableCoins.dai, depositVaultWithUSTB, 100);
      await addPaymentTokenTest(
        { vault: depositVaultWithUSTB, owner },
        stableCoins.dai,
        dataFeed.address,
        0,
        true,
      );
      await setMinAmountTest({ vault: depositVaultWithUSTB, owner }, 10);
      await setRoundData({ mockedAggregator }, 1.03);
      await setRoundData({ mockedAggregator: mockedAggregatorMToken }, 5);

      await depositRequestTest(
        {
          depositVault: depositVaultWithUSTB,
          owner,
          mTBILL,
          mTokenToUsdDataFeed,
        },
        stableCoins.dai,
        100,
      );
    });

    it('deposit request with 100 DAI, when price of stable is 1.03$ and mToken price is 5$ and token fee 1%', async () => {
      const {
        owner,
        mockedAggregator,
        mockedAggregatorMToken,
        depositVaultWithUSTB,
        stableCoins,
        mTBILL,
        dataFeed,
        mTokenToUsdDataFeed,
      } = await loadFixture(defaultDeploy);

      await mintToken(stableCoins.dai, owner, 100);
      await approveBase18(owner, stableCoins.dai, depositVaultWithUSTB, 100);
      await addPaymentTokenTest(
        { vault: depositVaultWithUSTB, owner },
        stableCoins.dai,
        dataFeed.address,
        100,
        true,
      );
      await setMinAmountTest({ vault: depositVaultWithUSTB, owner }, 10);
      await setRoundData({ mockedAggregator }, 1.03);
      await setRoundData({ mockedAggregator: mockedAggregatorMToken }, 5);
      await depositRequestTest(
        {
          depositVault: depositVaultWithUSTB,
          owner,
          mTBILL,
          mTokenToUsdDataFeed,
        },
        stableCoins.dai,
        100,
      );
    });

    it('deposit request with 100 DAI, when price of stable is 1.03$ and mToken price is 5$ without checking of minDepositAmount', async () => {
      const {
        owner,
        mockedAggregator,
        mockedAggregatorMToken,
        depositVaultWithUSTB,
        stableCoins,
        mTBILL,
        dataFeed,
        mTokenToUsdDataFeed,
      } = await loadFixture(defaultDeploy);

      await mintToken(stableCoins.dai, owner, 100);
      await approveBase18(owner, stableCoins.dai, depositVaultWithUSTB, 100);
      await addPaymentTokenTest(
        { vault: depositVaultWithUSTB, owner },
        stableCoins.dai,
        dataFeed.address,
        100,
        true,
      );
      await setRoundData({ mockedAggregator }, 1.03);
      await setRoundData({ mockedAggregator: mockedAggregatorMToken }, 5);
      await depositVaultWithUSTB.freeFromMinAmount(owner.address, true);
      await depositRequestTest(
        {
          depositVault: depositVaultWithUSTB,
          owner,
          mTBILL,
          mTokenToUsdDataFeed,
        },
        stableCoins.dai,
        100,
      );
    });

    it('deposit request with 100 DAI, when price of stable is 1.03$ and mToken price is 5$ and user in waivedFeeRestriction', async () => {
      const {
        owner,
        mockedAggregator,
        mockedAggregatorMToken,
        depositVaultWithUSTB,
        stableCoins,
        mTBILL,
        dataFeed,
        mTokenToUsdDataFeed,
      } = await loadFixture(defaultDeploy);

      await mintToken(stableCoins.dai, owner, 100);
      await approveBase18(owner, stableCoins.dai, depositVaultWithUSTB, 100);
      await addPaymentTokenTest(
        { vault: depositVaultWithUSTB, owner },
        stableCoins.dai,
        dataFeed.address,
        100,
        true,
      );
      await setMinAmountTest({ vault: depositVaultWithUSTB, owner }, 10);
      await setRoundData({ mockedAggregator }, 1.03);
      await setRoundData({ mockedAggregator: mockedAggregatorMToken }, 5);
      await addWaivedFeeAccountTest(
        { vault: depositVaultWithUSTB, owner },
        owner.address,
      );
      await depositRequestTest(
        {
          depositVault: depositVaultWithUSTB,
          owner,
          mTBILL,
          mTokenToUsdDataFeed,
          waivedFee: true,
        },
        stableCoins.dai,
        100,
      );
    });

    it('deposit 100 (custom recipient overload)', async () => {
      const {
        owner,
        depositVaultWithUSTB,
        stableCoins,
        mTBILL,
        mTokenToUsdDataFeed,
        regularAccounts,
        dataFeed,
        customRecipient,
      } = await loadFixture(defaultDeploy);

      await mintToken(stableCoins.dai, regularAccounts[0], 100);
      await approveBase18(
        regularAccounts[0],
        stableCoins.dai,
        depositVaultWithUSTB,
        100,
      );
      await addPaymentTokenTest(
        { vault: depositVaultWithUSTB, owner },
        stableCoins.dai,
        dataFeed.address,
        0,
        true,
      );
      await setMinAmountTest({ vault: depositVaultWithUSTB, owner }, 10);

      await depositRequestTest(
        {
          depositVault: depositVaultWithUSTB,
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

    it('deposit 100 when recipient == msg.sender (custom recipient overload)', async () => {
      const {
        owner,
        depositVaultWithUSTB,
        stableCoins,
        mTBILL,
        mTokenToUsdDataFeed,
        regularAccounts,
        dataFeed,
      } = await loadFixture(defaultDeploy);

      await mintToken(stableCoins.dai, regularAccounts[0], 100);
      await approveBase18(
        regularAccounts[0],
        stableCoins.dai,
        depositVaultWithUSTB,
        100,
      );
      await addPaymentTokenTest(
        { vault: depositVaultWithUSTB, owner },
        stableCoins.dai,
        dataFeed.address,
        0,
        true,
      );
      await setMinAmountTest({ vault: depositVaultWithUSTB, owner }, 10);

      await depositRequestTest(
        {
          depositVault: depositVaultWithUSTB,
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

    it('deposit 100 DAI when other overload of depositRequest is paused (custom recipient overload)', async () => {
      const {
        owner,
        depositVaultWithUSTB,
        stableCoins,
        mTBILL,
        mTokenToUsdDataFeed,
        regularAccounts,
        dataFeed,
        customRecipient,
      } = await loadFixture(defaultDeploy);

      await pauseVaultFn(
        depositVaultWithUSTB,
        encodeFnSelector('depositRequest(address,uint256,bytes32)'),
      );

      await mintToken(stableCoins.dai, regularAccounts[0], 100);
      await approveBase18(
        regularAccounts[0],
        stableCoins.dai,
        depositVaultWithUSTB,
        100,
      );
      await addPaymentTokenTest(
        { vault: depositVaultWithUSTB, owner },
        stableCoins.dai,
        dataFeed.address,
        0,
        true,
      );
      await setMinAmountTest({ vault: depositVaultWithUSTB, owner }, 10);

      await depositRequestTest(
        {
          depositVault: depositVaultWithUSTB,
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

    it('deposit 100 DAI when other overload of depositRequest is paused', async () => {
      const {
        owner,
        depositVaultWithUSTB,
        stableCoins,
        mTBILL,
        mTokenToUsdDataFeed,
        regularAccounts,
        dataFeed,
      } = await loadFixture(defaultDeploy);

      await pauseVaultFn(
        depositVaultWithUSTB,
        encodeFnSelector('depositRequest(address,uint256,bytes32,address)'),
      );

      await mintToken(stableCoins.dai, regularAccounts[0], 100);
      await approveBase18(
        regularAccounts[0],
        stableCoins.dai,
        depositVaultWithUSTB,
        100,
      );
      await addPaymentTokenTest(
        { vault: depositVaultWithUSTB, owner },
        stableCoins.dai,
        dataFeed.address,
        0,
        true,
      );
      await setMinAmountTest({ vault: depositVaultWithUSTB, owner }, 10);

      await depositRequestTest(
        {
          depositVault: depositVaultWithUSTB,
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

  describe('approveRequest()', async () => {
    it('should fail: call from address without vault admin role', async () => {
      const {
        depositVaultWithUSTB,
        regularAccounts,
        mTokenToUsdDataFeed,
        mTBILL,
      } = await loadFixture(defaultDeploy);
      await approveRequestTest(
        {
          depositVault: depositVaultWithUSTB,
          owner: regularAccounts[1],
          mTBILL,
          mTokenToUsdDataFeed,
        },
        1,
        parseUnits('5'),
        {
          revertMessage: 'WMAC: hasnt role',
        },
      );
    });

    it('should fail: request by id not exist', async () => {
      const {
        owner,
        depositVaultWithUSTB,
        stableCoins,
        mTBILL,
        dataFeed,
        mTokenToUsdDataFeed,
      } = await loadFixture(defaultDeploy);
      await addPaymentTokenTest(
        { vault: depositVaultWithUSTB, owner },
        stableCoins.dai,
        dataFeed.address,
        0,
        true,
      );
      await approveRequestTest(
        {
          depositVault: depositVaultWithUSTB,
          owner,
          mTBILL,
          mTokenToUsdDataFeed,
        },
        1,
        parseUnits('5'),
        {
          revertMessage: 'DV: request not exist',
        },
      );
    });

    it('should fail: request already precessed', async () => {
      const {
        owner,
        mockedAggregator,
        mockedAggregatorMToken,
        depositVaultWithUSTB,
        stableCoins,
        mTBILL,
        dataFeed,
        mTokenToUsdDataFeed,
      } = await loadFixture(defaultDeploy);

      await mintToken(stableCoins.dai, owner, 100);
      await approveBase18(owner, stableCoins.dai, depositVaultWithUSTB, 100);
      await addPaymentTokenTest(
        { vault: depositVaultWithUSTB, owner },
        stableCoins.dai,
        dataFeed.address,
        0,
        true,
      );
      await setRoundData({ mockedAggregator }, 1.03);
      await setRoundData({ mockedAggregator: mockedAggregatorMToken }, 5);
      await setMinAmountTest({ vault: depositVaultWithUSTB, owner }, 10);

      await depositRequestTest(
        {
          depositVault: depositVaultWithUSTB,
          owner,
          mTBILL,
          mTokenToUsdDataFeed,
        },
        stableCoins.dai,
        100,
      );
      const requestId = 0;

      await approveRequestTest(
        {
          depositVault: depositVaultWithUSTB,
          owner,
          mTBILL,
          mTokenToUsdDataFeed,
        },
        requestId,
        parseUnits('5'),
      );
      await approveRequestTest(
        {
          depositVault: depositVaultWithUSTB,
          owner,
          mTBILL,
          mTokenToUsdDataFeed,
        },
        requestId,
        parseUnits('5'),
        { revertMessage: 'DV: request not pending' },
      );
    });

    it('approve request from vaut admin account', async () => {
      const {
        owner,
        mockedAggregator,
        mockedAggregatorMToken,
        depositVaultWithUSTB,
        stableCoins,
        mTBILL,
        dataFeed,
        mTokenToUsdDataFeed,
      } = await loadFixture(defaultDeploy);

      await mintToken(stableCoins.dai, owner, 100);
      await approveBase18(owner, stableCoins.dai, depositVaultWithUSTB, 100);
      await addPaymentTokenTest(
        { vault: depositVaultWithUSTB, owner },
        stableCoins.dai,
        dataFeed.address,
        0,
        true,
      );
      await setRoundData({ mockedAggregator }, 1.03);
      await setRoundData({ mockedAggregator: mockedAggregatorMToken }, 5);
      await setMinAmountTest({ vault: depositVaultWithUSTB, owner }, 10);

      await depositRequestTest(
        {
          depositVault: depositVaultWithUSTB,
          owner,
          mTBILL,
          mTokenToUsdDataFeed,
        },
        stableCoins.dai,
        100,
      );
      const requestId = 0;

      await approveRequestTest(
        {
          depositVault: depositVaultWithUSTB,
          owner,
          mTBILL,
          mTokenToUsdDataFeed,
        },
        requestId,
        parseUnits('5'),
      );
    });
  });

  describe('safeApproveRequest()', async () => {
    it('should fail: call from address without vault admin role', async () => {
      const {
        depositVaultWithUSTB,
        regularAccounts,
        mTokenToUsdDataFeed,
        mTBILL,
      } = await loadFixture(defaultDeploy);
      await safeApproveRequestTest(
        {
          depositVault: depositVaultWithUSTB,
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
        depositVaultWithUSTB,
        stableCoins,
        mTBILL,
        dataFeed,
        mTokenToUsdDataFeed,
      } = await loadFixture(defaultDeploy);
      await addPaymentTokenTest(
        { vault: depositVaultWithUSTB, owner },
        stableCoins.dai,
        dataFeed.address,
        0,
        true,
      );
      await safeApproveRequestTest(
        {
          depositVault: depositVaultWithUSTB,
          owner,
          mTBILL,
          mTokenToUsdDataFeed,
        },
        1,
        parseUnits('1'),
        {
          revertMessage: 'DV: request not exist',
        },
      );
    });

    it('should fail: if new rate greater then variabilityTolerance', async () => {
      const {
        owner,
        depositVaultWithUSTB,
        stableCoins,
        mTBILL,
        dataFeed,
        mTokenToUsdDataFeed,
        mockedAggregator,
        mockedAggregatorMToken,
      } = await loadFixture(defaultDeploy);
      await mintToken(stableCoins.dai, owner, 100);
      await approveBase18(owner, stableCoins.dai, depositVaultWithUSTB, 100);
      await addPaymentTokenTest(
        { vault: depositVaultWithUSTB, owner },
        stableCoins.dai,
        dataFeed.address,
        0,
        true,
      );
      await setRoundData({ mockedAggregator }, 1.03);
      await setRoundData({ mockedAggregator: mockedAggregatorMToken }, 5);
      await setMinAmountTest({ vault: depositVaultWithUSTB, owner }, 10);

      await depositRequestTest(
        {
          depositVault: depositVaultWithUSTB,
          owner,
          mTBILL,
          mTokenToUsdDataFeed,
        },
        stableCoins.dai,
        100,
      );
      const requestId = 0;
      await safeApproveRequestTest(
        {
          depositVault: depositVaultWithUSTB,
          owner,
          mTBILL,
          mTokenToUsdDataFeed,
        },
        requestId,
        parseUnits('6'),
        {
          revertMessage: 'MV: exceed price diviation',
        },
      );
    });

    it('should fail: if new rate lower then variabilityTolerance', async () => {
      const {
        owner,
        depositVaultWithUSTB,
        stableCoins,
        mTBILL,
        dataFeed,
        mTokenToUsdDataFeed,
        mockedAggregator,
        mockedAggregatorMToken,
      } = await loadFixture(defaultDeploy);
      await mintToken(stableCoins.dai, owner, 100);
      await approveBase18(owner, stableCoins.dai, depositVaultWithUSTB, 100);
      await addPaymentTokenTest(
        { vault: depositVaultWithUSTB, owner },
        stableCoins.dai,
        dataFeed.address,
        0,
        true,
      );
      await setRoundData({ mockedAggregator }, 1.03);
      await setRoundData({ mockedAggregator: mockedAggregatorMToken }, 5);
      await setMinAmountTest({ vault: depositVaultWithUSTB, owner }, 10);

      await depositRequestTest(
        {
          depositVault: depositVaultWithUSTB,
          owner,
          mTBILL,
          mTokenToUsdDataFeed,
        },
        stableCoins.dai,
        100,
      );
      const requestId = 0;
      await safeApproveRequestTest(
        {
          depositVault: depositVaultWithUSTB,
          owner,
          mTBILL,
          mTokenToUsdDataFeed,
        },
        requestId,
        parseUnits('4'),
        {
          revertMessage: 'MV: exceed price diviation',
        },
      );
    });

    it('should fail: request already precessed', async () => {
      const {
        owner,
        mockedAggregator,
        mockedAggregatorMToken,
        depositVaultWithUSTB,
        stableCoins,
        mTBILL,
        dataFeed,
        mTokenToUsdDataFeed,
      } = await loadFixture(defaultDeploy);

      await mintToken(stableCoins.dai, owner, 100);
      await approveBase18(owner, stableCoins.dai, depositVaultWithUSTB, 100);
      await addPaymentTokenTest(
        { vault: depositVaultWithUSTB, owner },
        stableCoins.dai,
        dataFeed.address,
        0,
        true,
      );
      await setRoundData({ mockedAggregator }, 1.03);
      await setRoundData({ mockedAggregator: mockedAggregatorMToken }, 5);
      await setMinAmountTest({ vault: depositVaultWithUSTB, owner }, 10);

      await depositRequestTest(
        {
          depositVault: depositVaultWithUSTB,
          owner,
          mTBILL,
          mTokenToUsdDataFeed,
        },
        stableCoins.dai,
        100,
      );
      const requestId = 0;

      await safeApproveRequestTest(
        {
          depositVault: depositVaultWithUSTB,
          owner,
          mTBILL,
          mTokenToUsdDataFeed,
        },
        requestId,
        parseUnits('5.000001'),
      );
      await safeApproveRequestTest(
        {
          depositVault: depositVaultWithUSTB,
          owner,
          mTBILL,
          mTokenToUsdDataFeed,
        },
        requestId,
        parseUnits('5.000001'),
        { revertMessage: 'DV: request not pending' },
      );
    });

    it('approve request from vaut admin account', async () => {
      const {
        owner,
        mockedAggregator,
        mockedAggregatorMToken,
        depositVaultWithUSTB,
        stableCoins,
        mTBILL,
        dataFeed,
        mTokenToUsdDataFeed,
      } = await loadFixture(defaultDeploy);

      await mintToken(stableCoins.dai, owner, 100);
      await approveBase18(owner, stableCoins.dai, depositVaultWithUSTB, 100);
      await addPaymentTokenTest(
        { vault: depositVaultWithUSTB, owner },
        stableCoins.dai,
        dataFeed.address,
        0,
        true,
      );
      await setRoundData({ mockedAggregator }, 1.03);
      await setRoundData({ mockedAggregator: mockedAggregatorMToken }, 5);
      await setMinAmountTest({ vault: depositVaultWithUSTB, owner }, 10);

      await depositRequestTest(
        {
          depositVault: depositVaultWithUSTB,
          owner,
          mTBILL,
          mTokenToUsdDataFeed,
        },
        stableCoins.dai,
        100,
      );
      const requestId = 0;

      await safeApproveRequestTest(
        {
          depositVault: depositVaultWithUSTB,
          owner,
          mTBILL,
          mTokenToUsdDataFeed,
        },
        requestId,
        parseUnits('5.000000001'),
      );
    });
  });

  describe('safeBulkApproveRequest() (custom price overload)', async () => {
    it('should fail: call from address without vault admin role', async () => {
      const {
        depositVaultWithUSTB,
        regularAccounts,
        mTokenToUsdDataFeed,
        mTBILL,
      } = await loadFixture(defaultDeploy);
      await safeBulkApproveRequestTest(
        {
          depositVault: depositVaultWithUSTB,
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
        depositVaultWithUSTB,
        stableCoins,
        mTBILL,
        dataFeed,
        mTokenToUsdDataFeed,
      } = await loadFixture(defaultDeploy);
      await addPaymentTokenTest(
        { vault: depositVaultWithUSTB, owner },
        stableCoins.dai,
        dataFeed.address,
        0,
        true,
      );
      await safeBulkApproveRequestTest(
        {
          depositVault: depositVaultWithUSTB,
          owner,
          mTBILL,
          mTokenToUsdDataFeed,
        },
        [{ id: 1 }],
        parseUnits('1'),
        {
          revertMessage: 'DV: request not exist',
        },
      );
    });

    it('should fail: if new rate greater then variabilityTolerance', async () => {
      const {
        owner,
        depositVaultWithUSTB,
        stableCoins,
        mTBILL,
        dataFeed,
        mTokenToUsdDataFeed,
        mockedAggregator,
        mockedAggregatorMToken,
      } = await loadFixture(defaultDeploy);
      await mintToken(stableCoins.dai, owner, 100);
      await approveBase18(owner, stableCoins.dai, depositVaultWithUSTB, 100);
      await addPaymentTokenTest(
        { vault: depositVaultWithUSTB, owner },
        stableCoins.dai,
        dataFeed.address,
        0,
        true,
      );
      await setRoundData({ mockedAggregator }, 1.03);
      await setRoundData({ mockedAggregator: mockedAggregatorMToken }, 5);
      await setMinAmountTest({ vault: depositVaultWithUSTB, owner }, 10);

      await depositRequestTest(
        {
          depositVault: depositVaultWithUSTB,
          owner,
          mTBILL,
          mTokenToUsdDataFeed,
        },
        stableCoins.dai,
        100,
      );
      const requestId = 0;
      await safeBulkApproveRequestTest(
        {
          depositVault: depositVaultWithUSTB,
          owner,
          mTBILL,
          mTokenToUsdDataFeed,
        },
        [{ id: requestId }],
        parseUnits('6'),
        {
          revertMessage: 'MV: exceed price diviation',
        },
      );
    });

    it('should fail: if new rate lower then variabilityTolerance', async () => {
      const {
        owner,
        depositVaultWithUSTB,
        stableCoins,
        mTBILL,
        dataFeed,
        mTokenToUsdDataFeed,
        mockedAggregator,
        mockedAggregatorMToken,
      } = await loadFixture(defaultDeploy);
      await mintToken(stableCoins.dai, owner, 100);
      await approveBase18(owner, stableCoins.dai, depositVaultWithUSTB, 100);
      await addPaymentTokenTest(
        { vault: depositVaultWithUSTB, owner },
        stableCoins.dai,
        dataFeed.address,
        0,
        true,
      );
      await setRoundData({ mockedAggregator }, 1.03);
      await setRoundData({ mockedAggregator: mockedAggregatorMToken }, 5);
      await setMinAmountTest({ vault: depositVaultWithUSTB, owner }, 10);

      await depositRequestTest(
        {
          depositVault: depositVaultWithUSTB,
          owner,
          mTBILL,
          mTokenToUsdDataFeed,
        },
        stableCoins.dai,
        100,
      );
      const requestId = 0;
      await safeBulkApproveRequestTest(
        {
          depositVault: depositVaultWithUSTB,
          owner,
          mTBILL,
          mTokenToUsdDataFeed,
        },
        [{ id: requestId }],
        parseUnits('4'),
        {
          revertMessage: 'MV: exceed price diviation',
        },
      );
    });

    it('should fail: request already precessed', async () => {
      const {
        owner,
        mockedAggregator,
        mockedAggregatorMToken,
        depositVaultWithUSTB,
        stableCoins,
        mTBILL,
        dataFeed,
        mTokenToUsdDataFeed,
      } = await loadFixture(defaultDeploy);

      await mintToken(stableCoins.dai, owner, 100);
      await approveBase18(owner, stableCoins.dai, depositVaultWithUSTB, 100);
      await addPaymentTokenTest(
        { vault: depositVaultWithUSTB, owner },
        stableCoins.dai,
        dataFeed.address,
        0,
        true,
      );
      await setRoundData({ mockedAggregator }, 1.03);
      await setRoundData({ mockedAggregator: mockedAggregatorMToken }, 5);
      await setMinAmountTest({ vault: depositVaultWithUSTB, owner }, 10);

      await depositRequestTest(
        {
          depositVault: depositVaultWithUSTB,
          owner,
          mTBILL,
          mTokenToUsdDataFeed,
        },
        stableCoins.dai,
        100,
      );
      const requestId = 0;

      await safeBulkApproveRequestTest(
        {
          depositVault: depositVaultWithUSTB,
          owner,
          mTBILL,
          mTokenToUsdDataFeed,
        },
        [{ id: requestId }],
        parseUnits('5.000001'),
      );
      await safeBulkApproveRequestTest(
        {
          depositVault: depositVaultWithUSTB,
          owner,
          mTBILL,
          mTokenToUsdDataFeed,
        },
        [{ id: requestId }],
        parseUnits('5.000001'),
        { revertMessage: 'DV: request not pending' },
      );
    });

    it('should fail: process multiple requests, when one of them already precessed', async () => {
      const {
        owner,
        mockedAggregator,
        mockedAggregatorMToken,
        depositVaultWithUSTB,
        stableCoins,
        mTBILL,
        dataFeed,
        mTokenToUsdDataFeed,
      } = await loadFixture(defaultDeploy);

      await mintToken(stableCoins.dai, owner, 200);
      await approveBase18(owner, stableCoins.dai, depositVaultWithUSTB, 200);
      await addPaymentTokenTest(
        { vault: depositVaultWithUSTB, owner },
        stableCoins.dai,
        dataFeed.address,
        0,
        true,
      );
      await setRoundData({ mockedAggregator }, 1.03);
      await setRoundData({ mockedAggregator: mockedAggregatorMToken }, 5);
      await setMinAmountTest({ vault: depositVaultWithUSTB, owner }, 10);

      await depositRequestTest(
        {
          depositVault: depositVaultWithUSTB,
          owner,
          mTBILL,
          mTokenToUsdDataFeed,
        },
        stableCoins.dai,
        100,
      );

      await depositRequestTest(
        {
          depositVault: depositVaultWithUSTB,
          owner,
          mTBILL,
          mTokenToUsdDataFeed,
        },
        stableCoins.dai,
        100,
      );

      await safeApproveRequestTest(
        {
          depositVault: depositVaultWithUSTB,
          owner,
          mTBILL,
          mTokenToUsdDataFeed,
        },
        0,
        parseUnits('5.000001'),
      );

      await safeBulkApproveRequestTest(
        {
          depositVault: depositVaultWithUSTB,
          owner,
          mTBILL,
          mTokenToUsdDataFeed,
        },
        [{ id: 1 }, { id: 0 }],
        parseUnits('5.000001'),
        { revertMessage: 'DV: request not pending' },
      );
    });

    it('should fail: process multiple requests, when couple of them have equal id', async () => {
      const {
        owner,
        mockedAggregator,
        mockedAggregatorMToken,
        depositVaultWithUSTB,
        stableCoins,
        mTBILL,
        dataFeed,
        mTokenToUsdDataFeed,
      } = await loadFixture(defaultDeploy);

      await mintToken(stableCoins.dai, owner, 200);
      await approveBase18(owner, stableCoins.dai, depositVaultWithUSTB, 200);
      await addPaymentTokenTest(
        { vault: depositVaultWithUSTB, owner },
        stableCoins.dai,
        dataFeed.address,
        0,
        true,
      );
      await setRoundData({ mockedAggregator }, 1.03);
      await setRoundData({ mockedAggregator: mockedAggregatorMToken }, 5);
      await setMinAmountTest({ vault: depositVaultWithUSTB, owner }, 10);

      await depositRequestTest(
        {
          depositVault: depositVaultWithUSTB,
          owner,
          mTBILL,
          mTokenToUsdDataFeed,
        },
        stableCoins.dai,
        100,
      );

      await depositRequestTest(
        {
          depositVault: depositVaultWithUSTB,
          owner,
          mTBILL,
          mTokenToUsdDataFeed,
        },
        stableCoins.dai,
        100,
      );

      await safeApproveRequestTest(
        {
          depositVault: depositVaultWithUSTB,
          owner,
          mTBILL,
          mTokenToUsdDataFeed,
        },
        0,
        parseUnits('5.000001'),
      );

      await safeBulkApproveRequestTest(
        {
          depositVault: depositVaultWithUSTB,
          owner,
          mTBILL,
          mTokenToUsdDataFeed,
        },
        [{ id: 1 }, { id: 1 }],
        parseUnits('5.000001'),
        { revertMessage: 'DV: request not pending' },
      );
    });

    it('approve 1 request from vaut admin account', async () => {
      const {
        owner,
        mockedAggregator,
        mockedAggregatorMToken,
        depositVaultWithUSTB,
        stableCoins,
        mTBILL,
        dataFeed,
        mTokenToUsdDataFeed,
      } = await loadFixture(defaultDeploy);

      await mintToken(stableCoins.dai, owner, 100);
      await approveBase18(owner, stableCoins.dai, depositVaultWithUSTB, 100);
      await addPaymentTokenTest(
        { vault: depositVaultWithUSTB, owner },
        stableCoins.dai,
        dataFeed.address,
        0,
        true,
      );
      await setRoundData({ mockedAggregator }, 1.03);
      await setRoundData({ mockedAggregator: mockedAggregatorMToken }, 5);
      await setMinAmountTest({ vault: depositVaultWithUSTB, owner }, 10);

      await depositRequestTest(
        {
          depositVault: depositVaultWithUSTB,
          owner,
          mTBILL,
          mTokenToUsdDataFeed,
        },
        stableCoins.dai,
        100,
      );
      const requestId = 0;

      await safeBulkApproveRequestTest(
        {
          depositVault: depositVaultWithUSTB,
          owner,
          mTBILL,
          mTokenToUsdDataFeed,
        },
        [{ id: requestId }],
        parseUnits('5.000000001'),
      );
    });

    it('approve 2 requests from vaut admin account', async () => {
      const {
        owner,
        mockedAggregator,
        mockedAggregatorMToken,
        depositVaultWithUSTB,
        stableCoins,
        mTBILL,
        dataFeed,
        mTokenToUsdDataFeed,
      } = await loadFixture(defaultDeploy);

      await mintToken(stableCoins.dai, owner, 200);
      await approveBase18(owner, stableCoins.dai, depositVaultWithUSTB, 200);
      await addPaymentTokenTest(
        { vault: depositVaultWithUSTB, owner },
        stableCoins.dai,
        dataFeed.address,
        0,
        true,
      );
      await setRoundData({ mockedAggregator }, 1.03);
      await setRoundData({ mockedAggregator: mockedAggregatorMToken }, 5);
      await setMinAmountTest({ vault: depositVaultWithUSTB, owner }, 10);

      await depositRequestTest(
        {
          depositVault: depositVaultWithUSTB,
          owner,
          mTBILL,
          mTokenToUsdDataFeed,
        },
        stableCoins.dai,
        100,
      );

      await depositRequestTest(
        {
          depositVault: depositVaultWithUSTB,
          owner,
          mTBILL,
          mTokenToUsdDataFeed,
        },
        stableCoins.dai,
        100,
      );

      await safeBulkApproveRequestTest(
        {
          depositVault: depositVaultWithUSTB,
          owner,
          mTBILL,
          mTokenToUsdDataFeed,
        },
        [{ id: 0 }, { id: 1 }],
        parseUnits('5.000000001'),
      );
    });

    it('approve 10 requests from vaut admin account', async () => {
      const {
        owner,
        mockedAggregator,
        mockedAggregatorMToken,
        depositVaultWithUSTB,
        stableCoins,
        mTBILL,
        dataFeed,
        mTokenToUsdDataFeed,
      } = await loadFixture(defaultDeploy);

      await mintToken(stableCoins.dai, owner, 1000);
      await approveBase18(owner, stableCoins.dai, depositVaultWithUSTB, 1000);
      await addPaymentTokenTest(
        { vault: depositVaultWithUSTB, owner },
        stableCoins.dai,
        dataFeed.address,
        0,
        true,
      );
      await setRoundData({ mockedAggregator }, 1.03);
      await setRoundData({ mockedAggregator: mockedAggregatorMToken }, 5);
      await setMinAmountTest({ vault: depositVaultWithUSTB, owner }, 10);

      for (let i = 0; i < 10; i++) {
        await depositRequestTest(
          {
            depositVault: depositVaultWithUSTB,
            owner,
            mTBILL,
            mTokenToUsdDataFeed,
          },
          stableCoins.dai,
          100,
        );
      }

      await safeBulkApproveRequestTest(
        {
          depositVault: depositVaultWithUSTB,
          owner,
          mTBILL,
          mTokenToUsdDataFeed,
        },
        Array.from({ length: 10 }, (_, i) => ({ id: i })),
        parseUnits('5.000000001'),
      );
    });
  });

  describe('safeBulkApproveRequest() (current price overload)', async () => {
    it('should fail: call from address without vault admin role', async () => {
      const {
        depositVaultWithUSTB,
        regularAccounts,
        mTokenToUsdDataFeed,
        mTBILL,
      } = await loadFixture(defaultDeploy);
      await safeBulkApproveRequestTest(
        {
          depositVault: depositVaultWithUSTB,
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
        depositVaultWithUSTB,
        stableCoins,
        mTBILL,
        dataFeed,
        mTokenToUsdDataFeed,
      } = await loadFixture(defaultDeploy);
      await addPaymentTokenTest(
        { vault: depositVaultWithUSTB, owner },
        stableCoins.dai,
        dataFeed.address,
        0,
        true,
      );
      await safeBulkApproveRequestTest(
        {
          depositVault: depositVaultWithUSTB,
          owner,
          mTBILL,
          mTokenToUsdDataFeed,
        },
        [{ id: 1 }],
        undefined,
        {
          revertMessage: 'DV: request not exist',
        },
      );
    });

    it('should fail: if new rate greater then variabilityTolerance', async () => {
      const {
        owner,
        depositVaultWithUSTB,
        stableCoins,
        mTBILL,
        dataFeed,
        mTokenToUsdDataFeed,
        mockedAggregator,
        mockedAggregatorMToken,
      } = await loadFixture(defaultDeploy);
      await mintToken(stableCoins.dai, owner, 100);
      await approveBase18(owner, stableCoins.dai, depositVaultWithUSTB, 100);
      await addPaymentTokenTest(
        { vault: depositVaultWithUSTB, owner },
        stableCoins.dai,
        dataFeed.address,
        0,
        true,
      );
      await setRoundData({ mockedAggregator }, 1.03);
      await setRoundData({ mockedAggregator: mockedAggregatorMToken }, 5);
      await setMinAmountTest({ vault: depositVaultWithUSTB, owner }, 10);

      await depositRequestTest(
        {
          depositVault: depositVaultWithUSTB,
          owner,
          mTBILL,
          mTokenToUsdDataFeed,
        },
        stableCoins.dai,
        100,
      );
      await setRoundData({ mockedAggregator: mockedAggregatorMToken }, 10);

      const requestId = 0;
      await safeBulkApproveRequestTest(
        {
          depositVault: depositVaultWithUSTB,
          owner,
          mTBILL,
          mTokenToUsdDataFeed,
        },
        [{ id: requestId }],
        undefined,
        {
          revertMessage: 'MV: exceed price diviation',
        },
      );
    });

    it('should fail: if new rate lower then variabilityTolerance', async () => {
      const {
        owner,
        depositVaultWithUSTB,
        stableCoins,
        mTBILL,
        dataFeed,
        mTokenToUsdDataFeed,
        mockedAggregator,
        mockedAggregatorMToken,
      } = await loadFixture(defaultDeploy);
      await mintToken(stableCoins.dai, owner, 100);
      await approveBase18(owner, stableCoins.dai, depositVaultWithUSTB, 100);
      await addPaymentTokenTest(
        { vault: depositVaultWithUSTB, owner },
        stableCoins.dai,
        dataFeed.address,
        0,
        true,
      );
      await setRoundData({ mockedAggregator }, 1.03);
      await setRoundData({ mockedAggregator: mockedAggregatorMToken }, 5);
      await setMinAmountTest({ vault: depositVaultWithUSTB, owner }, 10);

      await depositRequestTest(
        {
          depositVault: depositVaultWithUSTB,
          owner,
          mTBILL,
          mTokenToUsdDataFeed,
        },
        stableCoins.dai,
        100,
      );
      await setRoundData({ mockedAggregator: mockedAggregatorMToken }, 3);

      const requestId = 0;
      await safeBulkApproveRequestTest(
        {
          depositVault: depositVaultWithUSTB,
          owner,
          mTBILL,
          mTokenToUsdDataFeed,
        },
        [{ id: requestId }],
        undefined,
        {
          revertMessage: 'MV: exceed price diviation',
        },
      );
    });

    it('should fail: request already precessed', async () => {
      const {
        owner,
        mockedAggregator,
        mockedAggregatorMToken,
        depositVaultWithUSTB,
        stableCoins,
        mTBILL,
        dataFeed,
        mTokenToUsdDataFeed,
      } = await loadFixture(defaultDeploy);

      await mintToken(stableCoins.dai, owner, 100);
      await approveBase18(owner, stableCoins.dai, depositVaultWithUSTB, 100);
      await addPaymentTokenTest(
        { vault: depositVaultWithUSTB, owner },
        stableCoins.dai,
        dataFeed.address,
        0,
        true,
      );
      await setRoundData({ mockedAggregator }, 1.03);
      await setRoundData({ mockedAggregator: mockedAggregatorMToken }, 5);
      await setMinAmountTest({ vault: depositVaultWithUSTB, owner }, 10);

      await depositRequestTest(
        {
          depositVault: depositVaultWithUSTB,
          owner,
          mTBILL,
          mTokenToUsdDataFeed,
        },
        stableCoins.dai,
        100,
      );
      const requestId = 0;

      await safeBulkApproveRequestTest(
        {
          depositVault: depositVaultWithUSTB,
          owner,
          mTBILL,
          mTokenToUsdDataFeed,
        },
        [{ id: requestId }],
        undefined,
      );
      await safeBulkApproveRequestTest(
        {
          depositVault: depositVaultWithUSTB,
          owner,
          mTBILL,
          mTokenToUsdDataFeed,
        },
        [{ id: requestId }],
        undefined,
        { revertMessage: 'DV: request not pending' },
      );
    });

    it('should fail: process multiple requests, when one of them already precessed', async () => {
      const {
        owner,
        mockedAggregator,
        mockedAggregatorMToken,
        depositVaultWithUSTB,
        stableCoins,
        mTBILL,
        dataFeed,
        mTokenToUsdDataFeed,
      } = await loadFixture(defaultDeploy);

      await mintToken(stableCoins.dai, owner, 200);
      await approveBase18(owner, stableCoins.dai, depositVaultWithUSTB, 200);
      await addPaymentTokenTest(
        { vault: depositVaultWithUSTB, owner },
        stableCoins.dai,
        dataFeed.address,
        0,
        true,
      );
      await setRoundData({ mockedAggregator }, 1.03);
      await setRoundData({ mockedAggregator: mockedAggregatorMToken }, 5);
      await setMinAmountTest({ vault: depositVaultWithUSTB, owner }, 10);

      await depositRequestTest(
        {
          depositVault: depositVaultWithUSTB,
          owner,
          mTBILL,
          mTokenToUsdDataFeed,
        },
        stableCoins.dai,
        100,
      );

      await depositRequestTest(
        {
          depositVault: depositVaultWithUSTB,
          owner,
          mTBILL,
          mTokenToUsdDataFeed,
        },
        stableCoins.dai,
        100,
      );

      await safeBulkApproveRequestTest(
        {
          depositVault: depositVaultWithUSTB,
          owner,
          mTBILL,
          mTokenToUsdDataFeed,
        },
        [{ id: 0 }],
        undefined,
      );

      await safeBulkApproveRequestTest(
        {
          depositVault: depositVaultWithUSTB,
          owner,
          mTBILL,
          mTokenToUsdDataFeed,
        },
        [{ id: 1 }, { id: 0 }],
        undefined,
        { revertMessage: 'DV: request not pending' },
      );
    });

    it('should fail: process multiple requests, when couple of the have equal id', async () => {
      const {
        owner,
        mockedAggregator,
        mockedAggregatorMToken,
        depositVaultWithUSTB,
        stableCoins,
        mTBILL,
        dataFeed,
        mTokenToUsdDataFeed,
      } = await loadFixture(defaultDeploy);

      await mintToken(stableCoins.dai, owner, 200);
      await approveBase18(owner, stableCoins.dai, depositVaultWithUSTB, 200);
      await addPaymentTokenTest(
        { vault: depositVaultWithUSTB, owner },
        stableCoins.dai,
        dataFeed.address,
        0,
        true,
      );
      await setRoundData({ mockedAggregator }, 1.03);
      await setRoundData({ mockedAggregator: mockedAggregatorMToken }, 5);
      await setMinAmountTest({ vault: depositVaultWithUSTB, owner }, 10);

      await depositRequestTest(
        {
          depositVault: depositVaultWithUSTB,
          owner,
          mTBILL,
          mTokenToUsdDataFeed,
        },
        stableCoins.dai,
        100,
      );

      await depositRequestTest(
        {
          depositVault: depositVaultWithUSTB,
          owner,
          mTBILL,
          mTokenToUsdDataFeed,
        },
        stableCoins.dai,
        100,
      );

      await safeBulkApproveRequestTest(
        {
          depositVault: depositVaultWithUSTB,
          owner,
          mTBILL,
          mTokenToUsdDataFeed,
        },
        [{ id: 0 }],
        undefined,
      );

      await safeBulkApproveRequestTest(
        {
          depositVault: depositVaultWithUSTB,
          owner,
          mTBILL,
          mTokenToUsdDataFeed,
        },
        [{ id: 1 }, { id: 1 }],
        undefined,
        { revertMessage: 'DV: request not pending' },
      );
    });

    it('approve 1 request from vaut admin account', async () => {
      const {
        owner,
        mockedAggregator,
        mockedAggregatorMToken,
        depositVaultWithUSTB,
        stableCoins,
        mTBILL,
        dataFeed,
        mTokenToUsdDataFeed,
      } = await loadFixture(defaultDeploy);

      await mintToken(stableCoins.dai, owner, 100);
      await approveBase18(owner, stableCoins.dai, depositVaultWithUSTB, 100);
      await addPaymentTokenTest(
        { vault: depositVaultWithUSTB, owner },
        stableCoins.dai,
        dataFeed.address,
        0,
        true,
      );
      await setRoundData({ mockedAggregator }, 1.03);
      await setRoundData({ mockedAggregator: mockedAggregatorMToken }, 5);
      await setMinAmountTest({ vault: depositVaultWithUSTB, owner }, 10);

      await depositRequestTest(
        {
          depositVault: depositVaultWithUSTB,
          owner,
          mTBILL,
          mTokenToUsdDataFeed,
        },
        stableCoins.dai,
        100,
      );
      const requestId = 0;

      await safeBulkApproveRequestTest(
        {
          depositVault: depositVaultWithUSTB,
          owner,
          mTBILL,
          mTokenToUsdDataFeed,
        },
        [{ id: requestId }],
        undefined,
      );
    });

    it('approve 2 requests from vaut admin account', async () => {
      const {
        owner,
        mockedAggregator,
        mockedAggregatorMToken,
        depositVaultWithUSTB,
        stableCoins,
        mTBILL,
        dataFeed,
        mTokenToUsdDataFeed,
      } = await loadFixture(defaultDeploy);

      await mintToken(stableCoins.dai, owner, 200);
      await approveBase18(owner, stableCoins.dai, depositVaultWithUSTB, 200);
      await addPaymentTokenTest(
        { vault: depositVaultWithUSTB, owner },
        stableCoins.dai,
        dataFeed.address,
        0,
        true,
      );
      await setRoundData({ mockedAggregator }, 1.03);
      await setRoundData({ mockedAggregator: mockedAggregatorMToken }, 5);
      await setMinAmountTest({ vault: depositVaultWithUSTB, owner }, 10);

      await depositRequestTest(
        {
          depositVault: depositVaultWithUSTB,
          owner,
          mTBILL,
          mTokenToUsdDataFeed,
        },
        stableCoins.dai,
        100,
      );

      await depositRequestTest(
        {
          depositVault: depositVaultWithUSTB,
          owner,
          mTBILL,
          mTokenToUsdDataFeed,
        },
        stableCoins.dai,
        100,
      );

      await safeBulkApproveRequestTest(
        {
          depositVault: depositVaultWithUSTB,
          owner,
          mTBILL,
          mTokenToUsdDataFeed,
        },
        [{ id: 0 }, { id: 1 }],
        undefined,
      );
    });

    it('approve 10 requests from vaut admin account', async () => {
      const {
        owner,
        mockedAggregator,
        mockedAggregatorMToken,
        depositVaultWithUSTB,
        stableCoins,
        mTBILL,
        dataFeed,
        mTokenToUsdDataFeed,
      } = await loadFixture(defaultDeploy);

      await mintToken(stableCoins.dai, owner, 1000);
      await approveBase18(owner, stableCoins.dai, depositVaultWithUSTB, 1000);
      await addPaymentTokenTest(
        { vault: depositVaultWithUSTB, owner },
        stableCoins.dai,
        dataFeed.address,
        0,
        true,
      );
      await setRoundData({ mockedAggregator }, 1.03);
      await setRoundData({ mockedAggregator: mockedAggregatorMToken }, 5);
      await setMinAmountTest({ vault: depositVaultWithUSTB, owner }, 10);

      for (let i = 0; i < 10; i++) {
        await depositRequestTest(
          {
            depositVault: depositVaultWithUSTB,
            owner,
            mTBILL,
            mTokenToUsdDataFeed,
          },
          stableCoins.dai,
          100,
        );
      }

      await safeBulkApproveRequestTest(
        {
          depositVault: depositVaultWithUSTB,
          owner,
          mTBILL,
          mTokenToUsdDataFeed,
        },
        Array.from({ length: 10 }, (_, i) => ({ id: i })),
        undefined,
      );
    });

    it('approve 10 requests from vaut admin account when different users are recievers', async () => {
      const {
        owner,
        mockedAggregator,
        mockedAggregatorMToken,
        depositVaultWithUSTB,
        stableCoins,
        mTBILL,
        dataFeed,
        mTokenToUsdDataFeed,
        regularAccounts,
      } = await loadFixture(defaultDeploy);

      await mintToken(stableCoins.dai, owner, 1000);
      await approveBase18(owner, stableCoins.dai, depositVaultWithUSTB, 1000);
      await addPaymentTokenTest(
        { vault: depositVaultWithUSTB, owner },
        stableCoins.dai,
        dataFeed.address,
        0,
        true,
      );
      await setRoundData({ mockedAggregator }, 1.03);
      await setRoundData({ mockedAggregator: mockedAggregatorMToken }, 5);
      await setMinAmountTest({ vault: depositVaultWithUSTB, owner }, 10);

      for (let i = 0; i < 10; i++) {
        await depositRequestTest(
          {
            depositVault: depositVaultWithUSTB,
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
        {
          depositVault: depositVaultWithUSTB,
          owner,
          mTBILL,
          mTokenToUsdDataFeed,
        },
        Array.from({ length: 10 }, (_, i) => ({ id: i })),
        undefined,
      );
    });

    it('approve 2 requests from vaut admin account when each request has different token', async () => {
      const {
        owner,
        mockedAggregator,
        mockedAggregatorMToken,
        depositVaultWithUSTB,
        stableCoins,
        mTBILL,
        dataFeed,
        mTokenToUsdDataFeed,
      } = await loadFixture(defaultDeploy);

      await mintToken(stableCoins.dai, owner, 100);
      await mintToken(stableCoins.usdc, owner, 100);
      await approveBase18(owner, stableCoins.dai, depositVaultWithUSTB, 100);
      await approveBase18(owner, stableCoins.usdc, depositVaultWithUSTB, 100);
      await addPaymentTokenTest(
        { vault: depositVaultWithUSTB, owner },
        stableCoins.dai,
        dataFeed.address,
        0,
        true,
      );
      await addPaymentTokenTest(
        { vault: depositVaultWithUSTB, owner },
        stableCoins.usdc,
        dataFeed.address,
        0,
        true,
      );
      await setRoundData({ mockedAggregator }, 1.03);
      await setRoundData({ mockedAggregator: mockedAggregatorMToken }, 5);
      await setMinAmountTest({ vault: depositVaultWithUSTB, owner }, 10);

      await depositRequestTest(
        {
          depositVault: depositVaultWithUSTB,
          owner,
          mTBILL,
          mTokenToUsdDataFeed,
        },
        stableCoins.dai,
        100,
      );

      await depositRequestTest(
        {
          depositVault: depositVaultWithUSTB,
          owner,
          mTBILL,
          mTokenToUsdDataFeed,
        },
        stableCoins.usdc,
        100,
      );

      await safeBulkApproveRequestTest(
        {
          depositVault: depositVaultWithUSTB,
          owner,
          mTBILL,
          mTokenToUsdDataFeed,
        },
        [{ id: 0 }, { id: 1 }],
        undefined,
      );
    });
  });

  describe('rejectRequest()', async () => {
    it('should fail: call from address without vault admin role', async () => {
      const {
        depositVaultWithUSTB,
        regularAccounts,
        mTokenToUsdDataFeed,
        mTBILL,
      } = await loadFixture(defaultDeploy);
      await rejectRequestTest(
        {
          depositVault: depositVaultWithUSTB,
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
        depositVaultWithUSTB,
        stableCoins,
        mTBILL,
        dataFeed,
        mTokenToUsdDataFeed,
      } = await loadFixture(defaultDeploy);
      await addPaymentTokenTest(
        { vault: depositVaultWithUSTB, owner },
        stableCoins.dai,
        dataFeed.address,
        0,
        true,
      );
      await rejectRequestTest(
        {
          depositVault: depositVaultWithUSTB,
          owner,
          mTBILL,
          mTokenToUsdDataFeed,
        },
        1,
        {
          revertMessage: 'DV: request not exist',
        },
      );
    });

    it('should fail: request is already rejected', async () => {
      const {
        owner,
        mockedAggregator,
        mockedAggregatorMToken,
        depositVaultWithUSTB,
        stableCoins,
        mTBILL,
        dataFeed,
        mTokenToUsdDataFeed,
      } = await loadFixture(defaultDeploy);

      await mintToken(stableCoins.dai, owner, 100);
      await approveBase18(owner, stableCoins.dai, depositVaultWithUSTB, 100);
      await addPaymentTokenTest(
        { vault: depositVaultWithUSTB, owner },
        stableCoins.dai,
        dataFeed.address,
        0,
        true,
      );
      await setRoundData({ mockedAggregator }, 1.03);
      await setRoundData({ mockedAggregator: mockedAggregatorMToken }, 5);
      await setMinAmountTest({ vault: depositVaultWithUSTB, owner }, 10);

      await depositRequestTest(
        {
          depositVault: depositVaultWithUSTB,
          owner,
          mTBILL,
          mTokenToUsdDataFeed,
        },
        stableCoins.dai,
        100,
      );
      const requestId = 0;

      await rejectRequestTest(
        {
          depositVault: depositVaultWithUSTB,
          owner,
          mTBILL,
          mTokenToUsdDataFeed,
        },
        requestId,
      );

      await rejectRequestTest(
        {
          depositVault: depositVaultWithUSTB,
          owner,
          mTBILL,
          mTokenToUsdDataFeed,
        },
        requestId,
        {
          revertMessage: 'DV: request not pending',
        },
      );
    });

    it('reject request from vaut admin account', async () => {
      const {
        owner,
        mockedAggregator,
        mockedAggregatorMToken,
        depositVaultWithUSTB,
        stableCoins,
        mTBILL,
        dataFeed,
        mTokenToUsdDataFeed,
      } = await loadFixture(defaultDeploy);

      await mintToken(stableCoins.dai, owner, 100);
      await approveBase18(owner, stableCoins.dai, depositVaultWithUSTB, 100);
      await addPaymentTokenTest(
        { vault: depositVaultWithUSTB, owner },
        stableCoins.dai,
        dataFeed.address,
        0,
        true,
      );
      await setRoundData({ mockedAggregator }, 1.03);
      await setRoundData({ mockedAggregator: mockedAggregatorMToken }, 5);
      await setMinAmountTest({ vault: depositVaultWithUSTB, owner }, 10);

      await depositRequestTest(
        {
          depositVault: depositVaultWithUSTB,
          owner,
          mTBILL,
          mTokenToUsdDataFeed,
        },
        stableCoins.dai,
        100,
      );
      const requestId = 0;

      await rejectRequestTest(
        {
          depositVault: depositVaultWithUSTB,
          owner,
          mTBILL,
          mTokenToUsdDataFeed,
        },
        requestId,
      );
    });
  });

  describe('setUstbDepositsEnabled', () => {
    it('should fail: call from address without vault admin role', async () => {
      const { depositVaultWithUSTB, owner, regularAccounts } =
        await loadFixture(defaultDeploy);
      await setUstbDepositsEnabledTest({ depositVaultWithUSTB, owner }, true, {
        from: regularAccounts[0],
        revertMessage: 'WMAC: hasnt role',
      });
    });

    it('call from address with vault admin role', async () => {
      const { depositVaultWithUSTB, owner } = await loadFixture(defaultDeploy);
      await setUstbDepositsEnabledTest({ depositVaultWithUSTB, owner }, true);
    });

    it('set true when ustbDepositsEnabled is already true', async () => {
      const { depositVaultWithUSTB, owner } = await loadFixture(defaultDeploy);
      await setUstbDepositsEnabledTest({ depositVaultWithUSTB, owner }, true);
      await setUstbDepositsEnabledTest({ depositVaultWithUSTB, owner }, true);
    });

    it('set false when ustbDepositsEnabled is already false', async () => {
      const { depositVaultWithUSTB, owner } = await loadFixture(defaultDeploy);
      await setUstbDepositsEnabledTest({ depositVaultWithUSTB, owner }, false);
    });
  });

  describe('depositInstant() complex', () => {
    it('should fail: when is paused', async () => {
      const {
        depositVaultWithUSTB,
        owner,
        mTBILL,
        stableCoins,
        regularAccounts,
        dataFeed,
        mTokenToUsdDataFeed,
      } = await loadFixture(defaultDeploy);

      await pauseVault(depositVaultWithUSTB);
      await mintToken(stableCoins.dai, regularAccounts[0], 100);
      await approveBase18(
        regularAccounts[0],
        stableCoins.dai,
        depositVaultWithUSTB,
        100,
      );
      await addPaymentTokenTest(
        { vault: depositVaultWithUSTB, owner },
        stableCoins.dai,
        dataFeed.address,
        0,
        true,
      );

      await depositInstantTest(
        {
          depositVault: depositVaultWithUSTB,
          owner,
          mTBILL,
          mTokenToUsdDataFeed,
        },
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
        depositVaultWithUSTB,
        owner,
        mTBILL,
        stableCoins,
        dataFeed,
        mTokenToUsdDataFeed,
      } = await loadFixture(defaultDeploy);

      await pauseVault(depositVaultWithUSTB);

      await mintToken(stableCoins.dai, owner, 100);
      await approveBase18(owner, stableCoins.dai, depositVaultWithUSTB, 100);
      await addPaymentTokenTest(
        { vault: depositVaultWithUSTB, owner },
        stableCoins.dai,
        dataFeed.address,
        0,
        true,
      );

      await depositInstantTest(
        {
          depositVault: depositVaultWithUSTB,
          owner,
          mTBILL,
          mTokenToUsdDataFeed,
        },
        stableCoins.dai,
        100,
        {
          revertMessage: 'Pausable: paused',
        },
      );
    });

    it('call for amount == minAmountToDepositTest', async () => {
      const {
        depositVaultWithUSTB,
        mockedAggregator,
        mockedAggregatorMToken,
        owner,
        mTBILL,
        stableCoins,
        dataFeed,
        mTokenToUsdDataFeed,
      } = await loadFixture(defaultDeploy);
      await addPaymentTokenTest(
        { vault: depositVaultWithUSTB, owner },
        stableCoins.dai,
        dataFeed.address,
        0,
        true,
      );
      await setRoundData({ mockedAggregator }, 1);

      await mintToken(stableCoins.dai, owner, 102_000);
      await approveBase18(
        owner,
        stableCoins.dai,
        depositVaultWithUSTB,
        102_000,
      );

      await setRoundData({ mockedAggregator: mockedAggregatorMToken }, 1);
      await setMinAmountToDepositTest(
        { depositVault: depositVaultWithUSTB, owner },
        100_000,
      );
      await setInstantDailyLimitTest(
        { vault: depositVaultWithUSTB, owner },
        parseUnits('150000'),
      );

      await depositInstantTest(
        {
          depositVault: depositVaultWithUSTB,
          owner,
          mTBILL,
          mTokenToUsdDataFeed,
        },
        stableCoins.dai,
        102_000,
      );
    });

    it('call for amount == minAmountToDepositTest+1, then deposit with amount 100', async () => {
      const {
        depositVaultWithUSTB,
        mockedAggregator,
        mockedAggregatorMToken,
        owner,
        mTBILL,
        stableCoins,
        dataFeed,
        mTokenToUsdDataFeed,
      } = await loadFixture(defaultDeploy);
      await addPaymentTokenTest(
        { vault: depositVaultWithUSTB, owner },
        stableCoins.dai,
        dataFeed.address,
        0,
        true,
      );
      await setRoundData({ mockedAggregator }, 1);

      await mintToken(stableCoins.dai, owner, 103_101);
      await approveBase18(
        owner,
        stableCoins.dai,
        depositVaultWithUSTB,
        103_101,
      );

      await setRoundData({ mockedAggregator: mockedAggregatorMToken }, 1);
      await setMinAmountToDepositTest(
        { depositVault: depositVaultWithUSTB, owner },
        100_000,
      );
      await setInstantDailyLimitTest(
        { vault: depositVaultWithUSTB, owner },
        parseUnits('150000'),
      );
      await setMinAmountTest({ vault: depositVaultWithUSTB, owner }, 10);

      await depositInstantTest(
        {
          depositVault: depositVaultWithUSTB,
          owner,
          mTBILL,
          mTokenToUsdDataFeed,
        },
        stableCoins.dai,
        103_001,
      );
      await depositInstantTest(
        {
          depositVault: depositVaultWithUSTB,
          owner,
          mTBILL,
          mTokenToUsdDataFeed,
        },
        stableCoins.dai,
        100,
      );
    });

    it('deposit 100 DAI, when price is 5$, 25 USDC when price is 5.1$, 14 USDT when price is 5.4$', async () => {
      const {
        owner,
        mockedAggregator,
        depositVaultWithUSTB,
        stableCoins,
        mTBILL,
        dataFeed,
        mTokenToUsdDataFeed,
      } = await loadFixture(defaultDeploy);

      await mintToken(stableCoins.dai, owner, 100);
      await mintToken(stableCoins.usdc, owner, 125);
      await mintToken(stableCoins.usdt, owner, 114);

      await approveBase18(owner, stableCoins.dai, depositVaultWithUSTB, 100);
      await approveBase18(owner, stableCoins.usdc, depositVaultWithUSTB, 125);
      await approveBase18(owner, stableCoins.usdt, depositVaultWithUSTB, 114);
      await setMinAmountTest({ vault: depositVaultWithUSTB, owner }, 10);

      await addPaymentTokenTest(
        { vault: depositVaultWithUSTB, owner },
        stableCoins.dai,
        dataFeed.address,
        0,
        true,
      );
      await addPaymentTokenTest(
        { vault: depositVaultWithUSTB, owner },
        stableCoins.usdc,
        dataFeed.address,
        0,
        true,
      );
      await addPaymentTokenTest(
        { vault: depositVaultWithUSTB, owner },
        stableCoins.usdt,
        dataFeed.address,
        0,
        true,
      );

      await setRoundData({ mockedAggregator }, 1.04);
      await depositInstantTest(
        {
          depositVault: depositVaultWithUSTB,
          owner,
          mTBILL,
          mTokenToUsdDataFeed,
        },
        stableCoins.dai,
        100,
      );

      await setRoundData({ mockedAggregator }, 1);
      await depositInstantTest(
        {
          depositVault: depositVaultWithUSTB,
          owner,
          mTBILL,
          mTokenToUsdDataFeed,
        },
        stableCoins.usdc,
        125,
      );

      await setRoundData({ mockedAggregator }, 1.01);
      await depositInstantTest(
        {
          depositVault: depositVaultWithUSTB,
          owner,
          mTBILL,
          mTokenToUsdDataFeed,
        },
        stableCoins.usdt,
        114,
      );
    });
  });

  describe('depositRequest() complex', () => {
    it('should fail: when is paused', async () => {
      const {
        depositVaultWithUSTB,
        owner,
        mTBILL,
        stableCoins,
        regularAccounts,
        dataFeed,
        mTokenToUsdDataFeed,
      } = await loadFixture(defaultDeploy);

      await pauseVault(depositVaultWithUSTB);
      await mintToken(stableCoins.dai, regularAccounts[0], 100);
      await approveBase18(
        regularAccounts[0],
        stableCoins.dai,
        depositVaultWithUSTB,
        100,
      );
      await addPaymentTokenTest(
        { vault: depositVaultWithUSTB, owner },
        stableCoins.dai,
        dataFeed.address,
        0,
        true,
      );

      await depositRequestTest(
        {
          depositVault: depositVaultWithUSTB,
          owner,
          mTBILL,
          mTokenToUsdDataFeed,
        },
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
        depositVaultWithUSTB,
        owner,
        mTBILL,
        stableCoins,
        dataFeed,
        mTokenToUsdDataFeed,
      } = await loadFixture(defaultDeploy);

      await pauseVault(depositVaultWithUSTB);

      await mintToken(stableCoins.dai, owner, 100);
      await approveBase18(owner, stableCoins.dai, depositVaultWithUSTB, 100);
      await addPaymentTokenTest(
        { vault: depositVaultWithUSTB, owner },
        stableCoins.dai,
        dataFeed.address,
        0,
        true,
      );

      await depositRequestTest(
        {
          depositVault: depositVaultWithUSTB,
          owner,
          mTBILL,
          mTokenToUsdDataFeed,
        },
        stableCoins.dai,
        100,
        {
          revertMessage: 'Pausable: paused',
        },
      );
    });

    it('call for amount == minAmountToDepositTest', async () => {
      const {
        depositVaultWithUSTB,
        mockedAggregator,
        mockedAggregatorMToken,
        owner,
        mTBILL,
        stableCoins,
        dataFeed,
        mTokenToUsdDataFeed,
      } = await loadFixture(defaultDeploy);
      await addPaymentTokenTest(
        { vault: depositVaultWithUSTB, owner },
        stableCoins.dai,
        dataFeed.address,
        0,
        true,
      );
      await setRoundData({ mockedAggregator }, 1);

      await mintToken(stableCoins.dai, owner, 105_000);
      await approveBase18(
        owner,
        stableCoins.dai,
        depositVaultWithUSTB,
        105_000,
      );

      await setRoundData({ mockedAggregator: mockedAggregatorMToken }, 1);
      await setMinAmountToDepositTest(
        { depositVault: depositVaultWithUSTB, owner },
        100_000,
      );
      await setInstantDailyLimitTest(
        { vault: depositVaultWithUSTB, owner },
        150_000,
      );

      await depositRequestTest(
        {
          depositVault: depositVaultWithUSTB,
          owner,
          mTBILL,
          mTokenToUsdDataFeed,
        },
        stableCoins.dai,
        102_000,
      );
      const requestId = 0;

      await approveRequestTest(
        {
          depositVault: depositVaultWithUSTB,
          owner,
          mTBILL,
          mTokenToUsdDataFeed,
        },
        requestId,
        parseUnits('5'),
      );
    });

    it('call for amount == minAmountToDepositTest+1, then deposit with amount 1', async () => {
      const {
        depositVaultWithUSTB,
        mockedAggregator,
        mockedAggregatorMToken,
        owner,
        mTBILL,
        stableCoins,
        dataFeed,
        mTokenToUsdDataFeed,
      } = await loadFixture(defaultDeploy);
      await addPaymentTokenTest(
        { vault: depositVaultWithUSTB, owner },
        stableCoins.dai,
        dataFeed.address,
        0,
        true,
      );
      await setRoundData({ mockedAggregator }, 1);

      await mintToken(stableCoins.dai, owner, 105_101);
      await approveBase18(
        owner,
        stableCoins.dai,
        depositVaultWithUSTB,
        105_101,
      );

      await setRoundData({ mockedAggregator: mockedAggregatorMToken }, 1);
      await setMinAmountToDepositTest(
        { depositVault: depositVaultWithUSTB, owner },
        100_000,
      );
      await setInstantDailyLimitTest(
        { vault: depositVaultWithUSTB, owner },
        150_000,
      );

      await depositRequestTest(
        {
          depositVault: depositVaultWithUSTB,
          owner,
          mTBILL,
          mTokenToUsdDataFeed,
        },
        stableCoins.dai,
        102_001,
      );
      let requestId = 0;

      await approveRequestTest(
        {
          depositVault: depositVaultWithUSTB,
          owner,
          mTBILL,
          mTokenToUsdDataFeed,
        },
        requestId,
        parseUnits('5'),
      );
      await depositRequestTest(
        {
          depositVault: depositVaultWithUSTB,
          owner,
          mTBILL,
          mTokenToUsdDataFeed,
        },
        stableCoins.dai,
        100,
      );
      requestId = 1;

      await approveRequestTest(
        {
          depositVault: depositVaultWithUSTB,
          owner,
          mTBILL,
          mTokenToUsdDataFeed,
        },
        requestId,
        parseUnits('5'),
      );
    });

    it('deposit 100 DAI, when price is 5$, 25 USDC when price is 5.1$, 14 USDT when price is 5.4$', async () => {
      const {
        owner,
        mockedAggregator,
        depositVaultWithUSTB,
        stableCoins,
        mTBILL,
        dataFeed,
        mTokenToUsdDataFeed,
      } = await loadFixture(defaultDeploy);

      await mintToken(stableCoins.dai, owner, 100);
      await mintToken(stableCoins.usdc, owner, 125);
      await mintToken(stableCoins.usdt, owner, 114);

      await approveBase18(owner, stableCoins.dai, depositVaultWithUSTB, 100);
      await approveBase18(owner, stableCoins.usdc, depositVaultWithUSTB, 125);
      await approveBase18(owner, stableCoins.usdt, depositVaultWithUSTB, 114);

      await addPaymentTokenTest(
        { vault: depositVaultWithUSTB, owner },
        stableCoins.dai,
        dataFeed.address,
        0,
        true,
      );
      await addPaymentTokenTest(
        { vault: depositVaultWithUSTB, owner },
        stableCoins.usdc,
        dataFeed.address,
        0,
        true,
      );
      await addPaymentTokenTest(
        { vault: depositVaultWithUSTB, owner },
        stableCoins.usdt,
        dataFeed.address,
        0,
        true,
      );
      await setMinAmountTest({ vault: depositVaultWithUSTB, owner }, 10);

      await setRoundData({ mockedAggregator }, 1.04);
      await depositRequestTest(
        {
          depositVault: depositVaultWithUSTB,
          owner,
          mTBILL,
          mTokenToUsdDataFeed,
        },
        stableCoins.dai,
        100,
      );
      let requestId = 0;

      await approveRequestTest(
        {
          depositVault: depositVaultWithUSTB,
          owner,
          mTBILL,
          mTokenToUsdDataFeed,
        },
        requestId,
        parseUnits('5'),
      );

      await setRoundData({ mockedAggregator }, 1);
      await depositRequestTest(
        {
          depositVault: depositVaultWithUSTB,
          owner,
          mTBILL,
          mTokenToUsdDataFeed,
        },
        stableCoins.usdc,
        125,
      );
      requestId = 1;

      await approveRequestTest(
        {
          depositVault: depositVaultWithUSTB,
          owner,
          mTBILL,
          mTokenToUsdDataFeed,
        },
        requestId,
        parseUnits('5'),
      );

      await setRoundData({ mockedAggregator }, 1.01);
      await depositRequestTest(
        {
          depositVault: depositVaultWithUSTB,
          owner,
          mTBILL,
          mTokenToUsdDataFeed,
        },
        stableCoins.usdt,
        114,
      );
      requestId = 2;

      await approveRequestTest(
        {
          depositVault: depositVaultWithUSTB,
          owner,
          mTBILL,
          mTokenToUsdDataFeed,
        },
        requestId,
        parseUnits('5'),
      );
    });
  });

  describe('ManageableVault internal functions', () => {
    it('should fail: invalid rounding tokenTransferFromToTester()', async () => {
      const { depositVaultWithUSTB, stableCoins, owner } = await loadFixture(
        defaultDeploy,
      );

      await mintToken(stableCoins.usdc, owner, 1000);

      await approveBase18(owner, stableCoins.usdc, depositVaultWithUSTB, 1000);

      await expect(
        depositVaultWithUSTB.tokenTransferFromToTester(
          stableCoins.usdc.address,
          owner.address,
          depositVaultWithUSTB.address,
          parseUnits('999.999999999'),
          8,
        ),
      ).revertedWith('MV: invalid rounding');
    });

    it('should fail: invalid rounding tokenTransferToUserTester()', async () => {
      const { depositVaultWithUSTB, stableCoins, owner } = await loadFixture(
        defaultDeploy,
      );

      await mintToken(stableCoins.usdc, depositVaultWithUSTB, 1000);

      await expect(
        depositVaultWithUSTB.tokenTransferToUserTester(
          stableCoins.usdc.address,
          owner.address,
          parseUnits('999.999999999'),
          8,
        ),
      ).revertedWith('MV: invalid rounding');
    });
  });

  describe('_convertUsdToToken', () => {
    it('should fail: when amountUsd == 0', async () => {
      const { depositVaultWithUSTB } = await loadFixture(defaultDeploy);

      await expect(
        depositVaultWithUSTB.convertTokenToUsdTest(constants.AddressZero, 0),
      ).revertedWith('DV: amount zero');
    });

    it('should fail: when tokenRate == 0', async () => {
      const { depositVaultWithUSTB } = await loadFixture(defaultDeploy);

      await depositVaultWithUSTB.setOverrideGetTokenRate(true);
      await depositVaultWithUSTB.setGetTokenRateValue(0);

      await expect(
        depositVaultWithUSTB.convertTokenToUsdTest(constants.AddressZero, 1),
      ).revertedWith('DV: rate zero');
    });
  });

  describe('_convertUsdToMToken', () => {
    it('should fail: when rate == 0', async () => {
      const { depositVaultWithUSTB } = await loadFixture(defaultDeploy);

      await depositVaultWithUSTB.setOverrideGetTokenRate(true);
      await depositVaultWithUSTB.setGetTokenRateValue(0);

      await expect(depositVaultWithUSTB.convertUsdToMTokenTest(1)).revertedWith(
        'DV: rate zero',
      );
    });
  });

  describe('_calcAndValidateDeposit', () => {
    it('should fail: when tokenOut is not MANUAL_FULLFILMENT_TOKEN but isFiat = true', async () => {
      const { depositVaultWithUSTB, stableCoins, owner, dataFeed } =
        await loadFixture(defaultDeploy);

      await addPaymentTokenTest(
        { vault: depositVaultWithUSTB, owner },
        stableCoins.dai,
        dataFeed.address,
        parseUnits('100', 2),
        true,
      );

      await setMinAmountTest({ vault: depositVaultWithUSTB, owner }, 0);

      await expect(
        depositVaultWithUSTB.calcAndValidateDeposit(
          constants.AddressZero,
          stableCoins.dai.address,
          parseUnits('100'),
          true,
        ),
      ).revertedWith('DV: invalid mint amount');
    });
  });
});
