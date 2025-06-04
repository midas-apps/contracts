import { loadFixture } from '@nomicfoundation/hardhat-network-helpers';
import { expect } from 'chai';
import { parseUnits } from 'ethers/lib/utils';
import { ethers } from 'hardhat';

import { defaultDeploy } from './common/fixtures';

import {
  // eslint-disable-next-line camelcase
  CustomAggregatorV3CompatibleFeedDiscountedTester__factory,
} from '../typechain-types';

describe.only('CustomAggregatorV3CompatibleFeedDiscounted', function () {
  it('deployment', async () => {
    const { customFeedDiscounted, customFeed } = await loadFixture(
      defaultDeploy,
    );

    expect(await customFeedDiscounted.underlyingFeed()).eq(customFeed.address);
    expect(await customFeedDiscounted.discountPercentage()).eq(
      parseUnits('10', 8),
    );
    expect(await customFeedDiscounted.feedAdminRole()).eq(
      await customFeedDiscounted.CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE(),
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
      fixture.customFeedDiscounted.initialize(
        ethers.constants.AddressZero,
        ethers.constants.AddressZero,
        0,
      ),
    ).revertedWith('Initializable: contract is already initialized');

    const testFeed =
      await new CustomAggregatorV3CompatibleFeedDiscountedTester__factory(
        fixture.owner,
      ).deploy();

    await expect(
      testFeed.initialize(
        ethers.constants.AddressZero,
        ethers.constants.AddressZero,
        0,
      ),
    ).revertedWith('zero address');

    await expect(
      testFeed.initialize(
        fixture.accessControl.address,
        ethers.constants.AddressZero,
        parseUnits('10', 8),
      ),
    ).revertedWith('CAD: !underlying feed');

    await expect(
      testFeed.initialize(
        fixture.accessControl.address,
        fixture.customFeed.address,
        parseUnits('100.1', 8),
      ),
    ).revertedWith('CAD: !discount percentage');
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
