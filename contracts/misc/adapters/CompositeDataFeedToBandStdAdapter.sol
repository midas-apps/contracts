// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "../../interfaces/IDataFeed.sol";
import "../../feeds/CompositeDataFeed.sol";
import "./DataFeedToBandStdAdapter.sol";

/**
 * @title CompositeDataFeedToBandStdAdapter
 * @author RedDuck Software
 * @notice Converts CompositeDataFeed to Band Protocol's IStdReference interface
 * @dev Adapter that wraps CompositeDataFeed to provide Band Protocol standard reference data
 */
contract CompositeDataFeedToBandStdAdapter is DataFeedToBandStdAdapter {
    /**
     * @notice Constructor initializes the adapter with a CompositeDataFeed contract
     * @param _compositeDataFeed Address of the CompositeDataFeed contract providing composite price data
     * @param _baseSymbol Symbol of the base token
     * @param _quoteSymbol Symbol of the quote currency
     */
    constructor(
        address _compositeDataFeed,
        string memory _baseSymbol,
        string memory _quoteSymbol
    ) DataFeedToBandStdAdapter(_compositeDataFeed, _baseSymbol, _quoteSymbol) {}

    /**
     * @notice Gets the timestamp for the price data
     * @dev Overrides base to handle composite feeds by taking min timestamp from numerator/denominator
     * @return timestamp The timestamp of the last price update
     */
    function _getTimestamp()
        internal
        view
        override
        returns (uint256 timestamp)
    {
        CompositeDataFeed compositeFeed = CompositeDataFeed(address(dataFeed));

        uint256 numeratorTimestamp = _getAggregatorTimestamp(
            compositeFeed.numeratorFeed()
        );
        uint256 denominatorTimestamp = _getAggregatorTimestamp(
            compositeFeed.denominatorFeed()
        );

        timestamp = numeratorTimestamp < denominatorTimestamp
            ? numeratorTimestamp
            : denominatorTimestamp;
    }
}
