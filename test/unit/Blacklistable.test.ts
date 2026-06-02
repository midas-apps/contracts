import { loadFixture } from '@nomicfoundation/hardhat-network-helpers';
import { expect } from 'chai';

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
      ).revertedWithCustomError(
        blackListableTester,
        acErrors.WMAC_BLACKLISTED().customErrorName,
      );
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
