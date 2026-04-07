import { loadFixture } from '@nomicfoundation/hardhat-network-helpers';
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';

import { depositVaultSuits } from './suits/deposit-vault.suits';

import { DepositVaultTest__factory } from '../../typechain-types';
import { acErrors } from '../common/ac.helpers';
import { approveBase18, mintToken } from '../common/common.helpers';
import { setRoundData } from '../common/data-feed.helpers';
import { depositInstantTest } from '../common/deposit-vault.helpers';
import { defaultDeploy, mTokenPermissionedFixture } from '../common/fixtures';
import { addPaymentTokenTest } from '../common/manageable-vault.helpers';

depositVaultSuits(
  'DepositVault',
  defaultDeploy,
  {
    createNew: async (owner: SignerWithAddress) =>
      new DepositVaultTest__factory(owner).deploy(),
    key: 'depositVault',
  },
  async () => {},
  (defaultDeploy) => {
    describe('DepositVault', function () {
      describe('depositInstant() with permissioned mToken', () => {
        it('with permissioned mToken - deposit instant mints mToken to greenlisted user', async () => {
          const baseFixture = await defaultDeploy();
          const {
            owner,
            accessControl,
            stableCoins,
            dataFeed,
            mTokenToUsdDataFeed,
            mockedAggregator,
            mTokenPermissioned,
            mTokenPermissionedRoles,
            mTokenPermissionedDepositVault,
          } = await loadFixture(
            mTokenPermissionedFixture.bind(this, baseFixture),
          );

          await accessControl.grantRole(
            mTokenPermissionedRoles.greenlisted,
            owner.address,
          );
          await addPaymentTokenTest(
            { vault: mTokenPermissionedDepositVault, owner },
            stableCoins.dai,
            dataFeed.address,
            0,
            true,
          );
          await setRoundData({ mockedAggregator }, 1);

          await mintToken(stableCoins.dai, owner, 100_000);
          await approveBase18(
            owner,
            stableCoins.dai,
            mTokenPermissionedDepositVault,
            100_000,
          );

          await depositInstantTest(
            {
              depositVault: mTokenPermissionedDepositVault,
              owner,
              mTBILL: mTokenPermissioned,
              mTokenToUsdDataFeed,
            },
            stableCoins.dai,
            1000,
          );
        });

        it('should fail: with permissioned mToken - deposit instant mints mToken to non-greenlisted user', async () => {
          const baseFixture = await defaultDeploy();
          const {
            owner,
            stableCoins,
            dataFeed,
            mTokenToUsdDataFeed,
            mockedAggregator,
            mTokenPermissioned,
            mTokenPermissionedDepositVault,
          } = await loadFixture(
            mTokenPermissionedFixture.bind(this, baseFixture),
          );

          await addPaymentTokenTest(
            { vault: mTokenPermissionedDepositVault, owner },
            stableCoins.dai,
            dataFeed.address,
            0,
            true,
          );
          await setRoundData({ mockedAggregator }, 1);

          await mintToken(stableCoins.dai, owner, 100_000);
          await approveBase18(
            owner,
            stableCoins.dai,
            mTokenPermissionedDepositVault,
            100_000,
          );

          await depositInstantTest(
            {
              depositVault: mTokenPermissionedDepositVault,
              owner,
              mTBILL: mTokenPermissioned,
              mTokenToUsdDataFeed,
            },
            stableCoins.dai,
            1000,
            {
              revertMessage: acErrors.WMAC_HASNT_ROLE,
            },
          );
        });
      });
    });
  },
);
