import { loadFixture } from '@nomicfoundation/hardhat-network-helpers';
import { expect } from 'chai';
import { constants } from 'ethers';
import { ethers } from 'hardhat';

import { WithMidasAccessControlTester__factory } from '../../typechain-types';
import { defaultDeploy } from '../common/fixtures';

describe('MidasAccessControl', function () {
  it('deployment', async () => {
    const { accessControl, roles, owner } = await loadFixture(defaultDeploy);

    const initGrantedRoles = [
      roles.common.blacklistedOperator,
      roles.common.greenlistedOperator,
      roles.common.defaultAdmin,
      roles.tokenRoles.mTBILL.burner,
      roles.tokenRoles.mTBILL.minter,
      roles.tokenRoles.mTBILL.pauser,
      roles.tokenRoles.mTBILL.redemptionVaultAdmin,
      roles.tokenRoles.mTBILL.depositVaultAdmin,
    ];

    for (const role of initGrantedRoles) {
      expect(await accessControl.hasRole(role, owner.address)).to.eq(true);
    }

    expect(await accessControl.getRoleAdmin(roles.common.blacklisted)).eq(
      roles.common.blacklistedOperator,
    );

    expect(await accessControl.getRoleAdmin(roles.common.greenlisted)).eq(
      roles.common.greenlistedOperator,
    );
  });

  it('initialize', async () => {
    const { accessControl } = await loadFixture(defaultDeploy);

    await expect(accessControl.initialize()).revertedWith(
      'Initializable: contract is already initialized',
    );
  });

  describe('grantRoleMult()', () => {
    it('should fail: function is forbidden', async () => {
      const { accessControl } = await loadFixture(defaultDeploy);

      await expect(
        accessControl.renounceRole(constants.HashZero, constants.AddressZero),
      ).revertedWith('MAC: Forbidden');
    });
  });

  describe('grantRoleMult()', () => {
    it('should fail: arrays length mismatch', async () => {
      const { accessControl } = await loadFixture(defaultDeploy);

      await expect(
        accessControl.grantRoleMult([], [ethers.constants.AddressZero]),
      ).revertedWith('MAC: mismatch arrays');
    });

    it('should fail: arrays length mismatch', async () => {
      const { accessControl, regularAccounts } =
        await loadFixture(defaultDeploy);

      const arr = [
        {
          role: await accessControl.BLACKLIST_OPERATOR_ROLE(),
          user: regularAccounts[0].address,
        },
        {
          role: await accessControl.GREENLIST_OPERATOR_ROLE(),
          user: regularAccounts[0].address,
        },
      ];

      await expect(
        accessControl.grantRoleMult(
          arr.map((v) => v.role),
          arr.map((v) => v.user),
        ),
      ).not.reverted;

      for (const setRoles of arr) {
        expect(await accessControl.hasRole(setRoles.role, setRoles.user)).eq(
          true,
        );
      }
    });
  });

  describe('revokeRoleMult()', () => {
    it('should fail: arrays length mismatch', async () => {
      const { accessControl } = await loadFixture(defaultDeploy);

      await expect(
        accessControl.revokeRoleMult([], [ethers.constants.AddressZero]),
      ).revertedWith('MAC: mismatch arrays');
    });

    it('should fail: arrays length mismatch', async () => {
      const { accessControl, regularAccounts } =
        await loadFixture(defaultDeploy);

      const arr = [
        {
          role: await accessControl.BLACKLIST_OPERATOR_ROLE(),
          user: regularAccounts[0].address,
        },
        {
          role: await accessControl.GREENLIST_OPERATOR_ROLE(),
          user: regularAccounts[0].address,
        },
      ];

      await expect(
        accessControl.grantRoleMult(
          arr.map((v) => v.role),
          arr.map((v) => v.user),
        ),
      ).not.reverted;
      await expect(
        accessControl.revokeRoleMult(
          arr.map((v) => v.role),
          arr.map((v) => v.user),
        ),
      ).not.reverted;

      for (const setRoles of arr) {
        expect(await accessControl.hasRole(setRoles.role, setRoles.user)).eq(
          false,
        );
      }
    });
  });
});

