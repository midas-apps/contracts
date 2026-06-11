import { loadFixture } from '@nomicfoundation/hardhat-network-helpers';
import { increase } from '@nomicfoundation/hardhat-network-helpers/dist/src/helpers/time';
import { days } from '@nomicfoundation/hardhat-network-helpers/dist/src/helpers/time/duration';
import { expect } from 'chai';
import { constants, ethers } from 'ethers';

import { encodeFnSelector } from '../../helpers/utils';
import {
  MidasTimelockManager,
  MidasTimelockManager__factory,
  MidasTimelockManagerTest__factory,
} from '../../typechain-types';
import {
  NO_DELAY,
  setPermissionRoleTester,
  setRoleTimelocksTester,
  setupGrantOperatorRole,
} from '../common/ac.helpers';
import {
  OptionalCommonParams,
  validateImplementation,
} from '../common/common.helpers';
import { defaultDeploy } from '../common/fixtures';
import {
  abortOperationTest,
  executeTimelockOperationTester,
  pauseTimelockOperationTest,
  bulkScheduleTimelockOperationTester,
  setMaxPendingOperationsPerProposerTester,
  setSecurityCouncilTest,
  voteForExecutionTest,
  voteForVetoTest,
} from '../common/timelock-manager.helpers';

const executeTimelockOperationSelector = encodeFnSelector(
  'executeTimelockOperation(address,bytes)',
);

export const timelockManagerRevert = (
  timelockManager: MidasTimelockManager,
  customErrorName: string,
  args?: unknown[],
): OptionalCommonParams => ({
  revertCustomError: {
    contract: timelockManager,
    customErrorName,
    args,
  },
});

