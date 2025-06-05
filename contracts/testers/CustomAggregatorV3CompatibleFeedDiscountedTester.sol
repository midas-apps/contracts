// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "../feeds/CustomAggregatorV3CompatibleFeedDiscounted.sol";

contract CustomAggregatorV3CompatibleFeedDiscountedTester is
    CustomAggregatorV3CompatibleFeedDiscounted
{
    constructor(address _underlyingFeed, uint256 _discountPercentage)
        CustomAggregatorV3CompatibleFeedDiscounted(
            _underlyingFeed,
            _discountPercentage
        )
    {}

    function getDiscountedAnswer(int256 _answer) public view returns (int256) {
        return _calculateDiscountedAnswer(_answer);
    }
}
