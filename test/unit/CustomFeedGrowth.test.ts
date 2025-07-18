import { loadFixture } from '@nomicfoundation/hardhat-network-helpers';
import { expect } from 'chai';
import { parseUnits } from 'ethers/lib/utils';
import { ethers } from 'hardhat';

import {
  // eslint-disable-next-line camelcase
  CustomAggregatorV3CompatibleFeedGrowthTester__factory,
  // eslint-disable-next-line camelcase
  MBasisCustomAggregatorFeed__factory,
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
    const { customFeedGrowth } = await loadFixture(defaultDeploy);

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
        '',
      ),
    ).revertedWith('Initializable: contract is already initialized');

    const testFeed =
      await new CustomAggregatorV3CompatibleFeedGrowthTester__factory(
        fixture.owner,
      ).deploy();

    await expect(
      testFeed.initialize(fixture.accessControl.address, 1, 0, 0, 0, 0, ''),
    ).revertedWith('CAG: !min/max');

    await expect(
      testFeed.initialize(
        fixture.accessControl.address,
        0,
        1,
        parseUnits('101', 8),
        1,
        2,
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
        '',
      ),
    ).revertedWith('CAG: !min/max growth');
  });

  it('MBasisCustomAggregatorFeed', async () => {
    const fixture = await loadFixture(defaultDeploy);

    const tester = await new MBasisCustomAggregatorFeed__factory(
      fixture.owner,
    ).deploy();

    expect(await tester.feedAdminRole()).eq(
      await tester.M_BASIS_CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE(),
    );
  });

  describe('setRoundDataGrowth', async () => {
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
  });

  describe('setRoundDataSafe', async () => {
    it('call from owner when no prev data is set', async () => {
      const fixture = await loadFixture(defaultDeploy);
      await setRoundDataSafeGrowth(fixture, 10, -100, 0);
    });
    it('call from owner when prev data is set', async () => {
      const fixture = await loadFixture(defaultDeploy);
      await setRoundDataSafeGrowth(fixture, 10, -10000, 0);
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
      await setRoundDataSafeGrowth(
        { ...fixture, expectedAnswer: 100.63419583 },
        100,
        -10000,
        2000,
      );
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

    it('when deviation is < 1%', async () => {
      const fixture = await loadFixture(defaultDeploy);
      await setRoundDataSafeGrowth(fixture, 100, -10000, 0);
      await setRoundDataSafeGrowth(fixture, 100.9, -100, 0);
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
});
