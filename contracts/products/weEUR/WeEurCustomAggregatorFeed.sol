// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "../../feeds/CustomAggregatorV3CompatibleFeed.sol";
import "./WeEurMidasAccessControlRoles.sol";

/**
 * @title WeEurCustomAggregatorFeed
 * @notice AggregatorV3 compatible feed for weEUR,
 * where price is submitted manually by feed admins
 * @author RedDuck Software
 */
contract WeEurCustomAggregatorFeed is
    CustomAggregatorV3CompatibleFeed,
    WeEurMidasAccessControlRoles
{
    /**
     * @dev leaving a storage gap for futures updates
     */
    uint256[50] private __gap;

    /**
     * @inheritdoc CustomAggregatorV3CompatibleFeed
     */
    function feedAdminRole() public pure override returns (bytes32) {
        return WE_EUR_CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE;
    }
}
