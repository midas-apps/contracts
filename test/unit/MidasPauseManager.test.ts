import { loadFixture } from '@nomicfoundation/hardhat-network-helpers';
import { increase } from '@nomicfoundation/hardhat-network-helpers/dist/src/helpers/time';
import { expect } from 'chai';
import { constants } from 'ethers';

import { encodeFnSelector } from '../../helpers/utils';
import {
  acErrors,
  setFunctionPermissionTester,
  setupFunctionAccessGrantOperator,
} from '../common/ac.helpers';
import {
  OptionalCommonParams,
  pauseGlobalTest,
  pauseVault,
  pauseVaultFn,
  unpauseGlobalTest,
  unpauseVault,
  unpauseVaultFn,
} from '../common/common.helpers';
import { defaultDeploy } from '../common/fixtures';
import {
  executeTimelockOperationTester,
  scheduleTimelockOperationsTester,
  setRoleTimelocksTester,
} from '../common/timelock-manager.helpers';

const NATIVE_ROLE_TIMELOCK_DELAY = 3600;

const timelockUnderlyingRevert = (): OptionalCommonParams => ({
  revertMessage: 'TimelockController: underlying transaction reverted',
});

describe('MidasPauseManager', () => {
  describe('globalPause()', () => {
    it('should fail: when caller doesnt have admin role', async () => {
      const { pauseManager, owner, regularAccounts } = await loadFixture(
        defaultDeploy,
      );

      await pauseGlobalTest(
        { pauseManager, owner },
        {
          from: regularAccounts[0],
          revertCustomError: acErrors.WMAC_HASNT_PERMISSION(),
        },
      );
    });

    it('should fail: when already paused', async () => {
      const { pauseManager, owner } = await loadFixture(defaultDeploy);

      await pauseGlobalTest({ pauseManager, owner });
      await pauseGlobalTest(
        { pauseManager, owner },
        {
          revertCustomError: {
            customErrorName: 'SameBoolValue',
            args: [true],
          },
        },
      );
    });

    it('call from admin', async () => {
      const { pauseManager, owner } = await loadFixture(defaultDeploy);
      await pauseGlobalTest({ pauseManager, owner });
    });

    it('when role and function scoped timelock is not 0', async () => {
      const {
        accessControl,
        pauseManager,
        owner,
        regularAccounts,
        timelockManager,
        timelock,
      } = await loadFixture(defaultDeploy);

      const pauseAdminRole = await pauseManager.pauseAdminRole();
      const globalPauseSel = encodeFnSelector('globalPause()');

      await setupFunctionAccessGrantOperator({
        accessControl,
        owner,
        functionAccessAdminRole: pauseAdminRole,
        targetContract: pauseManager.address,
        functionSelector: globalPauseSel,
        grantOperator: owner,
      });
      await setFunctionPermissionTester(
        { accessControl, owner },
        pauseAdminRole,
        pauseManager.address,
        globalPauseSel,
        [
          {
            account: regularAccounts[0].address,
            enabled: true,
          },
        ],
      );

      await setRoleTimelocksTester(
        { timelockManager, timelock, owner, accessControl },
        [pauseAdminRole],
        [3600],
      );

      await pauseGlobalTest(
        { pauseManager, owner },
        { from: regularAccounts[0] },
      );
    });
  });

  describe('globalUnpause()', () => {
    it('should fail: when caller doesnt have admin role', async () => {
      const {
        pauseManager,
        owner,
        regularAccounts,
        timelockManager,
        timelock,
        accessControl,
      } = await loadFixture(defaultDeploy);

      const pauseAdminRole = await pauseManager.pauseAdminRole();
      await setRoleTimelocksTester(
        { timelockManager, timelock, owner, accessControl },
        [pauseAdminRole],
        [NATIVE_ROLE_TIMELOCK_DELAY],
      );

      const calldata =
        pauseManager.interface.encodeFunctionData('globalUnpause');

      await scheduleTimelockOperationsTester(
        { timelockManager, timelock, owner, accessControl },
        [pauseManager.address],
        [calldata],
        {},
        {
          from: regularAccounts[0],
          revertCustomError: acErrors.WMAC_HASNT_PERMISSION(),
        },
      );
    });

    it('should fail: when not paused', async () => {
      const { pauseManager, owner, timelockManager, timelock, accessControl } =
        await loadFixture(defaultDeploy);

      const pauseAdminRole = await pauseManager.pauseAdminRole();
      await setRoleTimelocksTester(
        { timelockManager, timelock, owner, accessControl },
        [pauseAdminRole],
        [NATIVE_ROLE_TIMELOCK_DELAY],
      );

      const calldata =
        pauseManager.interface.encodeFunctionData('globalUnpause');

      await scheduleTimelockOperationsTester(
        { timelockManager, timelock, owner, accessControl },
        [pauseManager.address],
        [calldata],
      );
      await increase(NATIVE_ROLE_TIMELOCK_DELAY);
      await executeTimelockOperationTester(
        { timelockManager, timelock, owner, accessControl },
        pauseManager.address,
        calldata,
        owner.address,
        timelockUnderlyingRevert(),
      );
    });

    it('when role timelock is 0, unpause can be called directly', async () => {
      const { pauseManager, owner, timelockManager, timelock, accessControl } =
        await loadFixture(defaultDeploy);

      const pauseAdminRole = await pauseManager.pauseAdminRole();
      await setRoleTimelocksTester(
        { timelockManager, timelock, owner, accessControl },
        [pauseAdminRole],
        [constants.MaxUint256],
      );

      await pauseGlobalTest({ pauseManager, owner });
      await unpauseGlobalTest({ pauseManager, owner });
    });

    it('should fail: when role timelock is 0 and trying to schedule through timelock', async () => {
      const { pauseManager, owner, timelockManager, timelock, accessControl } =
        await loadFixture(defaultDeploy);

      const pauseAdminRole = await pauseManager.pauseAdminRole();
      await setRoleTimelocksTester(
        { timelockManager, timelock, owner, accessControl },
        [pauseAdminRole],
        [constants.MaxUint256],
      );
      await pauseGlobalTest({ pauseManager, owner });

      const calldata =
        pauseManager.interface.encodeFunctionData('globalUnpause');

      await scheduleTimelockOperationsTester(
        { timelockManager, timelock, owner, accessControl },
        [pauseManager.address],
        [calldata],
        {},
        {
          revertCustomError: {
            contract: timelockManager,
            customErrorName: 'NoTimelockDelayForRole',
          },
        },
      );
    });

    it('when role timelock is not 0, unpause can be scheduled on timelock', async () => {
      const { pauseManager, owner, timelockManager, timelock, accessControl } =
        await loadFixture(defaultDeploy);

      const pauseAdminRole = await pauseManager.pauseAdminRole();
      await setRoleTimelocksTester(
        { timelockManager, timelock, owner, accessControl },
        [pauseAdminRole],
        [NATIVE_ROLE_TIMELOCK_DELAY],
      );

      await pauseGlobalTest({ pauseManager, owner });

      const calldata =
        pauseManager.interface.encodeFunctionData('globalUnpause');

      await scheduleTimelockOperationsTester(
        { timelockManager, timelock, owner, accessControl },
        [pauseManager.address],
        [calldata],
        {},
      );
      await increase(NATIVE_ROLE_TIMELOCK_DELAY);
      await executeTimelockOperationTester(
        { timelockManager, timelock, owner, accessControl },
        pauseManager.address,
        calldata,
        owner.address,
      );
    });

    it('should fail: when role timelock is not 0 and trying to call directly', async () => {
      const {
        accessControl,
        pauseManager,
        owner,
        regularAccounts,
        timelockManager,
        timelock,
      } = await loadFixture(defaultDeploy);

      const pauseAdminRole = await pauseManager.pauseAdminRole();
      await pauseGlobalTest({ pauseManager, owner });
      await setRoleTimelocksTester(
        { timelockManager, timelock, owner, accessControl },
        [pauseAdminRole],
        [NATIVE_ROLE_TIMELOCK_DELAY],
      );

      await unpauseGlobalTest(
        { pauseManager, owner },
        {
          revertCustomError: {
            contract: accessControl,
            customErrorName: 'FunctionNotReady',
            args: [pauseAdminRole, encodeFnSelector('globalUnpause()')],
          },
        },
      );
    });
  });

  describe('pauseContract()', async () => {
    it('should fail: can`t pause if caller doesnt have admin role', async () => {
      const { pausableTester, regularAccounts, pauseManager, owner } =
        await loadFixture(defaultDeploy);

      await pauseVault({ pauseManager, owner }, pausableTester, {
        from: regularAccounts[0],
        revertCustomError: acErrors.WMAC_HASNT_PERMISSION(),
      });
    });

    it('should fail: when paused', async () => {
      const { pausableTester, pauseManager, owner } = await loadFixture(
        defaultDeploy,
      );

      await pauseVault({ pauseManager, owner }, pausableTester);
      await pauseVault({ pauseManager, owner }, pausableTester, {
        revertCustomError: {
          customErrorName: 'SameBoolValue',
          args: [true],
        },
      });
    });

    it('should fail: when role is user facing', async () => {
      const { pausableTester, pauseManager, owner, roles } = await loadFixture(
        defaultDeploy,
      );

      await pausableTester.setContractAdminRole(roles.common.greenlisted);

      await pauseVault({ pauseManager, owner }, pausableTester, {
        revertCustomError: {
          customErrorName: 'UserFacingRoleNotAllowed',
          args: [roles.common.greenlisted],
        },
      });
    });

    it('when not paused and caller is admin', async () => {
      const { pausableTester, pauseManager, owner } = await loadFixture(
        defaultDeploy,
      );

      await pauseVault({ pauseManager, owner }, pausableTester);
    });

    it('when role and function scoped timelock is not 0', async () => {
      const {
        accessControl,
        pausableTester,
        owner,
        regularAccounts,
        pauseManager,
        timelockManager,
        timelock,
      } = await loadFixture(defaultDeploy);

      const pauseAdminRole = (await pausableTester.pauserRole())[0];
      const pauseSel = encodeFnSelector('pauseContract(address)');

      await setupFunctionAccessGrantOperator({
        accessControl,
        owner,
        functionAccessAdminRole: pauseAdminRole,
        targetContract: pauseManager.address,
        functionSelector: pauseSel,
        grantOperator: owner,
      });
      await setFunctionPermissionTester(
        { accessControl, owner },
        pauseAdminRole,
        pauseManager.address,
        pauseSel,
        [
          {
            account: regularAccounts[0].address,
            enabled: true,
          },
        ],
      );

      await setRoleTimelocksTester(
        { timelockManager, timelock, owner, accessControl },
        [pauseAdminRole],
        [3600],
      );

      await pauseVault({ pauseManager, owner }, pausableTester, {
        from: regularAccounts[0],
      });
    });

    it('succeeds with only scoped function permission', async () => {
      const {
        accessControl,
        pausableTester,
        owner,
        regularAccounts,
        pauseManager,
      } = await loadFixture(defaultDeploy);

      const pauseAdminRole = (await pausableTester.pauserRole())[0];
      const pauseSel = encodeFnSelector('pauseContract(address)');

      await setupFunctionAccessGrantOperator({
        accessControl,
        owner,
        functionAccessAdminRole: pauseAdminRole,
        targetContract: pauseManager.address,
        functionSelector: pauseSel,
        grantOperator: owner,
      });
      await setFunctionPermissionTester(
        { accessControl, owner },
        pauseAdminRole,
        pauseManager.address,
        pauseSel,
        [
          {
            account: regularAccounts[0].address,
            enabled: true,
          },
        ],
      );
      expect(
        await accessControl.hasRole(pauseAdminRole, regularAccounts[0].address),
      ).eq(false);

      await pauseVault({ pauseManager, owner }, pausableTester, {
        from: regularAccounts[0],
      });
    });

    it('admin can call pause() while pause() is per-fn paused', async () => {
      const { pausableTester, pauseManager, owner } = await loadFixture(
        defaultDeploy,
      );

      const pauseSelector = encodeFnSelector('pause()');
      await pauseVaultFn(
        { pauseManager, owner },
        pausableTester,
        pauseSelector,
      );

      await pauseVault({ pauseManager, owner }, pausableTester);
    });

    it('succeeds with scoped permission and pause admin role', async () => {
      const {
        accessControl,
        pausableTester,
        owner,
        regularAccounts,
        pauseManager,
      } = await loadFixture(defaultDeploy);

      const pauseAdminRole = (await pausableTester.pauserRole())[0];
      const pauseSel = encodeFnSelector('pauseContract(address)');

      await setupFunctionAccessGrantOperator({
        accessControl,
        owner,
        functionAccessAdminRole: pauseAdminRole,
        targetContract: pauseManager.address,
        functionSelector: pauseSel,
        grantOperator: owner,
      });
      await setFunctionPermissionTester(
        { accessControl, owner },
        pauseAdminRole,
        pauseManager.address,
        pauseSel,
        [
          {
            account: regularAccounts[0].address,
            enabled: true,
          },
        ],
      );
      await accessControl.grantRole(pauseAdminRole, regularAccounts[0].address);

      await pauseVault({ pauseManager, owner }, pausableTester, {
        from: regularAccounts[0],
      });
    });
  });

  describe('unpauseContract()', async () => {
    it('should fail: can`t unpause if caller doesnt have admin role', async () => {
      const {
        pausableTester,
        regularAccounts,
        pauseManager,
        owner,
        timelockManager,
        timelock,
        accessControl,
      } = await loadFixture(defaultDeploy);

      const pauseAdminRole = (await pausableTester.pauserRole())[0];
      await setRoleTimelocksTester(
        { timelockManager, timelock, owner, accessControl },
        [pauseAdminRole],
        [NATIVE_ROLE_TIMELOCK_DELAY],
      );

      const calldata = pauseManager.interface.encodeFunctionData(
        'unpauseContract',
        [pausableTester.address],
      );

      await scheduleTimelockOperationsTester(
        { timelockManager, timelock, owner, accessControl },
        [pauseManager.address],
        [calldata],
        {},
        {
          from: regularAccounts[0],
          revertCustomError: acErrors.WMAC_HASNT_PERMISSION(),
        },
      );
    });

    it('should fail: when not paused', async () => {
      const {
        pausableTester,
        pauseManager,
        owner,
        timelockManager,
        timelock,
        accessControl,
      } = await loadFixture(defaultDeploy);

      const pauseAdminRole = (await pausableTester.pauserRole())[0];
      await setRoleTimelocksTester(
        { timelockManager, timelock, owner, accessControl },
        [pauseAdminRole],
        [NATIVE_ROLE_TIMELOCK_DELAY],
      );

      const calldata = pauseManager.interface.encodeFunctionData(
        'unpauseContract',
        [pausableTester.address],
      );

      await scheduleTimelockOperationsTester(
        { timelockManager, timelock, owner, accessControl },
        [pauseManager.address],
        [calldata],
      );
      await increase(NATIVE_ROLE_TIMELOCK_DELAY);
      await executeTimelockOperationTester(
        { timelockManager, timelock, owner, accessControl },
        pauseManager.address,
        calldata,
        owner.address,
        timelockUnderlyingRevert(),
      );
    });

    it('should fail: when role is user facing', async () => {
      const {
        pausableTester,
        pauseManager,
        owner,
        roles,
        timelockManager,
        timelock,
        accessControl,
      } = await loadFixture(defaultDeploy);

      await pausableTester.setContractAdminRole(roles.common.greenlisted);

      const calldata = pauseManager.interface.encodeFunctionData(
        'unpauseContract',
        [pausableTester.address],
      );

      await scheduleTimelockOperationsTester(
        { timelockManager, timelock, owner, accessControl },
        [pauseManager.address],
        [calldata],
        {},
        {
          revertCustomError: {
            customErrorName: 'UserFacingRoleNotAllowed',
            args: [roles.common.greenlisted],
          },
        },
      );
    });

    it('when role timelock is 0, unpause can be called directly', async () => {
      const {
        pausableTester,
        pauseManager,
        owner,
        timelockManager,
        timelock,
        accessControl,
      } = await loadFixture(defaultDeploy);

      const pauseAdminRole = (await pausableTester.pauserRole())[0];
      await setRoleTimelocksTester(
        { timelockManager, timelock, owner, accessControl },
        [pauseAdminRole],
        [constants.MaxUint256],
      );

      await pauseVault({ pauseManager, owner }, pausableTester);
      await unpauseVault({ pauseManager, owner }, pausableTester);
    });

    it('should fail: when role timelock is 0 and trying to schedule through timelock', async () => {
      const {
        pausableTester,
        pauseManager,
        owner,
        timelockManager,
        timelock,
        accessControl,
      } = await loadFixture(defaultDeploy);

      const pauseAdminRole = (await pausableTester.pauserRole())[0];
      await setRoleTimelocksTester(
        { timelockManager, timelock, owner, accessControl },
        [pauseAdminRole],
        [constants.MaxUint256],
      );
      await pauseVault({ pauseManager, owner }, pausableTester);

      const calldata = pauseManager.interface.encodeFunctionData(
        'unpauseContract',
        [pausableTester.address],
      );

      await scheduleTimelockOperationsTester(
        { timelockManager, timelock, owner, accessControl },
        [pauseManager.address],
        [calldata],
        {},
        {
          revertCustomError: {
            contract: timelockManager,
            customErrorName: 'NoTimelockDelayForRole',
          },
        },
      );
    });

    it('when role timelock is not 0, unpause can be scheduled on timelock', async () => {
      const {
        pausableTester,
        pauseManager,
        owner,
        timelockManager,
        timelock,
        accessControl,
      } = await loadFixture(defaultDeploy);

      const pauseAdminRole = (await pausableTester.pauserRole())[0];
      await setRoleTimelocksTester(
        { timelockManager, timelock, owner, accessControl },
        [pauseAdminRole],
        [NATIVE_ROLE_TIMELOCK_DELAY],
      );

      await pauseVault({ pauseManager, owner }, pausableTester);

      const calldata = pauseManager.interface.encodeFunctionData(
        'unpauseContract',
        [pausableTester.address],
      );
      await scheduleTimelockOperationsTester(
        { timelockManager, timelock, owner, accessControl },
        [pauseManager.address],
        [calldata],
        {},
      );
      await increase(NATIVE_ROLE_TIMELOCK_DELAY);
      await executeTimelockOperationTester(
        { timelockManager, timelock, owner, accessControl },
        pauseManager.address,
        calldata,
        owner.address,
      );
    });

    it('should fail: when role timelock is not 0 and trying to call directly', async () => {
      const {
        accessControl,
        pausableTester,
        owner,
        regularAccounts,
        pauseManager,
        timelockManager,
        timelock,
      } = await loadFixture(defaultDeploy);

      const pauseAdminRole = (await pausableTester.pauserRole())[0];
      await pauseVault({ pauseManager, owner }, pausableTester);
      await setRoleTimelocksTester(
        { timelockManager, timelock, owner, accessControl },
        [pauseAdminRole],
        [NATIVE_ROLE_TIMELOCK_DELAY],
      );

      await unpauseVault({ pauseManager, owner }, pausableTester, {
        revertCustomError: {
          contract: accessControl,
          customErrorName: 'FunctionNotReady',
          args: [pauseAdminRole, encodeFnSelector('unpauseContract(address)')],
        },
      });
    });

    it('succeeds with only scoped function permission', async () => {
      const {
        accessControl,
        pausableTester,
        owner,
        regularAccounts,
        pauseManager,
        timelockManager,
        timelock,
      } = await loadFixture(defaultDeploy);

      const pauseAdminRole = (await pausableTester.pauserRole())[0];
      const pauseSel = encodeFnSelector('pauseContract(address)');
      await setupFunctionAccessGrantOperator({
        accessControl,
        owner,
        functionAccessAdminRole: pauseAdminRole,
        targetContract: pauseManager.address,
        functionSelector: pauseSel,
        grantOperator: owner,
      });
      await setFunctionPermissionTester(
        { accessControl, owner },
        pauseAdminRole,
        pauseManager.address,
        pauseSel,
        [{ account: regularAccounts[0].address, enabled: true }],
      );

      const unpauseSel = encodeFnSelector('unpauseContract(address)');
      for (const targetContract of [
        pauseManager.address,
        timelockManager.address,
      ]) {
        await setupFunctionAccessGrantOperator({
          accessControl,
          owner,
          functionAccessAdminRole: pauseAdminRole,
          targetContract,
          functionSelector: unpauseSel,
          grantOperator: owner,
        });
        await setFunctionPermissionTester(
          { accessControl, owner },
          pauseAdminRole,
          targetContract,
          unpauseSel,
          [{ account: regularAccounts[0].address, enabled: true }],
        );
      }

      const unpauseRoles = [pauseAdminRole];
      const unpauseDelays = [NATIVE_ROLE_TIMELOCK_DELAY];
      for (const targetContract of [
        pauseManager.address,
        timelockManager.address,
      ]) {
        const functionKey = await accessControl.functionPermissionKey(
          pauseAdminRole,
          targetContract,
          unpauseSel,
        );
        unpauseRoles.push(functionKey);
        unpauseDelays.push(NATIVE_ROLE_TIMELOCK_DELAY);
      }
      await setRoleTimelocksTester(
        { timelockManager, timelock, owner, accessControl },
        unpauseRoles,
        unpauseDelays,
      );

      expect(
        await accessControl.hasRole(pauseAdminRole, regularAccounts[0].address),
      ).eq(false);

      await pauseVault({ pauseManager, owner }, pausableTester, {
        from: regularAccounts[0],
      });

      const calldata = pauseManager.interface.encodeFunctionData(
        'unpauseContract',
        [pausableTester.address],
      );
      await scheduleTimelockOperationsTester(
        { timelockManager, timelock, owner: regularAccounts[0], accessControl },
        [pauseManager.address],
        [calldata],
        {},
        { from: regularAccounts[0] },
      );
      await increase(NATIVE_ROLE_TIMELOCK_DELAY);
      await executeTimelockOperationTester(
        { timelockManager, timelock, owner, accessControl },
        pauseManager.address,
        calldata,
        regularAccounts[0].address,
        { from: owner },
      );
    });

    it('succeeds with scoped permission and pause admin role', async () => {
      const {
        accessControl,
        pausableTester,
        owner,
        regularAccounts,
        pauseManager,
        timelockManager,
        timelock,
      } = await loadFixture(defaultDeploy);

      const pauseAdminRole = (await pausableTester.pauserRole())[0];
      const pauseSel = encodeFnSelector('pauseContract(address)');
      await setupFunctionAccessGrantOperator({
        accessControl,
        owner,
        functionAccessAdminRole: pauseAdminRole,
        targetContract: pauseManager.address,
        functionSelector: pauseSel,
        grantOperator: owner,
      });
      await setFunctionPermissionTester(
        { accessControl, owner },
        pauseAdminRole,
        pauseManager.address,
        pauseSel,
        [{ account: regularAccounts[0].address, enabled: true }],
      );

      const unpauseSel = encodeFnSelector('unpauseContract(address)');
      for (const targetContract of [
        pauseManager.address,
        timelockManager.address,
      ]) {
        await setupFunctionAccessGrantOperator({
          accessControl,
          owner,
          functionAccessAdminRole: pauseAdminRole,
          targetContract,
          functionSelector: unpauseSel,
          grantOperator: owner,
        });
        await setFunctionPermissionTester(
          { accessControl, owner },
          pauseAdminRole,
          targetContract,
          unpauseSel,
          [{ account: regularAccounts[0].address, enabled: true }],
        );
      }

      await accessControl.grantRole(pauseAdminRole, regularAccounts[0].address);

      const unpauseRoles = [pauseAdminRole];
      const unpauseDelays = [NATIVE_ROLE_TIMELOCK_DELAY];
      for (const targetContract of [
        pauseManager.address,
        timelockManager.address,
      ]) {
        const functionKey = await accessControl.functionPermissionKey(
          pauseAdminRole,
          targetContract,
          unpauseSel,
        );
        unpauseRoles.push(functionKey);
        unpauseDelays.push(NATIVE_ROLE_TIMELOCK_DELAY);
      }
      await setRoleTimelocksTester(
        { timelockManager, timelock, owner, accessControl },
        unpauseRoles,
        unpauseDelays,
      );

      await pauseVault({ pauseManager, owner }, pausableTester, {
        from: regularAccounts[0],
      });

      const calldata = pauseManager.interface.encodeFunctionData(
        'unpauseContract',
        [pausableTester.address],
      );
      await scheduleTimelockOperationsTester(
        { timelockManager, timelock, owner: regularAccounts[0], accessControl },
        [pauseManager.address],
        [calldata],
        {},
        { from: regularAccounts[0] },
      );
      await increase(NATIVE_ROLE_TIMELOCK_DELAY);
      await executeTimelockOperationTester(
        { timelockManager, timelock, owner, accessControl },
        pauseManager.address,
        calldata,
        regularAccounts[0].address,
        { from: owner },
      );
    });
  });

  describe('bulkPauseContractFn()', async () => {
    it('should fail: can`t pause if caller doesnt have admin role', async () => {
      const { pausableTester, regularAccounts, pauseManager, owner } =
        await loadFixture(defaultDeploy);

      const selector = encodeFnSelector(
        'depositRequest(address,uint256,bytes32)',
      );

      await pauseVaultFn({ pauseManager, owner }, pausableTester, selector, {
        from: regularAccounts[0],
        revertCustomError: acErrors.WMAC_HASNT_PERMISSION(),
      });
    });

    it('should fail: when paused', async () => {
      const { pausableTester, pauseManager, owner } = await loadFixture(
        defaultDeploy,
      );

      const selector = encodeFnSelector(
        'depositRequest(address,uint256,bytes32)',
      );

      await pauseVaultFn({ pauseManager, owner }, pausableTester, selector);
      await pauseVaultFn({ pauseManager, owner }, pausableTester, selector, {
        revertCustomError: {
          customErrorName: 'SameBoolValue',
          args: [true],
        },
      });
    });

    it('should fail: when role is user facing', async () => {
      const { pausableTester, pauseManager, owner, roles } = await loadFixture(
        defaultDeploy,
      );

      await pausableTester.setContractAdminRole(roles.common.greenlisted);
      const selector = encodeFnSelector(
        'depositRequest(address,uint256,bytes32)',
      );

      await pauseVaultFn({ pauseManager, owner }, pausableTester, selector, {
        revertCustomError: {
          customErrorName: 'UserFacingRoleNotAllowed',
          args: [roles.common.greenlisted],
        },
      });
    });

    it('when not paused and caller is admin', async () => {
      const { pausableTester, pauseManager, owner } = await loadFixture(
        defaultDeploy,
      );

      const selector = encodeFnSelector(
        'depositRequest(address,uint256,bytes32)',
      );

      await pauseVaultFn({ pauseManager, owner }, pausableTester, selector);
    });

    it('when role and function scoped timelock is not 0', async () => {
      const {
        accessControl,
        pausableTester,
        owner,
        regularAccounts,
        pauseManager,
        timelockManager,
        timelock,
      } = await loadFixture(defaultDeploy);

      const pauseAdminRole = (await pausableTester.pauserRole())[0];
      const fnSel = encodeFnSelector('depositRequest(address,uint256,bytes32)');
      const pauseFnEntrySel = encodeFnSelector(
        'bulkPauseContractFn(address,bytes4[])',
      );

      await setupFunctionAccessGrantOperator({
        accessControl,
        owner,
        functionAccessAdminRole: pauseAdminRole,
        targetContract: pauseManager.address,
        functionSelector: pauseFnEntrySel,
        grantOperator: owner,
      });
      await setFunctionPermissionTester(
        { accessControl, owner },
        pauseAdminRole,
        pauseManager.address,
        pauseFnEntrySel,
        [
          {
            account: regularAccounts[0].address,
            enabled: true,
          },
        ],
      );

      await setRoleTimelocksTester(
        { timelockManager, timelock, owner, accessControl },
        [pauseAdminRole],
        [3600],
      );

      await pauseVaultFn({ pauseManager, owner }, pausableTester, fnSel, {
        from: regularAccounts[0],
      });
    });

    it('succeeds with only scoped function permission', async () => {
      const {
        accessControl,
        pausableTester,
        owner,
        regularAccounts,
        pauseManager,
      } = await loadFixture(defaultDeploy);

      const pauseAdminRole = (await pausableTester.pauserRole())[0];
      const fnSel = encodeFnSelector('depositRequest(address,uint256,bytes32)');
      const pauseFnEntrySel = encodeFnSelector(
        'bulkPauseContractFn(address,bytes4[])',
      );

      await setupFunctionAccessGrantOperator({
        accessControl,
        owner,
        functionAccessAdminRole: pauseAdminRole,
        targetContract: pauseManager.address,
        functionSelector: pauseFnEntrySel,
        grantOperator: owner,
      });
      await setFunctionPermissionTester(
        { accessControl, owner },
        pauseAdminRole,
        pauseManager.address,
        pauseFnEntrySel,
        [
          {
            account: regularAccounts[0].address,
            enabled: true,
          },
        ],
      );

      expect(
        await accessControl.hasRole(pauseAdminRole, regularAccounts[0].address),
      ).eq(false);

      await pauseVaultFn({ pauseManager, owner }, pausableTester, fnSel, {
        from: regularAccounts[0],
      });
    });

    it('succeeds with scoped permission and DEFAULT_ADMIN role', async () => {
      const {
        accessControl,
        pausableTester,
        owner,
        regularAccounts,
        pauseManager,
      } = await loadFixture(defaultDeploy);

      const pauseAdminRole = (await pausableTester.pauserRole())[0];
      const fnSel = encodeFnSelector('depositRequest(address,uint256,bytes32)');
      const pauseFnEntrySel = encodeFnSelector(
        'bulkPauseContractFn(address,bytes4[])',
      );

      await setupFunctionAccessGrantOperator({
        accessControl,
        owner,
        functionAccessAdminRole: pauseAdminRole,
        targetContract: pauseManager.address,
        functionSelector: pauseFnEntrySel,
        grantOperator: owner,
      });
      await setFunctionPermissionTester(
        { accessControl, owner },
        pauseAdminRole,
        pauseManager.address,
        pauseFnEntrySel,
        [
          {
            account: regularAccounts[0].address,
            enabled: true,
          },
        ],
      );

      await accessControl.grantRole(pauseAdminRole, regularAccounts[0].address);

      await pauseVaultFn({ pauseManager, owner }, pausableTester, fnSel, {
        from: regularAccounts[0],
      });
    });

    it('admin can pauseFn / unpauseFn other selectors while pauseFn(bytes4) is paused', async () => {
      const {
        pausableTester,
        pauseManager,
        owner,
        timelockManager,
        timelock,
        accessControl,
      } = await loadFixture(defaultDeploy);

      const pauseFnSelector = encodeFnSelector('pauseContract(address)');
      const otherSelector = encodeFnSelector(
        'depositRequest(address,uint256,bytes32)',
      );

      await pauseVaultFn(
        { pauseManager, owner },
        pausableTester,
        pauseFnSelector,
      );

      await pauseVaultFn(
        { pauseManager, owner },
        pausableTester,
        otherSelector,
      );

      const pauseAdminRole = (await pausableTester.pauserRole())[0];
      await setRoleTimelocksTester(
        { timelockManager, timelock, owner, accessControl },
        [pauseAdminRole],
        [NATIVE_ROLE_TIMELOCK_DELAY],
      );

      const calldata = pauseManager.interface.encodeFunctionData(
        'bulkUnpauseContractFn',
        [pausableTester.address, [otherSelector]],
      );
      await scheduleTimelockOperationsTester(
        { timelockManager, timelock, owner, accessControl },
        [pauseManager.address],
        [calldata],
        {},
      );
      await increase(NATIVE_ROLE_TIMELOCK_DELAY);
      await executeTimelockOperationTester(
        { timelockManager, timelock, owner, accessControl },
        pauseManager.address,
        calldata,
        owner.address,
      );
    });
  });

  describe('bulkUnpauseContractFn()', async () => {
    it('should fail: can`t unpause if caller doesnt have admin role', async () => {
      const {
        pausableTester,
        regularAccounts,
        pauseManager,
        owner,
        timelockManager,
        timelock,
        accessControl,
      } = await loadFixture(defaultDeploy);

      const selector = encodeFnSelector(
        'depositRequest(address,uint256,bytes32)',
      );
      const pauseAdminRole = (await pausableTester.pauserRole())[0];
      await setRoleTimelocksTester(
        { timelockManager, timelock, owner, accessControl },
        [pauseAdminRole],
        [NATIVE_ROLE_TIMELOCK_DELAY],
      );

      const calldata = pauseManager.interface.encodeFunctionData(
        'bulkUnpauseContractFn',
        [pausableTester.address, [selector]],
      );

      await scheduleTimelockOperationsTester(
        { timelockManager, timelock, owner, accessControl },
        [pauseManager.address],
        [calldata],
        {},
        {
          from: regularAccounts[0],
          revertCustomError: acErrors.WMAC_HASNT_PERMISSION(),
        },
      );
    });

    it('should fail: when unpaused', async () => {
      const {
        pausableTester,
        pauseManager,
        owner,
        timelockManager,
        timelock,
        accessControl,
      } = await loadFixture(defaultDeploy);

      const selector = encodeFnSelector(
        'depositRequest(address,uint256,bytes32)',
      );
      const pauseAdminRole = (await pausableTester.pauserRole())[0];
      await setRoleTimelocksTester(
        { timelockManager, timelock, owner, accessControl },
        [pauseAdminRole],
        [NATIVE_ROLE_TIMELOCK_DELAY],
      );

      const calldata = pauseManager.interface.encodeFunctionData(
        'bulkUnpauseContractFn',
        [pausableTester.address, [selector]],
      );

      await scheduleTimelockOperationsTester(
        { timelockManager, timelock, owner, accessControl },
        [pauseManager.address],
        [calldata],
      );
      await increase(NATIVE_ROLE_TIMELOCK_DELAY);
      await executeTimelockOperationTester(
        { timelockManager, timelock, owner, accessControl },
        pauseManager.address,
        calldata,
        owner.address,
        timelockUnderlyingRevert(),
      );
    });

    it('should fail: when role is user facing', async () => {
      const { pausableTester, pauseManager, owner, roles } = await loadFixture(
        defaultDeploy,
      );

      await pausableTester.setContractAdminRole(roles.common.greenlisted);

      const selector = encodeFnSelector(
        'depositRequest(address,uint256,bytes32)',
      );

      await unpauseVaultFn({ pauseManager, owner }, pausableTester, selector, {
        revertCustomError: {
          customErrorName: 'UserFacingRoleNotAllowed',
          args: [roles.common.greenlisted],
        },
      });
    });

    it('when role timelock is 0, unpause can be called directly', async () => {
      const {
        pausableTester,
        pauseManager,
        owner,
        timelockManager,
        timelock,
        accessControl,
      } = await loadFixture(defaultDeploy);

      const selector = encodeFnSelector(
        'depositRequest(address,uint256,bytes32)',
      );
      const pauseAdminRole = (await pausableTester.pauserRole())[0];
      await setRoleTimelocksTester(
        { timelockManager, timelock, owner, accessControl },
        [pauseAdminRole],
        [constants.MaxUint256],
      );

      await pauseVaultFn({ pauseManager, owner }, pausableTester, selector);
      await unpauseVaultFn({ pauseManager, owner }, pausableTester, selector);
    });

    it('should fail: when role timelock is 0 and trying to schedule through timelock', async () => {
      const {
        pausableTester,
        pauseManager,
        owner,
        timelockManager,
        timelock,
        accessControl,
      } = await loadFixture(defaultDeploy);

      const selector = encodeFnSelector(
        'depositRequest(address,uint256,bytes32)',
      );
      const pauseAdminRole = (await pausableTester.pauserRole())[0];
      await setRoleTimelocksTester(
        { timelockManager, timelock, owner, accessControl },
        [pauseAdminRole],
        [constants.MaxUint256],
      );

      await pauseVaultFn({ pauseManager, owner }, pausableTester, selector);

      const calldata = pauseManager.interface.encodeFunctionData(
        'bulkUnpauseContractFn',
        [pausableTester.address, [selector]],
      );

      await scheduleTimelockOperationsTester(
        { timelockManager, timelock, owner, accessControl },
        [pauseManager.address],
        [calldata],
        {},
        {
          revertCustomError: {
            contract: timelockManager,
            customErrorName: 'NoTimelockDelayForRole',
          },
        },
      );
    });

    it('when role timelock is not 0, unpause can be scheduled on timelock', async () => {
      const {
        pausableTester,
        pauseManager,
        owner,
        timelockManager,
        timelock,
        accessControl,
      } = await loadFixture(defaultDeploy);

      const selector = encodeFnSelector(
        'depositRequest(address,uint256,bytes32)',
      );
      const pauseAdminRole = (await pausableTester.pauserRole())[0];
      await setRoleTimelocksTester(
        { timelockManager, timelock, owner, accessControl },
        [pauseAdminRole],
        [NATIVE_ROLE_TIMELOCK_DELAY],
      );

      await pauseVaultFn({ pauseManager, owner }, pausableTester, selector);

      const calldata = pauseManager.interface.encodeFunctionData(
        'bulkUnpauseContractFn',
        [pausableTester.address, [selector]],
      );
      await scheduleTimelockOperationsTester(
        { timelockManager, timelock, owner, accessControl },
        [pauseManager.address],
        [calldata],
        {},
      );
      await increase(NATIVE_ROLE_TIMELOCK_DELAY);
      await executeTimelockOperationTester(
        { timelockManager, timelock, owner, accessControl },
        pauseManager.address,
        calldata,
        owner.address,
      );
    });

    it('should fail: when role timelock is not 0 and trying to call directly', async () => {
      const {
        accessControl,
        pausableTester,
        owner,
        regularAccounts,
        pauseManager,
        timelockManager,
        timelock,
      } = await loadFixture(defaultDeploy);

      const pauseAdminRole = (await pausableTester.pauserRole())[0];
      const fnSel = encodeFnSelector('depositRequest(address,uint256,bytes32)');
      await pauseVaultFn({ pauseManager, owner }, pausableTester, fnSel);
      await setRoleTimelocksTester(
        { timelockManager, timelock, owner, accessControl },
        [pauseAdminRole],
        [NATIVE_ROLE_TIMELOCK_DELAY],
      );

      await unpauseVaultFn({ pauseManager, owner }, pausableTester, fnSel, {
        revertCustomError: {
          contract: accessControl,
          customErrorName: 'FunctionNotReady',
          args: [
            pauseAdminRole,
            encodeFnSelector('bulkUnpauseContractFn(address,bytes4[])'),
          ],
        },
      });
    });

    it('succeeds with only scoped function permission', async () => {
      const {
        accessControl,
        pausableTester,
        owner,
        regularAccounts,
        pauseManager,
        timelockManager,
        timelock,
      } = await loadFixture(defaultDeploy);

      const pauseAdminRole = (await pausableTester.pauserRole())[0];
      const fnSel = encodeFnSelector('depositRequest(address,uint256,bytes32)');
      await pauseVaultFn({ pauseManager, owner }, pausableTester, fnSel);

      const bulkUnpauseSel = encodeFnSelector(
        'bulkUnpauseContractFn(address,bytes4[])',
      );
      for (const targetContract of [
        pauseManager.address,
        timelockManager.address,
      ]) {
        await setupFunctionAccessGrantOperator({
          accessControl,
          owner,
          functionAccessAdminRole: pauseAdminRole,
          targetContract,
          functionSelector: bulkUnpauseSel,
          grantOperator: owner,
        });
        await setFunctionPermissionTester(
          { accessControl, owner },
          pauseAdminRole,
          targetContract,
          bulkUnpauseSel,
          [{ account: regularAccounts[0].address, enabled: true }],
        );
      }

      const unpauseRoles = [pauseAdminRole];
      const unpauseDelays = [NATIVE_ROLE_TIMELOCK_DELAY];
      for (const targetContract of [
        pauseManager.address,
        timelockManager.address,
      ]) {
        const functionKey = await accessControl.functionPermissionKey(
          pauseAdminRole,
          targetContract,
          bulkUnpauseSel,
        );
        unpauseRoles.push(functionKey);
        unpauseDelays.push(NATIVE_ROLE_TIMELOCK_DELAY);
      }
      await setRoleTimelocksTester(
        { timelockManager, timelock, owner, accessControl },
        unpauseRoles,
        unpauseDelays,
      );

      expect(
        await accessControl.hasRole(pauseAdminRole, regularAccounts[0].address),
      ).eq(false);

      const calldata = pauseManager.interface.encodeFunctionData(
        'bulkUnpauseContractFn',
        [pausableTester.address, [fnSel]],
      );
      await scheduleTimelockOperationsTester(
        { timelockManager, timelock, owner: regularAccounts[0], accessControl },
        [pauseManager.address],
        [calldata],
        {},
        { from: regularAccounts[0] },
      );
      await increase(NATIVE_ROLE_TIMELOCK_DELAY);
      await executeTimelockOperationTester(
        { timelockManager, timelock, owner, accessControl },
        pauseManager.address,
        calldata,
        regularAccounts[0].address,
        { from: owner },
      );
    });

    it('succeeds with scoped permission and pause admin role', async () => {
      const {
        accessControl,
        pausableTester,
        owner,
        regularAccounts,
        pauseManager,
        timelockManager,
        timelock,
      } = await loadFixture(defaultDeploy);

      const pauseAdminRole = (await pausableTester.pauserRole())[0];
      const fnSel = encodeFnSelector('depositRequest(address,uint256,bytes32)');
      await pauseVaultFn({ pauseManager, owner }, pausableTester, fnSel);

      const bulkUnpauseSel = encodeFnSelector(
        'bulkUnpauseContractFn(address,bytes4[])',
      );
      for (const targetContract of [
        pauseManager.address,
        timelockManager.address,
      ]) {
        await setupFunctionAccessGrantOperator({
          accessControl,
          owner,
          functionAccessAdminRole: pauseAdminRole,
          targetContract,
          functionSelector: bulkUnpauseSel,
          grantOperator: owner,
        });
        await setFunctionPermissionTester(
          { accessControl, owner },
          pauseAdminRole,
          targetContract,
          bulkUnpauseSel,
          [{ account: regularAccounts[0].address, enabled: true }],
        );
      }

      await accessControl.grantRole(pauseAdminRole, regularAccounts[0].address);

      const unpauseRoles = [pauseAdminRole];
      const unpauseDelays = [NATIVE_ROLE_TIMELOCK_DELAY];
      for (const targetContract of [
        pauseManager.address,
        timelockManager.address,
      ]) {
        const functionKey = await accessControl.functionPermissionKey(
          pauseAdminRole,
          targetContract,
          bulkUnpauseSel,
        );
        unpauseRoles.push(functionKey);
        unpauseDelays.push(NATIVE_ROLE_TIMELOCK_DELAY);
      }
      await setRoleTimelocksTester(
        { timelockManager, timelock, owner, accessControl },
        unpauseRoles,
        unpauseDelays,
      );

      const calldata = pauseManager.interface.encodeFunctionData(
        'bulkUnpauseContractFn',
        [pausableTester.address, [fnSel]],
      );
      await scheduleTimelockOperationsTester(
        { timelockManager, timelock, owner: regularAccounts[0], accessControl },
        [pauseManager.address],
        [calldata],
        {},
        { from: regularAccounts[0] },
      );
      await increase(NATIVE_ROLE_TIMELOCK_DELAY);
      await executeTimelockOperationTester(
        { timelockManager, timelock, owner, accessControl },
        pauseManager.address,
        calldata,
        regularAccounts[0].address,
        { from: owner },
      );
    });

    it('admin can unpauseFn other selectors while unpauseFn(bytes4) is per-fn paused', async () => {
      const {
        pausableTester,
        pauseManager,
        owner,
        timelockManager,
        timelock,
        accessControl,
      } = await loadFixture(defaultDeploy);

      const unpauseFnSelector = encodeFnSelector('unpauseContract(address)');
      const otherSelector = encodeFnSelector(
        'depositRequest(address,uint256,bytes32)',
      );
      const pauseAdminRole = (await pausableTester.pauserRole())[0];
      await setRoleTimelocksTester(
        { timelockManager, timelock, owner, accessControl },
        [pauseAdminRole],
        [NATIVE_ROLE_TIMELOCK_DELAY],
      );

      await pauseVaultFn(
        { pauseManager, owner },
        pausableTester,
        otherSelector,
      );
      await pauseVaultFn(
        { pauseManager, owner },
        pausableTester,
        unpauseFnSelector,
      );

      const calldata = pauseManager.interface.encodeFunctionData(
        'bulkUnpauseContractFn',
        [pausableTester.address, [otherSelector]],
      );
      await scheduleTimelockOperationsTester(
        { timelockManager, timelock, owner, accessControl },
        [pauseManager.address],
        [calldata],
        {},
      );
      await increase(NATIVE_ROLE_TIMELOCK_DELAY);
      await executeTimelockOperationTester(
        { timelockManager, timelock, owner, accessControl },
        pauseManager.address,
        calldata,
        owner.address,
      );
    });
  });
});
