import { loadFixture } from '@nomicfoundation/hardhat-network-helpers';
import { expect } from 'chai';

import { encodeFnSelector } from '../../helpers/utils';
import { acErrors } from '../common/ac.helpers';
import {
  pauseVault,
  pauseVaultFn,
  pauseGlobalTest,
} from '../common/common.helpers';
import { defaultDeploy } from '../common/fixtures';

describe('Pausable', () => {
  it('deployment', async () => {
    const { pausableTester, roles, pauseManager } = await loadFixture(
      defaultDeploy,
    );

    expect(await pausableTester.contractAdminRole()).eq(
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

    it('should not fail when contract is paused', async () => {
      const { pausableTester, pauseManager, owner } = await loadFixture(
        defaultDeploy,
      );
      const selector = encodeFnSelector(
        'depositRequest(address,uint256,bytes32)',
      );

      await pauseVault({ pauseManager, owner }, pausableTester);

      await expect(pausableTester.requireFnNotPaused(selector)).not.reverted;
    });

    it('should not fail when globally is paused', async () => {
      const { pausableTester, pauseManager, owner } = await loadFixture(
        defaultDeploy,
      );
      const selector = encodeFnSelector(
        'depositRequest(address,uint256,bytes32)',
      );

      await pauseGlobalTest({ pauseManager, owner });

      await expect(pausableTester.requireFnNotPaused(selector)).not.reverted;
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

  describe('_requireNotPaused()', () => {
    it('should not fail when fn is not paused', async () => {
      const { pausableTester } = await loadFixture(defaultDeploy);
      const selector = encodeFnSelector(
        'depositRequest(address,uint256,bytes32)',
      );

      await expect(pausableTester.requireNotPaused(selector)).not.reverted;
    });

    it('should not fail when contract is not paused', async () => {
      const { pausableTester } = await loadFixture(defaultDeploy);

      await expect(
        pausableTester.requireNotPaused(encodeFnSelector('randomSelector()')),
      ).not.reverted;
    });

    it('should not fail when globally is not paused', async () => {
      const { pausableTester, pauseManager, owner } = await loadFixture(
        defaultDeploy,
      );

      await expect(
        pausableTester.requireNotPaused(encodeFnSelector('randomSelector()')),
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

      await expect(pausableTester.requireNotPaused(selector))
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

      await expect(
        pausableTester.requireNotPaused(selector),
      ).revertedWithCustomError(pausableTester, 'Paused');
    });

    it('should fail: when globally is paused', async () => {
      const { pausableTester, pauseManager, owner } = await loadFixture(
        defaultDeploy,
      );
      const selector = encodeFnSelector(
        'depositRequest(address,uint256,bytes32)',
      );

      await pauseGlobalTest({ pauseManager, owner });

      await expect(
        pausableTester.requireNotPaused(selector),
      ).revertedWithCustomError(pausableTester, 'Paused');
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

      await expect(pausableTester.requireNotPaused(selector))
        .revertedWithCustomError(pausableTester, 'Paused')
        .withArgs(pausableTester.address, selector);
    });
  });
});
