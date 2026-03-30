import { loadFixture } from '@nomicfoundation/hardhat-network-helpers';
import { expect } from 'chai';
import { constants } from 'ethers';
import { parseUnits } from 'ethers/lib/utils';
import { ethers } from 'hardhat';

import { encodeFnSelector } from '../../../helpers/utils';
import {
  ERC20Mock,
  ManageableVaultTester__factory,
  MBasisRedemptionVault__factory,
  Pausable,
  RedemptionVaultTest__factory,
} from '../../../typechain-types';
import { acErrors, blackList, greenList } from '../../common/ac.helpers';
import {
  approveBase18,
  mintToken,
  pauseVault,
  pauseVaultFn,
} from '../../common/common.helpers';
import {
  setMinGrowthApr,
  setRoundDataGrowth,
} from '../../common/custom-feed-growth.helpers';
import { setRoundData } from '../../common/data-feed.helpers';
import { DefaultFixture } from '../../common/fixtures';
import {
  addPaymentTokenTest,
  addWaivedFeeAccountTest,
  changeTokenAllowanceTest,
  removePaymentTokenTest,
  removeWaivedFeeAccountTest,
  setInstantFeeTest,
  setInstantDailyLimitTest,
  setMinAmountTest,
  setVariabilityToleranceTest,
  changeTokenFeeTest,
  setTokensReceiverTest,
  setFeeReceiverTest,
} from '../../common/manageable-vault.helpers';
import {
  approveRedeemRequestTest,
  bulkRepayLpLoanRequestTest,
  cancelLpLoanRequestTest,
  redeemFiatRequestTest,
  redeemInstantTest,
  redeemRequestTest,
  rejectRedeemRequestTest,
  safeApproveRedeemRequestTest,
  safeBulkApproveRequestTest,
  setFiatAdditionalFeeTest,
  setFiatFlatFeeTest,
  setLoanLpFeeReceiverTest,
  setLoanLpTest,
  setLoanSwapperVaultTest,
  setMinFiatRedeemAmountTest,
  setRequestRedeemerTest,
  withdrawTest,
} from '../../common/redemption-vault.helpers';
import { sanctionUser } from '../../common/with-sanctions-list.helpers';

