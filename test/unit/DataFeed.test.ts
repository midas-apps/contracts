import { loadFixture } from '@nomicfoundation/hardhat-network-helpers';
import { increase } from '@nomicfoundation/hardhat-network-helpers/dist/src/helpers/time';
import { expect } from 'chai';
import { parseUnits } from 'ethers/lib/utils';
import { ethers } from 'hardhat';

import { encodeFnSelector } from '../../helpers/utils';
import {
  DataFeed__factory,
  DataFeedTest__factory,
} from '../../typechain-types';
import {
  acErrors,
  setPermissionRoleTester,
  setRoleTimelocksTester,
  setupGrantOperatorRole,
} from '../common/ac.helpers';
import { validateImplementation } from '../common/common.helpers';
import {
  setMinGrowthApr,
  setRoundDataGrowth,
} from '../common/custom-feed-growth.helpers';
import { setHealthyDiffTest, setRoundData } from '../common/data-feed.helpers';
import { defaultDeploy } from '../common/fixtures';
import {
  bulkScheduleTimelockOperationTester,
  executeTimelockOperationTester,
} from '../common/timelock-manager.helpers';

describe('DataFeed', function () {
  it('deployment', async () => {
    const { dataFeed, mockedAggregator, mockedAggregatorDecimals } =
      await loadFixture(defaultDeploy);

    expect(await dataFeed.aggregator()).eq(mockedAggregator.address);
    expect(await dataFeed.healthyDiff()).eq(3 * 24 * 3600);
    expect(await dataFeed.minExpectedAnswer()).eq(
      parseUnits('0.1', mockedAggregatorDecimals),
    );
    expect(await dataFeed.maxExpectedAnswer()).eq(
      parseUnits('10000', mockedAggregatorDecimals),
    );
    await validateImplementation(DataFeed__factory);
  });

  it('initialize', async () => {
    const { dataFeed, owner } = await loadFixture(defaultDeploy);

    await expect(
      dataFeed.initialize(
        ethers.constants.AddressZero,
        ethers.constants.AddressZero,
        0,
        0,
        0,
      ),
    ).revertedWith('Initializable: contract is already initialized');

    const dataFeedNew = await new DataFeedTest__factory(owner).deploy();

    await expect(
      dataFeedNew.initialize(
        ethers.constants.AddressZero,
        ethers.constants.AddressZero,
        0,
        0,
        0,
      ),
    ).revertedWith('DF: invalid address');

    await expect(
      dataFeedNew.initialize(dataFeedNew.address, dataFeedNew.address, 0, 0, 0),
    ).revertedWith('DF: invalid diff');

    await expect(
      dataFeedNew.initialize(dataFeedNew.address, dataFeedNew.address, 1, 0, 0),
    ).revertedWith('DF: invalid min exp. price');

    await expect(
      dataFeedNew.initialize(dataFeedNew.address, dataFeedNew.address, 1, 1, 0),
    ).revertedWith('DF: invalid max exp. price');

    await expect(
      dataFeedNew.initialize(dataFeedNew.address, dataFeedNew.address, 1, 2, 1),
    ).revertedWith('DF: invalid exp. prices');
  });

  describe('changeAggregator()', () => {
    it('should fail: call from address without DEFAULT_ADMIN_ROLE', async () => {
      const { dataFeed, regularAccounts } = await loadFixture(defaultDeploy);

      await expect(
        dataFeed
          .connect(regularAccounts[0])
          .changeAggregator(ethers.constants.AddressZero),
      ).revertedWithCustomError(
        dataFeed,
        acErrors.WMAC_HASNT_PERMISSION().customErrorName,
      );
    });

    it('should fail: pass zero address', async () => {
      const { dataFeed } = await loadFixture(defaultDeploy);

      await expect(
        dataFeed.changeAggregator(ethers.constants.AddressZero),
      ).revertedWith('DF: invalid address');
    });

    it('pass new aggregator address', async () => {
      const { dataFeed, mockedAggregator } = await loadFixture(defaultDeploy);

      await expect(dataFeed.changeAggregator(mockedAggregator.address)).not
        .reverted;
    });
  });

  describe('setHealthyDiff()', () => {
    const validHealthyDiff = 2 * 24 * 3600;
    const invalidHealthyDiff = 0;
    const setHealthyDiffSelector = encodeFnSelector('setHealthyDiff(uint256)');

    it('call from owner', async () => {
      const fixture = await loadFixture(defaultDeploy);

      await setHealthyDiffTest(fixture, validHealthyDiff);
    });

    it('should fail: call from non owner', async () => {
      const fixture = await loadFixture(defaultDeploy);

      await setHealthyDiffTest(fixture, validHealthyDiff, {
        from: fixture.regularAccounts[0],
        revertCustomError: acErrors.WMAC_HASNT_PERMISSION(),
      });
    });

    it('should fail: when healthy diff is 0', async () => {
      const fixture = await loadFixture(defaultDeploy);

      await setHealthyDiffTest(fixture, invalidHealthyDiff, {
        revertMessage: 'DF: invalid diff',
      });
    });

    it('succeeds with only scoped function permission', async () => {
      const { accessControl, dataFeed, owner, regularAccounts } =
        await loadFixture(defaultDeploy);

      const user = regularAccounts[0];
      const feedAdminRole = await dataFeed.contractAdminRole();

      await setupGrantOperatorRole({
        accessControl,
        owner,
        masterRole: feedAdminRole,
        targetContract: dataFeed.address,
        functionSelector: setHealthyDiffSelector,
        grantOperator: owner,
      });

      await setPermissionRoleTester(
        { accessControl, owner },
        undefined,
        dataFeed.address,
        setHealthyDiffSelector,
        [{ account: user.address, enabled: true }],
      );

      expect(await accessControl.hasRole(feedAdminRole, user.address)).eq(
        false,
      );

      await setHealthyDiffTest({ dataFeed, owner }, validHealthyDiff, {
        from: user,
      });
    });

    it('succeeds with scoped permission and feed admin role', async () => {
      const { accessControl, dataFeed, owner, regularAccounts } =
        await loadFixture(defaultDeploy);

      const user = regularAccounts[0];
      const feedAdminRole = await dataFeed.contractAdminRole();

      await setupGrantOperatorRole({
        accessControl,
        owner,
        masterRole: feedAdminRole,
        targetContract: dataFeed.address,
        functionSelector: setHealthyDiffSelector,
        grantOperator: owner,
      });

      await setPermissionRoleTester(
        { accessControl, owner },
        undefined,
        dataFeed.address,
        setHealthyDiffSelector,
        [{ account: user.address, enabled: true }],
      );

      await accessControl['grantRole(bytes32,address)'](
        feedAdminRole,
        user.address,
      );

      await setHealthyDiffTest({ dataFeed, owner }, validHealthyDiff, {
        from: user,
      });
    });

    it('when called through timelock with contract admin role', async () => {
      const {
        accessControl,
        dataFeed,
        owner,
        regularAccounts,
        timelock,
        timelockManager,
      } = await loadFixture(defaultDeploy);

      const proposer = regularAccounts[0];
      const feedAdminRole = await dataFeed.contractAdminRole();

      await accessControl['grantRole(bytes32,address)'](
        feedAdminRole,
        proposer.address,
      );

      await setRoleTimelocksTester(
        { timelockManager, timelock, owner, accessControl },
        [feedAdminRole],
        [3600],
      );

      const calldata = dataFeed.interface.encodeFunctionData('setHealthyDiff', [
        validHealthyDiff,
      ]);

      await bulkScheduleTimelockOperationTester(
        { timelockManager, timelock, owner, accessControl },
        [dataFeed.address],
        [calldata],
        {},
        { from: proposer },
      );

      await increase(3600);

      await executeTimelockOperationTester(
        { timelockManager, timelock, owner, accessControl },
        dataFeed.address,
        calldata,
        proposer.address,
        { from: owner },
      );

      expect(await dataFeed.healthyDiff()).eq(validHealthyDiff);
    });

    it('when called through timelock with function admin role', async () => {
      const {
        accessControl,
        dataFeed,
        owner,
        regularAccounts,
        timelock,
        timelockManager,
      } = await loadFixture(defaultDeploy);

      const proposer = regularAccounts[0];
      const feedAdminRole = await dataFeed.contractAdminRole();

      await setupGrantOperatorRole({
        accessControl,
        owner,
        masterRole: feedAdminRole,
        targetContract: dataFeed.address,
        functionSelector: setHealthyDiffSelector,
        grantOperator: owner,
      });

      await setupGrantOperatorRole({
        accessControl,
        owner,
        masterRole: feedAdminRole,
        targetContract: timelockManager.address,
        functionSelector: setHealthyDiffSelector,
        grantOperator: owner,
      });

      await setPermissionRoleTester(
        { accessControl, owner },
        feedAdminRole,
        dataFeed.address,
        setHealthyDiffSelector,
        [{ account: proposer.address, enabled: true }],
      );

      await setPermissionRoleTester(
        { accessControl, owner },
        feedAdminRole,
        timelockManager.address,
        setHealthyDiffSelector,
        [{ account: proposer.address, enabled: true }],
      );

      expect(await accessControl.hasRole(feedAdminRole, proposer.address)).eq(
        false,
      );

      const feedPermissionKey = await accessControl.permissionRoleKey(
        feedAdminRole,
        dataFeed.address,
        setHealthyDiffSelector,
      );
      const timelockPermissionKey = await accessControl.permissionRoleKey(
        feedAdminRole,
        timelockManager.address,
        setHealthyDiffSelector,
      );

      await setRoleTimelocksTester(
        { timelockManager, timelock, owner, accessControl },
        [feedPermissionKey, timelockPermissionKey],
        [3600, 3600],
      );

      const calldata = dataFeed.interface.encodeFunctionData('setHealthyDiff', [
        validHealthyDiff,
      ]);

      await bulkScheduleTimelockOperationTester(
        { timelockManager, timelock, owner, accessControl },
        [dataFeed.address],
        [calldata],
        {},
        { from: proposer },
      );

      await increase(3600);

      await executeTimelockOperationTester(
        { timelockManager, timelock, owner, accessControl },
        dataFeed.address,
        calldata,
        proposer.address,
        { from: owner },
      );

      expect(await dataFeed.healthyDiff()).eq(validHealthyDiff);
    });
  });

  describe('getDataInBase18()', () => {
    it('data in base18 conversion for 4$ price', async () => {
      const { dataFeed, mockedAggregator } = await loadFixture(defaultDeploy);
      const price = '4';
      await setRoundData({ mockedAggregator }, +price);
      expect(await dataFeed.getDataInBase18()).eq(parseUnits(price));
    });

    it('data in base18 conversion for 0.001$ price', async () => {
      const { dataFeed, mockedAggregator } = await loadFixture(defaultDeploy);
      const price = '1';
      await setRoundData({ mockedAggregator }, +price);
      expect(await dataFeed.getDataInBase18()).eq(parseUnits(price));
    });

    it('with underlying growth aggregator with positive growth', async () => {
      const { dataFeedGrowth, ...fixture } = await loadFixture(defaultDeploy);

      const expectedPrice = 10.00022831;
      await setRoundDataGrowth(
        { ...fixture, expectedAnswer: expectedPrice },
        10,
        -7200,
        10,
      );
      expect(await dataFeedGrowth.getDataInBase18()).eq(
        parseUnits(expectedPrice.toString()),
      );
    });

    it('with underlying growth aggregator with negative growth', async () => {
      const { dataFeedGrowth, ...fixture } = await loadFixture(defaultDeploy);

      const expectedPrice = 9.99977169;
      await setMinGrowthApr(fixture, -10);
      await setRoundDataGrowth(
        { ...fixture, expectedAnswer: expectedPrice },
        10,
        -7200,
        -10,
      );
      expect(await dataFeedGrowth.getDataInBase18()).eq(
        parseUnits(expectedPrice.toString()),
      );
    });
  });
});

