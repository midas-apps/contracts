// SPDX-License-Identifier: MIT
pragma solidity 0.8.34;

import "../feeds/CustomAggregatorV3CompatibleFeedGrowth.sol";

contract CustomAggregatorV3CompatibleFeedGrowthTester is
    CustomAggregatorV3CompatibleFeedGrowth
{
    constructor()
        CustomAggregatorV3CompatibleFeedGrowth(
            keccak256("CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE")
        )
    {}

    function _disableInitializers() internal override {}

    function getDeviation(
        int256 _lastPrice,
        int256 _newPrice,
        bool _validateOnlyUp
    ) public pure returns (uint256) {
        return _getDeviation(_lastPrice, _newPrice, _validateOnlyUp);
    }
}
