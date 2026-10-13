// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "../../feeds/CustomAggregatorV3CompatibleFeed.sol";
import "./MoriniBTCYieldMidasAccessControlRoles.sol";

/**
 * @title MoriniBTCYieldCustomAggregatorFeed
 * @notice AggregatorV3 compatible feed for moriniBTCYield,
 * where price is submitted manually by feed admins
 * @author RedDuck Software
 */
contract MoriniBTCYieldCustomAggregatorFeed is
    CustomAggregatorV3CompatibleFeed,
    MoriniBTCYieldMidasAccessControlRoles
{
    /**
     * @dev leaving a storage gap for futures updates
     */
    uint256[50] private __gap;

    /**
     * @inheritdoc CustomAggregatorV3CompatibleFeed
     */
    function feedAdminRole() public pure override returns (bytes32) {
        return MORINI_BTC_YIELD_CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE;
    }
}
