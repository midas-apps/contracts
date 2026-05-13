import { loadFixture } from '@nomicfoundation/hardhat-network-helpers';
import { expect } from 'chai';

import { encodeFnSelector } from '../../helpers/utils';
import {
  acErrors,
  setFunctionPermissionTester,
  setupFunctionAccessGrantOperator,
} from '../common/ac.helpers';
import {
  pauseVault,
  pauseVaultFn,
  pauseGlobalTest,
  unpauseVault,
  unpauseVaultFn,
  unpauseGlobalTest,
} from '../common/common.helpers';
import { defaultDeploy } from '../common/fixtures';

describe('Pausable', () => {
  it('deployment', async () => {
    const { pausableTester, roles, pauseManager } = await loadFixture(
      defaultDeploy,
    );

    expect((await pausableTester.pauserRole())[0]).eq(
      roles.common.defaultAdmin,
    );

    expect(
      await pauseManager.isPaused(pausableTester.address, '0x00000000'),
    ).eq(false);
  });

  describe('onlyPauseAdmin modifier', async () => {
    it('should fail: can`t pause if doesn`t have role', async () => {
      const { pausableTester, regularAccounts, pauseManager, owner } =
        await loadFixture(defaultDeploy);

      await pauseVault({ pauseManager, owner }, pausableTester, {
        from: regularAccounts[0],
        revertCustomError: {
          ...acErrors.WMAC_HASNT_PERMISSION(),
          contract: pauseManager,
        },
      });
    });

    it('can change state if has role', async () => {
      const { pausableTester, pauseManager, owner } = await loadFixture(
        defaultDeploy,
      );

      await pauseVault({ pauseManager, owner }, pausableTester);
    });
  });

  describe('_requireFnNotPaused()', () => {
    it('should not fail when fn is not paused', async () => {
      const { pausableTester } = await loadFixture(defaultDeploy);
      const selector = encodeFnSelector(
        'depositRequest(address,uint256,bytes32)',
      );

      await expect(pausableTester.requireFnNotPaused(selector)).not.reverted;
    });

    it('should not fail when contract is not paused', async () => {
      const { pausableTester } = await loadFixture(defaultDeploy);

      await expect(
        pausableTester.requireFnNotPaused(encodeFnSelector('randomSelector()')),
      ).not.reverted;
    });

    it('should not fail when globally is not paused', async () => {
      const { pausableTester, pauseManager, owner } = await loadFixture(
        defaultDeploy,
      );

      await expect(
        pausableTester.requireFnNotPaused(encodeFnSelector('randomSelector()')),
      ).not.reverted;
    });

    it('should fail: when fn is paused', async () => {
      const { pausableTester, pauseManager, owner } = await loadFixture(
        defaultDeploy,
      );
      const selector = encodeFnSelector(
        'depositRequest(address,uint256,bytes32)',
      );

      await pauseVaultFn({ pauseManager, owner }, pausableTester, selector);

      await expect(pausableTester.requireFnNotPaused(selector))
        .revertedWithCustomError(pausableTester, 'Paused')
        .withArgs(pausableTester.address, selector);
    });

    it('should fail: when contract is paused', async () => {
      const { pausableTester, pauseManager, owner } = await loadFixture(
        defaultDeploy,
      );
      const selector = encodeFnSelector(
        'depositRequest(address,uint256,bytes32)',
      );

      await pauseVault({ pauseManager, owner }, pausableTester);

      await expect(pausableTester.requireFnNotPaused(selector))
        .revertedWithCustomError(pausableTester, 'Paused')
        .withArgs(pausableTester.address, selector);
    });

    it('should fail: when globally is paused', async () => {
      const { pausableTester, pauseManager, owner } = await loadFixture(
        defaultDeploy,
      );
      const selector = encodeFnSelector(
        'depositRequest(address,uint256,bytes32)',
      );

      await pauseGlobalTest({ pauseManager, owner });

      await expect(pausableTester.requireFnNotPaused(selector))
        .revertedWithCustomError(pausableTester, 'Paused')
        .withArgs(pausableTester.address, selector);
    });

    it('should fail: when globally, contract and fn are paused', async () => {
      const { pausableTester, pauseManager, owner } = await loadFixture(
        defaultDeploy,
      );
      const selector = encodeFnSelector(
        'depositRequest(address,uint256,bytes32)',
      );

      await pauseGlobalTest({ pauseManager, owner });
      await pauseVault({ pauseManager, owner }, pausableTester);
      await pauseVaultFn({ pauseManager, owner }, pausableTester, selector);

      await expect(pausableTester.requireFnNotPaused(selector))
        .revertedWithCustomError(pausableTester, 'Paused')
        .withArgs(pausableTester.address, selector);
    });
  });
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
            customErrorName: 'Paused',
          },
        },
      );
    });

    it('call from admin', async () => {
      const { pauseManager, owner } = await loadFixture(defaultDeploy);
      await pauseGlobalTest({ pauseManager, owner });
    });
  });

  describe('globalUnpause()', () => {
    it('should fail: when caller doesnt have admin role', async () => {
      const { pauseManager, owner, regularAccounts } = await loadFixture(
        defaultDeploy,
      );

      await unpauseGlobalTest(
        { pauseManager, owner },
        {
          from: regularAccounts[0],
          revertCustomError: acErrors.WMAC_HASNT_PERMISSION(),
        },
      );
    });

    it('should fail: when not paused', async () => {
      const { pauseManager, owner } = await loadFixture(defaultDeploy);

      await unpauseGlobalTest(
        { pauseManager, owner },
        {
          revertMessage: 'Pausable: not paused',
        },
      );
    });

    it('call from admin', async () => {
      const { pauseManager, owner } = await loadFixture(defaultDeploy);

      await pauseGlobalTest({ pauseManager, owner });
      await unpauseGlobalTest({ pauseManager, owner });
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

    it('when not paused and caller is admin', async () => {
      const { pausableTester, pauseManager, owner } = await loadFixture(
        defaultDeploy,
      );

      await pauseVault({ pauseManager, owner }, pausableTester);
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
      await setFunctionPermissionTester({ accessControl, owner }, [
        {
          functionAccessAdminRole: pauseAdminRole,
          targetContract: pauseManager.address,
          functionSelector: pauseSel,
          account: regularAccounts[0].address,
          enabled: true,
        },
      ]);
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
      await setFunctionPermissionTester({ accessControl, owner }, [
        {
          functionAccessAdminRole: pauseAdminRole,
          targetContract: pauseManager.address,
          functionSelector: pauseSel,
          account: regularAccounts[0].address,
          enabled: true,
        },
      ]);
      await accessControl.grantRole(pauseAdminRole, regularAccounts[0].address);

      await pauseVault({ pauseManager, owner }, pausableTester, {
        from: regularAccounts[0],
      });
    });
  });

  describe('unpauseContract()', async () => {
    it('should fail: can`t unpause if caller doesnt have admin role', async () => {
      const { pausableTester, regularAccounts, pauseManager, owner } =
        await loadFixture(defaultDeploy);

      await unpauseVault({ pauseManager, owner }, pausableTester, {
        from: regularAccounts[0],
        revertCustomError: {
          ...acErrors.WMAC_HASNT_PERMISSION(),
          contract: pauseManager,
        },
      });
    });

    it('should fail: when not paused', async () => {
      const { pausableTester, pauseManager, owner } = await loadFixture(
        defaultDeploy,
      );

      await unpauseVault({ pauseManager, owner }, pausableTester, {
        revertCustomError: {
          customErrorName: 'SameBoolValue',
          args: [false],
        },
      });
    });

    it('when paused and caller is admin', async () => {
      const { pausableTester, pauseManager, owner } = await loadFixture(
        defaultDeploy,
      );

      await pauseVault({ pauseManager, owner }, pausableTester);
      await unpauseVault({ pauseManager, owner }, pausableTester);
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
      const unpauseSel = encodeFnSelector('unpauseContract(address)');

      await setupFunctionAccessGrantOperator({
        accessControl,
        owner,
        functionAccessAdminRole: pauseAdminRole,
        targetContract: pauseManager.address,
        functionSelector: pauseSel,
        grantOperator: owner,
      });
      await setFunctionPermissionTester({ accessControl, owner }, [
        {
          functionAccessAdminRole: pauseAdminRole,
          targetContract: pauseManager.address,
          functionSelector: pauseSel,
          account: regularAccounts[0].address,
          enabled: true,
        },
      ]);

      await setupFunctionAccessGrantOperator({
        accessControl,
        owner,
        functionAccessAdminRole: pauseAdminRole,
        targetContract: pauseManager.address,
        functionSelector: unpauseSel,
        grantOperator: owner,
      });
      await setFunctionPermissionTester({ accessControl, owner }, [
        {
          functionAccessAdminRole: pauseAdminRole,
          targetContract: pauseManager.address,
          functionSelector: unpauseSel,
          account: regularAccounts[0].address,
          enabled: true,
        },
      ]);

      expect(
        await accessControl.hasRole(pauseAdminRole, regularAccounts[0].address),
      ).eq(false);

      await pauseVault({ pauseManager, owner }, pausableTester, {
        from: regularAccounts[0],
      });
      await unpauseVault({ pauseManager, owner }, pausableTester, {
        from: regularAccounts[0],
      });
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
      const unpauseSel = encodeFnSelector('unpauseContract(address)');

      await setupFunctionAccessGrantOperator({
        accessControl,
        owner,
        functionAccessAdminRole: pauseAdminRole,
        targetContract: pauseManager.address,
        functionSelector: pauseSel,
        grantOperator: owner,
      });
      await setFunctionPermissionTester({ accessControl, owner }, [
        {
          functionAccessAdminRole: pauseAdminRole,
          targetContract: pauseManager.address,
          functionSelector: pauseSel,
          account: regularAccounts[0].address,
          enabled: true,
        },
      ]);

      await setupFunctionAccessGrantOperator({
        accessControl,
        owner,
        functionAccessAdminRole: pauseAdminRole,
        targetContract: pauseManager.address,
        functionSelector: unpauseSel,
        grantOperator: owner,
      });
      await setFunctionPermissionTester({ accessControl, owner }, [
        {
          functionAccessAdminRole: pauseAdminRole,
          targetContract: pauseManager.address,
          functionSelector: unpauseSel,
          account: regularAccounts[0].address,
          enabled: true,
        },
      ]);

      await accessControl.grantRole(pauseAdminRole, regularAccounts[0].address);

      await pauseVault({ pauseManager, owner }, pausableTester, {
        from: regularAccounts[0],
      });
      await unpauseVault({ pauseManager, owner }, pausableTester, {
        from: regularAccounts[0],
      });
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

    it('when not paused and caller is admin', async () => {
      const { pausableTester, pauseManager, owner } = await loadFixture(
        defaultDeploy,
      );

      const selector = encodeFnSelector(
        'depositRequest(address,uint256,bytes32)',
      );

      await pauseVaultFn({ pauseManager, owner }, pausableTester, selector);
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
      await setFunctionPermissionTester({ accessControl, owner }, [
        {
          functionAccessAdminRole: pauseAdminRole,
          targetContract: pauseManager.address,
          functionSelector: pauseFnEntrySel,
          account: regularAccounts[0].address,
          enabled: true,
        },
      ]);

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
      await setFunctionPermissionTester({ accessControl, owner }, [
        {
          functionAccessAdminRole: pauseAdminRole,
          targetContract: pauseManager.address,
          functionSelector: pauseFnEntrySel,
          account: regularAccounts[0].address,
          enabled: true,
        },
      ]);

      await accessControl.grantRole(pauseAdminRole, regularAccounts[0].address);

      await pauseVaultFn({ pauseManager, owner }, pausableTester, fnSel, {
        from: regularAccounts[0],
      });
    });

    it('admin can pauseFn / unpauseFn other selectors while pauseFn(bytes4) is paused', async () => {
      const { pausableTester, pauseManager, owner } = await loadFixture(
        defaultDeploy,
      );

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

      await unpauseVaultFn(
        { pauseManager, owner },
        pausableTester,
        otherSelector,
      );
    });
  });

  describe('bulkUnpauseContractFn()', async () => {
    it('should fail: can`t pause if caller doesnt have admin role', async () => {
      const { pausableTester, regularAccounts, pauseManager, owner } =
        await loadFixture(defaultDeploy);

      const selector = encodeFnSelector(
        'depositRequest(address,uint256,bytes32)',
      );

      await unpauseVaultFn({ pauseManager, owner }, pausableTester, selector, {
        from: regularAccounts[0],
        revertCustomError: acErrors.WMAC_HASNT_PERMISSION(),
      });
    });

    it('should fail: when unpaused', async () => {
      const { pausableTester, pauseManager, owner } = await loadFixture(
        defaultDeploy,
      );

      const selector = encodeFnSelector(
        'function depositRequest(address,uint256,bytes32)',
      );

      await unpauseVaultFn({ pauseManager, owner }, pausableTester, selector, {
        revertCustomError: {
          customErrorName: 'SameBoolValue',
          args: [false],
        },
      });
    });

    it('when paused and caller is admin', async () => {
      const { pausableTester, pauseManager, owner } = await loadFixture(
        defaultDeploy,
      );

      const selector = encodeFnSelector(
        'depositRequest(address,uint256,bytes32)',
      );

      await pauseVaultFn({ pauseManager, owner }, pausableTester, selector);
      await unpauseVaultFn({ pauseManager, owner }, pausableTester, selector);
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
      await setFunctionPermissionTester({ accessControl, owner }, [
        {
          functionAccessAdminRole: pauseAdminRole,
          targetContract: pauseManager.address,
          functionSelector: unpauseFnSel,
          account: regularAccounts[0].address,
          enabled: true,
        },
      ]);

      expect(
        await accessControl.hasRole(pauseAdminRole, regularAccounts[0].address),
      ).eq(false);

      await unpauseVaultFn({ pauseManager, owner }, pausableTester, fnSel, {
        from: regularAccounts[0],
      });
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
      await setFunctionPermissionTester({ accessControl, owner }, [
        {
          functionAccessAdminRole: pauseAdminRole,
          targetContract: pauseManager.address,
          functionSelector: unpauseFnSel,
          account: regularAccounts[0].address,
          enabled: true,
        },
      ]);

      await accessControl.grantRole(pauseAdminRole, regularAccounts[0].address);

      await unpauseVaultFn({ pauseManager, owner }, pausableTester, fnSel, {
        from: regularAccounts[0],
      });
    });

    it('admin can unpauseFn other selectors while unpauseFn(bytes4) is per-fn paused', async () => {
      const { pausableTester, pauseManager, owner } = await loadFixture(
        defaultDeploy,
      );

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

      await unpauseVaultFn(
        { pauseManager, owner },
        pausableTester,
        otherSelector,
      );
    });
  });
});
