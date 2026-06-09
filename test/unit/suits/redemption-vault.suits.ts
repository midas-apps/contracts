import {
  loadFixture,
  setBalance,
} from '@nomicfoundation/hardhat-network-helpers';
import { increase } from '@nomicfoundation/hardhat-network-helpers/dist/src/helpers/time';
import {
  days,
  hours,
} from '@nomicfoundation/hardhat-network-helpers/dist/src/helpers/time/duration';
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { expect } from 'chai';
import { constants, Contract } from 'ethers';
import { parseUnits } from 'ethers/lib/utils';
import { ethers } from 'hardhat';

import { manageableVaultSuits } from './manageable-vault.suits';

import { encodeFnSelector } from '../../../helpers/utils';
import {
  ERC20Mock,
  RedemptionVaultTest,
  RedemptionVaultTest__factory,
  RedemptionVaultWithAaveTest,
  RedemptionVaultWithMorphoTest,
  RedemptionVaultWithMTokenTest,
  RedemptionVaultWithUSTBTest,
} from '../../../typechain-types';
import {
  acErrors,
  blackList,
  greenList,
  setupPermissionRole,
} from '../../common/ac.helpers';
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
  removeInstantLimitConfigTest,
  removeWaivedFeeAccountTest,
  setInstantFeeTest,
  setInstantLimitConfigTest,
  setMinMaxInstantFeeTest,
  setMinAmountTest,
  setVariabilityToleranceTest,
  withdrawTest,
  setMaxInstantShareTest,
  setSequentialRequestProcessingTest,
} from '../../common/manageable-vault.helpers';
import {
  approveRedeemRequestTest,
  bulkRepayLpLoanRequestTest,
  cancelLpLoanRequestTest,
  redeemInstantTest,
  redeemRequestTest,
  rejectRedeemRequestTest,
  safeBulkApproveRequestTest,
  setLoanLpTest,
  setLoanRepaymentAddressTest,
  setLoanSwapperVaultTest,
  expectedHoldbackPartRateFromAvg,
  setPreferLoanLiquidityTest,
  setLoanAprTest,
} from '../../common/redemption-vault.helpers';
import { sanctionUser } from '../../common/with-sanctions-list.helpers';

const REDEMPTION_APPROVE_FN_SELECTORS = [
  encodeFnSelector('approveRequest(uint256,uint256,bool)'),
  encodeFnSelector('safeApproveRequest(uint256,uint256)'),
  encodeFnSelector('safeApproveRequestAvgRate(uint256,uint256)'),
  encodeFnSelector('safeBulkApproveRequestAtSavedRate(uint256[])'),
  encodeFnSelector('safeBulkApproveRequest(uint256[])'),
  encodeFnSelector('safeBulkApproveRequest(uint256[],uint256)'),
  encodeFnSelector('safeBulkApproveRequestAvgRate(uint256[])'),
  encodeFnSelector('safeBulkApproveRequestAvgRate(uint256[],uint256)'),
] as const;

let pauseManager: DefaultFixture['pauseManager'];
let owner: DefaultFixture['owner'];

const pauseOtherRedemptionApproveFns = async (
  redemptionVault: Contract,
  exceptSelector: (typeof REDEMPTION_APPROVE_FN_SELECTORS)[number],
) => {
  for (const selector of REDEMPTION_APPROVE_FN_SELECTORS) {
    if (selector === exceptSelector) {
      continue;
    }
    await pauseVaultFn({ pauseManager, owner }, redemptionVault, selector);
  }
};

