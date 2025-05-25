import { loadFixture } from '@nomicfoundation/hardhat-network-helpers';
import { expect } from 'chai';
import { parseUnits } from 'ethers/lib/utils';
import { ethers } from 'hardhat';

import {
  // eslint-disable-next-line camelcase
  DataFeedTest__factory,
} from '../../typechain-types';
import { acErrors } from '../common/ac.helpers';
import { setRoundData } from '../common/data-feed.helpers';
import { defaultDeploy } from '../common/fixtures';

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
      ).revertedWith(acErrors.WMAC_HASNT_ROLE);
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
  });
});

describe('DataFeed Deprecated', function () {
  it('should fail when: feed is deprecated', async () => {
    const { dataFeedDeprecated } = await loadFixture(defaultDeploy);
    await expect(dataFeedDeprecated.getDataInBase18()).to.be.reverted;
  });
});

describe('DataFeed Unhealthy', function () {
  it('should fail when: feed is unhealthy (by time)', async () => {
    const { dataFeedUnhealthy } = await loadFixture(defaultDeploy);
    await expect(dataFeedUnhealthy.getDataInBase18()).to.be.reverted;
  });
  it('should fail when: feed is unhealthy (by min answer)', async () => {
    const { dataFeed, mockedAggregator } = await loadFixture(defaultDeploy);
    await setRoundData({ mockedAggregator }, 0.1);
    await expect(dataFeed.getDataInBase18()).to.be.not.reverted;
    await setRoundData({ mockedAggregator }, 0.099);
    await expect(dataFeed.getDataInBase18()).to.be.reverted;
  });

  it('should fail when: feed is unhealthy (by max answer)', async () => {
    const { dataFeed, mockedAggregator } = await loadFixture(defaultDeploy);
    await setRoundData({ mockedAggregator }, 10000);
    await expect(dataFeed.getDataInBase18()).to.be.not.reverted;
    await setRoundData({ mockedAggregator }, 10001);
    await expect(dataFeed.getDataInBase18()).to.be.reverted;
  });
});