describe('WithMidasAccessControl', function () {
  it('deployment', async () => {
    const { accessControl, wAccessControlTester } =
      await loadFixture(defaultDeploy);
    expect(await wAccessControlTester.accessControl()).eq(
      accessControl.address,
    );
  });

  it('onlyInitializing', async () => {
    const { accessControl, owner } = await loadFixture(defaultDeploy);

    const wac = await new WithMidasAccessControlTester__factory(owner).deploy();

    await expect(
      wac.initializeWithoutInitializer(accessControl.address),
    ).revertedWith('Initializable: contract is not initializing');
  });

  describe('modifier onlyRole', () => {
    it('should fail when call from non DEFAULT_ADMIN_ROLE address', async () => {
      const { wAccessControlTester, regularAccounts, roles } =
        await loadFixture(defaultDeploy);
      await expect(
        wAccessControlTester
          .connect(regularAccounts[1])
          .withOnlyRole(roles.common.blacklisted, regularAccounts[0].address),
      ).revertedWith('WMAC: hasnt role');
    });

    it('call from DEFAULT_ADMIN_ROLE address', async () => {
      const { wAccessControlTester, owner, roles } =
        await loadFixture(defaultDeploy);
      await expect(
        wAccessControlTester.withOnlyRole(
          roles.common.blacklistedOperator,
          owner.address,
        ),
      ).not.reverted;
    });
  });

  describe('modifier onlyNotRole', () => {
    it('should fail when call from DEFAULT_ADMIN_ROLE address', async () => {
      const { wAccessControlTester, owner, roles } =
        await loadFixture(defaultDeploy);
      await expect(
        wAccessControlTester.withOnlyNotRole(
          roles.common.blacklistedOperator,
          owner.address,
        ),
      ).revertedWith('WMAC: has role');
    });

    it('call from non DEFAULT_ADMIN_ROLE address', async () => {
      const { wAccessControlTester, regularAccounts, roles } =
        await loadFixture(defaultDeploy);
      await expect(
        wAccessControlTester.withOnlyNotRole(
          roles.common.blacklisted,
          regularAccounts[1].address,
        ),
      ).not.reverted;
    });
  });

  describe('grantRole()', () => {
    it('should fail when call from non role admin', async () => {
      const { wAccessControlTester, accessControl, regularAccounts, roles } =
        await loadFixture(defaultDeploy);
      expect(
        await accessControl.hasRole(
          roles.common.blacklistedOperator,
          wAccessControlTester.address,
        ),
      ).eq(false);
      await expect(
        wAccessControlTester.grantRoleTester(
          roles.common.blacklisted,
          regularAccounts[1].address,
        ),
      ).reverted;
    });

    it('call from role admin', async () => {
      const { accessControl, wAccessControlTester, regularAccounts, roles } =
        await loadFixture(defaultDeploy);
      await accessControl.grantRole(
        roles.common.blacklistedOperator,
        wAccessControlTester.address,
      );
      await expect(
        wAccessControlTester.grantRoleTester(
          roles.common.blacklisted,
          regularAccounts[1].address,
        ),
      ).not.reverted;
    });
  });

  describe('revokeRole()', () => {
    it('should fail when call from non role admin', async () => {
      const { wAccessControlTester, accessControl, regularAccounts, roles } =
        await loadFixture(defaultDeploy);
      expect(
        await accessControl.hasRole(
          roles.common.blacklistedOperator,
          wAccessControlTester.address,
        ),
      ).eq(false);
      await expect(
        wAccessControlTester.revokeRoleTester(
          roles.common.blacklisted,
          regularAccounts[1].address,
        ),
      ).reverted;
    });

    it('call from role admin', async () => {
      const { accessControl, wAccessControlTester, regularAccounts, roles } =
        await loadFixture(defaultDeploy);
      await accessControl.grantRole(
        roles.common.blacklistedOperator,
        wAccessControlTester.address,
      );
      await wAccessControlTester.grantRoleTester(
        roles.common.blacklisted,
        regularAccounts[1].address,
      );

      await expect(
        wAccessControlTester.revokeRoleTester(
          roles.common.blacklisted,
          regularAccounts[1].address,
        ),
      ).not.reverted;

      expect(
        await accessControl.hasRole(
          roles.common.blacklisted,
          regularAccounts[1].address,
        ),
      ).eq(false);
    });
  });
});
