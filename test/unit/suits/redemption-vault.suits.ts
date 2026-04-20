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
  ERC20Mock,
  ManageableVaultTester__factory,
  Pausable,
  RedemptionVaultTest,
  RedemptionVaultTest__factory,
  RedemptionVaultWithAave,
  RedemptionVaultWithMorpho,
  RedemptionVaultWithMToken,
  RedemptionVaultWithUSTB,
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
import { DefaultFixture } from '../../common/fixtures';
import { greenListEnable } from '../../common/greenlist.helpers';
import {
  addPaymentTokenTest,
  addWaivedFeeAccountTest,
  changeTokenAllowanceTest,
  removePaymentTokenTest,
  removeInstantLimitConfigTest,
  removeWaivedFeeAccountTest,
  setInstantFeeTest,
  setInstantLimitConfigTest,
  setMinMaxInstantFeeTest,
  setMinAmountTest,
  setVariabilityToleranceTest,
  changeTokenFeeTest,
  setTokensReceiverTest,
  setFeeReceiverTest,
  withdrawTest,
} from '../../common/manageable-vault.helpers';
import {
  approveRedeemRequestTest,
  bulkRepayLpLoanRequestTest,
  cancelLpLoanRequestTest,
  redeemInstantTest,
  redeemRequestTest,
  rejectRedeemRequestTest,
  safeBulkApproveRequestTest,
  setV1RedeemRequestInStorage,
  setLoanLpFeeReceiverTest,
  setLoanLpTest,
  setLoanRepaymentAddressTest,
  setLoanSwapperVaultTest,
  setMaxLoanAprTest,
  setRequestRedeemerTest,
  setMaxInstantShareTest,
  expectedHoldbackPartRateFromAvg,
} from '../../common/redemption-vault.helpers';
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

const pauseOtherRedemptionApproveFns = async (
  redemptionVault: Pausable,
  exceptSelector: (typeof REDEMPTION_APPROVE_FN_SELECTORS)[number],
) => {
  for (const selector of REDEMPTION_APPROVE_FN_SELECTORS) {
    if (selector === exceptSelector) {
      continue;
    }
    await pauseVaultFn(redemptionVault, selector);
  }
};

