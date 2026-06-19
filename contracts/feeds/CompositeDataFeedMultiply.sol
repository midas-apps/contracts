// SPDX-License-Identifier: BUSL-1.1
pragma solidity 0.8.34;

import {CompositeDataFeed} from "./CompositeDataFeed.sol";

/**
 * @title CompositeDataFeedMultiply
 * @notice A data feed contract that derives its price by computing the product
 * of two underlying data feeds (numerator × denominator).
 * @dev Inherits from CompositeDataFeed and overrides only the calculation logic
 * to multiply instead of divide. Designed for cases where a synthetic or combined
 * price is needed, such as deriving mXRP/USD from mXRP/XRP and XRP/USD feeds.
 * @author RedDuck Software
 */
contract CompositeDataFeedMultiply is CompositeDataFeed {
    /**
     * @dev leaving a storage gap for futures updates
     */
    uint256[50] private __gap;

    /**
     * @notice constructor
     * @param _contractAdminRole contract admin role
     * @custom:oz-upgrades-unsafe-allow constructor
     */
    constructor(bytes32 _contractAdminRole)
        CompositeDataFeed(_contractAdminRole)
    {}

    /**
     * @dev computes the composite price by multiplying the two feed values
     * @param firstFeedValue value from the first feed
     * @param secondFeedValue value from the second feed
     * @return answer computed composite price in base18
     */
    function _computeCompositePrice(
        uint256 firstFeedValue,
        uint256 secondFeedValue
    ) internal pure override returns (uint256 answer) {
        answer = (firstFeedValue * secondFeedValue) / 1e18;
    }
}
