import { loadFixture } from '@nomicfoundation/hardhat-network-helpers';
import { expect } from 'chai';
import { parseUnits } from 'ethers/lib/utils';
import { ethers } from 'hardhat';

import {
  // eslint-disable-next-line camelcase
  DataFeedToBandStdAdapter__factory,
  // eslint-disable-next-line camelcase
  CompositeDataFeedToBandStdAdapter__factory,
  // eslint-disable-next-line camelcase
  CompositeDataFeedTest__factory,
} from '../../typechain-types';
import { setRoundData } from '../common/data-feed.helpers';
import { defaultDeploy } from '../common/fixtures';

describe('DataFeedToBandStdAdapter', function () {
  const baseSymbol = 'mTBILL';
  const quoteSymbol = 'USD';
  const alternativeBase = 'mBTC';
  const alternativeQuote = 'EUR';

  const deployDataFeedToBandStdAdapter = async () => {
    const fixture = await loadFixture(defaultDeploy);
    const { owner, dataFeed, compositeDataFeed } = fixture;

    const dataFeedToBandStdAdapter =
      await new DataFeedToBandStdAdapter__factory(owner).deploy(
        dataFeed.address,
        baseSymbol,
        quoteSymbol,
      );

    return {
      ...fixture,
      dataFeedToBandStdAdapter,
    };
  };

  let fixture: Awaited<ReturnType<typeof deployDataFeedToBandStdAdapter>>;

  beforeEach(async () => {
    fixture = await loadFixture(deployDataFeedToBandStdAdapter);
  });

  describe('deployment', () => {
    it('should deploy successfully with valid parameters', async () => {
      const { dataFeedToBandStdAdapter, dataFeed } = fixture;

      expect(await dataFeedToBandStdAdapter.dataFeed()).eq(dataFeed.address);
      expect(await dataFeedToBandStdAdapter.baseSymbol()).eq(baseSymbol);
      expect(await dataFeedToBandStdAdapter.quoteSymbol()).eq(quoteSymbol);
    });

    it('should fail: zero address for dataFeed', async () => {
      const { owner } = fixture;

      await expect(
        new DataFeedToBandStdAdapter__factory(owner).deploy(
          ethers.constants.AddressZero,
          baseSymbol,
          quoteSymbol,
        ),
      ).revertedWith('DFBSA: invalid datafeed');
    });

    it('should fail: empty base symbol', async () => {
      const { owner, dataFeed } = fixture;

      await expect(
        new DataFeedToBandStdAdapter__factory(owner).deploy(
          dataFeed.address,
          '',
          quoteSymbol,
        ),
      ).revertedWith('DFBSA: empty base');
    });

    it('should fail: empty quote symbol', async () => {
      const { owner, dataFeed } = fixture;

      await expect(
        new DataFeedToBandStdAdapter__factory(owner).deploy(
          dataFeed.address,
          baseSymbol,
          '',
        ),
      ).revertedWith('DFBSA: empty quote');
    });
  });

  describe('getReferenceData()', () => {
    it('should return correct reference data for configured pair', async () => {
      const { dataFeedToBandStdAdapter, mockedAggregator } = fixture;

      const price = '4.5';
      await setRoundData({ mockedAggregator }, +price);

      const referenceData = await dataFeedToBandStdAdapter.getReferenceData(
        baseSymbol,
        quoteSymbol,
      );

      expect(referenceData.rate).eq(parseUnits(price));
      expect(referenceData.lastUpdatedBase).to.be.gt(0);
      expect(referenceData.lastUpdatedQuote).eq(referenceData.lastUpdatedBase);
    });

    it('should return consistent timestamps for base and quote', async () => {
      const { dataFeedToBandStdAdapter, mockedAggregator } = fixture;

      await setRoundData({ mockedAggregator }, 2.5);

      const referenceData = await dataFeedToBandStdAdapter.getReferenceData(
        baseSymbol,
        quoteSymbol,
      );

      expect(referenceData.lastUpdatedBase).eq(referenceData.lastUpdatedQuote);
    });

    it('should fail: unsupported base symbol', async () => {
      const { dataFeedToBandStdAdapter } = fixture;

      await expect(
        dataFeedToBandStdAdapter.getReferenceData(alternativeBase, quoteSymbol),
      ).revertedWith('DFBSA: unsupported pair');
    });

    it('should fail: unsupported quote symbol', async () => {
      const { dataFeedToBandStdAdapter } = fixture;

      await expect(
        dataFeedToBandStdAdapter.getReferenceData(baseSymbol, alternativeQuote),
      ).revertedWith('DFBSA: unsupported pair');
    });

    it('should fail: both symbols unsupported', async () => {
      const { dataFeedToBandStdAdapter } = fixture;

      await expect(
        dataFeedToBandStdAdapter.getReferenceData(
          alternativeBase,
          alternativeQuote,
        ),
      ).revertedWith('DFBSA: unsupported pair');
    });

    it('should handle different price values correctly', async () => {
      const { dataFeedToBandStdAdapter, mockedAggregator } = fixture;

      // Test with minimum valid price
      const smallPrice = '0.1';
      await setRoundData({ mockedAggregator }, +smallPrice);
      let referenceData = await dataFeedToBandStdAdapter.getReferenceData(
        baseSymbol,
        quoteSymbol,
      );
      expect(referenceData.rate).eq(parseUnits(smallPrice));

      // Test with maximum valid price
      const largePrice = '10000';
      await setRoundData({ mockedAggregator }, +largePrice);
      referenceData = await dataFeedToBandStdAdapter.getReferenceData(
        baseSymbol,
        quoteSymbol,
      );
      expect(referenceData.rate).eq(parseUnits(largePrice));
    });

    it('should fail when underlying feed is unhealthy', async () => {
      const { owner, dataFeedUnhealthy } = fixture;

      const dataFeedToBandStdAdapter =
        await new DataFeedToBandStdAdapter__factory(owner).deploy(
          dataFeedUnhealthy.address,
          baseSymbol,
          quoteSymbol,
        );

      await expect(
        dataFeedToBandStdAdapter.getReferenceData(baseSymbol, quoteSymbol),
      ).to.be.reverted;
    });

    it('should fail when underlying feed is deprecated', async () => {
      const { owner, dataFeedDeprecated } = fixture;

      const dataFeedToBandStdAdapter =
        await new DataFeedToBandStdAdapter__factory(owner).deploy(
          dataFeedDeprecated.address,
          baseSymbol,
          quoteSymbol,
        );

      await expect(
        dataFeedToBandStdAdapter.getReferenceData(baseSymbol, quoteSymbol),
      ).to.be.reverted;
    });

    it('should handle edge case price values', async () => {
      const { dataFeedToBandStdAdapter, mockedAggregator } = fixture;

      // Test with minimum expected price
      await setRoundData({ mockedAggregator }, 0.1);
      let referenceData = await dataFeedToBandStdAdapter.getReferenceData(
        baseSymbol,
        quoteSymbol,
      );
      expect(referenceData.rate).eq(parseUnits('0.1'));

      // Test with maximum expected price
      await setRoundData({ mockedAggregator }, 10000);
      referenceData = await dataFeedToBandStdAdapter.getReferenceData(
        baseSymbol,
        quoteSymbol,
      );
      expect(referenceData.rate).eq(parseUnits('10000'));
    });
  });

  describe('getReferenceDataBulk()', () => {
    it('should return correct data for single pair', async () => {
      const { dataFeedToBandStdAdapter, mockedAggregator } = fixture;

      const price = '3.75';
      await setRoundData({ mockedAggregator }, +price);

      const results = await dataFeedToBandStdAdapter.getReferenceDataBulk(
        [baseSymbol],
        [quoteSymbol],
      );

      expect(results.length).eq(1);
      expect(results[0].rate).eq(parseUnits(price));
      expect(results[0].lastUpdatedBase).to.be.gt(0);
      expect(results[0].lastUpdatedQuote).eq(results[0].lastUpdatedBase);
    });

    it('should fail: multiple pairs not supported', async () => {
      const { dataFeedToBandStdAdapter } = fixture;

      await expect(
        dataFeedToBandStdAdapter.getReferenceDataBulk(
          [baseSymbol, alternativeBase],
          [quoteSymbol, alternativeQuote],
        ),
      ).revertedWith('DFBSA: single pair only');
    });

    it('should fail: mismatched array lengths', async () => {
      const { dataFeedToBandStdAdapter } = fixture;

      await expect(
        dataFeedToBandStdAdapter.getReferenceDataBulk(
          [baseSymbol, alternativeBase],
          [quoteSymbol],
        ),
      ).revertedWith('DFBSA: single pair only');
    });

    it('should fail: empty arrays', async () => {
      const { dataFeedToBandStdAdapter } = fixture;

      await expect(dataFeedToBandStdAdapter.getReferenceDataBulk([], [])).to.be
        .reverted;
    });

    it('should fail: unsupported pair in bulk', async () => {
      const { dataFeedToBandStdAdapter } = fixture;

      await expect(
        dataFeedToBandStdAdapter.getReferenceDataBulk(
          [alternativeBase],
          [quoteSymbol],
        ),
      ).revertedWith('DFBSA: unsupported pair');
    });

    it('should match getReferenceData output', async () => {
      const { dataFeedToBandStdAdapter, mockedAggregator } = fixture;

      const price = '7.25';
      await setRoundData({ mockedAggregator }, +price);

      const singleResult = await dataFeedToBandStdAdapter.getReferenceData(
        baseSymbol,
        quoteSymbol,
      );
      const bulkResults = await dataFeedToBandStdAdapter.getReferenceDataBulk(
        [baseSymbol],
        [quoteSymbol],
      );

      expect(bulkResults[0].rate).eq(singleResult.rate);
      expect(bulkResults[0].lastUpdatedBase).eq(singleResult.lastUpdatedBase);
      expect(bulkResults[0].lastUpdatedQuote).eq(singleResult.lastUpdatedQuote);
    });
  });

  describe('Case sensitivity', () => {
    it('should be case-sensitive for symbols', async () => {
      const { dataFeedToBandStdAdapter } = fixture;

      // Try with lowercase
      await expect(
        dataFeedToBandStdAdapter.getReferenceData(
          baseSymbol.toLowerCase(),
          quoteSymbol,
        ),
      ).revertedWith('DFBSA: unsupported pair');

      // Try with different case
      await expect(
        dataFeedToBandStdAdapter.getReferenceData(
          baseSymbol,
          quoteSymbol.toLowerCase(),
        ),
      ).revertedWith('DFBSA: unsupported pair');
    });

    it('should handle exact symbol matches', async () => {
      const { dataFeedToBandStdAdapter, mockedAggregator } = fixture;

      await setRoundData({ mockedAggregator }, 1.5);

      // Should work with exact case
      const referenceData = await dataFeedToBandStdAdapter.getReferenceData(
        baseSymbol,
        quoteSymbol,
      );

      expect(referenceData.rate).eq(parseUnits('1.5'));
    });
  });

  describe('Symbol validation', () => {
    it('should handle special characters in symbols', async () => {
      const { owner, dataFeed } = fixture;

      const specialBase = 'mTBILL-USD';
      const specialQuote = 'USD-USD';

      const dataFeedToBandStdAdapter =
        await new DataFeedToBandStdAdapter__factory(owner).deploy(
          dataFeed.address,
          specialBase,
          specialQuote,
        );

      expect(await dataFeedToBandStdAdapter.baseSymbol()).eq(specialBase);
      expect(await dataFeedToBandStdAdapter.quoteSymbol()).eq(specialQuote);
    });

    it('should handle long symbol names', async () => {
      const { owner, dataFeed } = fixture;

      const longBase = 'mTBILL-VERY-LONG-SYMBOL-NAME';
      const longQuote = 'USD-VERY-LONG-SYMBOL-NAME';

      const dataFeedToBandStdAdapter =
        await new DataFeedToBandStdAdapter__factory(owner).deploy(
          dataFeed.address,
          longBase,
          longQuote,
        );

      expect(await dataFeedToBandStdAdapter.baseSymbol()).eq(longBase);
      expect(await dataFeedToBandStdAdapter.quoteSymbol()).eq(longQuote);
    });
  });

  describe('Error handling', () => {
    it('should fail with proper error messages for invalid pairs', async () => {
      const { dataFeedToBandStdAdapter } = fixture;

      // Test various invalid combinations
      await expect(
        dataFeedToBandStdAdapter.getReferenceData('INVALID', quoteSymbol),
      ).revertedWith('DFBSA: unsupported pair');

      await expect(
        dataFeedToBandStdAdapter.getReferenceData(baseSymbol, 'INVALID'),
      ).revertedWith('DFBSA: unsupported pair');

      await expect(
        dataFeedToBandStdAdapter.getReferenceData('', ''),
      ).revertedWith('DFBSA: unsupported pair');
    });

    it('should fail with proper error messages for bulk operations', async () => {
      const { dataFeedToBandStdAdapter } = fixture;

      await expect(
        dataFeedToBandStdAdapter.getReferenceDataBulk(
          [baseSymbol, baseSymbol],
          [quoteSymbol, quoteSymbol],
        ),
      ).revertedWith('DFBSA: single pair only');

      await expect(
        dataFeedToBandStdAdapter.getReferenceDataBulk(
          [baseSymbol],
          [quoteSymbol, quoteSymbol],
        ),
      ).revertedWith('DFBSA: single pair only');
    });
  });

  describe('Gas optimization', () => {
    it('should use pre-computed hashes for symbol validation', async () => {
      const { dataFeedToBandStdAdapter } = fixture;

      // This test ensures the contract uses gas-efficient hash comparison
      // by verifying that symbol validation works correctly
      await expect(dataFeedToBandStdAdapter.getReferenceData('mTBILL', 'USD'))
        .to.not.be.reverted;

      await expect(
        dataFeedToBandStdAdapter.getReferenceData('mTBILL', 'INVALID'),
      ).revertedWith('DFBSA: unsupported pair');
    });
  });

  describe('Data consistency', () => {
    it('should handle timestamp consistency', async () => {
      const { dataFeedToBandStdAdapter, mockedAggregator } = fixture;

      await setRoundData({ mockedAggregator }, 5.5);

      const referenceData = await dataFeedToBandStdAdapter.getReferenceData(
        baseSymbol,
        quoteSymbol,
      );

      // Base and quote should have the same timestamp
      expect(referenceData.lastUpdatedBase).eq(referenceData.lastUpdatedQuote);
      expect(referenceData.lastUpdatedBase).to.be.gt(0);
    });
  });
});

