import { loadFixture } from '@nomicfoundation/hardhat-network-helpers';
import { expect } from 'chai';

import { BlacklistableTester__factory } from '../../typechain-types';
import { acErrors, blackList, unBlackList } from '../common/ac.helpers';
import { defaultDeploy } from '../common/fixtures';

describe('Blacklistable', function () {
  it('deployment', async () => {
    const { accessControl, blackListableTester, roles } = await loadFixture(
      defaultDeploy,
    );

    expect(
      await accessControl.hasRole(
        roles.common.blacklistedOperator,
        blackListableTester.address,
      ),
    ).eq(true);
  });

  it('onlyInitializing', async () => {
    const { accessControl, owner } = await loadFixture(defaultDeploy);

    const blackListable = await new BlacklistableTester__factory(
      owner,
    ).deploy();

    await expect(
      blackListable.initializeWithoutInitializer(accessControl.address),
    ).revertedWith('Initializable: contract is not initializing');
  });

  it('onlyInitializing unchained', async () => {
    const { accessControl, owner } = await loadFixture(defaultDeploy);

    const blackListable = await new BlacklistableTester__factory(
      owner,
    ).deploy();

    await expect(
      blackListable.initializeUnchainedWithoutInitializer(),
    ).revertedWith('Initializable: contract is not initializing');
  });

  describe('modifier onlyNotBlacklisted', () => {
    it('should fail: call from blacklisted user', async () => {
      const { accessControl, blackListableTester, owner, regularAccounts } =
        await loadFixture(defaultDeploy);

      await blackList(
        { blacklistable: blackListableTester, accessControl, owner },
        regularAccounts[0],
      );
      await expect(
        blackListableTester.onlyNotBlacklistedTester(
          regularAccounts[0].address,
        ),
      ).revertedWith(acErrors.WMAC_HAS_ROLE);
    });

    it('call from not blacklisted user', async () => {
      const { blackListableTester, regularAccounts } = await loadFixture(
        defaultDeploy,
      );
      await expect(
        blackListableTester.onlyNotBlacklistedTester(
          regularAccounts[0].address,
        ),
      ).not.reverted;
    });
  });

  describe('addToBlackList', () => {
    it('should fail: call from user without BLACKLIST_OPERATOR_ROLE role', async () => {
      const { accessControl, blackListableTester, owner, regularAccounts } =
        await loadFixture(defaultDeploy);

      await blackList(
        { blacklistable: blackListableTester, accessControl, owner },
        regularAccounts[0],
        {
          from: regularAccounts[0],
          revertMessage: `AccessControl: account ${regularAccounts[0].address.toLowerCase()} is missing role ${await accessControl.BLACKLIST_OPERATOR_ROLE()}`,
        },
      );
    });

    it('call from user with BLACKLIST_OPERATOR_ROLE role', async () => {
      const { accessControl, blackListableTester, owner, regularAccounts } =
        await loadFixture(defaultDeploy);
      await blackList(
        { blacklistable: blackListableTester, accessControl, owner },
        regularAccounts[0],
      );
    });
  });

  describe('removeFromBlackList', () => {
    it('should fail: call from user without BLACKLIST_OPERATOR_ROLE role', async () => {
      const { accessControl, blackListableTester, owner, regularAccounts } =
        await loadFixture(defaultDeploy);

      await unBlackList(
        { blacklistable: blackListableTester, accessControl, owner },
        regularAccounts[0],
        {
          from: regularAccounts[0],
          revertMessage: `AccessControl: account ${regularAccounts[0].address.toLowerCase()} is missing role ${await accessControl.BLACKLIST_OPERATOR_ROLE()}`,
        },
      );
    });

    it('call from user with BLACKLIST_OPERATOR_ROLE role', async () => {
      const { accessControl, blackListableTester, owner, regularAccounts } =
        await loadFixture(defaultDeploy);
      await unBlackList(
        { blacklistable: blackListableTester, accessControl, owner },
        regularAccounts[0],
      );
    });
  });
});
