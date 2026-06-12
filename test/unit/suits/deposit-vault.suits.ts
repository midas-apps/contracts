import { loadFixture } from '@nomicfoundation/hardhat-network-helpers';
import { increase } from '@nomicfoundation/hardhat-network-helpers/dist/src/helpers/time';
import {
  days,
  hours,
} from '@nomicfoundation/hardhat-network-helpers/dist/src/helpers/time/duration';
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { expect } from 'chai';
import { constants, Contract } from 'ethers';
import { parseUnits } from 'ethers/lib/utils';

import {
  baseInitParamsMv,
  manageableVaultSuits,
  mvInitializeParamCases,
} from './manageable-vault.suits';

import { encodeFnSelector } from '../../../helpers/utils';
import {
  DepositVaultTest,
  DepositVaultTest__factory,
  DepositVaultWithAaveTest,
  DepositVaultWithMTokenTest,
  DepositVaultWithUSTBTest,
  DepositVaultWithMorphoTest,
} from '../../../typechain-types';
import {
  acErrors,
  blackList,
  greenList,
  setupPermissionRole,
} from '../../common/ac.helpers';
import {
  approveBase18,
  InitializeParamCase,
  initializeParamsSuits,
  InitializeParamsOpt,
  mintToken,
  pauseVault,
  pauseVaultFn,
} from '../../common/common.helpers';
import {
  setMinGrowthApr,
  setRoundDataGrowth,
} from '../../common/custom-feed-growth.helpers';
import { setRoundData } from '../../common/data-feed.helpers';
import {
  setMaxSupplyCapTest,
  setMaxAmountPerRequestTest,
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
  changeTokenAllowanceTest,
  setInstantFeeTest,
  setInstantLimitConfigTest,
  setMinAmountTest,
  setMinMaxInstantFeeTest,
  setMinAmountToDepositTest,
  setMaxInstantShareTest,
  setSequentialRequestProcessingTest,
  setWaivedFeeAccountTest,
} from '../../common/manageable-vault.helpers';
import { InitializerParamsDv } from '../../common/vault-initializer.helpers';
import { sanctionUser } from '../../common/with-sanctions-list.helpers';

const APPROVE_FN_SELECTORS = [
  encodeFnSelector('approveRequest(uint256,uint256,bool)'),
  encodeFnSelector('safeBulkApproveRequestAtSavedRate(uint256[])'),
  encodeFnSelector('safeBulkApproveRequest(uint256[])'),
  encodeFnSelector('safeBulkApproveRequest(uint256[],uint256)'),
  encodeFnSelector('safeBulkApproveRequestAvgRate(uint256[])'),
  encodeFnSelector('safeBulkApproveRequestAvgRate(uint256[],uint256)'),
] as const;

let pauseManager: DefaultFixture['pauseManager'];
let owner: DefaultFixture['owner'];

export const baseInitParamsDv = (
  fixture: DefaultFixture,
): InitializerParamsDv => ({
  ...baseInitParamsMv(fixture),
});

export const tokensReceiverSelfParamCase = <
  TParams extends InitializerParamsDv,
>(
  deployUninitialized: DepositVaultInitConfig<TParams>['deployUninitialized'],
): InitializeParamCase<TParams> => ({
  title: 'tokensReceiver is address(this)',
  contract: deployUninitialized,
  params: (_, contract) => ({ tokensReceiver: contract!.address }),
  revertCustomError: {
    customErrorName: 'InvalidAddress',
    args: (_, contract) => [contract!.address],
  },
});

export type DepositVaultInitConfig<
  TParams extends InitializerParamsDv = InitializerParamsDv,
> = {
  deployUninitialized: (
    fixture: DefaultFixture,
  ) => Contract | Promise<Contract>;
  initialize: (
    fixture: DefaultFixture,
    params: Partial<TParams>,
    opt?: InitializeParamsOpt,
  ) => Promise<void>;
  extraParamCases?: InitializeParamCase<TParams>[];
};

