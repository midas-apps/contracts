import { loadFixture } from '@nomicfoundation/hardhat-network-helpers';
import { increase } from '@nomicfoundation/hardhat-network-helpers/dist/src/helpers/time';
import {
  days,
  hours,
} from '@nomicfoundation/hardhat-network-helpers/dist/src/helpers/time/duration';
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { expect } from 'chai';
import { constants } from 'ethers';
import { parseUnits } from 'ethers/lib/utils';
import { ethers } from 'hardhat';

import { encodeFnSelector } from '../../../helpers/utils';
import {
  DepositVaultTest,
  DepositVaultTest__factory,
  DepositVaultWithAaveTest,
  DepositVaultWithMTokenTest,
  DepositVaultWithUSTBTest,
  DepositVaultWithMorphoTest,
  ManageableVaultTester__factory,
  Pausable,
} from '../../../typechain-types';
import {
  acErrors,
  blackList,
  greenList,
  setupVaultScopedFunctionPermission,
} from '../../common/ac.helpers';
import {
  approveBase18,
  mintToken,
  pauseVault,
  pauseVaultFn,
  unpauseVaultFn,
} from '../../common/common.helpers';
import {
  setMinGrowthApr,
  setRoundDataGrowth,
} from '../../common/custom-feed-growth.helpers';
import { setRoundData } from '../../common/data-feed.helpers';
import {
  setMaxSupplyCapTest,
  approveRequestTest,
  depositInstantTest,
  depositRequestTest,
  rejectRequestTest,
  safeBulkApproveRequestTest,
  expectedDepositHoldbackPartRateFromAvg,
} from '../../common/deposit-vault.helpers';
import { DefaultFixture } from '../../common/fixtures';
import { greenListEnable } from '../../common/greenlist.helpers';
import {
  addPaymentTokenTest,
  removePaymentTokenTest,
  setVariabilityToleranceTest,
  withdrawTest,
  addWaivedFeeAccountTest,
  changeTokenAllowanceTest,
  changeTokenFeeTest,
  removeInstantLimitConfigTest,
  removeWaivedFeeAccountTest,
  setInstantFeeTest,
  setInstantLimitConfigTest,
  setMinAmountTest,
  setMinMaxInstantFeeTest,
  setMinAmountToDepositTest,
  setMaxInstantShareTest,
} from '../../common/manageable-vault.helpers';
import { sanctionUser } from '../../common/with-sanctions-list.helpers';

const REDEMPTION_APPROVE_FN_SELECTORS = [
  encodeFnSelector('approveRequest(uint256,uint256)'),
  encodeFnSelector('safeApproveRequest(uint256,uint256)'),
  encodeFnSelector('approveRequestAvgRate(uint256,uint256)'),
  encodeFnSelector('safeApproveRequestAvgRate(uint256,uint256)'),
  encodeFnSelector('safeBulkApproveRequestAtSavedRate(uint256[])'),
  encodeFnSelector('safeBulkApproveRequest(uint256[])'),
  encodeFnSelector('safeBulkApproveRequest(uint256[],uint256)'),
  encodeFnSelector('safeBulkApproveRequestAvgRate(uint256[])'),
  encodeFnSelector('safeBulkApproveRequestAvgRate(uint256[],uint256)'),
] as const;

