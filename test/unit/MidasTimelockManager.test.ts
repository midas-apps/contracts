import { loadFixture } from '@nomicfoundation/hardhat-network-helpers';
import { increase } from '@nomicfoundation/hardhat-network-helpers/dist/src/helpers/time';
import { days } from '@nomicfoundation/hardhat-network-helpers/dist/src/helpers/time/duration';
import { expect } from 'chai';
import { constants } from 'ethers';

import { defaultDeploy } from '../common/fixtures';
import {
  executeTimelockOperationTester,
  scheduleTimelockOperationsTester,
  setMaxPendingOperationsPerProposerTester,
  setRoleTimelocksTester,
} from '../common/timelock-manager.helpers';

describe('MidasTimelockManager', () => {
  it('deployment', async () => {
    const { accessControl, timelockManager, timelock, councilMembers } =
      await loadFixture(defaultDeploy);

    expect(await timelockManager.accessControl()).to.eq(accessControl.address);
    expect(await timelockManager.timelock()).to.eq(timelock.address);
    expect(await timelockManager.councilQuorum()).to.eq(3);
    const councilMembersInContract =
      await timelockManager.getSecurityCouncilMembers();
    expect(await timelockManager.SECURITY_COUNCIL_MIN_MEMBERS()).to.eq(5);
    expect(councilMembersInContract.length).to.eq(councilMembers.length);

    for (const member of councilMembersInContract) {
      expect(councilMembersInContract.includes(member)).to.eq(true);
    }
    expect(await timelockManager.CHALLENGE_PERIOD()).to.eq(days(3));
    expect(await timelockManager.DISPUTE_PERIOD()).to.eq(days(3));
    expect(await timelockManager.maxPendingOperationsPerProposer()).to.eq(100);
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

      await scheduleTimelockOperationsTester(
        { timelockManager, timelock, owner, accessControl },
        [wAccessControlTester.address],
        [
          wAccessControlTester.interface.encodeFunctionData(
            'withOnlyContractAdmin',
          ),
        ],
      );
    });

    it('when same operation was scheduled and already executed', async () => {
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
      await scheduleTimelockOperationsTester(
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

      await scheduleTimelockOperationsTester(
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

      await accessControl.grantRole(
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

      await scheduleTimelockOperationsTester(
        { timelockManager, timelock, owner, accessControl },
        [wAccessControlTester.address],
        [
          wAccessControlTester.interface.encodeFunctionData(
            'withOnlyContractAdmin',
          ),
        ],
      );

      await scheduleTimelockOperationsTester(
        { timelockManager, timelock, owner, accessControl },
        [accessControl.address],
        [
          accessControl.interface.encodeFunctionData('grantRole', [
            constants.HashZero,
            wAccessControlTester.address,
          ]),
        ],
        {
          from: regularAccounts[0],
        },
      );
    });

    it('should fail: when same operation is scheduled and not yet executed', async () => {
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
      await scheduleTimelockOperationsTester(
        { timelockManager, timelock, owner, accessControl },
        [wAccessControlTester.address],
        [
          wAccessControlTester.interface.encodeFunctionData(
            'withOnlyContractAdmin',
          ),
        ],
      );

      await scheduleTimelockOperationsTester(
        { timelockManager, timelock, owner, accessControl },
        [wAccessControlTester.address],
        [
          wAccessControlTester.interface.encodeFunctionData(
            'withOnlyContractAdmin',
          ),
        ],
        {
          revertMessage: 'TimelockController: operation already scheduled',
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

      await scheduleTimelockOperationsTester(
        { timelockManager, timelock, owner, accessControl },
        [wAccessControlTester.address],
        [
          wAccessControlTester.interface.encodeFunctionData(
            'withOnlyContractAdmin',
          ),
        ],
        {
          revertMessage: 'MAC: no timelock',
        },
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
      await scheduleTimelockOperationsTester(
        { timelockManager, timelock, owner, accessControl },
        [wAccessControlTester.address],
        [
          wAccessControlTester.interface.encodeFunctionData(
            'withOnlyContractAdmin',
          ),
        ],
      );

      await scheduleTimelockOperationsTester(
        { timelockManager, timelock, owner, accessControl },
        [accessControl.address],
        [
          accessControl.interface.encodeFunctionData('grantRole', [
            constants.HashZero,
            wAccessControlTester.address,
          ]),
        ],
        {
          revertMessage: 'MAC: too many pending operations',
        },
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

      await scheduleTimelockOperationsTester(
        { timelockManager, timelock, owner, accessControl },
        [wAccessControlTester.address],
        [
          wAccessControlTester.interface.encodeFunctionData(
            'withOnlyContractAdmin',
          ),
        ],
        {
          revertMessage: 'MAC: user facing role',
        },
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
          revertMessage: 'TimelockController: operation is not ready',
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

      await scheduleTimelockOperationsTester(
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
          revertMessage: 'TimelockController: operation is not ready',
        },
      );
    });

    it('should fail: when caller do not have EXECUTOR_ROLE or DEFAULT_ADMIN_ROLE roles', async () => {
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
          revertMessage: 'MAC: unauthorized',
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

      await accessControl.grantRole(
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

      await scheduleTimelockOperationsTester(
        { timelockManager, timelock, owner, accessControl },
        [wAccessControlTester.address],
        [calldata],
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

    it('when operation exist and timelock passed and caller has EXECUTOR_ROLE role', async () => {
      const {
        timelockManager,
        timelock,
        owner,
        accessControl,
        wAccessControlTester,
        regularAccounts,
      } = await loadFixture(defaultDeploy);

      await accessControl.grantRole(
        await timelockManager.EXECUTOR_ROLE(),
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

      await scheduleTimelockOperationsTester(
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
  });
});
