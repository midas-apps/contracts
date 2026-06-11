import { loadFixture } from '@nomicfoundation/hardhat-network-helpers';
import { increase } from '@nomicfoundation/hardhat-network-helpers/dist/src/helpers/time';
import { days } from '@nomicfoundation/hardhat-network-helpers/dist/src/helpers/time/duration';
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { expect } from 'chai';
import { BytesLike, constants } from 'ethers';
import { parseUnits } from 'ethers/lib/utils';
import { ethers } from 'hardhat';

import { mainnetUpgradeFixture } from './fixtures/upgrades.fixture';

import { getAllRoles, getRolesForToken } from '../../helpers/roles';
import {
  AggregatorV3Mock__factory,
  MidasAccessControl,
  MidasAccessControlTimelockController,
  MidasTimelockManager,
} from '../../typechain-types';
import { acErrors, grantRoleMultTester } from '../common/ac.helpers';
import { pauseGlobalTest } from '../common/common.helpers';
import { burn, mint } from '../common/mtoken.helpers';
import {
  executeTimelockOperationTester,
  scheduleTimelockOperationsTester,
} from '../common/timelock-manager.helpers';

describe('ContractsUpgrade - Mainnet Upgrade Integration Tests', function () {
  this.timeout(120000);

  const resetTimelockDelays = async ({
    timelockManager,
    acDefaultAdmin,
    accessControl,
    timelock,
  }: {
    timelockManager: MidasTimelockManager;
    acDefaultAdmin: SignerWithAddress;
    accessControl: MidasAccessControl;
    timelock: MidasAccessControlTimelockController;
  }) => {
    const roles = getAllRoles();

    const rolesToReset = [
      roles.common.defaultAdmin,
      roles.common.pauseAdmin,
      roles.common.timelockOperationPauser,
      roles.common.securityCouncilManager,
      roles.common.greenlistedOperator,
      roles.common.blacklistedOperator,
      roles.tokenRoles.mTBILL.minter,
      roles.tokenRoles.mTBILL.burner,
      roles.tokenRoles.mTBILL.pauser,
      roles.tokenRoles.mGLOBAL.minter,
      roles.tokenRoles.mGLOBAL.burner,
      roles.tokenRoles.mGLOBAL.pauser,
      roles.tokenRoles.mTBILL.customFeedAdmin as string,
      roles.tokenRoles.mGLOBAL.customFeedAdmin as string,
      roles.common.greenlisted,
      roles.common.blacklisted,
    ];

    // await setRoleTimelocksAndExecute(
    //   {
    //     timelockManager,
    //     accessControl,
    //     timelock,
    //     owner: acDefaultAdmin,
    //   },
    //   rolesToReset.map((role) => ({
    //     role,
    //     delay: NO_DELAY,
    //   })),
    // );
  };

  // every role has a default timelock delay of 1 hour when no explicit delay is set
  const DEFAULT_TIMELOCK_DELAY = 3600;

  type TimelockContext = {
    timelockManager: MidasTimelockManager;
    timelock: MidasAccessControlTimelockController;
    accessControl: MidasAccessControl;
    owner: SignerWithAddress;
  };

  /**
   * Schedules an operation through the timelock manager, waits the default
   * delay and executes it. Mirrors the flow used in MidasTimelockManager.test.ts.
   */
  const executeWriteViaTimelock = async (
    ctx: TimelockContext,
    target: string,
    calldata: BytesLike,
    proposer: SignerWithAddress,
    {
      delay = DEFAULT_TIMELOCK_DELAY,
      checkAndSetDefaultDelay = true,
    }: { delay?: number; checkAndSetDefaultDelay?: boolean } = {},
  ) => {
    if (checkAndSetDefaultDelay) {
      const defaultDelay = await ctx.accessControl.defaultDelay();

      if (defaultDelay === 0) {
        await executeWriteViaTimelock(
          ctx,
          ctx.accessControl.address,
          ctx.accessControl.interface.encodeFunctionData('setDefaultDelay', [
            delay,
          ]),
          ctx.owner,
          { delay: days(2), checkAndSetDefaultDelay: false },
        );
      }
    }

    await scheduleTimelockOperationsTester(
      ctx,
      [target],
      [calldata as string],
      {},
      { from: proposer },
    );

    await increase(delay + 1);

    await executeTimelockOperationTester(
      ctx,
      target,
      calldata as string,
      proposer.address,
      { from: ctx.owner },
    );
  };

  /**
   * Grants a role to `account` through the timelock flow (no delay reset).
   * The proposer must hold the admin role of `role` (DEFAULT_ADMIN_ROLE).
   */
  const grantRoleViaTimelock = async (
    ctx: TimelockContext,
    role: string,
    account: string,
    proposer: SignerWithAddress,
  ) => {
    await executeWriteViaTimelock(
      ctx,
      ctx.accessControl.address,
      ctx.accessControl.interface.encodeFunctionData(
        'grantRole(bytes32,address)',
        [role, account],
      ),
      proposer,
    );
  };

  /**
   * Grants multiple roles (sharing the same admin role) through the timelock.
   */
  const grantRoleMultViaTimelock = async (
    ctx: TimelockContext,
    roles: string[],
    accounts: string[],
    proposer: SignerWithAddress,
  ) => {
    const params = roles.map((role, index) => ({
      role,
      account: accounts[index],
      delay: 0,
    }));
    await executeWriteViaTimelock(
      ctx,
      ctx.accessControl.address,
      ctx.accessControl.interface.encodeFunctionData('grantRoleMult', [params]),
      proposer,
    );
  };
  describe('MidasAccessControl', () => {
    describe('initializeRelationships()', () => {
      it('should expose deployed pause and timelock managers', async () => {
        const { accessControl, pauseManager, timelockManager } =
          await loadFixture(mainnetUpgradeFixture);

        expect(await accessControl.pauseManager()).to.eq(pauseManager.address);
        expect(await accessControl.timelockManager()).to.eq(
          timelockManager.address,
        );
      });
    });

    describe('grantRole()', () => {
      it('should grant role to account', async () => {
        const { accessControl, acDefaultAdmin, timelockManager, timelock } =
          await loadFixture(mainnetUpgradeFixture);
        const roles = getAllRoles();
        const [, recipient] = await ethers.getSigners();

        await resetTimelockDelays({
          timelockManager,
          acDefaultAdmin,
          accessControl,
          timelock,
        });

        await expect(
          accessControl
            .connect(acDefaultAdmin)
            ['grantRole(bytes32,address)'](
              roles.common.pauseAdmin,
              recipient.address,
            ),
        ).not.reverted;

        expect(
          await accessControl.hasRole(
            roles.common.pauseAdmin,
            recipient.address,
          ),
        ).to.eq(true);
      });

      it('should fail: when caller has no admin role', async () => {
        const { accessControl, acDefaultAdmin, timelockManager, timelock } =
          await loadFixture(mainnetUpgradeFixture);
        const roles = getAllRoles();
        const [, recipient, unauthorized] = await ethers.getSigners();

        await resetTimelockDelays({
          timelockManager,
          acDefaultAdmin,
          accessControl,
          timelock,
        });

        await expect(
          accessControl
            .connect(unauthorized)
            ['grantRole(bytes32,address)'](
              roles.common.pauseAdmin,
              recipient.address,
            ),
        ).revertedWithCustomError(
          accessControl,
          acErrors.WMAC_HASNT_PERMISSION().customErrorName,
        );
      });

      it('should grant role via timelock', async () => {
        const { accessControl, acDefaultAdmin, timelockManager, timelock } =
          await loadFixture(mainnetUpgradeFixture);
        const roles = getAllRoles();
        const [, recipient] = await ethers.getSigners();

        await grantRoleViaTimelock(
          { timelockManager, timelock, accessControl, owner: acDefaultAdmin },
          roles.common.pauseAdmin,
          recipient.address,
          acDefaultAdmin,
        );

        expect(
          await accessControl.hasRole(
            roles.common.pauseAdmin,
            recipient.address,
          ),
        ).to.eq(true);
      });
    });

    describe('grantRoleMult()', () => {
      it('should grant multiple roles', async () => {
        const { accessControl, acDefaultAdmin, timelockManager, timelock } =
          await loadFixture(mainnetUpgradeFixture);
        const roles = getAllRoles();
        const [, accountA, accountB] = await ethers.getSigners();

        await resetTimelockDelays({
          timelockManager,
          acDefaultAdmin,
          accessControl,
          timelock,
        });

        await grantRoleMultTester(
          { accessControl, owner: acDefaultAdmin },
          [
            {
              role: roles.common.pauseAdmin,
              account: accountA.address,
              delay: 0,
            },
            {
              role: roles.common.timelockOperationPauser,
              account: accountB.address,
              delay: 0,
            },
          ],
          {
            from: acDefaultAdmin,
          },
        );
      });

      it('should fail: array is empty', async () => {
        const { accessControl, acDefaultAdmin, timelockManager, timelock } =
          await loadFixture(mainnetUpgradeFixture);

        await resetTimelockDelays({
          timelockManager,
          acDefaultAdmin,
          accessControl,
          timelock,
        });

        await grantRoleMultTester(
          { accessControl, owner: acDefaultAdmin },
          [],
          {
            from: acDefaultAdmin,
            revertCustomError: { customErrorName: 'EmptyArray' },
          },
        );
      });
    });
  });

  describe('MidasPauseManager', () => {
    describe('globalPause()', () => {
      it('should pause globally when called by pause admin', async () => {
        const {
          accessControl,
          pauseManager,
          acDefaultAdmin,
          timelockManager,
          timelock,
        } = await loadFixture(mainnetUpgradeFixture);
        const roles = getAllRoles();

        await resetTimelockDelays({
          timelockManager,
          acDefaultAdmin,
          accessControl,
          timelock,
        });

        await accessControl
          .connect(acDefaultAdmin)
          ['grantRole(bytes32,address)'](
            roles.common.pauseAdmin,
            acDefaultAdmin.address,
          );

        await pauseGlobalTest({
          pauseManager,
          owner: acDefaultAdmin,
        });
      });

      it('should fail: when caller has no pause admin permission', async () => {
        const {
          pauseManager,
          timelockManager,
          acDefaultAdmin,
          accessControl,
          timelock,
        } = await loadFixture(mainnetUpgradeFixture);
        const [, unauthorized] = await ethers.getSigners();

        await resetTimelockDelays({
          timelockManager,
          acDefaultAdmin,
          accessControl,
          timelock,
        });

        await pauseGlobalTest(
          { pauseManager, owner: unauthorized },
          {
            from: unauthorized,
            revertCustomError: acErrors.WMAC_HASNT_PERMISSION(),
          },
        );
      });

      it('should fail: pause globally via timelock when pause delay is 0', async () => {
        const {
          accessControl,
          pauseManager,
          acDefaultAdmin,
          timelockManager,
          timelock,
        } = await loadFixture(mainnetUpgradeFixture);
        const roles = getAllRoles();

        const ctx = {
          timelockManager,
          timelock,
          accessControl,
          owner: acDefaultAdmin,
        };

        await grantRoleViaTimelock(
          ctx,
          roles.common.pauseAdmin,
          acDefaultAdmin.address,
          acDefaultAdmin,
        );

        await scheduleTimelockOperationsTester(
          ctx,
          [pauseManager.address],
          [pauseManager.interface.encodeFunctionData('globalPause') as string],
          {},
          {
            from: acDefaultAdmin,
            revertCustomError: {
              contract: timelockManager,
              customErrorName: 'NoTimelockDelayForRole',
            },
          },
        );
      });
    });
  });

  describe('MidasTimelockManager', () => {
    describe('deployment', () => {
      it('should link to access control and timelock controller', async () => {
        const {
          accessControl,
          timelockManager,
          timelock,
          securityCouncilMembers,
        } = await loadFixture(mainnetUpgradeFixture);

        expect(await timelockManager.accessControl()).to.eq(
          accessControl.address,
        );
        expect(await timelockManager.timelock()).to.eq(timelock.address);
        expect(await timelockManager.councilQuorum(0)).to.eq(3);
        expect(await timelockManager.getSecurityCouncilMembers(0)).to.deep.eq(
          securityCouncilMembers.map((s) => s.address),
        );
      });
    });
  });

  describe('mTBILL', () => {
    const mTbillRoles = getRolesForToken('mTBILL');

    describe('mint()', () => {
      it('should mint tokens to recipient', async () => {
        const {
          mTbill,
          accessControl,
          acDefaultAdmin,
          timelockManager,
          timelock,
        } = await loadFixture(mainnetUpgradeFixture);
        const [, recipient] = await ethers.getSigners();
        const amount = parseUnits('1');

        await resetTimelockDelays({
          timelockManager,
          acDefaultAdmin,
          accessControl,
          timelock,
        });

        await accessControl
          .connect(acDefaultAdmin)
          ['grantRole(bytes32,address)'](
            mTbillRoles.minter,
            acDefaultAdmin.address,
          );

        await mint(
          { tokenContract: mTbill, owner: acDefaultAdmin },
          recipient.address,
          amount,
        );

        expect(await mTbill.balanceOf(recipient.address)).to.eq(amount);
      });

      it('should fail: when caller has no mint operator role', async () => {
        const {
          mTbill,
          timelockManager,
          acDefaultAdmin,
          accessControl,
          timelock,
        } = await loadFixture(mainnetUpgradeFixture);
        const [, recipient, unauthorized] = await ethers.getSigners();

        await resetTimelockDelays({
          timelockManager,
          acDefaultAdmin,
          accessControl,
          timelock,
        });

        await expect(
          mTbill.connect(unauthorized).mint(recipient.address, 1),
        ).revertedWithCustomError(
          mTbill,
          acErrors.WMAC_HASNT_PERMISSION().customErrorName,
        );
      });

      it('should fail: when trying to schedule mint through timelock', async () => {
        const {
          mTbill,
          accessControl,
          acDefaultAdmin,
          timelockManager,
          timelock,
        } = await loadFixture(mainnetUpgradeFixture);
        const [, recipient] = await ethers.getSigners();
        const amount = parseUnits('1');

        const ctx = {
          timelockManager,
          timelock,
          accessControl,
          owner: acDefaultAdmin,
        };

        await grantRoleViaTimelock(
          ctx,
          mTbillRoles.minter,
          acDefaultAdmin.address,
          acDefaultAdmin,
        );

        await scheduleTimelockOperationsTester(
          ctx,
          [mTbill.address],
          [
            mTbill.interface.encodeFunctionData('mint', [
              recipient.address,
              amount,
            ]),
          ],
          {},
          {
            from: acDefaultAdmin,
            revertCustomError: {
              contract: timelockManager,
              customErrorName: 'InvalidPreflightError',
            },
          },
        );
      });
    });

    describe('burn()', () => {
      it('should burn tokens from holder', async () => {
        const {
          mTbill,
          accessControl,
          acDefaultAdmin,
          timelockManager,
          timelock,
        } = await loadFixture(mainnetUpgradeFixture);
        const [, holder] = await ethers.getSigners();
        const amount = parseUnits('1');

        await resetTimelockDelays({
          timelockManager,
          acDefaultAdmin,
          accessControl,
          timelock,
        });

        await accessControl
          .connect(acDefaultAdmin)
          ['grantRole(bytes32,address)'](
            mTbillRoles.minter,
            acDefaultAdmin.address,
          );
        await accessControl
          .connect(acDefaultAdmin)
          ['grantRole(bytes32,address)'](
            mTbillRoles.burner,
            acDefaultAdmin.address,
          );

        await mint(
          { tokenContract: mTbill, owner: acDefaultAdmin },
          holder.address,
          amount,
        );

        await burn(
          { tokenContract: mTbill, owner: acDefaultAdmin },
          holder.address,
          amount,
        );

        expect(await mTbill.balanceOf(holder.address)).to.eq(0);
      });

      it('should fail: when caller has no burn operator role', async () => {
        const {
          mTbill,
          timelockManager,
          acDefaultAdmin,
          accessControl,
          timelock,
        } = await loadFixture(mainnetUpgradeFixture);
        const [, holder, unauthorized] = await ethers.getSigners();

        await resetTimelockDelays({
          timelockManager,
          acDefaultAdmin,
          accessControl,
          timelock,
        });

        await expect(
          mTbill.connect(unauthorized).burn(holder.address, 1),
        ).revertedWithCustomError(
          mTbill,
          acErrors.WMAC_HASNT_PERMISSION().customErrorName,
        );
      });

      it('should fail: when trying to schedule burn through timelock', async () => {
        const {
          mTbill,
          accessControl,
          acDefaultAdmin,
          timelockManager,
          timelock,
        } = await loadFixture(mainnetUpgradeFixture);
        const [, holder] = await ethers.getSigners();
        const amount = parseUnits('1');

        const ctx = {
          timelockManager,
          timelock,
          accessControl,
          owner: acDefaultAdmin,
        };

        await grantRoleMultViaTimelock(
          ctx,
          [mTbillRoles.minter, mTbillRoles.burner],
          [acDefaultAdmin.address, acDefaultAdmin.address],
          acDefaultAdmin,
        );

        await mint(
          { tokenContract: mTbill, owner: acDefaultAdmin },
          holder.address,
          amount,
        );

        await scheduleTimelockOperationsTester(
          ctx,
          [mTbill.address],
          [
            mTbill.interface.encodeFunctionData('burn', [
              holder.address,
              amount,
            ]),
          ],
          {},
          {
            from: acDefaultAdmin,
            revertCustomError: {
              contract: timelockManager,
              customErrorName: 'InvalidPreflightError',
            },
          },
        );
      });
    });

    describe('transfer()', () => {
      it('should transfer between token holders', async function () {
        const { mTbill, mTbillHolders } = await loadFixture(
          mainnetUpgradeFixture,
        );

        const from = mTbillHolders[0];
        const to = mTbillHolders[1];
        const amount = parseUnits('0.01');

        await expect(mTbill.connect(from).transfer(to.address, amount)).not
          .reverted;

        expect(await mTbill.balanceOf(to.address)).to.be.gte(amount);
      });

      it('should fail: when sender is blacklisted', async () => {
        const {
          mTbill,
          accessControl,
          acDefaultAdmin,
          timelockManager,
          timelock,
        } = await loadFixture(mainnetUpgradeFixture);
        const [, from, to] = await ethers.getSigners();
        const amount = parseUnits('1');

        await resetTimelockDelays({
          timelockManager,
          acDefaultAdmin,
          accessControl,
          timelock,
        });

        const allRoles = await getAllRoles();
        await grantRoleMultTester(
          { accessControl, owner: acDefaultAdmin },
          [
            {
              role: mTbillRoles.minter,
              account: acDefaultAdmin.address,
              delay: 0,
            },
            {
              role: allRoles.common.blacklistedOperator,
              account: acDefaultAdmin.address,
              delay: 0,
            },
          ],
          { from: acDefaultAdmin },
        );

        await mint(
          { tokenContract: mTbill, owner: acDefaultAdmin },
          from.address,
          amount,
        );

        await accessControl
          .connect(acDefaultAdmin)
          ['grantRole(bytes32,address)'](
            await mTbill.BLACKLISTED_ROLE(),
            from.address,
          );

        await expect(
          mTbill.connect(from).transfer(to.address, amount),
        ).revertedWithCustomError(
          mTbill,
          acErrors.WMAC_BLACKLISTED().customErrorName,
        );
      });
    });
  });

  describe('mGLOBAL', () => {
    const mGlobalRoles = getRolesForToken('mGLOBAL');

    describe('mint()', () => {
      it('should mint tokens to greenlisted recipient', async () => {
        const {
          mGlobal,
          accessControl,
          acDefaultAdmin,
          timelockManager,
          timelock,
        } = await loadFixture(mainnetUpgradeFixture);
        const [, recipient] = await ethers.getSigners();
        const amount = parseUnits('1');

        await resetTimelockDelays({
          timelockManager,
          acDefaultAdmin,
          accessControl,
          timelock,
        });

        await accessControl
          .connect(acDefaultAdmin)
          ['grantRole(bytes32,address)'](
            mGlobalRoles.minter,
            acDefaultAdmin.address,
          );
        await accessControl
          .connect(acDefaultAdmin)
          ['grantRole(bytes32,address)'](
            mGlobalRoles.greenlisted,
            recipient.address,
          );

        await mint(
          { tokenContract: mGlobal, owner: acDefaultAdmin },
          recipient.address,
          amount,
        );

        expect(await mGlobal.balanceOf(recipient.address)).to.eq(amount);
      });

      it('should fail: when caller has no mint operator role', async () => {
        const {
          mGlobal,
          timelockManager,
          acDefaultAdmin,
          accessControl,
          timelock,
        } = await loadFixture(mainnetUpgradeFixture);
        const [, recipient, unauthorized] = await ethers.getSigners();
        await resetTimelockDelays({
          timelockManager,
          acDefaultAdmin,
          accessControl,
          timelock,
        });

        await expect(
          mGlobal.connect(unauthorized).mint(recipient.address, 1),
        ).revertedWithCustomError(
          mGlobal,
          acErrors.WMAC_HASNT_PERMISSION().customErrorName,
        );
      });

      it('should fail: when trying to schedule mint through timelock', async () => {
        const {
          mGlobal,
          accessControl,
          acDefaultAdmin,
          timelockManager,
          timelock,
        } = await loadFixture(mainnetUpgradeFixture);
        const [, recipient] = await ethers.getSigners();
        const amount = parseUnits('1');

        const ctx = {
          timelockManager,
          timelock,
          accessControl,
          owner: acDefaultAdmin,
        };

        await grantRoleViaTimelock(
          ctx,
          mGlobalRoles.minter,
          acDefaultAdmin.address,
          acDefaultAdmin,
        );
        await grantRoleViaTimelock(
          ctx,
          mGlobalRoles.greenlisted,
          recipient.address,
          acDefaultAdmin,
        );

        await scheduleTimelockOperationsTester(
          ctx,
          [mGlobal.address],
          [
            mGlobal.interface.encodeFunctionData('mint', [
              recipient.address,
              amount,
            ]),
          ],
          {},
          {
            from: acDefaultAdmin,
            revertCustomError: {
              contract: timelockManager,
              customErrorName: 'InvalidPreflightError',
            },
          },
        );
      });
    });

    describe('burn()', () => {
      it('should burn tokens from greenlisted holder', async () => {
        const {
          mGlobal,
          accessControl,
          acDefaultAdmin,
          timelockManager,
          timelock,
        } = await loadFixture(mainnetUpgradeFixture);
        const [, holder] = await ethers.getSigners();
        const amount = parseUnits('1');
        await resetTimelockDelays({
          timelockManager,
          acDefaultAdmin,
          accessControl,
          timelock,
        });

        await accessControl
          .connect(acDefaultAdmin)
          ['grantRole(bytes32,address)'](
            mGlobalRoles.minter,
            acDefaultAdmin.address,
          );
        await accessControl
          .connect(acDefaultAdmin)
          ['grantRole(bytes32,address)'](
            mGlobalRoles.burner,
            acDefaultAdmin.address,
          );
        await accessControl
          .connect(acDefaultAdmin)
          ['grantRole(bytes32,address)'](
            mGlobalRoles.greenlisted,
            holder.address,
          );

        await mint(
          { tokenContract: mGlobal, owner: acDefaultAdmin },
          holder.address,
          amount,
        );

        await burn(
          { tokenContract: mGlobal, owner: acDefaultAdmin },
          holder.address,
          amount,
        );

        expect(await mGlobal.balanceOf(holder.address)).to.eq(0);
      });

      it('should fail: when trying to schedule burn through timelock', async () => {
        const {
          mGlobal,
          accessControl,
          acDefaultAdmin,
          timelockManager,
          timelock,
        } = await loadFixture(mainnetUpgradeFixture);
        const [, holder] = await ethers.getSigners();
        const amount = parseUnits('1');

        const ctx = {
          timelockManager,
          timelock,
          accessControl,
          owner: acDefaultAdmin,
        };

        await grantRoleMultViaTimelock(
          ctx,
          [mGlobalRoles.minter, mGlobalRoles.burner],
          [acDefaultAdmin.address, acDefaultAdmin.address],
          acDefaultAdmin,
        );
        await grantRoleViaTimelock(
          ctx,
          mGlobalRoles.greenlisted,
          holder.address,
          acDefaultAdmin,
        );

        await mint(
          { tokenContract: mGlobal, owner: acDefaultAdmin },
          holder.address,
          amount,
        );

        await scheduleTimelockOperationsTester(
          ctx,
          [mGlobal.address],
          [
            mGlobal.interface.encodeFunctionData('burn', [
              holder.address,
              amount,
            ]),
          ],
          {},
          {
            from: acDefaultAdmin,
            revertCustomError: {
              contract: timelockManager,
              customErrorName: 'InvalidPreflightError',
            },
          },
        );
      });
    });

    describe('transfer()', () => {
      it('should transfer between greenlisted token holders', async function () {
        const {
          mGlobal,
          accessControl,
          acDefaultAdmin,
          mGlobalHolders,
          timelockManager,
          timelock,
        } = await loadFixture(mainnetUpgradeFixture);

        const from = mGlobalHolders[0];
        const to = mGlobalHolders[1];
        const amount = parseUnits('0.01');
        const greenlistRole = await mGlobal.greenlistedRole();

        await resetTimelockDelays({
          timelockManager,
          acDefaultAdmin,
          accessControl,
          timelock,
        });

        await accessControl
          .connect(acDefaultAdmin)
          ['grantRole(bytes32,address)'](greenlistRole, from.address);
        await accessControl
          .connect(acDefaultAdmin)
          ['grantRole(bytes32,address)'](greenlistRole, to.address);

        await expect(mGlobal.connect(from).transfer(to.address, amount)).not
          .reverted;
      });

      it('should fail: when sender is not greenlisted', async () => {
        const {
          mGlobal,
          accessControl,
          acDefaultAdmin,
          timelockManager,
          timelock,
        } = await loadFixture(mainnetUpgradeFixture);
        const [, from, to] = await ethers.getSigners();
        const amount = parseUnits('1');
        await resetTimelockDelays({
          timelockManager,
          acDefaultAdmin,
          accessControl,
          timelock,
        });

        await accessControl
          .connect(acDefaultAdmin)
          ['grantRole(bytes32,address)'](
            mGlobalRoles.minter,
            acDefaultAdmin.address,
          );
        await accessControl
          .connect(acDefaultAdmin)
          ['grantRole(bytes32,address)'](mGlobalRoles.greenlisted, to.address);
        await accessControl
          .connect(acDefaultAdmin)
          ['grantRole(bytes32,address)'](
            mGlobalRoles.greenlisted,
            from.address,
          );

        await mint(
          { tokenContract: mGlobal, owner: acDefaultAdmin },
          from.address,
          amount,
        );

        await accessControl
          .connect(acDefaultAdmin)
          .revokeRole(mGlobalRoles.greenlisted, from.address);

        await expect(
          mGlobal.connect(from).transfer(to.address, amount),
        ).revertedWithCustomError(mGlobal, 'NotGreenlisted');
      });
    });
  });

  describe('mTBILL DataFeed', () => {
    describe('getDataInBase18()', () => {
      it('should return a positive price', async () => {
        const { mTbillDataFeed } = await loadFixture(mainnetUpgradeFixture);

        const price = await mTbillDataFeed.getDataInBase18();
        expect(price).to.be.gt(0);
      });
    });

    describe('aggregator()', () => {
      it('should expose configured aggregator address', async () => {
        const { mTbillDataFeed } = await loadFixture(mainnetUpgradeFixture);

        expect(await mTbillDataFeed.aggregator()).to.not.eq(
          constants.AddressZero,
        );
      });
    });

    describe('changeAggregator()', () => {
      it('should change aggregator after resetting delays', async () => {
        const {
          mTbillDataFeed,
          accessControl,
          acDefaultAdmin,
          timelockManager,
          timelock,
        } = await loadFixture(mainnetUpgradeFixture);
        const [deployer] = await ethers.getSigners();

        await resetTimelockDelays({
          timelockManager,
          acDefaultAdmin,
          accessControl,
          timelock,
        });

        const contractAdminRole = await mTbillDataFeed.contractAdminRole();
        await accessControl
          .connect(acDefaultAdmin)
          ['grantRole(bytes32,address)'](
            contractAdminRole,
            acDefaultAdmin.address,
          );

        const newAggregator = await new AggregatorV3Mock__factory(
          deployer,
        ).deploy();

        await mTbillDataFeed
          .connect(acDefaultAdmin)
          .changeAggregator(newAggregator.address);

        expect(await mTbillDataFeed.aggregator()).to.eq(newAggregator.address);
      });

      it('should fail: when caller has no feed admin permission', async () => {
        const { mTbillDataFeed } = await loadFixture(mainnetUpgradeFixture);
        const [deployer, unauthorized] = await ethers.getSigners();

        const newAggregator = await new AggregatorV3Mock__factory(
          deployer,
        ).deploy();

        await expect(
          mTbillDataFeed
            .connect(unauthorized)
            .changeAggregator(newAggregator.address),
        ).revertedWithCustomError(
          mTbillDataFeed,
          acErrors.WMAC_HASNT_PERMISSION().customErrorName,
        );
      });

      it('should change aggregator via timelock', async () => {
        const {
          mTbillDataFeed,
          accessControl,
          acDefaultAdmin,
          timelockManager,
          timelock,
        } = await loadFixture(mainnetUpgradeFixture);
        const [deployer] = await ethers.getSigners();

        const ctx = {
          timelockManager,
          timelock,
          accessControl,
          owner: acDefaultAdmin,
        };

        const contractAdminRole = await mTbillDataFeed.contractAdminRole();
        await grantRoleViaTimelock(
          ctx,
          contractAdminRole,
          acDefaultAdmin.address,
          acDefaultAdmin,
        );

        const newAggregator = await new AggregatorV3Mock__factory(
          deployer,
        ).deploy();

        await executeWriteViaTimelock(
          ctx,
          mTbillDataFeed.address,
          mTbillDataFeed.interface.encodeFunctionData('changeAggregator', [
            newAggregator.address,
          ]),
          acDefaultAdmin,
        );

        expect(await mTbillDataFeed.aggregator()).to.eq(newAggregator.address);
      });
    });

    describe('setHealthyDiff()', () => {
      const newHealthyDiff = 2 * 24 * 3600;

      it('should set healthy diff after resetting delays', async () => {
        const {
          mTbillDataFeed,
          accessControl,
          acDefaultAdmin,
          timelockManager,
          timelock,
        } = await loadFixture(mainnetUpgradeFixture);

        await resetTimelockDelays({
          timelockManager,
          acDefaultAdmin,
          accessControl,
          timelock,
        });

        const contractAdminRole = await mTbillDataFeed.contractAdminRole();
        await accessControl
          .connect(acDefaultAdmin)
          ['grantRole(bytes32,address)'](
            contractAdminRole,
            acDefaultAdmin.address,
          );

        await mTbillDataFeed
          .connect(acDefaultAdmin)
          .setHealthyDiff(newHealthyDiff);

        expect(await mTbillDataFeed.healthyDiff()).to.eq(newHealthyDiff);
      });

      it('should set healthy diff via timelock', async () => {
        const {
          mTbillDataFeed,
          accessControl,
          acDefaultAdmin,
          timelockManager,
          timelock,
        } = await loadFixture(mainnetUpgradeFixture);

        const ctx = {
          timelockManager,
          timelock,
          accessControl,
          owner: acDefaultAdmin,
        };

        const contractAdminRole = await mTbillDataFeed.contractAdminRole();
        await grantRoleViaTimelock(
          ctx,
          contractAdminRole,
          acDefaultAdmin.address,
          acDefaultAdmin,
        );

        await executeWriteViaTimelock(
          ctx,
          mTbillDataFeed.address,
          mTbillDataFeed.interface.encodeFunctionData('setHealthyDiff', [
            newHealthyDiff,
          ]),
          acDefaultAdmin,
        );

        expect(await mTbillDataFeed.healthyDiff()).to.eq(newHealthyDiff);
      });
    });
  });

  describe('mTBILL CustomAggregatorFeed', () => {
    describe('latestRoundData()', () => {
      it('should return valid round data', async () => {
        const { mTbillCustomFeed } = await loadFixture(mainnetUpgradeFixture);

        const [, answer] = await mTbillCustomFeed.latestRoundData();
        expect(answer).to.be.gt(0);
      });
    });

    describe('decimals()', () => {
      it('should return feed decimals', async () => {
        const { mTbillCustomFeed } = await loadFixture(mainnetUpgradeFixture);

        expect(await mTbillCustomFeed.decimals()).to.eq(8);
      });
    });

    describe('setRoundData()', () => {
      it('should submit a new round after resetting delays', async () => {
        const {
          mTbillCustomFeed,
          accessControl,
          acDefaultAdmin,
          timelockManager,
          timelock,
        } = await loadFixture(mainnetUpgradeFixture);

        await resetTimelockDelays({
          timelockManager,
          acDefaultAdmin,
          accessControl,
          timelock,
        });

        const contractAdminRole = await mTbillCustomFeed.contractAdminRole();
        await accessControl
          .connect(acDefaultAdmin)
          ['grantRole(bytes32,address)'](
            contractAdminRole,
            acDefaultAdmin.address,
          );

        const roundBefore = await mTbillCustomFeed.latestRound();
        const answer = await mTbillCustomFeed.lastAnswer();

        await mTbillCustomFeed.connect(acDefaultAdmin).setRoundData(answer);

        expect(await mTbillCustomFeed.latestRound()).to.eq(roundBefore.add(1));
        expect(await mTbillCustomFeed.lastAnswer()).to.eq(answer);
      });

      it('should fail: when caller has no feed admin permission', async () => {
        const { mTbillCustomFeed } = await loadFixture(mainnetUpgradeFixture);
        const [, unauthorized] = await ethers.getSigners();
        const answer = await mTbillCustomFeed.lastAnswer();

        await expect(
          mTbillCustomFeed.connect(unauthorized).setRoundData(answer),
        ).revertedWithCustomError(
          mTbillCustomFeed,
          acErrors.WMAC_HASNT_PERMISSION().customErrorName,
        );
      });

      it('should submit a new round via timelock', async () => {
        const {
          mTbillCustomFeed,
          accessControl,
          acDefaultAdmin,
          timelockManager,
          timelock,
        } = await loadFixture(mainnetUpgradeFixture);

        const ctx = {
          timelockManager,
          timelock,
          accessControl,
          owner: acDefaultAdmin,
        };

        const contractAdminRole = await mTbillCustomFeed.contractAdminRole();
        await grantRoleViaTimelock(
          ctx,
          contractAdminRole,
          acDefaultAdmin.address,
          acDefaultAdmin,
        );

        const roundBefore = await mTbillCustomFeed.latestRound();
        const answer = await mTbillCustomFeed.lastAnswer();

        await executeWriteViaTimelock(
          ctx,
          mTbillCustomFeed.address,
          mTbillCustomFeed.interface.encodeFunctionData('setRoundData', [
            answer,
          ]),
          acDefaultAdmin,
        );

        expect(await mTbillCustomFeed.latestRound()).to.eq(roundBefore.add(1));
      });
    });

    describe('setMaxAnswerDeviation()', () => {
      const newDeviation = parseUnits('1', 8);

      it('should set max answer deviation after resetting delays', async () => {
        const {
          mTbillCustomFeed,
          accessControl,
          acDefaultAdmin,
          timelockManager,
          timelock,
        } = await loadFixture(mainnetUpgradeFixture);

        await resetTimelockDelays({
          timelockManager,
          acDefaultAdmin,
          accessControl,
          timelock,
        });

        const contractAdminRole = await mTbillCustomFeed.contractAdminRole();
        await accessControl
          .connect(acDefaultAdmin)
          ['grantRole(bytes32,address)'](
            contractAdminRole,
            acDefaultAdmin.address,
          );

        await mTbillCustomFeed
          .connect(acDefaultAdmin)
          .setMaxAnswerDeviation(newDeviation);

        expect(await mTbillCustomFeed.maxAnswerDeviation()).to.eq(newDeviation);
      });

      it('should set max answer deviation via timelock', async () => {
        const {
          mTbillCustomFeed,
          accessControl,
          acDefaultAdmin,
          timelockManager,
          timelock,
        } = await loadFixture(mainnetUpgradeFixture);

        const ctx = {
          timelockManager,
          timelock,
          accessControl,
          owner: acDefaultAdmin,
        };

        const contractAdminRole = await mTbillCustomFeed.contractAdminRole();
        await grantRoleViaTimelock(
          ctx,
          contractAdminRole,
          acDefaultAdmin.address,
          acDefaultAdmin,
        );

        await executeWriteViaTimelock(
          ctx,
          mTbillCustomFeed.address,
          mTbillCustomFeed.interface.encodeFunctionData(
            'setMaxAnswerDeviation',
            [newDeviation],
          ),
          acDefaultAdmin,
        );

        expect(await mTbillCustomFeed.maxAnswerDeviation()).to.eq(newDeviation);
      });
    });
  });

  describe('mGLOBAL DataFeed', () => {
    describe('getDataInBase18()', () => {
      it('should return a positive price', async () => {
        const { mGlobalDataFeed } = await loadFixture(mainnetUpgradeFixture);

        const price = await mGlobalDataFeed.getDataInBase18();
        expect(price).to.be.gt(0);
      });
    });

    describe('changeAggregator()', () => {
      it('should change aggregator after resetting delays', async () => {
        const {
          mGlobalDataFeed,
          accessControl,
          acDefaultAdmin,
          timelockManager,
          timelock,
        } = await loadFixture(mainnetUpgradeFixture);
        const [deployer] = await ethers.getSigners();

        await resetTimelockDelays({
          timelockManager,
          acDefaultAdmin,
          accessControl,
          timelock,
        });

        const contractAdminRole = await mGlobalDataFeed.contractAdminRole();
        await accessControl
          .connect(acDefaultAdmin)
          ['grantRole(bytes32,address)'](
            contractAdminRole,
            acDefaultAdmin.address,
          );

        const newAggregator = await new AggregatorV3Mock__factory(
          deployer,
        ).deploy();

        await mGlobalDataFeed
          .connect(acDefaultAdmin)
          .changeAggregator(newAggregator.address);

        expect(await mGlobalDataFeed.aggregator()).to.eq(newAggregator.address);
      });

      it('should fail: when caller has no feed admin permission', async () => {
        const { mGlobalDataFeed } = await loadFixture(mainnetUpgradeFixture);
        const [deployer, unauthorized] = await ethers.getSigners();

        const newAggregator = await new AggregatorV3Mock__factory(
          deployer,
        ).deploy();

        await expect(
          mGlobalDataFeed
            .connect(unauthorized)
            .changeAggregator(newAggregator.address),
        ).revertedWithCustomError(
          mGlobalDataFeed,
          acErrors.WMAC_HASNT_PERMISSION().customErrorName,
        );
      });

      it('should change aggregator via timelock', async () => {
        const {
          mGlobalDataFeed,
          accessControl,
          acDefaultAdmin,
          timelockManager,
          timelock,
        } = await loadFixture(mainnetUpgradeFixture);
        const [deployer] = await ethers.getSigners();

        const ctx = {
          timelockManager,
          timelock,
          accessControl,
          owner: acDefaultAdmin,
        };

        const contractAdminRole = await mGlobalDataFeed.contractAdminRole();
        await grantRoleViaTimelock(
          ctx,
          contractAdminRole,
          acDefaultAdmin.address,
          acDefaultAdmin,
        );

        const newAggregator = await new AggregatorV3Mock__factory(
          deployer,
        ).deploy();

        await executeWriteViaTimelock(
          ctx,
          mGlobalDataFeed.address,
          mGlobalDataFeed.interface.encodeFunctionData('changeAggregator', [
            newAggregator.address,
          ]),
          acDefaultAdmin,
        );

        expect(await mGlobalDataFeed.aggregator()).to.eq(newAggregator.address);
      });
    });
  });

  describe('mGLOBAL CustomAggregatorFeedGrowth', () => {
    describe('latestRoundData()', () => {
      it('should return valid round data', async () => {
        const { mGlobalCustomFeedGrowth } = await loadFixture(
          mainnetUpgradeFixture,
        );

        const [, answer] = await mGlobalCustomFeedGrowth.latestRoundData();
        expect(answer).to.be.gt(0);
      });
    });

    describe('decimals()', () => {
      it('should return feed decimals', async () => {
        const { mGlobalCustomFeedGrowth } = await loadFixture(
          mainnetUpgradeFixture,
        );

        expect(await mGlobalCustomFeedGrowth.decimals()).to.eq(8);
      });
    });

    describe('setRoundData()', () => {
      it('should submit a new round after resetting delays', async () => {
        const {
          mGlobalCustomFeedGrowth,
          accessControl,
          acDefaultAdmin,
          timelockManager,
          timelock,
        } = await loadFixture(mainnetUpgradeFixture);

        await resetTimelockDelays({
          timelockManager,
          acDefaultAdmin,
          accessControl,
          timelock,
        });

        const contractAdminRole =
          await mGlobalCustomFeedGrowth.contractAdminRole();
        await accessControl
          .connect(acDefaultAdmin)
          ['grantRole(bytes32,address)'](
            contractAdminRole,
            acDefaultAdmin.address,
          );

        const raw = await mGlobalCustomFeedGrowth.latestRoundDataRaw();
        const roundBefore = await mGlobalCustomFeedGrowth.latestRound();
        const dataTimestamp =
          (await ethers.provider.getBlock('latest')).timestamp - 1;

        await mGlobalCustomFeedGrowth
          .connect(acDefaultAdmin)
          .setRoundData(raw.answer, dataTimestamp, raw.growthApr);

        expect(await mGlobalCustomFeedGrowth.latestRound()).to.eq(
          roundBefore.add(1),
        );
      });

      it('should fail: when caller has no feed admin permission', async () => {
        const { mGlobalCustomFeedGrowth } = await loadFixture(
          mainnetUpgradeFixture,
        );
        const [, unauthorized] = await ethers.getSigners();

        const raw = await mGlobalCustomFeedGrowth.latestRoundDataRaw();
        const dataTimestamp =
          (await ethers.provider.getBlock('latest')).timestamp - 1;

        await expect(
          mGlobalCustomFeedGrowth
            .connect(unauthorized)
            .setRoundData(raw.answer, dataTimestamp, raw.growthApr),
        ).revertedWithCustomError(
          mGlobalCustomFeedGrowth,
          acErrors.WMAC_HASNT_PERMISSION().customErrorName,
        );
      });

      it('should submit a new round via timelock', async () => {
        const {
          mGlobalCustomFeedGrowth,
          accessControl,
          acDefaultAdmin,
          timelockManager,
          timelock,
        } = await loadFixture(mainnetUpgradeFixture);

        const ctx = {
          timelockManager,
          timelock,
          accessControl,
          owner: acDefaultAdmin,
        };

        const contractAdminRole =
          await mGlobalCustomFeedGrowth.contractAdminRole();
        await grantRoleViaTimelock(
          ctx,
          contractAdminRole,
          acDefaultAdmin.address,
          acDefaultAdmin,
        );

        const raw = await mGlobalCustomFeedGrowth.latestRoundDataRaw();
        const roundBefore = await mGlobalCustomFeedGrowth.latestRound();
        const dataTimestamp =
          (await ethers.provider.getBlock('latest')).timestamp - 1;

        await executeWriteViaTimelock(
          ctx,
          mGlobalCustomFeedGrowth.address,
          mGlobalCustomFeedGrowth.interface.encodeFunctionData('setRoundData', [
            raw.answer,
            dataTimestamp,
            raw.growthApr,
          ]),
          acDefaultAdmin,
        );

        expect(await mGlobalCustomFeedGrowth.latestRound()).to.eq(
          roundBefore.add(1),
        );
      });
    });

    describe('setMaxGrowthApr()', () => {
      it('should set max growth apr after resetting delays', async () => {
        const {
          mGlobalCustomFeedGrowth,
          accessControl,
          acDefaultAdmin,
          timelockManager,
          timelock,
        } = await loadFixture(mainnetUpgradeFixture);

        await resetTimelockDelays({
          timelockManager,
          acDefaultAdmin,
          accessControl,
          timelock,
        });

        const contractAdminRole =
          await mGlobalCustomFeedGrowth.contractAdminRole();
        await accessControl
          .connect(acDefaultAdmin)
          ['grantRole(bytes32,address)'](
            contractAdminRole,
            acDefaultAdmin.address,
          );

        const newMaxGrowthApr = await mGlobalCustomFeedGrowth.maxGrowthApr();

        await mGlobalCustomFeedGrowth
          .connect(acDefaultAdmin)
          .setMaxGrowthApr(newMaxGrowthApr);

        expect(await mGlobalCustomFeedGrowth.maxGrowthApr()).to.eq(
          newMaxGrowthApr,
        );
      });

      it('should set max growth apr via timelock', async () => {
        const {
          mGlobalCustomFeedGrowth,
          accessControl,
          acDefaultAdmin,
          timelockManager,
          timelock,
        } = await loadFixture(mainnetUpgradeFixture);

        const ctx = {
          timelockManager,
          timelock,
          accessControl,
          owner: acDefaultAdmin,
        };

        const contractAdminRole =
          await mGlobalCustomFeedGrowth.contractAdminRole();
        await grantRoleViaTimelock(
          ctx,
          contractAdminRole,
          acDefaultAdmin.address,
          acDefaultAdmin,
        );

        const newMaxGrowthApr = await mGlobalCustomFeedGrowth.maxGrowthApr();

        await executeWriteViaTimelock(
          ctx,
          mGlobalCustomFeedGrowth.address,
          mGlobalCustomFeedGrowth.interface.encodeFunctionData(
            'setMaxGrowthApr',
            [newMaxGrowthApr],
          ),
          acDefaultAdmin,
        );

        expect(await mGlobalCustomFeedGrowth.maxGrowthApr()).to.eq(
          newMaxGrowthApr,
        );
      });
    });

    describe('setOnlyUp()', () => {
      it('should set onlyUp after resetting delays', async () => {
        const {
          mGlobalCustomFeedGrowth,
          accessControl,
          acDefaultAdmin,
          timelockManager,
          timelock,
        } = await loadFixture(mainnetUpgradeFixture);

        await resetTimelockDelays({
          timelockManager,
          acDefaultAdmin,
          accessControl,
          timelock,
        });

        const contractAdminRole =
          await mGlobalCustomFeedGrowth.contractAdminRole();
        await accessControl
          .connect(acDefaultAdmin)
          ['grantRole(bytes32,address)'](
            contractAdminRole,
            acDefaultAdmin.address,
          );

        const newOnlyUp = !(await mGlobalCustomFeedGrowth.onlyUp());

        await mGlobalCustomFeedGrowth
          .connect(acDefaultAdmin)
          .setOnlyUp(newOnlyUp);

        expect(await mGlobalCustomFeedGrowth.onlyUp()).to.eq(newOnlyUp);
      });

      it('should set onlyUp via timelock', async () => {
        const {
          mGlobalCustomFeedGrowth,
          accessControl,
          acDefaultAdmin,
          timelockManager,
          timelock,
        } = await loadFixture(mainnetUpgradeFixture);

        const ctx = {
          timelockManager,
          timelock,
          accessControl,
          owner: acDefaultAdmin,
        };

        const contractAdminRole =
          await mGlobalCustomFeedGrowth.contractAdminRole();
        await grantRoleViaTimelock(
          ctx,
          contractAdminRole,
          acDefaultAdmin.address,
          acDefaultAdmin,
        );

        const newOnlyUp = !(await mGlobalCustomFeedGrowth.onlyUp());

        await executeWriteViaTimelock(
          ctx,
          mGlobalCustomFeedGrowth.address,
          mGlobalCustomFeedGrowth.interface.encodeFunctionData('setOnlyUp', [
            newOnlyUp,
          ]),
          acDefaultAdmin,
        );

        expect(await mGlobalCustomFeedGrowth.onlyUp()).to.eq(newOnlyUp);
      });
    });

    describe('setMaxAnswerDeviation()', () => {
      const newDeviation = parseUnits('1', 8);

      it('should set max answer deviation after resetting delays', async () => {
        const {
          mGlobalCustomFeedGrowth,
          accessControl,
          acDefaultAdmin,
          timelockManager,
          timelock,
        } = await loadFixture(mainnetUpgradeFixture);

        await resetTimelockDelays({
          timelockManager,
          acDefaultAdmin,
          accessControl,
          timelock,
        });

        const contractAdminRole =
          await mGlobalCustomFeedGrowth.contractAdminRole();
        await accessControl
          .connect(acDefaultAdmin)
          ['grantRole(bytes32,address)'](
            contractAdminRole,
            acDefaultAdmin.address,
          );

        await mGlobalCustomFeedGrowth
          .connect(acDefaultAdmin)
          .setMaxAnswerDeviation(newDeviation);

        expect(await mGlobalCustomFeedGrowth.maxAnswerDeviation()).to.eq(
          newDeviation,
        );
      });

      it('should set max answer deviation via timelock', async () => {
        const {
          mGlobalCustomFeedGrowth,
          accessControl,
          acDefaultAdmin,
          timelockManager,
          timelock,
        } = await loadFixture(mainnetUpgradeFixture);

        const ctx = {
          timelockManager,
          timelock,
          accessControl,
          owner: acDefaultAdmin,
        };

        const contractAdminRole =
          await mGlobalCustomFeedGrowth.contractAdminRole();
        await grantRoleViaTimelock(
          ctx,
          contractAdminRole,
          acDefaultAdmin.address,
          acDefaultAdmin,
        );

        await executeWriteViaTimelock(
          ctx,
          mGlobalCustomFeedGrowth.address,
          mGlobalCustomFeedGrowth.interface.encodeFunctionData(
            'setMaxAnswerDeviation',
            [newDeviation],
          ),
          acDefaultAdmin,
        );

        expect(await mGlobalCustomFeedGrowth.maxAnswerDeviation()).to.eq(
          newDeviation,
        );
      });
    });
  });
});