const REDEMPTION_APPROVE_FN_SELECTORS = [
  encodeFnSelector('approveRequest(uint256,uint256)'),
  encodeFnSelector('safeApproveRequest(uint256,uint256)'),
  encodeFnSelector('safeBulkApproveRequestAtSavedRate(uint256[])'),
  encodeFnSelector('safeBulkApproveRequest(uint256[])'),
  encodeFnSelector('safeBulkApproveRequest(uint256[],uint256)'),
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
  rvKey:
    | 'redemptionVault'
    | 'redemptionVaultWithAave'
    | 'redemptionVaultWithMToken'
    | 'redemptionVaultWithUSTB'
    | 'redemptionVaultWithMorpho' = 'redemptionVault',
  deploymentAdditionalChecks: (fixtureRes: DefaultFixture) => Promise<void>,
  otherTests: (fixture: () => Promise<DefaultFixture>) => void,
) => {
  const loadRvFixture = async () => {
    const fixture = await loadFixture(rvFixture);

    return {
      ...fixture,
      redemptionVault: RedemptionVaultTest__factory.connect(
        fixture[rvKey].address,
        fixture.owner,
      ),
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
      expect(await redemptionVault.minFiatRedeemAmount()).eq(1000);

      expect(await redemptionVault.instantFee()).eq('100');

      expect(await redemptionVault.instantDailyLimit()).eq(
        parseUnits('100000'),
      );

      expect(await redemptionVault.mTokenDataFeed()).eq(
        mTokenToUsdDataFeed.address,
      );
      expect(await redemptionVault.variationTolerance()).eq(1);

      expect(await redemptionVault.vaultRole()).eq(
        roles.tokenRoles.mTBILL.redemptionVaultAdmin,
      );

      expect(await redemptionVault.MANUAL_FULLFILMENT_TOKEN()).eq(
        ethers.constants.AddressZero,
      );

      await deploymentAdditionalChecks(fixture);
    });

    describe('common', () => {
      it('failing deployment', async () => {
        const {
          redemptionVault,
          mTokenToUsdDataFeed,
          feeReceiver,
          tokensReceiver,
          mockedSanctionsList,
          requestRedeemer,
          accessControl,
          owner,
          mTBILL,
          loanLp,
          loanLpFeeReceiver,
          loanRepaymentAddress,
          redemptionVaultLoanSwapper,
        } = await loadRvFixture();

        const redemptionVaultUninitialized =
          await new RedemptionVaultTest__factory(owner).deploy();

        await expect(
          redemptionVaultUninitialized.initialize(
            {
              ac: ethers.constants.AddressZero,
              sanctionsList: mockedSanctionsList.address,
              variationTolerance: 1,
              minAmount: parseUnits('100'),
            },
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
            {
              fiatAdditionalFee: 100,
              fiatFlatFee: parseUnits('1'),
              minFiatRedeemAmount: parseUnits('100'),
              requestRedeemer: requestRedeemer.address,
              loanLp: loanLp.address,
              loanLpFeeReceiver: loanLpFeeReceiver.address,
              loanRepaymentAddress: loanRepaymentAddress.address,
              loanSwapperVault: redemptionVaultLoanSwapper.address,
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
            },
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
            {
              fiatAdditionalFee: 100,
              fiatFlatFee: parseUnits('1'),
              minFiatRedeemAmount: parseUnits('100'),
              requestRedeemer: requestRedeemer.address,
              loanLp: loanLp.address,
              loanLpFeeReceiver: loanLpFeeReceiver.address,
              loanRepaymentAddress: loanRepaymentAddress.address,
              loanSwapperVault: redemptionVaultLoanSwapper.address,
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
            },
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
            {
              fiatAdditionalFee: 100,
              fiatFlatFee: parseUnits('1'),
              minFiatRedeemAmount: parseUnits('100'),
              requestRedeemer: requestRedeemer.address,
              loanLp: loanLp.address,
              loanLpFeeReceiver: loanLpFeeReceiver.address,
              loanRepaymentAddress: loanRepaymentAddress.address,
              loanSwapperVault: redemptionVaultLoanSwapper.address,
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
            },
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
            {
              fiatAdditionalFee: 100,
              fiatFlatFee: parseUnits('1'),
              minFiatRedeemAmount: parseUnits('100'),
              requestRedeemer: requestRedeemer.address,
              loanLp: loanLp.address,
              loanLpFeeReceiver: loanLpFeeReceiver.address,
              loanRepaymentAddress: loanRepaymentAddress.address,
              loanSwapperVault: redemptionVaultLoanSwapper.address,
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
            },
            {
              mToken: mTBILL.address,
              mTokenDataFeed: mTokenToUsdDataFeed.address,
            },
            {
              feeReceiver: feeReceiver.address,
              tokensReceiver: tokensReceiver.address,
            },
            {
              instantFee: 10001,
              instantDailyLimit: parseUnits('100000'),
            },
            {
              fiatAdditionalFee: 100,
              fiatFlatFee: parseUnits('1'),
              minFiatRedeemAmount: parseUnits('100'),
              requestRedeemer: requestRedeemer.address,
              loanLp: loanLp.address,
              loanLpFeeReceiver: loanLpFeeReceiver.address,
              loanRepaymentAddress: loanRepaymentAddress.address,
              loanSwapperVault: redemptionVaultLoanSwapper.address,
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
            },
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
            {
              fiatAdditionalFee: 10001,
              fiatFlatFee: parseUnits('1'),
              minFiatRedeemAmount: parseUnits('100'),
              requestRedeemer: requestRedeemer.address,
              loanLp: loanLp.address,
              loanLpFeeReceiver: loanLpFeeReceiver.address,
              loanRepaymentAddress: loanRepaymentAddress.address,
              loanSwapperVault: redemptionVaultLoanSwapper.address,
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
            },
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
            {
              fiatAdditionalFee: 100,
              fiatFlatFee: parseUnits('1'),
              minFiatRedeemAmount: parseUnits('100'),
              requestRedeemer: constants.AddressZero,
              loanLp: loanLp.address,
              loanLpFeeReceiver: loanLpFeeReceiver.address,
              loanRepaymentAddress: loanRepaymentAddress.address,
              loanSwapperVault: redemptionVaultLoanSwapper.address,
            },
          ),
        ).to.be.reverted;

        await expect(
          redemptionVault.initializeWithoutInitializer(
            {
              ac: ethers.constants.AddressZero,
              sanctionsList: mockedSanctionsList.address,
              variationTolerance: 1,
              minAmount: parseUnits('100'),
            },
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
            {
              fiatAdditionalFee: 100,
              fiatFlatFee: parseUnits('1'),
              minFiatRedeemAmount: parseUnits('100'),
              requestRedeemer: requestRedeemer.address,
              loanLp: loanLp.address,
              loanLpFeeReceiver: loanLpFeeReceiver.address,
              loanRepaymentAddress: loanRepaymentAddress.address,
              loanSwapperVault: redemptionVaultLoanSwapper.address,
            },
          ),
        ).to.be.revertedWith('Initializable: contract is not initializing');
      });

      describe('MBasisRedemptionVault', () => {
        describe('deployment', () => {
          it('vaultRole', async () => {
            const fixture = await loadRvFixture();

            const tester = await new MBasisRedemptionVault__factory(
              fixture.owner,
            ).deploy();

            expect(await tester.vaultRole()).eq(
              await tester.M_BASIS_REDEMPTION_VAULT_ADMIN_ROLE(),
            );
          });
        });
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
              },
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
              {
                fiatAdditionalFee: 0,
                fiatFlatFee: 0,
                minFiatRedeemAmount: 0,
                requestRedeemer: constants.AddressZero,
                loanLp: constants.AddressZero,
                loanLpFeeReceiver: constants.AddressZero,
                loanRepaymentAddress: constants.AddressZero,
                loanSwapperVault: constants.AddressZero,
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
              },
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
              },
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
              },
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
              },
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
              },
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
              },
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
            ),
          ).revertedWith('fee == 0');
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
          await setInstantDailyLimitTest(
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
              revertMessage: 'WMAC: hasnt role',
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
              revertMessage: 'WMAC: hasnt role',
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

        it('should fail: user try to instant redeem fiat', async () => {
          const {
            owner,
            redemptionVault,
            stableCoins,
            mTBILL,
            mTokenToUsdDataFeed,
            dataFeed,
          } = await loadRvFixture();

          await mintToken(mTBILL, owner, 100);
          await approveBase18(owner, mTBILL, redemptionVault, 100);

          await addPaymentTokenTest(
            { vault: redemptionVault, owner },
            stableCoins.dai,
            dataFeed.address,
            100,
            true,
          );

          await redeemInstantTest(
            { redemptionVault, owner, mTBILL, mTokenToUsdDataFeed },
            await redemptionVault.MANUAL_FULLFILMENT_TOKEN(),
            100,
            {
              revertMessage: 'MV: token not exists',
            },
          );
        });

        it('should fail: user try to instant redeem fiat', async () => {
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

          await redeemInstantTest(
            { redemptionVault, owner, mTBILL, mTokenToUsdDataFeed },
            stableCoins.dai,
            100,
            {
              from: regularAccounts[0],
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
              revertMessage: acErrors.WMAC_HASNT_ROLE,
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
      });

      describe('setMinAmount()', () => {
        it('should fail: call from address without DEPOSIT_VAULT_ADMIN_ROLE role', async () => {
          const { owner, redemptionVault, regularAccounts } = await loadFixture(
            rvFixture,
          );

          await setMinAmountTest({ vault: redemptionVault, owner }, 1.1, {
            from: regularAccounts[0],
            revertMessage: acErrors.WMAC_HASNT_ROLE,
          });
        });

        it('call from address with DEPOSIT_VAULT_ADMIN_ROLE role', async () => {
          const { owner, redemptionVault } = await loadRvFixture();
          await setMinAmountTest({ vault: redemptionVault, owner }, 1.1);
        });
      });

      describe('setMinFiatRedeemAmount()', () => {
        it('should fail: call from address without REDEMPTION_VAULT_ADMIN_ROLE role', async () => {
          const { owner, redemptionVault, regularAccounts } = await loadFixture(
            rvFixture,
          );

          await setMinFiatRedeemAmountTest({ redemptionVault, owner }, 1.1, {
            from: regularAccounts[0],
            revertMessage: acErrors.WMAC_HASNT_ROLE,
          });
        });

        it('call from address with REDEMPTION_VAULT_ADMIN_ROLE role', async () => {
          const { owner, redemptionVault } = await loadRvFixture();
          await setMinFiatRedeemAmountTest({ redemptionVault, owner }, 1.1);
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
              revertMessage: acErrors.WMAC_HASNT_ROLE,
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
      });

      describe('sanctionsListAdminRole()', () => {
        it('should return same role as vaultRole()', async () => {
          const { redemptionVault } = await loadRvFixture();
          const vaultRole = await redemptionVault.vaultRole();
          const sanctionsListAdminRole =
            await redemptionVault.sanctionsListAdminRole();

          expect(sanctionsListAdminRole).eq(vaultRole);
        });
      });

      describe('setFiatFlatFee()', () => {
        it('should fail: call from address without REDEMPTION_VAULT_ADMIN_ROLE role', async () => {
          const { owner, redemptionVault, regularAccounts } = await loadFixture(
            rvFixture,
          );

          await setFiatFlatFeeTest({ redemptionVault, owner }, 100, {
            from: regularAccounts[0],
            revertMessage: acErrors.WMAC_HASNT_ROLE,
          });
        });

        it('call from address with REDEMPTION_VAULT_ADMIN_ROLE role', async () => {
          const { owner, redemptionVault } = await loadRvFixture();
          await setFiatFlatFeeTest({ redemptionVault, owner }, 100);
        });
      });

      describe('setFiatAdditionalFee()', () => {
        it('should fail: call from address without REDEMPTION_VAULT_ADMIN_ROLE role', async () => {
          const { owner, redemptionVault, regularAccounts } = await loadFixture(
            rvFixture,
          );

          await setFiatAdditionalFeeTest({ redemptionVault, owner }, 100, {
            from: regularAccounts[0],
            revertMessage: acErrors.WMAC_HASNT_ROLE,
          });
        });

        it('call from address with REDEMPTION_VAULT_ADMIN_ROLE role', async () => {
          const { owner, redemptionVault } = await loadRvFixture();
          await setFiatAdditionalFeeTest({ redemptionVault, owner }, 100);
        });
      });

      describe('setInstantDailyLimit()', () => {
        it('should fail: call from address without REDEMPTION_VAULT_ADMIN_ROLE role', async () => {
          const { owner, redemptionVault, regularAccounts } = await loadFixture(
            rvFixture,
          );

          await setInstantDailyLimitTest(
            { vault: redemptionVault, owner },
            parseUnits('1000'),
            {
              from: regularAccounts[0],
              revertMessage: acErrors.WMAC_HASNT_ROLE,
            },
          );
        });

        it('should fail: try to set 0 limit', async () => {
          const { owner, redemptionVault } = await loadRvFixture();

          await setInstantDailyLimitTest(
            { vault: redemptionVault, owner },
            constants.Zero,
            {
              revertMessage: 'MV: limit zero',
            },
          );
        });

        it('call from address with REDEMPTION_VAULT_ADMIN_ROLE role', async () => {
          const { owner, redemptionVault } = await loadRvFixture();
          await setInstantDailyLimitTest(
            { vault: redemptionVault, owner },
            parseUnits('1000'),
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
              revertMessage: acErrors.WMAC_HASNT_ROLE,
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
              revertMessage: acErrors.WMAC_HASNT_ROLE,
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
              revertMessage: acErrors.WMAC_HASNT_ROLE,
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
              revertMessage: acErrors.WMAC_HASNT_ROLE,
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
              revertMessage: acErrors.WMAC_HASNT_ROLE,
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
              revertMessage: acErrors.WMAC_HASNT_ROLE,
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
              revertMessage: acErrors.WMAC_HASNT_ROLE,
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
              revertMessage: acErrors.WMAC_HASNT_ROLE,
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
              revertMessage: acErrors.WMAC_HASNT_ROLE,
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
              revertMessage: acErrors.WMAC_HASNT_ROLE,
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
          ).to.be.revertedWith('WMAC: hasnt role');
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
              revertMessage: acErrors.WMAC_HASNT_ROLE,
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
              revertMessage: acErrors.WMAC_HASNT_ROLE,
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
      });

      describe('redeemRequest()', () => {
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
              revertMessage: 'WMAC: hasnt role',
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
              revertMessage: 'WMAC: hasnt role',
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

        it('should fail: user try to redeem fiat in basic request (custom recipient overload)', async () => {
          const {
            owner,
            redemptionVault,
            stableCoins,
            mTBILL,
            mTokenToUsdDataFeed,
            dataFeed,
            customRecipient,
          } = await loadRvFixture();

          await mintToken(mTBILL, owner, 100);
          await approveBase18(owner, mTBILL, redemptionVault, 100);

          await addPaymentTokenTest(
            { vault: redemptionVault, owner },
            stableCoins.dai,
            dataFeed.address,
            100,
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
            await redemptionVault.MANUAL_FULLFILMENT_TOKEN(),
            100,
            {
              revertMessage: 'RV: tokenOut == fiat',
            },
          );
        });

        it('should fail: user try to redeem fiat in basic request', async () => {
          const {
            owner,
            redemptionVault,
            stableCoins,
            mTBILL,
            mTokenToUsdDataFeed,
            dataFeed,
          } = await loadRvFixture();

          await mintToken(mTBILL, owner, 100);
          await approveBase18(owner, mTBILL, redemptionVault, 100);

          await addPaymentTokenTest(
            { vault: redemptionVault, owner },
            stableCoins.dai,
            dataFeed.address,
            100,
            true,
          );

          await redeemRequestTest(
            { redemptionVault, owner, mTBILL, mTokenToUsdDataFeed },
            await redemptionVault.MANUAL_FULLFILMENT_TOKEN(),
            100,
            {
              revertMessage: 'RV: tokenOut == fiat',
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

      describe('redeemFiatRequest()', () => {
        it('should fail: when trying to redeem 0 amount', async () => {
          const {
            owner,
            redemptionVault,
            mTBILL,
            mTokenToUsdDataFeed,
            regularAccounts,
            greenListableTester,
            accessControl,
          } = await loadRvFixture();
          await greenList(
            { greenlistable: greenListableTester, accessControl, owner },
            regularAccounts[0],
          );
          await redeemFiatRequestTest(
            { redemptionVault, owner, mTBILL, mTokenToUsdDataFeed },
            0,
            {
              from: regularAccounts[0],
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
          const selector = encodeFnSelector('redeemFiatRequest(uint256)');
          await pauseVaultFn(redemptionVault, selector);
          await redeemFiatRequestTest(
            { redemptionVault, owner, mTBILL, mTokenToUsdDataFeed },
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
            mTBILL,
            mTokenToUsdDataFeed,
            greenListableTester,
            accessControl,
          } = await loadRvFixture();

          await greenList(
            { greenlistable: greenListableTester, accessControl, owner },
            owner,
          );

          await approveBase18(owner, mTBILL, redemptionVault, 100);
          await redeemFiatRequestTest(
            { redemptionVault, owner, mTBILL, mTokenToUsdDataFeed },

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
            mTBILL,
            mockedAggregatorMToken,
            mTokenToUsdDataFeed,
            greenListableTester,
            accessControl,
          } = await loadRvFixture();

          await greenList(
            { greenlistable: greenListableTester, accessControl, owner },
            owner,
          );

          await mintToken(mTBILL, owner, 100_000);
          await setRoundData({ mockedAggregator: mockedAggregatorMToken }, 0);
          await redeemFiatRequestTest(
            { redemptionVault, owner, mTBILL, mTokenToUsdDataFeed },
            10,
            {
              revertMessage: 'DF: feed is deprecated',
            },
          );
        });

        it('should fail: call for amount < minFiatRedeemAmount', async () => {
          const {
            redemptionVault,
            owner,
            mTBILL,
            mTokenToUsdDataFeed,
            greenListableTester,
            accessControl,
          } = await loadRvFixture();

          await greenList(
            { greenlistable: greenListableTester, accessControl, owner },
            owner,
          );

          await mintToken(mTBILL, owner, 100_000);
          await approveBase18(owner, mTBILL, redemptionVault, 100_000);

          await setMinFiatRedeemAmountTest({ redemptionVault, owner }, 100_000);

          await redeemFiatRequestTest(
            { redemptionVault, owner, mTBILL, mTokenToUsdDataFeed },
            99_999,
            {
              revertMessage: 'RV: amount < min',
            },
          );
        });

        it('should fail: greenlist enabled and user not in greenlist ', async () => {
          const { owner, redemptionVault, mTBILL, mTokenToUsdDataFeed } =
            await loadRvFixture();

          await redemptionVault.setGreenlistEnable(true);

          await redeemFiatRequestTest(
            { redemptionVault, owner, mTBILL, mTokenToUsdDataFeed },
            1,
            {
              revertMessage: 'WMAC: hasnt role',
            },
          );
        });

        it('should fail: user in blacklist ', async () => {
          const {
            owner,
            redemptionVault,
            mTBILL,
            mTokenToUsdDataFeed,
            blackListableTester,
            regularAccounts,
            greenListableTester,
            accessControl,
          } = await loadRvFixture();

          await greenList(
            { greenlistable: greenListableTester, accessControl, owner },
            regularAccounts[0],
          );

          await blackList(
            { blacklistable: blackListableTester, accessControl, owner },
            regularAccounts[0],
          );

          await redeemFiatRequestTest(
            { redemptionVault, owner, mTBILL, mTokenToUsdDataFeed },
            1,
            {
              from: regularAccounts[0],
              revertMessage: acErrors.WMAC_HAS_ROLE,
            },
          );
        });

        it('should fail: call with insufficient allowance', async () => {
          const {
            owner,
            redemptionVault,
            mTBILL,
            mTokenToUsdDataFeed,
            greenListableTester,
            accessControl,
          } = await loadRvFixture();

          await greenList(
            { greenlistable: greenListableTester, accessControl, owner },
            owner,
          );

          await mintToken(mTBILL, owner, 100);
          await redeemFiatRequestTest(
            { redemptionVault, owner, mTBILL, mTokenToUsdDataFeed },
            100,
            {
              revertMessage: 'ERC20: insufficient allowance',
            },
          );
        });

        it('should fail: user in sanctions list', async () => {
          const {
            owner,
            redemptionVault,
            mTBILL,
            mTokenToUsdDataFeed,
            regularAccounts,
            mockedSanctionsList,
            greenListableTester,
            accessControl,
          } = await loadRvFixture();

          await greenList(
            { greenlistable: greenListableTester, accessControl, owner },
            regularAccounts[0],
          );

          await sanctionUser(
            { sanctionsList: mockedSanctionsList },
            regularAccounts[0],
          );

          await redeemFiatRequestTest(
            { redemptionVault, owner, mTBILL, mTokenToUsdDataFeed },
            1,
            {
              from: regularAccounts[0],
              revertMessage: 'WSL: sanctioned',
            },
          );
        });

        it('redeem fiat request 100 mTBILL, greenlist enabled and user in greenlist ', async () => {
          const {
            owner,
            redemptionVault,
            mTBILL,
            mTokenToUsdDataFeed,
            regularAccounts,
            greenListableTester,
            accessControl,
          } = await loadRvFixture();

          await greenList(
            { greenlistable: greenListableTester, accessControl, owner },
            owner,
          );

          await redemptionVault.setGreenlistEnable(true);

          await greenList(
            { greenlistable: greenListableTester, accessControl, owner },
            regularAccounts[0],
          );

          await mintToken(mTBILL, regularAccounts[0], 100);
          await approveBase18(regularAccounts[0], mTBILL, redemptionVault, 100);

          await redeemFiatRequestTest(
            { redemptionVault, owner, mTBILL, mTokenToUsdDataFeed },
            100,
            {
              from: regularAccounts[0],
            },
          );
        });

        it('redeem fiat request 100 mTBILL, when price of stable is 1.03$ and mToken price is 5$', async () => {
          const {
            owner,
            mockedAggregator,
            mockedAggregatorMToken,
            redemptionVault,
            mTBILL,
            mTokenToUsdDataFeed,
            greenListableTester,
            accessControl,
          } = await loadRvFixture();

          await greenList(
            { greenlistable: greenListableTester, accessControl, owner },
            owner,
          );

          await mintToken(mTBILL, owner, 100);
          await approveBase18(owner, mTBILL, redemptionVault, 100);

          await setRoundData({ mockedAggregator }, 1.03);
          await setRoundData({ mockedAggregator: mockedAggregatorMToken }, 5);

          await redeemFiatRequestTest(
            { redemptionVault, owner, mTBILL, mTokenToUsdDataFeed },
            100,
          );
        });

        it('redeem fiat request 100 mTBILL, when price of stable is 1.03$ and mToken price is 5$ and token fee 1%', async () => {
          const {
            owner,
            mockedAggregator,
            mockedAggregatorMToken,
            redemptionVault,
            mTBILL,
            mTokenToUsdDataFeed,
            greenListableTester,
            accessControl,
          } = await loadRvFixture();

          await greenList(
            { greenlistable: greenListableTester, accessControl, owner },
            owner,
          );

          await mintToken(mTBILL, owner, 100);
          await approveBase18(owner, mTBILL, redemptionVault, 100);

          await setRoundData({ mockedAggregator }, 1.03);
          await setRoundData({ mockedAggregator: mockedAggregatorMToken }, 5);
          await redeemFiatRequestTest(
            { redemptionVault, owner, mTBILL, mTokenToUsdDataFeed },
            100,
          );
        });

        it('redeem fiat request 100 mTBILL, when price of stable is 1.03$ and mToken price is 5$ without checking of minDepositAmount', async () => {
          const {
            owner,
            mockedAggregator,
            mockedAggregatorMToken,
            redemptionVault,
            mTBILL,
            mTokenToUsdDataFeed,
            greenListableTester,
            accessControl,
          } = await loadRvFixture();

          await greenList(
            { greenlistable: greenListableTester, accessControl, owner },
            owner,
          );

          await mintToken(mTBILL, owner, 100);
          await approveBase18(owner, mTBILL, redemptionVault, 100);

          await setRoundData({ mockedAggregator }, 1.03);
          await setRoundData({ mockedAggregator: mockedAggregatorMToken }, 5);
          await redemptionVault.freeFromMinAmount(owner.address, true);

          await redeemFiatRequestTest(
            { redemptionVault, owner, mTBILL, mTokenToUsdDataFeed },
            100,
          );
        });

        it('redeem fiat request 100 mTBILL, when price of stable is 1.03$ and mToken price is 5$ and user in waivedFeeRestriction', async () => {
          const {
            owner,
            mockedAggregator,
            mockedAggregatorMToken,
            redemptionVault,
            mTBILL,
            mTokenToUsdDataFeed,
            greenListableTester,
            accessControl,
          } = await loadRvFixture();

          await greenList(
            { greenlistable: greenListableTester, accessControl, owner },
            owner,
          );

          await mintToken(mTBILL, owner, 100);
          await approveBase18(owner, mTBILL, redemptionVault, 100);

          await setRoundData({ mockedAggregator }, 1.03);
          await setRoundData({ mockedAggregator: mockedAggregatorMToken }, 5);
          await addWaivedFeeAccountTest(
            { vault: redemptionVault, owner },
            owner.address,
          );
          await redeemFiatRequestTest(
            {
              redemptionVault,
              owner,
              mTBILL,
              mTokenToUsdDataFeed,
              waivedFee: true,
            },
            100,
          );
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
              revertMessage: 'WMAC: hasnt role',
            },
          );
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

        it('should fail: if some fee = 100% when fiat request', async () => {
          const {
            owner,
            redemptionVault,
            mTBILL,
            mTokenToUsdDataFeed,
            greenListableTester,
            accessControl,
          } = await loadRvFixture();

          await greenList(
            { greenlistable: greenListableTester, accessControl, owner },
            owner,
          );

          await mintToken(mTBILL, owner, 100);
          await approveBase18(owner, mTBILL, redemptionVault, 100);
          await setFiatAdditionalFeeTest({ redemptionVault, owner }, 10000);
          await redeemFiatRequestTest(
            { redemptionVault, owner, mTBILL, mTokenToUsdDataFeed },
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

      describe('approveRequest() with fiat', async () => {
        it('approve request from vaut admin account', async () => {
          const {
            owner,
            mockedAggregator,
            mockedAggregatorMToken,
            redemptionVault,
            mTBILL,
            mTokenToUsdDataFeed,
            greenListableTester,
            accessControl,
          } = await loadRvFixture();

          await greenList(
            { greenlistable: greenListableTester, accessControl, owner },
            owner,
          );

          await mintToken(mTBILL, owner, 100);
          await approveBase18(owner, mTBILL, redemptionVault, 100);
          await setRoundData({ mockedAggregator }, 1.03);
          await setRoundData({ mockedAggregator: mockedAggregatorMToken }, 5);

          await redeemFiatRequestTest(
            { redemptionVault, owner, mTBILL, mTokenToUsdDataFeed },
            100,
          );
          const requestId = 0;

          await changeTokenAllowanceTest(
            { vault: redemptionVault, owner },
            constants.AddressZero,
            parseUnits('100'),
          );

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
            mTBILL,
            mTokenToUsdDataFeed,
            greenListableTester,
            accessControl,
          } = await loadRvFixture();

          await greenList(
            { greenlistable: greenListableTester, accessControl, owner },
            owner,
          );

          await mintToken(mTBILL, owner, 100);
          await approveBase18(owner, mTBILL, redemptionVault, 100);
          await setRoundData({ mockedAggregator }, 1.03);
          await setRoundData({ mockedAggregator: mockedAggregatorMToken }, 5);

          await redeemFiatRequestTest(
            { redemptionVault, owner, mTBILL, mTokenToUsdDataFeed },
            100,
          );
          const requestId = 0;

          await changeTokenAllowanceTest(
            { vault: redemptionVault, owner },
            constants.AddressZero,
            parseUnits('100'),
          );

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
          await safeApproveRedeemRequestTest(
            {
              redemptionVault,
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

        it('should fail: when function is paused', async () => {
          const { owner, redemptionVault, mTBILL, mTokenToUsdDataFeed } =
            await loadRvFixture();

          await pauseVaultFn(
            redemptionVault,
            encodeFnSelector('safeApproveRequest(uint256,uint256)'),
          );

          await safeApproveRedeemRequestTest(
            { redemptionVault, owner, mTBILL, mTokenToUsdDataFeed },
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
          await safeApproveRedeemRequestTest(
            { redemptionVault, owner, mTBILL, mTokenToUsdDataFeed },
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

          await safeApproveRedeemRequestTest(
            { redemptionVault, owner, mTBILL, mTokenToUsdDataFeed },
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

          await safeApproveRedeemRequestTest(
            { redemptionVault, owner, mTBILL, mTokenToUsdDataFeed },
            +requestId,
            parseUnits('5.000001'),
          );
          await safeApproveRedeemRequestTest(
            { redemptionVault, owner, mTBILL, mTokenToUsdDataFeed },
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

          await safeApproveRedeemRequestTest(
            { redemptionVault, owner, mTBILL, mTokenToUsdDataFeed },
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

          await safeApproveRedeemRequestTest(
            { redemptionVault, owner, mTBILL, mTokenToUsdDataFeed },
            +requestId,
            parseUnits('5.000001'),
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
              revertMessage: 'WMAC: hasnt role',
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

          await safeApproveRedeemRequestTest(
            { redemptionVault, owner, mTBILL, mTokenToUsdDataFeed },
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

          await safeApproveRedeemRequestTest(
            { redemptionVault, owner, mTBILL, mTokenToUsdDataFeed },
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
              revertMessage: 'WMAC: hasnt role',
            },
          );
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

          await safeApproveRedeemRequestTest(
            { redemptionVault, owner, mTBILL, mTokenToUsdDataFeed },
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

          await safeApproveRedeemRequestTest(
            { redemptionVault, owner, mTBILL, mTokenToUsdDataFeed },
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
              revertMessage: 'WMAC: hasnt role',
            },
          );
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

          await safeApproveRedeemRequestTest(
            { redemptionVault, owner, mTBILL, mTokenToUsdDataFeed },
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

          await safeApproveRedeemRequestTest(
            { redemptionVault, owner, mTBILL, mTokenToUsdDataFeed },
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
              revertMessage: 'WMAC: hasnt role',
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

          await safeApproveRedeemRequestTest(
            { redemptionVault, owner, mTBILL, mTokenToUsdDataFeed },
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
              {
                from: regularAccounts[0],
                revertMessage: acErrors.WMAC_HASNT_ROLE,
              },
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
                revertMessage: acErrors.WMAC_HASNT_ROLE,
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

      describe('_calcAndValidateRedeem', () => {
        it('should fail: when tokenOut is not MANUAL_FULLFILMENT_TOKEN but isFiat = true', async () => {
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
              parseUnits('100'),
              0,
              0,
              false,
              0,
              false,
              true,
            ),
          ).revertedWith('RV: tokenOut != fiat');
        });

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
              true,
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
              false,
            );

          expect(result.feeAmount).eq(parseUnits('5'));
          expect(result.amountTokenOutWithoutFee).eq(parseUnits('45'));
        });

        it('should correctly convert fiat flat fee to token out', async () => {
          const { redemptionVault, stableCoins, owner, dataFeed } =
            await loadRvFixture();

          await addPaymentTokenTest(
            { vault: redemptionVault, owner },
            stableCoins.dai,
            dataFeed.address,
            0,
            true,
          );

          await setFiatFlatFeeTest({ redemptionVault, owner }, 1);

          const result =
            await redemptionVault.callStatic.calcAndValidateRedeemTest(
              constants.AddressZero,
              constants.AddressZero,
              parseUnits('100'),
              parseUnits('1'),
              parseUnits('2'),
              true,
              10_00,
              false,
              true,
            );

          expect(result.feeAmount).eq(parseUnits('5.5'));
          expect(result.amountTokenOutWithoutFee).eq(parseUnits('44.5'));
        });
      });
    });

    otherTests(rvFixture);
  });
};
