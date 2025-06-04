// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "../feeds/CustomAggregatorV3CompatibleFeedDiscounted.sol";

contract CustomAggregatorV3CompatibleFeedDiscountedTester is
    CustomAggregatorV3CompatibleFeedDiscounted
{
    bytes32 public constant CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE =
        keccak256("CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE");

    function _disableInitializers() internal override {}

    function feedAdminRole() public pure override returns (bytes32) {
        return CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE;
    }

    function getDiscountedAnswer(int256 _answer) public view returns (int256) {
        return _calculateDiscountedAnswer(_answer);
    }
}