const pauseOtherDepositApproveFns = async (
  depositVault: Pausable,
  exceptSelector: (typeof REDEMPTION_APPROVE_FN_SELECTORS)[number],
) => {
  for (const selector of REDEMPTION_APPROVE_FN_SELECTORS) {
    if (selector === exceptSelector) {
      continue;
    }
    await pauseVaultFn(depositVault, selector);
  }
};
export const depositVaultSuits = (
  dvName: string,
  dvFixture: () => Promise<DefaultFixture>,
  dvConfifg: {
    createNew: (
      owner: SignerWithAddress,
    ) => Promise<
      | DepositVaultTest
      | DepositVaultWithAaveTest
      | DepositVaultWithMTokenTest
      | DepositVaultWithUSTBTest
      | DepositVaultWithMorphoTest
    >;
    key:
      | 'depositVault'
      | 'depositVaultWithUSTB'
      | 'depositVaultWithMToken'
      | 'depositVaultWithAave'
      | 'depositVaultWithMorpho';
  },
  deploymentAdditionalChecks: (fixtureRes: DefaultFixture) => Promise<void>,
  otherTests: (fixture: () => Promise<DefaultFixture>) => void,
) => {
  const loadDvFixture = async () => {
    const fixture = await loadFixture(dvFixture);

    const { createNew, key } = dvConfifg;
    return {
      ...fixture,
      originalDepositVault: fixture.depositVault,
      depositVault: DepositVaultTest__factory.connect(
        fixture[key].address,
        fixture.owner,
      ),
      createNew: async () => {
        const dv = await createNew(fixture.owner);
        return DepositVaultTest__factory.connect(dv.address, fixture.owner);
      },
    };
  };

  describe(dvName, function () {
    it('deployment', async () => {
      const fixture = await loadDvFixture();
      const {
        depositVault,
        mTBILL,
        tokensReceiver,
        feeReceiver,
        mTokenToUsdDataFeed,
        roles,
      } = fixture;

      expect(await depositVault.mToken()).eq(mTBILL.address);

      expect(await depositVault.ONE_HUNDRED_PERCENT()).eq('10000');

      expect(await depositVault.paused()).eq(false);

      expect(await depositVault.tokensReceiver()).eq(tokensReceiver.address);
      expect(await depositVault.feeReceiver()).eq(feeReceiver.address);

      expect(await depositVault.minAmount()).eq(parseUnits('100'));

      expect(await depositVault.instantFee()).eq('100');

      expect(await depositVault.mTokenDataFeed()).eq(
        mTokenToUsdDataFeed.address,
      );
      expect(await depositVault.variationTolerance()).eq(1);

      expect(await depositVault.vaultRole()).eq(
        roles.tokenRoles.mTBILL.depositVaultAdmin,
      );

      expect(await depositVault.minInstantFee()).eq(0);
      expect(await depositVault.maxInstantFee()).eq(10000);
      expect((await depositVault.getLimitConfigs()).windows.length).eq(1);
      expect((await depositVault.getLimitConfigs()).configs.length).eq(1);
      const limitConfigs = await depositVault.getLimitConfigs();
      const limitConfig = limitConfigs.configs[0];
      const limitWindow = limitConfigs.windows[0];

      expect(limitConfig.limit).eq(parseUnits('100000'));
      expect(limitConfig.limitUsed).eq(0);
      expect(limitConfig.lastEpoch).eq(0);

      expect(limitWindow).eq(days(1));

      expect(await depositVault.minMTokenAmountForFirstDeposit()).eq('0');

      expect(await depositVault.maxSupplyCap()).eq(constants.MaxUint256);

      await deploymentAdditionalChecks({
        ...fixture,
        depositVault: fixture.originalDepositVault as DepositVaultTest,
      });
    });

    describe('common', () => {
      it('failing deployment', async () => {
        const {
          accessControl,
          mTBILL,
          mTokenToUsdDataFeed,
          feeReceiver,
          tokensReceiver,
          mockedSanctionsList,
          createNew,
        } = await loadDvFixture();
        const depositVault = await createNew();

        await expect(
          depositVault.initialize(
            {
              ac: ethers.constants.AddressZero,
              sanctionsList: mockedSanctionsList.address,
              variationTolerance: 1,
              minAmount: parseUnits('100'),
              mToken: mTBILL.address,
              mTokenDataFeed: mTokenToUsdDataFeed.address,
              feeReceiver: feeReceiver.address,
              tokensReceiver: tokensReceiver.address,
              instantFee: 100,
              minInstantFee: 0,
              maxInstantFee: 10000,
              limitConfigs: [
                {
                  limit: parseUnits('100000'),
                  window: days(1),
                },
              ],
              maxInstantShare: 100_00,
            },
            {
              minMTokenAmountForFirstDeposit: parseUnits('100'),
              maxSupplyCap: constants.MaxUint256,
            },
          ),
        ).to.be.reverted;
        await expect(
          depositVault.initialize(
            {
              ac: accessControl.address,
              sanctionsList: mockedSanctionsList.address,
              variationTolerance: 1,
              minAmount: parseUnits('100'),
              mToken: constants.AddressZero,
              mTokenDataFeed: mTokenToUsdDataFeed.address,
              feeReceiver: feeReceiver.address,
              tokensReceiver: tokensReceiver.address,
              instantFee: 100,
              minInstantFee: 0,
              maxInstantFee: 10000,
              limitConfigs: [
                {
                  limit: parseUnits('100000'),
                  window: days(1),
                },
              ],
              maxInstantShare: 100_00,
            },
            {
              minMTokenAmountForFirstDeposit: parseUnits('100'),
              maxSupplyCap: constants.MaxUint256,
            },
          ),
        ).to.be.reverted;
        await expect(
          depositVault.initialize(
            {
              ac: accessControl.address,
              sanctionsList: mockedSanctionsList.address,
              variationTolerance: 1,
              minAmount: parseUnits('100'),
              mToken: mTBILL.address,
              mTokenDataFeed: constants.AddressZero,
              feeReceiver: feeReceiver.address,
              tokensReceiver: tokensReceiver.address,
              instantFee: 100,
              minInstantFee: 0,
              maxInstantFee: 10000,
              limitConfigs: [
                {
                  limit: parseUnits('100000'),
                  window: days(1),
                },
              ],
              maxInstantShare: 100_00,
            },
            {
              minMTokenAmountForFirstDeposit: parseUnits('100'),
              maxSupplyCap: constants.MaxUint256,
            },
          ),
        ).to.be.reverted;
        await expect(
          depositVault.initialize(
            {
              ac: accessControl.address,
              sanctionsList: mockedSanctionsList.address,
              variationTolerance: 1,
              minAmount: parseUnits('100'),
              mToken: mTBILL.address,
              mTokenDataFeed: mTokenToUsdDataFeed.address,
              feeReceiver: ethers.constants.AddressZero,
              tokensReceiver: tokensReceiver.address,
              instantFee: 100,
              minInstantFee: 0,
              maxInstantFee: 10000,
              limitConfigs: [
                {
                  limit: parseUnits('100000'),
                  window: days(1),
                },
              ],
              maxInstantShare: 100_00,
            },
            {
              minMTokenAmountForFirstDeposit: parseUnits('100'),
              maxSupplyCap: constants.MaxUint256,
            },
          ),
        ).to.be.reverted;
        await expect(
          depositVault.initialize(
            {
              ac: accessControl.address,
              sanctionsList: mockedSanctionsList.address,
              variationTolerance: 1,
              minAmount: parseUnits('100'),
              mToken: mTBILL.address,
              mTokenDataFeed: mTokenToUsdDataFeed.address,
              feeReceiver: feeReceiver.address,
              tokensReceiver: ethers.constants.AddressZero,
              instantFee: 100,
              minInstantFee: 0,
              maxInstantFee: 10000,
              limitConfigs: [
                {
                  limit: parseUnits('100000'),
                  window: days(1),
                },
              ],
              maxInstantShare: 100_00,
            },
            {
              minMTokenAmountForFirstDeposit: parseUnits('100'),
              maxSupplyCap: constants.MaxUint256,
            },
          ),
        ).to.be.reverted;
        await expect(
          depositVault.initialize(
            {
              ac: accessControl.address,
              sanctionsList: mockedSanctionsList.address,
              variationTolerance: 1,
              minAmount: parseUnits('100'),
              mToken: mTBILL.address,
              mTokenDataFeed: mTokenToUsdDataFeed.address,
              feeReceiver: feeReceiver.address,
              tokensReceiver: tokensReceiver.address,
              instantFee: 10001,
              minInstantFee: 0,
              maxInstantFee: 10000,
              limitConfigs: [
                {
                  limit: parseUnits('100000'),
                  window: days(1),
                },
              ],
              maxInstantShare: 100_00,
            },
            {
              minMTokenAmountForFirstDeposit: parseUnits('100'),
              maxSupplyCap: constants.MaxUint256,
            },
          ),
        ).to.be.reverted;
      });

      describe('initialization', () => {
        it('should fail: cal; initialize() when already initialized', async () => {
          const { depositVault } = await loadDvFixture();

          await expect(
            depositVault.initialize(
              {
                ac: constants.AddressZero,
                sanctionsList: constants.AddressZero,
                variationTolerance: 1,
                minAmount: 0,
                mToken: constants.AddressZero,
                mTokenDataFeed: constants.AddressZero,
                feeReceiver: constants.AddressZero,
                tokensReceiver: constants.AddressZero,
                instantFee: 0,
                minInstantFee: 0,
                maxInstantFee: 0,
                limitConfigs: [],
                maxInstantShare: 0,
              },
              {
                minMTokenAmountForFirstDeposit: 0,
                maxSupplyCap: constants.MaxUint256,
              },
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
          } = await loadDvFixture();

          const vault = await new ManageableVaultTester__factory(
            owner,
          ).deploy();

          await expect(
            vault.initializeWithoutInitializer({
              ac: accessControl.address,
              sanctionsList: mockedSanctionsList.address,
              variationTolerance: 1,
              minAmount: parseUnits('100'),
              mToken: mTBILL.address,
              mTokenDataFeed: mTokenToUsdDataFeed.address,
              feeReceiver: feeReceiver.address,
              tokensReceiver: tokensReceiver.address,
              instantFee: 100,
              minInstantFee: 0,
              maxInstantFee: 10000,
              limitConfigs: [
                {
                  limit: parseUnits('100000'),
                  window: days(1),
                },
              ],
              maxInstantShare: 100_00,
            }),
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
          } = await loadDvFixture();

          const vault = await new ManageableVaultTester__factory(
            owner,
          ).deploy();

          await expect(
            vault.initialize({
              ac: accessControl.address,
              sanctionsList: mockedSanctionsList.address,
              variationTolerance: 1,
              minAmount: parseUnits('100'),
              mToken: mTBILL.address,
              mTokenDataFeed: mTokenToUsdDataFeed.address,
              feeReceiver: feeReceiver.address,
              tokensReceiver: vault.address,
              instantFee: 100,
              minInstantFee: 0,
              maxInstantFee: 10000,
              limitConfigs: [
                {
                  limit: parseUnits('100000'),
                  window: days(1),
                },
              ],
              maxInstantShare: 100_00,
            }),
          ).to.be.revertedWithCustomError(vault, 'InvalidAddress');
        });
        it('should fail: when _feeReceiver == address(this)', async () => {
          const {
            owner,
            accessControl,
            mTBILL,
            tokensReceiver,
            mTokenToUsdDataFeed,
            mockedSanctionsList,
          } = await loadDvFixture();

          const vault = await new ManageableVaultTester__factory(
            owner,
          ).deploy();

          await expect(
            vault.initialize({
              ac: accessControl.address,
              sanctionsList: mockedSanctionsList.address,
              variationTolerance: 1,
              minAmount: parseUnits('100'),
              mToken: mTBILL.address,
              mTokenDataFeed: mTokenToUsdDataFeed.address,
              feeReceiver: vault.address,
              tokensReceiver: tokensReceiver.address,
              instantFee: 100,
              minInstantFee: 0,
              maxInstantFee: 10000,
              limitConfigs: [
                {
                  limit: parseUnits('100000'),
                  window: days(1),
                },
              ],
              maxInstantShare: 100_00,
            }),
          ).to.be.revertedWithCustomError(vault, 'InvalidAddress');
        });

        it('should fail: when mToken dataFeed address zero', async () => {
          const {
            owner,
            accessControl,
            mTBILL,
            tokensReceiver,
            feeReceiver,
            mockedSanctionsList,
          } = await loadDvFixture();

          const vault = await new ManageableVaultTester__factory(
            owner,
          ).deploy();

          await expect(
            vault.initialize({
              ac: accessControl.address,
              sanctionsList: mockedSanctionsList.address,
              variationTolerance: 1,
              minAmount: parseUnits('100'),
              mToken: mTBILL.address,
              mTokenDataFeed: constants.AddressZero,
              feeReceiver: feeReceiver.address,
              tokensReceiver: tokensReceiver.address,
              instantFee: 100,
              minInstantFee: 0,
              maxInstantFee: 10000,
              limitConfigs: [
                {
                  limit: parseUnits('100000'),
                  window: days(1),
                },
              ],
              maxInstantShare: 100_00,
            }),
          ).to.be.revertedWithCustomError(vault, 'InvalidAddress');
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
          } = await loadDvFixture();

          const vault = await new ManageableVaultTester__factory(
            owner,
          ).deploy();

          await expect(
            vault.initialize({
              ac: accessControl.address,
              sanctionsList: mockedSanctionsList.address,
              variationTolerance: 0,
              minAmount: parseUnits('100'),
              mToken: mTBILL.address,
              mTokenDataFeed: mTokenToUsdDataFeed.address,
              feeReceiver: feeReceiver.address,
              tokensReceiver: tokensReceiver.address,
              instantFee: 100,
              minInstantFee: 0,
              maxInstantFee: 10000,
              limitConfigs: [
                {
                  limit: parseUnits('100000'),
                  window: days(1),
                },
              ],
              maxInstantShare: 100_00,
            }),
          ).to.be.revertedWithCustomError(vault, 'InvalidFee');
        });
      });

      describe('setMinMTokenAmountForFirstDeposit()', () => {
        it('should fail: call from address without DEPOSIT_VAULT_ADMIN_ROLE role', async () => {
          const { owner, depositVault, regularAccounts } =
            await loadDvFixture();

          await setMinAmountToDepositTest({ depositVault, owner }, 1.1, {
            from: regularAccounts[0],
            revertCustomError: acErrors.WMAC_HASNT_PERMISSION,
          });
        });

        it('call from address with DEPOSIT_VAULT_ADMIN_ROLE role', async () => {
          const { owner, depositVault } = await loadDvFixture();
          await setMinAmountToDepositTest({ depositVault, owner }, 1.1);
        });

        it('should fail: when function is paused', async () => {
          const { owner, depositVault } = await loadDvFixture();

          await pauseVaultFn(
            depositVault,
            encodeFnSelector('setMinMTokenAmountForFirstDeposit(uint256)'),
          );

          await setMinAmountToDepositTest({ depositVault, owner }, 1.1, {
            revertCustomError: {
              customErrorName: 'FnPaused',
            },
          });
        });

        it('succeeds with only scoped function permission', async () => {
          const { accessControl, owner, depositVault, regularAccounts } =
            await loadDvFixture();

          const vaultRole = await depositVault.vaultRole();
          await setupVaultScopedFunctionPermission(
            { accessControl, owner },
            vaultRole,
            depositVault.address,
            'setMinMTokenAmountForFirstDeposit(uint256)',
            regularAccounts[0].address,
          );

          expect(
            await accessControl.hasRole(vaultRole, regularAccounts[0].address),
          ).eq(false);

          await setMinAmountToDepositTest({ depositVault, owner }, 2.2, {
            from: regularAccounts[0],
          });
        });

        it('succeeds with scoped permission and vault admin role', async () => {
          const { accessControl, owner, depositVault, regularAccounts, roles } =
            await loadDvFixture();

          const vaultRole = await depositVault.vaultRole();
          await setupVaultScopedFunctionPermission(
            { accessControl, owner },
            vaultRole,
            depositVault.address,
            'setMinMTokenAmountForFirstDeposit(uint256)',
            regularAccounts[0].address,
          );

          await accessControl.grantRole(
            roles.tokenRoles.mTBILL.depositVaultAdmin,
            regularAccounts[0].address,
          );

          await setMinAmountToDepositTest({ depositVault, owner }, 2.2, {
            from: regularAccounts[0],
          });
        });
      });

      describe('setMaxSupplyCap()', () => {
        it('should fail: call from address without DEPOSIT_VAULT_ADMIN_ROLE role', async () => {
          const { owner, depositVault, regularAccounts } =
            await loadDvFixture();

          await setMaxSupplyCapTest({ depositVault, owner }, 1.1, {
            from: regularAccounts[0],
            revertCustomError: acErrors.WMAC_HASNT_PERMISSION,
          });
        });

        it('call from address with DEPOSIT_VAULT_ADMIN_ROLE role', async () => {
          const { owner, depositVault } = await loadDvFixture();
          await setMaxSupplyCapTest({ depositVault, owner }, 1.1);
        });

        it('should fail: when function is paused', async () => {
          const { owner, depositVault } = await loadDvFixture();

          await pauseVaultFn(
            depositVault,
            encodeFnSelector('setMaxSupplyCap(uint256)'),
          );

          await setMaxSupplyCapTest({ depositVault, owner }, 1.1, {
            revertCustomError: {
              customErrorName: 'FnPaused',
            },
          });
        });

        it('succeeds with only scoped function permission', async () => {
          const { accessControl, owner, depositVault, regularAccounts } =
            await loadDvFixture();

          const vaultRole = await depositVault.vaultRole();
          await setupVaultScopedFunctionPermission(
            { accessControl, owner },
            vaultRole,
            depositVault.address,
            'setMaxSupplyCap(uint256)',
            regularAccounts[0].address,
          );

          expect(
            await accessControl.hasRole(vaultRole, regularAccounts[0].address),
          ).eq(false);

          await setMaxSupplyCapTest({ depositVault, owner }, 2.2, {
            from: regularAccounts[0],
          });
        });

        it('succeeds with scoped permission and vault admin role', async () => {
          const { accessControl, owner, depositVault, regularAccounts, roles } =
            await loadDvFixture();

          const vaultRole = await depositVault.vaultRole();
          await setupVaultScopedFunctionPermission(
            { accessControl, owner },
            vaultRole,
            depositVault.address,
            'setMaxSupplyCap(uint256)',
            regularAccounts[0].address,
          );

          await accessControl.grantRole(
            roles.tokenRoles.mTBILL.depositVaultAdmin,
            regularAccounts[0].address,
          );

          await setMaxSupplyCapTest({ depositVault, owner }, 2.2, {
            from: regularAccounts[0],
          });
        });
      });

      describe('setMinAmount()', () => {
        it('should fail: call from address without DEPOSIT_VAULT_ADMIN_ROLE role', async () => {
          const { owner, depositVault, regularAccounts } =
            await loadDvFixture();

          await setMinAmountTest({ vault: depositVault, owner }, 1.1, {
            from: regularAccounts[0],
            revertCustomError: acErrors.WMAC_HASNT_PERMISSION,
          });
        });

        it('call from address with DEPOSIT_VAULT_ADMIN_ROLE role', async () => {
          const { owner, depositVault } = await loadDvFixture();
          await setMinAmountTest({ vault: depositVault, owner }, 1.1);
        });

        it('should fail: when function is paused', async () => {
          const { owner, depositVault } = await loadDvFixture();

          await pauseVaultFn(
            depositVault,
            encodeFnSelector('setMinAmount(uint256)'),
          );

          await setMinAmountTest({ vault: depositVault, owner }, 1.1, {
            revertCustomError: {
              customErrorName: 'FnPaused',
            },
          });
        });

        it('succeeds with only scoped function permission', async () => {
          const { accessControl, owner, depositVault, regularAccounts } =
            await loadDvFixture();

          const vaultRole = await depositVault.vaultRole();
          await setupVaultScopedFunctionPermission(
            { accessControl, owner },
            vaultRole,
            depositVault.address,
            'setMinAmount(uint256)',
            regularAccounts[0].address,
          );

          expect(
            await accessControl.hasRole(vaultRole, regularAccounts[0].address),
          ).eq(false);

          await setMinAmountTest({ vault: depositVault, owner }, 200, {
            from: regularAccounts[0],
          });
        });

        it('succeeds with scoped permission and vault admin role', async () => {
          const { accessControl, owner, depositVault, regularAccounts, roles } =
            await loadDvFixture();

          const vaultRole = await depositVault.vaultRole();
          await setupVaultScopedFunctionPermission(
            { accessControl, owner },
            vaultRole,
            depositVault.address,
            'setMinAmount(uint256)',
            regularAccounts[0].address,
          );

          await accessControl.grantRole(
            roles.tokenRoles.mTBILL.depositVaultAdmin,
            regularAccounts[0].address,
          );

          await setMinAmountTest({ vault: depositVault, owner }, 200, {
            from: regularAccounts[0],
          });
        });
      });

      describe('pauseFn()', () => {
        it('vault admin can pauseFn / unpauseFn other selectors while pauseFn(bytes4) is paused', async () => {
          const { depositVault } = await loadDvFixture();

          const pauseFnSelector = encodeFnSelector('pauseFn(bytes4)');
          const otherSelector = encodeFnSelector('setMinAmount(uint256)');

          await pauseVaultFn(depositVault, pauseFnSelector);
          expect(await depositVault.fnPaused(pauseFnSelector)).eq(true);

          await pauseVaultFn(depositVault, otherSelector);
          expect(await depositVault.fnPaused(otherSelector)).eq(true);

          await unpauseVaultFn(depositVault, otherSelector);
          expect(await depositVault.fnPaused(otherSelector)).eq(false);
        });
      });

      describe('setInstantLimitConfig()', () => {
        it('should fail: call from address without DEPOSIT_VAULT_ADMIN_ROLE role', async () => {
          const { owner, depositVault, regularAccounts } =
            await loadDvFixture();

          await setInstantLimitConfigTest(
            { vault: depositVault, owner },
            parseUnits('1000'),
            {
              from: regularAccounts[0],
              revertCustomError: acErrors.WMAC_HASNT_PERMISSION,
            },
          );
        });

        it('shouldnt fail when set 0 limit', async () => {
          const { owner, depositVault } = await loadDvFixture();

          await setInstantLimitConfigTest(
            { vault: depositVault, owner },
            constants.Zero,
          );
        });

        it('call from address with DEPOSIT_VAULT_ADMIN_ROLE role', async () => {
          const { owner, depositVault } = await loadDvFixture();
          await setInstantLimitConfigTest(
            { vault: depositVault, owner },
            parseUnits('1000'),
          );
        });

        it('should fail: when function is paused', async () => {
          const { owner, depositVault } = await loadDvFixture();

          await pauseVaultFn(
            depositVault,
            encodeFnSelector('setInstantLimitConfig(uint256,uint256)'),
          );

          await setInstantLimitConfigTest(
            { vault: depositVault, owner },
            parseUnits('1000'),
            {
              revertCustomError: {
                customErrorName: 'FnPaused',
              },
            },
          );
        });

        it('call with custom window duration', async () => {
          const { owner, depositVault } = await loadDvFixture();

          await setInstantLimitConfigTest(
            { vault: depositVault, owner },
            { window: days(2), limit: parseUnits('500') },
          );
        });

        it('updates limit for an existing window and preserves limitUsed and lastEpoch', async () => {
          const { owner, depositVault } = await loadDvFixture();

          await setInstantLimitConfigTest(
            { vault: depositVault, owner },
            { window: days(1), limit: parseUnits('1000') },
          );
          await setInstantLimitConfigTest(
            { vault: depositVault, owner },
            { window: days(1), limit: parseUnits('2000') },
          );
        });

        it('succeeds with only scoped function permission', async () => {
          const { accessControl, owner, depositVault, regularAccounts } =
            await loadDvFixture();

          const vaultRole = await depositVault.vaultRole();
          await setupVaultScopedFunctionPermission(
            { accessControl, owner },
            vaultRole,
            depositVault.address,
            'setInstantLimitConfig(uint256,uint256)',
            regularAccounts[0].address,
          );

          expect(
            await accessControl.hasRole(vaultRole, regularAccounts[0].address),
          ).eq(false);

          await setInstantLimitConfigTest(
            { vault: depositVault, owner },
            parseUnits('1000'),
            { from: regularAccounts[0] },
          );
        });

        it('succeeds with scoped permission and vault admin role', async () => {
          const { accessControl, owner, depositVault, regularAccounts, roles } =
            await loadDvFixture();

          const vaultRole = await depositVault.vaultRole();
          await setupVaultScopedFunctionPermission(
            { accessControl, owner },
            vaultRole,
            depositVault.address,
            'setInstantLimitConfig(uint256,uint256)',
            regularAccounts[0].address,
          );

          await accessControl.grantRole(
            roles.tokenRoles.mTBILL.depositVaultAdmin,
            regularAccounts[0].address,
          );

          await setInstantLimitConfigTest(
            { vault: depositVault, owner },
            parseUnits('1000'),
            { from: regularAccounts[0] },
          );
        });
      });

      describe('removeInstantLimitConfig()', () => {
        it('should fail: call from address without DEPOSIT_VAULT_ADMIN_ROLE role', async () => {
          const { owner, depositVault, regularAccounts } =
            await loadDvFixture();

          await setInstantLimitConfigTest(
            { vault: depositVault, owner },
            parseUnits('1000'),
          );

          await removeInstantLimitConfigTest(
            { vault: depositVault, owner },
            days(1),
            {
              from: regularAccounts[0],
              revertCustomError: acErrors.WMAC_HASNT_PERMISSION,
            },
          );
        });

        it('should fail: window not found', async () => {
          const { owner, depositVault } = await loadDvFixture();

          await removeInstantLimitConfigTest(
            { vault: depositVault, owner },
            days(7),
            {
              revertCustomError: {
                customErrorName: 'InstantLimitWindowNotExists',
              },
            },
          );
        });

        it('should fail: when function is paused', async () => {
          const { owner, depositVault } = await loadDvFixture();

          await setInstantLimitConfigTest(
            { vault: depositVault, owner },
            parseUnits('1000'),
          );

          await pauseVaultFn(
            depositVault,
            encodeFnSelector('removeInstantLimitConfig(uint256)'),
          );

          await removeInstantLimitConfigTest(
            { vault: depositVault, owner },
            days(1),
            {
              revertCustomError: {
                customErrorName: 'FnPaused',
              },
            },
          );
        });

        it('succeeds with only scoped function permission', async () => {
          const { accessControl, owner, depositVault, regularAccounts } =
            await loadDvFixture();

          await setInstantLimitConfigTest(
            { vault: depositVault, owner },
            parseUnits('1000'),
          );

          const vaultRole = await depositVault.vaultRole();
          await setupVaultScopedFunctionPermission(
            { accessControl, owner },
            vaultRole,
            depositVault.address,
            'removeInstantLimitConfig(uint256)',
            regularAccounts[0].address,
          );

          expect(
            await accessControl.hasRole(vaultRole, regularAccounts[0].address),
          ).eq(false);

          await removeInstantLimitConfigTest(
            { vault: depositVault, owner },
            days(1),
            { from: regularAccounts[0] },
          );
        });

        it('succeeds with scoped permission and vault admin role', async () => {
          const { accessControl, owner, depositVault, regularAccounts, roles } =
            await loadDvFixture();

          await setInstantLimitConfigTest(
            { vault: depositVault, owner },
            parseUnits('1000'),
          );

          const vaultRole = await depositVault.vaultRole();
          await setupVaultScopedFunctionPermission(
            { accessControl, owner },
            vaultRole,
            depositVault.address,
            'removeInstantLimitConfig(uint256)',
            regularAccounts[0].address,
          );

          await accessControl.grantRole(
            roles.tokenRoles.mTBILL.depositVaultAdmin,
            regularAccounts[0].address,
          );

          await removeInstantLimitConfigTest(
            { vault: depositVault, owner },
            days(1),
            { from: regularAccounts[0] },
          );
        });

        it('call from address with DEPOSIT_VAULT_ADMIN_ROLE role', async () => {
          const { owner, depositVault } = await loadDvFixture();

          await setInstantLimitConfigTest(
            { vault: depositVault, owner },
            parseUnits('1000'),
          );

          await removeInstantLimitConfigTest(
            { vault: depositVault, owner },
            days(1),
          );
        });

        it('removes one window while another remains', async () => {
          const { owner, depositVault } = await loadDvFixture();

          await setInstantLimitConfigTest(
            { vault: depositVault, owner },
            { window: days(1), limit: parseUnits('1000') },
          );
          await setInstantLimitConfigTest(
            { vault: depositVault, owner },
            { window: days(2), limit: parseUnits('2000') },
          );

          await removeInstantLimitConfigTest(
            { vault: depositVault, owner },
            days(1),
          );

          const { windows, configs } = await depositVault.getLimitConfigs();
          expect(windows.length).eq(1);
          expect(windows[0]).eq(days(2));
          expect(configs[0].limit).eq(parseUnits('2000'));
        });

        it('should fail: removing the same window twice', async () => {
          const { owner, depositVault } = await loadDvFixture();

          await setInstantLimitConfigTest(
            { vault: depositVault, owner },
            parseUnits('1000'),
          );
          await removeInstantLimitConfigTest(
            { vault: depositVault, owner },
            days(1),
          );

          await removeInstantLimitConfigTest(
            { vault: depositVault, owner },
            days(1),
            {
              revertCustomError: {
                customErrorName: 'InstantLimitWindowNotExists',
              },
            },
          );
        });
      });

      describe('setGreenlistEnable()', () => {
        it('should fail: call from address without DEPOSIT_VAULT_ADMIN_ROLE role', async () => {
          const { owner, depositVault, regularAccounts } =
            await loadDvFixture();

          await greenListEnable({ greenlistable: depositVault, owner }, true, {
            from: regularAccounts[0],
            revertCustomError: acErrors.WMAC_HASNT_PERMISSION,
          });
        });

        it('call from address with DEPOSIT_VAULT_ADMIN_ROLE role', async () => {
          const { owner, depositVault } = await loadDvFixture();

          await greenListEnable({ greenlistable: depositVault, owner }, true);
        });

        it('should fail: when function is paused', async () => {
          const { owner, depositVault } = await loadDvFixture();

          await pauseVaultFn(
            depositVault,
            encodeFnSelector('setGreenlistEnable(bool)'),
          );

          await greenListEnable({ greenlistable: depositVault, owner }, true, {
            revertCustomError: {
              customErrorName: 'FnPaused',
            },
          });
        });

        it('succeeds with only scoped function permission', async () => {
          const { accessControl, owner, depositVault, regularAccounts } =
            await loadDvFixture();

          const vaultRole = await depositVault.vaultRole();
          await setupVaultScopedFunctionPermission(
            { accessControl, owner },
            vaultRole,
            depositVault.address,
            'setGreenlistEnable(bool)',
            regularAccounts[0].address,
          );

          expect(
            await accessControl.hasRole(vaultRole, regularAccounts[0].address),
          ).eq(false);

          await greenListEnable({ greenlistable: depositVault, owner }, true, {
            from: regularAccounts[0],
          });
        });

        it('succeeds with scoped permission and vault admin role', async () => {
          const { accessControl, owner, depositVault, regularAccounts, roles } =
            await loadDvFixture();

          const vaultRole = await depositVault.vaultRole();
          await setupVaultScopedFunctionPermission(
            { accessControl, owner },
            vaultRole,
            depositVault.address,
            'setGreenlistEnable(bool)',
            regularAccounts[0].address,
          );

          await accessControl.grantRole(
            roles.tokenRoles.mTBILL.depositVaultAdmin,
            regularAccounts[0].address,
          );

          await greenListEnable({ greenlistable: depositVault, owner }, true, {
            from: regularAccounts[0],
          });
        });
      });

      describe('addPaymentToken()', () => {
        it('should fail: call from address without DEPOSIT_VAULT_ADMIN_ROLE role', async () => {
          const { depositVault, regularAccounts, owner } =
            await loadDvFixture();
          await addPaymentTokenTest(
            { vault: depositVault, owner },
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
          const { depositVault, stableCoins, owner, dataFeed } =
            await loadDvFixture();
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
              revertCustomError: {
                customErrorName: 'PaymentTokenAlreadyAdded',
              },
            },
          );
        });

        it('should fail: when token dataFeed address zero', async () => {
          const { depositVault, stableCoins, owner } = await loadDvFixture();
          await addPaymentTokenTest(
            { vault: depositVault, owner },
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

        it('call from address with DEPOSIT_VAULT_ADMIN_ROLE role', async () => {
          const { depositVault, stableCoins, owner, dataFeed } =
            await loadDvFixture();
          await addPaymentTokenTest(
            { vault: depositVault, owner },
            stableCoins.dai,
            dataFeed.address,
            0,
            false,
          );
        });

        it('call when allowance is zero', async () => {
          const { depositVault, stableCoins, owner, dataFeed } =
            await loadDvFixture();
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
          const { depositVault, stableCoins, owner, dataFeed } =
            await loadDvFixture();
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
          const { depositVault, stableCoins, owner, dataFeed } =
            await loadDvFixture();

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

        it('should fail: when function is paused', async () => {
          const { depositVault, stableCoins, owner, dataFeed } =
            await loadDvFixture();

          await pauseVaultFn(
            depositVault,
            encodeFnSelector(
              'addPaymentToken(address,address,uint256,uint256,bool)',
            ),
          );

          await addPaymentTokenTest(
            { vault: depositVault, owner },
            stableCoins.dai,
            dataFeed.address,
            0,
            true,
            constants.MaxUint256,
            {
              revertCustomError: {
                customErrorName: 'FnPaused',
              },
            },
          );
        });

        it('succeeds with only scoped function permission', async () => {
          const {
            accessControl,
            owner,
            depositVault,
            regularAccounts,
            stableCoins,
            dataFeed,
          } = await loadDvFixture();

          const vaultRole = await depositVault.vaultRole();
          await setupVaultScopedFunctionPermission(
            { accessControl, owner },
            vaultRole,
            depositVault.address,
            'addPaymentToken(address,address,uint256,uint256,bool)',
            regularAccounts[0].address,
          );

          expect(
            await accessControl.hasRole(vaultRole, regularAccounts[0].address),
          ).eq(false);

          await addPaymentTokenTest(
            { vault: depositVault, owner },
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
            depositVault,
            regularAccounts,
            roles,
            stableCoins,
            dataFeed,
          } = await loadDvFixture();

          const vaultRole = await depositVault.vaultRole();
          await setupVaultScopedFunctionPermission(
            { accessControl, owner },
            vaultRole,
            depositVault.address,
            'addPaymentToken(address,address,uint256,uint256,bool)',
            regularAccounts[0].address,
          );

          await accessControl.grantRole(
            roles.tokenRoles.mTBILL.depositVaultAdmin,
            regularAccounts[0].address,
          );

          await addPaymentTokenTest(
            { vault: depositVault, owner },
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
        it('should fail: call from address without DEPOSIT_VAULT_ADMIN_ROLE role', async () => {
          const { depositVault, regularAccounts, owner } =
            await loadDvFixture();
          await addWaivedFeeAccountTest(
            { vault: depositVault, owner },
            ethers.constants.AddressZero,
            {
              revertCustomError: acErrors.WMAC_HASNT_PERMISSION,
              from: regularAccounts[0],
            },
          );
        });
        it('should fail: if account fee already waived', async () => {
          const { depositVault, owner } = await loadDvFixture();
          await addWaivedFeeAccountTest(
            { vault: depositVault, owner },
            owner.address,
          );
          await addWaivedFeeAccountTest(
            { vault: depositVault, owner },
            owner.address,
            {
              revertCustomError: {
                customErrorName: 'SameAddressValue',
              },
            },
          );
        });

        it('call from address with DEPOSIT_VAULT_ADMIN_ROLE role', async () => {
          const { depositVault, owner } = await loadDvFixture();
          await addWaivedFeeAccountTest(
            { vault: depositVault, owner },
            owner.address,
          );
        });

        it('should fail: when function is paused', async () => {
          const { depositVault, owner } = await loadDvFixture();

          await pauseVaultFn(
            depositVault,
            encodeFnSelector('addWaivedFeeAccount(address)'),
          );

          await addWaivedFeeAccountTest(
            { vault: depositVault, owner },
            owner.address,
            {
              revertCustomError: {
                customErrorName: 'FnPaused',
              },
            },
          );
        });

        it('succeeds with only scoped function permission', async () => {
          const { accessControl, owner, depositVault, regularAccounts } =
            await loadDvFixture();

          const vaultRole = await depositVault.vaultRole();
          await setupVaultScopedFunctionPermission(
            { accessControl, owner },
            vaultRole,
            depositVault.address,
            'addWaivedFeeAccount(address)',
            regularAccounts[0].address,
          );

          expect(
            await accessControl.hasRole(vaultRole, regularAccounts[0].address),
          ).eq(false);

          await addWaivedFeeAccountTest(
            { vault: depositVault, owner },
            regularAccounts[1].address,
            { from: regularAccounts[0] },
          );
        });

        it('succeeds with scoped permission and vault admin role', async () => {
          const { accessControl, owner, depositVault, regularAccounts, roles } =
            await loadDvFixture();

          const vaultRole = await depositVault.vaultRole();
          await setupVaultScopedFunctionPermission(
            { accessControl, owner },
            vaultRole,
            depositVault.address,
            'addWaivedFeeAccount(address)',
            regularAccounts[0].address,
          );

          await accessControl.grantRole(
            roles.tokenRoles.mTBILL.depositVaultAdmin,
            regularAccounts[0].address,
          );

          await addWaivedFeeAccountTest(
            { vault: depositVault, owner },
            regularAccounts[2].address,
            { from: regularAccounts[0] },
          );
        });
      });

      describe('removeWaivedFeeAccount()', () => {
        it('should fail: call from address without DEPOSIT_VAULT_ADMIN_ROLE role', async () => {
          const { depositVault, regularAccounts, owner } =
            await loadDvFixture();
          await removeWaivedFeeAccountTest(
            { vault: depositVault, owner },
            ethers.constants.AddressZero,
            {
              revertCustomError: acErrors.WMAC_HASNT_PERMISSION,
              from: regularAccounts[0],
            },
          );
        });
        it('should fail: if account not found in restriction', async () => {
          const { depositVault, owner } = await loadDvFixture();
          await removeWaivedFeeAccountTest(
            { vault: depositVault, owner },
            owner.address,
            {
              revertCustomError: {
                customErrorName: 'SameAddressValue',
              },
            },
          );
        });

        it('call from address with DEPOSIT_VAULT_ADMIN_ROLE role', async () => {
          const { depositVault, owner } = await loadDvFixture();
          await addWaivedFeeAccountTest(
            { vault: depositVault, owner },
            owner.address,
          );
          await removeWaivedFeeAccountTest(
            { vault: depositVault, owner },
            owner.address,
          );
        });

        it('should fail: when function is paused', async () => {
          const { depositVault, owner } = await loadDvFixture();

          await addWaivedFeeAccountTest(
            { vault: depositVault, owner },
            owner.address,
          );

          await pauseVaultFn(
            depositVault,
            encodeFnSelector('removeWaivedFeeAccount(address)'),
          );

          await removeWaivedFeeAccountTest(
            { vault: depositVault, owner },
            owner.address,
            {
              revertCustomError: {
                customErrorName: 'FnPaused',
              },
            },
          );
        });

        it('succeeds with only scoped function permission', async () => {
          const { accessControl, owner, depositVault, regularAccounts } =
            await loadDvFixture();

          await addWaivedFeeAccountTest(
            { vault: depositVault, owner },
            regularAccounts[1].address,
          );

          const vaultRole = await depositVault.vaultRole();
          await setupVaultScopedFunctionPermission(
            { accessControl, owner },
            vaultRole,
            depositVault.address,
            'removeWaivedFeeAccount(address)',
            regularAccounts[0].address,
          );

          expect(
            await accessControl.hasRole(vaultRole, regularAccounts[0].address),
          ).eq(false);

          await removeWaivedFeeAccountTest(
            { vault: depositVault, owner },
            regularAccounts[1].address,
            { from: regularAccounts[0] },
          );
        });

        it('succeeds with scoped permission and vault admin role', async () => {
          const { accessControl, owner, depositVault, regularAccounts, roles } =
            await loadDvFixture();

          await addWaivedFeeAccountTest(
            { vault: depositVault, owner },
            regularAccounts[2].address,
          );

          const vaultRole = await depositVault.vaultRole();
          await setupVaultScopedFunctionPermission(
            { accessControl, owner },
            vaultRole,
            depositVault.address,
            'removeWaivedFeeAccount(address)',
            regularAccounts[0].address,
          );

          await accessControl.grantRole(
            roles.tokenRoles.mTBILL.depositVaultAdmin,
            regularAccounts[0].address,
          );

          await removeWaivedFeeAccountTest(
            { vault: depositVault, owner },
            regularAccounts[2].address,
            { from: regularAccounts[0] },
          );
        });
      });

      describe('setFee()', () => {
        it('should fail: call from address without DEPOSIT_VAULT_ADMIN_ROLE role', async () => {
          const { depositVault, regularAccounts, owner } =
            await loadDvFixture();
          await setInstantFeeTest(
            { vault: depositVault, owner },
            ethers.constants.Zero,
            {
              revertCustomError: acErrors.WMAC_HASNT_PERMISSION,
              from: regularAccounts[0],
            },
          );
        });

        it('should fail: if new value greater then 100%', async () => {
          const { depositVault, owner } = await loadDvFixture();
          await setInstantFeeTest({ vault: depositVault, owner }, 10001, {
            revertCustomError: {
              customErrorName: 'InvalidFee',
            },
          });
        });

        it('call from address with DEPOSIT_VAULT_ADMIN_ROLE role', async () => {
          const { depositVault, owner } = await loadDvFixture();
          await setInstantFeeTest({ vault: depositVault, owner }, 100);
        });

        it('should fail: when function is paused', async () => {
          const { depositVault, owner } = await loadDvFixture();

          await pauseVaultFn(
            depositVault,
            encodeFnSelector('setInstantFee(uint256)'),
          );

          await setInstantFeeTest({ vault: depositVault, owner }, 100, {
            revertCustomError: {
              customErrorName: 'FnPaused',
            },
          });
        });

        it('succeeds with only scoped function permission', async () => {
          const { accessControl, owner, depositVault, regularAccounts } =
            await loadDvFixture();

          const vaultRole = await depositVault.vaultRole();
          await setupVaultScopedFunctionPermission(
            { accessControl, owner },
            vaultRole,
            depositVault.address,
            'setInstantFee(uint256)',
            regularAccounts[0].address,
          );

          expect(
            await accessControl.hasRole(vaultRole, regularAccounts[0].address),
          ).eq(false);

          await setInstantFeeTest({ vault: depositVault, owner }, 100, {
            from: regularAccounts[0],
          });
        });

        it('succeeds with scoped permission and vault admin role', async () => {
          const { accessControl, owner, depositVault, regularAccounts, roles } =
            await loadDvFixture();

          const vaultRole = await depositVault.vaultRole();
          await setupVaultScopedFunctionPermission(
            { accessControl, owner },
            vaultRole,
            depositVault.address,
            'setInstantFee(uint256)',
            regularAccounts[0].address,
          );

          await accessControl.grantRole(
            roles.tokenRoles.mTBILL.depositVaultAdmin,
            regularAccounts[0].address,
          );

          await setInstantFeeTest({ vault: depositVault, owner }, 100, {
            from: regularAccounts[0],
          });
        });
      });

      describe('setMinMaxInstantFee()', () => {
        it('should fail: call from address without DEPOSIT_VAULT_ADMIN_ROLE role', async () => {
          const { owner, depositVault, regularAccounts } =
            await loadDvFixture();
          await setMinMaxInstantFeeTest(
            { vault: depositVault, owner },
            0,
            1000,
            {
              revertCustomError: acErrors.WMAC_HASNT_PERMISSION,
              from: regularAccounts[0],
            },
          );
        });

        it('should fail: if min greater than max', async () => {
          const { depositVault, owner } = await loadDvFixture();
          await setMinMaxInstantFeeTest(
            { vault: depositVault, owner },
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
          const { depositVault, owner } = await loadDvFixture();
          await setMinMaxInstantFeeTest(
            { vault: depositVault, owner },
            10001,
            10001,
            {
              revertCustomError: {
                customErrorName: 'InvalidFee',
              },
            },
          );
        });

        it('call from address with DEPOSIT_VAULT_ADMIN_ROLE role', async () => {
          const { depositVault, owner } = await loadDvFixture();
          await setMinMaxInstantFeeTest(
            { vault: depositVault, owner },
            10,
            5000,
          );
        });

        it('should fail: when function is paused', async () => {
          const { depositVault, owner } = await loadDvFixture();

          await pauseVaultFn(
            depositVault,
            encodeFnSelector('setMinMaxInstantFee(uint64,uint64)'),
          );

          await setMinMaxInstantFeeTest(
            { vault: depositVault, owner },
            0,
            1000,
            {
              revertCustomError: {
                customErrorName: 'FnPaused',
              },
            },
          );
        });

        it('succeeds with only scoped function permission', async () => {
          const { accessControl, owner, depositVault, regularAccounts } =
            await loadDvFixture();

          const vaultRole = await depositVault.vaultRole();
          await setupVaultScopedFunctionPermission(
            { accessControl, owner },
            vaultRole,
            depositVault.address,
            'setMinMaxInstantFee(uint64,uint64)',
            regularAccounts[0].address,
          );

          expect(
            await accessControl.hasRole(vaultRole, regularAccounts[0].address),
          ).eq(false);

          await setMinMaxInstantFeeTest(
            { vault: depositVault, owner },
            10,
            5000,
            { from: regularAccounts[0] },
          );
        });

        it('succeeds with scoped permission and vault admin role', async () => {
          const { accessControl, owner, depositVault, regularAccounts, roles } =
            await loadDvFixture();

          const vaultRole = await depositVault.vaultRole();
          await setupVaultScopedFunctionPermission(
            { accessControl, owner },
            vaultRole,
            depositVault.address,
            'setMinMaxInstantFee(uint64,uint64)',
            regularAccounts[0].address,
          );

          await accessControl.grantRole(
            roles.tokenRoles.mTBILL.depositVaultAdmin,
            regularAccounts[0].address,
          );

          await setMinMaxInstantFeeTest(
            { vault: depositVault, owner },
            10,
            5000,
            { from: regularAccounts[0] },
          );
        });
      });

      describe('setVariabilityTolerance()', () => {
        it('should fail: call from address without DEPOSIT_VAULT_ADMIN_ROLE role', async () => {
          const { depositVault, regularAccounts, owner } =
            await loadDvFixture();
          await setVariabilityToleranceTest(
            { vault: depositVault, owner },
            ethers.constants.Zero,
            {
              revertCustomError: acErrors.WMAC_HASNT_PERMISSION,
              from: regularAccounts[0],
            },
          );
        });
        it('if new value zero', async () => {
          const { depositVault, owner } = await loadDvFixture();
          await setVariabilityToleranceTest(
            { vault: depositVault, owner },
            ethers.constants.Zero,
          );
        });

        it('call from address with DEPOSIT_VAULT_ADMIN_ROLE role', async () => {
          const { depositVault, owner } = await loadDvFixture();
          await setVariabilityToleranceTest(
            { vault: depositVault, owner },
            100,
          );
        });

        it('should fail: when function is paused', async () => {
          const { depositVault, owner } = await loadDvFixture();

          await pauseVaultFn(
            depositVault,
            encodeFnSelector('setVariationTolerance(uint256)'),
          );

          await setVariabilityToleranceTest(
            { vault: depositVault, owner },
            100,
            {
              revertCustomError: {
                customErrorName: 'FnPaused',
              },
            },
          );
        });

        it('succeeds with only scoped function permission', async () => {
          const { accessControl, owner, depositVault, regularAccounts } =
            await loadDvFixture();

          const vaultRole = await depositVault.vaultRole();
          await setupVaultScopedFunctionPermission(
            { accessControl, owner },
            vaultRole,
            depositVault.address,
            'setVariationTolerance(uint256)',
            regularAccounts[0].address,
          );

          expect(
            await accessControl.hasRole(vaultRole, regularAccounts[0].address),
          ).eq(false);

          await setVariabilityToleranceTest(
            { vault: depositVault, owner },
            100,
            { from: regularAccounts[0] },
          );
        });

        it('succeeds with scoped permission and vault admin role', async () => {
          const { accessControl, owner, depositVault, regularAccounts, roles } =
            await loadDvFixture();

          const vaultRole = await depositVault.vaultRole();
          await setupVaultScopedFunctionPermission(
            { accessControl, owner },
            vaultRole,
            depositVault.address,
            'setVariationTolerance(uint256)',
            regularAccounts[0].address,
          );

          await accessControl.grantRole(
            roles.tokenRoles.mTBILL.depositVaultAdmin,
            regularAccounts[0].address,
          );

          await setVariabilityToleranceTest(
            { vault: depositVault, owner },
            100,
            { from: regularAccounts[0] },
          );
        });
      });

      describe('removePaymentToken()', () => {
        it('should fail: call from address without DEPOSIT_VAULT_ADMIN_ROLE role', async () => {
          const { depositVault, regularAccounts, owner } =
            await loadDvFixture();
          await removePaymentTokenTest(
            { vault: depositVault, owner },
            ethers.constants.AddressZero,
            {
              revertCustomError: acErrors.WMAC_HASNT_PERMISSION,
              from: regularAccounts[0],
            },
          );
        });

        it('should fail: when token is not exists', async () => {
          const { owner, depositVault, stableCoins } = await loadDvFixture();
          await removePaymentTokenTest(
            { vault: depositVault, owner },
            stableCoins.dai.address,
            {
              revertCustomError: {
                customErrorName: 'PaymentTokenNotExists',
              },
            },
          );
        });

        it('call from address with DEPOSIT_VAULT_ADMIN_ROLE role', async () => {
          const { depositVault, stableCoins, owner, dataFeed } =
            await loadDvFixture();
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
          const { depositVault, owner, stableCoins, dataFeed } =
            await loadDvFixture();

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
            {
              revertCustomError: {
                customErrorName: 'PaymentTokenNotExists',
              },
            },
          );
        });

        it('should fail: when function is paused', async () => {
          const { depositVault, owner, stableCoins, dataFeed } =
            await loadDvFixture();

          await addPaymentTokenTest(
            { vault: depositVault, owner },
            stableCoins.dai,
            dataFeed.address,
            0,
            true,
          );

          await pauseVaultFn(
            depositVault,
            encodeFnSelector('removePaymentToken(address)'),
          );

          await removePaymentTokenTest(
            { vault: depositVault, owner },
            stableCoins.dai.address,
            {
              revertCustomError: {
                customErrorName: 'FnPaused',
              },
            },
          );
        });

        it('succeeds with only scoped function permission', async () => {
          const {
            accessControl,
            owner,
            depositVault,
            regularAccounts,
            stableCoins,
            dataFeed,
          } = await loadDvFixture();

          await addPaymentTokenTest(
            { vault: depositVault, owner },
            stableCoins.usdc,
            dataFeed.address,
            0,
            true,
          );

          const vaultRole = await depositVault.vaultRole();
          await setupVaultScopedFunctionPermission(
            { accessControl, owner },
            vaultRole,
            depositVault.address,
            'removePaymentToken(address)',
            regularAccounts[0].address,
          );

          expect(
            await accessControl.hasRole(vaultRole, regularAccounts[0].address),
          ).eq(false);

          await removePaymentTokenTest(
            { vault: depositVault, owner },
            stableCoins.usdc.address,
            { from: regularAccounts[0] },
          );
        });

        it('succeeds with scoped permission and vault admin role', async () => {
          const {
            accessControl,
            owner,
            depositVault,
            regularAccounts,
            roles,
            stableCoins,
            dataFeed,
          } = await loadDvFixture();

          await addPaymentTokenTest(
            { vault: depositVault, owner },
            stableCoins.usdt,
            dataFeed.address,
            0,
            true,
          );

          const vaultRole = await depositVault.vaultRole();
          await setupVaultScopedFunctionPermission(
            { accessControl, owner },
            vaultRole,
            depositVault.address,
            'removePaymentToken(address)',
            regularAccounts[0].address,
          );

          await accessControl.grantRole(
            roles.tokenRoles.mTBILL.depositVaultAdmin,
            regularAccounts[0].address,
          );

          await removePaymentTokenTest(
            { vault: depositVault, owner },
            stableCoins.usdt.address,
            { from: regularAccounts[0] },
          );
        });
      });

      describe('withdrawToken()', () => {
        it('should fail: call from address without DEPOSIT_VAULT_ADMIN_ROLE role', async () => {
          const { depositVault, regularAccounts, owner } =
            await loadDvFixture();
          await withdrawTest(
            { vault: depositVault, owner },
            ethers.constants.AddressZero,
            0,
            {
              revertCustomError: acErrors.WMAC_HASNT_PERMISSION,
              from: regularAccounts[0],
            },
          );
        });

        it('should fail: when there is no token in vault', async () => {
          const { owner, depositVault, stableCoins } = await loadDvFixture();
          await withdrawTest(
            { vault: depositVault, owner },
            stableCoins.dai,
            1,
            { revertMessage: 'ERC20: transfer amount exceeds balance' },
          );
        });

        it('call from address with DEPOSIT_VAULT_ADMIN_ROLE role', async () => {
          const { depositVault, stableCoins, owner } = await loadDvFixture();
          await mintToken(stableCoins.dai, depositVault, 1);
          await withdrawTest(
            { vault: depositVault, owner },
            stableCoins.dai,
            1,
          );
        });

        it('should fail: when function is paused', async () => {
          const { depositVault, stableCoins, owner } = await loadDvFixture();

          await pauseVaultFn(
            depositVault,
            encodeFnSelector('withdrawToken(address,uint256)'),
          );

          await withdrawTest(
            { vault: depositVault, owner },
            stableCoins.dai,
            1,
            {
              revertCustomError: {
                customErrorName: 'FnPaused',
              },
            },
          );
        });

        it('succeeds with only scoped function permission', async () => {
          const {
            accessControl,
            owner,
            depositVault,
            regularAccounts,
            stableCoins,
          } = await loadDvFixture();

          await mintToken(stableCoins.dai, depositVault, 1);

          const vaultRole = await depositVault.vaultRole();
          await setupVaultScopedFunctionPermission(
            { accessControl, owner },
            vaultRole,
            depositVault.address,
            'withdrawToken(address,uint256)',
            regularAccounts[0].address,
          );

          expect(
            await accessControl.hasRole(vaultRole, regularAccounts[0].address),
          ).eq(false);

          await withdrawTest(
            { vault: depositVault, owner },
            stableCoins.dai,
            1,
            { from: regularAccounts[0] },
          );
        });

        it('succeeds with scoped permission and vault admin role', async () => {
          const {
            accessControl,
            owner,
            depositVault,
            regularAccounts,
            roles,
            stableCoins,
          } = await loadDvFixture();

          await mintToken(stableCoins.dai, depositVault, 1);

          const vaultRole = await depositVault.vaultRole();
          await setupVaultScopedFunctionPermission(
            { accessControl, owner },
            vaultRole,
            depositVault.address,
            'withdrawToken(address,uint256)',
            regularAccounts[0].address,
          );

          await accessControl.grantRole(
            roles.tokenRoles.mTBILL.depositVaultAdmin,
            regularAccounts[0].address,
          );

          await withdrawTest(
            { vault: depositVault, owner },
            stableCoins.dai,
            1,
            { from: regularAccounts[0] },
          );
        });
      });

      describe('freeFromMinAmount()', async () => {
        it('should fail: call from address without vault admin role', async () => {
          const { depositVault, regularAccounts } = await loadDvFixture();
          await expect(
            depositVault
              .connect(regularAccounts[0])
              .freeFromMinAmount(regularAccounts[1].address, true),
          ).to.be.revertedWithCustomError(depositVault, 'NoFunctionPermission');
        });
        it('should not fail', async () => {
          const { depositVault, regularAccounts } = await loadDvFixture();
          await expect(
            depositVault.freeFromMinAmount(regularAccounts[0].address, true),
          ).to.not.reverted;

          expect(
            await depositVault.isFreeFromMinAmount(regularAccounts[0].address),
          ).to.eq(true);
        });
        it('should fail: already in list', async () => {
          const { depositVault, regularAccounts } = await loadDvFixture();
          await expect(
            depositVault.freeFromMinAmount(regularAccounts[0].address, true),
          ).to.not.reverted;

          expect(
            await depositVault.isFreeFromMinAmount(regularAccounts[0].address),
          ).to.eq(true);

          await expect(
            depositVault.freeFromMinAmount(regularAccounts[0].address, true),
          ).to.be.revertedWithCustomError(depositVault, 'SameAddressValue');
        });

        it('should fail: when function is paused', async () => {
          const { depositVault, regularAccounts } = await loadDvFixture();

          await pauseVaultFn(
            depositVault,
            encodeFnSelector('freeFromMinAmount(address,bool)'),
          );

          await expect(
            depositVault.freeFromMinAmount(regularAccounts[0].address, true),
          ).to.be.revertedWithCustomError(depositVault, 'FnPaused');
        });

        it('succeeds with only scoped function permission', async () => {
          const { accessControl, owner, depositVault, regularAccounts } =
            await loadDvFixture();

          const vaultRole = await depositVault.vaultRole();
          await setupVaultScopedFunctionPermission(
            { accessControl, owner },
            vaultRole,
            depositVault.address,
            'freeFromMinAmount(address,bool)',
            regularAccounts[0].address,
          );

          expect(
            await accessControl.hasRole(vaultRole, regularAccounts[0].address),
          ).eq(false);

          await expect(
            depositVault
              .connect(regularAccounts[0])
              .freeFromMinAmount(regularAccounts[2].address, true),
          ).to.not.reverted;

          expect(
            await depositVault.isFreeFromMinAmount(regularAccounts[2].address),
          ).to.eq(true);
        });

        it('succeeds with scoped permission and vault admin role', async () => {
          const { accessControl, owner, depositVault, regularAccounts, roles } =
            await loadDvFixture();

          const vaultRole = await depositVault.vaultRole();
          await setupVaultScopedFunctionPermission(
            { accessControl, owner },
            vaultRole,
            depositVault.address,
            'freeFromMinAmount(address,bool)',
            regularAccounts[0].address,
          );

          await accessControl.grantRole(
            roles.tokenRoles.mTBILL.depositVaultAdmin,
            regularAccounts[0].address,
          );

          await expect(
            depositVault
              .connect(regularAccounts[0])
              .freeFromMinAmount(regularAccounts[3].address, true),
          ).to.not.reverted;

          expect(
            await depositVault.isFreeFromMinAmount(regularAccounts[3].address),
          ).to.eq(true);
        });
      });

      describe('changeTokenAllowance()', () => {
        it('should fail: call from address without DEPOSIT_VAULT_ADMIN_ROLE role', async () => {
          const { depositVault, regularAccounts, owner } =
            await loadDvFixture();
          await changeTokenAllowanceTest(
            { vault: depositVault, owner },
            ethers.constants.AddressZero,
            0,
            {
              revertCustomError: acErrors.WMAC_HASNT_PERMISSION,
              from: regularAccounts[0],
            },
          );
        });
        it('should fail: token not exist', async () => {
          const { depositVault, owner, stableCoins } = await loadDvFixture();
          await changeTokenAllowanceTest(
            { vault: depositVault, owner },
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
          const { depositVault, owner, stableCoins, dataFeed } =
            await loadDvFixture();
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
          } = await loadDvFixture();
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
              revertCustomError: {
                customErrorName: 'AllowanceExceeded',
              },
            },
          );

          await depositRequestTest(
            { depositVault, owner, mTBILL, mTokenToUsdDataFeed },
            stableCoins.dai,
            99_999,
            {
              revertCustomError: {
                customErrorName: 'AllowanceExceeded',
              },
            },
          );
        });
        it('call from address with DEPOSIT_VAULT_ADMIN_ROLE role', async () => {
          const { depositVault, owner, stableCoins, dataFeed } =
            await loadDvFixture();
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
          } = await loadDvFixture();
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

          expect(
            tokenConfigBefore.allowance.sub(tokenConfigAfter.allowance),
          ).eq(parseUnits('999'));
        });
        it('should not decrease if allowance = UINT_MAX', async () => {
          const {
            depositVault,
            stableCoins,
            owner,
            dataFeed,
            mTBILL,
            mTokenToUsdDataFeed,
          } = await loadDvFixture();
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

        it('should fail: when function is paused', async () => {
          const { depositVault, owner, stableCoins, dataFeed } =
            await loadDvFixture();
          await addPaymentTokenTest(
            { vault: depositVault, owner },
            stableCoins.dai,
            dataFeed.address,
            0,
            true,
          );

          await pauseVaultFn(
            depositVault,
            encodeFnSelector('changeTokenAllowance(address,uint256)'),
          );

          await changeTokenAllowanceTest(
            { vault: depositVault, owner },
            stableCoins.dai.address,
            100000000,
            {
              revertCustomError: {
                customErrorName: 'FnPaused',
              },
            },
          );
        });

        it('succeeds with only scoped function permission', async () => {
          const {
            accessControl,
            owner,
            depositVault,
            regularAccounts,
            stableCoins,
            dataFeed,
          } = await loadDvFixture();

          await addPaymentTokenTest(
            { vault: depositVault, owner },
            stableCoins.dai,
            dataFeed.address,
            0,
            true,
          );

          const vaultRole = await depositVault.vaultRole();
          await setupVaultScopedFunctionPermission(
            { accessControl, owner },
            vaultRole,
            depositVault.address,
            'changeTokenAllowance(address,uint256)',
            regularAccounts[0].address,
          );

          expect(
            await accessControl.hasRole(vaultRole, regularAccounts[0].address),
          ).eq(false);

          await changeTokenAllowanceTest(
            { vault: depositVault, owner },
            stableCoins.dai.address,
            100000000,
            { from: regularAccounts[0] },
          );
        });

        it('succeeds with scoped permission and vault admin role', async () => {
          const {
            accessControl,
            owner,
            depositVault,
            regularAccounts,
            roles,
            stableCoins,
            dataFeed,
          } = await loadDvFixture();

          await addPaymentTokenTest(
            { vault: depositVault, owner },
            stableCoins.usdc,
            dataFeed.address,
            0,
            true,
          );

          const vaultRole = await depositVault.vaultRole();
          await setupVaultScopedFunctionPermission(
            { accessControl, owner },
            vaultRole,
            depositVault.address,
            'changeTokenAllowance(address,uint256)',
            regularAccounts[0].address,
          );

          await accessControl.grantRole(
            roles.tokenRoles.mTBILL.depositVaultAdmin,
            regularAccounts[0].address,
          );

          await changeTokenAllowanceTest(
            { vault: depositVault, owner },
            stableCoins.usdc.address,
            100000000,
            { from: regularAccounts[0] },
          );
        });
      });

      describe('changeTokenFee()', () => {
        it('should fail: call from address without REDEMPTION_VAULT_ADMIN_ROLE role', async () => {
          const { depositVault, regularAccounts, owner } =
            await loadDvFixture();
          await changeTokenFeeTest(
            { vault: depositVault, owner },
            ethers.constants.AddressZero,
            0,
            {
              revertCustomError: acErrors.WMAC_HASNT_PERMISSION,
              from: regularAccounts[0],
            },
          );
        });
        it('should fail: token not exist', async () => {
          const { depositVault, owner, stableCoins } = await loadDvFixture();
          await changeTokenFeeTest(
            { vault: depositVault, owner },
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
          const { depositVault, owner, stableCoins, dataFeed } =
            await loadDvFixture();
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
            {
              revertCustomError: {
                customErrorName: 'InvalidFee',
              },
            },
          );
        });
        it('call from address with REDEMPTION_VAULT_ADMIN_ROLE role', async () => {
          const { depositVault, owner, stableCoins, dataFeed } =
            await loadDvFixture();
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

        it('should fail: when function is paused', async () => {
          const { depositVault, owner, stableCoins, dataFeed } =
            await loadDvFixture();
          await addPaymentTokenTest(
            { vault: depositVault, owner },
            stableCoins.dai,
            dataFeed.address,
            0,
            true,
          );

          await pauseVaultFn(
            depositVault,
            encodeFnSelector('changeTokenFee(address,uint256)'),
          );

          await changeTokenFeeTest(
            { vault: depositVault, owner },
            stableCoins.dai.address,
            100,
            {
              revertCustomError: {
                customErrorName: 'FnPaused',
              },
            },
          );
        });

        it('succeeds with only scoped function permission', async () => {
          const {
            accessControl,
            owner,
            depositVault,
            regularAccounts,
            stableCoins,
            dataFeed,
          } = await loadDvFixture();

          await addPaymentTokenTest(
            { vault: depositVault, owner },
            stableCoins.dai,
            dataFeed.address,
            0,
            true,
          );

          const vaultRole = await depositVault.vaultRole();
          await setupVaultScopedFunctionPermission(
            { accessControl, owner },
            vaultRole,
            depositVault.address,
            'changeTokenFee(address,uint256)',
            regularAccounts[0].address,
          );

          expect(
            await accessControl.hasRole(vaultRole, regularAccounts[0].address),
          ).eq(false);

          await changeTokenFeeTest(
            { vault: depositVault, owner },
            stableCoins.dai.address,
            100,
            { from: regularAccounts[0] },
          );
        });

        it('succeeds with scoped permission and vault admin role', async () => {
          const {
            accessControl,
            owner,
            depositVault,
            regularAccounts,
            roles,
            stableCoins,
            dataFeed,
          } = await loadDvFixture();

          await addPaymentTokenTest(
            { vault: depositVault, owner },
            stableCoins.usdc,
            dataFeed.address,
            0,
            true,
          );

          const vaultRole = await depositVault.vaultRole();
          await setupVaultScopedFunctionPermission(
            { accessControl, owner },
            vaultRole,
            depositVault.address,
            'changeTokenFee(address,uint256)',
            regularAccounts[0].address,
          );

          await accessControl.grantRole(
            roles.tokenRoles.mTBILL.depositVaultAdmin,
            regularAccounts[0].address,
          );

          await changeTokenFeeTest(
            { vault: depositVault, owner },
            stableCoins.usdc.address,
            100,
            { from: regularAccounts[0] },
          );
        });
      });

      describe('depositInstant()', async () => {
        it('should fail: when there is no token in vault', async () => {
          const {
            owner,
            depositVault,
            stableCoins,
            mTBILL,
            mTokenToUsdDataFeed,
          } = await loadDvFixture();

          await depositInstantTest(
            { depositVault, owner, mTBILL, mTokenToUsdDataFeed },
            stableCoins.dai,
            1,
            {
              revertCustomError: {
                customErrorName: 'UnknownPaymentToken',
              },
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
          } = await loadDvFixture();
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
              revertCustomError: {
                customErrorName: 'InvalidAmount',
              },
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
          } = await loadDvFixture();
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
              revertCustomError: {
                customErrorName: 'FnPaused',
              },
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
          } = await loadDvFixture();

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
              revertCustomError: {
                customErrorName: 'InvalidRounding',
              },
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
          } = await loadDvFixture();

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
          } = await loadDvFixture();

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
          } = await loadDvFixture();

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
          } = await loadDvFixture();
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
          await setInstantLimitConfigTest(
            { vault: depositVault, owner },
            150_000,
          );

          await depositInstantTest(
            { depositVault, owner, mTBILL, mTokenToUsdDataFeed },
            stableCoins.dai,
            99_999,
            {
              revertCustomError: {
                customErrorName: 'MinAmountFirstDepositNotMet',
              },
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
          } = await loadDvFixture();
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
          await setInstantLimitConfigTest(
            { vault: depositVault, owner },
            150_000,
          );

          await depositInstantTest(
            { depositVault, owner, mTBILL, mTokenToUsdDataFeed },
            stableCoins.dai,
            99,
            {
              revertCustomError: {
                customErrorName: 'AmountLessThanMin',
              },
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
          } = await loadDvFixture();
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
              revertCustomError: {
                customErrorName: 'AllowanceExceeded',
              },
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
          } = await loadDvFixture();
          await addPaymentTokenTest(
            { vault: depositVault, owner },
            stableCoins.dai,
            dataFeed.address,
            0,
            true,
          );
          await setRoundData({ mockedAggregator }, 4);

          await mintToken(stableCoins.dai, owner, 100_000);
          await setInstantLimitConfigTest({ vault: depositVault, owner }, 1000);

          await approveBase18(owner, stableCoins.dai, depositVault, 100_000);

          await depositInstantTest(
            { depositVault, owner, mTBILL, mTokenToUsdDataFeed },
            stableCoins.dai,
            99_999,
            {
              revertCustomError: {
                customErrorName: 'InstantLimitExceeded',
              },
            },
          );
        });

        it('should fail: MV: invalid instant fee when instant fee below min', async () => {
          const {
            depositVault,
            mockedAggregator,
            mockedAggregatorMToken,
            owner,
            mTBILL,
            stableCoins,
            dataFeed,
            mTokenToUsdDataFeed,
          } = await loadDvFixture();
          await addPaymentTokenTest(
            { vault: depositVault, owner },
            stableCoins.dai,
            dataFeed.address,
            0,
            true,
          );
          await setRoundData({ mockedAggregator }, 4);
          await setRoundData({ mockedAggregator: mockedAggregatorMToken }, 1);
          await mintToken(stableCoins.dai, owner, 1_000_000);

          await setInstantFeeTest({ vault: depositVault, owner }, 100);
          await setMinMaxInstantFeeTest(
            { vault: depositVault, owner },
            200,
            10_000,
          );

          await approveBase18(owner, stableCoins.dai, depositVault, 1_000_000);

          await depositInstantTest(
            { depositVault, owner, mTBILL, mTokenToUsdDataFeed },
            stableCoins.dai,
            100,
            {
              revertCustomError: {
                customErrorName: 'InstantFeeOutOfBounds',
              },
            },
          );
        });

        it('should fail: MV: invalid instant fee when instant fee above max', async () => {
          const {
            depositVault,
            mockedAggregator,
            mockedAggregatorMToken,
            owner,
            mTBILL,
            stableCoins,
            dataFeed,
            mTokenToUsdDataFeed,
          } = await loadDvFixture();
          await addPaymentTokenTest(
            { vault: depositVault, owner },
            stableCoins.dai,
            dataFeed.address,
            0,
            true,
          );
          await setRoundData({ mockedAggregator }, 4);
          await setRoundData({ mockedAggregator: mockedAggregatorMToken }, 1);
          await mintToken(stableCoins.dai, owner, 1_000_000);

          await setInstantFeeTest({ vault: depositVault, owner }, 5000);
          await setMinMaxInstantFeeTest(
            { vault: depositVault, owner },
            0,
            2000,
          );

          await approveBase18(owner, stableCoins.dai, depositVault, 1_000_000);

          await depositInstantTest(
            { depositVault, owner, mTBILL, mTokenToUsdDataFeed },
            stableCoins.dai,
            100,
            {
              revertCustomError: {
                customErrorName: 'InstantFeeOutOfBounds',
              },
            },
          );
        });

        describe('depositInstant() multiple instant limits', () => {
          it('two windows (12h and 1d): deposit succeeds when under both', async () => {
            const {
              depositVault,
              mockedAggregator,
              mockedAggregatorMToken,
              owner,
              mTBILL,
              stableCoins,
              dataFeed,
              mTokenToUsdDataFeed,
            } = await loadDvFixture();
            await addPaymentTokenTest(
              { vault: depositVault, owner },
              stableCoins.dai,
              dataFeed.address,
              0,
              true,
            );
            await setRoundData({ mockedAggregator }, 4);
            await setRoundData({ mockedAggregator: mockedAggregatorMToken }, 1);
            await mintToken(stableCoins.dai, owner, 1_000_000);
            await setMinAmountTest({ vault: depositVault, owner }, 0);

            await setInstantLimitConfigTest(
              { vault: depositVault, owner },
              { window: hours(12), limit: parseUnits('1000') },
            );
            await setInstantLimitConfigTest(
              { vault: depositVault, owner },
              { window: days(1), limit: parseUnits('2000') },
            );

            await approveBase18(
              owner,
              stableCoins.dai,
              depositVault,
              1_000_000,
            );

            await depositInstantTest(
              { depositVault, owner, mTBILL, mTokenToUsdDataFeed },
              stableCoins.dai,
              500,
            );
          });

          it('two windows: deposit fails when one window (12h) is filled', async () => {
            const {
              depositVault,
              mockedAggregator,
              mockedAggregatorMToken,
              owner,
              mTBILL,
              stableCoins,
              dataFeed,
              mTokenToUsdDataFeed,
            } = await loadDvFixture();
            await addPaymentTokenTest(
              { vault: depositVault, owner },
              stableCoins.dai,
              dataFeed.address,
              0,
              true,
            );
            await setRoundData({ mockedAggregator }, 4);
            await setRoundData({ mockedAggregator: mockedAggregatorMToken }, 1);
            await mintToken(stableCoins.dai, owner, 1_000_000);
            await setMinAmountTest({ vault: depositVault, owner }, 0);

            await setInstantLimitConfigTest(
              { vault: depositVault, owner },
              { window: hours(12), limit: parseUnits('100') },
            );
            await setInstantLimitConfigTest(
              { vault: depositVault, owner },
              { window: days(1), limit: parseUnits('10000') },
            );

            await approveBase18(
              owner,
              stableCoins.dai,
              depositVault,
              1_000_000,
            );

            await depositInstantTest(
              { depositVault, owner, mTBILL, mTokenToUsdDataFeed },
              stableCoins.dai,
              60,
            );

            await depositInstantTest(
              { depositVault, owner, mTBILL, mTokenToUsdDataFeed },
              stableCoins.dai,
              50,
              {
                revertCustomError: {
                  customErrorName: 'InstantLimitExceeded',
                },
              },
            );
          });

          it('two windows: 12h epoch resets after 12h, deposit succeeds again', async () => {
            const {
              depositVault,
              mockedAggregator,
              mockedAggregatorMToken,
              owner,
              mTBILL,
              stableCoins,
              dataFeed,
              mTokenToUsdDataFeed,
            } = await loadDvFixture();
            await addPaymentTokenTest(
              { vault: depositVault, owner },
              stableCoins.dai,
              dataFeed.address,
              0,
              true,
            );
            await setRoundData({ mockedAggregator }, 4);
            await setRoundData({ mockedAggregator: mockedAggregatorMToken }, 1);
            await mintToken(stableCoins.dai, owner, 1_000_000);
            await setMinAmountTest({ vault: depositVault, owner }, 0);

            await setInstantLimitConfigTest(
              { vault: depositVault, owner },
              { window: hours(12), limit: parseUnits('100') },
            );
            await setInstantLimitConfigTest(
              { vault: depositVault, owner },
              { window: days(1), limit: parseUnits('10000') },
            );

            await approveBase18(
              owner,
              stableCoins.dai,
              depositVault,
              1_000_000,
            );

            await depositInstantTest(
              { depositVault, owner, mTBILL, mTokenToUsdDataFeed },
              stableCoins.dai,
              100,
            );

            await increase(hours(12));

            await depositInstantTest(
              { depositVault, owner, mTBILL, mTokenToUsdDataFeed },
              stableCoins.dai,
              10,
            );
          });
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
          } = await loadDvFixture();
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
              revertCustomError: {
                customErrorName: 'SlippageExceeded',
              },
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
          } = await loadDvFixture();

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
              revertCustomError: {
                customErrorName: 'InvalidAmount',
              },
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
            {
              revertCustomError: {
                customErrorName: 'InvalidAmount',
              },
            },
          );
        });

        it('should fail: greenlist enabled and user not in greenlist ', async () => {
          const {
            owner,
            depositVault,
            stableCoins,
            mTBILL,
            mTokenToUsdDataFeed,
          } = await loadDvFixture();

          await depositVault.setGreenlistEnable(true);

          await depositInstantTest(
            { depositVault, owner, mTBILL, mTokenToUsdDataFeed },
            stableCoins.dai,
            1,
            {
              revertCustomError: acErrors.WMAC_HASNT_ROLE,
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
          } = await loadDvFixture();

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
              revertCustomError: acErrors.WMAC_HAS_ROLE,
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
          } = await loadDvFixture();

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
              revertCustomError: {
                customErrorName: 'Sanctioned',
              },
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
          } = await loadDvFixture();

          await greenList(
            { greenlistable: greenListableTester, accessControl, owner },
            owner,
          );

          await depositVault.setGreenlistEnable(true);

          await depositInstantTest(
            {
              depositVault,
              owner,
              mTBILL,
              mTokenToUsdDataFeed,
              customRecipient,
            },
            stableCoins.dai,
            1,
            {
              revertCustomError: acErrors.WMAC_HASNT_ROLE,
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
          } = await loadDvFixture();

          await blackList(
            { blacklistable: blackListableTester, accessControl, owner },
            customRecipient,
          );

          await depositInstantTest(
            {
              depositVault,
              owner,
              mTBILL,
              mTokenToUsdDataFeed,
              customRecipient,
            },
            stableCoins.dai,
            1,
            {
              from: regularAccounts[0],
              revertCustomError: acErrors.WMAC_HAS_ROLE,
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
          } = await loadDvFixture();

          await sanctionUser(
            { sanctionsList: mockedSanctionsList },
            customRecipient,
          );

          await depositInstantTest(
            {
              depositVault,
              owner,
              mTBILL,
              mTokenToUsdDataFeed,
              customRecipient,
            },
            stableCoins.dai,
            1,
            {
              from: regularAccounts[0],
              revertCustomError: {
                customErrorName: 'Sanctioned',
              },
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
          } = await loadDvFixture();
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
              revertCustomError: {
                customErrorName: 'FnPaused',
              },
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
          } = await loadDvFixture();
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
            {
              depositVault,
              owner,
              mTBILL,
              mTokenToUsdDataFeed,
              customRecipient,
            },
            stableCoins.dai,
            99,
            {
              from: regularAccounts[0],
            },
          );

          await depositInstantTest(
            {
              depositVault,
              owner,
              mTBILL,
              mTokenToUsdDataFeed,
              customRecipient,
            },
            stableCoins.dai,
            1,
            {
              from: regularAccounts[0],
              revertCustomError: {
                customErrorName: 'SupplyCapExceeded',
              },
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
          } = await loadDvFixture();
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
            {
              depositVault,
              owner,
              mTBILL,
              mTokenToUsdDataFeed,
              customRecipient,
            },
            stableCoins.dai,
            90,
            {
              from: regularAccounts[0],
            },
          );

          await depositInstantTest(
            {
              depositVault,
              owner,
              mTBILL,
              mTokenToUsdDataFeed,
              customRecipient,
            },
            stableCoins.dai,
            11,
            {
              from: regularAccounts[0],
              revertCustomError: {
                customErrorName: 'SupplyCapExceeded',
              },
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
          } = await loadDvFixture();
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
            {
              depositVault,
              owner,
              mTBILL,
              mTokenToUsdDataFeed,
              customRecipient,
            },
            stableCoins.dai,
            90,
            {
              from: regularAccounts[0],
            },
          );

          await depositInstantTest(
            {
              depositVault,
              owner,
              mTBILL,
              mTokenToUsdDataFeed,
              customRecipient,
            },
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
          } = await loadDvFixture();

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
          } = await loadDvFixture();

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
          } = await loadDvFixture();

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
          } = await loadDvFixture();

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
          } = await loadDvFixture();

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
          } = await loadDvFixture();

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
          } = await loadDvFixture();

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
          } = await loadDvFixture();

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
            {
              depositVault,
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
            depositVault,
            stableCoins,
            mTBILL,
            greenListableTester,
            mTokenToUsdDataFeed,
            accessControl,
            regularAccounts,
            dataFeed,
            customRecipient,
          } = await loadDvFixture();

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
          } = await loadDvFixture();

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
          } = await loadDvFixture();

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
          } = await loadDvFixture();

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
        describe('holdback', () => {
          it('when 40% instant and 60% holdback', async () => {
            const {
              owner,
              depositVault,
              stableCoins,
              mTBILL,
              mTokenToUsdDataFeed,
              regularAccounts,
              dataFeed,
            } = await loadDvFixture();

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
            await setMinAmountTest({ vault: depositVault, owner }, 0);

            await depositRequestTest(
              {
                depositVault,
                owner,
                mTBILL,
                mTokenToUsdDataFeed,
                instantShare: 40_00,
              },
              stableCoins.dai,
              100,
              {
                from: regularAccounts[0],
              },
            );
          });

          it('when 90% instant and 10% holdback', async () => {
            const {
              owner,
              depositVault,
              stableCoins,
              mTBILL,
              mTokenToUsdDataFeed,
              regularAccounts,
              dataFeed,
            } = await loadDvFixture();

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
            await setMinAmountTest({ vault: depositVault, owner }, 0);

            await depositRequestTest(
              {
                depositVault,
                owner,
                mTBILL,
                mTokenToUsdDataFeed,
                instantShare: 90_00,
              },
              stableCoins.dai,
              100,
              {
                from: regularAccounts[0],
              },
            );
          });

          it('when 0% instant and 100% holdback', async () => {
            const {
              owner,
              depositVault,
              stableCoins,
              mTBILL,
              mTokenToUsdDataFeed,
              regularAccounts,
              dataFeed,
            } = await loadDvFixture();

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
            await setMinAmountTest({ vault: depositVault, owner }, 0);

            await depositRequestTest(
              {
                depositVault,
                owner,
                mTBILL,
                mTokenToUsdDataFeed,
                instantShare: 0,
              },
              stableCoins.dai,
              100,
              {
                from: regularAccounts[0],
              },
            );
          });

          it('when 50% instant and 50% holdback and request recipient is different from msg.sender', async () => {
            const {
              owner,
              depositVault,
              stableCoins,
              mTBILL,
              mTokenToUsdDataFeed,
              regularAccounts,
              dataFeed,
            } = await loadDvFixture();

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
            await setMinAmountTest({ vault: depositVault, owner }, 0);

            await depositRequestTest(
              {
                depositVault,
                owner,
                mTBILL,
                mTokenToUsdDataFeed,
                instantShare: 50_00,
                customRecipient: regularAccounts[1],
              },
              stableCoins.dai,
              100,
              {
                from: regularAccounts[0],
              },
            );
          });

          it('when 50% instant and 50% holdback and instant recipient is different from msg.sender', async () => {
            const {
              owner,
              depositVault,
              stableCoins,
              mTBILL,
              mTokenToUsdDataFeed,
              regularAccounts,
              dataFeed,
            } = await loadDvFixture();

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
            await setMinAmountTest({ vault: depositVault, owner }, 0);

            await depositRequestTest(
              {
                depositVault,
                owner,
                mTBILL,
                mTokenToUsdDataFeed,
                instantShare: 50_00,
                customRecipientInstant: regularAccounts[2],
              },
              stableCoins.dai,
              100,
              {
                from: regularAccounts[0],
              },
            );
          });

          it('when 50% instant and 50% holdback and request and instant recipients are different from msg.sender and from each other', async () => {
            const {
              owner,
              depositVault,
              stableCoins,
              mTBILL,
              mTokenToUsdDataFeed,
              regularAccounts,
              dataFeed,
            } = await loadDvFixture();

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
            await setMinAmountTest({ vault: depositVault, owner }, 0);

            await depositRequestTest(
              {
                depositVault,
                owner,
                mTBILL,
                mTokenToUsdDataFeed,
                instantShare: 50_00,
                customRecipient: regularAccounts[1],
                customRecipientInstant: regularAccounts[2],
              },
              stableCoins.dai,
              100,
              {
                from: regularAccounts[0],
              },
            );
          });

          it('should fail: when 100% instant and 0% holdback', async () => {
            const {
              owner,
              depositVault,
              stableCoins,
              mTBILL,
              mTokenToUsdDataFeed,
              regularAccounts,
              dataFeed,
            } = await loadDvFixture();

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
            await setMinAmountTest({ vault: depositVault, owner }, 0);

            await depositRequestTest(
              {
                depositVault,
                owner,
                mTBILL,
                mTokenToUsdDataFeed,
                instantShare: 100_00,
                customRecipient: regularAccounts[1],
                customRecipientInstant: regularAccounts[2],
              },
              stableCoins.dai,
              100,
              {
                from: regularAccounts[0],
                revertCustomError: {
                  customErrorName: 'InvalidAmount',
                },
              },
            );
          });

          it('should fail: when instant share exceeds max instant share', async () => {
            const {
              owner,
              depositVault,
              stableCoins,
              mTBILL,
              mTokenToUsdDataFeed,
              regularAccounts,
              dataFeed,
            } = await loadDvFixture();

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
            await setMinAmountTest({ vault: depositVault, owner }, 0);

            await setMaxInstantShareTest({ vault: depositVault, owner }, 90_00);

            await depositRequestTest(
              {
                depositVault,
                owner,
                mTBILL,
                mTokenToUsdDataFeed,
                instantShare: 95_00,
                customRecipient: regularAccounts[1],
                customRecipientInstant: regularAccounts[2],
              },
              stableCoins.dai,
              100,
              {
                from: regularAccounts[0],
                revertCustomError: {
                  customErrorName: 'InstantShareTooHigh',
                },
              },
            );
          });
        });
        it('should fail: when there is no token in vault', async () => {
          const {
            owner,
            depositVault,
            stableCoins,
            mTBILL,
            mTokenToUsdDataFeed,
          } = await loadDvFixture();

          await depositRequestTest(
            { depositVault, owner, mTBILL, mTokenToUsdDataFeed },
            stableCoins.dai,
            1,
            {
              revertCustomError: {
                customErrorName: 'UnknownPaymentToken',
              },
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
          } = await loadDvFixture();
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
              revertCustomError: {
                customErrorName: 'InvalidAmount',
              },
            },
          );
        });

        it('should fail: MV: invalid instant fee when instant fee below min', async () => {
          const {
            depositVault,
            mockedAggregator,
            mockedAggregatorMToken,
            owner,
            mTBILL,
            stableCoins,
            dataFeed,
            mTokenToUsdDataFeed,
          } = await loadDvFixture();
          await addPaymentTokenTest(
            { vault: depositVault, owner },
            stableCoins.dai,
            dataFeed.address,
            0,
            true,
          );
          await setRoundData({ mockedAggregator }, 4);
          await setRoundData({ mockedAggregator: mockedAggregatorMToken }, 1);
          await mintToken(stableCoins.dai, owner, 1_000_000);

          await setInstantFeeTest({ vault: depositVault, owner }, 100);
          await setMinMaxInstantFeeTest(
            { vault: depositVault, owner },
            200,
            10_000,
          );

          await approveBase18(owner, stableCoins.dai, depositVault, 1_000_000);

          await depositRequestTest(
            { depositVault, owner, mTBILL, mTokenToUsdDataFeed },
            stableCoins.dai,
            100,
            {
              revertCustomError: {
                customErrorName: 'InstantFeeOutOfBounds',
              },
            },
          );
        });

        it('should fail: MV: invalid instant fee when instant fee above max', async () => {
          const {
            depositVault,
            mockedAggregator,
            mockedAggregatorMToken,
            owner,
            mTBILL,
            stableCoins,
            dataFeed,
            mTokenToUsdDataFeed,
          } = await loadDvFixture();
          await addPaymentTokenTest(
            { vault: depositVault, owner },
            stableCoins.dai,
            dataFeed.address,
            0,
            true,
          );
          await setRoundData({ mockedAggregator }, 4);
          await setRoundData({ mockedAggregator: mockedAggregatorMToken }, 1);
          await mintToken(stableCoins.dai, owner, 1_000_000);

          await setInstantFeeTest({ vault: depositVault, owner }, 5000);
          await setMinMaxInstantFeeTest(
            { vault: depositVault, owner },
            0,
            2000,
          );

          await approveBase18(owner, stableCoins.dai, depositVault, 1_000_000);

          await depositRequestTest(
            { depositVault, owner, mTBILL, mTokenToUsdDataFeed },
            stableCoins.dai,
            100,
            {
              revertCustomError: {
                customErrorName: 'InstantFeeOutOfBounds',
              },
            },
          );
        });

        it('instant limit configs are not applied', async () => {
          const {
            owner,
            depositVault,
            stableCoins,
            mTBILL,
            mTokenToUsdDataFeed,
            regularAccounts,
            dataFeed,
            mockedAggregator,
          } = await loadDvFixture();

          await addPaymentTokenTest(
            { vault: depositVault, owner },
            stableCoins.dai,
            dataFeed.address,
            0,
            true,
          );
          await setRoundData({ mockedAggregator }, 4);

          await setInstantLimitConfigTest(
            { vault: depositVault, owner },
            { window: hours(12), limit: parseUnits('100') },
          );
          await setInstantLimitConfigTest(
            { vault: depositVault, owner },
            { window: days(1), limit: parseUnits('100') },
          );

          await mintToken(stableCoins.dai, regularAccounts[0], 500);
          await approveBase18(
            regularAccounts[0],
            stableCoins.dai,
            depositVault,
            500,
          );

          await depositRequestTest(
            { depositVault, owner, mTBILL, mTokenToUsdDataFeed },
            stableCoins.dai,
            500,
            { from: regularAccounts[0] },
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
          } = await loadDvFixture();
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
              revertCustomError: {
                customErrorName: 'FnPaused',
              },
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
          } = await loadDvFixture();
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
              revertCustomError: {
                customErrorName: 'FnPaused',
              },
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
          } = await loadDvFixture();

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
              revertCustomError: {
                customErrorName: 'InvalidRounding',
              },
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
          } = await loadDvFixture();

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
          } = await loadDvFixture();

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
          } = await loadDvFixture();

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
          } = await loadDvFixture();
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
              revertCustomError: {
                customErrorName: 'MinAmountFirstDepositNotMet',
              },
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
          } = await loadDvFixture();
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
              revertCustomError: {
                customErrorName: 'AllowanceExceeded',
              },
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
          } = await loadDvFixture();

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
              revertCustomError: {
                customErrorName: 'InvalidAmount',
              },
            },
          );
        });

        it('should fail: greenlist enabled and user not in greenlist ', async () => {
          const {
            owner,
            depositVault,
            stableCoins,
            mTBILL,
            mTokenToUsdDataFeed,
          } = await loadDvFixture();

          await depositVault.setGreenlistEnable(true);

          await depositRequestTest(
            { depositVault, owner, mTBILL, mTokenToUsdDataFeed },
            stableCoins.dai,
            1,
            {
              revertCustomError: acErrors.WMAC_HASNT_ROLE,
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
          } = await loadDvFixture();

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
              revertCustomError: acErrors.WMAC_HAS_ROLE,
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
          } = await loadDvFixture();

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
              revertCustomError: {
                customErrorName: 'Sanctioned',
              },
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
          } = await loadDvFixture();

          await depositVault.setGreenlistEnable(true);

          await greenList(
            { greenlistable: greenListableTester, accessControl, owner },
            owner,
          );
          await depositRequestTest(
            {
              depositVault,
              owner,
              mTBILL,
              mTokenToUsdDataFeed,
              customRecipient,
            },
            stableCoins.dai,
            1,
            {
              revertCustomError: acErrors.WMAC_HASNT_ROLE,
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
          } = await loadDvFixture();

          await blackList(
            { blacklistable: blackListableTester, accessControl, owner },
            customRecipient,
          );

          await depositRequestTest(
            {
              depositVault,
              owner,
              mTBILL,
              mTokenToUsdDataFeed,
              customRecipient,
            },
            stableCoins.dai,
            1,
            {
              from: regularAccounts[0],
              revertCustomError: acErrors.WMAC_HAS_ROLE,
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
          } = await loadDvFixture();

          await sanctionUser(
            { sanctionsList: mockedSanctionsList },
            customRecipient,
          );

          await depositRequestTest(
            {
              depositVault,
              owner,
              mTBILL,
              mTokenToUsdDataFeed,
              customRecipient,
            },
            stableCoins.dai,
            1,
            {
              from: regularAccounts[0],
              revertCustomError: {
                customErrorName: 'Sanctioned',
              },
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
          } = await loadDvFixture();

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
          } = await loadDvFixture();

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
          } = await loadDvFixture();

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
          } = await loadDvFixture();

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
          } = await loadDvFixture();

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
          } = await loadDvFixture();

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
          } = await loadDvFixture();

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
            {
              depositVault,
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
            depositVault,
            stableCoins,
            mTBILL,
            mTokenToUsdDataFeed,
            regularAccounts,
            dataFeed,
            customRecipient,
          } = await loadDvFixture();

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
            depositVault,
            stableCoins,
            mTBILL,
            mTokenToUsdDataFeed,
            regularAccounts,
            dataFeed,
          } = await loadDvFixture();

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
          } = await loadDvFixture();

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

        it('deposit 100 DAI when other overload of depositRequest is paused', async () => {
          const {
            owner,
            depositVault,
            stableCoins,
            mTBILL,
            mTokenToUsdDataFeed,
            regularAccounts,
            dataFeed,
          } = await loadDvFixture();

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
            await loadDvFixture();
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
              revertCustomError: acErrors.WMAC_HASNT_PERMISSION,
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
          } = await loadDvFixture();
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
              revertCustomError: {
                customErrorName: 'RequestNotExists',
              },
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
          } = await loadDvFixture();

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
            {
              revertCustomError: {
                customErrorName: 'RequestNotPending',
              },
            },
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
          } = await loadDvFixture();

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

      describe('approveRequestAvgRate()', async () => {
        it('should fail: call from address without vault admin role', async () => {
          const { depositVault, regularAccounts, mTokenToUsdDataFeed, mTBILL } =
            await loadDvFixture();
          await approveRequestTest(
            {
              depositVault,
              owner: regularAccounts[1],
              mTBILL,
              mTokenToUsdDataFeed,
              isAvgRate: true,
            },
            1,
            parseUnits('5'),
            {
              revertCustomError: acErrors.WMAC_HASNT_PERMISSION,
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
          } = await loadDvFixture();
          await addPaymentTokenTest(
            { vault: depositVault, owner },
            stableCoins.dai,
            dataFeed.address,
            0,
            true,
          );
          await approveRequestTest(
            {
              depositVault,
              owner,
              mTBILL,
              mTokenToUsdDataFeed,
              isAvgRate: true,
            },
            1,
            parseUnits('5'),
            {
              revertCustomError: {
                customErrorName: 'RequestNotExists',
              },
            },
          );
        });

        it('should fail: request already processed', async () => {
          const {
            owner,
            mockedAggregator,
            mockedAggregatorMToken,
            depositVault,
            stableCoins,
            mTBILL,
            dataFeed,
            mTokenToUsdDataFeed,
          } = await loadDvFixture();

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
            {
              depositVault,
              owner,
              mTBILL,
              mTokenToUsdDataFeed,
              isAvgRate: true,
            },
            requestId,
            parseUnits('5'),
            {
              revertCustomError: {
                customErrorName: 'RequestNotPending',
              },
            },
          );
        });

        it('should fail: when function is paused', async () => {
          const { owner, depositVault, mTBILL, mTokenToUsdDataFeed } =
            await loadDvFixture();

          await pauseVaultFn(
            depositVault,
            encodeFnSelector('approveRequestAvgRate(uint256,uint256)'),
          );

          await approveRequestTest(
            {
              depositVault,
              owner,
              mTBILL,
              mTokenToUsdDataFeed,
              isAvgRate: true,
            },
            0,
            parseUnits('5'),
            {
              revertCustomError: {
                customErrorName: 'FnPaused',
              },
            },
          );
        });

        it('should fail: when instant part is 0', async () => {
          const {
            owner,
            mockedAggregator,
            mockedAggregatorMToken,
            depositVault,
            stableCoins,
            mTBILL,
            dataFeed,
            mTokenToUsdDataFeed,
          } = await loadDvFixture();

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
          await setMinAmountTest({ vault: depositVault, owner }, 0);

          await depositRequestTest(
            { depositVault, owner, mTBILL, mTokenToUsdDataFeed },
            stableCoins.dai,
            100,
          );

          await approveRequestTest(
            {
              depositVault,
              owner,
              mTBILL,
              mTokenToUsdDataFeed,
              isAvgRate: true,
            },
            0,
            parseUnits('5'),
            {
              revertCustomError: {
                customErrorName: 'InvalidInstantAmount',
              },
            },
          );
        });

        it('should fail: when calclulated holdback part rate is 0', async () => {
          const {
            owner,
            mockedAggregator,
            mockedAggregatorMToken,
            depositVault,
            stableCoins,
            mTBILL,
            dataFeed,
            mTokenToUsdDataFeed,
          } = await loadDvFixture();

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

          await depositRequestTest(
            {
              depositVault,
              owner,
              mTBILL,
              mTokenToUsdDataFeed,
              instantShare: 50_00,
            },
            stableCoins.dai,
            100,
          );

          await approveRequestTest(
            {
              depositVault,
              owner,
              mTBILL,
              mTokenToUsdDataFeed,
              isAvgRate: true,
            },
            0,
            parseUnits('5'),
            {
              revertCustomError: {
                customErrorName: 'InvalidNewMTokenRate',
              },
            },
          );
        });

        it('when calclulated holdback part rate is < 1', async () => {
          const {
            owner,
            mockedAggregator,
            mockedAggregatorMToken,
            depositVault,
            stableCoins,
            mTBILL,
            dataFeed,
            mTokenToUsdDataFeed,
          } = await loadDvFixture();

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

          await depositRequestTest(
            {
              depositVault,
              owner,
              mTBILL,
              mTokenToUsdDataFeed,
              instantShare: 50_00,
            },
            stableCoins.dai,
            100,
          );

          await approveRequestTest(
            {
              depositVault,
              owner,
              mTBILL,
              mTokenToUsdDataFeed,
              isAvgRate: true,
            },
            0,
            parseUnits('0.2'),
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
          } = await loadDvFixture();

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
          await setMinAmountTest({ vault: depositVault, owner }, 0);

          await depositRequestTest(
            {
              depositVault,
              owner,
              mTBILL,
              mTokenToUsdDataFeed,
              instantShare: 50_00,
            },
            stableCoins.dai,
            100,
          );
          const requestId = 0;

          await approveRequestTest(
            {
              depositVault,
              owner,
              mTBILL,
              mTokenToUsdDataFeed,
              isAvgRate: true,
            },
            requestId,
            parseUnits('5'),
          );
        });

        it('should not check for deviation toleranace', async () => {
          const {
            owner,
            mockedAggregator,
            mockedAggregatorMToken,
            depositVault,
            stableCoins,
            mTBILL,
            dataFeed,
            mTokenToUsdDataFeed,
          } = await loadDvFixture();

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

          await depositRequestTest(
            {
              depositVault,
              owner,
              mTBILL,
              mTokenToUsdDataFeed,
              instantShare: 50_00,
            },
            stableCoins.dai,
            100,
          );
          const requestId = 0;

          await approveRequestTest(
            {
              depositVault,
              owner,
              mTBILL,
              mTokenToUsdDataFeed,
              isAvgRate: true,
            },
            requestId,
            parseUnits('0.1'),
          );
        });

        it('should succeed when other approve entrypoints are paused', async () => {
          const {
            owner,
            mockedAggregator,
            mockedAggregatorMToken,
            depositVault,
            stableCoins,
            mTBILL,
            dataFeed,
            mTokenToUsdDataFeed,
          } = await loadDvFixture();

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
          await setMinAmountTest({ vault: depositVault, owner }, 0);

          await depositRequestTest(
            {
              depositVault,
              owner,
              mTBILL,
              mTokenToUsdDataFeed,
              instantShare: 50_00,
            },
            stableCoins.dai,
            100,
          );
          const requestId = 0;
          await pauseOtherDepositApproveFns(
            depositVault,
            encodeFnSelector('approveRequestAvgRate(uint256,uint256)'),
          );
          await approveRequestTest(
            {
              depositVault,
              owner,
              mTBILL,
              mTokenToUsdDataFeed,
              isAvgRate: true,
            },
            requestId,
            parseUnits('5'),
          );
        });
      });

      describe('safeApproveRequest()', async () => {
        it('should fail: call from address without vault admin role', async () => {
          const { depositVault, regularAccounts, mTokenToUsdDataFeed, mTBILL } =
            await loadDvFixture();
          await approveRequestTest(
            {
              depositVault,
              owner: regularAccounts[1],
              mTBILL,
              mTokenToUsdDataFeed,
              isSafe: true,
            },
            1,
            parseUnits('1'),
            {
              revertCustomError: acErrors.WMAC_HASNT_PERMISSION,
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
          } = await loadDvFixture();
          await addPaymentTokenTest(
            { vault: depositVault, owner },
            stableCoins.dai,
            dataFeed.address,
            0,
            true,
          );
          await approveRequestTest(
            {
              depositVault,
              owner,
              mTBILL,
              mTokenToUsdDataFeed,
              isSafe: true,
            },
            1,
            parseUnits('1'),
            {
              revertCustomError: {
                customErrorName: 'RequestNotExists',
              },
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
          } = await loadDvFixture();
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
            {
              depositVault,
              owner,
              mTBILL,
              mTokenToUsdDataFeed,
              isSafe: true,
            },
            requestId,
            parseUnits('6'),
            {
              revertCustomError: {
                customErrorName: 'PriceVariationExceeded',
              },
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
          } = await loadDvFixture();
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
            {
              depositVault,
              owner,
              mTBILL,
              mTokenToUsdDataFeed,
              isSafe: true,
            },
            requestId,
            parseUnits('4'),
            {
              revertCustomError: {
                customErrorName: 'PriceVariationExceeded',
              },
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
          } = await loadDvFixture();

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
            { depositVault, owner, mTBILL, mTokenToUsdDataFeed, isSafe: true },
            requestId,
            parseUnits('5.000001'),
          );
          await approveRequestTest(
            { depositVault, owner, mTBILL, mTokenToUsdDataFeed, isSafe: true },
            requestId,
            parseUnits('5.000001'),
            {
              revertCustomError: {
                customErrorName: 'RequestNotPending',
              },
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
          } = await loadDvFixture();
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
            {
              depositVault,
              owner,
              mTBILL,
              mTokenToUsdDataFeed,
              customRecipient,
            },
            stableCoins.dai,
            99,
            {
              from: regularAccounts[0],
            },
          );

          await depositRequestTest(
            {
              depositVault,
              owner,
              mTBILL,
              mTokenToUsdDataFeed,
              customRecipient,
            },
            stableCoins.dai,
            1,
            {
              from: regularAccounts[0],
            },
          );

          await approveRequestTest(
            { depositVault, owner, mTBILL, mTokenToUsdDataFeed, isSafe: true },
            0,
            parseUnits('1'),
            {
              revertCustomError: {
                customErrorName: 'SupplyCapExceeded',
              },
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
          } = await loadDvFixture();
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
            {
              depositVault,
              owner,
              mTBILL,
              mTokenToUsdDataFeed,
              customRecipient,
            },
            stableCoins.dai,
            90,
            {
              from: regularAccounts[0],
            },
          );

          await depositRequestTest(
            {
              depositVault,
              owner,
              mTBILL,
              mTokenToUsdDataFeed,
              customRecipient,
            },
            stableCoins.dai,
            11,
            {
              from: regularAccounts[0],
            },
          );

          await approveRequestTest(
            { depositVault, owner, mTBILL, mTokenToUsdDataFeed, isSafe: true },
            0,
            parseUnits('1'),
            {
              revertCustomError: {
                customErrorName: 'SupplyCapExceeded',
              },
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
          } = await loadDvFixture();
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
            {
              depositVault,
              owner,
              mTBILL,
              mTokenToUsdDataFeed,
              customRecipient,
            },
            stableCoins.dai,
            90,
            {
              from: regularAccounts[0],
            },
          );

          await depositRequestTest(
            {
              depositVault,
              owner,
              mTBILL,
              mTokenToUsdDataFeed,
              customRecipient,
            },
            stableCoins.dai,
            10,
            {
              from: regularAccounts[0],
            },
          );

          await approveRequestTest(
            { depositVault, owner, mTBILL, mTokenToUsdDataFeed, isSafe: true },
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
          } = await loadDvFixture();

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
            { depositVault, owner, mTBILL, mTokenToUsdDataFeed, isSafe: true },
            requestId,
            parseUnits('5.000000001'),
          );
        });
      });

      describe('safeApproveRequestAvgRate()', async () => {
        it('should fail: call from address without vault admin role', async () => {
          const { depositVault, regularAccounts, mTokenToUsdDataFeed, mTBILL } =
            await loadDvFixture();
          await approveRequestTest(
            {
              depositVault,
              owner: regularAccounts[1],
              mTBILL,
              mTokenToUsdDataFeed,
              isAvgRate: true,
              isSafe: true,
            },
            1,
            parseUnits('5'),
            {
              revertCustomError: acErrors.WMAC_HASNT_PERMISSION,
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
          } = await loadDvFixture();
          await addPaymentTokenTest(
            { vault: depositVault, owner },
            stableCoins.dai,
            dataFeed.address,
            0,
            true,
          );
          await approveRequestTest(
            {
              depositVault,
              owner,
              mTBILL,
              mTokenToUsdDataFeed,
              isAvgRate: true,
              isSafe: true,
            },
            1,
            parseUnits('5'),
            {
              revertCustomError: {
                customErrorName: 'RequestNotExists',
              },
            },
          );
        });

        it('should fail: request already processed', async () => {
          const {
            owner,
            mockedAggregator,
            mockedAggregatorMToken,
            depositVault,
            stableCoins,
            mTBILL,
            dataFeed,
            mTokenToUsdDataFeed,
          } = await loadDvFixture();

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
            {
              depositVault,
              owner,
              mTBILL,
              mTokenToUsdDataFeed,
              isAvgRate: true,
              isSafe: true,
            },
            requestId,
            parseUnits('5'),
            {
              revertCustomError: {
                customErrorName: 'RequestNotPending',
              },
            },
          );
        });

        it('should fail: when function is paused', async () => {
          const { owner, depositVault, mTBILL, mTokenToUsdDataFeed } =
            await loadDvFixture();

          await pauseVaultFn(
            depositVault,
            encodeFnSelector('safeApproveRequestAvgRate(uint256,uint256)'),
          );

          await approveRequestTest(
            {
              depositVault,
              owner,
              mTBILL,
              mTokenToUsdDataFeed,
              isAvgRate: true,
              isSafe: true,
            },
            0,
            parseUnits('5'),
            {
              revertCustomError: {
                customErrorName: 'FnPaused',
              },
            },
          );
        });

        it('should fail: when instant part is 0', async () => {
          const {
            owner,
            mockedAggregator,
            mockedAggregatorMToken,
            depositVault,
            stableCoins,
            mTBILL,
            dataFeed,
            mTokenToUsdDataFeed,
          } = await loadDvFixture();

          await mintToken(stableCoins.dai, owner, 100);
          await approveBase18(owner, stableCoins.dai, depositVault, 100);
          await addPaymentTokenTest(
            { vault: depositVault, owner },
            stableCoins.dai,
            dataFeed.address,
            0,
            true,
          );
          await setRoundData({ mockedAggregator }, 11);
          await setRoundData({ mockedAggregator: mockedAggregatorMToken }, 1);
          await setMinAmountTest({ vault: depositVault, owner }, 0);

          await depositRequestTest(
            { depositVault, owner, mTBILL, mTokenToUsdDataFeed },
            stableCoins.dai,
            100,
          );

          await approveRequestTest(
            {
              depositVault,
              owner,
              mTBILL,
              mTokenToUsdDataFeed,
              isAvgRate: true,
              isSafe: true,
            },
            0,
            parseUnits('1'),
            {
              revertCustomError: {
                customErrorName: 'InvalidInstantAmount',
              },
            },
          );
        });

        it('should fail: when calclulated holdback part rate is 0', async () => {
          const {
            owner,
            mockedAggregator,
            mockedAggregatorMToken,
            depositVault,
            stableCoins,
            mTBILL,
            dataFeed,
            mTokenToUsdDataFeed,
          } = await loadDvFixture();

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

          await depositRequestTest(
            {
              depositVault,
              owner,
              mTBILL,
              mTokenToUsdDataFeed,
              instantShare: 95_00,
            },
            stableCoins.dai,
            100,
          );
          await setVariabilityToleranceTest(
            { vault: depositVault, owner },
            90_00,
          );

          await approveRequestTest(
            {
              depositVault,
              owner,
              mTBILL,
              mTokenToUsdDataFeed,
              isAvgRate: true,
              isSafe: true,
            },
            0,
            parseUnits('1.6'),
            {
              revertCustomError: {
                customErrorName: 'InvalidNewMTokenRate',
              },
            },
          );
        });

        it('when calclulated holdback part rate is < 1', async () => {
          const {
            owner,
            mockedAggregator,
            mockedAggregatorMToken,
            depositVault,
            stableCoins,
            mTBILL,
            dataFeed,
            mTokenToUsdDataFeed,
          } = await loadDvFixture();

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

          await depositRequestTest(
            {
              depositVault,
              owner,
              mTBILL,
              mTokenToUsdDataFeed,
              instantShare: 50_00,
            },
            stableCoins.dai,
            100,
          );

          await setVariabilityToleranceTest(
            { vault: depositVault, owner },
            90_00,
          );

          await approveRequestTest(
            {
              depositVault,
              owner,
              mTBILL,
              mTokenToUsdDataFeed,
              isAvgRate: true,
              isSafe: true,
            },
            0,
            parseUnits('0.6'),
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
          } = await loadDvFixture();

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
          await setMinAmountTest({ vault: depositVault, owner }, 0);

          await depositRequestTest(
            {
              depositVault,
              owner,
              mTBILL,
              mTokenToUsdDataFeed,
              instantShare: 50_00,
            },
            stableCoins.dai,
            100,
          );
          const requestId = 0;

          await approveRequestTest(
            {
              depositVault,
              owner,
              mTBILL,
              mTokenToUsdDataFeed,
              isAvgRate: true,
              isSafe: true,
            },
            requestId,
            parseUnits('5'),
          );
        });

        it('should fail: should check for deviation toleranace', async () => {
          const {
            owner,
            mockedAggregator,
            mockedAggregatorMToken,
            depositVault,
            stableCoins,
            mTBILL,
            dataFeed,
            mTokenToUsdDataFeed,
          } = await loadDvFixture();

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

          await depositRequestTest(
            {
              depositVault,
              owner,
              mTBILL,
              mTokenToUsdDataFeed,
              instantShare: 50_00,
            },
            stableCoins.dai,
            100,
          );
          const requestId = 0;

          await approveRequestTest(
            {
              depositVault,
              owner,
              mTBILL,
              mTokenToUsdDataFeed,
              isAvgRate: true,
              isSafe: true,
            },
            requestId,
            parseUnits('0.1'),
            {
              revertCustomError: {
                customErrorName: 'PriceVariationExceeded',
              },
            },
          );
        });

        it('should succeed when other approve entrypoints are paused', async () => {
          const {
            owner,
            mockedAggregator,
            mockedAggregatorMToken,
            depositVault,
            stableCoins,
            mTBILL,
            dataFeed,
            mTokenToUsdDataFeed,
          } = await loadDvFixture();

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
          await setMinAmountTest({ vault: depositVault, owner }, 0);

          await depositRequestTest(
            {
              depositVault,
              owner,
              mTBILL,
              mTokenToUsdDataFeed,
              instantShare: 50_00,
            },
            stableCoins.dai,
            100,
          );
          const requestId = 0;
          await pauseOtherDepositApproveFns(
            depositVault,
            encodeFnSelector('safeApproveRequestAvgRate(uint256,uint256)'),
          );
          await approveRequestTest(
            {
              depositVault,
              owner,
              mTBILL,
              mTokenToUsdDataFeed,
              isAvgRate: true,
              isSafe: true,
            },
            requestId,
            parseUnits('5'),
          );
        });
      });

      describe('safeBulkApproveRequestAtSavedRate()', async () => {
        it('should fail: call from address without vault admin role', async () => {
          const { depositVault, regularAccounts, mTokenToUsdDataFeed, mTBILL } =
            await loadDvFixture();
          await safeBulkApproveRequestTest(
            {
              depositVault,
              owner: regularAccounts[1],
              mTBILL,
              mTokenToUsdDataFeed,
            },
            [{ id: 1 }],
            'request-rate',
            {
              revertCustomError: acErrors.WMAC_HASNT_PERMISSION,
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
          } = await loadDvFixture();
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
            'request-rate',
            {
              revertCustomError: {
                customErrorName: 'RequestNotExists',
              },
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
          } = await loadDvFixture();

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
            'request-rate',
          );
          await safeBulkApproveRequestTest(
            { depositVault, owner, mTBILL, mTokenToUsdDataFeed },
            [{ id: requestId }],
            'request-rate',
            {
              revertCustomError: {
                customErrorName: 'RequestNotPending',
              },
            },
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
          } = await loadDvFixture();

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

          await approveRequestTest(
            { depositVault, owner, mTBILL, mTokenToUsdDataFeed, isSafe: true },
            0,
            parseUnits('5.000001'),
          );

          await safeBulkApproveRequestTest(
            { depositVault, owner, mTBILL, mTokenToUsdDataFeed },
            [{ id: 1 }, { id: 0 }],
            'request-rate',
            {
              revertCustomError: {
                customErrorName: 'RequestNotPending',
              },
            },
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
          } = await loadDvFixture();

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

          await approveRequestTest(
            { depositVault, owner, mTBILL, mTokenToUsdDataFeed, isSafe: true },
            0,
            parseUnits('5.000001'),
          );

          await safeBulkApproveRequestTest(
            { depositVault, owner, mTBILL, mTokenToUsdDataFeed },
            [{ id: 1 }, { id: 1 }],
            'request-rate',
            {
              revertCustomError: {
                customErrorName: 'RequestNotPending',
              },
            },
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
          } = await loadDvFixture();

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
            'request-rate',
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
          } = await loadDvFixture();

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
            'request-rate',
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
          } = await loadDvFixture();

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
            'request-rate',
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
          } = await loadDvFixture();

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
            'request-rate',
          );
        });
      });

      describe('safeBulkApproveRequest() (custom price overload)', async () => {
        it('should fail: call from address without vault admin role', async () => {
          const { depositVault, regularAccounts, mTokenToUsdDataFeed, mTBILL } =
            await loadDvFixture();
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
              revertCustomError: acErrors.WMAC_HASNT_PERMISSION,
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
          } = await loadDvFixture();
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
              revertCustomError: {
                customErrorName: 'RequestNotExists',
              },
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
          } = await loadDvFixture();
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
              revertCustomError: {
                customErrorName: 'PriceVariationExceeded',
              },
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
          } = await loadDvFixture();
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
              revertCustomError: {
                customErrorName: 'PriceVariationExceeded',
              },
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
          } = await loadDvFixture();

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
            {
              revertCustomError: {
                customErrorName: 'RequestNotPending',
              },
            },
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
          } = await loadDvFixture();

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

          await approveRequestTest(
            { depositVault, owner, mTBILL, mTokenToUsdDataFeed, isSafe: true },
            0,
            parseUnits('5.000001'),
          );

          await safeBulkApproveRequestTest(
            { depositVault, owner, mTBILL, mTokenToUsdDataFeed },
            [{ id: 1 }, { id: 0 }],
            parseUnits('5.000001'),
            {
              revertCustomError: {
                customErrorName: 'RequestNotPending',
              },
            },
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
          } = await loadDvFixture();

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

          await approveRequestTest(
            { depositVault, owner, mTBILL, mTokenToUsdDataFeed, isSafe: true },
            0,
            parseUnits('5.000001'),
          );

          await safeBulkApproveRequestTest(
            { depositVault, owner, mTBILL, mTokenToUsdDataFeed },
            [{ id: 1 }, { id: 1 }],
            parseUnits('5.000001'),
            {
              revertCustomError: {
                customErrorName: 'RequestNotPending',
              },
            },
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
          } = await loadDvFixture();

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
          } = await loadDvFixture();

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
          } = await loadDvFixture();

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
          } = await loadDvFixture();

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

      describe('safeBulkApproveRequestAvgRate() (custom price overload)', async () => {
        it('should fail: call from address without vault admin role', async () => {
          const { depositVault, regularAccounts, mTokenToUsdDataFeed, mTBILL } =
            await loadDvFixture();
          await safeBulkApproveRequestTest(
            {
              depositVault,
              owner: regularAccounts[1],
              mTBILL,
              mTokenToUsdDataFeed,
              isAvgRate: true,
            },
            [{ id: 1 }],
            parseUnits('1'),
            {
              revertCustomError: acErrors.WMAC_HASNT_PERMISSION,
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
          } = await loadDvFixture();
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
              isAvgRate: true,
            },
            [{ id: 1 }],
            parseUnits('1'),
            {
              revertCustomError: {
                customErrorName: 'RequestNotExists',
              },
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
          } = await loadDvFixture();
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
          await setMinAmountTest({ vault: depositVault, owner }, 0);

          await depositRequestTest(
            {
              depositVault,
              owner,
              mTBILL,
              mTokenToUsdDataFeed,
              instantShare: 50_00,
            },
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
              isAvgRate: true,
            },
            [{ id: requestId }],
            parseUnits('6'),
            {
              revertCustomError: {
                customErrorName: 'PriceVariationExceeded',
              },
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
          } = await loadDvFixture();
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
          await setMinAmountTest({ vault: depositVault, owner }, 0);

          await depositRequestTest(
            {
              depositVault,
              owner,
              mTBILL,
              mTokenToUsdDataFeed,
              instantShare: 95_00,
            },
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
              isAvgRate: true,
            },
            [{ id: requestId }],
            parseUnits('4'),
            {
              revertCustomError: {
                customErrorName: 'PriceVariationExceeded',
              },
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
          } = await loadDvFixture();

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
            {
              depositVault,
              owner,
              mTBILL,
              mTokenToUsdDataFeed,
              isAvgRate: true,
            },
            [{ id: requestId }],
            parseUnits('5.000001'),
            {
              revertCustomError: {
                customErrorName: 'RequestNotPending',
              },
            },
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
          } = await loadDvFixture();

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
          await setMinAmountTest({ vault: depositVault, owner }, 0);

          await depositRequestTest(
            {
              depositVault,
              owner,
              mTBILL,
              mTokenToUsdDataFeed,
              instantShare: 50_00,
            },
            stableCoins.dai,
            100,
          );

          await depositRequestTest(
            {
              depositVault,
              owner,
              mTBILL,
              mTokenToUsdDataFeed,
              instantShare: 50_00,
            },
            stableCoins.dai,
            100,
          );

          await approveRequestTest(
            { depositVault, owner, mTBILL, mTokenToUsdDataFeed, isSafe: true },
            0,
            parseUnits('5.000001'),
          );

          await safeBulkApproveRequestTest(
            {
              depositVault,
              owner,
              mTBILL,
              mTokenToUsdDataFeed,
              isAvgRate: true,
            },
            [{ id: 1 }, { id: 0 }],
            parseUnits('5.000001'),
            {
              revertCustomError: {
                customErrorName: 'RequestNotPending',
              },
            },
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
          } = await loadDvFixture();

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
          await setMinAmountTest({ vault: depositVault, owner }, 0);

          await depositRequestTest(
            {
              depositVault,
              owner,
              mTBILL,
              mTokenToUsdDataFeed,
              instantShare: 50_00,
            },
            stableCoins.dai,
            100,
          );

          await depositRequestTest(
            {
              depositVault,
              owner,
              mTBILL,
              mTokenToUsdDataFeed,
              instantShare: 50_00,
            },
            stableCoins.dai,
            100,
          );

          await approveRequestTest(
            { depositVault, owner, mTBILL, mTokenToUsdDataFeed, isSafe: true },
            0,
            parseUnits('5.000001'),
          );

          await safeBulkApproveRequestTest(
            {
              depositVault,
              owner,
              mTBILL,
              mTokenToUsdDataFeed,
              isAvgRate: true,
            },
            [{ id: 1 }, { id: 1 }],
            parseUnits('5.000001'),
            {
              revertCustomError: {
                customErrorName: 'RequestNotPending',
              },
            },
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
          } = await loadDvFixture();

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
          await setMaxSupplyCapTest({ depositVault, owner }, 75);

          await depositRequestTest(
            {
              depositVault,
              owner,
              mTBILL,
              mTokenToUsdDataFeed,
              instantShare: 50_00,
            },
            stableCoins.dai,
            50,
          );

          await depositRequestTest(
            {
              depositVault,
              owner,
              mTBILL,
              mTokenToUsdDataFeed,
              instantShare: 50_00,
            },
            stableCoins.dai,
            50,
          );

          await safeBulkApproveRequestTest(
            {
              depositVault,
              owner,
              mTBILL,
              mTokenToUsdDataFeed,
              isAvgRate: true,
            },
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
          } = await loadDvFixture();

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
          await setMinAmountTest({ vault: depositVault, owner }, 0);

          await depositRequestTest(
            {
              depositVault,
              owner,
              mTBILL,
              mTokenToUsdDataFeed,
              instantShare: 50_00,
            },
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
              isAvgRate: true,
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
            depositVault,
            stableCoins,
            mTBILL,
            dataFeed,
            mTokenToUsdDataFeed,
          } = await loadDvFixture();

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
          await setMinAmountTest({ vault: depositVault, owner }, 0);

          await depositRequestTest(
            {
              depositVault,
              owner,
              mTBILL,
              mTokenToUsdDataFeed,
              instantShare: 50_00,
            },
            stableCoins.dai,
            100,
          );

          await depositRequestTest(
            {
              depositVault,
              owner,
              mTBILL,
              mTokenToUsdDataFeed,
              instantShare: 50_00,
            },
            stableCoins.dai,
            100,
          );

          await safeBulkApproveRequestTest(
            {
              depositVault,
              owner,
              mTBILL,
              mTokenToUsdDataFeed,
              isAvgRate: true,
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
            depositVault,
            stableCoins,
            mTBILL,
            dataFeed,
            mTokenToUsdDataFeed,
          } = await loadDvFixture();

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
          await setMinAmountTest({ vault: depositVault, owner }, 0);

          for (let i = 0; i < 10; i++) {
            await depositRequestTest(
              {
                depositVault,
                owner,
                mTBILL,
                mTokenToUsdDataFeed,
                instantShare: 50_00,
              },
              stableCoins.dai,
              100,
            );
          }

          await safeBulkApproveRequestTest(
            {
              depositVault,
              owner,
              mTBILL,
              mTokenToUsdDataFeed,
              isAvgRate: true,
            },
            Array.from({ length: 10 }, (_, i) => ({ id: i })),
            parseUnits('5.000000001'),
          );
        });
      });

      describe('safeBulkApproveRequest() (current price overload)', async () => {
        it('should fail: call from address without vault admin role', async () => {
          const { depositVault, regularAccounts, mTokenToUsdDataFeed, mTBILL } =
            await loadDvFixture();
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
              revertCustomError: acErrors.WMAC_HASNT_PERMISSION,
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
          } = await loadDvFixture();
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
              revertCustomError: {
                customErrorName: 'RequestNotExists',
              },
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
          } = await loadDvFixture();
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
              revertCustomError: {
                customErrorName: 'PriceVariationExceeded',
              },
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
          } = await loadDvFixture();
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
              revertCustomError: {
                customErrorName: 'PriceVariationExceeded',
              },
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
          } = await loadDvFixture();

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
            {
              revertCustomError: {
                customErrorName: 'RequestNotPending',
              },
            },
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
          } = await loadDvFixture();

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
            {
              revertCustomError: {
                customErrorName: 'RequestNotPending',
              },
            },
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
          } = await loadDvFixture();

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
            {
              revertCustomError: {
                customErrorName: 'RequestNotPending',
              },
            },
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
          } = await loadDvFixture();

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
          } = await loadDvFixture();

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
          } = await loadDvFixture();

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
          } = await loadDvFixture();

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
          } = await loadDvFixture();

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
          } = await loadDvFixture();

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

      describe('safeBulkApproveRequestAvgRate() (current price overload)', async () => {
        it('should fail: call from address without vault admin role', async () => {
          const { depositVault, regularAccounts, mTokenToUsdDataFeed, mTBILL } =
            await loadDvFixture();
          await safeBulkApproveRequestTest(
            {
              depositVault,
              owner: regularAccounts[1],
              mTBILL,
              mTokenToUsdDataFeed,
              isAvgRate: true,
            },
            [{ id: 1 }],
            undefined,
            {
              revertCustomError: acErrors.WMAC_HASNT_PERMISSION,
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
          } = await loadDvFixture();
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
              isAvgRate: true,
            },
            [{ id: 1 }],
            undefined,
            {
              revertCustomError: {
                customErrorName: 'RequestNotExists',
              },
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
          } = await loadDvFixture();
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
          await setMinAmountTest({ vault: depositVault, owner }, 1);

          await depositRequestTest(
            {
              depositVault,
              owner,
              mTBILL,
              mTokenToUsdDataFeed,
              instantShare: 50_00,
            },
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
              isAvgRate: true,
            },
            [{ id: requestId }],
            undefined,
            {
              revertCustomError: {
                customErrorName: 'PriceVariationExceeded',
              },
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
          } = await loadDvFixture();
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
          await setMinAmountTest({ vault: depositVault, owner }, 0);

          await depositRequestTest(
            {
              depositVault,
              owner,
              mTBILL,
              mTokenToUsdDataFeed,
              instantShare: 50_00,
            },
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
              isAvgRate: true,
            },
            [{ id: requestId }],
            undefined,
            {
              revertCustomError: {
                customErrorName: 'PriceVariationExceeded',
              },
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
          } = await loadDvFixture();

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
          await setMinAmountTest({ vault: depositVault, owner }, 0);

          await depositRequestTest(
            {
              depositVault,
              owner,
              mTBILL,
              mTokenToUsdDataFeed,
              instantShare: 50_00,
            },
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
              isAvgRate: true,
            },
            [{ id: requestId }],
            undefined,
          );
          await safeBulkApproveRequestTest(
            {
              depositVault,
              owner,
              mTBILL,
              mTokenToUsdDataFeed,
              isAvgRate: true,
            },
            [{ id: requestId }],
            undefined,
            {
              revertCustomError: {
                customErrorName: 'RequestNotPending',
              },
            },
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
          } = await loadDvFixture();

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
          await setMinAmountTest({ vault: depositVault, owner }, 0);

          await depositRequestTest(
            {
              depositVault,
              owner,
              mTBILL,
              mTokenToUsdDataFeed,
              instantShare: 50_00,
            },
            stableCoins.dai,
            100,
          );

          await depositRequestTest(
            {
              depositVault,
              owner,
              mTBILL,
              mTokenToUsdDataFeed,
              instantShare: 50_00,
            },
            stableCoins.dai,
            100,
          );

          await safeBulkApproveRequestTest(
            {
              depositVault,
              owner,
              mTBILL,
              mTokenToUsdDataFeed,
              isAvgRate: true,
            },
            [{ id: 0 }],
            undefined,
          );

          await safeBulkApproveRequestTest(
            {
              depositVault,
              owner,
              mTBILL,
              mTokenToUsdDataFeed,
              isAvgRate: true,
            },
            [{ id: 1 }, { id: 0 }],
            undefined,
            {
              revertCustomError: {
                customErrorName: 'RequestNotPending',
              },
            },
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
          } = await loadDvFixture();

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
          await setMinAmountTest({ vault: depositVault, owner }, 0);

          await depositRequestTest(
            {
              depositVault,
              owner,
              mTBILL,
              mTokenToUsdDataFeed,
              instantShare: 50_00,
            },
            stableCoins.dai,
            100,
          );

          await depositRequestTest(
            {
              depositVault,
              owner,
              mTBILL,
              mTokenToUsdDataFeed,
              instantShare: 50_00,
            },
            stableCoins.dai,
            100,
          );

          await safeBulkApproveRequestTest(
            {
              depositVault,
              owner,
              mTBILL,
              mTokenToUsdDataFeed,
              isAvgRate: true,
            },
            [{ id: 0 }],
            undefined,
          );

          await safeBulkApproveRequestTest(
            {
              depositVault,
              owner,
              mTBILL,
              mTokenToUsdDataFeed,
              isAvgRate: true,
            },
            [{ id: 1 }, { id: 1 }],
            undefined,
            {
              revertCustomError: {
                customErrorName: 'RequestNotPending',
              },
            },
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
          } = await loadDvFixture();

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
          await setMinAmountTest({ vault: depositVault, owner }, 0);

          await depositRequestTest(
            {
              depositVault,
              owner,
              mTBILL,
              mTokenToUsdDataFeed,
              instantShare: 50_00,
            },
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
              isAvgRate: true,
            },
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
          } = await loadDvFixture();

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
          await setMinAmountTest({ vault: depositVault, owner }, 0);

          await setRoundDataGrowth({ owner, customFeedGrowth }, 1, -1000, 5);
          await mTokenToUsdDataFeed.changeAggregator(customFeedGrowth.address);

          await depositRequestTest(
            {
              depositVault,
              owner,
              mTBILL,
              mTokenToUsdDataFeed,
              instantShare: 50_00,
            },
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
              isAvgRate: true,
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
          } = await loadDvFixture();

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
          await setMinAmountTest({ vault: depositVault, owner }, 0);

          await depositRequestTest(
            {
              depositVault,
              owner,
              mTBILL,
              mTokenToUsdDataFeed,
              instantShare: 50_00,
            },
            stableCoins.dai,
            100,
          );

          await depositRequestTest(
            {
              depositVault,
              owner,
              mTBILL,
              mTokenToUsdDataFeed,
              instantShare: 50_00,
            },
            stableCoins.dai,
            100,
          );

          await safeBulkApproveRequestTest(
            {
              depositVault,
              owner,
              mTBILL,
              mTokenToUsdDataFeed,
              isAvgRate: true,
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
            depositVault,
            stableCoins,
            mTBILL,
            dataFeed,
            mTokenToUsdDataFeed,
          } = await loadDvFixture();

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
          await setMinAmountTest({ vault: depositVault, owner }, 0);

          for (let i = 0; i < 10; i++) {
            await depositRequestTest(
              {
                depositVault,
                owner,
                mTBILL,
                mTokenToUsdDataFeed,
                instantShare: 50_00,
              },
              stableCoins.dai,
              100,
            );
          }

          await safeBulkApproveRequestTest(
            {
              depositVault,
              owner,
              mTBILL,
              mTokenToUsdDataFeed,
              isAvgRate: true,
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
            depositVault,
            stableCoins,
            mTBILL,
            dataFeed,
            mTokenToUsdDataFeed,
            regularAccounts,
          } = await loadDvFixture();

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
          await setMinAmountTest({ vault: depositVault, owner }, 0);

          for (let i = 0; i < 10; i++) {
            await depositRequestTest(
              {
                depositVault,
                owner,
                mTBILL,
                mTokenToUsdDataFeed,
                customRecipient: regularAccounts[i],
                instantShare: 50_00,
              },
              stableCoins.dai,
              100,
            );
          }

          await safeBulkApproveRequestTest(
            {
              depositVault,
              owner,
              mTBILL,
              mTokenToUsdDataFeed,
              isAvgRate: true,
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
            depositVault,
            stableCoins,
            mTBILL,
            dataFeed,
            mTokenToUsdDataFeed,
          } = await loadDvFixture();

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
          await setMinAmountTest({ vault: depositVault, owner }, 0);

          await depositRequestTest(
            {
              depositVault,
              owner,
              mTBILL,
              mTokenToUsdDataFeed,
              instantShare: 50_00,
            },
            stableCoins.dai,
            100,
          );

          await depositRequestTest(
            {
              depositVault,
              owner,
              mTBILL,
              mTokenToUsdDataFeed,
              instantShare: 50_00,
            },
            stableCoins.usdc,
            100,
          );

          await safeBulkApproveRequestTest(
            {
              depositVault,
              owner,
              mTBILL,
              mTokenToUsdDataFeed,
              isAvgRate: true,
            },
            [{ id: 0 }, { id: 1 }],
            undefined,
          );
        });
      });

      describe('rejectRequest()', async () => {
        it('should fail: call from address without vault admin role', async () => {
          const { depositVault, regularAccounts, mTokenToUsdDataFeed, mTBILL } =
            await loadDvFixture();
          await rejectRequestTest(
            {
              depositVault,
              owner: regularAccounts[1],
              mTBILL,
              mTokenToUsdDataFeed,
            },
            1,
            {
              revertCustomError: acErrors.WMAC_HASNT_PERMISSION,
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
          } = await loadDvFixture();
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
              revertCustomError: {
                customErrorName: 'RequestNotExists',
              },
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
          } = await loadDvFixture();

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
              revertCustomError: {
                customErrorName: 'RequestNotPending',
              },
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
          } = await loadDvFixture();

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
          } = await loadDvFixture();

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
          } = await loadDvFixture();

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
          } = await loadDvFixture();
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
          await setInstantLimitConfigTest(
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
          } = await loadDvFixture();
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
          await setInstantLimitConfigTest(
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
          } = await loadDvFixture();

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
          } = await loadDvFixture();

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
          } = await loadDvFixture();

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
          } = await loadDvFixture();
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
          await setInstantLimitConfigTest(
            { vault: depositVault, owner },
            150_000,
          );

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
          } = await loadDvFixture();
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
          await setInstantLimitConfigTest(
            { vault: depositVault, owner },
            150_000,
          );

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
          } = await loadDvFixture();

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
          } = await loadDvFixture();
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
            {
              depositVault,
              owner,
              mTBILL,
              mTokenToUsdDataFeed,
              customRecipient,
            },
            stableCoins.dai,
            90,
            {
              from: regularAccounts[0],
            },
          );

          await depositRequestTest(
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
      });

      describe('ManageableVault internal functions', () => {
        it('should fail: invalid rounding tokenTransferFromToTester()', async () => {
          const { depositVault, stableCoins, owner } = await loadDvFixture();

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
          ).to.be.revertedWithCustomError(depositVault, 'InvalidRounding');
        });

        it('should fail: invalid rounding tokenTransferToUserTester()', async () => {
          const { depositVault, stableCoins, owner } = await loadDvFixture();

          await mintToken(stableCoins.usdc, depositVault, 1000);

          await expect(
            depositVault.tokenTransferToUserTester(
              stableCoins.usdc.address,
              owner.address,
              parseUnits('999.999999999'),
              8,
            ),
          ).to.be.revertedWithCustomError(depositVault, 'InvalidRounding');
        });
      });

      describe('_convertUsdToToken', () => {
        it('when amountUsd == 0', async () => {
          const { depositVault, owner, stableCoins, dataFeed } =
            await loadDvFixture();

          await addPaymentTokenTest(
            { vault: depositVault, owner },
            stableCoins.dai,
            dataFeed.address,
            0,
            true,
          );

          expect(
            (
              await depositVault.convertTokenToUsdTest(
                stableCoins.dai.address,
                0,
              )
            ).amountInUsd,
          ).eq(0);
        });

        it('should fail: when unknown payment token', async () => {
          const { depositVault } = await loadDvFixture();

          await expect(
            depositVault.convertTokenToUsdTest(constants.AddressZero, 0),
          ).to.be.revertedWithoutReason();
        });

        it('should fail: when tokenRate == 0', async () => {
          const { depositVault, owner, stableCoins, dataFeed } =
            await loadDvFixture();

          await depositVault.setOverrideGetTokenRate(true);
          await depositVault.setGetTokenRateValue(0);

          await addPaymentTokenTest(
            { vault: depositVault, owner },
            stableCoins.dai,
            dataFeed.address,
            0,
            true,
          );

          await expect(
            depositVault.convertTokenToUsdTest(stableCoins.dai.address, 1),
          ).to.be.revertedWithCustomError(depositVault, 'InvalidTokenRate');
        });
      });

      describe('_convertUsdToMToken', () => {
        it('when amountUsd == 0', async () => {
          const { depositVault } = await loadDvFixture();

          expect(
            (await depositVault.convertUsdToMTokenTest(0)).amountMToken,
          ).eq(0);
        });

        it('should fail: when rate == 0', async () => {
          const { depositVault } = await loadDvFixture();

          await depositVault.setOverrideGetTokenRate(true);
          await depositVault.setGetTokenRateValue(0);

          await expect(
            depositVault.convertUsdToMTokenTest(1),
          ).to.be.revertedWithCustomError(depositVault, 'InvalidTokenRate');
        });
      });

      describe('_calculateHoldbackPartRateFromAvg', () => {
        it('returns 0 when depositedUsdAmount is 0', async () => {
          const { depositVault } = await loadDvFixture();
          const depositedUsdAmount = 0;
          const amountTokenInstant = parseUnits('50');
          const avgMTokenRate = parseUnits('1');
          const tokenOutRate = parseUnits('1');
          const expected = expectedDepositHoldbackPartRateFromAvg(
            0n,
            BigInt(amountTokenInstant.toString()),
            BigInt(tokenOutRate.toString()),
            BigInt(avgMTokenRate.toString()),
          );
          expect(expected).eq(0n);
          expect(
            await depositVault.calculateHoldbackPartRateFromAvgTest(
              depositedUsdAmount,
              amountTokenInstant,
              tokenOutRate,
              avgMTokenRate,
            ),
          ).eq(expected.toString());
        });

        it('returns 0 when avg rate implies lower target value than instant leg', async () => {
          const { depositVault } = await loadDvFixture();
          const depositedUsdAmount = parseUnits('10');
          const amountTokenInstant = parseUnits('100');
          const avgMTokenRate = parseUnits('1');
          const tokenOutRate = parseUnits('0.5');
          const expected = expectedDepositHoldbackPartRateFromAvg(
            BigInt(depositedUsdAmount.toString()),
            BigInt(amountTokenInstant.toString()),
            BigInt(tokenOutRate.toString()),
            BigInt(avgMTokenRate.toString()),
          );
          expect(expected).eq(0n);
          expect(
            await depositVault.calculateHoldbackPartRateFromAvgTest(
              depositedUsdAmount,
              amountTokenInstant,
              tokenOutRate,
              avgMTokenRate,
            ),
          ).eq(expected.toString());
        });

        it('returns 0 when avgMTokenRate is 0', async () => {
          const { depositVault } = await loadDvFixture();
          const depositedUsdAmount = parseUnits('100');
          const amountTokenInstant = parseUnits('0');
          const one = parseUnits('1');
          const expected = expectedDepositHoldbackPartRateFromAvg(
            BigInt(depositedUsdAmount.toString()),
            BigInt(amountTokenInstant.toString()),
            BigInt(one.toString()),
            0n,
          );
          expect(
            await depositVault.calculateHoldbackPartRateFromAvgTest(
              depositedUsdAmount,
              amountTokenInstant,
              one,
              0,
            ),
          ).eq(expected.toString());
        });

        it('full holdback rate equals avg when no instant tranche', async () => {
          const { depositVault } = await loadDvFixture();
          const depositedUsdAmount = parseUnits('100');
          const amountTokenInstant = 0;
          const tokenOutRate = parseUnits('1');
          const avgMTokenRate = parseUnits('1.25');
          const expected = expectedDepositHoldbackPartRateFromAvg(
            BigInt(depositedUsdAmount.toString()),
            0n,
            BigInt(tokenOutRate.toString()),
            BigInt(avgMTokenRate.toString()),
          );
          expect(
            await depositVault.calculateHoldbackPartRateFromAvgTest(
              depositedUsdAmount,
              amountTokenInstant,
              tokenOutRate,
              avgMTokenRate,
            ),
          ).eq(expected.toString());
          expect(expected).eq(BigInt(avgMTokenRate.toString()));
        });

        it('applies integer rounding on the final rate', async () => {
          const { depositVault } = await loadDvFixture();
          const depositedUsdAmount = 3n;
          const amountTokenInstant = 1n;
          const tokenOutRate = 3n;
          const avgMTokenRate = 2n;
          const expected = expectedDepositHoldbackPartRateFromAvg(
            depositedUsdAmount,
            amountTokenInstant,
            tokenOutRate,
            avgMTokenRate,
          );
          expect(
            await depositVault.calculateHoldbackPartRateFromAvgTest(
              depositedUsdAmount,
              amountTokenInstant,
              tokenOutRate,
              avgMTokenRate,
            ),
          ).eq(expected.toString());
        });

        it('succeeds with depositedUsdAmount == 0 when branch returns 0 before division', async () => {
          const { depositVault } = await loadDvFixture();
          const amountTokenInstant = parseUnits('100');
          const tokenOutRate = parseUnits('1');
          const avgMTokenRate = parseUnits('1');
          const expected = expectedDepositHoldbackPartRateFromAvg(
            0n,
            BigInt(amountTokenInstant.toString()),
            BigInt(tokenOutRate.toString()),
            BigInt(avgMTokenRate.toString()),
          );
          expect(expected).eq(0n);
          expect(
            await depositVault.calculateHoldbackPartRateFromAvgTest(
              0,
              amountTokenInstant,
              tokenOutRate,
              avgMTokenRate,
            ),
          ).eq('0');
        });

        it('returns 0 when depositedUsdAmount == 0 and holdback part is positive', async () => {
          const { depositVault } = await loadDvFixture();
          const amountTokenInstant = parseUnits('100');
          const avgMTokenRate = parseUnits('1');
          const tokenOutRate = parseUnits('2');
          const expected = expectedDepositHoldbackPartRateFromAvg(
            0n,
            BigInt(amountTokenInstant.toString()),
            BigInt(tokenOutRate.toString()),
            BigInt(avgMTokenRate.toString()),
          );
          expect(expected).eq(0n);
          expect(
            await depositVault.calculateHoldbackPartRateFromAvgTest(
              0,
              amountTokenInstant,
              tokenOutRate,
              avgMTokenRate,
            ),
          ).eq(expected.toString());
        });

        it('matches reference for mixed instant and holdback with realistic WAD rates', async () => {
          const { depositVault } = await loadDvFixture();
          const depositedUsdAmount = parseUnits('70');
          const amountTokenInstant = parseUnits('30');
          const avgMTokenRate = parseUnits('1');
          const tokenOutRate = parseUnits('1');
          const expected = expectedDepositHoldbackPartRateFromAvg(
            BigInt(depositedUsdAmount.toString()),
            BigInt(amountTokenInstant.toString()),
            BigInt(tokenOutRate.toString()),
            BigInt(avgMTokenRate.toString()),
          );
          expect(
            await depositVault.calculateHoldbackPartRateFromAvgTest(
              depositedUsdAmount,
              amountTokenInstant,
              tokenOutRate,
              avgMTokenRate,
            ),
          ).eq(expected.toString());
        });

        it('handles large values without overflow when inputs are bounded', async () => {
          const { depositVault } = await loadDvFixture();
          const depositedUsdAmount = 10n ** 30n * 6n;
          const amountTokenInstant = 10n ** 30n * 4n;
          const avgMTokenRate = 10n ** 18n * 2n;
          const tokenOutRate = 10n ** 18n * 5n;
          const expected = expectedDepositHoldbackPartRateFromAvg(
            depositedUsdAmount,
            amountTokenInstant,
            tokenOutRate,
            avgMTokenRate,
          );
          expect(
            await depositVault.calculateHoldbackPartRateFromAvgTest(
              depositedUsdAmount,
              amountTokenInstant,
              tokenOutRate,
              avgMTokenRate,
            ),
          ).eq(expected.toString());
        });
      });
    });

    otherTests(dvFixture);
  });
};