export const redemptionVaultSuits = (
  rvName: string,
  rvFixture: () => Promise<DefaultFixture>,
  rvConfifg: {
    createNew: (
      owner: SignerWithAddress,
    ) => Promise<
      | RedemptionVaultTest
      | RedemptionVaultWithAave
      | RedemptionVaultWithMToken
      | RedemptionVaultWithUSTB
      | RedemptionVaultWithMorpho
    >;
    key:
      | 'redemptionVault'
      | 'redemptionVaultWithAave'
      | 'redemptionVaultWithMToken'
      | 'redemptionVaultWithUSTB'
      | 'redemptionVaultWithMorpho';
  },
  deploymentAdditionalChecks: (fixtureRes: DefaultFixture) => Promise<void>,
  otherTests: (fixture: () => Promise<DefaultFixture>) => void,
) => {
  const loadRvFixture = async () => {
    const fixture = await loadFixture(rvFixture);

    const { createNew, key } = rvConfifg;
    return {
      ...fixture,
      redemptionVault: RedemptionVaultTest__factory.connect(
        fixture[key].address,
        fixture.owner,
      ),
      createNew: async () => {
        const rv = await createNew(fixture.owner);
        return RedemptionVaultTest__factory.connect(rv.address, fixture.owner);
      },
    };
  };

  describe(rvName, function () {
    it('deployment', async () => {
      const fixture = await loadRvFixture();
      const {
        redemptionVault,
        mTBILL,
        tokensReceiver,
        feeReceiver,
        mTokenToUsdDataFeed,
        roles,
      } = fixture;

      expect(await redemptionVault.mToken()).eq(mTBILL.address);

      expect(await redemptionVault.ONE_HUNDRED_PERCENT()).eq('10000');

      expect(await redemptionVault.paused()).eq(false);

      expect(await redemptionVault.tokensReceiver()).eq(tokensReceiver.address);
      expect(await redemptionVault.feeReceiver()).eq(feeReceiver.address);

      expect(await redemptionVault.minAmount()).eq(1000);

      expect(await redemptionVault.instantFee()).eq('100');

      expect(await redemptionVault.mTokenDataFeed()).eq(
        mTokenToUsdDataFeed.address,
      );
      expect(await redemptionVault.variationTolerance()).eq(1);

      expect(await redemptionVault.vaultRole()).eq(
        roles.tokenRoles.mTBILL.redemptionVaultAdmin,
      );

      expect(await redemptionVault.minInstantFee()).eq(0);
      expect(await redemptionVault.maxInstantFee()).eq(10000);
      expect((await redemptionVault.getLimitConfigs()).windows.length).eq(1);
      expect((await redemptionVault.getLimitConfigs()).configs.length).eq(1);
      const limitConfigs = await redemptionVault.getLimitConfigs();
      const limitConfig = limitConfigs.configs[0];
      const limitWindow = limitConfigs.windows[0];

      expect(limitConfig.limit).eq(parseUnits('100000'));
      expect(limitConfig.limitUsed).eq(0);
      expect(limitConfig.lastEpoch).eq(0);

      expect(limitWindow).eq(days(1));

      expect(await redemptionVault.maxLoanApr()).eq(0);

      expect(await redemptionVault.maxInstantShare()).eq(100_00);

      await deploymentAdditionalChecks(fixture);
    });

    describe('common', () => {
      it('failing deployment', async () => {
        const {
          mTokenToUsdDataFeed,
          feeReceiver,
          tokensReceiver,
          mockedSanctionsList,
          requestRedeemer,
          accessControl,
          mTBILL,
          loanLp,
          loanLpFeeReceiver,
          loanRepaymentAddress,
          redemptionVaultLoanSwapper,
          createNew,
        } = await loadRvFixture();

        const redemptionVaultUninitialized = await createNew();

        await expect(
          redemptionVaultUninitialized.initialize(
            {
              ac: ethers.constants.AddressZero,
              sanctionsList: mockedSanctionsList.address,
              variationTolerance: 1,
              minAmount: parseUnits('100'),
              mToken: ethers.constants.AddressZero,
              mTokenDataFeed: mTokenToUsdDataFeed.address,
              feeReceiver: feeReceiver.address,
              tokensReceiver: tokensReceiver.address,
              instantFee: 100,
            },
            {
              limitConfigs: [
                {
                  limit: parseUnits('100000'),
                  window: days(1),
                },
              ],
              minInstantFee: 0,
              maxInstantFee: 10000,
              maxInstantShare: 100_00,
            },
            { requestRedeemer: requestRedeemer.address },
            {
              loanLp: loanLp.address,
              loanLpFeeReceiver: loanLpFeeReceiver.address,
              loanRepaymentAddress: loanRepaymentAddress.address,
              loanSwapperVault: redemptionVaultLoanSwapper.address,
              maxLoanApr: 0,
            },
          ),
        ).to.be.reverted;
        await expect(
          redemptionVaultUninitialized.initialize(
            {
              ac: accessControl.address,
              sanctionsList: mockedSanctionsList.address,
              variationTolerance: 1,
              minAmount: parseUnits('100'),
              mToken: mTBILL.address,
              mTokenDataFeed: ethers.constants.AddressZero,
              feeReceiver: feeReceiver.address,
              tokensReceiver: tokensReceiver.address,
              instantFee: 100,
            },
            {
              limitConfigs: [
                {
                  limit: parseUnits('100000'),
                  window: days(1),
                },
              ],
              minInstantFee: 0,
              maxInstantFee: 10000,
              maxInstantShare: 100_00,
            },
            {
              requestRedeemer: requestRedeemer.address,
            },
            {
              loanLp: loanLp.address,
              loanLpFeeReceiver: loanLpFeeReceiver.address,
              loanRepaymentAddress: loanRepaymentAddress.address,
              loanSwapperVault: redemptionVaultLoanSwapper.address,
              maxLoanApr: 0,
            },
          ),
        ).to.be.reverted;
        await expect(
          redemptionVaultUninitialized.initialize(
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
            },
            {
              limitConfigs: [
                {
                  limit: parseUnits('100000'),
                  window: days(1),
                },
              ],
              minInstantFee: 0,
              maxInstantFee: 10000,
              maxInstantShare: 100_00,
            },
            {
              requestRedeemer: requestRedeemer.address,
            },
            {
              loanLp: loanLp.address,
              loanLpFeeReceiver: loanLpFeeReceiver.address,
              loanRepaymentAddress: loanRepaymentAddress.address,
              loanSwapperVault: redemptionVaultLoanSwapper.address,
              maxLoanApr: 0,
            },
          ),
        ).to.be.reverted;
        await expect(
          redemptionVaultUninitialized.initialize(
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
            },
            {
              limitConfigs: [
                {
                  limit: parseUnits('100000'),
                  window: days(1),
                },
              ],
              minInstantFee: 0,
              maxInstantFee: 10000,
              maxInstantShare: 100_00,
            },
            {
              requestRedeemer: requestRedeemer.address,
            },
            {
              loanLp: loanLp.address,
              loanLpFeeReceiver: loanLpFeeReceiver.address,
              loanRepaymentAddress: loanRepaymentAddress.address,
              loanSwapperVault: redemptionVaultLoanSwapper.address,
              maxLoanApr: 0,
            },
          ),
        ).to.be.reverted;
      });

      describe('initialization', () => {
        it('should fail: cal; initialize() when already initialized', async () => {
          const { redemptionVault } = await loadRvFixture();

          await expect(
            redemptionVault.initialize(
              {
                ac: constants.AddressZero,
                sanctionsList: constants.AddressZero,
                variationTolerance: 0,
                minAmount: 0,
                mToken: constants.AddressZero,
                mTokenDataFeed: constants.AddressZero,
                feeReceiver: constants.AddressZero,
                tokensReceiver: constants.AddressZero,
                instantFee: 0,
              },
              {
                limitConfigs: [
                  {
                    limit: parseUnits('100000'),
                    window: days(1),
                  },
                ],
                minInstantFee: 0,
                maxInstantFee: 10000,
                maxInstantShare: 100_00,
              },
              {
                requestRedeemer: constants.AddressZero,
              },
              {
                loanLp: constants.AddressZero,
                loanLpFeeReceiver: constants.AddressZero,
                loanRepaymentAddress: constants.AddressZero,
                loanSwapperVault: constants.AddressZero,
                maxLoanApr: 0,
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
          } = await loadRvFixture();

          const vault = await new ManageableVaultTester__factory(
            owner,
          ).deploy();

          await expect(
            vault.initializeWithoutInitializer(
              {
                ac: accessControl.address,
                sanctionsList: mockedSanctionsList.address,
                variationTolerance: 1,
                minAmount: 1000,
                mToken: mTBILL.address,
                mTokenDataFeed: mTokenToUsdDataFeed.address,
                feeReceiver: feeReceiver.address,
                tokensReceiver: tokensReceiver.address,
                instantFee: 100,
              },
              {
                limitConfigs: [
                  {
                    limit: parseUnits('100000'),
                    window: days(1),
                  },
                ],
                minInstantFee: 0,
                maxInstantFee: 10000,
                maxInstantShare: 100_00,
              },
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
          } = await loadRvFixture();

          const vault = await new ManageableVaultTester__factory(
            owner,
          ).deploy();

          await expect(
            vault.initialize(
              {
                ac: accessControl.address,
                sanctionsList: mockedSanctionsList.address,
                variationTolerance: 1,
                minAmount: 1000,
                mToken: mTBILL.address,
                mTokenDataFeed: mTokenToUsdDataFeed.address,
                feeReceiver: feeReceiver.address,
                tokensReceiver: vault.address,
                instantFee: 100,
              },
              {
                limitConfigs: [
                  {
                    limit: parseUnits('100000'),
                    window: days(1),
                  },
                ],
                minInstantFee: 0,
                maxInstantFee: 10000,
                maxInstantShare: 100_00,
              },
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
          } = await loadRvFixture();

          const vault = await new ManageableVaultTester__factory(
            owner,
          ).deploy();

          await expect(
            vault.initialize(
              {
                ac: accessControl.address,
                sanctionsList: mockedSanctionsList.address,
                variationTolerance: 1,
                minAmount: 1000,
                mToken: mTBILL.address,
                mTokenDataFeed: mTokenToUsdDataFeed.address,
                feeReceiver: vault.address,
                tokensReceiver: tokensReceiver.address,
                instantFee: 100,
              },
              {
                limitConfigs: [
                  {
                    limit: parseUnits('100000'),
                    window: days(1),
                  },
                ],
                minInstantFee: 0,
                maxInstantFee: 10000,
                maxInstantShare: 100_00,
              },
            ),
          ).revertedWith('invalid address');
        });

        it('should fail: when mToken dataFeed address zero', async () => {
          const {
            owner,
            accessControl,
            mTBILL,
            tokensReceiver,
            feeReceiver,
            mockedSanctionsList,
          } = await loadRvFixture();

          const vault = await new ManageableVaultTester__factory(
            owner,
          ).deploy();

          await expect(
            vault.initialize(
              {
                ac: accessControl.address,
                sanctionsList: mockedSanctionsList.address,
                variationTolerance: 1,
                minAmount: 1000,
                mToken: mTBILL.address,
                mTokenDataFeed: constants.AddressZero,
                feeReceiver: feeReceiver.address,
                tokensReceiver: tokensReceiver.address,
                instantFee: 100,
              },
              {
                limitConfigs: [
                  {
                    limit: parseUnits('100000'),
                    window: days(1),
                  },
                ],
                minInstantFee: 0,
                maxInstantFee: 10000,
                maxInstantShare: 100_00,
              },
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
          } = await loadRvFixture();

          const vault = await new ManageableVaultTester__factory(
            owner,
          ).deploy();

          await expect(
            vault.initialize(
              {
                ac: accessControl.address,
                sanctionsList: mockedSanctionsList.address,
                variationTolerance: 0,
                minAmount: 1000,
                mToken: mTBILL.address,
                mTokenDataFeed: mTokenToUsdDataFeed.address,
                feeReceiver: feeReceiver.address,
                tokensReceiver: tokensReceiver.address,
                instantFee: 100,
              },
              {
                limitConfigs: [
                  {
                    limit: parseUnits('100000'),
                    window: days(1),
                  },
                ],
                minInstantFee: 0,
                maxInstantFee: 10000,
                maxInstantShare: 100_00,
              },
            ),
          ).revertedWith('fee == 0');
        });

        it('should fail: when trying to call initializeV2 on initialized contract', async () => {
          const { redemptionVault } = await loadRvFixture();
          await expect(
            redemptionVault.initializeV2(
              {
                minInstantFee: 0,
                maxInstantFee: 0,
                maxInstantShare: 100_00,
                limitConfigs: [],
              },
              {
                loanLp: constants.AddressZero,
                loanLpFeeReceiver: constants.AddressZero,
                loanRepaymentAddress: constants.AddressZero,
                loanSwapperVault: constants.AddressZero,
                maxLoanApr: 0,
              },
            ),
          ).revertedWith('Initializable: contract is already initialized');
        });

        it('when trying to call initializeV2 before v1', async () => {
          const { createNew, regularAccounts } = await loadRvFixture();
          const redemptionVault = await createNew();
          await expect(
            redemptionVault.initializeV2(
              {
                minInstantFee: 0,
                maxInstantFee: 1,
                maxInstantShare: 100_00,
                limitConfigs: [],
              },
              {
                loanLp: regularAccounts[0].address,
                loanLpFeeReceiver: regularAccounts[0].address,
                loanRepaymentAddress: regularAccounts[0].address,
                loanSwapperVault: regularAccounts[0].address,
                maxLoanApr: 0,
              },
            ),
          ).not.reverted;
        });
      });

      describe('redeemInstant() complex', () => {
        it('should fail: when is paused', async () => {
          const {
            redemptionVault,
            owner,
            mTBILL,
            stableCoins,
            regularAccounts,
            dataFeed,
            mTokenToUsdDataFeed,
          } = await loadRvFixture();

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

          await redeemInstantTest(
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
            redemptionVault,
            owner,
            mTBILL,
            stableCoins,
            dataFeed,
            mTokenToUsdDataFeed,
          } = await loadRvFixture();

          await pauseVault(redemptionVault);

          await mintToken(stableCoins.dai, redemptionVault, 100);
          await mintToken(mTBILL, owner, 100);
          await approveBase18(owner, stableCoins.dai, redemptionVault, 100);
          await addPaymentTokenTest(
            { vault: redemptionVault, owner },
            stableCoins.dai,
            dataFeed.address,
            0,
            true,
          );

          await redeemInstantTest(
            { redemptionVault, owner, mTBILL, mTokenToUsdDataFeed },
            stableCoins.dai,
            100,
            {
              revertMessage: 'Pausable: paused',
            },
          );
        });

        it('call for amount == minAmount', async () => {
          const {
            redemptionVault,
            mockedAggregator,
            mockedAggregatorMToken,
            owner,
            mTBILL,
            stableCoins,
            dataFeed,
            mTokenToUsdDataFeed,
          } = await loadRvFixture();
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

          await redeemInstantTest(
            { redemptionVault, owner, mTBILL, mTokenToUsdDataFeed },
            stableCoins.dai,
            100_000,
          );
        });

        it('redeem 100 mtbill, when price is 5$, 125 mtbill when price is 5.1$, 114 mtbill when price is 5.4$', async () => {
          const {
            owner,
            mockedAggregator,
            redemptionVault,
            stableCoins,
            mTBILL,
            dataFeed,
            mTokenToUsdDataFeed,
            mockedAggregatorMToken,
          } = await loadRvFixture();

          await mintToken(mTBILL, owner, 100);
          await mintToken(mTBILL, owner, 125);
          await mintToken(mTBILL, owner, 114);

          await mintToken(stableCoins.dai, redemptionVault, 1000);
          await mintToken(stableCoins.usdc, redemptionVault, 1250);
          await mintToken(stableCoins.usdt, redemptionVault, 1140);

          await approveBase18(owner, mTBILL, redemptionVault, 100 + 125 + 114);

          await addPaymentTokenTest(
            { vault: redemptionVault, owner },
            stableCoins.dai,
            dataFeed.address,
            0,
            true,
          );
          await addPaymentTokenTest(
            { vault: redemptionVault, owner },
            stableCoins.usdc,
            dataFeed.address,
            0,
            true,
          );
          await addPaymentTokenTest(
            { vault: redemptionVault, owner },
            stableCoins.usdt,
            dataFeed.address,
            0,
            true,
          );

          await setRoundData({ mockedAggregator: mockedAggregatorMToken }, 1);
          await setRoundData({ mockedAggregator }, 1.04);
          await redeemInstantTest(
            { redemptionVault, owner, mTBILL, mTokenToUsdDataFeed },
            stableCoins.dai,
            100,
          );

          await setRoundData({ mockedAggregator }, 1);
          await redeemInstantTest(
            { redemptionVault, owner, mTBILL, mTokenToUsdDataFeed },
            stableCoins.usdc,
            125,
          );

          await setRoundData({ mockedAggregator }, 1.01);
          await redeemInstantTest(
            { redemptionVault, owner, mTBILL, mTokenToUsdDataFeed },
            stableCoins.usdt,
            114,
          );
        });
      });

      describe('redeemInstant()', () => {
        it('should fail: when there is no token in vault', async () => {
          const {
            owner,
            redemptionVault,
            stableCoins,
            mTBILL,
            mTokenToUsdDataFeed,
          } = await loadRvFixture();

          await redeemInstantTest(
            { redemptionVault, owner, mTBILL, mTokenToUsdDataFeed },
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
            redemptionVault,
            stableCoins,
            mTBILL,
            dataFeed,
            mTokenToUsdDataFeed,
          } = await loadRvFixture();
          await addPaymentTokenTest(
            { vault: redemptionVault, owner },
            stableCoins.dai,
            dataFeed.address,
            0,
            true,
          );
          await redeemInstantTest(
            { redemptionVault, owner, mTBILL, mTokenToUsdDataFeed },
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
            redemptionVault,
            stableCoins,
            mTBILL,
            dataFeed,
            mTokenToUsdDataFeed,
            regularAccounts,
          } = await loadRvFixture();
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
          const selector = encodeFnSelector(
            'redeemInstant(address,uint256,uint256)',
          );
          await pauseVaultFn(redemptionVault, selector);
          await redeemInstantTest(
            { redemptionVault, owner, mTBILL, mTokenToUsdDataFeed },
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
            redemptionVault,
            stableCoins,
            mTBILL,
            dataFeed,
            mTokenToUsdDataFeed,
          } = await loadRvFixture();

          await approveBase18(owner, mTBILL, redemptionVault, 100);
          await addPaymentTokenTest(
            { vault: redemptionVault, owner },
            stableCoins.dai,
            dataFeed.address,
            0,
            true,
          );
          await redeemInstantTest(
            { redemptionVault, owner, mTBILL, mTokenToUsdDataFeed },
            stableCoins.dai,
            100,
            {
              revertMessage: 'ERC20: burn amount exceeds balance',
            },
          );
        });

        it('should fail: dataFeed rate 0 ', async () => {
          const {
            owner,
            redemptionVault,
            stableCoins,
            mTBILL,
            dataFeed,
            mockedAggregator,
            mockedAggregatorMToken,
            mTokenToUsdDataFeed,
          } = await loadRvFixture();

          await approveBase18(owner, stableCoins.dai, redemptionVault, 10);
          await addPaymentTokenTest(
            { vault: redemptionVault, owner },
            stableCoins.dai,
            dataFeed.address,
            0,
            true,
          );
          await mintToken(mTBILL, owner, 100_000);
          await setRoundData({ mockedAggregator }, 0);
          await redeemInstantTest(
            { redemptionVault, owner, mTBILL, mTokenToUsdDataFeed },
            stableCoins.dai,
            1,
            {
              revertMessage: 'DF: feed is deprecated',
            },
          );
          await setRoundData({ mockedAggregator }, 1);
          await setRoundData({ mockedAggregator: mockedAggregatorMToken }, 0);
          await redeemInstantTest(
            { redemptionVault, owner, mTBILL, mTokenToUsdDataFeed },
            stableCoins.dai,
            1,
            {
              revertMessage: 'DF: feed is deprecated',
            },
          );
        });

        it('should fail: call for amount < minAmount', async () => {
          const {
            redemptionVault,
            mockedAggregator,
            owner,
            mTBILL,
            stableCoins,
            dataFeed,
            mTokenToUsdDataFeed,
          } = await loadRvFixture();
          await addPaymentTokenTest(
            { vault: redemptionVault, owner },
            stableCoins.dai,
            dataFeed.address,
            0,
            true,
          );
          await setRoundData({ mockedAggregator }, 1);

          await mintToken(mTBILL, owner, 100_000);
          await approveBase18(owner, mTBILL, redemptionVault, 100_000);

          await setMinAmountTest({ vault: redemptionVault, owner }, 100_000);

          await redeemInstantTest(
            { redemptionVault, owner, mTBILL, mTokenToUsdDataFeed },
            stableCoins.dai,
            99_999,
            {
              revertMessage: 'RV: amount < min',
            },
          );
        });

        it('should fail: if exceed allowance of deposit by token', async () => {
          const {
            redemptionVault,
            mockedAggregator,
            owner,
            mTBILL,
            stableCoins,
            dataFeed,
            mTokenToUsdDataFeed,
          } = await loadRvFixture();
          await addPaymentTokenTest(
            { vault: redemptionVault, owner },
            stableCoins.dai,
            dataFeed.address,
            0,
            true,
          );
          await setRoundData({ mockedAggregator }, 4);

          await mintToken(mTBILL, owner, 100_000);
          await changeTokenAllowanceTest(
            { vault: redemptionVault, owner },
            stableCoins.dai.address,
            100,
          );
          await approveBase18(owner, mTBILL, redemptionVault, 100_000);

          await redeemInstantTest(
            { redemptionVault, owner, mTBILL, mTokenToUsdDataFeed },
            stableCoins.dai,
            99_999,
            {
              revertMessage: 'MV: exceed allowance',
            },
          );
        });

        it('should fail: if redeem daily limit exceeded', async () => {
          const {
            redemptionVault,
            mockedAggregator,
            owner,
            mTBILL,
            stableCoins,
            dataFeed,
            mTokenToUsdDataFeed,
          } = await loadRvFixture();
          await addPaymentTokenTest(
            { vault: redemptionVault, owner },
            stableCoins.dai,
            dataFeed.address,
            0,
            true,
          );
          await setRoundData({ mockedAggregator }, 4);

          await mintToken(mTBILL, owner, 100_000);
          await setInstantLimitConfigTest(
            { vault: redemptionVault, owner },
            1000,
          );

          await approveBase18(owner, mTBILL, redemptionVault, 100_000);

          await redeemInstantTest(
            { redemptionVault, owner, mTBILL, mTokenToUsdDataFeed },
            stableCoins.dai,
            99_999,
            {
              revertMessage: 'MV: exceed limit',
            },
          );
        });

        it('should fail: MV: invalid instant fee when instant fee below min', async () => {
          const {
            redemptionVault,
            mockedAggregator,
            mockedAggregatorMToken,
            owner,
            mTBILL,
            stableCoins,
            dataFeed,
            mTokenToUsdDataFeed,
          } = await loadRvFixture();
          await addPaymentTokenTest(
            { vault: redemptionVault, owner },
            stableCoins.dai,
            dataFeed.address,
            0,
            true,
          );
          await setRoundData({ mockedAggregator }, 4);
          await setRoundData({ mockedAggregator: mockedAggregatorMToken }, 1);
          await mintToken(stableCoins.dai, redemptionVault, 1_000_000);

          await setInstantFeeTest({ vault: redemptionVault, owner }, 100);
          await setMinMaxInstantFeeTest(
            { vault: redemptionVault, owner },
            200,
            10_000,
          );

          await mintToken(mTBILL, owner, 100_000);
          await approveBase18(owner, mTBILL, redemptionVault, 100_000);

          await redeemInstantTest(
            { redemptionVault, owner, mTBILL, mTokenToUsdDataFeed },
            stableCoins.dai,
            100,
            { revertMessage: 'MV: invalid instant fee' },
          );
        });

        it('should fail: MV: invalid instant fee when instant fee above max', async () => {
          const {
            redemptionVault,
            mockedAggregator,
            mockedAggregatorMToken,
            owner,
            mTBILL,
            stableCoins,
            dataFeed,
            mTokenToUsdDataFeed,
          } = await loadRvFixture();
          await addPaymentTokenTest(
            { vault: redemptionVault, owner },
            stableCoins.dai,
            dataFeed.address,
            0,
            true,
          );
          await setRoundData({ mockedAggregator }, 4);
          await setRoundData({ mockedAggregator: mockedAggregatorMToken }, 1);
          await mintToken(stableCoins.dai, redemptionVault, 1_000_000);

          await setInstantFeeTest({ vault: redemptionVault, owner }, 5000);
          await setMinMaxInstantFeeTest(
            { vault: redemptionVault, owner },
            0,
            2000,
          );

          await mintToken(mTBILL, owner, 100_000);
          await approveBase18(owner, mTBILL, redemptionVault, 100_000);

          await redeemInstantTest(
            { redemptionVault, owner, mTBILL, mTokenToUsdDataFeed },
            stableCoins.dai,
            100,
            { revertMessage: 'MV: invalid instant fee' },
          );
        });

        describe('redeemInstant() multiple instant limits', () => {
          it('two windows (12h and 1d): redeem succeeds when under both', async () => {
            const {
              redemptionVault,
              mockedAggregator,
              mockedAggregatorMToken,
              owner,
              mTBILL,
              stableCoins,
              dataFeed,
              mTokenToUsdDataFeed,
            } = await loadRvFixture();
            await addPaymentTokenTest(
              { vault: redemptionVault, owner },
              stableCoins.dai,
              dataFeed.address,
              0,
              true,
            );
            await setRoundData({ mockedAggregator }, 4);
            await setRoundData({ mockedAggregator: mockedAggregatorMToken }, 1);
            await mintToken(stableCoins.dai, redemptionVault, 1_000_000);

            await setInstantLimitConfigTest(
              { vault: redemptionVault, owner },
              { window: hours(12), limit: parseUnits('1000') },
            );
            await setInstantLimitConfigTest(
              { vault: redemptionVault, owner },
              { window: days(1), limit: parseUnits('2000') },
            );

            await mintToken(mTBILL, owner, 100_000);
            await approveBase18(owner, mTBILL, redemptionVault, 100_000);

            await redeemInstantTest(
              { redemptionVault, owner, mTBILL, mTokenToUsdDataFeed },
              stableCoins.dai,
              500,
            );
          });

          it('two windows: redeem fails when one window (12h) is filled', async () => {
            const {
              redemptionVault,
              mockedAggregator,
              mockedAggregatorMToken,
              owner,
              mTBILL,
              stableCoins,
              dataFeed,
              mTokenToUsdDataFeed,
            } = await loadRvFixture();
            await addPaymentTokenTest(
              { vault: redemptionVault, owner },
              stableCoins.dai,
              dataFeed.address,
              0,
              true,
            );
            await setRoundData({ mockedAggregator }, 4);
            await setRoundData({ mockedAggregator: mockedAggregatorMToken }, 1);
            await mintToken(stableCoins.dai, redemptionVault, 1_000_000);

            await setInstantLimitConfigTest(
              { vault: redemptionVault, owner },
              { window: hours(12), limit: parseUnits('100') },
            );
            await setInstantLimitConfigTest(
              { vault: redemptionVault, owner },
              { window: days(1), limit: parseUnits('10000') },
            );

            await mintToken(mTBILL, owner, 100_000);
            await approveBase18(owner, mTBILL, redemptionVault, 100_000);

            await redeemInstantTest(
              { redemptionVault, owner, mTBILL, mTokenToUsdDataFeed },
              stableCoins.dai,
              60,
            );

            await redeemInstantTest(
              { redemptionVault, owner, mTBILL, mTokenToUsdDataFeed },
              stableCoins.dai,
              50,
              { revertMessage: 'MV: exceed limit' },
            );
          });

          it('two windows: 12h epoch resets after 12h, redeem succeeds again', async () => {
            const {
              redemptionVault,
              mockedAggregator,
              mockedAggregatorMToken,
              owner,
              mTBILL,
              stableCoins,
              dataFeed,
              mTokenToUsdDataFeed,
            } = await loadRvFixture();
            await addPaymentTokenTest(
              { vault: redemptionVault, owner },
              stableCoins.dai,
              dataFeed.address,
              0,
              true,
            );
            await setRoundData({ mockedAggregator }, 4);
            await setRoundData({ mockedAggregator: mockedAggregatorMToken }, 1);
            await mintToken(stableCoins.dai, redemptionVault, 1_000_000);

            await setInstantLimitConfigTest(
              { vault: redemptionVault, owner },
              { window: hours(12), limit: parseUnits('100') },
            );
            await setInstantLimitConfigTest(
              { vault: redemptionVault, owner },
              { window: days(1), limit: parseUnits('10000') },
            );

            await mintToken(mTBILL, owner, 100_000);
            await approveBase18(owner, mTBILL, redemptionVault, 100_000);

            await redeemInstantTest(
              { redemptionVault, owner, mTBILL, mTokenToUsdDataFeed },
              stableCoins.dai,
              100,
            );

            await increase(hours(12));

            await redeemInstantTest(
              { redemptionVault, owner, mTBILL, mTokenToUsdDataFeed },
              stableCoins.dai,
              10,
            );
          });

          it('two windows: 1d epoch resets after 1d, redeem succeeds again', async () => {
            const {
              redemptionVault,
              mockedAggregator,
              mockedAggregatorMToken,
              owner,
              mTBILL,
              stableCoins,
              dataFeed,
              mTokenToUsdDataFeed,
            } = await loadRvFixture();
            await addPaymentTokenTest(
              { vault: redemptionVault, owner },
              stableCoins.dai,
              dataFeed.address,
              0,
              true,
            );
            await setRoundData({ mockedAggregator }, 4);
            await setRoundData({ mockedAggregator: mockedAggregatorMToken }, 1);
            await mintToken(stableCoins.dai, redemptionVault, 1_000_000);

            await setInstantLimitConfigTest(
              { vault: redemptionVault, owner },
              { window: hours(12), limit: parseUnits('100000') },
            );
            await setInstantLimitConfigTest(
              { vault: redemptionVault, owner },
              { window: days(1), limit: parseUnits('100') },
            );

            await mintToken(mTBILL, owner, 100_000);
            await approveBase18(owner, mTBILL, redemptionVault, 100_000);

            await redeemInstantTest(
              { redemptionVault, owner, mTBILL, mTokenToUsdDataFeed },
              stableCoins.dai,
              100,
            );

            await increase(days(1));

            await redeemInstantTest(
              { redemptionVault, owner, mTBILL, mTokenToUsdDataFeed },
              stableCoins.dai,
              50,
            );
          });

          it('four windows: redeem fails when one limit is exceeded', async () => {
            const {
              redemptionVault,
              mockedAggregator,
              owner,
              mTBILL,
              stableCoins,
              dataFeed,
              mTokenToUsdDataFeed,
            } = await loadRvFixture();
            await addPaymentTokenTest(
              { vault: redemptionVault, owner },
              stableCoins.dai,
              dataFeed.address,
              0,
              true,
            );
            await setRoundData({ mockedAggregator }, 4);

            await setInstantLimitConfigTest(
              { vault: redemptionVault, owner },
              { window: hours(1), limit: parseUnits('50') },
            );
            await setInstantLimitConfigTest(
              { vault: redemptionVault, owner },
              { window: hours(6), limit: parseUnits('500') },
            );
            await setInstantLimitConfigTest(
              { vault: redemptionVault, owner },
              { window: hours(12), limit: parseUnits('5000') },
            );
            await setInstantLimitConfigTest(
              { vault: redemptionVault, owner },
              { window: days(1), limit: parseUnits('50000') },
            );

            await mintToken(mTBILL, owner, 100_000);
            await approveBase18(owner, mTBILL, redemptionVault, 100_000);

            await redeemInstantTest(
              { redemptionVault, owner, mTBILL, mTokenToUsdDataFeed },
              stableCoins.dai,
              60,
              { revertMessage: 'MV: exceed limit' },
            );
          });

          it('four windows: redeem succeeds when under all limits', async () => {
            const {
              redemptionVault,
              mockedAggregator,
              mockedAggregatorMToken,
              owner,
              mTBILL,
              stableCoins,
              dataFeed,
              mTokenToUsdDataFeed,
            } = await loadRvFixture();
            await addPaymentTokenTest(
              { vault: redemptionVault, owner },
              stableCoins.dai,
              dataFeed.address,
              0,
              true,
            );
            await setRoundData({ mockedAggregator }, 4);
            await setRoundData({ mockedAggregator: mockedAggregatorMToken }, 1);
            await mintToken(stableCoins.dai, redemptionVault, 1_000_000);

            await setInstantLimitConfigTest(
              { vault: redemptionVault, owner },
              { window: hours(1), limit: parseUnits('100') },
            );
            await setInstantLimitConfigTest(
              { vault: redemptionVault, owner },
              { window: hours(6), limit: parseUnits('500') },
            );
            await setInstantLimitConfigTest(
              { vault: redemptionVault, owner },
              { window: hours(12), limit: parseUnits('1000') },
            );
            await setInstantLimitConfigTest(
              { vault: redemptionVault, owner },
              { window: days(1), limit: parseUnits('5000') },
            );

            await mintToken(mTBILL, owner, 100_000);
            await approveBase18(owner, mTBILL, redemptionVault, 100_000);

            await redeemInstantTest(
              { redemptionVault, owner, mTBILL, mTokenToUsdDataFeed },
              stableCoins.dai,
              50,
            );
          });

          it('remove window and add same window again: usage resets', async () => {
            const {
              redemptionVault,
              mockedAggregator,
              mockedAggregatorMToken,
              owner,
              mTBILL,
              stableCoins,
              dataFeed,
              mTokenToUsdDataFeed,
            } = await loadRvFixture();
            await addPaymentTokenTest(
              { vault: redemptionVault, owner },
              stableCoins.dai,
              dataFeed.address,
              0,
              true,
            );
            await setRoundData({ mockedAggregator }, 4);
            await setRoundData({ mockedAggregator: mockedAggregatorMToken }, 1);
            await mintToken(stableCoins.dai, redemptionVault, 1_000_000);

            await setInstantLimitConfigTest(
              { vault: redemptionVault, owner },
              { window: days(1), limit: parseUnits('1000') },
            );

            await mintToken(mTBILL, owner, 100_000);
            await approveBase18(owner, mTBILL, redemptionVault, 100_000);

            await redeemInstantTest(
              { redemptionVault, owner, mTBILL, mTokenToUsdDataFeed },
              stableCoins.dai,
              400,
            );

            await removeInstantLimitConfigTest(
              { vault: redemptionVault, owner },
              days(1),
            );

            await setInstantLimitConfigTest(
              { vault: redemptionVault, owner },
              { window: days(1), limit: parseUnits('1000') },
            );

            const { windows, configs } =
              await redemptionVault.getLimitConfigs();
            const idx = windows.findIndex((w) => w.eq(days(1)));
            expect(idx).gte(0);
            expect(configs[idx].limitUsed).eq(0);
            expect(configs[idx].lastEpoch).eq(0);

            await redeemInstantTest(
              { redemptionVault, owner, mTBILL, mTokenToUsdDataFeed },
              stableCoins.dai,
              700,
            );
          });

          it('remove window: later redeem is not capped by removed limit', async () => {
            const {
              redemptionVault,
              mockedAggregator,
              mockedAggregatorMToken,
              owner,
              mTBILL,
              stableCoins,
              dataFeed,
              mTokenToUsdDataFeed,
            } = await loadRvFixture();
            await addPaymentTokenTest(
              { vault: redemptionVault, owner },
              stableCoins.dai,
              dataFeed.address,
              0,
              true,
            );
            await setRoundData({ mockedAggregator }, 4);
            await setRoundData({ mockedAggregator: mockedAggregatorMToken }, 1);
            await mintToken(stableCoins.dai, redemptionVault, 1_000_000);

            await setInstantLimitConfigTest(
              { vault: redemptionVault, owner },
              { window: days(1), limit: parseUnits('100') },
            );

            await mintToken(mTBILL, owner, 100_000);
            await approveBase18(owner, mTBILL, redemptionVault, 100_000);

            await redeemInstantTest(
              { redemptionVault, owner, mTBILL, mTokenToUsdDataFeed },
              stableCoins.dai,
              80,
            );

            await removeInstantLimitConfigTest(
              { vault: redemptionVault, owner },
              days(1),
            );

            await redeemInstantTest(
              { redemptionVault, owner, mTBILL, mTokenToUsdDataFeed },
              stableCoins.dai,
              500,
            );
          });
        });

        it('should fail: if min receive amount greater then actual', async () => {
          const {
            redemptionVault,
            mockedAggregator,
            owner,
            mTBILL,
            stableCoins,
            dataFeed,
            mTokenToUsdDataFeed,
          } = await loadRvFixture();
          await addPaymentTokenTest(
            { vault: redemptionVault, owner },
            stableCoins.dai,
            dataFeed.address,
            0,
            true,
          );
          await setRoundData({ mockedAggregator }, 4);

          await mintToken(mTBILL, owner, 100_000);

          await approveBase18(owner, mTBILL, redemptionVault, 100_000);

          await redeemInstantTest(
            {
              redemptionVault,
              owner,
              mTBILL,
              mTokenToUsdDataFeed,
              minAmount: parseUnits('1000000'),
            },
            stableCoins.dai,
            99_999,
            {
              revertMessage: 'RV: minReceiveAmount > actual',
            },
          );
        });

        it('should fail: if some fee = 100%', async () => {
          const {
            owner,
            redemptionVault,
            stableCoins,
            mTBILL,
            dataFeed,
            mTokenToUsdDataFeed,
          } = await loadRvFixture();

          await mintToken(mTBILL, owner, 100);
          await approveBase18(owner, mTBILL, redemptionVault, 100);
          await addPaymentTokenTest(
            { vault: redemptionVault, owner },
            stableCoins.dai,
            dataFeed.address,
            10000,
            true,
          );
          await redeemInstantTest(
            { redemptionVault, owner, mTBILL, mTokenToUsdDataFeed },
            stableCoins.dai,
            100,
            {
              revertMessage: 'RV: amountTokenOut < fee',
            },
          );

          await removePaymentTokenTest(
            { vault: redemptionVault, owner },
            stableCoins.dai,
          );
          await addPaymentTokenTest(
            { vault: redemptionVault, owner },
            stableCoins.dai,
            dataFeed.address,
            0,
            true,
          );
          await setInstantFeeTest({ vault: redemptionVault, owner }, 10000);
          await redeemInstantTest(
            { redemptionVault, owner, mTBILL, mTokenToUsdDataFeed },
            stableCoins.dai,
            100,
            { revertMessage: 'RV: amountTokenOut < fee' },
          );
        });

        it('should fail: greenlist enabled and user not in greenlist ', async () => {
          const {
            owner,
            redemptionVault,
            stableCoins,
            mTBILL,
            mTokenToUsdDataFeed,
          } = await loadRvFixture();

          await redemptionVault.setGreenlistEnable(true);

          await redeemInstantTest(
            { redemptionVault, owner, mTBILL, mTokenToUsdDataFeed },
            stableCoins.dai,
            1,
            {
              revertMessage: acErrors.WMAC_HASNT_ROLE,
            },
          );
        });

        it('should fail: user in blacklist ', async () => {
          const {
            owner,
            redemptionVault,
            stableCoins,
            mTBILL,
            mTokenToUsdDataFeed,
            blackListableTester,
            accessControl,
            regularAccounts,
          } = await loadRvFixture();

          await blackList(
            { blacklistable: blackListableTester, accessControl, owner },
            regularAccounts[0],
          );

          await redeemInstantTest(
            { redemptionVault, owner, mTBILL, mTokenToUsdDataFeed },
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
            redemptionVault,
            stableCoins,
            mTBILL,
            mTokenToUsdDataFeed,
            regularAccounts,
            mockedSanctionsList,
          } = await loadRvFixture();

          await sanctionUser(
            { sanctionsList: mockedSanctionsList },
            regularAccounts[0],
          );

          await redeemInstantTest(
            { redemptionVault, owner, mTBILL, mTokenToUsdDataFeed },
            stableCoins.dai,
            1,
            {
              from: regularAccounts[0],
              revertMessage: 'WSL: sanctioned',
            },
          );
        });

        it('should fail: when function with custom recipient is paused', async () => {
          const {
            owner,
            redemptionVault,
            stableCoins,
            mTBILL,
            dataFeed,
            mTokenToUsdDataFeed,
            regularAccounts,
            customRecipient,
          } = await loadRvFixture();
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
          const selector = encodeFnSelector(
            'redeemInstant(address,uint256,uint256,address)',
          );
          await pauseVaultFn(redemptionVault, selector);
          await redeemInstantTest(
            {
              redemptionVault,
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

        it('should fail: greenlist enabled and recipient not in greenlist (custom recipient overload)', async () => {
          const {
            owner,
            redemptionVault,
            stableCoins,
            mTBILL,
            mTokenToUsdDataFeed,
            greenListableTester,
            accessControl,
            customRecipient,
          } = await loadRvFixture();

          await redemptionVault.setGreenlistEnable(true);

          await greenList(
            { greenlistable: greenListableTester, accessControl, owner },
            owner,
          );

          await redeemInstantTest(
            {
              redemptionVault,
              owner,
              mTBILL,
              mTokenToUsdDataFeed,
              customRecipient,
            },
            stableCoins.dai,
            1,
            {
              revertMessage: acErrors.WMAC_HASNT_ROLE,
            },
          );
        });

        it('should fail: recipient in blacklist (custom recipient overload)', async () => {
          const {
            owner,
            redemptionVault,
            stableCoins,
            mTBILL,
            mTokenToUsdDataFeed,
            blackListableTester,
            accessControl,
            regularAccounts,
            customRecipient,
          } = await loadRvFixture();

          await blackList(
            { blacklistable: blackListableTester, accessControl, owner },
            customRecipient,
          );

          await redeemInstantTest(
            {
              redemptionVault,
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
            redemptionVault,
            stableCoins,
            mTBILL,
            mTokenToUsdDataFeed,
            regularAccounts,
            mockedSanctionsList,
            customRecipient,
          } = await loadRvFixture();

          await sanctionUser(
            { sanctionsList: mockedSanctionsList },
            customRecipient,
          );

          await redeemInstantTest(
            {
              redemptionVault,
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

        it('when enough liquidity on vault but not on loan lp', async () => {
          const {
            owner,
            redemptionVault,
            stableCoins,
            mTBILL,
            mTokenToUsdDataFeed,
            dataFeed,
          } = await loadRvFixture();

          await mintToken(mTBILL, owner, 100);
          await mintToken(stableCoins.dai, redemptionVault, 1000);

          await addPaymentTokenTest(
            { vault: redemptionVault, owner },
            stableCoins.dai,
            dataFeed.address,
            0,
            true,
          );

          await redeemInstantTest(
            { redemptionVault, owner, mTBILL, mTokenToUsdDataFeed },
            stableCoins.dai,
            100,
          );
        });

        describe('loan lp', () => {
          it('when enough liquidity on loan lp but not on vault', async () => {
            const {
              owner,
              redemptionVault,
              stableCoins,
              mTBILL,
              mTokenToUsdDataFeed,
              dataFeed,
              loanLp,
              mTokenLoan,
              redemptionVaultLoanSwapper,
            } = await loadRvFixture();

            await mintToken(mTBILL, owner, 100);
            await mintToken(mTokenLoan, loanLp, 1000);
            await approveBase18(loanLp, mTokenLoan, redemptionVault, 1000);
            await mintToken(stableCoins.dai, redemptionVaultLoanSwapper, 1000);

            await approveBase18(loanLp, stableCoins.dai, redemptionVault, 1000);
            await withdrawTest(
              { vault: redemptionVault, owner },
              stableCoins.dai,
              await stableCoins.dai.balanceOf(redemptionVault.address),
            );

            await addPaymentTokenTest(
              { vault: redemptionVault, owner },
              stableCoins.dai,
              dataFeed.address,
              0,
              true,
            );

            await addPaymentTokenTest(
              { vault: redemptionVaultLoanSwapper, owner },
              stableCoins.dai,
              dataFeed.address,
              0,
              true,
            );

            await redeemInstantTest(
              { redemptionVault, owner, mTBILL, mTokenToUsdDataFeed },
              stableCoins.dai,
              100,
            );
          });

          it('when 25% of liquidity on vault and 75% on loan lp', async () => {
            const {
              owner,
              redemptionVault,
              stableCoins,
              mTBILL,
              mTokenToUsdDataFeed,
              dataFeed,
              loanLp,
              mockedAggregatorMToken,
              mockedAggregator,
              mTokenLoan,
              redemptionVaultLoanSwapper,
            } = await loadRvFixture();

            await mintToken(mTBILL, owner, 100);
            await mintToken(stableCoins.dai, redemptionVault, 25);

            await mintToken(mTokenLoan, loanLp, 75);
            await approveBase18(loanLp, mTokenLoan, redemptionVault, 75);
            await mintToken(stableCoins.dai, redemptionVaultLoanSwapper, 75);
            await approveBase18(loanLp, mTokenLoan, redemptionVault, 75);

            await setRoundData({ mockedAggregator: mockedAggregatorMToken }, 1);
            await setRoundData({ mockedAggregator }, 1);

            await addPaymentTokenTest(
              { vault: redemptionVault, owner },
              stableCoins.dai,
              dataFeed.address,
              0,
              true,
            );

            await addPaymentTokenTest(
              { vault: redemptionVaultLoanSwapper, owner },
              stableCoins.dai,
              dataFeed.address,
              0,
              true,
            );

            await redeemInstantTest(
              { redemptionVault, owner, mTBILL, mTokenToUsdDataFeed },
              stableCoins.dai,
              100,
            );
          });

          it('when 25% of liquidity on vault and 75% on loan lp and all the fees are 0%', async () => {
            const {
              owner,
              redemptionVault,
              stableCoins,
              mTBILL,
              mTokenToUsdDataFeed,
              dataFeed,
              loanLp,
              mockedAggregatorMToken,
              mockedAggregator,
              mTokenLoan,
              redemptionVaultLoanSwapper,
            } = await loadRvFixture();

            await mintToken(mTBILL, owner, 100);
            await mintToken(stableCoins.dai, redemptionVault, 25);

            await mintToken(mTokenLoan, loanLp, 75);
            await approveBase18(loanLp, mTokenLoan, redemptionVault, 75);
            await mintToken(stableCoins.dai, redemptionVaultLoanSwapper, 75);
            await approveBase18(loanLp, mTokenLoan, redemptionVault, 75);

            await setRoundData({ mockedAggregator: mockedAggregatorMToken }, 1);
            await setRoundData({ mockedAggregator }, 1);

            await addPaymentTokenTest(
              { vault: redemptionVault, owner },
              stableCoins.dai,
              dataFeed.address,
              0,
              true,
            );

            await addPaymentTokenTest(
              { vault: redemptionVaultLoanSwapper, owner },
              stableCoins.dai,
              dataFeed.address,
              0,
              true,
            );

            await setInstantFeeTest({ vault: redemptionVault, owner }, 0);

            await redeemInstantTest(
              { redemptionVault, owner, mTBILL, mTokenToUsdDataFeed },
              stableCoins.dai,
              100,
            );
          });

          it('should fail: when not enough liquidity on both vault and loan lp', async () => {
            const {
              owner,
              redemptionVault,
              stableCoins,
              mTBILL,
              mTokenToUsdDataFeed,
              dataFeed,
              loanLp,
              mTokenLoan,
            } = await loadRvFixture();

            await mintToken(mTBILL, owner, 100);
            await approveBase18(loanLp, mTokenLoan, redemptionVault, 1000);
            await addPaymentTokenTest(
              { vault: redemptionVault, owner },
              stableCoins.dai,
              dataFeed.address,
              100,
              true,
            );

            await redeemInstantTest(
              { redemptionVault, owner, mTBILL, mTokenToUsdDataFeed },
              stableCoins.dai,
              100,
              {
                revertMessage: 'ERC20: transfer amount exceeds balance',
              },
            );
          });

          it('should fail: when not enough liquidity on vault and loan lp is set', async () => {
            const {
              owner,
              redemptionVault,
              stableCoins,
              mTBILL,
              mTokenToUsdDataFeed,
              dataFeed,
            } = await loadRvFixture();

            await mintToken(mTBILL, owner, 100);
            await setLoanLpTest(
              { redemptionVault, owner },
              ethers.constants.AddressZero,
            );

            await addPaymentTokenTest(
              { vault: redemptionVault, owner },
              stableCoins.dai,
              dataFeed.address,
              100,
              true,
            );

            await redeemInstantTest(
              { redemptionVault, owner, mTBILL, mTokenToUsdDataFeed },
              stableCoins.dai,
              100,
              {
                revertMessage: 'RV: loan lp not configured',
              },
            );
          });

          it('should fail: when not enough liquidity on vault and loan swapper is set', async () => {
            const {
              owner,
              redemptionVault,
              stableCoins,
              mTBILL,
              mTokenToUsdDataFeed,
              dataFeed,
            } = await loadRvFixture();

            await mintToken(mTBILL, owner, 100);
            await setLoanSwapperVaultTest(
              { redemptionVault, owner },
              ethers.constants.AddressZero,
            );

            await addPaymentTokenTest(
              { vault: redemptionVault, owner },
              stableCoins.dai,
              dataFeed.address,
              100,
              true,
            );

            await redeemInstantTest(
              { redemptionVault, owner, mTBILL, mTokenToUsdDataFeed },
              stableCoins.dai,
              100,
              {
                revertMessage: 'RV: loan lp not configured',
              },
            );
          });

          it('should fail: when not enough liquidity on vault and loan swapper and loanLp are not set', async () => {
            const {
              owner,
              redemptionVault,
              stableCoins,
              mTBILL,
              mTokenToUsdDataFeed,
              dataFeed,
            } = await loadRvFixture();

            await mintToken(mTBILL, owner, 100);
            await setLoanSwapperVaultTest(
              { redemptionVault, owner },
              ethers.constants.AddressZero,
            );
            await setLoanLpTest(
              { redemptionVault, owner },
              ethers.constants.AddressZero,
            );

            await addPaymentTokenTest(
              { vault: redemptionVault, owner },
              stableCoins.dai,
              dataFeed.address,
              100,
              true,
            );

            await redeemInstantTest(
              { redemptionVault, owner, mTBILL, mTokenToUsdDataFeed },
              stableCoins.dai,
              100,
              {
                revertMessage: 'RV: loan lp not configured',
              },
            );
          });

          it('should fail: when rv not fee waived on lp swapper ', async () => {
            const {
              owner,
              redemptionVault,
              stableCoins,
              mTBILL,
              mTokenToUsdDataFeed,
              dataFeed,
              redemptionVaultLoanSwapper,
              loanLp,
              mTokenLoan,
              mockedAggregatorMToken,
              mockedAggregator,
            } = await loadRvFixture();

            await mintToken(mTBILL, owner, 100);

            await mintToken(mTokenLoan, loanLp, 100);
            await approveBase18(loanLp, mTokenLoan, redemptionVault, 100);
            await mintToken(stableCoins.dai, redemptionVaultLoanSwapper, 100);
            await approveBase18(loanLp, mTokenLoan, redemptionVault, 100);

            await removeWaivedFeeAccountTest(
              { vault: redemptionVaultLoanSwapper, owner },
              redemptionVault.address,
            );

            await addPaymentTokenTest(
              { vault: redemptionVault, owner },
              stableCoins.dai,
              dataFeed.address,
              100,
              true,
            );

            await addPaymentTokenTest(
              { vault: redemptionVaultLoanSwapper, owner },
              stableCoins.dai,
              dataFeed.address,
              100,
              true,
            );

            await setRoundData({ mockedAggregator: mockedAggregatorMToken }, 1);
            await setRoundData({ mockedAggregator }, 1);

            await redeemInstantTest(
              { redemptionVault, owner, mTBILL, mTokenToUsdDataFeed },
              stableCoins.dai,
              100,
              {
                revertMessage: 'RV: minReceiveAmount > actual',
              },
            );
          });
        });

        describe('holdback', () => {
          it('when max instant share is 100%', async () => {
            const {
              owner,
              redemptionVault,
              stableCoins,
              mTBILL,
              mTokenToUsdDataFeed,
              dataFeed,
            } = await loadRvFixture();

            await mintToken(mTBILL, owner, 100);
            await mintToken(stableCoins.dai, redemptionVault, 1000);

            await addPaymentTokenTest(
              { vault: redemptionVault, owner },
              stableCoins.dai,
              dataFeed.address,
              0,
              true,
            );

            await redeemInstantTest(
              { redemptionVault, owner, mTBILL, mTokenToUsdDataFeed },
              stableCoins.dai,
              100,
            );
          });

          it('should fail: when max instant share is not 100%', async () => {
            const {
              owner,
              redemptionVault,
              stableCoins,
              mTBILL,
              mTokenToUsdDataFeed,
              dataFeed,
            } = await loadRvFixture();

            await mintToken(mTBILL, owner, 100);
            await mintToken(stableCoins.dai, redemptionVault, 1000);

            await addPaymentTokenTest(
              { vault: redemptionVault, owner },
              stableCoins.dai,
              dataFeed.address,
              0,
              true,
            );

            await setMaxInstantShareTest({ redemptionVault, owner }, 90_00);

            await redeemInstantTest(
              { redemptionVault, owner, mTBILL, mTokenToUsdDataFeed },
              stableCoins.dai,
              100,
              {
                revertMessage: 'RV: !instantShare',
              },
            );
          });
        });

        it('redeem 100 mTBILL when 10% growth is applied', async () => {
          const {
            owner,
            redemptionVault,
            stableCoins,
            mTBILL,
            mTokenToUsdDataFeed,
            regularAccounts,
            dataFeed,
            customFeedGrowth,
          } = await loadRvFixture();

          await mTokenToUsdDataFeed.changeAggregator(customFeedGrowth.address);
          await setRoundDataGrowth({ owner, customFeedGrowth }, 1, -1000, 10);

          await mintToken(stableCoins.dai, redemptionVault, 100000);
          await mintToken(mTBILL, regularAccounts[0], 100);
          await approveBase18(regularAccounts[0], mTBILL, redemptionVault, 100);
          await addPaymentTokenTest(
            { vault: redemptionVault, owner },
            stableCoins.dai,
            dataFeed.address,
            0,
            true,
          );

          await redeemInstantTest(
            {
              redemptionVault,
              owner,
              mTBILL,
              mTokenToUsdDataFeed,
              expectedAmountOut: parseUnits('99.000314820', 9),
            },
            stableCoins.dai,
            100,
            {
              from: regularAccounts[0],
            },
          );
        });

        it('redeem 100 mTBILL when -10% growth is applied', async () => {
          const {
            owner,
            redemptionVault,
            stableCoins,
            mTBILL,
            mTokenToUsdDataFeed,
            regularAccounts,
            dataFeed,
            customFeedGrowth,
          } = await loadRvFixture();

          await setMinGrowthApr({ owner, customFeedGrowth }, -10);
          await mTokenToUsdDataFeed.changeAggregator(customFeedGrowth.address);
          await setRoundDataGrowth({ owner, customFeedGrowth }, 1, -1000, -10);

          await mintToken(stableCoins.dai, redemptionVault, 100000);
          await mintToken(mTBILL, regularAccounts[0], 100);
          await approveBase18(regularAccounts[0], mTBILL, redemptionVault, 100);
          await addPaymentTokenTest(
            { vault: redemptionVault, owner },
            stableCoins.dai,
            dataFeed.address,
            0,
            true,
          );

          await redeemInstantTest(
            {
              redemptionVault,
              owner,
              mTBILL,
              mTokenToUsdDataFeed,
              expectedAmountOut: parseUnits('98.999685180', 9),
            },
            stableCoins.dai,
            100,
            {
              from: regularAccounts[0],
            },
          );
        });

        it('redeem 100 mTBILL, when price of stable is 1.03$ and mToken price is 5$', async () => {
          const {
            owner,
            mockedAggregator,
            mockedAggregatorMToken,
            redemptionVault,
            stableCoins,
            mTBILL,
            dataFeed,
            mTokenToUsdDataFeed,
          } = await loadRvFixture();

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

          await redeemInstantTest(
            { redemptionVault, owner, mTBILL, mTokenToUsdDataFeed },
            stableCoins.dai,
            100,
          );
        });

        it('redeem 100 mTBILL, when price of stable is 1.03$ and mToken price is 5$ and token fee 1%', async () => {
          const {
            owner,
            mockedAggregator,
            mockedAggregatorMToken,
            redemptionVault,
            stableCoins,
            mTBILL,
            dataFeed,
            mTokenToUsdDataFeed,
          } = await loadRvFixture();

          await mintToken(stableCoins.dai, redemptionVault, 100000);
          await mintToken(mTBILL, owner, 100);
          await approveBase18(owner, mTBILL, redemptionVault, 100);
          await addPaymentTokenTest(
            { vault: redemptionVault, owner },
            stableCoins.dai,
            dataFeed.address,
            100,
            true,
          );
          await setRoundData({ mockedAggregator }, 1.03);
          await setRoundData({ mockedAggregator: mockedAggregatorMToken }, 5);
          await redeemInstantTest(
            { redemptionVault, owner, mTBILL, mTokenToUsdDataFeed },
            stableCoins.dai,
            100,
          );
        });

        it('redeem 100 mTBILL, when price of stable is 1.03$ and mToken price is 5$ without checking of minDepositAmount', async () => {
          const {
            owner,
            mockedAggregator,
            mockedAggregatorMToken,
            redemptionVault,
            stableCoins,
            mTBILL,
            dataFeed,
            mTokenToUsdDataFeed,
          } = await loadRvFixture();

          await mintToken(stableCoins.dai, redemptionVault, 100000);
          await mintToken(mTBILL, owner, 100);
          await approveBase18(owner, mTBILL, redemptionVault, 100);
          await addPaymentTokenTest(
            { vault: redemptionVault, owner },
            stableCoins.dai,
            dataFeed.address,
            100,
            true,
          );
          await setRoundData({ mockedAggregator }, 1.03);
          await setRoundData({ mockedAggregator: mockedAggregatorMToken }, 5);
          await redemptionVault.freeFromMinAmount(owner.address, true);
          await redeemInstantTest(
            { redemptionVault, owner, mTBILL, mTokenToUsdDataFeed },
            stableCoins.dai,
            100,
          );
        });

        it('redeem 100 mTBILL, when price of stable is 1.03$ and mToken price is 5$ and user in waivedFeeRestriction', async () => {
          const {
            owner,
            mockedAggregator,
            mockedAggregatorMToken,
            redemptionVault,
            stableCoins,
            mTBILL,
            dataFeed,
            mTokenToUsdDataFeed,
          } = await loadRvFixture();

          await mintToken(stableCoins.dai, redemptionVault, 100000);
          await mintToken(mTBILL, owner, 100);
          await approveBase18(owner, mTBILL, redemptionVault, 100);
          await addPaymentTokenTest(
            { vault: redemptionVault, owner },
            stableCoins.dai,
            dataFeed.address,
            100,
            true,
          );
          await setRoundData({ mockedAggregator }, 1.03);
          await setRoundData({ mockedAggregator: mockedAggregatorMToken }, 5);
          await addWaivedFeeAccountTest(
            { vault: redemptionVault, owner },
            owner.address,
          );
          await redeemInstantTest(
            {
              redemptionVault,
              owner,
              mTBILL,
              mTokenToUsdDataFeed,
              waivedFee: true,
            },
            stableCoins.dai,
            100,
          );
        });

        it('redeem 100 mTBILL (custom recipient overload)', async () => {
          const {
            owner,
            redemptionVault,
            stableCoins,
            mTBILL,
            mTokenToUsdDataFeed,
            regularAccounts,
            dataFeed,
            customRecipient,
          } = await loadRvFixture();

          await mintToken(stableCoins.dai, redemptionVault, 100000);
          await mintToken(mTBILL, regularAccounts[0], 100);
          await approveBase18(regularAccounts[0], mTBILL, redemptionVault, 100);
          await addPaymentTokenTest(
            { vault: redemptionVault, owner },
            stableCoins.dai,
            dataFeed.address,
            0,
            true,
          );

          await redeemInstantTest(
            {
              redemptionVault,
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

        it('redeem 100 mTBILL when recipient == msg.sender (custom recipient overload)', async () => {
          const {
            owner,
            redemptionVault,
            stableCoins,
            mTBILL,
            mTokenToUsdDataFeed,
            regularAccounts,
            dataFeed,
          } = await loadRvFixture();

          await mintToken(stableCoins.dai, redemptionVault, 100000);
          await mintToken(mTBILL, regularAccounts[0], 100);
          await approveBase18(regularAccounts[0], mTBILL, redemptionVault, 100);
          await addPaymentTokenTest(
            { vault: redemptionVault, owner },
            stableCoins.dai,
            dataFeed.address,
            0,
            true,
          );

          await redeemInstantTest(
            {
              redemptionVault,
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

        it('redeem 100 mTBILL when other fn overload is paused (custom recipient overload)', async () => {
          const {
            owner,
            redemptionVault,
            stableCoins,
            mTBILL,
            mTokenToUsdDataFeed,
            regularAccounts,
            dataFeed,
            customRecipient,
          } = await loadRvFixture();

          await pauseVaultFn(
            redemptionVault,
            encodeFnSelector('redeemInstant(address,uint256,uint256)'),
          );
          await mintToken(stableCoins.dai, redemptionVault, 100000);
          await mintToken(mTBILL, regularAccounts[0], 100);
          await approveBase18(regularAccounts[0], mTBILL, redemptionVault, 100);
          await addPaymentTokenTest(
            { vault: redemptionVault, owner },
            stableCoins.dai,
            dataFeed.address,
            0,
            true,
          );

          await redeemInstantTest(
            {
              redemptionVault,
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

        it('when user didnt approve mTokens to redeem', async () => {
          const {
            owner,
            redemptionVault,
            stableCoins,
            mTBILL,
            dataFeed,
            mTokenToUsdDataFeed,
            regularAccounts,
          } = await loadRvFixture();

          await mintToken(mTBILL, regularAccounts[0], 10);
          await mintToken(stableCoins.dai, redemptionVault, 100);
          await addPaymentTokenTest(
            { vault: redemptionVault, owner },
            stableCoins.dai,
            dataFeed.address,
            0,
            true,
          );
          await redeemInstantTest(
            { redemptionVault, owner, mTBILL, mTokenToUsdDataFeed },
            stableCoins.dai,
            10,
            {
              from: regularAccounts[0],
            },
          );
        });

        it('redeem 100 mTBILL when other fn overload is paused', async () => {
          const {
            owner,
            redemptionVault,
            stableCoins,
            mTBILL,
            mTokenToUsdDataFeed,
            regularAccounts,
            dataFeed,
          } = await loadRvFixture();

          await pauseVaultFn(
            redemptionVault,
            encodeFnSelector('redeemInstant(address,uint256,uint256,address)'),
          );
          await mintToken(stableCoins.dai, redemptionVault, 100000);
          await mintToken(mTBILL, regularAccounts[0], 100);
          await approveBase18(regularAccounts[0], mTBILL, redemptionVault, 100);
          await addPaymentTokenTest(
            { vault: redemptionVault, owner },
            stableCoins.dai,
            dataFeed.address,
            0,
            true,
          );

          await redeemInstantTest(
            {
              redemptionVault,
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

      describe('setTokensReceiver()', () => {
        it('should fail: call from address without REDEMPTION_VAULT_ADMIN_ROLE role', async () => {
          const { owner, redemptionVault, regularAccounts } = await loadFixture(
            rvFixture,
          );

          await setTokensReceiverTest(
            { vault: redemptionVault, owner },
            regularAccounts[0].address,
            {
              from: regularAccounts[0],
              revertMessage: acErrors.WMAC_HASNT_PERMISSION,
            },
          );
        });

        it('should fail: call with zero address receiver', async () => {
          const { owner, redemptionVault } = await loadRvFixture();

          await setTokensReceiverTest(
            { vault: redemptionVault, owner },
            constants.AddressZero,
            {
              revertMessage: 'zero address',
            },
          );
        });

        it('should fail: call with address(this) receiver', async () => {
          const { owner, redemptionVault } = await loadRvFixture();

          await setTokensReceiverTest(
            { vault: redemptionVault, owner },
            redemptionVault.address,
            {
              revertMessage: 'invalid address',
            },
          );
        });

        it('call from address without REDEMPTION_VAULT_ADMIN_ROLE role', async () => {
          const { owner, redemptionVault, regularAccounts } = await loadFixture(
            rvFixture,
          );

          await setTokensReceiverTest(
            { vault: redemptionVault, owner },
            regularAccounts[0].address,
          );
        });

        it('should fail: when function is paused', async () => {
          const { owner, redemptionVault, regularAccounts } =
            await loadRvFixture();

          await pauseVaultFn(
            redemptionVault,
            encodeFnSelector('setTokensReceiver(address)'),
          );

          await setTokensReceiverTest(
            { vault: redemptionVault, owner },
            regularAccounts[0].address,
            { revertMessage: 'Pausable: fn paused' },
          );
        });

        it('succeeds with only scoped function permission', async () => {
          const { accessControl, owner, redemptionVault, regularAccounts } =
            await loadRvFixture();

          const vaultRole = await redemptionVault.vaultRole();
          await setupVaultScopedFunctionPermission(
            { accessControl, owner },
            vaultRole,
            redemptionVault.address,
            'setTokensReceiver(address)',
            regularAccounts[0].address,
          );

          expect(
            await accessControl.hasRole(vaultRole, regularAccounts[0].address),
          ).eq(false);

          await setTokensReceiverTest(
            { vault: redemptionVault, owner },
            regularAccounts[1].address,
            { from: regularAccounts[0] },
          );
        });

        it('succeeds with scoped permission and vault admin role', async () => {
          const {
            accessControl,
            owner,
            redemptionVault,
            regularAccounts,
            roles,
          } = await loadRvFixture();

          const vaultRole = await redemptionVault.vaultRole();
          await setupVaultScopedFunctionPermission(
            { accessControl, owner },
            vaultRole,
            redemptionVault.address,
            'setTokensReceiver(address)',
            regularAccounts[0].address,
          );

          await accessControl.grantRole(
            roles.tokenRoles.mTBILL.redemptionVaultAdmin,
            regularAccounts[0].address,
          );

          await setTokensReceiverTest(
            { vault: redemptionVault, owner },
            regularAccounts[2].address,
            { from: regularAccounts[0] },
          );
        });
      });

      describe('setMinAmount()', () => {
        it('should fail: call from address without DEPOSIT_VAULT_ADMIN_ROLE role', async () => {
          const { owner, redemptionVault, regularAccounts } = await loadFixture(
            rvFixture,
          );

          await setMinAmountTest({ vault: redemptionVault, owner }, 1.1, {
            from: regularAccounts[0],
            revertMessage: acErrors.WMAC_HASNT_PERMISSION,
          });
        });

        it('call from address with DEPOSIT_VAULT_ADMIN_ROLE role', async () => {
          const { owner, redemptionVault } = await loadRvFixture();
          await setMinAmountTest({ vault: redemptionVault, owner }, 1.1);
        });

        it('should fail: when function is paused', async () => {
          const { owner, redemptionVault } = await loadRvFixture();

          await pauseVaultFn(
            redemptionVault,
            encodeFnSelector('setMinAmount(uint256)'),
          );

          await setMinAmountTest({ vault: redemptionVault, owner }, 1.1, {
            revertMessage: 'Pausable: fn paused',
          });
        });

        it('succeeds with only scoped function permission', async () => {
          const { accessControl, owner, redemptionVault, regularAccounts } =
            await loadRvFixture();

          const vaultRole = await redemptionVault.vaultRole();
          await setupVaultScopedFunctionPermission(
            { accessControl, owner },
            vaultRole,
            redemptionVault.address,
            'setMinAmount(uint256)',
            regularAccounts[0].address,
          );

          expect(
            await accessControl.hasRole(vaultRole, regularAccounts[0].address),
          ).eq(false);

          await setMinAmountTest({ vault: redemptionVault, owner }, 200, {
            from: regularAccounts[0],
          });
        });

        it('succeeds with scoped permission and vault admin role', async () => {
          const {
            accessControl,
            owner,
            redemptionVault,
            regularAccounts,
            roles,
          } = await loadRvFixture();

          const vaultRole = await redemptionVault.vaultRole();
          await setupVaultScopedFunctionPermission(
            { accessControl, owner },
            vaultRole,
            redemptionVault.address,
            'setMinAmount(uint256)',
            regularAccounts[0].address,
          );

          await accessControl.grantRole(
            roles.tokenRoles.mTBILL.redemptionVaultAdmin,
            regularAccounts[0].address,
          );

          await setMinAmountTest({ vault: redemptionVault, owner }, 200, {
            from: regularAccounts[0],
          });
        });
      });

      describe('pauseFn()', () => {
        it('vault admin can pauseFn / unpauseFn other selectors while pauseFn(bytes4) is paused', async () => {
          const { redemptionVault } = await loadRvFixture();

          const pauseFnSelector = encodeFnSelector('pauseFn(bytes4)');
          const otherSelector = encodeFnSelector('setMinAmount(uint256)');

          await pauseVaultFn(redemptionVault, pauseFnSelector);
          expect(await redemptionVault.fnPaused(pauseFnSelector)).eq(true);

          await pauseVaultFn(redemptionVault, otherSelector);
          expect(await redemptionVault.fnPaused(otherSelector)).eq(true);

          await unpauseVaultFn(redemptionVault, otherSelector);
          expect(await redemptionVault.fnPaused(otherSelector)).eq(false);
        });
      });

      describe('setFeeReceiver()', () => {
        it('should fail: call from address without REDEMPTION_VAULT_ADMIN_ROLE role', async () => {
          const { owner, redemptionVault, regularAccounts } = await loadFixture(
            rvFixture,
          );

          await setFeeReceiverTest(
            { vault: redemptionVault, owner },
            regularAccounts[0].address,
            {
              from: regularAccounts[0],
              revertMessage: acErrors.WMAC_HASNT_PERMISSION,
            },
          );
        });

        it('call from address with REDEMPTION_VAULT_ADMIN_ROLE role', async () => {
          const { owner, redemptionVault, regularAccounts } = await loadFixture(
            rvFixture,
          );
          await setFeeReceiverTest(
            { vault: redemptionVault, owner },
            regularAccounts[0].address,
          );
        });

        it('should fail: when function is paused', async () => {
          const { owner, redemptionVault, regularAccounts } =
            await loadRvFixture();

          await pauseVaultFn(
            redemptionVault,
            encodeFnSelector('setFeeReceiver(address)'),
          );

          await setFeeReceiverTest(
            { vault: redemptionVault, owner },
            regularAccounts[0].address,
            { revertMessage: 'Pausable: fn paused' },
          );
        });

        it('succeeds with only scoped function permission', async () => {
          const { accessControl, owner, redemptionVault, regularAccounts } =
            await loadRvFixture();

          const vaultRole = await redemptionVault.vaultRole();
          await setupVaultScopedFunctionPermission(
            { accessControl, owner },
            vaultRole,
            redemptionVault.address,
            'setFeeReceiver(address)',
            regularAccounts[0].address,
          );

          expect(
            await accessControl.hasRole(vaultRole, regularAccounts[0].address),
          ).eq(false);

          await setFeeReceiverTest(
            { vault: redemptionVault, owner },
            regularAccounts[1].address,
            { from: regularAccounts[0] },
          );
        });

        it('succeeds with scoped permission and vault admin role', async () => {
          const {
            accessControl,
            owner,
            redemptionVault,
            regularAccounts,
            roles,
          } = await loadRvFixture();

          const vaultRole = await redemptionVault.vaultRole();
          await setupVaultScopedFunctionPermission(
            { accessControl, owner },
            vaultRole,
            redemptionVault.address,
            'setFeeReceiver(address)',
            regularAccounts[0].address,
          );

          await accessControl.grantRole(
            roles.tokenRoles.mTBILL.redemptionVaultAdmin,
            regularAccounts[0].address,
          );

          await setFeeReceiverTest(
            { vault: redemptionVault, owner },
            regularAccounts[2].address,
            { from: regularAccounts[0] },
          );
        });
      });

      describe('setGreenlistEnable()', () => {
        it('should fail: call from address without REDEMPTION_VAULT_ADMIN_ROLE role', async () => {
          const { owner, redemptionVault, regularAccounts } = await loadFixture(
            rvFixture,
          );

          await greenListEnable(
            { greenlistable: redemptionVault, owner },
            true,
            {
              from: regularAccounts[0],
              revertMessage: acErrors.WMAC_HASNT_PERMISSION,
            },
          );
        });

        it('call from address with REDEMPTION_VAULT_ADMIN_ROLE role', async () => {
          const { owner, redemptionVault } = await loadRvFixture();

          await greenListEnable(
            { greenlistable: redemptionVault, owner },
            true,
          );
        });

        it('should fail: when function is paused', async () => {
          const { owner, redemptionVault } = await loadRvFixture();

          await pauseVaultFn(
            redemptionVault,
            encodeFnSelector('setGreenlistEnable(bool)'),
          );

          await greenListEnable(
            { greenlistable: redemptionVault, owner },
            true,
            {
              revertMessage: 'Pausable: fn paused',
            },
          );
        });

        it('succeeds with only scoped function permission', async () => {
          const { accessControl, owner, redemptionVault, regularAccounts } =
            await loadRvFixture();

          const vaultRole = await redemptionVault.vaultRole();
          await setupVaultScopedFunctionPermission(
            { accessControl, owner },
            vaultRole,
            redemptionVault.address,
            'setGreenlistEnable(bool)',
            regularAccounts[0].address,
          );

          expect(
            await accessControl.hasRole(vaultRole, regularAccounts[0].address),
          ).eq(false);

          await greenListEnable(
            { greenlistable: redemptionVault, owner },
            true,
            { from: regularAccounts[0] },
          );
        });

        it('succeeds with scoped permission and vault admin role', async () => {
          const {
            accessControl,
            owner,
            redemptionVault,
            regularAccounts,
            roles,
          } = await loadRvFixture();

          const vaultRole = await redemptionVault.vaultRole();
          await setupVaultScopedFunctionPermission(
            { accessControl, owner },
            vaultRole,
            redemptionVault.address,
            'setGreenlistEnable(bool)',
            regularAccounts[0].address,
          );

          await accessControl.grantRole(
            roles.tokenRoles.mTBILL.redemptionVaultAdmin,
            regularAccounts[0].address,
          );

          await greenListEnable(
            { greenlistable: redemptionVault, owner },
            true,
            { from: regularAccounts[0] },
          );
        });
      });

      describe('setInstantLimitConfigTest()', () => {
        it('should fail: call from address without REDEMPTION_VAULT_ADMIN_ROLE role', async () => {
          const { owner, redemptionVault, regularAccounts } = await loadFixture(
            rvFixture,
          );

          await setInstantLimitConfigTest(
            { vault: redemptionVault, owner },
            parseUnits('1000'),
            {
              from: regularAccounts[0],
              revertMessage: acErrors.WMAC_HASNT_PERMISSION,
            },
          );
        });

        it('shouldnt fail when set 0 limit', async () => {
          const { owner, redemptionVault } = await loadRvFixture();

          await setInstantLimitConfigTest(
            { vault: redemptionVault, owner },
            constants.Zero,
          );
        });

        it('call from address with REDEMPTION_VAULT_ADMIN_ROLE role', async () => {
          const { owner, redemptionVault } = await loadRvFixture();
          await setInstantLimitConfigTest(
            { vault: redemptionVault, owner },
            parseUnits('1000'),
          );
        });

        it('should fail: when function is paused', async () => {
          const { owner, redemptionVault } = await loadRvFixture();

          await pauseVaultFn(
            redemptionVault,
            encodeFnSelector('setInstantLimitConfig(uint256,uint256)'),
          );

          await setInstantLimitConfigTest(
            { vault: redemptionVault, owner },
            parseUnits('1000'),
            { revertMessage: 'Pausable: fn paused' },
          );
        });

        it('call with custom window duration', async () => {
          const { owner, redemptionVault } = await loadRvFixture();

          await setInstantLimitConfigTest(
            { vault: redemptionVault, owner },
            { window: days(2), limit: parseUnits('500') },
          );
        });

        it('updates limit for an existing window and preserves limitUsed and lastEpoch', async () => {
          const { owner, redemptionVault } = await loadRvFixture();

          await setInstantLimitConfigTest(
            { vault: redemptionVault, owner },
            { window: days(1), limit: parseUnits('1000') },
          );
          await setInstantLimitConfigTest(
            { vault: redemptionVault, owner },
            { window: days(1), limit: parseUnits('2000') },
          );
        });

        it('succeeds with only scoped function permission', async () => {
          const { accessControl, owner, redemptionVault, regularAccounts } =
            await loadRvFixture();

          const vaultRole = await redemptionVault.vaultRole();
          await setupVaultScopedFunctionPermission(
            { accessControl, owner },
            vaultRole,
            redemptionVault.address,
            'setInstantLimitConfig(uint256,uint256)',
            regularAccounts[0].address,
          );

          expect(
            await accessControl.hasRole(vaultRole, regularAccounts[0].address),
          ).eq(false);

          await setInstantLimitConfigTest(
            { vault: redemptionVault, owner },
            parseUnits('1000'),
            { from: regularAccounts[0] },
          );
        });

        it('succeeds with scoped permission and vault admin role', async () => {
          const {
            accessControl,
            owner,
            redemptionVault,
            regularAccounts,
            roles,
          } = await loadRvFixture();

          const vaultRole = await redemptionVault.vaultRole();
          await setupVaultScopedFunctionPermission(
            { accessControl, owner },
            vaultRole,
            redemptionVault.address,
            'setInstantLimitConfig(uint256,uint256)',
            regularAccounts[0].address,
          );

          await accessControl.grantRole(
            roles.tokenRoles.mTBILL.redemptionVaultAdmin,
            regularAccounts[0].address,
          );

          await setInstantLimitConfigTest(
            { vault: redemptionVault, owner },
            parseUnits('1000'),
            { from: regularAccounts[0] },
          );
        });
      });

      describe('removeInstantLimitConfigTest()', () => {
        it('should fail: call from address without REDEMPTION_VAULT_ADMIN_ROLE role', async () => {
          const { owner, redemptionVault, regularAccounts } = await loadFixture(
            rvFixture,
          );

          await setInstantLimitConfigTest(
            { vault: redemptionVault, owner },
            parseUnits('1000'),
          );

          await removeInstantLimitConfigTest(
            { vault: redemptionVault, owner },
            days(1),
            {
              from: regularAccounts[0],
              revertMessage: acErrors.WMAC_HASNT_PERMISSION,
            },
          );
        });

        it('should fail: window not found', async () => {
          const { owner, redemptionVault } = await loadRvFixture();

          await removeInstantLimitConfigTest(
            { vault: redemptionVault, owner },
            days(7),
            { revertMessage: 'MV: window not found' },
          );
        });

        it('should fail: when function is paused', async () => {
          const { owner, redemptionVault } = await loadRvFixture();

          await setInstantLimitConfigTest(
            { vault: redemptionVault, owner },
            parseUnits('1000'),
          );

          await pauseVaultFn(
            redemptionVault,
            encodeFnSelector('removeInstantLimitConfig(uint256)'),
          );

          await removeInstantLimitConfigTest(
            { vault: redemptionVault, owner },
            days(1),
            { revertMessage: 'Pausable: fn paused' },
          );
        });

        it('succeeds with only scoped function permission', async () => {
          const { accessControl, owner, redemptionVault, regularAccounts } =
            await loadRvFixture();

          await setInstantLimitConfigTest(
            { vault: redemptionVault, owner },
            parseUnits('1000'),
          );

          const vaultRole = await redemptionVault.vaultRole();
          await setupVaultScopedFunctionPermission(
            { accessControl, owner },
            vaultRole,
            redemptionVault.address,
            'removeInstantLimitConfig(uint256)',
            regularAccounts[0].address,
          );

          expect(
            await accessControl.hasRole(vaultRole, regularAccounts[0].address),
          ).eq(false);

          await removeInstantLimitConfigTest(
            { vault: redemptionVault, owner },
            days(1),
            { from: regularAccounts[0] },
          );
        });

        it('succeeds with scoped permission and vault admin role', async () => {
          const {
            accessControl,
            owner,
            redemptionVault,
            regularAccounts,
            roles,
          } = await loadRvFixture();

          await setInstantLimitConfigTest(
            { vault: redemptionVault, owner },
            parseUnits('1000'),
          );

          const vaultRole = await redemptionVault.vaultRole();
          await setupVaultScopedFunctionPermission(
            { accessControl, owner },
            vaultRole,
            redemptionVault.address,
            'removeInstantLimitConfig(uint256)',
            regularAccounts[0].address,
          );

          await accessControl.grantRole(
            roles.tokenRoles.mTBILL.redemptionVaultAdmin,
            regularAccounts[0].address,
          );

          await removeInstantLimitConfigTest(
            { vault: redemptionVault, owner },
            days(1),
            { from: regularAccounts[0] },
          );
        });

        it('call from address with REDEMPTION_VAULT_ADMIN_ROLE role', async () => {
          const { owner, redemptionVault } = await loadRvFixture();

          await setInstantLimitConfigTest(
            { vault: redemptionVault, owner },
            parseUnits('1000'),
          );

          await removeInstantLimitConfigTest(
            { vault: redemptionVault, owner },
            days(1),
          );
        });

        it('removes one window while another remains', async () => {
          const { owner, redemptionVault } = await loadRvFixture();

          await setInstantLimitConfigTest(
            { vault: redemptionVault, owner },
            { window: days(1), limit: parseUnits('1000') },
          );
          await setInstantLimitConfigTest(
            { vault: redemptionVault, owner },
            { window: days(2), limit: parseUnits('2000') },
          );

          await removeInstantLimitConfigTest(
            { vault: redemptionVault, owner },
            days(1),
          );

          const { windows, configs } = await redemptionVault.getLimitConfigs();
          expect(windows.length).eq(1);
          expect(windows[0]).eq(days(2));
          expect(configs[0].limit).eq(parseUnits('2000'));
        });

        it('should fail: removing the same window twice', async () => {
          const { owner, redemptionVault } = await loadRvFixture();

          await setInstantLimitConfigTest(
            { vault: redemptionVault, owner },
            parseUnits('1000'),
          );
          await removeInstantLimitConfigTest(
            { vault: redemptionVault, owner },
            days(1),
          );

          await removeInstantLimitConfigTest(
            { vault: redemptionVault, owner },
            days(1),
            { revertMessage: 'MV: window not found' },
          );
        });
      });

      describe('addPaymentToken()', () => {
        it('should fail: call from address without REDEMPTION_VAULT_ADMIN_ROLE role', async () => {
          const { redemptionVault, regularAccounts, owner } = await loadFixture(
            rvFixture,
          );
          await addPaymentTokenTest(
            { vault: redemptionVault, owner },
            ethers.constants.AddressZero,
            ethers.constants.AddressZero,
            0,
            true,
            constants.MaxUint256,
            {
              revertMessage: acErrors.WMAC_HASNT_PERMISSION,
              from: regularAccounts[0],
            },
          );
        });

        it('should fail: when token is already added', async () => {
          const { redemptionVault, stableCoins, owner, dataFeed } =
            await loadRvFixture();
          await addPaymentTokenTest(
            { vault: redemptionVault, owner },
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
            constants.MaxUint256,
            {
              revertMessage: 'MV: already added',
            },
          );
        });

        it('should fail: when token dataFeed address zero', async () => {
          const { redemptionVault, stableCoins, owner } = await loadFixture(
            rvFixture,
          );
          await addPaymentTokenTest(
            { vault: redemptionVault, owner },
            stableCoins.dai,
            constants.AddressZero,
            0,
            true,
            constants.MaxUint256,
            {
              revertMessage: 'zero address',
            },
          );
        });

        it('call when allowance is zero', async () => {
          const { redemptionVault, stableCoins, owner, dataFeed } =
            await loadRvFixture();
          await addPaymentTokenTest(
            { vault: redemptionVault, owner },
            stableCoins.dai,
            dataFeed.address,
            0,
            false,
            constants.Zero,
          );
        });

        it('call when allowance is not uint256 max', async () => {
          const { redemptionVault, stableCoins, owner, dataFeed } =
            await loadRvFixture();
          await addPaymentTokenTest(
            { vault: redemptionVault, owner },
            stableCoins.dai,
            dataFeed.address,
            0,
            false,
            parseUnits('100'),
          );
        });

        it('call from address with REDEMPTION_VAULT_ADMIN_ROLE role', async () => {
          const { redemptionVault, stableCoins, owner, dataFeed } =
            await loadRvFixture();
          await addPaymentTokenTest(
            { vault: redemptionVault, owner },
            stableCoins.dai,
            dataFeed.address,
            0,
            true,
          );
        });

        it('call from address with REDEMPTION_VAULT_ADMIN_ROLE role and add 3 options on a row', async () => {
          const { redemptionVault, stableCoins, owner, dataFeed } =
            await loadRvFixture();

          await addPaymentTokenTest(
            { vault: redemptionVault, owner },
            stableCoins.dai,
            dataFeed.address,
            0,
            true,
          );
          await addPaymentTokenTest(
            { vault: redemptionVault, owner },
            stableCoins.usdc,
            dataFeed.address,
            0,
            true,
          );
          await addPaymentTokenTest(
            { vault: redemptionVault, owner },
            stableCoins.usdt,
            dataFeed.address,
            0,
            true,
          );
        });

        it('should fail: when function is paused', async () => {
          const { redemptionVault, stableCoins, owner, dataFeed } =
            await loadRvFixture();

          await pauseVaultFn(
            redemptionVault,
            encodeFnSelector(
              'addPaymentToken(address,address,uint256,uint256,bool)',
            ),
          );

          await addPaymentTokenTest(
            { vault: redemptionVault, owner },
            stableCoins.dai,
            dataFeed.address,
            0,
            true,
            constants.MaxUint256,
            { revertMessage: 'Pausable: fn paused' },
          );
        });

        it('succeeds with only scoped function permission', async () => {
          const {
            accessControl,
            owner,
            redemptionVault,
            regularAccounts,
            stableCoins,
            dataFeed,
          } = await loadRvFixture();

          const vaultRole = await redemptionVault.vaultRole();
          await setupVaultScopedFunctionPermission(
            { accessControl, owner },
            vaultRole,
            redemptionVault.address,
            'addPaymentToken(address,address,uint256,uint256,bool)',
            regularAccounts[0].address,
          );

          expect(
            await accessControl.hasRole(vaultRole, regularAccounts[0].address),
          ).eq(false);

          await addPaymentTokenTest(
            { vault: redemptionVault, owner },
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
            redemptionVault,
            regularAccounts,
            roles,
            stableCoins,
            dataFeed,
          } = await loadRvFixture();

          const vaultRole = await redemptionVault.vaultRole();
          await setupVaultScopedFunctionPermission(
            { accessControl, owner },
            vaultRole,
            redemptionVault.address,
            'addPaymentToken(address,address,uint256,uint256,bool)',
            regularAccounts[0].address,
          );

          await accessControl.grantRole(
            roles.tokenRoles.mTBILL.redemptionVaultAdmin,
            regularAccounts[0].address,
          );

          await addPaymentTokenTest(
            { vault: redemptionVault, owner },
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
        it('should fail: call from address without REDEMPTION_VAULT_ADMIN_ROLE role', async () => {
          const { redemptionVault, regularAccounts, owner } = await loadFixture(
            rvFixture,
          );
          await addWaivedFeeAccountTest(
            { vault: redemptionVault, owner },
            ethers.constants.AddressZero,
            {
              revertMessage: acErrors.WMAC_HASNT_PERMISSION,
              from: regularAccounts[0],
            },
          );
        });
        it('should fail: if account fee already waived', async () => {
          const { redemptionVault, owner } = await loadRvFixture();
          await addWaivedFeeAccountTest(
            { vault: redemptionVault, owner },
            owner.address,
          );
          await addWaivedFeeAccountTest(
            { vault: redemptionVault, owner },
            owner.address,
            { revertMessage: 'MV: already added' },
          );
        });

        it('call from address with REDEMPTION_VAULT_ADMIN_ROLE role', async () => {
          const { redemptionVault, owner } = await loadRvFixture();
          await addWaivedFeeAccountTest(
            { vault: redemptionVault, owner },
            owner.address,
          );
        });

        it('should fail: when function is paused', async () => {
          const { redemptionVault, owner } = await loadRvFixture();

          await pauseVaultFn(
            redemptionVault,
            encodeFnSelector('addWaivedFeeAccount(address)'),
          );

          await addWaivedFeeAccountTest(
            { vault: redemptionVault, owner },
            owner.address,
            { revertMessage: 'Pausable: fn paused' },
          );
        });

        it('succeeds with only scoped function permission', async () => {
          const { accessControl, owner, redemptionVault, regularAccounts } =
            await loadRvFixture();

          const vaultRole = await redemptionVault.vaultRole();
          await setupVaultScopedFunctionPermission(
            { accessControl, owner },
            vaultRole,
            redemptionVault.address,
            'addWaivedFeeAccount(address)',
            regularAccounts[0].address,
          );

          expect(
            await accessControl.hasRole(vaultRole, regularAccounts[0].address),
          ).eq(false);

          await addWaivedFeeAccountTest(
            { vault: redemptionVault, owner },
            regularAccounts[1].address,
            { from: regularAccounts[0] },
          );
        });

        it('succeeds with scoped permission and vault admin role', async () => {
          const {
            accessControl,
            owner,
            redemptionVault,
            regularAccounts,
            roles,
          } = await loadRvFixture();

          const vaultRole = await redemptionVault.vaultRole();
          await setupVaultScopedFunctionPermission(
            { accessControl, owner },
            vaultRole,
            redemptionVault.address,
            'addWaivedFeeAccount(address)',
            regularAccounts[0].address,
          );

          await accessControl.grantRole(
            roles.tokenRoles.mTBILL.redemptionVaultAdmin,
            regularAccounts[0].address,
          );

          await addWaivedFeeAccountTest(
            { vault: redemptionVault, owner },
            regularAccounts[2].address,
            { from: regularAccounts[0] },
          );
        });
      });

      describe('removeWaivedFeeAccount()', () => {
        it('should fail: call from address without REDEMPTION_VAULT_ADMIN_ROLE role', async () => {
          const { redemptionVault, regularAccounts, owner } = await loadFixture(
            rvFixture,
          );
          await removeWaivedFeeAccountTest(
            { vault: redemptionVault, owner },
            ethers.constants.AddressZero,
            {
              revertMessage: acErrors.WMAC_HASNT_PERMISSION,
              from: regularAccounts[0],
            },
          );
        });
        it('should fail: if account not found in restriction', async () => {
          const { redemptionVault, owner } = await loadRvFixture();
          await removeWaivedFeeAccountTest(
            { vault: redemptionVault, owner },
            owner.address,
            { revertMessage: 'MV: not found' },
          );
        });

        it('call from address with REDEMPTION_VAULT_ADMIN_ROLE role', async () => {
          const { redemptionVault, owner } = await loadRvFixture();
          await addWaivedFeeAccountTest(
            { vault: redemptionVault, owner },
            owner.address,
          );
          await removeWaivedFeeAccountTest(
            { vault: redemptionVault, owner },
            owner.address,
          );
        });

        it('should fail: when function is paused', async () => {
          const { redemptionVault, owner } = await loadRvFixture();

          await addWaivedFeeAccountTest(
            { vault: redemptionVault, owner },
            owner.address,
          );

          await pauseVaultFn(
            redemptionVault,
            encodeFnSelector('removeWaivedFeeAccount(address)'),
          );

          await removeWaivedFeeAccountTest(
            { vault: redemptionVault, owner },
            owner.address,
            { revertMessage: 'Pausable: fn paused' },
          );
        });

        it('succeeds with only scoped function permission', async () => {
          const { accessControl, owner, redemptionVault, regularAccounts } =
            await loadRvFixture();

          await addWaivedFeeAccountTest(
            { vault: redemptionVault, owner },
            regularAccounts[1].address,
          );

          const vaultRole = await redemptionVault.vaultRole();
          await setupVaultScopedFunctionPermission(
            { accessControl, owner },
            vaultRole,
            redemptionVault.address,
            'removeWaivedFeeAccount(address)',
            regularAccounts[0].address,
          );

          expect(
            await accessControl.hasRole(vaultRole, regularAccounts[0].address),
          ).eq(false);

          await removeWaivedFeeAccountTest(
            { vault: redemptionVault, owner },
            regularAccounts[1].address,
            { from: regularAccounts[0] },
          );
        });

        it('succeeds with scoped permission and vault admin role', async () => {
          const {
            accessControl,
            owner,
            redemptionVault,
            regularAccounts,
            roles,
          } = await loadRvFixture();

          await addWaivedFeeAccountTest(
            { vault: redemptionVault, owner },
            regularAccounts[2].address,
          );

          const vaultRole = await redemptionVault.vaultRole();
          await setupVaultScopedFunctionPermission(
            { accessControl, owner },
            vaultRole,
            redemptionVault.address,
            'removeWaivedFeeAccount(address)',
            regularAccounts[0].address,
          );

          await accessControl.grantRole(
            roles.tokenRoles.mTBILL.redemptionVaultAdmin,
            regularAccounts[0].address,
          );

          await removeWaivedFeeAccountTest(
            { vault: redemptionVault, owner },
            regularAccounts[2].address,
            { from: regularAccounts[0] },
          );
        });
      });

      describe('setFee()', () => {
        it('should fail: call from address without REDEMPTION_VAULT_ADMIN_ROLE role', async () => {
          const { redemptionVault, regularAccounts, owner } = await loadFixture(
            rvFixture,
          );
          await setInstantFeeTest(
            { vault: redemptionVault, owner },
            ethers.constants.Zero,
            {
              revertMessage: acErrors.WMAC_HASNT_PERMISSION,
              from: regularAccounts[0],
            },
          );
        });

        it('should fail: if new value greater then 100%', async () => {
          const { redemptionVault, owner } = await loadRvFixture();
          await setInstantFeeTest({ vault: redemptionVault, owner }, 10001, {
            revertMessage: 'fee > 100%',
          });
        });

        it('call from address with REDEMPTION_VAULT_ADMIN_ROLE role', async () => {
          const { redemptionVault, owner } = await loadRvFixture();
          await setInstantFeeTest({ vault: redemptionVault, owner }, 100);
        });

        it('should fail: when function is paused', async () => {
          const { redemptionVault, owner } = await loadRvFixture();

          await pauseVaultFn(
            redemptionVault,
            encodeFnSelector('setInstantFee(uint256)'),
          );

          await setInstantFeeTest({ vault: redemptionVault, owner }, 100, {
            revertMessage: 'Pausable: fn paused',
          });
        });

        it('succeeds with only scoped function permission', async () => {
          const { accessControl, owner, redemptionVault, regularAccounts } =
            await loadRvFixture();

          const vaultRole = await redemptionVault.vaultRole();
          await setupVaultScopedFunctionPermission(
            { accessControl, owner },
            vaultRole,
            redemptionVault.address,
            'setInstantFee(uint256)',
            regularAccounts[0].address,
          );

          expect(
            await accessControl.hasRole(vaultRole, regularAccounts[0].address),
          ).eq(false);

          await setInstantFeeTest({ vault: redemptionVault, owner }, 100, {
            from: regularAccounts[0],
          });
        });

        it('succeeds with scoped permission and vault admin role', async () => {
          const {
            accessControl,
            owner,
            redemptionVault,
            regularAccounts,
            roles,
          } = await loadRvFixture();

          const vaultRole = await redemptionVault.vaultRole();
          await setupVaultScopedFunctionPermission(
            { accessControl, owner },
            vaultRole,
            redemptionVault.address,
            'setInstantFee(uint256)',
            regularAccounts[0].address,
          );

          await accessControl.grantRole(
            roles.tokenRoles.mTBILL.redemptionVaultAdmin,
            regularAccounts[0].address,
          );

          await setInstantFeeTest({ vault: redemptionVault, owner }, 100, {
            from: regularAccounts[0],
          });
        });
      });

      describe('setMinMaxInstantFee()', () => {
        it('should fail: call from address without REDEMPTION_VAULT_ADMIN_ROLE role', async () => {
          const { redemptionVault, regularAccounts, owner } = await loadFixture(
            rvFixture,
          );
          await setMinMaxInstantFeeTest(
            { vault: redemptionVault, owner },
            0,
            1000,
            {
              revertMessage: acErrors.WMAC_HASNT_PERMISSION,
              from: regularAccounts[0],
            },
          );
        });

        it('should fail: if min greater than max', async () => {
          const { redemptionVault, owner } = await loadRvFixture();
          await setMinMaxInstantFeeTest(
            { vault: redemptionVault, owner },
            500,
            100,
            { revertMessage: 'MV: invalid min/max fee' },
          );
        });

        it('should fail: if fee greater than 100%', async () => {
          const { redemptionVault, owner } = await loadRvFixture();
          await setMinMaxInstantFeeTest(
            { vault: redemptionVault, owner },
            10001,
            10001,
            { revertMessage: 'fee > 100%' },
          );
        });

        it('call from address with REDEMPTION_VAULT_ADMIN_ROLE role', async () => {
          const { redemptionVault, owner } = await loadRvFixture();
          await setMinMaxInstantFeeTest(
            { vault: redemptionVault, owner },
            10,
            5000,
          );
        });

        it('should fail: when function is paused', async () => {
          const { redemptionVault, owner } = await loadRvFixture();

          await pauseVaultFn(
            redemptionVault,
            encodeFnSelector('setMinMaxInstantFee(uint64,uint64)'),
          );

          await setMinMaxInstantFeeTest(
            { vault: redemptionVault, owner },
            0,
            1000,
            { revertMessage: 'Pausable: fn paused' },
          );
        });

        it('succeeds with only scoped function permission', async () => {
          const { accessControl, owner, redemptionVault, regularAccounts } =
            await loadRvFixture();

          const vaultRole = await redemptionVault.vaultRole();
          await setupVaultScopedFunctionPermission(
            { accessControl, owner },
            vaultRole,
            redemptionVault.address,
            'setMinMaxInstantFee(uint64,uint64)',
            regularAccounts[0].address,
          );

          expect(
            await accessControl.hasRole(vaultRole, regularAccounts[0].address),
          ).eq(false);

          await setMinMaxInstantFeeTest(
            { vault: redemptionVault, owner },
            10,
            5000,
            { from: regularAccounts[0] },
          );
        });

        it('succeeds with scoped permission and vault admin role', async () => {
          const {
            accessControl,
            owner,
            redemptionVault,
            regularAccounts,
            roles,
          } = await loadRvFixture();

          const vaultRole = await redemptionVault.vaultRole();
          await setupVaultScopedFunctionPermission(
            { accessControl, owner },
            vaultRole,
            redemptionVault.address,
            'setMinMaxInstantFee(uint64,uint64)',
            regularAccounts[0].address,
          );

          await accessControl.grantRole(
            roles.tokenRoles.mTBILL.redemptionVaultAdmin,
            regularAccounts[0].address,
          );

          await setMinMaxInstantFeeTest(
            { vault: redemptionVault, owner },
            10,
            5000,
            { from: regularAccounts[0] },
          );
        });
      });

      describe('setVariabilityTolerance()', () => {
        it('should fail: call from address without REDEMPTION_VAULT_ADMIN_ROLE role', async () => {
          const { redemptionVault, regularAccounts, owner } = await loadFixture(
            rvFixture,
          );
          await setVariabilityToleranceTest(
            { vault: redemptionVault, owner },
            ethers.constants.Zero,
            {
              revertMessage: acErrors.WMAC_HASNT_PERMISSION,
              from: regularAccounts[0],
            },
          );
        });
        it('should fail: if new value zero', async () => {
          const { redemptionVault, owner } = await loadRvFixture();
          await setVariabilityToleranceTest(
            { vault: redemptionVault, owner },
            ethers.constants.Zero,
            { revertMessage: 'fee == 0' },
          );
        });

        it('should fail: if new value greater then 100%', async () => {
          const { redemptionVault, owner } = await loadRvFixture();
          await setVariabilityToleranceTest(
            { vault: redemptionVault, owner },
            10001,
            { revertMessage: 'fee > 100%' },
          );
        });

        it('call from address with REDEMPTION_VAULT_ADMIN_ROLE role', async () => {
          const { redemptionVault, owner } = await loadRvFixture();
          await setVariabilityToleranceTest(
            { vault: redemptionVault, owner },
            100,
          );
        });

        it('should fail: when function is paused', async () => {
          const { redemptionVault, owner } = await loadRvFixture();

          await pauseVaultFn(
            redemptionVault,
            encodeFnSelector('setVariationTolerance(uint256)'),
          );

          await setVariabilityToleranceTest(
            { vault: redemptionVault, owner },
            100,
            { revertMessage: 'Pausable: fn paused' },
          );
        });

        it('succeeds with only scoped function permission', async () => {
          const { accessControl, owner, redemptionVault, regularAccounts } =
            await loadRvFixture();

          const vaultRole = await redemptionVault.vaultRole();
          await setupVaultScopedFunctionPermission(
            { accessControl, owner },
            vaultRole,
            redemptionVault.address,
            'setVariationTolerance(uint256)',
            regularAccounts[0].address,
          );

          expect(
            await accessControl.hasRole(vaultRole, regularAccounts[0].address),
          ).eq(false);

          await setVariabilityToleranceTest(
            { vault: redemptionVault, owner },
            100,
            { from: regularAccounts[0] },
          );
        });

        it('succeeds with scoped permission and vault admin role', async () => {
          const {
            accessControl,
            owner,
            redemptionVault,
            regularAccounts,
            roles,
          } = await loadRvFixture();

          const vaultRole = await redemptionVault.vaultRole();
          await setupVaultScopedFunctionPermission(
            { accessControl, owner },
            vaultRole,
            redemptionVault.address,
            'setVariationTolerance(uint256)',
            regularAccounts[0].address,
          );

          await accessControl.grantRole(
            roles.tokenRoles.mTBILL.redemptionVaultAdmin,
            regularAccounts[0].address,
          );

          await setVariabilityToleranceTest(
            { vault: redemptionVault, owner },
            100,
            { from: regularAccounts[0] },
          );
        });
      });

      describe('setRequestRedeemer()', () => {
        it('should fail: call from address without REDEMPTION_VAULT_ADMIN_ROLE role', async () => {
          const { redemptionVault, regularAccounts, owner } = await loadFixture(
            rvFixture,
          );
          await setRequestRedeemerTest(
            { redemptionVault, owner },
            ethers.constants.AddressZero,
            {
              revertMessage: acErrors.WMAC_HASNT_PERMISSION,
              from: regularAccounts[0],
            },
          );
        });
        it('should fail: if redeemer address zero', async () => {
          const { redemptionVault, owner } = await loadRvFixture();
          await setRequestRedeemerTest(
            { redemptionVault, owner },
            ethers.constants.AddressZero,
            { revertMessage: 'zero address' },
          );
        });

        it('call from address with REDEMPTION_VAULT_ADMIN_ROLE role', async () => {
          const { redemptionVault, owner } = await loadRvFixture();
          await setRequestRedeemerTest(
            { redemptionVault, owner },
            owner.address,
          );
        });

        it('should fail: when function is paused', async () => {
          const { redemptionVault, owner } = await loadRvFixture();

          await pauseVaultFn(
            redemptionVault,
            encodeFnSelector('setRequestRedeemer(address)'),
          );

          await setRequestRedeemerTest(
            { redemptionVault, owner },
            owner.address,
            { revertMessage: 'Pausable: fn paused' },
          );
        });

        it('succeeds with only scoped function permission', async () => {
          const { accessControl, owner, redemptionVault, regularAccounts } =
            await loadRvFixture();

          const vaultRole = await redemptionVault.vaultRole();
          await setupVaultScopedFunctionPermission(
            { accessControl, owner },
            vaultRole,
            redemptionVault.address,
            'setRequestRedeemer(address)',
            regularAccounts[0].address,
          );

          expect(
            await accessControl.hasRole(vaultRole, regularAccounts[0].address),
          ).eq(false);

          await setRequestRedeemerTest(
            { redemptionVault, owner },
            regularAccounts[1].address,
            { from: regularAccounts[0] },
          );
        });

        it('succeeds with scoped permission and vault admin role', async () => {
          const {
            accessControl,
            owner,
            redemptionVault,
            regularAccounts,
            roles,
          } = await loadRvFixture();

          const vaultRole = await redemptionVault.vaultRole();
          await setupVaultScopedFunctionPermission(
            { accessControl, owner },
            vaultRole,
            redemptionVault.address,
            'setRequestRedeemer(address)',
            regularAccounts[0].address,
          );

          await accessControl.grantRole(
            roles.tokenRoles.mTBILL.redemptionVaultAdmin,
            regularAccounts[0].address,
          );

          await setRequestRedeemerTest(
            { redemptionVault, owner },
            regularAccounts[2].address,
            { from: regularAccounts[0] },
          );
        });
      });

      describe('setLoanLp()', () => {
        it('should fail: call from address without REDEMPTION_VAULT_ADMIN_ROLE role', async () => {
          const { redemptionVault, regularAccounts, owner } = await loadFixture(
            rvFixture,
          );
          await setLoanLpTest(
            { redemptionVault, owner },
            ethers.constants.AddressZero,
            {
              revertMessage: acErrors.WMAC_HASNT_PERMISSION,
              from: regularAccounts[0],
            },
          );
        });
        it('if new loanLp address zero', async () => {
          const { redemptionVault, owner } = await loadRvFixture();
          await setLoanLpTest(
            { redemptionVault, owner },
            ethers.constants.AddressZero,
          );
        });

        it('call from address with REDEMPTION_VAULT_ADMIN_ROLE role', async () => {
          const { redemptionVault, owner } = await loadRvFixture();
          await setLoanLpTest({ redemptionVault, owner }, owner.address);
        });

        it('should fail: when function is paused', async () => {
          const { redemptionVault, owner } = await loadRvFixture();

          await pauseVaultFn(
            redemptionVault,
            encodeFnSelector('setLoanLp(address)'),
          );

          await setLoanLpTest({ redemptionVault, owner }, owner.address, {
            revertMessage: 'Pausable: fn paused',
          });
        });

        it('succeeds with only scoped function permission', async () => {
          const { accessControl, owner, redemptionVault, regularAccounts } =
            await loadRvFixture();

          const vaultRole = await redemptionVault.vaultRole();
          await setupVaultScopedFunctionPermission(
            { accessControl, owner },
            vaultRole,
            redemptionVault.address,
            'setLoanLp(address)',
            regularAccounts[0].address,
          );

          expect(
            await accessControl.hasRole(vaultRole, regularAccounts[0].address),
          ).eq(false);

          await setLoanLpTest(
            { redemptionVault, owner },
            regularAccounts[1].address,
            { from: regularAccounts[0] },
          );
        });

        it('succeeds with scoped permission and vault admin role', async () => {
          const {
            accessControl,
            owner,
            redemptionVault,
            regularAccounts,
            roles,
          } = await loadRvFixture();

          const vaultRole = await redemptionVault.vaultRole();
          await setupVaultScopedFunctionPermission(
            { accessControl, owner },
            vaultRole,
            redemptionVault.address,
            'setLoanLp(address)',
            regularAccounts[0].address,
          );

          await accessControl.grantRole(
            roles.tokenRoles.mTBILL.redemptionVaultAdmin,
            regularAccounts[0].address,
          );

          await setLoanLpTest(
            { redemptionVault, owner },
            regularAccounts[2].address,
            { from: regularAccounts[0] },
          );
        });
      });

      describe('setLoanLpFeeReceiver()', () => {
        it('should fail: call from address without REDEMPTION_VAULT_ADMIN_ROLE role', async () => {
          const { redemptionVault, regularAccounts, owner } = await loadFixture(
            rvFixture,
          );
          await setLoanLpFeeReceiverTest(
            { redemptionVault, owner },
            ethers.constants.AddressZero,
            {
              revertMessage: acErrors.WMAC_HASNT_PERMISSION,
              from: regularAccounts[0],
            },
          );
        });
        it('if new loanLpFeeReceiver address zero', async () => {
          const { redemptionVault, owner } = await loadRvFixture();
          await setLoanLpFeeReceiverTest(
            { redemptionVault, owner },
            ethers.constants.AddressZero,
          );
        });

        it('call from address with REDEMPTION_VAULT_ADMIN_ROLE role', async () => {
          const { redemptionVault, owner } = await loadRvFixture();
          await setLoanLpFeeReceiverTest(
            { redemptionVault, owner },
            owner.address,
          );
        });

        it('should fail: when function is paused', async () => {
          const { redemptionVault, owner } = await loadRvFixture();

          await pauseVaultFn(
            redemptionVault,
            encodeFnSelector('setLoanLpFeeReceiver(address)'),
          );

          await setLoanLpFeeReceiverTest(
            { redemptionVault, owner },
            owner.address,
            { revertMessage: 'Pausable: fn paused' },
          );
        });

        it('succeeds with only scoped function permission', async () => {
          const { accessControl, owner, redemptionVault, regularAccounts } =
            await loadRvFixture();

          const vaultRole = await redemptionVault.vaultRole();
          await setupVaultScopedFunctionPermission(
            { accessControl, owner },
            vaultRole,
            redemptionVault.address,
            'setLoanLpFeeReceiver(address)',
            regularAccounts[0].address,
          );

          expect(
            await accessControl.hasRole(vaultRole, regularAccounts[0].address),
          ).eq(false);

          await setLoanLpFeeReceiverTest(
            { redemptionVault, owner },
            regularAccounts[1].address,
            { from: regularAccounts[0] },
          );
        });

        it('succeeds with scoped permission and vault admin role', async () => {
          const {
            accessControl,
            owner,
            redemptionVault,
            regularAccounts,
            roles,
          } = await loadRvFixture();

          const vaultRole = await redemptionVault.vaultRole();
          await setupVaultScopedFunctionPermission(
            { accessControl, owner },
            vaultRole,
            redemptionVault.address,
            'setLoanLpFeeReceiver(address)',
            regularAccounts[0].address,
          );

          await accessControl.grantRole(
            roles.tokenRoles.mTBILL.redemptionVaultAdmin,
            regularAccounts[0].address,
          );

          await setLoanLpFeeReceiverTest(
            { redemptionVault, owner },
            regularAccounts[2].address,
            { from: regularAccounts[0] },
          );
        });
      });

      describe('setLoanRepaymentAddress()', () => {
        it('should fail: call from address without REDEMPTION_VAULT_ADMIN_ROLE role', async () => {
          const { redemptionVault, regularAccounts, owner } = await loadFixture(
            rvFixture,
          );
          await setLoanRepaymentAddressTest(
            { redemptionVault, owner },
            regularAccounts[0].address,
            {
              from: regularAccounts[0],
              revertMessage: acErrors.WMAC_HASNT_PERMISSION,
            },
          );
        });

        it('call from address with REDEMPTION_VAULT_ADMIN_ROLE role', async () => {
          const { redemptionVault, owner, regularAccounts } =
            await loadRvFixture();
          await setLoanRepaymentAddressTest(
            { redemptionVault, owner },
            regularAccounts[0].address,
          );
        });

        it('should fail: when function is paused', async () => {
          const { redemptionVault, owner, regularAccounts } =
            await loadRvFixture();

          await pauseVaultFn(
            redemptionVault,
            encodeFnSelector('setLoanRepaymentAddress(address)'),
          );

          await setLoanRepaymentAddressTest(
            { redemptionVault, owner },
            regularAccounts[0].address,
            { revertMessage: 'Pausable: fn paused' },
          );
        });

        it('succeeds with only scoped function permission', async () => {
          const { accessControl, owner, redemptionVault, regularAccounts } =
            await loadRvFixture();

          const vaultRole = await redemptionVault.vaultRole();
          await setupVaultScopedFunctionPermission(
            { accessControl, owner },
            vaultRole,
            redemptionVault.address,
            'setLoanRepaymentAddress(address)',
            regularAccounts[0].address,
          );

          expect(
            await accessControl.hasRole(vaultRole, regularAccounts[0].address),
          ).eq(false);

          await setLoanRepaymentAddressTest(
            { redemptionVault, owner },
            regularAccounts[1].address,
            { from: regularAccounts[0] },
          );
        });

        it('succeeds with scoped permission and vault admin role', async () => {
          const {
            accessControl,
            owner,
            redemptionVault,
            regularAccounts,
            roles,
          } = await loadRvFixture();

          const vaultRole = await redemptionVault.vaultRole();
          await setupVaultScopedFunctionPermission(
            { accessControl, owner },
            vaultRole,
            redemptionVault.address,
            'setLoanRepaymentAddress(address)',
            regularAccounts[0].address,
          );

          await accessControl.grantRole(
            roles.tokenRoles.mTBILL.redemptionVaultAdmin,
            regularAccounts[0].address,
          );

          await setLoanRepaymentAddressTest(
            { redemptionVault, owner },
            regularAccounts[2].address,
            { from: regularAccounts[0] },
          );
        });
      });

      describe('setLoanSwapperVault()', () => {
        it('should fail: call from address without REDEMPTION_VAULT_ADMIN_ROLE role', async () => {
          const { redemptionVault, regularAccounts, owner } = await loadFixture(
            rvFixture,
          );
          await setLoanSwapperVaultTest(
            { redemptionVault, owner },
            regularAccounts[0].address,
            {
              from: regularAccounts[0],
              revertMessage: acErrors.WMAC_HASNT_PERMISSION,
            },
          );
        });

        it('call from address with REDEMPTION_VAULT_ADMIN_ROLE role', async () => {
          const { redemptionVault, owner, regularAccounts } =
            await loadRvFixture();
          await setLoanSwapperVaultTest(
            { redemptionVault, owner },
            regularAccounts[0].address,
          );
        });

        it('should fail: when function is paused', async () => {
          const { redemptionVault, owner, regularAccounts } =
            await loadRvFixture();

          await pauseVaultFn(
            redemptionVault,
            encodeFnSelector('setLoanSwapperVault(address)'),
          );

          await setLoanSwapperVaultTest(
            { redemptionVault, owner },
            regularAccounts[0].address,
            { revertMessage: 'Pausable: fn paused' },
          );
        });

        it('succeeds with only scoped function permission', async () => {
          const { accessControl, owner, redemptionVault, regularAccounts } =
            await loadRvFixture();

          const vaultRole = await redemptionVault.vaultRole();
          await setupVaultScopedFunctionPermission(
            { accessControl, owner },
            vaultRole,
            redemptionVault.address,
            'setLoanSwapperVault(address)',
            regularAccounts[0].address,
          );

          expect(
            await accessControl.hasRole(vaultRole, regularAccounts[0].address),
          ).eq(false);

          await setLoanSwapperVaultTest(
            { redemptionVault, owner },
            regularAccounts[1].address,
            { from: regularAccounts[0] },
          );
        });

        it('succeeds with scoped permission and vault admin role', async () => {
          const {
            accessControl,
            owner,
            redemptionVault,
            regularAccounts,
            roles,
          } = await loadRvFixture();

          const vaultRole = await redemptionVault.vaultRole();
          await setupVaultScopedFunctionPermission(
            { accessControl, owner },
            vaultRole,
            redemptionVault.address,
            'setLoanSwapperVault(address)',
            regularAccounts[0].address,
          );

          await accessControl.grantRole(
            roles.tokenRoles.mTBILL.redemptionVaultAdmin,
            regularAccounts[0].address,
          );

          await setLoanSwapperVaultTest(
            { redemptionVault, owner },
            regularAccounts[2].address,
            { from: regularAccounts[0] },
          );
        });
      });

      describe('setMaxLoanApr()', () => {
        it('should fail: call from address without REDEMPTION_VAULT_ADMIN_ROLE role', async () => {
          const { redemptionVault, regularAccounts, owner } = await loadFixture(
            rvFixture,
          );
          await setMaxLoanAprTest({ redemptionVault, owner }, 100, {
            from: regularAccounts[0],
            revertMessage: acErrors.WMAC_HASNT_PERMISSION,
          });
        });

        it('should fail: if new value greater then 100%', async () => {
          const { redemptionVault, owner } = await loadRvFixture();
          await setMaxLoanAprTest({ redemptionVault, owner }, 10001);
        });

        it('if new value zero', async () => {
          const { redemptionVault, owner } = await loadRvFixture();
          await setMaxLoanAprTest({ redemptionVault, owner }, 0);
        });

        it('call from address with REDEMPTION_VAULT_ADMIN_ROLE role', async () => {
          const { redemptionVault, owner } = await loadRvFixture();
          await setMaxLoanAprTest({ redemptionVault, owner }, 100);
        });

        it('should fail: when function is paused', async () => {
          const { redemptionVault, owner } = await loadRvFixture();

          await pauseVaultFn(
            redemptionVault,
            encodeFnSelector('setMaxLoanApr(uint64)'),
          );

          await setMaxLoanAprTest({ redemptionVault, owner }, 100, {
            revertMessage: 'Pausable: fn paused',
          });
        });

        it('succeeds with only scoped function permission', async () => {
          const { accessControl, owner, redemptionVault, regularAccounts } =
            await loadRvFixture();

          const vaultRole = await redemptionVault.vaultRole();
          await setupVaultScopedFunctionPermission(
            { accessControl, owner },
            vaultRole,
            redemptionVault.address,
            'setMaxLoanApr(uint64)',
            regularAccounts[0].address,
          );

          expect(
            await accessControl.hasRole(vaultRole, regularAccounts[0].address),
          ).eq(false);

          await setMaxLoanAprTest({ redemptionVault, owner }, 100, {
            from: regularAccounts[0],
          });
        });

        it('succeeds with scoped permission and vault admin role', async () => {
          const {
            accessControl,
            owner,
            redemptionVault,
            regularAccounts,
            roles,
          } = await loadRvFixture();

          const vaultRole = await redemptionVault.vaultRole();
          await setupVaultScopedFunctionPermission(
            { accessControl, owner },
            vaultRole,
            redemptionVault.address,
            'setMaxLoanApr(uint64)',
            regularAccounts[0].address,
          );

          await accessControl.grantRole(
            roles.tokenRoles.mTBILL.redemptionVaultAdmin,
            regularAccounts[0].address,
          );

          await setMaxLoanAprTest({ redemptionVault, owner }, 100, {
            from: regularAccounts[0],
          });
        });
      });

      describe('removePaymentToken()', () => {
        it('should fail: call from address without REDEMPTION_VAULT_ADMIN_ROLE role', async () => {
          const { redemptionVault, regularAccounts, owner } = await loadFixture(
            rvFixture,
          );
          await removePaymentTokenTest(
            { vault: redemptionVault, owner },
            ethers.constants.AddressZero,
            {
              revertMessage: acErrors.WMAC_HASNT_PERMISSION,
              from: regularAccounts[0],
            },
          );
        });

        it('should fail: when token is not exists', async () => {
          const { owner, redemptionVault, stableCoins } = await loadFixture(
            rvFixture,
          );
          await removePaymentTokenTest(
            { vault: redemptionVault, owner },
            stableCoins.dai.address,
            { revertMessage: 'MV: not exists' },
          );
        });

        it('call from address with REDEMPTION_VAULT_ADMIN_ROLE role', async () => {
          const { redemptionVault, stableCoins, owner, dataFeed } =
            await loadRvFixture();
          await addPaymentTokenTest(
            { vault: redemptionVault, owner },
            stableCoins.dai,
            dataFeed.address,
            0,
            true,
          );
          await removePaymentTokenTest(
            { vault: redemptionVault, owner },
            stableCoins.dai.address,
          );
        });

        it('call from address with REDEMPTION_VAULT_ADMIN_ROLE role and add 3 options on a row', async () => {
          const { redemptionVault, owner, stableCoins, dataFeed } =
            await loadRvFixture();

          await addPaymentTokenTest(
            { vault: redemptionVault, owner },
            stableCoins.dai,
            dataFeed.address,
            0,
            true,
          );
          await addPaymentTokenTest(
            { vault: redemptionVault, owner },
            stableCoins.usdc,
            dataFeed.address,
            0,
            true,
          );
          await addPaymentTokenTest(
            { vault: redemptionVault, owner },
            stableCoins.usdt,
            dataFeed.address,
            0,
            true,
          );

          await removePaymentTokenTest(
            { vault: redemptionVault, owner },
            stableCoins.dai.address,
          );
          await removePaymentTokenTest(
            { vault: redemptionVault, owner },
            stableCoins.usdc.address,
          );
          await removePaymentTokenTest(
            { vault: redemptionVault, owner },
            stableCoins.usdt.address,
          );

          await removePaymentTokenTest(
            { vault: redemptionVault, owner },
            stableCoins.usdt.address,
            { revertMessage: 'MV: not exists' },
          );
        });

        it('should fail: when function is paused', async () => {
          const { redemptionVault, owner, stableCoins, dataFeed } =
            await loadRvFixture();

          await addPaymentTokenTest(
            { vault: redemptionVault, owner },
            stableCoins.dai,
            dataFeed.address,
            0,
            true,
          );

          await pauseVaultFn(
            redemptionVault,
            encodeFnSelector('removePaymentToken(address)'),
          );

          await removePaymentTokenTest(
            { vault: redemptionVault, owner },
            stableCoins.dai.address,
            { revertMessage: 'Pausable: fn paused' },
          );
        });

        it('succeeds with only scoped function permission', async () => {
          const {
            accessControl,
            owner,
            redemptionVault,
            regularAccounts,
            stableCoins,
            dataFeed,
          } = await loadRvFixture();

          await addPaymentTokenTest(
            { vault: redemptionVault, owner },
            stableCoins.usdc,
            dataFeed.address,
            0,
            true,
          );

          const vaultRole = await redemptionVault.vaultRole();
          await setupVaultScopedFunctionPermission(
            { accessControl, owner },
            vaultRole,
            redemptionVault.address,
            'removePaymentToken(address)',
            regularAccounts[0].address,
          );

          expect(
            await accessControl.hasRole(vaultRole, regularAccounts[0].address),
          ).eq(false);

          await removePaymentTokenTest(
            { vault: redemptionVault, owner },
            stableCoins.usdc.address,
            { from: regularAccounts[0] },
          );
        });

        it('succeeds with scoped permission and vault admin role', async () => {
          const {
            accessControl,
            owner,
            redemptionVault,
            regularAccounts,
            roles,
            stableCoins,
            dataFeed,
          } = await loadRvFixture();

          await addPaymentTokenTest(
            { vault: redemptionVault, owner },
            stableCoins.usdt,
            dataFeed.address,
            0,
            true,
          );

          const vaultRole = await redemptionVault.vaultRole();
          await setupVaultScopedFunctionPermission(
            { accessControl, owner },
            vaultRole,
            redemptionVault.address,
            'removePaymentToken(address)',
            regularAccounts[0].address,
          );

          await accessControl.grantRole(
            roles.tokenRoles.mTBILL.redemptionVaultAdmin,
            regularAccounts[0].address,
          );

          await removePaymentTokenTest(
            { vault: redemptionVault, owner },
            stableCoins.usdt.address,
            { from: regularAccounts[0] },
          );
        });
      });

      describe('withdrawToken()', () => {
        it('should fail: call from address without REDEMPTION_VAULT_ADMIN_ROLE role', async () => {
          const { redemptionVault, regularAccounts, owner } = await loadFixture(
            rvFixture,
          );
          await withdrawTest(
            { vault: redemptionVault, owner },
            ethers.constants.AddressZero,
            0,
            {
              revertMessage: acErrors.WMAC_HASNT_PERMISSION,
              from: regularAccounts[0],
            },
          );
        });

        it('should fail: when there is no token in vault', async () => {
          const { owner, redemptionVault, stableCoins } = await loadRvFixture();
          await withdrawTest(
            { vault: redemptionVault, owner },
            stableCoins.dai,
            1,
            { revertMessage: 'ERC20: transfer amount exceeds balance' },
          );
        });

        it('call from address with REDEMPTION_VAULT_ADMIN_ROLE role', async () => {
          const { redemptionVault, stableCoins, owner } = await loadRvFixture();
          await mintToken(stableCoins.dai, redemptionVault, 1);
          await withdrawTest(
            { vault: redemptionVault, owner },
            stableCoins.dai,
            1,
          );
        });

        it('should fail: when function is paused', async () => {
          const { redemptionVault, stableCoins, owner } = await loadRvFixture();

          await pauseVaultFn(
            redemptionVault,
            encodeFnSelector('withdrawToken(address,uint256)'),
          );

          await withdrawTest(
            { vault: redemptionVault, owner },
            stableCoins.dai,
            1,
            { revertMessage: 'Pausable: fn paused' },
          );
        });

        it('succeeds with only scoped function permission', async () => {
          const {
            accessControl,
            owner,
            redemptionVault,
            regularAccounts,
            stableCoins,
          } = await loadRvFixture();

          await mintToken(stableCoins.dai, redemptionVault, 1);

          const vaultRole = await redemptionVault.vaultRole();
          await setupVaultScopedFunctionPermission(
            { accessControl, owner },
            vaultRole,
            redemptionVault.address,
            'withdrawToken(address,uint256)',
            regularAccounts[0].address,
          );

          expect(
            await accessControl.hasRole(vaultRole, regularAccounts[0].address),
          ).eq(false);

          await withdrawTest(
            { vault: redemptionVault, owner },
            stableCoins.dai,
            1,
            { from: regularAccounts[0] },
          );
        });

        it('succeeds with scoped permission and vault admin role', async () => {
          const {
            accessControl,
            owner,
            redemptionVault,
            regularAccounts,
            roles,
            stableCoins,
          } = await loadRvFixture();

          await mintToken(stableCoins.dai, redemptionVault, 1);

          const vaultRole = await redemptionVault.vaultRole();
          await setupVaultScopedFunctionPermission(
            { accessControl, owner },
            vaultRole,
            redemptionVault.address,
            'withdrawToken(address,uint256)',
            regularAccounts[0].address,
          );

          await accessControl.grantRole(
            roles.tokenRoles.mTBILL.redemptionVaultAdmin,
            regularAccounts[0].address,
          );

          await withdrawTest(
            { vault: redemptionVault, owner },
            stableCoins.dai,
            1,
            { from: regularAccounts[0] },
          );
        });
      });

      describe('freeFromMinAmount()', async () => {
        it('should fail: call from address without vault admin role', async () => {
          const { redemptionVault, regularAccounts } = await loadFixture(
            rvFixture,
          );
          await expect(
            redemptionVault
              .connect(regularAccounts[0])
              .freeFromMinAmount(regularAccounts[1].address, true),
          ).to.be.revertedWith(acErrors.WMAC_HASNT_PERMISSION);
        });
        it('should not fail', async () => {
          const { redemptionVault, regularAccounts } = await loadFixture(
            rvFixture,
          );
          await expect(
            redemptionVault.freeFromMinAmount(regularAccounts[0].address, true),
          ).to.not.reverted;

          expect(
            await redemptionVault.isFreeFromMinAmount(
              regularAccounts[0].address,
            ),
          ).to.eq(true);
        });
        it('should fail: already in list', async () => {
          const { redemptionVault, regularAccounts } = await loadFixture(
            rvFixture,
          );
          await expect(
            redemptionVault.freeFromMinAmount(regularAccounts[0].address, true),
          ).to.not.reverted;

          expect(
            await redemptionVault.isFreeFromMinAmount(
              regularAccounts[0].address,
            ),
          ).to.eq(true);

          await expect(
            redemptionVault.freeFromMinAmount(regularAccounts[0].address, true),
          ).to.revertedWith('DV: already free');
        });

        it('should fail: when function is paused', async () => {
          const { redemptionVault, regularAccounts } = await loadRvFixture();

          await pauseVaultFn(
            redemptionVault,
            encodeFnSelector('freeFromMinAmount(address,bool)'),
          );

          await expect(
            redemptionVault.freeFromMinAmount(regularAccounts[0].address, true),
          ).to.be.revertedWith('Pausable: fn paused');
        });

        it('succeeds with only scoped function permission', async () => {
          const { accessControl, owner, redemptionVault, regularAccounts } =
            await loadRvFixture();

          const vaultRole = await redemptionVault.vaultRole();
          await setupVaultScopedFunctionPermission(
            { accessControl, owner },
            vaultRole,
            redemptionVault.address,
            'freeFromMinAmount(address,bool)',
            regularAccounts[0].address,
          );

          expect(
            await accessControl.hasRole(vaultRole, regularAccounts[0].address),
          ).eq(false);

          await expect(
            redemptionVault
              .connect(regularAccounts[0])
              .freeFromMinAmount(regularAccounts[2].address, true),
          ).to.not.reverted;

          expect(
            await redemptionVault.isFreeFromMinAmount(
              regularAccounts[2].address,
            ),
          ).to.eq(true);
        });

        it('succeeds with scoped permission and vault admin role', async () => {
          const {
            accessControl,
            owner,
            redemptionVault,
            regularAccounts,
            roles,
          } = await loadRvFixture();

          const vaultRole = await redemptionVault.vaultRole();
          await setupVaultScopedFunctionPermission(
            { accessControl, owner },
            vaultRole,
            redemptionVault.address,
            'freeFromMinAmount(address,bool)',
            regularAccounts[0].address,
          );

          await accessControl.grantRole(
            roles.tokenRoles.mTBILL.redemptionVaultAdmin,
            regularAccounts[0].address,
          );

          await expect(
            redemptionVault
              .connect(regularAccounts[0])
              .freeFromMinAmount(regularAccounts[3].address, true),
          ).to.not.reverted;

          expect(
            await redemptionVault.isFreeFromMinAmount(
              regularAccounts[3].address,
            ),
          ).to.eq(true);
        });
      });

      describe('changeTokenAllowance()', () => {
        it('should fail: call from address without REDEMPTION_VAULT_ADMIN_ROLE role', async () => {
          const { redemptionVault, regularAccounts, owner } = await loadFixture(
            rvFixture,
          );
          await changeTokenAllowanceTest(
            { vault: redemptionVault, owner },
            ethers.constants.AddressZero,
            0,
            {
              revertMessage: acErrors.WMAC_HASNT_PERMISSION,
              from: regularAccounts[0],
            },
          );
        });
        it('should fail: token not exist', async () => {
          const { redemptionVault, owner, stableCoins } = await loadFixture(
            rvFixture,
          );
          await changeTokenAllowanceTest(
            { vault: redemptionVault, owner },
            stableCoins.dai.address,
            0,
            { revertMessage: 'MV: token not exists' },
          );
        });
        it('should fail: allowance zero', async () => {
          const { redemptionVault, owner, stableCoins, dataFeed } =
            await loadRvFixture();
          await addPaymentTokenTest(
            { vault: redemptionVault, owner },
            stableCoins.dai,
            dataFeed.address,
            0,
            true,
          );
          await changeTokenAllowanceTest(
            { vault: redemptionVault, owner },
            stableCoins.dai.address,
            0,
            { revertMessage: 'MV: zero allowance' },
          );
        });

        it('call from address with REDEMPTION_VAULT_ADMIN_ROLE role', async () => {
          const { redemptionVault, owner, stableCoins, dataFeed } =
            await loadRvFixture();
          await addPaymentTokenTest(
            { vault: redemptionVault, owner },
            stableCoins.dai,
            dataFeed.address,
            0,
            true,
          );
          await changeTokenAllowanceTest(
            { vault: redemptionVault, owner },
            stableCoins.dai.address,
            100000000,
          );
        });

        it('should fail: when function is paused', async () => {
          const { redemptionVault, owner, stableCoins, dataFeed } =
            await loadRvFixture();
          await addPaymentTokenTest(
            { vault: redemptionVault, owner },
            stableCoins.dai,
            dataFeed.address,
            0,
            true,
          );

          await pauseVaultFn(
            redemptionVault,
            encodeFnSelector('changeTokenAllowance(address,uint256)'),
          );

          await changeTokenAllowanceTest(
            { vault: redemptionVault, owner },
            stableCoins.dai.address,
            100000000,
            { revertMessage: 'Pausable: fn paused' },
          );
        });

        it('succeeds with only scoped function permission', async () => {
          const {
            accessControl,
            owner,
            redemptionVault,
            regularAccounts,
            stableCoins,
            dataFeed,
          } = await loadRvFixture();

          await addPaymentTokenTest(
            { vault: redemptionVault, owner },
            stableCoins.dai,
            dataFeed.address,
            0,
            true,
          );

          const vaultRole = await redemptionVault.vaultRole();
          await setupVaultScopedFunctionPermission(
            { accessControl, owner },
            vaultRole,
            redemptionVault.address,
            'changeTokenAllowance(address,uint256)',
            regularAccounts[0].address,
          );

          expect(
            await accessControl.hasRole(vaultRole, regularAccounts[0].address),
          ).eq(false);

          await changeTokenAllowanceTest(
            { vault: redemptionVault, owner },
            stableCoins.dai.address,
            100000000,
            { from: regularAccounts[0] },
          );
        });

        it('succeeds with scoped permission and vault admin role', async () => {
          const {
            accessControl,
            owner,
            redemptionVault,
            regularAccounts,
            roles,
            stableCoins,
            dataFeed,
          } = await loadRvFixture();

          await addPaymentTokenTest(
            { vault: redemptionVault, owner },
            stableCoins.usdc,
            dataFeed.address,
            0,
            true,
          );

          const vaultRole = await redemptionVault.vaultRole();
          await setupVaultScopedFunctionPermission(
            { accessControl, owner },
            vaultRole,
            redemptionVault.address,
            'changeTokenAllowance(address,uint256)',
            regularAccounts[0].address,
          );

          await accessControl.grantRole(
            roles.tokenRoles.mTBILL.redemptionVaultAdmin,
            regularAccounts[0].address,
          );

          await changeTokenAllowanceTest(
            { vault: redemptionVault, owner },
            stableCoins.usdc.address,
            100000000,
            { from: regularAccounts[0] },
          );
        });
      });

      describe('changeTokenFee()', () => {
        it('should fail: call from address without REDEMPTION_VAULT_ADMIN_ROLE role', async () => {
          const { redemptionVault, regularAccounts, owner } = await loadFixture(
            rvFixture,
          );
          await changeTokenFeeTest(
            { vault: redemptionVault, owner },
            ethers.constants.AddressZero,
            0,
            {
              revertMessage: acErrors.WMAC_HASNT_PERMISSION,
              from: regularAccounts[0],
            },
          );
        });
        it('should fail: token not exist', async () => {
          const { redemptionVault, owner, stableCoins } = await loadFixture(
            rvFixture,
          );
          await changeTokenFeeTest(
            { vault: redemptionVault, owner },
            stableCoins.dai.address,
            0,
            { revertMessage: 'MV: token not exists' },
          );
        });
        it('should fail: fee > 100%', async () => {
          const { redemptionVault, owner, stableCoins, dataFeed } =
            await loadRvFixture();
          await addPaymentTokenTest(
            { vault: redemptionVault, owner },
            stableCoins.dai,
            dataFeed.address,
            0,
            true,
          );
          await changeTokenFeeTest(
            { vault: redemptionVault, owner },
            stableCoins.dai.address,
            10001,
            { revertMessage: 'fee > 100%' },
          );
        });
        it('call from address with REDEMPTION_VAULT_ADMIN_ROLE role', async () => {
          const { redemptionVault, owner, stableCoins, dataFeed } =
            await loadRvFixture();
          await addPaymentTokenTest(
            { vault: redemptionVault, owner },
            stableCoins.dai,
            dataFeed.address,
            0,
            true,
          );
          await changeTokenFeeTest(
            { vault: redemptionVault, owner },
            stableCoins.dai.address,
            100,
          );
        });

        it('should fail: when function is paused', async () => {
          const { redemptionVault, owner, stableCoins, dataFeed } =
            await loadRvFixture();
          await addPaymentTokenTest(
            { vault: redemptionVault, owner },
            stableCoins.dai,
            dataFeed.address,
            0,
            true,
          );

          await pauseVaultFn(
            redemptionVault,
            encodeFnSelector('changeTokenFee(address,uint256)'),
          );

          await changeTokenFeeTest(
            { vault: redemptionVault, owner },
            stableCoins.dai.address,
            100,
            { revertMessage: 'Pausable: fn paused' },
          );
        });

        it('succeeds with only scoped function permission', async () => {
          const {
            accessControl,
            owner,
            redemptionVault,
            regularAccounts,
            stableCoins,
            dataFeed,
          } = await loadRvFixture();

          await addPaymentTokenTest(
            { vault: redemptionVault, owner },
            stableCoins.dai,
            dataFeed.address,
            0,
            true,
          );

          const vaultRole = await redemptionVault.vaultRole();
          await setupVaultScopedFunctionPermission(
            { accessControl, owner },
            vaultRole,
            redemptionVault.address,
            'changeTokenFee(address,uint256)',
            regularAccounts[0].address,
          );

          expect(
            await accessControl.hasRole(vaultRole, regularAccounts[0].address),
          ).eq(false);

          await changeTokenFeeTest(
            { vault: redemptionVault, owner },
            stableCoins.dai.address,
            100,
            { from: regularAccounts[0] },
          );
        });

        it('succeeds with scoped permission and vault admin role', async () => {
          const {
            accessControl,
            owner,
            redemptionVault,
            regularAccounts,
            roles,
            stableCoins,
            dataFeed,
          } = await loadRvFixture();

          await addPaymentTokenTest(
            { vault: redemptionVault, owner },
            stableCoins.usdc,
            dataFeed.address,
            0,
            true,
          );

          const vaultRole = await redemptionVault.vaultRole();
          await setupVaultScopedFunctionPermission(
            { accessControl, owner },
            vaultRole,
            redemptionVault.address,
            'changeTokenFee(address,uint256)',
            regularAccounts[0].address,
          );

          await accessControl.grantRole(
            roles.tokenRoles.mTBILL.redemptionVaultAdmin,
            regularAccounts[0].address,
          );

          await changeTokenFeeTest(
            { vault: redemptionVault, owner },
            stableCoins.usdc.address,
            100,
            { from: regularAccounts[0] },
          );
        });
      });

      describe('redeemRequest()', () => {
        describe('holdback', () => {
          it('when 40% instant and 60% holdback', async () => {
            const {
              owner,
              redemptionVault,
              stableCoins,
              mTBILL,
              mTokenToUsdDataFeed,
              regularAccounts,
              dataFeed,
            } = await loadRvFixture();

            await mintToken(stableCoins.dai, redemptionVault, 100000);
            await mintToken(mTBILL, regularAccounts[0], 100);
            await approveBase18(
              regularAccounts[0],
              mTBILL,
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
              {
                redemptionVault,
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
              redemptionVault,
              stableCoins,
              mTBILL,
              mTokenToUsdDataFeed,
              regularAccounts,
              dataFeed,
            } = await loadRvFixture();

            await mintToken(stableCoins.dai, redemptionVault, 100000);
            await mintToken(mTBILL, regularAccounts[0], 100);
            await approveBase18(
              regularAccounts[0],
              mTBILL,
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
              {
                redemptionVault,
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
              redemptionVault,
              stableCoins,
              mTBILL,
              mTokenToUsdDataFeed,
              regularAccounts,
              dataFeed,
            } = await loadRvFixture();

            await mintToken(stableCoins.dai, redemptionVault, 100000);
            await mintToken(mTBILL, regularAccounts[0], 100);
            await approveBase18(
              regularAccounts[0],
              mTBILL,
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
              {
                redemptionVault,
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
              redemptionVault,
              stableCoins,
              mTBILL,
              mTokenToUsdDataFeed,
              regularAccounts,
              dataFeed,
            } = await loadRvFixture();

            await mintToken(stableCoins.dai, redemptionVault, 100000);
            await mintToken(mTBILL, regularAccounts[0], 100);
            await approveBase18(
              regularAccounts[0],
              mTBILL,
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
              {
                redemptionVault,
                owner,
                mTBILL,
                mTokenToUsdDataFeed,
                instantShare: 0,
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
              redemptionVault,
              stableCoins,
              mTBILL,
              mTokenToUsdDataFeed,
              regularAccounts,
              dataFeed,
            } = await loadRvFixture();

            await mintToken(stableCoins.dai, redemptionVault, 100000);
            await mintToken(mTBILL, regularAccounts[0], 100);
            await approveBase18(
              regularAccounts[0],
              mTBILL,
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
              {
                redemptionVault,
                owner,
                mTBILL,
                mTokenToUsdDataFeed,
                instantShare: 0,
                customRecipientInstant: regularAccounts[1],
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
              redemptionVault,
              stableCoins,
              mTBILL,
              mTokenToUsdDataFeed,
              regularAccounts,
              dataFeed,
            } = await loadRvFixture();

            await mintToken(stableCoins.dai, redemptionVault, 100000);
            await mintToken(mTBILL, regularAccounts[0], 100);
            await approveBase18(
              regularAccounts[0],
              mTBILL,
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
              {
                redemptionVault,
                owner,
                mTBILL,
                mTokenToUsdDataFeed,
                instantShare: 0,
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
              redemptionVault,
              stableCoins,
              mTBILL,
              mTokenToUsdDataFeed,
              regularAccounts,
              dataFeed,
            } = await loadRvFixture();

            await mintToken(stableCoins.dai, redemptionVault, 100000);
            await mintToken(mTBILL, regularAccounts[0], 100);
            await approveBase18(
              regularAccounts[0],
              mTBILL,
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
              {
                redemptionVault,
                owner,
                mTBILL,
                mTokenToUsdDataFeed,
                instantShare: 100_00,
              },
              stableCoins.dai,
              100,
              {
                from: regularAccounts[0],
                revertMessage: 'RV: invalid amount',
              },
            );
          });

          it('should fail: when instant share exceeds max instant share', async () => {
            const {
              owner,
              redemptionVault,
              stableCoins,
              mTBILL,
              mTokenToUsdDataFeed,
              regularAccounts,
              dataFeed,
            } = await loadRvFixture();

            await mintToken(stableCoins.dai, redemptionVault, 100000);
            await mintToken(mTBILL, regularAccounts[0], 100);
            await approveBase18(
              regularAccounts[0],
              mTBILL,
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

            await setMaxInstantShareTest({ redemptionVault, owner }, 80_00);
            await redeemRequestTest(
              {
                redemptionVault,
                owner,
                mTBILL,
                mTokenToUsdDataFeed,
                instantShare: 90_00,
              },
              stableCoins.dai,
              100,
              {
                from: regularAccounts[0],
                revertMessage: 'RV: !instantShare',
              },
            );
          });
        });

        it('should fail: when there is no token in vault', async () => {
          const {
            owner,
            redemptionVault,
            stableCoins,
            mTBILL,
            mTokenToUsdDataFeed,
          } = await loadRvFixture();

          await redeemRequestTest(
            { redemptionVault, owner, mTBILL, mTokenToUsdDataFeed },
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
            redemptionVault,
            stableCoins,
            mTBILL,
            dataFeed,
            mTokenToUsdDataFeed,
          } = await loadRvFixture();
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
            0,
            {
              revertMessage: 'RV: invalid amount',
            },
          );
        });

        it('should fail: when function paused', async () => {
          const {
            owner,
            redemptionVault,
            stableCoins,
            mTBILL,
            dataFeed,
            mTokenToUsdDataFeed,
            regularAccounts,
          } = await loadRvFixture();
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
          const selector = encodeFnSelector('redeemRequest(address,uint256)');
          await pauseVaultFn(redemptionVault, selector);
          await redeemRequestTest(
            { redemptionVault, owner, mTBILL, mTokenToUsdDataFeed },
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
            redemptionVault,
            stableCoins,
            mTBILL,
            dataFeed,
            mTokenToUsdDataFeed,
          } = await loadRvFixture();

          await mintToken(mTBILL, owner, 100);
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
              revertMessage: 'ERC20: insufficient allowance',
            },
          );
        });

        it('should fail: call with insufficient balance', async () => {
          const {
            owner,
            redemptionVault,
            stableCoins,
            mTBILL,
            dataFeed,
            mTokenToUsdDataFeed,
          } = await loadRvFixture();

          await approveBase18(owner, mTBILL, redemptionVault, 100);
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
              revertMessage: 'ERC20: transfer amount exceeds balance',
            },
          );
        });

        it('should fail: dataFeed rate 0 ', async () => {
          const {
            owner,
            redemptionVault,
            stableCoins,
            mTBILL,
            dataFeed,
            mockedAggregator,
            mockedAggregatorMToken,
            mTokenToUsdDataFeed,
          } = await loadRvFixture();

          await approveBase18(owner, stableCoins.dai, redemptionVault, 10);
          await addPaymentTokenTest(
            { vault: redemptionVault, owner },
            stableCoins.dai,
            dataFeed.address,
            0,
            true,
          );
          await mintToken(mTBILL, owner, 100_000);
          await setRoundData({ mockedAggregator }, 0);
          await redeemRequestTest(
            { redemptionVault, owner, mTBILL, mTokenToUsdDataFeed },
            stableCoins.dai,
            1,
            {
              revertMessage: 'DF: feed is deprecated',
            },
          );
          await setRoundData({ mockedAggregator }, 1);
          await setRoundData({ mockedAggregator: mockedAggregatorMToken }, 0);
          await redeemRequestTest(
            { redemptionVault, owner, mTBILL, mTokenToUsdDataFeed },
            stableCoins.dai,
            1,
            {
              revertMessage: 'DF: feed is deprecated',
            },
          );
        });

        it('should fail: call for amount < minAmount', async () => {
          const {
            redemptionVault,
            mockedAggregator,
            owner,
            mTBILL,
            stableCoins,
            dataFeed,
            mTokenToUsdDataFeed,
          } = await loadRvFixture();
          await addPaymentTokenTest(
            { vault: redemptionVault, owner },
            stableCoins.dai,
            dataFeed.address,
            0,
            true,
          );
          await setRoundData({ mockedAggregator }, 1);

          await mintToken(mTBILL, owner, 100_000);
          await approveBase18(owner, mTBILL, redemptionVault, 100_000);

          await setMinAmountTest({ vault: redemptionVault, owner }, 100_000);

          await redeemRequestTest(
            { redemptionVault, owner, mTBILL, mTokenToUsdDataFeed },
            stableCoins.dai,
            99_999,
            {
              revertMessage: 'RV: amount < min',
            },
          );
        });

        it('should fail: greenlist enabled and user not in greenlist ', async () => {
          const {
            owner,
            redemptionVault,
            stableCoins,
            mTBILL,
            mTokenToUsdDataFeed,
          } = await loadRvFixture();

          await redemptionVault.setGreenlistEnable(true);

          await redeemRequestTest(
            { redemptionVault, owner, mTBILL, mTokenToUsdDataFeed },
            stableCoins.dai,
            1,
            {
              revertMessage: acErrors.WMAC_HASNT_ROLE,
            },
          );
        });

        it('should fail: user in blacklist ', async () => {
          const {
            owner,
            redemptionVault,
            stableCoins,
            mTBILL,
            mTokenToUsdDataFeed,
            blackListableTester,
            accessControl,
            regularAccounts,
          } = await loadRvFixture();

          await blackList(
            { blacklistable: blackListableTester, accessControl, owner },
            regularAccounts[0],
          );

          await redeemRequestTest(
            { redemptionVault, owner, mTBILL, mTokenToUsdDataFeed },
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
            redemptionVault,
            stableCoins,
            mTBILL,
            mTokenToUsdDataFeed,
            regularAccounts,
            mockedSanctionsList,
          } = await loadRvFixture();

          await sanctionUser(
            { sanctionsList: mockedSanctionsList },
            regularAccounts[0],
          );

          await redeemRequestTest(
            { redemptionVault, owner, mTBILL, mTokenToUsdDataFeed },
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
            redemptionVault,
            stableCoins,
            mTBILL,
            dataFeed,
            mTokenToUsdDataFeed,
            regularAccounts,
            customRecipient,
          } = await loadRvFixture();
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
          const selector = encodeFnSelector(
            'redeemRequest(address,uint256,address)',
          );
          await pauseVaultFn(redemptionVault, selector);
          await redeemRequestTest(
            {
              redemptionVault,
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

        it('should fail: greenlist enabled and recipient not in greenlist (custom recipient overload)', async () => {
          const {
            owner,
            redemptionVault,
            stableCoins,
            mTBILL,
            mTokenToUsdDataFeed,
            greenListableTester,
            accessControl,
            customRecipient,
          } = await loadRvFixture();

          await redemptionVault.setGreenlistEnable(true);

          await greenList(
            { greenlistable: greenListableTester, accessControl, owner },
            owner,
          );

          await redeemRequestTest(
            {
              redemptionVault,
              owner,
              mTBILL,
              mTokenToUsdDataFeed,
              customRecipient,
            },
            stableCoins.dai,
            1,
            {
              revertMessage: acErrors.WMAC_HASNT_ROLE,
            },
          );
        });

        it('should fail: recipient in blacklist (custom recipient overload)', async () => {
          const {
            owner,
            redemptionVault,
            stableCoins,
            mTBILL,
            mTokenToUsdDataFeed,
            blackListableTester,
            accessControl,
            regularAccounts,
            customRecipient,
          } = await loadRvFixture();

          await blackList(
            { blacklistable: blackListableTester, accessControl, owner },
            customRecipient,
          );

          await redeemRequestTest(
            {
              redemptionVault,
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
            redemptionVault,
            stableCoins,
            mTBILL,
            mTokenToUsdDataFeed,
            regularAccounts,
            mockedSanctionsList,
            customRecipient,
          } = await loadRvFixture();

          await sanctionUser(
            { sanctionsList: mockedSanctionsList },
            customRecipient,
          );

          await redeemRequestTest(
            {
              redemptionVault,
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

        it('redeem request 100 mTBILL, greenlist enabled and user in greenlist ', async () => {
          const {
            owner,
            redemptionVault,
            stableCoins,
            mTBILL,
            greenListableTester,
            mTokenToUsdDataFeed,
            accessControl,
            regularAccounts,
            dataFeed,
          } = await loadRvFixture();

          await redemptionVault.setGreenlistEnable(true);

          await greenList(
            { greenlistable: greenListableTester, accessControl, owner },
            regularAccounts[0],
          );

          await mintToken(stableCoins.dai, redemptionVault, 100000);
          await mintToken(mTBILL, regularAccounts[0], 100);
          await approveBase18(regularAccounts[0], mTBILL, redemptionVault, 100);
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
            },
          );
        });

        it('instant limit configs are not applied', async () => {
          const {
            owner,
            redemptionVault,
            stableCoins,
            mTBILL,
            mTokenToUsdDataFeed,
            regularAccounts,
            dataFeed,
            mockedAggregator,
          } = await loadRvFixture();

          await addPaymentTokenTest(
            { vault: redemptionVault, owner },
            stableCoins.dai,
            dataFeed.address,
            0,
            true,
          );
          await setRoundData({ mockedAggregator }, 4);

          await setInstantLimitConfigTest(
            { vault: redemptionVault, owner },
            { window: hours(12), limit: parseUnits('100') },
          );
          await setInstantLimitConfigTest(
            { vault: redemptionVault, owner },
            { window: days(1), limit: parseUnits('100') },
          );

          await mintToken(stableCoins.dai, redemptionVault, 100000);
          await mintToken(mTBILL, regularAccounts[0], 500);
          await approveBase18(regularAccounts[0], mTBILL, redemptionVault, 500);

          await redeemRequestTest(
            { redemptionVault, owner, mTBILL, mTokenToUsdDataFeed },
            stableCoins.dai,
            500,
            { from: regularAccounts[0] },
          );
        });

        it('redeem request with 10% growth is applied', async () => {
          const {
            owner,
            redemptionVault,
            stableCoins,
            mTBILL,
            mTokenToUsdDataFeed,
            regularAccounts,
            dataFeed,
            customFeedGrowth,
          } = await loadRvFixture();

          await mTokenToUsdDataFeed.changeAggregator(customFeedGrowth.address);
          await setRoundDataGrowth({ owner, customFeedGrowth }, 1, -1000, 10);

          await mintToken(stableCoins.dai, redemptionVault, 100000);
          await mintToken(mTBILL, regularAccounts[0], 100);
          await approveBase18(regularAccounts[0], mTBILL, redemptionVault, 100);
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
            },
          );
        });

        it('redeem request with -10% growth is applied', async () => {
          const {
            owner,
            redemptionVault,
            stableCoins,
            mTBILL,
            mTokenToUsdDataFeed,
            regularAccounts,
            dataFeed,
            customFeedGrowth,
          } = await loadRvFixture();

          await mTokenToUsdDataFeed.changeAggregator(customFeedGrowth.address);
          await setMinGrowthApr({ owner, customFeedGrowth }, -10);
          await setRoundDataGrowth({ owner, customFeedGrowth }, 1, -1000, -10);

          await mintToken(stableCoins.dai, redemptionVault, 100000);
          await mintToken(mTBILL, regularAccounts[0], 100);
          await approveBase18(regularAccounts[0], mTBILL, redemptionVault, 100);
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
            },
          );
        });

        it('redeem request 100 mTBILL, when price of stable is 1.03$ and mToken price is 5$', async () => {
          const {
            owner,
            mockedAggregator,
            mockedAggregatorMToken,
            redemptionVault,
            stableCoins,
            mTBILL,
            dataFeed,
            mTokenToUsdDataFeed,
          } = await loadRvFixture();

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
        });

        it('redeem request 100 mTBILL, when price of stable is 1.03$ and mToken price is 5$ and token fee 1%', async () => {
          const {
            owner,
            mockedAggregator,
            mockedAggregatorMToken,
            redemptionVault,
            stableCoins,
            mTBILL,
            dataFeed,
            mTokenToUsdDataFeed,
          } = await loadRvFixture();

          await mintToken(stableCoins.dai, redemptionVault, 100000);
          await mintToken(mTBILL, owner, 100);
          await approveBase18(owner, mTBILL, redemptionVault, 100);
          await addPaymentTokenTest(
            { vault: redemptionVault, owner },
            stableCoins.dai,
            dataFeed.address,
            100,
            true,
          );
          await setRoundData({ mockedAggregator }, 1.03);
          await setRoundData({ mockedAggregator: mockedAggregatorMToken }, 5);
          await redeemRequestTest(
            { redemptionVault, owner, mTBILL, mTokenToUsdDataFeed },
            stableCoins.dai,
            100,
          );
        });

        it('redeem request 100 mTBILL, when price of stable is 1.03$ and mToken price is 5$ without checking of minDepositAmount', async () => {
          const {
            owner,
            mockedAggregator,
            mockedAggregatorMToken,
            redemptionVault,
            stableCoins,
            mTBILL,
            dataFeed,
            mTokenToUsdDataFeed,
          } = await loadRvFixture();

          await mintToken(stableCoins.dai, redemptionVault, 100000);
          await mintToken(mTBILL, owner, 100);
          await approveBase18(owner, mTBILL, redemptionVault, 100);
          await addPaymentTokenTest(
            { vault: redemptionVault, owner },
            stableCoins.dai,
            dataFeed.address,
            100,
            true,
          );
          await setRoundData({ mockedAggregator }, 1.03);
          await setRoundData({ mockedAggregator: mockedAggregatorMToken }, 5);
          await redemptionVault.freeFromMinAmount(owner.address, true);
          await redeemRequestTest(
            { redemptionVault, owner, mTBILL, mTokenToUsdDataFeed },
            stableCoins.dai,
            100,
          );
        });

        it('redeem request 100 mTBILL, when price of stable is 1.03$ and mToken price is 5$ and user in waivedFeeRestriction', async () => {
          const {
            owner,
            mockedAggregator,
            mockedAggregatorMToken,
            redemptionVault,
            stableCoins,
            mTBILL,
            dataFeed,
            mTokenToUsdDataFeed,
          } = await loadRvFixture();

          await mintToken(stableCoins.dai, redemptionVault, 100000);
          await mintToken(mTBILL, owner, 100);
          await approveBase18(owner, mTBILL, redemptionVault, 100);
          await addPaymentTokenTest(
            { vault: redemptionVault, owner },
            stableCoins.dai,
            dataFeed.address,
            100,
            true,
          );
          await setRoundData({ mockedAggregator }, 1.03);
          await setRoundData({ mockedAggregator: mockedAggregatorMToken }, 5);
          await addWaivedFeeAccountTest(
            { vault: redemptionVault, owner },
            owner.address,
          );
          await redeemRequestTest(
            {
              redemptionVault,
              owner,
              mTBILL,
              mTokenToUsdDataFeed,
              waivedFee: true,
            },
            stableCoins.dai,
            100,
          );
        });
        it('redeem request 100 mTBILL (custom recipient overload)', async () => {
          const {
            owner,
            redemptionVault,
            stableCoins,
            mTBILL,
            mTokenToUsdDataFeed,
            regularAccounts,
            dataFeed,
            customRecipient,
          } = await loadRvFixture();

          await mintToken(stableCoins.dai, redemptionVault, 100000);
          await mintToken(mTBILL, regularAccounts[0], 100);
          await approveBase18(regularAccounts[0], mTBILL, redemptionVault, 100);
          await addPaymentTokenTest(
            { vault: redemptionVault, owner },
            stableCoins.dai,
            dataFeed.address,
            0,
            true,
          );

          await redeemRequestTest(
            {
              redemptionVault,
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

        it('redeem request 100 mTBILL when recipient == msg.sender (custom recipient overload)', async () => {
          const {
            owner,
            redemptionVault,
            stableCoins,
            mTBILL,
            mTokenToUsdDataFeed,
            regularAccounts,
            dataFeed,
          } = await loadRvFixture();

          await mintToken(stableCoins.dai, redemptionVault, 100000);
          await mintToken(mTBILL, regularAccounts[0], 100);
          await approveBase18(regularAccounts[0], mTBILL, redemptionVault, 100);
          await addPaymentTokenTest(
            { vault: redemptionVault, owner },
            stableCoins.dai,
            dataFeed.address,
            0,
            true,
          );

          await redeemRequestTest(
            {
              redemptionVault,
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

        it('redeem request 100 mTBILL when other fn overload is paused (custom recipient overload)', async () => {
          const {
            owner,
            redemptionVault,
            stableCoins,
            mTBILL,
            mTokenToUsdDataFeed,
            regularAccounts,
            dataFeed,
            customRecipient,
          } = await loadRvFixture();

          await pauseVaultFn(
            redemptionVault,
            encodeFnSelector('redeemRequest(address,uint256)'),
          );
          await mintToken(stableCoins.dai, redemptionVault, 100000);
          await mintToken(mTBILL, regularAccounts[0], 100);
          await approveBase18(regularAccounts[0], mTBILL, redemptionVault, 100);
          await addPaymentTokenTest(
            { vault: redemptionVault, owner },
            stableCoins.dai,
            dataFeed.address,
            0,
            true,
          );

          await redeemRequestTest(
            {
              redemptionVault,
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

        it('redeem request 100 mTBILL when other fn overload is paused', async () => {
          const {
            owner,
            redemptionVault,
            stableCoins,
            mTBILL,
            mTokenToUsdDataFeed,
            regularAccounts,
            dataFeed,
          } = await loadRvFixture();

          await pauseVaultFn(
            redemptionVault,
            encodeFnSelector('redeemRequest(address,uint256,address)'),
          );
          await mintToken(stableCoins.dai, redemptionVault, 100000);
          await mintToken(mTBILL, regularAccounts[0], 100);
          await approveBase18(regularAccounts[0], mTBILL, redemptionVault, 100);
          await addPaymentTokenTest(
            { vault: redemptionVault, owner },
            stableCoins.dai,
            dataFeed.address,
            0,
            true,
          );

          await redeemRequestTest(
            {
              redemptionVault,
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

      describe('redeemRequests()', () => {
        it('should not revert for v1 stored request and should decode version=0', async () => {
          const { owner, redemptionVault } = await loadRvFixture();

          const requestId = 0;
          const sender = owner.address;
          const tokenOut = constants.AddressZero;

          await setV1RedeemRequestInStorage(redemptionVault, requestId, {
            sender,
            tokenOut,
            amountMToken: BigInt(parseUnits('1').toString()),
            mTokenRate: BigInt(parseUnits('2').toString()),
            tokenOutRate: BigInt(parseUnits('3').toString()),
            status: 0, // RequestStatus.Pending
          });

          const request = await redemptionVault.redeemRequests(requestId);
          expect(request.sender).eq(sender);
          expect(request.status).eq(0);
          expect(request.feePercent).eq(0);
          expect(request.version).eq(0);
        });
      });

      describe('approveRequest()', async () => {
        it('should fail: call from address without vault admin role', async () => {
          const {
            redemptionVault,
            regularAccounts,
            mTokenToUsdDataFeed,
            mTBILL,
          } = await loadRvFixture();
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
              revertMessage: acErrors.WMAC_HASNT_PERMISSION,
            },
          );
        });

        it('should fail: v1 stored request (version check)', async () => {
          const { owner, redemptionVault } = await loadRvFixture();

          const requestId = 0;
          await setV1RedeemRequestInStorage(redemptionVault, requestId, {
            sender: owner.address,
            tokenOut: constants.AddressZero,
            amountMToken: 1n,
            mTokenRate: 1n,
            tokenOutRate: 1n,
            status: 0,
          });

          await expect(
            redemptionVault
              .connect(owner)
              .approveRequest(requestId, parseUnits('1')),
          ).to.be.revertedWith('RV: not v2 request');
        });

        it('should fail: when function is paused', async () => {
          const { owner, redemptionVault, mTBILL, mTokenToUsdDataFeed } =
            await loadRvFixture();

          await pauseVaultFn(
            redemptionVault,
            encodeFnSelector('approveRequest(uint256,uint256)'),
          );

          await approveRedeemRequestTest(
            { redemptionVault, owner, mTBILL, mTokenToUsdDataFeed },
            0,
            parseUnits('1'),
            { revertMessage: 'Pausable: fn paused' },
          );
        });

        it('should fail: if some fee = 100%', async () => {
          const {
            owner,
            redemptionVault,
            stableCoins,
            mTBILL,
            dataFeed,
            mTokenToUsdDataFeed,
          } = await loadRvFixture();

          await mintToken(mTBILL, owner, 100);
          await approveBase18(owner, mTBILL, redemptionVault, 100);
          await addPaymentTokenTest(
            { vault: redemptionVault, owner },
            stableCoins.dai,
            dataFeed.address,
            10000,
            true,
          );
          await redeemRequestTest(
            { redemptionVault, owner, mTBILL, mTokenToUsdDataFeed },
            stableCoins.dai,
            100,
          );

          await approveRedeemRequestTest(
            { redemptionVault, owner, mTBILL, mTokenToUsdDataFeed },
            0,
            parseUnits('1'),
            {
              revertMessage: 'RV: amountTokenOut < fee',
            },
          );
        });

        it('should fail: request by id not exist', async () => {
          const {
            owner,
            redemptionVault,
            stableCoins,
            mTBILL,
            dataFeed,
            mTokenToUsdDataFeed,
          } = await loadRvFixture();
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
            redemptionVault,
            stableCoins,
            mTBILL,
            dataFeed,
            mTokenToUsdDataFeed,
            requestRedeemer,
          } = await loadRvFixture();

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
            redemptionVault,
            stableCoins,
            mTBILL,
            dataFeed,
            mTokenToUsdDataFeed,
            requestRedeemer,
          } = await loadRvFixture();

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

        it('should succeed when other approve entrypoints are paused', async () => {
          const {
            owner,
            mockedAggregator,
            mockedAggregatorMToken,
            redemptionVault,
            stableCoins,
            mTBILL,
            dataFeed,
            mTokenToUsdDataFeed,
            requestRedeemer,
          } = await loadRvFixture();

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

          await pauseOtherRedemptionApproveFns(
            redemptionVault,
            encodeFnSelector('approveRequest(uint256,uint256)'),
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
            redemptionVault,
            regularAccounts,
            mTokenToUsdDataFeed,
            mTBILL,
          } = await loadRvFixture();
          await approveRedeemRequestTest(
            {
              redemptionVault,
              owner: regularAccounts[1],
              mTBILL,
              mTokenToUsdDataFeed,
              isSafe: true,
            },
            1,
            parseUnits('1'),
            {
              revertMessage: acErrors.WMAC_HASNT_PERMISSION,
            },
          );
        });

        it('should fail: v1 stored request (version check)', async () => {
          const { owner, redemptionVault } = await loadRvFixture();

          const requestId = 0;
          await setV1RedeemRequestInStorage(redemptionVault, requestId, {
            sender: owner.address,
            tokenOut: constants.AddressZero,
            amountMToken: 1n,
            mTokenRate: 1n,
            tokenOutRate: 1n,
            status: 0,
          });

          await expect(
            redemptionVault
              .connect(owner)
              .safeApproveRequest(requestId, parseUnits('1')),
          ).to.be.revertedWith('RV: not v2 request');
        });

        it('should fail: when function is paused', async () => {
          const { owner, redemptionVault, mTBILL, mTokenToUsdDataFeed } =
            await loadRvFixture();

          await pauseVaultFn(
            redemptionVault,
            encodeFnSelector('safeApproveRequest(uint256,uint256)'),
          );

          await approveRedeemRequestTest(
            {
              redemptionVault,
              owner,
              mTBILL,
              mTokenToUsdDataFeed,
              isSafe: true,
            },
            0,
            parseUnits('1'),
            { revertMessage: 'Pausable: fn paused' },
          );
        });

        it('should fail: request by id not exist', async () => {
          const {
            owner,
            redemptionVault,
            stableCoins,
            mTBILL,
            dataFeed,
            mTokenToUsdDataFeed,
          } = await loadRvFixture();
          await addPaymentTokenTest(
            { vault: redemptionVault, owner },
            stableCoins.dai,
            dataFeed.address,
            0,
            true,
          );
          await approveRedeemRequestTest(
            {
              redemptionVault,
              owner,
              mTBILL,
              mTokenToUsdDataFeed,
              isSafe: true,
            },
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
            redemptionVault,
            stableCoins,
            mTBILL,
            dataFeed,
            mTokenToUsdDataFeed,
            requestRedeemer,
          } = await loadRvFixture();

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

          await approveRedeemRequestTest(
            {
              redemptionVault,
              owner,
              mTBILL,
              mTokenToUsdDataFeed,
              isSafe: true,
            },
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
            redemptionVault,
            stableCoins,
            mTBILL,
            dataFeed,
            mTokenToUsdDataFeed,
            requestRedeemer,
          } = await loadRvFixture();

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

          await approveRedeemRequestTest(
            {
              redemptionVault,
              owner,
              mTBILL,
              mTokenToUsdDataFeed,
              isSafe: true,
            },
            +requestId,
            parseUnits('5.000001'),
          );
          await approveRedeemRequestTest(
            {
              redemptionVault,
              owner,
              mTBILL,
              mTokenToUsdDataFeed,
              isSafe: true,
            },
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
            redemptionVault,
            stableCoins,
            mTBILL,
            mTokenToUsdDataFeed,
            dataFeed,
            requestRedeemer,
          } = await loadRvFixture();

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
            {
              redemptionVault,
              owner,
              mTBILL,
              mTokenToUsdDataFeed,
              isSafe: true,
            },
            +requestId,
            parseUnits('5.000001'),
          );
        });

        it('should succeed when other approve entrypoints are paused', async () => {
          const {
            owner,
            mockedAggregator,
            mockedAggregatorMToken,
            redemptionVault,
            stableCoins,
            mTBILL,
            mTokenToUsdDataFeed,
            dataFeed,
            requestRedeemer,
          } = await loadRvFixture();

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

          await pauseOtherRedemptionApproveFns(
            redemptionVault,
            encodeFnSelector('safeApproveRequest(uint256,uint256)'),
          );

          await approveRedeemRequestTest(
            {
              redemptionVault,
              owner,
              mTBILL,
              mTokenToUsdDataFeed,
              isSafe: true,
            },
            +requestId,
            parseUnits('5.000001'),
          );
        });
      });

      describe('approveRequestAvgRate()', async () => {
        it('should fail: call from address without vault admin role', async () => {
          const {
            redemptionVault,
            regularAccounts,
            mTokenToUsdDataFeed,
            mTBILL,
          } = await loadRvFixture();
          await approveRedeemRequestTest(
            {
              redemptionVault,
              owner: regularAccounts[1],
              mTBILL,
              mTokenToUsdDataFeed,
              isAvgRate: true,
            },
            1,
            parseUnits('1'),
            {
              revertMessage: acErrors.WMAC_HASNT_PERMISSION,
            },
          );
        });

        it('should fail: v1 stored request (version check)', async () => {
          const { owner, redemptionVault } = await loadRvFixture();

          const requestId = 0;
          await setV1RedeemRequestInStorage(redemptionVault, requestId, {
            sender: owner.address,
            tokenOut: constants.AddressZero,
            amountMToken: 1n,
            mTokenRate: 1n,
            tokenOutRate: 1n,
            status: 0,
          });

          await expect(
            redemptionVault
              .connect(owner)
              .approveRequestAvgRate(requestId, parseUnits('1')),
          ).to.be.revertedWith('RV: not v2 request');
        });

        it('should fail: when function is paused', async () => {
          const { owner, redemptionVault, mTBILL, mTokenToUsdDataFeed } =
            await loadRvFixture();

          await pauseVaultFn(
            redemptionVault,
            encodeFnSelector('approveRequestAvgRate(uint256,uint256)'),
          );

          await approveRedeemRequestTest(
            {
              redemptionVault,
              owner,
              mTBILL,
              mTokenToUsdDataFeed,
              isAvgRate: true,
            },
            0,
            parseUnits('1'),
            { revertMessage: 'Pausable: fn paused' },
          );
        });

        it('should fail: when instant part is 0', async () => {
          const {
            owner,
            redemptionVault,
            stableCoins,
            mTBILL,
            dataFeed,
            mTokenToUsdDataFeed,
          } = await loadRvFixture();

          await mintToken(mTBILL, owner, 100);
          await approveBase18(owner, mTBILL, redemptionVault, 100);
          await addPaymentTokenTest(
            { vault: redemptionVault, owner },
            stableCoins.dai,
            dataFeed.address,
            0,
            true,
          );
          await redeemRequestTest(
            {
              redemptionVault,
              owner,
              mTBILL,
              mTokenToUsdDataFeed,
            },
            stableCoins.dai,
            100,
          );

          await approveRedeemRequestTest(
            {
              redemptionVault,
              owner,
              mTBILL,
              mTokenToUsdDataFeed,
              isAvgRate: true,
            },
            0,
            parseUnits('1'),
            {
              revertMessage: 'RV: !amountMTokenInstant',
            },
          );
        });

        it('should fail: request by id not exist', async () => {
          const {
            owner,
            redemptionVault,
            stableCoins,
            mTBILL,
            dataFeed,
            mTokenToUsdDataFeed,
          } = await loadRvFixture();
          await addPaymentTokenTest(
            { vault: redemptionVault, owner },
            stableCoins.dai,
            dataFeed.address,
            0,
            true,
          );
          await approveRedeemRequestTest(
            {
              redemptionVault,
              owner,
              mTBILL,
              mTokenToUsdDataFeed,
              isAvgRate: true,
            },
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
            redemptionVault,
            stableCoins,
            mTBILL,
            dataFeed,
            mTokenToUsdDataFeed,
            requestRedeemer,
          } = await loadRvFixture();

          await mintToken(stableCoins.dai, requestRedeemer, 100000);
          await mintToken(stableCoins.dai, redemptionVault, 100000);
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
            {
              redemptionVault,
              owner,
              mTBILL,
              mTokenToUsdDataFeed,
              instantShare: 50_00,
            },
            stableCoins.dai,
            100,
          );
          const requestId = 0;

          await approveRedeemRequestTest(
            {
              redemptionVault,
              owner,
              mTBILL,
              mTokenToUsdDataFeed,
              isAvgRate: true,
            },
            +requestId,
            parseUnits('5'),
          );
          await approveRedeemRequestTest(
            {
              redemptionVault,
              owner,
              mTBILL,
              mTokenToUsdDataFeed,
              isAvgRate: true,
            },
            +requestId,
            parseUnits('5'),
            { revertMessage: 'RV: request not pending' },
          );
        });

        it('should fail: when calclulated holdback part rate is 0', async () => {
          const {
            owner,
            mockedAggregator,
            mockedAggregatorMToken,
            redemptionVault,
            stableCoins,
            mTBILL,
            dataFeed,
            mTokenToUsdDataFeed,
            requestRedeemer,
          } = await loadRvFixture();

          await mintToken(stableCoins.dai, requestRedeemer, 100000);
          await mintToken(stableCoins.dai, redemptionVault, 100000);
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
            {
              redemptionVault,
              owner,
              mTBILL,
              mTokenToUsdDataFeed,
              instantShare: 50_00,
            },
            stableCoins.dai,
            100,
          );
          const requestId = 0;

          await approveRedeemRequestTest(
            {
              redemptionVault,
              owner,
              mTBILL,
              mTokenToUsdDataFeed,
              isAvgRate: true,
            },
            +requestId,
            parseUnits('1'),
            {
              revertMessage: 'RV: !newMTokenRate',
            },
          );
        });

        it('should not check for deviation tolerance', async () => {
          const {
            owner,
            mockedAggregator,
            mockedAggregatorMToken,
            redemptionVault,
            stableCoins,
            mTBILL,
            dataFeed,
            mTokenToUsdDataFeed,
            requestRedeemer,
          } = await loadRvFixture();

          await mintToken(stableCoins.dai, requestRedeemer, 100000);
          await mintToken(stableCoins.dai, redemptionVault, 100000);
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
          await setVariabilityToleranceTest(
            { vault: redemptionVault, owner },
            1,
          );
          await redeemRequestTest(
            {
              redemptionVault,
              owner,
              mTBILL,
              mTokenToUsdDataFeed,
              instantShare: 50_00,
            },
            stableCoins.dai,
            100,
          );
          const requestId = 0;

          await approveRedeemRequestTest(
            {
              redemptionVault,
              owner,
              mTBILL,
              mTokenToUsdDataFeed,
              isAvgRate: true,
            },
            +requestId,
            parseUnits('4'),
          );
        });

        it('approve request from vaut admin account', async () => {
          const {
            owner,
            mockedAggregator,
            mockedAggregatorMToken,
            redemptionVault,
            stableCoins,
            mTBILL,
            dataFeed,
            mTokenToUsdDataFeed,
            requestRedeemer,
          } = await loadRvFixture();

          await mintToken(stableCoins.dai, requestRedeemer, 100000);
          await mintToken(stableCoins.dai, redemptionVault, 100000);
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
            {
              redemptionVault,
              owner,
              mTBILL,
              mTokenToUsdDataFeed,
              instantShare: 50_00,
            },
            stableCoins.dai,
            100,
          );
          const requestId = 0;

          await approveRedeemRequestTest(
            {
              redemptionVault,
              owner,
              mTBILL,
              mTokenToUsdDataFeed,
              isAvgRate: true,
            },
            +requestId,
            parseUnits('5'),
          );
        });

        it('should succeed when other approve entrypoints are paused', async () => {
          const {
            owner,
            mockedAggregator,
            mockedAggregatorMToken,
            redemptionVault,
            stableCoins,
            mTBILL,
            dataFeed,
            mTokenToUsdDataFeed,
            requestRedeemer,
          } = await loadRvFixture();

          await mintToken(stableCoins.dai, requestRedeemer, 100000);
          await mintToken(stableCoins.dai, redemptionVault, 100000);
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
            {
              redemptionVault,
              owner,
              mTBILL,
              mTokenToUsdDataFeed,
              instantShare: 50_00,
            },
            stableCoins.dai,
            100,
          );
          const requestId = 0;

          await pauseOtherRedemptionApproveFns(
            redemptionVault,
            encodeFnSelector('approveRequestAvgRate(uint256,uint256)'),
          );

          await approveRedeemRequestTest(
            {
              redemptionVault,
              owner,
              mTBILL,
              mTokenToUsdDataFeed,
              isAvgRate: true,
            },
            +requestId,
            parseUnits('5'),
          );
        });
      });

      describe('safeApproveRequestAvgRate()', async () => {
        it('should fail: call from address without vault admin role', async () => {
          const {
            redemptionVault,
            regularAccounts,
            mTokenToUsdDataFeed,
            mTBILL,
          } = await loadRvFixture();
          await approveRedeemRequestTest(
            {
              redemptionVault,
              owner: regularAccounts[1],
              mTBILL,
              mTokenToUsdDataFeed,
              isAvgRate: true,
              isSafe: true,
            },
            1,
            parseUnits('1'),
            {
              revertMessage: acErrors.WMAC_HASNT_PERMISSION,
            },
          );
        });

        it('should fail: v1 stored request (version check)', async () => {
          const { owner, redemptionVault } = await loadRvFixture();

          const requestId = 0;
          await setV1RedeemRequestInStorage(redemptionVault, requestId, {
            sender: owner.address,
            tokenOut: constants.AddressZero,
            amountMToken: 1n,
            mTokenRate: 1n,
            tokenOutRate: 1n,
            status: 0,
          });

          await expect(
            redemptionVault
              .connect(owner)
              .safeApproveRequestAvgRate(requestId, parseUnits('1')),
          ).to.be.revertedWith('RV: not v2 request');
        });

        it('should fail: when function is paused', async () => {
          const { owner, redemptionVault, mTBILL, mTokenToUsdDataFeed } =
            await loadRvFixture();

          await pauseVaultFn(
            redemptionVault,
            encodeFnSelector('safeApproveRequestAvgRate(uint256,uint256)'),
          );

          await approveRedeemRequestTest(
            {
              redemptionVault,
              owner,
              mTBILL,
              mTokenToUsdDataFeed,
              isAvgRate: true,
              isSafe: true,
            },
            0,
            parseUnits('1'),
            { revertMessage: 'Pausable: fn paused' },
          );
        });

        it('should fail: when instant part is 0', async () => {
          const {
            owner,
            redemptionVault,
            stableCoins,
            mTBILL,
            dataFeed,
            mTokenToUsdDataFeed,
          } = await loadRvFixture();

          await mintToken(mTBILL, owner, 100);
          await approveBase18(owner, mTBILL, redemptionVault, 100);
          await addPaymentTokenTest(
            { vault: redemptionVault, owner },
            stableCoins.dai,
            dataFeed.address,
            0,
            true,
          );
          await redeemRequestTest(
            {
              redemptionVault,
              owner,
              mTBILL,
              mTokenToUsdDataFeed,
            },
            stableCoins.dai,
            100,
          );

          await approveRedeemRequestTest(
            {
              redemptionVault,
              owner,
              mTBILL,
              mTokenToUsdDataFeed,
              isAvgRate: true,
              isSafe: true,
            },
            0,
            parseUnits('5'),
            {
              revertMessage: 'RV: !amountMTokenInstant',
            },
          );
        });

        it('should fail: request by id not exist', async () => {
          const {
            owner,
            redemptionVault,
            stableCoins,
            mTBILL,
            dataFeed,
            mTokenToUsdDataFeed,
          } = await loadRvFixture();
          await addPaymentTokenTest(
            { vault: redemptionVault, owner },
            stableCoins.dai,
            dataFeed.address,
            0,
            true,
          );
          await approveRedeemRequestTest(
            {
              redemptionVault,
              owner,
              mTBILL,
              mTokenToUsdDataFeed,
              isAvgRate: true,
              isSafe: true,
            },
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
            redemptionVault,
            stableCoins,
            mTBILL,
            dataFeed,
            mTokenToUsdDataFeed,
            requestRedeemer,
          } = await loadRvFixture();

          await mintToken(stableCoins.dai, requestRedeemer, 100000);
          await mintToken(stableCoins.dai, redemptionVault, 100000);
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
            {
              redemptionVault,
              owner,
              mTBILL,
              mTokenToUsdDataFeed,
              instantShare: 50_00,
            },
            stableCoins.dai,
            100,
          );
          const requestId = 0;

          await approveRedeemRequestTest(
            {
              redemptionVault,
              owner,
              mTBILL,
              mTokenToUsdDataFeed,
              isAvgRate: true,
            },
            +requestId,
            parseUnits('5'),
          );
          await approveRedeemRequestTest(
            {
              redemptionVault,
              owner,
              mTBILL,
              mTokenToUsdDataFeed,
              isAvgRate: true,
              isSafe: true,
            },
            +requestId,
            parseUnits('5'),
            { revertMessage: 'RV: request not pending' },
          );
        });

        it('should fail: when calclulated holdback part rate is 0', async () => {
          const {
            owner,
            mockedAggregator,
            mockedAggregatorMToken,
            redemptionVault,
            stableCoins,
            mTBILL,
            dataFeed,
            mTokenToUsdDataFeed,
            requestRedeemer,
          } = await loadRvFixture();

          await mintToken(stableCoins.dai, requestRedeemer, 100000);
          await mintToken(stableCoins.dai, redemptionVault, 100000);
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
            {
              redemptionVault,
              owner,
              mTBILL,
              mTokenToUsdDataFeed,
              instantShare: 99_99,
            },
            stableCoins.dai,
            100,
          );
          const requestId = 0;
          await setVariabilityToleranceTest(
            { vault: redemptionVault, owner },
            100_00,
          );
          await approveRedeemRequestTest(
            {
              redemptionVault,
              owner,
              mTBILL,
              mTokenToUsdDataFeed,
              isAvgRate: true,
              isSafe: true,
            },
            +requestId,
            parseUnits('4.9'),
            {
              revertMessage: 'RV: !newMTokenRate',
            },
          );
        });

        it('should fail: new rate exceeds deviation tolerance', async () => {
          const {
            owner,
            mockedAggregator,
            mockedAggregatorMToken,
            redemptionVault,
            stableCoins,
            mTBILL,
            dataFeed,
            mTokenToUsdDataFeed,
            requestRedeemer,
          } = await loadRvFixture();

          await mintToken(stableCoins.dai, requestRedeemer, 100000);
          await mintToken(stableCoins.dai, redemptionVault, 100000);
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
          await setVariabilityToleranceTest(
            { vault: redemptionVault, owner },
            1,
          );
          await redeemRequestTest(
            {
              redemptionVault,
              owner,
              mTBILL,
              mTokenToUsdDataFeed,
              instantShare: 50_00,
            },
            stableCoins.dai,
            100,
          );
          const requestId = 0;

          await approveRedeemRequestTest(
            {
              redemptionVault,
              owner,
              mTBILL,
              mTokenToUsdDataFeed,
              isAvgRate: true,
              isSafe: true,
            },
            +requestId,
            parseUnits('4'),
            {
              revertMessage: 'MV: exceed price diviation',
            },
          );
        });

        it('should fail: deviation tolerance should be checked against avg rate and not the holdback rate', async () => {
          const {
            owner,
            mockedAggregator,
            mockedAggregatorMToken,
            redemptionVault,
            stableCoins,
            mTBILL,
            dataFeed,
            mTokenToUsdDataFeed,
            requestRedeemer,
          } = await loadRvFixture();

          await mintToken(stableCoins.dai, requestRedeemer, 100000);
          await mintToken(stableCoins.dai, redemptionVault, 100000);
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
            {
              redemptionVault,
              owner,
              mTBILL,
              mTokenToUsdDataFeed,
              instantShare: 99_99,
            },
            stableCoins.dai,
            100,
          );
          const requestId = 0;

          await approveRedeemRequestTest(
            {
              redemptionVault,
              owner,
              mTBILL,
              mTokenToUsdDataFeed,
              isAvgRate: true,
              isSafe: true,
            },
            +requestId,
            parseUnits('4.9'),
            {
              revertMessage: 'MV: exceed price diviation',
            },
          );

          await setVariabilityToleranceTest(
            { vault: redemptionVault, owner },
            5_00,
          );

          await approveRedeemRequestTest(
            {
              redemptionVault,
              owner,
              mTBILL,
              mTokenToUsdDataFeed,
              isAvgRate: true,
              isSafe: true,
            },
            +requestId,
            parseUnits('4.8'),
            {
              revertMessage: 'RV: !newMTokenRate',
            },
          );
        });

        it('approve request from vaut admin account', async () => {
          const {
            owner,
            mockedAggregator,
            mockedAggregatorMToken,
            redemptionVault,
            stableCoins,
            mTBILL,
            dataFeed,
            mTokenToUsdDataFeed,
            requestRedeemer,
          } = await loadRvFixture();

          await mintToken(stableCoins.dai, requestRedeemer, 100000);
          await mintToken(stableCoins.dai, redemptionVault, 100000);
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
            {
              redemptionVault,
              owner,
              mTBILL,
              mTokenToUsdDataFeed,
              instantShare: 50_00,
            },
            stableCoins.dai,
            100,
          );
          const requestId = 0;

          await approveRedeemRequestTest(
            {
              redemptionVault,
              owner,
              mTBILL,
              mTokenToUsdDataFeed,
              isAvgRate: true,
              isSafe: true,
            },
            +requestId,
            parseUnits('5'),
          );
        });

        it('should succeed when other approve entrypoints are paused', async () => {
          const {
            owner,
            mockedAggregator,
            mockedAggregatorMToken,
            redemptionVault,
            stableCoins,
            mTBILL,
            dataFeed,
            mTokenToUsdDataFeed,
            requestRedeemer,
          } = await loadRvFixture();

          await mintToken(stableCoins.dai, requestRedeemer, 100000);
          await mintToken(stableCoins.dai, redemptionVault, 100000);
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
            {
              redemptionVault,
              owner,
              mTBILL,
              mTokenToUsdDataFeed,
              instantShare: 50_00,
            },
            stableCoins.dai,
            100,
          );
          const requestId = 0;

          await pauseOtherRedemptionApproveFns(
            redemptionVault,
            encodeFnSelector('safeApproveRequestAvgRate(uint256,uint256)'),
          );

          await approveRedeemRequestTest(
            {
              redemptionVault,
              owner,
              mTBILL,
              mTokenToUsdDataFeed,
              isAvgRate: true,
              isSafe: true,
            },
            +requestId,
            parseUnits('5'),
          );
        });
      });

      describe('safeBulkApproveRequestAtSavedRate()', async () => {
        it('should fail: call from address without vault admin role', async () => {
          const {
            redemptionVault,
            regularAccounts,
            mTokenToUsdDataFeed,
            mTBILL,
          } = await loadRvFixture();
          await safeBulkApproveRequestTest(
            {
              redemptionVault,
              owner: regularAccounts[1],
              mTBILL,
              mTokenToUsdDataFeed,
            },
            [{ id: 1 }],
            'request-rate',
            {
              revertMessage: acErrors.WMAC_HASNT_PERMISSION,
            },
          );
        });

        it('should fail: v1 stored request (version check)', async () => {
          const { owner, redemptionVault } = await loadRvFixture();

          const requestId = 0;
          await setV1RedeemRequestInStorage(redemptionVault, requestId, {
            sender: owner.address,
            tokenOut: constants.AddressZero,
            amountMToken: 1n,
            mTokenRate: 1n,
            tokenOutRate: 1n,
            status: 0,
          });

          await expect(
            redemptionVault
              .connect(owner)
              .safeBulkApproveRequestAtSavedRate([requestId]),
          ).to.be.revertedWith('RV: not v2 request');
        });

        it('should fail: request by id not exist', async () => {
          const {
            owner,
            redemptionVault,
            stableCoins,
            mTBILL,
            dataFeed,
            mTokenToUsdDataFeed,
          } = await loadRvFixture();
          await addPaymentTokenTest(
            { vault: redemptionVault, owner },
            stableCoins.dai,
            dataFeed.address,
            0,
            true,
          );
          await safeBulkApproveRequestTest(
            { redemptionVault, owner, mTBILL, mTokenToUsdDataFeed },
            [{ id: 1 }],
            'request-rate',
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
            redemptionVault,
            stableCoins,
            mTBILL,
            dataFeed,
            mTokenToUsdDataFeed,
            requestRedeemer,
          } = await loadRvFixture();

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

          await safeBulkApproveRequestTest(
            { redemptionVault, owner, mTBILL, mTokenToUsdDataFeed },
            [{ id: requestId }],
            'request-rate',
          );
          await safeBulkApproveRequestTest(
            { redemptionVault, owner, mTBILL, mTokenToUsdDataFeed },
            [{ id: requestId }],
            'request-rate',
            { revertMessage: 'RV: request not pending' },
          );
        });

        it('should fail: when function is paused', async () => {
          const { owner, redemptionVault, mTBILL, mTokenToUsdDataFeed } =
            await loadRvFixture();

          await pauseVaultFn(
            redemptionVault,
            encodeFnSelector('safeBulkApproveRequestAtSavedRate(uint256[])'),
          );

          await safeBulkApproveRequestTest(
            { redemptionVault, owner, mTBILL, mTokenToUsdDataFeed },
            [{ id: 0 }],
            'request-rate',
            { revertMessage: 'Pausable: fn paused' },
          );
        });

        it('should fail: process multiple requests, when one of them already precessed', async () => {
          const {
            owner,
            mockedAggregator,
            mockedAggregatorMToken,
            redemptionVault,
            stableCoins,
            mTBILL,
            dataFeed,
            mTokenToUsdDataFeed,
            requestRedeemer,
          } = await loadRvFixture();

          await mintToken(stableCoins.dai, requestRedeemer, 100000);
          await approveBase18(
            requestRedeemer,
            stableCoins.dai,
            redemptionVault,
            100000,
          );
          await mintToken(mTBILL, owner, 200);
          await approveBase18(owner, mTBILL, redemptionVault, 200);
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

          await redeemRequestTest(
            { redemptionVault, owner, mTBILL, mTokenToUsdDataFeed },
            stableCoins.dai,
            100,
          );

          await approveRedeemRequestTest(
            {
              redemptionVault,
              owner,
              mTBILL,
              mTokenToUsdDataFeed,
              isSafe: true,
            },
            0,
            parseUnits('5.000001'),
          );
          await safeBulkApproveRequestTest(
            { redemptionVault, owner, mTBILL, mTokenToUsdDataFeed },
            [{ id: 1 }, { id: 0 }],
            'request-rate',
            { revertMessage: 'RV: request not pending' },
          );
        });

        it('should fail: process multiple requests, when couple of them have equal id', async () => {
          const {
            owner,
            mockedAggregator,
            mockedAggregatorMToken,
            redemptionVault,
            stableCoins,
            mTBILL,
            dataFeed,
            mTokenToUsdDataFeed,
            requestRedeemer,
          } = await loadRvFixture();

          await mintToken(stableCoins.dai, requestRedeemer, 100000);
          await approveBase18(
            requestRedeemer,
            stableCoins.dai,
            redemptionVault,
            100000,
          );
          await mintToken(mTBILL, owner, 200);
          await approveBase18(owner, mTBILL, redemptionVault, 200);
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

          await redeemRequestTest(
            { redemptionVault, owner, mTBILL, mTokenToUsdDataFeed },
            stableCoins.dai,
            100,
          );

          await approveRedeemRequestTest(
            {
              redemptionVault,
              owner,
              mTBILL,
              mTokenToUsdDataFeed,
              isSafe: true,
            },
            0,
            parseUnits('5.000001'),
          );
          await safeBulkApproveRequestTest(
            { redemptionVault, owner, mTBILL, mTokenToUsdDataFeed },
            [{ id: 1 }, { id: 1 }],
            'request-rate',
            { revertMessage: 'RV: request not pending' },
          );
        });

        it('approve 1 request from vaut admin account', async () => {
          const {
            owner,
            mockedAggregator,
            mockedAggregatorMToken,
            redemptionVault,
            stableCoins,
            mTBILL,
            mTokenToUsdDataFeed,
            dataFeed,
            requestRedeemer,
          } = await loadRvFixture();

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

          await safeBulkApproveRequestTest(
            { redemptionVault, owner, mTBILL, mTokenToUsdDataFeed },
            [{ id: requestId }],
            'request-rate',
          );
        });

        it('approve 2 request from vaut admin account', async () => {
          const {
            owner,
            mockedAggregator,
            mockedAggregatorMToken,
            redemptionVault,
            stableCoins,
            mTBILL,
            mTokenToUsdDataFeed,
            dataFeed,
            requestRedeemer,
          } = await loadRvFixture();

          await mintToken(stableCoins.dai, requestRedeemer, 100000);
          await approveBase18(
            requestRedeemer,
            stableCoins.dai,
            redemptionVault,
            100000,
          );
          await mintToken(mTBILL, owner, 200);
          await approveBase18(owner, mTBILL, redemptionVault, 200);
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

          await redeemRequestTest(
            { redemptionVault, owner, mTBILL, mTokenToUsdDataFeed },
            stableCoins.dai,
            100,
          );

          await safeBulkApproveRequestTest(
            { redemptionVault, owner, mTBILL, mTokenToUsdDataFeed },
            [{ id: 1 }, { id: 0 }],
            'request-rate',
          );
        });

        it('approve 10 request from vaut admin account', async () => {
          const {
            owner,
            mockedAggregator,
            mockedAggregatorMToken,
            redemptionVault,
            stableCoins,
            mTBILL,
            mTokenToUsdDataFeed,
            dataFeed,
            requestRedeemer,
            regularAccounts,
          } = await loadRvFixture();

          await mintToken(stableCoins.dai, requestRedeemer, 100000);
          await approveBase18(
            requestRedeemer,
            stableCoins.dai,
            redemptionVault,
            100000,
          );
          await mintToken(mTBILL, owner, 1000);
          await approveBase18(owner, mTBILL, redemptionVault, 1000);
          await addPaymentTokenTest(
            { vault: redemptionVault, owner },
            stableCoins.dai,
            dataFeed.address,
            0,
            true,
          );

          await setRoundData({ mockedAggregator }, 1.03);
          await setRoundData({ mockedAggregator: mockedAggregatorMToken }, 5);

          for (let i = 0; i < 10; i++) {
            await redeemRequestTest(
              {
                redemptionVault,
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
            { redemptionVault, owner, mTBILL, mTokenToUsdDataFeed },
            Array.from({ length: 10 }, (_, i) => ({ id: i })),
            'request-rate',
          );
        });

        it('approve 1 request when there is not enough liquidity', async () => {
          const {
            owner,
            mockedAggregator,
            mockedAggregatorMToken,
            redemptionVault,
            stableCoins,
            mTBILL,
            mTokenToUsdDataFeed,
            dataFeed,
            requestRedeemer,
          } = await loadRvFixture();

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

          await safeBulkApproveRequestTest(
            { redemptionVault, owner, mTBILL, mTokenToUsdDataFeed },
            [{ id: requestId, expectedToExecute: false }],
            'request-rate',
          );
        });

        it('approve 2 request when there is enough liquidity only for first one', async () => {
          const {
            owner,
            mockedAggregator,
            mockedAggregatorMToken,
            redemptionVault,
            stableCoins,
            mTBILL,
            mTokenToUsdDataFeed,
            dataFeed,
            requestRedeemer,
          } = await loadRvFixture();

          await mintToken(stableCoins.dai, requestRedeemer, 600);

          await approveBase18(
            requestRedeemer,
            stableCoins.dai,
            redemptionVault,
            600,
          );
          await mintToken(mTBILL, owner, 200);
          await approveBase18(owner, mTBILL, redemptionVault, 200);
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
          await redeemRequestTest(
            { redemptionVault, owner, mTBILL, mTokenToUsdDataFeed },
            stableCoins.dai,
            100,
          );
          await safeBulkApproveRequestTest(
            { redemptionVault, owner, mTBILL, mTokenToUsdDataFeed },
            [
              { id: 0, expectedToExecute: true },
              { id: 1, expectedToExecute: false },
            ],
            'request-rate',
          );
        });

        it('approve 2 requests both with different payment tokens', async () => {
          const {
            owner,
            mockedAggregator,
            mockedAggregatorMToken,
            redemptionVault,
            stableCoins,
            mTBILL,
            mTokenToUsdDataFeed,
            dataFeed,
            requestRedeemer,
          } = await loadRvFixture();

          await mintToken(stableCoins.dai, requestRedeemer, 100000);
          await mintToken(stableCoins.usdc, requestRedeemer, 100000);
          await approveBase18(
            requestRedeemer,
            stableCoins.dai,
            redemptionVault,
            100000,
          );
          await approveBase18(
            requestRedeemer,
            stableCoins.usdc,
            redemptionVault,
            100000,
          );
          await mintToken(mTBILL, owner, 200);
          await approveBase18(owner, mTBILL, redemptionVault, 200);
          await addPaymentTokenTest(
            { vault: redemptionVault, owner },
            stableCoins.dai,
            dataFeed.address,
            0,
            true,
          );
          await addPaymentTokenTest(
            { vault: redemptionVault, owner },
            stableCoins.usdc,
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

          await redeemRequestTest(
            { redemptionVault, owner, mTBILL, mTokenToUsdDataFeed },
            stableCoins.usdc,
            100,
          );

          await safeBulkApproveRequestTest(
            { redemptionVault, owner, mTBILL, mTokenToUsdDataFeed },
            [{ id: 1 }, { id: 0 }],
            'request-rate',
          );
        });

        it('approve 2 requests both with different payment tokens when there is not enough liquidity for first one', async () => {
          const {
            owner,
            mockedAggregator,
            mockedAggregatorMToken,
            redemptionVault,
            stableCoins,
            mTBILL,
            mTokenToUsdDataFeed,
            dataFeed,
            requestRedeemer,
          } = await loadRvFixture();

          await mintToken(stableCoins.usdc, requestRedeemer, 100000);

          await approveBase18(
            requestRedeemer,
            stableCoins.usdc,
            redemptionVault,
            100000,
          );
          await mintToken(mTBILL, owner, 200);
          await approveBase18(owner, mTBILL, redemptionVault, 200);
          await addPaymentTokenTest(
            { vault: redemptionVault, owner },
            stableCoins.dai,
            dataFeed.address,
            0,
            true,
          );
          await addPaymentTokenTest(
            { vault: redemptionVault, owner },
            stableCoins.usdc,
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

          await redeemRequestTest(
            { redemptionVault, owner, mTBILL, mTokenToUsdDataFeed },
            stableCoins.usdc,
            100,
          );

          await safeBulkApproveRequestTest(
            { redemptionVault, owner, mTBILL, mTokenToUsdDataFeed },
            [{ id: 1 }, { id: 0, expectedToExecute: false }],
            'request-rate',
          );
        });

        it('should succeed when other approve entrypoints are paused', async () => {
          const {
            owner,
            mockedAggregator,
            mockedAggregatorMToken,
            redemptionVault,
            stableCoins,
            mTBILL,
            mTokenToUsdDataFeed,
            dataFeed,
            requestRedeemer,
          } = await loadRvFixture();

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

          await pauseOtherRedemptionApproveFns(
            redemptionVault,
            encodeFnSelector('safeBulkApproveRequestAtSavedRate(uint256[])'),
          );

          await safeBulkApproveRequestTest(
            { redemptionVault, owner, mTBILL, mTokenToUsdDataFeed },
            [{ id: requestId }],
            'request-rate',
          );
        });
      });

      describe('safeBulkApproveRequest() (custom price overload)', async () => {
        it('should fail: call from address without vault admin role', async () => {
          const {
            redemptionVault,
            regularAccounts,
            mTokenToUsdDataFeed,
            mTBILL,
          } = await loadRvFixture();
          await safeBulkApproveRequestTest(
            {
              redemptionVault,
              owner: regularAccounts[1],
              mTBILL,
              mTokenToUsdDataFeed,
            },
            [{ id: 1 }],
            parseUnits('1'),
            {
              revertMessage: acErrors.WMAC_HASNT_PERMISSION,
            },
          );
        });

        it('should fail: v1 stored request (version check)', async () => {
          const { owner, redemptionVault } = await loadRvFixture();

          const requestId = 0;
          await setV1RedeemRequestInStorage(redemptionVault, requestId, {
            sender: owner.address,
            tokenOut: constants.AddressZero,
            amountMToken: 1n,
            mTokenRate: 1n,
            tokenOutRate: 1n,
            status: 0,
          });

          await expect(
            redemptionVault
              .connect(owner)
              ['safeBulkApproveRequest(uint256[],uint256)'](
                [requestId],
                parseUnits('1'),
              ),
          ).to.be.revertedWith('RV: not v2 request');
        });

        it('should fail: when function is paused', async () => {
          const { owner, redemptionVault, mTBILL, mTokenToUsdDataFeed } =
            await loadRvFixture();

          await pauseVaultFn(
            redemptionVault,
            encodeFnSelector('safeBulkApproveRequest(uint256[],uint256)'),
          );

          await safeBulkApproveRequestTest(
            { redemptionVault, owner, mTBILL, mTokenToUsdDataFeed },
            [{ id: 0 }],
            parseUnits('1'),
            { revertMessage: 'Pausable: fn paused' },
          );
        });

        it('should fail: request by id not exist', async () => {
          const {
            owner,
            redemptionVault,
            stableCoins,
            mTBILL,
            dataFeed,
            mTokenToUsdDataFeed,
          } = await loadRvFixture();
          await addPaymentTokenTest(
            { vault: redemptionVault, owner },
            stableCoins.dai,
            dataFeed.address,
            0,
            true,
          );
          await safeBulkApproveRequestTest(
            { redemptionVault, owner, mTBILL, mTokenToUsdDataFeed },
            [{ id: 1 }],
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
            redemptionVault,
            stableCoins,
            mTBILL,
            dataFeed,
            mTokenToUsdDataFeed,
            requestRedeemer,
          } = await loadRvFixture();

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

          await safeBulkApproveRequestTest(
            { redemptionVault, owner, mTBILL, mTokenToUsdDataFeed },
            [{ id: requestId }],
            parseUnits('6'),
            { revertMessage: 'MV: exceed price diviation' },
          );
        });

        it('should fail: if new rate lower then variabilityTolerance', async () => {
          const {
            owner,
            mockedAggregator,
            mockedAggregatorMToken,
            redemptionVault,
            stableCoins,
            mTBILL,
            dataFeed,
            mTokenToUsdDataFeed,
            requestRedeemer,
          } = await loadRvFixture();

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

          await safeBulkApproveRequestTest(
            { redemptionVault, owner, mTBILL, mTokenToUsdDataFeed },
            [{ id: requestId }],
            parseUnits('4'),
            { revertMessage: 'MV: exceed price diviation' },
          );
        });

        it('should fail: request already processed', async () => {
          const {
            owner,
            mockedAggregator,
            mockedAggregatorMToken,
            redemptionVault,
            stableCoins,
            mTBILL,
            dataFeed,
            mTokenToUsdDataFeed,
            requestRedeemer,
          } = await loadRvFixture();

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

          await safeBulkApproveRequestTest(
            { redemptionVault, owner, mTBILL, mTokenToUsdDataFeed },
            [{ id: requestId }],
            parseUnits('5.000001'),
          );
          await safeBulkApproveRequestTest(
            { redemptionVault, owner, mTBILL, mTokenToUsdDataFeed },
            [{ id: requestId }],
            parseUnits('5.00001'),
            { revertMessage: 'RV: request not pending' },
          );
        });

        it('should fail: process multiple requests, when one of them already precessed', async () => {
          const {
            owner,
            mockedAggregator,
            mockedAggregatorMToken,
            redemptionVault,
            stableCoins,
            mTBILL,
            dataFeed,
            mTokenToUsdDataFeed,
            requestRedeemer,
          } = await loadRvFixture();

          await mintToken(stableCoins.dai, requestRedeemer, 100000);
          await approveBase18(
            requestRedeemer,
            stableCoins.dai,
            redemptionVault,
            100000,
          );
          await mintToken(mTBILL, owner, 200);
          await approveBase18(owner, mTBILL, redemptionVault, 200);
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

          await redeemRequestTest(
            { redemptionVault, owner, mTBILL, mTokenToUsdDataFeed },
            stableCoins.dai,
            100,
          );

          await approveRedeemRequestTest(
            {
              redemptionVault,
              owner,
              mTBILL,
              mTokenToUsdDataFeed,
              isSafe: true,
            },
            0,
            parseUnits('5.000001'),
          );
          await safeBulkApproveRequestTest(
            { redemptionVault, owner, mTBILL, mTokenToUsdDataFeed },
            [{ id: 1 }, { id: 0 }],
            parseUnits('5.00001'),
            { revertMessage: 'RV: request not pending' },
          );
        });

        it('should fail: process multiple requests, when couple of them have equal id', async () => {
          const {
            owner,
            mockedAggregator,
            mockedAggregatorMToken,
            redemptionVault,
            stableCoins,
            mTBILL,
            dataFeed,
            mTokenToUsdDataFeed,
            requestRedeemer,
          } = await loadRvFixture();

          await mintToken(stableCoins.dai, requestRedeemer, 100000);
          await approveBase18(
            requestRedeemer,
            stableCoins.dai,
            redemptionVault,
            100000,
          );
          await mintToken(mTBILL, owner, 200);
          await approveBase18(owner, mTBILL, redemptionVault, 200);
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

          await redeemRequestTest(
            { redemptionVault, owner, mTBILL, mTokenToUsdDataFeed },
            stableCoins.dai,
            100,
          );

          await approveRedeemRequestTest(
            {
              redemptionVault,
              owner,
              mTBILL,
              mTokenToUsdDataFeed,
              isSafe: true,
            },
            0,
            parseUnits('5.000001'),
          );
          await safeBulkApproveRequestTest(
            { redemptionVault, owner, mTBILL, mTokenToUsdDataFeed },
            [{ id: 1 }, { id: 1 }],
            parseUnits('5.00001'),
            { revertMessage: 'RV: request not pending' },
          );
        });

        it('approve 1 request from vaut admin account', async () => {
          const {
            owner,
            mockedAggregator,
            mockedAggregatorMToken,
            redemptionVault,
            stableCoins,
            mTBILL,
            mTokenToUsdDataFeed,
            dataFeed,
            requestRedeemer,
          } = await loadRvFixture();

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

          await safeBulkApproveRequestTest(
            { redemptionVault, owner, mTBILL, mTokenToUsdDataFeed },
            [{ id: requestId }],
            parseUnits('5.000001'),
          );
        });

        it('approve 2 request from vaut admin account', async () => {
          const {
            owner,
            mockedAggregator,
            mockedAggregatorMToken,
            redemptionVault,
            stableCoins,
            mTBILL,
            mTokenToUsdDataFeed,
            dataFeed,
            requestRedeemer,
          } = await loadRvFixture();

          await mintToken(stableCoins.dai, requestRedeemer, 100000);
          await approveBase18(
            requestRedeemer,
            stableCoins.dai,
            redemptionVault,
            100000,
          );
          await mintToken(mTBILL, owner, 200);
          await approveBase18(owner, mTBILL, redemptionVault, 200);
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

          await redeemRequestTest(
            { redemptionVault, owner, mTBILL, mTokenToUsdDataFeed },
            stableCoins.dai,
            100,
          );

          await safeBulkApproveRequestTest(
            { redemptionVault, owner, mTBILL, mTokenToUsdDataFeed },
            [{ id: 1 }, { id: 0 }],
            parseUnits('5.000001'),
          );
        });

        it('approve 10 request from vaut admin account', async () => {
          const {
            owner,
            mockedAggregator,
            mockedAggregatorMToken,
            redemptionVault,
            stableCoins,
            mTBILL,
            mTokenToUsdDataFeed,
            dataFeed,
            requestRedeemer,
            regularAccounts,
          } = await loadRvFixture();

          await mintToken(stableCoins.dai, requestRedeemer, 100000);
          await approveBase18(
            requestRedeemer,
            stableCoins.dai,
            redemptionVault,
            100000,
          );
          await mintToken(mTBILL, owner, 1000);
          await approveBase18(owner, mTBILL, redemptionVault, 1000);
          await addPaymentTokenTest(
            { vault: redemptionVault, owner },
            stableCoins.dai,
            dataFeed.address,
            0,
            true,
          );

          await setRoundData({ mockedAggregator }, 1.03);
          await setRoundData({ mockedAggregator: mockedAggregatorMToken }, 5);

          for (let i = 0; i < 10; i++) {
            await redeemRequestTest(
              {
                redemptionVault,
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
            { redemptionVault, owner, mTBILL, mTokenToUsdDataFeed },
            Array.from({ length: 10 }, (_, i) => ({ id: i })),
            parseUnits('5.000001'),
          );
        });

        it('approve 1 request when there is not enough liquidity', async () => {
          const {
            owner,
            mockedAggregator,
            mockedAggregatorMToken,
            redemptionVault,
            stableCoins,
            mTBILL,
            mTokenToUsdDataFeed,
            dataFeed,
            requestRedeemer,
          } = await loadRvFixture();

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

          await safeBulkApproveRequestTest(
            { redemptionVault, owner, mTBILL, mTokenToUsdDataFeed },
            [{ id: requestId, expectedToExecute: false }],
            parseUnits('5.000001'),
          );
        });

        it('approve 2 request when there is enough liquidity only for first one', async () => {
          const {
            owner,
            mockedAggregator,
            mockedAggregatorMToken,
            redemptionVault,
            stableCoins,
            mTBILL,
            mTokenToUsdDataFeed,
            dataFeed,
            requestRedeemer,
          } = await loadRvFixture();

          await mintToken(stableCoins.dai, requestRedeemer, 600);

          await approveBase18(
            requestRedeemer,
            stableCoins.dai,
            redemptionVault,
            600,
          );
          await mintToken(mTBILL, owner, 200);
          await approveBase18(owner, mTBILL, redemptionVault, 200);
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
          await redeemRequestTest(
            { redemptionVault, owner, mTBILL, mTokenToUsdDataFeed },
            stableCoins.dai,
            100,
          );
          await safeBulkApproveRequestTest(
            { redemptionVault, owner, mTBILL, mTokenToUsdDataFeed },
            [
              { id: 0, expectedToExecute: true },
              { id: 1, expectedToExecute: false },
            ],
            parseUnits('5.000001'),
          );
        });

        it('approve 2 requests both with different payment tokens', async () => {
          const {
            owner,
            mockedAggregator,
            mockedAggregatorMToken,
            redemptionVault,
            stableCoins,
            mTBILL,
            mTokenToUsdDataFeed,
            dataFeed,
            requestRedeemer,
          } = await loadRvFixture();

          await mintToken(stableCoins.dai, requestRedeemer, 100000);
          await mintToken(stableCoins.usdc, requestRedeemer, 100000);
          await approveBase18(
            requestRedeemer,
            stableCoins.dai,
            redemptionVault,
            100000,
          );
          await approveBase18(
            requestRedeemer,
            stableCoins.usdc,
            redemptionVault,
            100000,
          );
          await mintToken(mTBILL, owner, 200);
          await approveBase18(owner, mTBILL, redemptionVault, 200);
          await addPaymentTokenTest(
            { vault: redemptionVault, owner },
            stableCoins.dai,
            dataFeed.address,
            0,
            true,
          );
          await addPaymentTokenTest(
            { vault: redemptionVault, owner },
            stableCoins.usdc,
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

          await redeemRequestTest(
            { redemptionVault, owner, mTBILL, mTokenToUsdDataFeed },
            stableCoins.usdc,
            100,
          );

          await safeBulkApproveRequestTest(
            { redemptionVault, owner, mTBILL, mTokenToUsdDataFeed },
            [{ id: 1 }, { id: 0 }],
            parseUnits('5.000001'),
          );
        });

        it('approve 2 requests both with different payment tokens when there is not enough liquidity for first one', async () => {
          const {
            owner,
            mockedAggregator,
            mockedAggregatorMToken,
            redemptionVault,
            stableCoins,
            mTBILL,
            mTokenToUsdDataFeed,
            dataFeed,
            requestRedeemer,
          } = await loadRvFixture();

          await mintToken(stableCoins.usdc, requestRedeemer, 100000);

          await approveBase18(
            requestRedeemer,
            stableCoins.usdc,
            redemptionVault,
            100000,
          );
          await mintToken(mTBILL, owner, 200);
          await approveBase18(owner, mTBILL, redemptionVault, 200);
          await addPaymentTokenTest(
            { vault: redemptionVault, owner },
            stableCoins.dai,
            dataFeed.address,
            0,
            true,
          );
          await addPaymentTokenTest(
            { vault: redemptionVault, owner },
            stableCoins.usdc,
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

          await redeemRequestTest(
            { redemptionVault, owner, mTBILL, mTokenToUsdDataFeed },
            stableCoins.usdc,
            100,
          );

          await safeBulkApproveRequestTest(
            { redemptionVault, owner, mTBILL, mTokenToUsdDataFeed },
            [{ id: 1 }, { id: 0, expectedToExecute: false }],
            parseUnits('5.000001'),
          );
        });

        it('should succeed when other approve entrypoints are paused', async () => {
          const {
            owner,
            mockedAggregator,
            mockedAggregatorMToken,
            redemptionVault,
            stableCoins,
            mTBILL,
            mTokenToUsdDataFeed,
            dataFeed,
            requestRedeemer,
          } = await loadRvFixture();

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

          await pauseOtherRedemptionApproveFns(
            redemptionVault,
            encodeFnSelector('safeBulkApproveRequest(uint256[],uint256)'),
          );

          await safeBulkApproveRequestTest(
            { redemptionVault, owner, mTBILL, mTokenToUsdDataFeed },
            [{ id: requestId }],
            parseUnits('5.000001'),
          );
        });
      });

      describe('safeBulkApproveRequest() (current price overload)', async () => {
        it('should fail: call from address without vault admin role', async () => {
          const {
            redemptionVault,
            regularAccounts,
            mTokenToUsdDataFeed,
            mTBILL,
          } = await loadRvFixture();
          await safeBulkApproveRequestTest(
            {
              redemptionVault,
              owner: regularAccounts[1],
              mTBILL,
              mTokenToUsdDataFeed,
            },
            [{ id: 1 }],
            undefined,
            {
              revertMessage: acErrors.WMAC_HASNT_PERMISSION,
            },
          );
        });

        it('should fail: v1 stored request (version check)', async () => {
          const { owner, redemptionVault } = await loadRvFixture();

          const requestId = 0;
          await setV1RedeemRequestInStorage(redemptionVault, requestId, {
            sender: owner.address,
            tokenOut: constants.AddressZero,
            amountMToken: 1n,
            mTokenRate: 1n,
            tokenOutRate: 1n,
            status: 0,
          });

          await expect(
            redemptionVault
              .connect(owner)
              ['safeBulkApproveRequest(uint256[])']([requestId]),
          ).to.be.revertedWith('RV: not v2 request');
        });

        it('should fail: when function is paused', async () => {
          const { owner, redemptionVault, mTBILL, mTokenToUsdDataFeed } =
            await loadRvFixture();

          await pauseVaultFn(
            redemptionVault,
            encodeFnSelector('safeBulkApproveRequest(uint256[])'),
          );

          await safeBulkApproveRequestTest(
            { redemptionVault, owner, mTBILL, mTokenToUsdDataFeed },
            [{ id: 0 }],
            undefined,
            { revertMessage: 'Pausable: fn paused' },
          );
        });

        it('should fail: request by id not exist', async () => {
          const {
            owner,
            redemptionVault,
            stableCoins,
            mTBILL,
            dataFeed,
            mTokenToUsdDataFeed,
          } = await loadRvFixture();
          await addPaymentTokenTest(
            { vault: redemptionVault, owner },
            stableCoins.dai,
            dataFeed.address,
            0,
            true,
          );
          await safeBulkApproveRequestTest(
            { redemptionVault, owner, mTBILL, mTokenToUsdDataFeed },
            [{ id: 1 }],
            undefined,
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
            redemptionVault,
            stableCoins,
            mTBILL,
            dataFeed,
            mTokenToUsdDataFeed,
            requestRedeemer,
          } = await loadRvFixture();

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
          await setRoundData({ mockedAggregator: mockedAggregatorMToken }, 6);

          const requestId = 0;

          await safeBulkApproveRequestTest(
            { redemptionVault, owner, mTBILL, mTokenToUsdDataFeed },
            [{ id: requestId }],
            undefined,
            { revertMessage: 'MV: exceed price diviation' },
          );
        });

        it('should fail: if new rate lower then variabilityTolerance', async () => {
          const {
            owner,
            mockedAggregator,
            mockedAggregatorMToken,
            redemptionVault,
            stableCoins,
            mTBILL,
            dataFeed,
            mTokenToUsdDataFeed,
            requestRedeemer,
          } = await loadRvFixture();

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
          await setRoundData({ mockedAggregator: mockedAggregatorMToken }, 4);

          const requestId = 0;

          await safeBulkApproveRequestTest(
            { redemptionVault, owner, mTBILL, mTokenToUsdDataFeed },
            [{ id: requestId }],
            undefined,
            { revertMessage: 'MV: exceed price diviation' },
          );
        });

        it('should fail: request already processed', async () => {
          const {
            owner,
            mockedAggregator,
            mockedAggregatorMToken,
            redemptionVault,
            stableCoins,
            mTBILL,
            dataFeed,
            mTokenToUsdDataFeed,
            requestRedeemer,
          } = await loadRvFixture();

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

          await safeBulkApproveRequestTest(
            { redemptionVault, owner, mTBILL, mTokenToUsdDataFeed },
            [{ id: requestId }],
            undefined,
          );
          await safeBulkApproveRequestTest(
            { redemptionVault, owner, mTBILL, mTokenToUsdDataFeed },
            [{ id: requestId }],
            undefined,
            { revertMessage: 'RV: request not pending' },
          );
        });

        it('should fail: process multiple requests, when one of them already precessed', async () => {
          const {
            owner,
            mockedAggregator,
            mockedAggregatorMToken,
            redemptionVault,
            stableCoins,
            mTBILL,
            dataFeed,
            mTokenToUsdDataFeed,
            requestRedeemer,
          } = await loadRvFixture();

          await mintToken(stableCoins.dai, requestRedeemer, 100000);
          await approveBase18(
            requestRedeemer,
            stableCoins.dai,
            redemptionVault,
            100000,
          );
          await mintToken(mTBILL, owner, 200);
          await approveBase18(owner, mTBILL, redemptionVault, 200);
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

          await redeemRequestTest(
            { redemptionVault, owner, mTBILL, mTokenToUsdDataFeed },
            stableCoins.dai,
            100,
          );

          await approveRedeemRequestTest(
            {
              redemptionVault,
              owner,
              mTBILL,
              mTokenToUsdDataFeed,
              isSafe: true,
            },
            0,
            parseUnits('5.000001'),
          );
          await safeBulkApproveRequestTest(
            { redemptionVault, owner, mTBILL, mTokenToUsdDataFeed },
            [{ id: 1 }, { id: 0 }],
            undefined,
            { revertMessage: 'RV: request not pending' },
          );
        });

        it('should fail: process multiple requests, when couple of them have equal id', async () => {
          const {
            owner,
            mockedAggregator,
            mockedAggregatorMToken,
            redemptionVault,
            stableCoins,
            mTBILL,
            dataFeed,
            mTokenToUsdDataFeed,
            requestRedeemer,
          } = await loadRvFixture();

          await mintToken(stableCoins.dai, requestRedeemer, 100000);
          await approveBase18(
            requestRedeemer,
            stableCoins.dai,
            redemptionVault,
            100000,
          );
          await mintToken(mTBILL, owner, 200);
          await approveBase18(owner, mTBILL, redemptionVault, 200);
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

          await redeemRequestTest(
            { redemptionVault, owner, mTBILL, mTokenToUsdDataFeed },
            stableCoins.dai,
            100,
          );

          await approveRedeemRequestTest(
            {
              redemptionVault,
              owner,
              mTBILL,
              mTokenToUsdDataFeed,
              isSafe: true,
            },
            0,
            parseUnits('5.000001'),
          );
          await safeBulkApproveRequestTest(
            { redemptionVault, owner, mTBILL, mTokenToUsdDataFeed },
            [{ id: 1 }, { id: 1 }],
            undefined,
            { revertMessage: 'RV: request not pending' },
          );
        });

        it('approve 1 request from vaut admin account', async () => {
          const {
            owner,
            mockedAggregator,
            mockedAggregatorMToken,
            redemptionVault,
            stableCoins,
            mTBILL,
            mTokenToUsdDataFeed,
            dataFeed,
            requestRedeemer,
          } = await loadRvFixture();

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

          await safeBulkApproveRequestTest(
            { redemptionVault, owner, mTBILL, mTokenToUsdDataFeed },
            [{ id: requestId }],
            undefined,
          );
        });

        it('approve 1 request from vaut admin account when 10% growth is applied', async () => {
          const {
            owner,
            mockedAggregator,
            mockedAggregatorMToken,
            redemptionVault,
            stableCoins,
            mTBILL,
            mTokenToUsdDataFeed,
            dataFeed,
            requestRedeemer,
            customFeedGrowth,
          } = await loadRvFixture();

          await mTokenToUsdDataFeed.changeAggregator(customFeedGrowth.address);
          await setRoundDataGrowth({ owner, customFeedGrowth }, 1, -1000, 10);

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

          await safeBulkApproveRequestTest(
            { redemptionVault, owner, mTBILL, mTokenToUsdDataFeed },
            [{ id: requestId }],
            undefined,
          );
        });

        it('approve 1 request from vaut admin account when -10% growth is applied', async () => {
          const {
            owner,
            mockedAggregator,
            mockedAggregatorMToken,
            redemptionVault,
            stableCoins,
            mTBILL,
            mTokenToUsdDataFeed,
            dataFeed,
            requestRedeemer,
            customFeedGrowth,
          } = await loadRvFixture();

          await mTokenToUsdDataFeed.changeAggregator(customFeedGrowth.address);
          await setMinGrowthApr({ owner, customFeedGrowth }, -10);
          await setRoundDataGrowth({ owner, customFeedGrowth }, 1, -1000, -10);

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

          await safeBulkApproveRequestTest(
            { redemptionVault, owner, mTBILL, mTokenToUsdDataFeed },
            [{ id: requestId }],
            undefined,
          );
        });

        it('approve 2 request from vaut admin account', async () => {
          const {
            owner,
            mockedAggregator,
            mockedAggregatorMToken,
            redemptionVault,
            stableCoins,
            mTBILL,
            mTokenToUsdDataFeed,
            dataFeed,
            requestRedeemer,
          } = await loadRvFixture();

          await mintToken(stableCoins.dai, requestRedeemer, 100000);
          await approveBase18(
            requestRedeemer,
            stableCoins.dai,
            redemptionVault,
            100000,
          );
          await mintToken(mTBILL, owner, 200);
          await approveBase18(owner, mTBILL, redemptionVault, 200);
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

          await redeemRequestTest(
            { redemptionVault, owner, mTBILL, mTokenToUsdDataFeed },
            stableCoins.dai,
            100,
          );

          await safeBulkApproveRequestTest(
            { redemptionVault, owner, mTBILL, mTokenToUsdDataFeed },
            [{ id: 1 }, { id: 0 }],
            undefined,
          );
        });

        it('approve 10 request from vaut admin account', async () => {
          const {
            owner,
            mockedAggregator,
            mockedAggregatorMToken,
            redemptionVault,
            stableCoins,
            mTBILL,
            mTokenToUsdDataFeed,
            dataFeed,
            requestRedeemer,
            regularAccounts,
          } = await loadRvFixture();

          await mintToken(stableCoins.dai, requestRedeemer, 100000);
          await approveBase18(
            requestRedeemer,
            stableCoins.dai,
            redemptionVault,
            100000,
          );
          await mintToken(mTBILL, owner, 1000);
          await approveBase18(owner, mTBILL, redemptionVault, 1000);
          await addPaymentTokenTest(
            { vault: redemptionVault, owner },
            stableCoins.dai,
            dataFeed.address,
            0,
            true,
          );

          await setRoundData({ mockedAggregator }, 1.03);
          await setRoundData({ mockedAggregator: mockedAggregatorMToken }, 5);

          for (let i = 0; i < 10; i++) {
            await redeemRequestTest(
              {
                redemptionVault,
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
            { redemptionVault, owner, mTBILL, mTokenToUsdDataFeed },
            Array.from({ length: 10 }, (_, i) => ({ id: i })),
            undefined,
          );
        });

        it('approve 1 request when there is not enough liquidity', async () => {
          const {
            owner,
            mockedAggregator,
            mockedAggregatorMToken,
            redemptionVault,
            stableCoins,
            mTBILL,
            mTokenToUsdDataFeed,
            dataFeed,
            requestRedeemer,
          } = await loadRvFixture();

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

          await safeBulkApproveRequestTest(
            { redemptionVault, owner, mTBILL, mTokenToUsdDataFeed },
            [{ id: requestId, expectedToExecute: false }],
            undefined,
          );
        });

        it('approve 2 request when there is enough liquidity only for first one', async () => {
          const {
            owner,
            mockedAggregator,
            mockedAggregatorMToken,
            redemptionVault,
            stableCoins,
            mTBILL,
            mTokenToUsdDataFeed,
            dataFeed,
            requestRedeemer,
          } = await loadRvFixture();

          await mintToken(stableCoins.dai, requestRedeemer, 600);

          await approveBase18(
            requestRedeemer,
            stableCoins.dai,
            redemptionVault,
            600,
          );
          await mintToken(mTBILL, owner, 200);
          await approveBase18(owner, mTBILL, redemptionVault, 200);
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
          await redeemRequestTest(
            { redemptionVault, owner, mTBILL, mTokenToUsdDataFeed },
            stableCoins.dai,
            100,
          );
          await safeBulkApproveRequestTest(
            { redemptionVault, owner, mTBILL, mTokenToUsdDataFeed },
            [
              { id: 0, expectedToExecute: true },
              { id: 1, expectedToExecute: false },
            ],
            undefined,
          );
        });

        it('approve 2 requests both with different payment tokens', async () => {
          const {
            owner,
            mockedAggregator,
            mockedAggregatorMToken,
            redemptionVault,
            stableCoins,
            mTBILL,
            mTokenToUsdDataFeed,
            dataFeed,
            requestRedeemer,
          } = await loadRvFixture();

          await mintToken(stableCoins.dai, requestRedeemer, 100000);
          await mintToken(stableCoins.usdc, requestRedeemer, 100000);
          await approveBase18(
            requestRedeemer,
            stableCoins.dai,
            redemptionVault,
            100000,
          );
          await approveBase18(
            requestRedeemer,
            stableCoins.usdc,
            redemptionVault,
            100000,
          );
          await mintToken(mTBILL, owner, 200);
          await approveBase18(owner, mTBILL, redemptionVault, 200);
          await addPaymentTokenTest(
            { vault: redemptionVault, owner },
            stableCoins.dai,
            dataFeed.address,
            0,
            true,
          );
          await addPaymentTokenTest(
            { vault: redemptionVault, owner },
            stableCoins.usdc,
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

          await redeemRequestTest(
            { redemptionVault, owner, mTBILL, mTokenToUsdDataFeed },
            stableCoins.usdc,
            100,
          );

          await safeBulkApproveRequestTest(
            { redemptionVault, owner, mTBILL, mTokenToUsdDataFeed },
            [{ id: 1 }, { id: 0 }],
            undefined,
          );
        });

        it('approve 2 requests both with different payment tokens when there is not enough liquidity for first one', async () => {
          const {
            owner,
            mockedAggregator,
            mockedAggregatorMToken,
            redemptionVault,
            stableCoins,
            mTBILL,
            mTokenToUsdDataFeed,
            dataFeed,
            requestRedeemer,
          } = await loadRvFixture();

          await mintToken(stableCoins.usdc, requestRedeemer, 100000);

          await approveBase18(
            requestRedeemer,
            stableCoins.usdc,
            redemptionVault,
            100000,
          );
          await mintToken(mTBILL, owner, 200);
          await approveBase18(owner, mTBILL, redemptionVault, 200);
          await addPaymentTokenTest(
            { vault: redemptionVault, owner },
            stableCoins.dai,
            dataFeed.address,
            0,
            true,
          );
          await addPaymentTokenTest(
            { vault: redemptionVault, owner },
            stableCoins.usdc,
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

          await redeemRequestTest(
            { redemptionVault, owner, mTBILL, mTokenToUsdDataFeed },
            stableCoins.usdc,
            100,
          );

          await safeBulkApproveRequestTest(
            { redemptionVault, owner, mTBILL, mTokenToUsdDataFeed },
            [{ id: 1 }, { id: 0, expectedToExecute: false }],
            undefined,
          );
        });

        it('should succeed when other approve entrypoints are paused', async () => {
          const {
            owner,
            mockedAggregator,
            mockedAggregatorMToken,
            redemptionVault,
            stableCoins,
            mTBILL,
            mTokenToUsdDataFeed,
            dataFeed,
            requestRedeemer,
          } = await loadRvFixture();

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

          await pauseOtherRedemptionApproveFns(
            redemptionVault,
            encodeFnSelector('safeBulkApproveRequest(uint256[])'),
          );

          await safeBulkApproveRequestTest(
            { redemptionVault, owner, mTBILL, mTokenToUsdDataFeed },
            [{ id: requestId }],
            undefined,
          );
        });
      });

      describe('safeBulkApproveRequestAvgRate() (custom price overload)', async () => {
        it('should fail: call from address without vault admin role', async () => {
          const {
            redemptionVault,
            regularAccounts,
            mTokenToUsdDataFeed,
            mTBILL,
          } = await loadRvFixture();
          await safeBulkApproveRequestTest(
            {
              redemptionVault,
              owner: regularAccounts[1],
              mTBILL,
              mTokenToUsdDataFeed,
              isAvgRate: true,
            },
            [{ id: 1 }],
            parseUnits('1'),
            {
              revertMessage: acErrors.WMAC_HASNT_PERMISSION,
            },
          );
        });

        it('should fail: v1 stored request (version check)', async () => {
          const { owner, redemptionVault } = await loadRvFixture();

          const requestId = 0;
          await setV1RedeemRequestInStorage(redemptionVault, requestId, {
            sender: owner.address,
            tokenOut: constants.AddressZero,
            amountMToken: 1n,
            mTokenRate: 1n,
            tokenOutRate: 1n,
            status: 0,
          });

          await expect(
            redemptionVault
              .connect(owner)
              ['safeBulkApproveRequestAvgRate(uint256[],uint256)'](
                [requestId],
                parseUnits('1'),
              ),
          ).to.be.revertedWith('RV: not v2 request');
        });

        it('should fail: when function is paused', async () => {
          const { owner, redemptionVault, mTBILL, mTokenToUsdDataFeed } =
            await loadRvFixture();

          await pauseVaultFn(
            redemptionVault,
            encodeFnSelector(
              'safeBulkApproveRequestAvgRate(uint256[],uint256)',
            ),
          );

          await safeBulkApproveRequestTest(
            {
              redemptionVault,
              owner,
              mTBILL,
              mTokenToUsdDataFeed,
              isAvgRate: true,
            },
            [{ id: 0 }],
            parseUnits('1'),
            { revertMessage: 'Pausable: fn paused' },
          );
        });

        it('should fail: request by id not exist', async () => {
          const {
            owner,
            redemptionVault,
            stableCoins,
            mTBILL,
            dataFeed,
            mTokenToUsdDataFeed,
          } = await loadRvFixture();
          await addPaymentTokenTest(
            { vault: redemptionVault, owner },
            stableCoins.dai,
            dataFeed.address,
            0,
            true,
          );
          await safeBulkApproveRequestTest(
            {
              redemptionVault,
              owner,
              mTBILL,
              mTokenToUsdDataFeed,
              isAvgRate: true,
            },
            [{ id: 1 }],
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
            redemptionVault,
            stableCoins,
            mTBILL,
            dataFeed,
            mTokenToUsdDataFeed,
            requestRedeemer,
          } = await loadRvFixture();

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

          await safeBulkApproveRequestTest(
            {
              redemptionVault,
              owner,
              mTBILL,
              mTokenToUsdDataFeed,
              isAvgRate: true,
            },
            [{ id: requestId }],
            parseUnits('6'),
            { revertMessage: 'MV: exceed price diviation' },
          );
        });

        it('should fail: if new rate lower then variabilityTolerance', async () => {
          const {
            owner,
            mockedAggregator,
            mockedAggregatorMToken,
            redemptionVault,
            stableCoins,
            mTBILL,
            dataFeed,
            mTokenToUsdDataFeed,
            requestRedeemer,
          } = await loadRvFixture();

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

          await safeBulkApproveRequestTest(
            {
              redemptionVault,
              owner,
              mTBILL,
              mTokenToUsdDataFeed,
              isAvgRate: true,
            },
            [{ id: requestId }],
            parseUnits('4'),
            { revertMessage: 'MV: exceed price diviation' },
          );
        });

        it('should fail: request already processed', async () => {
          const {
            owner,
            mockedAggregator,
            mockedAggregatorMToken,
            redemptionVault,
            stableCoins,
            mTBILL,
            dataFeed,
            mTokenToUsdDataFeed,
            requestRedeemer,
          } = await loadRvFixture();

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

          await safeBulkApproveRequestTest(
            { redemptionVault, owner, mTBILL, mTokenToUsdDataFeed },
            [{ id: requestId }],
            parseUnits('5.000001'),
          );
          await safeBulkApproveRequestTest(
            {
              redemptionVault,
              owner,
              mTBILL,
              mTokenToUsdDataFeed,
              isAvgRate: true,
            },
            [{ id: requestId }],
            parseUnits('5.00001'),
            { revertMessage: 'RV: request not pending' },
          );
        });

        it('should fail: process multiple requests, when one of them already precessed', async () => {
          const {
            owner,
            mockedAggregator,
            mockedAggregatorMToken,
            redemptionVault,
            stableCoins,
            mTBILL,
            dataFeed,
            mTokenToUsdDataFeed,
            requestRedeemer,
          } = await loadRvFixture();

          await mintToken(stableCoins.dai, requestRedeemer, 100000);
          await mintToken(stableCoins.dai, redemptionVault, 100000);
          await approveBase18(
            requestRedeemer,
            stableCoins.dai,
            redemptionVault,
            100000,
          );
          await mintToken(mTBILL, owner, 200);
          await approveBase18(owner, mTBILL, redemptionVault, 200);
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
            {
              redemptionVault,
              owner,
              mTBILL,
              mTokenToUsdDataFeed,
              instantShare: 50_00,
            },
            stableCoins.dai,
            100,
          );

          await redeemRequestTest(
            {
              redemptionVault,
              owner,
              mTBILL,
              mTokenToUsdDataFeed,
              instantShare: 50_00,
            },
            stableCoins.dai,
            100,
          );

          await approveRedeemRequestTest(
            {
              redemptionVault,
              owner,
              mTBILL,
              mTokenToUsdDataFeed,
              isSafe: true,
              isAvgRate: true,
            },
            0,
            parseUnits('5.000001'),
          );
          await safeBulkApproveRequestTest(
            {
              redemptionVault,
              owner,
              mTBILL,
              mTokenToUsdDataFeed,
              isAvgRate: true,
            },
            [{ id: 1 }, { id: 0 }],
            parseUnits('5.00001'),
            { revertMessage: 'RV: request not pending' },
          );
        });

        it('should fail: process multiple requests, when couple of them have equal id', async () => {
          const {
            owner,
            mockedAggregator,
            mockedAggregatorMToken,
            redemptionVault,
            stableCoins,
            mTBILL,
            dataFeed,
            mTokenToUsdDataFeed,
            requestRedeemer,
          } = await loadRvFixture();

          await mintToken(stableCoins.dai, requestRedeemer, 100000);
          await mintToken(stableCoins.dai, redemptionVault, 100000);
          await approveBase18(
            requestRedeemer,
            stableCoins.dai,
            redemptionVault,
            100000,
          );
          await mintToken(mTBILL, owner, 200);
          await approveBase18(owner, mTBILL, redemptionVault, 200);
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
            {
              redemptionVault,
              owner,
              mTBILL,
              mTokenToUsdDataFeed,
              instantShare: 50_00,
            },
            stableCoins.dai,
            100,
          );

          await redeemRequestTest(
            {
              redemptionVault,
              owner,
              mTBILL,
              mTokenToUsdDataFeed,
              instantShare: 50_00,
            },
            stableCoins.dai,
            100,
          );

          await approveRedeemRequestTest(
            {
              redemptionVault,
              owner,
              mTBILL,
              mTokenToUsdDataFeed,
              isSafe: true,
              isAvgRate: true,
            },
            0,
            parseUnits('5.000001'),
          );
          await safeBulkApproveRequestTest(
            {
              redemptionVault,
              owner,
              mTBILL,
              mTokenToUsdDataFeed,
              isAvgRate: true,
            },
            [{ id: 1 }, { id: 1 }],
            parseUnits('5.00001'),
            { revertMessage: 'RV: request not pending' },
          );
        });

        it('should fail: process multiple requests, when one of them does not have instant part', async () => {
          const {
            owner,
            mockedAggregator,
            mockedAggregatorMToken,
            redemptionVault,
            stableCoins,
            mTBILL,
            dataFeed,
            mTokenToUsdDataFeed,
            requestRedeemer,
          } = await loadRvFixture();

          await mintToken(stableCoins.dai, requestRedeemer, 100000);
          await mintToken(stableCoins.dai, redemptionVault, 100000);
          await approveBase18(
            requestRedeemer,
            stableCoins.dai,
            redemptionVault,
            100000,
          );
          await mintToken(mTBILL, owner, 200);
          await approveBase18(owner, mTBILL, redemptionVault, 200);
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
            {
              redemptionVault,
              owner,
              mTBILL,
              mTokenToUsdDataFeed,
              instantShare: 50_00,
            },
            stableCoins.dai,
            100,
          );

          await redeemRequestTest(
            {
              redemptionVault,
              owner,
              mTBILL,
              mTokenToUsdDataFeed,
            },
            stableCoins.dai,
            100,
          );

          await safeBulkApproveRequestTest(
            {
              redemptionVault,
              owner,
              mTBILL,
              mTokenToUsdDataFeed,
              isAvgRate: true,
            },
            [{ id: 1 }, { id: 1 }],
            parseUnits('5.00001'),
            { revertMessage: 'RV: !amountMTokenInstant' },
          );
        });

        it('approve 1 request from vaut admin account', async () => {
          const {
            owner,
            mockedAggregator,
            mockedAggregatorMToken,
            redemptionVault,
            stableCoins,
            mTBILL,
            mTokenToUsdDataFeed,
            dataFeed,
            requestRedeemer,
          } = await loadRvFixture();

          await mintToken(stableCoins.dai, requestRedeemer, 100000);
          await mintToken(stableCoins.dai, redemptionVault, 100000);
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
            {
              redemptionVault,
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
              redemptionVault,
              owner,
              mTBILL,
              mTokenToUsdDataFeed,
              isAvgRate: true,
            },
            [{ id: requestId }],
            parseUnits('5.000001'),
          );
        });

        it('approve 2 request from vaut admin account', async () => {
          const {
            owner,
            mockedAggregator,
            mockedAggregatorMToken,
            redemptionVault,
            stableCoins,
            mTBILL,
            mTokenToUsdDataFeed,
            dataFeed,
            requestRedeemer,
          } = await loadRvFixture();

          await mintToken(stableCoins.dai, requestRedeemer, 100000);
          await mintToken(stableCoins.dai, redemptionVault, 100000);
          await approveBase18(
            requestRedeemer,
            stableCoins.dai,
            redemptionVault,
            100000,
          );
          await mintToken(mTBILL, owner, 200);
          await approveBase18(owner, mTBILL, redemptionVault, 200);
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
            {
              redemptionVault,
              owner,
              mTBILL,
              mTokenToUsdDataFeed,
              instantShare: 50_00,
            },
            stableCoins.dai,
            100,
          );

          await redeemRequestTest(
            {
              redemptionVault,
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
              redemptionVault,
              owner,
              mTBILL,
              mTokenToUsdDataFeed,
              isAvgRate: true,
            },
            [{ id: 1 }, { id: 0 }],
            parseUnits('5.000001'),
          );
        });

        it('approve 10 request from vaut admin account', async () => {
          const {
            owner,
            mockedAggregator,
            mockedAggregatorMToken,
            redemptionVault,
            stableCoins,
            mTBILL,
            mTokenToUsdDataFeed,
            dataFeed,
            requestRedeemer,
            regularAccounts,
          } = await loadRvFixture();

          await mintToken(stableCoins.dai, requestRedeemer, 100000);
          await mintToken(stableCoins.dai, redemptionVault, 100000);
          await approveBase18(
            requestRedeemer,
            stableCoins.dai,
            redemptionVault,
            100000,
          );
          await mintToken(mTBILL, owner, 1000);
          await approveBase18(owner, mTBILL, redemptionVault, 1000);
          await addPaymentTokenTest(
            { vault: redemptionVault, owner },
            stableCoins.dai,
            dataFeed.address,
            0,
            true,
          );

          await setRoundData({ mockedAggregator }, 1.03);
          await setRoundData({ mockedAggregator: mockedAggregatorMToken }, 5);

          for (let i = 0; i < 10; i++) {
            await redeemRequestTest(
              {
                redemptionVault,
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
              redemptionVault,
              owner,
              mTBILL,
              mTokenToUsdDataFeed,
              isAvgRate: true,
            },
            Array.from({ length: 10 }, (_, i) => ({ id: i })),
            parseUnits('5.000001'),
          );
        });

        it('approve 1 request when there is not enough liquidity', async () => {
          const {
            owner,
            mockedAggregator,
            mockedAggregatorMToken,
            redemptionVault,
            stableCoins,
            mTBILL,
            mTokenToUsdDataFeed,
            dataFeed,
            requestRedeemer,
          } = await loadRvFixture();

          await mintToken(stableCoins.dai, redemptionVault, 100000);
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
            {
              redemptionVault,
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
              redemptionVault,
              owner,
              mTBILL,
              mTokenToUsdDataFeed,
              isAvgRate: true,
            },
            [{ id: requestId, expectedToExecute: false }],
            parseUnits('5.000001'),
          );
        });

        it('approve 2 request when there is enough liquidity only for first one', async () => {
          const {
            owner,
            mockedAggregator,
            mockedAggregatorMToken,
            redemptionVault,
            stableCoins,
            mTBILL,
            mTokenToUsdDataFeed,
            dataFeed,
            requestRedeemer,
          } = await loadRvFixture();

          await mintToken(stableCoins.dai, requestRedeemer, 300);
          await mintToken(stableCoins.dai, redemptionVault, 600);

          await approveBase18(
            requestRedeemer,
            stableCoins.dai,
            redemptionVault,
            600,
          );
          await mintToken(mTBILL, owner, 200);
          await approveBase18(owner, mTBILL, redemptionVault, 200);
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
            {
              redemptionVault,
              owner,
              mTBILL,
              mTokenToUsdDataFeed,
              instantShare: 50_00,
            },
            stableCoins.dai,
            100,
          );
          await redeemRequestTest(
            {
              redemptionVault,
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
              redemptionVault,
              owner,
              mTBILL,
              mTokenToUsdDataFeed,
              isAvgRate: true,
            },
            [
              { id: 0, expectedToExecute: true },
              { id: 1, expectedToExecute: false },
            ],
            parseUnits('5.000001'),
          );
        });

        it('approve 2 requests both with different payment tokens', async () => {
          const {
            owner,
            mockedAggregator,
            mockedAggregatorMToken,
            redemptionVault,
            stableCoins,
            mTBILL,
            mTokenToUsdDataFeed,
            dataFeed,
            requestRedeemer,
          } = await loadRvFixture();

          await mintToken(stableCoins.dai, requestRedeemer, 100000);
          await mintToken(stableCoins.usdc, requestRedeemer, 100000);
          await mintToken(stableCoins.dai, redemptionVault, 100000);
          await mintToken(stableCoins.usdc, redemptionVault, 100000);
          await approveBase18(
            requestRedeemer,
            stableCoins.dai,
            redemptionVault,
            100000,
          );
          await approveBase18(
            requestRedeemer,
            stableCoins.usdc,
            redemptionVault,
            100000,
          );
          await mintToken(mTBILL, owner, 200);
          await approveBase18(owner, mTBILL, redemptionVault, 200);
          await addPaymentTokenTest(
            { vault: redemptionVault, owner },
            stableCoins.dai,
            dataFeed.address,
            0,
            true,
          );
          await addPaymentTokenTest(
            { vault: redemptionVault, owner },
            stableCoins.usdc,
            dataFeed.address,
            0,
            true,
          );
          await setRoundData({ mockedAggregator }, 1.03);
          await setRoundData({ mockedAggregator: mockedAggregatorMToken }, 5);

          await redeemRequestTest(
            {
              redemptionVault,
              owner,
              mTBILL,
              mTokenToUsdDataFeed,
              instantShare: 50_00,
            },
            stableCoins.dai,
            100,
          );

          await redeemRequestTest(
            {
              redemptionVault,
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
              redemptionVault,
              owner,
              mTBILL,
              mTokenToUsdDataFeed,
              isAvgRate: true,
            },
            [{ id: 1 }, { id: 0 }],
            parseUnits('5.000001'),
          );
        });

        it('approve 2 requests both with different payment tokens when there is not enough liquidity for first one', async () => {
          const {
            owner,
            mockedAggregator,
            mockedAggregatorMToken,
            redemptionVault,
            stableCoins,
            mTBILL,
            mTokenToUsdDataFeed,
            dataFeed,
            requestRedeemer,
          } = await loadRvFixture();

          await mintToken(stableCoins.usdc, requestRedeemer, 100000);
          await mintToken(stableCoins.usdc, redemptionVault, 100000);
          await mintToken(stableCoins.dai, redemptionVault, 100000);

          await approveBase18(
            requestRedeemer,
            stableCoins.usdc,
            redemptionVault,
            100000,
          );
          await mintToken(mTBILL, owner, 200);
          await approveBase18(owner, mTBILL, redemptionVault, 200);
          await addPaymentTokenTest(
            { vault: redemptionVault, owner },
            stableCoins.dai,
            dataFeed.address,
            0,
            true,
          );
          await addPaymentTokenTest(
            { vault: redemptionVault, owner },
            stableCoins.usdc,
            dataFeed.address,
            0,
            true,
          );
          await setRoundData({ mockedAggregator }, 1.03);
          await setRoundData({ mockedAggregator: mockedAggregatorMToken }, 5);

          await redeemRequestTest(
            {
              redemptionVault,
              owner,
              mTBILL,
              mTokenToUsdDataFeed,
              instantShare: 50_00,
            },
            stableCoins.dai,
            100,
          );

          await redeemRequestTest(
            {
              redemptionVault,
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
              redemptionVault,
              owner,
              mTBILL,
              mTokenToUsdDataFeed,
              isAvgRate: true,
            },
            [{ id: 1 }, { id: 0, expectedToExecute: false }],
            parseUnits('5.000001'),
          );
        });

        it('should succeed when other approve entrypoints are paused', async () => {
          const {
            owner,
            mockedAggregator,
            mockedAggregatorMToken,
            redemptionVault,
            stableCoins,
            mTBILL,
            mTokenToUsdDataFeed,
            dataFeed,
            requestRedeemer,
          } = await loadRvFixture();

          await mintToken(stableCoins.dai, requestRedeemer, 100000);
          await mintToken(stableCoins.dai, redemptionVault, 100000);
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
            {
              redemptionVault,
              owner,
              mTBILL,
              mTokenToUsdDataFeed,
              instantShare: 50_00,
            },
            stableCoins.dai,
            100,
          );
          const requestId = 0;

          await pauseOtherRedemptionApproveFns(
            redemptionVault,
            encodeFnSelector(
              'safeBulkApproveRequestAvgRate(uint256[],uint256)',
            ),
          );

          await safeBulkApproveRequestTest(
            {
              redemptionVault,
              owner,
              mTBILL,
              mTokenToUsdDataFeed,
              isAvgRate: true,
            },
            [{ id: requestId }],
            parseUnits('5.000001'),
          );
        });
      });

      describe('safeBulkApproveRequestAvgRate() (current price overload)', async () => {
        it('should fail: call from address without vault admin role', async () => {
          const {
            redemptionVault,
            regularAccounts,
            mTokenToUsdDataFeed,
            mTBILL,
          } = await loadRvFixture();
          await safeBulkApproveRequestTest(
            {
              redemptionVault,
              owner: regularAccounts[1],
              mTBILL,
              mTokenToUsdDataFeed,
              isAvgRate: true,
            },
            [{ id: 1 }],
            undefined,
            {
              revertMessage: acErrors.WMAC_HASNT_PERMISSION,
            },
          );
        });

        it('should fail: v1 stored request (version check)', async () => {
          const { owner, redemptionVault } = await loadRvFixture();

          const requestId = 0;
          await setV1RedeemRequestInStorage(redemptionVault, requestId, {
            sender: owner.address,
            tokenOut: constants.AddressZero,
            amountMToken: 1n,
            mTokenRate: 1n,
            tokenOutRate: 1n,
            status: 0,
          });

          await expect(
            redemptionVault
              .connect(owner)
              ['safeBulkApproveRequestAvgRate(uint256[])']([requestId]),
          ).to.be.revertedWith('RV: not v2 request');
        });

        it('should fail: when function is paused', async () => {
          const { owner, redemptionVault, mTBILL, mTokenToUsdDataFeed } =
            await loadRvFixture();

          await pauseVaultFn(
            redemptionVault,
            encodeFnSelector('safeBulkApproveRequestAvgRate(uint256[])'),
          );

          await safeBulkApproveRequestTest(
            {
              redemptionVault,
              owner,
              mTBILL,
              mTokenToUsdDataFeed,
              isAvgRate: true,
            },
            [{ id: 0 }],
            undefined,
            { revertMessage: 'Pausable: fn paused' },
          );
        });

        it('should fail: request by id not exist', async () => {
          const {
            owner,
            redemptionVault,
            stableCoins,
            mTBILL,
            dataFeed,
            mTokenToUsdDataFeed,
          } = await loadRvFixture();
          await addPaymentTokenTest(
            { vault: redemptionVault, owner },
            stableCoins.dai,
            dataFeed.address,
            0,
            true,
          );
          await safeBulkApproveRequestTest(
            {
              redemptionVault,
              owner,
              mTBILL,
              mTokenToUsdDataFeed,
              isAvgRate: true,
            },
            [{ id: 1 }],
            undefined,
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
            redemptionVault,
            stableCoins,
            mTBILL,
            dataFeed,
            mTokenToUsdDataFeed,
            requestRedeemer,
          } = await loadRvFixture();

          await mintToken(stableCoins.dai, requestRedeemer, 100000);
          await mintToken(stableCoins.dai, redemptionVault, 100000);
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
            {
              redemptionVault,
              owner,
              mTBILL,
              mTokenToUsdDataFeed,
              instantShare: 50_00,
            },
            stableCoins.dai,
            100,
          );
          await setRoundData({ mockedAggregator: mockedAggregatorMToken }, 6);

          const requestId = 0;

          await safeBulkApproveRequestTest(
            {
              redemptionVault,
              owner,
              mTBILL,
              mTokenToUsdDataFeed,
              isAvgRate: true,
            },
            [{ id: requestId }],
            undefined,
            { revertMessage: 'MV: exceed price diviation' },
          );
        });

        it('should fail: if new rate lower then variabilityTolerance', async () => {
          const {
            owner,
            mockedAggregator,
            mockedAggregatorMToken,
            redemptionVault,
            stableCoins,
            mTBILL,
            dataFeed,
            mTokenToUsdDataFeed,
            requestRedeemer,
          } = await loadRvFixture();

          await mintToken(stableCoins.dai, requestRedeemer, 100000);
          await mintToken(stableCoins.dai, redemptionVault, 100000);
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
            {
              redemptionVault,
              owner,
              mTBILL,
              mTokenToUsdDataFeed,
              instantShare: 50_00,
            },
            stableCoins.dai,
            100,
          );
          await setRoundData({ mockedAggregator: mockedAggregatorMToken }, 4);

          const requestId = 0;

          await safeBulkApproveRequestTest(
            {
              redemptionVault,
              owner,
              mTBILL,
              mTokenToUsdDataFeed,
              isAvgRate: true,
            },
            [{ id: requestId }],
            undefined,
            { revertMessage: 'MV: exceed price diviation' },
          );
        });

        it('should fail: request already processed', async () => {
          const {
            owner,
            mockedAggregator,
            mockedAggregatorMToken,
            redemptionVault,
            stableCoins,
            mTBILL,
            dataFeed,
            mTokenToUsdDataFeed,
            requestRedeemer,
          } = await loadRvFixture();

          await mintToken(stableCoins.dai, requestRedeemer, 100000);
          await mintToken(stableCoins.dai, redemptionVault, 100000);
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
            {
              redemptionVault,
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
              redemptionVault,
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
              redemptionVault,
              owner,
              mTBILL,
              mTokenToUsdDataFeed,
              isAvgRate: true,
            },
            [{ id: requestId }],
            undefined,
            { revertMessage: 'RV: request not pending' },
          );
        });

        it('should fail: process multiple requests, when one of them already precessed', async () => {
          const {
            owner,
            mockedAggregator,
            mockedAggregatorMToken,
            redemptionVault,
            stableCoins,
            mTBILL,
            dataFeed,
            mTokenToUsdDataFeed,
            requestRedeemer,
          } = await loadRvFixture();

          await mintToken(stableCoins.dai, requestRedeemer, 100000);
          await mintToken(stableCoins.dai, redemptionVault, 100000);
          await approveBase18(
            requestRedeemer,
            stableCoins.dai,
            redemptionVault,
            100000,
          );
          await mintToken(mTBILL, owner, 200);
          await approveBase18(owner, mTBILL, redemptionVault, 200);
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
            {
              redemptionVault,
              owner,
              mTBILL,
              mTokenToUsdDataFeed,
              instantShare: 50_00,
            },
            stableCoins.dai,
            100,
          );

          await redeemRequestTest(
            {
              redemptionVault,
              owner,
              mTBILL,
              mTokenToUsdDataFeed,
              instantShare: 50_00,
            },
            stableCoins.dai,
            100,
          );

          await approveRedeemRequestTest(
            {
              redemptionVault,
              owner,
              mTBILL,
              mTokenToUsdDataFeed,
              isSafe: true,
              isAvgRate: true,
            },
            0,
            parseUnits('5.000001'),
          );
          await safeBulkApproveRequestTest(
            {
              redemptionVault,
              owner,
              mTBILL,
              mTokenToUsdDataFeed,
              isAvgRate: true,
            },
            [{ id: 1 }, { id: 0 }],
            undefined,
            { revertMessage: 'RV: request not pending' },
          );
        });

        it('should fail: process multiple requests, when couple of them have equal id', async () => {
          const {
            owner,
            mockedAggregator,
            mockedAggregatorMToken,
            redemptionVault,
            stableCoins,
            mTBILL,
            dataFeed,
            mTokenToUsdDataFeed,
            requestRedeemer,
          } = await loadRvFixture();

          await mintToken(stableCoins.dai, requestRedeemer, 100000);
          await mintToken(stableCoins.dai, redemptionVault, 100000);
          await approveBase18(
            requestRedeemer,
            stableCoins.dai,
            redemptionVault,
            100000,
          );
          await mintToken(mTBILL, owner, 200);
          await approveBase18(owner, mTBILL, redemptionVault, 200);
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
            {
              redemptionVault,
              owner,
              mTBILL,
              mTokenToUsdDataFeed,
              instantShare: 50_00,
            },
            stableCoins.dai,
            100,
          );

          await redeemRequestTest(
            {
              redemptionVault,
              owner,
              mTBILL,
              mTokenToUsdDataFeed,
              instantShare: 50_00,
            },
            stableCoins.dai,
            100,
          );

          await approveRedeemRequestTest(
            {
              redemptionVault,
              owner,
              mTBILL,
              mTokenToUsdDataFeed,
              isSafe: true,
              isAvgRate: true,
            },
            0,
            parseUnits('5.000001'),
          );
          await safeBulkApproveRequestTest(
            {
              redemptionVault,
              owner,
              mTBILL,
              mTokenToUsdDataFeed,
              isAvgRate: true,
            },
            [{ id: 1 }, { id: 1 }],
            undefined,
            { revertMessage: 'RV: request not pending' },
          );
        });

        it('should fail: when one of the requests instant part is 0', async () => {
          const {
            owner,
            mockedAggregator,
            mockedAggregatorMToken,
            redemptionVault,
            stableCoins,
            mTBILL,
            dataFeed,
            mTokenToUsdDataFeed,
            requestRedeemer,
          } = await loadRvFixture();

          await mintToken(stableCoins.dai, requestRedeemer, 100000);
          await mintToken(stableCoins.dai, redemptionVault, 100000);
          await approveBase18(
            requestRedeemer,
            stableCoins.dai,
            redemptionVault,
            100000,
          );
          await mintToken(mTBILL, owner, 200);
          await approveBase18(owner, mTBILL, redemptionVault, 200);
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
            {
              redemptionVault,
              owner,
              mTBILL,
              mTokenToUsdDataFeed,
              instantShare: 50_00,
            },
            stableCoins.dai,
            100,
          );

          await redeemRequestTest(
            {
              redemptionVault,
              owner,
              mTBILL,
              mTokenToUsdDataFeed,
            },
            stableCoins.dai,
            100,
          );

          await safeBulkApproveRequestTest(
            {
              redemptionVault,
              owner,
              mTBILL,
              mTokenToUsdDataFeed,
              isAvgRate: true,
            },
            [{ id: 1 }, { id: 1 }],
            undefined,
            { revertMessage: 'RV: !amountMTokenInstant' },
          );
        });

        it('approve 1 request from vaut admin account', async () => {
          const {
            owner,
            mockedAggregator,
            mockedAggregatorMToken,
            redemptionVault,
            stableCoins,
            mTBILL,
            mTokenToUsdDataFeed,
            dataFeed,
            requestRedeemer,
          } = await loadRvFixture();

          await mintToken(stableCoins.dai, requestRedeemer, 100000);
          await mintToken(stableCoins.dai, redemptionVault, 100000);
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
            {
              redemptionVault,
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
              redemptionVault,
              owner,
              mTBILL,
              mTokenToUsdDataFeed,
              isAvgRate: true,
            },
            [{ id: requestId }],
            undefined,
          );
        });

        it('approve 1 request from vaut admin account when 10% growth is applied', async () => {
          const {
            owner,
            mockedAggregator,
            mockedAggregatorMToken,
            redemptionVault,
            stableCoins,
            mTBILL,
            mTokenToUsdDataFeed,
            dataFeed,
            requestRedeemer,
            customFeedGrowth,
          } = await loadRvFixture();

          await mTokenToUsdDataFeed.changeAggregator(customFeedGrowth.address);
          await setRoundDataGrowth({ owner, customFeedGrowth }, 1, -1000, 10);

          await mintToken(stableCoins.dai, requestRedeemer, 100000);
          await mintToken(stableCoins.dai, redemptionVault, 100000);
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
            {
              redemptionVault,
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
              redemptionVault,
              owner,
              mTBILL,
              mTokenToUsdDataFeed,
              isAvgRate: true,
            },
            [{ id: requestId }],
            undefined,
          );
        });

        it('approve 1 request from vaut admin account when -10% growth is applied', async () => {
          const {
            owner,
            mockedAggregator,
            mockedAggregatorMToken,
            redemptionVault,
            stableCoins,
            mTBILL,
            mTokenToUsdDataFeed,
            dataFeed,
            requestRedeemer,
            customFeedGrowth,
          } = await loadRvFixture();

          await mTokenToUsdDataFeed.changeAggregator(customFeedGrowth.address);
          await setMinGrowthApr({ owner, customFeedGrowth }, -10);
          await setRoundDataGrowth({ owner, customFeedGrowth }, 1, -1000, -10);

          await mintToken(stableCoins.dai, requestRedeemer, 100000);
          await mintToken(stableCoins.dai, redemptionVault, 100000);
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
            {
              redemptionVault,
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
              redemptionVault,
              owner,
              mTBILL,
              mTokenToUsdDataFeed,
              isAvgRate: true,
            },
            [{ id: requestId }],
            undefined,
          );
        });

        it('approve 2 request from vaut admin account', async () => {
          const {
            owner,
            mockedAggregator,
            mockedAggregatorMToken,
            redemptionVault,
            stableCoins,
            mTBILL,
            mTokenToUsdDataFeed,
            dataFeed,
            requestRedeemer,
          } = await loadRvFixture();

          await mintToken(stableCoins.dai, requestRedeemer, 100000);
          await mintToken(stableCoins.dai, redemptionVault, 100000);
          await approveBase18(
            requestRedeemer,
            stableCoins.dai,
            redemptionVault,
            100000,
          );
          await mintToken(mTBILL, owner, 200);
          await approveBase18(owner, mTBILL, redemptionVault, 200);
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
            {
              redemptionVault,
              owner,
              mTBILL,
              mTokenToUsdDataFeed,
              instantShare: 50_00,
            },
            stableCoins.dai,
            100,
          );

          await redeemRequestTest(
            {
              redemptionVault,
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
              redemptionVault,
              owner,
              mTBILL,
              mTokenToUsdDataFeed,
              isAvgRate: true,
            },
            [{ id: 1 }, { id: 0 }],
            undefined,
          );
        });

        it('approve 10 request from vaut admin account', async () => {
          const {
            owner,
            mockedAggregator,
            mockedAggregatorMToken,
            redemptionVault,
            stableCoins,
            mTBILL,
            mTokenToUsdDataFeed,
            dataFeed,
            requestRedeemer,
            regularAccounts,
          } = await loadRvFixture();

          await mintToken(stableCoins.dai, requestRedeemer, 100000);
          await mintToken(stableCoins.dai, redemptionVault, 100000);
          await approveBase18(
            requestRedeemer,
            stableCoins.dai,
            redemptionVault,
            100000,
          );
          await mintToken(mTBILL, owner, 1000);
          await approveBase18(owner, mTBILL, redemptionVault, 1000);
          await addPaymentTokenTest(
            { vault: redemptionVault, owner },
            stableCoins.dai,
            dataFeed.address,
            0,
            true,
          );

          await setRoundData({ mockedAggregator }, 1.03);
          await setRoundData({ mockedAggregator: mockedAggregatorMToken }, 5);

          for (let i = 0; i < 10; i++) {
            await redeemRequestTest(
              {
                redemptionVault,
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
              redemptionVault,
              owner,
              mTBILL,
              mTokenToUsdDataFeed,
              isAvgRate: true,
            },
            Array.from({ length: 10 }, (_, i) => ({ id: i })),
            undefined,
          );
        });

        it('approve 1 request when there is not enough liquidity', async () => {
          const {
            owner,
            mockedAggregator,
            mockedAggregatorMToken,
            redemptionVault,
            stableCoins,
            mTBILL,
            mTokenToUsdDataFeed,
            dataFeed,
            requestRedeemer,
          } = await loadRvFixture();

          await mintToken(stableCoins.dai, redemptionVault, 100000);
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
            {
              redemptionVault,
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
              redemptionVault,
              owner,
              mTBILL,
              mTokenToUsdDataFeed,
              isAvgRate: true,
            },
            [{ id: requestId, expectedToExecute: false }],
            undefined,
          );
        });

        it('approve 2 request when there is enough liquidity only for first one', async () => {
          const {
            owner,
            mockedAggregator,
            mockedAggregatorMToken,
            redemptionVault,
            stableCoins,
            mTBILL,
            mTokenToUsdDataFeed,
            dataFeed,
            requestRedeemer,
          } = await loadRvFixture();

          await mintToken(stableCoins.dai, requestRedeemer, 300);
          await mintToken(stableCoins.dai, redemptionVault, 1000);

          await approveBase18(
            requestRedeemer,
            stableCoins.dai,
            redemptionVault,
            600,
          );
          await mintToken(mTBILL, owner, 200);
          await approveBase18(owner, mTBILL, redemptionVault, 200);
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
            {
              redemptionVault,
              owner,
              mTBILL,
              mTokenToUsdDataFeed,
              instantShare: 50_00,
            },
            stableCoins.dai,
            100,
          );
          await redeemRequestTest(
            {
              redemptionVault,
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
              redemptionVault,
              owner,
              mTBILL,
              mTokenToUsdDataFeed,
              isAvgRate: true,
            },
            [
              { id: 0, expectedToExecute: true },
              { id: 1, expectedToExecute: false },
            ],
            undefined,
          );
        });

        it('approve 2 requests both with different payment tokens', async () => {
          const {
            owner,
            mockedAggregator,
            mockedAggregatorMToken,
            redemptionVault,
            stableCoins,
            mTBILL,
            mTokenToUsdDataFeed,
            dataFeed,
            requestRedeemer,
          } = await loadRvFixture();

          await mintToken(stableCoins.dai, requestRedeemer, 100000);
          await mintToken(stableCoins.usdc, requestRedeemer, 100000);
          await mintToken(stableCoins.dai, redemptionVault, 100000);
          await mintToken(stableCoins.usdc, redemptionVault, 100000);
          await approveBase18(
            requestRedeemer,
            stableCoins.dai,
            redemptionVault,
            100000,
          );
          await approveBase18(
            requestRedeemer,
            stableCoins.usdc,
            redemptionVault,
            100000,
          );
          await mintToken(mTBILL, owner, 200);
          await approveBase18(owner, mTBILL, redemptionVault, 200);
          await addPaymentTokenTest(
            { vault: redemptionVault, owner },
            stableCoins.dai,
            dataFeed.address,
            0,
            true,
          );
          await addPaymentTokenTest(
            { vault: redemptionVault, owner },
            stableCoins.usdc,
            dataFeed.address,
            0,
            true,
          );
          await setRoundData({ mockedAggregator }, 1.03);
          await setRoundData({ mockedAggregator: mockedAggregatorMToken }, 5);

          await redeemRequestTest(
            {
              redemptionVault,
              owner,
              mTBILL,
              mTokenToUsdDataFeed,
              instantShare: 50_00,
            },
            stableCoins.dai,
            100,
          );

          await redeemRequestTest(
            {
              redemptionVault,
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
              redemptionVault,
              owner,
              mTBILL,
              mTokenToUsdDataFeed,
              isAvgRate: true,
            },
            [{ id: 1 }, { id: 0 }],
            undefined,
          );
        });

        it('approve 2 requests both with different payment tokens when there is not enough liquidity for first one', async () => {
          const {
            owner,
            mockedAggregator,
            mockedAggregatorMToken,
            redemptionVault,
            stableCoins,
            mTBILL,
            mTokenToUsdDataFeed,
            dataFeed,
            requestRedeemer,
          } = await loadRvFixture();

          await mintToken(stableCoins.usdc, requestRedeemer, 100000);
          await mintToken(stableCoins.usdc, redemptionVault, 100000);
          await mintToken(stableCoins.dai, redemptionVault, 100000);
          await approveBase18(
            requestRedeemer,
            stableCoins.usdc,
            redemptionVault,
            100000,
          );
          await mintToken(mTBILL, owner, 200);
          await approveBase18(owner, mTBILL, redemptionVault, 200);
          await addPaymentTokenTest(
            { vault: redemptionVault, owner },
            stableCoins.dai,
            dataFeed.address,
            0,
            true,
          );
          await addPaymentTokenTest(
            { vault: redemptionVault, owner },
            stableCoins.usdc,
            dataFeed.address,
            0,
            true,
          );
          await setRoundData({ mockedAggregator }, 1.03);
          await setRoundData({ mockedAggregator: mockedAggregatorMToken }, 5);

          await redeemRequestTest(
            {
              redemptionVault,
              owner,
              mTBILL,
              mTokenToUsdDataFeed,
              instantShare: 50_00,
            },
            stableCoins.dai,
            100,
          );

          await redeemRequestTest(
            {
              redemptionVault,
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
              redemptionVault,
              owner,
              mTBILL,
              mTokenToUsdDataFeed,
              isAvgRate: true,
            },
            [{ id: 1 }, { id: 0, expectedToExecute: false }],
            undefined,
          );
        });

        it('should succeed when other approve entrypoints are paused', async () => {
          const {
            owner,
            mockedAggregator,
            mockedAggregatorMToken,
            redemptionVault,
            stableCoins,
            mTBILL,
            mTokenToUsdDataFeed,
            dataFeed,
            requestRedeemer,
          } = await loadRvFixture();

          await mintToken(stableCoins.dai, requestRedeemer, 100000);
          await mintToken(stableCoins.dai, redemptionVault, 100000);
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
            {
              redemptionVault,
              owner,
              mTBILL,
              mTokenToUsdDataFeed,
              instantShare: 50_00,
            },
            stableCoins.dai,
            100,
          );
          const requestId = 0;

          await pauseOtherRedemptionApproveFns(
            redemptionVault,
            encodeFnSelector('safeBulkApproveRequestAvgRate(uint256[])'),
          );

          await safeBulkApproveRequestTest(
            {
              redemptionVault,
              owner,
              mTBILL,
              mTokenToUsdDataFeed,
              isAvgRate: true,
            },
            [{ id: requestId }],
            undefined,
          );
        });
      });

      describe('rejectRequest()', async () => {
        it('should fail: call from address without vault admin role', async () => {
          const {
            redemptionVault,
            regularAccounts,
            mTokenToUsdDataFeed,
            mTBILL,
          } = await loadRvFixture();
          await rejectRedeemRequestTest(
            {
              redemptionVault,
              owner: regularAccounts[1],
              mTBILL,
              mTokenToUsdDataFeed,
            },
            1,
            {
              revertMessage: acErrors.WMAC_HASNT_PERMISSION,
            },
          );
        });

        it('should fail: when function is paused', async () => {
          const { owner, redemptionVault, mTokenToUsdDataFeed, mTBILL } =
            await loadRvFixture();

          await pauseVaultFn(
            redemptionVault,
            encodeFnSelector('rejectRequest(uint256)'),
          );

          await rejectRedeemRequestTest(
            { redemptionVault, owner, mTBILL, mTokenToUsdDataFeed },
            0,
            { revertMessage: 'Pausable: fn paused' },
          );
        });

        it('should fail: request by id not exist', async () => {
          const {
            owner,
            redemptionVault,
            stableCoins,
            mTBILL,
            dataFeed,
            mTokenToUsdDataFeed,
          } = await loadRvFixture();
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
            redemptionVault,
            stableCoins,
            mTBILL,
            dataFeed,
            mTokenToUsdDataFeed,
          } = await loadRvFixture();

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
            redemptionVault,
            stableCoins,
            mTBILL,
            mTokenToUsdDataFeed,
            dataFeed,
          } = await loadRvFixture();

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

      describe('redeemRequest() complex', () => {
        it('should fail: when is paused', async () => {
          const {
            redemptionVault,
            owner,
            mTBILL,
            stableCoins,
            regularAccounts,
            dataFeed,
            mTokenToUsdDataFeed,
          } = await loadRvFixture();

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
            redemptionVault,
            owner,
            mTBILL,
            stableCoins,
            dataFeed,
            mTokenToUsdDataFeed,
          } = await loadRvFixture();

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
            redemptionVault,
            mockedAggregator,
            mockedAggregatorMToken,
            owner,
            mTBILL,
            stableCoins,
            dataFeed,
            mTokenToUsdDataFeed,
            requestRedeemer,
          } = await loadRvFixture();
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
            redemptionVault,
            mockedAggregator,
            mockedAggregatorMToken,
            owner,
            mTBILL,
            stableCoins,
            dataFeed,
            mTokenToUsdDataFeed,
            requestRedeemer,
          } = await loadRvFixture();
          await addPaymentTokenTest(
            { vault: redemptionVault, owner },
            stableCoins.dai,
            dataFeed.address,
            0,
            true,
          );
          await setRoundData({ mockedAggregator }, 1);

          await mintToken(mTBILL, owner, 100_000);
          await mintToken(stableCoins.dai, requestRedeemer, 1000000);
          await approveBase18(
            requestRedeemer,
            stableCoins.dai,
            redemptionVault,
            1000000,
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
            {
              redemptionVault,
              owner,
              mTBILL,
              mTokenToUsdDataFeed,
              isSafe: true,
            },
            +requestId,
            parseUnits('1.000001'),
          );
        });

        it('call for amount == minAmount, then reject', async () => {
          const {
            redemptionVault,
            mockedAggregator,
            mockedAggregatorMToken,
            owner,
            mTBILL,
            stableCoins,
            dataFeed,
            mTokenToUsdDataFeed,
          } = await loadRvFixture();
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

      describe('loan operations', () => {
        const prepareTest = async (
          fixture: DefaultFixture,
          stableCoin: ERC20Mock,
          setupVault = true,
        ) => {
          const {
            redemptionVault,
            owner,
            mTBILL,
            mTokenLoan,
            loanLp,
            redemptionVaultLoanSwapper,
            dataFeed,
            mTokenToUsdDataFeed,
            mockedAggregator,
            mockedAggregatorMToken,
          } = fixture;

          await mintToken(mTBILL, owner, 100);
          await mintToken(mTokenLoan, loanLp, 1000);
          await approveBase18(loanLp, mTokenLoan, redemptionVault, 1000);
          await mintToken(stableCoin, redemptionVaultLoanSwapper, 1000);

          await approveBase18(loanLp, stableCoin, redemptionVault, 1000);

          if (setupVault) {
            await withdrawTest(
              { vault: redemptionVault, owner },
              stableCoin,
              await stableCoin.balanceOf(redemptionVault.address),
            );

            await addPaymentTokenTest(
              { vault: redemptionVault, owner },
              stableCoin,
              dataFeed.address,
              0,
              true,
            );

            await addPaymentTokenTest(
              { vault: redemptionVaultLoanSwapper, owner },
              stableCoin,
              dataFeed.address,
              0,
              true,
            );

            await setRoundData({ mockedAggregator: mockedAggregatorMToken }, 1);
            await setRoundData({ mockedAggregator }, 1);
          }

          await redeemInstantTest(
            { redemptionVault, owner, mTBILL, mTokenToUsdDataFeed },
            stableCoin,
            100,
          );
        };
        describe('bulkRepayLpLoanRequestTest()', () => {
          it('should fail: when function is paused', async () => {
            const fixture = await loadRvFixture();
            const { redemptionVault, owner, mTBILL } = fixture;

            await pauseVaultFn(
              redemptionVault,
              encodeFnSelector('bulkRepayLpLoanRequest(uint256[],uint64)'),
            );

            await bulkRepayLpLoanRequestTest(
              { redemptionVault, owner, mTBILL },
              [{ id: 0 }],
              0,
              { revertMessage: 'Pausable: fn paused' },
            );
          });

          it('approve 1 request', async () => {
            const fixture = await loadRvFixture();
            const {
              redemptionVault,
              owner,
              mTBILL,
              loanRepaymentAddress,
              stableCoins,
            } = fixture;

            await prepareTest(fixture, stableCoins.dai);

            await mintToken(stableCoins.dai, loanRepaymentAddress, 100);

            await approveBase18(
              loanRepaymentAddress,
              stableCoins.dai,
              redemptionVault,
              100,
            );

            await bulkRepayLpLoanRequestTest(
              { redemptionVault, owner, mTBILL },
              [{ id: 0 }],
            );
          });

          it('approve 2 request with same token out', async () => {
            const fixture = await loadRvFixture();
            const {
              redemptionVault,
              owner,
              mTBILL,
              loanRepaymentAddress,
              stableCoins,
            } = fixture;

            await prepareTest(fixture, stableCoins.dai);
            await prepareTest(fixture, stableCoins.dai, false);

            await mintToken(stableCoins.dai, loanRepaymentAddress, 200);

            await approveBase18(
              loanRepaymentAddress,
              stableCoins.dai,
              redemptionVault,
              200,
            );

            await bulkRepayLpLoanRequestTest(
              { redemptionVault, owner, mTBILL },
              [{ id: 0 }, { id: 1 }],
            );
          });

          it('approve 2 request with different token out', async () => {
            const fixture = await loadRvFixture();
            const {
              redemptionVault,
              owner,
              mTBILL,
              loanRepaymentAddress,
              stableCoins,
            } = fixture;

            await prepareTest(fixture, stableCoins.dai);
            await prepareTest(fixture, stableCoins.usdc);

            await mintToken(stableCoins.dai, loanRepaymentAddress, 200);
            await mintToken(stableCoins.usdc, loanRepaymentAddress, 200);

            await approveBase18(
              loanRepaymentAddress,
              stableCoins.dai,
              redemptionVault,
              100,
            );

            await approveBase18(
              loanRepaymentAddress,
              stableCoins.usdc,
              redemptionVault,
              100,
            );

            await bulkRepayLpLoanRequestTest(
              { redemptionVault, owner, mTBILL },
              [{ id: 0 }, { id: 1 }],
            );
          });

          it('approve 1 request when fee is zero and lp fee receiver is not set', async () => {
            const fixture = await loadRvFixture();
            const {
              redemptionVault,
              owner,
              mTBILL,
              loanRepaymentAddress,
              stableCoins,
            } = fixture;

            await setInstantFeeTest({ vault: redemptionVault, owner }, 0);

            await prepareTest(fixture, stableCoins.dai);

            await mintToken(stableCoins.dai, loanRepaymentAddress, 100);

            await approveBase18(
              loanRepaymentAddress,
              stableCoins.dai,
              redemptionVault,
              100,
            );

            await setLoanLpFeeReceiverTest(
              { redemptionVault, owner },
              ethers.constants.AddressZero,
            );

            await bulkRepayLpLoanRequestTest(
              { redemptionVault, owner, mTBILL },
              [{ id: 0 }],
            );
          });

          it('should fail: approve 1 request when fee is not zero and lp fee receiver is not set', async () => {
            const fixture = await loadRvFixture();
            const {
              redemptionVault,
              owner,
              mTBILL,
              loanRepaymentAddress,
              stableCoins,
            } = fixture;

            await prepareTest(fixture, stableCoins.dai);

            await mintToken(stableCoins.dai, loanRepaymentAddress, 100);

            await approveBase18(
              loanRepaymentAddress,
              stableCoins.dai,
              redemptionVault,
              100,
            );

            await setLoanLpFeeReceiverTest(
              { redemptionVault, owner },
              ethers.constants.AddressZero,
            );

            await bulkRepayLpLoanRequestTest(
              { redemptionVault, owner, mTBILL },
              [{ id: 0 }],
              0,
              {
                revertMessage: 'RV: !loanLpFeeReceiver',
              },
            );
          });

          it('should fail: when loan repayment address does not have enough balance', async () => {
            const fixture = await loadRvFixture();
            const {
              redemptionVault,
              owner,
              mTBILL,
              loanRepaymentAddress,
              stableCoins,
            } = fixture;

            await prepareTest(fixture, stableCoins.dai);

            await approveBase18(
              loanRepaymentAddress,
              stableCoins.dai,
              redemptionVault,
              100,
            );

            await bulkRepayLpLoanRequestTest(
              { redemptionVault, owner, mTBILL },
              [{ id: 0 }],
              0,
              {
                revertMessage: 'ERC20: transfer amount exceeds balance',
              },
            );
          });

          it('should fail: when loan repayment address does not have enough allowance', async () => {
            const fixture = await loadRvFixture();
            const {
              redemptionVault,
              owner,
              mTBILL,
              loanRepaymentAddress,
              stableCoins,
            } = fixture;

            await prepareTest(fixture, stableCoins.dai);

            await mintToken(stableCoins.dai, loanRepaymentAddress, 100);

            await bulkRepayLpLoanRequestTest(
              { redemptionVault, owner, mTBILL },
              [{ id: 0 }],
              0,
              {
                revertMessage: 'ERC20: insufficient allowance',
              },
            );
          });

          it('should fail: when loan repayment address have balance for lp transfer but not enough for fee transfer', async () => {
            const fixture = await loadRvFixture();
            const {
              redemptionVault,
              owner,
              mTBILL,
              loanRepaymentAddress,
              stableCoins,
            } = fixture;

            await setInstantFeeTest({ vault: redemptionVault, owner }, 100);
            await prepareTest(fixture, stableCoins.dai);

            await mintToken(stableCoins.dai, loanRepaymentAddress, 99);
            await approveBase18(
              loanRepaymentAddress,
              stableCoins.dai,
              redemptionVault,
              100,
            );

            await bulkRepayLpLoanRequestTest(
              { redemptionVault, owner, mTBILL },
              [{ id: 0 }],
              0,
              {
                revertMessage: 'ERC20: transfer amount exceeds balance',
              },
            );
          });

          it('should fail: request was already approved', async () => {
            const fixture = await loadRvFixture();
            const {
              redemptionVault,
              owner,
              mTBILL,
              loanRepaymentAddress,
              stableCoins,
            } = fixture;

            await prepareTest(fixture, stableCoins.dai);

            await mintToken(stableCoins.dai, loanRepaymentAddress, 100);
            await approveBase18(
              loanRepaymentAddress,
              stableCoins.dai,
              redemptionVault,
              100,
            );

            await bulkRepayLpLoanRequestTest(
              { redemptionVault, owner, mTBILL },
              [{ id: 0 }],
            );

            await bulkRepayLpLoanRequestTest(
              { redemptionVault, owner, mTBILL },
              [{ id: 0 }],
              0,
              {
                revertMessage: 'RV: request not pending',
              },
            );
          });

          it('should fail: request not exist', async () => {
            const fixture = await loadRvFixture();
            const { redemptionVault, owner, mTBILL } = fixture;

            await bulkRepayLpLoanRequestTest(
              { redemptionVault, owner, mTBILL },
              [{ id: 0 }],
              0,
              {
                revertMessage: 'RV: request not exist',
              },
            );
          });

          it('should fail: call from not vault admin', async () => {
            const fixture = await loadRvFixture();
            const {
              redemptionVault,
              owner,
              mTBILL,
              regularAccounts,
              stableCoins,
              loanRepaymentAddress,
            } = fixture;

            await prepareTest(fixture, stableCoins.dai);

            await mintToken(stableCoins.dai, loanRepaymentAddress, 100);
            await approveBase18(
              loanRepaymentAddress,
              stableCoins.dai,
              redemptionVault,
              100,
            );

            await bulkRepayLpLoanRequestTest(
              { redemptionVault, owner, mTBILL },
              [{ id: 0 }],
              0,
              {
                from: regularAccounts[0],
                revertMessage: acErrors.WMAC_HASNT_PERMISSION,
              },
            );
          });

          it('should fail: when loanApr > maxLoanApr', async () => {
            const fixture = await loadRvFixture();
            const {
              redemptionVault,
              owner,
              mTBILL,
              loanRepaymentAddress,
              stableCoins,
            } = fixture;

            await setMaxLoanAprTest({ redemptionVault, owner }, 100);
            await prepareTest(fixture, stableCoins.dai);

            await mintToken(stableCoins.dai, loanRepaymentAddress, 100);
            await approveBase18(
              loanRepaymentAddress,
              stableCoins.dai,
              redemptionVault,
              100,
            );

            await bulkRepayLpLoanRequestTest(
              { redemptionVault, owner, mTBILL },
              [{ id: 0 }],
              101,
              {
                revertMessage: 'RV: loanApr > maxLoanApr',
              },
            );
          });

          it('approve 1 request when loanApr is not zero but does not exceed instant fee', async () => {
            const fixture = await loadRvFixture();
            const {
              redemptionVault,
              owner,
              mTBILL,
              loanRepaymentAddress,
              stableCoins,
            } = fixture;

            await setInstantFeeTest({ vault: redemptionVault, owner }, 100);
            await setMaxLoanAprTest({ redemptionVault, owner }, 100);
            await prepareTest(fixture, stableCoins.dai);
            await increase(days(365));

            await mintToken(stableCoins.dai, loanRepaymentAddress, 101);
            await approveBase18(
              loanRepaymentAddress,
              stableCoins.dai,
              redemptionVault,
              101,
            );

            await bulkRepayLpLoanRequestTest(
              { redemptionVault, owner, mTBILL },
              [{ id: 0 }],
              50,
            );
          });

          it('approve 1 request when loanApr is not zero and exceeds instant fee', async () => {
            const fixture = await loadRvFixture();
            const {
              redemptionVault,
              owner,
              mTBILL,
              loanRepaymentAddress,
              stableCoins,
            } = fixture;

            await setInstantFeeTest({ vault: redemptionVault, owner }, 0);
            await setMaxLoanAprTest({ redemptionVault, owner }, 10000);
            await prepareTest(fixture, stableCoins.usdt);
            const request = await redemptionVault.loanRequests(0);
            await ethers.provider.send('evm_setNextBlockTimestamp', [
              request.createdAt.toNumber() + days(365),
            ]);

            await mintToken(stableCoins.usdt, loanRepaymentAddress, 1000);
            await approveBase18(
              loanRepaymentAddress,
              stableCoins.usdt,
              redemptionVault,
              1000,
            );

            await bulkRepayLpLoanRequestTest(
              { redemptionVault, owner, mTBILL },
              [{ id: 0 }],
              10000,
            );
          });

          it('approve 1 request when instant fee changed after request creation', async () => {
            const fixture = await loadRvFixture();
            const {
              redemptionVault,
              owner,
              mTBILL,
              loanRepaymentAddress,
              stableCoins,
            } = fixture;

            await setInstantFeeTest({ vault: redemptionVault, owner }, 200);
            await prepareTest(fixture, stableCoins.dai);
            await setInstantFeeTest({ vault: redemptionVault, owner }, 50);
            await setMaxLoanAprTest({ redemptionVault, owner }, 200);
            await increase(days(365));

            await mintToken(stableCoins.dai, loanRepaymentAddress, 102);
            await approveBase18(
              loanRepaymentAddress,
              stableCoins.dai,
              redemptionVault,
              102,
            );

            await bulkRepayLpLoanRequestTest(
              { redemptionVault, owner, mTBILL },
              [{ id: 0 }],
              100,
            );
          });

          it('approve 1 request when total fee exceeds actual repayment amount', async () => {
            const fixture = await loadRvFixture();
            const {
              redemptionVault,
              owner,
              mTBILL,
              loanRepaymentAddress,
              stableCoins,
            } = fixture;

            await setInstantFeeTest({ vault: redemptionVault, owner }, 0);
            await setMaxLoanAprTest({ redemptionVault, owner }, 20000);
            await prepareTest(fixture, stableCoins.usdt);
            const request = await redemptionVault.loanRequests(0);
            await ethers.provider.send('evm_setNextBlockTimestamp', [
              request.createdAt.toNumber() + days(365),
            ]);

            await mintToken(stableCoins.usdt, loanRepaymentAddress, 1000);
            await approveBase18(
              loanRepaymentAddress,
              stableCoins.usdt,
              redemptionVault,
              1000,
            );

            await bulkRepayLpLoanRequestTest(
              { redemptionVault, owner, mTBILL },
              [{ id: 0 }],
              20000,
            );
          });

          it('approve 2 request with same token out when loanApr is not zero', async () => {
            const fixture = await loadRvFixture();
            const {
              redemptionVault,
              owner,
              mTBILL,
              loanRepaymentAddress,
              stableCoins,
            } = fixture;

            await prepareTest(fixture, stableCoins.usdt);
            await prepareTest(fixture, stableCoins.usdt, false);
            await setInstantFeeTest({ vault: redemptionVault, owner }, 0);
            await setMaxLoanAprTest({ redemptionVault, owner }, 10000);

            const r0 = await redemptionVault.loanRequests(0);
            const r1 = await redemptionVault.loanRequests(1);
            await ethers.provider.send('evm_setNextBlockTimestamp', [
              Math.max(r0.createdAt.toNumber(), r1.createdAt.toNumber()) +
                days(365),
            ]);

            await mintToken(stableCoins.usdt, loanRepaymentAddress, 2000);
            await approveBase18(
              loanRepaymentAddress,
              stableCoins.usdt,
              redemptionVault,
              2000,
            );

            await bulkRepayLpLoanRequestTest(
              { redemptionVault, owner, mTBILL },
              [{ id: 0 }, { id: 1 }],
              10000,
            );
          });

          it('approve 2 request with different token out when loanApr is not zero', async () => {
            const fixture = await loadRvFixture();
            const {
              redemptionVault,
              owner,
              mTBILL,
              loanRepaymentAddress,
              stableCoins,
            } = fixture;

            await prepareTest(fixture, stableCoins.dai);
            await prepareTest(fixture, stableCoins.usdc);
            await setInstantFeeTest({ vault: redemptionVault, owner }, 0);
            await setMaxLoanAprTest({ redemptionVault, owner }, 10000);

            const r0 = await redemptionVault.loanRequests(0);
            const r1 = await redemptionVault.loanRequests(1);
            await ethers.provider.send('evm_setNextBlockTimestamp', [
              Math.max(r0.createdAt.toNumber(), r1.createdAt.toNumber()) +
                days(1),
            ]);

            await mintToken(stableCoins.dai, loanRepaymentAddress, 1000);
            await mintToken(stableCoins.usdc, loanRepaymentAddress, 1000);
            await approveBase18(
              loanRepaymentAddress,
              stableCoins.dai,
              redemptionVault,
              1000,
            );
            await approveBase18(
              loanRepaymentAddress,
              stableCoins.usdc,
              redemptionVault,
              1000,
            );

            await bulkRepayLpLoanRequestTest(
              { redemptionVault, owner, mTBILL },
              [{ id: 0 }, { id: 1 }],
              5000,
            );
          });

          it('approve 3 request with same token out when loanApr is not zero', async () => {
            const fixture = await loadRvFixture();
            const {
              redemptionVault,
              owner,
              mTBILL,
              loanRepaymentAddress,
              stableCoins,
            } = fixture;

            await prepareTest(fixture, stableCoins.usdt);
            await prepareTest(fixture, stableCoins.usdt, false);
            await prepareTest(fixture, stableCoins.usdt, false);
            await setInstantFeeTest({ vault: redemptionVault, owner }, 0);
            await setMaxLoanAprTest({ redemptionVault, owner }, 5000);

            const r0 = await redemptionVault.loanRequests(0);
            const r1 = await redemptionVault.loanRequests(1);
            const r2 = await redemptionVault.loanRequests(2);
            await ethers.provider.send('evm_setNextBlockTimestamp', [
              Math.max(
                r0.createdAt.toNumber(),
                r1.createdAt.toNumber(),
                r2.createdAt.toNumber(),
              ) + days(365),
            ]);

            await mintToken(stableCoins.usdt, loanRepaymentAddress, 5000);
            await approveBase18(
              loanRepaymentAddress,
              stableCoins.usdt,
              redemptionVault,
              5000,
            );

            await bulkRepayLpLoanRequestTest(
              { redemptionVault, owner, mTBILL },
              [{ id: 0 }, { id: 1 }, { id: 2 }],
              5000,
            );
          });
        });

        describe('cancelLpLoanRequest()', () => {
          const prepareCancelTest = async (
            fixture: DefaultFixture,
            stableCoin: ERC20Mock,
          ) => {
            const { redemptionVault, loanRepaymentAddress } = fixture;
            await prepareTest(fixture, stableCoin);
            await mintToken(stableCoin, loanRepaymentAddress, 100);
            await approveBase18(
              loanRepaymentAddress,
              stableCoin,
              redemptionVault,
              100,
            );
          };

          it('should fail: when function is paused', async () => {
            const fixture = await loadRvFixture();
            const { redemptionVault, owner, mTBILL } = fixture;

            await pauseVaultFn(
              redemptionVault,
              encodeFnSelector('cancelLpLoanRequest(uint256)'),
            );

            await cancelLpLoanRequestTest(
              { redemptionVault, owner, mTBILL },
              0,
              { revertMessage: 'Pausable: fn paused' },
            );
          });

          it('should cancel request', async () => {
            const fixture = await loadRvFixture();
            const { redemptionVault, owner, mTBILL, stableCoins } = fixture;

            await prepareCancelTest(fixture, stableCoins.dai);

            await cancelLpLoanRequestTest(
              { redemptionVault, owner, mTBILL },
              0,
            );
          });

          it('should fail: request not exist', async () => {
            const fixture = await loadRvFixture();
            const { redemptionVault, owner, mTBILL } = fixture;

            await cancelLpLoanRequestTest(
              { redemptionVault, owner, mTBILL },
              0,
              {
                revertMessage: 'RV: request not exist',
              },
            );
          });

          it('should fail: request already cancelled', async () => {
            const fixture = await loadRvFixture();
            const { redemptionVault, owner, mTBILL, stableCoins } = fixture;

            await prepareCancelTest(fixture, stableCoins.dai);

            await cancelLpLoanRequestTest(
              { redemptionVault, owner, mTBILL },
              0,
            );

            await cancelLpLoanRequestTest(
              { redemptionVault, owner, mTBILL },
              0,
              {
                revertMessage: 'RV: request not pending',
              },
            );
          });

          it('should fail: request was processed', async () => {
            const fixture = await loadRvFixture();
            const { redemptionVault, owner, mTBILL, stableCoins } = fixture;

            await prepareCancelTest(fixture, stableCoins.dai);
            await bulkRepayLpLoanRequestTest(
              { redemptionVault, owner, mTBILL },
              [{ id: 0 }],
            );

            await cancelLpLoanRequestTest(
              { redemptionVault, owner, mTBILL },
              0,
              {
                revertMessage: 'RV: request not pending',
              },
            );
          });

          it('should fail: call from not vault admin', async () => {
            const fixture = await loadRvFixture();
            const {
              redemptionVault,
              owner,
              mTBILL,
              stableCoins,
              regularAccounts,
            } = fixture;

            await prepareCancelTest(fixture, stableCoins.dai);
            await bulkRepayLpLoanRequestTest(
              { redemptionVault, owner, mTBILL },
              [{ id: 0 }],
            );

            await cancelLpLoanRequestTest(
              { redemptionVault, owner, mTBILL },
              0,
              {
                from: regularAccounts[0],
                revertMessage: acErrors.WMAC_HASNT_PERMISSION,
              },
            );
          });
        });
      });

      describe('_convertUsdToToken', () => {
        it('should fail: when amountUsd == 0', async () => {
          const { redemptionVault } = await loadRvFixture();

          await expect(
            redemptionVault.convertUsdToTokenTest(0, constants.AddressZero, 0),
          ).revertedWith('RV: amount zero');
        });

        it('should fail: when tokenRate == 0', async () => {
          const { redemptionVault } = await loadRvFixture();

          await redemptionVault.setOverrideGetTokenRate(true);
          await redemptionVault.setGetTokenRateValue(0);

          await expect(
            redemptionVault.convertUsdToTokenTest(
              1,
              redemptionVault.address,
              0,
            ),
          ).revertedWith('MV: rate zero');
        });
      });

      describe('_convertMTokenToUsd', () => {
        it('should fail: when amountMToken == 0', async () => {
          const { redemptionVault } = await loadRvFixture();

          await expect(
            redemptionVault.convertMTokenToUsdTest(0, 0),
          ).revertedWith('RV: amount zero');
        });

        it('should fail: when amountMToken == 0', async () => {
          const { redemptionVault } = await loadRvFixture();

          await redemptionVault.setOverrideGetTokenRate(true);
          await redemptionVault.setGetTokenRateValue(0);

          await expect(
            redemptionVault.convertMTokenToUsdTest(1, 0),
          ).revertedWith('MV: rate zero');
        });
      });

      describe('_calculateHoldbackPartRateFromAvg', () => {
        it('returns 0 when target total value is not above instant part (equality)', async () => {
          const { redemptionVault } = await loadRvFixture();
          const amountMToken = parseUnits('50');
          const amountMTokenInstant = parseUnits('50');
          const avgMTokenRate = parseUnits('1');
          const mTokenRate = parseUnits('200');
          const expected = expectedHoldbackPartRateFromAvg(
            BigInt(amountMToken.toString()),
            BigInt(amountMTokenInstant.toString()),
            BigInt(mTokenRate.toString()),
            BigInt(avgMTokenRate.toString()),
          );
          expect(expected).eq(0n);
          expect(
            await redemptionVault.calculateHoldbackPartRateFromAvgTest(
              amountMToken,
              amountMTokenInstant,
              mTokenRate,
              avgMTokenRate,
            ),
          ).eq(expected.toString());
        });

        it('returns 0 when avg rate implies lower target value than instant leg', async () => {
          const { redemptionVault } = await loadRvFixture();
          const amountMToken = parseUnits('100');
          const amountMTokenInstant = parseUnits('10');
          const avgMTokenRate = parseUnits('1');
          const mTokenRate = parseUnits('2000');
          const expected = expectedHoldbackPartRateFromAvg(
            BigInt(amountMToken.toString()),
            BigInt(amountMTokenInstant.toString()),
            BigInt(mTokenRate.toString()),
            BigInt(avgMTokenRate.toString()),
          );
          expect(expected).eq(0n);
          expect(
            await redemptionVault.calculateHoldbackPartRateFromAvgTest(
              amountMToken,
              amountMTokenInstant,
              mTokenRate,
              avgMTokenRate,
            ),
          ).eq(expected.toString());
        });

        it('returns 0 when amountMTokenInstant is 0 and avgMTokenRate is 0', async () => {
          const { redemptionVault } = await loadRvFixture();
          const amountMToken = parseUnits('100');
          const one = parseUnits('1');
          const expected = expectedHoldbackPartRateFromAvg(
            BigInt(amountMToken.toString()),
            0n,
            BigInt(one.toString()),
            0n,
          );
          expect(
            await redemptionVault.calculateHoldbackPartRateFromAvgTest(
              amountMToken,
              0,
              one,
              0,
            ),
          ).eq(expected.toString());
        });

        it('full holdback rate equals avg when no instant tranche', async () => {
          const { redemptionVault } = await loadRvFixture();
          const amountMToken = parseUnits('100');
          const avgMTokenRate = parseUnits('1.25');
          const expected = expectedHoldbackPartRateFromAvg(
            BigInt(amountMToken.toString()),
            0n,
            0n,
            BigInt(avgMTokenRate.toString()),
          );
          expect(
            await redemptionVault.calculateHoldbackPartRateFromAvgTest(
              amountMToken,
              0,
              0,
              avgMTokenRate,
            ),
          ).eq(expected.toString());
          expect(expected).eq(BigInt(avgMTokenRate.toString()));
        });

        it('applies integer rounding on the final rate', async () => {
          const { redemptionVault } = await loadRvFixture();
          const amountMToken = 3n;
          const amountMTokenInstant = 0n;
          const mTokenRate = 0n;
          const avgMTokenRate = parseUnits('2').div(3);
          const expected = expectedHoldbackPartRateFromAvg(
            amountMToken,
            amountMTokenInstant,
            mTokenRate,
            avgMTokenRate,
          );
          expect(
            await redemptionVault.calculateHoldbackPartRateFromAvgTest(
              amountMToken,
              amountMTokenInstant,
              mTokenRate,
              avgMTokenRate,
            ),
          ).eq(expected.toString());
        });

        it('succeeds with amountMToken == 0 when branch returns 0 before division', async () => {
          const { redemptionVault } = await loadRvFixture();
          const amountMTokenInstant = parseUnits('100');
          const mTokenRate = parseUnits('10');
          const avgMTokenRate = parseUnits('1');
          const expected = expectedHoldbackPartRateFromAvg(
            0n,
            BigInt(amountMTokenInstant.toString()),
            BigInt(mTokenRate.toString()),
            BigInt(avgMTokenRate.toString()),
          );
          expect(expected).eq(0n);
          expect(
            await redemptionVault.calculateHoldbackPartRateFromAvgTest(
              0,
              amountMTokenInstant,
              mTokenRate,
              avgMTokenRate,
            ),
          ).eq('0');
        });

        it('reverts when amountMToken == 0 but holdback part would be positive (division by zero)', async () => {
          const { redemptionVault } = await loadRvFixture();
          const amountMTokenInstant = parseUnits('100');
          const avgMTokenRate = parseUnits('2');
          const mTokenRate = parseUnits('1');
          await expect(
            redemptionVault.calculateHoldbackPartRateFromAvgTest(
              0,
              amountMTokenInstant,
              mTokenRate,
              avgMTokenRate,
            ),
          ).to.be.reverted;
        });

        it('matches reference for mixed instant and holdback with realistic WAD rates', async () => {
          const { redemptionVault } = await loadRvFixture();
          const amountMToken = parseUnits('70');
          const amountMTokenInstant = parseUnits('30');
          const avgMTokenRate = parseUnits('1');
          const mTokenRate = parseUnits('1');
          const expected = expectedHoldbackPartRateFromAvg(
            BigInt(amountMToken.toString()),
            BigInt(amountMTokenInstant.toString()),
            BigInt(mTokenRate.toString()),
            BigInt(avgMTokenRate.toString()),
          );
          expect(
            await redemptionVault.calculateHoldbackPartRateFromAvgTest(
              amountMToken,
              amountMTokenInstant,
              mTokenRate,
              avgMTokenRate,
            ),
          ).eq(expected.toString());
        });

        it('handles large values without overflow when inputs are bounded', async () => {
          const { redemptionVault } = await loadRvFixture();
          const amountMToken = 10n ** 30n * 6n;
          const amountMTokenInstant = 10n ** 30n * 4n;
          const avgMTokenRate = 10n ** 18n * 2n;
          const mTokenRate = 10n ** 18n * 5n;
          const expected = expectedHoldbackPartRateFromAvg(
            amountMToken,
            amountMTokenInstant,
            mTokenRate,
            avgMTokenRate,
          );
          expect(
            await redemptionVault.calculateHoldbackPartRateFromAvgTest(
              amountMToken,
              amountMTokenInstant,
              mTokenRate,
              avgMTokenRate,
            ),
          ).eq(expected.toString());
        });
      });

      describe('_calcAndValidateRedeem', () => {
        it('should fail: when amountMTokenIn == 0', async () => {
          const { redemptionVault, stableCoins, owner, dataFeed } =
            await loadRvFixture();

          await addPaymentTokenTest(
            { vault: redemptionVault, owner },
            stableCoins.dai,
            dataFeed.address,
            0,
            true,
          );

          await expect(
            redemptionVault.calcAndValidateRedeemTest(
              constants.AddressZero,
              stableCoins.dai.address,
              0,
              0,
              0,
              false,
              0,
              false,
            ),
          ).revertedWith('RV: invalid amount');
        });

        it('should override fee percent', async () => {
          const {
            redemptionVault,
            stableCoins,
            owner,
            dataFeed,
            mockedAggregatorMToken,
          } = await loadRvFixture();

          await addPaymentTokenTest(
            { vault: redemptionVault, owner },
            stableCoins.dai,
            dataFeed.address,
            0,
            true,
          );

          await setRoundData({ mockedAggregator: mockedAggregatorMToken }, 1);

          const result =
            await redemptionVault.callStatic.calcAndValidateRedeemTest(
              constants.AddressZero,
              stableCoins.dai.address,
              parseUnits('100'),
              0,
              0,
              true,
              10_00,
              false,
            );

          expect(result.feeAmount).eq(parseUnits('10'));
          expect(result.amountTokenOutWithoutFee).eq(parseUnits('90'));
        });

        it('should override token out rate and fee percent', async () => {
          const {
            redemptionVault,
            stableCoins,
            owner,
            dataFeed,
            mockedAggregatorMToken,
          } = await loadRvFixture();

          await addPaymentTokenTest(
            { vault: redemptionVault, owner },
            stableCoins.dai,
            dataFeed.address,
            0,
            true,
          );
          await setRoundData({ mockedAggregator: mockedAggregatorMToken }, 1);

          const result =
            await redemptionVault.callStatic.calcAndValidateRedeemTest(
              constants.AddressZero,
              stableCoins.dai.address,
              parseUnits('100'),
              0,
              parseUnits('2'),
              true,
              10_00,
              false,
            );

          expect(result.feeAmount).eq(parseUnits('5'));
          expect(result.amountTokenOutWithoutFee).eq(parseUnits('45'));
        });

        it('should override token out rate, mtoken rate and fee percent', async () => {
          const { redemptionVault, stableCoins, owner, dataFeed } =
            await loadRvFixture();

          await addPaymentTokenTest(
            { vault: redemptionVault, owner },
            stableCoins.dai,
            dataFeed.address,
            0,
            true,
          );

          const result =
            await redemptionVault.callStatic.calcAndValidateRedeemTest(
              constants.AddressZero,
              stableCoins.dai.address,
              parseUnits('100'),
              parseUnits('1'),
              parseUnits('2'),
              true,
              10_00,
              false,
            );

          expect(result.feeAmount).eq(parseUnits('5'));
          expect(result.amountTokenOutWithoutFee).eq(parseUnits('45'));
        });
      });
    });

    otherTests(rvFixture);
  });
};