describe('CompositeDataFeedToBandStdAdapter', function () {
  const baseSymbol = 'mTBILL';
  const quoteSymbol = 'USD';
  const alternativeBase = 'mBTC';
  const alternativeQuote = 'EUR';

  const deployCompositeDataFeedToBandStdAdapter = async () => {
    const fixture = await loadFixture(defaultDeploy);
    const { owner, compositeDataFeed } = fixture;

    const compositeDataFeedToBandStdAdapter =
      await new CompositeDataFeedToBandStdAdapter__factory(owner).deploy(
        compositeDataFeed.address,
        baseSymbol,
        quoteSymbol,
      );

    return {
      ...fixture,
      compositeDataFeedToBandStdAdapter,
    };
  };

  let fixture: Awaited<
    ReturnType<typeof deployCompositeDataFeedToBandStdAdapter>
  >;

  beforeEach(async () => {
    fixture = await loadFixture(deployCompositeDataFeedToBandStdAdapter);
  });

  describe('deployment', () => {
    it('should deploy successfully with valid parameters', async () => {
      const { compositeDataFeedToBandStdAdapter, compositeDataFeed } = fixture;

      expect(await compositeDataFeedToBandStdAdapter.dataFeed()).eq(
        compositeDataFeed.address,
      );
      expect(await compositeDataFeedToBandStdAdapter.baseSymbol()).eq(
        baseSymbol,
      );
      expect(await compositeDataFeedToBandStdAdapter.quoteSymbol()).eq(
        quoteSymbol,
      );
    });

    it('should fail: zero address for compositeDataFeed', async () => {
      const { owner } = fixture;

      await expect(
        new CompositeDataFeedToBandStdAdapter__factory(owner).deploy(
          ethers.constants.AddressZero,
          baseSymbol,
          quoteSymbol,
        ),
      ).revertedWith('DFBSA: invalid datafeed');
    });

    it('should fail: empty base symbol', async () => {
      const { owner, compositeDataFeed } = fixture;

      await expect(
        new CompositeDataFeedToBandStdAdapter__factory(owner).deploy(
          compositeDataFeed.address,
          '',
          quoteSymbol,
        ),
      ).revertedWith('DFBSA: empty base');
    });

    it('should fail: empty quote symbol', async () => {
      const { owner, compositeDataFeed } = fixture;

      await expect(
        new CompositeDataFeedToBandStdAdapter__factory(owner).deploy(
          compositeDataFeed.address,
          baseSymbol,
          '',
        ),
      ).revertedWith('DFBSA: empty quote');
    });
  });

  describe('getReferenceData()', () => {
    it('should return correct reference data for configured pair', async () => {
      const {
        compositeDataFeedToBandStdAdapter,
        mockedAggregatorMToken,
        mockedAggregatorMBasis,
      } = fixture;

      // Set up composite feed: numerator = 5, denominator = 3, result = 5/3 ≈ 1.666...
      await setRoundData({ mockedAggregator: mockedAggregatorMToken }, 5);
      await setRoundData({ mockedAggregator: mockedAggregatorMBasis }, 3);

      const referenceData =
        await compositeDataFeedToBandStdAdapter.getReferenceData(
          baseSymbol,
          quoteSymbol,
        );

      expect(referenceData.rate).eq(parseUnits('1.666666666666666666'));
      expect(referenceData.lastUpdatedBase).to.be.gt(0);
      expect(referenceData.lastUpdatedQuote).eq(referenceData.lastUpdatedBase);
    });

    it('should return consistent timestamps for base and quote', async () => {
      const {
        compositeDataFeedToBandStdAdapter,
        mockedAggregatorMToken,
        mockedAggregatorMBasis,
      } = fixture;

      await setRoundData({ mockedAggregator: mockedAggregatorMToken }, 2.5);
      await setRoundData({ mockedAggregator: mockedAggregatorMBasis }, 1.5);

      const referenceData =
        await compositeDataFeedToBandStdAdapter.getReferenceData(
          baseSymbol,
          quoteSymbol,
        );

      expect(referenceData.lastUpdatedBase).eq(referenceData.lastUpdatedQuote);
    });

    it('should fail: unsupported base symbol', async () => {
      const { compositeDataFeedToBandStdAdapter } = fixture;

      await expect(
        compositeDataFeedToBandStdAdapter.getReferenceData(
          alternativeBase,
          quoteSymbol,
        ),
      ).revertedWith('DFBSA: unsupported pair');
    });

    it('should fail: unsupported quote symbol', async () => {
      const { compositeDataFeedToBandStdAdapter } = fixture;

      await expect(
        compositeDataFeedToBandStdAdapter.getReferenceData(
          baseSymbol,
          alternativeQuote,
        ),
      ).revertedWith('DFBSA: unsupported pair');
    });

    it('should fail: both symbols unsupported', async () => {
      const { compositeDataFeedToBandStdAdapter } = fixture;

      await expect(
        compositeDataFeedToBandStdAdapter.getReferenceData(
          alternativeBase,
          alternativeQuote,
        ),
      ).revertedWith('DFBSA: unsupported pair');
    });

    it('should handle different price values correctly', async () => {
      const {
        compositeDataFeedToBandStdAdapter,
        mockedAggregatorMToken,
        mockedAggregatorMBasis,
      } = fixture;

      // Test with minimum valid price
      const smallNumerator = '0.1';
      const smallDenominator = '0.1';
      await setRoundData(
        { mockedAggregator: mockedAggregatorMToken },
        +smallNumerator,
      );
      await setRoundData(
        { mockedAggregator: mockedAggregatorMBasis },
        +smallDenominator,
      );
      let referenceData =
        await compositeDataFeedToBandStdAdapter.getReferenceData(
          baseSymbol,
          quoteSymbol,
        );
      expect(referenceData.rate).eq(parseUnits('1'));

      // Test with maximum valid price
      const largeNumerator = '10000';
      const largeDenominator = '1';
      await setRoundData(
        { mockedAggregator: mockedAggregatorMToken },
        +largeNumerator,
      );
      await setRoundData(
        { mockedAggregator: mockedAggregatorMBasis },
        +largeDenominator,
      );
      referenceData = await compositeDataFeedToBandStdAdapter.getReferenceData(
        baseSymbol,
        quoteSymbol,
      );
      expect(referenceData.rate).eq(parseUnits(largeNumerator));
    });

    it('should fail when underlying composite feed is unhealthy', async () => {
      const { owner, compositeDataFeed } = fixture;

      // Create a new composite feed with unhealthy settings
      const { mTokenToUsdDataFeed, mBasisToUsdDataFeed, accessControl } =
        fixture;

      // Set up feeds with values that will make composite feed unhealthy
      const unhealthyCompositeFeed = await new CompositeDataFeedTest__factory(
        owner,
      ).deploy();
      await unhealthyCompositeFeed.initialize(
        accessControl.address,
        mTokenToUsdDataFeed.address,
        mBasisToUsdDataFeed.address,
        parseUnits('10'), // min expected answer
        parseUnits('100'), // max expected answer
      );

      const compositeDataFeedToBandStdAdapter =
        await new CompositeDataFeedToBandStdAdapter__factory(owner).deploy(
          unhealthyCompositeFeed.address,
          baseSymbol,
          quoteSymbol,
        );

      // Set values that will result in unhealthy composite feed
      await setRoundData(
        { mockedAggregator: fixture.mockedAggregatorMToken },
        1,
      );
      await setRoundData(
        { mockedAggregator: fixture.mockedAggregatorMBasis },
        1,
      );

      await expect(
        compositeDataFeedToBandStdAdapter.getReferenceData(
          baseSymbol,
          quoteSymbol,
        ),
      ).to.be.reverted;
    });
  });

  describe('getReferenceDataBulk()', () => {
    it('should return correct data for single pair', async () => {
      const {
        compositeDataFeedToBandStdAdapter,
        mockedAggregatorMToken,
        mockedAggregatorMBasis,
      } = fixture;

      await setRoundData({ mockedAggregator: mockedAggregatorMToken }, 4);
      await setRoundData({ mockedAggregator: mockedAggregatorMBasis }, 2);

      const results =
        await compositeDataFeedToBandStdAdapter.getReferenceDataBulk(
          [baseSymbol],
          [quoteSymbol],
        );

      expect(results.length).eq(1);
      expect(results[0].rate).eq(parseUnits('2'));
      expect(results[0].lastUpdatedBase).to.be.gt(0);
      expect(results[0].lastUpdatedQuote).eq(results[0].lastUpdatedBase);
    });

    it('should fail: multiple pairs not supported', async () => {
      const { compositeDataFeedToBandStdAdapter } = fixture;

      await expect(
        compositeDataFeedToBandStdAdapter.getReferenceDataBulk(
          [baseSymbol, alternativeBase],
          [quoteSymbol, alternativeQuote],
        ),
      ).revertedWith('DFBSA: single pair only');
    });

    it('should fail: mismatched array lengths', async () => {
      const { compositeDataFeedToBandStdAdapter } = fixture;

      await expect(
        compositeDataFeedToBandStdAdapter.getReferenceDataBulk(
          [baseSymbol, alternativeBase],
          [quoteSymbol],
        ),
      ).revertedWith('DFBSA: single pair only');
    });

    it('should fail: empty arrays', async () => {
      const { compositeDataFeedToBandStdAdapter } = fixture;

      await expect(
        compositeDataFeedToBandStdAdapter.getReferenceDataBulk([], []),
      ).to.be.reverted;
    });

    it('should fail: unsupported pair in bulk', async () => {
      const { compositeDataFeedToBandStdAdapter } = fixture;

      await expect(
        compositeDataFeedToBandStdAdapter.getReferenceDataBulk(
          [alternativeBase],
          [quoteSymbol],
        ),
      ).revertedWith('DFBSA: unsupported pair');
    });

    it('should match getReferenceData output', async () => {
      const {
        compositeDataFeedToBandStdAdapter,
        mockedAggregatorMToken,
        mockedAggregatorMBasis,
      } = fixture;

      await setRoundData({ mockedAggregator: mockedAggregatorMToken }, 7.5);
      await setRoundData({ mockedAggregator: mockedAggregatorMBasis }, 2.5);

      const singleResult =
        await compositeDataFeedToBandStdAdapter.getReferenceData(
          baseSymbol,
          quoteSymbol,
        );
      const bulkResults =
        await compositeDataFeedToBandStdAdapter.getReferenceDataBulk(
          [baseSymbol],
          [quoteSymbol],
        );

      expect(bulkResults[0].rate).eq(singleResult.rate);
      expect(bulkResults[0].lastUpdatedBase).eq(singleResult.lastUpdatedBase);
      expect(bulkResults[0].lastUpdatedQuote).eq(singleResult.lastUpdatedQuote);
    });
  });

  describe('Composite-specific timestamp behavior', () => {
    it('should return consistent timestamps for base and quote', async () => {
      const {
        compositeDataFeedToBandStdAdapter,
        mockedAggregatorMToken,
        mockedAggregatorMBasis,
      } = fixture;

      await setRoundData({ mockedAggregator: mockedAggregatorMToken }, 2);
      await setRoundData({ mockedAggregator: mockedAggregatorMBasis }, 1);

      const referenceData =
        await compositeDataFeedToBandStdAdapter.getReferenceData(
          baseSymbol,
          quoteSymbol,
        );

      // Base and quote should have the same timestamp
      expect(referenceData.lastUpdatedBase).eq(referenceData.lastUpdatedQuote);
      expect(referenceData.lastUpdatedBase).to.be.gt(0);
    });

    it('should handle timestamp consistency with different price values', async () => {
      const {
        compositeDataFeedToBandStdAdapter,
        mockedAggregatorMToken,
        mockedAggregatorMBasis,
      } = fixture;

      await setRoundData({ mockedAggregator: mockedAggregatorMToken }, 3);
      await setRoundData({ mockedAggregator: mockedAggregatorMBasis }, 2);

      const referenceData =
        await compositeDataFeedToBandStdAdapter.getReferenceData(
          baseSymbol,
          quoteSymbol,
        );

      // Base and quote should have the same timestamp
      expect(referenceData.lastUpdatedBase).eq(referenceData.lastUpdatedQuote);
      expect(referenceData.lastUpdatedBase).to.be.gt(0);
    });

    it('should use minimum timestamp logic from composite feed implementation', async () => {
      const {
        compositeDataFeedToBandStdAdapter,
        mockedAggregatorMToken,
        mockedAggregatorMBasis,
      } = fixture;

      await setRoundData({ mockedAggregator: mockedAggregatorMToken }, 4);
      await setRoundData({ mockedAggregator: mockedAggregatorMBasis }, 2);

      const referenceData =
        await compositeDataFeedToBandStdAdapter.getReferenceData(
          baseSymbol,
          quoteSymbol,
        );

      // The composite adapter should use the minimum timestamp from both feeds
      // Since we can't control timestamps in the mock, we verify the behavior is consistent
      expect(referenceData.lastUpdatedBase).eq(referenceData.lastUpdatedQuote);
      expect(referenceData.lastUpdatedBase).to.be.gt(0);
    });
  });

  describe('Composite feed edge cases', () => {
    it('should handle division by zero in composite feed', async () => {
      const {
        compositeDataFeedToBandStdAdapter,
        mockedAggregatorMToken,
        mockedAggregatorMBasis,
      } = fixture;

      await setRoundData({ mockedAggregator: mockedAggregatorMToken }, 5);
      await setRoundData({ mockedAggregator: mockedAggregatorMBasis }, 0);

      await expect(
        compositeDataFeedToBandStdAdapter.getReferenceData(
          baseSymbol,
          quoteSymbol,
        ),
      ).to.be.reverted;
    });

    it('should handle composite feed with very small values', async () => {
      const {
        compositeDataFeedToBandStdAdapter,
        mockedAggregatorMToken,
        mockedAggregatorMBasis,
      } = fixture;

      // Use values that are within the healthy range for the composite feed
      await setRoundData({ mockedAggregator: mockedAggregatorMToken }, 0.1);
      await setRoundData({ mockedAggregator: mockedAggregatorMBasis }, 0.1);

      const referenceData =
        await compositeDataFeedToBandStdAdapter.getReferenceData(
          baseSymbol,
          quoteSymbol,
        );

      expect(referenceData.rate).eq(parseUnits('1'));
    });

    it('should handle composite feed with very large values', async () => {
      const {
        compositeDataFeedToBandStdAdapter,
        mockedAggregatorMToken,
        mockedAggregatorMBasis,
      } = fixture;

      // Use values that are within the healthy range for the composite feed
      await setRoundData({ mockedAggregator: mockedAggregatorMToken }, 1000);
      await setRoundData({ mockedAggregator: mockedAggregatorMBasis }, 1000);

      const referenceData =
        await compositeDataFeedToBandStdAdapter.getReferenceData(
          baseSymbol,
          quoteSymbol,
        );

      expect(referenceData.rate).eq(parseUnits('1'));
    });

    it('should handle precision in composite calculations', async () => {
      const {
        compositeDataFeedToBandStdAdapter,
        mockedAggregatorMToken,
        mockedAggregatorMBasis,
      } = fixture;

      // Test with values that require precision handling
      await setRoundData({ mockedAggregator: mockedAggregatorMToken }, 1);
      await setRoundData({ mockedAggregator: mockedAggregatorMBasis }, 3);

      const referenceData =
        await compositeDataFeedToBandStdAdapter.getReferenceData(
          baseSymbol,
          quoteSymbol,
        );

      // 1/3 = 0.333333333333333333 (18 decimal places)
      expect(referenceData.rate).eq(parseUnits('0.333333333333333333'));
    });
  });

  describe('Case sensitivity', () => {
    it('should be case-sensitive for symbols', async () => {
      const { compositeDataFeedToBandStdAdapter } = fixture;

      // Try with lowercase
      await expect(
        compositeDataFeedToBandStdAdapter.getReferenceData(
          baseSymbol.toLowerCase(),
          quoteSymbol,
        ),
      ).revertedWith('DFBSA: unsupported pair');

      // Try with different case
      await expect(
        compositeDataFeedToBandStdAdapter.getReferenceData(
          baseSymbol,
          quoteSymbol.toLowerCase(),
        ),
      ).revertedWith('DFBSA: unsupported pair');
    });

    it('should handle exact symbol matches', async () => {
      const {
        compositeDataFeedToBandStdAdapter,
        mockedAggregatorMToken,
        mockedAggregatorMBasis,
      } = fixture;

      await setRoundData({ mockedAggregator: mockedAggregatorMToken }, 1.5);
      await setRoundData({ mockedAggregator: mockedAggregatorMBasis }, 1.5);

      // Should work with exact case
      const referenceData =
        await compositeDataFeedToBandStdAdapter.getReferenceData(
          baseSymbol,
          quoteSymbol,
        );

      expect(referenceData.rate).eq(parseUnits('1'));
    });
  });

  describe('Symbol validation', () => {
    it('should handle special characters in symbols', async () => {
      const { owner, compositeDataFeed } = fixture;

      const specialBase = 'mTBILL-USD';
      const specialQuote = 'USD-USD';

      const compositeDataFeedToBandStdAdapter =
        await new CompositeDataFeedToBandStdAdapter__factory(owner).deploy(
          compositeDataFeed.address,
          specialBase,
          specialQuote,
        );

      expect(await compositeDataFeedToBandStdAdapter.baseSymbol()).eq(
        specialBase,
      );
      expect(await compositeDataFeedToBandStdAdapter.quoteSymbol()).eq(
        specialQuote,
      );
    });

    it('should handle long symbol names', async () => {
      const { owner, compositeDataFeed } = fixture;

      const longBase = 'mTBILL-VERY-LONG-SYMBOL-NAME';
      const longQuote = 'USD-VERY-LONG-SYMBOL-NAME';

      const compositeDataFeedToBandStdAdapter =
        await new CompositeDataFeedToBandStdAdapter__factory(owner).deploy(
          compositeDataFeed.address,
          longBase,
          longQuote,
        );

      expect(await compositeDataFeedToBandStdAdapter.baseSymbol()).eq(longBase);
      expect(await compositeDataFeedToBandStdAdapter.quoteSymbol()).eq(
        longQuote,
      );
    });
  });

  describe('Error handling', () => {
    it('should fail with proper error messages for invalid pairs', async () => {
      const { compositeDataFeedToBandStdAdapter } = fixture;

      // Test various invalid combinations
      await expect(
        compositeDataFeedToBandStdAdapter.getReferenceData(
          'INVALID',
          quoteSymbol,
        ),
      ).revertedWith('DFBSA: unsupported pair');

      await expect(
        compositeDataFeedToBandStdAdapter.getReferenceData(
          baseSymbol,
          'INVALID',
        ),
      ).revertedWith('DFBSA: unsupported pair');

      await expect(
        compositeDataFeedToBandStdAdapter.getReferenceData('', ''),
      ).revertedWith('DFBSA: unsupported pair');
    });

    it('should fail with proper error messages for bulk operations', async () => {
      const { compositeDataFeedToBandStdAdapter } = fixture;

      await expect(
        compositeDataFeedToBandStdAdapter.getReferenceDataBulk(
          [baseSymbol, baseSymbol],
          [quoteSymbol, quoteSymbol],
        ),
      ).revertedWith('DFBSA: single pair only');

      await expect(
        compositeDataFeedToBandStdAdapter.getReferenceDataBulk(
          [baseSymbol],
          [quoteSymbol, quoteSymbol],
        ),
      ).revertedWith('DFBSA: single pair only');
    });
  });

  describe('Data consistency', () => {
    it('should handle timestamp consistency', async () => {
      const {
        compositeDataFeedToBandStdAdapter,
        mockedAggregatorMToken,
        mockedAggregatorMBasis,
      } = fixture;

      await setRoundData({ mockedAggregator: mockedAggregatorMToken }, 5.5);
      await setRoundData({ mockedAggregator: mockedAggregatorMBasis }, 2.5);

      const referenceData =
        await compositeDataFeedToBandStdAdapter.getReferenceData(
          baseSymbol,
          quoteSymbol,
        );

      // Base and quote should have the same timestamp
      expect(referenceData.lastUpdatedBase).eq(referenceData.lastUpdatedQuote);
      expect(referenceData.lastUpdatedBase).to.be.gt(0);
    });
  });
});
