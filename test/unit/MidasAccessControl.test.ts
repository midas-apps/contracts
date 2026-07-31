import { loadFixture } from '@nomicfoundation/hardhat-network-helpers';
import { increase } from '@nomicfoundation/hardhat-network-helpers/dist/src/helpers/time';
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { expect } from 'chai';
import { constants } from 'ethers';
import { ethers } from 'hardhat';

import { encodeFnSelector } from '../../helpers/utils';
import {
  MidasAccessControl,
  MidasAccessControl__factory,
  MidasAccessControlTimelockController,
  MidasTimelockManager,
  WithMidasAccessControlTester,
  WithMidasAccessControlTester__factory,
} from '../../typechain-types';
import {
  acErrors,
  grantRoleMultTester,
  grantRoleTester,
  revokeRoleMultTester,
  revokeRoleTester,
  setIsUserFacingRoleTester,
  setGrantOperatorRoleTester,
  setPermissionRoleMultTester,
  setPermissionRoleTester,
  setupGrantOperatorRole,
  setDefaultDelayTest,
  setRoleTimelocksAndExecute,
  setRoleTimelocksTester,
  NO_DELAY,
} from '../common/ac.helpers';
import {
  handleRevert,
  validateImplementation,
  asyncForEach,
} from '../common/common.helpers';
import { deployProxyContract } from '../common/deploy.helpers';
import { defaultDeploy } from '../common/fixtures';
import {
  executeTimelockOperationTester,
  bulkScheduleTimelockOperationTester,
} from '../common/timelock-manager.helpers';

const withOnlyRoleSelector = encodeFnSelector('withOnlyRole(bytes32,bool)');
const withOnlyContractAdminSelector = encodeFnSelector(
  'withOnlyContractAdmin()',
);
const withOnlyRoleNoTimelockSelector = encodeFnSelector(
  'withOnlyRoleNoTimelock(bytes32,bool)',
);

const DELAY_FOR_SET_DEFAULT_DELAY = 2 * 24 * 3600;
const setDefaultDelaySelector = encodeFnSelector('setDefaultDelay(uint256)');

const PROXY_ADMIN_SLOT =
  '0xb53127684a568b3173ae13b9f8a6016e243e63b6e8ee1178d6a717850b5d6103';

const setProxyAdmin = (address: string, admin: string) =>
  ethers.provider.send('hardhat_setStorageAt', [
    address,
    PROXY_ADMIN_SLOT,
    ethers.utils.hexZeroPad(admin, 32),
  ]);

const setInitializedVersion = (address: string, version: number) =>
  ethers.provider.send('hardhat_setStorageAt', [
    address,
    ethers.utils.hexZeroPad('0x00', 32),
    ethers.utils.hexZeroPad(ethers.utils.hexlify(version), 32),
  ]);

const timelockManagerRevertOpts = (
  timelockManager: MidasTimelockManager,
  customErrorName: string,
  args?: unknown[],
) => ({
  revertCustomError: {
    contract: timelockManager,
    customErrorName,
    args,
  },
});

const getScopedFunctionKeys = async (
  accessControl: MidasAccessControl,
  masterRole: string,
  functionSelector: string,
  wAccessControlTester: WithMidasAccessControlTester,
  timelockManager: MidasTimelockManager,
) => {
  const wacFunctionKey = await accessControl.permissionRoleKey(
    masterRole,
    wAccessControlTester.address,
    functionSelector,
  );
  const timelockManagerFunctionKey = await accessControl.permissionRoleKey(
    masterRole,
    timelockManager.address,
    functionSelector,
  );

  return { wacFunctionKey, timelockManagerFunctionKey };
};

const setupFunctionPermissionRole = async (
  accessControl: MidasAccessControl,
  owner: SignerWithAddress,
  wAccessControlTester: WithMidasAccessControlTester,
  timelockManager: MidasTimelockManager,
  masterRole: string,
  functionSelector: string,
  account: string,
) => {
  await asyncForEach(
    [wAccessControlTester.address, timelockManager.address],
    async (targetContract) => {
      await setupGrantOperatorRole({
        accessControl,
        owner,
        masterRole,
        targetContract,
        functionSelector,
        grantOperator: owner,
      });
      await setPermissionRoleTester(
        { accessControl, owner },
        masterRole,
        targetContract,
        functionSelector,
        [{ account, enabled: true }],
      );
    },
    true,
  );

  return getScopedFunctionKeys(
    accessControl,
    masterRole,
    functionSelector,
    wAccessControlTester,
    timelockManager,
  );
};

const setupWithOnlyRolePermission = async (
  accessControl: MidasAccessControl,
  owner: SignerWithAddress,
  wAccessControlTester: WithMidasAccessControlTester,
  timelockManager: MidasTimelockManager,
  masterRole: string,
  account: string,
) =>
  setupFunctionPermissionRole(
    accessControl,
    owner,
    wAccessControlTester,
    timelockManager,
    masterRole,
    withOnlyRoleSelector,
    account,
  );

const setupWithOnlyContractAdminPermission = async (
  accessControl: MidasAccessControl,
  owner: SignerWithAddress,
  wAccessControlTester: WithMidasAccessControlTester,
  timelockManager: MidasTimelockManager,
  masterRole: string,
  account: string,
) =>
  setupFunctionPermissionRole(
    accessControl,
    owner,
    wAccessControlTester,
    timelockManager,
    masterRole,
    withOnlyContractAdminSelector,
    account,
  );

