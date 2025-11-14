import { loadFixture } from '@nomicfoundation/hardhat-network-helpers';
import { increase } from '@nomicfoundation/hardhat-network-helpers/dist/src/helpers/time';
import { expect } from 'chai';
import { parseUnits } from 'ethers/lib/utils';
import { ethers } from 'hardhat';

import {
  CustomAggregatorV3CompatibleFeedGrowth__factory,
  CustomAggregatorV3CompatibleFeedGrowthTester__factory,
} from '../../typechain-types';
import { acErrors } from '../common/ac.helpers';
import {
  setMaxGrowthApr,
  setMinGrowthApr,
  setOnlyUp,
  setRoundDataGrowth,
  setRoundDataSafeGrowth,
} from '../common/custom-feed-growth.helpers';
import { calculatePriceDiviation } from '../common/custom-feed.helpers';
import { defaultDeploy } from '../common/fixtures';

describe('CustomAggregatorV3CompatibleFeedGrowth', function () {
  it('deployment', async () => {
    const { customFeedGrowth, owner } = await loadFixture(defaultDeploy);

    expect(await customFeedGrowth.maxAnswer()).eq(parseUnits('10000', 8));
    expect(await customFeedGrowth.minAnswer()).eq(2);
    expect(await customFeedGrowth.minGrowthApr()).eq(0);
    expect(await customFeedGrowth.maxGrowthApr()).eq(parseUnits('100', 8));
    expect(await customFeedGrowth.maxAnswerDeviation()).eq(parseUnits('1', 8));
    expect(await customFeedGrowth.description()).eq('Custom Data Feed Growth');
    expect(await customFeedGrowth.decimals()).eq(8);
    expect(await customFeedGrowth.version()).eq(1);
    expect(await customFeedGrowth.latestRound()).eq(0);
    expect(await customFeedGrowth.lastAnswer()).eq(0);
    expect(await customFeedGrowth.lastTimestamp()).eq(0);
    expect(await customFeedGrowth.feedAdminRole()).eq(
      await customFeedGrowth.CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE(),
    );

    const newFeed = await new CustomAggregatorV3CompatibleFeedGrowth__factory(
      owner,
    ).deploy();

    expect(await newFeed.feedAdminRole()).eq(
      await newFeed.DEFAULT_ADMIN_ROLE(),
    );
  });

  it('initialize', async () => {
    const fixture = await loadFixture(defaultDeploy);

    await expect(
      fixture.customFeedGrowth.initialize(
        ethers.constants.AddressZero,
        0,
        0,
        0,
        0,
        0,
        false,
        '',
      ),
    ).revertedWith('Initializable: contract is already initialized');

    const testFeed =
      await new CustomAggregatorV3CompatibleFeedGrowthTester__factory(
        fixture.owner,
      ).deploy();

    await expect(
      testFeed.initialize(
        fixture.accessControl.address,
        1,
        0,
        0,
        0,
        0,
        false,
        '',
      ),
    ).revertedWith('CAG: !min/max');

    await expect(
      testFeed.initialize(
        fixture.accessControl.address,
        0,
        1,
        parseUnits('101', 8),
        1,
        2,
        false,
        '',
      ),
    ).revertedWith('CAG: !max deviation');

    await expect(
      testFeed.initialize(
        fixture.accessControl.address,
        0,
        1,
        parseUnits('99', 8),
        3,
        2,
        false,
        '',
      ),
    ).revertedWith('CAG: !min/max growth');
  });

  describe('setRoundData', async () => {
    it('call from owner', async () => {
      const fixture = await loadFixture(defaultDeploy);
      await setRoundDataGrowth(fixture, 10, -100, 0);
    });
    it('call when growthApr == maxGrowthApr', async () => {
      const fixture = await loadFixture(defaultDeploy);
      await setRoundDataGrowth(fixture, 10, -100, 100);
    });
    it('call when growthApr == minGrowthApr', async () => {
      const fixture = await loadFixture(defaultDeploy);
      await setRoundDataGrowth(fixture, 10, -100, 0);
    });

    it('call when growthApr == 0', async () => {
      const fixture = await loadFixture(defaultDeploy);
      await setRoundDataGrowth(
        { ...fixture, expectedAnswer: 10 },
        10,
        -10000,
        0,
      );
    });

    it('call when growthApr == 10 and passed seconds = 3600', async () => {
      const fixture = await loadFixture(defaultDeploy);
      await setRoundDataGrowth(
        { ...fixture, expectedAnswer: 10.00011415 },
        10,
        -3600,
        10,
      );
    });

    it('call when growthApr == 110 and passed seconds = 10', async () => {
      const fixture = await loadFixture(defaultDeploy);
      await setMaxGrowthApr(fixture, 120);
      await setRoundDataGrowth(
        { ...fixture, expectedAnswer: 10.00000348 },
        10,
        -10,
        110,
      );
    });

    it('when deviation is > 1% should ignore it when apr is positive ', async () => {
      const fixture = await loadFixture(defaultDeploy);
      await setMaxGrowthApr(fixture, 10000000);
      await setRoundDataGrowth({ ...fixture }, 10, -100000, 0);
      await setRoundDataGrowth({ ...fixture }, 10, -10000, 1000000);
    });

    it('when deviation is > 1% should ignore it when apr is negative', async () => {
      const fixture = await loadFixture(defaultDeploy);
      await setMinGrowthApr(fixture, -10000000);
      await setRoundDataGrowth({ ...fixture }, 10, -100000, 0);
      await setRoundDataGrowth({ ...fixture }, 10, -10000, -1000000);
    });

    it('call when growthApr == -1% and passed seconds = 3600 and onlyUp is true', async () => {
      const fixture = await loadFixture(defaultDeploy);
      await setMinGrowthApr(fixture, -10);

      await setRoundDataGrowth(
        { ...fixture, expectedAnswer: 9.99998859 },
        10,
        -3600,
        -1,
      );
    });

    it('should fail: call from non owner', async () => {
      const fixture = await loadFixture(defaultDeploy);
      await setRoundDataGrowth(fixture, 10, -100, 0, {
        from: fixture.regularAccounts[0],
        revertMessage: acErrors.WMAC_HASNT_ROLE,
      });
    });

    it('should fail: when data > maxAnswer', async () => {
      const fixture = await loadFixture(defaultDeploy);
      await setRoundDataGrowth(fixture, 10001, -100, 0, {
        revertMessage: 'CAG: out of [min;max]',
      });
    });

    it('should fail: when data < minAnswer', async () => {
      const fixture = await loadFixture(defaultDeploy);
      await setRoundDataGrowth(fixture, 0.00000001, -100, 0, {
        revertMessage: 'CAG: out of [min;max]',
      });
    });

    it('should fail: when data < minAnswer and growth is non 0', async () => {
      const fixture = await loadFixture(defaultDeploy);
      await setRoundDataGrowth(fixture, 0.00000001, -10000000, 10, {
        revertMessage: 'CAG: out of [min;max]',
      });
    });

    it('should fail: when growthApr is < minGrowthApr', async () => {
      const fixture = await loadFixture(defaultDeploy);
      await setRoundDataGrowth(fixture, 10, -100, -1, {
        revertMessage: 'CAG: out of [min;max] growth',
      });
    });

    it('should fail: when growthApr is > maxGrowthApr', async () => {
      const fixture = await loadFixture(defaultDeploy);
      await setRoundDataGrowth(fixture, 10, -100, 101, {
        revertMessage: 'CAG: out of [min;max] growth',
      });
    });

    it('should fail: when timestamp is >= now', async () => {
      const fixture = await loadFixture(defaultDeploy);

      await setRoundDataSafeGrowth(fixture, 10, 100000000, 10, {
        revertMessage: 'CAG: timestamp >= now',
      });
    });
  });

  describe('setRoundDataSafe', async () => {
    it('call from owner when no prev data is set', async () => {
      const fixture = await loadFixture(defaultDeploy);
      await setRoundDataSafeGrowth(fixture, 10, -100, 0);
    });
    it('call from owner when prev data is set', async () => {
      const fixture = await loadFixture(defaultDeploy);
      await setRoundDataSafeGrowth(fixture, 10, -10000, 0);
      await increase(3600);
      await setRoundDataSafeGrowth(fixture, 10.1, -100, 0);
    });

    it('call when growthApr == maxGrowthApr', async () => {
      const fixture = await loadFixture(defaultDeploy);
      await setRoundDataSafeGrowth(fixture, 10, -100, 100);
    });
    it('call when growthApr == minGrowthApr', async () => {
      const fixture = await loadFixture(defaultDeploy);
      await setRoundDataSafeGrowth(fixture, 10, -100, 0);
    });

    it('call when growthApr == 0', async () => {
      const fixture = await loadFixture(defaultDeploy);
      await setRoundDataSafeGrowth(
        { ...fixture, expectedAnswer: 10 },
        10,
        -10000,
        0,
      );
    });

    it('call when growthApr == 10 and passed seconds = 3600', async () => {
      const fixture = await loadFixture(defaultDeploy);
      await setRoundDataSafeGrowth(
        { ...fixture, expectedAnswer: 10.00011415 },
        10,
        -3600,
        10,
      );
    });

    it('call when growthApr == 110 and passed seconds = 10', async () => {
      const fixture = await loadFixture(defaultDeploy);
      await setMaxGrowthApr(fixture, 120);
      await setRoundDataSafeGrowth(
        { ...fixture, expectedAnswer: 10.00000348 },
        10,
        -10,
        110,
      );
    });

    it('call when growthApr == 1% and passed seconds = 3600 and onlyUp is true', async () => {
      const fixture = await loadFixture(defaultDeploy);
      await setOnlyUp(fixture, true);

      await setRoundDataSafeGrowth(
        { ...fixture, expectedAnswer: 10.00001141 },
        10,
        -3600,
        1,
      );
    });

    it('when deviation is < 1% and apr is positive', async () => {
      const fixture = await loadFixture(defaultDeploy);
      await setMaxGrowthApr(fixture, 10000);
      await setRoundDataSafeGrowth(fixture, 100, -100000, 0);
      await increase(3600);
      await setRoundDataSafeGrowth(
        { ...fixture, expectedAnswer: 100.63419583 },
        100,
        -10000,
        2000,
      );
    });

    it('when 2 updates happens and lastTimestamps are > 1h diff ', async () => {
      const fixture = await loadFixture(defaultDeploy);
      await setRoundDataSafeGrowth(fixture, 10, -1000000, 0);
      await increase(3600);
      await setRoundDataSafeGrowth(fixture, 10, -100, 0);
    });

    it('should fail: call when growthApr == -1% and passed seconds = 3600 and onlyUp is true and its the first price set', async () => {
      const fixture = await loadFixture(defaultDeploy);
      await setMinGrowthApr(fixture, -10);
      await setOnlyUp(fixture, true);

      await setRoundDataSafeGrowth({ ...fixture }, 10, -3600, -1, {
        revertMessage: 'CAG: negative apr',
      });
    });

    it('should fail: call when deviation is > 1% and growthApr == -1% and passed seconds = 3600 and onlyUp is true', async () => {
      const fixture = await loadFixture(defaultDeploy);
      await setMinGrowthApr(fixture, -10);
      await setOnlyUp(fixture, true);

      await setRoundDataSafeGrowth({ ...fixture }, 10, -3600, 0);

      await setRoundDataSafeGrowth({ ...fixture }, 10, -1600, -1, {
        revertMessage: 'CAG: deviation is negative',
      });
    });

    it('should fail: call when growthApr == -1% and passed seconds = 3600 and onlyUp is true and its not the first price set', async () => {
      const fixture = await loadFixture(defaultDeploy);
      await setMinGrowthApr(fixture, -10);
      await setOnlyUp(fixture, true);

      await fixture.customFeedGrowth.setMaxAnswerDeviation(
        parseUnits('1000', 8),
      );

      await setRoundDataSafeGrowth({ ...fixture }, 10, -3600, 0);

      await setRoundDataSafeGrowth({ ...fixture }, 100, -1600, -1, {
        revertMessage: 'CAG: negative apr',
      });
    });

    it('should fail: call from non owner', async () => {
      const fixture = await loadFixture(defaultDeploy);
      await setRoundDataSafeGrowth(fixture, 10, -100, 0, {
        from: fixture.regularAccounts[0],
        revertMessage: acErrors.WMAC_HASNT_ROLE,
      });
    });

    it('should fail: when data > maxAnswer', async () => {
      const fixture = await loadFixture(defaultDeploy);
      await setRoundDataSafeGrowth(fixture, 10001, -100, 0, {
        revertMessage: 'CAG: out of [min;max]',
      });
    });

    it('should fail: when data < minAnswer', async () => {
      const fixture = await loadFixture(defaultDeploy);
      await setRoundDataSafeGrowth(fixture, 0.00000001, -100, 0, {
        revertMessage: 'CAG: out of [min;max]',
      });
    });

    it('should fail: when deviation is > 1% and apr is 0%', async () => {
      const fixture = await loadFixture(defaultDeploy);
      await setRoundDataSafeGrowth(fixture, 100, -100, 0);
      await setRoundDataSafeGrowth(fixture, 102, -100, 0, {
        revertMessage: 'CAG: !deviation',
      });
    });

    it('should fail: when deviation is > 1% and apr is positive', async () => {
      const fixture = await loadFixture(defaultDeploy);
      await setMaxGrowthApr(fixture, 10000);
      await setRoundDataSafeGrowth(fixture, 100, -100000, 0);
      await setRoundDataSafeGrowth(fixture, 100, -10000, 10000, {
        revertMessage: 'CAG: !deviation',
      });
    });

    it('should fail: when deviation is > 1% and apr is negative', async () => {
      const fixture = await loadFixture(defaultDeploy);
      await setMinGrowthApr(fixture, -10000);
      await setRoundDataSafeGrowth(fixture, 100, -100000, 0);
      await setRoundDataSafeGrowth(fixture, 100, -10000, -10000, {
        revertMessage: 'CAG: !deviation',
      });
    });

    it('should fail: when 2 updates happens within 1 hour', async () => {
      const fixture = await loadFixture(defaultDeploy);
      await setRoundDataSafeGrowth(fixture, 10, -100, 100);
      await setRoundDataSafeGrowth(fixture, 10, -100, 100, {
        revertMessage: 'CAG: not enough time passed',
      });
    });

    it('should fail: when timestamp is < then previous', async () => {
      const fixture = await loadFixture(defaultDeploy);

      await setRoundDataSafeGrowth(fixture, 10, -100, 10);
      await increase(3600);
      await setRoundDataSafeGrowth(fixture, 10, -10000, 10, {
        revertMessage: 'CAG: timestamp <= last startedAt',
      });
    });

    it('should fail: when timestamp is >= now and its not first price set', async () => {
      const fixture = await loadFixture(defaultDeploy);

      await setRoundDataSafeGrowth(fixture, 10, -100, 10);
      await increase(3600);
      await setRoundDataSafeGrowth(fixture, 10, 100000000, 10, {
        revertMessage: 'CAG: timestampTo < timestampFrom',
      });
    });

    it('should fail: when timestamp is >= now and its first price set', async () => {
      const fixture = await loadFixture(defaultDeploy);

      await setRoundDataSafeGrowth(fixture, 10, 100000000, 10, {
        revertMessage: 'CAG: timestamp >= now',
      });
    });

    it('when deviation is < 1%', async () => {
      const fixture = await loadFixture(defaultDeploy);
      await setRoundDataSafeGrowth(fixture, 100, -10000, 0);
      await increase(3600);
      await setRoundDataSafeGrowth(fixture, 100.9, -100, 0);
    });
  });

  describe('setMinGrowthApr', () => {
    it('call from owner', async () => {
      const fixture = await loadFixture(defaultDeploy);
      await setMinGrowthApr(fixture, 10);
    });

    it('when min value equals max value', async () => {
      const fixture = await loadFixture(defaultDeploy);
      await setMinGrowthApr(fixture, 100);
    });

    it('when negative value is passed', async () => {
      const fixture = await loadFixture(defaultDeploy);
      await setMinGrowthApr(fixture, -10);
    });

    it('should fail: call from non owner', async () => {
      const fixture = await loadFixture(defaultDeploy);
      await setMinGrowthApr(fixture, 10, {
        from: fixture.regularAccounts[0],
        revertMessage: acErrors.WMAC_HASNT_ROLE,
      });
    });

    it('should fail: when min value is greater than max value', async () => {
      const fixture = await loadFixture(defaultDeploy);
      await setMinGrowthApr(fixture, 101, {
        revertMessage: 'CAG: !min growth',
      });
    });
  });

  describe('setMaxGrowthApr', () => {
    it('call from owner', async () => {
      const fixture = await loadFixture(defaultDeploy);
      await setMaxGrowthApr(fixture, 10);
    });

    it('when min value equals min value', async () => {
      const fixture = await loadFixture(defaultDeploy);
      await setMaxGrowthApr(fixture, 0);
    });

    it('when negative value is passed', async () => {
      const fixture = await loadFixture(defaultDeploy);
      await setMinGrowthApr(fixture, -100);
      await setMaxGrowthApr(fixture, -10);
    });

    it('should fail: call from non owner', async () => {
      const fixture = await loadFixture(defaultDeploy);
      await setMaxGrowthApr(fixture, 10, {
        from: fixture.regularAccounts[0],
        revertMessage: acErrors.WMAC_HASNT_ROLE,
      });
    });

    it('should fail: when max value is less than min value', async () => {
      const fixture = await loadFixture(defaultDeploy);
      await setMaxGrowthApr(fixture, -1, {
        revertMessage: 'CAG: !max growth',
      });
    });
  });

  describe('setOnlyUp', () => {
    it('call from owner', async () => {
      const fixture = await loadFixture(defaultDeploy);
      await setOnlyUp(fixture, true);
    });

    it('from false to true', async () => {
      const fixture = await loadFixture(defaultDeploy);
      await setOnlyUp(fixture, true);
    });

    it('from true to false', async () => {
      const fixture = await loadFixture(defaultDeploy);
      await setOnlyUp(fixture, true);
      await setOnlyUp(fixture, false);
    });

    it('from true to true', async () => {
      const fixture = await loadFixture(defaultDeploy);
      await setOnlyUp(fixture, true);
      await setOnlyUp(fixture, true);
    });

    it('from false to false', async () => {
      const fixture = await loadFixture(defaultDeploy);
      await setOnlyUp(fixture, false);
    });

    it('should fail: call from non owner', async () => {
      const fixture = await loadFixture(defaultDeploy);
      await setOnlyUp(fixture, true, {
        from: fixture.regularAccounts[0],
        revertMessage: acErrors.WMAC_HASNT_ROLE,
      });
    });
  });

  describe('_getDeviation', async () => {
    it('when new price is 0', async () => {
      const fixture = await loadFixture(defaultDeploy);

      expect(await fixture.customFeedGrowth.getDeviation(1, 0, false)).eq(
        parseUnits('100', 8),
      );
    });

    it('when price changes from 100 to 105', async () => {
      const fixture = await loadFixture(defaultDeploy);

      expect(
        await fixture.customFeedGrowth.getDeviation(
          parseUnits('100', 8),
          parseUnits('105', 8),
          false,
        ),
      ).eq(parseUnits(calculatePriceDiviation(100, 105).toString(), 8));
    });

    it('when price changes from 100 to 105', async () => {
      const fixture = await loadFixture(defaultDeploy);

      expect(
        await fixture.customFeedGrowth.getDeviation(
          parseUnits('100', 8),
          parseUnits('95', 8),
          false,
        ),
      ).eq(parseUnits(calculatePriceDiviation(100, 95).toString(), 8));
    });

    it('when price changes from 1 to 1000000', async () => {
      const fixture = await loadFixture(defaultDeploy);

      expect(
        await fixture.customFeedGrowth.getDeviation(
          parseUnits('1', 8),
          parseUnits('1000000', 8),
          false,
        ),
      ).eq(parseUnits(calculatePriceDiviation(1, 1000000).toString(), 8));
    });

    it('when price changes from 10 to 9 and validateOnlyUp is false', async () => {
      const fixture = await loadFixture(defaultDeploy);

      expect(
        await fixture.customFeedGrowth.getDeviation(
          parseUnits('10', 8),
          parseUnits('9', 8),
          false,
        ),
      ).eq(parseUnits(calculatePriceDiviation(10, 9).toString(), 8));
    });

    it('should fail: when price changes from 9 to 10 and validateOnlyUp is true', async () => {
      const fixture = await loadFixture(defaultDeploy);

      expect(
        fixture.customFeedGrowth.getDeviation(
          parseUnits('10', 8),
          parseUnits('9', 8),
          true,
        ),
      ).revertedWith('CAG: deviation is negative');
    });
  });

  describe('applyGrowth (2 timestamps overload)', () => {
    it('price is 100, growthApr is 10% and passed seconds = 3600', async () => {
      const fixture = await loadFixture(defaultDeploy);

      expect(
        await fixture.customFeedGrowth[
          'applyGrowth(int256,int80,uint256,uint256)'
        ](parseUnits('100', 8), parseUnits('10', 8), 0, 3600),
      ).eq(parseUnits('100.00114155', 8));
    });

    it('price is 1, growthApr is -4% and passed seconds = 100', async () => {
      const fixture = await loadFixture(defaultDeploy);

      expect(
        await fixture.customFeedGrowth[
          'applyGrowth(int256,int80,uint256,uint256)'
        ](parseUnits('1', 8), parseUnits('-4', 8), 0, 100),
      ).eq(parseUnits('0.99999988', 8));
    });

    it('price is 10, growthApr is -0.001% and passed seconds = 1', async () => {
      const fixture = await loadFixture(defaultDeploy);

      expect(
        await fixture.customFeedGrowth[
          'applyGrowth(int256,int80,uint256,uint256)'
        ](parseUnits('10', 8), parseUnits('-0.001', 8), 0, 1),
      ).eq(parseUnits('10', 8));
    });

    it('price is 10, growthApr is -100% and passed seconds = 1', async () => {
      const fixture = await loadFixture(defaultDeploy);

      expect(
        await fixture.customFeedGrowth[
          'applyGrowth(int256,int80,uint256,uint256)'
        ](parseUnits('10', 8), parseUnits('-100', 8), 0, 1),
      ).eq(parseUnits('9.99999969', 8));
    });

    it('when timestampFrom === timestampTo', async () => {
      const fixture = await loadFixture(defaultDeploy);

      expect(
        await fixture.customFeedGrowth[
          'applyGrowth(int256,int80,uint256,uint256)'
        ](parseUnits('10', 8), parseUnits('-100', 8), 0, 0),
      ).eq(parseUnits('10', 8));
    });

    it('should fail: when timestampTo < timestampFrom', async () => {
      const fixture = await loadFixture(defaultDeploy);

      expect(
        fixture.customFeedGrowth['applyGrowth(int256,int80,uint256,uint256)'](
          parseUnits('100', 8),
          parseUnits('10', 8),
          1,
          0,
        ),
      ).revertedWith('CAG: timestampTo < timestampFrom');
    });
  });

  describe('applyGrowth (1 timestamps + block.timestamp overload)', () => {
    it('price is 100, growthApr is 10% and passed seconds = 3600', async () => {
      const fixture = await loadFixture(defaultDeploy);

      const currentTimestamp = (await ethers.provider.getBlock('latest'))
        .timestamp;

      expect(
        await fixture.customFeedGrowth['applyGrowth(int256,int80,uint256)'](
          parseUnits('100', 8),
          parseUnits('10', 8),
          currentTimestamp - 3600,
        ),
      ).eq(parseUnits('100.00114155', 8));
    });

    it('price is 1, growthApr is -4% and passed seconds = 100', async () => {
      const fixture = await loadFixture(defaultDeploy);

      const currentTimestamp = (await ethers.provider.getBlock('latest'))
        .timestamp;

      expect(
        await fixture.customFeedGrowth['applyGrowth(int256,int80,uint256)'](
          parseUnits('1', 8),
          parseUnits('-4', 8),
          currentTimestamp - 100,
        ),
      ).eq(parseUnits('0.99999988', 8));
    });

    it('price is 10, growthApr is -0.001% and passed seconds = 1', async () => {
      const fixture = await loadFixture(defaultDeploy);

      const currentTimestamp = (await ethers.provider.getBlock('latest'))
        .timestamp;

      expect(
        await fixture.customFeedGrowth['applyGrowth(int256,int80,uint256)'](
          parseUnits('10', 8),
          parseUnits('-0.001', 8),
          currentTimestamp - 1,
        ),
      ).eq(parseUnits('10', 8));
    });

    it('price is 10, growthApr is -100% and passed seconds = 1', async () => {
      const fixture = await loadFixture(defaultDeploy);

      const currentTimestamp = (await ethers.provider.getBlock('latest'))
        .timestamp;

      expect(
        await fixture.customFeedGrowth['applyGrowth(int256,int80,uint256)'](
          parseUnits('10', 8),
          parseUnits('-100', 8),
          currentTimestamp - 1,
        ),
      ).eq(parseUnits('9.99999969', 8));
    });

    it('when timestampFrom === timestampTo', async () => {
      const fixture = await loadFixture(defaultDeploy);

      const currentTimestamp = (await ethers.provider.getBlock('latest'))
        .timestamp;

      expect(
        await fixture.customFeedGrowth['applyGrowth(int256,int80,uint256)'](
          parseUnits('10', 8),
          parseUnits('-100', 8),
          currentTimestamp,
        ),
      ).eq(parseUnits('10', 8));
    });

    it('should fail: when timestampTo < timestampFrom', async () => {
      const fixture = await loadFixture(defaultDeploy);

      const currentTimestamp = (await ethers.provider.getBlock('latest'))
        .timestamp;

      expect(
        fixture.customFeedGrowth['applyGrowth(int256,int80,uint256)'](
          parseUnits('100', 8),
          parseUnits('10', 8),
          currentTimestamp + 1,
        ),
      ).revertedWith('CAG: timestampTo < timestampFrom');
    });
  });
});
