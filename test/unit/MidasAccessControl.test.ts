import { loadFixture } from '@nomicfoundation/hardhat-network-helpers';
import { expect } from 'chai';
import { constants } from 'ethers';
import { ethers } from 'hardhat';

import { encodeFnSelector } from '../../helpers/utils';
import {
  MidasAccessControl__factory,
  WithMidasAccessControlTester__factory,
} from '../../typechain-types';
import {
  acErrors,
  setIsUserFacingRoleTester,
  setFunctionAccessGrantOperatorTester,
  setFunctionPermissionTester,
  setupFunctionAccessGrantOperator,
} from '../common/ac.helpers';
import { validateImplementation } from '../common/common.helpers';
import { defaultDeploy } from '../common/fixtures';

describe('MidasAccessControl', function () {
  it('deployment', async () => {
    const { accessControl, roles, owner } = await loadFixture(defaultDeploy);

    const initGrantedRoles = [
      roles.common.blacklistedOperator,
      roles.common.greenlistedOperator,
      roles.common.defaultAdmin,
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

    expect(await accessControl.isUserFacingRole(roles.common.blacklisted)).eq(
      true,
    );

    expect(await accessControl.isUserFacingRole(roles.common.greenlisted)).eq(
      true,
    );

    await validateImplementation(MidasAccessControl__factory);
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
      ).revertedWithCustomError(accessControl, 'Forbidden');
    });
  });

  describe('grantRoleMult()', () => {
    it('should fail: arrays length mismatch', async () => {
      const { accessControl } = await loadFixture(defaultDeploy);

      await expect(
        accessControl.grantRoleMult([], [ethers.constants.AddressZero]),
      ).revertedWithCustomError(accessControl, 'MismatchArrays');
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
      ).revertedWithCustomError(accessControl, 'MismatchArrays');
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
      ).revertedWithCustomError(
        accessControl,
        acErrors.WMAC_HASNT_PERMISSION().customErrorName,
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

    it('caller has current role admin but not the DEFAULT_ADMIN_ROLE', async () => {
      const { accessControl, roles, regularAccounts } = await loadFixture(
        defaultDeploy,
      );

      await accessControl.grantRole(
        roles.common.blacklistedOperator,
        regularAccounts[0].address,
      );

      await expect(
        accessControl
          .connect(regularAccounts[0])
          .setRoleAdmin(
            roles.common.blacklisted,
            roles.common.greenlistedOperator,
          ),
      ).not.reverted;
    });

    it('should fail: caller has DEFAULT_ADMIN_ROLE but not current role admin', async () => {
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
      ).revertedWithCustomError(
        accessControl,
        acErrors.WMAC_HASNT_PERMISSION().customErrorName,
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
      ).revertedWithCustomError(
        accessControl,
        acErrors.WMAC_HASNT_PERMISSION().customErrorName,
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
    describe('setIsUserFacingRole()', () => {
      it('should fail: non-DEFAULT_ADMIN reverts', async () => {
        const { accessControl, regularAccounts, roles } = await loadFixture(
          defaultDeploy,
        );

        await setIsUserFacingRoleTester(
          {
            accessControl,
            owner: regularAccounts[0],
          },
          [
            {
              role: roles.common.greenlistedOperator,
              enabled: true,
            },
          ],
          {
            revertCustomError: acErrors.WMAC_HASNT_PERMISSION(),
          },
        );
      });

      it('call from DEFAULT_ADMIN_ROLE', async () => {
        const { accessControl, owner, roles } = await loadFixture(
          defaultDeploy,
        );

        await setIsUserFacingRoleTester(
          {
            accessControl,
            owner,
          },
          [
            {
              role: roles.common.greenlistedOperator,
              enabled: true,
            },
          ],
        );
      });
    });

    describe('setFunctionAccessGrantOperator()', () => {
      it('should fail: reverts when role is user facing role', async () => {
        const { accessControl, owner, roles } = await loadFixture(
          defaultDeploy,
        );

        await setFunctionAccessGrantOperatorTester(
          {
            accessControl,
            owner,
          },
          roles.common.greenlisted,
          [
            {
              targetContract: accessControl.address,
              functionSelector: encodeFnSelector('setGreenlistEnable(bool)'),
              operator: owner.address,
              enabled: true,
            },
          ],
          {
            revertCustomError: {
              customErrorName: 'UserFacingRoleNotAllowed',
            },
          },
        );
      });

      it('when role is not user facing role', async () => {
        const { accessControl, owner, roles } = await loadFixture(
          defaultDeploy,
        );

        await setFunctionAccessGrantOperatorTester(
          {
            accessControl,
            owner,
          },
          roles.common.greenlistedOperator,
          [
            {
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

        await setFunctionPermissionTester(
          { accessControl, owner },
          roles.common.greenlistedOperator,
          accessControl.address,
          selector,
          [
            {
              account: regularAccounts[0].address,
              enabled: true,
            },
          ],
        );
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
          roles.common.greenlistedOperator,
          accessControl.address,
          selector,
          [
            {
              account: regularAccounts[2].address,
              enabled: true,
            },
          ],
          { revertCustomError: acErrors.WMAC_HASNT_PERMISSION() },
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
          roles.common.greenlistedOperator,
          accessControl.address,
          selector,
          [
            {
              account: regularAccounts[2].address,
              enabled: true,
            },
          ],
          { revertCustomError: acErrors.WMAC_HASNT_PERMISSION() },
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
          .withOnlyRole(roles.common.defaultAdmin, false),
      ).revertedWithCustomError(
        wAccessControlTester,
        acErrors.WMAC_HASNT_PERMISSION().customErrorName,
      );
    });

    it('call from DEFAULT_ADMIN_ROLE address', async () => {
      const { wAccessControlTester, owner, roles } = await loadFixture(
        defaultDeploy,
      );
      await expect(
        wAccessControlTester.withOnlyRole(roles.common.defaultAdmin, false),
      ).not.reverted;
    });
  });
});
