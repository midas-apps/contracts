import { loadFixture } from '@nomicfoundation/hardhat-network-helpers';
import { expect } from 'chai';
import { constants } from 'ethers';
import { ethers } from 'hardhat';

import { encodeFnSelector } from '../../helpers/utils';
import { WithMidasAccessControlTester__factory } from '../../typechain-types';
import {
  setFunctionAccessAdminRoleEnabledTester,
  setFunctionAccessGrantOperatorTester,
  setFunctionPermissionTester,
  setupFunctionAccessGrantOperator,
} from '../common/ac.helpers';
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

  describe('renounceRole()', () => {
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
      const { accessControl, regularAccounts } = await loadFixture(
        defaultDeploy,
      );

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
      const { accessControl, regularAccounts } = await loadFixture(
        defaultDeploy,
      );

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

  describe('setRoleAdmin()', () => {
    it('should fail: caller does not have `DEFAULT_ADMIN_ROLE`', async () => {
      const { accessControl, regularAccounts, roles } = await loadFixture(
        defaultDeploy,
      );

      await expect(
        accessControl
          .connect(regularAccounts[0])
          .setRoleAdmin(
            roles.common.blacklisted,
            roles.common.greenlistedOperator,
          ),
      ).revertedWith(
        `AccessControl: account ${regularAccounts[0].address.toLowerCase()} is missing role ${await accessControl.DEFAULT_ADMIN_ROLE()}`,
      );
    });

    it('should fail: caller has admin role for another role', async () => {
      const { accessControl, regularAccounts, roles } = await loadFixture(
        defaultDeploy,
      );

      await accessControl.grantRole(
        roles.common.greenlistedOperator,
        regularAccounts[0].address,
      );

      await expect(
        accessControl
          .connect(regularAccounts[0])
          .setRoleAdmin(
            roles.common.blacklisted,
            roles.common.greenlistedOperator,
          ),
      ).reverted;
    });

    it('should fail: caller has current role admin but not the DEFAULT_ADMIN_ROLE', async () => {
      const { accessControl, roles, regularAccounts } = await loadFixture(
        defaultDeploy,
      );

      await expect(
        accessControl
          .connect(regularAccounts[0])
          .setRoleAdmin(
            roles.common.blacklisted,
            roles.common.greenlistedOperator,
          ),
      ).revertedWith(
        `AccessControl: account ${regularAccounts[0].address.toLowerCase()} is missing role ${await accessControl.DEFAULT_ADMIN_ROLE()}`,
      );
    });

    it('caller has DEFAULT_ADMIN_ROLE but not current role admin', async () => {
      const { accessControl, owner, roles } = await loadFixture(defaultDeploy);

      await accessControl.revokeRole(
        roles.common.blacklistedOperator,
        owner.address,
      );

      await expect(
        accessControl.setRoleAdmin(
          roles.common.blacklisted,
          roles.common.greenlistedOperator,
        ),
      ).not.reverted;

      expect(await accessControl.getRoleAdmin(roles.common.blacklisted)).eq(
        roles.common.greenlistedOperator,
      );
    });

    it('should use new role admin for role management', async () => {
      const { accessControl, owner, regularAccounts, roles } =
        await loadFixture(defaultDeploy);

      const NEW_ADMIN_ROLE = ethers.utils.id('NEW_ADMIN_ROLE');
      const TEST_ROLE = ethers.utils.id('TEST_ROLE');

      await accessControl.setRoleAdmin(
        NEW_ADMIN_ROLE,
        roles.common.blacklistedOperator,
      );

      await accessControl.grantRole(
        roles.common.blacklistedOperator,
        regularAccounts[0].address,
      );
      await accessControl.grantRole(NEW_ADMIN_ROLE, regularAccounts[1].address);

      await accessControl.setRoleAdmin(TEST_ROLE, NEW_ADMIN_ROLE);

      await expect(
        accessControl
          .connect(regularAccounts[0])
          .grantRole(TEST_ROLE, regularAccounts[2].address),
      ).revertedWith(
        `AccessControl: account ${regularAccounts[0].address.toLowerCase()} is missing role ${NEW_ADMIN_ROLE}`,
      );

      await expect(
        accessControl
          .connect(regularAccounts[1])
          .grantRole(TEST_ROLE, regularAccounts[2].address),
      ).not.reverted;

      expect(
        await accessControl.hasRole(TEST_ROLE, regularAccounts[2].address),
      ).eq(true);
    });
  });

  describe('Function acces control', () => {
    describe('setFunctionAccessAdminRoleEnabled()', () => {
      it('should fail: non-DEFAULT_ADMIN reverts', async () => {
        const { accessControl, regularAccounts, roles } = await loadFixture(
          defaultDeploy,
        );

        await setFunctionAccessAdminRoleEnabledTester(
          {
            accessControl,
            owner: regularAccounts[0],
          },
          [
            {
              functionAccessAdminRole: roles.common.greenlistedOperator,
              enabled: true,
            },
          ],
          {
            revertMessage: `AccessControl: account ${regularAccounts[0].address.toLowerCase()} is missing role ${await accessControl.DEFAULT_ADMIN_ROLE()}`,
          },
        );
      });

      it('call from DEFAULT_ADMIN_ROLE', async () => {
        const { accessControl, owner, roles } = await loadFixture(
          defaultDeploy,
        );

        await setFunctionAccessAdminRoleEnabledTester(
          {
            accessControl,
            owner,
          },
          [
            {
              functionAccessAdminRole: roles.common.greenlistedOperator,
              enabled: true,
            },
          ],
        );
      });
    });

    describe('setFunctionAccessGrantOperator()', () => {
      it('should fail: reverts when FA admin role is disabled', async () => {
        const { accessControl, owner, roles } = await loadFixture(
          defaultDeploy,
        );

        await setFunctionAccessGrantOperatorTester(
          {
            accessControl,
            owner,
          },
          [
            {
              functionAccessAdminRole: roles.common.greenlistedOperator,
              targetContract: accessControl.address,
              functionSelector: encodeFnSelector('setGreenlistEnable(bool)'),
              operator: owner.address,
              enabled: true,
            },
          ],
          { revertMessage: 'MAC: FA admin role disabled' },
        );
      });

      it('when FA admin role is enabled', async () => {
        const { accessControl, owner, roles } = await loadFixture(
          defaultDeploy,
        );

        await setFunctionAccessAdminRoleEnabledTester(
          {
            accessControl,
            owner,
          },
          [
            {
              functionAccessAdminRole: roles.common.greenlistedOperator,
              enabled: true,
            },
          ],
        );

        await setFunctionAccessGrantOperatorTester(
          {
            accessControl,
            owner,
          },
          [
            {
              functionAccessAdminRole: roles.common.greenlistedOperator,
              targetContract: accessControl.address,
              functionSelector: encodeFnSelector('setGreenlistEnable(bool)'),
              operator: owner.address,
              enabled: true,
            },
          ],
        );
      });
    });

    describe('setFunctionPermission()', () => {
      it('when caller is function operator', async () => {
        const { accessControl, owner, regularAccounts, roles } =
          await loadFixture(defaultDeploy);

        const selector = encodeFnSelector('setGreenlistEnable(bool)');

        await setupFunctionAccessGrantOperator({
          accessControl,
          owner,
          functionAccessAdminRole: roles.common.greenlistedOperator,
          targetContract: accessControl.address,
          functionSelector: selector,
          grantOperator: owner,
        });

        await setFunctionPermissionTester({ accessControl, owner }, [
          {
            functionAccessAdminRole: roles.common.greenlistedOperator,
            targetContract: accessControl.address,
            functionSelector: selector,
            account: regularAccounts[0].address,
            enabled: true,
          },
        ]);
      });

      it('should fail: caller is not a grant operator', async () => {
        const { accessControl, owner, regularAccounts, roles } =
          await loadFixture(defaultDeploy);

        const selector = encodeFnSelector('setGreenlistEnable(bool)');

        await setupFunctionAccessGrantOperator({
          accessControl,
          owner,
          functionAccessAdminRole: roles.common.greenlistedOperator,
          targetContract: accessControl.address,
          functionSelector: selector,
          grantOperator: owner,
        });

        await setFunctionPermissionTester(
          { accessControl, owner: regularAccounts[1] },
          [
            {
              functionAccessAdminRole: roles.common.greenlistedOperator,
              targetContract: accessControl.address,
              functionSelector: selector,
              account: regularAccounts[2].address,
              enabled: true,
            },
          ],
          { revertMessage: 'MAC: not FA grant operator' },
        );
      });

      it('should fail: caller is an operator for a different function', async () => {
        const { accessControl, owner, regularAccounts, roles } =
          await loadFixture(defaultDeploy);

        await setupFunctionAccessGrantOperator({
          accessControl,
          owner,
          functionAccessAdminRole: roles.common.greenlistedOperator,
          targetContract: accessControl.address,
          functionSelector: encodeFnSelector('setGreenlistEnable1(bool)'),
          grantOperator: owner,
        });

        const selector = encodeFnSelector('setGreenlistEnable(bool)');

        await setFunctionPermissionTester(
          { accessControl, owner },
          [
            {
              functionAccessAdminRole: roles.common.greenlistedOperator,
              targetContract: accessControl.address,
              functionSelector: selector,
              account: regularAccounts[2].address,
              enabled: true,
            },
          ],
          { revertMessage: 'MAC: not FA grant operator' },
        );
      });
    });
  });
});

describe('WithMidasAccessControl', function () {
  it('deployment', async () => {
    const { accessControl, wAccessControlTester } = await loadFixture(
      defaultDeploy,
    );
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
      const { wAccessControlTester, owner, roles } = await loadFixture(
        defaultDeploy,
      );
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
      const { wAccessControlTester, owner, roles } = await loadFixture(
        defaultDeploy,
      );
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