describe('MidasAccessControl', function () {
  it('deployment', async () => {
    const { accessControl, roles, owner } = await loadFixture(defaultDeploy);

    const initGrantedRoles = [
      roles.common.blacklistedOperator,
      roles.common.greenlistedOperator,
      roles.common.defaultAdmin,
    ];

    await asyncForEach(initGrantedRoles, async (role) => {
      expect(await accessControl.hasRole(role, owner.address)).to.eq(true);
    });

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

    await expect(accessControl.initialize(NO_DELAY, [])).revertedWith(
      'Initializable: contract is already initialized',
    );
  });

  describe('initializeV2() proxy admin restriction', () => {
    const deployAccessControl = () =>
      deployProxyContract<MidasAccessControl>(
        'MidasAccessControl',
        [0, []],
        'initialize',
      );

    it('initializeV2 runs while proxy admin is zero during fresh deploy', async () => {
      const accessControl = await deployProxyContract<MidasAccessControl>(
        'MidasAccessControl',
        [3600, []],
        'initialize',
      );

      expect(await accessControl.defaultDelay()).eq(3600);
    });

    it('should fail: when already reinitialized, even from the proxy admin', async () => {
      const [, admin] = await ethers.getSigners();
      const accessControl = await deployAccessControl();

      await setProxyAdmin(accessControl.address, admin.address);

      await expect(
        accessControl.connect(admin).initializeV2(0, []),
      ).revertedWith('Initializable: contract is already initialized');
    });

    it('should fail: when initialized and caller is not the proxy admin', async () => {
      const [, admin, stranger] = await ethers.getSigners();
      const accessControl = await deployAccessControl();

      await setProxyAdmin(accessControl.address, admin.address);
      await setInitializedVersion(accessControl.address, 1);

      await expect(
        accessControl.connect(stranger).initializeV2(0, []),
      ).revertedWithCustomError(accessControl, 'SenderNotProxyAdmin');
    });

    it('when initialized and caller is the proxy admin', async () => {
      const [, admin] = await ethers.getSigners();
      const accessControl = await deployAccessControl();

      await setProxyAdmin(accessControl.address, admin.address);
      await setInitializedVersion(accessControl.address, 1);

      await accessControl.connect(admin).initializeV2(3600, []);

      expect(await accessControl.defaultDelay()).eq(3600);
    });
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
    it('should fail: array is empty', async () => {
      const { accessControl, owner, roles } = await loadFixture(defaultDeploy);

      await grantRoleMultTester({ accessControl, owner }, [], {
        revertCustomError: { customErrorName: 'EmptyArray' },
      });
    });

    it('should fail: when user does not have admin role for roles[0]', async () => {
      const { accessControl, regularAccounts, roles } = await loadFixture(
        defaultDeploy,
      );

      await grantRoleMultTester(
        { accessControl, owner: regularAccounts[0] },
        [
          {
            role: roles.common.blacklisted,
            account: regularAccounts[1].address,
            delay: 0,
          },
        ],
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
        [
          {
            role: roles.common.blacklisted,
            account: regularAccounts[1].address,
            delay: 0,
          },
          {
            role: roles.common.greenlisted,
            account: regularAccounts[2].address,
            delay: 0,
          },
        ],
        { revertCustomError: { customErrorName: 'RoleAdminMismatch' } },
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
        [
          {
            role: roles.common.blacklisted,
            account: regularAccounts[0].address,
            delay: 0,
          },
        ],
      ]);

      await bulkScheduleTimelockOperationTester(
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

      await grantRoleMultTester({ accessControl, owner }, [
        {
          role: roles.common.blacklisted,
          account: regularAccounts[0].address,
          delay: 0,
        },
      ]);

      await grantRoleMultTester({ accessControl, owner }, [
        {
          role: roles.common.blacklisted,
          account: regularAccounts[0].address,
          delay: 0,
        },
      ]);
    });

    it('should fail: when user have function access role but do not have role admin role', async () => {
      const { accessControl, owner, regularAccounts, roles } =
        await loadFixture(defaultDeploy);

      const selector = encodeFnSelector('grantRoleMult(bytes32[],address[])');

      await setupGrantOperatorRole({
        accessControl,
        owner,
        masterRole: roles.common.blacklistedOperator,
        targetContract: accessControl.address,
        functionSelector: selector,
        grantOperator: owner,
      });

      await setPermissionRoleTester(
        { accessControl, owner },
        undefined,
        accessControl.address,
        selector,
        [{ account: regularAccounts[0].address, enabled: true }],
      );

      await grantRoleMultTester(
        { accessControl, owner: regularAccounts[0] },
        [
          {
            role: roles.common.blacklisted,
            account: regularAccounts[1].address,
            delay: 0,
          },
        ],
        { revertCustomError: acErrors.WMAC_HASNT_PERMISSION() },
      );
    });

    it('when delay is not NULL_DELAY but actual delay is NULL_DELAY - should set the delay', async () => {
      const { accessControl, owner, regularAccounts, roles } =
        await loadFixture(defaultDeploy);

      await grantRoleMultTester({ accessControl, owner }, [
        {
          role: roles.common.blacklisted,
          account: regularAccounts[0].address,
          delay: 3600,
        },
      ]);
    });

    it('should fail: when delay is not NULL_DELAY but actual delay is also not null', async () => {
      const { accessControl, owner, regularAccounts, roles } =
        await loadFixture(defaultDeploy);

      await grantRoleMultTester({ accessControl, owner }, [
        {
          role: roles.common.blacklisted,
          account: regularAccounts[0].address,
          delay: 3600,
        },
      ]);

      await grantRoleMultTester(
        { accessControl, owner },
        [
          {
            role: roles.common.blacklisted,
            account: regularAccounts[1].address,
            delay: 7200,
          },
        ],
        { revertCustomError: { customErrorName: 'DelayIsAlreadySet' } },
      );
    });

    it('should fail: when array contains 2 identical roles and both tries to update the delay, and actual delay is NULL_DELAY', async () => {
      const { accessControl, owner, regularAccounts, roles } =
        await loadFixture(defaultDeploy);

      await grantRoleMultTester(
        { accessControl, owner },
        [
          {
            role: roles.common.blacklisted,
            account: regularAccounts[0].address,
            delay: 3600,
          },
          {
            role: roles.common.blacklisted,
            account: regularAccounts[1].address,
            delay: 3600,
          },
        ],
        { revertCustomError: { customErrorName: 'DelayIsAlreadySet' } },
      );
    });
  });

  describe('revokeRoleMult()', () => {
    it('should fail: array is empty', async () => {
      const { accessControl, owner } = await loadFixture(defaultDeploy);

      await revokeRoleMultTester({ accessControl, owner }, [], {
        revertCustomError: { customErrorName: 'EmptyArray' },
      });
    });

    it('should fail: when user does not have admin role for roles[0]', async () => {
      const { accessControl, regularAccounts, roles } = await loadFixture(
        defaultDeploy,
      );

      await revokeRoleMultTester(
        { accessControl, owner: regularAccounts[0] },
        [
          {
            role: roles.common.blacklisted,
            account: regularAccounts[1].address,
          },
        ],
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
        [
          {
            role: roles.common.blacklisted,
            account: regularAccounts[1].address,
          },
          {
            role: roles.common.greenlisted,
            account: regularAccounts[2].address,
          },
        ],
        { revertCustomError: { customErrorName: 'RoleAdminMismatch' } },
      );
    });

    it('should fail: when trying to revoke DEFAULT_ADMIN_ROLE from self', async () => {
      const { accessControl, owner, roles } = await loadFixture(defaultDeploy);

      await revokeRoleMultTester(
        { accessControl, owner },
        [{ role: roles.common.defaultAdmin, account: owner.address }],
        { revertCustomError: { customErrorName: 'CannotRevokeFromSelf' } },
      );
    });

    it('when revoking role from self but its not DEFAULT_ADMIN_ROLE (should not fail)', async () => {
      const { accessControl, owner, roles } = await loadFixture(defaultDeploy);

      await revokeRoleMultTester({ accessControl, owner }, [
        { role: roles.common.blacklistedOperator, account: owner.address },
      ]);
    });

    it('should fail: when revoking DEFAULT_ADMIN_ROLE from self and timelock delay is not 0', async () => {
      // Locks in that _validateRevokeRole uses the resolved proposer (actualSender),
      // not msg.sender. If it compared against the timelock address, self-revoke
      // via timelock would incorrectly succeed.
      const { accessControl, owner, roles, timelock, timelockManager } =
        await loadFixture(defaultDeploy);

      await setRoleTimelocksTester(
        { timelockManager, timelock, owner, accessControl },
        [roles.common.defaultAdmin],
        [3600],
      );

      const data = accessControl.interface.encodeFunctionData(
        'revokeRoleMult',
        [[{ role: roles.common.defaultAdmin, account: owner.address }]],
      );

      await bulkScheduleTimelockOperationTester(
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

      expect(
        await accessControl.hasRole(roles.common.defaultAdmin, owner.address),
      ).eq(true);
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

      await grantRoleMultTester({ accessControl, owner }, [
        { role: roles.common.blacklisted, account: regularAccounts[0].address },
      ]);

      await setRoleTimelocksTester(
        { timelockManager, timelock, owner, accessControl },
        [roles.common.blacklistedOperator],
        [3600],
      );

      const data = accessControl.interface.encodeFunctionData(
        'revokeRoleMult',
        [
          [
            {
              role: roles.common.blacklisted,
              account: regularAccounts[0].address,
            },
          ],
        ],
      );

      await bulkScheduleTimelockOperationTester(
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

      await setupGrantOperatorRole({
        accessControl,
        owner,
        masterRole: roles.common.blacklistedOperator,
        targetContract: accessControl.address,
        functionSelector: selector,
        grantOperator: owner,
      });

      await setPermissionRoleTester(
        { accessControl, owner },
        undefined,
        accessControl.address,
        selector,
        [{ account: regularAccounts[0].address, enabled: true }],
      );

      await revokeRoleMultTester(
        { accessControl, owner: regularAccounts[0] },
        [
          {
            role: roles.common.blacklisted,
            account: regularAccounts[1].address,
          },
        ],
        { revertCustomError: acErrors.WMAC_HASNT_PERMISSION() },
      );
    });

    it('when address do not have the role (shouldnt fail)', async () => {
      const { accessControl, owner, regularAccounts, roles } =
        await loadFixture(defaultDeploy);

      await revokeRoleMultTester({ accessControl, owner }, [
        { role: roles.common.blacklisted, account: regularAccounts[0].address },
      ]);
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
      const { accessControl, regularAccounts, owner, roles } =
        await loadFixture(defaultDeploy);

      await grantRoleTester(
        { accessControl, owner },
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
      const { accessControl, roles, owner, regularAccounts } =
        await loadFixture(defaultDeploy);

      await grantRoleTester(
        { accessControl, owner },
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

      await grantRoleTester(
        { accessControl, owner },
        roles.common.blacklistedOperator,
        regularAccounts[0].address,
      );
      await grantRoleTester(
        { accessControl, owner },
        NEW_ADMIN_ROLE,
        regularAccounts[1].address,
      );

      await accessControl.setRoleAdmin(TEST_ROLE, NEW_ADMIN_ROLE);

      await grantRoleTester(
        { accessControl, owner },
        TEST_ROLE,
        regularAccounts[2].address,
        undefined,
        {
          from: regularAccounts[0],
          revertCustomError: acErrors.WMAC_HASNT_PERMISSION(),
        },
      );

      await grantRoleTester(
        { accessControl, owner },
        TEST_ROLE,
        regularAccounts[2].address,
        undefined,
        {
          from: regularAccounts[1],
        },
      );

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

      await bulkScheduleTimelockOperationTester(
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
      const {
        accessControl,
        owner,
        regularAccounts,
        roles,
        wAccessControlTester,
      } = await loadFixture(defaultDeploy);

      const selector = encodeFnSelector('setRoleAdmin(bytes32,bytes32)');

      await wAccessControlTester.setContractAdminRole(
        roles.common.blacklistedOperator,
      );
      await setupGrantOperatorRole({
        accessControl,
        owner,
        masterRole: roles.common.blacklistedOperator,
        targetContract: wAccessControlTester.address,
        functionSelector: selector,
        grantOperator: owner,
      });

      await setPermissionRoleTester(
        { accessControl, owner },
        roles.common.blacklistedOperator,
        wAccessControlTester.address,
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

  describe('setUserFacingRoleMult()', () => {
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
        'setUserFacingRoleMult',
        [[{ role: roles.common.blacklistedOperator, enabled: true }]],
      );

      await bulkScheduleTimelockOperationTester(
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
        'setUserFacingRoleMult((bytes32,bool)[])',
      );

      await setupGrantOperatorRole({
        accessControl,
        owner,
        masterRole: roles.common.defaultAdmin,
        targetContract: accessControl.address,
        functionSelector: selector,
        grantOperator: owner,
      });

      await setPermissionRoleTester(
        { accessControl, owner },
        undefined,
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

    it('when switching enabled to disabled', async () => {
      const { accessControl, owner, roles } = await loadFixture(defaultDeploy);

      await setIsUserFacingRoleTester({ accessControl, owner }, [
        { role: roles.common.greenlistedOperator, enabled: true },
      ]);

      await setIsUserFacingRoleTester({ accessControl, owner }, [
        { role: roles.common.greenlistedOperator, enabled: false },
      ]);
    });
  });

  describe('setGrantOperatorRoleMult()', () => {
    it('should fail: reverts when role is user facing role', async () => {
      const { accessControl, owner, wAccessControlTester, roles } =
        await loadFixture(defaultDeploy);

      await wAccessControlTester.setContractAdminRole(roles.common.greenlisted);
      await setGrantOperatorRoleTester(
        {
          accessControl,
          owner,
        },
        wAccessControlTester.address,
        [
          {
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
      const { accessControl, owner, roles, wAccessControlTester } =
        await loadFixture(defaultDeploy);

      await wAccessControlTester.setContractAdminRole(
        roles.common.greenlistedOperator,
      );

      await setGrantOperatorRoleTester(
        {
          accessControl,
          owner,
        },
        wAccessControlTester.address,
        [
          {
            functionSelector: encodeFnSelector('setGreenlistEnable(bool)'),
            operator: owner.address,
            enabled: true,
          },
        ],
      );
    });

    it('when address is already grant operator (should not revert)', async () => {
      const { accessControl, owner, roles, wAccessControlTester } =
        await loadFixture(defaultDeploy);

      const params = [
        {
          functionSelector: encodeFnSelector('setGreenlistEnable(bool)'),
          operator: owner.address,
          enabled: true,
        },
      ];

      await wAccessControlTester.setContractAdminRole(
        roles.common.greenlistedOperator,
      );

      await setGrantOperatorRoleTester(
        { accessControl, owner },
        wAccessControlTester.address,
        params,
      );

      await setGrantOperatorRoleTester(
        { accessControl, owner },
        wAccessControlTester.address,
        params,
      );
    });

    it('when timelock delay is not 0 - schedule and execute the tx', async () => {
      const {
        accessControl,
        owner,
        roles,
        timelock,
        timelockManager,
        wAccessControlTester,
      } = await loadFixture(defaultDeploy);

      await setRoleTimelocksTester(
        { timelockManager, timelock, owner, accessControl },
        [roles.common.greenlistedOperator],
        [3600],
      );

      await wAccessControlTester.setContractAdminRole(
        roles.common.greenlistedOperator,
      );
      const data = accessControl.interface.encodeFunctionData(
        'setGrantOperatorRoleMult',
        [
          wAccessControlTester.address,
          [
            {
              delay: 0,
              functionSelector: encodeFnSelector('setGreenlistEnable(bool)'),
              operator: owner.address,
              enabled: true,
            },
          ],
        ],
      );

      await bulkScheduleTimelockOperationTester(
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

    it('should fail: when user have function access role but do not have masterRole', async () => {
      const {
        accessControl,
        owner,
        regularAccounts,
        roles,
        wAccessControlTester,
      } = await loadFixture(defaultDeploy);

      const selector = encodeFnSelector(
        'setGrantOperatorRoleMult(bytes32,(address,bytes4,address,bool)[])',
      );
      await wAccessControlTester.setContractAdminRole(
        roles.common.greenlistedOperator,
      );

      await setupGrantOperatorRole({
        accessControl,
        owner,
        masterRole: roles.common.greenlistedOperator,
        targetContract: wAccessControlTester.address,
        functionSelector: selector,
        grantOperator: owner,
      });

      await setPermissionRoleTester(
        { accessControl, owner },
        undefined,
        wAccessControlTester.address,
        selector,
        [{ account: regularAccounts[0].address, enabled: true }],
      );

      await setGrantOperatorRoleTester(
        { accessControl, owner: regularAccounts[0] },
        wAccessControlTester.address,
        [
          {
            functionSelector: encodeFnSelector('setGreenlistEnable(bool)'),
            operator: regularAccounts[1].address,
            enabled: true,
          },
        ],
        { revertCustomError: acErrors.WMAC_HASNT_PERMISSION() },
      );
    });

    it('should fail: when params lenght is 0', async () => {
      const { accessControl, owner, wAccessControlTester } = await loadFixture(
        defaultDeploy,
      );

      await setGrantOperatorRoleTester(
        { accessControl, owner },
        wAccessControlTester.address,
        [],
        {
          revertCustomError: { customErrorName: 'EmptyArray' },
        },
      );
    });

    it('when switching enabled to disabled', async () => {
      const { accessControl, owner, roles, wAccessControlTester } =
        await loadFixture(defaultDeploy);

      const selector = encodeFnSelector('setGreenlistEnable(bool)');

      await wAccessControlTester.setContractAdminRole(
        roles.common.greenlistedOperator,
      );

      const params = [
        {
          functionSelector: selector,
          operator: owner.address,
          enabled: true,
        },
      ];

      await setGrantOperatorRoleTester(
        { accessControl, owner },
        wAccessControlTester.address,
        params,
      );

      await setGrantOperatorRoleTester(
        { accessControl, owner },
        wAccessControlTester.address,
        [{ ...params[0], enabled: false }],
      );
    });

    it('when delay is not NULL_DELAY but actual delay is NULL_DELAY - should set the delay', async () => {
      const { accessControl, owner, roles, wAccessControlTester } =
        await loadFixture(defaultDeploy);

      const selector = encodeFnSelector('setGreenlistEnable(bool)');

      await wAccessControlTester.setContractAdminRole(
        roles.common.greenlistedOperator,
      );

      await setGrantOperatorRoleTester(
        { accessControl, owner },
        wAccessControlTester.address,
        [
          {
            functionSelector: selector,
            operator: owner.address,
            enabled: true,
            delay: 3600,
          },
        ],
      );
    });

    it('should fail: when delay is not NULL_DELAY but actual delay is also not null', async () => {
      const {
        accessControl,
        owner,
        roles,
        timelock,
        timelockManager,
        wAccessControlTester,
      } = await loadFixture(defaultDeploy);

      const selector = encodeFnSelector('setGreenlistEnable(bool)');

      await wAccessControlTester.setContractAdminRole(
        roles.common.greenlistedOperator,
      );

      const operatorRoleKey = await accessControl.grantOperatorRoleKey(
        roles.common.greenlistedOperator,
        wAccessControlTester.address,
        selector,
      );

      await setRoleTimelocksTester(
        { timelockManager, timelock, owner, accessControl },
        [operatorRoleKey],
        [3600],
      );

      await setGrantOperatorRoleTester(
        { accessControl, owner },
        wAccessControlTester.address,
        [
          {
            functionSelector: selector,
            operator: owner.address,
            enabled: true,
            delay: 7200,
          },
        ],
        { revertCustomError: { customErrorName: 'DelayIsAlreadySet' } },
      );
    });
  });

  describe('setPermissionRoleMult()', () => {
    it('when caller is function operator', async () => {
      const {
        accessControl,
        owner,
        regularAccounts,
        roles,
        wAccessControlTester,
      } = await loadFixture(defaultDeploy);

      const selector = encodeFnSelector('setGreenlistEnable(bool)');
      await wAccessControlTester.setContractAdminRole(
        roles.common.greenlistedOperator,
      );
      await setupGrantOperatorRole({
        accessControl,
        owner,
        masterRole: roles.common.greenlistedOperator,
        targetContract: wAccessControlTester.address,
        functionSelector: selector,
        grantOperator: owner,
      });

      await setPermissionRoleTester(
        { accessControl, owner },
        undefined,
        wAccessControlTester.address,
        selector,
        [
          {
            account: regularAccounts[0].address,
            enabled: true,
          },
        ],
      );
    });

    it('extracts master role from target contract when not provided', async () => {
      const {
        accessControl,
        owner,
        regularAccounts,
        roles,
        wAccessControlTester,
      } = await loadFixture(defaultDeploy);

      const selector = encodeFnSelector('setGreenlistEnable(bool)');
      const contractAdminRole = roles.common.greenlistedOperator;

      await wAccessControlTester.setContractAdminRole(contractAdminRole);
      await setupGrantOperatorRole({
        accessControl,
        owner,
        masterRole: contractAdminRole,
        targetContract: wAccessControlTester.address,
        functionSelector: selector,
        grantOperator: owner,
      });

      await setPermissionRoleTester(
        { accessControl, owner },
        undefined,
        wAccessControlTester.address,
        selector,
        [{ account: regularAccounts[0].address, enabled: true }],
      );

      expect(
        await accessControl[
          'hasFunctionPermission(bytes32,address,bytes4,address)'
        ](
          contractAdminRole,
          wAccessControlTester.address,
          selector,
          regularAccounts[0].address,
        ),
      ).eq(true);
      expect(
        await accessControl[
          'hasFunctionPermission(bytes32,address,bytes4,address)'
        ](
          roles.common.defaultAdmin,
          wAccessControlTester.address,
          selector,
          regularAccounts[0].address,
        ),
      ).eq(false);
    });

    it('should fail: caller is not a grant operator', async () => {
      const { accessControl, owner, regularAccounts, roles } =
        await loadFixture(defaultDeploy);

      const selector = encodeFnSelector('setGreenlistEnable(bool)');

      await setupGrantOperatorRole({
        accessControl,
        owner,
        masterRole: roles.common.greenlistedOperator,
        targetContract: accessControl.address,
        functionSelector: selector,
        grantOperator: owner,
      });

      await setPermissionRoleTester(
        { accessControl, owner: regularAccounts[1] },
        undefined,
        accessControl.address,
        selector,
        [
          {
            account: regularAccounts[2].address,
            enabled: true,
          },
        ],
        undefined,
        { revertCustomError: acErrors.WMAC_HASNT_PERMISSION() },
      );
    });

    it('should fail: caller is an operator for a different function', async () => {
      const { accessControl, owner, regularAccounts, roles } =
        await loadFixture(defaultDeploy);

      await setupGrantOperatorRole({
        accessControl,
        owner,
        masterRole: roles.common.greenlistedOperator,
        targetContract: accessControl.address,
        functionSelector: encodeFnSelector('setGreenlistEnable1(bool)'),
        grantOperator: owner,
      });

      const selector = encodeFnSelector('setGreenlistEnable(bool)');

      await grantRoleTester(
        { accessControl, owner },
        roles.common.defaultAdmin,
        regularAccounts[2],
      );

      await revokeRoleTester(
        { accessControl, owner },
        roles.common.defaultAdmin,
        owner,
        {
          from: regularAccounts[2],
        },
      );

      await setPermissionRoleTester(
        { accessControl, owner },
        undefined,
        accessControl.address,
        selector,
        [
          {
            account: regularAccounts[2].address,
            enabled: true,
          },
        ],
        undefined,
        { revertCustomError: acErrors.WMAC_HASNT_PERMISSION() },
      );
    });

    it('when address is already has permission (shouldnt fail)', async () => {
      const {
        accessControl,
        owner,
        regularAccounts,
        roles,
        wAccessControlTester,
      } = await loadFixture(defaultDeploy);

      const selector = encodeFnSelector('setGreenlistEnable(bool)');

      await wAccessControlTester.setContractAdminRole(
        roles.common.greenlistedOperator,
      );
      await setupGrantOperatorRole({
        accessControl,
        owner,
        masterRole: roles.common.greenlistedOperator,
        targetContract: wAccessControlTester.address,
        functionSelector: selector,
        grantOperator: owner,
      });

      await setPermissionRoleTester(
        { accessControl, owner },
        undefined,
        wAccessControlTester.address,
        selector,
        [{ account: regularAccounts[0].address, enabled: true }],
      );

      await setPermissionRoleTester(
        { accessControl, owner },
        undefined,
        wAccessControlTester.address,
        selector,
        [{ account: regularAccounts[0].address, enabled: true }],
      );
    });

    it('should fail: when params lenght is 0', async () => {
      const { accessControl, owner, roles } = await loadFixture(defaultDeploy);

      const selector = encodeFnSelector('setGreenlistEnable(bool)');

      await setupGrantOperatorRole({
        accessControl,
        owner,
        masterRole: roles.common.greenlistedOperator,
        targetContract: accessControl.address,
        functionSelector: selector,
        grantOperator: owner,
      });

      await setPermissionRoleTester(
        { accessControl, owner },
        undefined,
        accessControl.address,
        selector,
        [],
        undefined,
        { revertCustomError: { customErrorName: 'EmptyArray' } },
      );
    });

    it('should fail: when user do not have grant operator role', async () => {
      const { accessControl, owner, regularAccounts, roles } =
        await loadFixture(defaultDeploy);

      const selector = encodeFnSelector('setGreenlistEnable(bool)');

      await setupGrantOperatorRole({
        accessControl,
        owner,
        masterRole: roles.common.greenlistedOperator,
        targetContract: accessControl.address,
        functionSelector: selector,
        grantOperator: owner,
      });

      await setPermissionRoleTester(
        { accessControl, owner: regularAccounts[0] },
        undefined,
        accessControl.address,
        selector,
        [{ account: regularAccounts[1].address, enabled: true }],
        undefined,
        { revertCustomError: acErrors.WMAC_HASNT_PERMISSION() },
      );
    });

    it('when switching enabled to disabled', async () => {
      const {
        accessControl,
        owner,
        regularAccounts,
        roles,
        wAccessControlTester,
      } = await loadFixture(defaultDeploy);

      const selector = encodeFnSelector('setGreenlistEnable(bool)');

      await wAccessControlTester.setContractAdminRole(
        roles.common.greenlistedOperator,
      );
      await setupGrantOperatorRole({
        accessControl,
        owner,
        masterRole: roles.common.greenlistedOperator,
        targetContract: wAccessControlTester.address,
        functionSelector: selector,
        grantOperator: owner,
      });

      await setPermissionRoleTester(
        { accessControl, owner },
        undefined,
        wAccessControlTester.address,
        selector,
        [{ account: regularAccounts[0].address, enabled: true }],
      );

      await setPermissionRoleTester(
        { accessControl, owner },
        undefined,
        wAccessControlTester.address,
        selector,
        [{ account: regularAccounts[0].address, enabled: false }],
      );
    });

    it('when delay is not NULL_DELAY but actual delay is NULL_DELAY - should set the delay', async () => {
      const {
        accessControl,
        owner,
        regularAccounts,
        roles,
        wAccessControlTester,
      } = await loadFixture(defaultDeploy);

      const selector = encodeFnSelector('setGreenlistEnable(bool)');

      await wAccessControlTester.setContractAdminRole(
        roles.common.greenlistedOperator,
      );
      await setupGrantOperatorRole({
        accessControl,
        owner,
        masterRole: roles.common.greenlistedOperator,
        targetContract: wAccessControlTester.address,
        functionSelector: selector,
        grantOperator: owner,
      });

      await setPermissionRoleTester(
        { accessControl, owner },
        undefined,
        wAccessControlTester.address,
        selector,
        [{ account: regularAccounts[0].address, enabled: true }],
        3600,
      );
    });

    it('should fail: when delay is not NULL_DELAY but actual delay is also not null', async () => {
      const {
        accessControl,
        owner,
        regularAccounts,
        roles,
        wAccessControlTester,
      } = await loadFixture(defaultDeploy);

      const selector = encodeFnSelector('setGreenlistEnable(bool)');

      await wAccessControlTester.setContractAdminRole(
        roles.common.greenlistedOperator,
      );
      await setupGrantOperatorRole({
        accessControl,
        owner,
        masterRole: roles.common.greenlistedOperator,
        targetContract: wAccessControlTester.address,
        functionSelector: selector,
        grantOperator: owner,
      });

      await setPermissionRoleTester(
        { accessControl, owner },
        undefined,
        wAccessControlTester.address,
        selector,
        [{ account: regularAccounts[0].address, enabled: true }],
        3600,
      );

      await setPermissionRoleTester(
        { accessControl, owner },
        undefined,
        wAccessControlTester.address,
        selector,
        [{ account: regularAccounts[1].address, enabled: true }],
        7200,
        { revertCustomError: { customErrorName: 'DelayIsAlreadySet' } },
      );
    });

    it('when master batches multiple selectors for one account', async () => {
      const {
        accessControl,
        owner,
        regularAccounts,
        roles,
        wAccessControlTester,
      } = await loadFixture(defaultDeploy);

      const selectorA = encodeFnSelector('withOnlyRole(bytes32,bool)');
      const selectorB = encodeFnSelector('withOnlyContractAdmin()');
      const masterRole = roles.common.greenlistedOperator;
      const account = regularAccounts[0].address;

      await wAccessControlTester.setContractAdminRole(masterRole);

      await setPermissionRoleMultTester(
        { accessControl, owner },
        undefined,
        wAccessControlTester.address,
        [
          {
            functionSelector: selectorA,
            account,
            enabled: true,
          },
          {
            functionSelector: selectorB,
            account,
            enabled: true,
          },
        ],
      );

      expect(
        await accessControl[
          'hasFunctionPermission(bytes32,address,bytes4,address)'
        ](masterRole, wAccessControlTester.address, selectorA, account),
      ).eq(true);
      expect(
        await accessControl[
          'hasFunctionPermission(bytes32,address,bytes4,address)'
        ](masterRole, wAccessControlTester.address, selectorB, account),
      ).eq(true);
    });

    it('when master batches multiple selectors for multiple accounts', async () => {
      const {
        accessControl,
        owner,
        regularAccounts,
        roles,
        wAccessControlTester,
      } = await loadFixture(defaultDeploy);

      const selectorA = encodeFnSelector('withOnlyRole(bytes32,bool)');
      const selectorB = encodeFnSelector('withOnlyContractAdmin()');
      const masterRole = roles.common.greenlistedOperator;

      await wAccessControlTester.setContractAdminRole(masterRole);

      await setPermissionRoleMultTester(
        { accessControl, owner },
        undefined,
        wAccessControlTester.address,
        [
          {
            functionSelector: selectorA,
            account: regularAccounts[0].address,
            enabled: true,
          },
          {
            functionSelector: selectorB,
            account: regularAccounts[1].address,
            enabled: true,
          },
        ],
      );

      expect(
        await accessControl[
          'hasFunctionPermission(bytes32,address,bytes4,address)'
        ](
          masterRole,
          wAccessControlTester.address,
          selectorA,
          regularAccounts[0].address,
        ),
      ).eq(true);
      expect(
        await accessControl[
          'hasFunctionPermission(bytes32,address,bytes4,address)'
        ](
          masterRole,
          wAccessControlTester.address,
          selectorB,
          regularAccounts[1].address,
        ),
      ).eq(true);
    });

    it('when operator batches multiple accounts for the same selector', async () => {
      const {
        accessControl,
        owner,
        regularAccounts,
        roles,
        wAccessControlTester,
      } = await loadFixture(defaultDeploy);

      const selector = encodeFnSelector('setGreenlistEnable(bool)');
      const masterRole = roles.common.greenlistedOperator;

      await wAccessControlTester.setContractAdminRole(masterRole);
      await setupGrantOperatorRole({
        accessControl,
        owner,
        masterRole,
        targetContract: wAccessControlTester.address,
        functionSelector: selector,
        grantOperator: owner,
      });

      await setPermissionRoleMultTester(
        { accessControl, owner },
        undefined,
        wAccessControlTester.address,
        [
          {
            functionSelector: selector,
            account: regularAccounts[0].address,
            enabled: true,
          },
          {
            functionSelector: selector,
            account: regularAccounts[1].address,
            enabled: true,
          },
        ],
      );

      expect(
        await accessControl[
          'hasFunctionPermission(bytes32,address,bytes4,address)'
        ](
          masterRole,
          wAccessControlTester.address,
          selector,
          regularAccounts[0].address,
        ),
      ).eq(true);
      expect(
        await accessControl[
          'hasFunctionPermission(bytes32,address,bytes4,address)'
        ](
          masterRole,
          wAccessControlTester.address,
          selector,
          regularAccounts[1].address,
        ),
      ).eq(true);
    });

    it('should fail: when operator batches mixed selectors', async () => {
      const {
        accessControl,
        owner,
        regularAccounts,
        roles,
        wAccessControlTester,
      } = await loadFixture(defaultDeploy);

      const selectorA = encodeFnSelector('withOnlyRole(bytes32,bool)');
      const selectorB = encodeFnSelector('withOnlyContractAdmin()');
      const masterRole = roles.common.greenlistedOperator;
      const operator = regularAccounts[0];

      await wAccessControlTester.setContractAdminRole(masterRole);
      await setupGrantOperatorRole({
        accessControl,
        owner,
        masterRole,
        targetContract: wAccessControlTester.address,
        functionSelector: selectorA,
        grantOperator: operator,
      });

      expect(await accessControl.hasRole(masterRole, operator.address)).eq(
        false,
      );

      await setPermissionRoleMultTester(
        { accessControl, owner },
        undefined,
        wAccessControlTester.address,
        [
          {
            functionSelector: selectorA,
            account: regularAccounts[1].address,
            enabled: true,
          },
          {
            functionSelector: selectorB,
            account: regularAccounts[1].address,
            enabled: true,
          },
        ],
        {
          from: operator,
          revertCustomError: {
            customErrorName: 'FunctionSelectorMismatch',
          },
        },
      );
    });

    it('when master batches multiple selectors with per-param delays', async () => {
      const {
        accessControl,
        owner,
        regularAccounts,
        roles,
        wAccessControlTester,
      } = await loadFixture(defaultDeploy);

      const selectorA = encodeFnSelector('withOnlyRole(bytes32,bool)');
      const selectorB = encodeFnSelector('withOnlyContractAdmin()');
      const masterRole = roles.common.greenlistedOperator;
      const account = regularAccounts[0].address;

      await wAccessControlTester.setContractAdminRole(masterRole);

      await setPermissionRoleMultTester(
        { accessControl, owner },
        undefined,
        wAccessControlTester.address,
        [
          {
            functionSelector: selectorA,
            account,
            enabled: true,
            delay: 3600,
          },
          {
            functionSelector: selectorB,
            account,
            enabled: true,
            delay: 7200,
          },
        ],
      );

      const keyA = await accessControl.permissionRoleKey(
        masterRole,
        wAccessControlTester.address,
        selectorA,
      );
      const keyB = await accessControl.permissionRoleKey(
        masterRole,
        wAccessControlTester.address,
        selectorB,
      );

      expect((await accessControl.getRoleTimelockDelay(keyA, 0))[0]).eq(3600);
      expect((await accessControl.getRoleTimelockDelay(keyB, 0))[0]).eq(7200);
    });

    describe('without timelock', () => {
      it('when caller has master role but not operator role - uses master role', async () => {
        const {
          accessControl,
          owner,
          regularAccounts,
          roles,
          wAccessControlTester,
        } = await loadFixture(defaultDeploy);

        const selector = encodeFnSelector('setGreenlistEnable(bool)');
        const masterRole = roles.common.greenlistedOperator;

        await wAccessControlTester.setContractAdminRole(masterRole);

        expect(await accessControl.hasRole(masterRole, owner.address)).eq(true);
        expect(
          await accessControl[
            'isFunctionAccessGrantOperator(bytes32,address,bytes4,address)'
          ](masterRole, wAccessControlTester.address, selector, owner.address),
        ).eq(false);

        await setPermissionRoleTester(
          { accessControl, owner },
          undefined,
          wAccessControlTester.address,
          selector,
          [{ account: regularAccounts[0].address, enabled: true }],
        );
      });

      it('when caller has operator role but not master role - uses operator role', async () => {
        const {
          accessControl,
          owner,
          regularAccounts,
          roles,
          timelock,
          timelockManager,
          wAccessControlTester,
        } = await loadFixture(defaultDeploy);

        const selector = encodeFnSelector('setGreenlistEnable(bool)');
        const masterRole = roles.common.greenlistedOperator;
        const operator = regularAccounts[0];

        await wAccessControlTester.setContractAdminRole(masterRole);

        await setGrantOperatorRoleTester(
          { accessControl, owner },
          wAccessControlTester.address,
          [
            {
              functionSelector: selector,
              operator: operator.address,
              enabled: true,
            },
          ],
        );

        const operatorRoleKey = await accessControl.grantOperatorRoleKey(
          masterRole,
          wAccessControlTester.address,
          selector,
        );

        // master has delay so direct call would fail if master role were wrongly selected
        await setRoleTimelocksTester(
          { timelockManager, timelock, owner, accessControl },
          [masterRole],
          [3600],
        );
        await setRoleTimelocksTester(
          { timelockManager, timelock, owner, accessControl },
          [operatorRoleKey],
          [NO_DELAY],
        );

        expect(await accessControl.hasRole(masterRole, operator.address)).eq(
          false,
        );
        expect(
          await accessControl[
            'isFunctionAccessGrantOperator(bytes32,address,bytes4,address)'
          ](
            masterRole,
            wAccessControlTester.address,
            selector,
            operator.address,
          ),
        ).eq(true);

        await setPermissionRoleTester(
          { accessControl, owner },
          undefined,
          wAccessControlTester.address,
          selector,
          [{ account: regularAccounts[1].address, enabled: true }],
          undefined,
          { from: operator },
        );
      });

      it('when caller has both roles and master has no delay but operator does - uses master role', async () => {
        const {
          accessControl,
          owner,
          regularAccounts,
          roles,
          timelock,
          timelockManager,
          wAccessControlTester,
        } = await loadFixture(defaultDeploy);

        const selector = encodeFnSelector('setGreenlistEnable(bool)');
        const masterRole = roles.common.greenlistedOperator;

        await wAccessControlTester.setContractAdminRole(masterRole);

        const operatorRoleKey = await accessControl.grantOperatorRoleKey(
          masterRole,
          wAccessControlTester.address,
          selector,
        );

        await setGrantOperatorRoleTester(
          { accessControl, owner },
          wAccessControlTester.address,
          [
            {
              functionSelector: selector,
              operator: owner.address,
              enabled: true,
            },
          ],
        );

        await setRoleTimelocksTester(
          { timelockManager, timelock, owner, accessControl },
          [operatorRoleKey],
          [3600],
        );

        await setPermissionRoleTester(
          { accessControl, owner },
          undefined,
          wAccessControlTester.address,
          selector,
          [{ account: regularAccounts[0].address, enabled: true }],
        );
      });

      it('when caller has both roles and operator has no delay but master does - uses operator role', async () => {
        const {
          accessControl,
          owner,
          regularAccounts,
          roles,
          timelock,
          timelockManager,
          wAccessControlTester,
        } = await loadFixture(defaultDeploy);

        const selector = encodeFnSelector('setGreenlistEnable(bool)');
        const masterRole = roles.common.greenlistedOperator;

        await wAccessControlTester.setContractAdminRole(masterRole);

        const operatorRoleKey = await accessControl.grantOperatorRoleKey(
          masterRole,
          wAccessControlTester.address,
          selector,
        );

        await setGrantOperatorRoleTester(
          { accessControl, owner },
          wAccessControlTester.address,
          [
            {
              functionSelector: selector,
              operator: owner.address,
              enabled: true,
            },
          ],
        );

        await setRoleTimelocksTester(
          { timelockManager, timelock, owner, accessControl },
          [masterRole],
          [3600],
        );
        await setRoleTimelocksTester(
          { timelockManager, timelock, owner, accessControl },
          [operatorRoleKey],
          [NO_DELAY],
        );

        await setPermissionRoleTester(
          { accessControl, owner },
          undefined,
          wAccessControlTester.address,
          selector,
          [{ account: regularAccounts[0].address, enabled: true }],
        );
      });

      it('when caller has both roles and operator has shorter delay - should fail on mixed selectors', async () => {
        const {
          accessControl,
          owner,
          regularAccounts,
          roles,
          timelock,
          timelockManager,
          wAccessControlTester,
        } = await loadFixture(defaultDeploy);

        const selectorA = encodeFnSelector('withOnlyRole(bytes32,bool)');
        const selectorB = encodeFnSelector('withOnlyContractAdmin()');
        const masterRole = roles.common.greenlistedOperator;

        await wAccessControlTester.setContractAdminRole(masterRole);

        const operatorRoleKey = await accessControl.grantOperatorRoleKey(
          masterRole,
          wAccessControlTester.address,
          selectorA,
        );

        await setGrantOperatorRoleTester(
          { accessControl, owner },
          wAccessControlTester.address,
          [
            {
              functionSelector: selectorA,
              operator: owner.address,
              enabled: true,
            },
          ],
        );

        await setRoleTimelocksTester(
          { timelockManager, timelock, owner, accessControl },
          [masterRole],
          [7200],
        );
        await setRoleTimelocksTester(
          { timelockManager, timelock, owner, accessControl },
          [operatorRoleKey],
          [NO_DELAY],
        );

        await setPermissionRoleMultTester(
          { accessControl, owner },
          undefined,
          wAccessControlTester.address,
          [
            {
              functionSelector: selectorA,
              account: regularAccounts[0].address,
              enabled: true,
            },
            {
              functionSelector: selectorB,
              account: regularAccounts[0].address,
              enabled: true,
            },
          ],
          {
            revertCustomError: {
              customErrorName: 'FunctionSelectorMismatch',
            },
          },
        );
      });

      it('when caller has both roles and master has shorter delay - can batch mixed selectors', async () => {
        const {
          accessControl,
          owner,
          regularAccounts,
          roles,
          timelock,
          timelockManager,
          wAccessControlTester,
        } = await loadFixture(defaultDeploy);

        const selectorA = encodeFnSelector('withOnlyRole(bytes32,bool)');
        const selectorB = encodeFnSelector('withOnlyContractAdmin()');
        const masterRole = roles.common.greenlistedOperator;
        const account = regularAccounts[0].address;

        await wAccessControlTester.setContractAdminRole(masterRole);

        const operatorRoleKey = await accessControl.grantOperatorRoleKey(
          masterRole,
          wAccessControlTester.address,
          selectorA,
        );

        await setGrantOperatorRoleTester(
          { accessControl, owner },
          wAccessControlTester.address,
          [
            {
              functionSelector: selectorA,
              operator: owner.address,
              enabled: true,
            },
          ],
        );

        await setRoleTimelocksTester(
          { timelockManager, timelock, owner, accessControl },
          [operatorRoleKey],
          [3600],
        );

        await setPermissionRoleMultTester(
          { accessControl, owner },
          undefined,
          wAccessControlTester.address,
          [
            {
              functionSelector: selectorA,
              account,
              enabled: true,
            },
            {
              functionSelector: selectorB,
              account,
              enabled: true,
            },
          ],
        );

        expect(
          await accessControl[
            'hasFunctionPermission(bytes32,address,bytes4,address)'
          ](masterRole, wAccessControlTester.address, selectorA, account),
        ).eq(true);
        expect(
          await accessControl[
            'hasFunctionPermission(bytes32,address,bytes4,address)'
          ](masterRole, wAccessControlTester.address, selectorB, account),
        ).eq(true);
      });
    });

    describe('with timelock', () => {
      const encodeSetPermissionRoleMult = (
        accessControl: MidasAccessControl,
        target: string,
        params: {
          functionSelector: string;
          account: string;
          enabled: boolean;
          delay?: number;
        }[],
      ) =>
        accessControl.interface.encodeFunctionData(
          'setPermissionRoleMult(address,(bytes4,address,uint32,bool)[])',
          [
            target,
            params.map((param) => [
              param.functionSelector,
              param.account,
              param.delay ?? 0,
              param.enabled,
            ]),
          ],
        );

      const scheduleAndExecuteSetPermissionRoleMult = async (
        {
          accessControl,
          owner,
          timelock,
          timelockManager,
        }: {
          accessControl: MidasAccessControl;
          owner: SignerWithAddress;
          timelock: MidasAccessControlTimelockController;
          timelockManager: MidasTimelockManager;
        },
        data: string,
        delay: number,
        from: SignerWithAddress,
      ) => {
        await bulkScheduleTimelockOperationTester(
          { timelockManager, timelock, owner, accessControl },
          [accessControl.address],
          [data],
          {},
          { from },
        );

        await increase(delay);

        await executeTimelockOperationTester(
          { timelockManager, timelock, owner, accessControl },
          accessControl.address,
          data,
          from.address,
          { from: owner },
        );
      };

      it('when caller has master role but not operator role - schedule and execute', async () => {
        const {
          accessControl,
          owner,
          regularAccounts,
          roles,
          timelock,
          timelockManager,
          wAccessControlTester,
        } = await loadFixture(defaultDeploy);

        const selector = encodeFnSelector('setGreenlistEnable(bool)');
        const masterRole = roles.common.greenlistedOperator;
        const delay = 3600;
        const permissionAccount = regularAccounts[0].address;

        await wAccessControlTester.setContractAdminRole(masterRole);

        await setRoleTimelocksTester(
          { timelockManager, timelock, owner, accessControl },
          [masterRole],
          [delay],
        );

        expect(await accessControl.hasRole(masterRole, owner.address)).eq(true);
        expect(
          await accessControl[
            'isFunctionAccessGrantOperator(bytes32,address,bytes4,address)'
          ](masterRole, wAccessControlTester.address, selector, owner.address),
        ).eq(false);

        const data = encodeSetPermissionRoleMult(
          accessControl,
          wAccessControlTester.address,
          [
            {
              functionSelector: selector,
              account: permissionAccount,
              enabled: true,
            },
          ],
        );

        const [roleUsed] = await timelockManager.getTargetRole(
          accessControl.address,
          data,
          owner.address,
        );
        expect(roleUsed).eq(masterRole);

        await scheduleAndExecuteSetPermissionRoleMult(
          { accessControl, owner, timelock, timelockManager },
          data,
          delay,
          owner,
        );

        expect(
          await accessControl[
            'hasFunctionPermission(bytes32,address,bytes4,address)'
          ](
            masterRole,
            wAccessControlTester.address,
            selector,
            permissionAccount,
          ),
        ).eq(true);
      });

      it('when caller has operator role but not master role - schedule and execute', async () => {
        const {
          accessControl,
          owner,
          regularAccounts,
          roles,
          timelock,
          timelockManager,
          wAccessControlTester,
        } = await loadFixture(defaultDeploy);

        const selector = encodeFnSelector('setGreenlistEnable(bool)');
        const masterRole = roles.common.greenlistedOperator;
        const operator = regularAccounts[0];
        const delay = 3600;
        const permissionAccount = regularAccounts[1].address;

        await wAccessControlTester.setContractAdminRole(masterRole);

        await setGrantOperatorRoleTester(
          { accessControl, owner },
          wAccessControlTester.address,
          [
            {
              functionSelector: selector,
              operator: operator.address,
              enabled: true,
            },
          ],
        );

        const operatorRoleKey = await accessControl.grantOperatorRoleKey(
          masterRole,
          wAccessControlTester.address,
          selector,
        );

        await setRoleTimelocksTester(
          { timelockManager, timelock, owner, accessControl },
          [operatorRoleKey],
          [delay],
        );
        await setRoleTimelocksTester(
          { timelockManager, timelock, owner, accessControl },
          [masterRole],
          [7200],
        );

        expect(await accessControl.hasRole(masterRole, operator.address)).eq(
          false,
        );
        expect(
          await accessControl[
            'isFunctionAccessGrantOperator(bytes32,address,bytes4,address)'
          ](
            masterRole,
            wAccessControlTester.address,
            selector,
            operator.address,
          ),
        ).eq(true);

        const data = encodeSetPermissionRoleMult(
          accessControl,
          wAccessControlTester.address,
          [
            {
              functionSelector: selector,
              account: permissionAccount,
              enabled: true,
            },
          ],
        );

        const [roleUsed] = await timelockManager.getTargetRole(
          accessControl.address,
          data,
          operator.address,
        );
        expect(roleUsed).eq(operatorRoleKey);

        await scheduleAndExecuteSetPermissionRoleMult(
          { accessControl, owner, timelock, timelockManager },
          data,
          delay,
          operator,
        );

        expect(
          await accessControl[
            'hasFunctionPermission(bytes32,address,bytes4,address)'
          ](
            masterRole,
            wAccessControlTester.address,
            selector,
            permissionAccount,
          ),
        ).eq(true);
      });

      it('when caller has both roles with the same delay - schedule and execute', async () => {
        const {
          accessControl,
          owner,
          regularAccounts,
          roles,
          timelock,
          timelockManager,
          wAccessControlTester,
        } = await loadFixture(defaultDeploy);

        const selector = encodeFnSelector('setGreenlistEnable(bool)');
        const masterRole = roles.common.greenlistedOperator;
        const delay = 3600;
        const permissionAccount = regularAccounts[0].address;

        await wAccessControlTester.setContractAdminRole(masterRole);

        const operatorRoleKey = await accessControl.grantOperatorRoleKey(
          masterRole,
          wAccessControlTester.address,
          selector,
        );

        await setGrantOperatorRoleTester(
          { accessControl, owner },
          wAccessControlTester.address,
          [
            {
              functionSelector: selector,
              operator: owner.address,
              enabled: true,
            },
          ],
        );

        await setRoleTimelocksTester(
          { timelockManager, timelock, owner, accessControl },
          [operatorRoleKey, masterRole],
          [delay, delay],
        );

        const data = encodeSetPermissionRoleMult(
          accessControl,
          wAccessControlTester.address,
          [
            {
              functionSelector: selector,
              account: permissionAccount,
              enabled: true,
            },
          ],
        );

        // equal delays → resolveAccessRole prefers master (rootDelay <= functionDelay)
        const [roleUsed] = await timelockManager.getTargetRole(
          accessControl.address,
          data,
          owner.address,
        );
        expect(roleUsed).eq(masterRole);

        await scheduleAndExecuteSetPermissionRoleMult(
          { accessControl, owner, timelock, timelockManager },
          data,
          delay,
          owner,
        );

        expect(
          await accessControl[
            'hasFunctionPermission(bytes32,address,bytes4,address)'
          ](
            masterRole,
            wAccessControlTester.address,
            selector,
            permissionAccount,
          ),
        ).eq(true);
      });

      it('when caller has both roles and master has shorter delay - uses master role delay', async () => {
        const {
          accessControl,
          owner,
          regularAccounts,
          roles,
          timelock,
          timelockManager,
          wAccessControlTester,
        } = await loadFixture(defaultDeploy);

        const selector = encodeFnSelector('setGreenlistEnable(bool)');
        const masterRole = roles.common.greenlistedOperator;
        const masterDelay = 3600;
        const operatorDelay = 7200;
        const permissionAccount = regularAccounts[0].address;

        await wAccessControlTester.setContractAdminRole(masterRole);

        const operatorRoleKey = await accessControl.grantOperatorRoleKey(
          masterRole,
          wAccessControlTester.address,
          selector,
        );

        await setGrantOperatorRoleTester(
          { accessControl, owner },
          wAccessControlTester.address,
          [
            {
              functionSelector: selector,
              operator: owner.address,
              enabled: true,
            },
          ],
        );

        await setRoleTimelocksTester(
          { timelockManager, timelock, owner, accessControl },
          [masterRole, operatorRoleKey],
          [masterDelay, operatorDelay],
        );

        const data = encodeSetPermissionRoleMult(
          accessControl,
          wAccessControlTester.address,
          [
            {
              functionSelector: selector,
              account: permissionAccount,
              enabled: true,
            },
          ],
        );

        const [roleUsed] = await timelockManager.getTargetRole(
          accessControl.address,
          data,
          owner.address,
        );
        expect(roleUsed).eq(masterRole);

        await scheduleAndExecuteSetPermissionRoleMult(
          { accessControl, owner, timelock, timelockManager },
          data,
          masterDelay,
          owner,
        );

        expect(
          await accessControl[
            'hasFunctionPermission(bytes32,address,bytes4,address)'
          ](
            masterRole,
            wAccessControlTester.address,
            selector,
            permissionAccount,
          ),
        ).eq(true);
      });

      it('when caller has both roles and operator has shorter delay - uses operator role delay', async () => {
        const {
          accessControl,
          owner,
          regularAccounts,
          roles,
          timelock,
          timelockManager,
          wAccessControlTester,
        } = await loadFixture(defaultDeploy);

        const selector = encodeFnSelector('setGreenlistEnable(bool)');
        const masterRole = roles.common.greenlistedOperator;
        const masterDelay = 7200;
        const operatorDelay = 3600;
        const permissionAccount = regularAccounts[0].address;

        await wAccessControlTester.setContractAdminRole(masterRole);

        const operatorRoleKey = await accessControl.grantOperatorRoleKey(
          masterRole,
          wAccessControlTester.address,
          selector,
        );

        await setGrantOperatorRoleTester(
          { accessControl, owner },
          wAccessControlTester.address,
          [
            {
              functionSelector: selector,
              operator: owner.address,
              enabled: true,
            },
          ],
        );

        await setRoleTimelocksTester(
          { timelockManager, timelock, owner, accessControl },
          [masterRole, operatorRoleKey],
          [masterDelay, operatorDelay],
        );

        const data = encodeSetPermissionRoleMult(
          accessControl,
          wAccessControlTester.address,
          [
            {
              functionSelector: selector,
              account: permissionAccount,
              enabled: true,
            },
          ],
        );

        const [roleUsed] = await timelockManager.getTargetRole(
          accessControl.address,
          data,
          owner.address,
        );
        expect(roleUsed).eq(operatorRoleKey);

        await scheduleAndExecuteSetPermissionRoleMult(
          { accessControl, owner, timelock, timelockManager },
          data,
          operatorDelay,
          owner,
        );

        expect(
          await accessControl[
            'hasFunctionPermission(bytes32,address,bytes4,address)'
          ](
            masterRole,
            wAccessControlTester.address,
            selector,
            permissionAccount,
          ),
        ).eq(true);
      });

      it('when master schedules multi-selector batch - schedule and execute', async () => {
        const {
          accessControl,
          owner,
          regularAccounts,
          roles,
          timelock,
          timelockManager,
          wAccessControlTester,
        } = await loadFixture(defaultDeploy);

        const selectorA = encodeFnSelector('withOnlyRole(bytes32,bool)');
        const selectorB = encodeFnSelector('withOnlyContractAdmin()');
        const masterRole = roles.common.greenlistedOperator;
        const delay = 3600;
        const account = regularAccounts[0].address;

        await wAccessControlTester.setContractAdminRole(masterRole);

        await setRoleTimelocksTester(
          { timelockManager, timelock, owner, accessControl },
          [masterRole],
          [delay],
        );

        const data = encodeSetPermissionRoleMult(
          accessControl,
          wAccessControlTester.address,
          [
            {
              functionSelector: selectorA,
              account,
              enabled: true,
            },
            {
              functionSelector: selectorB,
              account,
              enabled: true,
            },
          ],
        );

        const [roleUsed] = await timelockManager.getTargetRole(
          accessControl.address,
          data,
          owner.address,
        );
        expect(roleUsed).eq(masterRole);

        await scheduleAndExecuteSetPermissionRoleMult(
          { accessControl, owner, timelock, timelockManager },
          data,
          delay,
          owner,
        );

        expect(
          await accessControl[
            'hasFunctionPermission(bytes32,address,bytes4,address)'
          ](masterRole, wAccessControlTester.address, selectorA, account),
        ).eq(true);
        expect(
          await accessControl[
            'hasFunctionPermission(bytes32,address,bytes4,address)'
          ](masterRole, wAccessControlTester.address, selectorB, account),
        ).eq(true);
      });

      it('when operator schedules mixed-selector batch - should fail on execute', async () => {
        const {
          accessControl,
          owner,
          regularAccounts,
          roles,
          timelock,
          timelockManager,
          wAccessControlTester,
        } = await loadFixture(defaultDeploy);

        const selectorA = encodeFnSelector('withOnlyRole(bytes32,bool)');
        const selectorB = encodeFnSelector('withOnlyContractAdmin()');
        const masterRole = roles.common.greenlistedOperator;
        const operator = regularAccounts[0];
        const delay = 3600;
        const account = regularAccounts[1].address;

        await wAccessControlTester.setContractAdminRole(masterRole);

        await setGrantOperatorRoleTester(
          { accessControl, owner },
          wAccessControlTester.address,
          [
            {
              functionSelector: selectorA,
              operator: operator.address,
              enabled: true,
            },
          ],
        );

        const operatorRoleKey = await accessControl.grantOperatorRoleKey(
          masterRole,
          wAccessControlTester.address,
          selectorA,
        );

        await setRoleTimelocksTester(
          { timelockManager, timelock, owner, accessControl },
          [operatorRoleKey],
          [delay],
        );
        await setRoleTimelocksTester(
          { timelockManager, timelock, owner, accessControl },
          [masterRole],
          [7200],
        );

        const data = encodeSetPermissionRoleMult(
          accessControl,
          wAccessControlTester.address,
          [
            {
              functionSelector: selectorA,
              account,
              enabled: true,
            },
            {
              functionSelector: selectorB,
              account,
              enabled: true,
            },
          ],
        );

        const [roleUsed] = await timelockManager.getTargetRole(
          accessControl.address,
          data,
          operator.address,
        );
        expect(roleUsed).eq(operatorRoleKey);

        await bulkScheduleTimelockOperationTester(
          { timelockManager, timelock, owner, accessControl },
          [accessControl.address],
          [data],
          {},
          { from: operator },
        );

        await increase(delay);

        await executeTimelockOperationTester(
          { timelockManager, timelock, owner, accessControl },
          accessControl.address,
          data,
          operator.address,
          {
            from: owner,
            revertMessage:
              'TimelockController: underlying transaction reverted',
          },
        );

        expect(
          await accessControl[
            'hasFunctionPermission(bytes32,address,bytes4,address)'
          ](masterRole, wAccessControlTester.address, selectorA, account),
        ).eq(false);
        expect(
          await accessControl[
            'hasFunctionPermission(bytes32,address,bytes4,address)'
          ](masterRole, wAccessControlTester.address, selectorB, account),
        ).eq(false);
      });
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
        undefined,
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

      const data = accessControl.interface.encodeFunctionData(
        'grantRole(bytes32,address)',
        [roles.common.blacklisted, regularAccounts[0].address],
      );

      await bulkScheduleTimelockOperationTester(
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

    it('when delay is not NULL_DELAY but actual delay is NULL_DELAY - should set the delay', async () => {
      const { accessControl, owner, regularAccounts, roles } =
        await loadFixture(defaultDeploy);

      await grantRoleTester(
        { accessControl, owner },
        roles.common.blacklisted,
        regularAccounts[0].address,
        3600,
      );
    });

    it('should fail: when delay is not NULL_DELAY but actual delay is also not null', async () => {
      const { accessControl, owner, regularAccounts, roles } =
        await loadFixture(defaultDeploy);

      await grantRoleTester(
        { accessControl, owner },
        roles.common.blacklisted,
        regularAccounts[0].address,
        3600,
      );

      await grantRoleTester(
        { accessControl, owner },
        roles.common.blacklisted,
        regularAccounts[1].address,
        7200,
        { revertCustomError: { customErrorName: 'DelayIsAlreadySet' } },
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

      await bulkScheduleTimelockOperationTester(
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
      // Locks in that _validateRevokeRole uses the resolved proposer (actualSender),
      // not msg.sender. If it compared against the timelock address, self-revoke
      // via timelock would incorrectly succeed.
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

      await bulkScheduleTimelockOperationTester(
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

      expect(
        await accessControl.hasRole(roles.common.defaultAdmin, owner.address),
      ).eq(true);
    });

    it('when revoking DEFAULT_ADMIN_ROLE from another admin via timelock - succeeds', async () => {
      const {
        accessControl,
        owner,
        regularAccounts,
        roles,
        timelock,
        timelockManager,
      } = await loadFixture(defaultDeploy);

      const otherAdmin = regularAccounts[0];

      await grantRoleTester(
        { accessControl, owner },
        roles.common.defaultAdmin,
        otherAdmin.address,
      );

      await setRoleTimelocksTester(
        { timelockManager, timelock, owner, accessControl },
        [roles.common.defaultAdmin],
        [3600],
      );

      const data = accessControl.interface.encodeFunctionData('revokeRole', [
        roles.common.defaultAdmin,
        otherAdmin.address,
      ]);

      await bulkScheduleTimelockOperationTester(
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

      expect(
        await accessControl.hasRole(
          roles.common.defaultAdmin,
          otherAdmin.address,
        ),
      ).eq(false);
      expect(
        await accessControl.hasRole(roles.common.defaultAdmin, owner.address),
      ).eq(true);
    });
  });

  describe('setRoleDelayMult()', () => {
    it('should set role delays', async () => {
      const { timelockManager, timelock, owner, accessControl } =
        await loadFixture(defaultDeploy);

      await setRoleTimelocksTester(
        { timelockManager, timelock, owner, accessControl },
        [constants.HashZero],
        [7200],
      );
    });

    it('should fail: when params array is empty', async () => {
      const { timelockManager, timelock, owner, accessControl } =
        await loadFixture(defaultDeploy);

      await setRoleTimelocksTester(
        { timelockManager, timelock, owner, accessControl },
        [],
        [],
        {
          revertCustomError: {
            customErrorName: 'EmptyArray',
          },
        },
      );
    });

    it('should fail: when caller do not have DEFAULT_ADMIN_ROLE', async () => {
      const {
        timelockManager,
        timelock,
        owner,
        accessControl,
        regularAccounts,
      } = await loadFixture(defaultDeploy);

      await setRoleTimelocksTester(
        { timelockManager, timelock, owner, accessControl },
        [constants.HashZero],
        [3600],
        {
          revertCustomError: acErrors.WMAC_HASNT_PERMISSION(
            undefined,
            timelockManager,
          ),
          from: regularAccounts[0],
        },
      );
    });
  });

  describe('setDefaultDelay()', () => {
    it('should require 2 days timelock, even if role timelock is different', async () => {
      const { timelockManager, timelock, owner, accessControl, roles } =
        await loadFixture(defaultDeploy);

      const defaultAdminRole = roles.common.defaultAdmin;
      const newDelay = 7200;

      await setRoleTimelocksTester(
        { owner, accessControl, timelockManager, timelock },
        [defaultAdminRole],
        [3600],
      );

      const calldata = accessControl.interface.encodeFunctionData(
        'setDefaultDelay',
        [newDelay],
      );

      await bulkScheduleTimelockOperationTester(
        { timelockManager, timelock, owner, accessControl },
        [accessControl.address],
        [calldata],
      );
      await increase(DELAY_FOR_SET_DEFAULT_DELAY);
      await executeTimelockOperationTester(
        { timelockManager, timelock, owner, accessControl },
        accessControl.address,
        calldata,
        owner.address,
      );
    });

    it('should fail: when called from a wallet without default admin role', async () => {
      const {
        accessControl,
        owner,
        timelock,
        timelockManager,
        regularAccounts,
      } = await loadFixture(defaultDeploy);

      await setDefaultDelayTest(
        { owner, accessControl, timelock, timelockManager },
        7200,
        {
          revertCustomError: {
            customErrorName: 'NoFunctionPermission',
          },
          from: regularAccounts[0],
        },
      );
    });

    it('should fail: when called from a function admin role', async () => {
      const {
        timelockManager,
        timelock,
        owner,
        accessControl,
        regularAccounts,
        roles,
      } = await loadFixture(defaultDeploy);

      const defaultAdminRole = roles.common.defaultAdmin;

      await setupGrantOperatorRole({
        accessControl,
        owner,
        masterRole: defaultAdminRole,
        targetContract: accessControl.address,
        functionSelector: setDefaultDelaySelector,
        grantOperator: owner,
      });

      await setPermissionRoleTester(
        { accessControl, owner },
        undefined,
        accessControl.address,
        setDefaultDelaySelector,
        [{ account: regularAccounts[0].address, enabled: true }],
      );

      await setDefaultDelayTest(
        { timelockManager, timelock, owner, accessControl },
        7200,
        {
          revertCustomError: {
            customErrorName: 'NoFunctionPermission',
          },
          from: regularAccounts[0],
        },
      );
    });

    it('should fail: when called directly without timelock', async () => {
      const { timelockManager, timelock, owner, accessControl, roles } =
        await loadFixture(defaultDeploy);

      await setDefaultDelayTest(
        { timelockManager, timelock, owner, accessControl },
        7200,
        {
          revertCustomError: {
            contract: accessControl,
            customErrorName: 'SenderIsNotTimelock',
          },
        },
      );
    });
  });

  describe('defaultDelay()', () => {
    it('should return default timelock delay', async () => {
      const { accessControl } = await loadFixture(defaultDeploy);

      await accessControl.setDefaultDelayTest(3600);

      expect(await accessControl.defaultDelay()).to.eq(3600);
    });
  });

  describe('getRoleTimelockDelay()', () => {
    it('should return default delay when role delay is not set', async () => {
      const { accessControl } = await loadFixture(defaultDeploy);

      await accessControl.setDefaultDelayTest(3600);

      const [delay, isDefault] = await accessControl.getRoleTimelockDelay(
        constants.HashZero,
        0,
      );

      expect(delay).to.eq(3600);
      expect(isDefault).to.eq(true);
    });

    it('should return default delay when override delay is 0 and role delay is not set', async () => {
      const { accessControl } = await loadFixture(defaultDeploy);

      await accessControl.setDefaultDelayTest(3600);

      const [delay, isDefault] = await accessControl.getRoleTimelockDelay(
        constants.HashZero,
        0,
      );

      expect(delay).to.eq(3600);
      expect(isDefault).to.eq(true);
    });

    it('should return override delay if its not zero if role delay is not set', async () => {
      const { accessControl } = await loadFixture(defaultDeploy);

      await accessControl.setDefaultDelayTest(3600);

      const [delay, isDefault] = await accessControl.getRoleTimelockDelay(
        constants.HashZero,
        1,
      );

      expect(delay).to.eq(1);
      expect(isDefault).to.eq(false);
    });

    it('should return override delay if its not zero if role delay is set', async () => {
      const { timelockManager, timelock, owner, accessControl } =
        await loadFixture(defaultDeploy);

      await accessControl.setDefaultDelayTest(3600);

      await setRoleTimelocksAndExecute(
        { timelockManager, timelock, owner, accessControl },
        [{ role: constants.HashZero, delay: 1 }],
      );

      const [delay, isDefault] = await accessControl.getRoleTimelockDelay(
        constants.HashZero,
        2,
      );

      expect(delay).to.eq(2);
      expect(isDefault).to.eq(false);
    });

    it('should return 0 if override delay is NO_DELAY (uint256.max)', async () => {
      const { accessControl } = await loadFixture(defaultDeploy);

      await accessControl.setDefaultDelayTest(3600);

      const [delay, isDefault] = await accessControl.getRoleTimelockDelay(
        constants.HashZero,
        NO_DELAY,
      );

      expect(delay).to.eq(0);
      expect(isDefault).to.eq(false);
    });

    it('should return configured delay when role delay is set', async () => {
      const { timelockManager, timelock, owner, accessControl } =
        await loadFixture(defaultDeploy);

      await setRoleTimelocksTester(
        { timelockManager, timelock, owner, accessControl },
        [constants.HashZero],
        [7200],
      );

      const [delay, isDefault] = await accessControl.getRoleTimelockDelay(
        constants.HashZero,
        0,
      );

      expect(delay).to.eq(7200);
      expect(isDefault).to.eq(false);
    });

    it('should return zero delay when role delay is max uint256', async () => {
      const { timelockManager, timelock, owner, accessControl } =
        await loadFixture(defaultDeploy);

      await setRoleTimelocksTester(
        { timelockManager, timelock, owner, accessControl },
        [constants.HashZero],
        [NO_DELAY],
      );

      const [delay, isDefault] = await accessControl.getRoleTimelockDelay(
        constants.HashZero,
        0,
      );

      expect(delay).to.eq(0);
      expect(isDefault).to.eq(false);
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
    it('should fail: when call from address without role', async () => {
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

    it('when validateFunctionRole is false and caller has root admin role', async () => {
      const { wAccessControlTester, roles } = await loadFixture(defaultDeploy);

      await expect(
        wAccessControlTester.withOnlyRole(roles.common.defaultAdmin, false),
      ).not.reverted;
    });

    it('should fail: when role is timelocked and trying to call the function directly', async () => {
      const {
        accessControl,
        wAccessControlTester,
        owner,
        regularAccounts,
        roles,
        timelockManager,
        timelock,
      } = await loadFixture(defaultDeploy);

      const adminRole = roles.common.defaultAdmin;

      const { wacFunctionKey, timelockManagerFunctionKey } =
        await setupWithOnlyRolePermission(
          accessControl,
          owner,
          wAccessControlTester,
          timelockManager,
          adminRole,
          regularAccounts[0].address,
        );

      await setRoleTimelocksTester(
        { timelockManager, timelock, owner, accessControl },
        [wacFunctionKey, timelockManagerFunctionKey],
        [3600, 3600],
      );

      await expect(
        wAccessControlTester
          .connect(regularAccounts[0])
          .withOnlyRole(adminRole, true),
      ).revertedWithCustomError(accessControl, 'SenderIsNotTimelock');
    });

    it('should fail: when validateFunctionRole is false but trying to call with function admin', async () => {
      const {
        accessControl,
        wAccessControlTester,
        owner,
        regularAccounts,
        roles,
        timelockManager,
      } = await loadFixture(defaultDeploy);

      const adminRole = roles.common.defaultAdmin;

      await setupWithOnlyRolePermission(
        accessControl,
        owner,
        wAccessControlTester,
        timelockManager,
        adminRole,
        regularAccounts[0].address,
      );

      await expect(
        wAccessControlTester
          .connect(regularAccounts[0])
          .withOnlyRole(adminRole, false),
      ).revertedWithCustomError(
        wAccessControlTester,
        acErrors.WMAC_HASNT_PERMISSION().customErrorName,
      );
    });

    it('when validateFunctionRole is true and trying to call with function admin and there is no timelock', async () => {
      const {
        accessControl,
        wAccessControlTester,
        owner,
        regularAccounts,
        roles,
        timelockManager,
      } = await loadFixture(defaultDeploy);

      const adminRole = roles.common.defaultAdmin;

      await setupWithOnlyRolePermission(
        accessControl,
        owner,
        wAccessControlTester,
        timelockManager,
        adminRole,
        regularAccounts[0].address,
      );

      await expect(
        wAccessControlTester
          .connect(regularAccounts[0])
          .withOnlyRole(adminRole, true),
      ).not.reverted;
    });

    it('when validateFunctionRole is true and trying to call with function admin and there is timelock on function role', async () => {
      const {
        accessControl,
        wAccessControlTester,
        owner,
        regularAccounts,
        roles,
        timelockManager,
        timelock,
      } = await loadFixture(defaultDeploy);

      const adminRole = roles.common.defaultAdmin;

      const { wacFunctionKey, timelockManagerFunctionKey } =
        await setupWithOnlyRolePermission(
          accessControl,
          owner,
          wAccessControlTester,
          timelockManager,
          adminRole,
          regularAccounts[0].address,
        );

      await setRoleTimelocksTester(
        { timelockManager, timelock, owner, accessControl },
        [wacFunctionKey, timelockManagerFunctionKey],
        [3600, 3600],
      );

      const calldata = wAccessControlTester.interface.encodeFunctionData(
        'withOnlyRole',
        [adminRole, true],
      );

      await bulkScheduleTimelockOperationTester(
        { timelockManager, timelock, owner, accessControl },
        [wAccessControlTester.address],
        [calldata],
        {},
        { from: regularAccounts[0] },
      );

      await increase(3600);

      await executeTimelockOperationTester(
        { timelockManager, timelock, owner, accessControl },
        wAccessControlTester.address,
        calldata,
        regularAccounts[0].address,
      );
    });

    it('when validateFunctionRole is true and trying to call with function admin and there is timelock on root role', async () => {
      const {
        accessControl,
        wAccessControlTester,
        owner,
        regularAccounts,
        roles,
        timelockManager,
        timelock,
      } = await loadFixture(defaultDeploy);

      const adminRole = roles.common.defaultAdmin;

      await grantRoleTester(
        { accessControl, owner },
        adminRole,
        regularAccounts[0].address,
      );

      await setRoleTimelocksTester(
        { timelockManager, timelock, owner, accessControl },
        [adminRole],
        [3600],
      );

      const calldata = wAccessControlTester.interface.encodeFunctionData(
        'withOnlyRole',
        [adminRole, true],
      );

      await bulkScheduleTimelockOperationTester(
        { timelockManager, timelock, owner, accessControl },
        [wAccessControlTester.address],
        [calldata],
        {},
        { from: regularAccounts[0] },
      );

      await increase(3600);

      await executeTimelockOperationTester(
        { timelockManager, timelock, owner, accessControl },
        wAccessControlTester.address,
        calldata,
        regularAccounts[0].address,
      );
    });

    it('when validateFunctionRole is true, caller has both function admin and root roles, delay is on both - it should select role with lower delay', async () => {
      const {
        accessControl,
        wAccessControlTester,
        owner,
        regularAccounts,
        roles,
        timelockManager,
        timelock,
      } = await loadFixture(defaultDeploy);

      const adminRole = roles.common.defaultAdmin;

      await grantRoleTester(
        { accessControl, owner },
        adminRole,
        regularAccounts[0].address,
      );

      const { wacFunctionKey, timelockManagerFunctionKey } =
        await setupWithOnlyRolePermission(
          accessControl,
          owner,
          wAccessControlTester,
          timelockManager,
          adminRole,
          regularAccounts[0].address,
        );

      await setRoleTimelocksTester(
        { timelockManager, timelock, owner, accessControl },
        [adminRole, wacFunctionKey, timelockManagerFunctionKey],
        [7200, 3600, 3600],
      );

      const calldata = wAccessControlTester.interface.encodeFunctionData(
        'withOnlyRole',
        [adminRole, true],
      );

      await bulkScheduleTimelockOperationTester(
        { timelockManager, timelock, owner, accessControl },
        [wAccessControlTester.address],
        [calldata],
        {},
        { from: regularAccounts[0] },
      );

      await increase(3600);

      await executeTimelockOperationTester(
        { timelockManager, timelock, owner, accessControl },
        wAccessControlTester.address,
        calldata,
        regularAccounts[0].address,
      );

      await bulkScheduleTimelockOperationTester(
        { timelockManager, timelock, owner, accessControl },
        [wAccessControlTester.address],
        [calldata],
        {},
        { from: regularAccounts[0] },
      );

      await increase(1);

      await executeTimelockOperationTester(
        { timelockManager, timelock, owner, accessControl },
        wAccessControlTester.address,
        calldata,
        regularAccounts[0].address,
        timelockManagerRevertOpts(timelockManager, 'TimelockOperationNotReady'),
      );

      await increase(3599);

      await executeTimelockOperationTester(
        { timelockManager, timelock, owner, accessControl },
        wAccessControlTester.address,
        calldata,
        regularAccounts[0].address,
      );
    });
  });

  describe('modifier onlyContractAdmin', () => {
    const setupContractAdminRole = async (
      wAccessControlTester: WithMidasAccessControlTester,
      adminRole: string,
    ) => {
      await wAccessControlTester.setContractAdminRole(adminRole);
    };

    it('should fail: when call from address without role', async () => {
      const { wAccessControlTester, regularAccounts, roles } =
        await loadFixture(defaultDeploy);

      await setupContractAdminRole(
        wAccessControlTester,
        roles.common.defaultAdmin,
      );

      await expect(
        wAccessControlTester
          .connect(regularAccounts[1])
          .withOnlyContractAdmin(),
      ).revertedWithCustomError(
        wAccessControlTester,
        acErrors.WMAC_HASNT_PERMISSION().customErrorName,
      );
    });

    it('when caller has root admin role', async () => {
      const { wAccessControlTester, roles } = await loadFixture(defaultDeploy);

      await setupContractAdminRole(
        wAccessControlTester,
        roles.common.defaultAdmin,
      );

      await expect(wAccessControlTester.withOnlyContractAdmin()).not.reverted;
    });

    it('should fail: when role is timelocked and trying to call the function directly', async () => {
      const {
        accessControl,
        wAccessControlTester,
        owner,
        regularAccounts,
        roles,
        timelockManager,
        timelock,
      } = await loadFixture(defaultDeploy);

      const adminRole = roles.common.defaultAdmin;
      await setupContractAdminRole(wAccessControlTester, adminRole);

      const { wacFunctionKey, timelockManagerFunctionKey } =
        await setupWithOnlyContractAdminPermission(
          accessControl,
          owner,
          wAccessControlTester,
          timelockManager,
          adminRole,
          regularAccounts[0].address,
        );

      await setRoleTimelocksTester(
        { timelockManager, timelock, owner, accessControl },
        [wacFunctionKey, timelockManagerFunctionKey],
        [3600, 3600],
      );

      await expect(
        wAccessControlTester
          .connect(regularAccounts[0])
          .withOnlyContractAdmin(),
      ).revertedWithCustomError(accessControl, 'SenderIsNotTimelock');
    });

    it('when trying to call with function admin and there is no timelock', async () => {
      const {
        accessControl,
        wAccessControlTester,
        owner,
        regularAccounts,
        roles,
        timelockManager,
      } = await loadFixture(defaultDeploy);

      const adminRole = roles.common.defaultAdmin;
      await setupContractAdminRole(wAccessControlTester, adminRole);

      await setupWithOnlyContractAdminPermission(
        accessControl,
        owner,
        wAccessControlTester,
        timelockManager,
        adminRole,
        regularAccounts[0].address,
      );

      await expect(
        wAccessControlTester
          .connect(regularAccounts[0])
          .withOnlyContractAdmin(),
      ).not.reverted;
    });

    it('when trying to call with function admin and there is timelock on function role', async () => {
      const {
        accessControl,
        wAccessControlTester,
        owner,
        regularAccounts,
        roles,
        timelockManager,
        timelock,
      } = await loadFixture(defaultDeploy);

      const adminRole = roles.common.defaultAdmin;
      await setupContractAdminRole(wAccessControlTester, adminRole);

      const { wacFunctionKey, timelockManagerFunctionKey } =
        await setupWithOnlyContractAdminPermission(
          accessControl,
          owner,
          wAccessControlTester,
          timelockManager,
          adminRole,
          regularAccounts[0].address,
        );

      await setRoleTimelocksTester(
        { timelockManager, timelock, owner, accessControl },
        [wacFunctionKey, timelockManagerFunctionKey],
        [3600, 3600],
      );

      const calldata = wAccessControlTester.interface.encodeFunctionData(
        'withOnlyContractAdmin',
      );

      await bulkScheduleTimelockOperationTester(
        { timelockManager, timelock, owner, accessControl },
        [wAccessControlTester.address],
        [calldata],
        {},
        { from: regularAccounts[0] },
      );

      await increase(3600);

      await executeTimelockOperationTester(
        { timelockManager, timelock, owner, accessControl },
        wAccessControlTester.address,
        calldata,
        regularAccounts[0].address,
      );
    });

    it('when trying to call with function admin and there is timelock on root role', async () => {
      const {
        accessControl,
        wAccessControlTester,
        owner,
        regularAccounts,
        roles,
        timelockManager,
        timelock,
      } = await loadFixture(defaultDeploy);

      const adminRole = roles.common.defaultAdmin;
      await setupContractAdminRole(wAccessControlTester, adminRole);

      await grantRoleTester(
        { accessControl, owner },
        adminRole,
        regularAccounts[0].address,
      );

      await setRoleTimelocksTester(
        { timelockManager, timelock, owner, accessControl },
        [adminRole],
        [3600],
      );

      const calldata = wAccessControlTester.interface.encodeFunctionData(
        'withOnlyContractAdmin',
      );

      await bulkScheduleTimelockOperationTester(
        { timelockManager, timelock, owner, accessControl },
        [wAccessControlTester.address],
        [calldata],
        {},
        { from: regularAccounts[0] },
      );

      await increase(3600);

      await executeTimelockOperationTester(
        { timelockManager, timelock, owner, accessControl },
        wAccessControlTester.address,
        calldata,
        regularAccounts[0].address,
      );
    });

    it('when caller has both function admin and root roles, delay is on both - it should select role with lower delay', async () => {
      const {
        accessControl,
        wAccessControlTester,
        owner,
        regularAccounts,
        roles,
        timelockManager,
        timelock,
      } = await loadFixture(defaultDeploy);

      const adminRole = roles.common.defaultAdmin;
      await setupContractAdminRole(wAccessControlTester, adminRole);

      await grantRoleTester(
        { accessControl, owner },
        adminRole,
        regularAccounts[0].address,
      );

      const { wacFunctionKey, timelockManagerFunctionKey } =
        await setupWithOnlyContractAdminPermission(
          accessControl,
          owner,
          wAccessControlTester,
          timelockManager,
          adminRole,
          regularAccounts[0].address,
        );

      await setRoleTimelocksTester(
        { timelockManager, timelock, owner, accessControl },
        [adminRole, wacFunctionKey, timelockManagerFunctionKey],
        [7200, 3600, 3600],
      );

      const calldata = wAccessControlTester.interface.encodeFunctionData(
        'withOnlyContractAdmin',
      );

      await bulkScheduleTimelockOperationTester(
        { timelockManager, timelock, owner, accessControl },
        [wAccessControlTester.address],
        [calldata],
        {},
        { from: regularAccounts[0] },
      );

      await increase(3600);

      await executeTimelockOperationTester(
        { timelockManager, timelock, owner, accessControl },
        wAccessControlTester.address,
        calldata,
        regularAccounts[0].address,
      );
    });
  });

  describe('modifier onlyRoleNoTimelock', () => {
    it('should fail: when trying to schedule through timelock', async () => {
      const {
        wAccessControlTester,
        owner,
        roles,
        timelockManager,
        timelock,
        accessControl,
      } = await loadFixture(defaultDeploy);

      const adminRole = roles.common.defaultAdmin;
      const calldata = wAccessControlTester.interface.encodeFunctionData(
        'withOnlyRoleNoTimelock',
        [adminRole, true],
      );

      await bulkScheduleTimelockOperationTester(
        { timelockManager, timelock, owner, accessControl },
        [wAccessControlTester.address],
        [calldata],
        {},
        timelockManagerRevertOpts(timelockManager, 'InvalidPreflightError'),
      );
    });

    it('when validateFunctionRole is true and user has only root admin role', async () => {
      const { wAccessControlTester, roles } = await loadFixture(defaultDeploy);

      await expect(
        wAccessControlTester.withOnlyRoleNoTimelock(
          roles.common.defaultAdmin,
          true,
        ),
      ).not.reverted;
    });

    it('when validateFunctionRole is false and user has only root admin role', async () => {
      const { wAccessControlTester, roles } = await loadFixture(defaultDeploy);

      await expect(
        wAccessControlTester.withOnlyRoleNoTimelock(
          roles.common.defaultAdmin,
          false,
        ),
      ).not.reverted;
    });

    it('when validateFunctionRole is true and user has only function admin role', async () => {
      const {
        accessControl,
        wAccessControlTester,
        owner,
        regularAccounts,
        roles,
        timelockManager,
      } = await loadFixture(defaultDeploy);

      const adminRole = roles.common.defaultAdmin;

      await setupFunctionPermissionRole(
        accessControl,
        owner,
        wAccessControlTester,
        timelockManager,
        adminRole,
        withOnlyRoleNoTimelockSelector,
        regularAccounts[0].address,
      );

      await expect(
        wAccessControlTester
          .connect(regularAccounts[0])
          .withOnlyRoleNoTimelock(adminRole, true),
      ).not.reverted;
    });

    it('should fail: when validateFunctionRole is false and user has only function admin role', async () => {
      const {
        accessControl,
        wAccessControlTester,
        owner,
        regularAccounts,
        roles,
        timelockManager,
      } = await loadFixture(defaultDeploy);

      const adminRole = roles.common.defaultAdmin;

      await setupFunctionPermissionRole(
        accessControl,
        owner,
        wAccessControlTester,
        timelockManager,
        adminRole,
        withOnlyRoleNoTimelockSelector,
        regularAccounts[0].address,
      );

      await expect(
        wAccessControlTester
          .connect(regularAccounts[0])
          .withOnlyRoleNoTimelock(adminRole, false),
      ).revertedWithCustomError(
        wAccessControlTester,
        acErrors.WMAC_HASNT_PERMISSION().customErrorName,
      );
    });

    it('when user has both roles', async () => {
      const {
        accessControl,
        wAccessControlTester,
        owner,
        regularAccounts,
        roles,
        timelockManager,
      } = await loadFixture(defaultDeploy);

      const adminRole = roles.common.defaultAdmin;

      await grantRoleTester(
        { accessControl, owner },
        adminRole,
        regularAccounts[0].address,
      );

      await setupFunctionPermissionRole(
        accessControl,
        owner,
        wAccessControlTester,
        timelockManager,
        adminRole,
        withOnlyRoleNoTimelockSelector,
        regularAccounts[0].address,
      );

      await expect(
        wAccessControlTester
          .connect(regularAccounts[0])
          .withOnlyRoleNoTimelock(adminRole, true),
      ).not.reverted;
    });
  });
});
