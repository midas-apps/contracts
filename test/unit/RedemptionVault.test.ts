import { loadFixture } from '@nomicfoundation/hardhat-network-helpers';

import { redemptionVaultSuits } from './suits/redemption-vault.suits';

import { approveBase18, mintToken } from '../common/common.helpers';
import { setRoundData } from '../common/data-feed.helpers';
import { defaultDeploy, mTokenPermissionedFixture } from '../common/fixtures';
import {
  addPaymentTokenTest,
  setInstantFeeTest,
} from '../common/manageable-vault.helpers';
import { redeemInstantTest } from '../common/redemption-vault.helpers';

redemptionVaultSuits(
  'RedemptionVault',
  defaultDeploy,
  'redemptionVault',
  async () => {},
  (_defaultDeploy) => {
    describe('redeemInstant()', () => {
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

      it('with permissioned mToken - redeem instant burns mToken from non-greenlisted user when fee is not 0', async () => {
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
        );
      });
    });
  },
);