const pauseOtherDepositApproveFns = async (
  depositVault: Contract,
  exceptSelector: (typeof APPROVE_FN_SELECTORS)[number],
) => {
  for (const selector of APPROVE_FN_SELECTORS) {
    if (selector === exceptSelector) {
      continue;
    }
    await pauseVaultFn({ pauseManager, owner }, depositVault, selector);
  }
};
export const depositVaultSuits = (
  dvName: string,
  dvFixture: () => Promise<DefaultFixture>,
  dvConfig: {
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
  initConfig: DepositVaultInitConfig,
  otherTests: (fixture: () => Promise<DefaultFixture>) => void,
) => {
  const loadDvFixture = async () => {
    const fixture = await loadFixture(dvFixture);
    ({ pauseManager, owner } = fixture);

    const { createNew, key } = dvConfig;
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
    manageableVaultSuits(loadDvFixture, dvConfig, async (fixture) => {
      const { depositVault, roles } = fixture;
      expect(await depositVault.contractAdminRole()).eq(
        roles.tokenRoles.mTBILL.depositVaultAdmin,
      );
    });

    it('deployment', async () => {
      const fixture = await loadDvFixture();
      const { depositVault } = fixture;

      expect(await depositVault.minMTokenAmountForFirstDeposit()).eq('0');

      expect(await depositVault.maxSupplyCap()).eq(constants.MaxUint256);

      await deploymentAdditionalChecks({
        ...fixture,
        depositVault: fixture.originalDepositVault as DepositVaultTest,
      });
    });

    describe('initialization', () => {
      initializeParamsSuits(
        [
          ...mvInitializeParamCases,
          tokensReceiverSelfParamCase(initConfig.deployUninitialized),
          ...(initConfig.extraParamCases ?? []),
        ],
        loadDvFixture,
        initConfig.initialize,
      );
    });

    describe('common', () => {
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
            { pauseManager, owner },
            depositVault,
            encodeFnSelector('setMinMTokenAmountForFirstDeposit(uint256)'),
          );

          await setMinAmountToDepositTest({ depositVault, owner }, 1.1, {
            revertCustomError: {
              customErrorName: 'Paused',
            },
          });
        });

        it('succeeds with only scoped function permission', async () => {
          const { accessControl, owner, depositVault, regularAccounts } =
            await loadDvFixture();

          const contractAdminRole = await depositVault.contractAdminRole();
          await setupPermissionRole(
            { accessControl, owner },
            contractAdminRole,
            depositVault.address,
            'setMinMTokenAmountForFirstDeposit(uint256)',
            regularAccounts[0].address,
          );

          expect(
            await accessControl.hasRole(
              contractAdminRole,
              regularAccounts[0].address,
            ),
          ).eq(false);

          await setMinAmountToDepositTest({ depositVault, owner }, 2.2, {
            from: regularAccounts[0],
          });
        });

        it('succeeds with scoped permission and vault admin role', async () => {
          const { accessControl, owner, depositVault, regularAccounts, roles } =
            await loadDvFixture();

          const contractAdminRole = await depositVault.contractAdminRole();
          await setupPermissionRole(
            { accessControl, owner },
            contractAdminRole,
            depositVault.address,
            'setMinMTokenAmountForFirstDeposit(uint256)',
            regularAccounts[0].address,
          );

          await accessControl['grantRole(bytes32,address)'](
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
            { pauseManager, owner },
            depositVault,
            encodeFnSelector('setMaxSupplyCap(uint256)'),
          );

          await setMaxSupplyCapTest({ depositVault, owner }, 1.1, {
            revertCustomError: {
              customErrorName: 'Paused',
            },
          });
        });

        it('succeeds with only scoped function permission', async () => {
          const { accessControl, owner, depositVault, regularAccounts } =
            await loadDvFixture();

          const contractAdminRole = await depositVault.contractAdminRole();
          await setupPermissionRole(
            { accessControl, owner },
            contractAdminRole,
            depositVault.address,
            'setMaxSupplyCap(uint256)',
            regularAccounts[0].address,
          );

          expect(
            await accessControl.hasRole(
              contractAdminRole,
              regularAccounts[0].address,
            ),
          ).eq(false);

          await setMaxSupplyCapTest({ depositVault, owner }, 2.2, {
            from: regularAccounts[0],
          });
        });

        it('succeeds with scoped permission and vault admin role', async () => {
          const { accessControl, owner, depositVault, regularAccounts, roles } =
            await loadDvFixture();

          const contractAdminRole = await depositVault.contractAdminRole();
          await setupPermissionRole(
            { accessControl, owner },
            contractAdminRole,
            depositVault.address,
            'setMaxSupplyCap(uint256)',
            regularAccounts[0].address,
          );

          await accessControl['grantRole(bytes32,address)'](
            roles.tokenRoles.mTBILL.depositVaultAdmin,
            regularAccounts[0].address,
          );

          await setMaxSupplyCapTest({ depositVault, owner }, 2.2, {
            from: regularAccounts[0],
          });
        });
      });

      describe('setMaxAmountPerRequest()', () => {
        it('should fail: call from address without DEPOSIT_VAULT_ADMIN_ROLE role', async () => {
          const { owner, depositVault, regularAccounts } =
            await loadDvFixture();

          await setMaxAmountPerRequestTest({ depositVault, owner }, 100, {
            from: regularAccounts[0],
            revertCustomError: acErrors.WMAC_HASNT_PERMISSION,
          });
        });

        it('call from address with DEPOSIT_VAULT_ADMIN_ROLE role', async () => {
          const { owner, depositVault } = await loadDvFixture();
          await setMaxAmountPerRequestTest({ depositVault, owner }, 100);
        });

        it('should fail: when function is paused', async () => {
          const { owner, depositVault } = await loadDvFixture();

          await pauseVaultFn(
            { pauseManager, owner },
            depositVault,
            encodeFnSelector('setMaxAmountPerRequest(uint256)'),
          );

          await setMaxAmountPerRequestTest({ depositVault, owner }, 100, {
            revertCustomError: {
              customErrorName: 'Paused',
            },
          });
        });

        it('succeeds with only scoped function permission', async () => {
          const { accessControl, owner, depositVault, regularAccounts } =
            await loadDvFixture();

          const contractAdminRole = await depositVault.contractAdminRole();
          await setupPermissionRole(
            { accessControl, owner },
            contractAdminRole,
            depositVault.address,
            'setMaxAmountPerRequest(uint256)',
            regularAccounts[0].address,
          );

          expect(
            await accessControl.hasRole(
              contractAdminRole,
              regularAccounts[0].address,
            ),
          ).eq(false);

          await setMaxAmountPerRequestTest({ depositVault, owner }, 200, {
            from: regularAccounts[0],
          });
        });

        it('succeeds with scoped permission and vault admin role', async () => {
          const { accessControl, owner, depositVault, regularAccounts, roles } =
            await loadDvFixture();

          const contractAdminRole = await depositVault.contractAdminRole();
          await setupPermissionRole(
            { accessControl, owner },
            contractAdminRole,
            depositVault.address,
            'setMaxAmountPerRequest(uint256)',
            regularAccounts[0].address,
          );

          await accessControl['grantRole(bytes32,address)'](
            roles.tokenRoles.mTBILL.depositVaultAdmin,
            regularAccounts[0].address,
          );

          await setMaxAmountPerRequestTest({ depositVault, owner }, 200, {
            from: regularAccounts[0],
          });
        });
      });

      describe('depositInstant()', async () => {
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
        });

        it('should decrease allowance if allowance < UINT_MAX', async () => {
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

        it('should not decrease allowance if allowance = UINT_MAX', async () => {
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
          await pauseVaultFn({ pauseManager, owner }, depositVault, selector);
          await depositInstantTest(
            { depositVault, owner, mTBILL, mTokenToUsdDataFeed },
            stableCoins.dai,
            100,
            {
              from: regularAccounts[0],
              revertCustomError: {
                customErrorName: 'Paused',
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
                customErrorName: 'LessThanMinAmountFirstDeposit',
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

          await setMinAmountTest({ vault: depositVault, owner }, 100);

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
                customErrorName: 'WindowLimitExceeded',
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

        describe('depositInstant() sliding rate limit (RateLimitLibrary)', () => {
          const setupDepositInstantRateLimitFixture = async () => {
            const fixture = await loadDvFixture();
            const {
              depositVault,
              mockedAggregator,
              mockedAggregatorMToken,
              owner,
              mTBILL,
              stableCoins,
              dataFeed,
            } = fixture;

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
            await approveBase18(
              owner,
              stableCoins.dai,
              depositVault,
              1_000_000,
            );

            return fixture;
          };

          it('10h window: full consume, after 1h restores ~10% and two deposits use it', async () => {
            const {
              depositVault,
              owner,
              mTBILL,
              stableCoins,
              mTokenToUsdDataFeed,
            } = await setupDepositInstantRateLimitFixture();

            await setInstantLimitConfigTest(
              { vault: depositVault, owner },
              { window: hours(10), limit: parseUnits('1000') },
            );

            await depositInstantTest(
              { depositVault, owner, mTBILL, mTokenToUsdDataFeed },
              stableCoins.dai,
              1000,
            );

            await increase(hours(1));

            await depositInstantTest(
              { depositVault, owner, mTBILL, mTokenToUsdDataFeed },
              stableCoins.dai,
              100,
            );
          });

          it('1d window: after 80% consumed and limit halved, deposit fails', async () => {
            const {
              depositVault,
              owner,
              mTBILL,
              stableCoins,
              mTokenToUsdDataFeed,
            } = await setupDepositInstantRateLimitFixture();

            const initialLimit = parseUnits('1000');

            await setInstantLimitConfigTest(
              { vault: depositVault, owner },
              { window: days(1), limit: initialLimit },
            );

            await depositInstantTest(
              { depositVault, owner, mTBILL, mTokenToUsdDataFeed },
              stableCoins.dai,
              800,
            );

            await setInstantLimitConfigTest(
              { vault: depositVault, owner },
              { window: days(1), limit: initialLimit.div(2) },
            );

            await depositInstantTest(
              { depositVault, owner, mTBILL, mTokenToUsdDataFeed },
              stableCoins.dai,
              100,
              {
                revertCustomError: {
                  customErrorName: 'WindowLimitExceeded',
                },
              },
            );
          });

          it('1d window: after limit halved, wait 12h and deposit small amount', async () => {
            const {
              depositVault,
              owner,
              mTBILL,
              stableCoins,
              mTokenToUsdDataFeed,
            } = await setupDepositInstantRateLimitFixture();

            const initialLimit = parseUnits('1000');

            await setInstantLimitConfigTest(
              { vault: depositVault, owner },
              { window: days(1), limit: initialLimit },
            );

            await depositInstantTest(
              { depositVault, owner, mTBILL, mTokenToUsdDataFeed },
              stableCoins.dai,
              800,
            );

            await setInstantLimitConfigTest(
              { vault: depositVault, owner },
              { window: days(1), limit: initialLimit.div(2) },
            );

            await depositInstantTest(
              { depositVault, owner, mTBILL, mTokenToUsdDataFeed },
              stableCoins.dai,
              100,
              {
                revertCustomError: {
                  customErrorName: 'WindowLimitExceeded',
                },
              },
            );

            await increase(hours(18));

            await depositInstantTest(
              { depositVault, owner, mTBILL, mTokenToUsdDataFeed },
              stableCoins.dai,
              1,
            );
          });

          it('multiple windows active at the same time', async () => {
            const {
              depositVault,
              owner,
              mTBILL,
              stableCoins,
              mTokenToUsdDataFeed,
            } = await setupDepositInstantRateLimitFixture();

            await setInstantLimitConfigTest(
              { vault: depositVault, owner },
              { window: hours(1), limit: parseUnits('100') },
            );
            await setInstantLimitConfigTest(
              { vault: depositVault, owner },
              { window: hours(6), limit: parseUnits('500') },
            );
            await setInstantLimitConfigTest(
              { vault: depositVault, owner },
              { window: days(1), limit: parseUnits('10000') },
            );

            await depositInstantTest(
              { depositVault, owner, mTBILL, mTokenToUsdDataFeed },
              stableCoins.dai,
              100,
            );

            await depositInstantTest(
              { depositVault, owner, mTBILL, mTokenToUsdDataFeed },
              stableCoins.dai,
              50,
              {
                revertCustomError: {
                  customErrorName: 'WindowLimitExceeded',
                },
              },
            );

            await increase(hours(1));

            await depositInstantTest(
              { depositVault, owner, mTBILL, mTokenToUsdDataFeed },
              stableCoins.dai,
              50,
            );
          });
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
                  customErrorName: 'WindowLimitExceeded',
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
              revertCustomError: {
                customErrorName: 'NotGreenlisted',
              },
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
              revertCustomError: acErrors.WMAC_BLACKLISTED,
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
              revertCustomError: {
                customErrorName: 'NotGreenlisted',
              },
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
              revertCustomError: acErrors.WMAC_BLACKLISTED,
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
          await pauseVaultFn({ pauseManager, owner }, depositVault, selector);
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
                customErrorName: 'Paused',
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
          await setWaivedFeeAccountTest(
            { vault: depositVault, owner },
            owner.address,
            true,
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
            { pauseManager, owner },
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
            { pauseManager, owner },
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

        it('should fail: when estimated mint amount exceeds max amount per request', async () => {
          const {
            owner,
            depositVault,
            stableCoins,
            mTBILL,
            mTokenToUsdDataFeed,
            dataFeed,
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
          await setRoundData({ mockedAggregator }, 1);
          await setRoundData({ mockedAggregator: mockedAggregatorMToken }, 1);
          await setInstantFeeTest({ vault: depositVault, owner }, 0);
          await setMinAmountTest({ vault: depositVault, owner }, 0);
          await setMaxAmountPerRequestTest({ depositVault, owner }, 1);

          await depositRequestTest(
            { depositVault, owner, mTBILL, mTokenToUsdDataFeed },
            stableCoins.dai,
            100,
            {
              revertCustomError: {
                customErrorName: 'MaxAmountPerRequestExceeded',
              },
            },
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
          await pauseVaultFn({ pauseManager, owner }, depositVault, selector);
          await depositRequestTest(
            { depositVault, owner, mTBILL, mTokenToUsdDataFeed },
            stableCoins.dai,
            100,
            {
              from: regularAccounts[0],
              revertCustomError: {
                customErrorName: 'Paused',
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
            'depositRequest(address,uint256,bytes32,address,uint256,uint256,address)',
          );
          await pauseVaultFn({ pauseManager, owner }, depositVault, selector);
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
                customErrorName: 'Paused',
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
                customErrorName: 'LessThanMinAmountFirstDeposit',
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
              revertCustomError: {
                customErrorName: 'NotGreenlisted',
              },
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
              revertCustomError: acErrors.WMAC_BLACKLISTED,
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
              revertCustomError: {
                customErrorName: 'NotGreenlisted',
              },
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
              revertCustomError: acErrors.WMAC_BLACKLISTED,
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
          await setWaivedFeeAccountTest(
            { vault: depositVault, owner },
            owner.address,
            true,
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
            { pauseManager, owner },
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
            { pauseManager, owner },
            depositVault,
            encodeFnSelector(
              'depositRequest(address,uint256,bytes32,address,uint256,uint256,address)',
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

          await depositRequestTest(
            { depositVault, owner, mTBILL, mTokenToUsdDataFeed },
            stableCoins.dai,
            100,
            {
              from: regularAccounts[0],
            },
          );
        });

        it('should fail: cant deposit if effective supply is > max cap', async () => {
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
            2,
            {
              from: regularAccounts[0],
              revertCustomError: {
                customErrorName: 'SupplyCapExceeded',
              },
            },
          );
        });

        it('should fail: cant deposit if effective supply is > max cap when pending requests fill cap', async () => {
          const {
            owner,
            depositVault,
            stableCoins,
            mTBILL,
            dataFeed,
            mTokenToUsdDataFeed,
            regularAccounts,
            mockedAggregator,
            mockedAggregatorMToken,
          } = await loadDvFixture();
          await mintToken(stableCoins.dai, regularAccounts[0], 120);
          await approveBase18(
            regularAccounts[0],
            stableCoins.dai,
            depositVault,
            120,
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

          await depositRequestTest(
            { depositVault, owner, mTBILL, mTokenToUsdDataFeed },
            stableCoins.dai,
            60,
            {
              from: regularAccounts[0],
            },
          );

          await depositRequestTest(
            { depositVault, owner, mTBILL, mTokenToUsdDataFeed },
            stableCoins.dai,
            50,
            {
              from: regularAccounts[0],
              revertCustomError: {
                customErrorName: 'SupplyCapExceeded',
              },
            },
          );
        });
      });

      describe('approveRequest()', async () => {
        describe('isAvgRate=false', async () => {
          it('should fail: call from address without vault admin role', async () => {
            const {
              depositVault,
              regularAccounts,
              mTokenToUsdDataFeed,
              mTBILL,
            } = await loadDvFixture();
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

          describe('request addresses access', () => {
            const setupPendingDepositRequest = async (
              fixture: Awaited<ReturnType<typeof loadDvFixture>>,
              opts?: {
                customRecipient?: SignerWithAddress;
                customClaimer?: SignerWithAddress;
              },
            ) => {
              const {
                owner,
                depositVault,
                stableCoins,
                mTBILL,
                mTokenToUsdDataFeed,
                regularAccounts,
                dataFeed,
                mockedAggregator,
                mockedAggregatorMToken,
              } = fixture;

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
              await setRoundData({ mockedAggregator }, 1.03);
              await setRoundData(
                { mockedAggregator: mockedAggregatorMToken },
                5,
              );

              await depositRequestTest(
                {
                  depositVault,
                  owner,
                  mTBILL,
                  mTokenToUsdDataFeed,
                  customRecipient: opts?.customRecipient ?? regularAccounts[0],
                  ...(opts?.customClaimer
                    ? {
                        customClaimer: opts.customClaimer,
                        instantShare: 0,
                      }
                    : {}),
                },
                stableCoins.dai,
                100,
                { from: regularAccounts[0] },
              );
            };

            it('should fail: approve request when recipient got blacklisted', async () => {
              const fixture = await loadDvFixture();
              const {
                owner,
                depositVault,
                mTBILL,
                mTokenToUsdDataFeed,
                blackListableTester,
                accessControl,
                regularAccounts,
              } = fixture;
              await setupPendingDepositRequest(fixture);

              await blackList(
                { blacklistable: blackListableTester, accessControl, owner },
                regularAccounts[0],
              );

              await approveRequestTest(
                { depositVault, owner, mTBILL, mTokenToUsdDataFeed },
                0,
                parseUnits('5'),
                { revertCustomError: acErrors.WMAC_BLACKLISTED },
              );
            });

            it('should fail: approve request when recipient got ungreenlisted when greenlist enable flag is true', async () => {
              const fixture = await loadDvFixture();
              const { owner, depositVault, mTBILL, mTokenToUsdDataFeed } =
                fixture;
              await setupPendingDepositRequest(fixture);

              await depositVault.setGreenlistEnable(true);

              await approveRequestTest(
                { depositVault, owner, mTBILL, mTokenToUsdDataFeed },
                0,
                parseUnits('5'),
                {
                  revertCustomError: {
                    customErrorName: 'NotGreenlisted',
                  },
                },
              );
            });

            it('should fail: approve request when recipient got sanction listed', async () => {
              const fixture = await loadDvFixture();
              const {
                owner,
                depositVault,
                mTBILL,
                mTokenToUsdDataFeed,
                regularAccounts,
                mockedSanctionsList,
              } = fixture;
              await setupPendingDepositRequest(fixture);

              await sanctionUser(
                { sanctionsList: mockedSanctionsList },
                regularAccounts[0],
              );

              await approveRequestTest(
                { depositVault, owner, mTBILL, mTokenToUsdDataFeed },
                0,
                parseUnits('5'),
                {
                  revertCustomError: {
                    customErrorName: 'Sanctioned',
                  },
                },
              );
            });
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
                  customErrorName: 'UnexpectedRequestStatus',
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
            await setMinAmountTest({ vault: depositVault, owner }, 10);

            await depositRequestTest(
              { depositVault, owner, mTBILL, mTokenToUsdDataFeed },
              stableCoins.dai,
              100,
            );
            const requestId = 0;

            await pauseOtherDepositApproveFns(
              depositVault,
              encodeFnSelector('approveRequest(uint256,uint256,bool)'),
            );

            await approveRequestTest(
              { depositVault, owner, mTBILL, mTokenToUsdDataFeed },
              requestId,
              parseUnits('5'),
            );
          });

          it('approve request should decrease pending supply', async () => {
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
            await setMaxSupplyCapTest({ depositVault, owner }, 100);
            await setRoundData({ mockedAggregator }, 1);
            await setRoundData({ mockedAggregator: mockedAggregatorMToken }, 1);
            await setInstantFeeTest({ vault: depositVault, owner }, 0);
            await setMinAmountTest({ vault: depositVault, owner }, 0);

            await depositRequestTest(
              { depositVault, owner, mTBILL, mTokenToUsdDataFeed },
              stableCoins.dai,
              50,
            );

            await approveRequestTest(
              { depositVault, owner, mTBILL, mTokenToUsdDataFeed },
              0,
              parseUnits('1'),
            );
          });

          it('should fail: when after approval supply exceeds max cap', async () => {
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
            await setMaxSupplyCapTest({ depositVault, owner }, 100);
            await setRoundData({ mockedAggregator }, 1);
            await setRoundData({ mockedAggregator: mockedAggregatorMToken }, 1);
            await setInstantFeeTest({ vault: depositVault, owner }, 0);
            await setMinAmountTest({ vault: depositVault, owner }, 0);

            await depositInstantTest(
              { depositVault, owner, mTBILL, mTokenToUsdDataFeed },
              stableCoins.dai,
              90,
            );

            await depositRequestTest(
              { depositVault, owner, mTBILL, mTokenToUsdDataFeed },
              stableCoins.dai,
              10,
            );

            await approveRequestTest(
              { depositVault, owner, mTBILL, mTokenToUsdDataFeed },
              0,
              parseUnits('0.99'),
              {
                revertCustomError: {
                  customErrorName: 'SupplyCapExceeded',
                },
              },
            );
          });

          it('should approve request in non sequential order when sequentialRequestProcessing is disabled', async () => {
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
            await setInstantFeeTest({ vault: depositVault, owner }, 0);
            await setMinAmountTest({ vault: depositVault, owner }, 0);

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

            await approveRequestTest(
              { depositVault, owner, mTBILL, mTokenToUsdDataFeed },
              1,
              parseUnits('1'),
            );
            await approveRequestTest(
              { depositVault, owner, mTBILL, mTokenToUsdDataFeed },
              0,
              parseUnits('1'),
            );
          });

          it('should fail: approve request in non sequential order when sequentialRequestProcessing is enabled', async () => {
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

            await setSequentialRequestProcessingTest(
              { vault: depositVault, owner },
              true,
            );

            await mintToken(stableCoins.dai, owner, 200);
            await approveBase18(owner, stableCoins.dai, depositVault, 200);
            await addPaymentTokenTest(
              { vault: depositVault, owner },
              stableCoins.dai,
              dataFeed.address,
              0,
              true,
            );
            await setRoundData({ mockedAggregator }, 1);
            await setRoundData({ mockedAggregator: mockedAggregatorMToken }, 1);
            await setInstantFeeTest({ vault: depositVault, owner }, 0);
            await setMinAmountTest({ vault: depositVault, owner }, 0);

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

            await depositRequestTest(
              { depositVault, owner, mTBILL, mTokenToUsdDataFeed },
              stableCoins.dai,
              50,
            );

            await approveRequestTest(
              { depositVault, owner, mTBILL, mTokenToUsdDataFeed },
              0,
              parseUnits('1'),
            );

            await approveRequestTest(
              { depositVault, owner, mTBILL, mTokenToUsdDataFeed },
              2,
              parseUnits('1'),
              {
                revertCustomError: {
                  customErrorName: 'InvalidRequestSequence',
                  args: [2, 1],
                },
              },
            );
          });

          it('should approve request id 0 and then id 1 when sequentialRequestProcessing is enabled', async () => {
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

            await setSequentialRequestProcessingTest(
              { vault: depositVault, owner },
              true,
            );

            await mintToken(stableCoins.dai, owner, 200);
            await approveBase18(owner, stableCoins.dai, depositVault, 200);
            await addPaymentTokenTest(
              { vault: depositVault, owner },
              stableCoins.dai,
              dataFeed.address,
              0,
              true,
            );
            await setRoundData({ mockedAggregator }, 1);
            await setRoundData({ mockedAggregator: mockedAggregatorMToken }, 1);
            await setInstantFeeTest({ vault: depositVault, owner }, 0);
            await setMinAmountTest({ vault: depositVault, owner }, 0);

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

            await approveRequestTest(
              { depositVault, owner, mTBILL, mTokenToUsdDataFeed },
              0,
              parseUnits('1'),
            );

            await approveRequestTest(
              { depositVault, owner, mTBILL, mTokenToUsdDataFeed },
              1,
              parseUnits('1'),
            );
          });

          it('should enforce fifo across separate transactions when sequentialRequestProcessing is enabled', async () => {
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

            await setSequentialRequestProcessingTest(
              { vault: depositVault, owner },
              true,
            );

            await mintToken(stableCoins.dai, owner, 500);
            await approveBase18(owner, stableCoins.dai, depositVault, 500);
            await addPaymentTokenTest(
              { vault: depositVault, owner },
              stableCoins.dai,
              dataFeed.address,
              0,
              true,
            );
            await setRoundData({ mockedAggregator }, 1);
            await setRoundData({ mockedAggregator: mockedAggregatorMToken }, 1);
            await setInstantFeeTest({ vault: depositVault, owner }, 0);
            await setMinAmountTest({ vault: depositVault, owner }, 0);

            for (let i = 0; i < 9; i++) {
              await depositRequestTest(
                { depositVault, owner, mTBILL, mTokenToUsdDataFeed },
                stableCoins.dai,
                50,
              );
            }

            for (const requestId of [0, 1, 2]) {
              await approveRequestTest(
                { depositVault, owner, mTBILL, mTokenToUsdDataFeed },
                requestId,
                parseUnits('1'),
              );
            }

            await approveRequestTest(
              { depositVault, owner, mTBILL, mTokenToUsdDataFeed },
              3,
              parseUnits('1'),
            );

            await approveRequestTest(
              { depositVault, owner, mTBILL, mTokenToUsdDataFeed },
              5,
              parseUnits('1'),
              {
                revertCustomError: {
                  customErrorName: 'InvalidRequestSequence',
                  args: [5, 4],
                },
              },
            );

            await approveRequestTest(
              { depositVault, owner, mTBILL, mTokenToUsdDataFeed },
              4,
              parseUnits('1'),
            );

            for (const requestId of [6, 7, 8]) {
              await approveRequestTest(
                { depositVault, owner, mTBILL, mTokenToUsdDataFeed },
                requestId,
                parseUnits('1'),
                {
                  revertCustomError: {
                    customErrorName: 'InvalidRequestSequence',
                    args: [requestId, 5],
                  },
                },
              );
            }

            for (const requestId of [5, 6, 7]) {
              await approveRequestTest(
                { depositVault, owner, mTBILL, mTokenToUsdDataFeed },
                requestId,
                parseUnits('1'),
              );
            }

            await approveRequestTest(
              { depositVault, owner, mTBILL, mTokenToUsdDataFeed },
              8,
              parseUnits('1'),
            );
          });
        });

        describe('isAvgRate=true', async () => {
          it('should fail: call from address without vault admin role', async () => {
            const {
              depositVault,
              regularAccounts,
              mTokenToUsdDataFeed,
              mTBILL,
            } = await loadDvFixture();
            await approveRequestTest(
              {
                depositVault,
                owner: regularAccounts[1],
                mTBILL,
                mTokenToUsdDataFeed,
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

          it('if new rate greater then variabilityTolerance', async () => {
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
              },
              requestId,
              parseUnits('6'),
            );
          });

          it('if new rate lower then variabilityTolerance', async () => {
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
              },
              requestId,
              parseUnits('4'),
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
              {
                depositVault,
                owner,
                mTBILL,
                mTokenToUsdDataFeed,
              },
              requestId,
              parseUnits('5.000001'),
            );
            await approveRequestTest(
              {
                depositVault,
                owner,
                mTBILL,
                mTokenToUsdDataFeed,
              },
              requestId,
              parseUnits('5.000001'),
              {
                revertCustomError: {
                  customErrorName: 'UnexpectedRequestStatus',
                },
              },
            );
          });

          it('approve request should decrease pending supply', async () => {
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
            await setVariabilityToleranceTest(
              { vault: depositVault, owner },
              1000,
            );
            await setMaxSupplyCapTest({ depositVault, owner }, 100);
            await setRoundData({ mockedAggregator }, 1);
            await setRoundData({ mockedAggregator: mockedAggregatorMToken }, 1);
            await setInstantFeeTest({ vault: depositVault, owner }, 0);
            await setMinAmountTest({ vault: depositVault, owner }, 0);

            await depositRequestTest(
              { depositVault, owner, mTBILL, mTokenToUsdDataFeed },
              stableCoins.dai,
              50,
            );

            await approveRequestTest(
              {
                depositVault,
                owner,
                mTBILL,
                mTokenToUsdDataFeed,
              },
              0,
              parseUnits('1'),
            );
          });

          it('should fail: when after approval supply exceeds max cap', async () => {
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
            await setVariabilityToleranceTest(
              { vault: depositVault, owner },
              1000,
            );
            await setMaxSupplyCapTest({ depositVault, owner }, 100);
            await setRoundData({ mockedAggregator }, 1);
            await setRoundData({ mockedAggregator: mockedAggregatorMToken }, 1);
            await setInstantFeeTest({ vault: depositVault, owner }, 0);
            await setMinAmountTest({ vault: depositVault, owner }, 0);

            await depositInstantTest(
              { depositVault, owner, mTBILL, mTokenToUsdDataFeed },
              stableCoins.dai,
              90,
            );

            await depositRequestTest(
              { depositVault, owner, mTBILL, mTokenToUsdDataFeed },
              stableCoins.dai,
              10,
            );

            await approveRequestTest(
              {
                depositVault,
                owner,
                mTBILL,
                mTokenToUsdDataFeed,
              },
              0,
              parseUnits('0.99'),
              {
                revertCustomError: {
                  customErrorName: 'SupplyCapExceeded',
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

            await setVariabilityToleranceTest(
              { vault: depositVault, owner },
              1000,
            );
            await setInstantFeeTest({ vault: depositVault, owner }, 0);
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
              {
                depositVault,
                owner,
                mTBILL,
                mTokenToUsdDataFeed,
              },
              0,
              parseUnits('0.99'),
              {
                revertCustomError: {
                  customErrorName: 'SupplyCapExceeded',
                },
              },
            );
          });

          it('should fail: when 10 supply cap is left and try to mint more', async () => {
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

            await setVariabilityToleranceTest(
              { vault: depositVault, owner },
              1000,
            );
            await setInstantFeeTest({ vault: depositVault, owner }, 0);
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
              10,
              {
                from: regularAccounts[0],
              },
            );

            await approveRequestTest(
              {
                depositVault,
                owner,
                mTBILL,
                mTokenToUsdDataFeed,
              },
              0,
              parseUnits('0.99'),
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
              {
                depositVault,
                owner,
                mTBILL,
                mTokenToUsdDataFeed,
              },
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
              {
                depositVault,
                owner,
                mTBILL,
                mTokenToUsdDataFeed,
              },
              requestId,
              parseUnits('5.000000001'),
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
              encodeFnSelector('approveRequest(uint256,uint256,bool)'),
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

          it('should approve request in non sequential order when sequentialRequestProcessing is disabled', async () => {
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
            await setVariabilityToleranceTest(
              { vault: depositVault, owner },
              1000,
            );
            await setRoundData({ mockedAggregator }, 1);
            await setRoundData({ mockedAggregator: mockedAggregatorMToken }, 1);
            await setInstantFeeTest({ vault: depositVault, owner }, 0);
            await setMinAmountTest({ vault: depositVault, owner }, 0);

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

            await approveRequestTest(
              {
                depositVault,
                owner,
                mTBILL,
                mTokenToUsdDataFeed,
              },
              1,
              parseUnits('1'),
            );

            await approveRequestTest(
              {
                depositVault,
                owner,
                mTBILL,
                mTokenToUsdDataFeed,
              },
              0,
              parseUnits('1'),
            );
          });

          it('should fail: approve request in non sequential order when sequentialRequestProcessing is enabled', async () => {
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

            await setSequentialRequestProcessingTest(
              { vault: depositVault, owner },
              true,
            );

            await mintToken(stableCoins.dai, owner, 200);
            await approveBase18(owner, stableCoins.dai, depositVault, 200);
            await addPaymentTokenTest(
              { vault: depositVault, owner },
              stableCoins.dai,
              dataFeed.address,
              0,
              true,
            );
            await setVariabilityToleranceTest(
              { vault: depositVault, owner },
              1000,
            );
            await setRoundData({ mockedAggregator }, 1);
            await setRoundData({ mockedAggregator: mockedAggregatorMToken }, 1);
            await setInstantFeeTest({ vault: depositVault, owner }, 0);
            await setMinAmountTest({ vault: depositVault, owner }, 0);

            for (let i = 0; i < 3; i++) {
              await depositRequestTest(
                { depositVault, owner, mTBILL, mTokenToUsdDataFeed },
                stableCoins.dai,
                50,
              );
            }

            await approveRequestTest(
              {
                depositVault,
                owner,
                mTBILL,
                mTokenToUsdDataFeed,
              },
              0,
              parseUnits('1'),
            );

            await approveRequestTest(
              {
                depositVault,
                owner,
                mTBILL,
                mTokenToUsdDataFeed,
              },
              2,
              parseUnits('1'),
              {
                revertCustomError: {
                  customErrorName: 'InvalidRequestSequence',
                  args: [2, 1],
                },
              },
            );
          });

          it('should approve request id 0 and then id 1 when sequentialRequestProcessing is enabled', async () => {
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

            await setSequentialRequestProcessingTest(
              { vault: depositVault, owner },
              true,
            );

            await mintToken(stableCoins.dai, owner, 200);
            await approveBase18(owner, stableCoins.dai, depositVault, 200);
            await addPaymentTokenTest(
              { vault: depositVault, owner },
              stableCoins.dai,
              dataFeed.address,
              0,
              true,
            );
            await setVariabilityToleranceTest(
              { vault: depositVault, owner },
              1000,
            );
            await setRoundData({ mockedAggregator }, 1);
            await setRoundData({ mockedAggregator: mockedAggregatorMToken }, 1);
            await setInstantFeeTest({ vault: depositVault, owner }, 0);
            await setMinAmountTest({ vault: depositVault, owner }, 0);

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

            await approveRequestTest(
              {
                depositVault,
                owner,
                mTBILL,
                mTokenToUsdDataFeed,
              },
              0,
              parseUnits('1'),
            );

            await approveRequestTest(
              {
                depositVault,
                owner,
                mTBILL,
                mTokenToUsdDataFeed,
              },
              1,
              parseUnits('1'),
            );
          });
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
                customErrorName: 'UnexpectedRequestStatus',
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
            { depositVault, owner, mTBILL, mTokenToUsdDataFeed },
            0,
            parseUnits('5.000001'),
          );

          await safeBulkApproveRequestTest(
            { depositVault, owner, mTBILL, mTokenToUsdDataFeed },
            [{ id: 1 }, { id: 0 }],
            'request-rate',
            {
              revertCustomError: {
                customErrorName: 'UnexpectedRequestStatus',
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
            { depositVault, owner, mTBILL, mTokenToUsdDataFeed },
            0,
            parseUnits('5.000001'),
          );

          await safeBulkApproveRequestTest(
            { depositVault, owner, mTBILL, mTokenToUsdDataFeed },
            [{ id: 1 }, { id: 1 }],
            'request-rate',
            {
              revertCustomError: {
                customErrorName: 'UnexpectedRequestStatus',
              },
            },
          );
        });

        it('approve 2 requests it should decrese the upcoming supply value fully', async () => {
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
          await setMaxSupplyCapTest({ depositVault, owner }, 100);

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
            [{ id: 0 }, { id: 1 }],
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
          await setMinAmountTest({ vault: depositVault, owner }, 10);

          await depositRequestTest(
            { depositVault, owner, mTBILL, mTokenToUsdDataFeed },
            stableCoins.dai,
            100,
          );
          const requestId = 0;

          await pauseOtherDepositApproveFns(
            depositVault,
            encodeFnSelector('safeBulkApproveRequestAtSavedRate(uint256[])'),
          );

          await safeBulkApproveRequestTest(
            { depositVault, owner, mTBILL, mTokenToUsdDataFeed },
            [{ id: requestId }],
            'request-rate',
          );
        });

        it('should approve requests in non sequential order when sequentialRequestProcessing is disabled', async () => {
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
          await setInstantFeeTest({ vault: depositVault, owner }, 0);
          await setMinAmountTest({ vault: depositVault, owner }, 0);

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
            [{ id: 1 }, { id: 0 }],
            'request-rate',
          );
        });

        it('should skip out-of-order bulk approvals without reverting when sequentialRequestProcessing is enabled', async () => {
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

          await setSequentialRequestProcessingTest(
            { vault: depositVault, owner },
            true,
          );

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
          await setInstantFeeTest({ vault: depositVault, owner }, 0);
          await setMinAmountTest({ vault: depositVault, owner }, 0);

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
            [
              { id: 1, expectedToExecute: false },
              { id: 0, expectedToExecute: true },
            ],
            'request-rate',
          );
        });

        it('should approve requests in sequential order when sequentialRequestProcessing is enabled', async () => {
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

          await setSequentialRequestProcessingTest(
            { vault: depositVault, owner },
            true,
          );

          await mintToken(stableCoins.dai, owner, 200);
          await approveBase18(owner, stableCoins.dai, depositVault, 200);
          await addPaymentTokenTest(
            { vault: depositVault, owner },
            stableCoins.dai,
            dataFeed.address,
            0,
            true,
          );
          await setRoundData({ mockedAggregator }, 1);
          await setRoundData({ mockedAggregator: mockedAggregatorMToken }, 1);
          await setInstantFeeTest({ vault: depositVault, owner }, 0);
          await setMinAmountTest({ vault: depositVault, owner }, 0);

          for (let i = 0; i < 3; i++) {
            await depositRequestTest(
              { depositVault, owner, mTBILL, mTokenToUsdDataFeed },
              stableCoins.dai,
              50,
            );
          }

          await safeBulkApproveRequestTest(
            { depositVault, owner, mTBILL, mTokenToUsdDataFeed },
            [{ id: 0 }, { id: 1 }, { id: 2 }],
            'request-rate',
          );
        });

        it('should not approve requests after max supply cap when sequentialRequestProcessing is enabled', async () => {
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

          await setSequentialRequestProcessingTest(
            { vault: depositVault, owner },
            true,
          );

          await mintToken(stableCoins.dai, owner, 100);
          await approveBase18(owner, stableCoins.dai, depositVault, 100);
          await addPaymentTokenTest(
            { vault: depositVault, owner },
            stableCoins.dai,
            dataFeed.address,
            0,
            true,
          );
          await setInstantFeeTest({ vault: depositVault, owner }, 0);
          await setVariabilityToleranceTest(
            { vault: depositVault, owner },
            2000,
          );
          await setRoundData({ mockedAggregator }, 1);
          await setRoundData({ mockedAggregator: mockedAggregatorMToken }, 1);
          await setMinAmountTest({ vault: depositVault, owner }, 0);
          await setMaxSupplyCapTest({ depositVault, owner }, 100);

          await depositRequestTest(
            { depositVault, owner, mTBILL, mTokenToUsdDataFeed },
            stableCoins.dai,
            50,
          );

          await depositRequestTest(
            { depositVault, owner, mTBILL, mTokenToUsdDataFeed },
            stableCoins.dai,
            40,
          );

          await safeBulkApproveRequestTest(
            { depositVault, owner, mTBILL, mTokenToUsdDataFeed },
            [{ id: 0 }, { id: 1, expectedToExecute: false }],
            parseUnits('0.899'),
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
                customErrorName: 'UnexpectedRequestStatus',
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
            { depositVault, owner, mTBILL, mTokenToUsdDataFeed },
            0,
            parseUnits('5.000001'),
          );

          await safeBulkApproveRequestTest(
            { depositVault, owner, mTBILL, mTokenToUsdDataFeed },
            [{ id: 1 }, { id: 0 }],
            parseUnits('5.000001'),
            {
              revertCustomError: {
                customErrorName: 'UnexpectedRequestStatus',
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
            { depositVault, owner, mTBILL, mTokenToUsdDataFeed },
            0,
            parseUnits('5.000001'),
          );

          await safeBulkApproveRequestTest(
            { depositVault, owner, mTBILL, mTokenToUsdDataFeed },
            [{ id: 1 }, { id: 1 }],
            parseUnits('5.000001'),
            {
              revertCustomError: {
                customErrorName: 'UnexpectedRequestStatus',
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
          await setInstantFeeTest({ vault: depositVault, owner }, 0);
          await setVariabilityToleranceTest(
            { vault: depositVault, owner },
            2000,
          );
          await setRoundData({ mockedAggregator }, 1);
          await setRoundData({ mockedAggregator: mockedAggregatorMToken }, 1);
          await setMinAmountTest({ vault: depositVault, owner }, 0);
          await setMaxSupplyCapTest({ depositVault, owner }, 100);

          await depositRequestTest(
            { depositVault, owner, mTBILL, mTokenToUsdDataFeed },
            stableCoins.dai,
            50,
          );

          await depositRequestTest(
            { depositVault, owner, mTBILL, mTokenToUsdDataFeed },
            stableCoins.dai,
            40,
          );

          await safeBulkApproveRequestTest(
            { depositVault, owner, mTBILL, mTokenToUsdDataFeed },
            [{ id: 0 }, { id: 1, expectedToExecute: false }],
            parseUnits('0.899'),
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
          await setMinAmountTest({ vault: depositVault, owner }, 10);

          await depositRequestTest(
            { depositVault, owner, mTBILL, mTokenToUsdDataFeed },
            stableCoins.dai,
            100,
          );
          const requestId = 0;

          await pauseOtherDepositApproveFns(
            depositVault,
            encodeFnSelector('safeBulkApproveRequest(uint256[],uint256)'),
          );

          await safeBulkApproveRequestTest(
            { depositVault, owner, mTBILL, mTokenToUsdDataFeed },
            [{ id: requestId }],
            parseUnits('5.000000001'),
          );
        });

        it('should approve requests in non sequential order when sequentialRequestProcessing is disabled', async () => {
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
          await setVariabilityToleranceTest(
            { vault: depositVault, owner },
            2000,
          );
          await setRoundData({ mockedAggregator }, 1);
          await setRoundData({ mockedAggregator: mockedAggregatorMToken }, 1);
          await setInstantFeeTest({ vault: depositVault, owner }, 0);
          await setMinAmountTest({ vault: depositVault, owner }, 0);

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
            [{ id: 1 }, { id: 0 }],
            parseUnits('1'),
          );
        });

        it('should skip out-of-order bulk approvals without reverting when sequentialRequestProcessing is enabled', async () => {
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

          await setSequentialRequestProcessingTest(
            { vault: depositVault, owner },
            true,
          );

          await mintToken(stableCoins.dai, owner, 100);
          await approveBase18(owner, stableCoins.dai, depositVault, 100);
          await addPaymentTokenTest(
            { vault: depositVault, owner },
            stableCoins.dai,
            dataFeed.address,
            0,
            true,
          );
          await setVariabilityToleranceTest(
            { vault: depositVault, owner },
            2000,
          );
          await setRoundData({ mockedAggregator }, 1);
          await setRoundData({ mockedAggregator: mockedAggregatorMToken }, 1);
          await setInstantFeeTest({ vault: depositVault, owner }, 0);
          await setMinAmountTest({ vault: depositVault, owner }, 0);

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
            [
              { id: 1, expectedToExecute: false },
              { id: 0, expectedToExecute: true },
            ],
            parseUnits('1'),
          );
        });

        it('should approve requests in sequential order when sequentialRequestProcessing is enabled', async () => {
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

          await setSequentialRequestProcessingTest(
            { vault: depositVault, owner },
            true,
          );

          await mintToken(stableCoins.dai, owner, 200);
          await approveBase18(owner, stableCoins.dai, depositVault, 200);
          await addPaymentTokenTest(
            { vault: depositVault, owner },
            stableCoins.dai,
            dataFeed.address,
            0,
            true,
          );
          await setVariabilityToleranceTest(
            { vault: depositVault, owner },
            2000,
          );
          await setRoundData({ mockedAggregator }, 1);
          await setRoundData({ mockedAggregator: mockedAggregatorMToken }, 1);
          await setInstantFeeTest({ vault: depositVault, owner }, 0);
          await setMinAmountTest({ vault: depositVault, owner }, 0);

          for (let i = 0; i < 3; i++) {
            await depositRequestTest(
              { depositVault, owner, mTBILL, mTokenToUsdDataFeed },
              stableCoins.dai,
              50,
            );
          }

          await safeBulkApproveRequestTest(
            { depositVault, owner, mTBILL, mTokenToUsdDataFeed },
            [{ id: 0 }, { id: 1 }, { id: 2 }],
            parseUnits('1'),
          );
        });

        it('should not approve requests after max supply cap when sequentialRequestProcessing is enabled', async () => {
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

          await setSequentialRequestProcessingTest(
            { vault: depositVault, owner },
            true,
          );

          await mintToken(stableCoins.dai, owner, 100);
          await approveBase18(owner, stableCoins.dai, depositVault, 100);
          await addPaymentTokenTest(
            { vault: depositVault, owner },
            stableCoins.dai,
            dataFeed.address,
            0,
            true,
          );
          await setInstantFeeTest({ vault: depositVault, owner }, 0);
          await setVariabilityToleranceTest(
            { vault: depositVault, owner },
            2000,
          );
          await setRoundData({ mockedAggregator }, 1);
          await setRoundData({ mockedAggregator: mockedAggregatorMToken }, 1);
          await setMinAmountTest({ vault: depositVault, owner }, 0);
          await setMaxSupplyCapTest({ depositVault, owner }, 100);

          await depositRequestTest(
            { depositVault, owner, mTBILL, mTokenToUsdDataFeed },
            stableCoins.dai,
            50,
          );

          await depositRequestTest(
            { depositVault, owner, mTBILL, mTokenToUsdDataFeed },
            stableCoins.dai,
            40,
          );

          await safeBulkApproveRequestTest(
            { depositVault, owner, mTBILL, mTokenToUsdDataFeed },
            [{ id: 0 }, { id: 1, expectedToExecute: false }],
            parseUnits('0.899'),
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
                customErrorName: 'UnexpectedRequestStatus',
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
            { depositVault, owner, mTBILL, mTokenToUsdDataFeed },
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
                customErrorName: 'UnexpectedRequestStatus',
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
            { depositVault, owner, mTBILL, mTokenToUsdDataFeed },
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
                customErrorName: 'UnexpectedRequestStatus',
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

          await setInstantFeeTest({ vault: depositVault, owner }, 0);
          await setVariabilityToleranceTest(
            { vault: depositVault, owner },
            2000,
          );
          await setRoundData({ mockedAggregator }, 1);
          await setRoundData({ mockedAggregator: mockedAggregatorMToken }, 1);
          await setMinAmountTest({ vault: depositVault, owner }, 0);
          await setMaxSupplyCapTest({ depositVault, owner }, 100);

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
            40,
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
            parseUnits('0.899'),
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
            encodeFnSelector(
              'safeBulkApproveRequestAvgRate(uint256[],uint256)',
            ),
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
            parseUnits('5.000000001'),
          );
        });

        it('should approve requests in non sequential order when sequentialRequestProcessing is disabled', async () => {
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
          await setVariabilityToleranceTest(
            { vault: depositVault, owner },
            2000,
          );
          await setRoundData({ mockedAggregator }, 1.03);
          await setRoundData({ mockedAggregator: mockedAggregatorMToken }, 5);
          await setInstantFeeTest({ vault: depositVault, owner }, 0);
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
            [{ id: 1 }, { id: 0 }],
            parseUnits('5'),
          );
        });

        it('should skip out-of-order bulk approvals without reverting when sequentialRequestProcessing is enabled', async () => {
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

          await setSequentialRequestProcessingTest(
            { vault: depositVault, owner },
            true,
          );

          await mintToken(stableCoins.dai, owner, 200);
          await approveBase18(owner, stableCoins.dai, depositVault, 200);
          await addPaymentTokenTest(
            { vault: depositVault, owner },
            stableCoins.dai,
            dataFeed.address,
            0,
            true,
          );
          await setVariabilityToleranceTest(
            { vault: depositVault, owner },
            2000,
          );
          await setRoundData({ mockedAggregator }, 1.03);
          await setRoundData({ mockedAggregator: mockedAggregatorMToken }, 5);
          await setInstantFeeTest({ vault: depositVault, owner }, 0);
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
            [
              { id: 1, expectedToExecute: false },
              { id: 0, expectedToExecute: true },
            ],
            parseUnits('5'),
          );
        });

        it('should approve requests in sequential order when sequentialRequestProcessing is enabled', async () => {
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

          await setSequentialRequestProcessingTest(
            { vault: depositVault, owner },
            true,
          );

          await mintToken(stableCoins.dai, owner, 300);
          await approveBase18(owner, stableCoins.dai, depositVault, 300);
          await addPaymentTokenTest(
            { vault: depositVault, owner },
            stableCoins.dai,
            dataFeed.address,
            0,
            true,
          );
          await setVariabilityToleranceTest(
            { vault: depositVault, owner },
            2000,
          );
          await setRoundData({ mockedAggregator }, 1.03);
          await setRoundData({ mockedAggregator: mockedAggregatorMToken }, 5);
          await setInstantFeeTest({ vault: depositVault, owner }, 0);
          await setMinAmountTest({ vault: depositVault, owner }, 0);

          for (let i = 0; i < 3; i++) {
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
            [{ id: 0 }, { id: 1 }, { id: 2 }],
            parseUnits('5'),
          );
        });

        it('should not approve requests after max supply cap when sequentialRequestProcessing is enabled', async () => {
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

          await setSequentialRequestProcessingTest(
            { vault: depositVault, owner },
            true,
          );

          await mintToken(stableCoins.dai, owner, 200);
          await approveBase18(owner, stableCoins.dai, depositVault, 200);
          await addPaymentTokenTest(
            { vault: depositVault, owner },
            stableCoins.dai,
            dataFeed.address,
            0,
            true,
          );
          await setInstantFeeTest({ vault: depositVault, owner }, 0);
          await setVariabilityToleranceTest(
            { vault: depositVault, owner },
            2000,
          );
          await setRoundData({ mockedAggregator }, 1);
          await setRoundData({ mockedAggregator: mockedAggregatorMToken }, 1);
          await setMinAmountTest({ vault: depositVault, owner }, 0);
          await setMaxSupplyCapTest({ depositVault, owner }, 100);

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
            40,
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
            parseUnits('0.899'),
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
                customErrorName: 'UnexpectedRequestStatus',
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
                customErrorName: 'UnexpectedRequestStatus',
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
                customErrorName: 'UnexpectedRequestStatus',
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
          await setMinAmountTest({ vault: depositVault, owner }, 10);

          await depositRequestTest(
            { depositVault, owner, mTBILL, mTokenToUsdDataFeed },
            stableCoins.dai,
            100,
          );
          const requestId = 0;

          await pauseOtherDepositApproveFns(
            depositVault,
            encodeFnSelector('safeBulkApproveRequest(uint256[])'),
          );

          await safeBulkApproveRequestTest(
            { depositVault, owner, mTBILL, mTokenToUsdDataFeed },
            [{ id: requestId }],
            undefined,
          );
        });

        it('should approve requests in non sequential order when sequentialRequestProcessing is disabled', async () => {
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
          await setVariabilityToleranceTest(
            { vault: depositVault, owner },
            2000,
          );
          await setRoundData({ mockedAggregator }, 1);
          await setRoundData({ mockedAggregator: mockedAggregatorMToken }, 1);
          await setInstantFeeTest({ vault: depositVault, owner }, 0);
          await setMinAmountTest({ vault: depositVault, owner }, 0);

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
            [{ id: 1 }, { id: 0 }],
            undefined,
          );
        });

        it('should skip out-of-order bulk approvals without reverting when sequentialRequestProcessing is enabled', async () => {
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

          await setSequentialRequestProcessingTest(
            { vault: depositVault, owner },
            true,
          );

          await mintToken(stableCoins.dai, owner, 100);
          await approveBase18(owner, stableCoins.dai, depositVault, 100);
          await addPaymentTokenTest(
            { vault: depositVault, owner },
            stableCoins.dai,
            dataFeed.address,
            0,
            true,
          );
          await setVariabilityToleranceTest(
            { vault: depositVault, owner },
            2000,
          );
          await setRoundData({ mockedAggregator }, 1);
          await setRoundData({ mockedAggregator: mockedAggregatorMToken }, 1);
          await setInstantFeeTest({ vault: depositVault, owner }, 0);
          await setMinAmountTest({ vault: depositVault, owner }, 0);

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
            [
              { id: 1, expectedToExecute: false },
              { id: 0, expectedToExecute: true },
            ],
            undefined,
          );
        });

        it('should approve requests in sequential order when sequentialRequestProcessing is enabled', async () => {
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

          await setSequentialRequestProcessingTest(
            { vault: depositVault, owner },
            true,
          );

          await mintToken(stableCoins.dai, owner, 200);
          await approveBase18(owner, stableCoins.dai, depositVault, 200);
          await addPaymentTokenTest(
            { vault: depositVault, owner },
            stableCoins.dai,
            dataFeed.address,
            0,
            true,
          );
          await setVariabilityToleranceTest(
            { vault: depositVault, owner },
            2000,
          );
          await setRoundData({ mockedAggregator }, 1);
          await setRoundData({ mockedAggregator: mockedAggregatorMToken }, 1);
          await setInstantFeeTest({ vault: depositVault, owner }, 0);
          await setMinAmountTest({ vault: depositVault, owner }, 0);

          for (let i = 0; i < 3; i++) {
            await depositRequestTest(
              { depositVault, owner, mTBILL, mTokenToUsdDataFeed },
              stableCoins.dai,
              50,
            );
          }

          await safeBulkApproveRequestTest(
            { depositVault, owner, mTBILL, mTokenToUsdDataFeed },
            [{ id: 0 }, { id: 1 }, { id: 2 }],
            undefined,
          );
        });

        it('should not approve requests after max supply cap when sequentialRequestProcessing is enabled', async () => {
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

          await setSequentialRequestProcessingTest(
            { vault: depositVault, owner },
            true,
          );

          await mintToken(stableCoins.dai, owner, 100);
          await approveBase18(owner, stableCoins.dai, depositVault, 100);
          await addPaymentTokenTest(
            { vault: depositVault, owner },
            stableCoins.dai,
            dataFeed.address,
            0,
            true,
          );
          await setInstantFeeTest({ vault: depositVault, owner }, 0);
          await setVariabilityToleranceTest(
            { vault: depositVault, owner },
            2000,
          );
          await setRoundData({ mockedAggregator }, 1);
          await setRoundData({ mockedAggregator: mockedAggregatorMToken }, 1);
          await setMinAmountTest({ vault: depositVault, owner }, 0);
          await setMaxSupplyCapTest({ depositVault, owner }, 100);

          await depositRequestTest(
            { depositVault, owner, mTBILL, mTokenToUsdDataFeed },
            stableCoins.dai,
            50,
          );

          await depositRequestTest(
            { depositVault, owner, mTBILL, mTokenToUsdDataFeed },
            stableCoins.dai,
            40,
          );

          await safeBulkApproveRequestTest(
            { depositVault, owner, mTBILL, mTokenToUsdDataFeed },
            [{ id: 0 }, { id: 1, expectedToExecute: false }],
            parseUnits('0.899'),
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
                customErrorName: 'UnexpectedRequestStatus',
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
                customErrorName: 'UnexpectedRequestStatus',
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
                customErrorName: 'UnexpectedRequestStatus',
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
            encodeFnSelector('safeBulkApproveRequestAvgRate(uint256[])'),
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
          );
        });

        it('should approve requests in non sequential order when sequentialRequestProcessing is disabled', async () => {
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
          await setVariabilityToleranceTest(
            { vault: depositVault, owner },
            2000,
          );
          await setRoundData({ mockedAggregator }, 1.03);
          await setRoundData({ mockedAggregator: mockedAggregatorMToken }, 5);
          await setInstantFeeTest({ vault: depositVault, owner }, 0);
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
            [{ id: 1 }, { id: 0 }],
            undefined,
          );
        });

        it('should skip out-of-order bulk approvals without reverting when sequentialRequestProcessing is enabled', async () => {
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

          await setSequentialRequestProcessingTest(
            { vault: depositVault, owner },
            true,
          );

          await mintToken(stableCoins.dai, owner, 200);
          await approveBase18(owner, stableCoins.dai, depositVault, 200);
          await addPaymentTokenTest(
            { vault: depositVault, owner },
            stableCoins.dai,
            dataFeed.address,
            0,
            true,
          );
          await setVariabilityToleranceTest(
            { vault: depositVault, owner },
            2000,
          );
          await setRoundData({ mockedAggregator }, 1.03);
          await setRoundData({ mockedAggregator: mockedAggregatorMToken }, 5);
          await setInstantFeeTest({ vault: depositVault, owner }, 0);
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
            [
              { id: 1, expectedToExecute: false },
              { id: 0, expectedToExecute: true },
            ],
            undefined,
          );
        });

        it('should approve requests in sequential order when sequentialRequestProcessing is enabled', async () => {
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

          await setSequentialRequestProcessingTest(
            { vault: depositVault, owner },
            true,
          );

          await mintToken(stableCoins.dai, owner, 300);
          await approveBase18(owner, stableCoins.dai, depositVault, 300);
          await addPaymentTokenTest(
            { vault: depositVault, owner },
            stableCoins.dai,
            dataFeed.address,
            0,
            true,
          );
          await setVariabilityToleranceTest(
            { vault: depositVault, owner },
            2000,
          );
          await setRoundData({ mockedAggregator }, 1.03);
          await setRoundData({ mockedAggregator: mockedAggregatorMToken }, 5);
          await setInstantFeeTest({ vault: depositVault, owner }, 0);
          await setMinAmountTest({ vault: depositVault, owner }, 0);

          for (let i = 0; i < 3; i++) {
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
            [{ id: 0 }, { id: 1 }, { id: 2 }],
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
                customErrorName: 'UnexpectedRequestStatus',
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

        it('rejecting request should decrease pending supply', async () => {
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
          await setMaxSupplyCapTest({ depositVault, owner }, 100);
          await setRoundData({ mockedAggregator }, 1);
          await setRoundData({ mockedAggregator: mockedAggregatorMToken }, 1);
          await setInstantFeeTest({ vault: depositVault, owner }, 0);
          await setMinAmountTest({ vault: depositVault, owner }, 0);

          await depositRequestTest(
            { depositVault, owner, mTBILL, mTokenToUsdDataFeed },
            stableCoins.dai,
            50,
          );

          await rejectRequestTest(
            { depositVault, owner, mTBILL, mTokenToUsdDataFeed },
            0,
          );
        });

        it('should reject request id 0 and then id 1 when sequentialRequestProcessing is enabled', async () => {
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

          await setSequentialRequestProcessingTest(
            { vault: depositVault, owner },
            true,
          );

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

          await rejectRequestTest(
            { depositVault, owner, mTBILL, mTokenToUsdDataFeed },
            0,
          );

          await rejectRequestTest(
            { depositVault, owner, mTBILL, mTokenToUsdDataFeed },
            1,
          );
        });

        it('should fail: reject request id in non sequential order when sequentialRequestProcessing is enabled', async () => {
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

          await setSequentialRequestProcessingTest(
            { vault: depositVault, owner },
            true,
          );

          await mintToken(stableCoins.dai, owner, 300);
          await approveBase18(owner, stableCoins.dai, depositVault, 300);
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

          for (let i = 0; i < 3; i++) {
            await depositRequestTest(
              { depositVault, owner, mTBILL, mTokenToUsdDataFeed },
              stableCoins.dai,
              100,
            );
          }

          await rejectRequestTest(
            { depositVault, owner, mTBILL, mTokenToUsdDataFeed },
            2,
            {
              revertCustomError: {
                customErrorName: 'InvalidRequestSequence',
                args: [2, 0],
              },
            },
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

          await pauseVault({ pauseManager, owner }, depositVault);
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
              revertCustomError: {
                customErrorName: 'Paused',
              },
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

          await pauseVault({ pauseManager, owner }, depositVault);

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
              revertCustomError: {
                customErrorName: 'Paused',
              },
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

          await pauseVault({ pauseManager, owner }, depositVault);
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
              revertCustomError: {
                customErrorName: 'Paused',
              },
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

          await pauseVault({ pauseManager, owner }, depositVault);

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
              revertCustomError: {
                customErrorName: 'Paused',
              },
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

        it('should fail: when 10 supply cap is left and try to mint request 100', async () => {
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
              revertCustomError: {
                customErrorName: 'SupplyCapExceeded',
              },
            },
          );
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
