// SPDX-License-Identifier: BUSL-1.1
pragma solidity 0.8.34;

import "../feeds/CustomAggregatorV3CompatibleFeed.sol";

contract CustomAggregatorV3CompatibleFeedTester is
    CustomAggregatorV3CompatibleFeed
{
    constructor()
        CustomAggregatorV3CompatibleFeed(
            keccak256("CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE")
        )
    {}

    function _disableInitializers() internal override {}

    function getDeviation(int256 _lastPrice, int256 _newPrice)
        public
        pure
        returns (uint256)
    {
        return _getDeviation(_lastPrice, _newPrice);
    }
}
