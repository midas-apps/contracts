// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "../../feeds/CustomAggregatorV3CompatibleFeed.sol";
import "./Re7BTCMidasAccessControlRoles.sol";

/**
 * @title Re7BTCCustomAggregatorFeed
 * @notice AggregatorV3 compatible feed for Re7BTC,
 * where price is submitted manually by feed admins
 * @author RedDuck Software
 */
contract Re7BTCCustomAggregatorFeed is
    CustomAggregatorV3CompatibleFeed,
    Re7BTCMidasAccessControlRoles
{
    /**
     * @dev leaving a storage gap for futures updates
     */
    uint256[50] private __gap;

    /**
     * @inheritdoc CustomAggregatorV3CompatibleFeed
     */
    function feedAdminRole() public pure override returns (bytes32) {
        return RE7_BTC_CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE;
    }
}
