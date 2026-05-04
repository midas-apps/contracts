// SPDX-License-Identifier: MIT
pragma solidity 0.8.34;

import "../feeds/CustomAggregatorV3CompatibleFeedAdjusted.sol";

contract CustomAggregatorV3CompatibleFeedAdjustedTester is
    CustomAggregatorV3CompatibleFeedAdjusted
{
    constructor(address _underlyingFeed, int256 _adjustmentPercentage)
        CustomAggregatorV3CompatibleFeedAdjusted(
            _underlyingFeed,
            _adjustmentPercentage
        )
    {}

    function getAdjustedAnswer(int256 _answer) public view returns (int256) {
        return _calculateAdjustedAnswer(_answer);
    }
}
