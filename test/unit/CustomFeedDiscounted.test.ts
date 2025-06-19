import { loadFixture } from '@nomicfoundation/hardhat-network-helpers';
import { expect } from 'chai';
import { parseUnits } from 'ethers/lib/utils';
import { ethers } from 'hardhat';

import { getAllRoles } from '../../helpers/roles';
import {
  // eslint-disable-next-line camelcase
  CustomAggregatorV3CompatibleFeedDiscounted__factory,
  // eslint-disable-next-line camelcase
  CustomAggregatorV3CompatibleFeedDiscountedTester__factory,
} from '../../typechain-types';
import { setRoundData } from '../common/custom-feed.helpers';
import { defaultDeploy } from '../common/fixtures';

describe('CustomAggregatorV3CompatibleFeedDiscounted', function () {
  it('deployment', async () => {
    const { customFeedDiscounted, customFeed } = await loadFixture(
      defaultDeploy,
    );

    expect(await customFeedDiscounted.underlyingFeed()).eq(customFeed.address);
    expect(await customFeedDiscounted.discountPercentage()).eq(
      parseUnits('10', 8),
    );

    expect(await customFeedDiscounted.decimals()).eq(
      await customFeed.decimals(),
    );
    expect(await customFeedDiscounted.version()).eq(await customFeed.version());
    expect(await customFeedDiscounted.description()).eq(
      (await customFeed.description()) + ' Discounted',
    );
  });

  it('initialize', async () => {
    const fixture = await loadFixture(defaultDeploy);

    await expect(
      new CustomAggregatorV3CompatibleFeedDiscountedTester__factory(
        fixture.owner,
      ).deploy(ethers.constants.AddressZero, 0),
    ).revertedWith('CAD: !underlying feed');

    await expect(
      new CustomAggregatorV3CompatibleFeedDiscountedTester__factory(
        fixture.owner,
      ).deploy(fixture.customFeed.address, parseUnits('100.1', 8)),
    ).revertedWith('CAD: !discount percentage');
  });

  describe('latestRoundData', () => {
    it('when answer is 100 should return 90', async () => {
      const { customFeed, customFeedDiscounted, owner } = await loadFixture(
        defaultDeploy,
      );

      await setRoundData({ customFeed, owner }, 100);

      const latestRoundDataDiscounted =
        await customFeedDiscounted.latestRoundData();

      const latestRoundData = await customFeed.latestRoundData();

      expect(latestRoundDataDiscounted.answer).eq(parseUnits('90', 8));
      expect(latestRoundDataDiscounted.roundId).eq(latestRoundData.roundId);
      expect(latestRoundDataDiscounted.startedAt).eq(latestRoundData.startedAt);
      expect(latestRoundDataDiscounted.updatedAt).eq(latestRoundData.updatedAt);
      expect(latestRoundDataDiscounted.answeredInRound).eq(
        latestRoundData.answeredInRound,
      );
    });

    it('when answer is 1, discount is 100%, should return 0', async () => {
      let { customFeed, customFeedDiscounted, owner } = await loadFixture(
        defaultDeploy,
      );

      await setRoundData({ customFeed, owner }, 1);

      customFeedDiscounted =
        await new CustomAggregatorV3CompatibleFeedDiscountedTester__factory(
          owner,
        ).deploy(customFeed.address, parseUnits('100', 8));

      const latestRoundDataDiscounted =
        await customFeedDiscounted.latestRoundData();

      const latestRoundData = await customFeed.latestRoundData();

      expect(latestRoundDataDiscounted.answer).eq(parseUnits('0', 8));
      expect(latestRoundDataDiscounted.roundId).eq(latestRoundData.roundId);
      expect(latestRoundDataDiscounted.startedAt).eq(latestRoundData.startedAt);
      expect(latestRoundDataDiscounted.updatedAt).eq(latestRoundData.updatedAt);
      expect(latestRoundDataDiscounted.answeredInRound).eq(
        latestRoundData.answeredInRound,
      );
    });

    it('when answer is 1.01234568, discount 7.7% should return 0.93439507', async () => {
      const fixture = await loadFixture(defaultDeploy);

      const customFeedDiscounted =
        await new CustomAggregatorV3CompatibleFeedDiscountedTester__factory(
          fixture.owner,
        ).deploy(fixture.customFeed.address, parseUnits('7.7', 8));

      await setRoundData(
        { customFeed: fixture.customFeed, owner: fixture.owner },
        1.01234568,
      );
      const roundData = await customFeedDiscounted.latestRoundData();

      expect(roundData.answer).eq(parseUnits('0.93439507', 8));
    });
  });

  describe('getRoundData', () => {
    it('when answer is 100, discount is 10%, should return 90', async () => {
      const { customFeed, customFeedDiscounted, owner } = await loadFixture(
        defaultDeploy,
      );

      await setRoundData({ customFeed, owner }, 100);
      const roundId = await customFeed.latestRound();
      await setRoundData({ customFeed, owner }, 200);

      const latestRoundDataDiscounted = await customFeedDiscounted.getRoundData(
        roundId,
      );

      const latestRoundData = await customFeed.getRoundData(roundId);

      expect(latestRoundDataDiscounted.answer).eq(parseUnits('90', 8));
      expect(latestRoundDataDiscounted.roundId).eq(latestRoundData.roundId);
      expect(latestRoundDataDiscounted.startedAt).eq(latestRoundData.startedAt);
      expect(latestRoundDataDiscounted.updatedAt).eq(latestRoundData.updatedAt);
      expect(latestRoundDataDiscounted.answeredInRound).eq(
        latestRoundData.answeredInRound,
      );
    });

    it('when answer is 1, discount is 100%, should return 0', async () => {
      let { customFeed, customFeedDiscounted, owner } = await loadFixture(
        defaultDeploy,
      );

      await setRoundData({ customFeed, owner }, 1);
      const roundId = await customFeed.latestRound();
      await setRoundData({ customFeed, owner }, 1);

      customFeedDiscounted =
        await new CustomAggregatorV3CompatibleFeedDiscountedTester__factory(
          owner,
        ).deploy(customFeed.address, parseUnits('100', 8));
      const latestRoundDataDiscounted = await customFeedDiscounted.getRoundData(
        roundId,
      );

      const latestRoundData = await customFeed.getRoundData(roundId);

      expect(latestRoundDataDiscounted.answer).eq(parseUnits('0', 8));
      expect(latestRoundDataDiscounted.roundId).eq(latestRoundData.roundId);
      expect(latestRoundDataDiscounted.startedAt).eq(latestRoundData.startedAt);
      expect(latestRoundDataDiscounted.updatedAt).eq(latestRoundData.updatedAt);
      expect(latestRoundDataDiscounted.answeredInRound).eq(
        latestRoundData.answeredInRound,
      );
    });

    it('when answer is 1.01234568, discount 7.7% should return 0.93439507', async () => {
      const fixture = await loadFixture(defaultDeploy);

      const customFeedDiscounted =
        await new CustomAggregatorV3CompatibleFeedDiscountedTester__factory(
          fixture.owner,
        ).deploy(fixture.customFeed.address, parseUnits('7.7', 8));

      await setRoundData(
        { customFeed: fixture.customFeed, owner: fixture.owner },
        1.01234568,
      );
      const roundId = await fixture.customFeed.latestRound();

      const roundData = await customFeedDiscounted.getRoundData(roundId);

      expect(roundData.answer).eq(parseUnits('0.93439507', 8));
    });
  });

  describe('_calculateDiscountedAnswer', async () => {
    it('should fail: when answer is negative', async () => {
      const fixture = await loadFixture(defaultDeploy);

      await expect(
        fixture.customFeedDiscounted.getDiscountedAnswer(-1),
      ).revertedWith('CAD: !_answer');
    });

    it('when answer is 110 should return 99', async () => {
      const fixture = await loadFixture(defaultDeploy);

      expect(
        await fixture.customFeedDiscounted.getDiscountedAnswer(
          parseUnits('110', 8),
        ),
      ).eq(parseUnits('99', 8));
    });

    it('when answer is 100 should return 90', async () => {
      const fixture = await loadFixture(defaultDeploy);

      expect(
        await fixture.customFeedDiscounted.getDiscountedAnswer(
          parseUnits('100', 8),
        ),
      ).eq(parseUnits('90', 8));
    });

    it('when answer is 1.01234568, discount 7.7% should return 0.93439507', async () => {
      const fixture = await loadFixture(defaultDeploy);

      const customFeedDiscounted =
        await new CustomAggregatorV3CompatibleFeedDiscountedTester__factory(
          fixture.owner,
        ).deploy(fixture.customFeed.address, parseUnits('7.7', 8));

      expect(
        await customFeedDiscounted.getDiscountedAnswer(
          parseUnits('1.01234568', 8),
        ),
      ).eq(parseUnits('0.93439507', 8));
    });

    it('when answer is 0 should return 0', async () => {
      const fixture = await loadFixture(defaultDeploy);

      expect(
        await fixture.customFeedDiscounted.getDiscountedAnswer(
          parseUnits('0', 8),
        ),
      ).eq(parseUnits('0', 8));
    });
  });
});
