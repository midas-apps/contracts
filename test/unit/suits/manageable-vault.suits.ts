import { loadFixture } from '@nomicfoundation/hardhat-network-helpers';
import { days } from '@nomicfoundation/hardhat-network-helpers/dist/src/helpers/time/duration';
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { expect } from 'chai';
import { constants } from 'ethers';
import { parseUnits } from 'ethers/lib/utils';
import { ethers } from 'hardhat';

import { encodeFnSelector } from '../../../helpers/utils';
import {
  ManageableVaultTester,
  ManageableVaultTester__factory,
} from '../../../typechain-types';
import { acErrors, setupPermissionRole } from '../../common/ac.helpers';
import {
  mintToken,
  pauseVaultFn,
  approveBase18,
  InitializeInvariant,
  initializeParamsSuits,
} from '../../common/common.helpers';
import {
  DefaultFixture,
  getInitializerParamsMv,
  InitializerParamsMv,
} from '../../common/fixtures';
import { greenListEnable } from '../../common/greenlist.helpers';
import {
  addPaymentTokenTest,
  removePaymentTokenTest,
  setVariabilityToleranceTest,
  withdrawTest,
  addWaivedFeeAccountTest,
  changeTokenAllowanceTest,
  changeTokenFeeTest,
  removeWaivedFeeAccountTest,
  setInstantFeeTest,
  setMinAmountTest,
  setMinMaxInstantFeeTest,
  setSequentialRequestProcessingTest,
} from '../../common/manageable-vault.helpers';
import { initializeMv } from '../../common/vault-initializer.helpers';

let pauseManager: DefaultFixture['pauseManager'];
let owner: DefaultFixture['owner'];

const baseInitParams = (fixture: DefaultFixture): InitializerParamsMv => ({
  accessControl: fixture.accessControl,
  mockedSanctionsList: fixture.mockedSanctionsList,
  mTBILL: fixture.mTBILL,
  mTokenToUsdDataFeed: fixture.mTokenToUsdDataFeed,
  tokensReceiver: fixture.tokensReceiver,
});

const initializeInvariants: InitializeInvariant<InitializerParamsMv>[] = [
  {
    title: 'accessControl is zero address',
    params: { accessControl: constants.AddressZero },
    revertCustomError: {
      customErrorName: 'InvalidAddress',
      args: [constants.AddressZero],
    },
  },
  {
    title: 'mTBILL is zero address',
    params: { mTBILL: constants.AddressZero },
    revertCustomError: {
      customErrorName: 'InvalidAddress',
      args: [constants.AddressZero],
    },
  },
  {
    title: 'mTokenToUsdDataFeed is zero address',
    params: { mTokenToUsdDataFeed: constants.AddressZero },
    revertCustomError: {
      customErrorName: 'InvalidAddress',
      args: [constants.AddressZero],
    },
  },
  {
    title: 'tokensReceiver is zero address',
    params: { tokensReceiver: constants.AddressZero },
    revertCustomError: {
      customErrorName: 'InvalidAddress',
      args: [constants.AddressZero],
    },
  },
  {
    title: 'tokensReceiver is address(this)',
    run: async (fixture) => {
      const vault = await new ManageableVaultTester__factory(
        fixture.owner,
      ).deploy();

      await initializeMv(
        {
          ...baseInitParams(fixture),
          tokensReceiver: vault.address,
        },
        vault,
        {
          revertCustomError: {
            customErrorName: 'InvalidAddress',
            args: [vault.address],
          },
        },
      );
    },
  },
  {
    title: 'variationTolerance is zero',
    params: { variationTolerance: 0 },
    revertCustomError: { customErrorName: 'InvalidFee', args: [0] },
  },
  {
    title: 'variationTolerance is greater than 100%',
    params: { variationTolerance: 10001 },
    revertCustomError: { customErrorName: 'InvalidFee', args: [10001] },
  },
  {
    title: 'instantFee is greater than 100%',
    params: { instantFee: 10001 },
    revertCustomError: { customErrorName: 'InvalidFee', args: [10001] },
  },
  {
    title: 'maxInstantShare is greater than 100%',
    params: { maxInstantShare: 10001 },
    revertCustomError: { customErrorName: 'InvalidFee', args: [10001] },
  },
  {
    title: 'minInstantFee is greater than 100%',
    params: { minInstantFee: 10001 },
    revertCustomError: { customErrorName: 'InvalidFee', args: [10001] },
  },
  {
    title: 'maxInstantFee is greater than 100%',
    params: { maxInstantFee: 10001 },
    revertCustomError: { customErrorName: 'InvalidFee', args: [10001] },
  },
  {
    title: 'minInstantFee is greater than maxInstantFee',
    params: { minInstantFee: 500, maxInstantFee: 100 },
    revertCustomError: {
      customErrorName: 'InvalidMinMaxInstantFee',
      args: [500, 100],
    },
  },
  {
    title: 'limitConfigs window is shorter than 1 minute',
    params: { limitConfigs: [{ window: 59, limit: parseUnits('100000') }] },
    revertCustomError: { customErrorName: 'WindowTooShort', args: [59] },
  },
];

