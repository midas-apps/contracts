import { expect } from 'chai';
import { constants } from 'ethers';
import { parseUnits } from 'ethers/lib/utils';

import {
  upgradeAccessControl,
  upgradeCustomAggregators,
  upgradeDataFeeds,
  upgradeMToken,
  V1CompatFixture,
  v1CompatFixture,
  v1CompatTokens,
} from './fixtures/v1-compat.fixture';
import {
  approveRequestTest,
  depositInstantTest,
  grantRole,
  mTokenPauseTest,
  redeemInstantTest,
  redeemRequestTest,
  revokeRole,
  v1BlacklistTest,
  v1GreenlistTest,
  V1Request,
  v1VaultPermissionsTest,
  v1VaultsFlowTest,
} from './helpers/v1-vaults.helpers';

import { mTokensMetadata } from '../../helpers/mtokens-metadata';

/**
 * Migration is done step by step: AccessControl, data feeds, custom
 * aggregators, then mTokens. Vaults are not upgraded, new ones are deployed,
 * so V1 vaults have to keep working after every step.
 */
describe('V1 vaults compatibility - step by step V2 migration', function () {
  this.timeout(30 * 60 * 1000);

  v1CompatTokens.forEach((config) => {
    describe(`${config.mToken} on ${config.network} at block ${config.forkBlock}`, () => {
      let fixture: V1CompatFixture;
      let pendingRequests: V1Request[] = [];

      const steps = [
        { title: 'before any upgrade', upgrade: async () => undefined },
        { title: 'after AccessControl upgrade', upgrade: upgradeAccessControl },
        { title: 'after data feeds upgrade', upgrade: upgradeDataFeeds },
        {
          title: 'after custom aggregators upgrade',
          upgrade: upgradeCustomAggregators,
        },
        { title: 'after mToken upgrade', upgrade: upgradeMToken },
      ];

      const depositVault = () => fixture.vaults.find((v) => v.isDeposit);
      const redemptionVault = () => fixture.vaults.find((v) => !v.isDeposit);

      before(async () => {
        fixture = await v1CompatFixture(config);
      });

      steps.forEach(({ title, upgrade }) => {
        describe(title, () => {
          before(async () => {
            await upgrade(fixture);
          });

          it('should approve V1 requests created before this step', async function () {
            if (pendingRequests.length === 0) this.skip();

            for (const request of pendingRequests) {
              await approveRequestTest(fixture, request);
            }
            pendingRequests = [];
          });

          it('should depositInstant, depositRequest, redeemInstant, redeemRequest', async () => {
            pendingRequests = await v1VaultsFlowTest(fixture);
          });

          it('should keep V1 vault roles and pause working', async () => {
            await v1VaultPermissionsTest(fixture);
          });

          it('should keep V1 vault and mToken greenlist working', async () => {
            await v1GreenlistTest(fixture);
          });

          it('should keep V1 vault and mToken blacklist working', async () => {
            await v1BlacklistTest(fixture);
          });

          it('should block V1 vaults when mToken is paused', async () => {
            await mTokenPauseTest(fixture, fixture.pauseManager);
          });
        });
      });

      describe('after full migration', () => {
        it('should approve V1 requests created at the last step', async () => {
          for (const request of pendingRequests) {
            await approveRequestTest(fixture, request);
          }
          pendingRequests = [];
        });

        it('should not pause V1 vaults through PauseManager', async () => {
          // V1 vaults do not read PauseManager, they are paused with their own pause()
          const pauseManager = fixture.pauseManager!.connect(fixture.operator);
          const vaults = fixture.vaults.map((v) => v.contract.address);

          await pauseManager.bulkPauseContract(vaults);

          const dv = depositVault();
          const rv = redemptionVault();
          if (dv) await depositInstantTest(fixture, dv);
          if (rv) await redeemInstantTest(fixture, rv);

          await pauseManager.bulkUnpauseContract(vaults);
        });

        it('should apply mToken max supply cap to V1 deposits', async function () {
          const dv = depositVault();
          if (!dv) this.skip();

          const mToken = fixture.mToken.connect(fixture.operator);

          await mToken.setMaxSupplyCap(await mToken.totalSupply());
          await expect(
            depositInstantTest(fixture, dv!),
          ).revertedWithCustomError(mToken, 'MaxSupplyCapExceeded');

          await mToken.setMaxSupplyCap(constants.MaxUint256);
          await depositInstantTest(fixture, dv!);
        });

        it('should apply mToken mint rate limit to V1 deposits', async function () {
          const dv = depositVault();
          if (!dv) this.skip();

          const mToken = fixture.mToken.connect(fixture.operator);
          const bucket = await mToken.walletBucketId(dv!.contract.address);

          await mToken.increaseMintRateLimit(bucket, 86400, 1);
          await expect(
            depositInstantTest(fixture, dv!),
          ).revertedWithCustomError(mToken, 'WindowLimitExceeded');

          await mToken.removeMintRateLimitConfig(bucket, 86400);
          await depositInstantTest(fixture, dv!);
        });

        it('should require greenlisted V1 redemption vault for permissioned mToken', async function () {
          const rv = redemptionVault();
          if (!mTokensMetadata[config.mToken].isPermissioned || !rv)
            this.skip();

          const { mToken } = fixture;
          const greenlistedRole = await mToken.greenlistedRole();

          await revokeRole(fixture, greenlistedRole, rv!.contract.address);
          await expect(redeemRequestTest(fixture, rv!))
            .revertedWithCustomError(mToken, 'NotGreenlisted')
            .withArgs(rv!.contract.address, greenlistedRole);

          await grantRole(fixture, greenlistedRole, rv!.contract.address);
          pendingRequests.push(await redeemRequestTest(fixture, rv!));
        });

        it('should block V1 redemptions leaving less than min holding balance', async function () {
          const rv = redemptionVault();
          if (!mTokensMetadata[config.mToken].isMinBalance || !rv) this.skip();

          const { mToken, holder, paymentToken } = fixture;
          const balance = await mToken.balanceOf(holder.address);

          await expect(
            rv!.contract
              .connect(holder)
              .redeemRequest(
                paymentToken.address,
                balance.sub(parseUnits('0.5')),
              ),
          ).revertedWithCustomError(mToken, 'MinBalanceNotMet');
        });

        it('should keep V1 vaults working after the checks above', async () => {
          for (const request of pendingRequests) {
            await approveRequestTest(fixture, request);
          }
          for (const request of await v1VaultsFlowTest(fixture)) {
            await approveRequestTest(fixture, request);
          }
          pendingRequests = [];
        });
      });
    });
  });
});