describe('DataFeed Deprecated', function () {
  it('should fail: when: feed is deprecated', async () => {
    const { deployDeprecatedFeed } = await loadFixture(defaultDeploy);
    const { dataFeedDeprecated } = await deployDeprecatedFeed();
    await expect(dataFeedDeprecated.getDataInBase18()).to.be.reverted;
  });
});

describe('DataFeed Deprecated with growth', function () {
  it('should fail: when: feed is deprecated (price < 0)', async () => {
    const { dataFeedGrowth, ...fixture } = await loadFixture(defaultDeploy);
    await setMinGrowthApr(fixture, -1000000);
    await setRoundDataGrowth(fixture, 0.001, -1000000, -1000000);
    await expect(dataFeedGrowth.getDataInBase18()).revertedWith(
      'DF: feed is deprecated',
    );
  });
});

describe('DataFeed Unhealthy', function () {
  it('should fail: when: feed is unhealthy (by time)', async () => {
    const { deployUnhealthyFeed } = await loadFixture(defaultDeploy);
    const { dataFeedUnhealthy } = await deployUnhealthyFeed();
    await expect(dataFeedUnhealthy.getDataInBase18()).to.be.reverted;
  });
  it('should fail: when: feed is unhealthy (by min answer)', async () => {
    const { dataFeed, mockedAggregator } = await loadFixture(defaultDeploy);
    await setRoundData({ mockedAggregator }, 0.1);
    await expect(dataFeed.getDataInBase18()).to.be.not.reverted;
    await setRoundData({ mockedAggregator }, 0.099);
    await expect(dataFeed.getDataInBase18()).to.be.reverted;
  });

  it('should fail: when: feed is unhealthy (by max answer)', async () => {
    const { dataFeed, mockedAggregator } = await loadFixture(defaultDeploy);
    await setRoundData({ mockedAggregator }, 10000);
    await expect(dataFeed.getDataInBase18()).to.be.not.reverted;
    await setRoundData({ mockedAggregator }, 10001);
    await expect(dataFeed.getDataInBase18()).to.be.reverted;
  });
});

