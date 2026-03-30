import { loadFixture } from '@nomicfoundation/hardhat-network-helpers';
import { expect } from 'chai';
import { constants } from 'ethers';
import { parseUnits } from 'ethers/lib/utils';

import { redemptionVaultSuits } from './suits/redemption-vault.suits';

import { encodeFnSelector } from '../../helpers/utils';
import { RedemptionVaultWithUSTBTest__factory } from '../../typechain-types';
import { acErrors, blackList, greenList } from '../common/ac.helpers';
import {
  approveBase18,
  mintToken,
  pauseVault,
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
  removePaymentTokenTest,
  changeTokenAllowanceTest,
} from '../common/manageable-vault.helpers';
import {
  redeemInstantTest,
  setLoanLpTest,
} from '../common/redemption-vault.helpers';
import { sanctionUser } from '../common/with-sanctions-list.helpers';

redemptionVaultSuits(
  'RedemptionVaultWithUSTB',
  defaultDeploy,
  'redemptionVaultWithUSTB',
  async (fixture) => {
    const { redemptionVaultWithUSTB, ustbRedemption } = fixture;
    expect(await redemptionVaultWithUSTB.ustbRedemption()).eq(
      ustbRedemption.address,
    );
  },
  async (defaultDeploy) => {
    describe('RedemptionVaultWithUSTB', function () {
      it('failing deployment', async () => {
        const {
          mTBILL,
          tokensReceiver,
          feeReceiver,
          mTokenToUsdDataFeed,
          accessControl,
          mockedSanctionsList,
          owner,
          requestRedeemer,
        } = await loadFixture(defaultDeploy);

        const redemptionVaultWithUSTB =
          await new RedemptionVaultWithUSTBTest__factory(owner).deploy();

        await expect(
          redemptionVaultWithUSTB[
            'initialize((address,address,uint256,uint256),(address,address),(address,address),(uint256,uint256),(uint256,uint256,uint256,address,address,address,address,address),address)'
          ](
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
              fiatAdditionalFee: 10000,
              fiatFlatFee: parseUnits('1'),
              minFiatRedeemAmount: parseUnits('100'),
              requestRedeemer: requestRedeemer.address,
              loanLp: constants.AddressZero,
              loanLpFeeReceiver: constants.AddressZero,
              loanRepaymentAddress: constants.AddressZero,
              loanSwapperVault: constants.AddressZero,
            },
            constants.AddressZero,
          ),
        ).to.be.reverted;
      });

      describe('initialization', () => {
        it('should fail: call initialize() when already initialized', async () => {
          const { redemptionVaultWithUSTB } = await loadFixture(defaultDeploy);

          await expect(
            redemptionVaultWithUSTB[
              'initialize((address,address,uint256,uint256),(address,address),(address,address),(uint256,uint256),(uint256,uint256,uint256,address,address,address,address,address),address)'
            ](
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
              constants.AddressZero,
            ),
          ).revertedWith('Initializable: contract is already initialized');
        });

        it('should fail: when ustbRedemption address zero', async () => {
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

          const redemptionVaultWithUSTB =
            await new RedemptionVaultWithUSTBTest__factory(owner).deploy();

          await expect(
            redemptionVaultWithUSTB[
              'initialize((address,address,uint256,uint256),(address,address),(address,address),(uint256,uint256),(uint256,uint256,uint256,address,address,address,address,address),address)'
            ](
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
              {
                fiatAdditionalFee: 100,
                fiatFlatFee: parseUnits('1'),
                minFiatRedeemAmount: 1000,
                requestRedeemer: requestRedeemer.address,
                loanLp: constants.AddressZero,
                loanLpFeeReceiver: constants.AddressZero,
                loanRepaymentAddress: constants.AddressZero,
                loanSwapperVault: constants.AddressZero,
              },
              constants.AddressZero,
            ),
          ).revertedWith('zero address');
        });
      });

      describe('redeemInstant()', () => {
        it('should fail: when there is no token in vault', async () => {
          const {
            owner,
            redemptionVaultWithUSTB,
            stableCoins,
            mTBILL,
            mTokenToUsdDataFeed,
          } = await loadFixture(defaultDeploy);

          await redeemInstantTest(
            {
              redemptionVault: redemptionVaultWithUSTB,
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
            redemptionVaultWithUSTB,
            stableCoins,
            mTBILL,
            dataFeed,
            mTokenToUsdDataFeed,
          } = await loadFixture(defaultDeploy);
          await addPaymentTokenTest(
            { vault: redemptionVaultWithUSTB, owner },
            stableCoins.usdc,
            dataFeed.address,
            0,
            true,
          );
          await redeemInstantTest(
            {
              redemptionVault: redemptionVaultWithUSTB,
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
            redemptionVaultWithUSTB,
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
            redemptionVaultWithUSTB,
            100,
          );
          await addPaymentTokenTest(
            { vault: redemptionVaultWithUSTB, owner },
            stableCoins.dai,
            dataFeed.address,
            0,
            true,
          );
          const selector = encodeFnSelector(
            'redeemInstant(address,uint256,uint256)',
          );
          await pauseVaultFn(redemptionVaultWithUSTB, selector);
          await redeemInstantTest(
            {
              redemptionVault: redemptionVaultWithUSTB,
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
            redemptionVaultWithUSTB,
            stableCoins,
            mTBILL,
            dataFeed,
            mTokenToUsdDataFeed,
          } = await loadFixture(defaultDeploy);

          await approveBase18(owner, mTBILL, redemptionVaultWithUSTB, 100);
          await addPaymentTokenTest(
            { vault: redemptionVaultWithUSTB, owner },
            stableCoins.usdc,
            dataFeed.address,
            0,
            true,
          );
          await redeemInstantTest(
            {
              redemptionVault: redemptionVaultWithUSTB,
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

        it('should fail: dataFeed rate 0 ', async () => {
          const {
            owner,
            redemptionVaultWithUSTB,
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
            redemptionVaultWithUSTB,
            10,
          );
          await addPaymentTokenTest(
            { vault: redemptionVaultWithUSTB, owner },
            stableCoins.usdc,
            dataFeed.address,
            0,
            true,
          );
          await mintToken(mTBILL, owner, 100_000);
          await setRoundData({ mockedAggregator }, 0);
          await redeemInstantTest(
            {
              redemptionVault: redemptionVaultWithUSTB,
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
          await setRoundData({ mockedAggregator }, 1);
          await setRoundData({ mockedAggregator: mockedAggregatorMToken }, 0);
          await redeemInstantTest(
            {
              redemptionVault: redemptionVaultWithUSTB,
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

        it('should fail: if min receive amount greater then actual', async () => {
          const {
            redemptionVaultWithUSTB,
            mockedAggregator,
            owner,
            mTBILL,
            stableCoins,
            dataFeed,
            mTokenToUsdDataFeed,
          } = await loadFixture(defaultDeploy);
          await addPaymentTokenTest(
            { vault: redemptionVaultWithUSTB, owner },
            stableCoins.usdc,
            dataFeed.address,
            0,
            true,
          );
          await setRoundData({ mockedAggregator }, 4);

          await mintToken(mTBILL, owner, 100_000);

          await approveBase18(owner, mTBILL, redemptionVaultWithUSTB, 100_000);

          await redeemInstantTest(
            {
              redemptionVault: redemptionVaultWithUSTB,
              owner,
              mTBILL,
              mTokenToUsdDataFeed,
              minAmount: parseUnits('1000000'),
            },
            stableCoins.usdc,
            99_999,
            {
              revertMessage: 'RV: minReceiveAmount > actual',
            },
          );
        });

        it('should fail: call for amount < minAmount', async () => {
          const {
            redemptionVaultWithUSTB,
            mockedAggregator,
            owner,
            mTBILL,
            stableCoins,
            dataFeed,
            mTokenToUsdDataFeed,
          } = await loadFixture(defaultDeploy);
          await addPaymentTokenTest(
            { vault: redemptionVaultWithUSTB, owner },
            stableCoins.usdc,
            dataFeed.address,
            0,
            true,
          );
          await setRoundData({ mockedAggregator }, 1);

          await mintToken(mTBILL, owner, 100_000);
          await approveBase18(owner, mTBILL, redemptionVaultWithUSTB, 100_000);

          await setMinAmountTest(
            { vault: redemptionVaultWithUSTB, owner },
            100_000,
          );

          await redeemInstantTest(
            {
              redemptionVault: redemptionVaultWithUSTB,
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

        it('call when token is invalid and it prooceeds to loan lp flow', async () => {
          const {
            redemptionVaultWithUSTB,
            owner,
            mTBILL,
            stableCoins,
            dataFeed,
            mTokenToUsdDataFeed,
            ustbToken,
            ustbRedemption,
            mockedAggregator,
            mockedAggregatorMToken,
          } = await loadFixture(defaultDeploy);

          await setLoanLpTest(
            { redemptionVault: redemptionVaultWithUSTB, owner },
            constants.AddressZero,
          );

          await ustbRedemption.setChainlinkData(parseUnits('1', 8), false);
          await mintToken(mTBILL, owner, 1000);
          await approveBase18(owner, mTBILL, redemptionVaultWithUSTB, 1000);
          await mintToken(ustbToken, redemptionVaultWithUSTB, 9900);

          await addPaymentTokenTest(
            { vault: redemptionVaultWithUSTB, owner },
            stableCoins.dai,
            dataFeed.address,
            0,
            true,
          );

          await setInstantFeeTest({ vault: redemptionVaultWithUSTB, owner }, 0);
          await setRoundData({ mockedAggregator }, 1);
          await setRoundData({ mockedAggregator: mockedAggregatorMToken }, 1);

          await redeemInstantTest(
            {
              redemptionVault: redemptionVaultWithUSTB,
              owner,
              mTBILL,
              mTokenToUsdDataFeed,
            },
            stableCoins.dai,
            1000,
            {
              revertMessage: 'RV: loan lp not configured',
            },
          );
        });

        it('should fail: if exceed allowance of redeem by token', async () => {
          const {
            redemptionVaultWithUSTB,
            mockedAggregator,
            owner,
            mTBILL,
            stableCoins,
            dataFeed,
            mTokenToUsdDataFeed,
          } = await loadFixture(defaultDeploy);
          await addPaymentTokenTest(
            { vault: redemptionVaultWithUSTB, owner },
            stableCoins.usdc,
            dataFeed.address,
            0,
            true,
          );
          await setRoundData({ mockedAggregator }, 4);

          await mintToken(mTBILL, owner, 100_000);
          await changeTokenAllowanceTest(
            { vault: redemptionVaultWithUSTB, owner },
            stableCoins.usdc.address,
            100,
          );
          await approveBase18(owner, mTBILL, redemptionVaultWithUSTB, 100_000);

          await redeemInstantTest(
            {
              redemptionVault: redemptionVaultWithUSTB,
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

        it('should fail: if redeem daily limit exceeded', async () => {
          const {
            redemptionVaultWithUSTB,
            mockedAggregator,
            owner,
            mTBILL,
            stableCoins,
            dataFeed,
            mTokenToUsdDataFeed,
          } = await loadFixture(defaultDeploy);
          await addPaymentTokenTest(
            { vault: redemptionVaultWithUSTB, owner },
            stableCoins.usdc,
            dataFeed.address,
            0,
            true,
          );
          await setRoundData({ mockedAggregator }, 4);

          await mintToken(mTBILL, owner, 100_000);
          await setInstantDailyLimitTest(
            { vault: redemptionVaultWithUSTB, owner },
            1000,
          );

          await approveBase18(owner, mTBILL, redemptionVaultWithUSTB, 100_000);

          await redeemInstantTest(
            {
              redemptionVault: redemptionVaultWithUSTB,
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
            redemptionVaultWithUSTB,
            stableCoins,
            mTBILL,
            dataFeed,
            mTokenToUsdDataFeed,
          } = await loadFixture(defaultDeploy);

          await mintToken(mTBILL, owner, 100);
          await approveBase18(owner, mTBILL, redemptionVaultWithUSTB, 100);
          await addPaymentTokenTest(
            { vault: redemptionVaultWithUSTB, owner },
            stableCoins.usdc,
            dataFeed.address,
            10000,
            true,
          );
          await redeemInstantTest(
            {
              redemptionVault: redemptionVaultWithUSTB,
              owner,
              mTBILL,
              mTokenToUsdDataFeed,
            },
            stableCoins.usdc,
            100,
            {
              revertMessage: 'RV: amountTokenOut < fee',
            },
          );

          await removePaymentTokenTest(
            { vault: redemptionVaultWithUSTB, owner },
            stableCoins.usdc,
          );
          await addPaymentTokenTest(
            { vault: redemptionVaultWithUSTB, owner },
            stableCoins.usdc,
            dataFeed.address,
            0,
            true,
          );
          await setInstantFeeTest(
            { vault: redemptionVaultWithUSTB, owner },
            10000,
          );
          await redeemInstantTest(
            {
              redemptionVault: redemptionVaultWithUSTB,
              owner,
              mTBILL,
              mTokenToUsdDataFeed,
            },
            stableCoins.usdc,
            100,
            { revertMessage: 'RV: amountTokenOut < fee' },
          );
        });

        it('should fail: greenlist enabled and user not in greenlist ', async () => {
          const {
            owner,
            redemptionVaultWithUSTB,
            stableCoins,
            mTBILL,
            mTokenToUsdDataFeed,
          } = await loadFixture(defaultDeploy);

          await redemptionVaultWithUSTB.setGreenlistEnable(true);

          await redeemInstantTest(
            {
              redemptionVault: redemptionVaultWithUSTB,
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
            redemptionVaultWithUSTB,
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
              redemptionVault: redemptionVaultWithUSTB,
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
            redemptionVaultWithUSTB,
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

          await redeemInstantTest(
            {
              redemptionVault: redemptionVaultWithUSTB,
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

        it('should fail: when function with custom recipient is paused', async () => {
          const {
            owner,
            redemptionVaultWithUSTB,
            stableCoins,
            mTBILL,
            dataFeed,
            mTokenToUsdDataFeed,
            regularAccounts,
            customRecipient,
          } = await loadFixture(defaultDeploy);
          await mintToken(mTBILL, regularAccounts[0], 100);
          await approveBase18(
            regularAccounts[0],
            stableCoins.dai,
            redemptionVaultWithUSTB,
            100,
          );
          await addPaymentTokenTest(
            { vault: redemptionVaultWithUSTB, owner },
            stableCoins.dai,
            dataFeed.address,
            0,
            true,
          );
          const selector = encodeFnSelector(
            'redeemInstant(address,uint256,uint256,address)',
          );
          await pauseVaultFn(redemptionVaultWithUSTB, selector);
          await redeemInstantTest(
            {
              redemptionVault: redemptionVaultWithUSTB,
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
            redemptionVaultWithUSTB,
            stableCoins,
            mTBILL,
            mTokenToUsdDataFeed,
            greenListableTester,
            accessControl,
            customRecipient,
          } = await loadFixture(defaultDeploy);

          await redemptionVaultWithUSTB.setGreenlistEnable(true);

          await greenList(
            { greenlistable: greenListableTester, accessControl, owner },
            owner,
          );

          await redeemInstantTest(
            {
              redemptionVault: redemptionVaultWithUSTB,
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
            redemptionVaultWithUSTB,
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

          await redeemInstantTest(
            {
              redemptionVault: redemptionVaultWithUSTB,
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
            redemptionVaultWithUSTB,
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

          await redeemInstantTest(
            {
              redemptionVault: redemptionVaultWithUSTB,
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

        it('should fail: user try to instant redeem more than contract can redeem and it hits loan lp flow', async () => {
          const {
            owner,
            redemptionVaultWithUSTB,
            stableCoins,
            mTBILL,
            mTokenToUsdDataFeed,
            dataFeed,
            ustbToken,
          } = await loadFixture(defaultDeploy);

          await setLoanLpTest(
            { redemptionVault: redemptionVaultWithUSTB, owner },
            constants.AddressZero,
          );

          await mintToken(mTBILL, owner, 100000);
          await mintToken(stableCoins.usdc, redemptionVaultWithUSTB, 100);
          await mintToken(ustbToken, redemptionVaultWithUSTB, 100);

          await approveBase18(owner, mTBILL, redemptionVaultWithUSTB, 100000);

          await addPaymentTokenTest(
            { vault: redemptionVaultWithUSTB, owner },
            stableCoins.usdc,
            dataFeed.address,
            100,
            true,
          );

          await redeemInstantTest(
            {
              redemptionVault: redemptionVaultWithUSTB,
              owner,
              mTBILL,
              mTokenToUsdDataFeed,
            },
            stableCoins.usdc,
            100000,
            {
              revertMessage: 'RV: loan lp not configured',
            },
          );
        });

        it('redeem 100 mTBILL, when price of stable is 1$ and mToken price is 1$ and contract has 100 USDC', async () => {
          const {
            owner,
            mockedAggregator,
            mockedAggregatorMToken,
            redemptionVaultWithUSTB,
            ustbRedemption,
            stableCoins,
            mTBILL,
            dataFeed,
            mTokenToUsdDataFeed,
          } = await loadFixture(defaultDeploy);

          await mintToken(stableCoins.usdc, redemptionVaultWithUSTB, 100);
          await mintToken(mTBILL, owner, 100);
          await approveBase18(owner, mTBILL, redemptionVaultWithUSTB, 100);
          await addPaymentTokenTest(
            { vault: redemptionVaultWithUSTB, owner },
            stableCoins.usdc,
            dataFeed.address,
            0,
            true,
          );
          await setRoundData({ mockedAggregator }, 1);
          await setRoundData({ mockedAggregator: mockedAggregatorMToken }, 1);
          await ustbRedemption.setMaxUstbRedemptionAmount(parseUnits('100', 6));
          await redeemInstantTest(
            {
              redemptionVault: redemptionVaultWithUSTB,
              owner,
              mTBILL,
              mTokenToUsdDataFeed,
            },
            stableCoins.usdc,
            100,
          );
        });

        it('redeem 1000 mTBILL, when price of stable is 1$ and mToken price is 1$ and contract does not have USDC, but has 9900 USTB', async () => {
          const {
            owner,
            mockedAggregator,
            mockedAggregatorMToken,
            redemptionVaultWithUSTB,
            stableCoins,
            mTBILL,
            dataFeed,
            mTokenToUsdDataFeed,
            ustbToken,
            ustbRedemption,
          } = await loadFixture(defaultDeploy);

          await ustbRedemption.setChainlinkData(parseUnits('1', 8), false); // Set USTB price to $1

          await mintToken(ustbToken, redemptionVaultWithUSTB, 9900);
          await mintToken(mTBILL, owner, 1000);
          await approveBase18(owner, mTBILL, redemptionVaultWithUSTB, 1000);
          await addPaymentTokenTest(
            { vault: redemptionVaultWithUSTB, owner },
            stableCoins.usdc,
            dataFeed.address,
            0,
            true,
          );
          await setInstantFeeTest({ vault: redemptionVaultWithUSTB, owner }, 0);
          await setRoundData({ mockedAggregator }, 1);
          await setRoundData({ mockedAggregator: mockedAggregatorMToken }, 1);

          const ustbBalanceBefore = await ustbToken.balanceOf(
            redemptionVaultWithUSTB.address,
          );

          await ustbRedemption.setMaxUstbRedemptionAmount(
            parseUnits('1000', 6),
          );
          await redeemInstantTest(
            {
              redemptionVault: redemptionVaultWithUSTB,
              owner,
              mTBILL,
              mTokenToUsdDataFeed,
              additionalLiquidity: async () => {
                return (
                  await ustbRedemption.calculateUsdcOut(
                    await ustbToken.balanceOf(redemptionVaultWithUSTB.address),
                  )
                ).usdcOutAmountAfterFee;
              },
            },
            stableCoins.usdc,
            1000,
          );

          const ustbBalanceAfter = await ustbToken.balanceOf(
            redemptionVaultWithUSTB.address,
          );

          expect(ustbBalanceAfter).to.be.lt(ustbBalanceBefore);
        });

        it('redeem 1000 mTBILL, when price of stable is 1$ and mToken price is 1$ and contract has 100 USDC and 9900 USTB', async () => {
          const {
            owner,
            mockedAggregator,
            mockedAggregatorMToken,
            redemptionVaultWithUSTB,
            stableCoins,
            mTBILL,
            dataFeed,
            mTokenToUsdDataFeed,
            ustbToken,
            ustbRedemption,
          } = await loadFixture(defaultDeploy);

          await ustbRedemption.setChainlinkData(parseUnits('1', 8), false); // Set USTB price to $1

          await mintToken(stableCoins.usdc, redemptionVaultWithUSTB, 100);
          await mintToken(ustbToken, redemptionVaultWithUSTB, 9900);
          await mintToken(mTBILL, owner, 1000);
          await approveBase18(owner, mTBILL, redemptionVaultWithUSTB, 1000);
          await addPaymentTokenTest(
            { vault: redemptionVaultWithUSTB, owner },
            stableCoins.usdc,
            dataFeed.address,
            0,
            true,
          );
          await setRoundData({ mockedAggregator }, 1);
          await setRoundData({ mockedAggregator: mockedAggregatorMToken }, 1);

          await ustbRedemption.setMaxUstbRedemptionAmount(
            parseUnits('1000', 6),
          );
          await redeemInstantTest(
            {
              redemptionVault: redemptionVaultWithUSTB,
              owner,
              mTBILL,
              mTokenToUsdDataFeed,
              additionalLiquidity: async () => {
                return (
                  await ustbRedemption.calculateUsdcOut(
                    await ustbToken.balanceOf(redemptionVaultWithUSTB.address),
                  )
                ).usdcOutAmountAfterFee;
              },
            },
            stableCoins.usdc,
            1000,
          );
        });

        it('redeem 1000 mTBILL, when price of stable is 1.03$ and mToken price is 5$ and contract has 100 USDC and sufficient USTB without checking of minDepositAmount', async () => {
          const {
            owner,
            mockedAggregator,
            mockedAggregatorMToken,
            redemptionVaultWithUSTB,
            stableCoins,
            mTBILL,
            dataFeed,
            mTokenToUsdDataFeed,
            ustbToken,
            ustbRedemption,
          } = await loadFixture(defaultDeploy);

          await ustbRedemption.setChainlinkData(parseUnits('1', 8), false); // Set USTB price to $1

          await mintToken(stableCoins.usdc, redemptionVaultWithUSTB, 100);
          await mintToken(ustbToken, redemptionVaultWithUSTB, 15000);
          await mintToken(mTBILL, owner, 1000);
          await approveBase18(owner, mTBILL, redemptionVaultWithUSTB, 1000);
          await addPaymentTokenTest(
            { vault: redemptionVaultWithUSTB, owner },
            stableCoins.usdc,
            dataFeed.address,
            100,
            true,
          );
          await setRoundData({ mockedAggregator }, 1.03);
          await setRoundData({ mockedAggregator: mockedAggregatorMToken }, 5);
          await redemptionVaultWithUSTB.freeFromMinAmount(owner.address, true);

          await ustbRedemption.setMaxUstbRedemptionAmount(
            parseUnits('6000', 6),
          );
          await redeemInstantTest(
            {
              redemptionVault: redemptionVaultWithUSTB,
              owner,
              mTBILL,
              mTokenToUsdDataFeed,
              additionalLiquidity: async () => {
                return (
                  await ustbRedemption.calculateUsdcOut(
                    await ustbToken.balanceOf(redemptionVaultWithUSTB.address),
                  )
                ).usdcOutAmountAfterFee;
              },
            },
            stableCoins.usdc,
            1000,
          );
        });

        it('redeem 1000 mTBILL, when price of stable is 1.03$ and mToken price is 5$ and contract has 100 USDC and sufficient USTB and user in waivedFeeRestriction', async () => {
          const {
            owner,
            mockedAggregator,
            mockedAggregatorMToken,
            redemptionVaultWithUSTB,
            stableCoins,
            mTBILL,
            dataFeed,
            mTokenToUsdDataFeed,
            ustbToken,
            ustbRedemption,
          } = await loadFixture(defaultDeploy);

          await ustbRedemption.setChainlinkData(parseUnits('1', 8), false); // Set USTB price to $1

          await mintToken(stableCoins.usdc, redemptionVaultWithUSTB, 100);
          await mintToken(ustbToken, redemptionVaultWithUSTB, 15000);
          await mintToken(mTBILL, owner, 1000);
          await approveBase18(owner, mTBILL, redemptionVaultWithUSTB, 1000);
          await addPaymentTokenTest(
            { vault: redemptionVaultWithUSTB, owner },
            stableCoins.usdc,
            dataFeed.address,
            100,
            true,
          );
          await setRoundData({ mockedAggregator }, 1.03);
          await setRoundData({ mockedAggregator: mockedAggregatorMToken }, 5);

          await addWaivedFeeAccountTest(
            { vault: redemptionVaultWithUSTB, owner },
            owner.address,
          );

          await ustbRedemption.setMaxUstbRedemptionAmount(
            parseUnits('6000', 6),
          );
          await redeemInstantTest(
            {
              redemptionVault: redemptionVaultWithUSTB,
              owner,
              mTBILL,
              mTokenToUsdDataFeed,
              waivedFee: true,
              additionalLiquidity: async () => {
                return (
                  await ustbRedemption.calculateUsdcOut(
                    await ustbToken.balanceOf(redemptionVaultWithUSTB.address),
                  )
                ).usdcOutAmountAfterFee;
              },
            },
            stableCoins.usdc,
            1000,
          );
        });

        it('should fail: when redemption exceeds available USDC in USTB redemption contract', async () => {
          const {
            owner,
            redemptionVaultWithUSTB,
            stableCoins,
            mTBILL,
            dataFeed,
            ustbToken,
            ustbRedemption,
          } = await loadFixture(defaultDeploy);

          await ustbRedemption.setChainlinkData(parseUnits('1', 8), false); // Set USTB price to $1

          await mintToken(ustbToken, redemptionVaultWithUSTB, 1000000);
          await mintToken(stableCoins.usdc, redemptionVaultWithUSTB, 100);

          const mockBalance = await stableCoins.usdc.balanceOf(
            ustbRedemption.address,
          );
          await ustbRedemption.withdraw(
            stableCoins.usdc.address,
            owner.address,
            mockBalance,
          );

          expect(
            await stableCoins.usdc.balanceOf(ustbRedemption.address),
          ).to.equal(0);

          await mintToken(mTBILL, owner, 100000);
          await approveBase18(owner, mTBILL, redemptionVaultWithUSTB, 100000);
          await addPaymentTokenTest(
            { vault: redemptionVaultWithUSTB, owner },
            stableCoins.usdc,
            dataFeed.address,
            0,
            true,
          );

          // Try to redeem - should fail because USTB redemption has no USDC
          await expect(
            redemptionVaultWithUSTB['redeemInstant(address,uint256,uint256)'](
              stableCoins.usdc.address,
              parseUnits('10000'),
              0,
            ),
          ).to.be.revertedWith('USTBRedemptionMock: InsufficientBalance');
        });

        it('redeem 100 mTBILL (custom recipient overload)', async () => {
          const {
            owner,
            redemptionVaultWithUSTB,
            stableCoins,
            mTBILL,
            mTokenToUsdDataFeed,
            regularAccounts,
            dataFeed,
            customRecipient,
          } = await loadFixture(defaultDeploy);

          await mintToken(stableCoins.usdc, redemptionVaultWithUSTB, 100000);
          await mintToken(mTBILL, regularAccounts[0], 100);
          await approveBase18(
            regularAccounts[0],
            mTBILL,
            redemptionVaultWithUSTB,
            100,
          );
          await addPaymentTokenTest(
            { vault: redemptionVaultWithUSTB, owner },
            stableCoins.usdc,
            dataFeed.address,
            0,
            true,
          );

          await redeemInstantTest(
            {
              redemptionVault: redemptionVaultWithUSTB,
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

        it('redeem 100 mTBILL when recipient == msg.sender (custom recipient overload)', async () => {
          const {
            owner,
            redemptionVaultWithUSTB,
            stableCoins,
            mTBILL,
            mTokenToUsdDataFeed,
            regularAccounts,
            dataFeed,
          } = await loadFixture(defaultDeploy);

          await mintToken(stableCoins.usdc, redemptionVaultWithUSTB, 100000);
          await mintToken(mTBILL, regularAccounts[0], 100);
          await approveBase18(
            regularAccounts[0],
            mTBILL,
            redemptionVaultWithUSTB,
            100,
          );
          await addPaymentTokenTest(
            { vault: redemptionVaultWithUSTB, owner },
            stableCoins.usdc,
            dataFeed.address,
            0,
            true,
          );

          await redeemInstantTest(
            {
              redemptionVault: redemptionVaultWithUSTB,
              owner,
              mTBILL,
              mTokenToUsdDataFeed,
              customRecipient: regularAccounts[0],
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
            redemptionVaultWithUSTB,
            stableCoins,
            mTBILL,
            mTokenToUsdDataFeed,
            regularAccounts,
            dataFeed,
            customRecipient,
          } = await loadFixture(defaultDeploy);

          await pauseVaultFn(
            redemptionVaultWithUSTB,
            encodeFnSelector('redeemInstant(address,uint256,uint256)'),
          );
          await mintToken(stableCoins.usdc, redemptionVaultWithUSTB, 100000);
          await mintToken(mTBILL, regularAccounts[0], 100);
          await approveBase18(
            regularAccounts[0],
            mTBILL,
            redemptionVaultWithUSTB,
            100,
          );
          await addPaymentTokenTest(
            { vault: redemptionVaultWithUSTB, owner },
            stableCoins.usdc,
            dataFeed.address,
            0,
            true,
          );

          await redeemInstantTest(
            {
              redemptionVault: redemptionVaultWithUSTB,
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
            redemptionVaultWithUSTB,
            stableCoins,
            mTBILL,
            mTokenToUsdDataFeed,
            regularAccounts,
            dataFeed,
          } = await loadFixture(defaultDeploy);

          await pauseVaultFn(
            redemptionVaultWithUSTB,
            encodeFnSelector('redeemInstant(address,uint256,uint256,address)'),
          );
          await mintToken(stableCoins.usdc, redemptionVaultWithUSTB, 100000);
          await mintToken(mTBILL, regularAccounts[0], 100);
          await approveBase18(
            regularAccounts[0],
            mTBILL,
            redemptionVaultWithUSTB,
            100,
          );
          await addPaymentTokenTest(
            { vault: redemptionVaultWithUSTB, owner },
            stableCoins.usdc,
            dataFeed.address,
            0,
            true,
          );

          await redeemInstantTest(
            {
              redemptionVault: redemptionVaultWithUSTB,
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

      describe('redeemInstant() complex', () => {
        it('should fail: when is paused', async () => {
          const {
            redemptionVaultWithUSTB: redemptionVault,
            owner,
            mTBILL,
            stableCoins,
            regularAccounts,
            dataFeed,
            mTokenToUsdDataFeed,
          } = await loadFixture(defaultDeploy);

          await pauseVault(redemptionVault);
          await mintToken(stableCoins.usdc, redemptionVault, 100);
          await mintToken(mTBILL, regularAccounts[0], 100);
          await approveBase18(
            regularAccounts[0],
            stableCoins.usdc,
            redemptionVault,
            100,
          );
          await addPaymentTokenTest(
            { vault: redemptionVault, owner },
            stableCoins.usdc,
            dataFeed.address,
            0,
            true,
          );

          await redeemInstantTest(
            { redemptionVault, owner, mTBILL, mTokenToUsdDataFeed },
            stableCoins.usdc,
            100,
            {
              from: regularAccounts[0],
              revertMessage: 'Pausable: paused',
            },
          );
        });

        it('is on pause, but admin can use everything', async () => {
          const {
            redemptionVaultWithUSTB: redemptionVault,
            owner,
            mTBILL,
            stableCoins,
            dataFeed,
            mTokenToUsdDataFeed,
          } = await loadFixture(defaultDeploy);

          await pauseVault(redemptionVault);

          await mintToken(stableCoins.usdc, redemptionVault, 100);
          await mintToken(mTBILL, owner, 100);
          await approveBase18(owner, mTBILL, redemptionVault, 100);
          await addPaymentTokenTest(
            { vault: redemptionVault, owner },
            stableCoins.usdc,
            dataFeed.address,
            0,
            true,
          );

          await redeemInstantTest(
            { redemptionVault, owner, mTBILL, mTokenToUsdDataFeed },
            stableCoins.usdc,
            100,
            {
              revertMessage: 'Pausable: paused',
            },
          );
        });

        it('redeem 100 mtbill, when price is 5$ and contract balance 100 USDC and USTB to cover remaining amount, 125 mtbill when price is 5.1$, 114 mtbill when price is 5.4$', async () => {
          const {
            owner,
            mockedAggregator,
            redemptionVaultWithUSTB: redemptionVault,
            stableCoins,
            mTBILL,
            dataFeed,
            mTokenToUsdDataFeed,
            mockedAggregatorMToken,
            ustbToken,
            ustbRedemption,
          } = await loadFixture(defaultDeploy);

          await ustbRedemption.setChainlinkData(parseUnits('1', 8), false); // Set USTB price to $1

          await mintToken(mTBILL, owner, 100 + 125 + 114);

          await mintToken(stableCoins.usdc, redemptionVault, 100);
          await mintToken(ustbToken, redemptionVault, 100000);

          await approveBase18(owner, mTBILL, redemptionVault, 100 + 125 + 114);

          await addPaymentTokenTest(
            { vault: redemptionVault, owner },
            stableCoins.usdc,
            dataFeed.address,
            0,
            true,
          );

          await ustbRedemption.setMaxUstbRedemptionAmount(
            parseUnits('10000', 6),
          );

          await setRoundData({ mockedAggregator: mockedAggregatorMToken }, 5);
          await setRoundData({ mockedAggregator }, 1.04);

          const additionalLiquidity = async () =>
            (
              await ustbRedemption.calculateUsdcOut(
                await ustbToken.balanceOf(redemptionVault.address),
              )
            ).usdcOutAmountAfterFee;

          await redeemInstantTest(
            {
              redemptionVault,
              owner,
              mTBILL,
              mTokenToUsdDataFeed,
              additionalLiquidity,
            },
            stableCoins.usdc,
            100,
          );

          await setRoundData({ mockedAggregator }, 1);
          await setRoundData({ mockedAggregator: mockedAggregatorMToken }, 5.1);
          await redeemInstantTest(
            {
              redemptionVault,
              owner,
              mTBILL,
              mTokenToUsdDataFeed,
              additionalLiquidity,
            },
            stableCoins.usdc,
            125,
          );

          await setRoundData({ mockedAggregator }, 1.01);
          await setRoundData({ mockedAggregator: mockedAggregatorMToken }, 5.4);
          await redeemInstantTest(
            {
              redemptionVault,
              owner,
              mTBILL,
              mTokenToUsdDataFeed,
              additionalLiquidity,
            },
            stableCoins.usdc,
            114,
          );
        });
      });
    });
  },
);
