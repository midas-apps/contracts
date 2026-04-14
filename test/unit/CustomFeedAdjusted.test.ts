import { loadFixture } from '@nomicfoundation/hardhat-network-helpers';
import { expect } from 'chai';
import { parseUnits } from 'ethers/lib/utils';
import { ethers } from 'hardhat';

import { CustomAggregatorV3CompatibleFeedAdjustedTester__factory } from '../../typechain-types';
import { setRoundData } from '../common/custom-feed.helpers';
import { defaultDeploy } from '../common/fixtures';

describe('CustomAggregatorV3CompatibleFeedAdjusted', function () {
  it('deployment with positive adjustment (price raised)', async () => {
    const { customFeedAdjusted, customFeed } = await loadFixture(defaultDeploy);

    expect(await customFeedAdjusted.underlyingFeed()).eq(customFeed.address);
    expect(await customFeedAdjusted.adjustmentPercentage()).eq(
      parseUnits('10', 8),
    );

    expect(await customFeedAdjusted.decimals()).eq(await customFeed.decimals());
    expect(await customFeedAdjusted.version()).eq(await customFeed.version());
    expect(await customFeedAdjusted.description()).eq(
      (await customFeed.description()) + ' PriceRaised',
    );
  });

  it('deployment with negative adjustment (price lowered)', async () => {
    const { customFeed, owner } = await loadFixture(defaultDeploy);

    const loweredFeed =
      await new CustomAggregatorV3CompatibleFeedAdjustedTester__factory(
        owner,
      ).deploy(customFeed.address, parseUnits('-10', 8));

    expect(await loweredFeed.adjustmentPercentage()).eq(parseUnits('-10', 8));
    expect(await loweredFeed.description()).eq(
      (await customFeed.description()) + ' PriceLowered',
    );
  });

  it('deployment with zero adjustment', async () => {
    const { customFeed, owner } = await loadFixture(defaultDeploy);

    const zeroFeed =
      await new CustomAggregatorV3CompatibleFeedAdjustedTester__factory(
        owner,
      ).deploy(customFeed.address, 0);

    expect(await zeroFeed.adjustmentPercentage()).eq(0);
    expect(await zeroFeed.description()).eq(await customFeed.description());
  });

  it('initialize', async () => {
    const fixture = await loadFixture(defaultDeploy);

    await expect(
      new CustomAggregatorV3CompatibleFeedAdjustedTester__factory(
        fixture.owner,
      ).deploy(ethers.constants.AddressZero, 0),
    ).revertedWith('CAA: !underlying feed');

    await expect(
      new CustomAggregatorV3CompatibleFeedAdjustedTester__factory(
        fixture.owner,
      ).deploy(fixture.customFeed.address, parseUnits('100.1', 8)),
    ).revertedWith('CAA: invalid adjustment');

    await expect(
      new CustomAggregatorV3CompatibleFeedAdjustedTester__factory(
        fixture.owner,
      ).deploy(fixture.customFeed.address, parseUnits('-100.1', 8)),
    ).revertedWith('CAA: invalid adjustment');
  });

  describe('latestRoundData (positive adjustment)', () => {
    it('+10%: price 100 -> 110', async () => {
      const { customFeed, customFeedAdjusted, owner } = await loadFixture(
        defaultDeploy,
      );

      await setRoundData({ customFeed, owner }, 100);

      const adjusted = await customFeedAdjusted.latestRoundData();
      const original = await customFeed.latestRoundData();

      expect(adjusted.answer).eq(parseUnits('110', 8));
      expect(adjusted.roundId).eq(original.roundId);
      expect(adjusted.startedAt).eq(original.startedAt);
      expect(adjusted.updatedAt).eq(original.updatedAt);
      expect(adjusted.answeredInRound).eq(original.answeredInRound);
    });

    it('+100%: price 1 -> 2', async () => {
      const { customFeed, owner } = await loadFixture(defaultDeploy);

      await setRoundData({ customFeed, owner }, 1);

      const fullRaise =
        await new CustomAggregatorV3CompatibleFeedAdjustedTester__factory(
          owner,
        ).deploy(customFeed.address, parseUnits('100', 8));

      const adjusted = await fullRaise.latestRoundData();
      expect(adjusted.answer).eq(parseUnits('2', 8));
    });

    it('+7.7%: 1.01234568 -> 1.09029629', async () => {
      const fixture = await loadFixture(defaultDeploy);

      const feed =
        await new CustomAggregatorV3CompatibleFeedAdjustedTester__factory(
          fixture.owner,
        ).deploy(fixture.customFeed.address, parseUnits('7.7', 8));

      await setRoundData(
        { customFeed: fixture.customFeed, owner: fixture.owner },
        1.01234568,
      );
      const roundData = await feed.latestRoundData();

      expect(roundData.answer).eq(parseUnits('1.09029629', 8));
    });
  });

  describe('latestRoundData (negative adjustment)', () => {
    it('-10%: price 100 -> 90', async () => {
      const { customFeed, owner } = await loadFixture(defaultDeploy);

      await setRoundData({ customFeed, owner }, 100);

      const loweredFeed =
        await new CustomAggregatorV3CompatibleFeedAdjustedTester__factory(
          owner,
        ).deploy(customFeed.address, parseUnits('-10', 8));

      const adjusted = await loweredFeed.latestRoundData();
      const original = await customFeed.latestRoundData();

      expect(adjusted.answer).eq(parseUnits('90', 8));
      expect(adjusted.roundId).eq(original.roundId);
      expect(adjusted.startedAt).eq(original.startedAt);
      expect(adjusted.updatedAt).eq(original.updatedAt);
      expect(adjusted.answeredInRound).eq(original.answeredInRound);
    });

    it('-100%: price 1 -> 0', async () => {
      const { customFeed, owner } = await loadFixture(defaultDeploy);

      await setRoundData({ customFeed, owner }, 1);

      const fullLower =
        await new CustomAggregatorV3CompatibleFeedAdjustedTester__factory(
          owner,
        ).deploy(customFeed.address, parseUnits('-100', 8));

      const adjusted = await fullLower.latestRoundData();
      expect(adjusted.answer).eq(parseUnits('0', 8));
    });

    it('-7.7%: 1.01234568 -> 0.93439507', async () => {
      const fixture = await loadFixture(defaultDeploy);

      const feed =
        await new CustomAggregatorV3CompatibleFeedAdjustedTester__factory(
          fixture.owner,
        ).deploy(fixture.customFeed.address, parseUnits('-7.7', 8));

      await setRoundData(
        { customFeed: fixture.customFeed, owner: fixture.owner },
        1.01234568,
      );
      const roundData = await feed.latestRoundData();

      expect(roundData.answer).eq(parseUnits('0.93439507', 8));
    });
  });

  describe('getRoundData (positive adjustment)', () => {
    it('+10%: price 100 -> 110', async () => {
      const { customFeed, customFeedAdjusted, owner } = await loadFixture(
        defaultDeploy,
      );

      await setRoundData({ customFeed, owner }, 100);
      const roundId = await customFeed.latestRound();
      await setRoundData({ customFeed, owner }, 200);

      const adjusted = await customFeedAdjusted.getRoundData(roundId);
      const original = await customFeed.getRoundData(roundId);

      expect(adjusted.answer).eq(parseUnits('110', 8));
      expect(adjusted.roundId).eq(original.roundId);
      expect(adjusted.startedAt).eq(original.startedAt);
      expect(adjusted.updatedAt).eq(original.updatedAt);
      expect(adjusted.answeredInRound).eq(original.answeredInRound);
    });

    it('+7.7%: 1.01234568 -> 1.09029629', async () => {
      const fixture = await loadFixture(defaultDeploy);

      const feed =
        await new CustomAggregatorV3CompatibleFeedAdjustedTester__factory(
          fixture.owner,
        ).deploy(fixture.customFeed.address, parseUnits('7.7', 8));

      await setRoundData(
        { customFeed: fixture.customFeed, owner: fixture.owner },
        1.01234568,
      );
      const roundId = await fixture.customFeed.latestRound();

      const roundData = await feed.getRoundData(roundId);

      expect(roundData.answer).eq(parseUnits('1.09029629', 8));
    });
  });

  describe('getRoundData (negative adjustment)', () => {
    it('-10%: price 100 -> 90', async () => {
      const { customFeed, owner } = await loadFixture(defaultDeploy);

      await setRoundData({ customFeed, owner }, 100);
      const roundId = await customFeed.latestRound();
      await setRoundData({ customFeed, owner }, 200);

      const loweredFeed =
        await new CustomAggregatorV3CompatibleFeedAdjustedTester__factory(
          owner,
        ).deploy(customFeed.address, parseUnits('-10', 8));

      const adjusted = await loweredFeed.getRoundData(roundId);
      const original = await customFeed.getRoundData(roundId);

      expect(adjusted.answer).eq(parseUnits('90', 8));
      expect(adjusted.roundId).eq(original.roundId);
      expect(adjusted.startedAt).eq(original.startedAt);
      expect(adjusted.updatedAt).eq(original.updatedAt);
      expect(adjusted.answeredInRound).eq(original.answeredInRound);
    });

    it('-7.7%: 1.01234568 -> 0.93439507', async () => {
      const fixture = await loadFixture(defaultDeploy);

      const feed =
        await new CustomAggregatorV3CompatibleFeedAdjustedTester__factory(
          fixture.owner,
        ).deploy(fixture.customFeed.address, parseUnits('-7.7', 8));

      await setRoundData(
        { customFeed: fixture.customFeed, owner: fixture.owner },
        1.01234568,
      );
      const roundId = await fixture.customFeed.latestRound();

      const roundData = await feed.getRoundData(roundId);

      expect(roundData.answer).eq(parseUnits('0.93439507', 8));
    });
  });

  describe('_calculateAdjustedAnswer', () => {
    it('should fail: when answer is negative', async () => {
      const fixture = await loadFixture(defaultDeploy);

      await expect(
        fixture.customFeedAdjusted.getAdjustedAnswer(-1),
      ).revertedWith('CAA: !_answer');
    });

    it('when answer is 0 should return 0 (positive adjustment)', async () => {
      const fixture = await loadFixture(defaultDeploy);

      expect(
        await fixture.customFeedAdjusted.getAdjustedAnswer(parseUnits('0', 8)),
      ).eq(parseUnits('0', 8));
    });

    it('when answer is 0 should return 0 (negative adjustment)', async () => {
      const { customFeed, owner } = await loadFixture(defaultDeploy);

      const loweredFeed =
        await new CustomAggregatorV3CompatibleFeedAdjustedTester__factory(
          owner,
        ).deploy(customFeed.address, parseUnits('-10', 8));

      expect(await loweredFeed.getAdjustedAnswer(parseUnits('0', 8))).eq(
        parseUnits('0', 8),
      );
    });

    it('+10%: answer 110 -> 121 (positive adjustment)', async () => {
      const fixture = await loadFixture(defaultDeploy);

      expect(
        await fixture.customFeedAdjusted.getAdjustedAnswer(
          parseUnits('110', 8),
        ),
      ).eq(parseUnits('121', 8));
    });

    it('+10%: answer 100 -> 110 (positive adjustment)', async () => {
      const fixture = await loadFixture(defaultDeploy);

      expect(
        await fixture.customFeedAdjusted.getAdjustedAnswer(
          parseUnits('100', 8),
        ),
      ).eq(parseUnits('110', 8));
    });

    it('-10%: answer 100 -> 90 (negative adjustment)', async () => {
      const { customFeed, owner } = await loadFixture(defaultDeploy);

      const loweredFeed =
        await new CustomAggregatorV3CompatibleFeedAdjustedTester__factory(
          owner,
        ).deploy(customFeed.address, parseUnits('-10', 8));

      expect(await loweredFeed.getAdjustedAnswer(parseUnits('100', 8))).eq(
        parseUnits('90', 8),
      );
    });

    it('-10%: answer 110 -> 99 (negative adjustment)', async () => {
      const { customFeed, owner } = await loadFixture(defaultDeploy);

      const loweredFeed =
        await new CustomAggregatorV3CompatibleFeedAdjustedTester__factory(
          owner,
        ).deploy(customFeed.address, parseUnits('-10', 8));

      expect(await loweredFeed.getAdjustedAnswer(parseUnits('110', 8))).eq(
        parseUnits('99', 8),
      );
    });

    it('+7.7%: 1.01234568 -> 1.09029629 (positive adjustment)', async () => {
      const fixture = await loadFixture(defaultDeploy);

      const feed =
        await new CustomAggregatorV3CompatibleFeedAdjustedTester__factory(
          fixture.owner,
        ).deploy(fixture.customFeed.address, parseUnits('7.7', 8));

      expect(await feed.getAdjustedAnswer(parseUnits('1.01234568', 8))).eq(
        parseUnits('1.09029629', 8),
      );
    });

    it('-7.7%: 1.01234568 -> 0.93439507 (negative adjustment)', async () => {
      const fixture = await loadFixture(defaultDeploy);

      const feed =
        await new CustomAggregatorV3CompatibleFeedAdjustedTester__factory(
          fixture.owner,
        ).deploy(fixture.customFeed.address, parseUnits('-7.7', 8));

      expect(await feed.getAdjustedAnswer(parseUnits('1.01234568', 8))).eq(
        parseUnits('0.93439507', 8),
      );
    });
  });
});
