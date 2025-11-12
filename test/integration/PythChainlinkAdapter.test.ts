import { loadFixture } from '@nomicfoundation/hardhat-network-helpers';
import { expect } from 'chai';
import { parseUnits } from 'ethers/lib/utils';
import { ethers } from 'hardhat';

import { pythAdapterFixture } from './fixtures/pyth.fixture';

describe.skip('PythChainlinkAdapter - HyperEVM Fork Integration Tests', function () {
  this.timeout(120000);

  const hyperEvmPythFixture = () => pythAdapterFixture('hyperevm');

  describe('Basic Interface Compliance', function () {
    it('should implement all required Chainlink AggregatorV3Interface functions', async function () {
      const { usdhlAdapter } = await loadFixture(hyperEvmPythFixture);

      // Test all required functions exist and return values
      expect(await usdhlAdapter.decimals()).to.equal(8);
      expect(await usdhlAdapter.description()).to.be.a('string');
      expect(await usdhlAdapter.version()).to.equal(1);

      // Test price functions
      const latestAnswer = await usdhlAdapter.latestAnswer();
      expect(latestAnswer).to.be.gt(0);

      const latestRound = await usdhlAdapter.latestRound();
      expect(latestRound).to.be.gt(0);

      const latestTimestamp = await usdhlAdapter.latestTimestamp();
      expect(latestTimestamp).to.be.gt(0);

      const latestRoundData = await usdhlAdapter.latestRoundData();
      expect(latestRoundData.roundId).to.be.gt(0);
      expect(latestRoundData.answer).to.be.gt(0);
      expect(latestRoundData.startedAt).to.be.gt(0);
      expect(latestRoundData.updatedAt).to.be.gt(0);
      expect(latestRoundData.answeredInRound).to.be.gt(0);
    });

    it('should return consistent data across different function calls', async function () {
      const { usdhlAdapter } = await loadFixture(hyperEvmPythFixture);

      const latestAnswer = await usdhlAdapter.latestAnswer();
      const latestRoundData = await usdhlAdapter.latestRoundData();

      // latestAnswer should match latestRoundData.answer
      expect(latestAnswer).to.equal(latestRoundData.answer);

      // latestRound should match latestRoundData.roundId
      const latestRound = await usdhlAdapter.latestRound();
      expect(latestRound).to.equal(latestRoundData.roundId);

      // latestTimestamp should match latestRoundData.updatedAt
      const latestTimestamp = await usdhlAdapter.latestTimestamp();
      expect(latestTimestamp).to.equal(latestRoundData.updatedAt);
    });
  });

  describe('Price Data Validation', function () {
    it('should return valid USDHL/USD price data', async function () {
      const { usdhlAdapter } = await loadFixture(hyperEvmPythFixture);

      const answer = await usdhlAdapter.latestAnswer();

      // USDHL should be close to $1 USD (in 8 decimals: ~100000000)
      // Price 99763171 = $0.99763171 which is reasonable for USDHL
      expect(answer).to.be.gt(parseUnits('0.997', 8)); // Greater than $0.997
      expect(answer).to.be.lt(parseUnits('1.003', 8)); // Less than $1.003

      // Should be properly scaled to 8 decimals
      expect(answer).to.be.gte(parseUnits('0.997', 8)); // USDHL should be at least $0.997
    });

    it('should return properly formatted latestRoundData', async function () {
      const { usdhlAdapter } = await loadFixture(hyperEvmPythFixture);

      const roundData = await usdhlAdapter.latestRoundData();

      // All values should be positive
      expect(roundData.roundId).to.be.gt(0);
      expect(roundData.answer).to.be.gt(0);
      expect(roundData.startedAt).to.be.gt(0);
      expect(roundData.updatedAt).to.be.gt(0);
      expect(roundData.answeredInRound).to.be.gt(0);

      // Round ID should equal timestamp (as per our implementation)
      expect(roundData.roundId).to.equal(roundData.updatedAt);
      expect(roundData.startedAt).to.equal(roundData.updatedAt);
      expect(roundData.answeredInRound).to.equal(roundData.roundId);
    });

    it('should handle getRoundData function', async function () {
      const { usdhlAdapter } = await loadFixture(hyperEvmPythFixture);

      const latestRound = await usdhlAdapter.latestRound();
      const roundData = await usdhlAdapter.getRoundData(latestRound);

      // Should return the same data as latestRoundData
      const latestRoundData = await usdhlAdapter.latestRoundData();
      expect(roundData.roundId).to.equal(latestRoundData.roundId);
      expect(roundData.answer).to.equal(latestRoundData.answer);
      expect(roundData.startedAt).to.equal(latestRoundData.startedAt);
      expect(roundData.updatedAt).to.equal(latestRoundData.updatedAt);
      expect(roundData.answeredInRound).to.equal(
        latestRoundData.answeredInRound,
      );
    });
  });

  describe('Configuration Verification', function () {
    it('should be configured with correct Pyth contract and price feed', async function () {
      const { usdhlAdapter, pythContract, usdhlUsdPriceId } =
        await loadFixture(hyperEvmPythFixture);

      // Verify the adapter was configured with correct addresses
      expect(await usdhlAdapter.pyth()).to.equal(pythContract);
      expect(await usdhlAdapter.priceId()).to.equal(usdhlUsdPriceId);
    });
  });

  describe('DataFeed Integration', function () {
    it('should deploy and initialize DataFeed with PythChainlinkAdapter correctly', async function () {
      const {
        dataFeed,
        usdhlAdapter,
        midasAccessControl,
        deployer,
        healthyDiff,
        minExpectedAnswer,
        maxExpectedAnswer,
        roles,
      } = await loadFixture(hyperEvmPythFixture);

      // Verify DataFeed configuration
      expect(await dataFeed.aggregator()).to.equal(usdhlAdapter.address);
      expect(await dataFeed.healthyDiff()).to.equal(healthyDiff);
      expect(await dataFeed.minExpectedAnswer()).to.equal(minExpectedAnswer);
      expect(await dataFeed.maxExpectedAnswer()).to.equal(maxExpectedAnswer);

      expect(
        await midasAccessControl.hasRole(
          roles.common.defaultAdmin,
          deployer.address,
        ),
      ).to.be.true;
    });

    it('should convert 8-decimal adapter price to 18-decimal DataFeed price', async function () {
      const { dataFeed, usdhlAdapter } = await loadFixture(hyperEvmPythFixture);

      const adapterPrice = await usdhlAdapter.latestAnswer();
      const dataFeedPrice = await dataFeed.getDataInBase18();

      const expectedDataFeedPrice = adapterPrice.mul(parseUnits('1', 10));
      expect(dataFeedPrice).to.equal(expectedDataFeedPrice);
    });

    it('should provide reasonable price data through DataFeed', async function () {
      const { dataFeed } = await loadFixture(hyperEvmPythFixture);

      const dataFeedPrice = await dataFeed.getDataInBase18();

      const humanReadablePrice = parseFloat(
        ethers.utils.formatUnits(dataFeedPrice, 18),
      );

      expect(humanReadablePrice).to.be.gt(0.997);
      expect(humanReadablePrice).to.be.lt(1.003);
    });

    it('should handle price bounds validation in DataFeed', async function () {
      const { dataFeed, minExpectedAnswer, maxExpectedAnswer } =
        await loadFixture(hyperEvmPythFixture);

      // This should not revert since the price should be within bounds
      await expect(dataFeed.getDataInBase18()).to.not.be.reverted;

      // Verify that the bounds are reasonable for USDHL
      const minInDollars = parseFloat(
        ethers.utils.formatUnits(minExpectedAnswer, 8),
      );
      const maxInDollars = parseFloat(
        ethers.utils.formatUnits(maxExpectedAnswer, 8),
      );

      expect(minInDollars).to.equal(0.997); // Exactly $0.997
      expect(maxInDollars).to.equal(1.003); // Exactly $1.003
    });

    it('should handle timestamp validation in DataFeed', async function () {
      const { dataFeed, healthyDiff } = await loadFixture(hyperEvmPythFixture);

      // This should not revert since Pyth prices should be recent
      await expect(dataFeed.getDataInBase18()).to.not.be.reverted;

      // Verify healthy diff is 6 hours
      expect(healthyDiff).to.equal(6 * 60 * 60); // 6 hours
    });

    it('should demonstrate the complete price flow from Pyth to DataFeed', async function () {
      const { usdhlAdapter, dataFeed, pythContract, usdhlUsdPriceId } =
        await loadFixture(hyperEvmPythFixture);

      console.log('\n=== Complete Price Flow Demonstration ===');

      // Step 1: Raw Pyth data
      const pythContractInstance = await ethers.getContractAt(
        'IPyth',
        pythContract,
      );
      const rawPythPrice =
        await pythContractInstance.getPriceUnsafe(usdhlUsdPriceId);

      // Step 2: Adapter processed data (8 decimals)
      const adapterPrice = await usdhlAdapter.latestAnswer();
      const humanReadableAdapterPrice = parseFloat(
        ethers.utils.formatUnits(adapterPrice, 8),
      );

      // Step 3: DataFeed processed data (18 decimals)
      const dataFeedPrice = await dataFeed.getDataInBase18();
      const humanReadableDataFeedPrice = parseFloat(
        ethers.utils.formatUnits(dataFeedPrice, 18),
      );

      console.log(
        `Pyth Raw Price: ${rawPythPrice.price.toString()} (expo: ${
          rawPythPrice.expo
        })`,
      );
      console.log(
        `Adapter Raw: ${adapterPrice.toString()} | Readable: $${humanReadableAdapterPrice.toFixed(
          6,
        )} (8 decimals)`,
      );
      console.log(
        `DataFeed Raw: ${dataFeedPrice.toString()} | Readable: $${humanReadableDataFeedPrice.toFixed(
          6,
        )} (18 decimals)`,
      );

      // Verify the conversion is correct
      const expectedDataFeedPrice = adapterPrice.mul(parseUnits('1', 10));
      expect(dataFeedPrice).to.equal(expectedDataFeedPrice);
    });
  });
});