export const manageableVaultSuits = (
  mvFixture: () => Promise<DefaultFixture>,
  mvConfig: {
    createNew: (owner: SignerWithAddress) => Promise<ManageableVaultTester>;
    key:
      | 'depositVault'
      | 'depositVaultWithUSTB'
      | 'depositVaultWithMToken'
      | 'depositVaultWithAave'
      | 'depositVaultWithMorpho'
      | 'redemptionVault'
      | 'redemptionVaultWithAave'
      | 'redemptionVaultWithMToken'
      | 'redemptionVaultWithUSTB'
      | 'redemptionVaultWithMorpho';
  },
  deploymentAdditionalChecks: (
    fixtureRes: DefaultFixture,
  ) => Promise<void> = async () => {},
  otherTests: (fixture: () => Promise<DefaultFixture>) => void = async () => {},
) => {
  const loadMvFixture = async () => {
    const fixture = await loadFixture(mvFixture);
    ({ pauseManager, owner } = fixture);

    const { createNew, key } = mvConfig;
    return {
      ...fixture,
      originalVault: fixture.manageableVault,
      manageableVault: ManageableVaultTester__factory.connect(
        fixture[key].address,
        fixture.owner,
      ),
      createNew: async () => {
        const mv = await createNew(fixture.owner);
        return ManageableVaultTester__factory.connect(
          mv.address,
          fixture.owner,
        );
      },
    };
  };

  describe('ManageableVault', function () {
    it('deployment', async () => {
      const fixture = await loadMvFixture();
      const { manageableVault, mTBILL, tokensReceiver, mTokenToUsdDataFeed } =
        fixture;

      expect(await manageableVault.mToken()).eq(mTBILL.address);

      expect(await manageableVault.ONE_HUNDRED_PERCENT()).eq('10000');

      expect(await manageableVault.tokensReceiver()).eq(tokensReceiver.address);

      expect(await manageableVault.minAmount()).eq(1000);

      expect(await manageableVault.instantFee()).eq('100');

      expect(await manageableVault.mTokenDataFeed()).eq(
        mTokenToUsdDataFeed.address,
      );
      expect(await manageableVault.variationTolerance()).eq(1);

      expect(await manageableVault.minInstantFee()).eq(0);
      expect(await manageableVault.maxInstantFee()).eq(10000);
      expect((await manageableVault.getInstantLimitStatuses()).length).eq(1);
      expect((await manageableVault.getInstantLimitStatuses()).length).eq(1);
      const limitConfigs = await manageableVault.getInstantLimitStatuses();
      const limitConfig = limitConfigs[0];

      expect(limitConfig.limit).eq(parseUnits('100000'));
      expect(limitConfig.lastUpdated).not.eq(0);
      expect(limitConfig.remaining).eq(parseUnits('100000'));
      expect(limitConfig.window).eq(days(1));

      await deploymentAdditionalChecks({
        ...fixture,
        manageableVault: fixture.originalVault as ManageableVaultTester,
      });
    });

    describe('initialization', () => {
      it('should fail: cal; initialize() when already initialized', async () => {
        const { manageableVault } = await loadMvFixture();

        await expect(
          manageableVault.initializeExternal(
            ...getInitializerParamsMv({
              accessControl: constants.AddressZero,
              mockedSanctionsList: constants.AddressZero,
              mTBILL: constants.AddressZero,
              mTokenToUsdDataFeed: constants.AddressZero,
              tokensReceiver: constants.AddressZero,
            }),
          ),
        ).revertedWith('Initializable: contract is already initialized');
      });

      it('should fail: call with initializing == false', async () => {
        const { owner } = await loadMvFixture();

        const vault = await new ManageableVaultTester__factory(owner).deploy();

        await expect(
          vault.initializeWithoutInitializer(
            ...getInitializerParamsMv({
              accessControl: constants.AddressZero,
              mockedSanctionsList: constants.AddressZero,
              mTBILL: constants.AddressZero,
              mTokenToUsdDataFeed: constants.AddressZero,
              tokensReceiver: constants.AddressZero,
            }),
          ),
        ).revertedWith('Initializable: contract is not initializing');
      });

      initializeParamsSuits(
        initializeInvariants,
        loadMvFixture,
        async (fixture, params, opt) => {
          await initializeMv(
            {
              ...baseInitParams(fixture),
              ...params,
            },
            undefined,
            opt,
          );
        },
      );
    });

    describe('common', () => {
      describe('setMinAmount()', () => {
        it('should fail: call from address without VAULT_ADMIN_ROLE role', async () => {
          const { owner, manageableVault, regularAccounts } =
            await loadMvFixture();

          await setMinAmountTest({ vault: manageableVault, owner }, 1.1, {
            from: regularAccounts[0],
            revertCustomError: acErrors.WMAC_HASNT_PERMISSION,
          });
        });

        it('call from address with VAULT_ADMIN_ROLE role', async () => {
          const { owner, manageableVault } = await loadMvFixture();
          await setMinAmountTest({ vault: manageableVault, owner }, 1.1);
        });

        it('should fail: when function is paused', async () => {
          const { owner, manageableVault } = await loadMvFixture();

          await pauseVaultFn(
            { pauseManager, owner },
            manageableVault,
            encodeFnSelector('setMinAmount(uint256)'),
          );

          await setMinAmountTest({ vault: manageableVault, owner }, 1.1, {
            revertCustomError: {
              customErrorName: 'Paused',
            },
          });
        });

        it('succeeds with only scoped function permission', async () => {
          const { accessControl, owner, manageableVault, regularAccounts } =
            await loadMvFixture();

          const vaultRole = await manageableVault.contractAdminRole();
          await setupPermissionRole(
            { accessControl, owner },
            vaultRole,
            manageableVault.address,
            'setMinAmount(uint256)',
            regularAccounts[0].address,
          );

          expect(
            await accessControl.hasRole(vaultRole, regularAccounts[0].address),
          ).eq(false);

          await setMinAmountTest({ vault: manageableVault, owner }, 200, {
            from: regularAccounts[0],
          });
        });

        it('succeeds with scoped permission and vault admin role', async () => {
          const {
            accessControl,
            owner,
            manageableVault,
            regularAccounts,
            roles,
          } = await loadMvFixture();

          const vaultRole = await manageableVault.contractAdminRole();
          await setupPermissionRole(
            { accessControl, owner },
            vaultRole,
            manageableVault.address,
            'setMinAmount(uint256)',
            regularAccounts[0].address,
          );

          await accessControl.grantRole(
            roles.tokenRoles.mTBILL.depositVaultAdmin,
            regularAccounts[0].address,
          );

          await setMinAmountTest({ vault: manageableVault, owner }, 200, {
            from: regularAccounts[0],
          });
        });
      });

      describe('setGreenlistEnable()', () => {
        it('should fail: call from address without VAULT_ADMIN_ROLE role', async () => {
          const { owner, manageableVault, regularAccounts } =
            await loadMvFixture();

          await greenListEnable(
            { greenlistable: manageableVault, owner },
            true,
            {
              from: regularAccounts[0],
              revertCustomError: acErrors.WMAC_HASNT_PERMISSION,
            },
          );
        });

        it('call from address with VAULT_ADMIN_ROLE role', async () => {
          const { owner, manageableVault } = await loadMvFixture();

          await greenListEnable(
            { greenlistable: manageableVault, owner },
            true,
          );
        });

        it('should fail: when function is paused', async () => {
          const { owner, manageableVault } = await loadMvFixture();

          await pauseVaultFn(
            { pauseManager, owner },
            manageableVault,
            encodeFnSelector('setGreenlistEnable(bool)'),
          );

          await greenListEnable(
            { greenlistable: manageableVault, owner },
            true,
            {
              revertCustomError: {
                customErrorName: 'Paused',
              },
            },
          );
        });

        it('succeeds with only scoped function permission', async () => {
          const { accessControl, owner, manageableVault, regularAccounts } =
            await loadMvFixture();

          const vaultRole = await manageableVault.contractAdminRole();
          await setupPermissionRole(
            { accessControl, owner },
            vaultRole,
            manageableVault.address,
            'setGreenlistEnable(bool)',
            regularAccounts[0].address,
          );

          expect(
            await accessControl.hasRole(vaultRole, regularAccounts[0].address),
          ).eq(false);

          await greenListEnable(
            { greenlistable: manageableVault, owner },
            true,
            {
              from: regularAccounts[0],
            },
          );
        });

        it('succeeds with scoped permission and vault admin role', async () => {
          const {
            accessControl,
            owner,
            manageableVault,
            regularAccounts,
            roles,
          } = await loadMvFixture();

          const vaultRole = await manageableVault.contractAdminRole();
          await setupPermissionRole(
            { accessControl, owner },
            vaultRole,
            manageableVault.address,
            'setGreenlistEnable(bool)',
            regularAccounts[0].address,
          );

          await accessControl.grantRole(
            roles.tokenRoles.mTBILL.depositVaultAdmin,
            regularAccounts[0].address,
          );

          await greenListEnable(
            { greenlistable: manageableVault, owner },
            true,
            {
              from: regularAccounts[0],
            },
          );
        });
      });

      describe('addPaymentToken()', () => {
        it('should fail: call from address without VAULT_ADMIN_ROLE role', async () => {
          const { manageableVault, regularAccounts, owner } =
            await loadMvFixture();
          await addPaymentTokenTest(
            { vault: manageableVault, owner },
            ethers.constants.AddressZero,
            ethers.constants.AddressZero,
            0,
            false,
            constants.MaxUint256,
            {
              revertCustomError: acErrors.WMAC_HASNT_PERMISSION,
              from: regularAccounts[0],
            },
          );
        });

        it('should fail: when token is already added', async () => {
          const { manageableVault, stableCoins, owner, dataFeed } =
            await loadMvFixture();
          await addPaymentTokenTest(
            { vault: manageableVault, owner },
            stableCoins.dai,
            dataFeed.address,
            0,
            false,
          );
          await addPaymentTokenTest(
            { vault: manageableVault, owner },
            stableCoins.dai,
            dataFeed.address,
            0,
            false,
            constants.MaxUint256,
            {
              revertCustomError: {
                customErrorName: 'PaymentTokenAlreadyAdded',
              },
            },
          );
        });

        it('should fail: when token dataFeed address zero', async () => {
          const { manageableVault, stableCoins, owner } = await loadMvFixture();
          await addPaymentTokenTest(
            { vault: manageableVault, owner },
            stableCoins.dai,
            constants.AddressZero,
            0,
            false,
            constants.MaxUint256,
            {
              revertCustomError: {
                customErrorName: 'InvalidAddress',
              },
            },
          );
        });

        it('call from address with VAULT_ADMIN_ROLE role', async () => {
          const { manageableVault, stableCoins, owner, dataFeed } =
            await loadMvFixture();
          await addPaymentTokenTest(
            { vault: manageableVault, owner },
            stableCoins.dai,
            dataFeed.address,
            0,
            false,
          );
        });

        it('call when allowance is zero', async () => {
          const { manageableVault, stableCoins, owner, dataFeed } =
            await loadMvFixture();
          await addPaymentTokenTest(
            { vault: manageableVault, owner },
            stableCoins.dai,
            dataFeed.address,
            0,
            false,
            constants.Zero,
          );
        });

        it('call when allowance is not uint256 max', async () => {
          const { manageableVault, stableCoins, owner, dataFeed } =
            await loadMvFixture();
          await addPaymentTokenTest(
            { vault: manageableVault, owner },
            stableCoins.dai,
            dataFeed.address,
            0,
            false,
            parseUnits('100'),
          );
        });

        it('call from address with VAULT_ADMIN_ROLE role and add 3 options on a row', async () => {
          const { manageableVault, stableCoins, owner, dataFeed } =
            await loadMvFixture();

          await addPaymentTokenTest(
            { vault: manageableVault, owner },
            stableCoins.dai,
            dataFeed.address,
            0,
            true,
          );
          await addPaymentTokenTest(
            { vault: manageableVault, owner },
            stableCoins.usdc,
            dataFeed.address,
            0,
            true,
          );
          await addPaymentTokenTest(
            { vault: manageableVault, owner },
            stableCoins.usdt,
            dataFeed.address,
            0,
            true,
          );
        });

        it('should fail: when function is paused', async () => {
          const { manageableVault, stableCoins, owner, dataFeed } =
            await loadMvFixture();

          await pauseVaultFn(
            { pauseManager, owner },
            manageableVault,
            encodeFnSelector(
              'addPaymentToken(address,address,uint256,uint256,bool)',
            ),
          );

          await addPaymentTokenTest(
            { vault: manageableVault, owner },
            stableCoins.dai,
            dataFeed.address,
            0,
            true,
            constants.MaxUint256,
            {
              revertCustomError: {
                customErrorName: 'Paused',
              },
            },
          );
        });

        it('succeeds with only scoped function permission', async () => {
          const {
            accessControl,
            owner,
            manageableVault,
            regularAccounts,
            stableCoins,
            dataFeed,
          } = await loadMvFixture();

          const vaultRole = await manageableVault.contractAdminRole();
          await setupPermissionRole(
            { accessControl, owner },
            vaultRole,
            manageableVault.address,
            'addPaymentToken(address,address,uint256,uint256,bool)',
            regularAccounts[0].address,
          );

          expect(
            await accessControl.hasRole(vaultRole, regularAccounts[0].address),
          ).eq(false);

          await addPaymentTokenTest(
            { vault: manageableVault, owner },
            stableCoins.usdc,
            dataFeed.address,
            0,
            true,
            constants.MaxUint256,
            { from: regularAccounts[0] },
          );
        });

        it('succeeds with scoped permission and vault admin role', async () => {
          const {
            accessControl,
            owner,
            manageableVault,
            regularAccounts,
            roles,
            stableCoins,
            dataFeed,
          } = await loadMvFixture();

          const vaultRole = await manageableVault.contractAdminRole();
          await setupPermissionRole(
            { accessControl, owner },
            vaultRole,
            manageableVault.address,
            'addPaymentToken(address,address,uint256,uint256,bool)',
            regularAccounts[0].address,
          );

          await accessControl.grantRole(
            roles.tokenRoles.mTBILL.depositVaultAdmin,
            regularAccounts[0].address,
          );

          await addPaymentTokenTest(
            { vault: manageableVault, owner },
            stableCoins.usdt,
            dataFeed.address,
            0,
            true,
            constants.MaxUint256,
            { from: regularAccounts[0] },
          );
        });
      });

      describe('addWaivedFeeAccount()', () => {
        it('should fail: call from address without VAULT_ADMIN_ROLE role', async () => {
          const { manageableVault, regularAccounts, owner } =
            await loadMvFixture();
          await addWaivedFeeAccountTest(
            { vault: manageableVault, owner },
            ethers.constants.AddressZero,
            {
              revertCustomError: acErrors.WMAC_HASNT_PERMISSION,
              from: regularAccounts[0],
            },
          );
        });
        it('should fail: if account fee already waived', async () => {
          const { manageableVault, owner } = await loadMvFixture();
          await addWaivedFeeAccountTest(
            { vault: manageableVault, owner },
            owner.address,
          );
          await addWaivedFeeAccountTest(
            { vault: manageableVault, owner },
            owner.address,
            {
              revertCustomError: {
                customErrorName: 'SameAddressValue',
              },
            },
          );
        });

        it('call from address with VAULT_ADMIN_ROLE role', async () => {
          const { manageableVault, owner } = await loadMvFixture();
          await addWaivedFeeAccountTest(
            { vault: manageableVault, owner },
            owner.address,
          );
        });

        it('should fail: when function is paused', async () => {
          const { manageableVault, owner } = await loadMvFixture();

          await pauseVaultFn(
            { pauseManager, owner },
            manageableVault,
            encodeFnSelector('addWaivedFeeAccount(address)'),
          );

          await addWaivedFeeAccountTest(
            { vault: manageableVault, owner },
            owner.address,
            {
              revertCustomError: {
                customErrorName: 'Paused',
              },
            },
          );
        });

        it('succeeds with only scoped function permission', async () => {
          const { accessControl, owner, manageableVault, regularAccounts } =
            await loadMvFixture();

          const vaultRole = await manageableVault.contractAdminRole();
          await setupPermissionRole(
            { accessControl, owner },
            vaultRole,
            manageableVault.address,
            'addWaivedFeeAccount(address)',
            regularAccounts[0].address,
          );

          expect(
            await accessControl.hasRole(vaultRole, regularAccounts[0].address),
          ).eq(false);

          await addWaivedFeeAccountTest(
            { vault: manageableVault, owner },
            regularAccounts[1].address,
            { from: regularAccounts[0] },
          );
        });

        it('succeeds with scoped permission and vault admin role', async () => {
          const {
            accessControl,
            owner,
            manageableVault,
            regularAccounts,
            roles,
          } = await loadMvFixture();

          const vaultRole = await manageableVault.contractAdminRole();
          await setupPermissionRole(
            { accessControl, owner },
            vaultRole,
            manageableVault.address,
            'addWaivedFeeAccount(address)',
            regularAccounts[0].address,
          );

          await accessControl.grantRole(
            roles.tokenRoles.mTBILL.depositVaultAdmin,
            regularAccounts[0].address,
          );

          await addWaivedFeeAccountTest(
            { vault: manageableVault, owner },
            regularAccounts[2].address,
            { from: regularAccounts[0] },
          );
        });
      });

      describe('removeWaivedFeeAccount()', () => {
        it('should fail: call from address without VAULT_ADMIN_ROLE role', async () => {
          const { manageableVault, regularAccounts, owner } =
            await loadMvFixture();
          await removeWaivedFeeAccountTest(
            { vault: manageableVault, owner },
            ethers.constants.AddressZero,
            {
              revertCustomError: acErrors.WMAC_HASNT_PERMISSION,
              from: regularAccounts[0],
            },
          );
        });
        it('should fail: if account not found in restriction', async () => {
          const { manageableVault, owner } = await loadMvFixture();
          await removeWaivedFeeAccountTest(
            { vault: manageableVault, owner },
            owner.address,
            {
              revertCustomError: {
                customErrorName: 'SameAddressValue',
              },
            },
          );
        });

        it('call from address with VAULT_ADMIN_ROLE role', async () => {
          const { manageableVault, owner } = await loadMvFixture();
          await addWaivedFeeAccountTest(
            { vault: manageableVault, owner },
            owner.address,
          );
          await removeWaivedFeeAccountTest(
            { vault: manageableVault, owner },
            owner.address,
          );
        });

        it('should fail: when function is paused', async () => {
          const { manageableVault, owner } = await loadMvFixture();

          await addWaivedFeeAccountTest(
            { vault: manageableVault, owner },
            owner.address,
          );

          await pauseVaultFn(
            { pauseManager, owner },
            manageableVault,
            encodeFnSelector('removeWaivedFeeAccount(address)'),
          );

          await removeWaivedFeeAccountTest(
            { vault: manageableVault, owner },
            owner.address,
            {
              revertCustomError: {
                customErrorName: 'Paused',
              },
            },
          );
        });

        it('succeeds with only scoped function permission', async () => {
          const { accessControl, owner, manageableVault, regularAccounts } =
            await loadMvFixture();

          await addWaivedFeeAccountTest(
            { vault: manageableVault, owner },
            regularAccounts[1].address,
          );

          const vaultRole = await manageableVault.contractAdminRole();
          await setupPermissionRole(
            { accessControl, owner },
            vaultRole,
            manageableVault.address,
            'removeWaivedFeeAccount(address)',
            regularAccounts[0].address,
          );

          expect(
            await accessControl.hasRole(vaultRole, regularAccounts[0].address),
          ).eq(false);

          await removeWaivedFeeAccountTest(
            { vault: manageableVault, owner },
            regularAccounts[1].address,
            { from: regularAccounts[0] },
          );
        });

        it('succeeds with scoped permission and vault admin role', async () => {
          const {
            accessControl,
            owner,
            manageableVault,
            regularAccounts,
            roles,
          } = await loadMvFixture();

          await addWaivedFeeAccountTest(
            { vault: manageableVault, owner },
            regularAccounts[2].address,
          );

          const vaultRole = await manageableVault.contractAdminRole();
          await setupPermissionRole(
            { accessControl, owner },
            vaultRole,
            manageableVault.address,
            'removeWaivedFeeAccount(address)',
            regularAccounts[0].address,
          );

          await accessControl.grantRole(
            roles.tokenRoles.mTBILL.depositVaultAdmin,
            regularAccounts[0].address,
          );

          await removeWaivedFeeAccountTest(
            { vault: manageableVault, owner },
            regularAccounts[2].address,
            { from: regularAccounts[0] },
          );
        });
      });

      describe('setFee()', () => {
        it('should fail: call from address without VAULT_ADMIN_ROLE role', async () => {
          const { manageableVault, regularAccounts, owner } =
            await loadMvFixture();
          await setInstantFeeTest(
            { vault: manageableVault, owner },
            ethers.constants.Zero,
            {
              revertCustomError: acErrors.WMAC_HASNT_PERMISSION,
              from: regularAccounts[0],
            },
          );
        });

        it('should fail: if new value greater then 100%', async () => {
          const { manageableVault, owner } = await loadMvFixture();
          await setInstantFeeTest({ vault: manageableVault, owner }, 10001, {
            revertCustomError: {
              customErrorName: 'InvalidFee',
            },
          });
        });

        it('call from address with VAULT_ADMIN_ROLE role', async () => {
          const { manageableVault, owner } = await loadMvFixture();
          await setInstantFeeTest({ vault: manageableVault, owner }, 100);
        });

        it('should fail: when function is paused', async () => {
          const { manageableVault, owner } = await loadMvFixture();

          await pauseVaultFn(
            { pauseManager, owner },
            manageableVault,
            encodeFnSelector('setInstantFee(uint256)'),
          );

          await setInstantFeeTest({ vault: manageableVault, owner }, 100, {
            revertCustomError: {
              customErrorName: 'Paused',
            },
          });
        });

        it('succeeds with only scoped function permission', async () => {
          const { accessControl, owner, manageableVault, regularAccounts } =
            await loadMvFixture();

          const vaultRole = await manageableVault.contractAdminRole();
          await setupPermissionRole(
            { accessControl, owner },
            vaultRole,
            manageableVault.address,
            'setInstantFee(uint256)',
            regularAccounts[0].address,
          );

          expect(
            await accessControl.hasRole(vaultRole, regularAccounts[0].address),
          ).eq(false);

          await setInstantFeeTest({ vault: manageableVault, owner }, 100, {
            from: regularAccounts[0],
          });
        });

        it('succeeds with scoped permission and vault admin role', async () => {
          const {
            accessControl,
            owner,
            manageableVault,
            regularAccounts,
            roles,
          } = await loadMvFixture();

          const vaultRole = await manageableVault.contractAdminRole();
          await setupPermissionRole(
            { accessControl, owner },
            vaultRole,
            manageableVault.address,
            'setInstantFee(uint256)',
            regularAccounts[0].address,
          );

          await accessControl.grantRole(
            roles.tokenRoles.mTBILL.depositVaultAdmin,
            regularAccounts[0].address,
          );

          await setInstantFeeTest({ vault: manageableVault, owner }, 100, {
            from: regularAccounts[0],
          });
        });
      });

      describe('setMinMaxInstantFee()', () => {
        it('should fail: call from address without VAULT_ADMIN_ROLE role', async () => {
          const { owner, manageableVault, regularAccounts } =
            await loadMvFixture();
          await setMinMaxInstantFeeTest(
            { vault: manageableVault, owner },
            0,
            1000,
            {
              revertCustomError: acErrors.WMAC_HASNT_PERMISSION,
              from: regularAccounts[0],
            },
          );
        });

        it('should fail: if min greater than max', async () => {
          const { manageableVault, owner } = await loadMvFixture();
          await setMinMaxInstantFeeTest(
            { vault: manageableVault, owner },
            500,
            100,
            {
              revertCustomError: {
                customErrorName: 'InvalidMinMaxInstantFee',
              },
            },
          );
        });

        it('should fail: if fee greater than 100%', async () => {
          const { manageableVault, owner } = await loadMvFixture();
          await setMinMaxInstantFeeTest(
            { vault: manageableVault, owner },
            10001,
            10001,
            {
              revertCustomError: {
                customErrorName: 'InvalidFee',
              },
            },
          );
        });

        it('call from address with VAULT_ADMIN_ROLE role', async () => {
          const { manageableVault, owner } = await loadMvFixture();
          await setMinMaxInstantFeeTest(
            { vault: manageableVault, owner },
            10,
            5000,
          );
        });

        it('should fail: when function is paused', async () => {
          const { manageableVault, owner } = await loadMvFixture();

          await pauseVaultFn(
            { pauseManager, owner },
            manageableVault,
            encodeFnSelector('setMinMaxInstantFee(uint64,uint64)'),
          );

          await setMinMaxInstantFeeTest(
            { vault: manageableVault, owner },
            0,
            1000,
            {
              revertCustomError: {
                customErrorName: 'Paused',
              },
            },
          );
        });

        it('succeeds with only scoped function permission', async () => {
          const { accessControl, owner, manageableVault, regularAccounts } =
            await loadMvFixture();

          const vaultRole = await manageableVault.contractAdminRole();
          await setupPermissionRole(
            { accessControl, owner },
            vaultRole,
            manageableVault.address,
            'setMinMaxInstantFee(uint64,uint64)',
            regularAccounts[0].address,
          );

          expect(
            await accessControl.hasRole(vaultRole, regularAccounts[0].address),
          ).eq(false);

          await setMinMaxInstantFeeTest(
            { vault: manageableVault, owner },
            10,
            5000,
            { from: regularAccounts[0] },
          );
        });

        it('succeeds with scoped permission and vault admin role', async () => {
          const {
            accessControl,
            owner,
            manageableVault,
            regularAccounts,
            roles,
          } = await loadMvFixture();

          const vaultRole = await manageableVault.contractAdminRole();
          await setupPermissionRole(
            { accessControl, owner },
            vaultRole,
            manageableVault.address,
            'setMinMaxInstantFee(uint64,uint64)',
            regularAccounts[0].address,
          );

          await accessControl.grantRole(
            roles.tokenRoles.mTBILL.depositVaultAdmin,
            regularAccounts[0].address,
          );

          await setMinMaxInstantFeeTest(
            { vault: manageableVault, owner },
            10,
            5000,
            { from: regularAccounts[0] },
          );
        });
      });

      describe('setVariabilityTolerance()', () => {
        it('should fail: call from address without VAULT_ADMIN_ROLE role', async () => {
          const { manageableVault, regularAccounts, owner } =
            await loadMvFixture();
          await setVariabilityToleranceTest(
            { vault: manageableVault, owner },
            ethers.constants.Zero,
            {
              revertCustomError: acErrors.WMAC_HASNT_PERMISSION,
              from: regularAccounts[0],
            },
          );
        });
        it('if new value zero', async () => {
          const { manageableVault, owner } = await loadMvFixture();
          await setVariabilityToleranceTest(
            { vault: manageableVault, owner },
            ethers.constants.Zero,
          );
        });

        it('call from address with VAULT_ADMIN_ROLE role', async () => {
          const { manageableVault, owner } = await loadMvFixture();
          await setVariabilityToleranceTest(
            { vault: manageableVault, owner },
            100,
          );
        });

        it('should fail: when function is paused', async () => {
          const { manageableVault, owner } = await loadMvFixture();

          await pauseVaultFn(
            { pauseManager, owner },
            manageableVault,
            encodeFnSelector('setVariationTolerance(uint256)'),
          );

          await setVariabilityToleranceTest(
            { vault: manageableVault, owner },
            100,
            {
              revertCustomError: {
                customErrorName: 'Paused',
              },
            },
          );
        });

        it('succeeds with only scoped function permission', async () => {
          const { accessControl, owner, manageableVault, regularAccounts } =
            await loadMvFixture();

          const vaultRole = await manageableVault.contractAdminRole();
          await setupPermissionRole(
            { accessControl, owner },
            vaultRole,
            manageableVault.address,
            'setVariationTolerance(uint256)',
            regularAccounts[0].address,
          );

          expect(
            await accessControl.hasRole(vaultRole, regularAccounts[0].address),
          ).eq(false);

          await setVariabilityToleranceTest(
            { vault: manageableVault, owner },
            100,
            { from: regularAccounts[0] },
          );
        });

        it('succeeds with scoped permission and vault admin role', async () => {
          const {
            accessControl,
            owner,
            manageableVault,
            regularAccounts,
            roles,
          } = await loadMvFixture();

          const vaultRole = await manageableVault.contractAdminRole();
          await setupPermissionRole(
            { accessControl, owner },
            vaultRole,
            manageableVault.address,
            'setVariationTolerance(uint256)',
            regularAccounts[0].address,
          );

          await accessControl.grantRole(
            roles.tokenRoles.mTBILL.depositVaultAdmin,
            regularAccounts[0].address,
          );

          await setVariabilityToleranceTest(
            { vault: manageableVault, owner },
            100,
            { from: regularAccounts[0] },
          );
        });
      });

      describe('setSequentialRequestProcessing()', () => {
        it('should fail: call from address without VAULT_ADMIN_ROLE role', async () => {
          const { owner, manageableVault, regularAccounts } =
            await loadMvFixture();

          await setSequentialRequestProcessingTest(
            { vault: manageableVault, owner },
            true,
            {
              from: regularAccounts[0],
              revertCustomError: acErrors.WMAC_HASNT_PERMISSION,
            },
          );
        });

        it('call from address with VAULT_ADMIN_ROLE role', async () => {
          const { owner, manageableVault } = await loadMvFixture();

          await setSequentialRequestProcessingTest(
            { vault: manageableVault, owner },
            true,
          );
        });

        it('should fail: when function is paused', async () => {
          const { owner, manageableVault } = await loadMvFixture();

          await pauseVaultFn(
            { pauseManager, owner },
            manageableVault,
            encodeFnSelector('setSequentialRequestProcessing(bool)'),
          );

          await setSequentialRequestProcessingTest(
            { vault: manageableVault, owner },
            true,
            {
              revertCustomError: {
                customErrorName: 'Paused',
              },
            },
          );
        });

        it('succeeds with only scoped function permission', async () => {
          const { accessControl, owner, manageableVault, regularAccounts } =
            await loadMvFixture();

          const vaultRole = await manageableVault.contractAdminRole();
          await setupPermissionRole(
            { accessControl, owner },
            vaultRole,
            manageableVault.address,
            'setSequentialRequestProcessing(bool)',
            regularAccounts[0].address,
          );

          expect(
            await accessControl.hasRole(vaultRole, regularAccounts[0].address),
          ).eq(false);

          await setSequentialRequestProcessingTest(
            { vault: manageableVault, owner },
            true,
            {
              from: regularAccounts[0],
            },
          );
        });

        it('succeeds with scoped permission and vault admin role', async () => {
          const {
            accessControl,
            owner,
            manageableVault,
            regularAccounts,
            roles,
          } = await loadMvFixture();

          const vaultRole = await manageableVault.contractAdminRole();
          await setupPermissionRole(
            { accessControl, owner },
            vaultRole,
            manageableVault.address,
            'setSequentialRequestProcessing(bool)',
            regularAccounts[0].address,
          );

          await accessControl.grantRole(
            roles.tokenRoles.mTBILL.depositVaultAdmin,
            regularAccounts[0].address,
          );

          await setSequentialRequestProcessingTest(
            { vault: manageableVault, owner },
            true,
            {
              from: regularAccounts[0],
            },
          );
        });
      });

      describe('removePaymentToken()', () => {
        it('should fail: call from address without VAULT_ADMIN_ROLE role', async () => {
          const { manageableVault, regularAccounts, owner } =
            await loadMvFixture();
          await removePaymentTokenTest(
            { vault: manageableVault, owner },
            ethers.constants.AddressZero,
            {
              revertCustomError: acErrors.WMAC_HASNT_PERMISSION,
              from: regularAccounts[0],
            },
          );
        });

        it('should fail: when token is not exists', async () => {
          const { owner, manageableVault, stableCoins } = await loadMvFixture();
          await removePaymentTokenTest(
            { vault: manageableVault, owner },
            stableCoins.dai.address,
            {
              revertCustomError: {
                customErrorName: 'PaymentTokenNotExists',
              },
            },
          );
        });

        it('call from address with VAULT_ADMIN_ROLE role', async () => {
          const { manageableVault, stableCoins, owner, dataFeed } =
            await loadMvFixture();
          await addPaymentTokenTest(
            { vault: manageableVault, owner },
            stableCoins.dai,
            dataFeed.address,
            0,
            true,
          );
          await removePaymentTokenTest(
            { vault: manageableVault, owner },
            stableCoins.dai.address,
          );
        });

        it('call from address with VAULT_ADMIN_ROLE role and add 3 options on a row', async () => {
          const { manageableVault, owner, stableCoins, dataFeed } =
            await loadMvFixture();

          await addPaymentTokenTest(
            { vault: manageableVault, owner },
            stableCoins.dai,
            dataFeed.address,
            0,
            true,
          );
          await addPaymentTokenTest(
            { vault: manageableVault, owner },
            stableCoins.usdc,
            dataFeed.address,
            0,
            true,
          );
          await addPaymentTokenTest(
            { vault: manageableVault, owner },
            stableCoins.usdt,
            dataFeed.address,
            0,
            true,
          );

          await removePaymentTokenTest(
            { vault: manageableVault, owner },
            stableCoins.dai.address,
          );
          await removePaymentTokenTest(
            { vault: manageableVault, owner },
            stableCoins.usdc.address,
          );
          await removePaymentTokenTest(
            { vault: manageableVault, owner },
            stableCoins.usdt.address,
          );

          await removePaymentTokenTest(
            { vault: manageableVault, owner },
            stableCoins.usdt.address,
            {
              revertCustomError: {
                customErrorName: 'PaymentTokenNotExists',
              },
            },
          );
        });

        it('should fail: when function is paused', async () => {
          const { manageableVault, owner, stableCoins, dataFeed } =
            await loadMvFixture();

          await addPaymentTokenTest(
            { vault: manageableVault, owner },
            stableCoins.dai,
            dataFeed.address,
            0,
            true,
          );

          await pauseVaultFn(
            { pauseManager, owner },
            manageableVault,
            encodeFnSelector('removePaymentToken(address)'),
          );

          await removePaymentTokenTest(
            { vault: manageableVault, owner },
            stableCoins.dai.address,
            {
              revertCustomError: {
                customErrorName: 'Paused',
              },
            },
          );
        });

        it('succeeds with only scoped function permission', async () => {
          const {
            accessControl,
            owner,
            manageableVault,
            regularAccounts,
            stableCoins,
            dataFeed,
          } = await loadMvFixture();

          await addPaymentTokenTest(
            { vault: manageableVault, owner },
            stableCoins.usdc,
            dataFeed.address,
            0,
            true,
          );

          const vaultRole = await manageableVault.contractAdminRole();
          await setupPermissionRole(
            { accessControl, owner },
            vaultRole,
            manageableVault.address,
            'removePaymentToken(address)',
            regularAccounts[0].address,
          );

          expect(
            await accessControl.hasRole(vaultRole, regularAccounts[0].address),
          ).eq(false);

          await removePaymentTokenTest(
            { vault: manageableVault, owner },
            stableCoins.usdc.address,
            { from: regularAccounts[0] },
          );
        });

        it('succeeds with scoped permission and vault admin role', async () => {
          const {
            accessControl,
            owner,
            manageableVault,
            regularAccounts,
            roles,
            stableCoins,
            dataFeed,
          } = await loadMvFixture();

          await addPaymentTokenTest(
            { vault: manageableVault, owner },
            stableCoins.usdt,
            dataFeed.address,
            0,
            true,
          );

          const vaultRole = await manageableVault.contractAdminRole();
          await setupPermissionRole(
            { accessControl, owner },
            vaultRole,
            manageableVault.address,
            'removePaymentToken(address)',
            regularAccounts[0].address,
          );

          await accessControl.grantRole(
            roles.tokenRoles.mTBILL.depositVaultAdmin,
            regularAccounts[0].address,
          );

          await removePaymentTokenTest(
            { vault: manageableVault, owner },
            stableCoins.usdt.address,
            { from: regularAccounts[0] },
          );
        });
      });

      describe('withdrawToken()', () => {
        it('should fail: call from address without VAULT_ADMIN_ROLE role', async () => {
          const { manageableVault, regularAccounts, owner } =
            await loadMvFixture();
          await withdrawTest(
            { vault: manageableVault, owner },
            ethers.constants.AddressZero,
            0,
            {
              revertCustomError: acErrors.WMAC_HASNT_PERMISSION,
              from: regularAccounts[0],
            },
          );
        });

        it('should fail: when there is no token in vault', async () => {
          const { owner, manageableVault, stableCoins } = await loadMvFixture();
          await withdrawTest(
            { vault: manageableVault, owner },
            stableCoins.dai,
            1,
            { revertMessage: 'ERC20: transfer amount exceeds balance' },
          );
        });

        it('call from address with VAULT_ADMIN_ROLE role', async () => {
          const { manageableVault, stableCoins, owner } = await loadMvFixture();
          await mintToken(stableCoins.dai, manageableVault, 1);
          await withdrawTest(
            { vault: manageableVault, owner },
            stableCoins.dai,
            1,
          );
        });

        it('should fail: when function is paused', async () => {
          const { manageableVault, stableCoins, owner } = await loadMvFixture();

          await pauseVaultFn(
            { pauseManager, owner },
            manageableVault,
            encodeFnSelector('withdrawToken(address,uint256)'),
          );

          await withdrawTest(
            { vault: manageableVault, owner },
            stableCoins.dai,
            1,
            {
              revertCustomError: {
                customErrorName: 'Paused',
              },
            },
          );
        });

        it('succeeds with only scoped function permission', async () => {
          const {
            accessControl,
            owner,
            manageableVault,
            regularAccounts,
            stableCoins,
          } = await loadMvFixture();

          await mintToken(stableCoins.dai, manageableVault, 1);

          const vaultRole = await manageableVault.contractAdminRole();
          await setupPermissionRole(
            { accessControl, owner },
            vaultRole,
            manageableVault.address,
            'withdrawToken(address,uint256)',
            regularAccounts[0].address,
          );

          expect(
            await accessControl.hasRole(vaultRole, regularAccounts[0].address),
          ).eq(false);

          await withdrawTest(
            { vault: manageableVault, owner },
            stableCoins.dai,
            1,
            { from: regularAccounts[0] },
          );
        });

        it('succeeds with scoped permission and vault admin role', async () => {
          const {
            accessControl,
            owner,
            manageableVault,
            regularAccounts,
            roles,
            stableCoins,
          } = await loadMvFixture();

          await mintToken(stableCoins.dai, manageableVault, 1);

          const vaultRole = await manageableVault.contractAdminRole();
          await setupPermissionRole(
            { accessControl, owner },
            vaultRole,
            manageableVault.address,
            'withdrawToken(address,uint256)',
            regularAccounts[0].address,
          );

          await accessControl.grantRole(
            roles.tokenRoles.mTBILL.depositVaultAdmin,
            regularAccounts[0].address,
          );

          await withdrawTest(
            { vault: manageableVault, owner },
            stableCoins.dai,
            1,
            { from: regularAccounts[0] },
          );
        });
      });

      describe('freeFromMinAmount()', async () => {
        it('should fail: call from address without vault admin role', async () => {
          const { manageableVault, regularAccounts } = await loadMvFixture();
          await expect(
            manageableVault
              .connect(regularAccounts[0])
              .freeFromMinAmount(regularAccounts[1].address, true),
          ).to.be.revertedWithCustomError(
            manageableVault,
            'NoFunctionPermission',
          );
        });
        it('should not fail', async () => {
          const { manageableVault, regularAccounts } = await loadMvFixture();
          await expect(
            manageableVault.freeFromMinAmount(regularAccounts[0].address, true),
          ).to.not.reverted;

          expect(
            await manageableVault.isFreeFromMinAmount(
              regularAccounts[0].address,
            ),
          ).to.eq(true);
        });
        it('should fail: already in list', async () => {
          const { manageableVault, regularAccounts } = await loadMvFixture();
          await expect(
            manageableVault.freeFromMinAmount(regularAccounts[0].address, true),
          ).to.not.reverted;

          expect(
            await manageableVault.isFreeFromMinAmount(
              regularAccounts[0].address,
            ),
          ).to.eq(true);

          await expect(
            manageableVault.freeFromMinAmount(regularAccounts[0].address, true),
          ).to.be.revertedWithCustomError(manageableVault, 'SameAddressValue');
        });

        it('should fail: when function is paused', async () => {
          const { manageableVault, regularAccounts } = await loadMvFixture();

          await pauseVaultFn(
            { pauseManager, owner },
            manageableVault,
            encodeFnSelector('freeFromMinAmount(address,bool)'),
          );

          await expect(
            manageableVault.freeFromMinAmount(regularAccounts[0].address, true),
          ).to.be.revertedWithCustomError(manageableVault, 'Paused');
        });

        it('succeeds with only scoped function permission', async () => {
          const { accessControl, owner, manageableVault, regularAccounts } =
            await loadMvFixture();

          const vaultRole = await manageableVault.contractAdminRole();
          await setupPermissionRole(
            { accessControl, owner },
            vaultRole,
            manageableVault.address,
            'freeFromMinAmount(address,bool)',
            regularAccounts[0].address,
          );

          expect(
            await accessControl.hasRole(vaultRole, regularAccounts[0].address),
          ).eq(false);

          await expect(
            manageableVault
              .connect(regularAccounts[0])
              .freeFromMinAmount(regularAccounts[2].address, true),
          ).to.not.reverted;

          expect(
            await manageableVault.isFreeFromMinAmount(
              regularAccounts[2].address,
            ),
          ).to.eq(true);
        });

        it('succeeds with scoped permission and vault admin role', async () => {
          const {
            accessControl,
            owner,
            manageableVault,
            regularAccounts,
            roles,
          } = await loadMvFixture();

          const vaultRole = await manageableVault.contractAdminRole();
          await setupPermissionRole(
            { accessControl, owner },
            vaultRole,
            manageableVault.address,
            'freeFromMinAmount(address,bool)',
            regularAccounts[0].address,
          );

          await accessControl.grantRole(
            roles.tokenRoles.mTBILL.depositVaultAdmin,
            regularAccounts[0].address,
          );

          await expect(
            manageableVault
              .connect(regularAccounts[0])
              .freeFromMinAmount(regularAccounts[3].address, true),
          ).to.not.reverted;

          expect(
            await manageableVault.isFreeFromMinAmount(
              regularAccounts[3].address,
            ),
          ).to.eq(true);
        });
      });

      describe('changeTokenAllowance()', () => {
        it('should fail: call from address without VAULT_ADMIN_ROLE role', async () => {
          const { manageableVault, regularAccounts, owner } =
            await loadMvFixture();
          await changeTokenAllowanceTest(
            { vault: manageableVault, owner },
            ethers.constants.AddressZero,
            0,
            {
              revertCustomError: acErrors.WMAC_HASNT_PERMISSION,
              from: regularAccounts[0],
            },
          );
        });
        it('should fail: token not exist', async () => {
          const { manageableVault, owner, stableCoins } = await loadMvFixture();
          await changeTokenAllowanceTest(
            { vault: manageableVault, owner },
            stableCoins.dai.address,
            0,
            {
              revertCustomError: {
                customErrorName: 'UnknownPaymentToken',
              },
            },
          );
        });
        it('allowance zero', async () => {
          const { manageableVault, owner, stableCoins, dataFeed } =
            await loadMvFixture();
          await addPaymentTokenTest(
            { vault: manageableVault, owner },
            stableCoins.dai,
            dataFeed.address,
            0,
            true,
          );
          await changeTokenAllowanceTest(
            { vault: manageableVault, owner },
            stableCoins.dai.address,
            0,
          );
        });

        it('should fail: when function is paused', async () => {
          const { manageableVault, owner, stableCoins, dataFeed } =
            await loadMvFixture();
          await addPaymentTokenTest(
            { vault: manageableVault, owner },
            stableCoins.dai,
            dataFeed.address,
            0,
            true,
          );

          await pauseVaultFn(
            { pauseManager, owner },
            manageableVault,
            encodeFnSelector('changeTokenAllowance(address,uint256)'),
          );

          await changeTokenAllowanceTest(
            { vault: manageableVault, owner },
            stableCoins.dai.address,
            100000000,
            {
              revertCustomError: {
                customErrorName: 'Paused',
              },
            },
          );
        });

        it('succeeds with only scoped function permission', async () => {
          const {
            accessControl,
            owner,
            manageableVault,
            regularAccounts,
            stableCoins,
            dataFeed,
          } = await loadMvFixture();

          await addPaymentTokenTest(
            { vault: manageableVault, owner },
            stableCoins.dai,
            dataFeed.address,
            0,
            true,
          );

          const vaultRole = await manageableVault.contractAdminRole();
          await setupPermissionRole(
            { accessControl, owner },
            vaultRole,
            manageableVault.address,
            'changeTokenAllowance(address,uint256)',
            regularAccounts[0].address,
          );

          expect(
            await accessControl.hasRole(vaultRole, regularAccounts[0].address),
          ).eq(false);

          await changeTokenAllowanceTest(
            { vault: manageableVault, owner },
            stableCoins.dai.address,
            100000000,
            { from: regularAccounts[0] },
          );
        });

        it('succeeds with scoped permission and vault admin role', async () => {
          const {
            accessControl,
            owner,
            manageableVault,
            regularAccounts,
            roles,
            stableCoins,
            dataFeed,
          } = await loadMvFixture();

          await addPaymentTokenTest(
            { vault: manageableVault, owner },
            stableCoins.usdc,
            dataFeed.address,
            0,
            true,
          );

          const vaultRole = await manageableVault.contractAdminRole();
          await setupPermissionRole(
            { accessControl, owner },
            vaultRole,
            manageableVault.address,
            'changeTokenAllowance(address,uint256)',
            regularAccounts[0].address,
          );

          await accessControl.grantRole(
            roles.tokenRoles.mTBILL.depositVaultAdmin,
            regularAccounts[0].address,
          );

          await changeTokenAllowanceTest(
            { vault: manageableVault, owner },
            stableCoins.usdc.address,
            100000000,
            { from: regularAccounts[0] },
          );
        });
      });

      describe('changeTokenFee()', () => {
        it('should fail: call from address without REDEMPTION_VAULT_ADMIN_ROLE role', async () => {
          const { manageableVault, regularAccounts, owner } =
            await loadMvFixture();
          await changeTokenFeeTest(
            { vault: manageableVault, owner },
            ethers.constants.AddressZero,
            0,
            {
              revertCustomError: acErrors.WMAC_HASNT_PERMISSION,
              from: regularAccounts[0],
            },
          );
        });
        it('should fail: token not exist', async () => {
          const { manageableVault, owner, stableCoins } = await loadMvFixture();
          await changeTokenFeeTest(
            { vault: manageableVault, owner },
            stableCoins.dai.address,
            0,
            {
              revertCustomError: {
                customErrorName: 'UnknownPaymentToken',
              },
            },
          );
        });
        it('should fail: fee > 100%', async () => {
          const { manageableVault, owner, stableCoins, dataFeed } =
            await loadMvFixture();
          await addPaymentTokenTest(
            { vault: manageableVault, owner },
            stableCoins.dai,
            dataFeed.address,
            0,
            true,
          );
          await changeTokenFeeTest(
            { vault: manageableVault, owner },
            stableCoins.dai.address,
            10001,
            {
              revertCustomError: {
                customErrorName: 'InvalidFee',
              },
            },
          );
        });
        it('call from address with REDEMPTION_VAULT_ADMIN_ROLE role', async () => {
          const { manageableVault, owner, stableCoins, dataFeed } =
            await loadMvFixture();
          await addPaymentTokenTest(
            { vault: manageableVault, owner },
            stableCoins.dai,
            dataFeed.address,
            0,
            true,
          );
          await changeTokenFeeTest(
            { vault: manageableVault, owner },
            stableCoins.dai.address,
            100,
          );
        });

        it('should fail: when function is paused', async () => {
          const { manageableVault, owner, stableCoins, dataFeed } =
            await loadMvFixture();
          await addPaymentTokenTest(
            { vault: manageableVault, owner },
            stableCoins.dai,
            dataFeed.address,
            0,
            true,
          );

          await pauseVaultFn(
            { pauseManager, owner },
            manageableVault,
            encodeFnSelector('changeTokenFee(address,uint256)'),
          );

          await changeTokenFeeTest(
            { vault: manageableVault, owner },
            stableCoins.dai.address,
            100,
            {
              revertCustomError: {
                customErrorName: 'Paused',
              },
            },
          );
        });

        it('succeeds with only scoped function permission', async () => {
          const {
            accessControl,
            owner,
            manageableVault,
            regularAccounts,
            stableCoins,
            dataFeed,
          } = await loadMvFixture();

          await addPaymentTokenTest(
            { vault: manageableVault, owner },
            stableCoins.dai,
            dataFeed.address,
            0,
            true,
          );

          const vaultRole = await manageableVault.contractAdminRole();
          await setupPermissionRole(
            { accessControl, owner },
            vaultRole,
            manageableVault.address,
            'changeTokenFee(address,uint256)',
            regularAccounts[0].address,
          );

          expect(
            await accessControl.hasRole(vaultRole, regularAccounts[0].address),
          ).eq(false);

          await changeTokenFeeTest(
            { vault: manageableVault, owner },
            stableCoins.dai.address,
            100,
            { from: regularAccounts[0] },
          );
        });

        it('succeeds with scoped permission and vault admin role', async () => {
          const {
            accessControl,
            owner,
            manageableVault,
            regularAccounts,
            roles,
            stableCoins,
            dataFeed,
          } = await loadMvFixture();

          await addPaymentTokenTest(
            { vault: manageableVault, owner },
            stableCoins.usdc,
            dataFeed.address,
            0,
            true,
          );

          const vaultRole = await manageableVault.contractAdminRole();
          await setupPermissionRole(
            { accessControl, owner },
            vaultRole,
            manageableVault.address,
            'changeTokenFee(address,uint256)',
            regularAccounts[0].address,
          );

          await accessControl.grantRole(
            roles.tokenRoles.mTBILL.depositVaultAdmin,
            regularAccounts[0].address,
          );

          await changeTokenFeeTest(
            { vault: manageableVault, owner },
            stableCoins.usdc.address,
            100,
            { from: regularAccounts[0] },
          );
        });
      });

      describe('internal functions', () => {
        it('should fail: invalid rounding tokenTransferFromToTester()', async () => {
          const { manageableVault, stableCoins, owner } = await loadMvFixture();

          await mintToken(stableCoins.usdc, owner, 1000);

          await approveBase18(owner, stableCoins.usdc, manageableVault, 1000);

          await expect(
            manageableVault.tokenTransferFromToTester(
              stableCoins.usdc.address,
              owner.address,
              manageableVault.address,
              parseUnits('999.999999999'),
              8,
            ),
          ).to.be.revertedWithCustomError(manageableVault, 'InvalidRounding');
        });

        it('should fail: invalid rounding tokenTransferToUserTester()', async () => {
          const { manageableVault, stableCoins, owner } = await loadMvFixture();

          await mintToken(stableCoins.usdc, manageableVault, 1000);

          await expect(
            manageableVault.tokenTransferToUserTester(
              stableCoins.usdc.address,
              owner.address,
              parseUnits('999.999999999'),
              8,
            ),
          ).to.be.revertedWithCustomError(manageableVault, 'InvalidRounding');
        });
      });
    });

    otherTests(mvFixture);
  });
};
