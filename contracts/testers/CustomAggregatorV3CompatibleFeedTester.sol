// SPDX-License-Identifier: MIT
pragma solidity 0.8.34;

import "../feeds/CustomAggregatorV3CompatibleFeed.sol";

contract CustomAggregatorV3CompatibleFeedTester is
    CustomAggregatorV3CompatibleFeed
{
    bytes32 public constant CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE =
        keccak256("CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE");

    function _disableInitializers() internal override {}

    function feedAdminRole() public pure override returns (bytes32) {
        return CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE;
    }

    function getDeviation(int256 _lastPrice, int256 _newPrice)
        public
        pure
        returns (uint256)
    {
        return _getDeviation(_lastPrice, _newPrice);
    }
}
