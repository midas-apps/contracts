import { loadFixture } from '@nomicfoundation/hardhat-network-helpers';
import { increase } from '@nomicfoundation/hardhat-network-helpers/dist/src/helpers/time';
import { expect } from 'chai';
import { parseUnits } from 'ethers/lib/utils';
import { ethers } from 'hardhat';

import { encodeFnSelector } from '../../helpers/utils';
import {
  CustomAggregatorV3CompatibleFeed__factory,
  CustomAggregatorV3CompatibleFeedTester__factory,
} from '../../typechain-types';
import {
  acErrors,
  setPermissionRoleTester,
  setRoleTimelocksTester,
  setupGrantOperatorRole,
} from '../common/ac.helpers';
import { keccak256, validateImplementation } from '../common/common.helpers';
import {
  calculatePriceDiviation,
  setMaxAnswerDeviationTest,
  setRoundData,
  setRoundDataSafe,
} from '../common/custom-feed.helpers';
import { defaultDeploy } from '../common/fixtures';
import {
  executeTimelockOperationTester,
  scheduleTimelockOperationsTester,
} from '../common/timelock-manager.helpers';

describe('CustomAggregatorV3CompatibleFeed', function () {
  it('deployment', async () => {
    const { customFeed, owner, roles } = await loadFixture(defaultDeploy);

    expect(await customFeed.maxAnswer()).eq(parseUnits('10000', 8));
    expect(await customFeed.minAnswer()).eq(2);
    expect(await customFeed.maxAnswerDeviation()).eq(parseUnits('1', 8));
    expect(await customFeed.description()).eq('Custom Data Feed');
    expect(await customFeed.decimals()).eq(8);
    expect(await customFeed.version()).eq(1);
    expect(await customFeed.latestRound()).eq(0);
    expect(await customFeed.lastAnswer()).eq(0);
    expect(await customFeed.lastTimestamp()).eq(0);
    expect(await customFeed.contractAdminRole()).eq(
      keccak256('CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE'),
    );

    await validateImplementation(CustomAggregatorV3CompatibleFeed__factory);
  });

  it('initialize', async () => {
    const fixture = await loadFixture(defaultDeploy);

    await expect(
      fixture.customFeed.initialize(ethers.constants.AddressZero, 0, 0, 0, ''),
    ).revertedWith('Initializable: contract is already initialized');

    const testFeed = await new CustomAggregatorV3CompatibleFeedTester__factory(
      fixture.owner,
    ).deploy();

    await expect(
      testFeed.initialize(fixture.accessControl.address, 1, 0, 0, ''),
    ).revertedWith('CA: !min/max');

    await expect(
      testFeed.initialize(
        fixture.accessControl.address,
        0,
        1,
        parseUnits('101', 8),
        '',
      ),
    ).revertedWith('CA: !max deviation');
  });

  describe('setRoundData', async () => {
    it('call from owner', async () => {
      const fixture = await loadFixture(defaultDeploy);
      await setRoundData(fixture, 10);
    });
    it('should fail: call from non owner', async () => {
      const fixture = await loadFixture(defaultDeploy);
      await setRoundData(fixture, 10, {
        from: fixture.regularAccounts[0],
        revertCustomError: acErrors.WMAC_HASNT_PERMISSION(),
      });
    });

    it('should fail: when data > maxAnswer', async () => {
      const fixture = await loadFixture(defaultDeploy);
      await setRoundData(fixture, 10001, {
        revertMessage: 'CA: out of [min;max]',
      });
    });

    it('should fail: when data < minAnswer', async () => {
      const fixture = await loadFixture(defaultDeploy);
      await setRoundData(fixture, 0.00000001, {
        revertMessage: 'CA: out of [min;max]',
      });
    });
  });

  describe('setRoundDataSafe', async () => {
    it('call from owner when no prev data is set', async () => {
      const fixture = await loadFixture(defaultDeploy);
      await setRoundDataSafe(fixture, 10);
    });
    it('call from owner when prev data is set', async () => {
      const fixture = await loadFixture(defaultDeploy);
      await setRoundDataSafe(fixture, 10);
      await setRoundDataSafe(fixture, 10.1);
    });
    it('should fail: call from non owner', async () => {
      const fixture = await loadFixture(defaultDeploy);
      await setRoundDataSafe(fixture, 10, {
        from: fixture.regularAccounts[0],
        revertCustomError: acErrors.WMAC_HASNT_PERMISSION(),
      });
    });

    it('should fail: when data > maxAnswer', async () => {
      const fixture = await loadFixture(defaultDeploy);
      await setRoundDataSafe(fixture, 10001, {
        revertMessage: 'CA: out of [min;max]',
      });
    });

    it('should fail: when data < minAnswer', async () => {
      const fixture = await loadFixture(defaultDeploy);
      await setRoundDataSafe(fixture, 0.00000001, {
        revertMessage: 'CA: out of [min;max]',
      });
    });

    it('should fail: when deviation is > 1%', async () => {
      const fixture = await loadFixture(defaultDeploy);
      await setRoundDataSafe(fixture, 100);
      await setRoundDataSafe(fixture, 102, {
        revertMessage: 'CA: !deviation',
      });
    });

    it('when deviation is < 1%', async () => {
      const fixture = await loadFixture(defaultDeploy);
      await setRoundDataSafe(fixture, 100);
      await setRoundDataSafe(fixture, 100.9);
    });
  });

  describe('setMaxAnswerDeviation()', () => {
    const validMaxAnswerDeviation = parseUnits('0.5', 8);
    const invalidMaxAnswerDeviation = parseUnits('101', 8);
    const setMaxAnswerDeviationSelector = encodeFnSelector(
      'setMaxAnswerDeviation(uint256)',
    );

    it('call from owner', async () => {
      const fixture = await loadFixture(defaultDeploy);

      await setMaxAnswerDeviationTest(fixture, validMaxAnswerDeviation);
    });

    it('should fail: call from non owner', async () => {
      const fixture = await loadFixture(defaultDeploy);

      await setMaxAnswerDeviationTest(fixture, validMaxAnswerDeviation, {
        from: fixture.regularAccounts[0],
        revertCustomError: acErrors.WMAC_HASNT_PERMISSION(),
      });
    });

    it('should fail: when maxAnswerDeviation is greater than 100%', async () => {
      const fixture = await loadFixture(defaultDeploy);

      await setMaxAnswerDeviationTest(fixture, invalidMaxAnswerDeviation, {
        revertMessage: 'CA: !max deviation',
      });
    });

    it('succeeds with only scoped function permission', async () => {
      const { accessControl, customFeed, owner, regularAccounts } =
        await loadFixture(defaultDeploy);

      const user = regularAccounts[0];
      const feedAdminRole = await customFeed.contractAdminRole();

      await setupGrantOperatorRole({
        accessControl,
        owner,
        masterRole: feedAdminRole,
        targetContract: customFeed.address,
        functionSelector: setMaxAnswerDeviationSelector,
        grantOperator: owner,
      });

      await setPermissionRoleTester(
        { accessControl, owner },
        feedAdminRole,
        customFeed.address,
        setMaxAnswerDeviationSelector,
        [{ account: user.address, enabled: true }],
      );

      expect(await accessControl.hasRole(feedAdminRole, user.address)).eq(
        false,
      );

      await setMaxAnswerDeviationTest(
        { customFeed, owner },
        validMaxAnswerDeviation,
        { from: user },
      );
    });

    it('succeeds with scoped permission and feed admin role', async () => {
      const { accessControl, customFeed, owner, regularAccounts } =
        await loadFixture(defaultDeploy);

      const user = regularAccounts[0];
      const feedAdminRole = await customFeed.contractAdminRole();

      await setupGrantOperatorRole({
        accessControl,
        owner,
        masterRole: feedAdminRole,
        targetContract: customFeed.address,
        functionSelector: setMaxAnswerDeviationSelector,
        grantOperator: owner,
      });

      await setPermissionRoleTester(
        { accessControl, owner },
        feedAdminRole,
        customFeed.address,
        setMaxAnswerDeviationSelector,
        [{ account: user.address, enabled: true }],
      );

      await accessControl['grantRole(bytes32,address)'](
        feedAdminRole,
        user.address,
      );

      await setMaxAnswerDeviationTest(
        { customFeed, owner },
        validMaxAnswerDeviation,
        { from: user },
      );
    });

    it('when called through timelock with contract admin role', async () => {
      const {
        accessControl,
        customFeed,
        owner,
        regularAccounts,
        timelock,
        timelockManager,
      } = await loadFixture(defaultDeploy);

      const proposer = regularAccounts[0];
      const feedAdminRole = await customFeed.contractAdminRole();

      await accessControl['grantRole(bytes32,address)'](
        feedAdminRole,
        proposer.address,
      );

      await setRoleTimelocksTester(
        { timelockManager, timelock, owner, accessControl },
        [feedAdminRole],
        [3600],
      );

      const calldata = customFeed.interface.encodeFunctionData(
        'setMaxAnswerDeviation',
        [validMaxAnswerDeviation],
      );

      await scheduleTimelockOperationsTester(
        { timelockManager, timelock, owner, accessControl },
        [customFeed.address],
        [calldata],
        {},
        { from: proposer },
      );

      await increase(3600);

      await executeTimelockOperationTester(
        { timelockManager, timelock, owner, accessControl },
        customFeed.address,
        calldata,
        proposer.address,
        { from: owner },
      );

      expect(await customFeed.maxAnswerDeviation()).eq(validMaxAnswerDeviation);
    });

    it('when called through timelock with function admin role', async () => {
      const {
        accessControl,
        customFeed,
        owner,
        regularAccounts,
        timelock,
        timelockManager,
      } = await loadFixture(defaultDeploy);

      const proposer = regularAccounts[0];
      const feedAdminRole = await customFeed.contractAdminRole();

      await setupGrantOperatorRole({
        accessControl,
        owner,
        masterRole: feedAdminRole,
        targetContract: customFeed.address,
        functionSelector: setMaxAnswerDeviationSelector,
        grantOperator: owner,
      });

      await setupGrantOperatorRole({
        accessControl,
        owner,
        masterRole: feedAdminRole,
        targetContract: timelockManager.address,
        functionSelector: setMaxAnswerDeviationSelector,
        grantOperator: owner,
      });

      await setPermissionRoleTester(
        { accessControl, owner },
        feedAdminRole,
        customFeed.address,
        setMaxAnswerDeviationSelector,
        [{ account: proposer.address, enabled: true }],
      );

      await setPermissionRoleTester(
        { accessControl, owner },
        feedAdminRole,
        timelockManager.address,
        setMaxAnswerDeviationSelector,
        [{ account: proposer.address, enabled: true }],
      );

      expect(await accessControl.hasRole(feedAdminRole, proposer.address)).eq(
        false,
      );

      const feedPermissionKey = await accessControl.permissionRoleKey(
        feedAdminRole,
        customFeed.address,
        setMaxAnswerDeviationSelector,
      );
      const timelockPermissionKey = await accessControl.permissionRoleKey(
        feedAdminRole,
        timelockManager.address,
        setMaxAnswerDeviationSelector,
      );

      await setRoleTimelocksTester(
        { timelockManager, timelock, owner, accessControl },
        [feedPermissionKey, timelockPermissionKey],
        [3600, 3600],
      );

      const calldata = customFeed.interface.encodeFunctionData(
        'setMaxAnswerDeviation',
        [validMaxAnswerDeviation],
      );

      await scheduleTimelockOperationsTester(
        { timelockManager, timelock, owner, accessControl },
        [customFeed.address],
        [calldata],
        {},
        { from: proposer },
      );

      await increase(3600);

      await executeTimelockOperationTester(
        { timelockManager, timelock, owner, accessControl },
        customFeed.address,
        calldata,
        proposer.address,
        { from: owner },
      );

      expect(await customFeed.maxAnswerDeviation()).eq(validMaxAnswerDeviation);
    });
  });

  describe('_getDeviation', async () => {
    it('when new price is 0', async () => {
      const fixture = await loadFixture(defaultDeploy);

      expect(await fixture.customFeed.getDeviation(1, 0)).eq(
        parseUnits('100', 8),
      );
    });

    it('when price changes from 100 to 105', async () => {
      const fixture = await loadFixture(defaultDeploy);

      expect(
        await fixture.customFeed.getDeviation(
          parseUnits('100', 8),
          parseUnits('105', 8),
        ),
      ).eq(parseUnits(calculatePriceDiviation(100, 105).toString(), 8));
    });

    it('when price changes from 100 to 105', async () => {
      const fixture = await loadFixture(defaultDeploy);

      expect(
        await fixture.customFeed.getDeviation(
          parseUnits('100', 8),
          parseUnits('95', 8),
        ),
      ).eq(parseUnits(calculatePriceDiviation(100, 95).toString(), 8));
    });

    it('when price changes from 1 to 1000000', async () => {
      const fixture = await loadFixture(defaultDeploy);

      expect(
        await fixture.customFeed.getDeviation(
          parseUnits('1', 8),
          parseUnits('1000000', 8),
        ),
      ).eq(parseUnits(calculatePriceDiviation(1, 1000000).toString(), 8));
    });
  });
});