export const redemptionVaultSuits = (
  rvName: string,
  rvFixture: () => Promise<DefaultFixture>,
  rvConfig: {
    createNew: (
      owner: SignerWithAddress,
    ) => Promise<
      | RedemptionVaultTest
      | RedemptionVaultWithAaveTest
      | RedemptionVaultWithMTokenTest
      | RedemptionVaultWithUSTBTest
      | RedemptionVaultWithMorphoTest
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
    ({ pauseManager, owner } = fixture);

    const { createNew, key } = rvConfig;
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
    manageableVaultSuits(loadRvFixture, rvConfig, async (fixture) => {
      const { redemptionVault, roles } = fixture;
      expect(await redemptionVault.contractAdminRole()).eq(
        roles.tokenRoles.mTBILL.redemptionVaultAdmin,
      );
    });

    it('deployment', async () => {
      const fixture = await loadRvFixture();
      const {
        redemptionVault,
        loanLp,
        loanRepaymentAddress,
        redemptionVaultLoanSwapper,
      } = fixture;

      expect(await redemptionVault.maxInstantShare()).eq(100_00);
      expect(await redemptionVault.loanLp()).eq(loanLp.address);

      expect(await redemptionVault.loanRepaymentAddress()).eq(
        loanRepaymentAddress.address,
      );
      expect(await redemptionVault.loanSwapperVault()).eq(
        redemptionVaultLoanSwapper.address,
      );

      await deploymentAdditionalChecks(fixture);
    });

    describe('common', () => {
      describe('redeemInstant() complex', () => {
        it('should fail: when vault is paused', async () => {
          const {
            redemptionVault,
            owner,
            mTBILL,
            stableCoins,
            regularAccounts,
            dataFeed,
            mTokenToUsdDataFeed,
          } = await loadRvFixture();

          await pauseVault({ pauseManager, owner }, redemptionVault);
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
              revertCustomError: {
                customErrorName: 'Paused',
              },
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

          await pauseVault({ pauseManager, owner }, redemptionVault);

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
              revertCustomError: {
                customErrorName: 'Paused',
              },
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
              revertCustomError: {
                customErrorName: 'UnknownPaymentToken',
              },
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
              revertCustomError: {
                customErrorName: 'InvalidAmount',
              },
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
          await pauseVaultFn(
            { pauseManager, owner },
            redemptionVault,
            selector,
          );
          await redeemInstantTest(
            { redemptionVault, owner, mTBILL, mTokenToUsdDataFeed },
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
              revertCustomError: {
                customErrorName: 'AmountLessThanMin',
              },
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
              revertCustomError: {
                customErrorName: 'AllowanceExceeded',
              },
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
              revertCustomError: {
                customErrorName: 'WindowLimitExceeded',
              },
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
            {
              revertCustomError: {
                customErrorName: 'InstantFeeOutOfBounds',
              },
            },
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
            {
              revertCustomError: {
                customErrorName: 'InstantFeeOutOfBounds',
              },
            },
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
              {
                revertCustomError: {
                  customErrorName: 'WindowLimitExceeded',
                },
              },
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
              {
                revertCustomError: {
                  customErrorName: 'WindowLimitExceeded',
                },
              },
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

            const statuses = await redemptionVault.getInstantLimitStatuses();

            expect(statuses[0].remaining).eq(parseUnits('1000'));
            expect(statuses[0].lastUpdated).not.eq(0);
            expect(statuses[0].window).eq(days(1));
            expect(statuses[0].limit).eq(parseUnits('1000'));

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

        describe('redeemInstant() sliding rate limit (RateLimitLibrary)', () => {
          const setupRedeemInstantRateLimitFixture = async () => {
            const fixture = await loadRvFixture();
            const {
              redemptionVault,
              mockedAggregator,
              mockedAggregatorMToken,
              owner,
              mTBILL,
              stableCoins,
              dataFeed,
            } = fixture;

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
            await mintToken(mTBILL, owner, 100_000);
            await approveBase18(owner, mTBILL, redemptionVault, 100_000);

            return fixture;
          };

          it('10h window: full consume, after 1h restores ~10% and two redeems use it', async () => {
            const {
              redemptionVault,
              owner,
              mTBILL,
              stableCoins,
              mTokenToUsdDataFeed,
            } = await setupRedeemInstantRateLimitFixture();

            await setInstantLimitConfigTest(
              { vault: redemptionVault, owner },
              { window: hours(10), limit: parseUnits('1000') },
            );

            await redeemInstantTest(
              { redemptionVault, owner, mTBILL, mTokenToUsdDataFeed },
              stableCoins.dai,
              1000,
            );

            await increase(hours(1));

            await redeemInstantTest(
              { redemptionVault, owner, mTBILL, mTokenToUsdDataFeed },
              stableCoins.dai,
              100,
            );
          });

          it('1d window: after 80% consumed and limit halved, redeem fails', async () => {
            const {
              redemptionVault,
              owner,
              mTBILL,
              stableCoins,
              mTokenToUsdDataFeed,
            } = await setupRedeemInstantRateLimitFixture();

            const initialLimit = parseUnits('1000');

            await setInstantLimitConfigTest(
              { vault: redemptionVault, owner },
              { window: days(1), limit: initialLimit },
            );

            await redeemInstantTest(
              { redemptionVault, owner, mTBILL, mTokenToUsdDataFeed },
              stableCoins.dai,
              800,
            );

            await setInstantLimitConfigTest(
              { vault: redemptionVault, owner },
              { window: days(1), limit: initialLimit.div(2) },
            );

            await redeemInstantTest(
              { redemptionVault, owner, mTBILL, mTokenToUsdDataFeed },
              stableCoins.dai,
              100,
              {
                revertCustomError: {
                  customErrorName: 'WindowLimitExceeded',
                },
              },
            );
          });

          it('1d window: after limit halved, wait 12h and redeem small amount', async () => {
            const {
              redemptionVault,
              owner,
              mTBILL,
              stableCoins,
              mTokenToUsdDataFeed,
            } = await setupRedeemInstantRateLimitFixture();

            const initialLimit = parseUnits('1000');

            await setInstantLimitConfigTest(
              { vault: redemptionVault, owner },
              { window: days(1), limit: initialLimit },
            );

            await redeemInstantTest(
              { redemptionVault, owner, mTBILL, mTokenToUsdDataFeed },
              stableCoins.dai,
              800,
            );

            await setInstantLimitConfigTest(
              { vault: redemptionVault, owner },
              { window: days(1), limit: initialLimit.div(2) },
            );

            await redeemInstantTest(
              { redemptionVault, owner, mTBILL, mTokenToUsdDataFeed },
              stableCoins.dai,
              100,
              {
                revertCustomError: {
                  customErrorName: 'WindowLimitExceeded',
                },
              },
            );

            await increase(hours(18));

            await redeemInstantTest(
              { redemptionVault, owner, mTBILL, mTokenToUsdDataFeed },
              stableCoins.dai,
              1,
            );
          });

          it('multiple windows active at the same time', async () => {
            const {
              redemptionVault,
              owner,
              mTBILL,
              stableCoins,
              mTokenToUsdDataFeed,
            } = await setupRedeemInstantRateLimitFixture();

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
              { window: days(1), limit: parseUnits('10000') },
            );

            await redeemInstantTest(
              { redemptionVault, owner, mTBILL, mTokenToUsdDataFeed },
              stableCoins.dai,
              100,
            );

            await redeemInstantTest(
              { redemptionVault, owner, mTBILL, mTokenToUsdDataFeed },
              stableCoins.dai,
              50,
              {
                revertCustomError: {
                  customErrorName: 'WindowLimitExceeded',
                },
              },
            );

            await increase(hours(1));

            await redeemInstantTest(
              { redemptionVault, owner, mTBILL, mTokenToUsdDataFeed },
              stableCoins.dai,
              50,
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
              revertCustomError: {
                customErrorName: 'SlippageExceeded',
              },
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
              revertCustomError: {
                customErrorName: 'FeeExceedsAmount',
              },
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
            {
              revertCustomError: {
                customErrorName: 'FeeExceedsAmount',
              },
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

          await redeemInstantTest(
            { redemptionVault, owner, mTBILL, mTokenToUsdDataFeed },
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
              revertCustomError: acErrors.WMAC_BLACKLISTED,
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
              revertCustomError: {
                customErrorName: 'Sanctioned',
              },
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
          await pauseVaultFn(
            { pauseManager, owner },
            redemptionVault,
            selector,
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
              revertCustomError: {
                customErrorName: 'Paused',
              },
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
              revertCustomError: {
                customErrorName: 'NotGreenlisted',
              },
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
              revertCustomError: acErrors.WMAC_BLACKLISTED,
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
              revertCustomError: {
                customErrorName: 'Sanctioned',
              },
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
          describe('preferLoanLiquidity=false', () => {
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
              await mintToken(
                stableCoins.dai,
                redemptionVaultLoanSwapper,
                1000,
              );

              await approveBase18(
                loanLp,
                stableCoins.dai,
                redemptionVault,
                1000,
              );
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

            it('when enough liquidity on loan lp and on vault but lp liquidity should be untouched', async () => {
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
              await mintToken(stableCoins.dai, redemptionVault, 1000);
              await approveBase18(loanLp, mTokenLoan, redemptionVault, 1000);
              await mintToken(
                stableCoins.dai,
                redemptionVaultLoanSwapper,
                1000,
              );

              await approveBase18(
                loanLp,
                stableCoins.dai,
                redemptionVault,
                1000,
              );
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

              await setRoundData(
                { mockedAggregator: mockedAggregatorMToken },
                1,
              );
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

              await setRoundData(
                { mockedAggregator: mockedAggregatorMToken },
                1,
              );
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

            it('should fail: when not enough liquidity on vault and loan lp is not set', async () => {
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
                  revertMessage: 'ERC20: transfer amount exceeds balance',
                },
              );
            });

            it('should fail: when not enough liquidity on vault and loan swapper is not set', async () => {
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
                  revertMessage: 'ERC20: transfer amount exceeds balance',
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
                  revertMessage: 'ERC20: transfer amount exceeds balance',
                },
              );
            });

            it('should fail: when rv not fee waived on lp swapper', async () => {
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

              await setRoundData(
                { mockedAggregator: mockedAggregatorMToken },
                1,
              );
              await setRoundData({ mockedAggregator }, 1);

              await redeemInstantTest(
                { redemptionVault, owner, mTBILL, mTokenToUsdDataFeed },
                stableCoins.dai,
                100,
                {
                  revertMessage: 'ERC20: transfer amount exceeds balance',
                },
              );
            });
          });

          describe('preferLoanLiquidity=true', () => {
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
              await mintToken(
                stableCoins.dai,
                redemptionVaultLoanSwapper,
                1000,
              );

              await approveBase18(
                loanLp,
                stableCoins.dai,
                redemptionVault,
                1000,
              );
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

              await setPreferLoanLiquidityTest(
                { redemptionVault, owner },
                true,
              );
              await redeemInstantTest(
                { redemptionVault, owner, mTBILL, mTokenToUsdDataFeed },
                stableCoins.dai,
                100,
              );
            });

            it('when enough liquidity on loan lp and on vault but vault liquidity should be untouched', async () => {
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
              await mintToken(stableCoins.dai, redemptionVault, 1000);
              await approveBase18(loanLp, mTokenLoan, redemptionVault, 1000);
              await mintToken(
                stableCoins.dai,
                redemptionVaultLoanSwapper,
                1000,
              );

              await approveBase18(
                loanLp,
                stableCoins.dai,
                redemptionVault,
                1000,
              );
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

              await setPreferLoanLiquidityTest(
                { redemptionVault, owner },
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

              await setRoundData(
                { mockedAggregator: mockedAggregatorMToken },
                1,
              );
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
              await setPreferLoanLiquidityTest(
                { redemptionVault, owner },
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

              await setRoundData(
                { mockedAggregator: mockedAggregatorMToken },
                1,
              );
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
              await setPreferLoanLiquidityTest(
                { redemptionVault, owner },
                true,
              );

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
              await setPreferLoanLiquidityTest(
                { redemptionVault, owner },
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

            it('should fail: when not enough liquidity on vault and loan lp is not set', async () => {
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
              await setPreferLoanLiquidityTest(
                { redemptionVault, owner },
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

            it('should fail: when not enough liquidity on vault and loan swapper is not set', async () => {
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
              await setPreferLoanLiquidityTest(
                { redemptionVault, owner },
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
              await setPreferLoanLiquidityTest(
                { redemptionVault, owner },
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

            it('should fail: when rv not fee waived on lp swapper', async () => {
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

              await setRoundData(
                { mockedAggregator: mockedAggregatorMToken },
                1,
              );
              await setRoundData({ mockedAggregator }, 1);
              await setPreferLoanLiquidityTest(
                { redemptionVault, owner },
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

            it('should fail: when swapper fails it should catch the error and fail later during the transfer', async () => {
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
                mockedAggregatorMTokenLoan,
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

              await setRoundData(
                { mockedAggregator: mockedAggregatorMToken },
                1,
              );
              await setRoundData({ mockedAggregator }, 1);
              await setRoundData(
                { mockedAggregator: mockedAggregatorMTokenLoan },
                0,
              );

              await setPreferLoanLiquidityTest(
                { redemptionVault, owner },
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

            await setMaxInstantShareTest(
              { vault: redemptionVault, owner },
              90_00,
            );

            await redeemInstantTest(
              { redemptionVault, owner, mTBILL, mTokenToUsdDataFeed },
              stableCoins.dai,
              100,
              {
                revertCustomError: {
                  customErrorName: 'InstantShareTooHigh',
                },
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
            { pauseManager, owner },
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
            { pauseManager, owner },
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

      describe('setLoanLp()', () => {
        it('should fail: call from address without REDEMPTION_VAULT_ADMIN_ROLE role', async () => {
          const { redemptionVault, regularAccounts, owner } = await loadFixture(
            rvFixture,
          );
          await setLoanLpTest(
            { redemptionVault, owner },
            ethers.constants.AddressZero,
            {
              revertCustomError: acErrors.WMAC_HASNT_PERMISSION,
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
            { pauseManager, owner },
            redemptionVault,
            encodeFnSelector('setLoanLp(address)'),
          );

          await setLoanLpTest({ redemptionVault, owner }, owner.address, {
            revertCustomError: {
              customErrorName: 'Paused',
            },
          });
        });

        it('succeeds with only scoped function permission', async () => {
          const { accessControl, owner, redemptionVault, regularAccounts } =
            await loadRvFixture();

          const contractAdminRole = await redemptionVault.contractAdminRole();
          await setupPermissionRole(
            { accessControl, owner },
            contractAdminRole,
            redemptionVault.address,
            'setLoanLp(address)',
            regularAccounts[0].address,
          );

          expect(
            await accessControl.hasRole(
              contractAdminRole,
              regularAccounts[0].address,
            ),
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

          const contractAdminRole = await redemptionVault.contractAdminRole();
          await setupPermissionRole(
            { accessControl, owner },
            contractAdminRole,
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
              revertCustomError: acErrors.WMAC_HASNT_PERMISSION,
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
            { pauseManager, owner },
            redemptionVault,
            encodeFnSelector('setLoanRepaymentAddress(address)'),
          );

          await setLoanRepaymentAddressTest(
            { redemptionVault, owner },
            regularAccounts[0].address,
            {
              revertCustomError: {
                customErrorName: 'Paused',
              },
            },
          );
        });

        it('succeeds with only scoped function permission', async () => {
          const { accessControl, owner, redemptionVault, regularAccounts } =
            await loadRvFixture();

          const contractAdminRole = await redemptionVault.contractAdminRole();
          await setupPermissionRole(
            { accessControl, owner },
            contractAdminRole,
            redemptionVault.address,
            'setLoanRepaymentAddress(address)',
            regularAccounts[0].address,
          );

          expect(
            await accessControl.hasRole(
              contractAdminRole,
              regularAccounts[0].address,
            ),
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

          const contractAdminRole = await redemptionVault.contractAdminRole();
          await setupPermissionRole(
            { accessControl, owner },
            contractAdminRole,
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
              revertCustomError: acErrors.WMAC_HASNT_PERMISSION,
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
            { pauseManager, owner },
            redemptionVault,
            encodeFnSelector('setLoanSwapperVault(address)'),
          );

          await setLoanSwapperVaultTest(
            { redemptionVault, owner },
            regularAccounts[0].address,
            {
              revertCustomError: {
                customErrorName: 'Paused',
              },
            },
          );
        });

        it('succeeds with only scoped function permission', async () => {
          const { accessControl, owner, redemptionVault, regularAccounts } =
            await loadRvFixture();

          const contractAdminRole = await redemptionVault.contractAdminRole();
          await setupPermissionRole(
            { accessControl, owner },
            contractAdminRole,
            redemptionVault.address,
            'setLoanSwapperVault(address)',
            regularAccounts[0].address,
          );

          expect(
            await accessControl.hasRole(
              contractAdminRole,
              regularAccounts[0].address,
            ),
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

          const contractAdminRole = await redemptionVault.contractAdminRole();
          await setupPermissionRole(
            { accessControl, owner },
            contractAdminRole,
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

      describe('setPreferLoanLiquidity()', () => {
        it('should fail: call from address without REDEMPTION_VAULT_ADMIN_ROLE role', async () => {
          const { redemptionVault, regularAccounts, owner } = await loadFixture(
            rvFixture,
          );
          await setPreferLoanLiquidityTest({ redemptionVault, owner }, true, {
            from: regularAccounts[0],
            revertCustomError: acErrors.WMAC_HASNT_PERMISSION,
          });
        });

        it('call from address with REDEMPTION_VAULT_ADMIN_ROLE role', async () => {
          const { redemptionVault, owner } = await loadRvFixture();
          await setPreferLoanLiquidityTest({ redemptionVault, owner }, true);
        });

        it('should fail: when function is paused', async () => {
          const { redemptionVault, owner } = await loadRvFixture();

          await pauseVaultFn(
            { pauseManager, owner },
            redemptionVault,
            encodeFnSelector('setPreferLoanLiquidity(bool)'),
          );

          await setPreferLoanLiquidityTest({ redemptionVault, owner }, true, {
            revertCustomError: {
              customErrorName: 'Paused',
            },
          });
        });

        it('succeeds with only scoped function permission', async () => {
          const { accessControl, owner, redemptionVault, regularAccounts } =
            await loadRvFixture();

          const contractAdminRole = await redemptionVault.contractAdminRole();
          await setupPermissionRole(
            { accessControl, owner },
            contractAdminRole,
            redemptionVault.address,
            'setPreferLoanLiquidity(bool)',
            regularAccounts[0].address,
          );

          expect(
            await accessControl.hasRole(
              contractAdminRole,
              regularAccounts[0].address,
            ),
          ).eq(false);

          await setPreferLoanLiquidityTest({ redemptionVault, owner }, true, {
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

          const contractAdminRole = await redemptionVault.contractAdminRole();
          await setupPermissionRole(
            { accessControl, owner },
            contractAdminRole,
            redemptionVault.address,
            'setPreferLoanLiquidity(bool)',
            regularAccounts[0].address,
          );

          await accessControl.grantRole(
            roles.tokenRoles.mTBILL.redemptionVaultAdmin,
            regularAccounts[0].address,
          );

          await setPreferLoanLiquidityTest({ redemptionVault, owner }, true, {
            from: regularAccounts[0],
          });
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
                revertCustomError: {
                  customErrorName: 'InvalidAmount',
                },
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

            await setMaxInstantShareTest(
              { vault: redemptionVault, owner },
              80_00,
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
              revertCustomError: {
                customErrorName: 'UnknownPaymentToken',
              },
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
              revertCustomError: {
                customErrorName: 'InvalidAmount',
              },
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
          await pauseVaultFn(
            { pauseManager, owner },
            redemptionVault,
            selector,
          );
          await redeemRequestTest(
            { redemptionVault, owner, mTBILL, mTokenToUsdDataFeed },
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
              revertCustomError: {
                customErrorName: 'AmountLessThanMin',
              },
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
              revertCustomError: {
                customErrorName: 'NotGreenlisted',
              },
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
              revertCustomError: acErrors.WMAC_BLACKLISTED,
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
              revertCustomError: {
                customErrorName: 'Sanctioned',
              },
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
            'redeemRequest(address,uint256,address,uint256,uint256,address)',
          );
          await pauseVaultFn(
            { pauseManager, owner },
            redemptionVault,
            selector,
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
              revertCustomError: {
                customErrorName: 'Paused',
              },
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
              revertCustomError: {
                customErrorName: 'NotGreenlisted',
              },
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
              revertCustomError: acErrors.WMAC_BLACKLISTED,
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
              revertCustomError: {
                customErrorName: 'Sanctioned',
              },
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
            { pauseManager, owner },
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
            { pauseManager, owner },
            redemptionVault,
            encodeFnSelector(
              'redeemRequest(address,uint256,address,uint256,uint256,address)',
            ),
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

      describe('approveRequest()', async () => {
        describe('avgRate=false', async () => {
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
                revertCustomError: acErrors.WMAC_HASNT_PERMISSION,
              },
            );
          });

          it('should fail: when function is paused', async () => {
            const { owner, redemptionVault, mTBILL, mTokenToUsdDataFeed } =
              await loadRvFixture();

            await pauseVaultFn(
              { pauseManager, owner },
              redemptionVault,
              encodeFnSelector('approveRequest(uint256,uint256,bool)'),
            );

            await approveRedeemRequestTest(
              { redemptionVault, owner, mTBILL, mTokenToUsdDataFeed },
              0,
              parseUnits('1'),
              {
                revertCustomError: {
                  customErrorName: 'Paused',
                },
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
                revertCustomError: {
                  customErrorName: 'FeeExceedsAmount',
                },
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
                revertCustomError: {
                  customErrorName: 'RequestNotExists',
                },
              },
            );
          });

          describe('request addresses access', () => {
            const setupPendingRedeemRequest = async (
              fixture: Awaited<ReturnType<typeof loadRvFixture>>,
              opts?: {
                customRecipient?: SignerWithAddress;
                customClaimer?: SignerWithAddress;
              },
            ) => {
              const {
                owner,
                redemptionVault,
                stableCoins,
                mTBILL,
                mTokenToUsdDataFeed,
                regularAccounts,
                dataFeed,
                requestRedeemer,
                mockedAggregator,
                mockedAggregatorMToken,
              } = fixture;

              await mintToken(stableCoins.dai, requestRedeemer, 100000);
              await approveBase18(
                requestRedeemer,
                stableCoins.dai,
                redemptionVault,
                100000,
              );
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
              await setRoundData({ mockedAggregator }, 1.03);
              await setRoundData(
                { mockedAggregator: mockedAggregatorMToken },
                5,
              );

              await redeemRequestTest(
                {
                  redemptionVault,
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
              const fixture = await loadRvFixture();
              const {
                owner,
                redemptionVault,
                mTBILL,
                mTokenToUsdDataFeed,
                blackListableTester,
                accessControl,
                regularAccounts,
              } = fixture;
              await setupPendingRedeemRequest(fixture);

              await blackList(
                { blacklistable: blackListableTester, accessControl, owner },
                regularAccounts[0],
              );

              await approveRedeemRequestTest(
                { redemptionVault, owner, mTBILL, mTokenToUsdDataFeed },
                0,
                parseUnits('5'),
                { revertCustomError: acErrors.WMAC_BLACKLISTED },
              );
            });

            it('should fail: approve request when recipient got ungreenlisted when greenlist enable flag is true', async () => {
              const fixture = await loadRvFixture();
              const { owner, redemptionVault, mTBILL, mTokenToUsdDataFeed } =
                fixture;
              await setupPendingRedeemRequest(fixture);

              await redemptionVault.setGreenlistEnable(true);

              await approveRedeemRequestTest(
                { redemptionVault, owner, mTBILL, mTokenToUsdDataFeed },
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
              const fixture = await loadRvFixture();
              const {
                owner,
                redemptionVault,
                mTBILL,
                mTokenToUsdDataFeed,
                regularAccounts,
                mockedSanctionsList,
              } = fixture;
              await setupPendingRedeemRequest(fixture);

              await sanctionUser(
                { sanctionsList: mockedSanctionsList },
                regularAccounts[0],
              );

              await approveRedeemRequestTest(
                { redemptionVault, owner, mTBILL, mTokenToUsdDataFeed },
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
              encodeFnSelector('approveRequest(uint256,uint256,bool)'),
            );

            await approveRedeemRequestTest(
              { redemptionVault, owner, mTBILL, mTokenToUsdDataFeed },
              +requestId,
              parseUnits('1'),
            );
          });

          it('should approve request in non sequential order when sequentialRequestProcessing is disabled', async () => {
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

            await approveRedeemRequestTest(
              { redemptionVault, owner, mTBILL, mTokenToUsdDataFeed },
              1,
              parseUnits('1'),
            );
          });

          it('should fail: approve request in non sequential order when sequentialRequestProcessing is enabled', async () => {
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

            await setSequentialRequestProcessingTest(
              { vault: redemptionVault, owner },
              true,
            );

            await mintToken(stableCoins.dai, requestRedeemer, 100000);
            await approveBase18(
              requestRedeemer,
              stableCoins.dai,
              redemptionVault,
              100000,
            );
            await mintToken(mTBILL, owner, 300);
            await approveBase18(owner, mTBILL, redemptionVault, 300);
            await addPaymentTokenTest(
              { vault: redemptionVault, owner },
              stableCoins.dai,
              dataFeed.address,
              0,
              true,
            );
            await setRoundData({ mockedAggregator }, 1.03);
            await setRoundData({ mockedAggregator: mockedAggregatorMToken }, 5);

            for (let i = 0; i < 3; i++) {
              await redeemRequestTest(
                { redemptionVault, owner, mTBILL, mTokenToUsdDataFeed },
                stableCoins.dai,
                100,
              );
            }

            await approveRedeemRequestTest(
              { redemptionVault, owner, mTBILL, mTokenToUsdDataFeed },
              0,
              parseUnits('1'),
            );

            await approveRedeemRequestTest(
              { redemptionVault, owner, mTBILL, mTokenToUsdDataFeed },
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
              redemptionVault,
              stableCoins,
              mTBILL,
              dataFeed,
              mTokenToUsdDataFeed,
              requestRedeemer,
            } = await loadRvFixture();

            await setSequentialRequestProcessingTest(
              { vault: redemptionVault, owner },
              true,
            );

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

            await approveRedeemRequestTest(
              { redemptionVault, owner, mTBILL, mTokenToUsdDataFeed },
              0,
              parseUnits('1'),
            );

            await approveRedeemRequestTest(
              { redemptionVault, owner, mTBILL, mTokenToUsdDataFeed },
              1,
              parseUnits('1'),
            );
          });

          it('should enforce fifo across separate transactions when sequentialRequestProcessing is enabled', async () => {
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

            await setSequentialRequestProcessingTest(
              { vault: redemptionVault, owner },
              true,
            );

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

            for (let i = 0; i < 9; i++) {
              await redeemRequestTest(
                { redemptionVault, owner, mTBILL, mTokenToUsdDataFeed },
                stableCoins.dai,
                100,
              );
            }

            for (const requestId of [0, 1, 2]) {
              await approveRedeemRequestTest(
                { redemptionVault, owner, mTBILL, mTokenToUsdDataFeed },
                requestId,
                parseUnits('1'),
              );
            }

            await approveRedeemRequestTest(
              { redemptionVault, owner, mTBILL, mTokenToUsdDataFeed },
              3,
              parseUnits('1'),
            );

            await approveRedeemRequestTest(
              { redemptionVault, owner, mTBILL, mTokenToUsdDataFeed },
              5,
              parseUnits('1'),
              {
                revertCustomError: {
                  customErrorName: 'InvalidRequestSequence',
                  args: [5, 4],
                },
              },
            );

            await approveRedeemRequestTest(
              { redemptionVault, owner, mTBILL, mTokenToUsdDataFeed },
              4,
              parseUnits('1'),
            );

            for (const requestId of [6, 7, 8]) {
              await approveRedeemRequestTest(
                { redemptionVault, owner, mTBILL, mTokenToUsdDataFeed },
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
              await approveRedeemRequestTest(
                { redemptionVault, owner, mTBILL, mTokenToUsdDataFeed },
                requestId,
                parseUnits('1'),
              );
            }

            await approveRedeemRequestTest(
              { redemptionVault, owner, mTBILL, mTokenToUsdDataFeed },
              8,
              parseUnits('1'),
            );
          });
        });

        describe('avgRate=true', async () => {
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
                revertCustomError: acErrors.WMAC_HASNT_PERMISSION,
              },
            );
          });

          it('should fail: when function is paused', async () => {
            const { owner, redemptionVault, mTBILL, mTokenToUsdDataFeed } =
              await loadRvFixture();

            await pauseVaultFn(
              { pauseManager, owner },
              redemptionVault,
              encodeFnSelector('approveRequest(uint256,uint256,bool)'),
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
                revertCustomError: {
                  customErrorName: 'Paused',
                },
              },
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
                revertCustomError: {
                  customErrorName: 'InvalidInstantAmount',
                },
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
              {
                revertCustomError: {
                  customErrorName: 'UnexpectedRequestStatus',
                },
              },
            );
          });

          it('when calclulated holdback part rate is 0 should use the price passed as newMTokenRate', async () => {
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
              encodeFnSelector('approveRequest(uint256,uint256,bool)'),
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

          it('should approve request in non sequential order when sequentialRequestProcessing is disabled', async () => {
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

            await approveRedeemRequestTest(
              {
                redemptionVault,
                owner,
                mTBILL,
                mTokenToUsdDataFeed,
                isAvgRate: true,
              },
              1,
              parseUnits('5'),
            );
          });

          it('should fail: approve request in non sequential order when sequentialRequestProcessing is enabled', async () => {
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

            await setSequentialRequestProcessingTest(
              { vault: redemptionVault, owner },
              true,
            );

            await mintToken(stableCoins.dai, requestRedeemer, 100000);
            await mintToken(stableCoins.dai, redemptionVault, 100000);
            await approveBase18(
              requestRedeemer,
              stableCoins.dai,
              redemptionVault,
              100000,
            );
            await mintToken(mTBILL, owner, 300);
            await approveBase18(owner, mTBILL, redemptionVault, 300);
            await addPaymentTokenTest(
              { vault: redemptionVault, owner },
              stableCoins.dai,
              dataFeed.address,
              0,
              true,
            );
            await setRoundData({ mockedAggregator }, 1.03);
            await setRoundData({ mockedAggregator: mockedAggregatorMToken }, 5);

            for (let i = 0; i < 3; i++) {
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
            }

            await approveRedeemRequestTest(
              {
                redemptionVault,
                owner,
                mTBILL,
                mTokenToUsdDataFeed,
                isAvgRate: true,
              },
              0,
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
              2,
              parseUnits('5'),
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
              redemptionVault,
              stableCoins,
              mTBILL,
              dataFeed,
              mTokenToUsdDataFeed,
              requestRedeemer,
            } = await loadRvFixture();

            await setSequentialRequestProcessingTest(
              { vault: redemptionVault, owner },
              true,
            );

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

            await approveRedeemRequestTest(
              {
                redemptionVault,
                owner,
                mTBILL,
                mTokenToUsdDataFeed,
                isAvgRate: true,
              },
              0,
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
              1,
              parseUnits('5'),
            );
          });
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
              revertCustomError: acErrors.WMAC_HASNT_PERMISSION,
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
            {
              revertCustomError: {
                customErrorName: 'UnexpectedRequestStatus',
              },
            },
          );
        });

        it('should fail: when function is paused', async () => {
          const { owner, redemptionVault, mTBILL, mTokenToUsdDataFeed } =
            await loadRvFixture();

          await pauseVaultFn(
            { pauseManager, owner },
            redemptionVault,
            encodeFnSelector('safeBulkApproveRequestAtSavedRate(uint256[])'),
          );

          await safeBulkApproveRequestTest(
            { redemptionVault, owner, mTBILL, mTokenToUsdDataFeed },
            [{ id: 0 }],
            'request-rate',
            {
              revertCustomError: {
                customErrorName: 'Paused',
              },
            },
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
            },
            0,
            parseUnits('5.000001'),
          );
          await safeBulkApproveRequestTest(
            { redemptionVault, owner, mTBILL, mTokenToUsdDataFeed },
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
            },
            0,
            parseUnits('5.000001'),
          );
          await safeBulkApproveRequestTest(
            { redemptionVault, owner, mTBILL, mTokenToUsdDataFeed },
            [{ id: 1 }, { id: 1 }],
            'request-rate',
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

        it('should fail: when token fee is not 0, user is not fee waived and request redeemer do not have enough tokens to transfer the fee', async () => {
          const {
            owner,
            mockedAggregator,
            mockedAggregatorMToken,
            redemptionVault,
            stableCoins,
            mTBILL,
            mTokenToUsdDataFeed,
            dataFeed,
            regularAccounts,
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
          await setRoundData({ mockedAggregator }, 1.03);
          await setRoundData({ mockedAggregator: mockedAggregatorMToken }, 5);

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
          );

          await safeBulkApproveRequestTest(
            { redemptionVault, owner, mTBILL, mTokenToUsdDataFeed },
            [{ id: 0, expectedToExecute: false }],
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

        it('should approve requests in non sequential order when sequentialRequestProcessing is disabled', async () => {
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

        it('should skip out-of-order bulk approvals without reverting when sequentialRequestProcessing is enabled', async () => {
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

          await setSequentialRequestProcessingTest(
            { vault: redemptionVault, owner },
            true,
          );

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
            redemptionVault,
            stableCoins,
            mTBILL,
            dataFeed,
            mTokenToUsdDataFeed,
            requestRedeemer,
          } = await loadRvFixture();

          await setSequentialRequestProcessingTest(
            { vault: redemptionVault, owner },
            true,
          );

          await mintToken(stableCoins.dai, requestRedeemer, 100000);
          await approveBase18(
            requestRedeemer,
            stableCoins.dai,
            redemptionVault,
            100000,
          );
          await mintToken(mTBILL, owner, 300);
          await approveBase18(owner, mTBILL, redemptionVault, 300);
          await addPaymentTokenTest(
            { vault: redemptionVault, owner },
            stableCoins.dai,
            dataFeed.address,
            0,
            true,
          );
          await setRoundData({ mockedAggregator }, 1.03);
          await setRoundData({ mockedAggregator: mockedAggregatorMToken }, 5);

          for (let i = 0; i < 3; i++) {
            await redeemRequestTest(
              { redemptionVault, owner, mTBILL, mTokenToUsdDataFeed },
              stableCoins.dai,
              100,
            );
          }

          await safeBulkApproveRequestTest(
            { redemptionVault, owner, mTBILL, mTokenToUsdDataFeed },
            [{ id: 0 }, { id: 1 }, { id: 2 }],
            'request-rate',
          );
        });

        it('should not approve requests after insufficient liquidity when sequentialRequestProcessing is enabled', async () => {
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

          await setSequentialRequestProcessingTest(
            { vault: redemptionVault, owner },
            true,
          );

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
              revertCustomError: acErrors.WMAC_HASNT_PERMISSION,
            },
          );
        });

        it('should fail: when function is paused', async () => {
          const { owner, redemptionVault, mTBILL, mTokenToUsdDataFeed } =
            await loadRvFixture();

          await pauseVaultFn(
            { pauseManager, owner },
            redemptionVault,
            encodeFnSelector('safeBulkApproveRequest(uint256[],uint256)'),
          );

          await safeBulkApproveRequestTest(
            { redemptionVault, owner, mTBILL, mTokenToUsdDataFeed },
            [{ id: 0 }],
            parseUnits('1'),
            {
              revertCustomError: {
                customErrorName: 'Paused',
              },
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
            {
              revertCustomError: {
                customErrorName: 'PriceVariationExceeded',
              },
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
            parseUnits('5.000001'),
          );
          await safeBulkApproveRequestTest(
            { redemptionVault, owner, mTBILL, mTokenToUsdDataFeed },
            [{ id: requestId }],
            parseUnits('5.00001'),
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
            },
            0,
            parseUnits('5.000001'),
          );
          await safeBulkApproveRequestTest(
            { redemptionVault, owner, mTBILL, mTokenToUsdDataFeed },
            [{ id: 1 }, { id: 0 }],
            parseUnits('5.00001'),
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
            },
            0,
            parseUnits('5.000001'),
          );
          await safeBulkApproveRequestTest(
            { redemptionVault, owner, mTBILL, mTokenToUsdDataFeed },
            [{ id: 1 }, { id: 1 }],
            parseUnits('5.00001'),
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

        it('should approve requests in non sequential order when sequentialRequestProcessing is disabled', async () => {
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

        it('should skip out-of-order bulk approvals without reverting when sequentialRequestProcessing is enabled', async () => {
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

          await setSequentialRequestProcessingTest(
            { vault: redemptionVault, owner },
            true,
          );

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
            [
              { id: 1, expectedToExecute: false },
              { id: 0, expectedToExecute: true },
            ],
            parseUnits('5.000001'),
          );
        });

        it('should approve requests in sequential order when sequentialRequestProcessing is enabled', async () => {
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

          await setSequentialRequestProcessingTest(
            { vault: redemptionVault, owner },
            true,
          );

          await mintToken(stableCoins.dai, requestRedeemer, 100000);
          await approveBase18(
            requestRedeemer,
            stableCoins.dai,
            redemptionVault,
            100000,
          );
          await mintToken(mTBILL, owner, 300);
          await approveBase18(owner, mTBILL, redemptionVault, 300);
          await addPaymentTokenTest(
            { vault: redemptionVault, owner },
            stableCoins.dai,
            dataFeed.address,
            0,
            true,
          );
          await setRoundData({ mockedAggregator }, 1.03);
          await setRoundData({ mockedAggregator: mockedAggregatorMToken }, 5);

          for (let i = 0; i < 3; i++) {
            await redeemRequestTest(
              { redemptionVault, owner, mTBILL, mTokenToUsdDataFeed },
              stableCoins.dai,
              100,
            );
          }

          await safeBulkApproveRequestTest(
            { redemptionVault, owner, mTBILL, mTokenToUsdDataFeed },
            [{ id: 0 }, { id: 1 }, { id: 2 }],
            parseUnits('5.000001'),
          );
        });

        it('should not approve requests after insufficient liquidity when sequentialRequestProcessing is enabled', async () => {
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

          await setSequentialRequestProcessingTest(
            { vault: redemptionVault, owner },
            true,
          );

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
              revertCustomError: acErrors.WMAC_HASNT_PERMISSION,
            },
          );
        });

        it('should fail: when function is paused', async () => {
          const { owner, redemptionVault, mTBILL, mTokenToUsdDataFeed } =
            await loadRvFixture();

          await pauseVaultFn(
            { pauseManager, owner },
            redemptionVault,
            encodeFnSelector('safeBulkApproveRequest(uint256[])'),
          );

          await safeBulkApproveRequestTest(
            { redemptionVault, owner, mTBILL, mTokenToUsdDataFeed },
            [{ id: 0 }],
            undefined,
            {
              revertCustomError: {
                customErrorName: 'Paused',
              },
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
            {
              revertCustomError: {
                customErrorName: 'PriceVariationExceeded',
              },
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
            undefined,
          );
          await safeBulkApproveRequestTest(
            { redemptionVault, owner, mTBILL, mTokenToUsdDataFeed },
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
            },
            0,
            parseUnits('5.000001'),
          );
          await safeBulkApproveRequestTest(
            { redemptionVault, owner, mTBILL, mTokenToUsdDataFeed },
            [{ id: 1 }, { id: 0 }],
            undefined,
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
            },
            0,
            parseUnits('5.000001'),
          );
          await safeBulkApproveRequestTest(
            { redemptionVault, owner, mTBILL, mTokenToUsdDataFeed },
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

        it('should approve requests in non sequential order when sequentialRequestProcessing is disabled', async () => {
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

        it('should skip out-of-order bulk approvals without reverting when sequentialRequestProcessing is enabled', async () => {
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

          await setSequentialRequestProcessingTest(
            { vault: redemptionVault, owner },
            true,
          );

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
            redemptionVault,
            stableCoins,
            mTBILL,
            dataFeed,
            mTokenToUsdDataFeed,
            requestRedeemer,
          } = await loadRvFixture();

          await setSequentialRequestProcessingTest(
            { vault: redemptionVault, owner },
            true,
          );

          await mintToken(stableCoins.dai, requestRedeemer, 100000);
          await approveBase18(
            requestRedeemer,
            stableCoins.dai,
            redemptionVault,
            100000,
          );
          await mintToken(mTBILL, owner, 300);
          await approveBase18(owner, mTBILL, redemptionVault, 300);
          await addPaymentTokenTest(
            { vault: redemptionVault, owner },
            stableCoins.dai,
            dataFeed.address,
            0,
            true,
          );
          await setRoundData({ mockedAggregator }, 1.03);
          await setRoundData({ mockedAggregator: mockedAggregatorMToken }, 5);

          for (let i = 0; i < 3; i++) {
            await redeemRequestTest(
              { redemptionVault, owner, mTBILL, mTokenToUsdDataFeed },
              stableCoins.dai,
              100,
            );
          }

          await safeBulkApproveRequestTest(
            { redemptionVault, owner, mTBILL, mTokenToUsdDataFeed },
            [{ id: 0 }, { id: 1 }, { id: 2 }],
            undefined,
          );
        });

        it('should not approve requests after insufficient liquidity when sequentialRequestProcessing is enabled', async () => {
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

          await setSequentialRequestProcessingTest(
            { vault: redemptionVault, owner },
            true,
          );

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
              revertCustomError: acErrors.WMAC_HASNT_PERMISSION,
            },
          );
        });

        it('should fail: when function is paused', async () => {
          const { owner, redemptionVault, mTBILL, mTokenToUsdDataFeed } =
            await loadRvFixture();

          await pauseVaultFn(
            { pauseManager, owner },
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
            {
              revertCustomError: {
                customErrorName: 'Paused',
              },
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
              revertCustomError: {
                customErrorName: 'RequestNotExists',
              },
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
            {
              revertCustomError: {
                customErrorName: 'PriceVariationExceeded',
              },
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
            {
              revertCustomError: {
                customErrorName: 'UnexpectedRequestStatus',
              },
            },
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
            {
              revertCustomError: {
                customErrorName: 'InvalidInstantAmount',
              },
            },
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

        it('should approve requests in non sequential order when sequentialRequestProcessing is disabled', async () => {
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
            parseUnits('5'),
          );
        });

        it('should skip out-of-order bulk approvals without reverting when sequentialRequestProcessing is enabled', async () => {
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

          await setSequentialRequestProcessingTest(
            { vault: redemptionVault, owner },
            true,
          );

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
            redemptionVault,
            stableCoins,
            mTBILL,
            dataFeed,
            mTokenToUsdDataFeed,
            requestRedeemer,
          } = await loadRvFixture();

          await setSequentialRequestProcessingTest(
            { vault: redemptionVault, owner },
            true,
          );

          await mintToken(stableCoins.dai, requestRedeemer, 100000);
          await mintToken(stableCoins.dai, redemptionVault, 100000);
          await approveBase18(
            requestRedeemer,
            stableCoins.dai,
            redemptionVault,
            100000,
          );
          await mintToken(mTBILL, owner, 300);
          await approveBase18(owner, mTBILL, redemptionVault, 300);
          await addPaymentTokenTest(
            { vault: redemptionVault, owner },
            stableCoins.dai,
            dataFeed.address,
            0,
            true,
          );
          await setRoundData({ mockedAggregator }, 1.03);
          await setRoundData({ mockedAggregator: mockedAggregatorMToken }, 5);

          for (let i = 0; i < 3; i++) {
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
          }

          await safeBulkApproveRequestTest(
            {
              redemptionVault,
              owner,
              mTBILL,
              mTokenToUsdDataFeed,
              isAvgRate: true,
            },
            [{ id: 0 }, { id: 1 }, { id: 2 }],
            parseUnits('5'),
          );
        });

        it('should not approve requests after insufficient liquidity when sequentialRequestProcessing is enabled', async () => {
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

          await setSequentialRequestProcessingTest(
            { vault: redemptionVault, owner },
            true,
          );

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
            parseUnits('5'),
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
              revertCustomError: acErrors.WMAC_HASNT_PERMISSION,
            },
          );
        });

        it('should fail: when function is paused', async () => {
          const { owner, redemptionVault, mTBILL, mTokenToUsdDataFeed } =
            await loadRvFixture();

          await pauseVaultFn(
            { pauseManager, owner },
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
            {
              revertCustomError: {
                customErrorName: 'Paused',
              },
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
              revertCustomError: {
                customErrorName: 'RequestNotExists',
              },
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
            {
              revertCustomError: {
                customErrorName: 'PriceVariationExceeded',
              },
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
            {
              revertCustomError: {
                customErrorName: 'UnexpectedRequestStatus',
              },
            },
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
            {
              revertCustomError: {
                customErrorName: 'InvalidInstantAmount',
              },
            },
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

        it('should approve requests in non sequential order when sequentialRequestProcessing is disabled', async () => {
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

        it('should skip out-of-order bulk approvals without reverting when sequentialRequestProcessing is enabled', async () => {
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

          await setSequentialRequestProcessingTest(
            { vault: redemptionVault, owner },
            true,
          );

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
            redemptionVault,
            stableCoins,
            mTBILL,
            dataFeed,
            mTokenToUsdDataFeed,
            requestRedeemer,
          } = await loadRvFixture();

          await setSequentialRequestProcessingTest(
            { vault: redemptionVault, owner },
            true,
          );

          await mintToken(stableCoins.dai, requestRedeemer, 100000);
          await mintToken(stableCoins.dai, redemptionVault, 100000);
          await approveBase18(
            requestRedeemer,
            stableCoins.dai,
            redemptionVault,
            100000,
          );
          await mintToken(mTBILL, owner, 300);
          await approveBase18(owner, mTBILL, redemptionVault, 300);
          await addPaymentTokenTest(
            { vault: redemptionVault, owner },
            stableCoins.dai,
            dataFeed.address,
            0,
            true,
          );
          await setRoundData({ mockedAggregator }, 1.03);
          await setRoundData({ mockedAggregator: mockedAggregatorMToken }, 5);

          for (let i = 0; i < 3; i++) {
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
          }

          await safeBulkApproveRequestTest(
            {
              redemptionVault,
              owner,
              mTBILL,
              mTokenToUsdDataFeed,
              isAvgRate: true,
            },
            [{ id: 0 }, { id: 1 }, { id: 2 }],
            undefined,
          );
        });

        it('should not approve requests after insufficient liquidity when sequentialRequestProcessing is enabled', async () => {
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

          await setSequentialRequestProcessingTest(
            { vault: redemptionVault, owner },
            true,
          );

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
              revertCustomError: acErrors.WMAC_HASNT_PERMISSION,
            },
          );
        });

        it('should fail: when function is paused', async () => {
          const { owner, redemptionVault, mTokenToUsdDataFeed, mTBILL } =
            await loadRvFixture();

          await pauseVaultFn(
            { pauseManager, owner },
            redemptionVault,
            encodeFnSelector('rejectRequest(uint256)'),
          );

          await rejectRedeemRequestTest(
            { redemptionVault, owner, mTBILL, mTokenToUsdDataFeed },
            0,
            {
              revertCustomError: {
                customErrorName: 'Paused',
              },
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
            {
              revertCustomError: {
                customErrorName: 'UnexpectedRequestStatus',
              },
            },
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

        it('should reject request id 0 and then id 1 when sequentialRequestProcessing is enabled', async () => {
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

          await setSequentialRequestProcessingTest(
            { vault: redemptionVault, owner },
            true,
          );

          await mintToken(stableCoins.dai, redemptionVault, 100000);
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

          await rejectRedeemRequestTest(
            { redemptionVault, owner, mTBILL, mTokenToUsdDataFeed },
            0,
          );

          await rejectRedeemRequestTest(
            { redemptionVault, owner, mTBILL, mTokenToUsdDataFeed },
            1,
          );
        });

        it('should fail: reject request id in non sequential order when sequentialRequestProcessing is enabled', async () => {
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

          await setSequentialRequestProcessingTest(
            { vault: redemptionVault, owner },
            true,
          );

          await mintToken(stableCoins.dai, redemptionVault, 100000);
          await mintToken(mTBILL, owner, 300);
          await approveBase18(owner, mTBILL, redemptionVault, 300);
          await addPaymentTokenTest(
            { vault: redemptionVault, owner },
            stableCoins.dai,
            dataFeed.address,
            0,
            true,
          );
          await setRoundData({ mockedAggregator }, 1.03);
          await setRoundData({ mockedAggregator: mockedAggregatorMToken }, 5);

          for (let i = 0; i < 3; i++) {
            await redeemRequestTest(
              { redemptionVault, owner, mTBILL, mTokenToUsdDataFeed },
              stableCoins.dai,
              100,
            );
          }

          await rejectRedeemRequestTest(
            { redemptionVault, owner, mTBILL, mTokenToUsdDataFeed },
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

          await pauseVault({ pauseManager, owner }, redemptionVault);
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
              revertCustomError: {
                customErrorName: 'Paused',
              },
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

          await pauseVault({ pauseManager, owner }, redemptionVault);

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
              revertCustomError: {
                customErrorName: 'Paused',
              },
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
        describe('bulkRepayLpLoanRequest()', () => {
          it('should fail: when function is paused', async () => {
            const fixture = await loadRvFixture();
            const { redemptionVault, owner, mTBILL } = fixture;

            await pauseVaultFn(
              { pauseManager, owner },
              redemptionVault,
              encodeFnSelector('bulkRepayLpLoanRequest(uint256[])'),
            );

            await bulkRepayLpLoanRequestTest(
              { redemptionVault, owner, mTBILL },
              [{ id: 0 }],
              {
                revertCustomError: {
                  customErrorName: 'Paused',
                },
              },
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
                revertCustomError: {
                  customErrorName: 'UnexpectedRequestStatus',
                },
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
                revertCustomError: {
                  customErrorName: 'RequestNotExists',
                },
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
                revertCustomError: acErrors.WMAC_HASNT_PERMISSION,
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
            await prepareTest(fixture, stableCoins.dai);
            await increase(days(365));

            await mintToken(stableCoins.dai, loanRepaymentAddress, 101);
            await approveBase18(
              loanRepaymentAddress,
              stableCoins.dai,
              redemptionVault,
              101,
            );

            await setLoanAprTest({ redemptionVault, owner }, 50);

            await bulkRepayLpLoanRequestTest(
              { redemptionVault, owner, mTBILL },
              [{ id: 0 }],
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

            await setLoanAprTest({ redemptionVault, owner }, 10000);

            await bulkRepayLpLoanRequestTest(
              { redemptionVault, owner, mTBILL },
              [{ id: 0 }],
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
            await increase(days(365));

            await mintToken(stableCoins.dai, loanRepaymentAddress, 102);
            await approveBase18(
              loanRepaymentAddress,
              stableCoins.dai,
              redemptionVault,
              102,
            );

            await setLoanAprTest({ redemptionVault, owner }, 100);

            await bulkRepayLpLoanRequestTest(
              { redemptionVault, owner, mTBILL },
              [{ id: 0 }],
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

            await setLoanAprTest({ redemptionVault, owner }, 20000);
            await bulkRepayLpLoanRequestTest(
              { redemptionVault, owner, mTBILL },
              [{ id: 0 }],
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

            await setLoanAprTest({ redemptionVault, owner }, 10000);

            await bulkRepayLpLoanRequestTest(
              { redemptionVault, owner, mTBILL },
              [{ id: 0 }, { id: 1 }],
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

            await setLoanAprTest({ redemptionVault, owner }, 5000);
            await bulkRepayLpLoanRequestTest(
              { redemptionVault, owner, mTBILL },
              [{ id: 0 }, { id: 1 }],
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

            await setLoanAprTest({ redemptionVault, owner }, 5000);

            await bulkRepayLpLoanRequestTest(
              { redemptionVault, owner, mTBILL },
              [{ id: 0 }, { id: 1 }, { id: 2 }],
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
              { pauseManager, owner },
              redemptionVault,
              encodeFnSelector('cancelLpLoanRequest(uint256)'),
            );

            await cancelLpLoanRequestTest(
              { redemptionVault, owner, mTBILL },
              0,
              {
                revertCustomError: {
                  customErrorName: 'Paused',
                },
              },
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
                revertCustomError: {
                  customErrorName: 'RequestNotExists',
                },
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
                revertCustomError: {
                  customErrorName: 'UnexpectedRequestStatus',
                },
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
                revertCustomError: {
                  customErrorName: 'UnexpectedRequestStatus',
                },
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
                revertCustomError: acErrors.WMAC_HASNT_PERMISSION,
              },
            );
          });
        });
      });

      describe('_obtainVaultLiquidityExternal', () => {
        it('should fail: when not self call', async () => {
          const { redemptionVault } = await loadRvFixture();

          await expect(
            redemptionVault._obtainVaultLiquidityExternal(
              constants.AddressZero,
              0,
              0,
              0,
              0,
            ),
          ).to.be.revertedWithCustomError(redemptionVault, 'NotSelfCall');
        });

        it('when is self call', async () => {
          const { redemptionVault } = await loadRvFixture();

          const impersonatedRv = await ethers.getImpersonatedSigner(
            redemptionVault.address,
          );
          await setBalance(impersonatedRv.address, parseUnits('100'));

          await expect(
            redemptionVault
              .connect(impersonatedRv)
              ._obtainVaultLiquidityExternal(constants.AddressZero, 0, 0, 0, 0),
          ).to.not.revertedWithCustomError(redemptionVault, 'NotSelfCall');
        });
      });

      describe('_obtainLoanLpLiquidityExternal', () => {
        it('should fail: when not self call', async () => {
          const { redemptionVault } = await loadRvFixture();

          await expect(
            redemptionVault._obtainLoanLpLiquidityExternal(
              constants.AddressZero,
              0,
              0,
              0,
              0,
              0,
            ),
          ).to.be.revertedWithCustomError(redemptionVault, 'NotSelfCall');
        });

        it('when is self call', async () => {
          const { redemptionVault } = await loadRvFixture();

          const impersonatedRv = await ethers.getImpersonatedSigner(
            redemptionVault.address,
          );
          await setBalance(impersonatedRv.address, parseUnits('100'));

          await expect(
            redemptionVault
              .connect(impersonatedRv)
              ._obtainLoanLpLiquidityExternal(
                constants.AddressZero,
                0,
                0,
                0,
                0,
                0,
              ),
          ).to.not.revertedWithCustomError(redemptionVault, 'NotSelfCall');
        });
      });

      describe('_convertUsdToToken', () => {
        it('when amountUsd == 0', async () => {
          const { redemptionVault, owner, stableCoins, dataFeed } =
            await loadRvFixture();

          await addPaymentTokenTest(
            { vault: redemptionVault, owner },
            stableCoins.dai,
            dataFeed.address,
            0,
            true,
          );

          expect(
            (
              await redemptionVault.convertUsdToTokenTest(
                0,
                stableCoins.dai.address,
                0,
              )
            ).amountToken,
          ).eq(0);
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
          ).to.be.revertedWithCustomError(redemptionVault, 'InvalidTokenRate');
        });

        it('when tokenRate == 0 but override rate is not 0', async () => {
          const { redemptionVault, stableCoins, owner, dataFeed } =
            await loadRvFixture();

          await redemptionVault.setOverrideGetTokenRate(true);
          await redemptionVault.setGetTokenRateValue(0);

          await addPaymentTokenTest(
            { vault: redemptionVault, owner },
            stableCoins.dai,
            dataFeed.address,
            0,
            true,
          );

          expect(
            (
              await redemptionVault.convertUsdToTokenTest(
                0,
                stableCoins.dai.address,
                1,
              )
            ).amountToken,
          ).eq(0);
        });

        it('when payment token is not setup and override rate is not 0', async () => {
          const { redemptionVault } = await loadRvFixture();

          await redemptionVault.setOverrideGetTokenRate(true);
          await redemptionVault.setGetTokenRateValue(0);

          expect(
            (
              await redemptionVault.convertUsdToTokenTest(
                0,
                constants.AddressZero,
                1,
              )
            ).amountToken,
          ).eq(0);
        });

        it('should fail: when unknwon payment token', async () => {
          const { redemptionVault } = await loadRvFixture();

          await expect(
            redemptionVault.convertUsdToTokenTest(1, constants.AddressZero, 0),
          ).to.be.revertedWithoutReason();
        });
      });

      describe('_convertMTokenToUsd', () => {
        it('when amountMToken == 0', async () => {
          const { redemptionVault } = await loadRvFixture();

          expect(
            (await redemptionVault.convertMTokenToUsdTest(0, 0)).amountUsd,
          ).eq(0);
        });

        it('should fail: when override rate == 0', async () => {
          const { redemptionVault } = await loadRvFixture();

          await redemptionVault.setOverrideGetTokenRate(true);
          await redemptionVault.setGetTokenRateValue(0);

          await expect(
            redemptionVault.convertMTokenToUsdTest(1, 0),
          ).to.be.revertedWithCustomError(redemptionVault, 'InvalidTokenRate');
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
          ).to.be.revertedWithCustomError(redemptionVault, 'InvalidAmount');
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
