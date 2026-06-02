import { loadFixture } from '@nomicfoundation/hardhat-network-helpers';
import { increase } from '@nomicfoundation/hardhat-network-helpers/dist/src/helpers/time';
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
  grantRoleMultTester,
  grantRoleTester,
  revokeRoleMultTester,
  revokeRoleTester,
  setIsUserFacingRoleTester,
  setFunctionAccessGrantOperatorTester,
  setFunctionPermissionTester,
  setupFunctionAccessGrantOperator,
} from '../common/ac.helpers';
import { handleRevert, validateImplementation } from '../common/common.helpers';
import { defaultDeploy } from '../common/fixtures';
import {
  executeTimelockOperationTester,
  scheduleTimelockOperationsTester,
  setRoleTimelocksTester,
} from '../common/timelock-manager.helpers';

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

    it('should fail: when user does not have admin role for roles[0]', async () => {
      const { accessControl, regularAccounts, roles } = await loadFixture(
        defaultDeploy,
      );

      await grantRoleMultTester(
        { accessControl, owner: regularAccounts[0] },
        [roles.common.blacklisted],
        [regularAccounts[1].address],
        { revertCustomError: acErrors.WMAC_HASNT_PERMISSION() },
      );
    });

    it('should fail: when user has admin role but roles[1] admin role is different fron roles[0]', async () => {
      const { accessControl, owner, regularAccounts, roles } =
        await loadFixture(defaultDeploy);

      await grantRoleTester(
        { accessControl, owner },
        roles.common.blacklistedOperator,
        regularAccounts[0].address,
      );

      await grantRoleMultTester(
        { accessControl, owner: regularAccounts[0] },
        [roles.common.blacklisted, roles.common.greenlisted],
        [regularAccounts[1].address, regularAccounts[2].address],
        { revertMessage: 'MAC: role admin mismatch' },
      );
    });

    it('when timelock delay is not 0 - schedule and execute the tx', async () => {
      const {
        accessControl,
        owner,
        regularAccounts,
        roles,
        timelock,
        timelockManager,
      } = await loadFixture(defaultDeploy);

      await setRoleTimelocksTester(
        { timelockManager, timelock, owner, accessControl },
        [roles.common.blacklistedOperator],
        [3600],
      );

      const data = accessControl.interface.encodeFunctionData('grantRoleMult', [
        [roles.common.blacklisted],
        [regularAccounts[0].address],
      ]);

      await scheduleTimelockOperationsTester(
        { timelockManager, timelock, owner, accessControl },
        [accessControl.address],
        [data],
        {},
        { from: owner },
      );

      await increase(3600);

      await executeTimelockOperationTester(
        { timelockManager, timelock, owner, accessControl },
        accessControl.address,
        data,
        owner.address,
        { from: owner },
      );
    });

    it('when address already have role (shouldnt fail)', async () => {
      const { accessControl, owner, regularAccounts, roles } =
        await loadFixture(defaultDeploy);

      await grantRoleMultTester(
        { accessControl, owner },
        [roles.common.blacklisted],
        [regularAccounts[0].address],
      );

      await grantRoleMultTester(
        { accessControl, owner },
        [roles.common.blacklisted],
        [regularAccounts[0].address],
      );
    });

    it('should fail: when user have function access role but do not have role admin role', async () => {
      const { accessControl, owner, regularAccounts, roles } =
        await loadFixture(defaultDeploy);

      const selector = encodeFnSelector('grantRoleMult(bytes32[],address[])');

      await setupFunctionAccessGrantOperator({
        accessControl,
        owner,
        functionAccessAdminRole: roles.common.blacklistedOperator,
        targetContract: accessControl.address,
        functionSelector: selector,
        grantOperator: owner,
      });

      await setFunctionPermissionTester(
        { accessControl, owner },
        roles.common.blacklistedOperator,
        accessControl.address,
        selector,
        [{ account: regularAccounts[0].address, enabled: true }],
      );

      await grantRoleMultTester(
        { accessControl, owner: regularAccounts[0] },
        [roles.common.blacklisted],
        [regularAccounts[1].address],
        { revertCustomError: acErrors.WMAC_HASNT_PERMISSION() },
      );
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

    it('should fail: when user does not have admin role for roles[0]', async () => {
      const { accessControl, regularAccounts, roles } = await loadFixture(
        defaultDeploy,
      );

      await revokeRoleMultTester(
        { accessControl, owner: regularAccounts[0] },
        [roles.common.blacklisted],
        [regularAccounts[1].address],
        { revertCustomError: acErrors.WMAC_HASNT_PERMISSION() },
      );
    });

    it('should fail: when user has admin role but roles[1] admin role is different fron roles[0]', async () => {
      const { accessControl, owner, regularAccounts, roles } =
        await loadFixture(defaultDeploy);

      await grantRoleTester(
        { accessControl, owner },
        roles.common.blacklistedOperator,
        regularAccounts[0].address,
      );

      await revokeRoleMultTester(
        { accessControl, owner: regularAccounts[0] },
        [roles.common.blacklisted, roles.common.greenlisted],
        [regularAccounts[1].address, regularAccounts[2].address],
        { revertMessage: 'MAC: role admin mismatch' },
      );
    });

    it('should fail: when trying to revoke DEFAULT_ADMIN_ROLE from self', async () => {
      const { accessControl, owner, roles } = await loadFixture(defaultDeploy);

      await revokeRoleMultTester(
        { accessControl, owner },
        [roles.common.defaultAdmin],
        [owner.address],
        { revertCustomError: { customErrorName: 'CannotRevokeFromSelf' } },
      );
    });

    it('when revoking role from self but its not DEFAULT_ADMIN_ROLE (should not fail)', async () => {
      const { accessControl, owner, roles } = await loadFixture(defaultDeploy);

      await revokeRoleMultTester(
        { accessControl, owner },
        [roles.common.blacklistedOperator],
        [owner.address],
      );
    });

    it('should fail: when revoking DEFAULT_ADMIN_ROLE from self and timelock delay is not 0', async () => {
      const { accessControl, owner, roles, timelock, timelockManager } =
        await loadFixture(defaultDeploy);

      await setRoleTimelocksTester(
        { timelockManager, timelock, owner, accessControl },
        [roles.common.defaultAdmin],
        [3600],
      );

      const data = accessControl.interface.encodeFunctionData(
        'revokeRoleMult',
        [[roles.common.defaultAdmin], [owner.address]],
      );

      await scheduleTimelockOperationsTester(
        { timelockManager, timelock, owner, accessControl },
        [accessControl.address],
        [data],
        {},
        { from: owner },
      );

      await increase(3600);

      await executeTimelockOperationTester(
        { timelockManager, timelock, owner, accessControl },
        accessControl.address,
        data,
        owner.address,
        {
          from: owner,
          revertMessage: 'TimelockController: underlying transaction reverted',
        },
      );
    });

    it('when timelock delay is not 0 - schedule and execute the tx', async () => {
      const {
        accessControl,
        owner,
        regularAccounts,
        roles,
        timelock,
        timelockManager,
      } = await loadFixture(defaultDeploy);

      await grantRoleMultTester(
        { accessControl, owner },
        [roles.common.blacklisted],
        [regularAccounts[0].address],
      );

      await setRoleTimelocksTester(
        { timelockManager, timelock, owner, accessControl },
        [roles.common.blacklistedOperator],
        [3600],
      );

      const data = accessControl.interface.encodeFunctionData(
        'revokeRoleMult',
        [[roles.common.blacklisted], [regularAccounts[0].address]],
      );

      await scheduleTimelockOperationsTester(
        { timelockManager, timelock, owner, accessControl },
        [accessControl.address],
        [data],
        {},
        { from: owner },
      );

      await increase(3600);

      await executeTimelockOperationTester(
        { timelockManager, timelock, owner, accessControl },
        accessControl.address,
        data,
        owner.address,
        { from: owner },
      );
    });

    it('should fail: when user have function access role but do not have role admin role', async () => {
      const { accessControl, owner, regularAccounts, roles } =
        await loadFixture(defaultDeploy);

      const selector = encodeFnSelector('revokeRoleMult(bytes32[],address[])');

      await setupFunctionAccessGrantOperator({
        accessControl,
        owner,
        functionAccessAdminRole: roles.common.blacklistedOperator,
        targetContract: accessControl.address,
        functionSelector: selector,
        grantOperator: owner,
      });

      await setFunctionPermissionTester(
        { accessControl, owner },
        roles.common.blacklistedOperator,
        accessControl.address,
        selector,
        [{ account: regularAccounts[0].address, enabled: true }],
      );

      await revokeRoleMultTester(
        { accessControl, owner: regularAccounts[0] },
        [roles.common.blacklisted],
        [regularAccounts[1].address],
        { revertCustomError: acErrors.WMAC_HASNT_PERMISSION() },
      );
    });

    it('when address do not have the role (shouldnt fail)', async () => {
      const { accessControl, owner, regularAccounts, roles } =
        await loadFixture(defaultDeploy);

      await revokeRoleMultTester(
        { accessControl, owner },
        [roles.common.blacklisted],
        [regularAccounts[0].address],
      );
    });
  });

  describe('setRoleAdmin()', () => {
    it('should fail: caller does not have `DEFAULT_ADMIN_ROLE`', async () => {
      const { accessControl, regularAccounts, roles } = await loadFixture(
        defaultDeploy,
      );

      await handleRevert(
        accessControl
          .connect(regularAccounts[0])
          .setRoleAdmin.bind(
            this,
            roles.common.blacklisted,
            roles.common.greenlistedOperator,
          ),
        accessControl,
        { revertCustomError: acErrors.WMAC_HASNT_PERMISSION() },
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

    it('when timelock delay is not 0 - schedule and execute the tx', async () => {
      const { accessControl, owner, roles, timelock, timelockManager } =
        await loadFixture(defaultDeploy);

      await setRoleTimelocksTester(
        { timelockManager, timelock, owner, accessControl },
        [roles.common.blacklistedOperator],
        [3600],
      );

      const data = accessControl.interface.encodeFunctionData('setRoleAdmin', [
        roles.common.blacklisted,
        roles.common.greenlistedOperator,
      ]);

      await scheduleTimelockOperationsTester(
        { timelockManager, timelock, owner, accessControl },
        [accessControl.address],
        [data],
        {},
        { from: owner },
      );

      await increase(3600);

      await executeTimelockOperationTester(
        { timelockManager, timelock, owner, accessControl },
        accessControl.address,
        data,
        owner.address,
        { from: owner },
      );
    });

    it('should fail: when user have function access role but do not have role admin role', async () => {
      const { accessControl, owner, regularAccounts, roles } =
        await loadFixture(defaultDeploy);

      const selector = encodeFnSelector('setRoleAdmin(bytes32,bytes32)');

      await setupFunctionAccessGrantOperator({
        accessControl,
        owner,
        functionAccessAdminRole: roles.common.blacklistedOperator,
        targetContract: accessControl.address,
        functionSelector: selector,
        grantOperator: owner,
      });

      await setFunctionPermissionTester(
        { accessControl, owner },
        roles.common.blacklistedOperator,
        accessControl.address,
        selector,
        [{ account: regularAccounts[0].address, enabled: true }],
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
  });

  describe('setIsUserFacingRoleMult()', () => {
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
      const { accessControl, owner, roles } = await loadFixture(defaultDeploy);

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

    it('when already user facing (should not revert)', async () => {
      const { accessControl, owner, roles } = await loadFixture(defaultDeploy);

      await setIsUserFacingRoleTester({ accessControl, owner }, [
        { role: roles.common.blacklisted, enabled: true },
      ]);
    });

    it('when already non-userfacing (should not revert)', async () => {
      const { accessControl, owner, roles } = await loadFixture(defaultDeploy);

      await setIsUserFacingRoleTester({ accessControl, owner }, [
        { role: roles.common.blacklistedOperator, enabled: false },
      ]);
    });

    it('when timelock delay is not 0 - schedule and execute the tx', async () => {
      const { accessControl, owner, roles, timelock, timelockManager } =
        await loadFixture(defaultDeploy);

      await setRoleTimelocksTester(
        { timelockManager, timelock, owner, accessControl },
        [roles.common.defaultAdmin],
        [3600],
      );

      const data = accessControl.interface.encodeFunctionData(
        'setIsUserFacingRoleMult',
        [[{ role: roles.common.blacklistedOperator, enabled: true }]],
      );

      await scheduleTimelockOperationsTester(
        { timelockManager, timelock, owner, accessControl },
        [accessControl.address],
        [data],
        {},
        { from: owner },
      );

      await increase(3600);

      await executeTimelockOperationTester(
        { timelockManager, timelock, owner, accessControl },
        accessControl.address,
        data,
        owner.address,
        { from: owner },
      );
    });

    it('should fail: when user have function access role but do not have role admin role', async () => {
      const { accessControl, owner, regularAccounts, roles } =
        await loadFixture(defaultDeploy);

      const selector = encodeFnSelector(
        'setIsUserFacingRoleMult((bytes32,bool)[])',
      );

      await setupFunctionAccessGrantOperator({
        accessControl,
        owner,
        functionAccessAdminRole: roles.common.defaultAdmin,
        targetContract: accessControl.address,
        functionSelector: selector,
        grantOperator: owner,
      });

      await setFunctionPermissionTester(
        { accessControl, owner },
        roles.common.defaultAdmin,
        accessControl.address,
        selector,
        [{ account: regularAccounts[0].address, enabled: true }],
      );

      await setIsUserFacingRoleTester(
        { accessControl, owner: regularAccounts[0] },
        [{ role: roles.common.blacklistedOperator, enabled: true }],
        { revertCustomError: acErrors.WMAC_HASNT_PERMISSION() },
      );
    });

    it('should fail: when params lenght is 0', async () => {
      const { accessControl, owner } = await loadFixture(defaultDeploy);

      await setIsUserFacingRoleTester({ accessControl, owner }, [], {
        revertCustomError: { customErrorName: 'EmptyArray' },
      });
    });
  });

  describe('setFunctionAccessGrantOperatorMult()', () => {
    it('should fail: reverts when role is user facing role', async () => {
      const { accessControl, owner, roles } = await loadFixture(defaultDeploy);

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
      const { accessControl, owner, roles } = await loadFixture(defaultDeploy);

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

    it('when address is already grant operator (should not revert)', async () => {
      const { accessControl, owner, roles } = await loadFixture(defaultDeploy);

      const params = [
        {
          targetContract: accessControl.address,
          functionSelector: encodeFnSelector('setGreenlistEnable(bool)'),
          operator: owner.address,
          enabled: true,
        },
      ];

      await setFunctionAccessGrantOperatorTester(
        { accessControl, owner },
        roles.common.greenlistedOperator,
        params,
      );

      await setFunctionAccessGrantOperatorTester(
        { accessControl, owner },
        roles.common.greenlistedOperator,
        params,
      );
    });

    it('when timelock delay is not 0 - schedule and execute the tx', async () => {
      const { accessControl, owner, roles, timelock, timelockManager } =
        await loadFixture(defaultDeploy);

      await setRoleTimelocksTester(
        { timelockManager, timelock, owner, accessControl },
        [roles.common.greenlistedOperator],
        [3600],
      );

      const data = accessControl.interface.encodeFunctionData(
        'setFunctionAccessGrantOperatorMult',
        [
          roles.common.greenlistedOperator,
          [
            {
              targetContract: accessControl.address,
              functionSelector: encodeFnSelector('setGreenlistEnable(bool)'),
              operator: owner.address,
              enabled: true,
            },
          ],
        ],
      );

      await scheduleTimelockOperationsTester(
        { timelockManager, timelock, owner, accessControl },
        [accessControl.address],
        [data],
        {},
        { from: owner },
      );

      await increase(3600);

      await executeTimelockOperationTester(
        { timelockManager, timelock, owner, accessControl },
        accessControl.address,
        data,
        owner.address,
        { from: owner },
      );
    });

    it('should fail: when user have function access role but do not have functionAccessAdminRole', async () => {
      const { accessControl, owner, regularAccounts, roles } =
        await loadFixture(defaultDeploy);

      const selector = encodeFnSelector(
        'setFunctionAccessGrantOperatorMult(bytes32,(address,bytes4,address,bool)[])',
      );

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
        [{ account: regularAccounts[0].address, enabled: true }],
      );

      await setFunctionAccessGrantOperatorTester(
        { accessControl, owner: regularAccounts[0] },
        roles.common.greenlistedOperator,
        [
          {
            targetContract: accessControl.address,
            functionSelector: encodeFnSelector('setGreenlistEnable(bool)'),
            operator: regularAccounts[1].address,
            enabled: true,
          },
        ],
        { revertCustomError: acErrors.WMAC_HASNT_PERMISSION() },
      );
    });

    it('should fail: when params lenght is 0', async () => {
      const { accessControl, owner, roles } = await loadFixture(defaultDeploy);

      await setFunctionAccessGrantOperatorTester(
        { accessControl, owner },
        roles.common.greenlistedOperator,
        [],
        { revertCustomError: { customErrorName: 'EmptyArray' } },
      );
    });
  });

  describe('setFunctionPermissionMult()', () => {
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

    it('when address is already has permission (shouldnt fail)', async () => {
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
        [{ account: regularAccounts[0].address, enabled: true }],
      );

      await setFunctionPermissionTester(
        { accessControl, owner },
        roles.common.greenlistedOperator,
        accessControl.address,
        selector,
        [{ account: regularAccounts[0].address, enabled: true }],
      );
    });

    it('should fail: when params lenght is 0', async () => {
      const { accessControl, owner, roles } = await loadFixture(defaultDeploy);

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
        [],
        { revertCustomError: { customErrorName: 'EmptyArray' } },
      );
    });

    it('when timelock delay is not 0 - schedule and execute the tx', async () => {
      const {
        accessControl,
        owner,
        regularAccounts,
        roles,
        timelock,
        timelockManager,
      } = await loadFixture(defaultDeploy);

      const selector = encodeFnSelector('setGreenlistEnable(bool)');
      const operatorRole = await accessControl.functionAccessGrantOperatorKey(
        roles.common.greenlistedOperator,
        accessControl.address,
        selector,
      );

      await setFunctionAccessGrantOperatorTester(
        { accessControl, owner },
        roles.common.greenlistedOperator,
        [
          {
            targetContract: accessControl.address,
            functionSelector: selector,
            operator: owner.address,
            enabled: true,
          },
        ],
      );

      await setRoleTimelocksTester(
        { timelockManager, timelock, owner, accessControl },
        [operatorRole],
        [3600],
      );

      const data = accessControl.interface.encodeFunctionData(
        'setFunctionPermissionMult',
        [
          roles.common.greenlistedOperator,
          accessControl.address,
          selector,
          [{ account: regularAccounts[0].address, enabled: true }],
        ],
      );

      await scheduleTimelockOperationsTester(
        { timelockManager, timelock, owner, accessControl },
        [accessControl.address],
        [data],
        {},
        { from: owner },
      );

      await increase(3600);

      await executeTimelockOperationTester(
        { timelockManager, timelock, owner, accessControl },
        accessControl.address,
        data,
        owner.address,
        { from: owner },
      );
    });

    it('should fail: when user do not have grant operator role', async () => {
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
        { accessControl, owner: regularAccounts[0] },
        roles.common.greenlistedOperator,
        accessControl.address,
        selector,
        [{ account: regularAccounts[1].address, enabled: true }],
        { revertCustomError: acErrors.WMAC_HASNT_PERMISSION() },
      );
    });
  });

  describe('grantRole()', () => {
    it('should fail: when sender does not have role admin role', async () => {
      const { accessControl, regularAccounts, roles } = await loadFixture(
        defaultDeploy,
      );

      await grantRoleTester(
        { accessControl, owner: regularAccounts[0] },
        roles.common.blacklisted,
        regularAccounts[1].address,
        { revertCustomError: acErrors.WMAC_HASNT_PERMISSION() },
      );
    });

    it('when timelock delay is not 0 - schedule and execute the tx', async () => {
      const {
        accessControl,
        owner,
        regularAccounts,
        roles,
        timelock,
        timelockManager,
      } = await loadFixture(defaultDeploy);

      await setRoleTimelocksTester(
        { timelockManager, timelock, owner, accessControl },
        [roles.common.blacklistedOperator],
        [3600],
      );

      const data = accessControl.interface.encodeFunctionData('grantRole', [
        roles.common.blacklisted,
        regularAccounts[0].address,
      ]);

      await scheduleTimelockOperationsTester(
        { timelockManager, timelock, owner, accessControl },
        [accessControl.address],
        [data],
        {},
        { from: owner },
      );

      await increase(3600);

      await executeTimelockOperationTester(
        { timelockManager, timelock, owner, accessControl },
        accessControl.address,
        data,
        owner.address,
        { from: owner },
      );
    });

    it('when role already granted - should not fail', async () => {
      const { accessControl, owner, regularAccounts, roles } =
        await loadFixture(defaultDeploy);

      await grantRoleTester(
        { accessControl, owner },
        roles.common.blacklisted,
        regularAccounts[0].address,
      );

      await grantRoleTester(
        { accessControl, owner },
        roles.common.blacklisted,
        regularAccounts[0].address,
      );
    });
  });

  describe('revokeRole()', () => {
    it('should fail: when sender does not have role admin role', async () => {
      const { accessControl, regularAccounts, roles } = await loadFixture(
        defaultDeploy,
      );

      await revokeRoleTester(
        { accessControl, owner: regularAccounts[0] },
        roles.common.blacklisted,
        regularAccounts[1].address,
        { revertCustomError: acErrors.WMAC_HASNT_PERMISSION() },
      );
    });

    it('when timelock delay is not 0 - schedule and execute the tx', async () => {
      const {
        accessControl,
        owner,
        regularAccounts,
        roles,
        timelock,
        timelockManager,
      } = await loadFixture(defaultDeploy);

      await grantRoleTester(
        { accessControl, owner },
        roles.common.blacklisted,
        regularAccounts[0].address,
      );

      await setRoleTimelocksTester(
        { timelockManager, timelock, owner, accessControl },
        [roles.common.blacklistedOperator],
        [3600],
      );

      const data = accessControl.interface.encodeFunctionData('revokeRole', [
        roles.common.blacklisted,
        regularAccounts[0].address,
      ]);

      await scheduleTimelockOperationsTester(
        { timelockManager, timelock, owner, accessControl },
        [accessControl.address],
        [data],
        {},
        { from: owner },
      );

      await increase(3600);

      await executeTimelockOperationTester(
        { timelockManager, timelock, owner, accessControl },
        accessControl.address,
        data,
        owner.address,
        { from: owner },
      );
    });

    it('when role already revoked - should not fail', async () => {
      const { accessControl, owner, regularAccounts, roles } =
        await loadFixture(defaultDeploy);

      await revokeRoleTester(
        { accessControl, owner },
        roles.common.blacklisted,
        regularAccounts[0].address,
      );
    });

    it('should fail: when revoking DEFAULT_ADMIN_ROLE from self', async () => {
      const { accessControl, owner, roles } = await loadFixture(defaultDeploy);

      await revokeRoleTester(
        { accessControl, owner },
        roles.common.defaultAdmin,
        owner.address,
        { revertCustomError: { customErrorName: 'CannotRevokeFromSelf' } },
      );
    });

    it('when revoking role from self but its not DEFAULT_ADMIN_ROLE (should not fail)', async () => {
      const { accessControl, owner, roles } = await loadFixture(defaultDeploy);

      await revokeRoleTester(
        { accessControl, owner },
        roles.common.blacklistedOperator,
        owner.address,
      );
    });

    it('should fail: when revoking DEFAULT_ADMIN_ROLE from self and timelock delay is not 0', async () => {
      const { accessControl, owner, roles, timelock, timelockManager } =
        await loadFixture(defaultDeploy);

      await setRoleTimelocksTester(
        { timelockManager, timelock, owner, accessControl },
        [roles.common.defaultAdmin],
        [3600],
      );

      const data = accessControl.interface.encodeFunctionData('revokeRole', [
        roles.common.defaultAdmin,
        owner.address,
      ]);

      await scheduleTimelockOperationsTester(
        { timelockManager, timelock, owner, accessControl },
        [accessControl.address],
        [data],
        {},
        { from: owner },
      );

      await increase(3600);

      await executeTimelockOperationTester(
        { timelockManager, timelock, owner, accessControl },
        accessControl.address,
        data,
        owner.address,
        {
          from: owner,
          revertMessage: 'TimelockController: underlying transaction reverted',
        },
      );
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
      const { wAccessControlTester, roles } = await loadFixture(defaultDeploy);
      await expect(
        wAccessControlTester.withOnlyRole(roles.common.defaultAdmin, false),
      ).not.reverted;
    });
  });
});