describe('MidasTimelockManager', () => {
  it('deployment', async () => {
    const { accessControl, timelockManager, timelock, councilMembers } =
      await loadFixture(defaultDeploy);

    expect(await timelockManager.accessControl()).to.eq(accessControl.address);
    expect(await timelockManager.timelock()).to.eq(timelock.address);
    expect(await timelockManager.councilQuorum(0)).to.eq(3);
    const councilMembersInContract =
      await timelockManager.getSecurityCouncilMembers(0);
    expect(await timelockManager.SECURITY_COUNCIL_MIN_MEMBERS()).to.eq(5);
    expect(councilMembersInContract.length).to.eq(councilMembers.length);

    for (const member of councilMembersInContract) {
      expect(councilMembersInContract.includes(member)).to.eq(true);
    }
    expect(await timelockManager.EXPIRY_PERIOD()).to.eq(days(45));
    expect(await timelockManager.DISPUTE_PERIOD()).to.eq(days(3));
    expect(await timelockManager.MAX_PENDING_OPERATIONS_PER_PROPOSER()).to.eq(
      100,
    );
    expect(await timelockManager.SECURITY_COUNCIL_MAX_MEMBERS()).to.eq(15);
    expect(await timelockManager.SECURITY_COUNCIL_MIN_MEMBERS()).to.eq(5);
    expect(await timelockManager.maxPendingOperationsPerProposer()).to.eq(100);

    await validateImplementation(MidasTimelockManager__factory);
  });

  describe('initializeTimelock()', () => {
    it('should initialize timelock address', async () => {
      const { accessControl, timelock, councilMembers, owner } =
        await loadFixture(defaultDeploy);

      const timelockManager = await new MidasTimelockManagerTest__factory(
        owner,
      ).deploy();

      await timelockManager.initialize(
        accessControl.address,
        100,
        councilMembers.map((v) => v.address),
      );

      await timelockManager.initializeTimelock(timelock.address);

      expect(await timelockManager.timelock()).to.eq(timelock.address);
    });

    it('should fail: when timelock is already set', async () => {
      const { timelockManager, timelock } = await loadFixture(defaultDeploy);

      await expect(
        timelockManager.initializeTimelock(timelock.address),
      ).to.be.revertedWithCustomError(timelockManager, 'TimelockAlreadySet');
    });

    it('should fail: when timelock address is zero', async () => {
      const { accessControl, councilMembers, owner } = await loadFixture(
        defaultDeploy,
      );

      const timelockManager = await new MidasTimelockManagerTest__factory(
        owner,
      ).deploy();

      await timelockManager.initialize(
        accessControl.address,
        100,
        councilMembers.map((v) => v.address),
      );

      await expect(timelockManager.initializeTimelock(constants.AddressZero))
        .to.be.revertedWithCustomError(timelockManager, 'InvalidAddress')
        .withArgs(constants.AddressZero);
    });

    it('should fail: when caller do not have DEFAULT_ADMIN_ROLE', async () => {
      const {
        accessControl,
        timelock,
        councilMembers,
        owner,
        regularAccounts,
      } = await loadFixture(defaultDeploy);

      const timelockManager = await new MidasTimelockManagerTest__factory(
        owner,
      ).deploy();

      await timelockManager.initialize(
        accessControl.address,
        100,
        councilMembers.map((v) => v.address),
      );

      await expect(
        timelockManager
          .connect(regularAccounts[0])
          .initializeTimelock(timelock.address),
      ).to.be.revertedWithCustomError(timelockManager, 'NoFunctionPermission');
    });
  });

  describe('scheduleTimelockOperation()', () => {
    it('should schedule timelock operation', async () => {
      const {
        timelockManager,
        timelock,
        owner,
        accessControl,
        wAccessControlTester,
      } = await loadFixture(defaultDeploy);

      await setRoleTimelocksTester(
        { timelockManager, timelock, owner, accessControl },
        [constants.HashZero],
        [3600],
      );

      await bulkScheduleTimelockOperationTester(
        { timelockManager, timelock, owner, accessControl },
        [wAccessControlTester.address],
        [
          wAccessControlTester.interface.encodeFunctionData(
            'withOnlyContractAdmin',
          ),
        ],
      );
    });

    it('when same target and calldata was executed it can be scheduled again', async () => {
      const {
        timelockManager,
        timelock,
        owner,
        accessControl,
        wAccessControlTester,
      } = await loadFixture(defaultDeploy);

      await setRoleTimelocksTester(
        { timelockManager, timelock, owner, accessControl },
        [constants.HashZero],
        [3600],
      );
      const calldata = wAccessControlTester.interface.encodeFunctionData(
        'withOnlyContractAdmin',
      );
      await bulkScheduleTimelockOperationTester(
        { timelockManager, timelock, owner, accessControl },
        [wAccessControlTester.address],
        [calldata],
      );

      await increase(3600);

      await executeTimelockOperationTester(
        { timelockManager, timelock, owner, accessControl },
        wAccessControlTester.address,
        calldata,
        owner.address,
      );

      await bulkScheduleTimelockOperationTester(
        { timelockManager, timelock, owner, accessControl },
        [wAccessControlTester.address],
        [calldata],
      );
    });

    it('when too many pending operations for a signle proposer but should affect different proposer', async () => {
      const {
        timelockManager,
        timelock,
        owner,
        accessControl,
        wAccessControlTester,
        regularAccounts,
      } = await loadFixture(defaultDeploy);

      await accessControl['grantRole(bytes32,address)'](
        constants.HashZero,
        regularAccounts[0].address,
      );

      await setMaxPendingOperationsPerProposerTester(
        { timelockManager, owner, accessControl, timelock },
        1,
      );

      await setRoleTimelocksTester(
        { timelockManager, timelock, owner, accessControl },
        [constants.HashZero],
        [3600],
      );

      await bulkScheduleTimelockOperationTester(
        { timelockManager, timelock, owner, accessControl },
        [wAccessControlTester.address],
        [
          wAccessControlTester.interface.encodeFunctionData(
            'withOnlyContractAdmin',
          ),
        ],
      );

      await bulkScheduleTimelockOperationTester(
        { timelockManager, timelock, owner, accessControl },
        [accessControl.address],
        [
          accessControl.interface.encodeFunctionData(
            'grantRole(bytes32,address)',
            [constants.HashZero, wAccessControlTester.address],
          ),
        ],
        {},
        {
          from: regularAccounts[0],
        },
      );
    });

    it('should fail: when same target and calldata is pending and not yet executed', async () => {
      const {
        timelockManager,
        timelock,
        owner,
        accessControl,
        wAccessControlTester,
      } = await loadFixture(defaultDeploy);

      await setRoleTimelocksTester(
        { timelockManager, timelock, owner, accessControl },
        [constants.HashZero],
        [3600],
      );

      const calldata = wAccessControlTester.interface.encodeFunctionData(
        'withOnlyContractAdmin',
      );

      await bulkScheduleTimelockOperationTester(
        { timelockManager, timelock, owner, accessControl },
        [wAccessControlTester.address],
        [calldata],
      );

      await bulkScheduleTimelockOperationTester(
        { timelockManager, timelock, owner, accessControl },
        [wAccessControlTester.address],
        [calldata],
        {},
        timelockManagerRevert(timelockManager, 'OperationAlreadyPending'),
      );
    });

    it('should fail: when same target and calldata is pending from another proposer', async () => {
      const {
        timelockManager,
        timelock,
        owner,
        accessControl,
        wAccessControlTester,
        regularAccounts,
      } = await loadFixture(defaultDeploy);

      await accessControl['grantRole(bytes32,address)'](
        constants.HashZero,
        regularAccounts[0].address,
      );

      await setRoleTimelocksTester(
        { timelockManager, timelock, owner, accessControl },
        [constants.HashZero],
        [3600],
      );

      const calldata = wAccessControlTester.interface.encodeFunctionData(
        'withOnlyContractAdmin',
      );

      await bulkScheduleTimelockOperationTester(
        { timelockManager, timelock, owner, accessControl },
        [wAccessControlTester.address],
        [calldata],
      );

      await bulkScheduleTimelockOperationTester(
        { timelockManager, timelock, owner, accessControl },
        [wAccessControlTester.address],
        [calldata],
        {},
        {
          ...timelockManagerRevert(timelockManager, 'OperationAlreadyPending'),
          from: regularAccounts[0],
        },
      );
    });

    it('should fail: when role do not have timelock delay', async () => {
      const {
        timelockManager,
        timelock,
        owner,
        accessControl,
        wAccessControlTester,
      } = await loadFixture(defaultDeploy);

      await bulkScheduleTimelockOperationTester(
        { timelockManager, timelock, owner, accessControl },
        [wAccessControlTester.address],
        [
          wAccessControlTester.interface.encodeFunctionData(
            'withOnlyContractAdmin',
          ),
        ],
        {},
        timelockManagerRevert(timelockManager, 'NoTimelockDelayForRole'),
      );
    });

    it('should fail: when too many pending operations for a signle proposer', async () => {
      const {
        timelockManager,
        timelock,
        owner,
        accessControl,
        wAccessControlTester,
      } = await loadFixture(defaultDeploy);

      await setMaxPendingOperationsPerProposerTester(
        { timelockManager, owner, accessControl, timelock },
        1,
      );

      await setRoleTimelocksTester(
        { timelockManager, timelock, owner, accessControl },
        [constants.HashZero],
        [3600],
      );
      await bulkScheduleTimelockOperationTester(
        { timelockManager, timelock, owner, accessControl },
        [wAccessControlTester.address],
        [
          wAccessControlTester.interface.encodeFunctionData(
            'withOnlyContractAdmin',
          ),
        ],
      );

      await bulkScheduleTimelockOperationTester(
        { timelockManager, timelock, owner, accessControl },
        [accessControl.address],
        [
          accessControl.interface.encodeFunctionData(
            'grantRole(bytes32,address)',
            [constants.HashZero, wAccessControlTester.address],
          ),
        ],
        {},
        timelockManagerRevert(timelockManager, 'TooManyPendingOperations'),
      );
    });

    it('should fail: when required role is user facing', async () => {
      const {
        timelockManager,
        timelock,
        owner,
        accessControl,
        wAccessControlTester,
        roles,
      } = await loadFixture(defaultDeploy);

      await wAccessControlTester.setContractAdminRole(roles.common.greenlisted);

      await bulkScheduleTimelockOperationTester(
        { timelockManager, timelock, owner, accessControl },
        [wAccessControlTester.address],
        [
          wAccessControlTester.interface.encodeFunctionData(
            'withOnlyContractAdmin',
          ),
        ],
        {},
        timelockManagerRevert(timelockManager, 'UserFacingRoleNotAllowed', [
          roles.common.greenlisted,
        ]),
      );
    });

    it('should schedule multiple timelock operations in one transaction', async () => {
      const {
        timelockManager,
        timelock,
        owner,
        accessControl,
        wAccessControlTester,
      } = await loadFixture(defaultDeploy);

      await setRoleTimelocksTester(
        { timelockManager, timelock, owner, accessControl },
        [constants.HashZero],
        [3600],
      );

      const calldata = wAccessControlTester.interface.encodeFunctionData(
        'withOnlyContractAdmin',
      );
      const grantRoleCalldata = accessControl.interface.encodeFunctionData(
        'grantRole(bytes32,address)',
        [constants.HashZero, wAccessControlTester.address],
      );

      const operationIds = await bulkScheduleTimelockOperationTester(
        { timelockManager, timelock, owner, accessControl },
        [wAccessControlTester.address, accessControl.address],
        [calldata, grantRoleCalldata],
      );

      expect(operationIds.length).to.eq(2);
    });

    it('should fail: when target is timelock address', async () => {
      const { timelockManager, timelock, owner, accessControl } =
        await loadFixture(defaultDeploy);

      await setRoleTimelocksTester(
        { timelockManager, timelock, owner, accessControl },
        [constants.HashZero],
        [3600],
      );

      await bulkScheduleTimelockOperationTester(
        { timelockManager, timelock, owner, accessControl },
        [timelock.address],
        ['0x'],
        {},
        timelockManagerRevert(timelockManager, 'InvalidAddress', [
          timelock.address,
        ]),
      );
    });
  });

  describe('executeTimelockOperation()', () => {
    it('should fail: when operation do not exist', async () => {
      const {
        timelockManager,
        timelock,
        owner,
        accessControl,
        wAccessControlTester,
      } = await loadFixture(defaultDeploy);

      const calldata = wAccessControlTester.interface.encodeFunctionData(
        'withOnlyContractAdmin',
      );
      await executeTimelockOperationTester(
        { timelockManager, timelock, owner, accessControl },
        wAccessControlTester.address,
        calldata,
        owner.address,
        {
          ...timelockManagerRevert(
            timelockManager,
            'UnexpectedOperationStatus',
          ),
        },
      );
    });

    it('should fail: when operation exist but delay is not passed', async () => {
      const {
        timelockManager,
        timelock,
        owner,
        accessControl,
        wAccessControlTester,
      } = await loadFixture(defaultDeploy);

      await setRoleTimelocksTester(
        { timelockManager, timelock, owner, accessControl },
        [constants.HashZero],
        [3600],
      );

      const calldata = wAccessControlTester.interface.encodeFunctionData(
        'withOnlyContractAdmin',
      );

      await bulkScheduleTimelockOperationTester(
        { timelockManager, timelock, owner, accessControl },
        [wAccessControlTester.address],
        [calldata],
      );

      await executeTimelockOperationTester(
        { timelockManager, timelock, owner, accessControl },
        wAccessControlTester.address,
        calldata,
        owner.address,
        {
          ...timelockManagerRevert(
            timelockManager,
            'TimelockOperationNotReady',
          ),
        },
      );
    });

    it('should fail: when caller does not have contract admin role or function permission for executeTimelockOperation', async () => {
      const {
        timelockManager,
        timelock,
        owner,
        accessControl,
        wAccessControlTester,
        regularAccounts,
      } = await loadFixture(defaultDeploy);

      const calldata = wAccessControlTester.interface.encodeFunctionData(
        'withOnlyContractAdmin',
      );

      await executeTimelockOperationTester(
        { timelockManager, timelock, owner, accessControl },
        wAccessControlTester.address,
        calldata,
        owner.address,
        {
          ...timelockManagerRevert(timelockManager, 'NoFunctionPermission'),
          from: regularAccounts[0],
        },
      );
    });

    it('when operation exist and timelock passed and caller has DEFAULT_ADMIN_ROLE role', async () => {
      const {
        timelockManager,
        timelock,
        owner,
        accessControl,
        wAccessControlTester,
        regularAccounts,
      } = await loadFixture(defaultDeploy);

      await accessControl['grantRole(bytes32,address)'](
        constants.HashZero,
        regularAccounts[0].address,
      );

      await setRoleTimelocksTester(
        { timelockManager, timelock, owner, accessControl },
        [constants.HashZero],
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
        {
          from: regularAccounts[0],
        },
      );

      await increase(3600);

      await executeTimelockOperationTester(
        { timelockManager, timelock, owner, accessControl },
        wAccessControlTester.address,
        calldata,
        regularAccounts[0].address,
        {
          from: regularAccounts[0],
        },
      );
    });

    it('when operation exist and timelock passed and caller has function permission for executeTimelockOperation', async () => {
      const {
        timelockManager,
        timelock,
        owner,
        accessControl,
        wAccessControlTester,
        regularAccounts,
        roles,
      } = await loadFixture(defaultDeploy);

      const defaultAdminRole = roles.common.defaultAdmin;

      await setupGrantOperatorRole({
        accessControl,
        owner,
        masterRole: defaultAdminRole,
        targetContract: timelockManager.address,
        functionSelector: executeTimelockOperationSelector,
        grantOperator: owner,
      });

      await setPermissionRoleTester(
        { accessControl, owner },
        defaultAdminRole,
        timelockManager.address,
        executeTimelockOperationSelector,
        [{ account: regularAccounts[0].address, enabled: true }],
      );

      await setRoleTimelocksTester(
        { timelockManager, timelock, owner, accessControl },
        [constants.HashZero],
        [3600],
      );

      const calldata = wAccessControlTester.interface.encodeFunctionData(
        'withOnlyContractAdmin',
      );

      await bulkScheduleTimelockOperationTester(
        { timelockManager, timelock, owner, accessControl },
        [wAccessControlTester.address],
        [calldata],
      );

      await increase(3600);

      await executeTimelockOperationTester(
        { timelockManager, timelock, owner, accessControl },
        wAccessControlTester.address,
        calldata,
        owner.address,
        {
          from: regularAccounts[0],
        },
      );
    });

    it('when same target and calldata was executed and scheduled again it can be executed again', async () => {
      const {
        timelockManager,
        timelock,
        owner,
        accessControl,
        wAccessControlTester,
      } = await loadFixture(defaultDeploy);

      await setRoleTimelocksTester(
        { timelockManager, timelock, owner, accessControl },
        [constants.HashZero],
        [3600],
      );

      const calldata = wAccessControlTester.interface.encodeFunctionData(
        'withOnlyContractAdmin',
      );

      await bulkScheduleTimelockOperationTester(
        { timelockManager, timelock, owner, accessControl },
        [wAccessControlTester.address],
        [calldata],
      );

      await increase(3600);

      await executeTimelockOperationTester(
        { timelockManager, timelock, owner, accessControl },
        wAccessControlTester.address,
        calldata,
        owner.address,
      );

      await bulkScheduleTimelockOperationTester(
        { timelockManager, timelock, owner, accessControl },
        [wAccessControlTester.address],
        [calldata],
      );

      await increase(3600);

      await executeTimelockOperationTester(
        { timelockManager, timelock, owner, accessControl },
        wAccessControlTester.address,
        calldata,
        owner.address,
      );
    });

    it('should fail: when operation is paused and timelock delay is passed', async () => {
      const {
        timelockManager,
        timelock,
        owner,
        accessControl,
        wAccessControlTester,
      } = await loadFixture(defaultDeploy);

      await setRoleTimelocksTester(
        { timelockManager, timelock, owner, accessControl },
        [constants.HashZero],
        [3600],
      );

      const calldata = wAccessControlTester.interface.encodeFunctionData(
        'withOnlyContractAdmin',
      );

      const [operationId] = await bulkScheduleTimelockOperationTester(
        { timelockManager, timelock, owner, accessControl },
        [wAccessControlTester.address],
        [calldata],
      );

      await pauseTimelockOperationTest(
        { timelockManager, timelock, owner, accessControl },
        operationId,
        undefined,
      );

      await increase(3600);

      await executeTimelockOperationTester(
        { timelockManager, timelock, owner, accessControl },
        wAccessControlTester.address,
        calldata,
        owner.address,
        {
          ...timelockManagerRevert(
            timelockManager,
            'UnexpectedOperationStatus',
            [2],
          ),
        },
      );
    });

    it('when set security council operation is executed via timelock', async () => {
      const {
        timelockManager,
        timelock,
        owner,
        accessControl,
        councilMembers,
        regularAccounts,
      } = await loadFixture(defaultDeploy);

      const securityCouncilManagerRole =
        await timelockManager.SECURITY_COUNCIL_MANAGER_ROLE();

      await setRoleTimelocksTester(
        { timelockManager, timelock, owner, accessControl },
        [securityCouncilManagerRole],
        [3600],
      );

      const newCouncilMembers = [
        councilMembers[0].address,
        councilMembers[1].address,
        councilMembers[2].address,
        councilMembers[3].address,
        regularAccounts[0].address,
      ];
      const setCouncilCalldata = timelockManager.interface.encodeFunctionData(
        'setSecurityCouncil',
        [newCouncilMembers],
      );

      const councilVersionBefore =
        await timelockManager.securityCouncilVersion();

      const [operationId] = await bulkScheduleTimelockOperationTester(
        { timelockManager, timelock, owner, accessControl },
        [timelockManager.address],
        [setCouncilCalldata],
        { isSetCouncilOperation: true },
      );

      expect(await timelockManager.pendingSetCouncilOperationId()).to.eq(
        operationId,
      );

      await increase(3600);

      await executeTimelockOperationTester(
        { timelockManager, timelock, owner, accessControl },
        timelockManager.address,
        setCouncilCalldata,
        owner.address,
      );

      expect(await timelockManager.pendingSetCouncilOperationId()).to.eq(
        constants.HashZero,
      );
      expect(await timelockManager.securityCouncilVersion()).to.eq(
        councilVersionBefore.add(1),
      );
    });
  });

  describe('setSecurityCouncil()', () => {
    it('should set security council', async () => {
      const {
        timelockManager,
        timelock,
        owner,
        accessControl,
        councilMembers,
      } = await loadFixture(defaultDeploy);

      await setSecurityCouncilTest(
        { timelockManager, timelock, owner, accessControl },
        [...councilMembers.map((v) => v.address), accessControl.address],
      );
    });

    it('should fail: when members < MIN_MEMBERS', async () => {
      const {
        timelockManager,
        timelock,
        owner,
        accessControl,
        councilMembers,
      } = await loadFixture(defaultDeploy);

      await setSecurityCouncilTest(
        { timelockManager, timelock, owner, accessControl },
        [accessControl.address],
        timelockManagerRevert(
          timelockManager,
          'InvalidSecurityCouncilMembersLength',
        ),
      );
    });

    it('should fail: when members > MAX_MEMBERS', async () => {
      const { timelockManager, timelock, owner, accessControl } =
        await loadFixture(defaultDeploy);

      await setSecurityCouncilTest(
        { timelockManager, timelock, owner, accessControl },
        [...Array(16).fill(accessControl.address)],
        timelockManagerRevert(
          timelockManager,
          'InvalidSecurityCouncilMembersLength',
        ),
      );
    });

    it('should fail: when council member address is zero', async () => {
      const {
        timelockManager,
        timelock,
        owner,
        accessControl,
        councilMembers,
      } = await loadFixture(defaultDeploy);

      await setSecurityCouncilTest(
        { timelockManager, timelock, owner, accessControl },
        [
          councilMembers[0].address,
          councilMembers[1].address,
          councilMembers[2].address,
          councilMembers[3].address,
          constants.AddressZero,
        ],
        timelockManagerRevert(timelockManager, 'InvalidAddress', [
          constants.AddressZero,
        ]),
      );
    });

    it('should fail: when council member is duplicated', async () => {
      const {
        timelockManager,
        timelock,
        owner,
        accessControl,
        councilMembers,
      } = await loadFixture(defaultDeploy);

      await setSecurityCouncilTest(
        { timelockManager, timelock, owner, accessControl },
        [
          councilMembers[0].address,
          councilMembers[0].address,
          councilMembers[1].address,
          councilMembers[2].address,
          councilMembers[3].address,
        ],
        timelockManagerRevert(timelockManager, 'InvalidAddress', [
          councilMembers[0].address,
        ]),
      );
    });

    it('should fail: when caller do not have SECURITY_COUNCIL_MANAGER_ROLE', async () => {
      const {
        timelockManager,
        timelock,
        owner,
        accessControl,
        councilMembers,
        regularAccounts,
      } = await loadFixture(defaultDeploy);

      await setSecurityCouncilTest(
        { timelockManager, timelock, owner, accessControl },
        councilMembers.map((v) => v.address),
        {
          ...timelockManagerRevert(timelockManager, 'NoFunctionPermission'),
          from: regularAccounts[0],
        },
      );
    });
  });

  describe('setMaxPendingOperationsPerProposer()', () => {
    it('should set max pending operations per proposer', async () => {
      const { timelockManager, timelock, owner, accessControl } =
        await loadFixture(defaultDeploy);

      await setMaxPendingOperationsPerProposerTester(
        { timelockManager, owner, accessControl, timelock },
        100,
      );
    });

    it('should fail: when max pending operations per proposer > MAX_PENDING_OPERATIONS_PER_PROPOSER', async () => {
      const { timelockManager, timelock, owner, accessControl } =
        await loadFixture(defaultDeploy);

      await setMaxPendingOperationsPerProposerTester(
        { timelockManager, owner, accessControl, timelock },
        101,
        timelockManagerRevert(
          timelockManager,
          'InvalidMaxPendingOperationsPerProposer',
        ),
      );
    });

    it('should fail: when max pending operations per proposer is 0', async () => {
      const { timelockManager, timelock, owner, accessControl } =
        await loadFixture(defaultDeploy);

      await setMaxPendingOperationsPerProposerTester(
        { timelockManager, owner, accessControl, timelock },
        0,
        timelockManagerRevert(
          timelockManager,
          'InvalidMaxPendingOperationsPerProposer',
        ),
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

      await setMaxPendingOperationsPerProposerTester(
        { timelockManager, owner, accessControl, timelock },
        50,
        {
          ...timelockManagerRevert(timelockManager, 'NoFunctionPermission'),
          from: regularAccounts[0],
        },
      );
    });
  });

  describe('pauseTimelockOperation()', () => {
    it('should pause timelock operation', async () => {
      const {
        timelockManager,
        timelock,
        owner,
        accessControl,
        wAccessControlTester,
      } = await loadFixture(defaultDeploy);

      await setRoleTimelocksTester(
        { timelockManager, timelock, owner, accessControl },
        [constants.HashZero],
        [3600],
      );

      const [operationId] = await bulkScheduleTimelockOperationTester(
        {
          timelockManager,
          timelock,
          owner,
          accessControl,
        },
        [wAccessControlTester.address],
        [
          wAccessControlTester.interface.encodeFunctionData(
            'withOnlyContractAdmin',
          ),
        ],
      );

      await pauseTimelockOperationTest(
        { timelockManager, timelock, owner, accessControl },
        operationId,
        undefined,
      );
    });

    it('should fail: when operation is not scheduled', async () => {
      const { timelockManager, timelock, owner, accessControl } =
        await loadFixture(defaultDeploy);

      await pauseTimelockOperationTest(
        { timelockManager, timelock, owner, accessControl },
        constants.HashZero,
        undefined,
        {
          ...timelockManagerRevert(timelockManager, 'OperationNotPending'),
        },
      );
    });

    it('should fail: when operation is already executed', async () => {
      const {
        timelockManager,
        timelock,
        owner,
        accessControl,
        wAccessControlTester,
      } = await loadFixture(defaultDeploy);

      await setRoleTimelocksTester(
        { timelockManager, timelock, owner, accessControl },
        [constants.HashZero],
        [3600],
      );

      const calldata = wAccessControlTester.interface.encodeFunctionData(
        'withOnlyContractAdmin',
      );

      const [operationId] = await bulkScheduleTimelockOperationTester(
        { timelockManager, timelock, owner, accessControl },
        [wAccessControlTester.address],
        [calldata],
      );

      await increase(3600);

      await executeTimelockOperationTester(
        { timelockManager, timelock, owner, accessControl },
        wAccessControlTester.address,
        calldata,
        owner.address,
      );

      await pauseTimelockOperationTest(
        { timelockManager, timelock, owner, accessControl },
        operationId,
        undefined,
        {
          ...timelockManagerRevert(timelockManager, 'OperationNotPending'),
        },
      );
    });

    it('should fail: when operation was already paused', async () => {
      const {
        timelockManager,
        timelock,
        owner,
        accessControl,
        wAccessControlTester,
      } = await loadFixture(defaultDeploy);

      await setRoleTimelocksTester(
        { timelockManager, timelock, owner, accessControl },
        [constants.HashZero],
        [3600],
      );

      const [operationId] = await bulkScheduleTimelockOperationTester(
        { timelockManager, timelock, owner, accessControl },
        [wAccessControlTester.address],
        [
          wAccessControlTester.interface.encodeFunctionData(
            'withOnlyContractAdmin',
          ),
        ],
      );

      await pauseTimelockOperationTest(
        { timelockManager, timelock, owner, accessControl },
        operationId,
        undefined,
      );

      await pauseTimelockOperationTest(
        { timelockManager, timelock, owner, accessControl },
        operationId,

        undefined,
        {
          ...timelockManagerRevert(
            timelockManager,
            'UnexpectedOperationStatus',
          ),
        },
      );
    });

    it('should fail: when msg.sender do not have a pauser role', async () => {
      const {
        timelockManager,
        timelock,
        owner,
        accessControl,
        wAccessControlTester,
        regularAccounts,
      } = await loadFixture(defaultDeploy);

      await setRoleTimelocksTester(
        { timelockManager, timelock, owner, accessControl },
        [constants.HashZero],
        [3600],
      );

      const [operationId] = await bulkScheduleTimelockOperationTester(
        { timelockManager, timelock, owner, accessControl },
        [wAccessControlTester.address],
        [
          wAccessControlTester.interface.encodeFunctionData(
            'withOnlyContractAdmin',
          ),
        ],
      );

      await pauseTimelockOperationTest(
        { timelockManager, timelock, owner, accessControl },
        operationId,
        undefined,
        {
          ...timelockManagerRevert(timelockManager, 'NoFunctionPermission'),
          from: regularAccounts[0],
        },
      );
    });

    it('should fail: when msg.sender do not have pauser role but do have default admin', async () => {
      const {
        timelockManager,
        timelock,
        owner,
        accessControl,
        wAccessControlTester,
        regularAccounts,
      } = await loadFixture(defaultDeploy);

      await accessControl['grantRole(bytes32,address)'](
        constants.HashZero,
        regularAccounts[0].address,
      );

      await setRoleTimelocksTester(
        { timelockManager, timelock, owner, accessControl },
        [constants.HashZero],
        [3600],
      );

      const [operationId] = await bulkScheduleTimelockOperationTester(
        { timelockManager, timelock, owner, accessControl },
        [wAccessControlTester.address],
        [
          wAccessControlTester.interface.encodeFunctionData(
            'withOnlyContractAdmin',
          ),
        ],
      );

      await pauseTimelockOperationTest(
        { timelockManager, timelock, owner, accessControl },
        operationId,
        undefined,
        {
          ...timelockManagerRevert(timelockManager, 'NoFunctionPermission'),
          from: regularAccounts[0],
        },
      );
    });

    it('should fail: when operation is expired (45 days since scheduled)', async () => {
      const {
        timelockManager,
        timelock,
        owner,
        accessControl,
        wAccessControlTester,
      } = await loadFixture(defaultDeploy);

      await setRoleTimelocksTester(
        { timelockManager, timelock, owner, accessControl },
        [constants.HashZero],
        [3600],
      );

      const [operationId] = await bulkScheduleTimelockOperationTester(
        { timelockManager, timelock, owner, accessControl },
        [wAccessControlTester.address],
        [
          wAccessControlTester.interface.encodeFunctionData(
            'withOnlyContractAdmin',
          ),
        ],
      );

      await increase(days(45));

      await pauseTimelockOperationTest(
        { timelockManager, timelock, owner, accessControl },
        operationId,
        undefined,
        {
          ...timelockManagerRevert(
            timelockManager,
            'UnexpectedOperationStatus',
          ),
        },
      );
    });

    it('should fail: when voted for execution (3/5 council members) and status is ApprovedExecution', async () => {
      const {
        timelockManager,
        timelock,
        owner,
        accessControl,
        wAccessControlTester,
        councilMembers,
      } = await loadFixture(defaultDeploy);

      await setRoleTimelocksTester(
        { timelockManager, timelock, owner, accessControl },
        [constants.HashZero],
        [3600],
      );

      const [operationId] = await bulkScheduleTimelockOperationTester(
        { timelockManager, timelock, owner, accessControl },
        [wAccessControlTester.address],
        [
          wAccessControlTester.interface.encodeFunctionData(
            'withOnlyContractAdmin',
          ),
        ],
      );

      await pauseTimelockOperationTest(
        { timelockManager, timelock, owner, accessControl },
        operationId,
        undefined,
      );

      for (let i = 0; i < 3; i++) {
        await voteForExecutionTest(
          { timelockManager, timelock, owner, accessControl },
          operationId,
          {
            from: councilMembers[i],
          },
        );
      }

      await pauseTimelockOperationTest(
        { timelockManager, timelock, owner, accessControl },
        operationId,
        undefined,
        {
          ...timelockManagerRevert(
            timelockManager,
            'UnexpectedOperationStatus',
          ),
        },
      );
    });

    it('should fail: when voted for veto (3/5 council members) and status is ReadyToAbort', async () => {
      const {
        timelockManager,
        timelock,
        owner,
        accessControl,
        wAccessControlTester,
        councilMembers,
      } = await loadFixture(defaultDeploy);

      await setRoleTimelocksTester(
        { timelockManager, timelock, owner, accessControl },
        [constants.HashZero],
        [3600],
      );

      const [operationId] = await bulkScheduleTimelockOperationTester(
        { timelockManager, timelock, owner, accessControl },
        [wAccessControlTester.address],
        [
          wAccessControlTester.interface.encodeFunctionData(
            'withOnlyContractAdmin',
          ),
        ],
      );

      await pauseTimelockOperationTest(
        { timelockManager, timelock, owner, accessControl },
        operationId,
        undefined,
      );

      for (let i = 0; i < 3; i++) {
        await voteForVetoTest(
          { timelockManager, timelock, owner, accessControl },
          operationId,
          {
            from: councilMembers[i],
          },
        );
      }

      await pauseTimelockOperationTest(
        { timelockManager, timelock, owner, accessControl },
        operationId,
        undefined,
        {
          ...timelockManagerRevert(
            timelockManager,
            'UnexpectedOperationStatus',
          ),
        },
      );
    });
  });

  describe('voteForVeto()', () => {
    it('should vote for veto', async () => {
      const {
        timelockManager,
        timelock,
        owner,
        accessControl,
        wAccessControlTester,
        councilMembers,
      } = await loadFixture(defaultDeploy);

      await setRoleTimelocksTester(
        { timelockManager, timelock, owner, accessControl },
        [constants.HashZero],
        [3600],
      );

      const [operationId] = await bulkScheduleTimelockOperationTester(
        {
          timelockManager,
          timelock,
          owner,
          accessControl,
        },
        [wAccessControlTester.address],
        [
          wAccessControlTester.interface.encodeFunctionData(
            'withOnlyContractAdmin',
          ),
        ],
      );

      await pauseTimelockOperationTest(
        { timelockManager, timelock, owner, accessControl },
        operationId,
        undefined,
      );

      await voteForVetoTest(
        { timelockManager, timelock, owner, accessControl },
        operationId,
        {
          from: councilMembers[0],
        },
      );
    });

    it('should fail: when called by an address that is not in council', async () => {
      const {
        timelockManager,
        timelock,
        owner,
        accessControl,
        wAccessControlTester,
        regularAccounts,
      } = await loadFixture(defaultDeploy);

      await setRoleTimelocksTester(
        { timelockManager, timelock, owner, accessControl },
        [constants.HashZero],
        [3600],
      );

      const [operationId] = await bulkScheduleTimelockOperationTester(
        { timelockManager, timelock, owner, accessControl },
        [wAccessControlTester.address],
        [
          wAccessControlTester.interface.encodeFunctionData(
            'withOnlyContractAdmin',
          ),
        ],
      );

      await pauseTimelockOperationTest(
        { timelockManager, timelock, owner, accessControl },
        operationId,
        undefined,
      );

      await voteForVetoTest(
        { timelockManager, timelock, owner, accessControl },
        operationId,
        {
          ...timelockManagerRevert(timelockManager, 'NotInSecurityCouncil'),
          from: regularAccounts[0],
        },
      );
    });

    it('should fail: when address is part of current council but not the part of the council that was on the moment of pause', async () => {
      const {
        timelockManager,
        timelock,
        owner,
        accessControl,
        wAccessControlTester,
        councilMembers,
        regularAccounts,
      } = await loadFixture(defaultDeploy);

      await setRoleTimelocksTester(
        { timelockManager, timelock, owner, accessControl },
        [constants.HashZero],
        [3600],
      );

      const [operationId] = await bulkScheduleTimelockOperationTester(
        { timelockManager, timelock, owner, accessControl },
        [wAccessControlTester.address],
        [
          wAccessControlTester.interface.encodeFunctionData(
            'withOnlyContractAdmin',
          ),
        ],
      );

      await pauseTimelockOperationTest(
        { timelockManager, timelock, owner, accessControl },
        operationId,
        undefined,
      );

      await setSecurityCouncilTest(
        { timelockManager, timelock, owner, accessControl },
        [
          councilMembers[0].address,
          councilMembers[1].address,
          councilMembers[2].address,
          councilMembers[3].address,
          regularAccounts[0].address,
        ],
      );

      await voteForVetoTest(
        { timelockManager, timelock, owner, accessControl },
        operationId,
        {
          ...timelockManagerRevert(timelockManager, 'NotInSecurityCouncil'),
          from: regularAccounts[0],
        },
      );
    });

    it('should fail: when status is NotPaused', async () => {
      const {
        timelockManager,
        timelock,
        owner,
        accessControl,
        wAccessControlTester,
        councilMembers,
      } = await loadFixture(defaultDeploy);

      await setRoleTimelocksTester(
        { timelockManager, timelock, owner, accessControl },
        [constants.HashZero],
        [3600],
      );

      const [operationId] = await bulkScheduleTimelockOperationTester(
        { timelockManager, timelock, owner, accessControl },
        [wAccessControlTester.address],
        [
          wAccessControlTester.interface.encodeFunctionData(
            'withOnlyContractAdmin',
          ),
        ],
      );

      await voteForVetoTest(
        { timelockManager, timelock, owner, accessControl },
        operationId,
        {
          ...timelockManagerRevert(
            timelockManager,
            'UnexpectedOperationStatus',
          ),
          from: councilMembers[0],
        },
      );
    });

    it('should fail: when proposal do not exist', async () => {
      const {
        timelockManager,
        timelock,
        owner,
        accessControl,
        councilMembers,
      } = await loadFixture(defaultDeploy);

      await voteForVetoTest(
        { timelockManager, timelock, owner, accessControl },
        constants.HashZero,
        {
          ...timelockManagerRevert(
            timelockManager,
            'UnexpectedOperationStatus',
          ),
          from: councilMembers[0],
        },
      );
    });

    it('should fail: when user already voted for veto', async () => {
      const {
        timelockManager,
        timelock,
        owner,
        accessControl,
        wAccessControlTester,
        councilMembers,
      } = await loadFixture(defaultDeploy);

      await setRoleTimelocksTester(
        { timelockManager, timelock, owner, accessControl },
        [constants.HashZero],
        [3600],
      );

      const [operationId] = await bulkScheduleTimelockOperationTester(
        { timelockManager, timelock, owner, accessControl },
        [wAccessControlTester.address],
        [
          wAccessControlTester.interface.encodeFunctionData(
            'withOnlyContractAdmin',
          ),
        ],
      );

      await pauseTimelockOperationTest(
        { timelockManager, timelock, owner, accessControl },
        operationId,
        undefined,
      );

      await voteForVetoTest(
        { timelockManager, timelock, owner, accessControl },
        operationId,
        {
          from: councilMembers[0],
        },
      );

      await voteForVetoTest(
        { timelockManager, timelock, owner, accessControl },
        operationId,
        {
          ...timelockManagerRevert(timelockManager, 'AlreadyVoted'),
          from: councilMembers[0],
        },
      );
    });

    it('when 3/5 council is voted for veto and then call abortOperation', async () => {
      const {
        timelockManager,
        timelock,
        owner,
        accessControl,
        wAccessControlTester,
        councilMembers,
      } = await loadFixture(defaultDeploy);

      await setRoleTimelocksTester(
        { timelockManager, timelock, owner, accessControl },
        [constants.HashZero],
        [3600],
      );

      const [operationId] = await bulkScheduleTimelockOperationTester(
        { timelockManager, timelock, owner, accessControl },
        [wAccessControlTester.address],
        [
          wAccessControlTester.interface.encodeFunctionData(
            'withOnlyContractAdmin',
          ),
        ],
      );

      await pauseTimelockOperationTest(
        { timelockManager, timelock, owner, accessControl },
        operationId,
        undefined,
      );

      for (let i = 0; i < 3; i++) {
        await voteForVetoTest(
          { timelockManager, timelock, owner, accessControl },
          operationId,
          {
            from: councilMembers[i],
          },
        );
      }

      await abortOperationTest(
        { timelockManager, timelock, owner, accessControl },
        operationId,
      );
    });

    it('when 3/5 council is voted for execution, dispute period is not over, and then council 3/5 votes for veto and then call abortOperation', async () => {
      const {
        timelockManager,
        timelock,
        owner,
        accessControl,
        wAccessControlTester,
        councilMembers,
      } = await loadFixture(defaultDeploy);

      await setRoleTimelocksTester(
        { timelockManager, timelock, owner, accessControl },
        [constants.HashZero],
        [3600],
      );

      const [operationId] = await bulkScheduleTimelockOperationTester(
        { timelockManager, timelock, owner, accessControl },
        [wAccessControlTester.address],
        [
          wAccessControlTester.interface.encodeFunctionData(
            'withOnlyContractAdmin',
          ),
        ],
      );

      await pauseTimelockOperationTest(
        { timelockManager, timelock, owner, accessControl },
        operationId,
        undefined,
      );

      for (let i = 0; i < 3; i++) {
        await voteForExecutionTest(
          { timelockManager, timelock, owner, accessControl },
          operationId,
          {
            from: councilMembers[i],
          },
        );
      }

      for (let i = 0; i < 3; i++) {
        await voteForVetoTest(
          { timelockManager, timelock, owner, accessControl },
          operationId,
          {
            from: councilMembers[i],
          },
        );
      }

      await abortOperationTest(
        { timelockManager, timelock, owner, accessControl },
        operationId,
      );
    });

    it('when 3/5 council is voted for execution, dispute period is over, and then council 3/5 votes for veto and then call abortOperation', async () => {
      const {
        timelockManager,
        timelock,
        owner,
        accessControl,
        wAccessControlTester,
        councilMembers,
      } = await loadFixture(defaultDeploy);

      await setRoleTimelocksTester(
        { timelockManager, timelock, owner, accessControl },
        [constants.HashZero],
        [3600],
      );

      const [operationId] = await bulkScheduleTimelockOperationTester(
        { timelockManager, timelock, owner, accessControl },
        [wAccessControlTester.address],
        [
          wAccessControlTester.interface.encodeFunctionData(
            'withOnlyContractAdmin',
          ),
        ],
      );

      await pauseTimelockOperationTest(
        { timelockManager, timelock, owner, accessControl },
        operationId,
        undefined,
      );

      for (let i = 0; i < 3; i++) {
        await voteForExecutionTest(
          { timelockManager, timelock, owner, accessControl },
          operationId,
          {
            from: councilMembers[i],
          },
        );
      }

      await increase(days(3));

      for (let i = 0; i < 3; i++) {
        await voteForVetoTest(
          { timelockManager, timelock, owner, accessControl },
          operationId,
          {
            from: councilMembers[i],
          },
        );
      }

      await abortOperationTest(
        { timelockManager, timelock, owner, accessControl },
        operationId,
      );
    });

    it('when 1/5 council member voted for veto and status remains Paused', async () => {
      const {
        timelockManager,
        timelock,
        owner,
        accessControl,
        wAccessControlTester,
        councilMembers,
      } = await loadFixture(defaultDeploy);

      await setRoleTimelocksTester(
        { timelockManager, timelock, owner, accessControl },
        [constants.HashZero],
        [3600],
      );

      const [operationId] = await bulkScheduleTimelockOperationTester(
        { timelockManager, timelock, owner, accessControl },
        [wAccessControlTester.address],
        [
          wAccessControlTester.interface.encodeFunctionData(
            'withOnlyContractAdmin',
          ),
        ],
      );

      await pauseTimelockOperationTest(
        { timelockManager, timelock, owner, accessControl },
        operationId,
        undefined,
      );

      await voteForVetoTest(
        { timelockManager, timelock, owner, accessControl },
        operationId,
        {
          from: councilMembers[0],
        },
      );
    });

    it('when status is ApprovedExecution and council member votes for veto', async () => {
      const {
        timelockManager,
        timelock,
        owner,
        accessControl,
        wAccessControlTester,
        councilMembers,
      } = await loadFixture(defaultDeploy);

      await setRoleTimelocksTester(
        { timelockManager, timelock, owner, accessControl },
        [constants.HashZero],
        [3600],
      );

      const [operationId] = await bulkScheduleTimelockOperationTester(
        { timelockManager, timelock, owner, accessControl },
        [wAccessControlTester.address],
        [
          wAccessControlTester.interface.encodeFunctionData(
            'withOnlyContractAdmin',
          ),
        ],
      );

      await pauseTimelockOperationTest(
        { timelockManager, timelock, owner, accessControl },
        operationId,
        undefined,
      );

      for (let i = 0; i < 3; i++) {
        await voteForExecutionTest(
          { timelockManager, timelock, owner, accessControl },
          operationId,
          {
            from: councilMembers[i],
          },
        );
      }

      await voteForVetoTest(
        { timelockManager, timelock, owner, accessControl },
        operationId,
        {
          from: councilMembers[3],
        },
      );
    });

    it('should fail: when status is ReadyToAbort', async () => {
      const {
        timelockManager,
        timelock,
        owner,
        accessControl,
        wAccessControlTester,
        councilMembers,
      } = await loadFixture(defaultDeploy);

      await setRoleTimelocksTester(
        { timelockManager, timelock, owner, accessControl },
        [constants.HashZero],
        [3600],
      );

      const [operationId] = await bulkScheduleTimelockOperationTester(
        { timelockManager, timelock, owner, accessControl },
        [wAccessControlTester.address],
        [
          wAccessControlTester.interface.encodeFunctionData(
            'withOnlyContractAdmin',
          ),
        ],
      );

      await pauseTimelockOperationTest(
        { timelockManager, timelock, owner, accessControl },
        operationId,
        undefined,
      );

      for (let i = 0; i < 3; i++) {
        await voteForVetoTest(
          { timelockManager, timelock, owner, accessControl },
          operationId,
          {
            from: councilMembers[i],
          },
        );
      }

      await voteForVetoTest(
        { timelockManager, timelock, owner, accessControl },
        operationId,
        {
          ...timelockManagerRevert(
            timelockManager,
            'UnexpectedOperationStatus',
            [5],
          ),
          from: councilMembers[3],
        },
      );
    });
  });

  describe('voteForExecution()', () => {
    it('should vote for execution', async () => {
      const {
        timelockManager,
        timelock,
        owner,
        accessControl,
        wAccessControlTester,
        councilMembers,
      } = await loadFixture(defaultDeploy);

      await setRoleTimelocksTester(
        { timelockManager, timelock, owner, accessControl },
        [constants.HashZero],
        [3600],
      );

      const [operationId] = await bulkScheduleTimelockOperationTester(
        {
          timelockManager,
          timelock,
          owner,
          accessControl,
        },
        [wAccessControlTester.address],
        [
          wAccessControlTester.interface.encodeFunctionData(
            'withOnlyContractAdmin',
          ),
        ],
      );

      await pauseTimelockOperationTest(
        { timelockManager, timelock, owner, accessControl },
        operationId,
        undefined,
      );

      await voteForExecutionTest(
        { timelockManager, timelock, owner, accessControl },
        operationId,
        {
          from: councilMembers[0],
        },
      );
    });

    it('should fail: when called by an address that is not in council', async () => {
      const {
        timelockManager,
        timelock,
        owner,
        accessControl,
        wAccessControlTester,
        regularAccounts,
      } = await loadFixture(defaultDeploy);

      await setRoleTimelocksTester(
        { timelockManager, timelock, owner, accessControl },
        [constants.HashZero],
        [3600],
      );

      const [operationId] = await bulkScheduleTimelockOperationTester(
        { timelockManager, timelock, owner, accessControl },
        [wAccessControlTester.address],
        [
          wAccessControlTester.interface.encodeFunctionData(
            'withOnlyContractAdmin',
          ),
        ],
      );

      await pauseTimelockOperationTest(
        { timelockManager, timelock, owner, accessControl },
        operationId,
        undefined,
      );

      await voteForExecutionTest(
        { timelockManager, timelock, owner, accessControl },
        operationId,
        {
          ...timelockManagerRevert(timelockManager, 'NotInSecurityCouncil'),
          from: regularAccounts[0],
        },
      );
    });

    it('should fail: when address is part of current council but not the part of the council that was on the moment of pause', async () => {
      const {
        timelockManager,
        timelock,
        owner,
        accessControl,
        wAccessControlTester,
        councilMembers,
        regularAccounts,
      } = await loadFixture(defaultDeploy);

      await setRoleTimelocksTester(
        { timelockManager, timelock, owner, accessControl },
        [constants.HashZero],
        [3600],
      );

      const [operationId] = await bulkScheduleTimelockOperationTester(
        { timelockManager, timelock, owner, accessControl },
        [wAccessControlTester.address],
        [
          wAccessControlTester.interface.encodeFunctionData(
            'withOnlyContractAdmin',
          ),
        ],
      );

      await pauseTimelockOperationTest(
        { timelockManager, timelock, owner, accessControl },
        operationId,
        undefined,
      );

      await setSecurityCouncilTest(
        { timelockManager, timelock, owner, accessControl },
        [
          councilMembers[0].address,
          councilMembers[1].address,
          councilMembers[2].address,
          councilMembers[3].address,
          regularAccounts[0].address,
        ],
      );

      await voteForExecutionTest(
        { timelockManager, timelock, owner, accessControl },
        operationId,
        {
          ...timelockManagerRevert(timelockManager, 'NotInSecurityCouncil'),
          from: regularAccounts[0],
        },
      );
    });

    it('should fail: when status is NotPaused', async () => {
      const {
        timelockManager,
        timelock,
        owner,
        accessControl,
        wAccessControlTester,
        councilMembers,
      } = await loadFixture(defaultDeploy);

      await setRoleTimelocksTester(
        { timelockManager, timelock, owner, accessControl },
        [constants.HashZero],
        [3600],
      );

      const [operationId] = await bulkScheduleTimelockOperationTester(
        { timelockManager, timelock, owner, accessControl },
        [wAccessControlTester.address],
        [
          wAccessControlTester.interface.encodeFunctionData(
            'withOnlyContractAdmin',
          ),
        ],
      );

      await voteForExecutionTest(
        { timelockManager, timelock, owner, accessControl },
        operationId,
        {
          ...timelockManagerRevert(
            timelockManager,
            'UnexpectedOperationStatus',
          ),
          from: councilMembers[0],
        },
      );
    });

    it('should fail: when proposal do not exist', async () => {
      const {
        timelockManager,
        timelock,
        owner,
        accessControl,
        councilMembers,
      } = await loadFixture(defaultDeploy);

      await voteForExecutionTest(
        { timelockManager, timelock, owner, accessControl },
        constants.HashZero,
        {
          ...timelockManagerRevert(
            timelockManager,
            'UnexpectedOperationStatus',
          ),
          from: councilMembers[0],
        },
      );
    });

    it('should fail: when proposal already executed', async () => {
      const {
        timelockManager,
        timelock,
        owner,
        accessControl,
        wAccessControlTester,
        councilMembers,
      } = await loadFixture(defaultDeploy);

      await setRoleTimelocksTester(
        { timelockManager, timelock, owner, accessControl },
        [constants.HashZero],
        [3600],
      );

      const calldata = wAccessControlTester.interface.encodeFunctionData(
        'withOnlyContractAdmin',
      );

      const [operationId] = await bulkScheduleTimelockOperationTester(
        { timelockManager, timelock, owner, accessControl },
        [wAccessControlTester.address],
        [calldata],
      );

      await increase(3600);

      await executeTimelockOperationTester(
        { timelockManager, timelock, owner, accessControl },
        wAccessControlTester.address,
        calldata,
        owner.address,
      );

      await voteForExecutionTest(
        { timelockManager, timelock, owner, accessControl },
        operationId,
        {
          ...timelockManagerRevert(
            timelockManager,
            'UnexpectedOperationStatus',
          ),
          from: councilMembers[0],
        },
      );
    });

    it('should fail: when user already voted for veto', async () => {
      const {
        timelockManager,
        timelock,
        owner,
        accessControl,
        wAccessControlTester,
        councilMembers,
      } = await loadFixture(defaultDeploy);

      await setRoleTimelocksTester(
        { timelockManager, timelock, owner, accessControl },
        [constants.HashZero],
        [3600],
      );

      const [operationId] = await bulkScheduleTimelockOperationTester(
        { timelockManager, timelock, owner, accessControl },
        [wAccessControlTester.address],
        [
          wAccessControlTester.interface.encodeFunctionData(
            'withOnlyContractAdmin',
          ),
        ],
      );

      await pauseTimelockOperationTest(
        { timelockManager, timelock, owner, accessControl },
        operationId,
        undefined,
      );

      await voteForVetoTest(
        { timelockManager, timelock, owner, accessControl },
        operationId,
        {
          from: councilMembers[0],
        },
      );

      await voteForExecutionTest(
        { timelockManager, timelock, owner, accessControl },
        operationId,
        {
          ...timelockManagerRevert(timelockManager, 'AlreadyVoted'),
          from: councilMembers[0],
        },
      );
    });

    it('should fail: when user already voted for execution', async () => {
      const {
        timelockManager,
        timelock,
        owner,
        accessControl,
        wAccessControlTester,
        councilMembers,
      } = await loadFixture(defaultDeploy);

      await setRoleTimelocksTester(
        { timelockManager, timelock, owner, accessControl },
        [constants.HashZero],
        [3600],
      );

      const [operationId] = await bulkScheduleTimelockOperationTester(
        { timelockManager, timelock, owner, accessControl },
        [wAccessControlTester.address],
        [
          wAccessControlTester.interface.encodeFunctionData(
            'withOnlyContractAdmin',
          ),
        ],
      );

      await pauseTimelockOperationTest(
        { timelockManager, timelock, owner, accessControl },
        operationId,
        undefined,
      );

      await voteForExecutionTest(
        { timelockManager, timelock, owner, accessControl },
        operationId,
        {
          from: councilMembers[0],
        },
      );

      await voteForExecutionTest(
        { timelockManager, timelock, owner, accessControl },
        operationId,
        {
          ...timelockManagerRevert(timelockManager, 'AlreadyVoted'),
          from: councilMembers[0],
        },
      );
    });

    it('should fail: when 3/5 council is voted for execution and then call execute as 3 days dispute didnt pass', async () => {
      const {
        timelockManager,
        timelock,
        owner,
        accessControl,
        wAccessControlTester,
        councilMembers,
      } = await loadFixture(defaultDeploy);

      await setRoleTimelocksTester(
        { timelockManager, timelock, owner, accessControl },
        [constants.HashZero],
        [3600],
      );

      const calldata = wAccessControlTester.interface.encodeFunctionData(
        'withOnlyContractAdmin',
      );

      const [operationId] = await bulkScheduleTimelockOperationTester(
        { timelockManager, timelock, owner, accessControl },
        [wAccessControlTester.address],
        [calldata],
      );

      await pauseTimelockOperationTest(
        { timelockManager, timelock, owner, accessControl },
        operationId,
        undefined,
      );

      for (let i = 0; i < 3; i++) {
        await voteForExecutionTest(
          { timelockManager, timelock, owner, accessControl },
          operationId,

          {
            from: councilMembers[i],
          },
        );
      }

      await increase(3600);

      await executeTimelockOperationTester(
        { timelockManager, timelock, owner, accessControl },
        wAccessControlTester.address,
        calldata,
        owner.address,
        {
          ...timelockManagerRevert(
            timelockManager,
            'UnexpectedOperationStatus',
          ),
        },
      );
    });

    it('when 3/5 council is voted for execution, wait 3 days and then call execute', async () => {
      const {
        timelockManager,
        timelock,
        owner,
        accessControl,
        wAccessControlTester,
        councilMembers,
      } = await loadFixture(defaultDeploy);

      await setRoleTimelocksTester(
        { timelockManager, timelock, owner, accessControl },
        [constants.HashZero],
        [3600],
      );

      const calldata = wAccessControlTester.interface.encodeFunctionData(
        'withOnlyContractAdmin',
      );

      const [operationId] = await bulkScheduleTimelockOperationTester(
        { timelockManager, timelock, owner, accessControl },
        [wAccessControlTester.address],
        [calldata],
      );

      await pauseTimelockOperationTest(
        { timelockManager, timelock, owner, accessControl },
        operationId,
        undefined,
      );

      for (let i = 0; i < 3; i++) {
        await voteForExecutionTest(
          { timelockManager, timelock, owner, accessControl },
          operationId,
          {
            from: councilMembers[i],
          },
        );
      }

      await increase(3600);
      await increase(days(3));

      await executeTimelockOperationTester(
        { timelockManager, timelock, owner, accessControl },
        wAccessControlTester.address,
        calldata,
        owner.address,
      );
    });

    it('should fail: when 3/5 council is voted for execution, dispute period is over, and then council 3/5 votes for veto and then call execute operation', async () => {
      const {
        timelockManager,
        timelock,
        owner,
        accessControl,
        wAccessControlTester,
        councilMembers,
      } = await loadFixture(defaultDeploy);

      await setRoleTimelocksTester(
        { timelockManager, timelock, owner, accessControl },
        [constants.HashZero],
        [3600],
      );

      const calldata = wAccessControlTester.interface.encodeFunctionData(
        'withOnlyContractAdmin',
      );

      const [operationId] = await bulkScheduleTimelockOperationTester(
        { timelockManager, timelock, owner, accessControl },
        [wAccessControlTester.address],
        [calldata],
      );

      await pauseTimelockOperationTest(
        { timelockManager, timelock, owner, accessControl },
        operationId,
        undefined,
      );

      for (let i = 0; i < 3; i++) {
        await voteForExecutionTest(
          { timelockManager, timelock, owner, accessControl },
          operationId,
          {
            from: councilMembers[i],
          },
        );
      }

      await increase(3600);
      await increase(days(3));

      for (let i = 0; i < 3; i++) {
        await voteForVetoTest(
          { timelockManager, timelock, owner, accessControl },
          operationId,
          {
            from: councilMembers[i],
          },
        );
      }

      await executeTimelockOperationTester(
        { timelockManager, timelock, owner, accessControl },
        wAccessControlTester.address,
        calldata,
        owner.address,
        {
          ...timelockManagerRevert(
            timelockManager,
            'UnexpectedOperationStatus',
          ),
        },
      );
    });

    it('when 1/5 council member voted for execution and status remains Paused', async () => {
      const {
        timelockManager,
        timelock,
        owner,
        accessControl,
        wAccessControlTester,
        councilMembers,
      } = await loadFixture(defaultDeploy);

      await setRoleTimelocksTester(
        { timelockManager, timelock, owner, accessControl },
        [constants.HashZero],
        [3600],
      );

      const [operationId] = await bulkScheduleTimelockOperationTester(
        { timelockManager, timelock, owner, accessControl },
        [wAccessControlTester.address],
        [
          wAccessControlTester.interface.encodeFunctionData(
            'withOnlyContractAdmin',
          ),
        ],
      );

      await pauseTimelockOperationTest(
        { timelockManager, timelock, owner, accessControl },
        operationId,
        undefined,
      );

      await voteForExecutionTest(
        { timelockManager, timelock, owner, accessControl },
        operationId,
        {
          from: councilMembers[0],
        },
      );
    });

    it('should fail: when operation is expired (45 days since scheduled)', async () => {
      const {
        timelockManager,
        timelock,
        owner,
        accessControl,
        wAccessControlTester,
        councilMembers,
      } = await loadFixture(defaultDeploy);

      await setRoleTimelocksTester(
        { timelockManager, timelock, owner, accessControl },
        [constants.HashZero],
        [3600],
      );

      const [operationId] = await bulkScheduleTimelockOperationTester(
        { timelockManager, timelock, owner, accessControl },
        [wAccessControlTester.address],
        [
          wAccessControlTester.interface.encodeFunctionData(
            'withOnlyContractAdmin',
          ),
        ],
      );

      await pauseTimelockOperationTest(
        { timelockManager, timelock, owner, accessControl },
        operationId,
        undefined,
      );

      await increase(days(45));

      await voteForExecutionTest(
        { timelockManager, timelock, owner, accessControl },
        operationId,
        {
          ...timelockManagerRevert(
            timelockManager,
            'UnexpectedOperationStatus',
            [6],
          ),
          from: councilMembers[0],
        },
      );
    });
  });

  describe('abortOperation()', () => {
    it('when operation is expired (45 days since scheduled) and call abortOperation', async () => {
      const {
        timelockManager,
        timelock,
        owner,
        accessControl,
        wAccessControlTester,
      } = await loadFixture(defaultDeploy);

      await setRoleTimelocksTester(
        { timelockManager, timelock, owner, accessControl },
        [constants.HashZero],
        [3600],
      );

      const [operationId] = await bulkScheduleTimelockOperationTester(
        { timelockManager, timelock, owner, accessControl },
        [wAccessControlTester.address],
        [
          wAccessControlTester.interface.encodeFunctionData(
            'withOnlyContractAdmin',
          ),
        ],
      );

      await increase(days(45));

      await abortOperationTest(
        { timelockManager, timelock, owner, accessControl },
        operationId,
      );
    });

    it('should fail: when status is Paused', async () => {
      const {
        timelockManager,
        timelock,
        owner,
        accessControl,
        wAccessControlTester,
      } = await loadFixture(defaultDeploy);

      await setRoleTimelocksTester(
        { timelockManager, timelock, owner, accessControl },
        [constants.HashZero],
        [3600],
      );

      const [operationId] = await bulkScheduleTimelockOperationTester(
        { timelockManager, timelock, owner, accessControl },
        [wAccessControlTester.address],
        [
          wAccessControlTester.interface.encodeFunctionData(
            'withOnlyContractAdmin',
          ),
        ],
      );

      await pauseTimelockOperationTest(
        { timelockManager, timelock, owner, accessControl },
        operationId,
        undefined,
      );

      await abortOperationTest(
        { timelockManager, timelock, owner, accessControl },
        operationId,
        timelockManagerRevert(timelockManager, 'UnexpectedOperationStatus', [
          2,
        ]),
      );
    });

    it('should fail: when status is NotPaused', async () => {
      const {
        timelockManager,
        timelock,
        owner,
        accessControl,
        wAccessControlTester,
      } = await loadFixture(defaultDeploy);

      await setRoleTimelocksTester(
        { timelockManager, timelock, owner, accessControl },
        [constants.HashZero],
        [3600],
      );

      const [operationId] = await bulkScheduleTimelockOperationTester(
        { timelockManager, timelock, owner, accessControl },
        [wAccessControlTester.address],
        [
          wAccessControlTester.interface.encodeFunctionData(
            'withOnlyContractAdmin',
          ),
        ],
      );

      await abortOperationTest(
        { timelockManager, timelock, owner, accessControl },
        operationId,
        timelockManagerRevert(timelockManager, 'UnexpectedOperationStatus', [
          1,
        ]),
      );
    });

    it('should fail: when status is ApprovedExecution', async () => {
      const {
        timelockManager,
        timelock,
        owner,
        accessControl,
        wAccessControlTester,
        councilMembers,
      } = await loadFixture(defaultDeploy);

      await setRoleTimelocksTester(
        { timelockManager, timelock, owner, accessControl },
        [constants.HashZero],
        [3600],
      );

      const [operationId] = await bulkScheduleTimelockOperationTester(
        { timelockManager, timelock, owner, accessControl },
        [wAccessControlTester.address],
        [
          wAccessControlTester.interface.encodeFunctionData(
            'withOnlyContractAdmin',
          ),
        ],
      );

      await pauseTimelockOperationTest(
        { timelockManager, timelock, owner, accessControl },
        operationId,
        undefined,
      );

      for (let i = 0; i < 3; i++) {
        await voteForExecutionTest(
          { timelockManager, timelock, owner, accessControl },
          operationId,
          {
            from: councilMembers[i],
          },
        );
      }

      await abortOperationTest(
        { timelockManager, timelock, owner, accessControl },
        operationId,
        timelockManagerRevert(timelockManager, 'UnexpectedOperationStatus', [
          3,
        ]),
      );
    });
  });

  describe('getOriginalProposer()', () => {
    it('should return proposer for scheduled operation', async () => {
      const {
        timelockManager,
        timelock,
        owner,
        accessControl,
        wAccessControlTester,
      } = await loadFixture(defaultDeploy);

      await setRoleTimelocksTester(
        { timelockManager, timelock, owner, accessControl },
        [constants.HashZero],
        [3600],
      );

      const calldata = wAccessControlTester.interface.encodeFunctionData(
        'withOnlyContractAdmin',
      );

      await bulkScheduleTimelockOperationTester(
        { timelockManager, timelock, owner, accessControl },
        [wAccessControlTester.address],
        [calldata],
      );

      expect(
        await timelockManager.getOriginalProposer(
          wAccessControlTester.address,
          calldata,
        ),
      ).to.eq(owner.address);
    });
  });

  describe('pendingSetCouncilOperationId()', () => {
    it('should fail: when pending set council operation already exists', async () => {
      const {
        timelockManager,
        timelock,
        owner,
        accessControl,
        councilMembers,
      } = await loadFixture(defaultDeploy);

      const securityCouncilManagerRole =
        await timelockManager.SECURITY_COUNCIL_MANAGER_ROLE();

      await setRoleTimelocksTester(
        { timelockManager, timelock, owner, accessControl },
        [securityCouncilManagerRole],
        [3600],
      );

      const setCouncilCalldata = timelockManager.interface.encodeFunctionData(
        'setSecurityCouncil',
        [councilMembers.map((v) => v.address)],
      );

      await bulkScheduleTimelockOperationTester(
        { timelockManager, timelock, owner, accessControl },
        [timelockManager.address],
        [setCouncilCalldata],
        { isSetCouncilOperation: true },
      );

      await bulkScheduleTimelockOperationTester(
        { timelockManager, timelock, owner, accessControl },
        [timelockManager.address],
        [setCouncilCalldata],
        { isSetCouncilOperation: true },
        timelockManagerRevert(
          timelockManager,
          'PendingSetCouncilOperationExists',
        ),
      );
    });
  });

  describe('councilQuorum()', () => {
    it('should return quorum for initial security council version', async () => {
      const { timelockManager } = await loadFixture(defaultDeploy);

      expect(await timelockManager.councilQuorum(0)).to.eq(3);
    });

    it('should return quorum for updated security council version', async () => {
      const {
        timelockManager,
        timelock,
        owner,
        accessControl,
        councilMembers,
      } = await loadFixture(defaultDeploy);

      await setSecurityCouncilTest(
        { timelockManager, timelock, owner, accessControl },
        [...councilMembers.map((v) => v.address), accessControl.address],
      );

      expect(await timelockManager.securityCouncilVersion()).to.eq(1);
      expect(await timelockManager.councilQuorum(1)).to.eq(4);
    });
  });

  describe('getSecurityCouncilMembers()', () => {
    it('should return members for initial security council version', async () => {
      const { timelockManager, councilMembers } = await loadFixture(
        defaultDeploy,
      );

      const members = await timelockManager.getSecurityCouncilMembers(0);

      expect(members.length).to.eq(councilMembers.length);
      for (const member of councilMembers) {
        expect(members.includes(member.address)).to.eq(true);
      }
    });

    it('should return members for updated security council version', async () => {
      const {
        timelockManager,
        timelock,
        owner,
        accessControl,
        councilMembers,
      } = await loadFixture(defaultDeploy);

      const newMembers = [
        ...councilMembers.map((v) => v.address),
        accessControl.address,
      ];

      await setSecurityCouncilTest(
        { timelockManager, timelock, owner, accessControl },
        newMembers,
      );

      const members = await timelockManager.getSecurityCouncilMembers(1);

      expect(members.length).to.eq(newMembers.length);
      for (const member of newMembers) {
        expect(members.includes(member)).to.eq(true);
      }
    });
  });

  describe('getPendingOperations()', () => {
    it('should return empty list when no operations are scheduled', async () => {
      const { timelockManager } = await loadFixture(defaultDeploy);

      const pending = await timelockManager.getPendingOperations();

      expect(pending.length).to.eq(0);
    });

    it('should return scheduled operation ids', async () => {
      const {
        timelockManager,
        timelock,
        owner,
        accessControl,
        wAccessControlTester,
      } = await loadFixture(defaultDeploy);

      await setRoleTimelocksTester(
        { timelockManager, timelock, owner, accessControl },
        [constants.HashZero],
        [3600],
      );

      const [operationId] = await bulkScheduleTimelockOperationTester(
        { timelockManager, timelock, owner, accessControl },
        [wAccessControlTester.address],
        [
          wAccessControlTester.interface.encodeFunctionData(
            'withOnlyContractAdmin',
          ),
        ],
      );

      const pending = await timelockManager.getPendingOperations();

      expect(pending.length).to.eq(1);
      expect(pending[0]).to.eq(operationId);
    });

    it('should not return executed operation ids', async () => {
      const {
        timelockManager,
        timelock,
        owner,
        accessControl,
        wAccessControlTester,
      } = await loadFixture(defaultDeploy);

      await setRoleTimelocksTester(
        { timelockManager, timelock, owner, accessControl },
        [constants.HashZero],
        [3600],
      );

      const calldata = wAccessControlTester.interface.encodeFunctionData(
        'withOnlyContractAdmin',
      );

      await bulkScheduleTimelockOperationTester(
        { timelockManager, timelock, owner, accessControl },
        [wAccessControlTester.address],
        [calldata],
      );

      await increase(3600);

      await executeTimelockOperationTester(
        { timelockManager, timelock, owner, accessControl },
        wAccessControlTester.address,
        calldata,
        owner.address,
      );

      const pending = await timelockManager.getPendingOperations();

      expect(pending.length).to.eq(0);
    });
  });

  describe('getOperationId()', () => {
    it('should return operation id for scheduled operation', async () => {
      const {
        timelockManager,
        timelock,
        owner,
        accessControl,
        wAccessControlTester,
      } = await loadFixture(defaultDeploy);

      await setRoleTimelocksTester(
        { timelockManager, timelock, owner, accessControl },
        [constants.HashZero],
        [3600],
      );

      const calldata = wAccessControlTester.interface.encodeFunctionData(
        'withOnlyContractAdmin',
      );

      const [operationId] = await bulkScheduleTimelockOperationTester(
        { timelockManager, timelock, owner, accessControl },
        [wAccessControlTester.address],
        [calldata],
      );

      expect(
        await timelockManager.getOperationId(
          wAccessControlTester.address,
          calldata,
        ),
      ).to.eq(operationId);
    });
  });

  describe('getOperationStatus()', () => {
    it('should return NotExist for unknown operation', async () => {
      const { timelockManager } = await loadFixture(defaultDeploy);

      expect(
        await timelockManager.getOperationStatus(constants.HashZero),
      ).to.eq(0);
    });

    it('should return NotPaused for scheduled operation', async () => {
      const {
        timelockManager,
        timelock,
        owner,
        accessControl,
        wAccessControlTester,
      } = await loadFixture(defaultDeploy);

      await setRoleTimelocksTester(
        { timelockManager, timelock, owner, accessControl },
        [constants.HashZero],
        [3600],
      );

      const [operationId] = await bulkScheduleTimelockOperationTester(
        { timelockManager, timelock, owner, accessControl },
        [wAccessControlTester.address],
        [
          wAccessControlTester.interface.encodeFunctionData(
            'withOnlyContractAdmin',
          ),
        ],
      );

      expect(await timelockManager.getOperationStatus(operationId)).to.eq(1);
    });

    it('should return Paused for paused operation', async () => {
      const {
        timelockManager,
        timelock,
        owner,
        accessControl,
        wAccessControlTester,
      } = await loadFixture(defaultDeploy);

      await setRoleTimelocksTester(
        { timelockManager, timelock, owner, accessControl },
        [constants.HashZero],
        [3600],
      );

      const [operationId] = await bulkScheduleTimelockOperationTester(
        { timelockManager, timelock, owner, accessControl },
        [wAccessControlTester.address],
        [
          wAccessControlTester.interface.encodeFunctionData(
            'withOnlyContractAdmin',
          ),
        ],
      );

      await pauseTimelockOperationTest(
        { timelockManager, timelock, owner, accessControl },
        operationId,
        undefined,
      );

      expect(await timelockManager.getOperationStatus(operationId)).to.eq(2);
    });

    it('should return ReadyToExecute when dispute period passed', async () => {
      const {
        timelockManager,
        timelock,
        owner,
        accessControl,
        wAccessControlTester,
        councilMembers,
      } = await loadFixture(defaultDeploy);

      await setRoleTimelocksTester(
        { timelockManager, timelock, owner, accessControl },
        [constants.HashZero],
        [3600],
      );

      const [operationId] = await bulkScheduleTimelockOperationTester(
        { timelockManager, timelock, owner, accessControl },
        [wAccessControlTester.address],
        [
          wAccessControlTester.interface.encodeFunctionData(
            'withOnlyContractAdmin',
          ),
        ],
      );

      await pauseTimelockOperationTest(
        { timelockManager, timelock, owner, accessControl },
        operationId,
        undefined,
      );

      for (let i = 0; i < 3; i++) {
        await voteForExecutionTest(
          { timelockManager, timelock, owner, accessControl },
          operationId,
          {
            from: councilMembers[i],
          },
        );
      }

      await increase(days(3));

      expect(await timelockManager.getOperationStatus(operationId)).to.eq(4);
    });

    it('should return Expired when expiry period passed', async () => {
      const {
        timelockManager,
        timelock,
        owner,
        accessControl,
        wAccessControlTester,
      } = await loadFixture(defaultDeploy);

      await setRoleTimelocksTester(
        { timelockManager, timelock, owner, accessControl },
        [constants.HashZero],
        [3600],
      );

      const [operationId] = await bulkScheduleTimelockOperationTester(
        { timelockManager, timelock, owner, accessControl },
        [wAccessControlTester.address],
        [
          wAccessControlTester.interface.encodeFunctionData(
            'withOnlyContractAdmin',
          ),
        ],
      );

      await increase(days(45));

      expect(await timelockManager.getOperationStatus(operationId)).to.eq(6);
    });
  });

  describe('getOperationStatusRaw()', () => {
    it('should return NotExist for unknown operation', async () => {
      const { timelockManager } = await loadFixture(defaultDeploy);

      expect(
        await timelockManager.getOperationStatusRaw(constants.HashZero),
      ).to.eq(0);
    });

    it('should return stored status without expiry adjustment', async () => {
      const {
        timelockManager,
        timelock,
        owner,
        accessControl,
        wAccessControlTester,
      } = await loadFixture(defaultDeploy);

      await setRoleTimelocksTester(
        { timelockManager, timelock, owner, accessControl },
        [constants.HashZero],
        [3600],
      );

      const [operationId] = await bulkScheduleTimelockOperationTester(
        { timelockManager, timelock, owner, accessControl },
        [wAccessControlTester.address],
        [
          wAccessControlTester.interface.encodeFunctionData(
            'withOnlyContractAdmin',
          ),
        ],
      );

      await increase(days(45));

      expect(await timelockManager.getOperationStatus(operationId)).to.eq(6);
      expect(await timelockManager.getOperationStatusRaw(operationId)).to.eq(1);
    });

    it('should return ApprovedExecution after council execution quorum', async () => {
      const {
        timelockManager,
        timelock,
        owner,
        accessControl,
        wAccessControlTester,
        councilMembers,
      } = await loadFixture(defaultDeploy);

      await setRoleTimelocksTester(
        { timelockManager, timelock, owner, accessControl },
        [constants.HashZero],
        [3600],
      );

      const [operationId] = await bulkScheduleTimelockOperationTester(
        { timelockManager, timelock, owner, accessControl },
        [wAccessControlTester.address],
        [
          wAccessControlTester.interface.encodeFunctionData(
            'withOnlyContractAdmin',
          ),
        ],
      );

      await pauseTimelockOperationTest(
        { timelockManager, timelock, owner, accessControl },
        operationId,
        undefined,
      );

      for (let i = 0; i < 3; i++) {
        await voteForExecutionTest(
          { timelockManager, timelock, owner, accessControl },
          operationId,
          {
            from: councilMembers[i],
          },
        );
      }

      await increase(days(3));

      expect(await timelockManager.getOperationStatus(operationId)).to.eq(4);
      expect(await timelockManager.getOperationStatusRaw(operationId)).to.eq(3);
    });
  });

  describe('getOperationDetails()', () => {
    it('should return empty details for unknown operation', async () => {
      const { timelockManager } = await loadFixture(defaultDeploy);

      const details = await timelockManager.getOperationDetails(
        constants.HashZero,
      );

      expect(details.status).to.eq(0);
      expect(details.operationProposer).to.eq(constants.AddressZero);
      expect(details.pauser).to.eq(constants.AddressZero);
      expect(details.votesForExecution).to.eq(0);
      expect(details.votesForVeto).to.eq(0);
    });

    it('should return details for paused operation', async () => {
      const {
        timelockManager,
        timelock,
        owner,
        accessControl,
        wAccessControlTester,
      } = await loadFixture(defaultDeploy);

      await setRoleTimelocksTester(
        { timelockManager, timelock, owner, accessControl },
        [constants.HashZero],
        [3600],
      );

      const [operationId] = await bulkScheduleTimelockOperationTester(
        { timelockManager, timelock, owner, accessControl },
        [wAccessControlTester.address],
        [
          wAccessControlTester.interface.encodeFunctionData(
            'withOnlyContractAdmin',
          ),
        ],
      );

      await pauseTimelockOperationTest(
        { timelockManager, timelock, owner, accessControl },
        operationId,
        7,
      );

      const details = await timelockManager.getOperationDetails(operationId);

      expect(details.status).to.eq(2);
      expect(details.operationProposer).to.eq(owner.address);
      expect(details.pauser).to.eq(owner.address);
      expect(details.pauseReasonCode).to.eq(7);
      expect(details.votesForExecution).to.eq(0);
      expect(details.votesForVeto).to.eq(0);
    });

    it('should return vote counts after council votes', async () => {
      const {
        timelockManager,
        timelock,
        owner,
        accessControl,
        wAccessControlTester,
        councilMembers,
      } = await loadFixture(defaultDeploy);

      await setRoleTimelocksTester(
        { timelockManager, timelock, owner, accessControl },
        [constants.HashZero],
        [3600],
      );

      const [operationId] = await bulkScheduleTimelockOperationTester(
        { timelockManager, timelock, owner, accessControl },
        [wAccessControlTester.address],
        [
          wAccessControlTester.interface.encodeFunctionData(
            'withOnlyContractAdmin',
          ),
        ],
      );

      await pauseTimelockOperationTest(
        { timelockManager, timelock, owner, accessControl },
        operationId,
        undefined,
      );

      await voteForExecutionTest(
        { timelockManager, timelock, owner, accessControl },
        operationId,
        {
          from: councilMembers[0],
        },
      );

      await voteForVetoTest(
        { timelockManager, timelock, owner, accessControl },
        operationId,
        {
          from: councilMembers[1],
        },
      );

      const details = await timelockManager.getOperationDetails(operationId);

      expect(details.status).to.eq(2);
      expect(details.votesForExecution).to.eq(1);
      expect(details.votesForVeto).to.eq(1);
    });
  });

  describe('getCouncilMemberVoteStatus()', () => {
    it('should return false when member did not vote', async () => {
      const {
        timelockManager,
        timelock,
        owner,
        accessControl,
        wAccessControlTester,
        councilMembers,
      } = await loadFixture(defaultDeploy);

      await setRoleTimelocksTester(
        { timelockManager, timelock, owner, accessControl },
        [constants.HashZero],
        [3600],
      );

      const [operationId] = await bulkScheduleTimelockOperationTester(
        { timelockManager, timelock, owner, accessControl },
        [wAccessControlTester.address],
        [
          wAccessControlTester.interface.encodeFunctionData(
            'withOnlyContractAdmin',
          ),
        ],
      );

      await pauseTimelockOperationTest(
        { timelockManager, timelock, owner, accessControl },
        operationId,
        undefined,
      );

      const [votedForExecution, votedForVeto] =
        await timelockManager.getCouncilMemberVoteStatus(
          operationId,
          councilMembers[0].address,
        );

      expect(votedForExecution).to.eq(false);
      expect(votedForVeto).to.eq(false);
    });

    it('should return vote flags after member voted', async () => {
      const {
        timelockManager,
        timelock,
        owner,
        accessControl,
        wAccessControlTester,
        councilMembers,
      } = await loadFixture(defaultDeploy);

      await setRoleTimelocksTester(
        { timelockManager, timelock, owner, accessControl },
        [constants.HashZero],
        [3600],
      );

      const [operationId] = await bulkScheduleTimelockOperationTester(
        { timelockManager, timelock, owner, accessControl },
        [wAccessControlTester.address],
        [
          wAccessControlTester.interface.encodeFunctionData(
            'withOnlyContractAdmin',
          ),
        ],
      );

      await pauseTimelockOperationTest(
        { timelockManager, timelock, owner, accessControl },
        operationId,
        undefined,
      );

      await voteForExecutionTest(
        { timelockManager, timelock, owner, accessControl },
        operationId,
        {
          from: councilMembers[0],
        },
      );

      await voteForVetoTest(
        { timelockManager, timelock, owner, accessControl },
        operationId,
        {
          from: councilMembers[1],
        },
      );

      const [member0Execution, member0Veto] =
        await timelockManager.getCouncilMemberVoteStatus(
          operationId,
          councilMembers[0].address,
        );
      const [member1Execution, member1Veto] =
        await timelockManager.getCouncilMemberVoteStatus(
          operationId,
          councilMembers[1].address,
        );

      expect(member0Execution).to.eq(true);
      expect(member0Veto).to.eq(false);
      expect(member1Execution).to.eq(false);
      expect(member1Veto).to.eq(true);
    });
  });

  describe('isFunctionReadyToExecute()', () => {
    it('should return ready when role has no timelock and operation is not scheduled', async () => {
      const {
        timelockManager,
        timelock,
        owner,
        accessControl,
        wAccessControlTester,
      } = await loadFixture(defaultDeploy);

      await setRoleTimelocksTester(
        { timelockManager, timelock, owner, accessControl },
        [constants.HashZero],
        [NO_DELAY],
      );

      const calldata = wAccessControlTester.interface.encodeFunctionData(
        'withOnlyContractAdmin',
      );
      const dataWithCaller = ethers.utils.solidityPack(
        ['bytes', 'address'],
        [calldata, owner.address],
      );

      const [ready, timelocked] =
        await timelockManager.isFunctionReadyToExecute(
          constants.HashZero,
          0,
          wAccessControlTester.address,
          dataWithCaller,
        );

      expect(ready).to.eq(true);
      expect(timelocked).to.eq(false);
    });

    it('should return not ready when operation is scheduled and timelock is not passed', async () => {
      const {
        timelockManager,
        timelock,
        owner,
        accessControl,
        wAccessControlTester,
      } = await loadFixture(defaultDeploy);

      await setRoleTimelocksTester(
        { timelockManager, timelock, owner, accessControl },
        [constants.HashZero],
        [3600],
      );

      const calldata = wAccessControlTester.interface.encodeFunctionData(
        'withOnlyContractAdmin',
      );
      const dataWithCaller = ethers.utils.solidityPack(
        ['bytes', 'address'],
        [calldata, owner.address],
      );

      await bulkScheduleTimelockOperationTester(
        { timelockManager, timelock, owner, accessControl },
        [wAccessControlTester.address],
        [calldata],
      );

      const [ready, timelocked] =
        await timelockManager.isFunctionReadyToExecute(
          constants.HashZero,
          0,
          wAccessControlTester.address,
          dataWithCaller,
        );

      expect(ready).to.eq(false);
      expect(timelocked).to.eq(true);
    });

    it('should return ready when operation is scheduled and timelock is passed', async () => {
      const {
        timelockManager,
        timelock,
        owner,
        accessControl,
        wAccessControlTester,
      } = await loadFixture(defaultDeploy);

      await setRoleTimelocksTester(
        { timelockManager, timelock, owner, accessControl },
        [constants.HashZero],
        [3600],
      );

      const calldata = wAccessControlTester.interface.encodeFunctionData(
        'withOnlyContractAdmin',
      );

      await bulkScheduleTimelockOperationTester(
        { timelockManager, timelock, owner, accessControl },
        [wAccessControlTester.address],
        [calldata],
      );

      await increase(3600);

      const [ready, timelocked] =
        await timelockManager.isFunctionReadyToExecute(
          constants.HashZero,
          0,
          wAccessControlTester.address,
          calldata,
        );

      expect(ready).to.eq(true);
      expect(timelocked).to.eq(true);
    });

    it('should return ready when operation is paused and timelock is passed', async () => {
      const {
        timelockManager,
        timelock,
        owner,
        accessControl,
        wAccessControlTester,
      } = await loadFixture(defaultDeploy);

      await setRoleTimelocksTester(
        { timelockManager, timelock, owner, accessControl },
        [constants.HashZero],
        [3600],
      );

      const calldata = wAccessControlTester.interface.encodeFunctionData(
        'withOnlyContractAdmin',
      );

      const [operationId] = await bulkScheduleTimelockOperationTester(
        { timelockManager, timelock, owner, accessControl },
        [wAccessControlTester.address],
        [calldata],
      );

      await pauseTimelockOperationTest(
        { timelockManager, timelock, owner, accessControl },
        operationId,
        undefined,
      );

      await increase(3600);

      const [ready, timelocked] =
        await timelockManager.isFunctionReadyToExecute(
          constants.HashZero,
          0,
          wAccessControlTester.address,
          calldata,
        );

      expect(ready).to.eq(true);
      expect(timelocked).to.eq(true);
    });

    it('should return ready when operation is ReadyToExecute', async () => {
      const {
        timelockManager,
        timelock,
        owner,
        accessControl,
        wAccessControlTester,
        councilMembers,
      } = await loadFixture(defaultDeploy);

      await setRoleTimelocksTester(
        { timelockManager, timelock, owner, accessControl },
        [constants.HashZero],
        [3600],
      );

      const calldata = wAccessControlTester.interface.encodeFunctionData(
        'withOnlyContractAdmin',
      );

      const [operationId] = await bulkScheduleTimelockOperationTester(
        { timelockManager, timelock, owner, accessControl },
        [wAccessControlTester.address],
        [calldata],
      );

      await pauseTimelockOperationTest(
        { timelockManager, timelock, owner, accessControl },
        operationId,
        undefined,
      );

      for (let i = 0; i < 3; i++) {
        await voteForExecutionTest(
          { timelockManager, timelock, owner, accessControl },
          operationId,
          {
            from: councilMembers[i],
          },
        );
      }

      await increase(3600);
      await increase(days(3));

      const [ready, timelocked] =
        await timelockManager.isFunctionReadyToExecute(
          constants.HashZero,
          0,
          wAccessControlTester.address,
          calldata,
        );

      expect(ready).to.eq(true);
      expect(timelocked).to.eq(true);
    });
  });

  describe('proposerPendingOperationsCount()', () => {
    it('should return pending operations count per proposer', async () => {
      const {
        timelockManager,
        timelock,
        owner,
        accessControl,
        wAccessControlTester,
      } = await loadFixture(defaultDeploy);

      expect(
        await timelockManager.proposerPendingOperationsCount(owner.address),
      ).to.eq(0);

      await setRoleTimelocksTester(
        { timelockManager, timelock, owner, accessControl },
        [constants.HashZero],
        [3600],
      );

      await bulkScheduleTimelockOperationTester(
        { timelockManager, timelock, owner, accessControl },
        [wAccessControlTester.address],
        [
          wAccessControlTester.interface.encodeFunctionData(
            'withOnlyContractAdmin',
          ),
        ],
      );

      expect(
        await timelockManager.proposerPendingOperationsCount(owner.address),
      ).to.eq(1);
    });

    it('should decrement count when operation is executed', async () => {
      const {
        timelockManager,
        timelock,
        owner,
        accessControl,
        wAccessControlTester,
      } = await loadFixture(defaultDeploy);

      await setRoleTimelocksTester(
        { timelockManager, timelock, owner, accessControl },
        [constants.HashZero],
        [3600],
      );

      const calldata = wAccessControlTester.interface.encodeFunctionData(
        'withOnlyContractAdmin',
      );

      await bulkScheduleTimelockOperationTester(
        { timelockManager, timelock, owner, accessControl },
        [wAccessControlTester.address],
        [calldata],
      );

      expect(
        await timelockManager.proposerPendingOperationsCount(owner.address),
      ).to.eq(1);

      await increase(3600);

      await executeTimelockOperationTester(
        { timelockManager, timelock, owner, accessControl },
        wAccessControlTester.address,
        calldata,
        owner.address,
      );

      expect(
        await timelockManager.proposerPendingOperationsCount(owner.address),
      ).to.eq(0);
    });
  });

  describe('dataHashIndexes()', () => {
    it('should return data hash index for scheduled operation', async () => {
      const {
        timelockManager,
        timelock,
        owner,
        accessControl,
        wAccessControlTester,
      } = await loadFixture(defaultDeploy);

      await setRoleTimelocksTester(
        { timelockManager, timelock, owner, accessControl },
        [constants.HashZero],
        [3600],
      );

      const calldata = wAccessControlTester.interface.encodeFunctionData(
        'withOnlyContractAdmin',
      );
      const dataWithCaller = ethers.utils.solidityPack(
        ['bytes', 'address'],
        [calldata, owner.address],
      );
      const dataHash = ethers.utils.solidityKeccak256(
        ['address', 'uint256', 'bytes'],
        [wAccessControlTester.address, 0, dataWithCaller],
      );

      expect(await timelockManager.dataHashIndexes(dataHash)).to.eq(0);

      await bulkScheduleTimelockOperationTester(
        { timelockManager, timelock, owner, accessControl },
        [wAccessControlTester.address],
        [calldata],
      );

      expect(await timelockManager.dataHashIndexes(dataHash)).to.eq(0);
    });
  });
});
