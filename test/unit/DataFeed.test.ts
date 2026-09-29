import { loadFixture } from '@nomicfoundation/hardhat-network-helpers';
import {
  increase,
  setNextBlockTimestamp,
} from '@nomicfoundation/hardhat-network-helpers/dist/src/helpers/time';
import { expect } from 'chai';
import { parseUnits } from 'ethers/lib/utils';
import { ethers } from 'hardhat';

import { encodeFnSelector } from '../../helpers/utils';
import {
  AggregatorV3Mock__factory,
  DataFeed,
  DataFeed__factory,
  DataFeedTest,
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
import {
  deployProxyContract,
  setInitializedVersion,
  setProxyAdmin,
} from '../common/deploy.helpers';
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
    expect(await dataFeed.sequencerUptimeAggregator()).eq(
      ethers.constants.AddressZero,
    );
    expect(await dataFeed.SEQUENCER_UPTIME_AGGREGATOR_GRACE_PERIOD()).eq(
      60 * 60,
    );
    await validateImplementation(DataFeed__factory);
  });

  it('initialize', async () => {
    const { dataFeed, owner, accessControl, mockedAggregator } =
      await loadFixture(defaultDeploy);

    await expect(
      dataFeed.initialize(
        ethers.constants.AddressZero,
        ethers.constants.AddressZero,
        0,
        0,
        0,
        ethers.constants.AddressZero,
      ),
    ).revertedWith('Initializable: contract is already initialized');

    const dataFeedNew = await new DataFeedTest__factory(owner).deploy();

    await expect(
      dataFeedNew.initialize(
        accessControl.address,
        ethers.constants.AddressZero,
        1,
        0,
        0,
        ethers.constants.AddressZero,
      ),
    ).revertedWith('DF: invalid max exp. price');

    await expect(
      dataFeedNew.initialize(
        ethers.constants.AddressZero,
        dataFeedNew.address,
        1,
        1,
        2,
        ethers.constants.AddressZero,
      ),
    ).revertedWithCustomError(dataFeedNew, 'InvalidAddress');

    await expect(
      dataFeedNew.initialize(
        accessControl.address,
        ethers.constants.AddressZero,
        1,
        1,
        2,
        ethers.constants.AddressZero,
      ),
    ).revertedWith('DF: invalid address');

    await expect(
      dataFeedNew.initialize(
        accessControl.address,
        dataFeedNew.address,
        0,
        1,
        2,
        ethers.constants.AddressZero,
      ),
    ).revertedWith('DF: invalid diff');

    await expect(
      dataFeedNew.initialize(
        accessControl.address,
        dataFeedNew.address,
        1,
        0,
        2,
        ethers.constants.AddressZero,
      ),
    ).revertedWith('DF: invalid min exp. price');

    await expect(
      dataFeedNew.initialize(
        accessControl.address,
        dataFeedNew.address,
        1,
        1,
        0,
        ethers.constants.AddressZero,
      ),
    ).revertedWith('DF: invalid max exp. price');

    await expect(
      dataFeedNew.initialize(
        accessControl.address,
        dataFeedNew.address,
        1,
        2,
        1,
        ethers.constants.AddressZero,
      ),
    ).revertedWith('DF: invalid exp. prices');

    const sequencerUptimeAggregator = await new AggregatorV3Mock__factory(
      owner,
    ).deploy();

    await dataFeedNew.initialize(
      accessControl.address,
      mockedAggregator.address,
      1,
      1,
      2,
      sequencerUptimeAggregator.address,
    );

    expect(await dataFeedNew.aggregator()).eq(mockedAggregator.address);
    expect(await dataFeedNew.sequencerUptimeAggregator()).eq(
      sequencerUptimeAggregator.address,
    );
    expect(await dataFeedNew.healthyDiff()).eq(1);

    const dataFeedWithoutL2 = await new DataFeedTest__factory(owner).deploy();
    await dataFeedWithoutL2.initialize(
      accessControl.address,
      mockedAggregator.address,
      1,
      1,
      2,
      ethers.constants.AddressZero,
    );
    expect(await dataFeedWithoutL2.sequencerUptimeAggregator()).eq(
      ethers.constants.AddressZero,
    );
  });

  describe('initializeV2()', () => {
    const deployDataFeed = (
      accessControl: string,
      aggregator: string,
      sequencerUptimeAggregator: string,
    ) =>
      deployProxyContract<DataFeed>(
        'DataFeed',
        [
          accessControl,
          aggregator,
          3 * 24 * 3600,
          parseUnits('0.1', 8),
          parseUnits('10000', 8),
          sequencerUptimeAggregator,
        ],
        'initialize',
        [ethers.constants.HashZero],
      );

    it('fresh deploy runs initializeV2 while proxy admin is zero', async () => {
      const { accessControl, mockedAggregator, owner } = await loadFixture(
        defaultDeploy,
      );
      const sequencerUptimeAggregator = await new AggregatorV3Mock__factory(
        owner,
      ).deploy();
      await sequencerUptimeAggregator.setRoundDataWithTimestamps(0, 1, 1);

      const feed = await deployDataFeed(
        accessControl.address,
        mockedAggregator.address,
        sequencerUptimeAggregator.address,
      );

      expect(await feed.aggregator()).eq(mockedAggregator.address);
      expect(await feed.sequencerUptimeAggregator()).eq(
        sequencerUptimeAggregator.address,
      );
      expect(await feed.getDataInBase18()).eq(parseUnits('1.02'));
    });

    it('should fail: when already reinitialized, even from the proxy admin', async () => {
      const { accessControl, mockedAggregator } = await loadFixture(
        defaultDeploy,
      );
      const [, admin, stranger] = await ethers.getSigners();
      const feed = await deployDataFeed(
        accessControl.address,
        mockedAggregator.address,
        ethers.constants.AddressZero,
      );

      await setProxyAdmin(feed.address, admin.address);

      await expect(
        feed.connect(admin).initializeV2(ethers.constants.AddressZero),
      ).revertedWith('Initializable: contract is already initialized');
      await expect(
        feed.connect(stranger).initializeV2(mockedAggregator.address),
      ).revertedWith('Initializable: contract is already initialized');
    });

    it('should fail: when initialized and caller is not the proxy admin', async () => {
      const { accessControl, mockedAggregator } = await loadFixture(
        defaultDeploy,
      );
      const [, admin, stranger] = await ethers.getSigners();
      const feed = await deployDataFeed(
        accessControl.address,
        mockedAggregator.address,
        ethers.constants.AddressZero,
      );

      await setProxyAdmin(feed.address, admin.address);
      await setInitializedVersion(feed.address, 1);

      await expect(
        feed.connect(stranger).initializeV2(mockedAggregator.address),
      ).revertedWithCustomError(feed, 'SenderNotProxyAdmin');

      expect(await feed.sequencerUptimeAggregator()).eq(
        ethers.constants.AddressZero,
      );
    });

    it('when initialized and caller is the proxy admin', async () => {
      const { accessControl, mockedAggregator, owner } = await loadFixture(
        defaultDeploy,
      );
      const [, admin] = await ethers.getSigners();
      const sequencerUptimeAggregator = await new AggregatorV3Mock__factory(
        owner,
      ).deploy();
      await sequencerUptimeAggregator.setRoundDataWithTimestamps(1, 1, 1);

      const feed = await deployDataFeed(
        accessControl.address,
        mockedAggregator.address,
        ethers.constants.AddressZero,
      );

      expect(await feed.getDataInBase18()).eq(parseUnits('1.02'));

      await setProxyAdmin(feed.address, admin.address);
      await setInitializedVersion(feed.address, 1);

      await feed.connect(admin).initializeV2(sequencerUptimeAggregator.address);

      expect(await feed.sequencerUptimeAggregator()).eq(
        sequencerUptimeAggregator.address,
      );
      await expect(feed.getDataInBase18()).revertedWith(
        'DF: sequencer is unhealthy',
      );

      await expect(
        feed.connect(admin).initializeV2(ethers.constants.AddressZero),
      ).revertedWith('Initializable: contract is already initialized');
    });

    it('proxy admin can disable the feed with the zero address', async () => {
      const { accessControl, mockedAggregator, owner } = await loadFixture(
        defaultDeploy,
      );
      const [, admin] = await ethers.getSigners();
      const sequencerUptimeAggregator = await new AggregatorV3Mock__factory(
        owner,
      ).deploy();
      await sequencerUptimeAggregator.setRoundDataWithTimestamps(1, 1, 1);

      const feed = await deployDataFeed(
        accessControl.address,
        mockedAggregator.address,
        sequencerUptimeAggregator.address,
      );

      await expect(feed.getDataInBase18()).revertedWith(
        'DF: sequencer is unhealthy',
      );

      await setProxyAdmin(feed.address, admin.address);
      await setInitializedVersion(feed.address, 1);

      await feed.connect(admin).initializeV2(ethers.constants.AddressZero);

      expect(await feed.sequencerUptimeAggregator()).eq(
        ethers.constants.AddressZero,
      );
      expect(await feed.getDataInBase18()).eq(parseUnits('1.02'));
    });
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

      await expect(dataFeed.changeAggregator(mockedAggregator.address))
        .to.emit(dataFeed, 'ChangeAggregator')
        .withArgs(mockedAggregator.address);
    });
  });

  describe('changeSequencerUptimeAggregator()', () => {
    it('should fail: call from address without DEFAULT_ADMIN_ROLE', async () => {
      const { dataFeed, regularAccounts } = await loadFixture(defaultDeploy);

      await expect(
        dataFeed
          .connect(regularAccounts[0])
          .changeSequencerUptimeAggregator(ethers.constants.AddressZero),
      ).revertedWithCustomError(
        dataFeed,
        acErrors.WMAC_HASNT_PERMISSION().customErrorName,
      );
    });

    it('sets a new l2 uptime aggregator', async () => {
      const { dataFeed, owner } = await loadFixture(defaultDeploy);
      const sequencerUptimeAggregator = await new AggregatorV3Mock__factory(
        owner,
      ).deploy();

      await expect(
        dataFeed.changeSequencerUptimeAggregator(
          sequencerUptimeAggregator.address,
        ),
      )
        .to.emit(dataFeed, 'ChangeSequencerUptimeAggregator')
        .withArgs(sequencerUptimeAggregator.address);

      expect(await dataFeed.sequencerUptimeAggregator()).eq(
        sequencerUptimeAggregator.address,
      );
    });

    it('disables the check when zero address is passed', async () => {
      const { dataFeed, owner } = await loadFixture(defaultDeploy);
      const sequencerUptimeAggregator = await new AggregatorV3Mock__factory(
        owner,
      ).deploy();

      await dataFeed.changeSequencerUptimeAggregator(
        sequencerUptimeAggregator.address,
      );

      await expect(
        dataFeed.changeSequencerUptimeAggregator(ethers.constants.AddressZero),
      )
        .to.emit(dataFeed, 'ChangeSequencerUptimeAggregator')
        .withArgs(ethers.constants.AddressZero);

      expect(await dataFeed.sequencerUptimeAggregator()).eq(
        ethers.constants.AddressZero,
      );
    });

    it('replaces an existing l2 uptime aggregator', async () => {
      const { dataFeed, owner } = await loadFixture(defaultDeploy);
      const first = await new AggregatorV3Mock__factory(owner).deploy();
      const second = await new AggregatorV3Mock__factory(owner).deploy();

      await dataFeed.changeSequencerUptimeAggregator(first.address);
      await dataFeed.changeSequencerUptimeAggregator(second.address);

      expect(await dataFeed.sequencerUptimeAggregator()).eq(second.address);
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

  describe('getDataInBase18() l2 uptime feed', () => {
    const mineAt = async (timestamp: number) => {
      await setNextBlockTimestamp(timestamp);
      await ethers.provider.send('evm_mine', []);
    };

    const setSequencerRound = async (
      sequencer: Awaited<ReturnType<AggregatorV3Mock__factory['deploy']>>,
      answer: number,
      startedAt: number,
      updatedAt: number = startedAt,
    ) => {
      await sequencer.setRoundDataWithTimestamps(answer, startedAt, updatedAt);
    };

    const attachSequencer = async (
      dataFeed: DataFeedTest,
      owner: Awaited<ReturnType<typeof defaultDeploy>>['owner'],
      answer: number,
      startedAt: number,
      updatedAt: number = startedAt,
    ) => {
      const sequencer = await new AggregatorV3Mock__factory(owner).deploy();
      await setSequencerRound(sequencer, answer, startedAt, updatedAt);
      await dataFeed.changeSequencerUptimeAggregator(sequencer.address);
      return sequencer;
    };

    it('returns the price when the sequencer is up and the grace period has passed', async () => {
      const { dataFeed, owner } = await loadFixture(defaultDeploy);
      const now = (await ethers.provider.getBlock('latest')).timestamp + 100;
      const gracePeriod = (
        await dataFeed.SEQUENCER_UPTIME_AGGREGATOR_GRACE_PERIOD()
      ).toNumber();

      await attachSequencer(dataFeed, owner, 0, now - gracePeriod - 1, now);
      await mineAt(now);

      expect(await dataFeed.getDataInBase18()).eq(parseUnits('1.02'));
    });

    it('accepts a price published at the sequencer startedAt', async () => {
      const { dataFeed, owner, mockedAggregator } = await loadFixture(
        defaultDeploy,
      );
      const now = (await ethers.provider.getBlock('latest')).timestamp + 100;
      const gracePeriod = (
        await dataFeed.SEQUENCER_UPTIME_AGGREGATOR_GRACE_PERIOD()
      ).toNumber();
      const startedAt = now - gracePeriod - 1;

      await attachSequencer(dataFeed, owner, 0, startedAt, 1);
      await mockedAggregator.setRoundDataWithTimestamps(
        parseUnits('4', await mockedAggregator.decimals()),
        0,
        startedAt,
      );
      await mineAt(now);

      expect(await dataFeed.getDataInBase18()).eq(parseUnits('4'));
    });

    it('accepts a price published after startedAt and before the uptime round updatedAt', async () => {
      const { dataFeed, owner, mockedAggregator } = await loadFixture(
        defaultDeploy,
      );
      const now = (await ethers.provider.getBlock('latest')).timestamp + 100;
      const startedAt = now - 2 * 60 * 60;

      await attachSequencer(dataFeed, owner, 0, startedAt, now);
      await mockedAggregator.setRoundDataWithTimestamps(
        parseUnits('4', await mockedAggregator.decimals()),
        0,
        now - 90 * 60,
      );
      await mineAt(now);

      expect(await dataFeed.getDataInBase18()).eq(parseUnits('4'));
    });

    it('should fail: when sequencer is down', async () => {
      const { dataFeed, owner } = await loadFixture(defaultDeploy);
      const now = (await ethers.provider.getBlock('latest')).timestamp + 100;

      await attachSequencer(dataFeed, owner, 1, now - 2 * 60 * 60);
      await mineAt(now);

      await expect(dataFeed.getDataInBase18()).revertedWith(
        'DF: sequencer is unhealthy',
      );
    });

    it('should fail: when sequencer answer is not up or down', async () => {
      const { dataFeed, owner } = await loadFixture(defaultDeploy);
      const now = (await ethers.provider.getBlock('latest')).timestamp + 100;
      const sequencer = await attachSequencer(
        dataFeed,
        owner,
        2,
        now - 2 * 60 * 60,
      );
      await mineAt(now);

      await expect(dataFeed.getDataInBase18()).revertedWith(
        'DF: sequencer is unhealthy',
      );

      await setSequencerRound(sequencer, -1, now - 2 * 60 * 60);
      await expect(dataFeed.getDataInBase18()).revertedWith(
        'DF: sequencer is unhealthy',
      );
    });

    it('should fail: when sequencer startedAt is zero', async () => {
      const { dataFeed, owner } = await loadFixture(defaultDeploy);

      await attachSequencer(dataFeed, owner, 0, 0, 0);

      await expect(dataFeed.getDataInBase18()).revertedWith(
        'DF: sequencer is unhealthy',
      );
    });

    it('should fail: when the grace period has not passed', async () => {
      const { dataFeed, owner } = await loadFixture(defaultDeploy);
      const now = (await ethers.provider.getBlock('latest')).timestamp + 100;
      const gracePeriod = (
        await dataFeed.SEQUENCER_UPTIME_AGGREGATOR_GRACE_PERIOD()
      ).toNumber();
      const sequencer = await attachSequencer(
        dataFeed,
        owner,
        0,
        now - gracePeriod + 1,
        1,
      );

      await mineAt(now);
      await expect(dataFeed.getDataInBase18()).revertedWith(
        'DF: sequencer is unhealthy',
      );

      const boundary =
        (await ethers.provider.getBlock('latest')).timestamp + 50;
      await setSequencerRound(sequencer, 0, boundary - gracePeriod, boundary);
      await mineAt(boundary);
      await expect(dataFeed.getDataInBase18()).revertedWith(
        'DF: sequencer is unhealthy',
      );
    });

    it('passes on the first second after the grace period', async () => {
      const { dataFeed, owner } = await loadFixture(defaultDeploy);
      const now = (await ethers.provider.getBlock('latest')).timestamp + 100;
      const gracePeriod = (
        await dataFeed.SEQUENCER_UPTIME_AGGREGATOR_GRACE_PERIOD()
      ).toNumber();

      await attachSequencer(dataFeed, owner, 0, now - gracePeriod - 1, 1);
      await mineAt(now);

      expect(await dataFeed.getDataInBase18()).eq(parseUnits('1.02'));
    });

    it('should fail: when startedAt is in the future', async () => {
      const { dataFeed, owner } = await loadFixture(defaultDeploy);
      const now = (await ethers.provider.getBlock('latest')).timestamp + 100;

      await attachSequencer(dataFeed, owner, 0, now + 10);
      await mineAt(now);

      await expect(dataFeed.getDataInBase18()).to.be.revertedWithPanic(0x11);
    });

    it('should fail: when sequencer is down even if startedAt is in the future', async () => {
      const { dataFeed, owner } = await loadFixture(defaultDeploy);
      const now = (await ethers.provider.getBlock('latest')).timestamp + 100;

      await attachSequencer(dataFeed, owner, 1, now + 10);
      await mineAt(now);

      await expect(dataFeed.getDataInBase18()).revertedWith(
        'DF: sequencer is unhealthy',
      );
    });

    it('should fail: when the price was published before the sequencer recovered', async () => {
      const { dataFeed, owner, mockedAggregator } = await loadFixture(
        defaultDeploy,
      );
      const now = (await ethers.provider.getBlock('latest')).timestamp + 100;
      const startedAt = now - 2 * 60 * 60;

      await attachSequencer(dataFeed, owner, 0, startedAt);
      await mockedAggregator.setRoundDataWithTimestamps(
        parseUnits('4', await mockedAggregator.decimals()),
        0,
        startedAt - 1,
      );
      await mineAt(now);

      await expect(dataFeed.getDataInBase18()).revertedWith(
        'DF: feed is unhealthy',
      );
    });

    it('should fail: when the price is older than healthyDiff after recovery', async () => {
      const { dataFeed, owner, mockedAggregator } = await loadFixture(
        defaultDeploy,
      );
      const now = (await ethers.provider.getBlock('latest')).timestamp + 100;
      const healthyDiff = (await dataFeed.healthyDiff()).toNumber();
      const startedAt = now - healthyDiff - 10;

      await attachSequencer(dataFeed, owner, 0, startedAt);
      await mockedAggregator.setRoundDataWithTimestamps(
        parseUnits('4', await mockedAggregator.decimals()),
        0,
        startedAt,
      );
      await mineAt(now);

      await expect(dataFeed.getDataInBase18()).revertedWith(
        'DF: feed is unhealthy',
      );
    });

    it('should fail: when the price is deprecated and the sequencer is up', async () => {
      const { dataFeed, owner, mockedAggregator } = await loadFixture(
        defaultDeploy,
      );

      await attachSequencer(dataFeed, owner, 0, 1);
      await mockedAggregator.setRoundData(-1);

      await expect(dataFeed.getDataInBase18()).revertedWith(
        'DF: feed is deprecated',
      );
    });

    it('should fail: l2 check runs before the price check', async () => {
      const { dataFeed, owner, mockedAggregator } = await loadFixture(
        defaultDeploy,
      );
      const now = (await ethers.provider.getBlock('latest')).timestamp + 100;

      await attachSequencer(dataFeed, owner, 1, now - 2 * 60 * 60);
      await mockedAggregator.setRoundData(-1);
      await mineAt(now);

      await expect(dataFeed.getDataInBase18()).revertedWith(
        'DF: sequencer is unhealthy',
      );
    });

    it('should fail: when the price is below the minimum and the sequencer is up', async () => {
      const { dataFeed, owner, mockedAggregator } = await loadFixture(
        defaultDeploy,
      );

      await attachSequencer(dataFeed, owner, 0, 1);
      await setRoundData({ mockedAggregator }, 0.099);

      await expect(dataFeed.getDataInBase18()).revertedWith(
        'DF: feed is unhealthy',
      );
    });

    it('should fail: when the price is above the maximum and the sequencer is up', async () => {
      const { dataFeed, owner, mockedAggregator } = await loadFixture(
        defaultDeploy,
      );

      await attachSequencer(dataFeed, owner, 0, 1);
      await setRoundData({ mockedAggregator }, 10001);

      await expect(dataFeed.getDataInBase18()).revertedWith(
        'DF: feed is unhealthy',
      );
    });

    it('disabling the feed allows reads while the sequencer is down', async () => {
      const { dataFeed, owner } = await loadFixture(defaultDeploy);
      const now = (await ethers.provider.getBlock('latest')).timestamp + 100;

      await attachSequencer(dataFeed, owner, 1, now - 2 * 60 * 60);
      await mineAt(now);
      await expect(dataFeed.getDataInBase18()).revertedWith(
        'DF: sequencer is unhealthy',
      );

      await dataFeed.changeSequencerUptimeAggregator(
        ethers.constants.AddressZero,
      );

      expect(await dataFeed.getDataInBase18()).eq(parseUnits('1.02'));
    });

    it('enabling the feed rejects reads while the sequencer is down', async () => {
      const { dataFeed, owner } = await loadFixture(defaultDeploy);
      const now = (await ethers.provider.getBlock('latest')).timestamp + 100;

      expect(await dataFeed.getDataInBase18()).eq(parseUnits('1.02'));

      await attachSequencer(dataFeed, owner, 1, now - 2 * 60 * 60);
      await mineAt(now);

      await expect(dataFeed.getDataInBase18()).revertedWith(
        'DF: sequencer is unhealthy',
      );
    });

    it('replacing a down feed with an up feed allows reads', async () => {
      const { dataFeed, owner } = await loadFixture(defaultDeploy);
      const now = (await ethers.provider.getBlock('latest')).timestamp + 100;

      await attachSequencer(dataFeed, owner, 1, now - 2 * 60 * 60);
      await mineAt(now);
      await expect(dataFeed.getDataInBase18()).revertedWith(
        'DF: sequencer is unhealthy',
      );

      await attachSequencer(dataFeed, owner, 0, 1);

      expect(await dataFeed.getDataInBase18()).eq(parseUnits('1.02'));
    });

    it('enforces the feed passed to initialize', async () => {
      const {
        owner,
        accessControl,
        mockedAggregator,
        mockedAggregatorDecimals,
      } = await loadFixture(defaultDeploy);
      const dataFeedNew = await new DataFeedTest__factory(owner).deploy();
      const sequencer = await new AggregatorV3Mock__factory(owner).deploy();
      const now = (await ethers.provider.getBlock('latest')).timestamp + 100;

      await setSequencerRound(sequencer, 1, now - 2 * 60 * 60);
      await dataFeedNew.initialize(
        accessControl.address,
        mockedAggregator.address,
        3 * 24 * 3600,
        parseUnits('0.1', mockedAggregatorDecimals),
        parseUnits('10000', mockedAggregatorDecimals),
        sequencer.address,
      );
      await mineAt(now);

      await expect(dataFeedNew.getDataInBase18()).revertedWith(
        'DF: sequencer is unhealthy',
      );
    });

    it('should fail: when the l2 feed address has no aggregator', async () => {
      const { dataFeed, owner } = await loadFixture(defaultDeploy);

      await dataFeed.changeSequencerUptimeAggregator(owner.address);

      await expect(dataFeed.getDataInBase18()).to.be.reverted;
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

    await dataFeedGrowth.setMinMaxExpectedAnswer(
      parseUnits('100', 8),
      parseUnits('10', 8),
    );

    await setRoundDataGrowth(fixture, 100, -100, 0);
    await expect(dataFeedGrowth.getDataInBase18()).to.be.not.reverted;
    await setRoundDataGrowth(fixture, 101, -100, 0);
    await expect(dataFeedGrowth.getDataInBase18()).revertedWith(
      'DF: feed is unhealthy',
    );
  });
});
