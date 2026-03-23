import { loadFixture } from '@nomicfoundation/hardhat-network-helpers';
import { parseUnits } from 'ethers/lib/utils';
import { ethers } from 'hardhat';

import { redemptionVaultSuits } from './suits/redemption-vault.suits';

import { encodeFnSelector } from '../../helpers/utils';
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
import { defaultDeploy, mTokenPermissionedFixture } from '../common/fixtures';
import {
  addPaymentTokenTest,
  addWaivedFeeAccountTest,
  changeTokenAllowanceTest,
  removePaymentTokenTest,
  setInstantFeeTest,
  setInstantDailyLimitTest,
  setMinAmountTest,
  withdrawTest,
} from '../common/manageable-vault.helpers';
import {
  redeemInstantTest,
  setLoanLpTest,
} from '../common/redemption-vault.helpers';
import { sanctionUser } from '../common/with-sanctions-list.helpers';

redemptionVaultSuits(
  'RedemptionVault',
  defaultDeploy,
  async () => {},
  (defaultDeploy) => {
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
        } = await loadFixture(defaultDeploy);

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
        } = await loadFixture(defaultDeploy);

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
        } = await loadFixture(defaultDeploy);
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
        } = await loadFixture(defaultDeploy);

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
        } = await loadFixture(defaultDeploy);

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
        } = await loadFixture(defaultDeploy);
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
        } = await loadFixture(defaultDeploy);
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
        } = await loadFixture(defaultDeploy);

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
        } = await loadFixture(defaultDeploy);

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
        } = await loadFixture(defaultDeploy);
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
        } = await loadFixture(defaultDeploy);
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
        } = await loadFixture(defaultDeploy);
        await addPaymentTokenTest(
          { vault: redemptionVault, owner },
          stableCoins.dai,
          dataFeed.address,
          0,
          true,
        );
        await setRoundData({ mockedAggregator }, 4);

        await mintToken(mTBILL, owner, 100_000);
        await setInstantDailyLimitTest({ vault: redemptionVault, owner }, 1000);

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
        } = await loadFixture(defaultDeploy);
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
        } = await loadFixture(defaultDeploy);

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
        } = await loadFixture(defaultDeploy);

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
        } = await loadFixture(defaultDeploy);

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
        } = await loadFixture(defaultDeploy);

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
        } = await loadFixture(defaultDeploy);
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
        } = await loadFixture(defaultDeploy);

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
        } = await loadFixture(defaultDeploy);

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
        } = await loadFixture(defaultDeploy);

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
        } = await loadFixture(defaultDeploy);

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

      it('should fail: when not enough liquidity on both vault and loan lp', async () => {
        const {
          owner,
          redemptionVault,
          stableCoins,
          mTBILL,
          mTokenToUsdDataFeed,
          dataFeed,
          loanLp,
        } = await loadFixture(defaultDeploy);

        await mintToken(mTBILL, owner, 100);
        await approveBase18(loanLp, stableCoins.dai, redemptionVault, 1000);
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
        } = await loadFixture(defaultDeploy);

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
            revertMessage: 'RV: loanLp not set',
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
        } = await loadFixture(defaultDeploy);

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

      it('with permissioned mToken - burns/transfers mToken from greenlisted user and fee recipient', async () => {
        const {
          owner,
          stableCoins,
          dataFeed,
          mTokenToUsdDataFeed,
          mockedAggregator,
          mockedAggregatorMToken,
          mTokenPermissioned,
          mTokenPermissionedRoles,
          accessControl,
          mTokenPermissionedRedemptionVault,
        } = await loadFixture(mTokenPermissionedFixture);

        await accessControl.grantRole(
          mTokenPermissionedRoles.greenlisted,
          owner.address,
        );

        await accessControl.grantRole(
          mTokenPermissionedRoles.greenlisted,
          await mTokenPermissionedRedemptionVault.feeReceiver(),
        );
        await mintToken(mTokenPermissioned, owner, 100_000);
        await setInstantFeeTest(
          { vault: mTokenPermissionedRedemptionVault, owner },
          1000,
        );
        await approveBase18(
          owner,
          mTokenPermissioned,
          mTokenPermissionedRedemptionVault,
          100_000,
        );

        await mintToken(
          stableCoins.dai,
          mTokenPermissionedRedemptionVault,
          100_000,
        );
        await addPaymentTokenTest(
          { vault: mTokenPermissionedRedemptionVault, owner },
          stableCoins.dai,
          dataFeed.address,
          0,
          true,
        );

        await setRoundData({ mockedAggregator }, 1);
        await setRoundData({ mockedAggregator: mockedAggregatorMToken }, 1);

        await redeemInstantTest(
          {
            redemptionVault: mTokenPermissionedRedemptionVault,
            owner,
            mTBILL: mTokenPermissioned,
            mTokenToUsdDataFeed,
          },
          stableCoins.dai,
          999,
        );
      });

      it('with permissioned mToken - instant fee is 0, burns/transfers mToken from non-greenlisted user', async () => {
        const {
          owner,
          stableCoins,
          dataFeed,
          mTokenToUsdDataFeed,
          mockedAggregator,
          mockedAggregatorMToken,
          mTokenPermissioned,
          mTokenPermissionedRoles,
          accessControl,
          mTokenPermissionedRedemptionVault,
        } = await loadFixture(mTokenPermissionedFixture);

        await accessControl.grantRole(
          mTokenPermissionedRoles.greenlisted,
          owner.address,
        );
        await mintToken(mTokenPermissioned, owner, 100_000);
        await accessControl.revokeRole(
          mTokenPermissionedRoles.greenlisted,
          owner.address,
        );
        await setInstantFeeTest(
          { vault: mTokenPermissionedRedemptionVault, owner },
          0,
        );
        await approveBase18(
          owner,
          mTokenPermissioned,
          mTokenPermissionedRedemptionVault,
          100_000,
        );

        await mintToken(
          stableCoins.dai,
          mTokenPermissionedRedemptionVault,
          100_000,
        );
        await addPaymentTokenTest(
          { vault: mTokenPermissionedRedemptionVault, owner },
          stableCoins.dai,
          dataFeed.address,
          0,
          true,
        );

        await setRoundData({ mockedAggregator }, 1);
        await setRoundData({ mockedAggregator: mockedAggregatorMToken }, 1);

        await redeemInstantTest(
          {
            redemptionVault: mTokenPermissionedRedemptionVault,
            owner,
            mTBILL: mTokenPermissioned,
            mTokenToUsdDataFeed,
          },
          stableCoins.dai,
          999,
        );
      });

      it('should fail: with permissioned mToken - burns/transfers mToken from greenlisted user but fee recipient is not greenlisted', async () => {
        const {
          owner,
          stableCoins,
          dataFeed,
          mTokenToUsdDataFeed,
          mockedAggregator,
          mockedAggregatorMToken,
          mTokenPermissioned,
          mTokenPermissionedRoles,
          accessControl,
          mTokenPermissionedRedemptionVault,
        } = await loadFixture(mTokenPermissionedFixture);

        await accessControl.grantRole(
          mTokenPermissionedRoles.greenlisted,
          owner.address,
        );
        await mintToken(mTokenPermissioned, owner, 100_000);
        await setInstantFeeTest(
          { vault: mTokenPermissionedRedemptionVault, owner },
          1000,
        );
        await approveBase18(
          owner,
          mTokenPermissioned,
          mTokenPermissionedRedemptionVault,
          100_000,
        );

        await mintToken(
          stableCoins.dai,
          mTokenPermissionedRedemptionVault,
          100_000,
        );
        await addPaymentTokenTest(
          { vault: mTokenPermissionedRedemptionVault, owner },
          stableCoins.dai,
          dataFeed.address,
          0,
          true,
        );

        await setRoundData({ mockedAggregator }, 1);
        await setRoundData({ mockedAggregator: mockedAggregatorMToken }, 1);

        await redeemInstantTest(
          {
            redemptionVault: mTokenPermissionedRedemptionVault,
            owner,
            mTBILL: mTokenPermissioned,
            mTokenToUsdDataFeed,
          },
          stableCoins.dai,
          999,
          {
            revertMessage: acErrors.WMAC_HASNT_ROLE,
          },
        );
      });

      it('should fail: with permissioned mToken - redeem instant burns/transfers mToken from non-greenlisted user', async () => {
        const {
          owner,
          stableCoins,
          dataFeed,
          mTokenToUsdDataFeed,
          mockedAggregator,
          mockedAggregatorMToken,
          mTokenPermissioned,
          mTokenPermissionedRedemptionVault,
          mTokenPermissionedRoles,
          accessControl,
        } = await loadFixture(mTokenPermissionedFixture);

        await accessControl.grantRole(
          mTokenPermissionedRoles.greenlisted,
          owner.address,
        );
        await mintToken(mTokenPermissioned, owner, 100_000);
        await setInstantFeeTest(
          { vault: mTokenPermissionedRedemptionVault, owner },
          1000,
        );
        await accessControl.revokeRole(
          mTokenPermissionedRoles.greenlisted,
          owner.address,
        );
        await approveBase18(
          owner,
          mTokenPermissioned,
          mTokenPermissionedRedemptionVault,
          100_000,
        );

        await mintToken(
          stableCoins.dai,
          mTokenPermissionedRedemptionVault,
          100_000,
        );
        await addPaymentTokenTest(
          { vault: mTokenPermissionedRedemptionVault, owner },
          stableCoins.dai,
          dataFeed.address,
          0,
          true,
        );

        await setRoundData({ mockedAggregator }, 1);
        await setRoundData({ mockedAggregator: mockedAggregatorMToken }, 1);

        await redeemInstantTest(
          {
            redemptionVault: mTokenPermissionedRedemptionVault,
            owner,
            mTBILL: mTokenPermissioned,
            mTokenToUsdDataFeed,
          },
          stableCoins.dai,
          999,
          {
            revertMessage: acErrors.WMAC_HASNT_ROLE,
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
        } = await loadFixture(defaultDeploy);

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

      it('when enough liquidity on loan lp but not on vault', async () => {
        const {
          owner,
          redemptionVault,
          stableCoins,
          mTBILL,
          mTokenToUsdDataFeed,
          dataFeed,
          loanLp,
        } = await loadFixture(defaultDeploy);

        await mintToken(mTBILL, owner, 100);
        await mintToken(stableCoins.dai, loanLp, 1000);

        await approveBase18(loanLp, stableCoins.dai, redemptionVault, 1000);
        await withdrawTest(
          { vault: redemptionVault, owner },
          stableCoins.dai,
          await stableCoins.dai.balanceOf(redemptionVault.address),
          owner,
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
        } = await loadFixture(defaultDeploy);

        await mintToken(mTBILL, owner, 100);
        await mintToken(stableCoins.dai, loanLp, 75);
        await mintToken(stableCoins.dai, redemptionVault, 25);

        await approveBase18(loanLp, stableCoins.dai, redemptionVault, 75);

        await setRoundData({ mockedAggregator: mockedAggregatorMToken }, 1);
        await setRoundData({ mockedAggregator }, 1);

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
        } = await loadFixture(defaultDeploy);

        await mintToken(mTBILL, owner, 100);
        await mintToken(stableCoins.dai, loanLp, 75);
        await mintToken(stableCoins.dai, redemptionVault, 25);

        await approveBase18(loanLp, stableCoins.dai, redemptionVault, 75);

        await setRoundData({ mockedAggregator: mockedAggregatorMToken }, 1);
        await setRoundData({ mockedAggregator }, 1);

        await addPaymentTokenTest(
          { vault: redemptionVault, owner },
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
        } = await loadFixture(defaultDeploy);

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
        } = await loadFixture(defaultDeploy);

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
        } = await loadFixture(defaultDeploy);

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
        } = await loadFixture(defaultDeploy);

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
        } = await loadFixture(defaultDeploy);

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
        } = await loadFixture(defaultDeploy);

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
        } = await loadFixture(defaultDeploy);

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
        } = await loadFixture(defaultDeploy);

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
        } = await loadFixture(defaultDeploy);

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
        } = await loadFixture(defaultDeploy);

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
        } = await loadFixture(defaultDeploy);

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
  },
);
