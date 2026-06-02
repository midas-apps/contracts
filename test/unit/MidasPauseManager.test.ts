import { loadFixture } from '@nomicfoundation/hardhat-network-helpers';
import { increase } from '@nomicfoundation/hardhat-network-helpers/dist/src/helpers/time';
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { expect } from 'chai';
import { Contract } from 'ethers';

import { encodeFnSelector } from '../../helpers/utils';
import {
  MidasAccessControl,
  MidasAccessControlTimelockController,
  MidasPauseManager,
  MidasTimelockManager,
  Pausable,
} from '../../typechain-types';
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

type TimelockUnpauseParams = {
  pauseManager: MidasPauseManager;
  owner: SignerWithAddress;
  timelockManager: MidasTimelockManager;
  timelock: MidasAccessControlTimelockController;
  accessControl: MidasAccessControl;
};

const timelockUnderlyingRevert = (): OptionalCommonParams => ({
  revertMessage: 'TimelockController: underlying transaction reverted',
});

const functionNotReadyRevert = (
  accessControl: MidasAccessControl,
  role: string,
  selector: string,
): OptionalCommonParams => ({
  revertCustomError: {
    contract: accessControl as unknown as Contract,
    customErrorName: 'FunctionNotReady',
    args: [role, selector],
  },
});

const setupScopedUnpauseTimelockPermissions = async (
  accessControl: MidasAccessControl,
  owner: SignerWithAddress,
  pauseAdminRole: string,
  pauseManager: MidasPauseManager,
  timelockManager: MidasTimelockManager,
  account: string,
  unpauseSelector: string,
) => {
  for (const targetContract of [
    pauseManager.address,
    timelockManager.address,
  ]) {
    await setupFunctionAccessGrantOperator({
      accessControl,
      owner,
      functionAccessAdminRole: pauseAdminRole,
      targetContract,
      functionSelector: unpauseSelector,
      grantOperator: owner,
    });
    await setFunctionPermissionTester(
      { accessControl, owner },
      pauseAdminRole,
      targetContract,
      unpauseSelector,
      [{ account, enabled: true }],
    );
  }
};

const unpauseGlobalViaTimelock = async (
  params: TimelockUnpauseParams,
  from: SignerWithAddress = params.owner,
  executeFrom: SignerWithAddress = params.owner,
) => {
  const calldata =
    params.pauseManager.interface.encodeFunctionData('globalUnpause');

  await scheduleTimelockOperationsTester(
    { ...params, owner: from },
    [params.pauseManager.address],
    [calldata],
    {},
    { from },
  );
  await increase(3600);
  await executeTimelockOperationTester(
    { ...params, owner: executeFrom },
    params.pauseManager.address,
    calldata,
    from.address,
    { from: executeFrom },
  );
};

const unpauseVaultViaTimelock = async (
  params: TimelockUnpauseParams,
  vault: Pausable,
  from: SignerWithAddress = params.owner,
  executeFrom: SignerWithAddress = params.owner,
) => {
  const calldata = params.pauseManager.interface.encodeFunctionData(
    'unpauseContract',
    [vault.address],
  );

  await scheduleTimelockOperationsTester(
    { ...params, owner: from },
    [params.pauseManager.address],
    [calldata],
    {},
    { from },
  );
  await increase(3600);
  await executeTimelockOperationTester(
    { ...params, owner: executeFrom },
    params.pauseManager.address,
    calldata,
    from.address,
    { from: executeFrom },
  );
};

