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
 * @title DataFeedToBandStdAdapter
 * @author RedDuck Software
 * @notice Converts DataFeed to Band Protocol's IStdReference interface
 * @dev Base adapter that wraps a DataFeed to provide Band Protocol standard reference data
 */
contract DataFeedToBandStdAdapter is IStdReference {
    /**
     * @notice DataFeed contract providing validated price data
     */
    IDataFeed public immutable dataFeed;

    /**
     * @notice Base token symbol
     */
    string public baseSymbol;

    /**
     * @notice Quote currency symbol
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
     * @param _baseSymbol Symbol of the base token
     * @param _quoteSymbol Symbol of the quote currency
     */
    constructor(
        address _dataFeed,
        string memory _baseSymbol,
        string memory _quoteSymbol
    ) {
        require(_dataFeed != address(0), "DFBSA: invalid datafeed");
        require(bytes(_baseSymbol).length > 0, "DFBSA: empty base");
        require(bytes(_quoteSymbol).length > 0, "DFBSA: empty quote");

        dataFeed = IDataFeed(_dataFeed);

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
        require(
            _bases.length == 1 && _quotes.length == 1,
            "DFBSA: only single pair supported"
        );

        _validatePair(_bases[0], _quotes[0]);

        ReferenceData[] memory results = new ReferenceData[](1);
        results[0] = _fetchReferenceData();

        return results;
    }

    /**
     * @notice Internal function to fetch and format reference data
     * @dev Fetches validated price from DataFeed and timestamp using virtual function
     * @return ReferenceData with current price and timestamps
     */
    function _fetchReferenceData() private view returns (ReferenceData memory) {
        uint256 rate = dataFeed.getDataInBase18();
        uint256 timestamp = _getTimestamp();

        return
            ReferenceData({
                rate: rate,
                lastUpdatedBase: timestamp,
                lastUpdatedQuote: timestamp
            });
    }

    /**
     * @notice Gets the timestamp for the price data
     * @dev Virtual function that can be overridden by child contracts
     * @return timestamp The timestamp of the last price update
     */
    function _getTimestamp() internal view virtual returns (uint256 timestamp) {
        timestamp = _getAggregatorTimestamp(dataFeed);
    }

    /**
     * @notice Gets timestamp from a DataFeed via its aggregator
     * @dev Assumes the feed is a DataFeed. Reverts if not.
     * @param feed The data feed to get timestamp from
     * @return timestamp The timestamp from the aggregator
     */
    function _getAggregatorTimestamp(IDataFeed feed)
        internal
        view
        returns (uint256)
    {
        AggregatorV3Interface aggregator = DataFeed(address(feed)).aggregator();
        (, , , uint256 updatedAt, ) = aggregator.latestRoundData();
        return updatedAt;
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
            "DFBSA: unsupported pair"
        );
    }
}
