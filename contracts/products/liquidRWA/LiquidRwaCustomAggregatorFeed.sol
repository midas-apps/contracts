// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "../../feeds/CustomAggregatorV3CompatibleFeed.sol";
import "./LiquidRwaMidasAccessControlRoles.sol";

/**
 * @title LiquidRwaCustomAggregatorFeed
 * @notice AggregatorV3 compatible feed for liquidRWA,
 * where price is submitted manually by feed admins
 * @author RedDuck Software
 */
contract LiquidRwaCustomAggregatorFeed is
    CustomAggregatorV3CompatibleFeed,
    LiquidRwaMidasAccessControlRoles
{
    /**
     * @dev leaving a storage gap for futures updates
     */
    uint256[50] private __gap;

    /**
     * @inheritdoc CustomAggregatorV3CompatibleFeed
     */
    function feedAdminRole() public pure override returns (bytes32) {
        return LIQUID_RWA_CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE;
    }
}
