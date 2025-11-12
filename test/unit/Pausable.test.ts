import { loadFixture } from '@nomicfoundation/hardhat-network-helpers';
import { expect } from 'chai';

import { encodeFnSelector } from '../../helpers/utils';
import { PausableTester__factory } from '../../typechain-types';
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
      const { pausableTester, regularAccounts } =
        await loadFixture(defaultDeploy);

      await pauseVault(pausableTester, {
        from: regularAccounts[0],
        revertMessage: 'WMAC: hasnt role',
      });
    });

    it('can change state if has role', async () => {
      const { pausableTester } = await loadFixture(defaultDeploy);

      await pauseVault(pausableTester);
    });
  });

  describe('pause()', async () => {
    it('fail: can`t pause if caller doesnt have admin role', async () => {
      const { pausableTester, regularAccounts } =
        await loadFixture(defaultDeploy);

      await pauseVault(pausableTester, {
        from: regularAccounts[0],
        revertMessage: 'WMAC: hasnt role',
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
  });

  describe('pauseFn()', async () => {
    it('fail: can`t pause if caller doesnt have admin role', async () => {
      const { pausableTester, regularAccounts } =
        await loadFixture(defaultDeploy);

      const selector = encodeFnSelector(
        'depositRequest(address,uint256,bytes32)',
      );

      await pauseVaultFn(pausableTester, selector, {
        from: regularAccounts[0],
        revertMessage: 'WMAC: hasnt role',
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
  });

  describe('unpauseFn()', async () => {
    it('fail: can`t pause if caller doesnt have admin role', async () => {
      const { pausableTester, regularAccounts } =
        await loadFixture(defaultDeploy);

      const selector = encodeFnSelector(
        'depositRequest(address,uint256,bytes32)',
      );

      await unpauseVaultFn(pausableTester, selector, {
        from: regularAccounts[0],
        revertMessage: 'WMAC: hasnt role',
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
  });

  describe('unpause()', async () => {
    it('fail: can`t unpause if caller doesnt have admin role', async () => {
      const { pausableTester, regularAccounts } =
        await loadFixture(defaultDeploy);

      await unpauseVault(pausableTester, {
        from: regularAccounts[0],
        revertMessage: 'WMAC: hasnt role',
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
  });
});