const unpauseVaultFnViaTimelock = async (
  params: TimelockUnpauseParams,
  vault: Pausable,
  fnSelector: string | string[],
  from: SignerWithAddress = params.owner,
  executeFrom: SignerWithAddress = params.owner,
) => {
  const selectors = Array.isArray(fnSelector) ? fnSelector : [fnSelector];
  const calldata = params.pauseManager.interface.encodeFunctionData(
    'bulkUnpauseContractFn',
    [vault.address, selectors],
  );

  await scheduleTimelockOperationsTester(
    { ...params, owner: from },
    [params.pauseManager.address],
    [calldata],
    {},
    { from },
  );
  await increase(3600);
  await executeTimelockOperationTester(
    { ...params, owner: executeFrom },
    params.pauseManager.address,
    calldata,
    from.address,
    { from: executeFrom },
  );
};

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

      const params = {
        pauseManager,
        owner,
        timelockManager,
        timelock,
        accessControl,
      };
      const calldata =
        pauseManager.interface.encodeFunctionData('globalUnpause');

      await scheduleTimelockOperationsTester(
        params,
        [pauseManager.address],
        [calldata],
      );
      await increase(3600);
      await executeTimelockOperationTester(
        params,
        pauseManager.address,
        calldata,
        owner.address,
        timelockUnderlyingRevert(),
      );
    });

    it('call from admin', async () => {
      const { pauseManager, owner, timelockManager, timelock, accessControl } =
        await loadFixture(defaultDeploy);

      await pauseGlobalTest({ pauseManager, owner });
      await unpauseGlobalViaTimelock({
        pauseManager,
        owner,
        timelockManager,
        timelock,
        accessControl,
      });
    });

    it('should fail: direct call', async () => {
      const {
        accessControl,
        pauseManager,
        owner,
        regularAccounts,
        timelockManager,
        timelock,
      } = await loadFixture(defaultDeploy);

      const pauseAdminRole = await pauseManager.pauseAdminRole();
      const globalUnpauseSel = encodeFnSelector('globalUnpause()');

      await pauseGlobalTest({ pauseManager, owner });

      await setupFunctionAccessGrantOperator({
        accessControl,
        owner,
        functionAccessAdminRole: pauseAdminRole,
        targetContract: pauseManager.address,
        functionSelector: globalUnpauseSel,
        grantOperator: owner,
      });
      await setFunctionPermissionTester(
        { accessControl, owner },
        pauseAdminRole,
        pauseManager.address,
        globalUnpauseSel,
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

      const roleUsed = await accessControl.functionPermissionKey(
        pauseAdminRole,
        pauseManager.address,
        globalUnpauseSel,
      );

      await unpauseGlobalTest(
        { pauseManager, owner },
        {
          from: regularAccounts[0],
          ...functionNotReadyRevert(accessControl, roleUsed, globalUnpauseSel),
        },
      );

      await unpauseGlobalTest(
        { pauseManager, owner },
        functionNotReadyRevert(accessControl, pauseAdminRole, globalUnpauseSel),
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

      const params = {
        pauseManager,
        owner,
        timelockManager,
        timelock,
        accessControl,
      };
      const calldata = pauseManager.interface.encodeFunctionData(
        'unpauseContract',
        [pausableTester.address],
      );

      await scheduleTimelockOperationsTester(
        params,
        [pauseManager.address],
        [calldata],
      );
      await increase(3600);
      await executeTimelockOperationTester(
        params,
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

    it('when paused and caller is admin', async () => {
      const {
        pausableTester,
        pauseManager,
        owner,
        timelockManager,
        timelock,
        accessControl,
      } = await loadFixture(defaultDeploy);

      await pauseVault({ pauseManager, owner }, pausableTester);
      await unpauseVaultViaTimelock(
        { pauseManager, owner, timelockManager, timelock, accessControl },
        pausableTester,
      );
    });

    it('should fail: direct call', async () => {
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
      const unpauseSel = encodeFnSelector('unpauseContract(address)');

      await pauseVault({ pauseManager, owner }, pausableTester);

      await setupFunctionAccessGrantOperator({
        accessControl,
        owner,
        functionAccessAdminRole: pauseAdminRole,
        targetContract: pauseManager.address,
        functionSelector: unpauseSel,
        grantOperator: owner,
      });
      await setFunctionPermissionTester(
        { accessControl, owner },
        pauseAdminRole,
        pauseManager.address,
        unpauseSel,
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

      const roleUsed = await accessControl.functionPermissionKey(
        pauseAdminRole,
        pauseManager.address,
        unpauseSel,
      );

      await unpauseVault({ pauseManager, owner }, pausableTester, {
        from: regularAccounts[0],
        ...functionNotReadyRevert(accessControl, roleUsed, unpauseSel),
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
      const unpauseSel = encodeFnSelector('unpauseContract(address)');

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

      await setupScopedUnpauseTimelockPermissions(
        accessControl,
        owner,
        pauseAdminRole,
        pauseManager,
        timelockManager,
        regularAccounts[0].address,
        unpauseSel,
      );

      expect(
        await accessControl.hasRole(pauseAdminRole, regularAccounts[0].address),
      ).eq(false);

      await pauseVault({ pauseManager, owner }, pausableTester, {
        from: regularAccounts[0],
      });
      await unpauseVaultViaTimelock(
        { pauseManager, owner, timelockManager, timelock, accessControl },
        pausableTester,
        regularAccounts[0],
        owner,
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
      const unpauseSel = encodeFnSelector('unpauseContract(address)');

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

      await setupScopedUnpauseTimelockPermissions(
        accessControl,
        owner,
        pauseAdminRole,
        pauseManager,
        timelockManager,
        regularAccounts[0].address,
        unpauseSel,
      );

      await accessControl.grantRole(pauseAdminRole, regularAccounts[0].address);

      await pauseVault({ pauseManager, owner }, pausableTester, {
        from: regularAccounts[0],
      });
      await unpauseVaultViaTimelock(
        { pauseManager, owner, timelockManager, timelock, accessControl },
        pausableTester,
        regularAccounts[0],
        owner,
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

      await unpauseVaultFnViaTimelock(
        {
          pauseManager,
          owner,
          timelockManager,
          timelock,
          accessControl,
        },
        pausableTester,
        otherSelector,
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
      const params = {
        pauseManager,
        owner,
        timelockManager,
        timelock,
        accessControl,
      };
      const calldata = pauseManager.interface.encodeFunctionData(
        'bulkUnpauseContractFn',
        [pausableTester.address, [selector]],
      );

      await scheduleTimelockOperationsTester(
        params,
        [pauseManager.address],
        [calldata],
      );
      await increase(3600);
      await executeTimelockOperationTester(
        params,
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

    it('when paused and caller is admin', async () => {
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

      await pauseVaultFn({ pauseManager, owner }, pausableTester, selector);
      await unpauseVaultFnViaTimelock(
        { pauseManager, owner, timelockManager, timelock, accessControl },
        pausableTester,
        selector,
      );
    });

    it('should fail: direct call', async () => {
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
      const unpauseFnSel = encodeFnSelector(
        'bulkUnpauseContractFn(address,bytes4[])',
      );

      await pauseVaultFn({ pauseManager, owner }, pausableTester, fnSel);

      await setupFunctionAccessGrantOperator({
        accessControl,
        owner,
        functionAccessAdminRole: pauseAdminRole,
        targetContract: pauseManager.address,
        functionSelector: unpauseFnSel,
        grantOperator: owner,
      });
      await setFunctionPermissionTester(
        { accessControl, owner },
        pauseAdminRole,
        pauseManager.address,
        unpauseFnSel,
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

      const roleUsed = await accessControl.functionPermissionKey(
        pauseAdminRole,
        pauseManager.address,
        unpauseFnSel,
      );

      await unpauseVaultFn({ pauseManager, owner }, pausableTester, fnSel, {
        from: regularAccounts[0],
        ...functionNotReadyRevert(accessControl, roleUsed, unpauseFnSel),
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
      const unpauseFnSel = encodeFnSelector(
        'bulkUnpauseContractFn(address,bytes4[])',
      );

      await pauseVaultFn({ pauseManager, owner }, pausableTester, fnSel);

      await setupScopedUnpauseTimelockPermissions(
        accessControl,
        owner,
        pauseAdminRole,
        pauseManager,
        timelockManager,
        regularAccounts[0].address,
        unpauseFnSel,
      );

      expect(
        await accessControl.hasRole(pauseAdminRole, regularAccounts[0].address),
      ).eq(false);

      await unpauseVaultFnViaTimelock(
        { pauseManager, owner, timelockManager, timelock, accessControl },
        pausableTester,
        fnSel,
        regularAccounts[0],
        owner,
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
      const unpauseFnSel = encodeFnSelector(
        'bulkUnpauseContractFn(address,bytes4[])',
      );

      await pauseVaultFn({ pauseManager, owner }, pausableTester, fnSel);

      await setupScopedUnpauseTimelockPermissions(
        accessControl,
        owner,
        pauseAdminRole,
        pauseManager,
        timelockManager,
        regularAccounts[0].address,
        unpauseFnSel,
      );

      await accessControl.grantRole(pauseAdminRole, regularAccounts[0].address);

      await unpauseVaultFnViaTimelock(
        { pauseManager, owner, timelockManager, timelock, accessControl },
        pausableTester,
        fnSel,
        regularAccounts[0],
        owner,
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

      await unpauseVaultFnViaTimelock(
        { pauseManager, owner, timelockManager, timelock, accessControl },
        pausableTester,
        otherSelector,
      );
    });
  });
});
