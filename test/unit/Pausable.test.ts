import { loadFixture } from '@nomicfoundation/hardhat-network-helpers';
import { expect } from 'chai';

import { encodeFnSelector } from '../../helpers/utils';
import { PausableTester__factory } from '../../typechain-types';
import {
  acErrors,
  setFunctionPermissionTester,
  setupFunctionAccessGrantOperator,
} from '../common/ac.helpers';
import {
  pauseVault,
  pauseVaultFn,
  unpauseVault,
  unpauseVaultFn,
} from '../common/common.helpers';
import { defaultDeploy } from '../common/fixtures';

describe('Pausable', () => {
  it('deployment', async () => {
    const { pausableTester, roles } = await loadFixture(defaultDeploy);

    expect(await pausableTester.pauseAdminRole()).eq(roles.common.defaultAdmin);

    expect(await pausableTester.paused()).eq(false);
  });

  it('onlyInitializing', async () => {
    const { accessControl, owner } = await loadFixture(defaultDeploy);

    const pausable = await new PausableTester__factory(owner).deploy();

    await expect(
      pausable.initializeWithoutInitializer(accessControl.address),
    ).revertedWith('Initializable: contract is not initializing');
  });

  describe('onlyPauseAdmin modifier', async () => {
    it('should fail: can`t pause if doesn`t have role', async () => {
      const { pausableTester, regularAccounts } = await loadFixture(
        defaultDeploy,
      );

      await pauseVault(pausableTester, {
        from: regularAccounts[0],
        revertMessage: acErrors.WMAC_HASNT_PERMISSION,
      });
    });

    it('can change state if has role', async () => {
      const { pausableTester } = await loadFixture(defaultDeploy);

      await pauseVault(pausableTester);
    });
  });

  describe('pause()', async () => {
    it('fail: can`t pause if caller doesnt have admin role', async () => {
      const { pausableTester, regularAccounts } = await loadFixture(
        defaultDeploy,
      );

      await pauseVault(pausableTester, {
        from: regularAccounts[0],
        revertMessage: acErrors.WMAC_HASNT_PERMISSION,
      });
    });

    it('fail: when paused', async () => {
      const { pausableTester } = await loadFixture(defaultDeploy);

      await pauseVault(pausableTester);
      await pauseVault(pausableTester, {
        revertMessage: 'Pausable: paused',
      });
    });

    it('when not paused and caller is admin', async () => {
      const { pausableTester } = await loadFixture(defaultDeploy);

      await pauseVault(pausableTester);
    });

    it('succeeds with only scoped function permission', async () => {
      const { accessControl, pausableTester, owner, regularAccounts } =
        await loadFixture(defaultDeploy);

      const pauseAdminRole = await pausableTester.pauseAdminRole();
      const pauseSel = encodeFnSelector('pause()');

      await setupFunctionAccessGrantOperator({
        accessControl,
        owner,
        functionAccessAdminRole: pauseAdminRole,
        targetContract: pausableTester.address,
        functionSelector: pauseSel,
        grantOperator: owner,
      });
      await setFunctionPermissionTester({ accessControl, owner }, [
        {
          functionAccessAdminRole: pauseAdminRole,
          targetContract: pausableTester.address,
          functionSelector: pauseSel,
          account: regularAccounts[0].address,
          enabled: true,
        },
      ]);
      expect(
        await accessControl.hasRole(pauseAdminRole, regularAccounts[0].address),
      ).eq(false);

      await pauseVault(pausableTester, { from: regularAccounts[0] });
    });

    it('admin can call pause() while pause() is per-fn paused', async () => {
      const { pausableTester } = await loadFixture(defaultDeploy);

      const pauseSelector = encodeFnSelector('pause()');
      await pauseVaultFn(pausableTester, pauseSelector);
      expect(await pausableTester.fnPaused(pauseSelector)).eq(true);

      await pauseVault(pausableTester);
      expect(await pausableTester.paused()).eq(true);
    });

    it('succeeds with scoped permission and pause admin role', async () => {
      const { accessControl, pausableTester, owner, regularAccounts } =
        await loadFixture(defaultDeploy);

      const pauseAdminRole = await pausableTester.pauseAdminRole();
      const pauseSel = encodeFnSelector('pause()');

      await setupFunctionAccessGrantOperator({
        accessControl,
        owner,
        functionAccessAdminRole: pauseAdminRole,
        targetContract: pausableTester.address,
        functionSelector: pauseSel,
        grantOperator: owner,
      });
      await setFunctionPermissionTester({ accessControl, owner }, [
        {
          functionAccessAdminRole: pauseAdminRole,
          targetContract: pausableTester.address,
          functionSelector: pauseSel,
          account: regularAccounts[0].address,
          enabled: true,
        },
      ]);
      await accessControl.grantRole(pauseAdminRole, regularAccounts[0].address);

      await pauseVault(pausableTester, { from: regularAccounts[0] });
    });
  });

  describe('pauseFn()', async () => {
    it('fail: can`t pause if caller doesnt have admin role', async () => {
      const { pausableTester, regularAccounts } = await loadFixture(
        defaultDeploy,
      );

      const selector = encodeFnSelector(
        'depositRequest(address,uint256,bytes32)',
      );

      await pauseVaultFn(pausableTester, selector, {
        from: regularAccounts[0],
        revertMessage: acErrors.WMAC_HASNT_PERMISSION,
      });
    });

    it('fail: when paused', async () => {
      const { pausableTester } = await loadFixture(defaultDeploy);

      const selector = encodeFnSelector(
        'depositRequest(address,uint256,bytes32)',
      );

      await pauseVaultFn(pausableTester, selector);
      await pauseVaultFn(pausableTester, selector, {
        revertMessage: 'Pausable: fn paused',
      });
    });

    it('when not paused and caller is admin', async () => {
      const { pausableTester } = await loadFixture(defaultDeploy);

      const selector = encodeFnSelector(
        'depositRequest(address,uint256,bytes32)',
      );

      await pauseVaultFn(pausableTester, selector);
    });

    it('succeeds with only scoped function permission', async () => {
      const { accessControl, pausableTester, owner, regularAccounts } =
        await loadFixture(defaultDeploy);

      const pauseAdminRole = await pausableTester.pauseAdminRole();
      const fnSel = encodeFnSelector('depositRequest(address,uint256,bytes32)');
      const pauseFnEntrySel = encodeFnSelector('pauseFn(bytes4)');

      await setupFunctionAccessGrantOperator({
        accessControl,
        owner,
        functionAccessAdminRole: pauseAdminRole,
        targetContract: pausableTester.address,
        functionSelector: pauseFnEntrySel,
        grantOperator: owner,
      });
      await setFunctionPermissionTester({ accessControl, owner }, [
        {
          functionAccessAdminRole: pauseAdminRole,
          targetContract: pausableTester.address,
          functionSelector: pauseFnEntrySel,
          account: regularAccounts[0].address,
          enabled: true,
        },
      ]);

      expect(
        await accessControl.hasRole(pauseAdminRole, regularAccounts[0].address),
      ).eq(false);

      await pauseVaultFn(pausableTester, fnSel, {
        from: regularAccounts[0],
      });
    });

    it('succeeds with scoped permission and DEFAULT_ADMIN role', async () => {
      const { accessControl, pausableTester, owner, regularAccounts } =
        await loadFixture(defaultDeploy);

      const pauseAdminRole = await pausableTester.pauseAdminRole();
      const fnSel = encodeFnSelector('depositRequest(address,uint256,bytes32)');
      const pauseFnEntrySel = encodeFnSelector('pauseFn(bytes4)');

      await setupFunctionAccessGrantOperator({
        accessControl,
        owner,
        functionAccessAdminRole: pauseAdminRole,
        targetContract: pausableTester.address,
        functionSelector: pauseFnEntrySel,
        grantOperator: owner,
      });
      await setFunctionPermissionTester({ accessControl, owner }, [
        {
          functionAccessAdminRole: pauseAdminRole,
          targetContract: pausableTester.address,
          functionSelector: pauseFnEntrySel,
          account: regularAccounts[0].address,
          enabled: true,
        },
      ]);

      await accessControl.grantRole(pauseAdminRole, regularAccounts[0].address);

      await pauseVaultFn(pausableTester, fnSel, {
        from: regularAccounts[0],
      });
    });

    it('admin can pauseFn / unpauseFn other selectors while pauseFn(bytes4) is paused', async () => {
      const { pausableTester } = await loadFixture(defaultDeploy);

      const pauseFnSelector = encodeFnSelector('pauseFn(bytes4)');
      const otherSelector = encodeFnSelector(
        'depositRequest(address,uint256,bytes32)',
      );

      await pauseVaultFn(pausableTester, pauseFnSelector);
      expect(await pausableTester.fnPaused(pauseFnSelector)).eq(true);

      await pauseVaultFn(pausableTester, otherSelector);
      expect(await pausableTester.fnPaused(otherSelector)).eq(true);

      await unpauseVaultFn(pausableTester, otherSelector);
      expect(await pausableTester.fnPaused(otherSelector)).eq(false);
    });
  });

  describe('unpauseFn()', async () => {
    it('fail: can`t pause if caller doesnt have admin role', async () => {
      const { pausableTester, regularAccounts } = await loadFixture(
        defaultDeploy,
      );

      const selector = encodeFnSelector(
        'depositRequest(address,uint256,bytes32)',
      );

      await unpauseVaultFn(pausableTester, selector, {
        from: regularAccounts[0],
        revertMessage: acErrors.WMAC_HASNT_PERMISSION,
      });
    });

    it('fail: when unpaused', async () => {
      const { pausableTester } = await loadFixture(defaultDeploy);

      const selector = encodeFnSelector(
        'function depositRequest(address,uint256,bytes32)',
      );

      await unpauseVaultFn(pausableTester, selector, {
        revertMessage: 'Pausable: fn unpaused',
      });
    });

    it('when paused and caller is admin', async () => {
      const { pausableTester } = await loadFixture(defaultDeploy);

      const selector = encodeFnSelector(
        'depositRequest(address,uint256,bytes32)',
      );

      await pauseVaultFn(pausableTester, selector);
      await unpauseVaultFn(pausableTester, selector);
    });

    it('succeeds with only scoped function permission', async () => {
      const { accessControl, pausableTester, owner, regularAccounts } =
        await loadFixture(defaultDeploy);

      const pauseAdminRole = await pausableTester.pauseAdminRole();
      const fnSel = encodeFnSelector('depositRequest(address,uint256,bytes32)');
      const unpauseFnSel = encodeFnSelector('unpauseFn(bytes4)');

      await pauseVaultFn(pausableTester, fnSel);

      await setupFunctionAccessGrantOperator({
        accessControl,
        owner,
        functionAccessAdminRole: pauseAdminRole,
        targetContract: pausableTester.address,
        functionSelector: unpauseFnSel,
        grantOperator: owner,
      });
      await setFunctionPermissionTester({ accessControl, owner }, [
        {
          functionAccessAdminRole: pauseAdminRole,
          targetContract: pausableTester.address,
          functionSelector: unpauseFnSel,
          account: regularAccounts[0].address,
          enabled: true,
        },
      ]);

      expect(
        await accessControl.hasRole(pauseAdminRole, regularAccounts[0].address),
      ).eq(false);

      await unpauseVaultFn(pausableTester, fnSel, {
        from: regularAccounts[0],
      });
    });

    it('succeeds with scoped permission and pause admin role', async () => {
      const { accessControl, pausableTester, owner, regularAccounts } =
        await loadFixture(defaultDeploy);

      const pauseAdminRole = await pausableTester.pauseAdminRole();
      const fnSel = encodeFnSelector('depositRequest(address,uint256,bytes32)');
      const unpauseFnSel = encodeFnSelector('unpauseFn(bytes4)');

      await pauseVaultFn(pausableTester, fnSel);

      await setupFunctionAccessGrantOperator({
        accessControl,
        owner,
        functionAccessAdminRole: pauseAdminRole,
        targetContract: pausableTester.address,
        functionSelector: unpauseFnSel,
        grantOperator: owner,
      });
      await setFunctionPermissionTester({ accessControl, owner }, [
        {
          functionAccessAdminRole: pauseAdminRole,
          targetContract: pausableTester.address,
          functionSelector: unpauseFnSel,
          account: regularAccounts[0].address,
          enabled: true,
        },
      ]);

      await accessControl.grantRole(pauseAdminRole, regularAccounts[0].address);

      await unpauseVaultFn(pausableTester, fnSel, {
        from: regularAccounts[0],
      });
    });

    it('admin can unpauseFn other selectors while unpauseFn(bytes4) is per-fn paused', async () => {
      const { pausableTester } = await loadFixture(defaultDeploy);

      const unpauseFnSelector = encodeFnSelector('unpauseFn(bytes4)');
      const otherSelector = encodeFnSelector(
        'depositRequest(address,uint256,bytes32)',
      );

      await pauseVaultFn(pausableTester, otherSelector);
      await pauseVaultFn(pausableTester, unpauseFnSelector);
      expect(await pausableTester.fnPaused(unpauseFnSelector)).eq(true);

      await unpauseVaultFn(pausableTester, otherSelector);
      expect(await pausableTester.fnPaused(otherSelector)).eq(false);
    });
  });

  describe('unpause()', async () => {
    it('fail: can`t unpause if caller doesnt have admin role', async () => {
      const { pausableTester, regularAccounts } = await loadFixture(
        defaultDeploy,
      );

      await unpauseVault(pausableTester, {
        from: regularAccounts[0],
        revertMessage: acErrors.WMAC_HASNT_PERMISSION,
      });
    });

    it('fail: when not paused', async () => {
      const { pausableTester } = await loadFixture(defaultDeploy);

      await unpauseVault(pausableTester, {
        revertMessage: 'Pausable: not paused',
      });
    });

    it('when paused and caller is admin', async () => {
      const { pausableTester } = await loadFixture(defaultDeploy);

      await pauseVault(pausableTester);
      await unpauseVault(pausableTester);
    });

    it('succeeds with only scoped function permission', async () => {
      const { accessControl, pausableTester, owner, regularAccounts } =
        await loadFixture(defaultDeploy);

      const pauseAdminRole = await pausableTester.pauseAdminRole();
      const pauseSel = encodeFnSelector('pause()');
      const unpauseSel = encodeFnSelector('unpause()');

      await setupFunctionAccessGrantOperator({
        accessControl,
        owner,
        functionAccessAdminRole: pauseAdminRole,
        targetContract: pausableTester.address,
        functionSelector: pauseSel,
        grantOperator: owner,
      });
      await setFunctionPermissionTester({ accessControl, owner }, [
        {
          functionAccessAdminRole: pauseAdminRole,
          targetContract: pausableTester.address,
          functionSelector: pauseSel,
          account: regularAccounts[0].address,
          enabled: true,
        },
      ]);

      await setupFunctionAccessGrantOperator({
        accessControl,
        owner,
        functionAccessAdminRole: pauseAdminRole,
        targetContract: pausableTester.address,
        functionSelector: unpauseSel,
        grantOperator: owner,
      });
      await setFunctionPermissionTester({ accessControl, owner }, [
        {
          functionAccessAdminRole: pauseAdminRole,
          targetContract: pausableTester.address,
          functionSelector: unpauseSel,
          account: regularAccounts[0].address,
          enabled: true,
        },
      ]);

      expect(
        await accessControl.hasRole(pauseAdminRole, regularAccounts[0].address),
      ).eq(false);

      await pauseVault(pausableTester, { from: regularAccounts[0] });
      await unpauseVault(pausableTester, { from: regularAccounts[0] });
    });

    it('succeeds with scoped permission and pause admin role', async () => {
      const { accessControl, pausableTester, owner, regularAccounts } =
        await loadFixture(defaultDeploy);

      const pauseAdminRole = await pausableTester.pauseAdminRole();
      const pauseSel = encodeFnSelector('pause()');
      const unpauseSel = encodeFnSelector('unpause()');

      await setupFunctionAccessGrantOperator({
        accessControl,
        owner,
        functionAccessAdminRole: pauseAdminRole,
        targetContract: pausableTester.address,
        functionSelector: pauseSel,
        grantOperator: owner,
      });
      await setFunctionPermissionTester({ accessControl, owner }, [
        {
          functionAccessAdminRole: pauseAdminRole,
          targetContract: pausableTester.address,
          functionSelector: pauseSel,
          account: regularAccounts[0].address,
          enabled: true,
        },
      ]);

      await setupFunctionAccessGrantOperator({
        accessControl,
        owner,
        functionAccessAdminRole: pauseAdminRole,
        targetContract: pausableTester.address,
        functionSelector: unpauseSel,
        grantOperator: owner,
      });
      await setFunctionPermissionTester({ accessControl, owner }, [
        {
          functionAccessAdminRole: pauseAdminRole,
          targetContract: pausableTester.address,
          functionSelector: unpauseSel,
          account: regularAccounts[0].address,
          enabled: true,
        },
      ]);

      await accessControl.grantRole(pauseAdminRole, regularAccounts[0].address);

      await pauseVault(pausableTester, { from: regularAccounts[0] });
      await unpauseVault(pausableTester, { from: regularAccounts[0] });
    });
  });
});
