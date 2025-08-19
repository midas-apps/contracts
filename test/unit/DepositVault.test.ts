import { loadFixture } from '@nomicfoundation/hardhat-network-helpers';
import { expect } from 'chai';
import { constants } from 'ethers';
import { parseUnits } from 'ethers/lib/utils';
import { ethers } from 'hardhat';

import { encodeFnSelector } from '../../helpers/utils';
import {
  // eslint-disable-next-line camelcase
  DepositVaultTest__factory,
  // eslint-disable-next-line camelcase
  EUsdDepositVault__factory,
  // eslint-disable-next-line camelcase
  ManageableVaultTester__factory,
  // eslint-disable-next-line camelcase
  MBasisDepositVault__factory,
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
import {
  approveRequestTest,
  depositInstantTest,
  depositRequestTest,
  rejectRequestTest,
  safeApproveRequestTest,
  safeBulkApproveRequestTest,
  setMaxSupplyCapTest,
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

describe('DepositVault', function () {
  it('deployment', async () => {
    const {
      depositVault,
      mTBILL,
      tokensReceiver,
      feeReceiver,
      mTokenToUsdDataFeed,
      roles,
    } = await loadFixture(defaultDeploy);

    expect(await depositVault.mToken()).eq(mTBILL.address);

    expect(await depositVault.paused()).eq(false);

    expect(await depositVault.tokensReceiver()).eq(tokensReceiver.address);
    expect(await depositVault.feeReceiver()).eq(feeReceiver.address);

    expect(await depositVault.ONE_HUNDRED_PERCENT()).eq('10000');

    expect(await depositVault.minMTokenAmountForFirstDeposit()).eq('0');
    expect(await depositVault.minAmount()).eq(parseUnits('100'));

    expect(await depositVault.instantFee()).eq('100');

    expect(await depositVault.instantDailyLimit()).eq(parseUnits('100000'));

    expect(await depositVault.mTokenDataFeed()).eq(mTokenToUsdDataFeed.address);
    expect(await depositVault.variationTolerance()).eq(1);

    expect(await depositVault.vaultRole()).eq(
      roles.tokenRoles.mTBILL.depositVaultAdmin,
    );

    expect(await depositVault.MANUAL_FULLFILMENT_TOKEN()).eq(
      ethers.constants.AddressZero,
    );
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
    const depositVault = await new DepositVaultTest__factory(owner).deploy();

    await expect(
      depositVault.initialize(
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
      ),
    ).to.be.reverted;
    await expect(
      depositVault.initialize(
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
      ),
    ).to.be.reverted;
    await expect(
      depositVault.initialize(
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
      ),
    ).to.be.reverted;
    await expect(
      depositVault.initialize(
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
      ),
    ).to.be.reverted;
    await expect(
      depositVault.initialize(
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
      ),
    ).to.be.reverted;
    await expect(
      depositVault.initialize(
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
      ),
    ).to.be.reverted;

    await expect(
      depositVault.initializeWithoutInitializer(
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
          instantFee: 99,
          instantDailyLimit: parseUnits('100000'),
        },
        mockedSanctionsList.address,
        1,
        parseUnits('100'),
        parseUnits('100'),
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
      const { depositVault } = await loadFixture(defaultDeploy);

      await expect(
        depositVault.initialize(
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
      const { owner, depositVault, regularAccounts } = await loadFixture(
        defaultDeploy,
      );

      await setMinAmountToDepositTest({ depositVault, owner }, 1.1, {
        from: regularAccounts[0],
        revertMessage: acErrors.WMAC_HASNT_ROLE,
      });
    });

    it('call from address with DEPOSIT_VAULT_ADMIN_ROLE role', async () => {
      const { owner, depositVault } = await loadFixture(defaultDeploy);
      await setMinAmountToDepositTest({ depositVault, owner }, 1.1);
    });
  });

  describe('setMaxSupplyCap()', () => {
    it('should fail: call from address without DEPOSIT_VAULT_ADMIN_ROLE role', async () => {
      const { owner, depositVault, regularAccounts } = await loadFixture(
        defaultDeploy,
      );

      await setMaxSupplyCapTest({ depositVault, owner }, 1.1, {
        from: regularAccounts[0],
        revertMessage: acErrors.WMAC_HASNT_ROLE,
      });
    });

    it('call from address with DEPOSIT_VAULT_ADMIN_ROLE role', async () => {
      const { owner, depositVault } = await loadFixture(defaultDeploy);
      await setMaxSupplyCapTest({ depositVault, owner }, 1.1);
    });
  });

  describe('setMinAmount()', () => {
    it('should fail: call from address without DEPOSIT_VAULT_ADMIN_ROLE role', async () => {
      const { owner, depositVault, regularAccounts } = await loadFixture(
        defaultDeploy,
      );

      await setMinAmountTest({ vault: depositVault, owner }, 1.1, {
        from: regularAccounts[0],
        revertMessage: acErrors.WMAC_HASNT_ROLE,
      });
    });

    it('call from address with DEPOSIT_VAULT_ADMIN_ROLE role', async () => {
      const { owner, depositVault } = await loadFixture(defaultDeploy);
      await setMinAmountTest({ vault: depositVault, owner }, 1.1);
    });
  });

  describe('setInstantDailyLimit()', () => {
    it('should fail: call from address without DEPOSIT_VAULT_ADMIN_ROLE role', async () => {
      const { owner, depositVault, regularAccounts } = await loadFixture(
        defaultDeploy,
      );

      await setInstantDailyLimitTest(
        { vault: depositVault, owner },
        parseUnits('1000'),
        {
          from: regularAccounts[0],
          revertMessage: acErrors.WMAC_HASNT_ROLE,
        },
      );
    });

    it('should fail: try to set 0 limit', async () => {
      const { owner, depositVault } = await loadFixture(defaultDeploy);

      await setInstantDailyLimitTest(
        { vault: depositVault, owner },
        constants.Zero,
        {
          revertMessage: 'MV: limit zero',
        },
      );
    });

    it('call from address with DEPOSIT_VAULT_ADMIN_ROLE role', async () => {
      const { owner, depositVault } = await loadFixture(defaultDeploy);
      await setInstantDailyLimitTest(
        { vault: depositVault, owner },
        parseUnits('1000'),
      );
    });
  });

  describe('addPaymentToken()', () => {
    it('should fail: call from address without DEPOSIT_VAULT_ADMIN_ROLE role', async () => {
      const { depositVault, regularAccounts, owner } = await loadFixture(
        defaultDeploy,
      );
      await addPaymentTokenTest(
        { vault: depositVault, owner },
        ethers.constants.AddressZero,
        ethers.constants.AddressZero,
        0,
        false,
        constants.MaxUint256,
        { revertMessage: acErrors.WMAC_HASNT_ROLE, from: regularAccounts[0] },
      );
    });

    it('should fail: when token is already added', async () => {
      const { depositVault, stableCoins, owner, dataFeed } = await loadFixture(
        defaultDeploy,
      );
      await addPaymentTokenTest(
        { vault: depositVault, owner },
        stableCoins.dai,
        dataFeed.address,
        0,
        false,
      );
      await addPaymentTokenTest(
        { vault: depositVault, owner },
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
      const { depositVault, stableCoins, owner } = await loadFixture(
        defaultDeploy,
      );
      await addPaymentTokenTest(
        { vault: depositVault, owner },
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

    it('call from address with DEPOSIT_VAULT_ADMIN_ROLE role', async () => {
      const { depositVault, stableCoins, owner, dataFeed } = await loadFixture(
        defaultDeploy,
      );
      await addPaymentTokenTest(
        { vault: depositVault, owner },
        stableCoins.dai,
        dataFeed.address,
        0,
        false,
      );
    });

    it('call when allowance is zero', async () => {
      const { depositVault, stableCoins, owner, dataFeed } = await loadFixture(
        defaultDeploy,
      );
      await addPaymentTokenTest(
        { vault: depositVault, owner },
        stableCoins.dai,
        dataFeed.address,
        0,
        false,
        constants.Zero,
      );
    });

    it('call when allowance is not uint256 max', async () => {
      const { depositVault, stableCoins, owner, dataFeed } = await loadFixture(
        defaultDeploy,
      );
      await addPaymentTokenTest(
        { vault: depositVault, owner },
        stableCoins.dai,
        dataFeed.address,
        0,
        false,
        parseUnits('100'),
      );
    });

    it('call from address with DEPOSIT_VAULT_ADMIN_ROLE role and add 3 options on a row', async () => {
      const { depositVault, stableCoins, owner, dataFeed } = await loadFixture(
        defaultDeploy,
      );

      await addPaymentTokenTest(
        { vault: depositVault, owner },
        stableCoins.dai,
        dataFeed.address,
        0,
        true,
      );
      await addPaymentTokenTest(
        { vault: depositVault, owner },
        stableCoins.usdc,
        dataFeed.address,
        0,
        true,
      );
      await addPaymentTokenTest(
        { vault: depositVault, owner },
        stableCoins.usdt,
        dataFeed.address,
        0,
        true,
      );
    });
  });

  describe('addWaivedFeeAccount()', () => {
    it('should fail: call from address without DEPOSIT_VAULT_ADMIN_ROLE role', async () => {
      const { depositVault, regularAccounts, owner } = await loadFixture(
        defaultDeploy,
      );
      await addWaivedFeeAccountTest(
        { vault: depositVault, owner },
        ethers.constants.AddressZero,
        { revertMessage: acErrors.WMAC_HASNT_ROLE, from: regularAccounts[0] },
      );
    });
    it('should fail: if account fee already waived', async () => {
      const { depositVault, owner } = await loadFixture(defaultDeploy);
      await addWaivedFeeAccountTest(
        { vault: depositVault, owner },
        owner.address,
      );
      await addWaivedFeeAccountTest(
        { vault: depositVault, owner },
        owner.address,
        { revertMessage: 'MV: already added' },
      );
    });

    it('call from address with DEPOSIT_VAULT_ADMIN_ROLE role', async () => {
      const { depositVault, owner } = await loadFixture(defaultDeploy);
      await addWaivedFeeAccountTest(
        { vault: depositVault, owner },
        owner.address,
      );
    });
  });

  describe('removeWaivedFeeAccount()', () => {
    it('should fail: call from address without DEPOSIT_VAULT_ADMIN_ROLE role', async () => {
      const { depositVault, regularAccounts, owner } = await loadFixture(
        defaultDeploy,
      );
      await removeWaivedFeeAccountTest(
        { vault: depositVault, owner },
        ethers.constants.AddressZero,
        { revertMessage: acErrors.WMAC_HASNT_ROLE, from: regularAccounts[0] },
      );
    });
    it('should fail: if account not found in restriction', async () => {
      const { depositVault, owner } = await loadFixture(defaultDeploy);
      await removeWaivedFeeAccountTest(
        { vault: depositVault, owner },
        owner.address,
        { revertMessage: 'MV: not found' },
      );
    });

    it('call from address with DEPOSIT_VAULT_ADMIN_ROLE role', async () => {
      const { depositVault, owner } = await loadFixture(defaultDeploy);
      await addWaivedFeeAccountTest(
        { vault: depositVault, owner },
        owner.address,
      );
      await removeWaivedFeeAccountTest(
        { vault: depositVault, owner },
        owner.address,
      );
    });
  });

  describe('setFee()', () => {
    it('should fail: call from address without DEPOSIT_VAULT_ADMIN_ROLE role', async () => {
      const { depositVault, regularAccounts, owner } = await loadFixture(
        defaultDeploy,
      );
      await setInstantFeeTest(
        { vault: depositVault, owner },
        ethers.constants.Zero,
        { revertMessage: acErrors.WMAC_HASNT_ROLE, from: regularAccounts[0] },
      );
    });

    it('should fail: if new value greater then 100%', async () => {
      const { depositVault, owner } = await loadFixture(defaultDeploy);
      await setInstantFeeTest({ vault: depositVault, owner }, 10001, {
        revertMessage: 'fee > 100%',
      });
    });

    it('call from address with DEPOSIT_VAULT_ADMIN_ROLE role', async () => {
      const { depositVault, owner } = await loadFixture(defaultDeploy);
      await setInstantFeeTest({ vault: depositVault, owner }, 100);
    });
  });

  describe('setVariabilityTolerance()', () => {
    it('should fail: call from address without DEPOSIT_VAULT_ADMIN_ROLE role', async () => {
      const { depositVault, regularAccounts, owner } = await loadFixture(
        defaultDeploy,
      );
      await setVariabilityToleranceTest(
        { vault: depositVault, owner },
        ethers.constants.Zero,
        { revertMessage: acErrors.WMAC_HASNT_ROLE, from: regularAccounts[0] },
      );
    });
    it('should fail: if new value zero', async () => {
      const { depositVault, owner } = await loadFixture(defaultDeploy);
      await setVariabilityToleranceTest(
        { vault: depositVault, owner },
        ethers.constants.Zero,
        { revertMessage: 'fee == 0' },
      );
    });

    it('call from address with DEPOSIT_VAULT_ADMIN_ROLE role', async () => {
      const { depositVault, owner } = await loadFixture(defaultDeploy);
      await setVariabilityToleranceTest({ vault: depositVault, owner }, 100);
    });
  });

  describe('removePaymentToken()', () => {
    it('should fail: call from address without DEPOSIT_VAULT_ADMIN_ROLE role', async () => {
      const { depositVault, regularAccounts, owner } = await loadFixture(
        defaultDeploy,
      );
      await removePaymentTokenTest(
        { vault: depositVault, owner },
        ethers.constants.AddressZero,
        { revertMessage: acErrors.WMAC_HASNT_ROLE, from: regularAccounts[0] },
      );
    });

    it('should fail: when token is not exists', async () => {
      const { owner, depositVault, stableCoins } = await loadFixture(
        defaultDeploy,
      );
      await removePaymentTokenTest(
        { vault: depositVault, owner },
        stableCoins.dai.address,
        { revertMessage: 'MV: not exists' },
      );
    });

    it('call from address with DEPOSIT_VAULT_ADMIN_ROLE role', async () => {
      const { depositVault, stableCoins, owner, dataFeed } = await loadFixture(
        defaultDeploy,
      );
      await addPaymentTokenTest(
        { vault: depositVault, owner },
        stableCoins.dai,
        dataFeed.address,
        0,
        true,
      );
      await removePaymentTokenTest(
        { vault: depositVault, owner },
        stableCoins.dai.address,
      );
    });

    it('call from address with DEPOSIT_VAULT_ADMIN_ROLE role and add 3 options on a row', async () => {
      const { depositVault, owner, stableCoins, dataFeed } = await loadFixture(
        defaultDeploy,
      );

      await addPaymentTokenTest(
        { vault: depositVault, owner },
        stableCoins.dai,
        dataFeed.address,
        0,
        true,
      );
      await addPaymentTokenTest(
        { vault: depositVault, owner },
        stableCoins.usdc,
        dataFeed.address,
        0,
        true,
      );
      await addPaymentTokenTest(
        { vault: depositVault, owner },
        stableCoins.usdt,
        dataFeed.address,
        0,
        true,
      );

      await removePaymentTokenTest(
        { vault: depositVault, owner },
        stableCoins.dai.address,
      );
      await removePaymentTokenTest(
        { vault: depositVault, owner },
        stableCoins.usdc.address,
      );
      await removePaymentTokenTest(
        { vault: depositVault, owner },
        stableCoins.usdt.address,
      );

      await removePaymentTokenTest(
        { vault: depositVault, owner },
        stableCoins.usdt.address,
        { revertMessage: 'MV: not exists' },
      );
    });
  });

  describe('withdrawToken()', () => {
    it('should fail: call from address without DEPOSIT_VAULT_ADMIN_ROLE role', async () => {
      const { depositVault, regularAccounts, owner } = await loadFixture(
        defaultDeploy,
      );
      await withdrawTest(
        { vault: depositVault, owner },
        ethers.constants.AddressZero,
        0,
        ethers.constants.AddressZero,
        { revertMessage: acErrors.WMAC_HASNT_ROLE, from: regularAccounts[0] },
      );
    });

    it('should fail: when there is no token in vault', async () => {
      const { owner, depositVault, regularAccounts, stableCoins } =
        await loadFixture(defaultDeploy);
      await withdrawTest(
        { vault: depositVault, owner },
        stableCoins.dai,
        1,
        regularAccounts[0],
        { revertMessage: 'ERC20: transfer amount exceeds balance' },
      );
    });

    it('call from address with DEPOSIT_VAULT_ADMIN_ROLE role', async () => {
      const { depositVault, regularAccounts, stableCoins, owner } =
        await loadFixture(defaultDeploy);
      await mintToken(stableCoins.dai, depositVault, 1);
      await withdrawTest(
        { vault: depositVault, owner },
        stableCoins.dai,
        1,
        regularAccounts[0],
      );
    });
  });

  describe('freeFromMinAmount()', async () => {
    it('should fail: call from address without vault admin role', async () => {
      const { depositVault, regularAccounts } = await loadFixture(
        defaultDeploy,
      );
      await expect(
        depositVault
          .connect(regularAccounts[0])
          .freeFromMinAmount(regularAccounts[1].address, true),
      ).to.be.revertedWith('WMAC: hasnt role');
    });
    it('should not fail', async () => {
      const { depositVault, regularAccounts } = await loadFixture(
        defaultDeploy,
      );
      await expect(
        depositVault.freeFromMinAmount(regularAccounts[0].address, true),
      ).to.not.reverted;

      expect(
        await depositVault.isFreeFromMinAmount(regularAccounts[0].address),
      ).to.eq(true);
    });
    it('should fail: already in list', async () => {
      const { depositVault, regularAccounts } = await loadFixture(
        defaultDeploy,
      );
      await expect(
        depositVault.freeFromMinAmount(regularAccounts[0].address, true),
      ).to.not.reverted;

      expect(
        await depositVault.isFreeFromMinAmount(regularAccounts[0].address),
      ).to.eq(true);

      await expect(
        depositVault.freeFromMinAmount(regularAccounts[0].address, true),
      ).to.revertedWith('DV: already free');
    });
  });

  describe('changeTokenAllowance()', () => {
    it('should fail: call from address without DEPOSIT_VAULT_ADMIN_ROLE role', async () => {
      const { depositVault, regularAccounts, owner } = await loadFixture(
        defaultDeploy,
      );
      await changeTokenAllowanceTest(
        { vault: depositVault, owner },
        ethers.constants.AddressZero,
        0,
        { revertMessage: acErrors.WMAC_HASNT_ROLE, from: regularAccounts[0] },
      );
    });
    it('should fail: token not exist', async () => {
      const { depositVault, owner, stableCoins } = await loadFixture(
        defaultDeploy,
      );
      await changeTokenAllowanceTest(
        { vault: depositVault, owner },
        stableCoins.dai.address,
        0,
        { revertMessage: 'MV: token not exists' },
      );
    });
    it('should fail: allowance zero', async () => {
      const { depositVault, owner, stableCoins, dataFeed } = await loadFixture(
        defaultDeploy,
      );
      await addPaymentTokenTest(
        { vault: depositVault, owner },
        stableCoins.dai,
        dataFeed.address,
        0,
        true,
      );
      await changeTokenAllowanceTest(
        { vault: depositVault, owner },
        stableCoins.dai.address,
        0,
        { revertMessage: 'MV: zero allowance' },
      );
    });
    it('should fail: if mint exceed allowance', async () => {
      const {
        depositVault,
        stableCoins,
        owner,
        dataFeed,
        mTBILL,
        mTokenToUsdDataFeed,
      } = await loadFixture(defaultDeploy);
      await mintToken(stableCoins.dai, owner, 100000);
      await approveBase18(owner, stableCoins.dai, depositVault, 100000);
      await addPaymentTokenTest(
        { vault: depositVault, owner },
        stableCoins.dai,
        dataFeed.address,
        0,
        true,
      );
      await changeTokenAllowanceTest(
        { vault: depositVault, owner },
        stableCoins.dai.address,
        100,
      );

      await depositInstantTest(
        { depositVault, owner, mTBILL, mTokenToUsdDataFeed },
        stableCoins.dai,
        99_999,
        {
          revertMessage: 'MV: exceed allowance',
        },
      );

      await depositRequestTest(
        { depositVault, owner, mTBILL, mTokenToUsdDataFeed },
        stableCoins.dai,
        99_999,
        {
          revertMessage: 'MV: exceed allowance',
        },
      );
    });
    it('call from address with DEPOSIT_VAULT_ADMIN_ROLE role', async () => {
      const { depositVault, owner, stableCoins, dataFeed } = await loadFixture(
        defaultDeploy,
      );
      await addPaymentTokenTest(
        { vault: depositVault, owner },
        stableCoins.dai,
        dataFeed.address,
        0,
        true,
      );
      await changeTokenAllowanceTest(
        { vault: depositVault, owner },
        stableCoins.dai.address,
        100000000,
      );
    });
    it('should decrease if allowance < UINT_MAX', async () => {
      const {
        depositVault,
        stableCoins,
        owner,
        dataFeed,
        mTBILL,
        mTokenToUsdDataFeed,
      } = await loadFixture(defaultDeploy);
      await mintToken(stableCoins.dai, owner, 100000);
      await approveBase18(owner, stableCoins.dai, depositVault, 100000);
      await addPaymentTokenTest(
        { vault: depositVault, owner },
        stableCoins.dai,
        dataFeed.address,
        0,
        true,
      );
      await changeTokenAllowanceTest(
        { vault: depositVault, owner },
        stableCoins.dai.address,
        parseUnits('1000'),
      );

      const tokenConfigBefore = await depositVault.tokensConfig(
        stableCoins.dai.address,
      );

      await depositInstantTest(
        { depositVault, owner, mTBILL, mTokenToUsdDataFeed },
        stableCoins.dai,
        999,
      );

      const tokenConfigAfter = await depositVault.tokensConfig(
        stableCoins.dai.address,
      );

      expect(tokenConfigBefore.allowance.sub(tokenConfigAfter.allowance)).eq(
        parseUnits('999'),
      );
    });
    it('should not decrease if allowance = UINT_MAX', async () => {
      const {
        depositVault,
        stableCoins,
        owner,
        dataFeed,
        mTBILL,
        mTokenToUsdDataFeed,
      } = await loadFixture(defaultDeploy);
      await mintToken(stableCoins.dai, owner, 100000);
      await approveBase18(owner, stableCoins.dai, depositVault, 100000);
      await addPaymentTokenTest(
        { vault: depositVault, owner },
        stableCoins.dai,
        dataFeed.address,
        0,
        true,
      );
      await changeTokenAllowanceTest(
        { vault: depositVault, owner },
        stableCoins.dai.address,
        constants.MaxUint256,
      );

      const tokenConfigBefore = await depositVault.tokensConfig(
        stableCoins.dai.address,
      );

      await depositInstantTest(
        { depositVault, owner, mTBILL, mTokenToUsdDataFeed },
        stableCoins.dai,
        999,
      );

      const tokenConfigAfter = await depositVault.tokensConfig(
        stableCoins.dai.address,
      );

      expect(tokenConfigBefore.allowance).eq(tokenConfigAfter.allowance);
    });
  });

  describe('changeTokenFee()', () => {
    it('should fail: call from address without REDEMPTION_VAULT_ADMIN_ROLE role', async () => {
      const { depositVault, regularAccounts, owner } = await loadFixture(
        defaultDeploy,
      );
      await changeTokenFeeTest(
        { vault: depositVault, owner },
        ethers.constants.AddressZero,
        0,
        { revertMessage: acErrors.WMAC_HASNT_ROLE, from: regularAccounts[0] },
      );
    });
    it('should fail: token not exist', async () => {
      const { depositVault, owner, stableCoins } = await loadFixture(
        defaultDeploy,
      );
      await changeTokenFeeTest(
        { vault: depositVault, owner },
        stableCoins.dai.address,
        0,
        { revertMessage: 'MV: token not exists' },
      );
    });
    it('should fail: fee > 100%', async () => {
      const { depositVault, owner, stableCoins, dataFeed } = await loadFixture(
        defaultDeploy,
      );
      await addPaymentTokenTest(
        { vault: depositVault, owner },
        stableCoins.dai,
        dataFeed.address,
        0,
        true,
      );
      await changeTokenFeeTest(
        { vault: depositVault, owner },
        stableCoins.dai.address,
        10001,
        { revertMessage: 'fee > 100%' },
      );
    });
    it('call from address with REDEMPTION_VAULT_ADMIN_ROLE role', async () => {
      const { depositVault, owner, stableCoins, dataFeed } = await loadFixture(
        defaultDeploy,
      );
      await addPaymentTokenTest(
        { vault: depositVault, owner },
        stableCoins.dai,
        dataFeed.address,
        0,
        true,
      );
      await changeTokenFeeTest(
        { vault: depositVault, owner },
        stableCoins.dai.address,
        100,
      );
    });
  });

  describe('depositInstant()', async () => {
    it('should fail: when there is no token in vault', async () => {
      const { owner, depositVault, stableCoins, mTBILL, mTokenToUsdDataFeed } =
        await loadFixture(defaultDeploy);

      await depositInstantTest(
        { depositVault, owner, mTBILL, mTokenToUsdDataFeed },
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
        depositVault,
        stableCoins,
        mTBILL,
        dataFeed,
        mTokenToUsdDataFeed,
      } = await loadFixture(defaultDeploy);
      await addPaymentTokenTest(
        { vault: depositVault, owner },
        stableCoins.dai,
        dataFeed.address,
        0,
        true,
      );
      await depositInstantTest(
        { depositVault, owner, mTBILL, mTokenToUsdDataFeed },
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
        depositVault,
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
        depositVault,
        100,
      );
      await addPaymentTokenTest(
        { vault: depositVault, owner },
        stableCoins.dai,
        dataFeed.address,
        0,
        true,
      );
      const selector = encodeFnSelector(
        'depositInstant(address,uint256,uint256,bytes32)',
      );
      await pauseVaultFn(depositVault, selector);
      await depositInstantTest(
        { depositVault, owner, mTBILL, mTokenToUsdDataFeed },
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
        depositVault,
        stableCoins,
        mTBILL,
        dataFeed,
        mTokenToUsdDataFeed,
      } = await loadFixture(defaultDeploy);

      await addPaymentTokenTest(
        { vault: depositVault, owner },
        stableCoins.dai,
        dataFeed.address,
        0,
        true,
      );
      await setMinAmountTest({ vault: depositVault, owner }, 10);
      await depositInstantTest(
        { depositVault, owner, mTBILL, mTokenToUsdDataFeed },
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
        depositVault,
        stableCoins,
        mTBILL,
        dataFeed,
        mTokenToUsdDataFeed,
      } = await loadFixture(defaultDeploy);

      await mintToken(stableCoins.dai, owner, 100);
      await addPaymentTokenTest(
        { vault: depositVault, owner },
        stableCoins.dai,
        dataFeed.address,
        0,
        true,
      );
      await setMinAmountTest({ vault: depositVault, owner }, 10);
      await depositInstantTest(
        { depositVault, owner, mTBILL, mTokenToUsdDataFeed },
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
        depositVault,
        stableCoins,
        mTBILL,
        dataFeed,
        mTokenToUsdDataFeed,
      } = await loadFixture(defaultDeploy);

      await approveBase18(owner, stableCoins.dai, depositVault, 100);
      await addPaymentTokenTest(
        { vault: depositVault, owner },
        stableCoins.dai,
        dataFeed.address,
        0,
        true,
      );
      await setMinAmountTest({ vault: depositVault, owner }, 10);
      await depositInstantTest(
        { depositVault, owner, mTBILL, mTokenToUsdDataFeed },
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
        depositVault,
        stableCoins,
        mTBILL,
        dataFeed,
        mockedAggregator,
        mTokenToUsdDataFeed,
      } = await loadFixture(defaultDeploy);

      await approveBase18(owner, stableCoins.dai, depositVault, 10);
      await addPaymentTokenTest(
        { vault: depositVault, owner },
        stableCoins.dai,
        dataFeed.address,
        0,
        true,
      );
      await mintToken(stableCoins.dai, owner, 100_000);
      await setRoundData({ mockedAggregator }, 0);
      await depositInstantTest(
        { depositVault, owner, mTBILL, mTokenToUsdDataFeed },
        stableCoins.dai,
        1,
        {
          revertMessage: 'DF: feed is deprecated',
        },
      );
    });

    it('should fail: call for amount < minAmountToDepositTest', async () => {
      const {
        depositVault,
        mockedAggregator,
        owner,
        mTBILL,
        stableCoins,
        dataFeed,
        mTokenToUsdDataFeed,
      } = await loadFixture(defaultDeploy);
      await addPaymentTokenTest(
        { vault: depositVault, owner },
        stableCoins.dai,
        dataFeed.address,
        0,
        true,
      );
      await setRoundData({ mockedAggregator }, 1);

      await mintToken(stableCoins.dai, owner, 100_000);
      await approveBase18(owner, stableCoins.dai, depositVault, 100_000);

      await setMinAmountToDepositTest({ depositVault, owner }, 100_000);
      await setInstantDailyLimitTest({ vault: depositVault, owner }, 150_000);

      await depositInstantTest(
        { depositVault, owner, mTBILL, mTokenToUsdDataFeed },
        stableCoins.dai,
        99_999,
        {
          revertMessage: 'DV: mint amount < min',
        },
      );
    });

    it('should fail: call for amount < minAmount', async () => {
      const {
        depositVault,
        mockedAggregator,
        owner,
        mTBILL,
        stableCoins,
        dataFeed,
        mTokenToUsdDataFeed,
      } = await loadFixture(defaultDeploy);
      await addPaymentTokenTest(
        { vault: depositVault, owner },
        stableCoins.dai,
        dataFeed.address,
        0,
        true,
      );
      await setRoundData({ mockedAggregator }, 1);

      await mintToken(stableCoins.dai, owner, 100_000);
      await approveBase18(owner, stableCoins.dai, depositVault, 100_000);

      await setMinAmountToDepositTest({ depositVault, owner }, 100_000);
      await setInstantDailyLimitTest({ vault: depositVault, owner }, 150_000);

      await depositInstantTest(
        { depositVault, owner, mTBILL, mTokenToUsdDataFeed },
        stableCoins.dai,
        99,
        {
          revertMessage: 'DV: mToken amount < min',
        },
      );
    });

    it('should fail: if exceed allowance of deposit for token', async () => {
      const {
        depositVault,
        mockedAggregator,
        owner,
        mTBILL,
        stableCoins,
        dataFeed,
        mTokenToUsdDataFeed,
      } = await loadFixture(defaultDeploy);
      await addPaymentTokenTest(
        { vault: depositVault, owner },
        stableCoins.dai,
        dataFeed.address,
        0,
        true,
      );
      await setRoundData({ mockedAggregator }, 4);

      await mintToken(stableCoins.dai, owner, 100_000);
      await changeTokenAllowanceTest(
        { vault: depositVault, owner },
        stableCoins.dai.address,
        100,
      );
      await approveBase18(owner, stableCoins.dai, depositVault, 100_000);

      await depositInstantTest(
        { depositVault, owner, mTBILL, mTokenToUsdDataFeed },
        stableCoins.dai,
        99_999,
        {
          revertMessage: 'MV: exceed allowance',
        },
      );
    });

    it('should fail: if mint limit exceeded', async () => {
      const {
        depositVault,
        mockedAggregator,
        owner,
        mTBILL,
        stableCoins,
        dataFeed,
        mTokenToUsdDataFeed,
      } = await loadFixture(defaultDeploy);
      await addPaymentTokenTest(
        { vault: depositVault, owner },
        stableCoins.dai,
        dataFeed.address,
        0,
        true,
      );
      await setRoundData({ mockedAggregator }, 4);

      await mintToken(stableCoins.dai, owner, 100_000);
      await setInstantDailyLimitTest({ vault: depositVault, owner }, 1000);

      await approveBase18(owner, stableCoins.dai, depositVault, 100_000);

      await depositInstantTest(
        { depositVault, owner, mTBILL, mTokenToUsdDataFeed },
        stableCoins.dai,
        99_999,
        {
          revertMessage: 'MV: exceed limit',
        },
      );
    });

    it('should fail: if min receive amount greater then actual', async () => {
      const {
        depositVault,
        mockedAggregator,
        owner,
        mTBILL,
        stableCoins,
        dataFeed,
        mTokenToUsdDataFeed,
      } = await loadFixture(defaultDeploy);
      await addPaymentTokenTest(
        { vault: depositVault, owner },
        stableCoins.dai,
        dataFeed.address,
        0,
        true,
      );
      await setRoundData({ mockedAggregator }, 4);

      await mintToken(stableCoins.dai, owner, 100_000);

      await approveBase18(owner, stableCoins.dai, depositVault, 100_000);

      await depositInstantTest(
        {
          depositVault,
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
        depositVault,
        stableCoins,
        mTBILL,
        dataFeed,
        mTokenToUsdDataFeed,
      } = await loadFixture(defaultDeploy);

      await mintToken(stableCoins.dai, owner, 100);
      await approveBase18(owner, stableCoins.dai, depositVault, 100);
      await addPaymentTokenTest(
        { vault: depositVault, owner },
        stableCoins.dai,
        dataFeed.address,
        10000,
        true,
      );
      await depositInstantTest(
        { depositVault, owner, mTBILL, mTokenToUsdDataFeed },
        stableCoins.dai,
        100,
        {
          revertMessage: 'DV: mToken amount < min',
        },
      );

      await removePaymentTokenTest(
        { vault: depositVault, owner },
        stableCoins.dai,
      );
      await addPaymentTokenTest(
        { vault: depositVault, owner },
        stableCoins.dai,
        dataFeed.address,
        0,
        true,
      );
      await setInstantFeeTest({ vault: depositVault, owner }, 10000);
      await depositInstantTest(
        { depositVault, owner, mTBILL, mTokenToUsdDataFeed },
        stableCoins.dai,
        100,
        { revertMessage: 'DV: mToken amount < min' },
      );
    });

    it('should fail: greenlist enabled and user not in greenlist ', async () => {
      const { owner, depositVault, stableCoins, mTBILL, mTokenToUsdDataFeed } =
        await loadFixture(defaultDeploy);

      await depositVault.setGreenlistEnable(true);

      await depositInstantTest(
        { depositVault, owner, mTBILL, mTokenToUsdDataFeed },
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
        depositVault,
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
        { depositVault, owner, mTBILL, mTokenToUsdDataFeed },
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
        depositVault,
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
        { depositVault, owner, mTBILL, mTokenToUsdDataFeed },
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
        depositVault,
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

      await depositVault.setGreenlistEnable(true);

      await depositInstantTest(
        { depositVault, owner, mTBILL, mTokenToUsdDataFeed, customRecipient },
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
        depositVault,
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
        { depositVault, owner, mTBILL, mTokenToUsdDataFeed, customRecipient },
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
        depositVault,
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
        { depositVault, owner, mTBILL, mTokenToUsdDataFeed, customRecipient },
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
        depositVault,
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
        depositVault,
        100,
      );
      await addPaymentTokenTest(
        { vault: depositVault, owner },
        stableCoins.dai,
        dataFeed.address,
        0,
        true,
      );
      const selector = encodeFnSelector(
        'depositInstant(address,uint256,uint256,bytes32,address)',
      );
      await pauseVaultFn(depositVault, selector);
      await depositInstantTest(
        { depositVault, owner, mTBILL, mTokenToUsdDataFeed, customRecipient },
        stableCoins.dai,
        100,
        {
          from: regularAccounts[0],
          revertMessage: 'Pausable: fn paused',
        },
      );
    });

    it('should fail: when 0 supply cap is left', async () => {
      const {
        owner,
        depositVault,
        stableCoins,
        mTBILL,
        dataFeed,
        mTokenToUsdDataFeed,
        regularAccounts,
        customRecipient,
        mockedAggregator,
        mockedAggregatorMToken,
      } = await loadFixture(defaultDeploy);
      await mintToken(stableCoins.dai, regularAccounts[0], 100);
      await approveBase18(
        regularAccounts[0],
        stableCoins.dai,
        depositVault,
        100,
      );
      await addPaymentTokenTest(
        { vault: depositVault, owner },
        stableCoins.dai,
        dataFeed.address,
        0,
        true,
      );

      await setMaxSupplyCapTest({ depositVault, owner }, 99);
      await setRoundData({ mockedAggregator }, 1);
      await setRoundData({ mockedAggregator: mockedAggregatorMToken }, 1);
      await setInstantFeeTest({ vault: depositVault, owner }, 0);
      await setMinAmountTest({ vault: depositVault, owner }, 0);

      await depositInstantTest(
        { depositVault, owner, mTBILL, mTokenToUsdDataFeed, customRecipient },
        stableCoins.dai,
        99,
        {
          from: regularAccounts[0],
        },
      );

      await depositInstantTest(
        { depositVault, owner, mTBILL, mTokenToUsdDataFeed, customRecipient },
        stableCoins.dai,
        1,
        {
          from: regularAccounts[0],
          revertMessage: 'DV: max supply cap exceeded',
        },
      );
    });

    it('should fail: when 10 supply cap is left and try to mint 11', async () => {
      const {
        owner,
        depositVault,
        stableCoins,
        mTBILL,
        dataFeed,
        mTokenToUsdDataFeed,
        regularAccounts,
        customRecipient,
        mockedAggregator,
        mockedAggregatorMToken,
      } = await loadFixture(defaultDeploy);
      await mintToken(stableCoins.dai, regularAccounts[0], 101);
      await approveBase18(
        regularAccounts[0],
        stableCoins.dai,
        depositVault,
        101,
      );
      await addPaymentTokenTest(
        { vault: depositVault, owner },
        stableCoins.dai,
        dataFeed.address,
        0,
        true,
      );

      await setMaxSupplyCapTest({ depositVault, owner }, 100);
      await setRoundData({ mockedAggregator }, 1);
      await setRoundData({ mockedAggregator: mockedAggregatorMToken }, 1);
      await setInstantFeeTest({ vault: depositVault, owner }, 0);
      await setMinAmountTest({ vault: depositVault, owner }, 0);

      await depositInstantTest(
        { depositVault, owner, mTBILL, mTokenToUsdDataFeed, customRecipient },
        stableCoins.dai,
        90,
        {
          from: regularAccounts[0],
        },
      );

      await depositInstantTest(
        { depositVault, owner, mTBILL, mTokenToUsdDataFeed, customRecipient },
        stableCoins.dai,
        11,
        {
          from: regularAccounts[0],
          revertMessage: 'DV: max supply cap exceeded',
        },
      );
    });

    it('when 10 supply cap is left and try to mint 10', async () => {
      const {
        owner,
        depositVault,
        stableCoins,
        mTBILL,
        dataFeed,
        mTokenToUsdDataFeed,
        regularAccounts,
        customRecipient,
        mockedAggregator,
        mockedAggregatorMToken,
      } = await loadFixture(defaultDeploy);
      await mintToken(stableCoins.dai, regularAccounts[0], 100);
      await approveBase18(
        regularAccounts[0],
        stableCoins.dai,
        depositVault,
        100,
      );
      await addPaymentTokenTest(
        { vault: depositVault, owner },
        stableCoins.dai,
        dataFeed.address,
        0,
        true,
      );

      await setMaxSupplyCapTest({ depositVault, owner }, 100);
      await setRoundData({ mockedAggregator }, 1);
      await setRoundData({ mockedAggregator: mockedAggregatorMToken }, 1);
      await setInstantFeeTest({ vault: depositVault, owner }, 0);
      await setMinAmountTest({ vault: depositVault, owner }, 0);

      await depositInstantTest(
        { depositVault, owner, mTBILL, mTokenToUsdDataFeed, customRecipient },
        stableCoins.dai,
        90,
        {
          from: regularAccounts[0],
        },
      );

      await depositInstantTest(
        { depositVault, owner, mTBILL, mTokenToUsdDataFeed, customRecipient },
        stableCoins.dai,
        10,
        {
          from: regularAccounts[0],
        },
      );
    });

    it('deposit 100 DAI, greenlist enabled and user in greenlist ', async () => {
      const {
        owner,
        depositVault,
        stableCoins,
        mTBILL,
        greenListableTester,
        mTokenToUsdDataFeed,
        accessControl,
        regularAccounts,
        dataFeed,
      } = await loadFixture(defaultDeploy);

      await depositVault.setGreenlistEnable(true);

      await greenList(
        { greenlistable: greenListableTester, accessControl, owner },
        regularAccounts[0],
      );

      await mintToken(stableCoins.dai, regularAccounts[0], 100);
      await approveBase18(
        regularAccounts[0],
        stableCoins.dai,
        depositVault,
        100,
      );
      await addPaymentTokenTest(
        { vault: depositVault, owner },
        stableCoins.dai,
        dataFeed.address,
        0,
        true,
      );
      await setMinAmountTest({ vault: depositVault, owner }, 10);

      await depositInstantTest(
        { depositVault, owner, mTBILL, mTokenToUsdDataFeed },
        stableCoins.dai,
        100,
        {
          from: regularAccounts[0],
        },
      );
    });

    it('deposit 100 DAI when 10% growth is applied', async () => {
      const {
        owner,
        depositVault,
        customFeedGrowth,
        stableCoins,
        mTBILL,
        greenListableTester,
        mTokenToUsdDataFeed,
        accessControl,
        regularAccounts,
        dataFeed,
      } = await loadFixture(defaultDeploy);

      await depositVault.setGreenlistEnable(true);

      await mTokenToUsdDataFeed.changeAggregator(customFeedGrowth.address);
      await setRoundDataGrowth({ owner, customFeedGrowth }, 1, -1000, 10);

      await greenList(
        { greenlistable: greenListableTester, accessControl, owner },
        regularAccounts[0],
      );

      await mintToken(stableCoins.dai, regularAccounts[0], 100);
      await approveBase18(
        regularAccounts[0],
        stableCoins.dai,
        depositVault,
        100,
      );
      await addPaymentTokenTest(
        { vault: depositVault, owner },
        stableCoins.dai,
        dataFeed.address,
        0,
        true,
      );
      await setMinAmountTest({ vault: depositVault, owner }, 10);

      await depositInstantTest(
        {
          depositVault,
          owner,
          mTBILL,
          mTokenToUsdDataFeed,
          expectedMintAmount: parseUnits('98.999684191007430686', 18),
        },
        stableCoins.dai,
        100,
        {
          from: regularAccounts[0],
        },
      );
    });

    it('deposit 100 DAI when -10% growth is applied', async () => {
      const {
        owner,
        depositVault,
        customFeedGrowth,
        stableCoins,
        mTBILL,
        greenListableTester,
        mTokenToUsdDataFeed,
        accessControl,
        regularAccounts,
        dataFeed,
      } = await loadFixture(defaultDeploy);

      await depositVault.setGreenlistEnable(true);

      await setMinGrowthApr({ owner, customFeedGrowth }, -10);
      await mTokenToUsdDataFeed.changeAggregator(customFeedGrowth.address);
      await setRoundDataGrowth({ owner, customFeedGrowth }, 1, -1000, -10);

      await greenList(
        { greenlistable: greenListableTester, accessControl, owner },
        regularAccounts[0],
      );

      await mintToken(stableCoins.dai, regularAccounts[0], 100);
      await approveBase18(
        regularAccounts[0],
        stableCoins.dai,
        depositVault,
        100,
      );
      await addPaymentTokenTest(
        { vault: depositVault, owner },
        stableCoins.dai,
        dataFeed.address,
        0,
        true,
      );
      await setMinAmountTest({ vault: depositVault, owner }, 10);

      await depositInstantTest(
        {
          depositVault,
          owner,
          mTBILL,
          mTokenToUsdDataFeed,
          expectedMintAmount: parseUnits('99.000315811007437113', 18),
        },
        stableCoins.dai,
        100,
        {
          from: regularAccounts[0],
        },
      );
    });

    it('deposit 100 DAI, greenlist enabled and user in greenlist, tokenIn not stablecoin', async () => {
      const {
        owner,
        depositVault,
        stableCoins,
        mTBILL,
        greenListableTester,
        mTokenToUsdDataFeed,
        accessControl,
        regularAccounts,
        dataFeed,
      } = await loadFixture(defaultDeploy);

      await depositVault.setGreenlistEnable(true);

      await greenList(
        { greenlistable: greenListableTester, accessControl, owner },
        regularAccounts[0],
      );

      await mintToken(stableCoins.dai, regularAccounts[0], 100);
      await approveBase18(
        regularAccounts[0],
        stableCoins.dai,
        depositVault,
        100,
      );
      await addPaymentTokenTest(
        { vault: depositVault, owner },
        stableCoins.dai,
        dataFeed.address,
        0,
        false,
      );
      await setMinAmountTest({ vault: depositVault, owner }, 10);

      await depositInstantTest(
        { depositVault, owner, mTBILL, mTokenToUsdDataFeed },
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
        depositVault,
        stableCoins,
        mTBILL,
        dataFeed,
        mTokenToUsdDataFeed,
      } = await loadFixture(defaultDeploy);

      await mintToken(stableCoins.dai, owner, 100);
      await approveBase18(owner, stableCoins.dai, depositVault, 100);
      await addPaymentTokenTest(
        { vault: depositVault, owner },
        stableCoins.dai,
        dataFeed.address,
        0,
        true,
      );
      await setRoundData({ mockedAggregator }, 1.03);
      await setRoundData({ mockedAggregator: mockedAggregatorMToken }, 5);
      await setMinAmountTest({ vault: depositVault, owner }, 10);

      await depositInstantTest(
        { depositVault, owner, mTBILL, mTokenToUsdDataFeed },
        stableCoins.dai,
        100,
      );
    });

    it('deposit 100 DAI, when price of stable is 1.03$ and mToken price is 5$ and token fee 1%', async () => {
      const {
        owner,
        mockedAggregator,
        mockedAggregatorMToken,
        depositVault,
        stableCoins,
        mTBILL,
        dataFeed,
        mTokenToUsdDataFeed,
      } = await loadFixture(defaultDeploy);

      await mintToken(stableCoins.dai, owner, 100);
      await approveBase18(owner, stableCoins.dai, depositVault, 100);
      await addPaymentTokenTest(
        { vault: depositVault, owner },
        stableCoins.dai,
        dataFeed.address,
        100,
        true,
      );
      await setRoundData({ mockedAggregator }, 1.03);
      await setRoundData({ mockedAggregator: mockedAggregatorMToken }, 5);
      await setMinAmountTest({ vault: depositVault, owner }, 10);
      await depositInstantTest(
        { depositVault, owner, mTBILL, mTokenToUsdDataFeed },
        stableCoins.dai,
        100,
      );
    });

    it('deposit 100 DAI, when price of stable is 1.03$ and mToken price is 5$ without checking of minDepositAmount', async () => {
      const {
        owner,
        mockedAggregator,
        mockedAggregatorMToken,
        depositVault,
        stableCoins,
        mTBILL,
        dataFeed,
        mTokenToUsdDataFeed,
      } = await loadFixture(defaultDeploy);

      await mintToken(stableCoins.dai, owner, 100);
      await approveBase18(owner, stableCoins.dai, depositVault, 100);
      await addPaymentTokenTest(
        { vault: depositVault, owner },
        stableCoins.dai,
        dataFeed.address,
        100,
        true,
      );
      await setRoundData({ mockedAggregator }, 1.03);
      await setRoundData({ mockedAggregator: mockedAggregatorMToken }, 5);
      await depositVault.freeFromMinAmount(owner.address, true);
      await depositInstantTest(
        { depositVault, owner, mTBILL, mTokenToUsdDataFeed },
        stableCoins.dai,
        100,
      );
    });

    it('deposit 100 DAI, when price of stable is 1.03$ and mToken price is 5$ and user in waivedFeeRestriction', async () => {
      const {
        owner,
        mockedAggregator,
        mockedAggregatorMToken,
        depositVault,
        stableCoins,
        mTBILL,
        dataFeed,
        mTokenToUsdDataFeed,
      } = await loadFixture(defaultDeploy);

      await mintToken(stableCoins.dai, owner, 100);
      await approveBase18(owner, stableCoins.dai, depositVault, 100);
      await addPaymentTokenTest(
        { vault: depositVault, owner },
        stableCoins.dai,
        dataFeed.address,
        100,
        true,
      );
      await setRoundData({ mockedAggregator }, 1.03);
      await setRoundData({ mockedAggregator: mockedAggregatorMToken }, 5);
      await addWaivedFeeAccountTest(
        { vault: depositVault, owner },
        owner.address,
      );
      await setMinAmountTest({ vault: depositVault, owner }, 10);
      await depositInstantTest(
        { depositVault, owner, mTBILL, mTokenToUsdDataFeed, waivedFee: true },
        stableCoins.dai,
        100,
      );
    });

    it('deposit 100 DAI (custom recipient overload)', async () => {
      const {
        owner,
        depositVault,
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
        depositVault,
        100,
      );
      await addPaymentTokenTest(
        { vault: depositVault, owner },
        stableCoins.dai,
        dataFeed.address,
        0,
        true,
      );
      await setMinAmountTest({ vault: depositVault, owner }, 10);

      await depositInstantTest(
        {
          depositVault,
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
        depositVault,
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
        depositVault,
        100,
      );
      await addPaymentTokenTest(
        { vault: depositVault, owner },
        stableCoins.dai,
        dataFeed.address,
        0,
        true,
      );
      await setMinAmountTest({ vault: depositVault, owner }, 10);

      await depositInstantTest(
        {
          depositVault,
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
        depositVault,
        stableCoins,
        mTBILL,
        mTokenToUsdDataFeed,
        regularAccounts,
        dataFeed,
        customRecipient,
      } = await loadFixture(defaultDeploy);

      await pauseVaultFn(
        depositVault,
        encodeFnSelector('depositInstant(address,uint256,uint256,bytes32)'),
      );

      await mintToken(stableCoins.dai, regularAccounts[0], 100);
      await approveBase18(
        regularAccounts[0],
        stableCoins.dai,
        depositVault,
        100,
      );
      await addPaymentTokenTest(
        { vault: depositVault, owner },
        stableCoins.dai,
        dataFeed.address,
        0,
        true,
      );
      await setMinAmountTest({ vault: depositVault, owner }, 10);

      await depositInstantTest(
        {
          depositVault,
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
        depositVault,
        stableCoins,
        mTBILL,
        mTokenToUsdDataFeed,
        regularAccounts,
        dataFeed,
      } = await loadFixture(defaultDeploy);

      await pauseVaultFn(
        depositVault,
        encodeFnSelector(
          'depositInstant(address,uint256,uint256,bytes32,address)',
        ),
      );

      await mintToken(stableCoins.dai, regularAccounts[0], 100);
      await approveBase18(
        regularAccounts[0],
        stableCoins.dai,
        depositVault,
        100,
      );
      await addPaymentTokenTest(
        { vault: depositVault, owner },
        stableCoins.dai,
        dataFeed.address,
        0,
        true,
      );
      await setMinAmountTest({ vault: depositVault, owner }, 10);

      await depositInstantTest(
        {
          depositVault,
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
      const { owner, depositVault, stableCoins, mTBILL, mTokenToUsdDataFeed } =
        await loadFixture(defaultDeploy);

      await depositRequestTest(
        { depositVault, owner, mTBILL, mTokenToUsdDataFeed },
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
        depositVault,
        stableCoins,
        mTBILL,
        dataFeed,
        mTokenToUsdDataFeed,
      } = await loadFixture(defaultDeploy);
      await addPaymentTokenTest(
        { vault: depositVault, owner },
        stableCoins.dai,
        dataFeed.address,
        0,
        true,
      );
      await depositRequestTest(
        { depositVault, owner, mTBILL, mTokenToUsdDataFeed },
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
        depositVault,
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
        depositVault,
        100,
      );
      await addPaymentTokenTest(
        { vault: depositVault, owner },
        stableCoins.dai,
        dataFeed.address,
        0,
        true,
      );
      const selector = encodeFnSelector(
        'depositRequest(address,uint256,bytes32)',
      );
      await pauseVaultFn(depositVault, selector);
      await depositRequestTest(
        { depositVault, owner, mTBILL, mTokenToUsdDataFeed },
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
        depositVault,
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
        depositVault,
        100,
      );
      await addPaymentTokenTest(
        { vault: depositVault, owner },
        stableCoins.dai,
        dataFeed.address,
        0,
        true,
      );
      const selector = encodeFnSelector(
        'depositRequest(address,uint256,bytes32,address)',
      );
      await pauseVaultFn(depositVault, selector);
      await depositRequestTest(
        { depositVault, owner, mTBILL, mTokenToUsdDataFeed, customRecipient },
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
        depositVault,
        stableCoins,
        mTBILL,
        dataFeed,
        mTokenToUsdDataFeed,
      } = await loadFixture(defaultDeploy);

      await addPaymentTokenTest(
        { vault: depositVault, owner },
        stableCoins.dai,
        dataFeed.address,
        0,
        true,
      );
      await setMinAmountTest({ vault: depositVault, owner }, 10);
      await depositRequestTest(
        { depositVault, owner, mTBILL, mTokenToUsdDataFeed },
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
        depositVault,
        stableCoins,
        mTBILL,
        dataFeed,
        mTokenToUsdDataFeed,
      } = await loadFixture(defaultDeploy);

      await mintToken(stableCoins.dai, owner, 100);
      await addPaymentTokenTest(
        { vault: depositVault, owner },
        stableCoins.dai,
        dataFeed.address,
        0,
        true,
      );
      await setMinAmountTest({ vault: depositVault, owner }, 10);
      await depositRequestTest(
        { depositVault, owner, mTBILL, mTokenToUsdDataFeed },
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
        depositVault,
        stableCoins,
        mTBILL,
        dataFeed,
        mTokenToUsdDataFeed,
      } = await loadFixture(defaultDeploy);

      await approveBase18(owner, stableCoins.dai, depositVault, 100);
      await addPaymentTokenTest(
        { vault: depositVault, owner },
        stableCoins.dai,
        dataFeed.address,
        0,
        true,
      );
      await setMinAmountTest({ vault: depositVault, owner }, 10);
      await depositRequestTest(
        { depositVault, owner, mTBILL, mTokenToUsdDataFeed },
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
        depositVault,
        stableCoins,
        mTBILL,
        dataFeed,
        mockedAggregator,
        mTokenToUsdDataFeed,
      } = await loadFixture(defaultDeploy);

      await approveBase18(owner, stableCoins.dai, depositVault, 10);
      await addPaymentTokenTest(
        { vault: depositVault, owner },
        stableCoins.dai,
        dataFeed.address,
        0,
        true,
      );
      await mintToken(stableCoins.dai, owner, 100_000);
      await setRoundData({ mockedAggregator }, 0);
      await depositRequestTest(
        { depositVault, owner, mTBILL, mTokenToUsdDataFeed },
        stableCoins.dai,
        1,
        {
          revertMessage: 'DF: feed is deprecated',
        },
      );
    });

    it('should fail: call for amount < minAmountToDepositTest', async () => {
      const {
        depositVault,
        mockedAggregator,
        owner,
        mTBILL,
        stableCoins,
        dataFeed,
        mTokenToUsdDataFeed,
      } = await loadFixture(defaultDeploy);
      await addPaymentTokenTest(
        { vault: depositVault, owner },
        stableCoins.dai,
        dataFeed.address,
        0,
        true,
      );
      await setRoundData({ mockedAggregator }, 1);

      await mintToken(stableCoins.dai, owner, 100_000);
      await approveBase18(owner, stableCoins.dai, depositVault, 100_000);

      await setMinAmountToDepositTest({ depositVault, owner }, 100_000);

      await depositRequestTest(
        { depositVault, owner, mTBILL, mTokenToUsdDataFeed },
        stableCoins.dai,
        99_999,
        {
          revertMessage: 'DV: mint amount < min',
        },
      );
    });

    it('should fail: if exceed allowance of deposit for token', async () => {
      const {
        depositVault,
        mockedAggregator,
        owner,
        mTBILL,
        stableCoins,
        dataFeed,
        mTokenToUsdDataFeed,
      } = await loadFixture(defaultDeploy);
      await addPaymentTokenTest(
        { vault: depositVault, owner },
        stableCoins.dai,
        dataFeed.address,
        0,
        true,
      );
      await setRoundData({ mockedAggregator }, 4);

      await mintToken(stableCoins.dai, owner, 100_000);
      await changeTokenAllowanceTest(
        { vault: depositVault, owner },
        stableCoins.dai.address,
        100,
      );
      await approveBase18(owner, stableCoins.dai, depositVault, 100_000);

      await depositRequestTest(
        { depositVault, owner, mTBILL, mTokenToUsdDataFeed },
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
        depositVault,
        stableCoins,
        mTBILL,
        dataFeed,
        mTokenToUsdDataFeed,
      } = await loadFixture(defaultDeploy);

      await mintToken(stableCoins.dai, owner, 100);
      await approveBase18(owner, stableCoins.dai, depositVault, 100);
      await addPaymentTokenTest(
        { vault: depositVault, owner },
        stableCoins.dai,
        dataFeed.address,
        10000,
        true,
      );
      await depositRequestTest(
        { depositVault, owner, mTBILL, mTokenToUsdDataFeed },
        stableCoins.dai,
        100,
        {
          revertMessage: 'DV: mToken amount < min',
        },
      );
    });

    it('should fail: greenlist enabled and user not in greenlist ', async () => {
      const { owner, depositVault, stableCoins, mTBILL, mTokenToUsdDataFeed } =
        await loadFixture(defaultDeploy);

      await depositVault.setGreenlistEnable(true);

      await depositRequestTest(
        { depositVault, owner, mTBILL, mTokenToUsdDataFeed },
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
        depositVault,
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
        { depositVault, owner, mTBILL, mTokenToUsdDataFeed },
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
        depositVault,
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
        { depositVault, owner, mTBILL, mTokenToUsdDataFeed },
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
        depositVault,
        stableCoins,
        mTBILL,
        mTokenToUsdDataFeed,
        greenListableTester,
        accessControl,
        customRecipient,
      } = await loadFixture(defaultDeploy);

      await depositVault.setGreenlistEnable(true);

      await greenList(
        { greenlistable: greenListableTester, accessControl, owner },
        owner,
      );
      await depositRequestTest(
        { depositVault, owner, mTBILL, mTokenToUsdDataFeed, customRecipient },
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
        depositVault,
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
        { depositVault, owner, mTBILL, mTokenToUsdDataFeed, customRecipient },
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
        depositVault,
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
        { depositVault, owner, mTBILL, mTokenToUsdDataFeed, customRecipient },
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
        depositVault,
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
        depositVault,
        100,
      );
      await addPaymentTokenTest(
        { vault: depositVault, owner },
        stableCoins.dai,
        dataFeed.address,
        0,
        true,
      );
      await setMinAmountTest({ vault: depositVault, owner }, 10);

      await depositRequestTest(
        { depositVault, owner, mTBILL, mTokenToUsdDataFeed },
        stableCoins.dai,
        100,
        {
          from: regularAccounts[0],
        },
      );
    });

    it('deposit 100 DAI when 10% growth is applied', async () => {
      const {
        owner,
        depositVault,
        stableCoins,
        mTBILL,
        greenListableTester,
        mTokenToUsdDataFeed,
        accessControl,
        regularAccounts,
        dataFeed,
        customFeedGrowth,
      } = await loadFixture(defaultDeploy);

      await mTokenToUsdDataFeed.changeAggregator(customFeedGrowth.address);
      await setRoundDataGrowth({ owner, customFeedGrowth }, 1, -1000, 10);

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
        depositVault,
        100,
      );
      await addPaymentTokenTest(
        { vault: depositVault, owner },
        stableCoins.dai,
        dataFeed.address,
        0,
        true,
      );
      await setMinAmountTest({ vault: depositVault, owner }, 10);

      await depositRequestTest(
        { depositVault, owner, mTBILL, mTokenToUsdDataFeed },
        stableCoins.dai,
        100,
        {
          from: regularAccounts[0],
        },
      );
    });

    it('deposit 100 DAI when -10% growth is applied', async () => {
      const {
        owner,
        depositVault,
        stableCoins,
        mTBILL,
        greenListableTester,
        mTokenToUsdDataFeed,
        accessControl,
        regularAccounts,
        dataFeed,
        customFeedGrowth,
      } = await loadFixture(defaultDeploy);

      await mTokenToUsdDataFeed.changeAggregator(customFeedGrowth.address);
      await setMinGrowthApr({ owner, customFeedGrowth }, -10);
      await setRoundDataGrowth({ owner, customFeedGrowth }, 1, -1000, -10);

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
        depositVault,
        100,
      );
      await addPaymentTokenTest(
        { vault: depositVault, owner },
        stableCoins.dai,
        dataFeed.address,
        0,
        true,
      );
      await setMinAmountTest({ vault: depositVault, owner }, 10);

      await depositRequestTest(
        { depositVault, owner, mTBILL, mTokenToUsdDataFeed },
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
        depositVault,
        stableCoins,
        mTBILL,
        dataFeed,
        mTokenToUsdDataFeed,
      } = await loadFixture(defaultDeploy);

      await mintToken(stableCoins.dai, owner, 100);
      await approveBase18(owner, stableCoins.dai, depositVault, 100);
      await addPaymentTokenTest(
        { vault: depositVault, owner },
        stableCoins.dai,
        dataFeed.address,
        0,
        true,
      );
      await setMinAmountTest({ vault: depositVault, owner }, 10);
      await setRoundData({ mockedAggregator }, 1.03);
      await setRoundData({ mockedAggregator: mockedAggregatorMToken }, 5);

      await depositRequestTest(
        { depositVault, owner, mTBILL, mTokenToUsdDataFeed },
        stableCoins.dai,
        100,
      );
    });

    it('deposit request with 100 DAI, when price of stable is 1.03$ and mToken price is 5$ and token fee 1%', async () => {
      const {
        owner,
        mockedAggregator,
        mockedAggregatorMToken,
        depositVault,
        stableCoins,
        mTBILL,
        dataFeed,
        mTokenToUsdDataFeed,
      } = await loadFixture(defaultDeploy);

      await mintToken(stableCoins.dai, owner, 100);
      await approveBase18(owner, stableCoins.dai, depositVault, 100);
      await addPaymentTokenTest(
        { vault: depositVault, owner },
        stableCoins.dai,
        dataFeed.address,
        100,
        true,
      );
      await setMinAmountTest({ vault: depositVault, owner }, 10);
      await setRoundData({ mockedAggregator }, 1.03);
      await setRoundData({ mockedAggregator: mockedAggregatorMToken }, 5);
      await depositRequestTest(
        { depositVault, owner, mTBILL, mTokenToUsdDataFeed },
        stableCoins.dai,
        100,
      );
    });

    it('deposit request with 100 DAI, when price of stable is 1.03$ and mToken price is 5$ without checking of minDepositAmount', async () => {
      const {
        owner,
        mockedAggregator,
        mockedAggregatorMToken,
        depositVault,
        stableCoins,
        mTBILL,
        dataFeed,
        mTokenToUsdDataFeed,
      } = await loadFixture(defaultDeploy);

      await mintToken(stableCoins.dai, owner, 100);
      await approveBase18(owner, stableCoins.dai, depositVault, 100);
      await addPaymentTokenTest(
        { vault: depositVault, owner },
        stableCoins.dai,
        dataFeed.address,
        100,
        true,
      );
      await setRoundData({ mockedAggregator }, 1.03);
      await setRoundData({ mockedAggregator: mockedAggregatorMToken }, 5);
      await depositVault.freeFromMinAmount(owner.address, true);
      await depositRequestTest(
        { depositVault, owner, mTBILL, mTokenToUsdDataFeed },
        stableCoins.dai,
        100,
      );
    });

    it('deposit request with 100 DAI, when price of stable is 1.03$ and mToken price is 5$ and user in waivedFeeRestriction', async () => {
      const {
        owner,
        mockedAggregator,
        mockedAggregatorMToken,
        depositVault,
        stableCoins,
        mTBILL,
        dataFeed,
        mTokenToUsdDataFeed,
      } = await loadFixture(defaultDeploy);

      await mintToken(stableCoins.dai, owner, 100);
      await approveBase18(owner, stableCoins.dai, depositVault, 100);
      await addPaymentTokenTest(
        { vault: depositVault, owner },
        stableCoins.dai,
        dataFeed.address,
        100,
        true,
      );
      await setMinAmountTest({ vault: depositVault, owner }, 10);
      await setRoundData({ mockedAggregator }, 1.03);
      await setRoundData({ mockedAggregator: mockedAggregatorMToken }, 5);
      await addWaivedFeeAccountTest(
        { vault: depositVault, owner },
        owner.address,
      );
      await depositRequestTest(
        { depositVault, owner, mTBILL, mTokenToUsdDataFeed, waivedFee: true },
        stableCoins.dai,
        100,
      );
    });

    it('deposit 100 (custom recipient overload)', async () => {
      const {
        owner,
        depositVault,
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
        depositVault,
        100,
      );
      await addPaymentTokenTest(
        { vault: depositVault, owner },
        stableCoins.dai,
        dataFeed.address,
        0,
        true,
      );
      await setMinAmountTest({ vault: depositVault, owner }, 10);

      await depositRequestTest(
        { depositVault, owner, mTBILL, mTokenToUsdDataFeed, customRecipient },
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
        depositVault,
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
        depositVault,
        100,
      );
      await addPaymentTokenTest(
        { vault: depositVault, owner },
        stableCoins.dai,
        dataFeed.address,
        0,
        true,
      );
      await setMinAmountTest({ vault: depositVault, owner }, 10);

      await depositRequestTest(
        {
          depositVault,
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
        depositVault,
        stableCoins,
        mTBILL,
        mTokenToUsdDataFeed,
        regularAccounts,
        dataFeed,
        customRecipient,
      } = await loadFixture(defaultDeploy);

      await pauseVaultFn(
        depositVault,
        encodeFnSelector('depositRequest(address,uint256,bytes32)'),
      );

      await mintToken(stableCoins.dai, regularAccounts[0], 100);
      await approveBase18(
        regularAccounts[0],
        stableCoins.dai,
        depositVault,
        100,
      );
      await addPaymentTokenTest(
        { vault: depositVault, owner },
        stableCoins.dai,
        dataFeed.address,
        0,
        true,
      );
      await setMinAmountTest({ vault: depositVault, owner }, 10);

      await depositRequestTest(
        { depositVault, owner, mTBILL, mTokenToUsdDataFeed, customRecipient },
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
        depositVault,
        stableCoins,
        mTBILL,
        mTokenToUsdDataFeed,
        regularAccounts,
        dataFeed,
      } = await loadFixture(defaultDeploy);

      await pauseVaultFn(
        depositVault,
        encodeFnSelector('depositRequest(address,uint256,bytes32,address)'),
      );

      await mintToken(stableCoins.dai, regularAccounts[0], 100);
      await approveBase18(
        regularAccounts[0],
        stableCoins.dai,
        depositVault,
        100,
      );
      await addPaymentTokenTest(
        { vault: depositVault, owner },
        stableCoins.dai,
        dataFeed.address,
        0,
        true,
      );
      await setMinAmountTest({ vault: depositVault, owner }, 10);

      await depositRequestTest(
        { depositVault, owner, mTBILL, mTokenToUsdDataFeed },
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
      const { depositVault, regularAccounts, mTokenToUsdDataFeed, mTBILL } =
        await loadFixture(defaultDeploy);
      await approveRequestTest(
        {
          depositVault,
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
        depositVault,
        stableCoins,
        mTBILL,
        dataFeed,
        mTokenToUsdDataFeed,
      } = await loadFixture(defaultDeploy);
      await addPaymentTokenTest(
        { vault: depositVault, owner },
        stableCoins.dai,
        dataFeed.address,
        0,
        true,
      );
      await approveRequestTest(
        { depositVault, owner, mTBILL, mTokenToUsdDataFeed },
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
        depositVault,
        stableCoins,
        mTBILL,
        dataFeed,
        mTokenToUsdDataFeed,
      } = await loadFixture(defaultDeploy);

      await mintToken(stableCoins.dai, owner, 100);
      await approveBase18(owner, stableCoins.dai, depositVault, 100);
      await addPaymentTokenTest(
        { vault: depositVault, owner },
        stableCoins.dai,
        dataFeed.address,
        0,
        true,
      );
      await setRoundData({ mockedAggregator }, 1.03);
      await setRoundData({ mockedAggregator: mockedAggregatorMToken }, 5);
      await setMinAmountTest({ vault: depositVault, owner }, 10);

      await depositRequestTest(
        { depositVault, owner, mTBILL, mTokenToUsdDataFeed },
        stableCoins.dai,
        100,
      );
      const requestId = 0;

      await approveRequestTest(
        { depositVault, owner, mTBILL, mTokenToUsdDataFeed },
        requestId,
        parseUnits('5'),
      );
      await approveRequestTest(
        { depositVault, owner, mTBILL, mTokenToUsdDataFeed },
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
        depositVault,
        stableCoins,
        mTBILL,
        dataFeed,
        mTokenToUsdDataFeed,
      } = await loadFixture(defaultDeploy);

      await mintToken(stableCoins.dai, owner, 100);
      await approveBase18(owner, stableCoins.dai, depositVault, 100);
      await addPaymentTokenTest(
        { vault: depositVault, owner },
        stableCoins.dai,
        dataFeed.address,
        0,
        true,
      );
      await setRoundData({ mockedAggregator }, 1.03);
      await setRoundData({ mockedAggregator: mockedAggregatorMToken }, 5);
      await setMinAmountTest({ vault: depositVault, owner }, 10);

      await depositRequestTest(
        { depositVault, owner, mTBILL, mTokenToUsdDataFeed },
        stableCoins.dai,
        100,
      );
      const requestId = 0;

      await approveRequestTest(
        { depositVault, owner, mTBILL, mTokenToUsdDataFeed },
        requestId,
        parseUnits('5'),
      );
    });
  });

  describe('safeApproveRequest()', async () => {
    it('should fail: call from address without vault admin role', async () => {
      const { depositVault, regularAccounts, mTokenToUsdDataFeed, mTBILL } =
        await loadFixture(defaultDeploy);
      await safeApproveRequestTest(
        {
          depositVault,
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
        depositVault,
        stableCoins,
        mTBILL,
        dataFeed,
        mTokenToUsdDataFeed,
      } = await loadFixture(defaultDeploy);
      await addPaymentTokenTest(
        { vault: depositVault, owner },
        stableCoins.dai,
        dataFeed.address,
        0,
        true,
      );
      await safeApproveRequestTest(
        {
          depositVault,
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
        depositVault,
        stableCoins,
        mTBILL,
        dataFeed,
        mTokenToUsdDataFeed,
        mockedAggregator,
        mockedAggregatorMToken,
      } = await loadFixture(defaultDeploy);
      await mintToken(stableCoins.dai, owner, 100);
      await approveBase18(owner, stableCoins.dai, depositVault, 100);
      await addPaymentTokenTest(
        { vault: depositVault, owner },
        stableCoins.dai,
        dataFeed.address,
        0,
        true,
      );
      await setRoundData({ mockedAggregator }, 1.03);
      await setRoundData({ mockedAggregator: mockedAggregatorMToken }, 5);
      await setMinAmountTest({ vault: depositVault, owner }, 10);

      await depositRequestTest(
        { depositVault, owner, mTBILL, mTokenToUsdDataFeed },
        stableCoins.dai,
        100,
      );
      const requestId = 0;
      await safeApproveRequestTest(
        {
          depositVault,
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
        depositVault,
        stableCoins,
        mTBILL,
        dataFeed,
        mTokenToUsdDataFeed,
        mockedAggregator,
        mockedAggregatorMToken,
      } = await loadFixture(defaultDeploy);
      await mintToken(stableCoins.dai, owner, 100);
      await approveBase18(owner, stableCoins.dai, depositVault, 100);
      await addPaymentTokenTest(
        { vault: depositVault, owner },
        stableCoins.dai,
        dataFeed.address,
        0,
        true,
      );
      await setRoundData({ mockedAggregator }, 1.03);
      await setRoundData({ mockedAggregator: mockedAggregatorMToken }, 5);
      await setMinAmountTest({ vault: depositVault, owner }, 10);

      await depositRequestTest(
        { depositVault, owner, mTBILL, mTokenToUsdDataFeed },
        stableCoins.dai,
        100,
      );
      const requestId = 0;
      await safeApproveRequestTest(
        {
          depositVault,
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
        depositVault,
        stableCoins,
        mTBILL,
        dataFeed,
        mTokenToUsdDataFeed,
      } = await loadFixture(defaultDeploy);

      await mintToken(stableCoins.dai, owner, 100);
      await approveBase18(owner, stableCoins.dai, depositVault, 100);
      await addPaymentTokenTest(
        { vault: depositVault, owner },
        stableCoins.dai,
        dataFeed.address,
        0,
        true,
      );
      await setRoundData({ mockedAggregator }, 1.03);
      await setRoundData({ mockedAggregator: mockedAggregatorMToken }, 5);
      await setMinAmountTest({ vault: depositVault, owner }, 10);

      await depositRequestTest(
        { depositVault, owner, mTBILL, mTokenToUsdDataFeed },
        stableCoins.dai,
        100,
      );
      const requestId = 0;

      await safeApproveRequestTest(
        { depositVault, owner, mTBILL, mTokenToUsdDataFeed },
        requestId,
        parseUnits('5.000001'),
      );
      await safeApproveRequestTest(
        { depositVault, owner, mTBILL, mTokenToUsdDataFeed },
        requestId,
        parseUnits('5.000001'),
        { revertMessage: 'DV: request not pending' },
      );
    });

    it('should fail: when 0 supply cap is left', async () => {
      const {
        owner,
        depositVault,
        stableCoins,
        mTBILL,
        dataFeed,
        mTokenToUsdDataFeed,
        regularAccounts,
        customRecipient,
        mockedAggregator,
        mockedAggregatorMToken,
      } = await loadFixture(defaultDeploy);
      await mintToken(stableCoins.dai, regularAccounts[0], 100);
      await approveBase18(
        regularAccounts[0],
        stableCoins.dai,
        depositVault,
        100,
      );
      await addPaymentTokenTest(
        { vault: depositVault, owner },
        stableCoins.dai,
        dataFeed.address,
        0,
        true,
      );

      await setMaxSupplyCapTest({ depositVault, owner }, 99);
      await setRoundData({ mockedAggregator }, 1);
      await setRoundData({ mockedAggregator: mockedAggregatorMToken }, 1);
      await setMinAmountTest({ vault: depositVault, owner }, 0);

      await depositInstantTest(
        { depositVault, owner, mTBILL, mTokenToUsdDataFeed, customRecipient },
        stableCoins.dai,
        99,
        {
          from: regularAccounts[0],
        },
      );

      await depositRequestTest(
        { depositVault, owner, mTBILL, mTokenToUsdDataFeed, customRecipient },
        stableCoins.dai,
        1,
        {
          from: regularAccounts[0],
        },
      );

      await safeApproveRequestTest(
        { depositVault, owner, mTBILL, mTokenToUsdDataFeed },
        0,
        parseUnits('1'),
        {
          revertMessage: 'DV: max supply cap exceeded',
        },
      );
    });

    it('should fail: when 10 supply cap is left and try to mint 11', async () => {
      const {
        owner,
        depositVault,
        stableCoins,
        mTBILL,
        dataFeed,
        mTokenToUsdDataFeed,
        regularAccounts,
        customRecipient,
        mockedAggregator,
        mockedAggregatorMToken,
      } = await loadFixture(defaultDeploy);
      await mintToken(stableCoins.dai, regularAccounts[0], 101);
      await approveBase18(
        regularAccounts[0],
        stableCoins.dai,
        depositVault,
        101,
      );
      await addPaymentTokenTest(
        { vault: depositVault, owner },
        stableCoins.dai,
        dataFeed.address,
        0,
        true,
      );

      await setMaxSupplyCapTest({ depositVault, owner }, 100);
      await setRoundData({ mockedAggregator }, 1);
      await setRoundData({ mockedAggregator: mockedAggregatorMToken }, 1);
      await setMinAmountTest({ vault: depositVault, owner }, 0);

      await depositInstantTest(
        { depositVault, owner, mTBILL, mTokenToUsdDataFeed, customRecipient },
        stableCoins.dai,
        90,
        {
          from: regularAccounts[0],
        },
      );

      await depositRequestTest(
        { depositVault, owner, mTBILL, mTokenToUsdDataFeed, customRecipient },
        stableCoins.dai,
        11,
        {
          from: regularAccounts[0],
        },
      );

      await safeApproveRequestTest(
        { depositVault, owner, mTBILL, mTokenToUsdDataFeed },
        0,
        parseUnits('1'),
        {
          revertMessage: 'DV: max supply cap exceeded',
        },
      );
    });

    it('when 10 supply cap is left and try to mint 10', async () => {
      const {
        owner,
        depositVault,
        stableCoins,
        mTBILL,
        dataFeed,
        mTokenToUsdDataFeed,
        regularAccounts,
        customRecipient,
        mockedAggregator,
        mockedAggregatorMToken,
      } = await loadFixture(defaultDeploy);
      await mintToken(stableCoins.dai, regularAccounts[0], 100);
      await approveBase18(
        regularAccounts[0],
        stableCoins.dai,
        depositVault,
        100,
      );
      await addPaymentTokenTest(
        { vault: depositVault, owner },
        stableCoins.dai,
        dataFeed.address,
        0,
        true,
      );

      await setMaxSupplyCapTest({ depositVault, owner }, 100);
      await setRoundData({ mockedAggregator }, 1);
      await setRoundData({ mockedAggregator: mockedAggregatorMToken }, 1);
      await setInstantFeeTest({ vault: depositVault, owner }, 0);
      await setMinAmountTest({ vault: depositVault, owner }, 0);

      await depositInstantTest(
        { depositVault, owner, mTBILL, mTokenToUsdDataFeed, customRecipient },
        stableCoins.dai,
        90,
        {
          from: regularAccounts[0],
        },
      );

      await depositRequestTest(
        { depositVault, owner, mTBILL, mTokenToUsdDataFeed, customRecipient },
        stableCoins.dai,
        10,
        {
          from: regularAccounts[0],
        },
      );

      await safeApproveRequestTest(
        { depositVault, owner, mTBILL, mTokenToUsdDataFeed },
        0,
        parseUnits('1'),
      );
    });

    it('approve request from vaut admin account', async () => {
      const {
        owner,
        mockedAggregator,
        mockedAggregatorMToken,
        depositVault,
        stableCoins,
        mTBILL,
        dataFeed,
        mTokenToUsdDataFeed,
      } = await loadFixture(defaultDeploy);

      await mintToken(stableCoins.dai, owner, 100);
      await approveBase18(owner, stableCoins.dai, depositVault, 100);
      await addPaymentTokenTest(
        { vault: depositVault, owner },
        stableCoins.dai,
        dataFeed.address,
        0,
        true,
      );
      await setRoundData({ mockedAggregator }, 1.03);
      await setRoundData({ mockedAggregator: mockedAggregatorMToken }, 5);
      await setMinAmountTest({ vault: depositVault, owner }, 10);

      await depositRequestTest(
        { depositVault, owner, mTBILL, mTokenToUsdDataFeed },
        stableCoins.dai,
        100,
      );
      const requestId = 0;

      await safeApproveRequestTest(
        { depositVault, owner, mTBILL, mTokenToUsdDataFeed },
        requestId,
        parseUnits('5.000000001'),
      );
    });
  });

  describe('safeBulkApproveRequest() (custom price overload)', async () => {
    it('should fail: call from address without vault admin role', async () => {
      const { depositVault, regularAccounts, mTokenToUsdDataFeed, mTBILL } =
        await loadFixture(defaultDeploy);
      await safeBulkApproveRequestTest(
        {
          depositVault,
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
        depositVault,
        stableCoins,
        mTBILL,
        dataFeed,
        mTokenToUsdDataFeed,
      } = await loadFixture(defaultDeploy);
      await addPaymentTokenTest(
        { vault: depositVault, owner },
        stableCoins.dai,
        dataFeed.address,
        0,
        true,
      );
      await safeBulkApproveRequestTest(
        {
          depositVault,
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
        depositVault,
        stableCoins,
        mTBILL,
        dataFeed,
        mTokenToUsdDataFeed,
        mockedAggregator,
        mockedAggregatorMToken,
      } = await loadFixture(defaultDeploy);
      await mintToken(stableCoins.dai, owner, 100);
      await approveBase18(owner, stableCoins.dai, depositVault, 100);
      await addPaymentTokenTest(
        { vault: depositVault, owner },
        stableCoins.dai,
        dataFeed.address,
        0,
        true,
      );
      await setRoundData({ mockedAggregator }, 1.03);
      await setRoundData({ mockedAggregator: mockedAggregatorMToken }, 5);
      await setMinAmountTest({ vault: depositVault, owner }, 10);

      await depositRequestTest(
        { depositVault, owner, mTBILL, mTokenToUsdDataFeed },
        stableCoins.dai,
        100,
      );
      const requestId = 0;
      await safeBulkApproveRequestTest(
        {
          depositVault,
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
        depositVault,
        stableCoins,
        mTBILL,
        dataFeed,
        mTokenToUsdDataFeed,
        mockedAggregator,
        mockedAggregatorMToken,
      } = await loadFixture(defaultDeploy);
      await mintToken(stableCoins.dai, owner, 100);
      await approveBase18(owner, stableCoins.dai, depositVault, 100);
      await addPaymentTokenTest(
        { vault: depositVault, owner },
        stableCoins.dai,
        dataFeed.address,
        0,
        true,
      );
      await setRoundData({ mockedAggregator }, 1.03);
      await setRoundData({ mockedAggregator: mockedAggregatorMToken }, 5);
      await setMinAmountTest({ vault: depositVault, owner }, 10);

      await depositRequestTest(
        { depositVault, owner, mTBILL, mTokenToUsdDataFeed },
        stableCoins.dai,
        100,
      );
      const requestId = 0;
      await safeBulkApproveRequestTest(
        {
          depositVault,
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
        depositVault,
        stableCoins,
        mTBILL,
        dataFeed,
        mTokenToUsdDataFeed,
      } = await loadFixture(defaultDeploy);

      await mintToken(stableCoins.dai, owner, 100);
      await approveBase18(owner, stableCoins.dai, depositVault, 100);
      await addPaymentTokenTest(
        { vault: depositVault, owner },
        stableCoins.dai,
        dataFeed.address,
        0,
        true,
      );
      await setRoundData({ mockedAggregator }, 1.03);
      await setRoundData({ mockedAggregator: mockedAggregatorMToken }, 5);
      await setMinAmountTest({ vault: depositVault, owner }, 10);

      await depositRequestTest(
        { depositVault, owner, mTBILL, mTokenToUsdDataFeed },
        stableCoins.dai,
        100,
      );
      const requestId = 0;

      await safeBulkApproveRequestTest(
        { depositVault, owner, mTBILL, mTokenToUsdDataFeed },
        [{ id: requestId }],
        parseUnits('5.000001'),
      );
      await safeBulkApproveRequestTest(
        { depositVault, owner, mTBILL, mTokenToUsdDataFeed },
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
        depositVault,
        stableCoins,
        mTBILL,
        dataFeed,
        mTokenToUsdDataFeed,
      } = await loadFixture(defaultDeploy);

      await mintToken(stableCoins.dai, owner, 200);
      await approveBase18(owner, stableCoins.dai, depositVault, 200);
      await addPaymentTokenTest(
        { vault: depositVault, owner },
        stableCoins.dai,
        dataFeed.address,
        0,
        true,
      );
      await setRoundData({ mockedAggregator }, 1.03);
      await setRoundData({ mockedAggregator: mockedAggregatorMToken }, 5);
      await setMinAmountTest({ vault: depositVault, owner }, 10);

      await depositRequestTest(
        { depositVault, owner, mTBILL, mTokenToUsdDataFeed },
        stableCoins.dai,
        100,
      );

      await depositRequestTest(
        { depositVault, owner, mTBILL, mTokenToUsdDataFeed },
        stableCoins.dai,
        100,
      );

      await safeApproveRequestTest(
        { depositVault, owner, mTBILL, mTokenToUsdDataFeed },
        0,
        parseUnits('5.000001'),
      );

      await safeBulkApproveRequestTest(
        { depositVault, owner, mTBILL, mTokenToUsdDataFeed },
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
        depositVault,
        stableCoins,
        mTBILL,
        dataFeed,
        mTokenToUsdDataFeed,
      } = await loadFixture(defaultDeploy);

      await mintToken(stableCoins.dai, owner, 200);
      await approveBase18(owner, stableCoins.dai, depositVault, 200);
      await addPaymentTokenTest(
        { vault: depositVault, owner },
        stableCoins.dai,
        dataFeed.address,
        0,
        true,
      );
      await setRoundData({ mockedAggregator }, 1.03);
      await setRoundData({ mockedAggregator: mockedAggregatorMToken }, 5);
      await setMinAmountTest({ vault: depositVault, owner }, 10);

      await depositRequestTest(
        { depositVault, owner, mTBILL, mTokenToUsdDataFeed },
        stableCoins.dai,
        100,
      );

      await depositRequestTest(
        { depositVault, owner, mTBILL, mTokenToUsdDataFeed },
        stableCoins.dai,
        100,
      );

      await safeApproveRequestTest(
        { depositVault, owner, mTBILL, mTokenToUsdDataFeed },
        0,
        parseUnits('5.000001'),
      );

      await safeBulkApproveRequestTest(
        { depositVault, owner, mTBILL, mTokenToUsdDataFeed },
        [{ id: 1 }, { id: 1 }],
        parseUnits('5.000001'),
        { revertMessage: 'DV: request not pending' },
      );
    });

    it('approve 2 requests when second one exceeds supply cap', async () => {
      const {
        owner,
        mockedAggregator,
        mockedAggregatorMToken,
        depositVault,
        stableCoins,
        mTBILL,
        dataFeed,
        mTokenToUsdDataFeed,
      } = await loadFixture(defaultDeploy);

      await mintToken(stableCoins.dai, owner, 100);
      await approveBase18(owner, stableCoins.dai, depositVault, 100);
      await addPaymentTokenTest(
        { vault: depositVault, owner },
        stableCoins.dai,
        dataFeed.address,
        0,
        true,
      );
      await setRoundData({ mockedAggregator }, 1);
      await setRoundData({ mockedAggregator: mockedAggregatorMToken }, 1);
      await setMinAmountTest({ vault: depositVault, owner }, 0);
      await setMaxSupplyCapTest({ depositVault, owner }, 50);

      await depositRequestTest(
        { depositVault, owner, mTBILL, mTokenToUsdDataFeed },
        stableCoins.dai,
        50,
      );

      await depositRequestTest(
        { depositVault, owner, mTBILL, mTokenToUsdDataFeed },
        stableCoins.dai,
        50,
      );

      await safeBulkApproveRequestTest(
        { depositVault, owner, mTBILL, mTokenToUsdDataFeed },
        [{ id: 0 }, { id: 1, expectedToExecute: false }],
        parseUnits('1'),
      );
    });

    it('approve 1 request from vaut admin account', async () => {
      const {
        owner,
        mockedAggregator,
        mockedAggregatorMToken,
        depositVault,
        stableCoins,
        mTBILL,
        dataFeed,
        mTokenToUsdDataFeed,
      } = await loadFixture(defaultDeploy);

      await mintToken(stableCoins.dai, owner, 100);
      await approveBase18(owner, stableCoins.dai, depositVault, 100);
      await addPaymentTokenTest(
        { vault: depositVault, owner },
        stableCoins.dai,
        dataFeed.address,
        0,
        true,
      );
      await setRoundData({ mockedAggregator }, 1.03);
      await setRoundData({ mockedAggregator: mockedAggregatorMToken }, 5);
      await setMinAmountTest({ vault: depositVault, owner }, 10);

      await depositRequestTest(
        { depositVault, owner, mTBILL, mTokenToUsdDataFeed },
        stableCoins.dai,
        100,
      );
      const requestId = 0;

      await safeBulkApproveRequestTest(
        { depositVault, owner, mTBILL, mTokenToUsdDataFeed },
        [{ id: requestId }],
        parseUnits('5.000000001'),
      );
    });

    it('approve 2 requests from vaut admin account', async () => {
      const {
        owner,
        mockedAggregator,
        mockedAggregatorMToken,
        depositVault,
        stableCoins,
        mTBILL,
        dataFeed,
        mTokenToUsdDataFeed,
      } = await loadFixture(defaultDeploy);

      await mintToken(stableCoins.dai, owner, 200);
      await approveBase18(owner, stableCoins.dai, depositVault, 200);
      await addPaymentTokenTest(
        { vault: depositVault, owner },
        stableCoins.dai,
        dataFeed.address,
        0,
        true,
      );
      await setRoundData({ mockedAggregator }, 1.03);
      await setRoundData({ mockedAggregator: mockedAggregatorMToken }, 5);
      await setMinAmountTest({ vault: depositVault, owner }, 10);

      await depositRequestTest(
        { depositVault, owner, mTBILL, mTokenToUsdDataFeed },
        stableCoins.dai,
        100,
      );

      await depositRequestTest(
        { depositVault, owner, mTBILL, mTokenToUsdDataFeed },
        stableCoins.dai,
        100,
      );

      await safeBulkApproveRequestTest(
        { depositVault, owner, mTBILL, mTokenToUsdDataFeed },
        [{ id: 0 }, { id: 1 }],
        parseUnits('5.000000001'),
      );
    });

    it('approve 10 requests from vaut admin account', async () => {
      const {
        owner,
        mockedAggregator,
        mockedAggregatorMToken,
        depositVault,
        stableCoins,
        mTBILL,
        dataFeed,
        mTokenToUsdDataFeed,
      } = await loadFixture(defaultDeploy);

      await mintToken(stableCoins.dai, owner, 1000);
      await approveBase18(owner, stableCoins.dai, depositVault, 1000);
      await addPaymentTokenTest(
        { vault: depositVault, owner },
        stableCoins.dai,
        dataFeed.address,
        0,
        true,
      );
      await setRoundData({ mockedAggregator }, 1.03);
      await setRoundData({ mockedAggregator: mockedAggregatorMToken }, 5);
      await setMinAmountTest({ vault: depositVault, owner }, 10);

      for (let i = 0; i < 10; i++) {
        await depositRequestTest(
          { depositVault, owner, mTBILL, mTokenToUsdDataFeed },
          stableCoins.dai,
          100,
        );
      }

      await safeBulkApproveRequestTest(
        { depositVault, owner, mTBILL, mTokenToUsdDataFeed },
        Array.from({ length: 10 }, (_, i) => ({ id: i })),
        parseUnits('5.000000001'),
      );
    });
  });

  describe('safeBulkApproveRequest() (current price overload)', async () => {
    it('should fail: call from address without vault admin role', async () => {
      const { depositVault, regularAccounts, mTokenToUsdDataFeed, mTBILL } =
        await loadFixture(defaultDeploy);
      await safeBulkApproveRequestTest(
        {
          depositVault,
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
        depositVault,
        stableCoins,
        mTBILL,
        dataFeed,
        mTokenToUsdDataFeed,
      } = await loadFixture(defaultDeploy);
      await addPaymentTokenTest(
        { vault: depositVault, owner },
        stableCoins.dai,
        dataFeed.address,
        0,
        true,
      );
      await safeBulkApproveRequestTest(
        {
          depositVault,
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
        depositVault,
        stableCoins,
        mTBILL,
        dataFeed,
        mTokenToUsdDataFeed,
        mockedAggregator,
        mockedAggregatorMToken,
      } = await loadFixture(defaultDeploy);
      await mintToken(stableCoins.dai, owner, 100);
      await approveBase18(owner, stableCoins.dai, depositVault, 100);
      await addPaymentTokenTest(
        { vault: depositVault, owner },
        stableCoins.dai,
        dataFeed.address,
        0,
        true,
      );
      await setRoundData({ mockedAggregator }, 1.03);
      await setRoundData({ mockedAggregator: mockedAggregatorMToken }, 5);
      await setMinAmountTest({ vault: depositVault, owner }, 10);

      await depositRequestTest(
        { depositVault, owner, mTBILL, mTokenToUsdDataFeed },
        stableCoins.dai,
        100,
      );
      await setRoundData({ mockedAggregator: mockedAggregatorMToken }, 10);

      const requestId = 0;
      await safeBulkApproveRequestTest(
        {
          depositVault,
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
        depositVault,
        stableCoins,
        mTBILL,
        dataFeed,
        mTokenToUsdDataFeed,
        mockedAggregator,
        mockedAggregatorMToken,
      } = await loadFixture(defaultDeploy);
      await mintToken(stableCoins.dai, owner, 100);
      await approveBase18(owner, stableCoins.dai, depositVault, 100);
      await addPaymentTokenTest(
        { vault: depositVault, owner },
        stableCoins.dai,
        dataFeed.address,
        0,
        true,
      );
      await setRoundData({ mockedAggregator }, 1.03);
      await setRoundData({ mockedAggregator: mockedAggregatorMToken }, 5);
      await setMinAmountTest({ vault: depositVault, owner }, 10);

      await depositRequestTest(
        { depositVault, owner, mTBILL, mTokenToUsdDataFeed },
        stableCoins.dai,
        100,
      );
      await setRoundData({ mockedAggregator: mockedAggregatorMToken }, 3);

      const requestId = 0;
      await safeBulkApproveRequestTest(
        {
          depositVault,
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
        depositVault,
        stableCoins,
        mTBILL,
        dataFeed,
        mTokenToUsdDataFeed,
      } = await loadFixture(defaultDeploy);

      await mintToken(stableCoins.dai, owner, 100);
      await approveBase18(owner, stableCoins.dai, depositVault, 100);
      await addPaymentTokenTest(
        { vault: depositVault, owner },
        stableCoins.dai,
        dataFeed.address,
        0,
        true,
      );
      await setRoundData({ mockedAggregator }, 1.03);
      await setRoundData({ mockedAggregator: mockedAggregatorMToken }, 5);
      await setMinAmountTest({ vault: depositVault, owner }, 10);

      await depositRequestTest(
        { depositVault, owner, mTBILL, mTokenToUsdDataFeed },
        stableCoins.dai,
        100,
      );
      const requestId = 0;

      await safeBulkApproveRequestTest(
        { depositVault, owner, mTBILL, mTokenToUsdDataFeed },
        [{ id: requestId }],
        undefined,
      );
      await safeBulkApproveRequestTest(
        { depositVault, owner, mTBILL, mTokenToUsdDataFeed },
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
        depositVault,
        stableCoins,
        mTBILL,
        dataFeed,
        mTokenToUsdDataFeed,
      } = await loadFixture(defaultDeploy);

      await mintToken(stableCoins.dai, owner, 200);
      await approveBase18(owner, stableCoins.dai, depositVault, 200);
      await addPaymentTokenTest(
        { vault: depositVault, owner },
        stableCoins.dai,
        dataFeed.address,
        0,
        true,
      );
      await setRoundData({ mockedAggregator }, 1.03);
      await setRoundData({ mockedAggregator: mockedAggregatorMToken }, 5);
      await setMinAmountTest({ vault: depositVault, owner }, 10);

      await depositRequestTest(
        { depositVault, owner, mTBILL, mTokenToUsdDataFeed },
        stableCoins.dai,
        100,
      );

      await depositRequestTest(
        { depositVault, owner, mTBILL, mTokenToUsdDataFeed },
        stableCoins.dai,
        100,
      );

      await safeBulkApproveRequestTest(
        { depositVault, owner, mTBILL, mTokenToUsdDataFeed },
        [{ id: 0 }],
        undefined,
      );

      await safeBulkApproveRequestTest(
        { depositVault, owner, mTBILL, mTokenToUsdDataFeed },
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
        depositVault,
        stableCoins,
        mTBILL,
        dataFeed,
        mTokenToUsdDataFeed,
      } = await loadFixture(defaultDeploy);

      await mintToken(stableCoins.dai, owner, 200);
      await approveBase18(owner, stableCoins.dai, depositVault, 200);
      await addPaymentTokenTest(
        { vault: depositVault, owner },
        stableCoins.dai,
        dataFeed.address,
        0,
        true,
      );
      await setRoundData({ mockedAggregator }, 1.03);
      await setRoundData({ mockedAggregator: mockedAggregatorMToken }, 5);
      await setMinAmountTest({ vault: depositVault, owner }, 10);

      await depositRequestTest(
        { depositVault, owner, mTBILL, mTokenToUsdDataFeed },
        stableCoins.dai,
        100,
      );

      await depositRequestTest(
        { depositVault, owner, mTBILL, mTokenToUsdDataFeed },
        stableCoins.dai,
        100,
      );

      await safeBulkApproveRequestTest(
        { depositVault, owner, mTBILL, mTokenToUsdDataFeed },
        [{ id: 0 }],
        undefined,
      );

      await safeBulkApproveRequestTest(
        { depositVault, owner, mTBILL, mTokenToUsdDataFeed },
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
        depositVault,
        stableCoins,
        mTBILL,
        dataFeed,
        mTokenToUsdDataFeed,
      } = await loadFixture(defaultDeploy);

      await mintToken(stableCoins.dai, owner, 100);
      await approveBase18(owner, stableCoins.dai, depositVault, 100);
      await addPaymentTokenTest(
        { vault: depositVault, owner },
        stableCoins.dai,
        dataFeed.address,
        0,
        true,
      );
      await setRoundData({ mockedAggregator }, 1.03);
      await setRoundData({ mockedAggregator: mockedAggregatorMToken }, 5);
      await setMinAmountTest({ vault: depositVault, owner }, 10);

      await depositRequestTest(
        { depositVault, owner, mTBILL, mTokenToUsdDataFeed },
        stableCoins.dai,
        100,
      );
      const requestId = 0;

      await safeBulkApproveRequestTest(
        { depositVault, owner, mTBILL, mTokenToUsdDataFeed },
        [{ id: requestId }],
        undefined,
      );
    });

    it('approve 1 request from vaut admin account when growth is applied', async () => {
      const {
        owner,
        mockedAggregator,
        depositVault,
        stableCoins,
        mTBILL,
        dataFeed,
        mTokenToUsdDataFeed,
        customFeedGrowth,
      } = await loadFixture(defaultDeploy);

      await mintToken(stableCoins.dai, owner, 100);
      await approveBase18(owner, stableCoins.dai, depositVault, 100);
      await addPaymentTokenTest(
        { vault: depositVault, owner },
        stableCoins.dai,
        dataFeed.address,
        0,
        true,
      );
      await setRoundData({ mockedAggregator }, 1.03);
      await setMinAmountTest({ vault: depositVault, owner }, 10);

      await setRoundDataGrowth({ owner, customFeedGrowth }, 1, -1000, 5);
      await mTokenToUsdDataFeed.changeAggregator(customFeedGrowth.address);

      await depositRequestTest(
        { depositVault, owner, mTBILL, mTokenToUsdDataFeed },
        stableCoins.dai,
        100,
      );
      const requestId = 0;

      await safeBulkApproveRequestTest(
        {
          depositVault,
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
        depositVault,
        stableCoins,
        mTBILL,
        dataFeed,
        mTokenToUsdDataFeed,
      } = await loadFixture(defaultDeploy);

      await mintToken(stableCoins.dai, owner, 200);
      await approveBase18(owner, stableCoins.dai, depositVault, 200);
      await addPaymentTokenTest(
        { vault: depositVault, owner },
        stableCoins.dai,
        dataFeed.address,
        0,
        true,
      );
      await setRoundData({ mockedAggregator }, 1.03);
      await setRoundData({ mockedAggregator: mockedAggregatorMToken }, 5);
      await setMinAmountTest({ vault: depositVault, owner }, 10);

      await depositRequestTest(
        { depositVault, owner, mTBILL, mTokenToUsdDataFeed },
        stableCoins.dai,
        100,
      );

      await depositRequestTest(
        { depositVault, owner, mTBILL, mTokenToUsdDataFeed },
        stableCoins.dai,
        100,
      );

      await safeBulkApproveRequestTest(
        { depositVault, owner, mTBILL, mTokenToUsdDataFeed },
        [{ id: 0 }, { id: 1 }],
        undefined,
      );
    });

    it('approve 10 requests from vaut admin account', async () => {
      const {
        owner,
        mockedAggregator,
        mockedAggregatorMToken,
        depositVault,
        stableCoins,
        mTBILL,
        dataFeed,
        mTokenToUsdDataFeed,
      } = await loadFixture(defaultDeploy);

      await mintToken(stableCoins.dai, owner, 1000);
      await approveBase18(owner, stableCoins.dai, depositVault, 1000);
      await addPaymentTokenTest(
        { vault: depositVault, owner },
        stableCoins.dai,
        dataFeed.address,
        0,
        true,
      );
      await setRoundData({ mockedAggregator }, 1.03);
      await setRoundData({ mockedAggregator: mockedAggregatorMToken }, 5);
      await setMinAmountTest({ vault: depositVault, owner }, 10);

      for (let i = 0; i < 10; i++) {
        await depositRequestTest(
          { depositVault, owner, mTBILL, mTokenToUsdDataFeed },
          stableCoins.dai,
          100,
        );
      }

      await safeBulkApproveRequestTest(
        { depositVault, owner, mTBILL, mTokenToUsdDataFeed },
        Array.from({ length: 10 }, (_, i) => ({ id: i })),
        undefined,
      );
    });

    it('approve 10 requests from vaut admin account when different users are recievers', async () => {
      const {
        owner,
        mockedAggregator,
        mockedAggregatorMToken,
        depositVault,
        stableCoins,
        mTBILL,
        dataFeed,
        mTokenToUsdDataFeed,
        regularAccounts,
      } = await loadFixture(defaultDeploy);

      await mintToken(stableCoins.dai, owner, 1000);
      await approveBase18(owner, stableCoins.dai, depositVault, 1000);
      await addPaymentTokenTest(
        { vault: depositVault, owner },
        stableCoins.dai,
        dataFeed.address,
        0,
        true,
      );
      await setRoundData({ mockedAggregator }, 1.03);
      await setRoundData({ mockedAggregator: mockedAggregatorMToken }, 5);
      await setMinAmountTest({ vault: depositVault, owner }, 10);

      for (let i = 0; i < 10; i++) {
        await depositRequestTest(
          {
            depositVault,
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
        { depositVault, owner, mTBILL, mTokenToUsdDataFeed },
        Array.from({ length: 10 }, (_, i) => ({ id: i })),
        undefined,
      );
    });

    it('approve 2 requests from vaut admin account when each request has different token', async () => {
      const {
        owner,
        mockedAggregator,
        mockedAggregatorMToken,
        depositVault,
        stableCoins,
        mTBILL,
        dataFeed,
        mTokenToUsdDataFeed,
      } = await loadFixture(defaultDeploy);

      await mintToken(stableCoins.dai, owner, 100);
      await mintToken(stableCoins.usdc, owner, 100);
      await approveBase18(owner, stableCoins.dai, depositVault, 100);
      await approveBase18(owner, stableCoins.usdc, depositVault, 100);
      await addPaymentTokenTest(
        { vault: depositVault, owner },
        stableCoins.dai,
        dataFeed.address,
        0,
        true,
      );
      await addPaymentTokenTest(
        { vault: depositVault, owner },
        stableCoins.usdc,
        dataFeed.address,
        0,
        true,
      );
      await setRoundData({ mockedAggregator }, 1.03);
      await setRoundData({ mockedAggregator: mockedAggregatorMToken }, 5);
      await setMinAmountTest({ vault: depositVault, owner }, 10);

      await depositRequestTest(
        { depositVault, owner, mTBILL, mTokenToUsdDataFeed },
        stableCoins.dai,
        100,
      );

      await depositRequestTest(
        { depositVault, owner, mTBILL, mTokenToUsdDataFeed },
        stableCoins.usdc,
        100,
      );

      await safeBulkApproveRequestTest(
        { depositVault, owner, mTBILL, mTokenToUsdDataFeed },
        [{ id: 0 }, { id: 1 }],
        undefined,
      );
    });
  });

  describe('rejectRequest()', async () => {
    it('should fail: call from address without vault admin role', async () => {
      const { depositVault, regularAccounts, mTokenToUsdDataFeed, mTBILL } =
        await loadFixture(defaultDeploy);
      await rejectRequestTest(
        {
          depositVault,
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
        depositVault,
        stableCoins,
        mTBILL,
        dataFeed,
        mTokenToUsdDataFeed,
      } = await loadFixture(defaultDeploy);
      await addPaymentTokenTest(
        { vault: depositVault, owner },
        stableCoins.dai,
        dataFeed.address,
        0,
        true,
      );
      await rejectRequestTest(
        { depositVault, owner, mTBILL, mTokenToUsdDataFeed },
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
        depositVault,
        stableCoins,
        mTBILL,
        dataFeed,
        mTokenToUsdDataFeed,
      } = await loadFixture(defaultDeploy);

      await mintToken(stableCoins.dai, owner, 100);
      await approveBase18(owner, stableCoins.dai, depositVault, 100);
      await addPaymentTokenTest(
        { vault: depositVault, owner },
        stableCoins.dai,
        dataFeed.address,
        0,
        true,
      );
      await setRoundData({ mockedAggregator }, 1.03);
      await setRoundData({ mockedAggregator: mockedAggregatorMToken }, 5);
      await setMinAmountTest({ vault: depositVault, owner }, 10);

      await depositRequestTest(
        { depositVault, owner, mTBILL, mTokenToUsdDataFeed },
        stableCoins.dai,
        100,
      );
      const requestId = 0;

      await rejectRequestTest(
        { depositVault, owner, mTBILL, mTokenToUsdDataFeed },
        requestId,
      );

      await rejectRequestTest(
        { depositVault, owner, mTBILL, mTokenToUsdDataFeed },
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
        depositVault,
        stableCoins,
        mTBILL,
        dataFeed,
        mTokenToUsdDataFeed,
      } = await loadFixture(defaultDeploy);

      await mintToken(stableCoins.dai, owner, 100);
      await approveBase18(owner, stableCoins.dai, depositVault, 100);
      await addPaymentTokenTest(
        { vault: depositVault, owner },
        stableCoins.dai,
        dataFeed.address,
        0,
        true,
      );
      await setRoundData({ mockedAggregator }, 1.03);
      await setRoundData({ mockedAggregator: mockedAggregatorMToken }, 5);
      await setMinAmountTest({ vault: depositVault, owner }, 10);

      await depositRequestTest(
        { depositVault, owner, mTBILL, mTokenToUsdDataFeed },
        stableCoins.dai,
        100,
      );
      const requestId = 0;

      await rejectRequestTest(
        { depositVault, owner, mTBILL, mTokenToUsdDataFeed },
        requestId,
      );
    });
  });

  describe('depositInstant() complex', () => {
    it('should fail: when is paused', async () => {
      const {
        depositVault,
        owner,
        mTBILL,
        stableCoins,
        regularAccounts,
        dataFeed,
        mTokenToUsdDataFeed,
      } = await loadFixture(defaultDeploy);

      await pauseVault(depositVault);
      await mintToken(stableCoins.dai, regularAccounts[0], 100);
      await approveBase18(
        regularAccounts[0],
        stableCoins.dai,
        depositVault,
        100,
      );
      await addPaymentTokenTest(
        { vault: depositVault, owner },
        stableCoins.dai,
        dataFeed.address,
        0,
        true,
      );

      await depositInstantTest(
        { depositVault, owner, mTBILL, mTokenToUsdDataFeed },
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
        depositVault,
        owner,
        mTBILL,
        stableCoins,
        dataFeed,
        mTokenToUsdDataFeed,
      } = await loadFixture(defaultDeploy);

      await pauseVault(depositVault);

      await mintToken(stableCoins.dai, owner, 100);
      await approveBase18(owner, stableCoins.dai, depositVault, 100);
      await addPaymentTokenTest(
        { vault: depositVault, owner },
        stableCoins.dai,
        dataFeed.address,
        0,
        true,
      );

      await depositInstantTest(
        { depositVault, owner, mTBILL, mTokenToUsdDataFeed },
        stableCoins.dai,
        100,
        {
          revertMessage: 'Pausable: paused',
        },
      );
    });

    it('call for amount == minAmountToDepositTest', async () => {
      const {
        depositVault,
        mockedAggregator,
        mockedAggregatorMToken,
        owner,
        mTBILL,
        stableCoins,
        dataFeed,
        mTokenToUsdDataFeed,
      } = await loadFixture(defaultDeploy);
      await addPaymentTokenTest(
        { vault: depositVault, owner },
        stableCoins.dai,
        dataFeed.address,
        0,
        true,
      );
      await setRoundData({ mockedAggregator }, 1);

      await mintToken(stableCoins.dai, owner, 102_000);
      await approveBase18(owner, stableCoins.dai, depositVault, 102_000);

      await setRoundData({ mockedAggregator: mockedAggregatorMToken }, 1);
      await setMinAmountToDepositTest({ depositVault, owner }, 100_000);
      await setInstantDailyLimitTest(
        { vault: depositVault, owner },
        parseUnits('150000'),
      );

      await depositInstantTest(
        { depositVault, owner, mTBILL, mTokenToUsdDataFeed },
        stableCoins.dai,
        102_000,
      );
    });

    it('call for amount == minAmountToDepositTest+1, then deposit with amount 100', async () => {
      const {
        depositVault,
        mockedAggregator,
        mockedAggregatorMToken,
        owner,
        mTBILL,
        stableCoins,
        dataFeed,
        mTokenToUsdDataFeed,
      } = await loadFixture(defaultDeploy);
      await addPaymentTokenTest(
        { vault: depositVault, owner },
        stableCoins.dai,
        dataFeed.address,
        0,
        true,
      );
      await setRoundData({ mockedAggregator }, 1);

      await mintToken(stableCoins.dai, owner, 103_101);
      await approveBase18(owner, stableCoins.dai, depositVault, 103_101);

      await setRoundData({ mockedAggregator: mockedAggregatorMToken }, 1);
      await setMinAmountToDepositTest({ depositVault, owner }, 100_000);
      await setInstantDailyLimitTest(
        { vault: depositVault, owner },
        parseUnits('150000'),
      );
      await setMinAmountTest({ vault: depositVault, owner }, 10);

      await depositInstantTest(
        { depositVault, owner, mTBILL, mTokenToUsdDataFeed },
        stableCoins.dai,
        103_001,
      );
      await depositInstantTest(
        { depositVault, owner, mTBILL, mTokenToUsdDataFeed },
        stableCoins.dai,
        100,
      );
    });

    it('deposit 100 DAI, when price is 5$, 25 USDC when price is 5.1$, 14 USDT when price is 5.4$', async () => {
      const {
        owner,
        mockedAggregator,
        depositVault,
        stableCoins,
        mTBILL,
        dataFeed,
        mTokenToUsdDataFeed,
      } = await loadFixture(defaultDeploy);

      await mintToken(stableCoins.dai, owner, 100);
      await mintToken(stableCoins.usdc, owner, 125);
      await mintToken(stableCoins.usdt, owner, 114);

      await approveBase18(owner, stableCoins.dai, depositVault, 100);
      await approveBase18(owner, stableCoins.usdc, depositVault, 125);
      await approveBase18(owner, stableCoins.usdt, depositVault, 114);
      await setMinAmountTest({ vault: depositVault, owner }, 10);

      await addPaymentTokenTest(
        { vault: depositVault, owner },
        stableCoins.dai,
        dataFeed.address,
        0,
        true,
      );
      await addPaymentTokenTest(
        { vault: depositVault, owner },
        stableCoins.usdc,
        dataFeed.address,
        0,
        true,
      );
      await addPaymentTokenTest(
        { vault: depositVault, owner },
        stableCoins.usdt,
        dataFeed.address,
        0,
        true,
      );

      await setRoundData({ mockedAggregator }, 1.04);
      await depositInstantTest(
        { depositVault, owner, mTBILL, mTokenToUsdDataFeed },
        stableCoins.dai,
        100,
      );

      await setRoundData({ mockedAggregator }, 1);
      await depositInstantTest(
        { depositVault, owner, mTBILL, mTokenToUsdDataFeed },
        stableCoins.usdc,
        125,
      );

      await setRoundData({ mockedAggregator }, 1.01);
      await depositInstantTest(
        { depositVault, owner, mTBILL, mTokenToUsdDataFeed },
        stableCoins.usdt,
        114,
      );
    });
  });

  describe('depositRequest() complex', () => {
    it('should fail: when is paused', async () => {
      const {
        depositVault,
        owner,
        mTBILL,
        stableCoins,
        regularAccounts,
        dataFeed,
        mTokenToUsdDataFeed,
      } = await loadFixture(defaultDeploy);

      await pauseVault(depositVault);
      await mintToken(stableCoins.dai, regularAccounts[0], 100);
      await approveBase18(
        regularAccounts[0],
        stableCoins.dai,
        depositVault,
        100,
      );
      await addPaymentTokenTest(
        { vault: depositVault, owner },
        stableCoins.dai,
        dataFeed.address,
        0,
        true,
      );

      await depositRequestTest(
        { depositVault, owner, mTBILL, mTokenToUsdDataFeed },
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
        depositVault,
        owner,
        mTBILL,
        stableCoins,
        dataFeed,
        mTokenToUsdDataFeed,
      } = await loadFixture(defaultDeploy);

      await pauseVault(depositVault);

      await mintToken(stableCoins.dai, owner, 100);
      await approveBase18(owner, stableCoins.dai, depositVault, 100);
      await addPaymentTokenTest(
        { vault: depositVault, owner },
        stableCoins.dai,
        dataFeed.address,
        0,
        true,
      );

      await depositRequestTest(
        { depositVault, owner, mTBILL, mTokenToUsdDataFeed },
        stableCoins.dai,
        100,
        {
          revertMessage: 'Pausable: paused',
        },
      );
    });

    it('call for amount == minAmountToDepositTest', async () => {
      const {
        depositVault,
        mockedAggregator,
        mockedAggregatorMToken,
        owner,
        mTBILL,
        stableCoins,
        dataFeed,
        mTokenToUsdDataFeed,
      } = await loadFixture(defaultDeploy);
      await addPaymentTokenTest(
        { vault: depositVault, owner },
        stableCoins.dai,
        dataFeed.address,
        0,
        true,
      );
      await setRoundData({ mockedAggregator }, 1);

      await mintToken(stableCoins.dai, owner, 105_000);
      await approveBase18(owner, stableCoins.dai, depositVault, 105_000);

      await setRoundData({ mockedAggregator: mockedAggregatorMToken }, 1);
      await setMinAmountToDepositTest({ depositVault, owner }, 100_000);
      await setInstantDailyLimitTest({ vault: depositVault, owner }, 150_000);

      await depositRequestTest(
        { depositVault, owner, mTBILL, mTokenToUsdDataFeed },
        stableCoins.dai,
        102_000,
      );
      const requestId = 0;

      await approveRequestTest(
        { depositVault, owner, mTBILL, mTokenToUsdDataFeed },
        requestId,
        parseUnits('5'),
      );
    });

    it('call for amount == minAmountToDepositTest+1, then deposit with amount 1', async () => {
      const {
        depositVault,
        mockedAggregator,
        mockedAggregatorMToken,
        owner,
        mTBILL,
        stableCoins,
        dataFeed,
        mTokenToUsdDataFeed,
      } = await loadFixture(defaultDeploy);
      await addPaymentTokenTest(
        { vault: depositVault, owner },
        stableCoins.dai,
        dataFeed.address,
        0,
        true,
      );
      await setRoundData({ mockedAggregator }, 1);

      await mintToken(stableCoins.dai, owner, 105_101);
      await approveBase18(owner, stableCoins.dai, depositVault, 105_101);

      await setRoundData({ mockedAggregator: mockedAggregatorMToken }, 1);
      await setMinAmountToDepositTest({ depositVault, owner }, 100_000);
      await setInstantDailyLimitTest({ vault: depositVault, owner }, 150_000);

      await depositRequestTest(
        { depositVault, owner, mTBILL, mTokenToUsdDataFeed },
        stableCoins.dai,
        102_001,
      );
      let requestId = 0;

      await approveRequestTest(
        { depositVault, owner, mTBILL, mTokenToUsdDataFeed },
        requestId,
        parseUnits('5'),
      );
      await depositRequestTest(
        { depositVault, owner, mTBILL, mTokenToUsdDataFeed },
        stableCoins.dai,
        100,
      );
      requestId = 1;

      await approveRequestTest(
        { depositVault, owner, mTBILL, mTokenToUsdDataFeed },
        requestId,
        parseUnits('5'),
      );
    });

    it('deposit 100 DAI, when price is 5$, 25 USDC when price is 5.1$, 14 USDT when price is 5.4$', async () => {
      const {
        owner,
        mockedAggregator,
        depositVault,
        stableCoins,
        mTBILL,
        dataFeed,
        mTokenToUsdDataFeed,
      } = await loadFixture(defaultDeploy);

      await mintToken(stableCoins.dai, owner, 100);
      await mintToken(stableCoins.usdc, owner, 125);
      await mintToken(stableCoins.usdt, owner, 114);

      await approveBase18(owner, stableCoins.dai, depositVault, 100);
      await approveBase18(owner, stableCoins.usdc, depositVault, 125);
      await approveBase18(owner, stableCoins.usdt, depositVault, 114);

      await addPaymentTokenTest(
        { vault: depositVault, owner },
        stableCoins.dai,
        dataFeed.address,
        0,
        true,
      );
      await addPaymentTokenTest(
        { vault: depositVault, owner },
        stableCoins.usdc,
        dataFeed.address,
        0,
        true,
      );
      await addPaymentTokenTest(
        { vault: depositVault, owner },
        stableCoins.usdt,
        dataFeed.address,
        0,
        true,
      );
      await setMinAmountTest({ vault: depositVault, owner }, 10);

      await setRoundData({ mockedAggregator }, 1.04);
      await depositRequestTest(
        { depositVault, owner, mTBILL, mTokenToUsdDataFeed },
        stableCoins.dai,
        100,
      );
      let requestId = 0;

      await approveRequestTest(
        { depositVault, owner, mTBILL, mTokenToUsdDataFeed },
        requestId,
        parseUnits('5'),
      );

      await setRoundData({ mockedAggregator }, 1);
      await depositRequestTest(
        { depositVault, owner, mTBILL, mTokenToUsdDataFeed },
        stableCoins.usdc,
        125,
      );
      requestId = 1;

      await approveRequestTest(
        { depositVault, owner, mTBILL, mTokenToUsdDataFeed },
        requestId,
        parseUnits('5'),
      );

      await setRoundData({ mockedAggregator }, 1.01);
      await depositRequestTest(
        { depositVault, owner, mTBILL, mTokenToUsdDataFeed },
        stableCoins.usdt,
        114,
      );
      requestId = 2;

      await approveRequestTest(
        { depositVault, owner, mTBILL, mTokenToUsdDataFeed },
        requestId,
        parseUnits('5'),
      );
    });

    it('when 10 supply cap is left and try to mint request 100', async () => {
      const {
        owner,
        depositVault,
        stableCoins,
        mTBILL,
        dataFeed,
        mTokenToUsdDataFeed,
        regularAccounts,
        customRecipient,
        mockedAggregator,
        mockedAggregatorMToken,
      } = await loadFixture(defaultDeploy);
      await mintToken(stableCoins.dai, regularAccounts[0], 190);
      await approveBase18(
        regularAccounts[0],
        stableCoins.dai,
        depositVault,
        190,
      );
      await addPaymentTokenTest(
        { vault: depositVault, owner },
        stableCoins.dai,
        dataFeed.address,
        0,
        true,
      );

      await setMaxSupplyCapTest({ depositVault, owner }, 100);
      await setRoundData({ mockedAggregator }, 1);
      await setRoundData({ mockedAggregator: mockedAggregatorMToken }, 1);
      await setMinAmountTest({ vault: depositVault, owner }, 0);

      await depositInstantTest(
        { depositVault, owner, mTBILL, mTokenToUsdDataFeed, customRecipient },
        stableCoins.dai,
        90,
        {
          from: regularAccounts[0],
        },
      );

      await depositRequestTest(
        { depositVault, owner, mTBILL, mTokenToUsdDataFeed, customRecipient },
        stableCoins.dai,
        100,
        {
          from: regularAccounts[0],
        },
      );
    });
  });

  describe('ManageableVault internal functions', () => {
    it('should fail: invalid rounding tokenTransferFromToTester()', async () => {
      const { depositVault, stableCoins, owner } = await loadFixture(
        defaultDeploy,
      );

      await mintToken(stableCoins.usdc, owner, 1000);

      await approveBase18(owner, stableCoins.usdc, depositVault, 1000);

      await expect(
        depositVault.tokenTransferFromToTester(
          stableCoins.usdc.address,
          owner.address,
          depositVault.address,
          parseUnits('999.999999999'),
          8,
        ),
      ).revertedWith('MV: invalid rounding');
    });

    it('should fail: invalid rounding tokenTransferToUserTester()', async () => {
      const { depositVault, stableCoins, owner } = await loadFixture(
        defaultDeploy,
      );

      await mintToken(stableCoins.usdc, depositVault, 1000);

      await expect(
        depositVault.tokenTransferToUserTester(
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
      const { depositVault } = await loadFixture(defaultDeploy);

      await expect(
        depositVault.convertTokenToUsdTest(constants.AddressZero, 0),
      ).revertedWith('DV: amount zero');
    });

    it('should fail: when tokenRate == 0', async () => {
      const { depositVault } = await loadFixture(defaultDeploy);

      await depositVault.setOverrideGetTokenRate(true);
      await depositVault.setGetTokenRateValue(0);

      await expect(
        depositVault.convertTokenToUsdTest(constants.AddressZero, 1),
      ).revertedWith('DV: rate zero');
    });
  });

  describe('_convertUsdToMToken', () => {
    it('should fail: when rate == 0', async () => {
      const { depositVault } = await loadFixture(defaultDeploy);

      await depositVault.setOverrideGetTokenRate(true);
      await depositVault.setGetTokenRateValue(0);

      await expect(depositVault.convertUsdToMTokenTest(1)).revertedWith(
        'DV: rate zero',
      );
    });
  });

  describe('_calcAndValidateDeposit', () => {
    it('should fail: when tokenOut is not MANUAL_FULLFILMENT_TOKEN but isFiat = true', async () => {
      const { depositVault, stableCoins, owner, dataFeed } = await loadFixture(
        defaultDeploy,
      );

      await addPaymentTokenTest(
        { vault: depositVault, owner },
        stableCoins.dai,
        dataFeed.address,
        parseUnits('100', 2),
        true,
      );

      await setMinAmountTest({ vault: depositVault, owner }, 0);

      await expect(
        depositVault.calcAndValidateDeposit(
          constants.AddressZero,
          stableCoins.dai.address,
          parseUnits('100'),
          true,
        ),
      ).revertedWith('DV: invalid mint amount');
    });
  });
});