describe('DataFeed Unhealthy with growth', function () {
  it('should fail: when: feed is unhealthy (by time)', async () => {
    const { dataFeedGrowth, ...fixture } = await loadFixture(defaultDeploy);
    await setRoundDataGrowth(fixture, 0.1, -10, 0);

    await increase(3 * 24 * 3600 + 1);
    await expect(dataFeedGrowth.getDataInBase18()).revertedWith(
      'DF: feed is unhealthy',
    );
  });
  it('should fail: when: feed is unhealthy (by min answer)', async () => {
    const { dataFeedGrowth, ...fixture } = await loadFixture(defaultDeploy);
    await setRoundDataGrowth(fixture, 0.1, -100, 0);
    await expect(dataFeedGrowth.getDataInBase18()).to.be.not.reverted;
    await setRoundDataGrowth(fixture, 0.099, -100, 0);
    await expect(dataFeedGrowth.getDataInBase18()).revertedWith(
      'DF: feed is unhealthy',
    );
  });

  it('should fail: when: feed is unhealthy (by max answer)', async () => {
    const { dataFeedGrowth, ...fixture } = await loadFixture(defaultDeploy);

    await dataFeedGrowth.setMinExpectedAnswer(parseUnits('10', 8));
    await dataFeedGrowth.setMaxExpectedAnswer(parseUnits('100', 8));

    await setRoundDataGrowth(fixture, 100, -100, 0);
    await expect(dataFeedGrowth.getDataInBase18()).to.be.not.reverted;
    await setRoundDataGrowth(fixture, 101, -100, 0);
    await expect(dataFeedGrowth.getDataInBase18()).revertedWith(
      'DF: feed is unhealthy',
    );
  });
});
