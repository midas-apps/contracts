// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "../feeds/CustomAggregatorV3CompatibleFeedGrowth.sol";

contract CustomAggregatorV3CompatibleFeedGrowthTester is
    CustomAggregatorV3CompatibleFeedGrowth
{
    bytes32 public constant CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE =
        keccak256("CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE");

    function _disableInitializers() internal override {}

    function feedAdminRole() public pure override returns (bytes32) {
        return CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE;
    }

    function setMaxAnswerDeviation(uint256 _deviation) public {
        maxAnswerDeviation = _deviation;
    }

    function getDeviation(
        int256 _lastPrice,
        int256 _newPrice,
        bool _validateOnlyUp
    ) public pure returns (uint256) {
        return _getDeviation(_lastPrice, _newPrice, _validateOnlyUp);
    }
}
