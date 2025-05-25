import { loadFixture } from '@nomicfoundation/hardhat-network-helpers';
import { expect } from 'chai';
import { parseUnits } from 'ethers/lib/utils';
import { ethers } from 'hardhat';

import {
  // eslint-disable-next-line camelcase
  CustomAggregatorV3CompatibleFeedTester__factory,
  // eslint-disable-next-line camelcase
  MBasisCustomAggregatorFeed__factory,
  // eslint-disable-next-line camelcase
  MTBillCustomAggregatorFeed__factory,
} from '../../typechain-types';
import { acErrors } from '../common/ac.helpers';
import {
  calculatePriceDiviation,
  setRoundData,
  setRoundDataSafe,
} from '../common/custom-feed.helpers';
import { defaultDeploy } from '../common/fixtures';

describe('CustomAggregatorV3CompatibleFeed', function () {
  it('deployment', async () => {
    const { customFeed } = await loadFixture(defaultDeploy);

    expect(await customFeed.maxAnswer()).eq(parseUnits('10000', 8));
    expect(await customFeed.minAnswer()).eq(2);
    expect(await customFeed.maxAnswerDeviation()).eq(parseUnits('1', 8));
    expect(await customFeed.description()).eq('Custom Data Feed');
    expect(await customFeed.decimals()).eq(8);
    expect(await customFeed.version()).eq(1);
    expect(await customFeed.latestRound()).eq(0);
    expect(await customFeed.lastAnswer()).eq(0);
    expect(await customFeed.lastTimestamp()).eq(0);
    expect(await customFeed.feedAdminRole()).eq(
      await customFeed.CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE(),
    );
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

  it('MBasisCustomAggregatorFeed', async () => {
    const fixture = await loadFixture(defaultDeploy);

    const tester = await new MBasisCustomAggregatorFeed__factory(
      fixture.owner,
    ).deploy();

    expect(await tester.feedAdminRole()).eq(
      await tester.M_BASIS_CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE(),
    );
  });

  it('MTBillCustomAggregatorFeed', async () => {
    const fixture = await loadFixture(defaultDeploy);

    const tester = await new MTBillCustomAggregatorFeed__factory(
      fixture.owner,
    ).deploy();

    expect(await tester.feedAdminRole()).eq(
      await tester.M_TBILL_CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE(),
    );
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
        revertMessage: acErrors.WMAC_HASNT_ROLE,
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
        revertMessage: acErrors.WMAC_HASNT_ROLE,
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
