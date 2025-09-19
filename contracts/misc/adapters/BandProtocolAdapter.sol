// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "@chainlink/contracts/src/v0.8/interfaces/AggregatorV3Interface.sol";
import "../../interfaces/IDataFeed.sol";
import "../../feeds/DataFeed.sol";

interface IStdReference {
    /// A structure returned whenever someone requests for standard reference data.
    struct ReferenceData {
        uint256 rate; // base/quote exchange rate, multiplied by 1e18.
        uint256 lastUpdatedBase; // UNIX epoch of the last time when base price gets updated.
        uint256 lastUpdatedQuote; // UNIX epoch of the last time when quote price gets updated.
    }

    /// Returns the price data for the given base/quote pair. Revert if not available.
    function getReferenceData(string memory _base, string memory _quote)
        external
        view
        returns (ReferenceData memory);

    /// Similar to getReferenceData, but with multiple base/quote pairs at once.
    function getReferenceDataBulk(
        string[] memory _bases,
        string[] memory _quotes
    ) external view returns (ReferenceData[] memory);
}

/**
 * @title BandProtocolAdapter
 * @author RedDuck Software
 * @notice Wraps DataFeed to provide Band Protocol's IStdReference interface
 */
contract BandProtocolAdapter is IStdReference {
    /**
     * @notice DataFeed contract providing validated price data
     */
    IDataFeed public immutable dataFeed;

    /**
     * @notice Chainlink aggregator for raw price data and timestamps
     */
    AggregatorV3Interface public immutable aggregator;

    /**
     * @notice Base token symbol (e.g., "mXRP", "mBTC", "mTBILL")
     */
    string public baseSymbol;

    /**
     * @notice Quote currency symbol (e.g., "USD", "XRP", "BTC")
     */
    string public quoteSymbol;

    /**
     * @notice Pre-computed hash of baseSymbol for gas-efficient validation
     */
    bytes32 private immutable _baseSymbolHash;

    /**
     * @notice Pre-computed hash of quoteSymbol for gas-efficient validation
     */
    bytes32 private immutable _quoteSymbolHash;

    /**
     * @notice Constructor initializes the adapter with a DataFeed contract
     * @param _dataFeed Address of the DataFeed contract providing price data
     * @param _baseSymbol Symbol of the base token (e.g., "mXRP", "mBTC")
     * @param _quoteSymbol Symbol of the quote currency (e.g., "USD", "EUR")
     */
    constructor(
        address _dataFeed,
        string memory _baseSymbol,
        string memory _quoteSymbol
    ) {
        require(_dataFeed != address(0), "BPA: invalid datafeed");
        require(bytes(_baseSymbol).length > 0, "BPA: empty base");
        require(bytes(_quoteSymbol).length > 0, "BPA: empty quote");

        dataFeed = IDataFeed(_dataFeed);
        aggregator = AggregatorV3Interface(DataFeed(_dataFeed).aggregator());

        baseSymbol = _baseSymbol;
        quoteSymbol = _quoteSymbol;

        _baseSymbolHash = keccak256(abi.encodePacked(_baseSymbol));
        _quoteSymbolHash = keccak256(abi.encodePacked(_quoteSymbol));
    }

    /**
     * @inheritdoc IStdReference
     * @notice Returns the price data for the given base/quote pair
     * @dev Only supports the configured baseSymbol/quoteSymbol pair
     * @param _base The base token symbol
     * @param _quote The quote currency symbol
     * @return ReferenceData containing rate and update timestamps
     */
    function getReferenceData(string memory _base, string memory _quote)
        external
        view
        override
        returns (ReferenceData memory)
    {
        _validatePair(_base, _quote);
        return _fetchReferenceData();
    }

    /**
     * @inheritdoc IStdReference
     * @notice Returns price data for multiple base/quote pairs
     * @dev Only supports single pair queries (array length must be 1)
     * @param _bases Array of base token symbols (must have length 1)
     * @param _quotes Array of quote currency symbols (must have length 1)
     * @return Array containing single ReferenceData element
     */
    function getReferenceDataBulk(
        string[] memory _bases,
        string[] memory _quotes
    ) external view override returns (ReferenceData[] memory) {
        require(_bases.length == 1, "BPA: only single pair supported");
        require(_quotes.length == 1, "BPA: only single pair supported");

        _validatePair(_bases[0], _quotes[0]);

        ReferenceData[] memory results = new ReferenceData[](1);
        results[0] = _fetchReferenceData();

        return results;
    }

    /**
     * @notice Get the current reference data with additional metadata
     * @dev Convenience function that returns the standard reference data plus aggregator metadata
     * @return data The current reference data
     * @return decimals The decimals of the aggregator
     * @return description The description from the aggregator
     */
    function getReferenceDataWithMetadata()
        external
        view
        returns (
            ReferenceData memory data,
            uint8 decimals,
            string memory description
        )
    {
        data = _fetchReferenceData();
        decimals = aggregator.decimals();
        description = aggregator.description();
    }

    /**
     * @notice Get the latest round data directly from the aggregator
     * @dev Useful for debugging and accessing raw aggregator data
     * @return roundId The round ID
     * @return answer The price answer
     * @return startedAt Timestamp when the round started
     * @return updatedAt Timestamp when the round was updated
     * @return answeredInRound The round ID in which the answer was computed
     */
    function getLatestAggregatorRoundData()
        external
        view
        returns (
            uint80 roundId,
            int256 answer,
            uint256 startedAt,
            uint256 updatedAt,
            uint80 answeredInRound
        )
    {
        return aggregator.latestRoundData();
    }

    /**
     * @notice Internal function to fetch and format reference data
     * @dev Fetches validated price from DataFeed and timestamp from aggregator
     * @return ReferenceData with current price and timestamps
     */
    function _fetchReferenceData() private view returns (ReferenceData memory) {
        // Get price in base 18 from DataFeed (includes all validations)
        uint256 rate = dataFeed.getDataInBase18();

        // Get timestamp from the underlying aggregator
        (, , , uint256 updatedAt, ) = aggregator.latestRoundData();

        // Use the same timestamp for both base and quote
        // This represents when the price was last updated
        return
            ReferenceData({
                rate: rate,
                lastUpdatedBase: updatedAt,
                lastUpdatedQuote: updatedAt
            });
    }

    /**
     * @notice Validates that the provided pair matches the configured pair
     * @dev Reverts if the pair is not supported
     * @param _base The base token symbol
     * @param _quote The quote currency symbol
     */
    function _validatePair(string memory _base, string memory _quote)
        private
        view
    {
        require(
            keccak256(abi.encodePacked(_base)) == _baseSymbolHash &&
                keccak256(abi.encodePacked(_quote)) == _quoteSymbolHash,
            "BPA: unsupported pair"
        );
    }
}
