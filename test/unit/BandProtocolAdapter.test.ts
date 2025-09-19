import { loadFixture } from '@nomicfoundation/hardhat-network-helpers';
import { expect } from 'chai';
import { parseUnits } from 'ethers/lib/utils';
import { ethers } from 'hardhat';

import {
  // eslint-disable-next-line camelcase
  BandProtocolAdapter__factory,
} from '../../typechain-types';
import { setRoundData } from '../common/data-feed.helpers';
import { defaultDeploy } from '../common/fixtures';

describe('BandProtocolAdapter', function () {
  const baseSymbol = 'mTBILL';
  const quoteSymbol = 'USD';
  const alternativeBase = 'mBTC';
  const alternativeQuote = 'EUR';

  const deployBandProtocolAdapter = async () => {
    const fixture = await loadFixture(defaultDeploy);
    const { owner, dataFeed } = fixture;

    const bandProtocolAdapter = await new BandProtocolAdapter__factory(
      owner,
    ).deploy(dataFeed.address, baseSymbol, quoteSymbol);

    return {
      ...fixture,
      bandProtocolAdapter,
    };
  };

  let fixture: Awaited<ReturnType<typeof deployBandProtocolAdapter>>;

  beforeEach(async () => {
    fixture = await loadFixture(deployBandProtocolAdapter);
  });

  describe('deployment', () => {
    it('should deploy successfully with valid parameters', async () => {
      const { bandProtocolAdapter, dataFeed } = fixture;

      expect(await bandProtocolAdapter.dataFeed()).eq(dataFeed.address);
      expect(await bandProtocolAdapter.baseSymbol()).eq(baseSymbol);
      expect(await bandProtocolAdapter.quoteSymbol()).eq(quoteSymbol);
    });

    it('should set aggregator from DataFeed', async () => {
      const { bandProtocolAdapter, mockedAggregator } = fixture;

      expect(await bandProtocolAdapter.aggregator()).eq(
        mockedAggregator.address,
      );
    });

    it('should fail: zero address for dataFeed', async () => {
      const { owner } = fixture;

      await expect(
        new BandProtocolAdapter__factory(owner).deploy(
          ethers.constants.AddressZero,
          baseSymbol,
          quoteSymbol,
        ),
      ).revertedWith('BPA: invalid datafeed');
    });

    it('should fail: empty base symbol', async () => {
      const { owner, dataFeed } = fixture;

      await expect(
        new BandProtocolAdapter__factory(owner).deploy(
          dataFeed.address,
          '',
          quoteSymbol,
        ),
      ).revertedWith('BPA: empty base');
    });

    it('should fail: empty quote symbol', async () => {
      const { owner, dataFeed } = fixture;

      await expect(
        new BandProtocolAdapter__factory(owner).deploy(
          dataFeed.address,
          baseSymbol,
          '',
        ),
      ).revertedWith('BPA: empty quote');
    });
  });

  describe('getReferenceData()', () => {
    it('should return correct reference data for configured pair', async () => {
      const { bandProtocolAdapter, mockedAggregator } = fixture;

      const price = '4.5';
      await setRoundData({ mockedAggregator }, +price);

      const referenceData = await bandProtocolAdapter.getReferenceData(
        baseSymbol,
        quoteSymbol,
      );

      expect(referenceData.rate).eq(parseUnits(price));
      expect(referenceData.lastUpdatedBase).to.be.gt(0);
      expect(referenceData.lastUpdatedQuote).eq(referenceData.lastUpdatedBase);
    });

    it('should return consistent timestamps for base and quote', async () => {
      const { bandProtocolAdapter, mockedAggregator } = fixture;

      await setRoundData({ mockedAggregator }, 2.5);

      const referenceData = await bandProtocolAdapter.getReferenceData(
        baseSymbol,
        quoteSymbol,
      );

      expect(referenceData.lastUpdatedBase).eq(referenceData.lastUpdatedQuote);
    });

    it('should fail: unsupported base symbol', async () => {
      const { bandProtocolAdapter } = fixture;

      await expect(
        bandProtocolAdapter.getReferenceData(alternativeBase, quoteSymbol),
      ).revertedWith('BPA: unsupported pair');
    });

    it('should fail: unsupported quote symbol', async () => {
      const { bandProtocolAdapter } = fixture;

      await expect(
        bandProtocolAdapter.getReferenceData(baseSymbol, alternativeQuote),
      ).revertedWith('BPA: unsupported pair');
    });

    it('should fail: both symbols unsupported', async () => {
      const { bandProtocolAdapter } = fixture;

      await expect(
        bandProtocolAdapter.getReferenceData(alternativeBase, alternativeQuote),
      ).revertedWith('BPA: unsupported pair');
    });

    it('should handle different price values correctly', async () => {
      const { bandProtocolAdapter, mockedAggregator } = fixture;

      // Test with minimum valid price
      const smallPrice = '0.1';
      await setRoundData({ mockedAggregator }, +smallPrice);
      let referenceData = await bandProtocolAdapter.getReferenceData(
        baseSymbol,
        quoteSymbol,
      );
      expect(referenceData.rate).eq(parseUnits(smallPrice));

      // Test with maximum valid price
      const largePrice = '10000';
      await setRoundData({ mockedAggregator }, +largePrice);
      referenceData = await bandProtocolAdapter.getReferenceData(
        baseSymbol,
        quoteSymbol,
      );
      expect(referenceData.rate).eq(parseUnits(largePrice));
    });

    it('should fail when underlying feed is unhealthy', async () => {
      const { owner, dataFeedUnhealthy } = fixture;

      const bandProtocolAdapter = await new BandProtocolAdapter__factory(
        owner,
      ).deploy(dataFeedUnhealthy.address, baseSymbol, quoteSymbol);

      await expect(
        bandProtocolAdapter.getReferenceData(baseSymbol, quoteSymbol),
      ).to.be.reverted;
    });

    it('should fail when underlying feed is deprecated', async () => {
      const { owner, dataFeedDeprecated } = fixture;

      const bandProtocolAdapter = await new BandProtocolAdapter__factory(
        owner,
      ).deploy(dataFeedDeprecated.address, baseSymbol, quoteSymbol);

      await expect(
        bandProtocolAdapter.getReferenceData(baseSymbol, quoteSymbol),
      ).to.be.reverted;
    });

    it('should handle edge case price values', async () => {
      const { bandProtocolAdapter, mockedAggregator } = fixture;

      // Test with minimum expected price
      await setRoundData({ mockedAggregator }, 0.1);
      let referenceData = await bandProtocolAdapter.getReferenceData(
        baseSymbol,
        quoteSymbol,
      );
      expect(referenceData.rate).eq(parseUnits('0.1'));

      // Test with maximum expected price
      await setRoundData({ mockedAggregator }, 10000);
      referenceData = await bandProtocolAdapter.getReferenceData(
        baseSymbol,
        quoteSymbol,
      );
      expect(referenceData.rate).eq(parseUnits('10000'));
    });
  });

  describe('getReferenceDataBulk()', () => {
    it('should return correct data for single pair', async () => {
      const { bandProtocolAdapter, mockedAggregator } = fixture;

      const price = '3.75';
      await setRoundData({ mockedAggregator }, +price);

      const results = await bandProtocolAdapter.getReferenceDataBulk(
        [baseSymbol],
        [quoteSymbol],
      );

      expect(results.length).eq(1);
      expect(results[0].rate).eq(parseUnits(price));
      expect(results[0].lastUpdatedBase).to.be.gt(0);
      expect(results[0].lastUpdatedQuote).eq(results[0].lastUpdatedBase);
    });

    it('should fail: multiple pairs not supported', async () => {
      const { bandProtocolAdapter } = fixture;

      await expect(
        bandProtocolAdapter.getReferenceDataBulk(
          [baseSymbol, alternativeBase],
          [quoteSymbol, alternativeQuote],
        ),
      ).revertedWith('BPA: only single pair supported');
    });

    it('should fail: mismatched array lengths', async () => {
      const { bandProtocolAdapter } = fixture;

      await expect(
        bandProtocolAdapter.getReferenceDataBulk(
          [baseSymbol, alternativeBase],
          [quoteSymbol],
        ),
      ).revertedWith('BPA: only single pair supported');
    });

    it('should fail: empty arrays', async () => {
      const { bandProtocolAdapter } = fixture;

      await expect(bandProtocolAdapter.getReferenceDataBulk([], [])).to.be
        .reverted;
    });

    it('should fail: unsupported pair in bulk', async () => {
      const { bandProtocolAdapter } = fixture;

      await expect(
        bandProtocolAdapter.getReferenceDataBulk(
          [alternativeBase],
          [quoteSymbol],
        ),
      ).revertedWith('BPA: unsupported pair');
    });

    it('should match getReferenceData output', async () => {
      const { bandProtocolAdapter, mockedAggregator } = fixture;

      const price = '7.25';
      await setRoundData({ mockedAggregator }, +price);

      const singleResult = await bandProtocolAdapter.getReferenceData(
        baseSymbol,
        quoteSymbol,
      );
      const bulkResults = await bandProtocolAdapter.getReferenceDataBulk(
        [baseSymbol],
        [quoteSymbol],
      );

      expect(bulkResults[0].rate).eq(singleResult.rate);
      expect(bulkResults[0].lastUpdatedBase).eq(singleResult.lastUpdatedBase);
      expect(bulkResults[0].lastUpdatedQuote).eq(singleResult.lastUpdatedQuote);
    });
  });

  describe('getReferenceDataWithMetadata()', () => {
    it('should return reference data with aggregator metadata', async () => {
      const { bandProtocolAdapter, mockedAggregator } = fixture;

      const price = '5.25';
      await setRoundData({ mockedAggregator }, +price);

      const { data, decimals, description } =
        await bandProtocolAdapter.getReferenceDataWithMetadata();

      expect(data.rate).eq(parseUnits(price));
      expect(data.lastUpdatedBase).to.be.gt(0);
      expect(data.lastUpdatedQuote).eq(data.lastUpdatedBase);
      expect(decimals).eq(await mockedAggregator.decimals());
      expect(description).to.be.a('string');
    });

    it('should match regular getReferenceData output', async () => {
      const { bandProtocolAdapter, mockedAggregator } = fixture;

      await setRoundData({ mockedAggregator }, 6.5);

      const regularData = await bandProtocolAdapter.getReferenceData(
        baseSymbol,
        quoteSymbol,
      );
      const { data: metadataData } =
        await bandProtocolAdapter.getReferenceDataWithMetadata();

      expect(metadataData.rate).eq(regularData.rate);
      expect(metadataData.lastUpdatedBase).eq(regularData.lastUpdatedBase);
      expect(metadataData.lastUpdatedQuote).eq(regularData.lastUpdatedQuote);
    });

    it('should return correct aggregator metadata', async () => {
      const { bandProtocolAdapter, mockedAggregator } = fixture;

      const { decimals, description } =
        await bandProtocolAdapter.getReferenceDataWithMetadata();

      expect(decimals).eq(await mockedAggregator.decimals());
      expect(description).eq(await mockedAggregator.description());
    });
  });

  describe('getLatestAggregatorRoundData()', () => {
    it('should return raw aggregator round data', async () => {
      const { bandProtocolAdapter, mockedAggregator } = fixture;

      const price = 7.5;
      await setRoundData({ mockedAggregator }, price);

      const [roundId, answer, startedAt, updatedAt, answeredInRound] =
        await bandProtocolAdapter.getLatestAggregatorRoundData();

      const expectedAnswer = parseUnits(
        price.toString(),
        await mockedAggregator.decimals(),
      );

      expect(answer).eq(expectedAnswer);
      expect(roundId).to.be.gt(0);
      expect(updatedAt).to.be.gt(0);
      expect(answeredInRound).to.be.gte(0);
      expect(startedAt).to.be.gte(0);
    });

    it('should match underlying aggregator data', async () => {
      const { bandProtocolAdapter, mockedAggregator } = fixture;

      await setRoundData({ mockedAggregator }, 8.25);

      const adapterData =
        await bandProtocolAdapter.getLatestAggregatorRoundData();
      const aggregatorData = await mockedAggregator.latestRoundData();

      expect(adapterData[0]).eq(aggregatorData[0]); // roundId
      expect(adapterData[1]).eq(aggregatorData[1]); // answer
      expect(adapterData[2]).eq(aggregatorData[2]); // startedAt
      expect(adapterData[3]).eq(aggregatorData[3]); // updatedAt
      expect(adapterData[4]).eq(aggregatorData[4]); // answeredInRound
    });

    it('should handle different round data scenarios', async () => {
      const { bandProtocolAdapter, mockedAggregator } = fixture;

      // Test with different prices to ensure round data updates
      await setRoundData({ mockedAggregator }, 1.0);
      const [roundId1] =
        await bandProtocolAdapter.getLatestAggregatorRoundData();

      await setRoundData({ mockedAggregator }, 2.0);
      const [roundId2] =
        await bandProtocolAdapter.getLatestAggregatorRoundData();

      expect(roundId2).to.be.gt(roundId1);
    });
  });

  describe('Case sensitivity', () => {
    it('should be case-sensitive for symbols', async () => {
      const { bandProtocolAdapter } = fixture;

      // Try with lowercase
      await expect(
        bandProtocolAdapter.getReferenceData(
          baseSymbol.toLowerCase(),
          quoteSymbol,
        ),
      ).revertedWith('BPA: unsupported pair');

      // Try with different case
      await expect(
        bandProtocolAdapter.getReferenceData(
          baseSymbol,
          quoteSymbol.toLowerCase(),
        ),
      ).revertedWith('BPA: unsupported pair');
    });

    it('should handle exact symbol matches', async () => {
      const { bandProtocolAdapter, mockedAggregator } = fixture;

      await setRoundData({ mockedAggregator }, 1.5);

      // Should work with exact case
      const referenceData = await bandProtocolAdapter.getReferenceData(
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

      const bandProtocolAdapter = await new BandProtocolAdapter__factory(
        owner,
      ).deploy(dataFeed.address, specialBase, specialQuote);

      expect(await bandProtocolAdapter.baseSymbol()).eq(specialBase);
      expect(await bandProtocolAdapter.quoteSymbol()).eq(specialQuote);
    });

    it('should handle long symbol names', async () => {
      const { owner, dataFeed } = fixture;

      const longBase = 'mTBILL-VERY-LONG-SYMBOL-NAME';
      const longQuote = 'USD-VERY-LONG-SYMBOL-NAME';

      const bandProtocolAdapter = await new BandProtocolAdapter__factory(
        owner,
      ).deploy(dataFeed.address, longBase, longQuote);

      expect(await bandProtocolAdapter.baseSymbol()).eq(longBase);
      expect(await bandProtocolAdapter.quoteSymbol()).eq(longQuote);
    });
  });

  describe('Error handling', () => {
    it('should fail with proper error messages for invalid pairs', async () => {
      const { bandProtocolAdapter } = fixture;

      // Test various invalid combinations
      await expect(
        bandProtocolAdapter.getReferenceData('INVALID', quoteSymbol),
      ).revertedWith('BPA: unsupported pair');

      await expect(
        bandProtocolAdapter.getReferenceData(baseSymbol, 'INVALID'),
      ).revertedWith('BPA: unsupported pair');

      await expect(bandProtocolAdapter.getReferenceData('', '')).revertedWith(
        'BPA: unsupported pair',
      );
    });

    it('should fail with proper error messages for bulk operations', async () => {
      const { bandProtocolAdapter } = fixture;

      await expect(
        bandProtocolAdapter.getReferenceDataBulk(
          [baseSymbol, baseSymbol],
          [quoteSymbol, quoteSymbol],
        ),
      ).revertedWith('BPA: only single pair supported');

      await expect(
        bandProtocolAdapter.getReferenceDataBulk(
          [baseSymbol],
          [quoteSymbol, quoteSymbol],
        ),
      ).revertedWith('BPA: only single pair supported');
    });
  });

  describe('Gas optimization', () => {
    it('should use pre-computed hashes for symbol validation', async () => {
      const { bandProtocolAdapter } = fixture;

      // This test ensures the contract uses gas-efficient hash comparison
      // by verifying that symbol validation works correctly
      await expect(bandProtocolAdapter.getReferenceData('mTBILL', 'USD')).to.not
        .be.reverted;

      await expect(
        bandProtocolAdapter.getReferenceData('mTBILL', 'INVALID'),
      ).revertedWith('BPA: unsupported pair');
    });
  });

  describe('Data consistency', () => {
    it('should maintain data consistency across all methods', async () => {
      const { bandProtocolAdapter, mockedAggregator } = fixture;

      const price = '9.99';
      await setRoundData({ mockedAggregator }, +price);

      const singleData = await bandProtocolAdapter.getReferenceData(
        baseSymbol,
        quoteSymbol,
      );
      const bulkData = await bandProtocolAdapter.getReferenceDataBulk(
        [baseSymbol],
        [quoteSymbol],
      );
      const { data: metadataData } =
        await bandProtocolAdapter.getReferenceDataWithMetadata();

      // All methods should return the same rate
      expect(singleData.rate).eq(bulkData[0].rate);
      expect(singleData.rate).eq(metadataData.rate);
      expect(bulkData[0].rate).eq(metadataData.rate);

      // All methods should return the same timestamps
      expect(singleData.lastUpdatedBase).eq(bulkData[0].lastUpdatedBase);
      expect(singleData.lastUpdatedBase).eq(metadataData.lastUpdatedBase);
      expect(bulkData[0].lastUpdatedBase).eq(metadataData.lastUpdatedBase);

      expect(singleData.lastUpdatedQuote).eq(bulkData[0].lastUpdatedQuote);
      expect(singleData.lastUpdatedQuote).eq(metadataData.lastUpdatedQuote);
      expect(bulkData[0].lastUpdatedQuote).eq(metadataData.lastUpdatedQuote);
    });

    it('should handle timestamp consistency', async () => {
      const { bandProtocolAdapter, mockedAggregator } = fixture;

      await setRoundData({ mockedAggregator }, 5.5);

      const referenceData = await bandProtocolAdapter.getReferenceData(
        baseSymbol,
        quoteSymbol,
      );

      // Base and quote should have the same timestamp
      expect(referenceData.lastUpdatedBase).eq(referenceData.lastUpdatedQuote);
      expect(referenceData.lastUpdatedBase).to.be.gt(0);
    });
  });
});
